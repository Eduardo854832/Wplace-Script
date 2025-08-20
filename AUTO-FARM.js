(async () => {
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    PIXELS_PER_LINE: 100,
    BASE_DELAY: 500,
    THEME: {
      primary: 'rgba(20,20,30,0.9)',
      secondary: 'rgba(40,40,60,0.7)',
      accent: '#775ce3',
      text: '#ffffff',
      success: '#00ff00',
      error: '#ff4444',
      highlight: '#ffd700'
    }
  };

  const state = {
    running: false,
    paused: false,
    paintedCount: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    lastPixels: [],
    language: 'en',
    paintMode: localStorage.getItem("paintMode") || "sequential",
    logs: []
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ==== LOGS ====
  const addLog = (msg, type="info") => {
    const time = new Date().toLocaleTimeString();
    state.logs.unshift({ msg, type, time });
    state.logs = state.logs.slice(0, 50);
    renderLogs();
  };

  // ==== PAINT SYSTEM (sem mudanças principais) ====
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
    return { painted: 1, color: randomColor }; // mock simplificado
  };

  const getAdaptiveDelay = () => {
    if (state.charges.count > 20) return CONFIG.BASE_DELAY;
    if (state.charges.count > 5) return CONFIG.BASE_DELAY * 2;
    return CONFIG.BASE_DELAY * 3;
  };

  const paintLoop = async () => {
    while (state.running && !state.paused) {
      if (state.charges.count < 1) {
        addLog("⌛ Sem cargas, aguardando...", "warn");
        await sleep(state.charges.cooldownMs);
        state.charges.count = state.charges.max;
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
          addLog(`✅ Pixel pintado em (${pos.x},${pos.y})`, "success");
        }
      }
      updateStats();
      await sleep(getAdaptiveDelay());
    }
  };

  // ==== UI NOVA ====
  const createUI = () => {
    const style = document.createElement("style");
    style.textContent = `
      .wplace-btn { padding:8px 12px; border:none; border-radius:8px; margin:4px; font-weight:bold; cursor:pointer; }
      .wplace-btn.start { background:#4CAF50; color:white; }
      .wplace-btn.pause { background:#FFC107; color:black; }
      .wplace-btn.stop { background:#F44336; color:white; }
      .wplace-card { background:${CONFIG.THEME.secondary}; padding:10px; border-radius:10px; margin-bottom:10px; }
      .wplace-panel { position:fixed; top:0; right:0; width:300px; height:100%; background:${CONFIG.THEME.primary}; backdrop-filter:blur(10px); color:${CONFIG.THEME.text}; font-family:Segoe UI, sans-serif; padding:15px; box-shadow:-4px 0 12px rgba(0,0,0,0.5); z-index:9999; display:flex; flex-direction:column; }
      .wplace-header { font-size:18px; font-weight:bold; margin-bottom:10px; color:${CONFIG.THEME.highlight}; }
      .wplace-logs { max-height:150px; overflow-y:auto; font-size:12px; background:rgba(0,0,0,0.3); padding:6px; border-radius:6px; }
      .log-success { color:${CONFIG.THEME.success}; }
      .log-error { color:${CONFIG.THEME.error}; }
      .log-warn { color:${CONFIG.THEME.highlight}; }
      .status-indicator { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:6px; }
    `;
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "wplace-panel";
    panel.innerHTML = `
      <div class="wplace-header">🎨 Auto-Farm Bot</div>

      <div class="wplace-card">
        <div><span id="statusLight" class="status-indicator" style="background:red;"></span><b>Status:</b> <span id="statusText">Parado</span></div>
        <button id="startBtn" class="wplace-btn start">▶️ Start</button>
        <button id="pauseBtn" class="wplace-btn pause">⏸️ Pause</button>
        <button id="stopBtn" class="wplace-btn stop">⏹️ Stop</button>
        <div style="margin-top:8px;">
          <label>Modo: </label>
          <select id="modeSelect">
            <option value="sequential"${state.paintMode==="sequential"?" selected":""}>Sequencial</option>
            <option value="random"${state.paintMode==="random"?" selected":""}>Aleatório</option>
          </select>
        </div>
      </div>

      <div class="wplace-card">
        <b>📊 Estatísticas</b>
        <div id="statsArea">Carregando...</div>
        <div style="margin-top:6px;"><b>Últimos Pixels:</b><ul id="lastPixels" style="margin:0;padding-left:15px;font-size:12px;"></ul></div>
      </div>

      <div class="wplace-card">
        <b>📝 Logs</b>
        <div class="wplace-logs" id="logArea"></div>
      </div>
    `;
    document.body.appendChild(panel);

    // Botões
    document.getElementById("startBtn").onclick = () => {
      state.running = true; state.paused=false;
      paintLoop();
      setStatus("Rodando", "green");
      addLog("🚀 Bot iniciado", "success");
    };
    document.getElementById("pauseBtn").onclick = () => {
      state.paused = !state.paused;
      setStatus(state.paused ? "Pausado" : "Rodando", state.paused ? "orange" : "green");
      addLog(state.paused ? "⏸️ Bot pausado" : "▶️ Bot retomado", "warn");
    };
    document.getElementById("stopBtn").onclick = () => {
      state.running=false; setStatus("Parado","red");
      addLog("⏹️ Bot parado","error");
    };
    document.getElementById("modeSelect").onchange = e => {
      state.paintMode = e.target.value;
      localStorage.setItem("paintMode", state.paintMode);
      addLog(`🎛️ Modo alterado para ${state.paintMode}`, "info");
    };
  };

  const setStatus = (text, color) => {
    document.getElementById("statusText").textContent = text;
    document.getElementById("statusLight").style.background = color;
  };

  const updateStats = () => {
    const statsArea = document.getElementById("statsArea");
    const lastPixels = document.getElementById("lastPixels");
    statsArea.innerHTML = `
      🎨 Pixels: ${state.paintedCount}<br>
      ⚡ Charges: ${state.charges.count}/${state.charges.max}<br>
      ⭐ Level: ${state.userInfo?.level||0}
    `;
    lastPixels.innerHTML = state.lastPixels.map(p => `<li>(${p.x},${p.y}) ${p.time}</li>`).join("");
  };

  const renderLogs = () => {
    const logArea = document.getElementById("logArea");
    if (!logArea) return;
    logArea.innerHTML = state.logs.map(l => `<div class="log-${l.type}">[${l.time}] ${l.msg}</div>`).join("");
  };

  createUI();
  updateStats();
})();
