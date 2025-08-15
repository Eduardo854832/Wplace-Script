/**
 * WPlace Auto-Image Bot (versão reconstituída a partir do script minificado)
 * Obs: Nem todos os nomes refletem exatamente o original, mas a lógica é equivalente.
 */

(async () => {
  // ---------------------------------------------------------------------------
  // Configurações
  // ---------------------------------------------------------------------------
  const CONFIG = {
    COOLDOWN_DEFAULT: 31000,
    TRANSPARENCY_THRESHOLD: 100,
    WHITE_THRESHOLD: 250,
    LOG_INTERVAL: 10,
    THEME: {
      primary: "#10141c",
      secondary: "#182230",
      accent: "#293446",
      text: "#f5f7fa",
      highlight: "#5dd6ff",
      success: "#35d07f",
      error: "#ff4d61",
      warning: "#ffb347"
    }
  };

  // ---------------------------------------------------------------------------
  // Textos multilíngues
  // ---------------------------------------------------------------------------
  const TEXTS = {
    pt: {
      title: "WPlace Auto-Image by Eduardo854833",
      initBot: "Start Bot",
      uploadImage: "Upload da Imagem",
      resizeImage: "Redimensionar",
      selectPosition: "Selecionar Posição",
      startPainting: "Iniciar Pintura",
      stopPainting: "Parar Pintura",
      checkingColors: "🔍 Verificando cores disponíveis...",
      noColorsFound: "❌ Abra a paleta de cores no site e tente novamente!",
      colorsFound: "✅ {count} cores disponíveis encontradas",
      loadingImage: "🖼️ Carregando imagem...",
      imageLoaded: "✅ Imagem carregada com {count} pixels válidos",
      imageError: "❌ Erro ao carregar imagem",
      selectPositionAlert: "Pinte o primeiro pixel onde deseja que a arte comece!",
      waitingPosition: "👆 Aguardando pixel de referência...",
      positionSet: "✅ Posição definida!",
      positionTimeout: "❌ Tempo esgotado para selecionar posição",
      startPaintingMsg: "🎨 Iniciando pintura...",
      paintingProgress: "🧱 Progresso: {painted}/{total} pixels...",
      noCharges: "⌛ Sem cargas. Aguardando {time}...",
      paintingStopped: "⏹️ Pintura interrompida",
      paintingComplete: "✅ Pintura concluída! {count} pixels pintados.",
      paintingError: "❌ Erro durante a pintura",
      missingRequirements: "❌ Carregue uma imagem e selecione uma posição primeiro",
      progress: "Progresso",
      pixels: "Pixels",
      charges: "Cargas",
      estimatedTime: "Tempo estimado",
      initMessage: "Clique em 'Start Bot' para começar",
      waitingInit: "Aguardando inicialização...",
      resizeSuccess: "✅ Redimensionada para {width}x{height}",
      paintingPaused: "⏸️ Pausado em X: {x}, Y: {y}",
      minimize: "Minimizar",
      width: "Largura",
      height: "Altura",
      keepAspect: "Manter proporção",
      apply: "Aplicar",
      cancel: "Cancelar"
    },
    en: {
      title: "WPlace Auto-Image",
      initBot: "Start",
      uploadImage: "Upload Image",
      resizeImage: "Resize",
      selectPosition: "Select Position",
      startPainting: "Start Painting",
      stopPainting: "Stop Painting",
      checkingColors: "🔍 Checking available colors...",
      noColorsFound: "❌ Open the palette and try again!",
      colorsFound: "✅ {count} available colors found",
      loadingImage: "🖼️ Loading image...",
      imageLoaded: "✅ Image loaded with {count} valid pixels",
      imageError: "❌ Error loading image",
      selectPositionAlert: "Paint the first pixel where you want the art to start!",
      waitingPosition: "👆 Waiting for reference pixel...",
      positionSet: "✅ Position set!",
      positionTimeout: "❌ Position selection timeout",
      startPaintingMsg: "🎨 Starting painting...",
      paintingProgress: "🧱 Progress: {painted}/{total} pixels...",
      noCharges: "⌛ No charges. Waiting {time}...",
      paintingStopped: "⏹️ Painting stopped",
      paintingComplete: "✅ Painting complete! {count} pixels painted.",
      paintingError: "❌ Error during painting",
      missingRequirements: "❌ Load an image and select a position first",
      progress: "Progress",
      pixels: "Pixels",
      charges: "Charges",
      estimatedTime: "Estimated time",
      initMessage: "Click 'Start Auto-BOT' to begin",
      waitingInit: "Waiting for initialization...",
      resizeSuccess: "✅ Image resized to {width}x{height}",
      paintingPaused: "⏸️ Paused at X: {x}, Y: {y}",
      minimize: "Minimize",
      width: "Width",
      height: "Height",
      keepAspect: "Keep aspect",
      apply: "Apply",
      cancel: "Cancel"
    }
  };

  // ---------------------------------------------------------------------------
  // Estado global
  // ---------------------------------------------------------------------------
  const state = {
    running: false,
    imageLoaded: false,
    processing: false,
    totalPixels: 0,
    paintedPixels: 0,
    availableColors: [],
    currentCharges: 0,
    cooldown: CONFIG.COOLDOWN_DEFAULT,
    imageData: null,          // { width, height, pixels, totalPixels, processor }
    stopFlag: false,
    colorsChecked: false,
    startPosition: null,      // { x, y }
    selectingPosition: false,
    region: null,             // { x, y } (região base do servidor)
    minimized: false,
    lastPosition: { x: 0, y: 0 },
    estimatedTime: 0,
    language: "en"
  };

  // Detecta idioma do navegador
  function detectLanguage() {
    const lang = navigator.language.split("-")[0];
    if (TEXTS[lang]) state.language = lang;
  }

  // ---------------------------------------------------------------------------
  // Utilitários
  // ---------------------------------------------------------------------------
  const utils = {
    sleep: (ms) => new Promise(res => setTimeout(res, ms)),

    colorDistance: (a, b) =>
      Math.sqrt(
        Math.pow(a[0] - b[0], 2) +
        Math.pow(a[1] - b[1], 2) +
        Math.pow(a[2] - b[2], 2)
      ),

    createImageUploader: () =>
      new Promise(resolve => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg";
        input.onchange = () => {
          const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(input.files[0]);
        };
        input.click();
      }),

    extractAvailableColors: () =>
      Array.from(document.querySelectorAll('[id^="color-"]'))
        .filter(el => !el.querySelector("svg"))
        .filter(el => {
          const id = parseInt(el.id.replace("color-", ""));
          // Exclui cores 0 e 5 (aparentemente reservadas/indesejadas)
          return id !== 0 && id !== 5;
        })
        .map(el => {
          const id = parseInt(el.id.replace("color-", ""));
          const m = el.style.backgroundColor.match(/\d+/g);
          const rgb = m ? m.map(Number) : [0, 0, 0];
          return { id, rgb };
        }),

    formatTime: (ms) => {
      const seconds = Math.floor(ms / 1000 % 60);
      const minutes = Math.floor(ms / 60000 % 60);
      const hours = Math.floor(ms / 3600000 % 24);
      const days = Math.floor(ms / 86400000);
      let out = "";
      if (days > 0) out += `${days}d `;
      if (hours > 0 || days > 0) out += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) out += `${minutes}m `;
      out += `${seconds}s`;
      return out;
    },

    showAlert: (text, type = "info") => {
      const div = document.createElement("div");
      div.style.position = "fixed";
      div.style.top = "16px";
      div.style.left = "50%";
      div.style.transform = "translateX(-50%)";
      div.style.padding = "12px 18px";
      div.style.background = CONFIG.THEME.secondary;
      div.style.border = `1px solid ${CONFIG.THEME.highlight}`;
      div.style.color = CONFIG.THEME.text;
      div.style.borderRadius = "10px";
      div.style.font = '500 14px "Segoe UI",sans-serif';
      div.style.zIndex = "10000";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.gap = "10px";
      div.style.backdropFilter = "blur(6px)";
      div.style.boxShadow = "0 4px 18px -2px rgba(0,0,0,.55)";
      div.innerHTML = `<span style="filter:drop-shadow(0 0 4px rgba(255,255,255,0.15))">${text}</span>`;
      document.body.appendChild(div);
      setTimeout(() => {
        div.style.transition = "all .4s";
        div.style.opacity = "0";
        div.style.transform += " translateY(-8px)";
        setTimeout(() => div.remove(), 450);
      }, 2600);
    },

    calculateEstimatedTime: (remainingPixels, currentCharges, cooldown) => {
      const bufferedCharges = currentCharges > 0 ? currentCharges : 0;
      const cycles = Math.ceil((remainingPixels - bufferedCharges) / Math.max(currentCharges, 1));
      // Heurística (copiada da lógica obfuscada)
      return cycles * cooldown + (remainingPixels - 1) * 100;
    },

    isWhitePixel: (r, g, b) =>
      r >= CONFIG.WHITE_THRESHOLD &&
      g >= CONFIG.WHITE_THRESHOLD &&
      b >= CONFIG.WHITE_THRESHOLD,

    t: (key, vars = {}) => {
      let str = TEXTS[state.language]?.[key] || TEXTS.en[key] || key;
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, v);
      }
      return str;
    }
  };

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------
  const api = {
    async paintPixelInRegion(regionX, regionY, absX, absY, colorId) {
      try {
        const res = await fetch(`https://backend.wplace.live/s0/pixel/${regionX}/${regionY}`, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          credentials: "include",
          body: JSON.stringify({ coords: [absX, absY], colors: [colorId] })
        });
        const json = await res.json();
        return json?.painted === 1;
      } catch {
        return false;
      }
    },

    async getCharges() {
      try {
        const res = await fetch("https://backend.wplace.live/me", { credentials: "include" });
        const json = await res.json();
        return {
          charges: json.charges?.count || 0,
            cooldown: json.charges?.cooldownMs || CONFIG.COOLDOWN_DEFAULT
        };
      } catch {
        return { charges: 0, cooldown: CONFIG.COOLDOWN_DEFAULT };
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Classe de processamento de imagem
  // ---------------------------------------------------------------------------
  class ImageProcessor {
    constructor(src) {
      this.imageSrc = src;
      this.img = new Image();
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.previewCanvas = document.createElement("canvas");
      this.previewCtx = this.previewCanvas.getContext("2d");
    }

    async load() {
      return new Promise((resolve, reject) => {
        this.img.onload = () => {
          this.canvas.width = this.img.width;
          this.canvas.height = this.img.height;
          this.ctx.drawImage(this.img, 0, 0);
          resolve();
        };
        this.img.onerror = reject;
        this.img.src = this.imageSrc;
      });
    }

    getPixelData() {
      return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    }

    getDimensions() {
      return {
        width: this.canvas.width,
        height: this.canvas.height
      };
    }

    resize(newW, newH) {
      const tmp = document.createElement("canvas");
      tmp.width = newW;
      tmp.height = newH;
      const tctx = tmp.getContext("2d");
      tctx.drawImage(this.img, 0, 0, newW, newH);
      this.canvas.width = newW;
      this.canvas.height = newH;
      this.ctx.drawImage(tmp, 0, 0);
      return this.getPixelData();
    }

    generatePreview(w, h) {
      this.previewCanvas.width = w;
      this.previewCanvas.height = h;
      this.previewCtx.imageSmoothingEnabled = false;
      this.previewCtx.drawImage(this.img, 0, 0, w, h);
      return this.previewCanvas.toDataURL();
    }
  }

  // ---------------------------------------------------------------------------
  // Mapeamento de cor: escolhe cor mais próxima da paleta disponível
  // ---------------------------------------------------------------------------
  function mapToNearestColor(rgb, palette) {
    return palette
      .reduce(
        (acc, color) => {
          const dist = utils.colorDistance(rgb, color.rgb);
          return dist < acc.distance ? { color, distance: dist } : acc;
        },
        { color: palette[0], distance: utils.colorDistance(rgb, palette[0].rgb) }
      )
      .color.id;
  }

  // ---------------------------------------------------------------------------
  // UI Principal
  // ---------------------------------------------------------------------------
  async function initUI() {
    detectLanguage();

    // Fonte de ícones
    const fa = document.createElement("link");
    fa.rel = "stylesheet";
    fa.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    document.head.appendChild(fa);

    // Estilos principais (mantidos da versão minificada)
    const style = document.createElement("style");
    style.textContent = `
      /* (Estilos originais condensados - mantidos) */
      @keyframes wplaceSlide{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
      #wplace-image-bot-container{position:fixed;top:24px;right:24px;width:340px;background:linear-gradient(155deg,rgba(24,34,48,.92),rgba(16,20,28,.92));
        -webkit-backdrop-filter:blur(14px) saturate(130%);backdrop-filter:blur(14px) saturate(130%);
        border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:0;
        box-shadow:0 18px 48px -12px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.04) inset;z-index:9998;
        font-family:"Segoe UI",Roboto,Oxygen,sans-serif;color:${CONFIG.THEME.text};animation:wplaceSlide .45s cubic-bezier(.3,.7,.4,1);overflow:hidden}
      .wplace-header{position:relative;padding:14px 18px 12px;display:flex;align-items:center;justify-content:space-between;
        background:radial-gradient(at 25% 0%,rgba(93,214,255,.15),rgba(93,214,255,0) 70%);user-select:none}
      .wplace-header-title{display:flex;align-items:center;gap:10px;font-weight:600;letter-spacing:.5px;font-size:15px}
      .wplace-header-title i{color:${CONFIG.THEME.highlight};filter:drop-shadow(0 0 4px rgba(93,214,255,.35))}
      .wplace-header-controls{display:flex;gap:4px}
      .wplace-header-btn{width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.08);
        background:linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border-radius:10px;cursor:pointer;color:${CONFIG.THEME.text};font-size:13px;transition:.25s}
      .wplace-header-btn:hover{border-color:rgba(93,214,255,.6);color:${CONFIG.THEME.highlight};box-shadow:0 0 0 1px rgba(93,214,255,.5),0 4px 12px -4px rgba(93,214,255,.4)}
      .wplace-content{padding:4px 18px 18px;display:flex;flex-direction:column;gap:16px}
      .wplace-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
      .wplace-btn{position:relative;border:1px solid rgba(255,255,255,.08);background:linear-gradient(145deg,rgba(255,255,255,.07),rgba(255,255,255,.02));
        color:${CONFIG.THEME.text};padding:10px;font-size:12.5px;font-weight:600;letter-spacing:.3px;border-radius:11px;
        display:flex;align-items:center;gap:8px;cursor:pointer;transition:.28s;min-height:40px;overflow:hidden}
      .wplace-btn:before{content:"";position:absolute;inset:0;background:linear-gradient(160deg,rgba(93,214,255,.18),rgba(93,214,255,0) 60%);opacity:0;transition:.35s}
      .wplace-btn:hover:before{opacity:1}
      .wplace-btn:hover{border-color:rgba(93,214,255,.5);box-shadow:0 4px 18px -6px rgba(93,214,255,.55);transform:translateY(-2px)}
      .wplace-btn:disabled{opacity:.35;cursor:not-allowed;filter:grayscale(.5);transform:none}
      .wplace-btn-primary{color:${CONFIG.THEME.highlight}}
      .wplace-btn-select{color:#ffe08a}
      .wplace-btn-start{color:${CONFIG.THEME.success}}
      .wplace-btn-stop{color:${CONFIG.THEME.error}}
      .panel{display:flex;flex-direction:column;gap:12px;padding:14px 16px 16px;border:1px solid rgba(255,255,255,.07);border-radius:16px;
        background:linear-gradient(160deg,rgba(255,255,255,.05),rgba(255,255,255,.015));position:relative}
      .panel-title{font-size:11px;text-transform:uppercase;letter-spacing:1.4px;font-weight:700;color:${CONFIG.THEME.highlight};opacity:.85;display:flex;align-items:center;gap:6px}
      .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
      .stat-card{position:relative;border:1px solid rgba(255,255,255,.08);background:linear-gradient(150deg,rgba(255,255,255,.07),rgba(255,255,255,.015));
        border-radius:12px;padding:10px 12px 9px;display:flex;flex-direction:column;gap:6px;font-size:12px;line-height:1.2;min-height:62px;overflow:hidden}
      .stat-label{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;opacity:.6;font-weight:600}
      .stat-value{font-size:14px;font-weight:600;letter-spacing:.3px;display:flex;align-items:center;gap:6px}
      .progress-bar-outer{position:relative;width:100%;height:12px;background:linear-gradient(90deg,rgba(255,255,255,.08),rgba(255,255,255,0.03));
        border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.08)}
      .wplace-progress-bar{height:100%;background:linear-gradient(90deg,${CONFIG.THEME.highlight},#7effc8);width:0%;transition:width .45s cubic-bezier(.25,.7,.4,1);
        box-shadow:0 0 0 1px rgba(93,214,255,.4),0 4px 18px -4px rgba(93,214,255,.7)}
      .status-zone{border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px 16px;font-size:13px;line-height:1.3;position:relative;
        background:linear-gradient(140deg,rgba(255,255,255,.07),rgba(255,255,255,.02));display:flex;gap:10px;align-items:flex-start}
      .status-icon{width:30px;height:30px;display:grid;place-items:center;border-radius:10px;background:linear-gradient(145deg,rgba(93,214,255,.28),rgba(93,214,255,0.08));
        color:${CONFIG.THEME.highlight};font-size:14px;box-shadow:0 0 0 1px rgba(93,214,255,.4)}
      .wplace-status{flex:1;font-weight:500;letter-spacing:.3px}
      .wplace-minimized .wplace-content{display:none}
      .resize-container{display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(160deg,#182230,#10141c);
        padding:26px 28px 28px;border-radius:22px;z-index:10000;width:clamp(300px,520px,90%);border:1px solid rgba(255,255,255,.08);
        box-shadow:0 18px 42px -10px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.05) inset}
      #resizePreview{max-width:100%;max-height:260px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:#0c1015;object-fit:contain;
        box-shadow:0 4px 18px -6px rgba(0,0,0,.7)}
    `;
    document.head.appendChild(style);

    // Container principal
    const root = document.createElement("div");
    root.id = "wplace-image-bot-container";
    root.innerHTML = `
      <div class="wplace-header">
        <div class="wplace-header-title">
          <i class="fas fa-shapes"></i><span>${utils.t("title")}</span>
        </div>
        <div class="wplace-header-controls">
          <button id="minimizeBtn" class="wplace-header-btn" title="${utils.t("minimize")}"><i class="fas fa-minus"></i></button>
        </div>
      </div>
      <div class="wplace-content">
        <div class="panel">
          <div class="panel-title"><i class="fas fa-cogs"></i> SETUP</div>
          <div class="wplace-grid">
            <button id="initBotBtn" class="wplace-btn wplace-btn-primary"><i class="fas fa-robot"></i><span>${utils.t("initBot")}</span></button>
            <button id="uploadBtn" class="wplace-btn" disabled><i class="fas fa-upload"></i><span>${utils.t("uploadImage")}</span></button>
            <button id="resizeBtn" class="wplace-btn" disabled><i class="fas fa-expand"></i><span>${utils.t("resizeImage")}</span></button>
            <button id="selectPosBtn" class="wplace-btn wplace-btn-select" disabled><i class="fas fa-crosshairs"></i><span>${utils.t("selectPosition")}</span></button>
            <button id="startBtn" class="wplace-btn wplace-btn-start" disabled><i class="fas fa-play"></i><span>${utils.t("startPainting")}</span></button>
            <button id="stopBtn" class="wplace-btn wplace-btn-stop" disabled><i class="fas fa-stop"></i><span>${utils.t("stopPainting")}</span></button>
          </div>
        </div>
        <div class="panel">
          <div class="panel-title"><i class="fas fa-chart-line"></i> TRACKING</div>
          <div class="progress-wrapper">
            <div class="progress-bar-outer"><div id="progressBar" class="wplace-progress-bar"></div></div>
          </div>
          <div id="statsArea" class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">${utils.t("progress")}</div>
              <div class="stat-value"><i class="fas fa-info-circle"></i> 0%</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">${utils.t("pixels")}</div>
              <div class="stat-value"><i class="fas fa-paint-brush"></i> 0/0</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">${utils.t("charges")}</div>
              <div class="stat-value"><i class="fas fa-bolt"></i> 0</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">${utils.t("estimatedTime")}</div>
              <div class="stat-value"><i class="fas fa-clock"></i> 0s</div>
            </div>
          </div>
        </div>
        <div class="status-zone">
          <div class="status-icon"><i class="fas fa-terminal"></i></div>
          <div id="statusText" class="wplace-status status-default">${utils.t("waitingInit")}</div>
        </div>
      </div>
    `;

    // Modal de redimensionamento
    const resizeContainer = document.createElement("div");
    resizeContainer.className = "resize-container";
    resizeContainer.innerHTML = `
      <h3><i class="fas fa-expand"></i> ${utils.t("resizeImage")}</h3>
      <div class="resize-controls">
        <label>${utils.t("width")}: <span id="widthValue">0</span>px
          <input type="range" id="widthSlider" class="resize-slider" min="10" max="500" value="100">
        </label>
        <label>${utils.t("height")}: <span id="heightValue">0</span>px
          <input type="range" id="heightSlider" class="resize-slider" min="10" max="500" value="100">
        </label>
        <label style="flex-direction:row;align-items:center;gap:8px;font-size:12px;">
          <input type="checkbox" id="keepAspect" checked style="transform:scale(1.15);accent-color:${CONFIG.THEME.highlight}">
          ${utils.t("keepAspect")}
        </label>
        <img id="resizePreview" src="">
        <div class="resize-buttons" style="display:flex;gap:12px;justify-content:flex-end;margin-top:10px;">
          <button id="confirmResize" class="wplace-btn wplace-btn-start" style="min-width:120px;justify-content:center;">
            <i class="fas fa-check"></i><span>${utils.t("apply")}</span>
          </button>
          <button id="cancelResize" class="wplace-btn wplace-btn-stop" style="min-width:120px;justify-content:center;">
            <i class="fas fa-times"></i><span>${utils.t("cancel")}</span>
          </button>
        </div>
      </div>
    `;

    const overlay = document.createElement("div");
    overlay.className = "resize-overlay";

    document.body.appendChild(root);
    document.body.appendChild(overlay);
    document.body.appendChild(resizeContainer);

    // Drag da janela
    const header = root.querySelector(".wplace-header");
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      root.style.top = (root.offsetTop - pos2) + "px";
      root.style.left = (root.offsetLeft - pos1) + "px";
    }
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
    header.onmousedown = (e) => {
      if (!e.target.closest(".wplace-header-btn")) dragMouseDown(e);
    };

    // Referências de elementos
    const btnInit = root.querySelector("#initBotBtn");
    const btnUpload = root.querySelector("#uploadBtn");
    const btnResize = root.querySelector("#resizeBtn");
    const btnSelectPos = root.querySelector("#selectPosBtn");
    const btnStart = root.querySelector("#startBtn");
    const btnStop = root.querySelector("#stopBtn");
    const btnMinimize = root.querySelector("#minimizeBtn");
    const statusText = root.querySelector("#statusText");
    const progressBar = root.querySelector("#progressBar");
    const statsArea = root.querySelector("#statsArea");

    const widthSlider = resizeContainer.querySelector("#widthSlider");
    const heightSlider = resizeContainer.querySelector("#heightSlider");
    const widthValue = resizeContainer.querySelector("#widthValue");
    const heightValue = resizeContainer.querySelector("#heightValue");
    const keepAspect = resizeContainer.querySelector("#keepAspect");
    const previewImg = resizeContainer.querySelector("#resizePreview");
    const btnConfirmResize = resizeContainer.querySelector("#confirmResize");
    const btnCancelResize = resizeContainer.querySelector("#cancelResize");

    // Minimizar
    btnMinimize.addEventListener("click", () => {
      state.minimized = !state.minimized;
      if (state.minimized) {
        root.classList.add("wplace-minimized");
        btnMinimize.innerHTML = '<i class="fas fa-expand"></i>';
      } else {
        root.classList.remove("wplace-minimized");
        btnMinimize.innerHTML = '<i class="fas fa-minus"></i>';
      }
    });

    // Funções globais para atualização (mantendo API usada no loop)
    window.updateUI = (key, type = "default", vars = {}) => {
      const msg = utils.t(key, vars);
      statusText.textContent = msg;
      statusText.className = `wplace-status status-${type}`;
      const icon = statusText.parentElement.querySelector(".status-icon");
      icon.className = "status-icon";
      if (type === "success") {
        icon.style.background = "linear-gradient(145deg,rgba(53,208,127,0.25),rgba(53,208,127,0.08))";
      } else if (type === "error") {
        icon.style.background = "linear-gradient(145deg,rgba(255,77,97,0.25),rgba(255,77,97,0.08))";
      } else if (type === "warning") {
        icon.style.background = "linear-gradient(145deg,rgba(255,179,71,0.25),rgba(255,179,71,0.08))";
      }
    };

    window.updateStats = async () => {
      if (!state.colorsChecked || !state.imageLoaded) return;
      const { charges, cooldown } = await api.getCharges();
      state.currentCharges = Math.floor(charges);
      state.cooldown = cooldown;

      const percent = state.totalPixels > 0
        ? Math.round(state.paintedPixels / state.totalPixels * 100)
        : 0;

      const remaining = state.totalPixels - state.paintedPixels;
      state.estimatedTime = utils.calculateEstimatedTime(
        remaining,
        state.currentCharges,
        state.cooldown
      );

      progressBar.style.width = `${percent}%`;

      statsArea.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">${utils.t("progress")}</div>
          <div class="stat-value"><i class="fas fa-chart-line"></i> ${percent}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${utils.t("pixels")}</div>
          <div class="stat-value"><i class="fas fa-paint-brush"></i> ${state.paintedPixels}/${state.totalPixels}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${utils.t("charges")}</div>
          <div class="stat-value"><i class="fas fa-bolt"></i> ${Math.floor(state.currentCharges)}</div>
        </div>
        ${state.imageLoaded ? `
          <div class="stat-card">
            <div class="stat-label">${utils.t("estimatedTime")}</div>
            <div class="stat-value"><i class="fas fa-clock"></i> ${utils.formatTime(state.estimatedTime)}</div>
          </div>` : ""}
      `;
    };

    // Redimensionamento
    function openResizeModal(processor) {
      const dims = processor.getDimensions();
      const aspect = dims.width / dims.height;
      widthSlider.value = dims.width;
      heightSlider.value = dims.height;
      widthValue.textContent = dims.width;
      heightValue.textContent = dims.height;
      previewImg.src = processor.img.src;

      overlay.style.display = "block";
      resizeContainer.style.display = "block";

      const updatePreview = () => {
        const w = parseInt(widthSlider.value);
        const h = parseInt(heightSlider.value);
        widthValue.textContent = w;
        heightValue.textContent = h;
        previewImg.src = processor.generatePreview(w, h);
      };

      widthSlider.oninput = () => {
        if (keepAspect.checked) {
          const w = parseInt(widthSlider.value);
          const h = Math.round(w / aspect);
          heightSlider.value = h;
        }
        updatePreview();
      };

      heightSlider.oninput = () => {
        if (keepAspect.checked) {
          const h = parseInt(heightSlider.value);
          const w = Math.round(h * aspect);
          widthSlider.value = w;
        }
        updatePreview();
      };

      btnConfirmResize.onclick = () => {
        const newW = parseInt(widthSlider.value);
        const newH = parseInt(heightSlider.value);
        const pixels = processor.resize(newW, newH);
        let count = 0;
        for (let yy = 0; yy < newH; yy++) {
          for (let xx = 0; xx < newW; xx++) {
            const idx = (yy * newW + xx) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const a = pixels[idx + 3];
            if (a < CONFIG.TRANSPARENCY_THRESHOLD) continue;
            if (utils.isWhitePixel(r, g, b)) continue;
            count++;
          }
        }
        state.imageData.pixels = pixels;
        state.imageData.width = newW;
        state.imageData.height = newH;
        state.imageData.totalPixels = count;
        state.totalPixels = count;
        state.paintedPixels = 0;
        updateStats();
        updateUI("resizeSuccess", "success", { width: newW, height: newH });
        closeResizeModal();
      };

      btnCancelResize.onclick = closeResizeModal;
    }

    function closeResizeModal() {
      overlay.style.display = "none";
      resizeContainer.style.display = "none";
    }

    // Botão: Iniciar Bot (verifica paleta)
    btnInit.addEventListener("click", async () => {
      try {
        updateUI("checkingColors", "default");
        state.availableColors = utils.extractAvailableColors();
        if (state.availableColors.length === 0) {
          utils.showAlert(utils.t("noColorsFound"), "error");
          updateUI("noColorsFound", "error");
          return;
        }
        state.colorsChecked = true;
        btnUpload.disabled = false;
        btnSelectPos.disabled = false;
        btnInit.style.display = "none";
        updateUI("colorsFound", "success", { count: state.availableColors.length });
        updateStats();
      } catch {
        updateUI("imageError", "error");
      }
    });

    // Botão: Upload da imagem
    btnUpload.addEventListener("click", async () => {
      try {
        updateUI("loadingImage", "default");
        const base64 = await utils.createImageUploader();
        const processor = new ImageProcessor(base64);
        await processor.load();
        const { width, height } = processor.getDimensions();
        const data = processor.getPixelData();
        let valid = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];
            if (a < CONFIG.TRANSPARENCY_THRESHOLD) continue;
            if (utils.isWhitePixel(r, g, b)) continue;
            valid++;
          }
        }
        state.imageData = {
          width,
          height,
          pixels: data,
          totalPixels: valid,
          processor
        };
        state.totalPixels = valid;
        state.paintedPixels = 0;
        state.imageLoaded = true;
        state.lastPosition = { x: 0, y: 0 };
        btnResize.disabled = false;
        if (state.startPosition) btnStart.disabled = false;
        updateStats();
        updateUI("imageLoaded", "success", { count: valid });
      } catch {
        updateUI("imageError", "error");
      }
    });

    // Botão: Redimensionar
    btnResize.addEventListener("click", () => {
      if (state.imageLoaded && state.imageData.processor) {
        openResizeModal(state.imageData.processor);
      }
    });

    // Botão: Selecionar posição (intercepta primeiro POST válido)
    btnSelectPos.addEventListener("click", async () => {
      if (state.selectingPosition) return;
      state.selectingPosition = true;
      state.startPosition = null;
      state.region = null;
      btnStart.disabled = true;
      utils.showAlert(utils.t("selectPositionAlert"), "info");
      updateUI("waitingPosition", "default");

      const nativeFetch = window.fetch;
      window.fetch = async (url, options) => {
        if (typeof url === "string" &&
            url.includes("https://backend.wplace.live/s0/pixel/") &&
            options?.method?.toUpperCase() === "POST") {
          try {
            const resp = await nativeFetch(url, options);
            const clone = resp.clone();
            const json = await clone.json();
            if (json?.painted === 1) {
              const match = url.match(/\/pixel\/(\d+)\/(\d+)/);
              if (match && match.length >= 3) {
                state.region = { x: parseInt(match[1]), y: parseInt(match[2]) };
              }
              if (options.body) {
                const parsed = JSON.parse(options.body);
                if (parsed?.coords && Array.isArray(parsed.coords)) {
                  state.startPosition = { x: parsed.coords[0], y: parsed.coords[1] };
                  state.lastPosition = { x: 0, y: 0 };
                  if (state.imageLoaded) btnStart.disabled = false;
                  window.fetch = nativeFetch;
                  state.selectingPosition = false;
                  updateUI("positionSet", "success");
                }
              }
            }
            return resp;
          } catch {
            return nativeFetch(url, options);
          }
        }
        return nativeFetch(url, options);
      };

      setTimeout(() => {
        if (state.selectingPosition) {
          window.fetch = nativeFetch;
          state.selectingPosition = false;
          updateUI("positionTimeout", "error");
          utils.showAlert(utils.t("positionTimeout"), "error");
        }
      }, 2 * 60 * 1000); // 2 minutos
    });

    // Botão: Iniciar pintura
    btnStart.addEventListener("click", async () => {
      if (!state.imageLoaded || !state.startPosition || !state.region) {
        updateUI("missingRequirements", "error");
        return;
      }
      state.running = true;
      state.stopFlag = false;
      btnStart.disabled = true;
      btnStop.disabled = false;
      btnUpload.disabled = true;
      btnSelectPos.disabled = true;
      btnResize.disabled = true;
      updateUI("startPaintingMsg", "success");
      try {
        await paintingLoop();
      } catch {
        updateUI("paintingError", "error");
      } finally {
        state.running = false;
        btnStop.disabled = true;
        if (state.stopFlag) {
          btnStart.disabled = false;
        } else {
          btnStart.disabled = true;
          btnUpload.disabled = false;
          btnSelectPos.disabled = false;
          btnResize.disabled = false;
        }
      }
    });

    // Botão: Parar
    btnStop.addEventListener("click", () => {
      state.stopFlag = true;
      state.running = false;
      btnStop.disabled = true;
      updateUI("paintingStopped", "warning");
    });
  }

  // ---------------------------------------------------------------------------
  // Loop de pintura
  // ---------------------------------------------------------------------------
  async function paintingLoop() {
    const { width, height, pixels } = state.imageData;
    const { x: startX, y: startY } = state.startPosition;
    const { x: regionX, y: regionY } = state.region;

    let startRow = state.lastPosition.y || 0;
    let startCol = state.lastPosition.x || 0;

    outerLoop:
    for (let row = startRow; row < height; row++) {
      for (let col = (row === startRow ? startCol : 0); col < width; col++) {
        if (state.stopFlag) {
          state.lastPosition = { x: col, y: row };
          updateUI("paintingPaused", "warning", { x: col, y: row });
          break outerLoop;
        }

        const idx = (row * width + col) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];

        if (a < CONFIG.TRANSPARENCY_THRESHOLD) continue;
        if (utils.isWhitePixel(r, g, b)) continue;

        const nearestColorId = mapToNearestColor([r, g, b], state.availableColors);

        if (state.currentCharges < 1) {
          updateUI("noCharges", "warning", { time: utils.formatTime(state.cooldown) });
          await utils.sleep(state.cooldown);
          const fresh = await api.getCharges();
          state.currentCharges = fresh.charges;
          state.cooldown = fresh.cooldown;
        }

        const absX = startX + col;
        const absY = startY + row;

        const painted = await api.paintPixelInRegion(regionX, regionY, absX, absY, nearestColorId);
        if (painted) {
          state.paintedPixels++;
          state.currentCharges--;
          state.estimatedTime = utils.calculateEstimatedTime(
            state.totalPixels - state.paintedPixels,
            state.currentCharges,
            state.cooldown
          );
          if (state.paintedPixels % CONFIG.LOG_INTERVAL === 0) {
            updateStats();
            updateUI("paintingProgress", "default", {
              painted: state.paintedPixels,
              total: state.totalPixels
            });
          }
        }
      }
    }

    if (state.stopFlag) {
      updateUI("paintingStopped", "warning");
    } else {
      updateUI("paintingComplete", "success", { count: state.paintedPixels });
      state.lastPosition = { x: 0, y: 0 };
    }

    updateStats();
  }

  // ---------------------------------------------------------------------------
  // Inicialização
  // ---------------------------------------------------------------------------
  initUI();

})();
