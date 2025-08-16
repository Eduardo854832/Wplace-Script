// ==UserScript==
// @name         WPlace Auto-Farm Simples + AutoFix (Enhanced Toggle)
// @description  Versão simples com AutoFix opcional, destaque da área, modo sequencial, normalizar rápido, delay/endpoint visíveis, quarentena e smart restart.
// @version      1.3.0
// @author       Eduardo
// @match        https://wplace.live/*
// @match        https://www.wplace.live/*
// @run-at       document-end
// ==/UserScript==

(function(){
  'use strict';

  if (window.__WPLACE_AUTOFARM_SIMPLE_ENH) {
    console.warn('[AutoFarm] Já carregado.');
    return;
  }
  window.__WPLACE_AUTOFARM_SIMPLE_ENH = true;

  const BRAND = 'AutoFarm';
  const LS_KEY = 'wplace_auto_farm_simple_cfg_v130';
  const PIXEL_TIMEOUT_MS = 7000;          // Timeout para requisição de pintura
  const SMART_RESTART_MAX_NO_SUCCESS_MS = 5 * 60 * 1000; // 5 min sem sucesso
  const SMART_RESTART_MAX_FAIL_STREAK   = 120;           // 120 falhas seguidas

  /* ============== Persistência ============== */
  const loadCfg = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } };
  const saveCfg = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(config.user)); } catch(_){} };

  /* ============== Config & Estado ============== */
  const config = {
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
      lastLog:[],
      highlightVisible:false,
      // AutoFix runtime
      recover:{
        failStreak:0,
        consecutive403:0,
        consecutive429:0,
        networkErrors:0,
        endpointIdx:0,
        useMinimal:false,
        dynamicDelayMs:0,
        baseDelaySnapshot:0
      },
      // Counters para UI
      counters:{
        c403:0,
        c429:0,
        cNet:0
      },
      // Sequencial
      seq:{x:0,y:0},
      // Quarentena de coordenadas
      quarantine:new Map(), // key->releaseTs
      failCount:new Map()   // key->consecutive fails
    },
    user: Object.assign({
      startX:742,
      startY:1148,
      width:50,
      height:50,
      delayMs:1200,
      paletteSize:32,
      colorMode:'random',      // random | fixed
      fixedColor:0,
      positionMode:'random',   // random | sequential
      enableEffect:true,
      showWatermark:true,
      watermarkOpacity:0.08,
      watermarkSize:220,
      watermarkRotation:-25,
      debug:false,
      enableAutoFix:true       // NOVO: toggle principal do AutoFix
    }, loadCfg())
  };

  const L = {
    title:'Auto-Farm Simples',
    start:'Iniciar',
    stop:'Parar',
    baseX:'Base X', baseY:'Base Y', width:'Largura', height:'Altura',
    delay:'Delay (ms)', palette:'Paleta', colorMode:'Modo Cor', fixedColor:'Cor Fixa',
    painted:'Pintados', attempts:'Tentativas', fails:'Falhas', rate:'Taxa Sucesso',
    last:'Último Pixel', charges:'Cargas', testPixel:'Teste', reset:'Reset',
    modeRandom:'Aleatória', modeFixed:'Fixa', posMode:'Posição',
    statusStopped:'Parado', statusStarted:'Rodando...',
    paintedOk:'Pixel pintado', fail:'Falha', waiting:'Aguardando cargas',
    watermark:'Marca d\'água', enableEffect:'Efeito', debug:'Log Debug',
    area:'Área', normalize:'Normalizar', autoFix:'AutoFix'
  };

  /* ============== Utils ============== */
  const sleep = ms=>new Promise(r=>setTimeout(r,ms));
  const escapeHtml = s=>(s||'').toString().replace(/[&<>"'`]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
  const log = (m,type='info')=>{
    config.runtime.lastLog.unshift(m);
    if(config.runtime.lastLog.length>260) config.runtime.lastLog.pop();
    if(config.user.debug){
      (type==='error'?console.error:(type==='warn'?console.warn:console.log))('[AF]',m);
    }
    const box = byId('afLog');
    if (box) box.innerHTML = config.runtime.lastLog.slice(0,180).map(l=>`<div>${escapeHtml(l)}</div>`).join('');
    const mini = byId('afMiniLine');
    if (mini) mini.textContent = (config.user.enableAutoFix ? '' : '[AutoFix OFF] ') + m;
  };

  const clamp = () => {
    config.user.width = Math.max(1, parseInt(config.user.width)||1);
    config.user.height = Math.max(1, parseInt(config.user.height)||1);
    config.user.paletteSize = Math.max(1, parseInt(config.user.paletteSize)||1);
  };

  /* ============== AutoFix ============== */
  const ENDPOINTS = ['s0','s1','pixel'];

  function initAutoFixState() {
    const r = config.runtime.recover;
    r.dynamicDelayMs = config.user.delayMs;
    r.baseDelaySnapshot = config.user.delayMs;
    r.useMinimal = false;
  }
  function currentEndpoint(){ return ENDPOINTS[ config.runtime.recover.endpointIdx % ENDPOINTS.length ]; }

  function autoFixOnSuccess(){
    if (!config.user.enableAutoFix) return;
    const r = config.runtime.recover;
    r.failStreak=0; r.consecutive403=0; r.consecutive429=0; r.networkErrors=0;
    if (r.dynamicDelayMs > r.baseDelaySnapshot) {
      r.dynamicDelayMs = Math.max(r.baseDelaySnapshot, Math.floor(r.dynamicDelayMs * 0.85));
      log(`[AutoFix] Reduzindo delay para ${r.dynamicDelayMs}ms`);
    }
    if (r.useMinimal && config.runtime.painted % 12 === 0) {
      r.useMinimal=false;
      log('[AutoFix] Restaurando payload completo');
    }
  }

  function autoFixOnFailure(status){
    if (!config.user.enableAutoFix) return;
    const r = config.runtime.recover;
    r.failStreak++;
    if (status === 403){
      config.runtime.counters.c403++;
      r.consecutive403++;
      if(!r.useMinimal){
        r.useMinimal=true;
        log('[AutoFix] 403 -> payload minimal');
      } else if (r.consecutive403 === 2){
        r.endpointIdx=(r.endpointIdx+1)%ENDPOINTS.length;
        log(`[AutoFix] 403 persistente -> endpoint ${currentEndpoint()}`);
      } else if (r.consecutive403 > 2){
        r.dynamicDelayMs = Math.min(r.dynamicDelayMs + 400, r.baseDelaySnapshot*6);
        log(`[AutoFix] 403 repetido -> delay ${r.dynamicDelayMs}ms`);
      }
    } else r.consecutive403=0;

    if (status === 429){
      config.runtime.counters.c429++;
      r.consecutive429++;
      const mult = 1.25 + 0.1*Math.min(r.consecutive429,4);
      const nd = Math.min(Math.floor(r.dynamicDelayMs*mult), r.baseDelaySnapshot*8);
      if (nd>r.dynamicDelayMs){
        r.dynamicDelayMs=nd;
        log(`[AutoFix] 429 -> delay ${r.dynamicDelayMs}ms`);
      }
    } else r.consecutive429=0;

    if (status === 0){
      config.runtime.counters.cNet++;
      r.networkErrors++;
      r.dynamicDelayMs = Math.min(Math.floor(r.dynamicDelayMs*1.4 + 200), r.baseDelaySnapshot*6);
      log(`[AutoFix] Rede -> backoff ${r.dynamicDelayMs}ms (#${r.networkErrors})`);
      if (r.networkErrors % 3 === 0){
        r.endpointIdx=(r.endpointIdx+1)%ENDPOINTS.length;
        log(`[AutoFix] Rede instável -> endpoint ${currentEndpoint()}`);
      }
    } else r.networkErrors=0;

    smartRestartCheck();
  }

  function forceNormalize(manual=true){
    const r = config.runtime.recover;
    r.useMinimal=false;
    r.endpointIdx=0;
    r.dynamicDelayMs = r.baseDelaySnapshot = config.user.delayMs;
    r.consecutive403=r.consecutive429=r.networkErrors=r.failStreak=0;
    if (manual) log('[AutoFix] Normalizado manualmente');
    else log('[AutoFix] Normalizado (Smart Restart)');
    config.runtime.counters.c403=0;
    config.runtime.counters.c429=0;
    config.runtime.counters.cNet=0;
  }

  function smartRestartCheck(){
    if (!config.user.enableAutoFix) return;
    const r = config.runtime.recover;
    const now = Date.now();
    const noSuccessDuration = config.runtime.lastSuccessTs ? (now - config.runtime.lastSuccessTs) : 0;
    if ((config.runtime.painted>0 && noSuccessDuration > SMART_RESTART_MAX_NO_SUCCESS_MS) ||
        r.failStreak >= SMART_RESTART_MAX_FAIL_STREAK) {
      forceNormalize(false);
    }
  }

  /* ============== API servidor ============== */
  async function fetchCharges() {
    try {
      const r = await fetch('https://backend.wplace.live/me',{credentials:'include',cache:'no-cache'});
      if(!r.ok) return;
      const j = await r.json().catch(()=>null);
      if (!j || !j.charges) return;
      config.runtime.userInfo=j;
      config.runtime.charges.count = Math.floor(j.charges.count);
      config.runtime.charges.max   = Math.floor(j.charges.max);
      config.runtime.charges.cooldownMs = j.charges.cooldownMs;
      updateStatsUI();
    } catch {}
  }

  async function paintPixel(absX,absY,color){
    const rcv = config.runtime.recover;
    const ep = currentEndpoint();
    const body = (config.user.enableAutoFix && rcv.useMinimal)
      ? {x:absX,y:absY,color}
      : {x:absX,y:absY,color,brand:'AF'};
    const controller = new AbortController();
    const t = setTimeout(()=>controller.abort(), PIXEL_TIMEOUT_MS);
    try {
      const res = await fetch(`https://backend.wplace.live/${ep}/pixel/${absX}/${absY}`,{
        method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(t);
      let ok=false;
      if (res.ok){
        const j = await res.json().catch(()=>({}));
        ok = j.painted===1 || j.ok===true || j.success===1;
      }
      return {success:ok,status:res.status};
    } catch(e){
      clearTimeout(t);
      return {success:false,status:0, aborted:e.name==='AbortError'};
    }
  }

  /* ============== Cores & Posições ============== */
  function clampColor(c){ return Math.max(0, Math.min(config.user.paletteSize-1, isNaN(c)?0:c)); }
  function nextColor(){
    return config.user.colorMode==='fixed'
      ? clampColor(config.user.fixedColor)
      : Math.floor(Math.random()*config.user.paletteSize);
  }

  function nextPosition(){
    const mode = config.user.positionMode;
    if (mode === 'sequential'){
      const s = config.runtime.seq;
      const pos = {x:s.x,y:s.y};
      s.x++;
      if (s.x >= config.user.width){
        s.x=0; s.y++;
        if (s.y >= config.user.height){
          s.y=0;
        }
      }
      if (config.user.enableAutoFix) {
        // saltar quarentena só em random; sequencial ainda tenta, mas podemos pular:
        if (isQuarantined(pos.x,pos.y)) return nextPosition(); // recursivo leve
      }
      return pos;
    }
    // Random
    if (config.user.enableAutoFix){
      for (let i=0;i<300;i++){
        const x = Math.floor(Math.random()*config.user.width);
        const y = Math.floor(Math.random()*config.user.height);
        if (!isQuarantined(x,y)) return {x,y};
      }
    }
    return {
      x: Math.floor(Math.random()*config.user.width),
      y: Math.floor(Math.random()*config.user.height)
    };
  }

  /* ============== Quarentena (somente se AutoFix ON) ============== */
  const QUARANTINE_FAIL_LIMIT = 3;
  const QUARANTINE_DURATION_MS = 2*60*1000;
  function coordKey(x,y){ return `${x},${y}`; }
  function noteFailureCoord(relX,relY){
    if (!config.user.enableAutoFix) return;
    const k = coordKey(relX,relY);
    const prev = config.runtime.failCount.get(k)||0;
    const now = prev+1;
    config.runtime.failCount.set(k, now);
    if (now >= QUARANTINE_FAIL_LIMIT){
      config.runtime.quarantine.set(k, Date.now()+QUARANTINE_DURATION_MS);
      config.runtime.failCount.set(k,0);
      log(`[Quarentena] (${relX},${relY}) por 2min`);
    }
  }
  function noteSuccessCoord(relX,relY){
    if (!config.user.enableAutoFix) return;
    const k = coordKey(relX,relY);
    config.runtime.failCount.delete(k);
    config.runtime.quarantine.delete(k);
  }
  function isQuarantined(relX,relY){
    if (!config.user.enableAutoFix) return false;
    const k=coordKey(relX,relY);
    if (!config.runtime.quarantine.has(k)) return false;
    if (Date.now() > config.runtime.quarantine.get(k)){
      config.runtime.quarantine.delete(k);
      return false;
    }
    return true;
  }

  /* ============== Loop Principal ============== */
  async function mainLoop(){
    const rcv = config.runtime.recover;
    while (config.runtime.running){
      await fetchCharges();
      if (!config.runtime.running) break;

      if (config.runtime.charges.count < 1){
        updateStatus(L.waiting);
        let sec = Math.ceil(config.runtime.charges.cooldownMs/1000);
        while (sec>0 && config.runtime.running && config.runtime.charges.count<1){
          await sleep(1000);
          sec--;
          await fetchCharges();
        }
        if (!config.runtime.running) break;
        if (config.runtime.charges.count<1) continue;
      }

      const pos = nextPosition();
      const color = nextColor();
      const absX = config.user.startX + pos.x;
      const absY = config.user.startY + pos.y;

      config.runtime.attempts++;
      const effectiveDelay = config.user.enableAutoFix ? rcv.dynamicDelayMs : config.user.delayMs;
      const res = await paintPixel(absX,absY,color);
      if (res.success){
        config.runtime.painted++;
        config.runtime.charges.count = Math.max(0, config.runtime.charges.count - 1);
        config.runtime.lastPaint = {absX,absY,color};
        config.runtime.lastSuccessTs = Date.now();
        noteSuccessCoord(pos.x,pos.y);
        updateStatus(L.paintedOk);
        log(`OK (${absX},${absY}) c${color} ep=${currentEndpoint()} d=${effectiveDelay}ms min=${rcv.useMinimal && config.user.enableAutoFix ? 'Y':'N'}`);
        autoFixOnSuccess();
        if (config.user.enableEffect) effect();
      } else {
        config.runtime.fails++;
        noteFailureCoord(pos.x,pos.y);
        updateStatus(`${L.fail} (${res.status}${res.aborted?'/timeout':''})`);
        log(`FAIL ${res.status}${res.aborted?'/TO':''} (${absX},${absY}) ep=${currentEndpoint()} d=${effectiveDelay}ms`);
        autoFixOnFailure(res.status);
      }

      updateStatsUI();
      await sleep(effectiveDelay);
    }
  }

  /* ============== UI ============== */
  let panel;
  function buildUI(){
    if (panel) return;
    injectStyles();
    injectWatermark();
    panel = document.createElement('div');
    panel.className='af-panel';
    panel.innerHTML = `
      <div class="af-header">
        <div class="af-title">${L.title}</div>
        <div class="af-actions">
          <button id="afBtnRun" class="af-btn run">▶ ${L.start}</button>
          <button id="afBtnNormalize" class="af-btn sm" title="Forçar estado padrão">${L.normalize}</button>
          <button id="afBtnArea" class="af-btn sm" title="Mostrar/Ocultar área">${L.area}</button>
          <button id="afBtnClose" class="af-btn close" title="Fechar">×</button>
        </div>
      </div>
      <div class="af-body">
        <div class="af-mini-line" id="afMiniLine">Pronto</div>
        <div class="af-section">
          <div class="af-grid">
            ${fieldNumber(L.baseX,'startX')}
            ${fieldNumber(L.baseY,'startY')}
            ${fieldNumber(L.width,'width')}
            ${fieldNumber(L.height,'height')}
            ${fieldNumber(L.delay,'delayMs')}
            ${fieldNumber(L.palette,'paletteSize')}
            <label class="af-field">
              <span>${L.colorMode}</span>
              <select data-key="colorMode">
                <option value="random">${L.modeRandom}</option>
                <option value="fixed">${L.modeFixed}</option>
              </select>
            </label>
            ${fieldNumber(L.fixedColor,'fixedColor')}
            <label class="af-field">
              <span>${L.posMode}</span>
              <select data-key="positionMode">
                <option value="random">Random</option>
                <option value="sequential">Sequencial</option>
              </select>
            </label>
            ${checkboxField(L.autoFix,'enableAutoFix')}
            ${checkboxField(L.enableEffect,'enableEffect')}
            ${checkboxField(L.watermark,'showWatermark')}
            ${checkboxField(L.debug,'debug')}
          </div>
        </div>
        <div class="af-section stats">
          <div class="af-stats">
            <div><b>${L.painted}:</b> <span id="afPainted">0</span></div>
            <div><b>${L.attempts}:</b> <span id="afAttempts">0</span></div>
            <div><b>${L.fails}:</b> <span id="afFails">0</span></div>
            <div><b>${L.rate}:</b> <span id="afRate" class="af-rate">0%</span></div>
            <div><b>${L.charges}:</b> <span id="afCharges">0/0</span></div>
            <div><b>${L.last}:</b> <span id="afLast">-</span></div>
            <div><b>Delay:</b> <span id="afDelayDyn">-</span></div>
            <div><b>EP:</b> <span id="afEP">-</span></div>
            <div><b>403:</b> <span id="afC403">0</span></div>
            <div><b>429:</b> <span id="afC429">0</span></div>
            <div><b>Rede:</b> <span id="afCNet">0</span></div>
          </div>
          <div id="afStatus" class="af-status">${L.statusStopped}</div>
          <div class="af-buttons-line">
            <button id="afBtnTest" class="af-btn sm">${L.testPixel}</button>
            <button id="afBtnReset" class="af-btn sm">${L.reset}</button>
          </div>
        </div>
        <div class="af-section">
          <div class="af-log" id="afLog"></div>
        </div>
      </div>
      <div class="af-footer">© ${new Date().getFullYear()} ${BRAND} - AutoFix Toggle</div>
    `;
    document.body.appendChild(panel);
    draggable(panel.querySelector('.af-header'),panel);
    bindUI();
    refreshInputs();
    updateStatsUI();
  }

  function fieldNumber(label,key){
    return `<label class="af-field"><span>${label}</span><input type="number" data-key="${key}" step="1"></label>`;
  }
  function checkboxField(label,key){
    return `<label class="af-field chk"><input type="checkbox" data-key="${key}"><span>${label}</span></label>`;
  }

  function bindUI(){
    panel.addEventListener('click', e=>{
      if (e.target.id==='afBtnRun') toggleRun(!config.runtime.running);
      else if (e.target.id==='afBtnClose') { removeHighlight(); panel.remove(); }
      else if (e.target.id==='afBtnTest') testPosition();
      else if (e.target.id==='afBtnReset') resetStats();
      else if (e.target.id==='afBtnNormalize'){ forceNormalize(true); updateStatsUI(); }
      else if (e.target.id==='afBtnArea'){ toggleHighlight(); }
    });
    panel.addEventListener('change', e=>{
      const inp = e.target;
      if(!inp.hasAttribute('data-key')) return;
      const k = inp.getAttribute('data-key');
      if (inp.type==='checkbox') config.user[k]=inp.checked;
      else if (inp.type==='number') config.user[k]=Number(inp.value);
      else config.user[k]=inp.value;
      clamp();
      saveCfg();
      if (k==='delayMs'){
        config.runtime.recover.baseDelaySnapshot=config.user.delayMs;
        if (config.runtime.recover.dynamicDelayMs < config.user.delayMs)
          config.runtime.recover.dynamicDelayMs=config.user.delayMs;
      }
      if (k==='showWatermark' || k.startsWith('watermark')) updateWatermark();
      if (k==='positionMode') config.runtime.seq={x:0,y:0};
      if (['startX','startY','width','height'].includes(k)) positionHighlight();
      if (k==='enableAutoFix') {
        if (!config.user.enableAutoFix){
          // Desativar efeitos dinâmicos
          forceNormalize(false);
          log('[AutoFix] Desativado pelo usuário');
        } else {
          initAutoFixState();
          log('[AutoFix] Ativado');
        }
        updateStatsUI();
      }
    });
  }

  function refreshInputs(){
    panel.querySelectorAll('[data-key]').forEach(el=>{
      const k=el.getAttribute('data-key');
      if (!(k in config.user)) return;
      if (el.type==='checkbox') el.checked=!!config.user[k];
      else el.value = config.user[k];
    });
  }

  function updateStatus(msg){ const e=byId('afStatus'); if(e) e.textContent=msg; }

  function updateStatsUI(){
    setTxt('afPainted', config.runtime.painted);
    setTxt('afAttempts', config.runtime.attempts);
    setTxt('afFails', config.runtime.fails);
    setTxt('afCharges', `${config.runtime.charges.count}/${config.runtime.charges.max}`);
    if (config.runtime.lastPaint)
      setTxt('afLast', `${config.runtime.lastPaint.absX},${config.runtime.lastPaint.absY} c${config.runtime.lastPaint.color}`);
    const rateEl = byId('afRate');
    const rate = config.runtime.attempts ? ((config.runtime.painted/config.runtime.attempts)*100).toFixed(1) : '0.0';
    if (rateEl){
      rateEl.textContent = rate+'%';
      rateEl.className='af-rate';
      const rv = parseFloat(rate);
      if (rv >= 80) rateEl.classList.add('good');
      else if (rv >= 50) rateEl.classList.add('warn');
      else rateEl.classList.add('bad');
    }
    if (config.user.enableAutoFix){
      setTxt('afDelayDyn', `${config.runtime.recover.dynamicDelayMs}ms (${config.runtime.recover.baseDelaySnapshot}ms)`);
      setTxt('afEP', currentEndpoint());
    } else {
      setTxt('afDelayDyn', `${config.user.delayMs}ms (fixo)`);
      setTxt('afEP', 's0');
    }
    setTxt('afC403', config.runtime.counters.c403);
    setTxt('afC429', config.runtime.counters.c429);
    setTxt('afCNet', config.runtime.counters.cNet);
  }

  function setTxt(id,v){ const e=byId(id); if(e) e.textContent=v; }
  function byId(id){ return document.getElementById(id); }

  function toggleRun(run){
    if (run===config.runtime.running) return;
    config.runtime.running=run;
    const btn = byId('afBtnRun');
    if(btn) btn.textContent = run ? `⏸ ${L.stop}` : `▶ ${L.start}`;
    updateStatus(run?L.statusStarted:L.statusStopped);
    if (run){
      log('Iniciado');
      initAutoFixState();
      config.runtime.lastSuccessTs = null;
      mainLoop();
    } else log('Parado');
  }

  function testPosition(){
    const p = nextPosition(); const c=nextColor();
    log(`Teste -> rel(${p.x},${p.y}) cor=${c}`);
  }

  function resetStats(){
    config.runtime.attempts=0;
    config.runtime.painted=0;
    config.runtime.fails=0;
    config.runtime.lastPaint=null;
    config.runtime.seq={x:0,y:0};
    config.runtime.failCount.clear();
    config.runtime.quarantine.clear();
    config.runtime.counters.c403=0;
    config.runtime.counters.c429=0;
    config.runtime.counters.cNet=0;
    forceNormalize(false);
    updateStatsUI();
    log('Estatísticas resetadas');
  }

  /* ============== Highlight da Área ============== */
  let areaEl;
  function ensureAreaEl(){
    if (areaEl) return;
    areaEl = document.createElement('div');
    areaEl.id='afAreaHl';
    areaEl.style.cssText='position:absolute;pointer-events:none;border:1px dashed #4b68ff;background:rgba(75,104,255,0.12);z-index:99998;';
    document.body.appendChild(areaEl);
  }
  function positionHighlight(){
    if (!areaEl || !config.runtime.highlightVisible) return;
    const offsetX = 0;
    const offsetY = 0;
    areaEl.style.left = (offsetX + config.user.startX)+'px';
    areaEl.style.top  = (offsetY + config.user.startY)+'px';
    areaEl.style.width= config.user.width+'px';
    areaEl.style.height=config.user.height+'px';
  }
  function toggleHighlight(){
    config.runtime.highlightVisible = !config.runtime.highlightVisible;
    if (config.runtime.highlightVisible){
      ensureAreaEl();
      areaEl.style.display='block';
      positionHighlight();
      log('[Highlight] Área visível');
    } else if (areaEl){
      areaEl.style.display='none';
      log('[Highlight] Área oculta');
    }
  }
  function removeHighlight(){
    if (areaEl) areaEl.remove();
    areaEl = null;
    config.runtime.highlightVisible=false;
  }

  /* ============== Efeito Visual ============== */
  function effect(){
    if(!config.user.enableEffect) return;
    const fx = document.createElement('div');
    fx.className='af-fx';
    fx.textContent='•';
    document.body.appendChild(fx);
    setTimeout(()=>fx.remove(),1100);
  }

  /* ============== Watermark ============== */
  let wm;
  function injectWatermark(){
    wm = document.createElement('div');
    wm.className='af-watermark';
    wm.textContent='AUTO';
    document.body.appendChild(wm);
    updateWatermark();
  }
  function updateWatermark(){
    if(!wm) return;
    wm.style.display = config.user.showWatermark ? 'block':'none';
    wm.style.opacity = config.user.watermarkOpacity;
    wm.style.fontSize = config.user.watermarkSize+'px';
    wm.style.transform = `translate(-50%,-50%) rotate(${config.user.watermarkRotation}deg)`;
  }

  /* ============== Drag ============== */
  function draggable(handle,root){
    let drag=false,ox=0,oy=0;
    handle.addEventListener('mousedown',e=>{
      drag=true; ox=e.clientX-root.offsetLeft; oy=e.clientY-root.offsetTop;
      document.addEventListener('mousemove',mv);
      document.addEventListener('mouseup',up);
    });
    function mv(e){ if(!drag)return; root.style.left=(e.clientX-ox)+'px'; root.style.top=(e.clientY-oy)+'px'; }
    function up(){ drag=false; document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); }
  }

  /* ============== Estilos ============== */
  function injectStyles(){
    if (document.getElementById('af-simple-style')) return;
    const st=document.createElement('style');
    st.id='af-simple-style';
    st.textContent=`
      .af-panel{position:fixed;top:80px;left:40px;z-index:999999;font:12px/1.4 Arial,sans-serif;
        background:#111c;color:#eee;border:1px solid #333;border-radius:10px;width:360px;
        backdrop-filter:blur(6px);box-shadow:0 4px 16px #0008;}
      .af-header{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;
        background:#1d2533;border-bottom:1px solid #2c3648;cursor:move;border-radius:10px 10px 0 0;}
      .af-title{font-weight:bold;font-size:13px;}
      .af-actions .af-btn{margin-left:4px;}
      .af-body{padding:8px;user-select:none;}
      .af-section{margin-bottom:10px;}
      .af-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .af-field{display:flex;flex-direction:column;font-size:11px;}
      .af-field>span{font-size:10px;font-weight:bold;color:#9ecaff;margin-bottom:2px;}
      .af-field input,.af-field select{background:#182131;border:1px solid #2e3c52;color:#eee;
        padding:4px;border-radius:4px;font-size:11px;}
      .af-field.chk{flex-direction:row;align-items:center;gap:6px;}
      .af-field.chk span{margin:0;flex:1;}
      .af-btn{background:#394660;border:1px solid #4a5b78;color:#eee;padding:4px 8px;border-radius:5px;cursor:pointer;font-size:11px;}
      .af-btn:hover{background:#4a5b78;}
      .af-btn.run{background:#276237;border-color:#2f7b44;}
      .af-btn.run:hover{background:#2f7b44;}
      .af-btn.close{background:#7a2c2c;border-color:#923737;}
      .af-btn.close:hover{background:#923737;}
      .af-btn.sm{padding:3px 6px;font-size:10px;}
      .af-buttons-line{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;}
      .af-status{background:#1c2330;border:1px solid #2e3a4d;padding:6px 8px;border-radius:6px;font-size:11px;margin-top:8px;}
      .af-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font-size:11px;}
      .af-stats b{color:#9ecaff;font-weight:600;}
      .af-log{background:#0d1117;border:1px solid #2b3646;border-radius:6px;height:130px;overflow:auto;
        font:10px/1.4 monospace;margin-top:6px;padding:6px;}
      .af-footer{background:#1a2230;padding:4px 8px;font-size:10px;text-align:center;color:#7c92ad;
        border-radius:0 0 10px 10px;border-top:1px solid #273140;}
      .af-fx{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:40px;color:#4b68ff;
        animation:afPulse 1.1s ease-out forwards;pointer-events:none;z-index:999999;}
      @keyframes afPulse{0%{opacity:.9;transform:translate(-50%,-50%) scale(.4);}60%{opacity:.4;}100%{opacity:0;transform:translate(-50%,-50%) scale(1.8);}}
      .af-watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-20deg);
        font-size:220px;font-weight:800;font-family:Arial,sans-serif;color:#4b68ff;opacity:.08;pointer-events:none;
        z-index:999;mix-blend-mode:screen;text-shadow:0 0 20px #4b68ff88,0 0 40px #4b68ff55;}
      .af-rate.good{color:#5ff18d;}
      .af-rate.warn{color:#ffcf5a;}
      .af-rate.bad{color:#ff7b6b;}
      .af-mini-line{font-size:10px;background:#1c2736;border:1px solid #2e3c52;padding:4px 6px;border-radius:4px;
        margin-bottom:8px;color:#bcd3f1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      #afAreaHl{transition:all .25s ease;}
    `;
    document.head.appendChild(st);
  }

  /* ============== Init ============== */
  function init(){
    if (config.runtime.inited) return;
    config.runtime.inited=true;
    buildUI();
    initAutoFixState();
    log('UI pronta & AutoFix toggle');
  }

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState === 'interactive' || document.readyState === 'complete') init();

})();