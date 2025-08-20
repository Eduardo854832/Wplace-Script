(async () => {
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    PIXELS_PER_LINE: 100,
    DELAY: 500, // mais rápido
    THEME: {
      primary: '#000000',
      secondary: '#111111',
      accent: '#222222',
      text: '#ffffff',
      highlight: '#775ce3',
      success: '#00ff00',
      error: '#ff0000'
    }
  };

  const state = {
    running: false,
    paintedCount: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    lastPixel: null,
    minimized: false,
    menuOpen: false,
    language: 'en',
    autoRefresh: true,
    pausedForManual: false
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const waitForSelector = async (selector, interval = 200, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(interval);
    }
    return null;
  };

  const originalFetch = window.fetch;
  let capturedCaptchaToken = null;
  window.fetch = async (url, options = {}) => {
    if (typeof url === 'string' && url.includes('https://backend.wplace.live/s0/pixel/')) {
      try {
        const payload = JSON.parse(options.body || '{}');
        if (payload.t) {
          capturedCaptchaToken = payload.t;
          if (state.pausedForManual) {
            state.pausedForManual = false;
            state.running = true;
            updateUI(state.language === 'pt' ? '🚀 Pintura reiniciada!' : '🚀 Farm resumed!', 'success');
            paintLoop();
          }
        }
      } catch {}
    }
    return originalFetch(url, options);
  };

  const fetchAPI = async (url, options = {}) => {
    try {
      const res = await fetch(url, { credentials: 'include', ...options });
      return await res.json();
    } catch {
      return null;
    }
  };

  // ==== Novo sistema de seleção em ordem ====
  let posX = 0, posY = 0;
  const getNextPosition = () => {
    const pos = { x: posX, y: posY };
    posX++;
    if (posX >= CONFIG.PIXELS_PER_LINE) {
      posX = 0;
      posY++;
      if (posY >= CONFIG.PIXELS_PER_LINE) posY = 0;
    }
    return pos;
  };

  const paintPixel = async (x, y) => {
    const randomColor = Math.floor(Math.random() * 31) + 1;
    const url = `https://backend.wplace.live/s0/pixel/${CONFIG.START_X}/${CONFIG.START_Y}`;
    const payload = JSON.stringify({ coords: [x, y], colors: [randomColor], t: capturedCaptchaToken });
    try {
      const res = await originalFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        credentials: 'include',
        body: payload
      });
      if (res.status === 403) {
        capturedCaptchaToken = null;
        return 'token_error';
      }
      return await res.json();
    } catch {
      return null;
    }
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
      if (state.userInfo.level) {
        state.userInfo.level = Math.floor(state.userInfo.level);
      }
    }
    return state.charges;
  };

  const detectUserLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      state.language = data.country === 'BR' ? 'pt' : 'en';
    } catch {
      state.language = 'en';
    }
  };

  // ==== Loop de pintura otimizado ====
  const paintLoop = async () => {
    while (state.running) {
      const { count, cooldownMs } = state.charges;
      if (count < 1) {
        updateUI(state.language === 'pt' ? `⌛ Sem cargas. Esperando ${Math.ceil(cooldownMs/1000)}s...` : `⌛ No charges. Waiting ${Math.ceil(cooldownMs/1000)}s...`, 'status');
        await sleep(cooldownMs);
        await getCharge();
        continue;
      }

      // Pinta até 5 de uma vez
      const batch = Math.min(state.charges.count, 5);
      for (let i = 0; i < batch; i++) {
        const pos = getNextPosition();
        const result = await paintPixel(pos.x, pos.y);
        if (result?.painted === 1) {
          state.paintedCount++;
          state.lastPixel = { x: CONFIG.START_X + pos.x, y: CONFIG.START_Y + pos.y, time: new Date() };
          state.charges.count--;
          updateUI(state.language === 'pt' ? '✅ Pixel pintado!' : '✅ Pixel painted!', 'success');
        }
      }

      updateStats();
      await sleep(CONFIG.DELAY);
    }
  };

  // ==== UI ====
  const createUI = () => {
    if (state.menuOpen) return;
    state.menuOpen = true;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .wplace-bot-panel { position: fixed; top: 20px; right: 20px; width: 230px; background: ${CONFIG.THEME.primary}; border: 1px solid ${CONFIG.THEME.accent}; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); font-family: 'Segoe UI', Roboto, sans-serif; color: ${CONFIG.THEME.text}; animation: slideIn 0.4s ease-out; z-index:9999; }
      .wplace-header { padding: 8px 12px; background: ${CONFIG.THEME.secondary}; color: ${CONFIG.THEME.highlight}; font-size: 15px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; cursor: move; }
      .wplace-content { padding: 10px; display: ${state.minimized ? 'none' : 'block'}; }
      .wplace-controls { display: flex; align-items:center; gap: 6px; margin-bottom: 10px; }
      .wplace-btn { flex:1; padding: 8px; border:none; border-radius:6px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; font-size:13px; }
      .wplace-btn-primary { background:${CONFIG.THEME.accent}; color:white; }
      .wplace-btn-stop { background:${CONFIG.THEME.error}; color:white; }
      .wplace-stats { display:grid; grid-template-columns:1fr 1fr; gap:6px; background:${CONFIG.THEME.secondary}; padding:8px; border-radius:6px; margin-bottom:10px; font-size:13px; }
      .wplace-stat-item { display:flex; flex-direction:column; align-items:center; font-size:12px; }
      .wplace-status { padding:6px; border-radius:4px; text-align:center; font-size:12px; background:rgba(255,255,255,0.08); }
      .status-success { background:rgba(0,255,0,0.15); color:${CONFIG.THEME.success}; }
      .status-error { background:rgba(255,0,0,0.15); color:${CONFIG.THEME.error}; }
    `;
    document.head.appendChild(style);

    const t = state.language === 'pt'
      ? { title: "Auto-Farm", start: "Iniciar", stop: "Parar", ready: "Pronto" }
      : { title: "Auto-Farm", start: "Start", stop: "Stop", ready: "Ready" };

    const panel = document.createElement('div');
    panel.className = 'wplace-bot-panel';
    panel.innerHTML = `
      <div class="wplace-header">
        <span>🎨 ${t.title}</span>
        <button id="minimizeBtn" style="background:none;border:none;color:white;">${state.minimized ? '⬜' : '➖'}</button>
      </div>
      <div class="wplace-content">
        <div class="wplace-controls">
          <button id="toggleBtn" class="wplace-btn wplace-btn-primary"><i class="fas fa-play"></i>${t.start}</button>
          <label style="font-size:12px;"><input type="checkbox" id="autoRefreshCheckbox" ${state.autoRefresh ? 'checked':''}/> Auto</label>
        </div>
        <div class="wplace-stats" id="statsArea"><div>...</div></div>
        <div id="statusText" class="wplace-status">${t.ready}</div>
      </div>
    `;
    document.body.appendChild(panel);

    const toggleBtn = panel.querySelector('#toggleBtn');
    const minimizeBtn = panel.querySelector('#minimizeBtn');
    const statsArea = panel.querySelector('#statsArea');
    const content = panel.querySelector('.wplace-content');

    toggleBtn.addEventListener('click', () => {
      state.running = !state.running;
      if (state.running && !capturedCaptchaToken) {
        updateUI(state.language === 'pt' ? '❌ Clique em 1 pixel manualmente.' : '❌ Click any pixel manually first.', 'error');
        state.running = false;
        return;
      }
      if (state.running) {
        toggleBtn.innerHTML = `<i class="fas fa-stop"></i>${t.stop}`;
        toggleBtn.className = "wplace-btn wplace-btn-stop";
        paintLoop();
      } else {
        toggleBtn.innerHTML = `<i class="fas fa-play"></i>${t.start}`;
        toggleBtn.className = "wplace-btn wplace-btn-primary";
        statsArea.innerHTML = '';
        updateUI(state.language === 'pt' ? '⏹️ Parado' : '⏹️ Stopped', 'default');
      }
    });

    minimizeBtn.addEventListener('click', () => {
      state.minimized = !state.minimized;
      content.style.display = state.minimized ? 'none' : 'block';
      minimizeBtn.textContent = state.minimized ? '⬜' : '➖';
    });

    panel.querySelector('#autoRefreshCheckbox').addEventListener('change', e => {
      state.autoRefresh = e.target.checked;
    });
  };

  window.updateUI = (message, type = 'default') => {
    const statusText = document.querySelector('#statusText');
    if (statusText) {
      statusText.textContent = message;
      statusText.className = `wplace-status status-${type}`;
    }
  };

  window.updateStats = async () => {
    await getCharge();
    const statsArea = document.querySelector('#statsArea');
    if (statsArea && state.userInfo) {
      statsArea.innerHTML = `
        <div class="wplace-stat-item"><b>${state.language==='pt'?'Usuário':'User'}</b> ${state.userInfo.name}</div>
        <div class="wplace-stat-item"><b>${state.language==='pt'?'Pixels':'Pixels'}</b> ${state.paintedCount}</div>
        <div class="wplace-stat-item"><b>${state.language==='pt'?'Cargas':'Charges'}</b> ${state.charges.count}/${state.charges.max}</div>
        <div class="wplace-stat-item"><b>Lvl</b> ${state.userInfo.level||0}</div>
      `;
    }
  };

  await detectUserLocation();
  createUI();
  await getCharge();
  updateStats();
})();
