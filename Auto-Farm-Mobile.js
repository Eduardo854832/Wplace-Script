(async () => {
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    PIXELS_PER_LINE: 100,
    DELAY: 1000
  };

  const state = {
    running: false,
    paintedCount: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    lastPixel: null,
    history: [],
    startTime: null,
    autoRefresh: true
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const formatTime = ms => {
    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / 60000) % 60;
    const hr = Math.floor(ms / 3600000);
    return `${hr}h ${min}m ${sec}s`;
  };

  // ====== Captura token ======
  const originalFetch = window.fetch;
  let capturedCaptchaToken = null;
  window.fetch = async (url, options = {}) => {
    if (typeof url === "string" && url.includes("https://backend.wplace.live/s0/pixel/")) {
      try {
        const payload = JSON.parse(options.body || "{}");
        if (payload.t) {
          capturedCaptchaToken = payload.t;
          log("✅ Token capturado");
        }
      } catch { }
    }
    return originalFetch(url, options);
  };

  // ====== API ======
  const fetchAPI = async (url, options = {}) => {
    try {
      const res = await fetch(url, { credentials: "include", ...options });
      return await res.json();
    } catch (e) {
      log("❌ API Error: " + e.message);
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
        log("⚠️ Token expirado");
        return "token_error";
      }
      return await res.json();
    } catch (e) {
      log("❌ Falha ao pintar: " + e.message);
      return null;
    }
  };

  // ====== Loop ======
  const paintLoop = async () => {
    if (!state.running) return;
    state.startTime = state.startTime || Date.now();

    while (state.running) {
      if (state.charges.count < 1) {
        log(`⌛ Sem cargas (${Math.ceil(state.charges.cooldownMs / 1000)}s)`);
        await sleep(state.charges.cooldownMs);
        await getCharge();
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
        if (state.history.length > 15) state.history.pop();
        log(`✅ Pintado em [${state.lastPixel.x}, ${state.lastPixel.y}]`);
      }

      updateUI();
      await sleep(CONFIG.DELAY);
    }
  };

  // ====== UI Mobile ======
  const createUI = () => {
    const style = document.createElement("style");
    style.textContent = `
      .bot-bar {
        position: fixed; bottom: 0; left: 0; right: 0;
        background: #222; color: #fff;
        font-family: sans-serif; font-size: 14px;
        display: flex; flex-direction: column;
        height: 45vh; max-height: 300px;
        border-top-left-radius: 12px; border-top-right-radius: 12px;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.5);
        overflow: hidden; z-index: 99999;
      }
      .tabs { display: flex; justify-content: space-around; background: #111; }
      .tab-btn { flex: 1; padding: 12px; border: none; background: transparent; color: #ccc; font-weight: bold; }
      .tab-btn.active { color: #fff; border-bottom: 3px solid #0af; }
      .tab-content { flex: 1; overflow-y: auto; padding: 10px; }
      .big-btn { width: 100%; padding: 14px; border: none; border-radius: 6px; margin: 5px 0; font-size: 16px; font-weight: bold; }
      .btn-start { background: #28a745; color: #fff; }
      .btn-stop { background: #dc3545; color: #fff; }
      .stat { margin: 6px 0; }
      .history-item { border-bottom: 1px solid #444; padding: 4px 0; font-size: 12px; }
      .log { font-size: 12px; color: #bbb; margin-top: 5px; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "bot-bar";
    panel.innerHTML = `
      <div class="tabs">
        <button class="tab-btn active" data-tab="panel">Painel</button>
        <button class="tab-btn" data-tab="stats">Estatísticas</button>
        <button class="tab-btn" data-tab="history">Histórico</button>
      </div>
      <div id="tab-panel" class="tab-content">
        <button id="toggleBtn" class="big-btn btn-start">▶ Iniciar</button>
        <label><input type="checkbox" id="autoRefreshChk"> Auto-Refresh</label>
        <div id="log" class="log"></div>
      </div>
      <div id="tab-stats" class="tab-content" style="display:none"></div>
      <div id="tab-history" class="tab-content" style="display:none"></div>
    `;
    document.body.appendChild(panel);

    // ===== Navegação abas =====
    const tabBtns = panel.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
      btn.onclick = () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        panel.querySelectorAll(".tab-content").forEach(tc => tc.style.display = "none");
        document.getElementById("tab-" + btn.dataset.tab).style.display = "block";
      };
    });

    // ===== Botões =====
    document.getElementById("toggleBtn").onclick = () => {
      state.running = !state.running;
      const btn = document.getElementById("toggleBtn");
      if (state.running) {
        btn.textContent = "⏹ Parar";
        btn.className = "big-btn btn-stop";
        if (capturedCaptchaToken) {
          paintLoop();
        } else {
          log("⚠️ Clique em um pixel manualmente primeiro!");
          state.running = false;
          btn.textContent = "▶ Iniciar";
          btn.className = "big-btn btn-start";
        }
      } else {
        btn.textContent = "▶ Iniciar";
        btn.className = "big-btn btn-start";
      }
    };

    document.getElementById("autoRefreshChk").checked = state.autoRefresh;
    document.getElementById("autoRefreshChk").onchange = e => state.autoRefresh = e.target.checked;
  };

  const updateUI = () => {
    const stats = document.getElementById("tab-stats");
    const historyBox = document.getElementById("tab-history");
    if (!stats) return;

    stats.innerHTML = `
      <div class="stat"><b>Usuário:</b> ${state.userInfo?.name || "-"}</div>
      <div class="stat"><b>Pixels:</b> ${state.paintedCount}</div>
      <div class="stat"><b>Cargas:</b> ${state.charges.count}/${state.charges.max}</div>
      <div class="stat"><b>Level:</b> ${state.userInfo?.level || "-"}</div>
      <div class="stat"><b>Tempo ativo:</b> ${state.startTime ? formatTime(Date.now() - state.startTime) : "0s"}</div>
      <div class="stat"><b>Média:</b> ${(state.paintedCount / ((Date.now() - (state.startTime || Date.now())) / 60000)).toFixed(2)} px/min</div>
    `;

    historyBox.innerHTML = state.history.map(p =>
      `<div class="history-item">[${p.x},${p.y}] - ${new Date(p.time).toLocaleTimeString()}</div>`
    ).join("");
  };

  const log = msg => {
    const logBox = document.getElementById("log");
    if (logBox) logBox.innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}<br>` + logBox.innerHTML;
    console.log(msg);
  };

  // ===== Init =====
  createUI();
  await getCharge();
  updateUI();
})();