(async () => {
  // =====================
  // Auto-Farm PRO (Mobile/PC)
  // =====================
  const VERSION = "1.0.0";
  const GITHUB_LINK = "https://github.com/Eduardo854832/Wplace-Script/tree/main";
  const LS_KEY = "__AF_PRO_STATE__";
  const INSTANCE_FLAG = "__AF_PRO_ACTIVE__";
  const PANEL_ID = "af-pro-panel";
  const WATERMARK_ID = "af-pro-watermark";

  if (window[INSTANCE_FLAG]) {
    // Evita múltiplas instâncias
    const old = document.getElementById(PANEL_ID);
    if (old) {
      old.classList.add("open"); // garante que fique visível
      old.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    alert("Auto-Farm PRO já está em execução.");
    return;
  }
  window[INSTANCE_FLAG] = true;

  // =====================
  // Configurações
  // =====================
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    PIXELS_PER_LINE: 100,
    DELAY_MS: 1000,
    CHARGE_RECHECK_MS: 5000, // rechecagem mais curta para eficiência
    MAX_HISTORY: 200,
    MAX_WM_RECREATE: 3,
  };

  // =====================
  // Estado
  // =====================
  const state = Object.assign(
    {
      running: false,
      paintedCount: 0,
      charges: { count: 0, max: 80, cooldownMs: 30000 },
      userInfo: null,
      history: [],
      startTime: null,
      autoRefresh: true,
      menuOpen: false,
      mode: "random", // random | line | spiral | custom
      lineCursor: { x: 0, y: 0 },
      spiralCursor: { x: 0, y: 0, dir: 0, steps: 1, stepCount: 0, leg: 0 },
      customQueue: [],
      dirtyUI: true,
      tamperCount: 0,
      hiddenUI: false,
      lastError: null,
      lastPaintAt: null,
    },
    loadState()
  );

  // =====================
  // Utils
  // =====================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nowStr = () => new Date().toLocaleTimeString();
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  function formatTime(ms) {
    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / 60000) % 60;
    const hr = Math.floor(ms / 3600000);
    return `${hr}h ${min}m ${sec}s`;
  }
  function saveState() {
    try {
      const toSave = {
        paintedCount: state.paintedCount,
        history: state.history.slice(0, CONFIG.MAX_HISTORY),
        autoRefresh: state.autoRefresh,
        mode: state.mode,
        lineCursor: state.lineCursor,
        spiralCursor: state.spiralCursor,
        customQueue: state.customQueue.slice(0, 1000),
        menuOpen: state.menuOpen,
        hiddenUI: state.hiddenUI,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(toSave));
    } catch {}
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return {};
      const obj = JSON.parse(raw);
      obj.history = Array.isArray(obj.history) ? obj.history : [];
      obj.customQueue = Array.isArray(obj.customQueue) ? obj.customQueue : [];
      obj.lineCursor = obj.lineCursor || { x: 0, y: 0 };
      obj.spiralCursor =
        obj.spiralCursor || { x: 0, y: 0, dir: 0, steps: 1, stepCount: 0, leg: 0 };
      return obj;
    } catch {
      return {};
    }
  }

  // =====================
  // Token hook
  // =====================
  const originalFetch = window.fetch;
  let capturedCaptchaToken = null;
  window.fetch = async (url, options = {}) => {
    if (typeof url === "string" && url.includes("https://backend.wplace.live/s0/pixel/")) {
      try {
        const payload = JSON.parse(options?.body || "{}");
        if (payload.t) {
          capturedCaptchaToken = payload.t;
          log(`✅ Token capturado (${nowStr()})`);
        }
      } catch {}
    }
    return originalFetch(url, options);
  };

  // =====================
  // API
  // =====================
  async function fetchAPI(url, options = {}) {
    try {
      const res = await fetch(url, { credentials: "include", ...options });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      state.lastError = e.message;
      warn(`API Error: ${e.message}`);
      return null;
    }
  }

  async function getCharge() {
    const data = await fetchAPI("https://backend.wplace.live/me");
    if (data) {
      state.userInfo = data;
      state.charges = {
        count: Math.floor(data.charges.count),
        max: Math.floor(data.charges.max),
        cooldownMs: data.charges.cooldownMs,
      };
      state.dirtyUI = true;
    }
    return state.charges;
  }

  async function paintPixel(x, y) {
    const randomColor = Math.floor(Math.random() * 31) + 1;
    const url = `https://backend.wplace.live/s0/pixel/${CONFIG.START_X}/${CONFIG.START_Y}`;
    const payload = JSON.stringify({ coords: [x, y], colors: [randomColor], t: capturedCaptchaToken });
    try {
      const res = await originalFetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        credentials: "include",
        body: payload,
      });
      if (res.status === 403) {
        capturedCaptchaToken = null;
        warn("⚠️ Token expirado");
        notify("Token expirado");
        return { error: "token" };
      }
      const data = await res.json();
      return data;
    } catch (e) {
      warn("Falha ao pintar: " + e.message);
      return { error: e.message };
    }
  }

  // =====================
  // Modos de pintura
  // =====================
  function nextCoord() {
    const max = CONFIG.PIXELS_PER_LINE - 1;
    if (state.mode === "random") {
      return { x: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE), y: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE) };
    }
    if (state.mode === "line") {
      const { x, y } = state.lineCursor;
      const nx = (x + 1) % CONFIG.PIXELS_PER_LINE;
      const ny = nx === 0 ? (y + 1) % CONFIG.PIXELS_PER_LINE : y;
      state.lineCursor = { x: nx, y: ny };
      return { x, y };
    }
    if (state.mode === "spiral") {
      // Simples espiral iniciando em (0,0)
      let { x, y, dir, steps, stepCount, leg } = state.spiralCursor;
      const dirVec = [
        [1, 0],  // direita
        [0, 1],  // baixo
        [-1, 0], // esquerda
        [0, -1], // cima
      ];
      const out = { x, y };
      // avança cursor
      stepCount++;
      x += dirVec[dir][0];
      y += dirVec[dir][1];
      if (stepCount >= steps) {
        dir = (dir + 1) % 4;
        stepCount = 0;
        leg++;
        if (leg % 2 === 0) steps++;
      }
      x = clamp(x, 0, max);
      y = clamp(y, 0, max);
      state.spiralCursor = { x, y, dir, steps, stepCount, leg };
      return out;
    }
    if (state.mode === "custom" && state.customQueue.length > 0) {
      const { x, y } = state.customQueue.shift();
      return { x: clamp(x, 0, max), y: clamp(y, 0, max) };
    }
    // fallback
    return { x: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE), y: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE) };
  }

  // =====================
  // Loop otimizado
  // =====================
  async function paintLoop() {
    if (!state.running) return;
    state.startTime = state.startTime || Date.now();

    while (state.running) {
      // Sem cargas? rechecagem curta
      if (state.charges.count < 1) {
        const wait = Math.max(1000, Math.min(state.charges.cooldownMs || CONFIG.CHARGE_RECHECK_MS, CONFIG.CHARGE_RECHECK_MS));
        info(`⌛ Sem cargas. Rechecando em ${Math.ceil(wait / 1000)}s...`);
        await sleep(wait);
        await getCharge();
        continue;
      }

      // Sem token?
      if (!capturedCaptchaToken) {
        warn("Clique em um pixel manualmente para capturar o token.");
        notify("Clique num pixel para capturar token");
        await sleep(2000);
        continue;
      }

      const { x, y } = nextCoord();
      const result = await paintPixel(x, y);

      if (result?.painted === 1) {
        state.paintedCount++;
        state.charges.count = Math.max(0, state.charges.count - 1);
        const px = { x: CONFIG.START_X + x, y: CONFIG.START_Y + y, time: Date.now() };
        state.history.unshift(px);
        if (state.history.length > CONFIG.MAX_HISTORY) state.history.pop();
        state.lastPaintAt = px.time;
        state.dirtyUI = true;
      } else if (result?.error === "token") {
        // espera o usuário recapturar
      }

      saveState();
      updateUI();
      await sleep(CONFIG.DELAY_MS);
    }
  }

  // =====================
  // Marca d'água reforçada
  // =====================
  function insertWatermark() {
    if (document.getElementById(WATERMARK_ID)) return;
    const wm = document.createElement("div");
    wm.id = WATERMARK_ID;
    wm.innerHTML = `Powered by <a href="${GITHUB_LINK}" target="_blank" style="color:inherit;text-decoration:underline; pointer-events:auto">Wplace-Script</a>`;
    Object.assign(wm.style, {
      position: "fixed",
      bottom: "6px",
      right: "6px",
      opacity: "0.22",
      fontSize: "10px",
      color: "#fff",
      pointerEvents: "none",
      zIndex: 100000,
      userSelect: "none",
      mixBlendMode: "normal",
    });
    document.body.appendChild(wm);
  }

  function protectWatermark() {
    insertWatermark();
    const observer = new MutationObserver(() => {
      if (!document.getElementById(WATERMARK_ID)) {
        state.tamperCount++;
        if (state.tamperCount <= CONFIG.MAX_WM_RECREATE) {
          insertWatermark();
          warn(`Marca d'água recriada (${state.tamperCount}/${CONFIG.MAX_WM_RECREATE}).`);
        } else {
          state.running = false;
          warn("Marca d'água removida repetidamente. Bot desligado.");
          notify("Bot desligado por remoção da marca d'água");
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // =====================
  // UI (mobile-first, retrátil, arrastável no desktop)
  // =====================
  function createUI() {
    protectWatermark();
    if (document.getElementById(PANEL_ID)) return;

    const style = document.createElement("style");
    style.textContent = `
      #${PANEL_ID} { position: fixed; bottom: 0; left: 0; right: 0; background: #222; color: #fff; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        display: ${state.hiddenUI ? "none" : "flex"}; flex-direction: column; height: 40px; border-top-left-radius: 12px; border-top-right-radius: 12px;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.5); overflow: hidden; z-index: 99998; transition: height .25s ease, transform .2s ease; }
      #${PANEL_ID}.open { height: 48vh; max-height: 360px; }
      #${PANEL_ID} .af-header { background: #111; padding: 8px 12px; display:flex; align-items:center; justify-content:space-between; cursor: pointer; font-weight: 600; }
      #${PANEL_ID} .af-drag { cursor: move; opacity:.8; font-size:12px; padding-right:8px; }
      #${PANEL_ID} .tabs { display: flex; justify-content: space-around; background: #111; }
      #${PANEL_ID} .tab-btn { flex: 1; padding: 10px; border: none; background: transparent;	color: #ccc; font-weight: 600; }
      #${PANEL_ID} .tab-btn.active { color: #fff; border-bottom: 3px solid #0af; }
      #${PANEL_ID} .tab-content { flex: 1; overflow-y: auto; padding: 10px; display: none; }
      #${PANEL_ID} .tab-content.active { display: block; }
      #${PANEL_ID} .big-btn { width: 100%; padding: 14px; border: none; border-radius: 8px; margin: 6px 0; font-size: 16px; font-weight: 700; }
      #${PANEL_ID} .btn-start { background: #28a745; color: #fff; }
      #${PANEL_ID} .btn-stop { background: #dc3545; color: #fff; }
      #${PANEL_ID} .row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:6px 0; }
      #${PANEL_ID} select, #${PANEL_ID} input[type="file"] { padding:8px; border-radius:8px; border:1px solid #333; background:#1a1a1a; color:#fff; }
      #${PANEL_ID} .stat { margin: 6px 0; }
      #${PANEL_ID} .history-item { border-bottom: 1px solid #444; padding: 4px 0; font-size: 12px; }
      #${PANEL_ID} .log { font-size: 12px; color: #bbb; margin-top: 5px; max-height: 100px; overflow-y: auto; }
      @media (hover: hover) and (pointer: fine) {
        #${PANEL_ID} { right: 16px; left: 16px; }
      }
    `;
    document.head.appendChild(style);

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = state.menuOpen ? "open" : "";
    panel.innerHTML = `
      <div class="af-header" id="af-header">
        <span><span class="af-drag">↕</span><b>Auto‑Farm PRO</b> <small style="opacity:.65">v${VERSION}</small></span>
        <span id="af-toggle">${state.menuOpen ? "⬇️ Fechar" : "⬆️ Abrir"}</span>
      </div>
      <div class="tabs">
        <button class="tab-btn active" data-tab="panel">Painel</button>
        <button class="tab-btn" data-tab="stats">Estatísticas</button>
        <button class="tab-btn" data-tab="history">Histórico</button>
      </div>
      <div id="tab-panel" class="tab-content active">
        <button id="toggleBtn" class="big-btn ${state.running ? "btn-stop" : "btn-start"}">${state.running ? "⏹ Parar" : "▶ Iniciar"}</button>
        <div class="row">
          <label><input type="checkbox" id="autoRefreshChk" ${state.autoRefresh ? "checked" : ""}> Auto‑Refresh</label>
          <label>Modo: 
            <select id="modeSel">
              <option value="random"${state.mode==="random"?" selected":""}>Aleatório</option>
              <option value="line"${state.mode==="line"?" selected":""}>Linha</option>
              <option value="spiral"${state.mode==="spiral"?" selected":""}>Espiral</option>
              <option value="custom"${state.mode==="custom"?" selected":""}>Custom</option>
            </select>
          </label>
          <input id="customFile" type="file" accept=".json" style="display:${state.mode==="custom"?"inline-block":"none"}" />
        </div>
        <div class="row">
          <button id="exportJson" class="big-btn">Exportar JSON</button>
          <button id="exportTxt" class="big-btn">Exportar TXT</button>
          <button id="stealthBtn" class="big-btn">${state.hiddenUI ? "Mostrar UI (Ctrl+Alt+H)" : "Modo Stealth (Ctrl+Alt+H)"}</button>
        </div>
        <div id="log" class="log"></div>
      </div>
      <div id="tab-stats" class="tab-content"></div>
      <div id="tab-history" class="tab-content"></div>
    `;
    document.body.appendChild(panel);

    // Toggle abrir/fechar
    panel.querySelector("#af-header").onclick = () => {
      state.menuOpen = !state.menuOpen;
      panel.classList.toggle("open", state.menuOpen);
      panel.querySelector("#af-toggle").textContent = state.menuOpen ? "⬇️ Fechar" : "⬆️ Abrir";
      state.dirtyUI = true;
      saveState();
    };

    // Arrastar no desktop (drag da barra de título)
    makeDraggable(panel, panel.querySelector(".af-header"));

    // Tabs
    panel.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.onclick = () => {
        panel.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        panel.querySelectorAll(".tab-content").forEach((tc) => tc.classList.remove("active"));
        document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      };
    });

    // Botões principais
    document.getElementById("toggleBtn").onclick = toggleRun;
    document.getElementById("autoRefreshChk").onchange = (e) => {
      state.autoRefresh = e.target.checked;
      saveState();
    };
    document.getElementById("modeSel").onchange = (e) => {
      state.mode = e.target.value;
      document.getElementById("customFile").style.display =
        state.mode === "custom" ? "inline-block" : "none";
      saveState();
    };
    document.getElementById("customFile").onchange = onImportCustom;
    document.getElementById("exportJson").onclick = () => exportHistory("json");
    document.getElementById("exportTxt").onclick = () => exportHistory("txt");
    document.getElementById("stealthBtn").onclick = toggleStealth;

    state.dirtyUI = true;
    updateUI();
  }

  function makeDraggable(panel, handle) {
    let dragging = false;
    let startY = 0;
    let startHeight = 0;
    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      dragging = true;
      startY = e.clientY;
      startHeight = panel.getBoundingClientRect().height;
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const dy = startY - e.clientY;
      const newH = clamp(startHeight + dy, 40, Math.min(window.innerHeight * 0.7, 500));
      panel.style.height = newH + "px";
    });
    window.addEventListener("mouseup", () => (dragging = false));
  }

  function toggleRun() {
    state.running = !state.running;
    const btn = document.getElementById("toggleBtn");
    if (state.running) {
      btn.textContent = "⏹ Parar";
      btn.className = "big-btn btn-stop";
      if (capturedCaptchaToken) paintLoop();
      else {
        warn("Clique em um pixel manualmente primeiro!");
        state.running = false;
        btn.textContent = "▶ Iniciar";
        btn.className = "big-btn btn-start";
      }
    } else {
      btn.textContent = "▶ Iniciar";
      btn.className = "big-btn btn-start";
    }
  }

  async function onImportCustom(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("JSON deve ser um array de objetos {x,y}");
      state.customQueue = data.filter((p) => typeof p?.x === "number" && typeof p?.y === "number");
      info(`Custom importado: ${state.customQueue.length} coordenadas.`);
      saveState();
    } catch (e) {
      warn("Falha ao importar JSON: " + e.message);
    }
  }

  function exportHistory(type = "json") {
    try {
      let blob, name;
      if (type === "json") {
        blob = new Blob([JSON.stringify(state.history, null, 2)], { type: "application/json" });
        name = "history.json";
      } else {
        const lines = state.history
          .map((p) => `[${p.x}, ${p.y}] - ${new Date(p.time).toLocaleTimeString()}`)
          .join("\n");
        blob = new Blob([lines], { type: "text/plain" });
        name = "history.txt";
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      warn("Falha ao exportar: " + e.message);
    }
  }

  function toggleStealth() {
    state.hiddenUI = !state.hiddenUI;
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.style.display = state.hiddenUI ? "none" : "flex";
    const sb = document.getElementById("stealthBtn");
    if (sb) sb.textContent = state.hiddenUI ? "Mostrar UI (Ctrl+Alt+H)" : "Modo Stealth (Ctrl+Alt+H)";
    saveState();
  }

  // =====================
  // UI updates (throttle)
  // =====================
  function updateUI() {
    if (!state.dirtyUI) return;
    const stats = document.getElementById("tab-stats");
    const historyBox = document.getElementById("tab-history");
    const logBox = document.getElementById("log");
    if (!stats || !historyBox || !logBox) return;

    const totalMin = (Date.now() - (state.startTime || Date.now())) / 60000;
    const ppm = totalMin > 0 ? state.paintedCount / totalMin : 0;

    stats.innerHTML = `
      <div class="stat"><b>Usuário:</b> ${state.userInfo?.name || "-"}</div>
      <div class="stat"><b>Pixels:</b> ${state.paintedCount}</div>
      <div class="stat"><b>Cargas:</b> ${state.charges.count}/${state.charges.max}</div>
      <div class="stat"><b>Level:</b> ${state.userInfo?.level || "-"}</div>
      <div class="stat"><b>Tempo ativo:</b> ${state.startTime ? formatTime(Date.now() - state.startTime) : "0s"}</div>
      <div class="stat"><b>Média:</b> ${ppm.toFixed(2)} px/min</div>
      <div class="stat"><b>Último pixel:</b> ${
        state.lastPaintAt ? new Date(state.lastPaintAt).toLocaleTimeString() : "-"
      }</div>
      <div class="stat"><b>Modo:</b> ${state.mode}</div>
    `;

    historyBox.innerHTML = state.history
      .slice(0, 30)
      .map(
        (p) =>
          `<div class="history-item">[${p.x},${p.y}] - ${new Date(p.time).toLocaleTimeString()}</div>`
      )
      .join("");

    state.dirtyUI = false;
  }

  function log(msg) {
    const logBox = document.getElementById("log");
    if (logBox) logBox.innerHTML = `[${nowStr()}] ${msg}<br>` + logBox.innerHTML;
    console.log(msg);
  }
  function info(msg) { log(msg); }
  function warn(msg) { log("⚠️ " + msg); }

  // =====================
  // Notificações
  // =====================
  function notify(text) {
    try {
      // Beep simples
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.setValueAtTime(880, ctx.currentTime);
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.02);
      o.start();
      setTimeout(() => { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1); o.stop(ctx.currentTime + 0.12); }, 120);
      // Web Notification
      if (("Notification" in window)) {
        if (Notification.permission === "granted") new Notification(text);
        else if (Notification.permission !== "denied") Notification.requestPermission();
      }
    } catch {}
  }

  // =====================
  // Atalhos de teclado
  // =====================
  window.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey && e.altKey;
    if (!mod) return;
    if (e.key.toLowerCase() === "s") {
      toggleRun();
      e.preventDefault();
    }
    if (e.key.toLowerCase() === "h") {
      toggleStealth();
      e.preventDefault();
    }
  });

  // =====================
  // Verificação de atualização (best-effort)
  // =====================
  async function checkUpdate() {
    try {
      const url = `${GITHUB_LINK}`; // só abre o repositório; para checagem real use um arquivo version.json com CORS habilitado
      info(`Repositório: ${url}`);
      // (opcional) implementar fetch de versão se houver endpoint com CORS liberado
    } catch {}
  }

  // =====================
  // Inicialização
  // =====================
  createUI();
  await getCharge();
  updateUI();
  checkUpdate();

  // UI refresh leve
  setInterval(() => {
    state.dirtyUI = true;
    updateUI();
  }, 1500);
})();
