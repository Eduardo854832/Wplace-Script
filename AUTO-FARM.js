(function(){
  'use strict';

  if (window.__WPLACE_AUTOFARM_NEXT) {
    console.warn('[AutoFarm] Já carregado.');
    return;
  }
  window.__WPLACE_AUTOFARM_NEXT = true;

  /* ================= Constantes ================= */
  const BRAND = 'AutoFarm';
  const VERSION = '2.1.0';
  const LS_KEY = 'wplace_autofarm_next_cfg_v210';
  const SESSION_KEY = 'wplace_autofarm_next_sessions';
  const PIXEL_TIMEOUT_MS = 7000;
  const SMART_RESTART_MAX_NO_SUCCESS_MS = 5 * 60 * 1000;
  const SMART_RESTART_MAX_FAIL_STREAK   = 140;
  const ENDPOINTS = ['s0','s1','pixel'];
  const MAX_LOG_LINES = 250;
  const LOG_BATCH_FLUSH_MS = 120;
  const UI_UPDATE_INTERVAL_MS = 250;
  const QUARANTINE_BASE = [30_000, 120_000, 300_000, 600_000];
  const MAX_AREA_PX = 5000 * 5000;
  const JITTER_PCT = 0.06;
  const ENDPOINT_SCORE_WINDOW = 50;

  /* ================= Persistência ================= */
  function loadCfg(){
    try {
      const raw = localStorage.getItem(LS_KEY);
      if(!raw) return {};
      return JSON.parse(raw);
    } catch { return {}; }
  }
  function saveCfg(){
    try { localStorage.setItem(LS_KEY, JSON.stringify(config.user)); } catch{}
  }
  function loadSessions(){
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || []; } catch { return []; }
  }
  function saveSessions(){
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(runtime.sessions)); } catch {}
  }

  /* ================= Estado ================= */
  const defaults = {
    startX:742,
    startY:1148,
    width:50,
    height:50,
    delayMs:1200,
    paletteSize:32,
    colorMode:'random',
    fixedColor:0,
    positionStrategy:'random',
    effect:true,
    debug:false,
    theme:'neon',
    preset:'custom',
    minimized:false,
    showLog:true,
    spiralDir:1
  };

  const config = {
    user: Object.assign({}, defaults, loadCfg(), { version: VERSION }),
    runtime: {
      inited:false,
      running:false,
      attempts:0,
      painted:0,
      fails:0,
      lastPaint:null,
      lastSuccessTs:null,
      charges:{count:0,max:0,cooldownMs:30000},
      userInfo:null,
      highlightVisible:false,
      seq:{x:0,y:0},
      spiral:{layer:0,dx:0,dy:0,leg:1,step:0,x:0,y:0},
      endpoint:{
        idx:0,
        stats:ENDPOINTS.map(ep=>({ep,success:0,fail:0,history:[]}))
      },
      recover:{
        failStreak:0,
        consecutive403:0,
        consecutive429:0,
        networkErrors:0,
        useMinimal:false,
        dynamicDelayMs:0,
        baseDelaySnapshot:0
      },
      counters:{c403:0,c429:0,cNet:0},
      quarantine:new Map(),
      failCount:new Map(),
      hudState:'idle',
      logQueue:[],
      logFlushTimer:null,
      lastUIUpdate:0,
      lastRateWindow:[],
      sessions: loadSessions(),
      startTs:null
    }
  };
  const runtime = config.runtime;

  /* ================= Labels ================= */
  const L = {
    title:'Auto-Farm',
    start:'Iniciar',
    stop:'Parar',
    area:'Área',
    normalize:'Normalizar',
    painted:'Pintados',
    attempts:'Tentativas',
    fails:'Falhas',
    rate:'Taxa',
    charges:'Cargas',
    last:'Último',
    delay:'Delay',
    ep:'EP',
    test:'Teste',
    reset:'Reset',
    export:'Exportar',
    import:'Importar',
    statusStopped:'Parado',
    statusRunning:'Rodando...',
    waitingCharges:'Aguardando cargas',
    pixelOk:'Pixel OK',
    pixelFail:'Falha',
    idle:'Inativo',
    running:'Rodando',
    waiting:'Esperando',
    error:'Erro',
    preset:'Preset',
    strategy:'Estratégia',
    colorMode:'Cor',
    fixedColor:'Fixada',
    palette:'Paleta',
    baseX:'Base X',
    baseY:'Base Y',
    width:'Largura',
    height:'Altura',
    saveCfg:'Salvar',
    loadCfg:'Carregar',
    sequential:'Sequencial',
    spiral:'Espiral',
    random:'Aleatório',
    effect:'Efeito',
    log:'Log',
    theme:'Tema',
    statsCopied:'Estatísticas copiadas',
    imported:'Config importada',
    importFail:'Import inválida',
    normalized:'Normalizado',
    sessionEnded:'Sessão finalizada'
  };

  /* ================= Utils ================= */
  const sleep = ms=>new Promise(r=>setTimeout(r,ms));
  const now = ()=>Date.now();
  const escapeHtml = s=>(s||'').toString().replace(/[&<>"'`]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
  function byId(id){ return document.getElementById(id); }
  function clampNumeric(){
    const u=config.user;
    u.width = Math.max(1, parseInt(u.width)||1);
    u.height = Math.max(1, parseInt(u.height)||1);
    u.paletteSize = Math.max(1, parseInt(u.paletteSize)||1);
    const area = u.width * u.height;
    if (area > MAX_AREA_PX) {
      const factor = Math.sqrt(MAX_AREA_PX / area);
      u.width = Math.max(1, Math.floor(u.width * factor));
      u.height= Math.max(1, Math.floor(u.height * factor));
      log(`Área ajustada para segurança: ${u.width}x${u.height}`, 'warn');
    }
  }

  /* ================= Log (Batch) ================= */
  function log(message, level='info'){
    const ts = new Date().toLocaleTimeString('pt-BR',{hour12:false});
    const line = `[${ts}] ${message}`;
    runtime.logQueue.push({line,level});
    if (runtime.logQueue.length > MAX_LOG_LINES) runtime.logQueue.shift();
    scheduleLogFlush();
    if (config.user.debug){
      const fn = level==='error'?console.error: (level==='warn'?console.warn:console.log);
      fn('[AF]',message);
    }
  }
  function scheduleLogFlush(){
    if (runtime.logFlushTimer) return;
    runtime.logFlushTimer = setTimeout(flushLogs, LOG_BATCH_FLUSH_MS);
  }
  function flushLogs(){
    runtime.logFlushTimer=null;
    const box = byId('afLog');
    if (!box || !config.user.showLog) return;
    const frag = document.createDocumentFragment();
    runtime.logQueue.slice(-MAX_LOG_LINES).forEach(entry=>{
      const div=document.createElement('div');
      div.textContent=entry.line;
      frag.appendChild(div);
    });
    box.innerHTML='';
    box.appendChild(frag);
    const mini = byId('afMini');
    if (mini){
      const last = runtime.logQueue[runtime.logQueue.length-1];
      if (last) mini.textContent = last.line;
    }
  }

  /* ================= AutoFix ================= */
  function initAutoFix(){
    const r=runtime.recover;
    r.baseDelaySnapshot = config.user.delayMs;
    r.dynamicDelayMs = config.user.delayMs;
    r.useMinimal=false;
    r.failStreak=r.consecutive403=r.consecutive429=r.networkErrors=0;
  }

  function currentEndpoint(){
    return ENDPOINTS[runtime.recover.endpointIdx % ENDPOINTS.length];
  }

  function recordEndpoint(success){
    const ep = currentEndpoint();
    const obj = runtime.endpoint.stats.find(s=>s.ep===ep);
    if (!obj) return;
    obj.history.push(success?1:0);
    if (obj.history.length > ENDPOINT_SCORE_WINDOW) obj.history.shift();
    if (success) obj.success++; else obj.fail++;
  }

  function chooseBestEndpoint(){
    let bestIdx = 0;
    let bestScore = -Infinity;
    runtime.endpoint.stats.forEach((s,i)=>{
      const hist = s.history;
      const mean = hist.length ? hist.reduce((a,b)=>a+b,0)/hist.length : 0;
      const recentFails = hist.slice(-10).filter(v=>v===0).length;
      const score = mean - recentFails*0.05;
      if (score > bestScore){
        bestScore=score; bestIdx=i;
      }
    });
    runtime.recover.endpointIdx = bestIdx;
  }

  function autoFixSuccess(){
    const r=runtime.recover;
    r.failStreak=0; r.consecutive403=0; r.consecutive429=0; r.networkErrors=0;
    if (r.dynamicDelayMs > r.baseDelaySnapshot){
      r.dynamicDelayMs = Math.max(r.baseDelaySnapshot, Math.floor(r.dynamicDelayMs*0.85));
      log(`[AutoFix] Delay reduzido para ${r.dynamicDelayMs}ms`);
    }
    if (r.useMinimal && runtime.painted % 10 ===0){
      r.useMinimal=false;
      log('[AutoFix] Payload completo restaurado');
    }
  }

  function autoFixFailure(status){
    const r=runtime.recover;
    r.failStreak++;
    if (status===403){
      runtime.counters.c403++;
      r.consecutive403++;
      if (!r.useMinimal){
        r.useMinimal=true;
        log('[AutoFix] 403 -> payload minimal');
      } else if (r.consecutive403===2){
        r.endpointIdx=(r.endpointIdx+1)%ENDPOINTS.length;
        log(`[AutoFix] Mudando endpoint -> ${currentEndpoint()}`);
      } else if (r.consecutive403>2){
        r.dynamicDelayMs = Math.min(r.dynamicDelayMs+400, r.baseDelaySnapshot*6);
        log(`[AutoFix] 403 repetido -> delay ${r.dynamicDelayMs}ms`);
      }
    } else r.consecutive403=0;

    if (status===429){
      runtime.counters.c429++;
      r.consecutive429++;
      const mult=1.25 + 0.08*Math.min(r.consecutive429,5);
      const nd = Math.min(Math.floor(r.dynamicDelayMs*mult), r.baseDelaySnapshot*8);
      if (nd>r.dynamicDelayMs){
        r.dynamicDelayMs=nd;
        log(`[AutoFix] 429 -> delay ${r.dynamicDelayMs}ms`);
      }
    } else r.consecutive429=0;

    if (status===0){
      runtime.counters.cNet++;
      r.networkErrors++;
      r.dynamicDelayMs = Math.min(Math.floor(r.dynamicDelayMs*1.4+200), r.baseDelaySnapshot*6);
      log(`[AutoFix] Rede -> backoff ${r.dynamicDelayMs}ms (#${r.networkErrors})`);
      if (r.networkErrors % 3 ===0){
        r.endpointIdx=(r.endpointIdx+1)%ENDPOINTS.length;
        log(`[AutoFix] Endpoint alternado -> ${currentEndpoint()}`);
      }
    } else r.networkErrors=0;

    smartRestartCheck();
    if (r.failStreak % 20 ===0) chooseBestEndpoint();
  }

  function forceNormalize(manual=true){
    const r=runtime.recover;
    r.useMinimal=false;
    r.dynamicDelayMs = r.baseDelaySnapshot = config.user.delayMs;
    r.failStreak=r.consecutive403=r.consecutive429=r.networkErrors=0;
    runtime.counters.c403=runtime.counters.c429=runtime.counters.cNet=0;
    log(manual?L.normalized:`${L.normalized} (Smart)`);
  }

  function smartRestartCheck(){
    const r=runtime.recover;
    const duration = runtime.lastSuccessTs ? (now()-runtime.lastSuccessTs) : 0;
    if ((runtime.painted>0 && duration > SMART_RESTART_MAX_NO_SUCCESS_MS) ||
        r.failStreak >= SMART_RESTART_MAX_FAIL_STREAK){
      forceNormalize(false);
    }
  }

  /* ================= API ================= */
  async function fetchCharges(){
    try {
      const r = await fetch('https://backend.wplace.live/me',{credentials:'include',cache:'no-cache'});
      if (!r.ok) return;
      const j = await r.json().catch(()=>null);
      if(!j || !j.charges) return;
      runtime.userInfo=j;
      runtime.charges.count = Math.floor(j.charges.count);
      runtime.charges.max = Math.floor(j.charges.max);
      runtime.charges.cooldownMs = j.charges.cooldownMs;
      scheduleUIUpdate();
    } catch {}
  }

  async function paintPixel(absX,absY,color){
    const rcv = runtime.recover;
    const ep = currentEndpoint();
    const body = rcv.useMinimal ? {x:absX,y:absY,color} : {x:absX,y:absY,color,brand:'AFN'};
    const controller = new AbortController();
    const t=setTimeout(()=>controller.abort(), PIXEL_TIMEOUT_MS);
    let status=0, success=false;
    const start=performance.now();
    try{
      const res = await fetch(`https://backend.wplace.live/${ep}/pixel/${absX}/${absY}`,{
        method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(body),
        signal:controller.signal
      });
      clearTimeout(t);
      status=res.status;
      if(res.ok){
        const j = await res.json().catch(()=>({}));
        success = j.painted===1 || j.ok===true || j.success===1;
      }
    }catch(e){
      clearTimeout(t);
      status=0;
    }
    const latency = performance.now()-start;
    runtime.lastRateWindow.push({t:now(), ok:success});
    runtime.lastRateWindow = runtime.lastRateWindow.filter(o=> now()-o.t<60000);
    recordEndpoint(success);
    return {success,status,latency};
  }

  /* ================= Cores & Estratégias ================= */
  function nextColor(){
    return config.user.colorMode==='fixed'
      ? clampColor(config.user.fixedColor)
      : Math.floor(Math.random()*config.user.paletteSize);
  }
  function clampColor(c){
    return Math.max(0, Math.min(config.user.paletteSize-1, isNaN(c)?0:c));
  }

  const strategies = {
    random(){
      for (let i=0;i<250;i++){
        const x = Math.floor(Math.random()*config.user.width);
        const y = Math.floor(Math.random()*config.user.height);
        if (!isQuarantined(x,y)) return {x,y};
      }
      return {x:Math.floor(Math.random()*config.user.width),
              y:Math.floor(Math.random()*config.user.height)};
    },
    sequential(){
      const s=runtime.seq;
      const pos={x:s.x,y:s.y};
      s.x++;
      if (s.x >= config.user.width){
        s.x=0; s.y++;
        if (s.y >= config.user.height){
          s.y=0;
        }
      }
      if (isQuarantined(pos.x,pos.y)) return strategies.sequential();
      return pos;
    },
    spiral(){
      const sp = runtime.spiral;
      const w = config.user.width;
      const h = config.user.height;
      if (sp.step===0){
        sp.x=Math.floor(w/2);
        sp.y=Math.floor(h/2);
        sp.layer=1; sp.leg=1; sp.dx=1; sp.dy=0; sp.step=1;
      } else {
        sp.x += sp.dx; sp.y += sp.dy;
        if (sp.dx===1 && sp.x >= Math.floor(w/2)+sp.layer){ sp.dx=0; sp.dy=1; }
        else if (sp.dy===1 && sp.y >= Math.floor(h/2)+sp.layer){ sp.dx=-1; sp.dy=0; }
        else if (sp.dx===-1 && sp.x <= Math.floor(w/2)-sp.layer){ sp.dx=0; sp.dy=-1; }
        else if (sp.dy===-1 && sp.y <= Math.floor(h/2)-sp.layer){ sp.dx=1; sp.dy=0; sp.layer++; }
        sp.step++;
      }
      const rx = ((sp.x % w)+w)%w;
      const ry = ((sp.y % h)+h)%h;
      if (isQuarantined(rx,ry)) return strategies.random();
      return {x:rx,y:ry};
    }
  };

  function nextPosition(){
    const strat = strategies[config.user.positionStrategy] || strategies.random;
    return strat();
  }

  /* ================= Quarentena ================= */
  function coordKey(x,y){ return `${x},${y}`; }
  function quarantineDur(fails){
    return QUARANTINE_BASE[Math.min(QUARANTINE_BASE.length-1, fails-1)];
  }
  function noteFailCoord(relX,relY){
    const k=coordKey(relX,relY);
    const prev = runtime.failCount.get(k)||0;
    const nowF = prev+1;
    runtime.failCount.set(k, nowF);
    if (nowF>=3){
      const dur = quarantineDur(nowF-2);
      runtime.quarantine.set(k, now()+dur);
      runtime.failCount.set(k,0);
      log(`[Quarentena] (${relX},${relY}) por ${(dur/1000)|0}s`);
    }
  }
  function noteSuccessCoord(relX,relY){
    const k=coordKey(relX,relY);
    runtime.failCount.delete(k);
    runtime.quarantine.delete(k);
  }
  function isQuarantined(relX,relY){
    const k=coordKey(relX,relY);
    if (!runtime.quarantine.has(k)) return false;
    if (now() > runtime.quarantine.get(k)){
      runtime.quarantine.delete(k);
      return false;
    }
    return true;
  }

  /* ================= Delay & Jitter ================= */
  function computeEffectiveDelay(){
    const base = runtime.recover.dynamicDelayMs;
    const jitter = 1 - JITTER_PCT + Math.random()*JITTER_PCT*2;
    return Math.max(100, Math.round(base*jitter));
  }

  /* ================= Loop Principal ================= */
  async function mainLoop(){
    runtime.startTs = runtime.startTs || now();
    while(runtime.running){
      await fetchCharges();
      if(!runtime.running) break;

      if (runtime.charges.count < 1){
        setStatus(L.waitingCharges);
        runtime.hudState='waiting';
        scheduleUIUpdate();
        let sec = Math.ceil(runtime.charges.cooldownMs/1000);
        while (sec>0 && runtime.running && runtime.charges.count<1){
          await sleep(1000);
            sec--;
          await fetchCharges();
        }
        if(!runtime.running) break;
        if(runtime.charges.count<1) continue;
      }

      const pos = nextPosition();
      const color = nextColor();
      const absX = config.user.startX + pos.x;
      const absY = config.user.startY + pos.y;

      runtime.attempts++;
      const delay = computeEffectiveDelay();
      const {success,status,latency} = await paintPixel(absX,absY,color);

      if (success){
        runtime.painted++;
        runtime.charges.count = Math.max(0, runtime.charges.count-1);
        runtime.lastPaint = {absX,absY,color,latency};
        runtime.lastSuccessTs = now();
        noteSuccessCoord(pos.x,pos.y);
        setStatus(L.pixelOk);
        log(`OK (${absX},${absY}) c${color} ep=${currentEndpoint()} d=${delay}ms lat=${latency|0}ms ${runtime.recover.useMinimal?'[min]':''}`);
        autoFixSuccess();
        if (config.user.effect) effect();
      } else {
        runtime.fails++;
        noteFailCoord(pos.x,pos.y);
        setStatus(`${L.pixelFail} (${status})`);
        log(`FAIL ${status} (${absX},${absY}) ep=${currentEndpoint()} d=${delay}ms`);
        autoFixFailure(status);
      }

      scheduleUIUpdate();
      await sleep(delay);
    }
    endSession();
  }

  function endSession(){
    if (!runtime.startTs) return;
    const durMs = now() - runtime.startTs;
    runtime.sessions.push({
      ts:new Date().toISOString(),
      painted:runtime.painted,
      attempts:runtime.attempts,
      fails:runtime.fails,
      durationMs:durMs,
      rate: runtime.attempts? runtime.painted/runtime.attempts:0
    });
    while (runtime.sessions.length>30) runtime.sessions.shift();
    saveSessions();
    runtime.startTs=null;
    log(L.sessionEnded);
  }

  /* ================= UI ================= */
  let panel, hud, areaEl;
  function buildUI(){
    injectStyles();
    panel = document.createElement('div');
    panel.className='afn-panel';
    panel.setAttribute('data-theme', config.user.theme);
    panel.innerHTML = `
      <div class="afn-header" id="afnHeader" aria-label="Painel AutoFarm">
        <div class="afn-title">
          <span class="badge">AF</span>
          <span>${L.title}</span>
          <span class="ver">${VERSION}</span>
        </div>
        <div class="afn-actions">
          <button id="btnMin" class="btn icon" title="Minimizar">🗕</button>
          <button id="btnRun" class="btn run" title="Iniciar / Parar">▶</button>
          <button id="btnNorm" class="btn icon" title="${L.normalize}">⏲</button>
          <button id="btnArea" class="btn icon" title="${L.area}">▦</button>
          <button id="btnClose" class="btn icon close" title="Fechar">×</button>
        </div>
      </div>
      <div class="afn-body">
        <div class="mini-line" id="afMini" aria-live="polite">Pronto</div>

        <div class="group grid">
          ${numberField(L.baseX,'startX')}
          ${numberField(L.baseY,'startY')}
          ${numberField(L.width,'width')}
          ${numberField(L.height,'height')}
          ${numberField(L.delay,'delayMs')}
          ${numberField(L.palette,'paletteSize')}
          <label class="field">
            <span>${L.colorMode}</span>
            <select data-key="colorMode">
              <option value="random">${L.random}</option>
              <option value="fixed">${L.fixedColor}</option>
            </select>
          </label>
          ${numberField(L.fixedColor,'fixedColor')}
          <label class="field">
            <span>${L.strategy}</span>
            <select data-key="positionStrategy">
              <option value="random">${L.random}</option>
              <option value="sequential">${L.sequential}</option>
              <option value="spiral">${L.spiral}</option>
            </select>
          </label>
          <label class="field">
            <span>${L.preset}</span>
            <select data-key="preset" id="presetSel">
              <option value="custom">Custom</option>
              <option value="slow">Slow</option>
              <option value="balanced">Balanced</option>
              <option value="fast">Fast</option>
              <option value="turbo">Turbo</option>
            </select>
          </label>
          <label class="field chk">
            <input type="checkbox" data-key="effect">
            <span>${L.effect}</span>
          </label>
            <label class="field chk">
              <input type="checkbox" data-key="showLog">
              <span>${L.log}</span>
            </label>
          <label class="field">
            <span>${L.theme}</span>
            <select data-key="theme">
              <option value="neon">Neon</option>
              <option value="dark">Dark</option>
              <option value="glass">Glass</option>
            </select>
          </label>
        </div>

        <div class="stats-box">
          <div class="stats-grid">
            <div class="stat"><b>${L.painted}</b><span id="stPainted">0</span></div>
            <div class="stat"><b>${L.attempts}</b><span id="stAttempts">0</span></div>
            <div class="stat"><b>${L.fails}</b><span id="stFails">0</span></div>
            <div class="stat"><b>${L.rate}</b><span id="stRate">0%</span></div>
            <div class="stat"><b>${L.charges}</b><span id="stCharges">0/0</span></div>
            <div class="stat"><b>${L.last}</b><span id="stLast">-</span></div>
            <div class="stat"><b>${L.delay}</b><span id="stDelay">-</span></div>
            <div class="stat"><b>${L.ep}</b><span id="stEP">-</span></div>
            <div class="stat"><b>403</b><span id="st403">0</span></div>
            <div class="stat"><b>429</b><span id="st429">0</span></div>
            <div class="stat"><b>Net</b><span id="stNet">0</span></div>
            <div class="stat"><b>PPM</b><span id="stPPM">0</span></div>
          </div>
          <div class="buttons-line">
            <button id="btnTest" class="btn sm">${L.test}</button>
            <button id="btnReset" class="btn sm">${L.reset}</button>
            <button id="btnExport" class="btn sm">${L.export}</button>
            <button id="btnImport" class="btn sm">${L.import}</button>
            <button id="btnCopy" class="btn sm">Copiar Stats</button>
          </div>
          <div id="afStatus" class="status">${L.statusStopped}</div>
        </div>

        <div class="log-wrap" id="logWrap">
          <div class="log" id="afLog"></div>
        </div>
      </div>
      <div class="afn-footer">© ${new Date().getFullYear()} ${BRAND} • AutoFix ON</div>
    `;
    document.body.appendChild(panel);
    draggable(panel.querySelector('#afnHeader'), panel);

    buildHUD();
    bindUI();
    refreshInputs();
    scheduleUIUpdate();
  }

  function buildHUD(){
    hud = document.createElement('div');
    hud.className='afn-hud';
    hud.innerHTML = `
      <div class="hud-inner" id="hudInner">
        <span class="hud-badge">AF</span>
        <span id="hudState">${L.idle}</span>
        <span id="hudMiniRate">0%</span>
      </div>`;
    document.body.appendChild(hud);
    hud.addEventListener('click',()=>toggleMinimized(false));
  }

  function numberField(label,key){
    return `<label class="field"><span>${label}</span><input type="number" data-key="${key}" step="1"></label>`;
  }

  function bindUI(){
    panel.addEventListener('click', e=>{
      const id = e.target.id;
      if (id==='btnRun') toggleRun(!runtime.running);
      else if (id==='btnClose') { removeHighlight(); panel.remove(); hud.remove(); runtime.running=false; }
      else if (id==='btnNorm'){ forceNormalize(true); scheduleUIUpdate(); }
      else if (id==='btnArea'){ toggleHighlight(); }
      else if (id==='btnTest'){ testPosition(); }
      else if (id==='btnReset'){ resetStats(); }
      else if (id==='btnExport'){ exportConfig(); }
      else if (id==='btnImport'){ importConfigPrompt(); }
      else if (id==='btnCopy'){ copyStats(); }
      else if (id==='btnMin'){ toggleMinimized(); }
    });

    panel.addEventListener('change', e=>{
      const el=e.target;
      if(!el.hasAttribute('data-key')) return;
      const k=el.getAttribute('data-key');
      if (el.type==='checkbox') config.user[k]=el.checked;
      else if (el.type==='number') config.user[k]=Number(el.value);
      else config.user[k]=el.value;

      if (k==='preset'){
        if (config.user.preset !== 'custom'){
          applyPreset(config.user.preset);
          return;
        }
      } else if (k==='delayMs'){
        config.user.preset='custom';
        refreshInputs(['preset']);
      }

      if (k==='theme') updateTheme();
      if (['startX','startY','width','height'].includes(k)) positionHighlight();
      if (k==='positionStrategy') resetStrategies();
      if (k==='showLog') toggleLogVisibility();

      clampNumeric();
      saveCfg();
      if (k==='delayMs'){
        runtime.recover.baseDelaySnapshot=config.user.delayMs;
        if (runtime.recover.dynamicDelayMs < config.user.delayMs)
          runtime.recover.dynamicDelayMs=config.user.delayMs;
      }
      scheduleUIUpdate();
    });

    document.addEventListener('keydown', e=>{
      if (e.ctrlKey && e.altKey){
        if (e.key.toLowerCase()==='s'){ toggleRun(!runtime.running); }
        if (e.key.toLowerCase()==='l'){ config.user.showLog=!config.user.showLog; toggleLogVisibility(); saveCfg(); }
        if (e.key.toLowerCase()==='h'){ toggleHighlight(); }
      }
    });
  }

  function resetStrategies(){
    runtime.seq={x:0,y:0};
    runtime.spiral={layer:0,dx:0,dy:0,leg:1,step:0,x:0,y:0};
  }

  function toggleMinimized(forceExpand){
    config.user.minimized = forceExpand===true ? false : !config.user.minimized;
    if (config.user.minimized){
      panel.classList.add('minimized');
      hud.classList.add('visible');
    } else {
      panel.classList.remove('minimized');
      hud.classList.remove('visible');
    }
    saveCfg();
  }

  function refreshInputs(only){
    panel.querySelectorAll('[data-key]').forEach(el=>{
      const k=el.getAttribute('data-key');
      if (only && !only.includes(k)) return;
      if (!(k in config.user)) return;
      if (el.type==='checkbox') el.checked=!!config.user[k];
      else el.value = config.user[k];
    });
    if (config.user.minimized) panel.classList.add('minimized');
  }

  function setStatus(msg){
    const e=byId('afStatus'); if(e) e.textContent=msg;
  }

  function scheduleUIUpdate(){
    const nowTs = now();
    if (nowTs - runtime.lastUIUpdate < UI_UPDATE_INTERVAL_MS) return;
    runtime.lastUIUpdate = nowTs;
    requestAnimationFrame(updateStatsUI);
  }

  function updateStatsUI(){
    setTxt('stPainted', runtime.painted);
    setTxt('stAttempts', runtime.attempts);
    setTxt('stFails', runtime.fails);
    setTxt('stCharges', `${runtime.charges.count}/${runtime.charges.max}`);
    if (runtime.lastPaint){
      setTxt('stLast', `${runtime.lastPaint.absX},${runtime.lastPaint.absY} c${runtime.lastPaint.color}`);
    }
    const rate = runtime.attempts ? (runtime.painted/runtime.attempts)*100 : 0;
    setTxt('stRate', rate.toFixed(1)+'%');
    const ppm = runtime.startTs ? ( runtime.painted / Math.max(1, (now()-runtime.startTs)/60000) ).toFixed(1) : '0.0';
    setTxt('stPPM', ppm);
    setTxt('stDelay', `${runtime.recover.dynamicDelayMs}ms(${runtime.recover.baseDelaySnapshot})`);
    setTxt('stEP', currentEndpoint());
    setTxt('st403', runtime.counters.c403);
    setTxt('st429', runtime.counters.c429);
    setTxt('stNet', runtime.counters.cNet);
    updateRateColor(rate);
    updateHUD(rate);
  }

  function updateRateColor(rate){
    const el=byId('stRate');
    if (!el) return;
    el.className='';
    if (rate>=80) el.classList.add('good');
    else if (rate>=50) el.classList.add('warn');
    else el.classList.add('bad');
  }

  function updateHUD(rate){
    if (!hud) return;
    const stateSpan = byId('hudState');
    const rateSpan = byId('hudMiniRate');
    stateSpan.textContent = runtime.running ? (runtime.charges.count<1?L.waiting:L.running) : L.idle;
    rateSpan.textContent = (rate||0).toFixed(0)+'%';
    hud.classList.remove('state-idle','state-run','state-wait','state-err');
    if (!runtime.running) hud.classList.add('state-idle');
    else if (runtime.charges.count<1) hud.classList.add('state-wait');
    else hud.classList.add('state-run');
  }

  function setTxt(id,v){ const e=byId(id); if(e) e.textContent=v; }

  function toggleRun(run){
    if (run===runtime.running) return;
    runtime.running=run;
    const btn=byId('btnRun');
    if (btn) btn.textContent = run ? '⏸':'▶';
    setStatus(run?L.statusRunning:L.statusStopped);
    runtime.hudState = run?'running':'idle';
    if (run){
      log('Iniciado');
      runtime.startTs = now();
      initAutoFix();
      runtime.lastSuccessTs=null;
      mainLoop();
    } else {
      log('Parado');
      endSession();
    }
    scheduleUIUpdate();
  }

  function testPosition(){
    const p=nextPosition(); const c=nextColor();
    log(`Teste: rel(${p.x},${p.y}) c${c}`);
  }

  function resetStats(){
    runtime.attempts=0;
    runtime.painted=0;
    runtime.fails=0;
    runtime.lastPaint=null;
    runtime.counters.c403=runtime.counters.c429=runtime.counters.cNet=0;
    runtime.failCount.clear();
    runtime.quarantine.clear();
    resetStrategies();
    initAutoFix();
    scheduleUIUpdate();
    log('Estatísticas resetadas');
  }

  function exportConfig(){
    const data = {
      config:config.user,
      ts:new Date().toISOString(),
      version:VERSION
    };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='autofarm-config.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importConfigPrompt(){
    const inp=document.createElement('input');
    inp.type='file';
    inp.accept='.json,application/json';
    inp.onchange=()=>{
      const f=inp.files?.[0]; if(!f) return;
      const reader=new FileReader();
      reader.onload=()=>{
        try{
          const j=JSON.parse(reader.result);
          if (j && j.config){
            Object.assign(config.user, j.config);
            saveCfg();
            refreshInputs();
            initAutoFix();
            scheduleUIUpdate();
            log(L.imported);
          } else log(L.importFail,'warn');
        }catch{ log(L.importFail,'warn'); }
      };
      reader.readAsText(f);
    };
    inp.click();
  }

  async function copyStats(){
    const txt = `AutoFarm Stats
Painted: ${runtime.painted}
Attempts: ${runtime.attempts}
Fails: ${runtime.fails}
Rate: ${runtime.attempts?((runtime.painted/runtime.attempts)*100).toFixed(2)+'%':'0%'}
Charges: ${runtime.charges.count}/${runtime.charges.max}
Delay: ${runtime.recover.dynamicDelayMs} (base ${runtime.recover.baseDelaySnapshot})
Endpoint: ${currentEndpoint()}
403: ${runtime.counters.c403} 429: ${runtime.counters.c429} Net: ${runtime.counters.cNet}
Área: ${config.user.startX},${config.user.startY} ${config.user.width}x${config.user.height}
Preset: ${config.user.preset}
`;
    try {
      await navigator.clipboard.writeText(txt);
      log(L.statsCopied);
    } catch {
      log('Falha ao copiar','warn');
    }
  }

  function toggleLogVisibility(){
    const wrap = byId('logWrap');
    if (!wrap) return;
    wrap.style.display = config.user.showLog ? 'block':'none';
  }

  /* ================= Highlight ================= */
  function ensureAreaEl(){
    if (areaEl) return;
    areaEl=document.createElement('div');
    areaEl.id='afnAreaHl';
    document.body.appendChild(areaEl);
  }
  function positionHighlight(){
    if (!areaEl || !runtime.highlightVisible) return;
    areaEl.style.left = config.user.startX+'px';
    areaEl.style.top  = config.user.startY+'px';
    areaEl.style.width= config.user.width+'px';
    areaEl.style.height=config.user.height+'px';
  }
  function toggleHighlight(){
    runtime.highlightVisible = !runtime.highlightVisible;
    if (runtime.highlightVisible){
      ensureAreaEl();
      areaEl.style.display='block';
      positionHighlight();
      log('[Área] visível');
    } else if (areaEl){
      areaEl.style.display='none';
      log('[Área] oculta');
    }
  }
  function removeHighlight(){
    if(areaEl) areaEl.remove();
    areaEl=null;
    runtime.highlightVisible=false;
  }

  /* ================= Efeito Visual ================= */
  let fxEl;
  function effect(){
    if (!config.user.effect) return;
    if (!fxEl){
      fxEl=document.createElement('div');
      fxEl.className='afn-fx';
      document.body.appendChild(fxEl);
    }
    fxEl.classList.remove('anim');
    void fxEl.offsetWidth;
    fxEl.classList.add('anim');
  }

  /* ================= Presets ================= */
  const PRESETS = {
    slow:     {delayMs:1800},
    balanced: {delayMs:1200},
    fast:     {delayMs:850},
    turbo:    {delayMs:620}
  };
  function applyPreset(name){
    const p = PRESETS[name];
    if(!p) return;
    config.user.delayMs = p.delayMs;
    config.user.preset = name;
    initAutoFix();
    refreshInputs(['delayMs','preset']);
    saveCfg();
    scheduleUIUpdate();
    log(`[Preset] ${name} (${p.delayMs}ms)`);
  }

  /* ================= Tema ================= */
  function updateTheme(){
    if (!panel) return;
    panel.setAttribute('data-theme', config.user.theme);
    saveCfg();
  }

  /* ================= Drag ================= */
  function draggable(handle,root){
    let drag=false,ox=0,oy=0;
    handle.addEventListener('mousedown',e=>{
      if (e.target.closest('.afn-actions')) return;
      drag=true; ox=e.clientX-root.offsetLeft; oy=e.clientY-root.offsetTop;
      document.addEventListener('mousemove',mv);
      document.addEventListener('mouseup',up);
    });
    function mv(e){ if(!drag) return; root.style.left=(e.clientX-ox)+'px'; root.style.top=(e.clientY-oy)+'px'; }
    function up(){ drag=false; document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); }
  }

  /* ================= Estilos ================= */
  function injectStyles(){
    if (document.getElementById('afn-style')) return;
    const st=document.createElement('style');
    st.id='afn-style';
    st.textContent=`
      :root{
        --afn-bg:#0e1824;
        --afn-bg2:#142335;
        --afn-border:#263445;
        --afn-accent:#4b68ff;
        --afn-text:#ecf4ff;
        --afn-good:#5ff18d;
        --afn-warn:#ffcf5a;
        --afn-bad:#ff7b6b;
        --afn-shadow:0 10px 28px -10px #000c;
      }
      .afn-panel[data-theme="dark"]{
        --afn-bg:#12161d;--afn-bg2:#1c2531;--afn-border:#2a3848;--afn-accent:#4b68ff;--afn-text:#dfebf7;
      }
      .afn-panel[data-theme="glass"]{
        --afn-bg:rgba(18,26,38,0.6);--afn-bg2:rgba(28,40,58,.6);--afn-border:#2e4052;--afn-accent:#4b68ff;--afn-text:#f0f6ff;
        backdrop-filter:blur(14px) saturate(1.4);
      }
      .afn-panel{position:fixed;top:80px;left:40px;z-index:999999;font:12px/1.4 Inter,Arial,sans-serif;
        width:390px;border-radius:18px;overflow:hidden;background:linear-gradient(155deg,var(--afn-bg2),var(--afn-bg));
        color:var(--afn-text);border:1px solid var(--afn-border);box-shadow:var(--afn-shadow);display:flex;flex-direction:column;
        transition:.25s;}
      .afn-panel.minimized{height:auto;width:240px;}
      .afn-panel.minimized .afn-body,
      .afn-panel.minimized .afn-footer{display:none;}
      .afn-header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;
        background:linear-gradient(140deg,var(--afn-bg2),var(--afn-bg));cursor:move;user-select:none;}
      .afn-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;letter-spacing:.5px;}
      .afn-title .badge{background:var(--afn-accent);padding:2px 6px;border-radius:8px;font-size:11px;font-weight:600;
        color:#fff;box-shadow:0 0 8px var(--afn-accent);}
      .afn-title .ver{font-size:10px;opacity:.6;font-weight:500;}
      .afn-actions{display:flex;gap:6px;}
      .btn{background:#1d2c3b;border:1px solid var(--afn-border);color:var(--afn-text);padding:5px 10px;border-radius:10px;
        font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-weight:500;transition:.2s;}
      .btn:hover{background:#27384a;}
      .btn.run{background:#256b44;border-color:#2f7d51;}
      .btn.run:hover{background:#2e7f51;}
      .btn.close{background:#7d3131;border-color:#8e3a3a;}
      .btn.close:hover{background:#934040;}
      .btn.icon{width:36px;justify-content:center;padding:5px;}
      .btn.sm{padding:4px 8px;font-size:10px;}
      .afn-body{padding:12px 14px;display:flex;flex-direction:column;gap:14px;max-height:68vh;overflow:auto;}
      .mini-line{font-size:11px;background:#182533;border:1px solid #243445;padding:6px 8px;border-radius:8px;
        color:#bcd8f6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .group.grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
        background:linear-gradient(150deg,var(--afn-bg2),var(--afn-bg));padding:10px;border:1px solid var(--afn-border);
        border-radius:14px;}
      .field{display:flex;flex-direction:column;gap:4px;font-size:11px;}
      .field>span{font-size:10px;font-weight:600;letter-spacing:.6px;color:#97c7ff;text-transform:uppercase;}
      .field input,.field select{background:#142232;border:1px solid #2a3b4e;color:var(--afn-text);
        padding:6px 6px;border-radius:8px;font-size:11px;outline:none;}
      .field input:focus,.field select:focus{border-color:var(--afn-accent);}
      .field.chk{flex-direction:row;align-items:center;}
      .field.chk span{font-size:11px;font-weight:500;color:var(--afn-text);text-transform:none;letter-spacing:0;}
      .stats-box{display:flex;flex-direction:column;gap:10px;padding:10px;border:1px solid var(--afn-border);
        background:linear-gradient(160deg,var(--afn-bg2),var(--afn-bg));border-radius:14px;}
      .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;}
      .stat{background:#121d29;border:1px solid #243545;border-radius:10px;padding:6px 8px;display:flex;flex-direction:column;
        gap:2px;font-size:11px;min-height:48px;justify-content:center;}
      .stat b{font-size:10px;opacity:.7;font-weight:600;letter-spacing:.6px;text-transform:uppercase;}
      .stat span{font-size:13px;font-weight:600;}
      .status{background:#162433;border:1px solid #243647;padding:6px 8px;border-radius:10px;font-size:11px;}
      .buttons-line{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;}
      .log-wrap{border:1px solid var(--afn-border);background:linear-gradient(140deg,var(--afn-bg2),var(--afn-bg));
        border-radius:14px;padding:8px;}
      .log{height:140px;overflow:auto;font:10px/1.4 monospace;}
      .afn-footer{background:linear-gradient(140deg,var(--afn-bg2),var(--afn-bg));padding:6px 10px;font-size:10px;
        text-align:center;color:#7c92ad;border-top:1px solid var(--afn-border);}
      .good{color:var(--afn-good);} .warn{color:var(--afn-warn);} .bad{color:var(--afn-bad);}
      .afn-fx{position:fixed;top:50%;left:50%;transform:translate(-50%, -50%);font-size:42px;color:var(--afn-accent);
        pointer-events:none;opacity:0;}
      .afn-fx.anim{animation:afnPulse 1.1s ease-out forwards;}
      @keyframes afnPulse{0%{opacity:.9;transform:translate(-50%,-50%) scale(.4);}60%{opacity:.4;}
        100%{opacity:0;transform:translate(-50%,-50%) scale(1.8);} }
      #afnAreaHl{position:absolute;pointer-events:none;border:2px solid var(--afn-accent);
        box-shadow:0 0 10px var(--afn-accent) inset,0 0 6px var(--afn-accent);z-index:99998;border-radius:6px;
        background:rgba(75,104,255,0.07);transition:.25s;}
      .afn-hud{position:fixed;bottom:16px;left:16px;z-index:999999;display:none;}
      .afn-hud.visible{display:block;}
      .hud-inner{background:linear-gradient(145deg,var(--afn-bg2),var(--afn-bg));border:1px solid var(--afn-border);
        padding:6px 10px;border-radius:14px;display:flex;align-items:center;gap:8px;font:12px/1 Inter,Arial,sans-serif;
        color:var(--afn-text);cursor:pointer;box-shadow:var(--afn-shadow);}
      .hud-badge{background:var(--afn-accent);padding:2px 6px;border-radius:8px;font-size:11px;font-weight:600;}
      .afn-hud.state-run .hud-inner{box-shadow:0 0 0 1px var(--afn-accent),0 0 12px -2px var(--afn-accent);}
      .afn-hud.state-wait .hud-inner{box-shadow:0 0 0 1px var(--afn-warn),0 0 12px -2px var(--afn-warn);}
      .afn-hud.state-idle .hud-inner{opacity:.85;}
      .afn-hud.state-err .hud-inner{box-shadow:0 0 0 1px var(--afn-bad),0 0 12px -2px var(--afn-bad);}
      .afn-body::-webkit-scrollbar,.log::-webkit-scrollbar{width:8px;}
      .afn-body::-webkit-scrollbar-track,.log::-webkit-scrollbar-track{background:#0e1723;}
      .afn-body::-webkit-scrollbar-thumb,.log::-webkit-scrollbar-thumb{background:#243545;border-radius:8px;}
      .afn-body::-webkit-scrollbar-thumb:hover,.log::-webkit-scrollbar-thumb:hover{background:#325067;}
    `;
    document.head.appendChild(st);
  }

  /* ================= Init ================= */
  function init(){
    if (runtime.inited) return;
    runtime.inited=true;
    clampNumeric();
    buildUI();
    initAutoFix();
    toggleLogVisibility();
    log('Pronto (AutoFix ON)');
  }

  document.addEventListener('visibilitychange', ()=>{
    if (document.visibilityState==='hidden' && runtime.running){
      // (opcional: pausar) – mantido rodando
    }
  });

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState==='interactive'||document.readyState==='complete') init();

})();
