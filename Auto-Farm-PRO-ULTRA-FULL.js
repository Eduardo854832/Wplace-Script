
(async () => {
  /**************************************************************
   * WPlace Auto-Farm — PRO ULTRA FULL
   * - Layout moderno (drawer/flutuante) + redimensionável
   * - Bubble (minimizado) arrastável c/ snap lateral e posição salva
   * - Start/Stop reais com integração ao backend do WPlace
   * - Captura automática do token via interceptação de fetch
   * - Auto-refresh de token (best effort na UI do site)
   * - Área e paleta personalizáveis (random/fixa com índices 1–31)
   * - Estatísticas: uptime, pixels/h, charges, cooldown progressivo
   * - Mini-gráfico (Chart.js dinâmico) de Pixels/h
   * - Logs em bolhas coloridas + persistência
   * - Atalhos: Ctrl+Shift+S (Start/Stop), Ctrl+Shift+M (Min/Max)
   * - Notificações nativas e beep (áudio embutido)
   * - Exportar/Importar configurações & dados (JSON)
   **************************************************************/

  /* =================== CONFIG =================== */
  const DEFAULT_CONFIG = { START_X: 742, START_Y: 1148, DELAY: 1000 };
  const STORAGE_KEYS = {
    settings: 'wplace:settings',
    position: 'wplace:position',
    bubble: 'wplace:bubblepos',
    panelSize: 'wplace:panelsize',
    logs: 'wplace:logs',
    stats: 'wplace:stats'
  };

  const SETTINGS_DEFAULT = {
    language: 'auto',           // 'auto' | 'pt' | 'en'
    autoRefresh: true,
    minimized: false,
    themeMode: 'auto',          // 'auto' | 'dark' | 'light'
    paletteMode: 'random',      // 'random' | 'fixed'
    paletteFixed: '1,2,3',      // indices 1..31
    area: { width: 100, height: 100, offsetX: 0, offsetY: 0 },
    beepOnEvents: true,
    notifyOnEvents: true,
    logsLimit: 150
  };

  const state = {
    running: false,
    paintedCount: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    lastPixel: null,
    startTime: null,
    capturedCaptchaToken: null,
    pausedForManual: false
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const load = (k, d) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const settings = { ...SETTINGS_DEFAULT, ...load(STORAGE_KEYS.settings, {}) };
  let logs = load(STORAGE_KEYS.logs, []);
  let statsSeries = load(STORAGE_KEYS.stats, []);

  /* =================== I18N =================== */
  const tdict = {
    pt: {
      title: "WPlace Auto-Farm PRO",
      start: "Iniciar",
      stop: "Parar",
      ready: "Pronto para começar",
      user: "Usuário",
      pixels: "Pixels",
      charges: "Cargas",
      level: "Nível",
      uptime: "Uptime",
      pph: "Pixels/h",
      settings: "Configurações",
      appearance: "Aparência",
      theme: "Tema",
      auto: "Automático",
      dark: "Escuro",
      light: "Claro",
      palette: "Paleta",
      random: "Aleatória",
      fixed: "Fixa",
      fixedHint: "Índices (1-31) separados por vírgula",
      area: "Área",
      width: "Largura",
      height: "Altura",
      offsetX: "Offset X",
      offsetY: "Offset Y",
      save: "Salvar",
      saved: "Configurações salvas!",
      logs: "Histórico",
      clear: "Limpar",
      beep: "Som de alerta",
      notify: "Notificação",
      autoRefresh: "Auto Refresh",
      minimized: "Minimizado",
      cooldown: "Cooldown",
      awaitingCharges: "Sem cargas. Aguardando",
      tokenMissing: "Token não capturado. Clique em qualquer pixel primeiro.",
      paintingStarted: "Pintura iniciada!",
      paintingStopped: "Parado",
      paintedOk: "Pixel pintado!",
      paintFail: "Falha ao pintar",
      tokenExpired: "Token expirado. Abrindo Paint para renovar...",
      insufficient: "Cargas insuficientes para auto-refresh. Clique manualmente.",
      selectTransparent: "Selecionando transparente...",
      confirming: "Confirmando pintura...",
      clickPaint: "Clique no botão Pintar manualmente.",
      export: "Exportar",
      import: "Importar",
      importWarn: "Importe um JSON exportado deste painel."
    },
    en: {
      title: "WPlace Auto-Farm PRO",
      start: "Start",
      stop: "Stop",
      ready: "Ready to start",
      user: "User",
      pixels: "Pixels",
      charges: "Charges",
      level: "Level",
      uptime: "Uptime",
      pph: "Pixels/h",
      settings: "Settings",
      appearance: "Appearance",
      theme: "Theme",
      auto: "Auto",
      dark: "Dark",
      light: "Light",
      palette: "Palette",
      random: "Random",
      fixed: "Fixed",
      fixedHint: "Indices (1-31) separated by commas",
      area: "Area",
      width: "Width",
      height: "Height",
      offsetX: "Offset X",
      offsetY: "Offset Y",
      save: "Save",
      saved: "Settings saved!",
      logs: "History",
      clear: "Clear",
      beep: "Alert sound",
      notify: "Notification",
      autoRefresh: "Auto Refresh",
      minimized: "Minimized",
      cooldown: "Cooldown",
      awaitingCharges: "No charges. Waiting",
      tokenMissing: "CAPTCHA token not captured. Click any pixel first.",
      paintingStarted: "Painting started!",
      paintingStopped: "Stopped",
      paintedOk: "Pixel painted!",
      paintFail: "Failed to paint",
      tokenExpired: "Token expired. Opening Paint to renew...",
      insufficient: "Insufficient charges for auto-refresh. Click manually.",
      selectTransparent: "Selecting transparent...",
      confirming: "Confirming paint...",
      clickPaint: "Click the Paint button manually.",
      export: "Export",
      import: "Import",
      importWarn: "Import a JSON exported from this panel."
    }
  };

  async function detectLanguage() {
    if (settings.language !== 'auto') return settings.language;
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      return (data && data.country === 'BR') ? 'pt' : 'en';
    } catch { return 'en'; }
  }
  const lang = await detectLanguage();
  const TXT = tdict[lang] || tdict.en;

  /* =================== UTIL: loaders & audio =================== */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  // Icons + Chart
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js');
  await loadScript('https://cdn.jsdelivr.net/npm/chart.js');

  const BEEP_URI = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYBWFlaAAABAQAA";
  function playBeep() { if (!settings.beepOnEvents) return; try { new Audio(BEEP_URI).play(); } catch {} }

  /* =================== FETCH INTERCEPTOR =================== */
  const originalFetch = window.fetch;
  window.fetch = async (url, options = {}) => {
    if (typeof url === 'string' && url.includes('https://backend.wplace.live/s0/pixel/')) {
      try {
        const payload = JSON.parse(options?.body || '{}');
        if (payload.t) {
          state.capturedCaptchaToken = payload.t;
          if (state.pausedForManual) {
            state.pausedForManual = false;
            state.running = true;
            updateUI('🚀 ' + TXT.paintingStarted, 'success');
            paintLoop();
          }
        }
      } catch {}
    }
    return originalFetch(url, options);
  };

  /* =================== API HELPERS =================== */
  const fetchAPI = async (url, options = {}) => {
    try {
      const res = await fetch(url, { credentials: 'include', ...options });
      return await res.json();
    } catch { return null; }
  };
  const getCharge = async () => {
    const data = await fetchAPI('https://backend.wplace.live/me');
    if (data) {
      state.userInfo = data;
      state.charges = {
        count: Math.floor(data.charges.count),
        max: Math.floor(data.charges.max),
        cooldownMs: data.charges.cooldownMs
      };
      if (state.userInfo.level) state.userInfo.level = Math.floor(state.userInfo.level);
    }
    return state.charges;
  };
  function getAreaRect() {
    const w = clamp(Number(settings.area.width) || 100, 1, 2000);
    const h = clamp(Number(settings.area.height) || 100, 1, 2000);
    const ox = Number(settings.area.offsetX) || 0;
    const oy = Number(settings.area.offsetY) || 0;
    return { w, h, ox, oy };
  }
  function getRandomPosition() {
    const rect = getAreaRect();
    const x = Math.floor(Math.random() * rect.w) + rect.ox;
    const y = Math.floor(Math.random() * rect.h) + rect.oy;
    return { x, y };
  }
  function pickColorIndex() {
    if (settings.paletteMode === 'fixed') {
      const arr = (settings.paletteFixed || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 1 && n <= 31);
      if (arr.length) return arr[Math.floor(Math.random() * arr.length)];
    }
    return Math.floor(Math.random() * 31) + 1;
  }
  const paintPixel = async (x, y) => {
    const colorIndex = pickColorIndex();
    const url = `https://backend.wplace.live/s0/pixel/${DEFAULT_CONFIG.START_X}/${DEFAULT_CONFIG.START_Y}`;
    const payload = JSON.stringify({ coords: [x, y], colors: [colorIndex], t: state.capturedCaptchaToken });
    try {
      const res = await originalFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        credentials: 'include',
        body: payload
      });
      if (res.status === 403) { state.capturedCaptchaToken = null; return 'token_error'; }
      return await res.json();
    } catch { return null; }
  };

  /* =================== STYLES =================== */
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --bg:#0f1220; --bg-2:#151a2e; --text:#e8eaf6; --muted:#a6b0d6;
      --accent:#5b6be6; --accent-2:#8ea2ff;
      --ok:#22c55e; --err:#ef4444;
      --card: rgba(255,255,255,0.06);
      --card-2: rgba(255,255,255,0.10);
      --shadow: 0 14px 40px rgba(0,0,0,0.5);
      --gradient: linear-gradient(135deg, rgba(91,107,230,.25), rgba(142,162,255,.12));
    }
    [data-theme="light"] {
      --bg:#f8fafc; --bg-2:#eef2ff; --text:#0b1220; --muted:#49536e;
      --accent:#4f65f2; --accent-2:#7b8cff;
      --ok:#16a34a; --err:#dc2626;
      --card: rgba(0,0,0,0.06);
      --card-2: rgba(0,0,0,0.10);
      --shadow: 0 12px 28px rgba(0,0,0,0.16);
      --gradient: linear-gradient(135deg, rgba(79,101,242,.20), rgba(123,140,255,.12));
    }
    @keyframes fadeInUp { from{opacity:0; transform:translateY(12px);} to{opacity:1; transform:none;} }
    @keyframes pulseOk { 0%{box-shadow:0 0 0 0 rgba(34,197,94,0.55);} 70%{box-shadow:0 0 0 18px rgba(34,197,94,0);} 100%{box-shadow:0 0 0 0 rgba(34,197,94,0);} }

    .wpro-panel {
      position: fixed; right: 18px; bottom: 18px;
      width: 380px; max-width: 94vw;
      background: var(--bg); color: var(--text);
      border-radius: 18px; box-shadow: var(--shadow); overflow: hidden;
      z-index: 999999; animation: fadeInUp .30s ease;
      border: 1px solid var(--card-2);
      background-image: var(--gradient);
      backdrop-filter: saturate(1.1) blur(1px);
    }
    .wpro-header {
      background: var(--bg-2); padding: 10px 12px;
      display:flex; align-items:center; justify-content:space-between;
      font-weight: 800; border-bottom: 1px solid var(--card); user-select:none;
      cursor: move;
    }
    .wpro-header .actions { display:flex; gap: 6px; }
    .wpro-header .btn-mini {
      background: rgba(0,0,0,0.06); border: 1px solid var(--card); color: var(--text);
      padding: 6px 8px; border-radius: 10px; cursor:pointer;
    }
    .wpro-header .btn-mini:hover { filter: brightness(1.1); }
    .wpro-content { padding: 10px; display:flex; flex-direction:column; gap: 10px; max-height: 70vh; overflow:auto; }

    .row { display:flex; align-items:center; gap:10px; flex-wrap: wrap; }
    .btn {
      padding: 10px 12px; border:0; border-radius: 12px; cursor:pointer; font-weight:700;
      display:flex; align-items:center; justify-content:center; gap:8px;
      box-shadow: inset 0 -2px 0 rgba(0,0,0,.15);
    }
    .btn-primary { background: var(--accent); color:#fff; }
    .btn-stop { background: var(--err); color:#fff; }
    .switch { display:flex; align-items:center; gap:8px; font-size: 13px; color: var(--muted); }

    .card { background: var(--card); border-radius: 12px; padding: 10px; border: 1px solid var(--card-2); }
    .stats { display:grid; grid-template-columns: repeat(2,1fr); gap: 8px; }
    .stat { background: var(--bg-2); border-radius: 10px; padding: 8px; display:flex; flex-direction:column; align-items:center; gap:4px; border: 1px solid var(--card); }
    .stat small { color: var(--muted); }
    .status { text-align:center; padding: 10px; border-radius: 10px; background: var(--bg-2); border: 1px solid var(--card); }
    .status.ok { color: var(--ok); background: rgba(34,197,94,.12); }
    .status.err { color: var(--err); background: rgba(239,68,68,.12); }

    .progress { height: 8px; border-radius: 999px; background: var(--card); overflow:hidden; border: 1px solid var(--card-2); }
    .progress > div { height:100%; width:0%; background: var(--accent); transition: width .2s ease; }

    .section-title { display:flex; align-items:center; gap:8px; font-weight:800; color: var(--muted); text-transform: uppercase; font-size: 11px; letter-spacing:.08em; }

    .input, .select { width:100%; padding:8px 10px; border-radius: 10px; border:1px solid var(--card-2); background: transparent; color: var(--text); }
    .hint { font-size: 11px; color: var(--muted); }

    .logs { max-height: 180px; overflow:auto; background: var(--bg-2); border-radius:12px; padding:8px; font-size:13px; border:1px solid var(--card); }
    .log-item { background: var(--card); padding: 8px 10px; border-radius: 10px; margin-bottom: 6px; display:flex; gap:8px; align-items:flex-start; word-break: break-word; white-space: pre-wrap; border:1px solid var(--card-2); }
    .log-item.success { border-left: 3px solid var(--ok); }
    .log-item.error { border-left: 3px solid var(--err); }
    .log-item.status { border-left: 3px solid var(--accent); }
    .log-item i { opacity:.8; margin-top:2px; }

    .bubble { position: fixed; bottom: 14px; right: 14px; width: 56px; height:56px; border-radius: 50%; background: var(--accent); box-shadow: var(--shadow); display:none; align-items:center; justify-content:center; color:#fff; z-index:1000000; cursor:pointer; border:1px solid var(--card-2); user-select:none; }
    .bubble.ok { animation: pulseOk .5s ease; }

    /* Resize handle */
    .resize-handle { position: absolute; width: 14px; height: 14px; right: 2px; bottom: 2px; cursor: nwse-resize; opacity: .7; }
    .resize-handle::after { content: ""; position:absolute; right:3px; bottom:3px; width:10px; height:10px; border-right:2px solid var(--muted); border-bottom:2px solid var(--muted); }

    @media (max-width: 640px) {
      .wpro-panel { left: 0; right: 0; bottom: 0; margin: 0 10px 10px; width:auto; border-radius: 16px; }
    }
  `;
  document.head.appendChild(style);

  function applyTheme() {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const mode = settings.themeMode === 'auto' ? (prefersDark ? 'dark' : 'light') : settings.themeMode;
    document.documentElement.setAttribute('data-theme', mode === 'dark' ? 'dark' : 'light');
  }
  applyTheme();

  /* =================== PANEL HTML =================== */
  const panel = document.createElement('div');
  panel.className = 'wpro-panel';
  const panelSize = load(STORAGE_KEYS.panelSize, { w: 380 });
  if (panelSize && panelSize.w) panel.style.width = Math.max(300, Math.min(560, panelSize.w)) + 'px';

  panel.innerHTML = `
    <div class="wpro-header" id="wpro-drag">
      <div><i class="fas fa-swatchbook"></i> ${TXT.title}</div>
      <div class="actions">
        <button id="btn-export" class="btn-mini" title="${TXT.export}"><i class="fas fa-file-export"></i></button>
        <button id="btn-import" class="btn-mini" title="${TXT.import}"><i class="fas fa-file-import"></i></button>
        <button id="btn-settings" class="btn-mini" title="${TXT.settings}"><i class="fas fa-gear"></i></button>
        <button id="btn-min" class="btn-mini" title="${TXT.minimized}"><i class="fas fa-minus"></i></button>
      </div>
    </div>
    <div class="wpro-content" id="wpro-content" style="display:${settings.minimized ? 'none':'flex'}">
      <div class="row">
        <button id="btn-toggle" class="btn ${state.running ? 'btn-stop':'btn-primary'}">
          <i class="fas ${state.running ? 'fa-stop':'fa-play'}"></i><span>${state.running ? TXT.stop : TXT.start}</span>
        </button>
        <label class="switch"><input type="checkbox" id="chk-refresh" ${settings.autoRefresh ? 'checked':''}/> ${TXT.autoRefresh}</label>
        <label class="switch"><input type="checkbox" id="chk-beep" ${settings.beepOnEvents ? 'checked':''}/> ${TXT.beep}</label>
        <label class="switch"><input type="checkbox" id="chk-notify" ${settings.notifyOnEvents ? 'checked':''}/> ${TXT.notify}</label>
      </div>

      <div class="card">
        <div class="stats">
          <div class="stat"><small><i class="fas fa-user"></i> ${TXT.user}</small><div id="st-user">—</div></div>
          <div class="stat"><small><i class="fas fa-star"></i> ${TXT.level}</small><div id="st-level">—</div></div>
          <div class="stat"><small><i class="fas fa-paint-brush"></i> ${TXT.pixels}</small><div id="st-pixels">0</div></div>
          <div class="stat"><small><i class="fas fa-gauge-high"></i> ${TXT.pph}</small><div id="st-pph">0</div></div>
          <div class="stat"><small><i class="fas fa-clock"></i> ${TXT.uptime}</small><div id="st-uptime">00:00:00</div></div>
          <div class="stat"><small><i class="fas fa-bolt"></i> ${TXT.charges}</small><div id="st-charges">0/0</div></div>
        </div>
        <div class="row" style="align-items:center; gap:8px; margin-top:8px;">
          <div class="progress" style="flex:1;"><div id="pg-cooldown"></div></div>
          <div style="min-width:70px; text-align:right; font-size:12px; color:var(--muted);" id="cooldown-label">${TXT.cooldown}</div>
        </div>
      </div>

      <div class="status" id="status">${TXT.ready}</div>

      <canvas id="wpro-chart" height="120"></canvas>

      <div class="section-title"><i class="fas fa-list"></i> ${TXT.logs}</div>
      <div class="logs" id="logs"></div>
      <div class="row" style="justify-content: flex-end;">
        <button id="btn-clear-logs" class="btn"><i class="fas fa-trash"></i> ${TXT.clear}</button>
      </div>
    </div>

    <div class="wpro-content card" id="wpro-settings" style="display:none;">
      <div class="section-title"><i class="fas fa-sliders"></i> ${TXT.settings}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label>${TXT.theme}
          <select id="sel-theme" class="select">
            <option value="auto"${settings.themeMode==='auto'?' selected':''}>${TXT.auto}</option>
            <option value="dark"${settings.themeMode==='dark'?' selected':''}>${TXT.dark}</option>
            <option value="light"${settings.themeMode==='light'?' selected':''}>${TXT.light}</option>
          </select>
        </label>
        <label>${TXT.palette}
          <select id="sel-palette" class="select">
            <option value="random"${settings.paletteMode==='random'?' selected':''}>${TXT.random}</option>
            <option value="fixed"${settings.paletteMode==='fixed'?' selected':''}>${TXT.fixed}</option>
          </select>
        </label>
        <label style="grid-column:1/3;">
          <input id="inp-fixed" class="input" placeholder="${TXT.fixedHint}" value="${settings.paletteFixed}"/>
          <div class="hint">${TXT.fixedHint}</div>
        </label>
      </div>

      <div class="section-title"><i class="fas fa-vector-square"></i> ${TXT.area}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        <label>${TXT.width}<input id="inp-w" type="number" class="input" min="1" max="2000" value="${settings.area.width}"/></label>
        <label>${TXT.height}<input id="inp-h" type="number" class="input" min="1" max="2000" value="${settings.area.height}"/></label>
        <label>${TXT.offsetX}<input id="inp-ox" type="number" class="input" value="${settings.area.offsetX}"/></label>
        <label>${TXT.offsetY}<input id="inp-oy" type="number" class="input" value="${settings.area.offsetY}"/></label>
      </div>

      <div class="row" style="justify-content:space-between; margin-top:8px;">
        <button id="btn-save" class="btn btn-primary"><i class="fas fa-save"></i> ${TXT.save}</button>
        <label class="switch"><input type="checkbox" id="chk-min" ${settings.minimized?'checked':''}/> ${TXT.minimized}</label>
      </div>
      <div class="status" id="status-save" style="display:none; margin-top:8px;">${TXT.saved}</div>
      <div class="hint" style="margin-top:6px">${TXT.importWarn}</div>
    </div>
    <div class="resize-handle" id="resize-handle"></div>
  `;
  document.body.appendChild(panel);

  const content = document.getElementById('wpro-content');
  const settingsView = document.getElementById('wpro-settings');

  /* =================== Bubble =================== */
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = `<i class="fas fa-paint-brush"></i>`;
  document.body.appendChild(bubble);
  function setMinimized(min) {
    settings.minimized = min; save(STORAGE_KEYS.settings, settings);
    content.style.display = min ? 'none' : 'flex';
    settingsView.style.display = 'none';
    bubble.style.display = min ? 'flex' : 'none';
  }
  setMinimized(!!settings.minimized);

  // Restore bubble position
  const savedBubble = load(STORAGE_KEYS.bubble, null);
  if (savedBubble) {
    bubble.style.left = savedBubble.left + 'px';
    bubble.style.top = savedBubble.top + 'px';
    if (savedBubble.side === 'right') { bubble.style.right = '14px'; bubble.style.left = 'auto'; }
    if (savedBubble.top == null) bubble.style.top = '';
  }

  (function enableBubbleDrag() {
    let dragging = false, sx=0, sy=0, ox=0, oy=0;
    const onDown = (e) => {
      dragging = true;
      const p = e.touches ? e.touches[0] : e;
      sx = p.clientX; sy = p.clientY;
      const rect = bubble.getBoundingClientRect();
      ox = rect.left; oy = rect.top;
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      const dx = p.clientX - sx, dy = p.clientY - sy;
      bubble.style.left = (ox + dx) + 'px';
      bubble.style.top = (oy + dy) + 'px';
      bubble.style.right = 'auto';
      bubble.style.bottom = 'auto';
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      const rect = bubble.getBoundingClientRect();
      const side = rect.left < window.innerWidth/2 ? 'left' : 'right';
      if (side === 'left') { bubble.style.left = '14px'; bubble.style.right = 'auto'; }
      else { bubble.style.right = '14px'; bubble.style.left = 'auto'; }
      save(STORAGE_KEYS.bubble, { left: rect.left, top: rect.top, side });
    };
    bubble.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    bubble.addEventListener('touchstart', onDown, {passive:false});
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('touchend', onUp);
  })();

  bubble.addEventListener('click', () => setMinimized(false));

  /* =================== Logs =================== */
  function addLog(text, type='status') {
    const ts = new Date().toLocaleTimeString();
    logs.push({ ts, text, type });
    if (logs.length > settings.logsLimit) logs = logs.slice(-settings.logsLimit);
    save(STORAGE_KEYS.logs, logs);
    renderLogs();
    if (settings.notifyOnEvents && "Notification" in window) {
      if (Notification.permission === "granted") new Notification("WPlace Bot", { body: text });
      else if (Notification.permission !== "denied") Notification.requestPermission();
    }
  }
  function renderLogs() {
    const el = document.getElementById('logs');
    if (!el) return;
    el.innerHTML = logs.map(l => `
      <div class="log-item ${l.type}">
        <i class="fas ${l.type==='success'?'fa-check-circle':l.type==='error'?'fa-xmark-circle':'fa-info-circle'}"></i>
        <div><b>[${l.ts}]</b> ${l.text}</div>
      </div>
    `).join('');
    el.scrollTop = el.scrollHeight;
  }
  renderLogs();

  /* =================== Status & Stats =================== */
  function setStatus(msg, type='') {
    const s = document.getElementById('status');
    if (!s) return;
    s.textContent = msg;
    s.className = `status ${type}`.trim();
  }
  function updateStatsUI() {
    if (state.userInfo) {
      const stUser = document.getElementById('st-user');
      const stLevel = document.getElementById('st-level');
      if (stUser) stUser.textContent = state.userInfo.name || '—';
      if (stLevel) stLevel.textContent = state.userInfo.level ?? '0';
    }
    const stPixels = document.getElementById('st-pixels');
    if (stPixels) stPixels.textContent = state.paintedCount;

    const uptime = state.startTime ? (Date.now() - state.startTime) : 0;
    const stUptime = document.getElementById('st-uptime');
    if (stUptime) {
      const h = String(Math.floor(uptime/3600000)).padStart(2,'0');
      const m = String(Math.floor((uptime%3600000)/60000)).padStart(2,'0');
      const s = String(Math.floor((uptime%60000)/1000)).padStart(2,'0');
      stUptime.textContent = `${h}:${m}:${s}`;
    }
    const stPPH = document.getElementById('st-pph');
    if (stPPH) {
      const hours = uptime/3600000 || 1/3600000;
      stPPH.textContent = (state.paintedCount / hours).toFixed(1);
    }
    const stCharges = document.getElementById('st-charges');
    if (stCharges) stCharges.textContent = `${Math.floor(state.charges.count)}/${Math.floor(state.charges.max)}`;
  }
  function setCooldownProgress(percent, labelText='') {
    const bar = document.getElementById('pg-cooldown');
    const label = document.getElementById('cooldown-label');
    if (bar) bar.style.width = clamp(percent, 0, 100) + '%';
    if (label && labelText) label.textContent = labelText;
  }
  window.updateUI = (message, type = 'status') => {
    setStatus(message, type === 'success' ? 'ok' : (type === 'error' ? 'err' : ''));
    addLog(message, type);
    if (type === 'success') { bubble.classList.add('ok'); setTimeout(()=>bubble.classList.remove('ok'), 600); }
  };
  window.updateStats = async () => { await getCharge(); updateStatsUI(); };

  /* =================== Chart =================== */
  const chartCtx = document.getElementById('wpro-chart').getContext('2d');
  const chart = new Chart(chartCtx, {
    type: 'line',
    data: { labels: [], datasets: [{ label: TXT.pph, data: [], borderColor: '#5b6be6', fill: false, tension: .2 }] },
    options: { plugins:{legend:{display:false}}, scales:{x:{display:false},y:{beginAtZero:true}} }
  });
  function updateChart() {
    const uptime = state.startTime ? (Date.now() - state.startTime) : 0;
    const hours = uptime/3600000 || 1/3600000;
    const pph = +(state.paintedCount / hours).toFixed(1);
    chart.data.labels.push(new Date().toLocaleTimeString());
    chart.data.datasets[0].data.push(pph);
    if (chart.data.labels.length > 30) { chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
    chart.update();
    statsSeries = chart.data.datasets[0].data;
    save(STORAGE_KEYS.stats, statsSeries);
  }

  /* =================== Shortcuts =================== */
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyS') {
      e.preventDefault();
      document.getElementById('btn-toggle').click();
    }
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyM') {
      e.preventDefault();
      setMinimized(!settings.minimized);
    }
  });

  /* =================== DRAG & SNAP (PANEL) =================== */
  (function enableDragAndSnap() {
    const dragHandle = document.getElementById('wpro-drag');
    let pos = { x: 0, y: 0 }, dragging = false, start = { x: 0, y: 0 };
    const onDown = (e) => {
      if ((e.target.closest && e.target.closest('button')) || e.target.tagName === 'BUTTON') return;
      dragging = true;
      start.x = e.clientX; start.y = e.clientY;
      const rect = panel.getBoundingClientRect();
      pos.x = rect.left; pos.y = rect.top;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      panel.style.left = (pos.x + dx) + 'px';
      panel.style.top = (pos.y + dy) + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    dragHandle.addEventListener('mousedown', onDown);
  })();

  /* =================== Resize (width) =================== */
  (function enableResize() {
    const handle = document.getElementById('resize-handle');
    let resizing = false, startX=0, startW=0;
    handle.addEventListener('mousedown', (e) => {
      resizing = true; startX = e.clientX; startW = panel.getBoundingClientRect().width;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    const onMove = (e) => {
      if (!resizing) return;
      const dx = e.clientX - startX;
      const w = clamp(startW + dx, 300, 560);
      panel.style.width = w + 'px';
    };
    const onUp = () => {
      if (!resizing) return;
      resizing = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const w = Math.round(panel.getBoundingClientRect().width);
      save(STORAGE_KEYS.panelSize, { w });
    };
  })();

  /* =================== UI Events =================== */
  document.getElementById('btn-toggle').addEventListener('click', () => {
    state.running = !state.running;
    const btn = document.getElementById('btn-toggle');
    if (state.running && !state.capturedCaptchaToken) {
      updateUI('❌ ' + TXT.tokenMissing, 'error');
      state.running = false;
      return;
    }
    if (state.running) {
      btn.classList.remove('btn-primary'); btn.classList.add('btn-stop');
      btn.innerHTML = `<i class="fas fa-stop"></i><span>${TXT.stop}</span>`;
      state.startTime = Date.now();
      updateUI('🚀 ' + TXT.paintingStarted, 'success');
      playBeep();
      paintLoop();
    } else {
      btn.classList.remove('btn-stop'); btn.classList.add('btn-primary');
      btn.innerHTML = `<i class="fas fa-play"></i><span>${TXT.start}</span>`;
      updateUI('⏹️ ' + TXT.paintingStopped, 'status');
    }
  });

  document.getElementById('chk-refresh').addEventListener('change', (e) => { settings.autoRefresh = e.target.checked; save(STORAGE_KEYS.settings, settings); });
  document.getElementById('chk-beep').addEventListener('change', (e) => { settings.beepOnEvents = e.target.checked; save(STORAGE_KEYS.settings, settings); });
  document.getElementById('chk-notify').addEventListener('change', (e) => { settings.notifyOnEvents = e.target.checked; save(STORAGE_KEYS.settings, settings); });

  document.getElementById('btn-clear-logs').addEventListener('click', () => { logs = []; save(STORAGE_KEYS.logs, logs); renderLogs(); });

  document.getElementById('btn-settings').addEventListener('click', () => {
    const isSettings = settingsView.style.display !== 'none';
    settingsView.style.display = isSettings ? 'none' : 'block';
    content.style.display = isSettings ? 'flex' : 'none';
  });

  document.getElementById('btn-min').addEventListener('click', () => setMinimized(true));

  document.getElementById('btn-save').addEventListener('click', () => {
    const theme = document.getElementById('sel-theme').value;
    const paletteMode = document.getElementById('sel-palette').value;
    const fixed = document.getElementById('inp-fixed').value;
    const w = parseInt(document.getElementById('inp-w').value, 10) || 100;
    const h = parseInt(document.getElementById('inp-h').value, 10) || 100;
    const ox = parseInt(document.getElementById('inp-ox').value, 10) || 0;
    const oy = parseInt(document.getElementById('inp-oy').value, 10) || 0;
    const minimized = document.getElementById('chk-min').checked;

    settings.themeMode = theme;
    settings.paletteMode = paletteMode;
    settings.paletteFixed = fixed;
    settings.area = { width: w, height: h, offsetX: ox, offsetY: oy };
    settings.minimized = minimized;

    save(STORAGE_KEYS.settings, settings);
    applyTheme();
    const note = document.getElementById('status-save');
    note.style.display = 'block';
    setTimeout(()=>{ note.style.display = 'none'; }, 1200);
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    const payload = {
      version: 1,
      settings, logs, statsSeries
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wplace-config.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('btn-import').addEventListener('click', async () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!data || typeof data !== 'object') throw 0;
        if (data.settings) { Object.assign(settings, data.settings); save(STORAGE_KEYS.settings, settings); }
        if (Array.isArray(data.logs)) { logs = data.logs; save(STORAGE_KEYS.logs, logs); renderLogs(); }
        if (Array.isArray(data.statsSeries)) { statsSeries = data.statsSeries; save(STORAGE_KEYS.stats, statsSeries); }
        location.reload();
      } catch {
        updateUI('⚠️ ' + TXT.importWarn, 'error');
      }
    };
    inp.click();
  });

  /* =================== Cooldown =================== */
  async function waitForCooldown(ms) {
    const steps = Math.max(10, Math.floor(ms / 250));
    for (let i=0;i<=steps;i++) {
      const pct = (i / steps) * 100;
      const remain = Math.ceil(((steps - i) * (ms/steps))/1000);
      setCooldownProgress(pct, `${TXT.cooldown}: ${remain}s`);
      await sleep(ms/steps);
    }
    setCooldownProgress(0, TXT.cooldown);
  }

  /* =================== Paint Loop =================== */
  async function paintLoop() {
    if (!state.startTime) state.startTime = Date.now();
    while (state.running) {
      const { count, cooldownMs } = state.charges;

      if (count < 1) {
        updateUI(`⌛ ${TXT.awaitingCharges} ${Math.ceil((cooldownMs||30000)/1000)}s...`, 'status');
        await waitForCooldown(cooldownMs||30000);
        await getCharge();
        updateStatsUI();
        continue;
      }

      const { x, y } = getRandomPosition();
      const paintResult = await paintPixel(x, y);
      if (paintResult === 'token_error') {
        // Try auto-refresh path if enabled
        if (settings.autoRefresh) {
          updateUI(`❌ ${TXT.tokenExpired}`, 'error');
          await getCharge();
          if (state.charges.count < 2) {
            updateUI(`⚡ ${TXT.insufficient}`, 'error');
            state.pausedForManual = true;
            state.running = false;
            return;
          }
          // Try clicking "Pintar" and confirm transparent (best-effort)
          const mainPaintBtn = await waitForSelector('button.btn.btn-primary.btn-lg, button.btn-primary.sm\\:btn-xl, button:has(i.fa-paint-brush)');
          mainPaintBtn?.click();
          await sleep(500);
          updateUI(`🎯 ${TXT.selectTransparent}`, 'status');
          const transBtn = document.querySelector('button#color-0') || await waitForSelector('button[aria-label="Transparent"],button#color-0');
          transBtn?.click();
          await sleep(350);
          const canvas = await waitForSelector('canvas');
          if (canvas) {
            canvas.setAttribute('tabindex', '0'); canvas.focus();
            const rect = canvas.getBoundingClientRect();
            const centerX = Math.round(rect.left + rect.width / 2);
            const centerY = Math.round(rect.top + rect.height / 2);
            canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: centerX, clientY: centerY, bubbles: true }));
            canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
            canvas.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
          }
          await sleep(400);
          updateUI(`✅ ${TXT.confirming}`, 'status');
          let confirmBtn = await waitForSelector('button.btn.btn-primary.btn-lg, button.btn.btn-primary.sm\\:btn-xl, button.btn-primary');
          if (!confirmBtn) {
            const allPrimary = Array.from(document.querySelectorAll('button.btn-primary'));
            confirmBtn = allPrimary.length ? allPrimary[allPrimary.length - 1] : null;
          }
          confirmBtn?.click();
        } else {
          updateUI(`ℹ️ ${TXT.clickPaint}`, 'status');
          state.pausedForManual = true;
          state.running = false;
          return;
        }
        await sleep(800);
        continue;
      }

      if (paintResult?.painted === 1) {
        state.paintedCount++;
        state.lastPixel = {
          x: DEFAULT_CONFIG.START_X + x,
          y: DEFAULT_CONFIG.START_Y + y,
          time: new Date()
        };
        state.charges.count--;
        updateUI('✅ ' + TXT.paintedOk, 'success');
        playBeep();
        updateStatsUI();
        updateChart();
      } else {
        updateUI('❌ ' + TXT.paintFail, 'error');
      }

      await sleep(DEFAULT_CONFIG.DELAY);
    }
  }

  /* =================== Helpers =================== */
  const waitForSelector = async (selector, interval = 200, timeout = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(interval);
    }
    return null;
  };

  /* =================== Init =================== */
  // Position restore (panel)
  const savedPanelPos = load(STORAGE_KEYS.position, null);
  if (savedPanelPos && typeof savedPanelPos.left === 'number') {
    panel.style.left = savedPanelPos.left + 'px';
    panel.style.top = savedPanelPos.top + 'px';
    panel.style.right = 'auto'; panel.style.bottom = 'auto';
  }
  // Save panel position on drag end
  (function savePosOnMouseUp() {
    let last = { left: null, top: null }, t;
    document.addEventListener('mouseup', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const rect = panel.getBoundingClientRect();
        if (rect.left !== last.left || rect.top !== last.top) {
          save(STORAGE_KEYS.position, { left: Math.max(0, rect.left), top: Math.max(0, rect.top) });
          last = { left: rect.left, top: rect.top };
        }
      }, 100);
    });
  })();

  await getCharge();
  updateStatsUI();
  setStatus(TXT.ready);
  state.startTime = Date.now();
  renderLogs();

  // periodic stats refresh
  setInterval(async () => { await getCharge(); updateStatsUI(); }, 10000);
})();
