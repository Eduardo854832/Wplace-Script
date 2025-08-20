
/* ==========================================================================
 * Wplace Bot - Menu Quadrado (Widget) Expansível • PT-BR
 * --------------------------------------------------------------------------
 * - Menu quadrado minimalista que expande/colapsa (arrastável)
 * - Abas: Controle | Estatísticas | Logs | Config
 * - Modos de pintura: Aleatório | Sequencial | Linha | Quadrado | Espiral
 * - Velocidades: Seguro | Rápido | Custom (com delay definível)
 * - Delay adaptativo + jitter (variação) e controle de lote (até 10)
 * - Anti-spam nos botões e leve Anti-AFK (scroll ínfimo ocasional)
 * - Captura do token via interceptação de fetch quando você clica 1 pixel manualmente
 * - Pausa automática se 403/token inválido (ex.: CAPTCHA) — NÃO faz bypass
 * - Preferências salvas em localStorage
 *
 * Aviso: Automatização pode violar os termos do serviço do Wplace.
 * Use apenas em conta própria e por sua conta e risco.
 * ==========================================================================
*/

(() => {
  'use strict';

  // Evita carregar duplicado
  if (window.__WBOT_WIDGET__) {
    console.warn('Wplace Bot já está carregado.');
    return;
  }
  window.__WBOT_WIDGET__ = true;

  // ============================== CONFIG ==============================
  const CFG = {
    START_X: parseInt(localStorage.getItem('wb.startX') || '742', 10),
    START_Y: parseInt(localStorage.getItem('wb.startY') || '1148', 10),
    AREA: parseInt(localStorage.getItem('wb.area') || '100', 10),   // NxN
    BASE_DELAY: parseInt(localStorage.getItem('wb.baseDelay') || '500', 10),
    SPEED: localStorage.getItem('wb.speed') || 'safe',              // safe | fast | custom
    MODE: localStorage.getItem('wb.mode') || 'random',              // random | sequential | line | square | spiral
    CUSTOM_DELAY: parseInt(localStorage.getItem('wb.customDelay') || '800', 10),
    // Constantes
    MAX_BATCH: 10,
    SAFE_MULT: 1.15,
    FAST_MULT: 0.70,
    JITTER_SPREAD: 0.35,
    ANTIAFK_EVERY_MS: 18000, // a cada ~18s mexe 1px e volta
    THEME: {
      bg: '#0f1117',
      panel: '#141a21',
      panel2: '#0e141b',
      chip: '#19202b',
      chipBorder: '#273142',
      border: '#273142',
      text: '#e6eef8',
      textSoft: '#b7c4d6',
      primary: '#6E56CF',
      ok: '#2ecc71',
      warn: '#ffd166',
      err: '#ff4d4f'
    }
  };

  // ============================== ESTADO ==============================
  const S = {
    running: false,
    paused: false,
    token: null,
    hasToken: false,
    user: null,
    charges: { count: 0, max: 0, cooldownMs: 30000 },
    painted: 0,
    errors: 0,
    lastPixels: [],
    posX: 0, posY: 0,           // sequencial
    spiralStep: 0, spiralLayer: 1,
    // UI
    expanded: false,
    dragging: false,
    dragStart: null,
    position: JSON.parse(localStorage.getItem('wb.pos') || '{"right":20,"bottom":20}'),
    logLevel: localStorage.getItem('wb.logLevel') || 'info', // info | warn | error
    refs: {},
  };

  // ============================== UTILS ==============================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const now = () => new Date().toLocaleTimeString();

  function jitter(ms, spread = CFG.JITTER_SPREAD) {
    const d = ms * spread;
    return Math.max(0, ms + (Math.random() * 2 - 1) * d);
  }

  function baseDelay() {
    const mult = CFG.SPEED === 'fast' ? CFG.FAST_MULT
               : CFG.SPEED === 'custom' ? (CFG.CUSTOM_DELAY / CFG.BASE_DELAY) || 1
               : CFG.SAFE_MULT;
    let chargeFactor = 1;
    if (S.charges.count <= 5) chargeFactor = 1.4;
    else if (S.charges.count <= 20) chargeFactor = 1.1;
    const d = Math.max(150, CFG.BASE_DELAY * mult * chargeFactor);
    return Math.round(jitter(d));
  }

  function savePrefs(){
    localStorage.setItem('wb.startX', String(CFG.START_X));
    localStorage.setItem('wb.startY', String(CFG.START_Y));
    localStorage.setItem('wb.area', String(CFG.AREA));
    localStorage.setItem('wb.baseDelay', String(CFG.BASE_DELAY));
    localStorage.setItem('wb.speed', CFG.SPEED);
    localStorage.setItem('wb.mode', CFG.MODE);
    localStorage.setItem('wb.customDelay', String(CFG.CUSTOM_DELAY));
    localStorage.setItem('wb.logLevel', S.logLevel);
    localStorage.setItem('wb.pos', JSON.stringify(S.position));
  }

  // Mapeia id de cor (1..31) para uma cor HSL aproximada (não é a paleta oficial)
  function idToColor(i){
    const hue = ((i * 360 / 32) | 0) % 360;
    return `hsl(${hue} 85% 55%)`;
  }

  // ============================== LOGS ==============================
  const LV = { info: 1, warn: 2, error: 3 };
  function log(level, msg){
    S.refs.logs && appendLog(level, msg);
    if (level !== 'info') badgeAlert(true);
    if (LV[level] >= LV[S.logLevel]) console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`[WB] ${msg}`);
  }
  function appendLog(level, msg){
    const el = document.createElement('div');
    el.className = `wbq-log wbq-${level}`;
    el.textContent = `[${now()}] ${msg}`;
    S.refs.logs.appendChild(el);
    S.refs.logs.scrollTop = S.refs.logs.scrollHeight;
  }
  function clearLogs(){ if (S.refs.logs) S.refs.logs.innerHTML = ''; }

  // captura console
  (function hookConsole(){
    const w = console.warn, e = console.error, l = console.log;
    console.warn = (...a)=>{ appendLog('warn', a.map(String).join(' ')); badgeAlert(true); w.apply(console, a); };
    console.error = (...a)=>{ appendLog('error', a.map(String).join(' ')); badgeAlert(true); e.apply(console, a); };
    console.log = (...a)=>{ if (S.logLevel==='info') appendLog('info', a.map(String).join(' ')); l.apply(console, a); };
  })();

  // ============================== API ==============================
  const originalFetch = window.fetch;
  window.fetch = async (url, opts = {}) => {
    try {
      if (typeof url === 'string' && url.includes('/s0/pixel/')) {
        if (opts && opts.body) {
          try {
            const payload = JSON.parse(opts.body);
            if (payload && payload.t) {
              S.token = payload.t;
              S.hasToken = true;
              log('info', 'Token capturado a partir de um clique manual.');
            }
          } catch {}
        }
      }
    } catch {}
    return originalFetch(url, opts);
  };

  async function fetchJSON(url, options={}){
    try {
      const res = await fetch(url, { credentials: 'include', ...options });
      return await res.json();
    } catch {
      log('error', `Falha de rede em ${url}`);
      return null;
    }
  }

  async function getCharge(){
    const data = await fetchJSON('https://backend.wplace.live/me');
    if (data && data.charges){
      S.user = data;
      S.charges.count = Math.floor(data.charges.count);
      S.charges.max = Math.floor(data.charges.max);
      S.charges.cooldownMs = data.charges.cooldownMs || 30000;
      updateStatsUI();
    }
    return S.charges;
  }

  async function paintPixel(dx, dy, colorId){
    const url = `https://backend.wplace.live/s0/pixel/${CFG.START_X}/${CFG.START_Y}`;
    const body = JSON.stringify({ coords: [dx, dy], colors: [colorId], t: S.token });
    try {
      const res = await originalFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        credentials: 'include',
        body
      });
      if (res.status === 403){
        S.token = null; S.hasToken = false;
        return { token_error: true };
      }
      return await res.json();
    } catch {
      return null;
    }
  }

  // ============================== POSIÇÕES ==============================
  function nextPos(){
    const N = CFG.AREA;
    if (CFG.MODE === 'random') {
      return { x: rnd(0, N-1), y: rnd(0, N-1) };
    }
    if (CFG.MODE === 'sequential') {
      const p = { x: S.posX, y: S.posY };
      S.posX++;
      if (S.posX >= N){ S.posX = 0; S.posY++; if (S.posY >= N) S.posY = 0; }
      return p;
    }
    if (CFG.MODE === 'line'){
      const y = Math.floor(N/2);
      const x = (S.posX++) % N;
      return { x, y };
    }
    if (CFG.MODE === 'square'){
      // percorre a borda de "molduras" concêntricas
      const side = S.spiralLayer;
      if (side >= Math.floor(N/2)) { S.spiralLayer = 1; S.spiralStep = 0; }
      const perim = Math.max(1, side*8);
      const k = S.spiralStep % perim;
      let x=0, y=0;
      const min = Math.max(0, Math.floor(N/2)-side);
      const max = Math.min(N-1, Math.floor(N/2)+side);
      const len = (max-min);
      if (k < len) { x = min+k; y = min; } // topo esquerda→direita
      else if (k < len*2) { x = max; y = min + (k-len); } // direita cima→baixo
      else if (k < len*3) { x = max - (k-2*len); y = max; } // baixo direita→esquerda
      else { x = min; y = max - (k-3*len); } // esquerda baixo→cima
      S.spiralStep++;
      if (S.spiralStep >= perim){ S.spiralStep = 0; S.spiralLayer++; }
      return { x, y };
    }
    // spiral (clássica, ampliando camadas)
    const l = S.spiralLayer, s = S.spiralStep;
    const perim = Math.max(1, (l*2+1)*4 - 4);
    const pos = s % perim;
    let x = 0, y = 0;
    if (pos < 2*l)              { x = -l + pos; y = -l; }
    else if (pos < 2*l + 2*l)   { x = l; y = -l + (pos - 2*l); }
    else if (pos < 4*l)         { x = l - (pos - 4*l + 0); y =  l; }
    else                        { x = -l; y =  l - (pos - 4*l); }
    S.spiralStep++;
    if (S.spiralStep >= perim){ S.spiralStep = 0; S.spiralLayer = (S.spiralLayer + 1) % Math.floor(N/2); }
    return { x: clamp(Math.floor(N/2)+x,0,N-1), y: clamp(Math.floor(N/2)+y,0,N-1) };
  }

  // ============================== UI ==============================
  function injectCSS(){
    const T = CFG.THEME;
    const css = `
      .wbq-root{position:fixed;z-index:999999;display:flex;align-items:center;justify-content:center;background:${T.panel};color:${T.text};border:1px solid ${T.border};box-shadow:0 12px 30px rgba(0,0,0,.35);border-radius:14px;overflow:hidden;transition:width .25s,height .25s,transform .15s}
      .wbq-collapsed{width:64px;height:64px;cursor:grab;user-select:none}
      .wbq-collapsed .wbq-icon{font-size:26px}
      .wbq-expanded{width:360px;height:480px}
      .wbq-head{display:flex;gap:8px;align-items:center;justify-content:space-between;background:${T.panel2};padding:8px 10px;border-bottom:1px solid ${T.border};cursor:grab}
      .wbq-title{font-weight:800;letter-spacing:.2px}
      .wbq-badge{width:10px;height:10px;border-radius:50%;background:${T.primary};box-shadow:0 0 0 0 rgba(255,0,0,0)}
      .wbq-badge.on{background:${T.err};box-shadow:0 0 0 6px rgba(255,77,79,.18)}
      .wbq-body{padding:10px;height:calc(100% - 92px);overflow:auto}
      .wbq-tabs{display:flex;gap:6px;padding:8px;border-bottom:1px solid ${T.border};background:${T.panel}}
      .wbq-tab{flex:1;padding:6px;border-radius:10px;border:1px solid ${T.border};background:${T.chip};color:${T.text};font-weight:700;cursor:pointer}
      .wbq-tab.active{background:${T.primary};border-color:${T.primary};color:#fff}
      .wbq-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .wbq-kpi{background:${T.panel2};border:1px solid ${T.border};border-radius:12px;padding:8px}
      .wbq-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
      .wbq-btn{padding:10px 12px;border-radius:12px;border:1px solid ${T.border};background:#1b2230;color:${T.text};font-weight:800;cursor:pointer}
      .wbq-btn.primary{background:${T.primary};color:#fff;border-color:${T.primary}}
      .wbq-btn.ok{background:${T.ok};color:#001b08;border:none}
      .wbq-btn.danger{background:${T.err};color:#fff;border:none}
      .wbq-chip{padding:6px 8px;border-radius:10px;background:${T.chip};border:1px solid ${T.chipBorder};font-weight:700}
      .wbq-sel,.wbq-inp{background:#0c121a;border:1px solid ${T.border};color:${T.text};border-radius:10px;padding:8px;font-weight:700}
      .wbq-logs{background:#0c121a;border:1px solid ${T.border};border-radius:12px;height:160px;overflow:auto;padding:8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}
      .wbq-log{padding:3px 0;border-bottom:1px dashed ${T.border}}
      .wbq-info{color:${T.textSoft}} .wbq-warn{color:${T.warn}} .wbq-error{color:${T.err}}
      .wbq-foot{display:flex;align-items:center;justify-content:space-between;background:${T.panel2};padding:8px 10px;border-top:1px solid ${T.border}}
      .wbq-history{display:flex;flex-direction:column;gap:4px}
      .wbq-chipdot{display:inline-flex;align-items:center;gap:6px}
      .wbq-dot{width:10px;height:10px;border-radius:3px;border:1px solid ${T.border};display:inline-block}
    `;
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  function buildUI(){
    injectCSS();
    const root = document.createElement('div');
    root.className = 'wbq-root wbq-collapsed';
    // posição
    if (S.position.right != null) root.style.right = `${S.position.right}px`;
    if (S.position.left != null) root.style.left = `${S.position.left}px`;
    if (S.position.bottom != null) root.style.bottom = `${S.position.bottom}px`;
    if (S.position.top != null) root.style.top = `${S.position.top}px`;

    root.innerHTML = `<div class="wbq-icon" title="Wplace Bot">🎨</div>`;
    document.body.appendChild(root);

    root.addEventListener('dblclick', toggleExpand);
    root.addEventListener('mousedown', dragStartHandler);

    S.refs.root = root;
  }

  function renderExpanded(){
    const r = S.refs.root;
    r.classList.remove('wbq-collapsed');
    r.classList.add('wbq-expanded');
    r.innerHTML = `
      <div class="wbq-head" id="wbqDrag">
        <span class="wbq-title">🎨 Wplace Bot</span>
        <span class="wbq-badge" id="wbqBadge"></span>
      </div>
      <div class="wbq-tabs">
        <button class="wbq-tab active" data-tab="ctrl">Controle</button>
        <button class="wbq-tab" data-tab="stats">Estatísticas</button>
        <button class="wbq-tab" data-tab="logs">Logs</button>
        <button class="wbq-tab" data-tab="cfg">Config</button>
      </div>
      <div class="wbq-body">
        <section data-panel="ctrl">
          <div class="wbq-grid" style="margin-bottom:8px">
            <div class="wbq-kpi"><div>Usuário</div><b id="wbqUser">—</b></div>
            <div class="wbq-kpi"><div>Cargas</div><b id="wbqCharges">0/0</b></div>
            <div class="wbq-kpi"><div>Pintados</div><b id="wbqPainted">0</b></div>
            <div class="wbq-kpi"><div>Erros</div><b id="wbqErrors">0</b></div>
          </div>
          <div class="wbq-row">
            <button id="wbqStart" class="wbq-btn primary">▶ Iniciar</button>
            <button id="wbqPause" class="wbq-btn">⏸ Pausar</button>
            <button id="wbqStop" class="wbq-btn danger">⏹ Parar</button>
          </div>
          <div class="wbq-row" style="margin-top:10px">
            <span class="wbq-chip">Modo</span>
            <select id="wbqMode" class="wbq-sel">
              <option value="random">Aleatório</option>
              <option value="sequential">Sequencial</option>
              <option value="line">Linha</option>
              <option value="square">Quadrado</option>
              <option value="spiral">Espiral</option>
            </select>
            <span class="wbq-chip">Velocidade</span>
            <select id="wbqSpeed" class="wbq-sel">
              <option value="safe">Seguro</option>
              <option value="fast">Rápido</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </section>

        <section data-panel="stats" style="display:none">
          <div class="wbq-grid" style="margin-bottom:8px">
            <div class="wbq-kpi"><div>Área</div><b id="wbqAreaLbl">—</b></div>
            <div class="wbq-kpi"><div>Início</div><b id="wbqStartLbl">—</b></div>
            <div class="wbq-kpi"><div>Delay Base</div><b id="wbqDelayBase">—</b></div>
            <div class="wbq-kpi"><div>Delay Atual</div><b id="wbqDelayNow">—</b></div>
          </div>
          <div class="wbq-history" id="wbqHistory"></div>
        </section>

        <section data-panel="logs" style="display:none">
          <div class="wbq-row" style="margin-bottom:8px">
            <span class="wbq-chip">Nível</span>
            <select id="wbqLogLevel" class="wbq-sel">
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
            <button id="wbqClear" class="wbq-btn">Limpar</button>
          </div>
          <div id="wbqLogs" class="wbq-logs"></div>
        </section>

        <section data-panel="cfg" style="display:none">
          <div class="wbq-grid" style="margin-bottom:8px">
            <div class="wbq-kpi"><div>Área (NxN)</div><input id="wbqArea" class="wbq-inp" type="number" min="10" max="300" step="1" value="${CFG.AREA}"></div>
            <div class="wbq-kpi"><div>Start X</div><input id="wbqStartX" class="wbq-inp" type="number" step="1" value="${CFG.START_X}"></div>
            <div class="wbq-kpi"><div>Start Y</div><input id="wbqStartY" class="wbq-inp" type="number" step="1" value="${CFG.START_Y}"></div>
            <div class="wbq-kpi"><div>Delay base (ms)</div><input id="wbqBaseDelay" class="wbq-inp" type="number" min="150" step="50" value="${CFG.BASE_DELAY}"></div>
          </div>
          <div class="wbq-row">
            <div class="wbq-kpi" style="flex:1">
              <div>Delay custom (ms)</div>
              <input id="wbqCustomDelay" class="wbq-inp" type="number" min="150" step="50" value="${CFG.CUSTOM_DELAY}">
            </div>
            <button id="wbqSave" class="wbq-btn ok" style="flex:1">Salvar</button>
            <button id="wbqDefaults" class="wbq-btn" style="flex:1">Padrões</button>
          </div>
        </section>
      </div>
      <div class="wbq-foot">
        <div id="wbqStatus" class="wbq-info">Pronto</div>
        <button id="wbqCollapse" class="wbq-btn">Fechar</button>
      </div>
    `;

    // refs
    S.refs.badge = r.querySelector('#wbqBadge');
    S.refs.user = r.querySelector('#wbqUser');
    S.refs.charges = r.querySelector('#wbqCharges');
    S.refs.painted = r.querySelector('#wbqPainted');
    S.refs.errors = r.querySelector('#wbqErrors');
    S.refs.areaLbl = r.querySelector('#wbqAreaLbl');
    S.refs.startLbl = r.querySelector('#wbqStartLbl');
    S.refs.delayBase = r.querySelector('#wbqDelayBase');
    S.refs.delayNow = r.querySelector('#wbqDelayNow');
    S.refs.history = r.querySelector('#wbqHistory');
    S.refs.logs = r.querySelector('#wbqLogs');
    S.refs.status = r.querySelector('#wbqStatus');

    r.querySelector('#wbqDrag').addEventListener('mousedown', dragStartHandler);

    // tabs
    r.querySelectorAll('.wbq-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        r.querySelectorAll('.wbq-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        r.querySelectorAll('section[data-panel]').forEach(s => {
          s.style.display = s.dataset.panel === tab ? '' : 'none';
        });
        if (tab === 'logs') badgeAlert(false);
      });
    });

    // controles
    r.querySelector('#wbqStart').addEventListener('click', guard(startLoop));
    r.querySelector('#wbqPause').addEventListener('click', guard(togglePause));
    r.querySelector('#wbqStop').addEventListener('click', guard(stopLoop));

    const selMode = r.querySelector('#wbqMode');
    const selSpeed = r.querySelector('#wbqSpeed');
    selMode.value = CFG.MODE;
    selSpeed.value = CFG.SPEED;
    selMode.addEventListener('change', e => { CFG.MODE = e.target.value; savePrefs(); });
    selSpeed.addEventListener('change', e => { CFG.SPEED = e.target.value; savePrefs(); });

    const selLogLevel = r.querySelector('#wbqLogLevel');
    selLogLevel.value = S.logLevel;
    selLogLevel.addEventListener('change', e => { S.logLevel = e.target.value; savePrefs(); });
    r.querySelector('#wbqClear').addEventListener('click', clearLogs);

    // config inputs
    r.querySelector('#wbqArea').addEventListener('change', e => { CFG.AREA = clamp(parseInt(e.target.value,10)||100, 10, 300); savePrefs(); });
    r.querySelector('#wbqStartX').addEventListener('change', e => { CFG.START_X = parseInt(e.target.value,10)||CFG.START_X; savePrefs(); });
    r.querySelector('#wbqStartY').addEventListener('change', e => { CFG.START_Y = parseInt(e.target.value,10)||CFG.START_Y; savePrefs(); });
    r.querySelector('#wbqBaseDelay').addEventListener('change', e => { CFG.BASE_DELAY = clamp(parseInt(e.target.value,10)||500, 150, 5000); savePrefs(); });
    r.querySelector('#wbqCustomDelay').addEventListener('change', e => { CFG.CUSTOM_DELAY = clamp(parseInt(e.target.value,10)||800, 150, 5000); savePrefs(); });

    r.querySelector('#wbqSave').addEventListener('click', () => { savePrefs(); toast('Preferências salvas.'); });
    r.querySelector('#wbqDefaults').addEventListener('click', () => {
      CFG.AREA = 100; CFG.START_X = 742; CFG.START_Y = 1148; CFG.BASE_DELAY = 500; CFG.CUSTOM_DELAY = 800; CFG.MODE='random'; CFG.SPEED='safe';
      savePrefs(); renderExpanded(); toast('Preferências resetadas.');
    });

    r.querySelector('#wbqCollapse').addEventListener('click', toggleExpand);

    // preencher estatísticas
    updateStatsUI();
  }

  function updateStatsUI(){
    if (!S.refs.root || !S.refs.user) return;
    S.refs.user.textContent = S.user?.name || '—';
    S.refs.charges.textContent = `${S.charges.count}/${S.charges.max}`;
    S.refs.painted.textContent = String(S.painted);
    S.refs.errors.textContent = String(S.errors);
    S.refs.areaLbl.textContent = `${CFG.AREA} × ${CFG.AREA}`;
    S.refs.startLbl.textContent = `${CFG.START_X}, ${CFG.START_Y}`;
    S.refs.delayBase.textContent = `${CFG.BASE_DELAY} ms`;
  }

  function pushHistory(x, y, color){
    if (!S.refs.history) return;
    const row = document.createElement('div');
    row.className = 'wbq-chip wbq-chipdot';
    row.innerHTML = `<span class="wbq-dot" style="background:${idToColor(color)}"></span> (${x}, ${y}) — ${now()}`;
    S.refs.history.prepend(row);
    // manter só 8
    while (S.refs.history.childNodes.length > 8) S.refs.history.removeChild(S.refs.history.lastChild);
  }

  function setStatus(msg, type='info'){
    if (!S.refs.status) return;
    S.refs.status.className = `wbq-${type}`;
    S.refs.status.textContent = msg;
  }

  function toast(msg){
    setStatus(msg, 'info');
    setTimeout(() => setStatus('Pronto', 'info'), 2200);
  }

  function badgeAlert(on){
    if (!S.refs.badge) return;
    if (on) S.refs.badge.classList.add('on');
    else S.refs.badge.classList.remove('on');
  }

  function toggleExpand(){
    S.expanded = !S.expanded;
    const r = S.refs.root;
    if (!r) return;
    if (S.expanded) { r.classList.remove('wbq-collapsed'); r.classList.add('wbq-expanded'); renderExpanded(); }
    else { r.classList.add('wbq-collapsed'); r.classList.remove('wbq-expanded'); r.innerHTML = `<div class="wbq-icon" title="Wplace Bot">🎨</div>`; }
  }

  // ============================== DRAG ==============================
  function dragStartHandler(ev){
    // só iniciar drag se clicar no root (colapsado) ou na barra (expanded)
    const isHeader = ev.target.id === 'wbqDrag' || ev.target.closest('#wbqDrag');
    if (!S.expanded && ev.target !== S.refs.root && !ev.target.closest('.wbq-icon')) return;
    if (S.expanded && !isHeader) return;

    S.dragging = true;
    S.dragStart = { x: ev.clientX, y: ev.clientY, pos: getCurrentPos() };
    document.addEventListener('mousemove', dragging);
    document.addEventListener('mouseup', dragEnd);
    ev.preventDefault();
  }

  function getCurrentPos(){
    const r = S.refs.root.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    // salvar como offsets a partir das bordas para estabilidade
    return { right: vw - r.right, bottom: vh - r.bottom };
  }

  function dragging(ev){
    if (!S.dragging) return;
    const dx = ev.clientX - S.dragStart.x;
    const dy = ev.clientY - S.dragStart.y;
    const vw = window.innerWidth, vh = window.innerHeight;
    const box = S.refs.root.getBoundingClientRect();
    let left = vw - (S.dragStart.pos.right + box.width) + dx;
    let top  = vh - (S.dragStart.pos.bottom + box.height) + dy;
    left = clamp(left, 4, vw - box.width - 4);
    top  = clamp(top, 4, vh - box.height - 4);
    S.refs.root.style.left = `${left}px`;
    S.refs.root.style.right = 'auto';
    S.refs.root.style.top = `${top}px`;
    S.refs.root.style.bottom = 'auto';
  }

  function dragEnd(){
    if (!S.dragging) return;
    S.dragging = false;
    document.removeEventListener('mousemove', dragging);
    document.removeEventListener('mouseup', dragEnd);
    // persistir posição como right/bottom
    const r = S.refs.root.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    S.position = { right: vw - r.right, bottom: vh - r.bottom };
    S.refs.root.style.left = 'auto';
    S.refs.root.style.top = 'auto';
    S.refs.root.style.right = `${S.position.right}px`;
    S.refs.root.style.bottom = `${S.position.bottom}px`;
    savePrefs();
  }

  // ============================== ANTISPAM ==============================
  function guard(fn, cooldown=600){
    let busy = false;
    return async (...args) => {
      if (busy) return;
      busy = true;
      try { await fn(...args); } finally { setTimeout(() => { busy = false; }, cooldown); }
    };
  }

  // ============================== LOOP ==============================
  async function startLoop(){
    if (S.running) return;
    if (!S.hasToken){
      setStatus('Clique 1 pixel manualmente para capturar o token (se pedir CAPTCHA).', 'warn');
      log('warn', 'Token ausente. Aguardando clique manual.');
      return;
    }
    S.running = true;
    S.paused = false;
    setStatus('Iniciado.', 'info');
    log('info','Loop iniciado.');
    loop();
  }

  function togglePause(){
    if (!S.running) return;
    S.paused = !S.paused;
    setStatus(S.paused ? 'Pausado.' : 'Retomado.', 'info');
    log('info', S.paused ? 'Pausado.' : 'Retomado.');
  }

  function stopLoop(){
    S.running = false;
    S.paused = false;
    setStatus('Parado.', 'info');
    log('warn','Loop parado.');
  }

  let _lastAntiAfk = Date.now();

  async function loop(){
    while (S.running){
      if (S.paused){ await sleep(350); continue; }

      // Anti-AFK leve (scroll 1px e retorna)
      if (Date.now() - _lastAntiAfk > CFG.ANTIAFK_EVERY_MS){
        try { window.scrollBy(0, 1); await sleep(40); window.scrollBy(0, -1); } catch {}
        _lastAntiAfk = Date.now();
      }

      const { count, cooldownMs } = await getCharge();
      if (count < 1){
        setStatus('Sem cargas… aguardando recarga.', 'warn');
        await sleep(cooldownMs || 30000);
        continue;
      }
      if (!S.hasToken){
        setStatus('Token ausente. Clique 1 pixel manualmente.', 'warn');
        await sleep(1000);
        continue;
      }

      const batch = Math.min(S.charges.count, CFG.MAX_BATCH);
      for (let i=0;i<batch;i++){
        const { x, y } = nextPos();
        const colorId = rnd(1,31);
        const res = await paintPixel(x, y, colorId);
        if (res && res.painted === 1){
          S.painted++;
          S.charges.count--;
          setStatus('Pixel pintado.', 'info');
          log('info', `Pixel ✅ (${CFG.START_X + x}, ${CFG.START_Y + y})`);
          pushHistory(CFG.START_X + x, CFG.START_Y + y, colorId);
          updateStatsUI();
        } else if (res && res.token_error){
          S.hasToken = false;
          S.token = null;
          setStatus('Token inválido/expirado (possível CAPTCHA). Clique 1 pixel manualmente.', 'warn');
          log('warn','Token inválido/expirado.');
          break;
        } else {
          S.errors++;
          setStatus('Falha ao pintar pixel.', 'error');
          log('error','Falha ao pintar pixel.');
          updateStatsUI();
        }
      }

      const d = baseDelay();
      if (S.refs.delayNow) S.refs.delayNow.textContent = `${d} ms`;
      await sleep(d);
    }
  }

  // ============================== INIT ==============================
  buildUI();

  // Clique único para expandir/colapsar
  S.refs.root.addEventListener('click', (ev) => {
    // se clicou itens interativos, ignora
    if (ev.target.closest('.wbq-btn, .wbq-sel, .wbq-inp, .wbq-tab')) return;
    if (!S.expanded) toggleExpand();
  });

  // Pré-carga de charges (assíncrono interno)
  getCharge();

  setTimeout(() => {
    // Dica inicial
    log('info', 'Dica: clique em 1 pixel manualmente se aparecer CAPTCHA.');
    setStatus('Pronto', 'info');
  }, 200);

})();
