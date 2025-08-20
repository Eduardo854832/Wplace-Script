// == Wplace Bot - UI Moderno (Dark) ==
// Compatível com desktop e mobile. Cole no console ou use como userscript.
// Mantém: Controle / Estatísticas / Logs / Config | Anti-spam | Velocidade Seguro/Rápido | Modos de pintura
// Observação: Este script NÃO tenta burlar CAPTCHA. Ele pausa quando faltar token e mostra aviso claro.

(() => {
  'use strict';

  // ========================= CONSTANTES / ESTADO =========================
  const DEFAULTS = {
    START_X: 742,
    START_Y: 1148,
    AREA_SIZE: 100,         // lado do quadrado (NxN)
    BASE_DELAY: 500,        // ms (antes do jitter)
    COOLDOWN_FALLBACK: 30000,
    SAFE_SPEED: 1.2,        // multiplicador (mais lento)
    FAST_SPEED: 0.7,        // multiplicador (mais rápido)
    MAX_BATCH: 10,
    THEME: {
      bg: '#0f1115',
      panel: '#141821',
      panel2: '#10141b',
      border: '#232a38',
      text: '#e6eaf2',
      textSoft: '#b6c0d4',
      primary: '#6E56CF',   // roxo
      ok: '#30d158',
      warn: '#ffd60a',
      err: '#ff453a',
      chip: '#1b2030',
      chipBorder: '#2c3446'
    }
  };

  const state = {
    running: false,
    paused: false,
    speed: localStorage.getItem('wplace.speed') || 'safe',     // 'safe' | 'fast'
    mode: localStorage.getItem('wplace.mode') || 'random',      // random | sequential | line | square | spiral
    areaSize: parseInt(localStorage.getItem('wplace.areaSize') || DEFAULTS.AREA_SIZE, 10),
    startX: parseInt(localStorage.getItem('wplace.startX') || DEFAULTS.START_X, 10),
    startY: parseInt(localStorage.getItem('wplace.startY') || DEFAULTS.START_Y, 10),
    baseDelay: parseInt(localStorage.getItem('wplace.baseDelay') || DEFAULTS.BASE_DELAY, 10),
    painted: 0,
    errors: 0,
    charges: { count: 0, max: 80, cooldownMs: DEFAULTS.COOLDOWN_FALLBACK },
    lastPixels: [],
    userInfo: null,
    tickGuard: 0,
    hasToken: false,
    token: null,
    posX: 0,
    posY: 0,
    spiralStep: 0,
    spiralLayer: 1,
    logLevel: localStorage.getItem('wplace.logLevel') || 'info', // info|warn|error
    logs: [],
    ui: {} // refs dom
  };

  // ========================= UTILS =========================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const jitter = (ms, spread = 0.25) => {
    const delta = ms * spread;
    return Math.max(0, ms + (Math.random() * 2 - 1) * delta);
  };
  const nowHHMMSS = () => new Date().toLocaleTimeString();

  function savePrefs() {
    localStorage.setItem('wplace.speed', state.speed);
    localStorage.setItem('wplace.mode', state.mode);
    localStorage.setItem('wplace.areaSize', String(state.areaSize));
    localStorage.setItem('wplace.startX', String(state.startX));
    localStorage.setItem('wplace.startY', String(state.startY));
    localStorage.setItem('wplace.baseDelay', String(state.baseDelay));
    localStorage.setItem('wplace.logLevel', state.logLevel);
  }

  // logger com níveis e badge na UI
  function pushLog(level, msg) {
    const levels = { info: 1, warn: 2, error: 3 };
    state.logs.push({ t: nowHHMMSS(), level, msg });
    if (levels[level] >= levels[state.logLevel]) {
      const li = document.createElement('div');
      li.className = `wb-log wb-${level}`;
      li.textContent = `[${state.logs[state.logs.length - 1].t}] ${msg}`;
      state.ui.logsList && state.ui.logsList.appendChild(li);
      // scroll
      state.ui.logsList && (state.ui.logsList.scrollTop = state.ui.logsList.scrollHeight);
    }
    // badge
    if (level !== 'info') {
      state.ui.alertDot && state.ui.alertDot.classList.add('wb-alert-on');
    }
  }

  // captura console
  (function hookConsole(){
    const oWarn = console.warn, oErr = console.error, oLog = console.log;
    console.warn = (...a)=>{ pushLog('warn', a.map(x => String(x)).join(' ')); oWarn.apply(console, a); };
    console.error = (...a)=>{ pushLog('error', a.map(x => String(x)).join(' ')); oErr.apply(console, a); };
    console.log = (...a)=>{ pushLog('info', a.map(x => String(x)).join(' ')); oLog.apply(console, a); };
  })();

  // ========================= API HELPERS =========================
  const originalFetch = window.fetch;
  window.fetch = async (url, options = {}) => {
    // interceptar posts do pixel para capturar token t
    try {
      if (typeof url === 'string' && url.includes('https://backend.wplace.live/s0/pixel/')) {
        if (options && options.body) {
          try {
            const payload = JSON.parse(options.body);
            if (payload.t) {
              state.token = payload.t;
              state.hasToken = true;
              pushLog('info', 'Token capturado do clique manual.');
            }
          } catch {}
        }
      }
    } catch {}
    return originalFetch(url, options);
  };

  async function fetchJSON(url, opts={}) {
    try {
      const res = await fetch(url, { credentials: 'include', ...opts });
      return await res.json();
    } catch (e) {
      pushLog('error', `Falha de rede em ${url}`);
      return null;
    }
  }

  async function getCharge() {
    const data = await fetchJSON('https://backend.wplace.live/me');
    if (data && data.charges) {
      state.userInfo = data;
      state.charges.count = Math.floor(data.charges.count);
      state.charges.max = Math.floor(data.charges.max);
      state.charges.cooldownMs = data.charges.cooldownMs || DEFAULTS.COOLDOWN_FALLBACK;
    }
    return state.charges;
  }

  async function paintPixel(dx, dy, color) {
    const url = `https://backend.wplace.live/s0/pixel/${state.startX}/${state.startY}`;
    const payload = JSON.stringify({ coords: [dx, dy], colors: [color], t: state.token });
    try {
      const res = await originalFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        credentials: 'include',
        body: payload
      });
      if (res.status === 403) {
        state.hasToken = false;
        state.token = null;
        return { token_error: true };
      }
      return await res.json();
    } catch {
      return null;
    }
  }

  // ========================= GERADOR DE POSIÇÕES =========================
  function nextPos() {
    const N = state.areaSize;
    if (state.mode === 'random') {
      return { x: rnd(0, N - 1), y: rnd(0, N - 1) };
    }
    if (state.mode === 'sequential') {
      const p = { x: state.posX, y: state.posY };
      state.posX++;
      if (state.posX >= N) { state.posX = 0; state.posY++; if (state.posY >= N) state.posY = 0; }
      return p;
    }
    if (state.mode === 'line') {
      const y = Math.floor(N / 2);
      const x = (state.posX++) % N;
      return { x, y };
    }
    if (state.mode === 'square') {
      const layer = (state.posX++) % N;
      const side = layer % 4;
      const k = Math.floor(layer / 4) % N;
      // desenha "molduras" simples
      const edge = (i, j) => ({ x: i, y: j });
      switch (side) {
        case 0: return edge(k, k);
        case 1: return edge(N - 1 - k, k);
        case 2: return edge(N - 1 - k, N - 1 - k);
        default: return edge(k, N - 1 - k);
      }
    }
    // spiral
    const l = state.spiralLayer, s = state.spiralStep;
    // trajetos por camada
    const perim = Math.max(1, (l * 2 + 1) * 4 - 4);
    const pos = s % perim;
    let x = l, y = l;
    if (pos < 2 * l) { x = -l + pos; y = -l; }
    else if (pos < 2 * l + 2 * l) { x = l; y = -l + (pos - 2 * l); }
    else if (pos < 4 * l) { x = l - (pos - 2 * l - 2 * l); y = l; }
    else { x = -l; y = l - (pos - 4 * l); }
    state.spiralStep++;
    if (state.spiralStep >= perim) { state.spiralStep = 0; state.spiralLayer = (state.spiralLayer + 1) % Math.floor(state.areaSize / 2); }
    return { x: Math.max(0, Math.min(state.areaSize - 1, x + Math.floor(N / 2))), y: Math.max(0, Math.min(N - 1, y + Math.floor(N / 2))) };
  }

  // ========================= DELAY DINÂMICO =========================
  function currentBaseDelay() {
    const speedMult = state.speed === 'fast' ? DEFAULTS.FAST_SPEED : DEFAULTS.SAFE_SPEED;
    // menos carga => mais lento
    let chargeFactor = 1;
    if (state.charges.count <= 5) chargeFactor = 1.4;
    else if (state.charges.count <= 20) chargeFactor = 1.1;
    return Math.max(150, state.baseDelay * speedMult * chargeFactor);
  }

  // ========================= UI =========================
  function injectStyles() {
    const T = DEFAULTS.THEME;
    const css = `
    .wb-root{position:fixed;inset:auto 10px 10px 10px;z-index:999999;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Noto Sans,Ubuntu,Cantarell,'Helvetica Neue',Arial,'Apple Color Emoji','Segoe UI Emoji';color:${T.text};}
    .wb-card{background:${T.panel};border:1px solid ${T.border};border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.35);overflow:hidden}
    .wb-head{display:flex;align-items:center;gap:10px;background:${T.panel2};padding:10px 14px;border-bottom:1px solid ${T.border}}
    .wb-title{font-weight:700;letter-spacing:.2px}
    .wb-dot{width:10px;height:10px;border-radius:50%;background:${T.primary};display:inline-block;box-shadow:0 0 0 0 rgba(255,0,0,0.7);transition:.2s}
    .wb-alert-on{background:${T.err}!important;box-shadow:0 0 0 6px rgba(255,69,58,.15)}
    .wb-tabs{display:flex;gap:8px;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid ${T.border}}
    .wb-tab{padding:8px 12px;border-radius:12px;background:${T.chip};border:1px solid ${T.chipBorder};cursor:pointer;font-weight:600}
    .wb-tab.wb-active{background:${T.primary};border-color:${T.primary};color:#fff}
    .wb-body{padding:12px;max-height:55vh;overflow:auto}
    .wb-grid{display:grid;grid-template-columns:1fr;gap:12px}
    @media(min-width:520px){.wb-grid{grid-template-columns:1fr 1fr}}
    .wb-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
    .wb-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:14px;border:1px solid ${T.border};background:#1b2030;cursor:pointer;font-weight:700}
    .wb-btn.wb-primary{background:${T.primary};color:#fff;border-color:${T.primary}}
    .wb-btn.wb-ok{background:${T.ok};color:#001b06;border-color:transparent}
    .wb-btn.wb-danger{background:${T.err};color:#fff;border-color:transparent}
    .wb-chip{padding:8px 10px;border-radius:12px;background:${T.chip};border:1px solid ${T.chipBorder};font-weight:600}
    .wb-select,.wb-input{background:#0e121a;border:1px solid ${T.border};border-radius:12px;color:${T.text};padding:10px 12px;font-weight:600}
    .wb-kpi{background:#0e121a;border:1px solid ${T.border};border-radius:14px;padding:12px}
    .wb-kpi b{font-size:18px}
    .wb-logs{background:#0e121a;border:1px solid ${T.border};border-radius:14px;min-height:120px;max-height:280px;overflow:auto;padding:10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}
    .wb-log{padding:4px 0;border-bottom:1px dashed ${T.border};white-space:pre-wrap;word-break:break-word}
    .wb-info{color:${T.textSoft}} .wb-warn{color:${T.warn}} .wb-error{color:${T.err}}
    .wb-foot{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-top:1px solid ${T.border};background:${T.panel2}}
    .wb-right{display:flex;gap:8px;align-items:center}
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function icon(name){ // minimal emoji icons
    const map={play:'▶️',pause:'⏸️',stop:'⏹️',speed:'⚡',mode:'🎯',cfg:'⚙️',stat:'📊',log:'🧾'};
    return map[name]||'🔹';
  }

  function buildUI() {
    injectStyles();
    const root = document.createElement('div');
    root.className = 'wb-root wb-card';
    root.innerHTML = `
      <div class="wb-head">
        <span class="wb-dot" id="wbAlert"></span>
        <div class="wb-title">🎨 Wplace Bot</div>
        <div style="margin-left:auto" class="wb-chip">Velocidade: <span id="wbSpeedLbl"></span></div>
      </div>
      <div class="wb-tabs">
        <button class="wb-tab wb-active" data-tab="ctrl">${icon('play')} Controle</button>
        <button class="wb-tab" data-tab="stats">${icon('stat')} Estatísticas</button>
        <button class="wb-tab" data-tab="logs">${icon('log')} Logs</button>
        <button class="wb-tab" data-tab="cfg">${icon('cfg')} Config</button>
      </div>
      <div class="wb-body">
        <section data-panel="ctrl">
          <div class="wb-grid">
            <div class="wb-kpi"><div>Usuário</div><b id="wbUser">—</b></div>
            <div class="wb-kpi"><div>Cargas</div><b><span id="wbCharges">0/0</span></b></div>
            <div class="wb-kpi"><div>Pintados</div><b id="wbPainted">0</b></div>
            <div class="wb-kpi"><div>Erros</div><b id="wbErrors">0</b></div>
          </div>
          <div class="wb-row" style="margin-top:12px">
            <button id="wbStart" class="wb-btn wb-primary">${icon('play')} Iniciar</button>
            <button id="wbPause" class="wb-btn">${icon('pause')} Pausar</button>
            <button id="wbStop" class="wb-btn wb-danger">${icon('stop')} Parar</button>
          </div>
          <div class="wb-row" style="margin-top:12px">
            <div class="wb-chip">${icon('mode')} Modo</div>
            <select id="wbMode" class="wb-select">
              <option value="random">Aleatório</option>
              <option value="sequential">Sequencial</option>
              <option value="line">Linha</option>
              <option value="square">Quadrado</option>
              <option value="spiral">Espiral</option>
            </select>
            <div class="wb-chip">${icon('speed')} Velocidade</div>
            <select id="wbSpeed" class="wb-select">
              <option value="safe">Seguro</option>
              <option value="fast">Rápido</option>
            </select>
          </div>
        </section>

        <section data-panel="stats" style="display:none">
          <div class="wb-grid">
            <div class="wb-kpi"><div>Área (NxN)</div><b id="wbAreaLbl">100</b></div>
            <div class="wb-kpi"><div>Ponto inicial</div><b id="wbStartLbl">0,0</b></div>
            <div class="wb-kpi"><div>Delay base</div><b id="wbDelayLbl">500 ms</b></div>
            <div class="wb-kpi"><div>Delay atual</div><b id="wbDelayNow">—</b></div>
          </div>
        </section>

        <section data-panel="logs" style="display:none">
          <div class="wb-row" style="margin-bottom:8px">
            <div class="wb-chip">Nível de log</div>
            <select id="wbLogLevel" class="wb-select">
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
            <button id="wbClearLogs" class="wb-btn">Limpar</button>
          </div>
          <div id="wbLogs" class="wb-logs"></div>
        </section>

        <section data-panel="cfg" style="display:none">
          <div class="wb-grid">
            <div class="wb-kpi">
              <div>Área (NxN)</div>
              <input id="wbArea" class="wb-input" type="number" min="10" max="300" step="1" value="${state.areaSize}"/>
            </div>
            <div class="wb-kpi">
              <div>Ponto X</div>
              <input id="wbStartX" class="wb-input" type="number" step="1" value="${state.startX}"/>
            </div>
            <div class="wb-kpi">
              <div>Ponto Y</div>
              <input id="wbStartY" class="wb-input" type="number" step="1" value="${state.startY}"/>
            </div>
            <div class="wb-kpi">
              <div>Delay base (ms)</div>
              <input id="wbBaseDelay" class="wb-input" type="number" min="150" max="5000" step="50" value="${state.baseDelay}"/>
            </div>
          </div>
          <div class="wb-row" style="margin-top:10px">
            <button id="wbSave" class="wb-btn wb-ok">Salvar preferências</button>
            <button id="wbReset" class="wb-btn">Padrões</button>
          </div>
        </section>
      </div>
      <div class="wb-foot">
        <div id="wbStatus" class="wb-info">Pronto</div>
        <div class="wb-right">
          <small class="wb-info">Dica: clique 1 pixel manualmente se pedir CAPTCHA.</small>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    // refs
    state.ui.root = root;
    state.ui.alertDot = root.querySelector('#wbAlert');
    state.ui.speedLbl = root.querySelector('#wbSpeedLbl');
    state.ui.user = root.querySelector('#wbUser');
    state.ui.charges = root.querySelector('#wbCharges');
    state.ui.painted = root.querySelector('#wbPainted');
    state.ui.errors = root.querySelector('#wbErrors');
    state.ui.areaLbl = root.querySelector('#wbAreaLbl');
    state.ui.startLbl = root.querySelector('#wbStartLbl');
    state.ui.delayLbl = root.querySelector('#wbDelayLbl');
    state.ui.delayNow = root.querySelector('#wbDelayNow');
    state.ui.logsList = root.querySelector('#wbLogs');
    state.ui.status = root.querySelector('#wbStatus');

    const tabs = root.querySelectorAll('.wb-tab');
    tabs.forEach(btn => btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('wb-active'));
      btn.classList.add('wb-active');
      const tab = btn.dataset.tab;
      root.querySelectorAll('section[data-panel]').forEach(s => {
        s.style.display = s.dataset.panel === tab ? '' : 'none';
      });
      if (tab === 'logs') state.ui.alertDot.classList.remove('wb-alert-on');
    }));

    // controles
    root.querySelector('#wbMode').value = state.mode;
    root.querySelector('#wbSpeed').value = state.speed;
    state.ui.speedLbl.textContent = state.speed === 'fast' ? 'Rápido' : 'Seguro';

    root.querySelector('#wbStart').addEventListener('click', guarded(start));
    root.querySelector('#wbPause').addEventListener('click', guarded(togglePause));
    root.querySelector('#wbStop').addEventListener('click', guarded(stopAll));
    root.querySelector('#wbMode').addEventListener('change', (e)=>{ state.mode = e.target.value; savePrefs(); });
    root.querySelector('#wbSpeed').addEventListener('change', (e)=>{ state.speed = e.target.value; state.ui.speedLbl.textContent = state.speed==='fast'?'Rápido':'Seguro'; savePrefs(); });
    root.querySelector('#wbLogLevel').value = state.logLevel;
    root.querySelector('#wbLogLevel').addEventListener('change', (e)=>{ state.logLevel = e.target.value; savePrefs(); });
    root.querySelector('#wbClearLogs').addEventListener('click', ()=>{ state.logs.length=0; state.ui.logsList.innerHTML=''; });
    root.querySelector('#wbSave').addEventListener('click', ()=>{
      state.areaSize = clampInt(root.querySelector('#wbArea').value, 10, 300);
      state.startX = parseInt(root.querySelector('#wbStartX').value,10);
      state.startY = parseInt(root.querySelector('#wbStartY').value,10);
      state.baseDelay = clampInt(root.querySelector('#wbBaseDelay').value, 150, 5000);
      savePrefs();
      syncStatsUI();
      pushLog('info','Preferências salvas.');
      flash('Preferências salvas.');
    });
    root.querySelector('#wbReset').addEventListener('click', ()=>{
      state.areaSize = DEFAULTS.AREA_SIZE;
      state.startX = DEFAULTS.START_X;
      state.startY = DEFAULTS.START_Y;
      state.baseDelay = DEFAULTS.BASE_DELAY;
      savePrefs();
      root.querySelector('#wbArea').value = state.areaSize;
      root.querySelector('#wbStartX').value = state.startX;
      root.querySelector('#wbStartY').value = state.startY;
      root.querySelector('#wbBaseDelay').value = state.baseDelay;
      syncStatsUI();
      pushLog('warn','Preferências resetadas.');
      flash('Preferências resetadas.');
    });

    syncStatsUI();
  }

  function clampInt(v, min, max){ return Math.max(min, Math.min(max, parseInt(v, 10) || min)); }

  function syncStatsUI() {
    state.ui.areaLbl.textContent = String(state.areaSize);
    state.ui.startLbl.textContent = `${state.startX}, ${state.startY}`;
    state.ui.delayLbl.textContent = `${state.baseDelay} ms`;
  }

  function setStatus(msg, type='info'){
    state.ui.status.className = `wb-${type}`;
    state.ui.status.textContent = msg;
  }

  function flash(msg){
    setStatus(msg,'info');
    setTimeout(()=> setStatus('Pronto','info'), 2500);
  }

  // anti-spam de cliques
  function guarded(fn, cooldown=500){
    let last=0;
    return async (...args)=>{
      const now=Date.now();
      if (now-last<cooldown){ return; }
      last=now;
      try{ await fn(...args); }finally{ setTimeout(()=>{ last=0; }, cooldown); }
    };
  }

  // ========================= LOOP PRINCIPAL =========================
  async function start() {
    if (state.running) return;
    if (!state.hasToken) {
      setStatus('Clique 1 pixel manualmente para capturar o token (CAPTCHA).','warn');
      pushLog('warn','Token ausente. Pause até clicar um pixel manualmente.');
      return;
    }
    state.running = true;
    state.paused = false;
    setStatus('Iniciado.','info');
    pushLog('info','Loop iniciado.');
    loop();
  }

  function togglePause() {
    if (!state.running) return;
    state.paused = !state.paused;
    setStatus(state.paused ? 'Pausado.' : 'Retomado.','info');
    pushLog('info', state.paused ? 'Pausado.' : 'Retomado.');
  }

  function stopAll(){
    state.running=false;
    state.paused=false;
    setStatus('Parado.','info');
    pushLog('warn','Loop parado.');
  }

  async function loop(){
    while(state.running){
      if (state.paused){ await sleep(400); continue; }
      // cargas
      const { count, cooldownMs } = await getCharge();
      state.ui.charges.textContent = `${state.charges.count}/${state.charges.max}`;
      state.ui.user.textContent = state.userInfo?.name || '—';

      if (count < 1){
        setStatus('Sem cargas… aguardando recarga.','warn');
        await sleep(cooldownMs || DEFAULTS.COOLDOWN_FALLBACK);
        continue;
      }
      if (!state.hasToken){
        pushLog('warn','Token ausente. Aguardando clique manual.');
        setStatus('Token ausente. Clique 1 pixel manualmente.','warn');
        await sleep(1000);
        continue;
      }

      const batch = Math.min(state.charges.count, DEFAULTS.MAX_BATCH);
      for (let i=0;i<batch;i++){
        const {x,y} = nextPos();
        const color = rnd(1,31);
        const res = await paintPixel(x,y,color);
        if (res && res.painted === 1){
          state.painted++;
          state.charges.count--;
          state.lastPixels.unshift({x: state.startX + x, y: state.startY + y, t: nowHHMMSS()});
          state.lastPixels = state.lastPixels.slice(0,6);
          state.ui.painted.textContent = String(state.painted);
          pushLog('info', `Pixel ✅ (${state.startX+x},${state.startY+y})`);
          setStatus('Pixel pintado.','info');
        } else if (res && res.token_error){
          state.hasToken = false;
          state.token = null;
          pushLog('warn','Token inválido/expirado (provável CAPTCHA).');
          setStatus('Token inválido/expirado. Clique 1 pixel manualmente.','warn');
          break;
        } else {
          state.errors++;
          state.ui.errors.textContent = String(state.errors);
          pushLog('error','Falha ao pintar pixel.');
          setStatus('Erro ao pintar.','error');
        }
      }
      const d = Math.round(jitter(currentBaseDelay(), 0.35));
      state.ui.delayNow.textContent = `${d} ms`;
      await sleep(d);
    }
  }

  // ========================= INIT =========================
  buildUI();
  flash('Interface carregada.');
  getCharge(); // pré-carregamento
})();
