(async () => {
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    PIXELS_PER_LINE: 100,
    DELAY: 1000,
    THEME: {
      light: { bg: "#f9f9f9", card: "#fff", text: "#111", accent: "#0066ff", error: "#d9534f", success: "#28a745" },
      dark: { bg: "#1e1e1e", card: "#2a2a2a", text: "#f9f9f9", accent: "#5a8dff", error: "#ff6b6b", success: "#5cf58c" }
    }
  };

  const state = {
    running: false,
    paintedCount: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    lastPixel: null,
    pausedForManual: false,
    history: [],
    startTime: null,
    autoRefresh: true
  };

  // ===== Utils =====
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const formatTime = ms => {
    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / 60000) % 60;
    const hr = Math.floor(ms / 3600000);
    return `${hr}h ${min}m ${sec}s`;
  };
  const saveState = () => localStorage.setItem("wplaceBot", JSON.stringify({
    autoRefresh: state.autoRefresh,
    paintedCount: state.paintedCount,
    history: state.history
  }));
  const loadState = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("wplaceBot"));
      if (saved) {
        state.autoRefresh = saved.autoRefresh ?? state.autoRefresh;
        state.paintedCount = saved.paintedCount ?? 0;
        state.history = saved.history ?? [];
      }
    } catch { }
  };

  // ===== Fetch Hook (captura token CAPTCHA) =====
  const originalFetch = window.fetch;
  let capturedCaptchaToken = null;
  window.fetch = async (url, options = {}) => {
    if (typeof url === "string" && url.includes("https://backend.wplace.live/s0/pixel/")) {
      try {
        const payload = JSON.parse(options.body || "{}");
        if (payload.t) {
          capturedCaptchaToken = payload.t;
          logMessage("✅ CAPTCHA Token atualizado", "success");
          if (state.pausedForManual) {
            state.pausedForManual = false;
            state.running = true;
            paintLoop();
          }
        }
      } catch { }
    }
    return originalFetch(url, options);
  };

  // ===== API =====
  const fetchAPI = async (url, options = {}) => {
    try {
      const res = await fetch(url, { credentials: "include", ...options });
      return await res.json();
    } catch (e) {
      logMessage("❌ Erro na API: " + e.message, "error");
      return null;
    }
  };

  const getCharge = async () => {
    const data = await fetchAPI("https://backend.wplace.live/me");
    if (data) {
      state.userInfo = data;
      state.charges = {
        count: Math.floor(data.charges.count),
        max: Math.floor(data.charges.max),
        cooldownMs: data.charges.cooldownMs
      };
    }
    return state.charges;
  };

  const paintPixel = async (x, y) => {
    const randomColor = Math.floor(Math.random() * 31) + 1;
    const url = `https://backend.wplace.live/s0/pixel/${CONFIG.START_X}/${CONFIG.START_Y}`;
    const payload = JSON.stringify({ coords: [x, y], colors: [randomColor], t: capturedCaptchaToken });
    try {
      const res = await originalFetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        credentials: "include",
        body: payload
      });
      if (res.status === 403) {
        capturedCaptchaToken = null;
        logMessage("⚠️ Token expirado", "error");
        return "token_error";
      }
      return await res.json();
    } catch (e) {
      logMessage("❌ Falha ao pintar: " + e.message, "error");
      return null;
    }
  };

  // ===== Loop principal =====
  const paintLoop = async () => {
    if (!state.running) return;
    state.startTime = state.startTime || Date.now();

    while (state.running) {
      const { count, cooldownMs } = state.charges;
      if (count < 1) {
        logMessage(`⌛ Sem cargas (${Math.ceil(cooldownMs / 1000)}s)`, "status");
        for (let i = 0; i < Math.ceil(cooldownMs / 1000); i += 10) {
          if (!state.running) return;
          await sleep(10000);
          await getCharge();
          updateUI();
        }
        continue;
      }

      const x = Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE);
      const y = Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE);
      const result = await paintPixel(x, y);

      if (result?.painted === 1) {
        state.paintedCount++;
        state.charges.count--;
        state.lastPixel = { x: CONFIG.START_X + x, y: CONFIG.START_Y + y, time: new Date() };
        state.history.unshift(state.lastPixel);
        if (state.history.length > 10) state.history.pop();
        logMessage(`✅ Pixel pintado em [${state.lastPixel.x}, ${state.lastPixel.y}]`, "success");
      }

      saveState();
      updateUI();
      await sleep(CONFIG.DELAY);
    }
  };

  // ===== UI =====
  const createUI = () => {
    const theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? CONFIG.THEME.dark : CONFIG.THEME.light;

    const style = document.createElement("style");
    style.textContent = `
      .bot-panel {
        position: fixed; bottom: 20px; right: 20px;
        width: 320px; max-height: 90vh;
        background: ${theme.card}; color: ${theme.text};
        border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,.4);
        display: flex; flex-direction: column; font-family: sans-serif;
        overflow: hidden; z-index: 9999;
      }
      .bot-header {
        background: ${theme.accent}; color: #fff; padding: 12px;
        display: flex; justify-content: space-between; align-items: center;
        font-weight: bold; font-size: 15px;
      }
      .bot-content { padding: 12px; overflow-y: auto; flex: 1; }
      .bot-btn {
        padding: 10px; margin: 5px 0;
        border: none; border-radius: 6px; font-weight: bold;
        width: 100%; cursor: pointer;
      }
      .btn-start { background: ${theme.success}; color: #fff; }
      .btn-stop { background: ${theme.error}; color: #fff; }
      .stat-card { padding: 8px; background: ${theme.bg}; margin: 5px 0; border-radius: 6px; }
      .history { max-height: 120px; overflow-y: auto; font-size: 12px; }
      .log { font-size: 12px; margin-top: 5px; color: ${theme.text}; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "bot-panel";
    panel.innerHTML = `
      <div class="bot-header">
        <span>🎨 Auto-Farm</span>
        <button id="toggleBtn" class="bot-btn btn-start">Start</button>
      </div>
      <div class="bot-content">
        <div id="stats" class="stat-card">Carregando...</div>
        <div id="history" class="stat-card history"></div>
        <label><input type="checkbox" id="autoRefreshChk"> Auto-Refresh</label>
        <div id="log" class="log"></div>
      </div>
    `;
    document.body.appendChild(panel);

    // Eventos
    document.getElementById("toggleBtn").onclick = () => {
      state.running = !state.running;
      const btn = document.getElementById("toggleBtn");
      btn.textContent = state.running ? "Stop" : "Start";
      btn.className = "bot-btn " + (state.running ? "btn-stop" : "btn-start");
      if (state.running && capturedCaptchaToken) {
        paintLoop();
      } else if (state.running && !capturedCaptchaToken) {
        logMessage("⚠️ Clique em um pixel primeiro para capturar o token!", "error");
        state.running = false;
      }
    };
    document.getElementById("autoRefreshChk").checked = state.autoRefresh;
    document.getElementById("autoRefreshChk").onchange = e => {
      state.autoRefresh = e.target.checked;
      saveState();
    };

    updateUI();
  };

  const updateUI = () => {
    const stats = document.getElementById("stats");
    const historyBox = document.getElementById("history");
    if (!stats) return;

    stats.innerHTML = `
      <div><b>Usuário:</b> ${state.userInfo?.name || "-"}</div>
      <div><b>Pixels:</b> ${state.paintedCount}</div>
      <div><b>Cargas:</b> ${state.charges.count}/${state.charges.max}</div>
      <div><b>Level:</b> ${state.userInfo?.level || "-"}</div>
      <div><b>Tempo ativo:</b> ${state.startTime ? formatTime(Date.now() - state.startTime) : "0s"}</div>
      <div><b>Média:</b> ${(state.paintedCount / ((Date.now() - (state.startTime || Date.now())) / 60000)).toFixed(2)} px/min</div>
    `;
    historyBox.innerHTML = state.history.map(p => 
      `<div>[${p.x},${p.y}] - ${new Date(p.time).toLocaleTimeString()}</div>`
    ).join("");
  };

  const logMessage = (msg, type = "status") => {
    const log = document.getElementById("log");
    if (log) {
      log.innerHTML = `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>` + log.innerHTML;
    }
    console.log(msg);
  };

  // ===== Atalhos =====
  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.altKey && e.key === "s") {
      document.getElementById("toggleBtn").click();
    }
  });

  // ===== Init =====
  loadState();
  createUI();
  await getCharge();
  updateUI();
})();
