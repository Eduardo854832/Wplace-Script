(async () => {
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    PIXELS_PER_LINE: 100,
    BASE_DELAY: 500,
    THEME: {
      bgGlass: "rgba(20,20,20,0.75)",
      border: "rgba(255,255,255,0.15)",
      accent: "#775ce3",
      text: "#fff",
      success: "#00ff00",
      error: "#ff4d4d",
    }
  };

  const state = {
    running: false,
    paused: false,
    paintedCount: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    lastPixels: [],
    menuOpen: false,
    language: "en",
    paintMode: localStorage.getItem("paintMode") || "sequential",
    logs: []
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // === Captura de token ===
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
            logMsg("🚀 Pintura reiniciada!");
            paintLoop();
          }
        }
      } catch {}
    }
    return originalFetch(url, options);
  };

  // === API ===
  const fetchAPI = async (url, options = {}) => {
    try {
      const res = await fetch(url, { credentials: 'include', ...options });
      return await res.json();
    } catch {
      logMsg("⚠️ Falha de rede", "error");
      return null;
    }
  };

  // === Sistema de logs ===
  function logMsg(msg, type = "info") {
    const time = new Date().toLocaleTimeString();
    state.logs.unshift({ msg, time, type });
    state.logs = state.logs.slice(0, 50);
    renderLogs();
  }

  function renderLogs() {
    const logsBox = document.getElementById("wplace-logs");
    if (!logsBox) return;
    logsBox.innerHTML = state.logs
      .map(l => `<div style="color:${l.type==="error"?CONFIG.THEME.error:l.type==="success"?CONFIG.THEME.success:CONFIG.THEME.text}">[${l.time}] ${l.msg}</div>`)
      .join("");
  }

  // === Posição sequencial/aleatória ===
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

  // === Funções de pintura ===
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

  const getAdaptiveDelay = () => {
    if (state.charges.count > 20) return CONFIG.BASE_DELAY;
    if (state.charges.count > 5) return CONFIG.BASE_DELAY * 2;
    return CONFIG.BASE_DELAY * 3;
  };

  // === Loop de pintura ===
  const paintLoop = async () => {
    while (state.running && !state.paused) {
      const { count, cooldownMs } = state.charges;
      if (count < 1) {
        logMsg("⌛ Sem cargas...");
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
          logMsg(`✅ Pixel (${CONFIG.START_X+pos.x},${CONFIG.START_Y+pos.y})`, "success");
        }
      }

      updateStats();
      await sleep(getAdaptiveDelay());
    }
  };

  // === UI ===
  const createUI = () => {
    if (state.menuOpen) return;
    state.menuOpen = true;

    const style = document.createElement("style");
    style.textContent = `
      #wplace-toggle { position:fixed; top:50%; right:10px; transform:translateY(-50%); background:${CONFIG.THEME.accent}; color:#fff; font-size:20px; border:none; border-radius:50%; width:50px; height:50px; cursor:pointer; z-index:10000; }
      #wplace-panel { position:fixed; top:0; right:-300px; width:300px; height:100%; background:${CONFIG.THEME.bgGlass}; backdrop-filter:blur(8px); border-left:1px solid ${CONFIG.THEME.border}; box-shadow:-4px 0 12px rgba(0,0,0,0.5); transition:0.3s; z-index:9999; display:flex; flex-direction:column; }
      #wplace-panel.open { right:0; }
      #wplace-tabs { display:flex; justify-content:space-around; border-bottom:1px solid ${CONFIG.THEME.border}; }
      #wplace-tabs button { flex:1; padding:8px; background:none; border:none; color:${CONFIG.THEME.text}; cursor:pointer; font-weight:600; }
      #wplace-tabs button.active { background:${CONFIG.THEME.accent}; }
      .wplace-tabcontent { flex:1; overflow:auto; padding:8px; display:none; color:${CONFIG.THEME.text}; font-size:14px; }
      .wplace-tabcontent.active { display:block; }
      .wplace-btn { padding:6px 10px; margin:4px 0; border:none; border-radius:6px; cursor:pointer; font-weight:600; }
      .primary { background:${CONFIG.THEME.accent}; color:white; }
      .danger { background:${CONFIG.THEME.error}; color:white; }
      .success { background:${CONFIG.THEME.success}; color:black; }
      #wplace-logs { font-size:12px; max-height:250px; overflow-y:auto; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.id = "wplace-panel";
    panel.innerHTML = `
      <div id="wplace-tabs">
        <button id="tab-control" class="active">🎛️</button>
        <button id="tab-stats">📊</button>
        <button id="tab-logs">📝</button>
      </div>
      <div id="content-control" class="wplace-tabcontent active">
        <button id="startBtn" class="wplace-btn primary">Start</button>
        <button id="pauseBtn" class="wplace-btn success">Pause</button>
        <button id="stopBtn" class="wplace-btn danger">Stop</button>
        <div style="margin-top:6px;">
          Mode: <select id="modeSelect">
            <option value="sequential"${state.paintMode==="sequential"?" selected":""}>Sequential</option>
            <option value="random"${state.paintMode==="random"?" selected":""}>Random</option>
          </select>
        </div>
      </div>
      <div id="content-stats" class="wplace-tabcontent">Loading...</div>
      <div id="content-logs" class="wplace-tabcontent"><div id="wplace-logs"></div></div>
    `;
    document.body.appendChild(panel);

    const toggle = document.createElement("button");
    toggle.id = "wplace-toggle";
    toggle.textContent = "🎨";
    toggle.onclick = () => panel.classList.toggle("open");
    document.body.appendChild(toggle);

    // Tabs
    const tabs = {
      "tab-control": "content-control",
      "tab-stats": "content-stats",
      "tab-logs": "content-logs"
    };
    Object.keys(tabs).forEach(id => {
      document.getElementById(id).onclick = () => {
        Object.keys(tabs).forEach(t => {
          document.getElementById(t).classList.remove("active");
          document.getElementById(tabs[t]).classList.remove("active");
        });
        document.getElementById(id).classList.add("active");
        document.getElementById(tabs[id]).classList.add("active");
      };
    });

    // Botões
    document.getElementById("startBtn").onclick = () => {
      if (!capturedCaptchaToken) {
        logMsg("❌ Clique em 1 pixel manualmente.", "error");
        return;
      }
      state.running = true; state.paused=false; paintLoop();
      logMsg("🚀 Started!", "success");
    };
    document.getElementById("pauseBtn").onclick = () => {
      state.paused = !state.paused;
      logMsg(state.paused ? "⏸️ Paused" : "▶️ Resumed");
      document.getElementById("pauseBtn").innerText = state.paused ? "Resume" : "Pause";
    };
    document.getElementById("stopBtn").onclick = () => {
      state.running=false; logMsg("⏹️ Stopped");
    };
    document.getElementById("modeSelect").onchange = e => {
      state.paintMode = e.target.value;
      localStorage.setItem("paintMode", state.paintMode);
      logMsg(`🔀 Modo alterado para ${state.paintMode}`);
    };
  };

  window.updateStats = async () => {
    await getCharge();
    const statsArea = document.getElementById("content-stats");
    if (statsArea && state.userInfo) {
      statsArea.innerHTML = `
        👤 ${state.userInfo.name}<br>
        🎨 Pixels: ${state.paintedCount}<br>
        ⚡ ${state.charges.count}/${state.charges.max}<br>
        ⭐ Level: ${state.userInfo.level||0}<br>
        <hr>
        Últimos pixels:<br>
        <ul style="font-size:12px; padding-left:18px; margin:0;">
          ${state.lastPixels.map(p => `<li>(${p.x},${p.y}) ${p.time}</li>`).join("")}
        </ul>
      `;
    }
  };

  createUI();
  await getCharge();
  updateStats();
})();
