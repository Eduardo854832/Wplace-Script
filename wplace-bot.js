(async () => {
  'use strict';

  // =============== CONFIG PADRÃO ===============
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    AREA: 100,                 // lado do grid (NxN)
    BASE_DELAY: 500,           // base para cálculo do delay
    JITTER_MS: 250,            // variação aleatória no delay
    MAX_BATCH: 10,             // pixels por ciclo
    THEME: {
      bg: '#0b0b12',
      panel: '#111320',
      panelAlt: '#0e1020',
      border: '#2a2e4a',
      text: '#e6e9ef',
      subtext: '#aab2c0',
      accent: '#6e85ff',
      accent2: '#00e0a4',
      danger: '#ff5c7a',
      warn: '#ffbe55',
      ok: '#2ee59d',
      chip: '#1a1f36'
    }
  };

  // =============== ESTADO ===============
  const state = {
    running: false,
    paused: false,
    speed: localStorage.getItem('wplace.speed') || 'seguro', // 'seguro' | 'rapido'
    mode: localStorage.getItem('wplace.mode') || 'sequencial', // sequencial|aleatorio|linha|quadrado|espiral
    painted: 0,
    errors: 0,
    lastPixels: [],
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    user: null,
    token: null,
    ui: {},
    next: { x: 0, y: 0 }, // relativo
    lineDir: 1, // para modo linha
    spiral: { layer: 0, dx: 1, dy: 0, steps: 0, leg: 0 }, // para espiral
    alertCount: 0, // para bolinha no cabeçalho
    lock: false // anti-spam de botões
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============== CAPTURA TOKEN VIA FETCH ===============
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (url, opts = {}) => {
    try {
      if (typeof url === 'string' && url.includes('/s0/pixel/')) {
        if (opts && opts.body) {
          try {
            const body = JSON.parse(opts.body);
            if (body && body.t) {
              state.token = body.t;
              // se estava pausado aguardando ação manual, retoma
              if (state.paused && state.running) {
                state.paused = false;
                pushLog('info', 'Token capturado. Retomando.');
                updateStatus('▶️ Retomando…', 'ok');
              }
            }
          } catch {}
        }
      }
    } catch {}
    return nativeFetch(url, opts);
  };

  // =============== API AUX ===============
  async function getMe() {
    try {
      const res = await nativeFetch('https://backend.wplace.live/me', { credentials: 'include' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      state.user = data;
      state.charges = {
        count: Math.floor(data.charges.count),
        max: Math.floor(data.charges.max),
        cooldownMs: data.charges.cooldownMs
      };
      return data;
    } catch (e) {
      pushLog('warn', 'Falha ao carregar /me: ' + e.message);
      return null;
    }
  }

  async function paintPixel(relX, relY) {
    const color = Math.floor(Math.random() * 31) + 1;
    const url = `https://backend.wplace.live/s0/pixel/${CONFIG.START_X}/${CONFIG.START_Y}`;
    const payload = JSON.stringify({ coords: [relX, relY], colors: [color], t: state.token });
    try {
      const res = await nativeFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        credentials: 'include',
        body: payload
      });
      if (res.status === 403) {
        // token inválido/ausente — provavelmente captcha/expirou
        state.token = null;
        pushLog('warn', '403 do servidor. Aguardando ação manual (token/captcha).');
        setAlert(true);
        return { painted: 0, error: 'token' };
      }
      const data = await res.json();
      return data;
    } catch (e) {
      return { painted: 0, error: e.message };
    }
  }

  // =============== GERADOR DE POSIÇÕES ===============
  function nextSequential() {
    const { x, y } = state.next;
    let nx = x + 1, ny = y;
    if (nx >= CONFIG.AREA) { nx = 0; ny = (y + 1) % CONFIG.AREA; }
    state.next = { x: nx, y: ny };
    return { x, y };
  }
  function nextRandom() {
    return {
      x: Math.floor(Math.random() * CONFIG.AREA),
      y: Math.floor(Math.random() * CONFIG.AREA)
    };
  }
  function nextLine() {
    const { x, y } = state.next;
    let nx = x + state.lineDir, ny = y;
    if (nx >= CONFIG.AREA || nx < 0) { state.lineDir *= -1; nx = x + state.lineDir; ny = (y + 1) % CONFIG.AREA; }
    state.next = { x: nx, y: ny };
    return { x, y };
  }
  function nextSquare() {
    // percorre contorno de quadrados concêntricos
    const layer = Math.min(state.next.x, state.next.y, CONFIG.AREA - 1 - state.next.x, CONFIG.AREA - 1 - state.next.y);
    // se estamos no topo do layer, varre da esquerda para direita, senão tenta seguir em volta
    const side = CONFIG.AREA - layer * 2;
    if (side <= 0) { state.next = { x: 0, y: 0 }; return { x: 0, y: 0 }; }
    const per = Math.max(1, side * 4 - 4);
    const idx = ((state.next.y - layer) * side + (state.next.x - layer)) % per;

    // avança um passo ao longo do perímetro
    let nx = state.next.x, ny = state.next.y;
    if (ny === layer && nx < layer + side - 1) nx++;
    else if (nx === layer + side - 1 && ny < layer + side - 1) ny++;
    else if (ny === layer + side - 1 && nx > layer) nx--;
    else if (nx === layer && ny > layer + 1) ny--;
    else { // completou perímetro, próximo layer
      nx = layer + 1; ny = layer + 1;
    }
    state.next = { x: nx, y: ny };
    return { x: state.next.x, y: state.next.y };
  }
  function nextSpiral() {
    // espiral simples partindo de 0,0
    let { layer, dx, dy, steps, leg } = state.spiral;
    let { x, y } = state.next;
    x += dx; y += dy; steps++;
    if (steps >= layer + 1) {
      // troca direção: direita -> baixo -> esquerda -> cima
      [dx, dy] = [-dy, dx];
      leg++;
      steps = 0;
      if (leg % 2 === 0) layer++;
    }
    // clamp na área
    x = (x + CONFIG.AREA) % CONFIG.AREA;
    y = (y + CONFIG.AREA) % CONFIG.AREA;
    state.next = { x, y };
    state.spiral = { layer, dx, dy, steps, leg };
    return { x, y };
  }

  function nextPos() {
    switch (state.mode) {
      case 'aleatorio': return nextRandom();
      case 'linha': return nextLine();
      case 'quadrado': return nextSquare();
      case 'espiral': return nextSpiral();
      default: return nextSequential();
    }
  }

  // =============== DELAY DINÂMICO ===============
  function baseDelay() {
    // velocidade
    const speedMul = state.speed === 'rapido' ? 0.6 : 1.8;
    // estoque de cargas
    const c = state.charges?.count ?? 0;
    const stockMul = c > 20 ? 1 : c > 5 ? 1.5 : 2;
    // jitter
    const jitter = (Math.random() * CONFIG.JITTER_MS) | 0;
    return Math.max(200, CONFIG.BASE_DELAY * speedMul * stockMul) + jitter;
  }

  // =============== LOGS & ALERTAS ===============
  function pushLog(level, msg) {
    const time = new Date().toLocaleTimeString();
    state.logs.unshift({ level, msg, time });
    state.logs = state.logs.slice(0, 200);
    renderLogs();
    if (level === 'error' || level === 'warn') setAlert(true);
  }

  // bolinha no header
  function setAlert(on) {
    const dot = state.ui?.alertDot;
    if (!dot) return;
    if (on) {
      state.alertCount++;
      dot.style.opacity = '1';
      dot.textContent = '•';
    } else {
      state.alertCount = 0;
      dot.style.opacity = '0';
      dot.textContent = '';
    }
  }

  // intercepta console.warn/error para Logs
  const _warn = console.warn.bind(console);
  const _error = console.error.bind(console);
  console.warn = (...a) => { pushLog('warn', a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); _warn(...a); };
  console.error = (...a) => { pushLog('error', a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); _error(...a); };

  // =============== UI ===============
  function css(strings) { return strings[0]; }

  function buildUI() {
    if (document.getElementById('wplace-panel')) return;
    const style = document.createElement('style');
    style.textContent = css`
      #wplace-panel{position:fixed;inset:auto 16px 16px auto;width:min(420px,92vw);background:${CONFIG.THEME.panel};color:${CONFIG.THEME.text};border:1px solid ${CONFIG.THEME.border};border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.4);font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;z-index:999999}
      #wplace-header{display:flex;align-items:center;gap:8px;padding:10px 12px;background:${CONFIG.THEME.panelAlt};border-bottom:1px solid ${CONFIG.THEME.border};cursor:move;border-radius:16px 16px 0 0}
      #wplace-title{font-weight:700;letter-spacing:.2px}
      #wplace-alert{margin-left:auto;font-size:22px;line-height:1;color:${CONFIG.THEME.danger};opacity:0;transition:opacity .2s}
      #wplace-tabs{display:flex;gap:6px;padding:8px 8px 0 8px;flex-wrap:wrap}
      .wplace-tab{flex:1;min-width:80px;text-align:center;padding:8px;border-radius:10px;background:${CONFIG.THEME.chip};color:${CONFIG.THEME.text};opacity:.9;border:1px solid transparent;cursor:pointer;user-select:none}
      .wplace-tab.active{border-color:${CONFIG.THEME.accent};box-shadow:0 0 0 2px rgba(110,133,255,.2) inset}
      #wplace-body{padding:10px 12px 12px 12px;max-height:58vh;overflow:auto}
      .row{display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap}
      .label{color:${CONFIG.THEME.subtext};font-size:12px}
      .btn{padding:10px 12px;border-radius:10px;border:1px solid ${CONFIG.THEME.border};background:${CONFIG.THEME.panelAlt};color:${CONFIG.THEME.text};cursor:pointer;font-weight:600}
      .btn.primary{background:${CONFIG.THEME.accent};border-color:${CONFIG.THEME.accent};color:#fff}
      .btn.danger{background:${CONFIG.THEME.danger};border-color:${CONFIG.THEME.danger};color:#fff}
      .btn:disabled{opacity:.6;cursor:not-allowed}
      select,input[type="number"]{background:${CONFIG.THEME.panelAlt};border:1px solid ${CONFIG.THEME.border};color:${CONFIG.THEME.text};padding:8px;border-radius:8px}
      .stat{background:${CONFIG.THEME.panelAlt};border:1px solid ${CONFIG.THEME.border};border-radius:12px;padding:10px;min-width:100px;text-align:center}
      .kpi{font-size:18px;font-weight:700}
      #wplace-logs{font-family:ui-monospace,Consolas,monospace;font-size:12px;white-space:pre-wrap;background:${CONFIG.THEME.panelAlt};border:1px solid ${CONFIG.THEME.border};border-radius:10px;padding:8px;max-height:40vh;overflow:auto}
      .toast{position:fixed;right:20px;bottom:20px;background:${CONFIG.THEME.panel};border:1px solid ${CONFIG.THEME.border};color:${CONFIG.THEME.text};padding:10px 12px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.35);opacity:0;transform:translateY(10px);transition:opacity .2s,transform .2s;z-index:1000000}
      .toast.show{opacity:1;transform:translateY(0)}
      @media (max-width:560px){#wplace-panel{left:8px;right:8px;width:auto}}
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'wplace-panel';
    panel.innerHTML = `
      <div id="wplace-header">
        <div id="wplace-title">🎨 Wplace Bot</div>
        <div id="wplace-alert"></div>
      </div>
      <div id="wplace-tabs">
        <div class="wplace-tab active" data-tab="ctrl">Controle</div>
        <div class="wplace-tab" data-tab="stats">Estatísticas</div>
        <div class="wplace-tab" data-tab="logs">Logs</div>
        <div class="wplace-tab" data-tab="cfg">Config</div>
      </div>
      <div id="wplace-body"></div>
    `;
    document.body.appendChild(panel);

    // arrastar
    drag(panel, panel.querySelector('#wplace-header'));

    state.ui.panel = panel;
    state.ui.alertDot = panel.querySelector('#wplace-alert');
    state.ui.tabs = Array.from(panel.querySelectorAll('.wplace-tab'));
    state.ui.body = panel.querySelector('#wplace-body');

    // troca de abas
    state.ui.tabs.forEach(t => t.addEventListener('click', () => {
      state.ui.tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const tab = t.getAttribute('data-tab');
      renderTab(tab);
    }));

    renderTab('ctrl');
  }

  function drag(el, handle) {
    let sx, sy, ox, oy, m;
    handle.addEventListener('mousedown', (e) => {
      m = true; sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect(); ox = r.left; oy = r.top;
      document.addEventListener('mousemove', mm);
      document.addEventListener('mouseup', mu);
      e.preventDefault();
    });
    function mm(e) {
      if (!m) return;
      el.style.left = (ox + (e.clientX - sx)) + 'px';
      el.style.top = (oy + (e.clientY - sy)) + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    }
    function mu() {
      m = false;
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
    }
  }

  // =============== RENDER TABS ===============
  function renderTab(tab) {
    const b = state.ui.body;
    if (!b) return;
    if (tab === 'ctrl') {
      b.innerHTML = `
        <div class="row">
          <button id="wstart" class="btn primary">▶️ Iniciar</button>
          <button id="wpause" class="btn">⏸️ Pausar</button>
          <button id="wstop" class="btn danger">⏹️ Parar</button>
        </div>
        <div class="row">
          <label class="label">Modo:</label>
          <select id="wmode">
            <option value="sequencial">Sequencial</option>
            <option value="aleatorio">Aleatório</option>
            <option value="linha">Linha</option>
            <option value="quadrado">Quadrado</option>
            <option value="espiral">Espiral</option>
          </select>
          <label class="label">Velocidade:</label>
          <select id="wspeed">
            <option value="seguro">Seguro</option>
            <option value="rapido">Rápido</option>
          </select>
        </div>
        <div class="row">
          <div class="stat"><div class="label">Pintados</div><div id="kpi-painted" class="kpi">0</div></div>
          <div class="stat"><div class="label">Erros</div><div id="kpi-errors" class="kpi">0</div></div>
          <div class="stat"><div class="label">Cargas</div><div id="kpi-charges" class="kpi">0/0</div></div>
        </div>
        <div class="row"><div class="label" id="wstatus">Aguardando…</div></div>
      `;
      b.querySelector('#wmode').value = state.mode;
      b.querySelector('#wspeed').value = state.speed;
      bindCtrl();
    } else if (tab === 'stats') {
      b.innerHTML = `
        <div class="row">
          <div class="stat" style="flex:1">
            <div class="label">Usuário</div>
            <div id="st-user" class="kpi">-</div>
          </div>
          <div class="stat" style="flex:1">
            <div class="label">Level</div>
            <div id="st-level" class="kpi">-</div>
          </div>
          <div class="stat" style="flex:1">
            <div class="label">Cargas</div>
            <div id="st-ch" class="kpi">-</div>
          </div>
        </div>
        <div class="row">
          <div class="stat" style="flex:1">
            <div class="label">Pixels (sessão)</div>
            <div id="st-painted" class="kpi">${state.painted}</div>
          </div>
          <div class="stat" style="flex:1">
            <div class="label">Erros (sessão)</div>
            <div id="st-errors" class="kpi">${state.errors}</div>
          </div>
        </div>
      `;
      updateStatsUI();
    } else if (tab === 'logs') {
      b.innerHTML = `<div id="wplace-logs"></div>`;
      renderLogs();
    } else if (tab === 'cfg') {
      b.innerHTML = `
        <div class="row">
          <label class="label">Início X</label><input id="cfg-x" type="number" value="${CONFIG.START_X}" style="width:100px">
          <label class="label">Início Y</label><input id="cfg-y" type="number" value="${CONFIG.START_Y}" style="width:100px">
          <label class="label">Área (N)</label><input id="cfg-n" type="number" value="${CONFIG.AREA}" style="width:90px">
        </div>
        <div class="row">
          <button id="cfg-save" class="btn">Salvar</button>
          <button id="cfg-reset" class="btn">Reset</button>
        </div>
      `;
      b.querySelector('#cfg-save').onclick = () => {
        const nx = parseInt(b.querySelector('#cfg-x').value, 10) || CONFIG.START_X;
        const ny = parseInt(b.querySelector('#cfg-y').value, 10) || CONFIG.START_Y;
        const nn = Math.max(1, parseInt(b.querySelector('#cfg-n').value, 10) || CONFIG.AREA);
        CONFIG.START_X = nx; CONFIG.START_Y = ny; CONFIG.AREA = nn;
        pushLog('info', `Config salva: X=${nx} Y=${ny} N=${nn}`);
        toast('Configurações salvas.');
      };
      b.querySelector('#cfg-reset').onclick = () => {
        CONFIG.START_X = 742; CONFIG.START_Y = 1148; CONFIG.AREA = 100;
        pushLog('info', 'Config resetada para padrão.');
        toast('Configurações resetadas.');
      };
    }
  }

  function bindCtrl() {
    const b = state.ui.body;
    const btnStart = b.querySelector('#wstart');
    const btnPause = b.querySelector('#wpause');
    const btnStop = b.querySelector('#wstop');
    const selMode = b.querySelector('#wmode');
    const selSpeed = b.querySelector('#wspeed');

    // valores iniciais
    selMode.value = state.mode;
    selSpeed.value = state.speed;

    selMode.onchange = () => {
      state.mode = selMode.value;
      localStorage.setItem('wplace.mode', state.mode);
      pushLog('info', 'Modo: ' + state.mode);
    };
    selSpeed.onchange = () => {
      state.speed = selSpeed.value;
      localStorage.setItem('wplace.speed', state.speed);
      pushLog('info', 'Velocidade: ' + state.speed);
    };

    btnStart.onclick = () => actionSafe(async () => {
      if (!state.token) {
        pushLog('warn', 'Sem token (clique 1 pixel manualmente se necessário).');
        updateStatus('❌ Sem token. Pinte 1 pixel manualmente.', 'warn');
        setAlert(true);
        return;
      }
      if (!state.running) {
        state.running = true;
        state.paused = false;
        updateStatus('▶️ Rodando…', 'ok');
        setAlert(false);
        loop();
      } else if (state.paused) {
        state.paused = false;
        updateStatus('▶️ Retomando…', 'ok');
      }
    });

    btnPause.onclick = () => actionSafe(() => {
      if (state.running) {
        state.paused = !state.paused;
        updateStatus(state.paused ? '⏸️ Pausado' : '▶️ Retomando…', state.paused ? 'warn' : 'ok');
      }
    });

    btnStop.onclick = () => actionSafe(() => {
      if (state.running) {
        state.running = false;
        state.paused = false;
        updateStatus('⏹️ Parado', 'danger');
      }
    });
  }

  function updateStatus(msg, kind = 'ok') {
    const el = state.ui.body?.querySelector('#wstatus');
    if (!el) return;
    el.textContent = msg;
    el.style.color = kind === 'ok' ? CONFIG.THEME.ok
      : kind === 'warn' ? CONFIG.THEME.warn
      : kind === 'danger' ? CONFIG.THEME.danger
      : CONFIG.THEME.text;
  }

  function updateKPIs() {
    const b = state.ui.body;
    const p = b?.querySelector('#kpi-painted');
    const e = b?.querySelector('#kpi-errors');
    const c = b?.querySelector('#kpi-charges');
    if (p) p.textContent = String(state.painted);
    if (e) e.textContent = String(state.errors);
    if (c) c.textContent = `${state.charges.count}/${state.charges.max}`;
  }

  function updateStatsUI() {
    const b = state.ui.body;
    const u = b?.querySelector('#st-user');
    const l = b?.querySelector('#st-level');
    const ch = b?.querySelector('#st-ch');
    if (!state.user) return;
    if (u) u.textContent = state.user?.name ?? '-';
    if (l) l.textContent = Math.floor(state.user?.level || 0);
    if (ch) ch.textContent = `${Math.floor(state.charges.count)}/${Math.floor(state.charges.max)}`;
  }

  function renderLogs() {
    const box = state.ui.body?.querySelector('#wplace-logs');
    if (!box) return;
    box.innerHTML = state.logs.map(l => {
      const color = l.level === 'error' ? CONFIG.THEME.danger : l.level === 'warn' ? CONFIG.THEME.warn : CONFIG.THEME.subtext;
      return `[${l.time}] ${l.level.toUpperCase()}: %c${escapeHtml(l.msg)}%c`;
    }).join('\n');
    // colorização simples removida (console style não funciona em innerHTML)
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function toast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
  }

  // anti-spam simples
  async function actionSafe(fn) {
    if (state.lock) return;
    try {
      state.lock = true;
      await fn();
    } finally {
      setTimeout(() => { state.lock = false; }, 350); // janela curta de proteção
    }
  }

  // =============== LOOP PRINCIPAL ===============
  async function loop() {
    while (state.running) {
      if (state.paused) { await sleep(300); continue; }

      // recarrega info de cargas/usuário periodicamente
      await getMe();
      updateKPIs();
      updateStatsUI();

      if (!state.token) {
        updateStatus('⛔ Sem token/captcha. Aguarde e clique 1 pixel manualmente.', 'warn');
        setAlert(true);
        await sleep(1000);
        continue;
      }

      const available = state.charges.count | 0;
      if (available < 1) {
        updateStatus('⌛ Sem cargas, aguardando recarga…', 'warn');
        const waitMs = state.charges.cooldownMs || 30000;
        await sleep(waitMs);
        continue;
      }

      // pinta em pequenos lotes
      const batch = Math.min(CONFIG.MAX_BATCH, state.charges.count);
      for (let i = 0; i < batch && state.running && !state.paused; i++) {
        const { x, y } = nextPos();
        const res = await paintPixel(x, y);
        if (res && res.painted === 1) {
          state.painted++;
          state.charges.count--;
          state.lastPixels.unshift({ absX: CONFIG.START_X + x, absY: CONFIG.START_Y + y, t: Date.now() });
          state.lastPixels = state.lastPixels.slice(0, 8);
          updateKPIs();
          updateStatus('✅ Pixel!', 'ok');
        } else {
          state.errors++;
          updateKPIs();
          if (res && res.error === 'token') {
            updateStatus('❌ 403/token inválido — pausando.', 'danger');
            state.paused = true;
            setAlert(true);
            break;
          } else {
            pushLog('warn', 'Falha ao pintar (tentando seguir).');
          }
        }

        await sleep(baseDelay());
      }
    }
  }

  // =============== INIT ===============
  await getMe();
  buildUI();
  pushLog('info', 'Painel carregado. Configure e clique em Iniciar.');
})();