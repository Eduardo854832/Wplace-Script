(async () => {
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    PIXELS_PER_LINE: 100,
    BASE_DELAY: 500,
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
    paused: false,
    paintedCount: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    lastPixels: [],
    minimized: false,
    menuOpen: false,
    language: 'en',
    autoRefresh: true,
    pausedForManual: false,
    paintMode: localStorage.getItem("paintMode") || "sequential", // "random" ou "sequential"
    panelPos: JSON.parse(localStorage.getItem("panelPos") || '{"top":20,"left":20}')
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
      updateUI("⚠️ Falha de rede", "error");
      return null;
    }
  };

  // ==== Posição sequencial ou aleatória ====
  let posX = 0, posY = 0;
  const getNextPosition = () => {
    if (state.paintMode === "random") {
      return {
        x: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE),
        y: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE)
      };
    }
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

  // ==== Delay adaptativo ====
  const getAdaptiveDelay = () => {
    if (state.charges.count > 20) return CONFIG.BASE_DELAY; // rápido
    if (state.charges.count > 5) return CONFIG.BASE_DELAY * 2;
    return CONFIG.BASE_DELAY * 3; // lento
  };

  // ==== Loop de pintura ====
  const paintLoop = async () => {
    while (state.running && !state.paused) {
      const { count, cooldownMs } = state.charges;
      if (count < 1) {
        updateUI(state.language === 'pt' ? `⌛ Sem cargas...` : `⌛ No charges...`, 'status');
        await sleep(cooldownMs);
        await getCharge();
        continue;
      }

      const batch = Math.min(state.charges.count, 10);
      for (let i = 0; i < batch; i++) {
        const pos = getNextPosition();
        const result = await paintPixel(pos.x, pos.y);
        if (result?.painted === 1) {
          state.paintedCount++;
          state.lastPixels.unshift({ x: CONFIG.START_X + pos.x, y: CONFIG.START_Y + pos.y, time: new Date().toLocaleTimeString() });
          state.lastPixels = state.lastPixels.slice(0, 5);
          state.charges.count--;
          updateUI('✅ Pixel!', 'success');
        }
      }

      updateStats();
      await sleep(getAdaptiveDelay());
    }
  };

  // ==== UI ====
  const createUI = () => {
    if (state.menuOpen) return;
    state.menuOpen = true;

    const style = document.createElement('style');
    style.textContent = `
      .wplace-bot-panel { position: fixed; top:${state.panelPos.top}px; left:${state.panelPos.left}px; width:250px; background:${CONFIG.THEME.primary}; border:1px solid ${CONFIG.THEME.accent}; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.5); font-family:Segoe UI, Roboto, sans-serif; color:${CONFIG.THEME.text}; z-index:9999; }
      .wplace-header { padding:6px 10px; background:${CONFIG.THEME.secondary}; color:${CONFIG.THEME.highlight}; font-size:15px; font-weight:bold; display:flex; justify-content:space-between; cursor:move; }
      .wplace-content { padding:8px; }
      .wplace-btn { padding:6px; border:none; border-radius:6px; margin:2px; cursor:pointer; font-size:13px; font-weight:600; }
      .primary { background:${CONFIG.THEME.accent}; color:white; }
      .danger { background:${CONFIG.THEME.error}; color:white; }
      .success { background:${CONFIG.THEME.success}; color:black; }
      .wplace-stats { font-size:12px; background:${CONFIG.THEME.secondary}; padding:6px; border-radius:6px; margin-top:6px; }
    `;
    document.head.appendChild(style);

    const t = state.language === 'pt'
      ? { title:"Auto-Farm", start:"Iniciar", stop:"Parar", pause:"Pausar", resume:"Retomar", mode:"Modo", random:"Aleatório", seq:"Sequencial", last:"Últimos pixels" }
      : { title:"Auto-Farm", start:"Start", stop:"Stop", pause:"Pause", resume:"Resume", mode:"Mode", random:"Random", seq:"Sequential", last:"Last pixels" };

    const panel = document.createElement('div');
    panel.className = 'wplace-bot-panel';
    panel.innerHTML = `
      <div class="wplace-header" id="dragHeader">🎨 ${t.title}</div>
      <div class="wplace-content">
        <button id="startBtn" class="wplace-btn primary">${t.start}</button>
        <button id="pauseBtn" class="wplace-btn success">${t.pause}</button>
        <button id="stopBtn" class="wplace-btn danger">${t.stop}</button>
        <div style="margin-top:6px;">
          ${t.mode}: <select id="modeSelect">
            <option value="sequential"${state.paintMode==="sequential"?" selected":""}>${t.seq}</option>
            <option value="random"${state.paintMode==="random"?" selected":""}>${t.random}</option>
          </select>
        </div>
        <div id="statsArea" class="wplace-stats">...</div>
        <div style="margin-top:6px;"><b>${t.last}:</b><ul id="lastPixels" style="margin:0;padding-left:15px;font-size:11px;"></ul></div>
        <div id="statusText" class="wplace-stats">Ready</div>
      </div>
    `;
    document.body.appendChild(panel);

    // Drag do painel
    const header = document.getElementById("dragHeader");
    header.onmousedown = e => {
      let startX = e.clientX, startY = e.clientY;
      const initTop = panel.offsetTop, initLeft = panel.offsetLeft;
      document.onmousemove = ev => {
        panel.style.top = initTop + (ev.clientY - startY) + "px";
        panel.style.left = initLeft + (ev.clientX - startX) + "px";
      };
      document.onmouseup = () => {
        state.panelPos = { top: panel.offsetTop, left: panel.offsetLeft };
        localStorage.setItem("panelPos", JSON.stringify(state.panelPos));
        document.onmousemove = null;
      };
    };

    document.getElementById("startBtn").onclick = () => {
      if (!capturedCaptchaToken) {
        updateUI("❌ Clique em 1 pixel manualmente.", "error");
        return;
      }
      state.running = true; state.paused=false; paintLoop();
      updateUI("🚀 Started!", "success");
    };
    document.getElementById("pauseBtn").onclick = () => {
      state.paused = !state.paused;
      updateUI(state.paused ? "⏸️ Paused" : "▶️ Resumed", "status");
      document.getElementById("pauseBtn").innerText = state.paused ? t.resume : t.pause;
    };
    document.getElementById("stopBtn").onclick = () => {
      state.running=false; updateUI("⏹️ Stopped","status");
    };

    document.getElementById("modeSelect").onchange = e => {
      state.paintMode = e.target.value;
      localStorage.setItem("paintMode", state.paintMode);
    };
  };

  window.updateUI = (msg, type="default") => {
    const el = document.getElementById("statusText");
    if (el) {
      el.textContent = msg;
      el.style.color = type==="error"?CONFIG.THEME.error : type==="success"?CONFIG.THEME.success : CONFIG.THEME.text;
    }
  };

  window.updateStats = async () => {
    await getCharge();
    const statsArea = document.getElementById("statsArea");
    const lastPixels = document.getElementById("lastPixels");
    if (statsArea && state.userInfo) {
      statsArea.innerHTML = `
        👤 ${state.userInfo.name}<br>
        🎨 Pixels: ${state.paintedCount}<br>
        ⚡ ${state.charges.count}/${state.charges.max}<br>
        ⭐ Level: ${state.userInfo.level||0}
      `;
    }
    if (lastPixels) {
      lastPixels.innerHTML = state.lastPixels.map(p => `<li>(${p.x},${p.y}) ${p.time}</li>`).join("");
    }
  };

  await detectUserLocation();
  createUI();
  await getCharge();
  updateStats();
})();
