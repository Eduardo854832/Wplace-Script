/**
 * WPlace Auto-Image Bot (versão remodelada e responsiva)
 * - Layout atualizado para desktop e mobile
 * - Novas opções de configuração (ordem, velocidade, ignorações, tema, idioma)
 * - Loop de pintura otimizado com lista de pixels
 * - Textos revisados e ampliados
 *
 * Autor base: Eduardo854833 (script reconstituído)
 * Redesign: (esta versão)
 *
 * Atualização drag 2025-08-15:
 *  - Substituição do sistema antigo (mouse+touch separados) por Pointer Events unificados
 *  - Correção de salto inicial (converte right -> left antes de arrastar)
 *  - Limites (clamp) para não perder o painel fora da viewport
 *  - Mantido restante da lógica completa (corrige bug do commit anterior que removeu handlers)
 */

(async () => {
  // ---------------------------------------------------------------------------
  // Configurações base
  // ---------------------------------------------------------------------------
  const CONFIG = {
    COOLDOWN_DEFAULT: 31000,
    TRANSPARENCY_THRESHOLD: 100,
    WHITE_THRESHOLD: 250,
    LOG_INTERVAL: 10,
    PIXEL_DELAY_FAST: 20,
    PIXEL_DELAY_NORMAL: 60,
    PIXEL_DELAY_SAFE: 140,
    THEME_DARK: {
      name: "dark",
      primary: "#0f141c",
      secondary: "#182230",
      accent: "#243245",
      text: "#f5f7fa",
      highlight: "#54d5ff",
      success: "#35d07f",
      error: "#ff4d61",
      warning: "#ffb347",
      border: "rgba(255,255,255,.1)",
      glow: "rgba(84,213,255,.45)"
    },
    THEME_LIGHT: {
      name: "light",
      primary: "#f2f6fb",
      secondary: "#ffffff",
      accent: "#e3edf6",
      text: "#19212b",
      highlight: "#007bc7",
      success: "#1e8c57",
      error: "#d63142",
      warning: "#c97908",
      border: "rgba(0,0,0,.12)",
      glow: "rgba(0,123,199,.35)"
    }
  };

  // ---------------------------------------------------------------------------
  // Textos multilíngues atualizados
  // ---------------------------------------------------------------------------
  const TEXTS = {
    pt: {
      title: "Auto Imagem WPlace",
      initBot: "Iniciar Bot",
      uploadImage: "Carregar Imagem",
      resizeImage: "Redimensionar",
      selectPosition: "Definir Posição",
      startPainting: "Começar a Pintura",
      stopPainting: "Parar",
      resumePainting: "Retomar",
      checkingColors: "🔍 Verificando cores disponíveis...",
      noColorsFound: "❌ Abra a paleta de cores e tente novamente.",
      colorsFound: "✅ {count} cores disponíveis",
      loadingImage: "🖼️ Carregando imagem...",
      imageLoaded: "✅ Imagem com {count} pixels válidos",
      imageError: "❌ Erro ao carregar a imagem",
      selectPositionAlert: "Clique para pintar o primeiro pixel onde a arte começará.",
      waitingPosition: "👆 Aguardando o pixel de referência...",
      positionSet: "✅ Posição definida!",
      positionTimeout: "❌ Tempo esgotado para selecionar posição",
      startPaintingMsg: "🎨 Começando a pintura...",
      paintingProgress: "🧱 Progresso: {painted}/{total}",
      noCharges: "⌛ Sem cargas. Aguardando {time}...",
      paintingStopped: "⏹️ Pintura pausada",
      paintingComplete: "✅ Pintura concluída! {count} pixels.",
      paintingError: "❌ Erro durante a pintura",
      missingRequirements: "❌ Carregue a imagem e defina a posição primeiro",
      progress: "Progresso",
      pixels: "Pixels",
      charges: "Cargas",
      estimatedTime: "Tempo Estimado",
      initMessage: "Pressione 'Iniciar Bot' para começar",
      waitingInit: "Aguardando inicialização...",
      resizeSuccess: "✅ Redimensionada para {width}x{height}",
      paintingPaused: "⏸️ Pausado em X:{x} Y:{y}",
      minimize: "Minimizar",
      width: "Largura",
      height: "Altura",
      keepAspect: "Manter proporção",
      apply: "Aplicar",
      cancel: "Cancelar",
      settings: "Opções",
      order: "Ordem",
      order_ltr: "Esq → Dir",
      order_rtl: "Dir → Esq",
      order_random: "Aleatória",
      speed: "Velocidade",
      speed_safe: "Segura",
      speed_normal: "Normal",
      speed_fast: "Rápida",
      skipWhite: "Ignorar Branco",
      skipTransparent: "Ignorar Transparente",
      theme: "Tema",
      theme_dark: "Escuro",
      theme_light: "Claro",
      language: "Idioma",
      listRebuilt: "Lista de pixels gerada: {count}",
      rebuildList: "Atualizar Pixels",
      advanced: "Avançado",
      confirmStop: "Bot pausado",
      pixelsPerSec: "px/s (estim.)",
      modeUpdated: "Configurações aplicadas",
      langChanged: "Idioma alterado",
      themeChanged: "Tema alterado"
    },
    en: {
      title: "WPlace Auto Image",
      initBot: "Start Bot",
      uploadImage: "Upload Image",
      resizeImage: "Resize",
      selectPosition: "Set Position",
      startPainting: "Begin Painting",
      stopPainting: "Stop",
      resumePainting: "Resume",
      checkingColors: "🔍 Checking available colors...",
      noColorsFound: "❌ Open the palette and try again.",
      colorsFound: "✅ {count} colors found",
      loadingImage: "🖼️ Loading image...",
      imageLoaded: "✅ Image with {count} valid pixels",
      imageError: "❌ Error loading image",
      selectPositionAlert: "Click to paint the first pixel where art starts.",
      waitingPosition: "👆 Waiting for reference pixel...",
      positionSet: "✅ Position set!",
      positionTimeout: "❌ Position selection timeout",
      startPaintingMsg: "🎨 Starting painting...",
      paintingProgress: "🧱 Progress: {painted}/{total}",
      noCharges: "⌛ No charges. Waiting {time}...",
      paintingStopped: "⏹️ Painting paused",
      paintingComplete: "✅ Painting finished! {count} pixels.",
      paintingError: "❌ Error during painting",
      missingRequirements: "❌ Load image and set position first",
      progress: "Progress",
      pixels: "Pixels",
      charges: "Charges",
      estimatedTime: "ETA",
      initMessage: "Press 'Start Bot' to begin",
      waitingInit: "Awaiting initialization...",
      resizeSuccess: "✅ Resized to {width}x{height}",
      paintingPaused: "⏸️ Paused at X:{x} Y:{y}",
      minimize: "Minimize",
      width: "Width",
      height: "Height",
      keepAspect: "Keep aspect",
      apply: "Apply",
      cancel: "Cancel",
      settings: "Settings",
      order: "Order",
      order_ltr: "Left → Right",
      order_rtl: "Right → Left",
      order_random: "Random",
      speed: "Speed",
      speed_safe: "Safe",
      speed_normal: "Normal",
      speed_fast: "Fast",
      skipWhite: "Skip White",
      skipTransparent: "Skip Transparent",
      theme: "Theme",
      theme_dark: "Dark",
      theme_light: "Light",
      language: "Language",
      listRebuilt: "Pixel list built: {count}",
      rebuildList: "Rebuild Pixels",
      advanced: "Advanced",
      confirmStop: "Bot paused",
      pixelsPerSec: "px/s (est.)",
      modeUpdated: "Settings applied",
      langChanged: "Language changed",
      themeChanged: "Theme changed"
    }
  };

  // ---------------------------------------------------------------------------
  // Estado global
  // ---------------------------------------------------------------------------
  const state = {
    running: false,
    stopFlag: false,
    imageLoaded: false,
    colorsChecked: false,
    availableColors: [],
    currentCharges: 0,
    cooldown: CONFIG.COOLDOWN_DEFAULT,
    imageData: null,          // { width,height,pixels,totalPixels,processor }
    startPosition: null,      // { x,y }
    region: null,             // { x,y }
    lastPosition: { x: 0, y: 0 }, // deprecado (substituído por pixelIndex)
    estimatedTime: 0,
    language: "pt",
    theme: CONFIG.THEME_DARK.name,
    minimized: false,
    pixelList: [],            // [{x,y,idx,r,g,b,a}]
    pixelIndex: 0,
    settings: {
      order: "ltr",           // ltr | rtl | random
      speed: "normal",        // safe | normal | fast
      skipWhite: true,
      skipTransparent: true
    },
    perf: {
      startTime: 0,
      paintedAtStart: 0,
      recent: []
    }
  };

  function detectLanguage() {
    const lang = (navigator.language || "en").split("-")[0];
    if (TEXTS[lang]) state.language = lang;
  }

  // ---------------------------------------------------------------------------
  // Utilitários
  // ---------------------------------------------------------------------------
  const utils = {
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    colorDistance: (a, b) =>
      Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2),
    createImageUploader: () => new Promise(resolve => {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "image/png,image/jpeg";
      inp.onchange = () => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.readAsDataURL(inp.files[0]);
      };
      inp.click();
    }),
    extractAvailableColors: () =>
      Array.from(document.querySelectorAll('[id^="color-"]'))
        .filter(el => !el.querySelector("svg"))
        .filter(el => {
          const id = parseInt(el.id.replace("color-", ""));
          return id !== 0 && id !== 5;
        })
        .map(el => {
          const id = parseInt(el.id.replace("color-", ""));
          const m = el.style.backgroundColor.match(/\d+/g);
          const rgb = m ? m.map(Number) : [0,0,0];
          return { id, rgb };
        }),
    formatTime: (ms) => {
      if (ms < 0) ms = 0;
      const s = Math.floor(ms / 1000);
      if (s < 60) return s + "s";
      const m = Math.floor(s / 60);
      const sec = s % 60;
      if (m < 60) return `${m}m ${sec}s`;
      const h = Math.floor(m / 60);
      const min = m % 60;
      if (h < 24) return `${h}h ${min}m`;
      const d = Math.floor(h / 24);
      const hr = h % 24;
      return `${d}d ${hr}h`;
    },
    showToast: (text, themeObj, time = 2600) => {
      const div = document.createElement("div");
      div.style.position = "fixed";
      div.style.bottom = "20px";
      div.style.left = "50%";
      div.style.transform = "translateX(-50%)";
      div.style.padding = "12px 18px";
      div.style.background = `linear-gradient(145deg,${themeObj.accent},${themeObj.secondary})`;
      div.style.color = themeObj.text;
      div.style.border = `1px solid ${themeObj.highlight}`;
      div.style.borderRadius = "14px";
      div.style.font = '500 14px "Segoe UI",sans-serif';
      div.style.zIndex = "10000";
      div.style.boxShadow = `0 8px 28px -8px ${themeObj.glow}`;
      div.textContent = text;
      document.body.appendChild(div);
      setTimeout(() => {
        div.style.transition = "all .4s";
        div.style.opacity = "0";
        div.style.transform += " translateY(10px)";
        setTimeout(() => div.remove(), 450);
      }, time);
    },
    isWhitePixel: (r,g,b) =>
      r >= CONFIG.WHITE_THRESHOLD &&
      g >= CONFIG.WHITE_THRESHOLD &&
      b >= CONFIG.WHITE_THRESHOLD,
    t: (key, vars = {}) => {
      let s = TEXTS[state.language]?.[key] || TEXTS.en[key] || key;
      Object.entries(vars).forEach(([k,v]) => s = s.replace(`{${k}}`, v));
      return s;
    },
    calculateEstimatedTime: (remainingPixels, charges, cooldown) => {
      if (remainingPixels <= 0) return 0;
      const pixelDelay = utils.getPixelDelay();
      if (charges > remainingPixels) return remainingPixels * pixelDelay;
      // Aproximação: grupos de 'charges' seguidos de cooldown
      const cycles = Math.ceil(remainingPixels / Math.max(charges,1));
      return cycles * cooldown + remainingPixels * pixelDelay;
    },
    getPixelDelay: () => {
      switch (state.settings.speed) {
        case "fast": return CONFIG.PIXEL_DELAY_FAST;
        case "safe": return CONFIG.PIXEL_DELAY_SAFE;
        default: return CONFIG.PIXEL_DELAY_NORMAL;
      }
    },
    shuffle: arr => {
      for (let i = arr.length -1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i+1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
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
  // Processador de Imagem
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
          this.ctx.drawImage(this.img,0,0);
          resolve();
        };
        this.img.onerror = reject;
        this.img.src = this.imageSrc;
      });
    }
    getPixelData() {
      return this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height).data;
    }
    getDimensions() {
      return { width: this.canvas.width, height: this.canvas.height };
    }
    resize(newW,newH) {
      const tmp = document.createElement("canvas");
      tmp.width = newW;
      tmp.height = newH;
      const tctx = tmp.getContext("2d");
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(this.img,0,0,newW,newH);
      this.canvas.width = newW;
      this.canvas.height = newH;
      this.ctx.drawImage(tmp,0,0);
      return this.getPixelData();
    }
    generatePreview(w,h) {
      this.previewCanvas.width = w;
      this.previewCanvas.height = h;
      this.previewCtx.imageSmoothingEnabled = false;
      this.previewCtx.drawImage(this.img,0,0,w,h);
      return this.previewCanvas.toDataURL();
    }
  }

  // ---------------------------------------------------------------------------
  // Mapeia para cor mais próxima
  // ---------------------------------------------------------------------------
  function mapToNearestColor(rgb, palette) {
    return palette.reduce(
      (acc, c) => {
        const d = utils.colorDistance(rgb, c.rgb);
        return d < acc.dist ? { id: c.id, dist: d } : acc;
      },
      { id: palette[0].id, dist: utils.colorDistance(rgb, palette[0].rgb) }
    ).id;
  }

  // ---------------------------------------------------------------------------
  // Construção da lista de pixels
  // ---------------------------------------------------------------------------
  function buildPixelList() {
    if (!state.imageData) return;
    const { width, height, pixels } = state.imageData;
    const list = [];
    for (let y=0; y<height; y++) {
      for (let x=0; x<width; x++) {
        const idx = (y*width + x)*4;
        const r = pixels[idx];
        const g = pixels[idx+1];
        const b = pixels[idx+2];
        const a = pixels[idx+3];
        if (state.settings.skipTransparent && a < CONFIG.TRANSPARENCY_THRESHOLD) continue;
        if (state.settings.skipWhite && utils.isWhitePixel(r,g,b)) continue;
        list.push({ x, y, idx, r, g, b, a });
      }
    }
    // Ordem
    if (state.settings.order === "rtl") {
      list.sort((p1,p2) => p2.y === p1.y ? p2.x - p1.x : p1.y - p2.y);
    } else if (state.settings.order === "ltr") {
      list.sort((p1,p2) => p1.y === p2.y ? p1.x - p2.x : p1.y - p2.y);
    } else {
      utils.shuffle(list);
    }
    state.pixelList = list;
    state.pixelIndex = 0;
    state.imageData.totalPixels = list.length;
    state.totalPixels = list.length;
    window.updateStats && window.updateStats();
    window.updateUI && window.updateUI("listRebuilt","success",{ count: list.length });
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  let root, themeStyle;
  function currentThemeObj() {
    return state.theme === "light" ? CONFIG.THEME_LIGHT : CONFIG.THEME_DARK;
  }

  function applyTheme() {
    const t = currentThemeObj();
    if (!themeStyle) {
      themeStyle = document.createElement("style");
      document.head.appendChild(themeStyle);
    }
    themeStyle.textContent = `
      :root {
        --w-bg-primary: ${t.primary};
        --w-bg-secondary: ${t.secondary};
        --w-bg-accent: ${t.accent};
        --w-text: ${t.text};
        --w-highlight: ${t.highlight};
        --w-success: ${t.success};
        --w-error: ${t.error};
        --w-warning: ${t.warning};
        --w-border: ${t.border};
        --w-glow: ${t.glow};
      }
    `;
    if (root) root.setAttribute("data-theme", t.name);
  }

  // ---------------------------------------------------------------------------
  // Drag (Pointer Events unificado)
  // ---------------------------------------------------------------------------
  function initDrag(handle, container) {
    let startX=0,startY=0,origX=0,origY=0,dragging=false;
    function clamp(v,min,max){return Math.min(Math.max(v,min),max);}    
    function pointerDown(e){
      if(e.button!==undefined && e.button!==0) return; // somente botão primário
      if(e.target.closest('.no-drag')) return; // permitir clique em botões
      dragging=true;
      const rect = container.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      origX = rect.left;  origY = rect.top;
      try { handle.setPointerCapture(e.pointerId); } catch{}
      e.preventDefault();
    }
    function pointerMove(e){
      if(!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let nl = origX + dx;
      let nt = origY + dy;
      const margin = 6;
      nl = clamp(nl, margin, window.innerWidth - container.offsetWidth - margin);
      nt = clamp(nt, margin, window.innerHeight - container.offsetHeight - margin);
      container.style.left = nl + 'px';
      container.style.top  = nt + 'px';
      container.style.right = 'auto';
    }
    function pointerUp(e){
      if(!dragging) return; dragging=false; try { handle.releasePointerCapture(e.pointerId);}catch{}
    }
    handle.addEventListener('pointerdown', pointerDown);
    handle.addEventListener('pointermove', pointerMove);
    handle.addEventListener('pointerup', pointerUp);
    handle.addEventListener('pointercancel', pointerUp);
    // Garantir visibilidade em resize
    window.addEventListener('resize', () => {
      if(!root) return; const r = root.getBoundingClientRect(); const margin=6;
      let nl = r.left; let nt = r.top;
      if (r.right < margin) nl = window.innerWidth - root.offsetWidth - margin;
      nl = clamp(nl, margin, window.innerWidth - root.offsetWidth - margin);
      nt = clamp(nt, margin, window.innerHeight - root.offsetHeight - margin);
      root.style.left = nl + 'px';
      root.style.top  = nt + 'px';
      root.style.right = 'auto';
    });
  }

  function initUI() {
    detectLanguage();
    applyTheme();

    // Font Awesome
    if (!document.querySelector('link[href*="font-awesome/6.4.0"]')) {
      const fa = document.createElement("link");
      fa.rel = "stylesheet";
      fa.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
      document.head.appendChild(fa);
    }
    const style = document.createElement("style");
    style.textContent = `
      #wplace-bot-panel[data-theme="light"] .wplace-header,
      #wplace-bot-panel {
        font-family: "Segoe UI", Roboto, Oxygen, sans-serif;
      }
      #wplace-bot-panel {
        position:fixed; top:20px; right:20px;
        width:clamp(300px, 340px, 92vw);
        max-height: calc(100vh - 40px);
        display:flex; flex-direction:column;
        background:linear-gradient(160deg,var(--w-bg-secondary),var(--w-bg-primary));
        border:1px solid var(--w-border);
        border-radius:20px;
        color:var(--w-text);
        box-shadow:0 12px 46px -14px var(--w-glow),0 0 0 1px rgba(255,255,255,.04) inset;
        backdrop-filter:blur(14px) saturate(140%);
        z-index:9999;
        overflow:hidden;
      }
      @media (max-width: 720px) {
        #wplace-bot-panel {
          top:20px; right:12px;
          width: min(440px, 94vw);
        }
        #wplace-bot-panel.wplace-minimized { height:auto }
      }
      .wplace-header {
        display:flex; align-items:center; justify-content:space-between;
        padding:12px 16px;
        background:
          radial-gradient(at 25% 0%,var(--w-highlight) 0%,transparent 55%) 0/250% 250%,
          linear-gradient(145deg,var(--w-bg-accent),var(--w-bg-secondary));
        background-blend-mode: overlay;
        font-weight:600;
        letter-spacing:.5px;
        user-select:none;
        cursor:move;
        touch-action:none;
      }
      .wplace-header .title { display:flex; gap:10px; align-items:center; font-size:15px }
      .wplace-header .title i { color:var(--w-highlight); filter:drop-shadow(0 0 6px var(--w-glow)) }
      .header-actions { display:flex; gap:6px }
      .icon-btn {
        width:36px; height:36px; display:grid; place-items:center;
        background:linear-gradient(145deg,var(--w-bg-accent),var(--w-bg-secondary));
        border:1px solid var(--w-border); border-radius:12px;
        color:var(--w-text); cursor:pointer; font-size:15px;
        transition:.25s;
      }
      .icon-btn:hover {
        border-color:var(--w-highlight); color:var(--w-highlight);
        box-shadow:0 4px 16px -6px var(--w-glow);
        transform:translateY(-2px);
      }
      .wplace-content {
        padding:12px 16px 16px;
        overflow-y:auto;
        display:flex;
        flex-direction:column;
        gap:14px;
        scroll-behavior:smooth;
      }
      .wplace-minimized .wplace-content { display:none }
      .section {
        background:linear-gradient(165deg,var(--w-bg-accent),var(--w-bg-secondary));
        border:1px solid var(--w-border);
        border-radius:18px;
        padding:14px 14px 16px;
        display:flex; flex-direction:column; gap:14px;
        position:relative;
      }
      .section-title {
        font-size:11px;
        text-transform:uppercase;
        letter-spacing:1.3px;
        font-weight:700;
        color:var(--w-highlight);
        display:flex; gap:8px; align-items:center;
        opacity:.9;
      }
      .btn-grid {
        display:grid;
        gap:10px;
        grid-template-columns:repeat(auto-fill, minmax(140px,1fr));
      }
      @media (max-width:520px) {
        .btn-grid { grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); }
      }
      .w-btn {
        position:relative;
        border:1px solid var(--w-border);
        background:linear-gradient(155deg,var(--w-bg-accent),var(--w-bg-secondary));
        color:var(--w-text);
        padding:10px 12px;
        font-size:12.5px;
        font-weight:600;
        letter-spacing:.3px;
        border-radius:12px;
        display:flex;
        align-items:center;
        gap:8px;
        cursor:pointer;
        transition:.25s;
        min-height:44px;
        overflow:hidden;
      }
      .w-btn:before {
        content:"";
        position:absolute;
        inset:0;
        background:linear-gradient(140deg,var(--w-highlight) 0%,transparent 60%);
        mix-blend-mode:overlay;
        opacity:0;
        transition:.4s;
      }
      .w-btn:hover:not(:disabled) { transform:translateY(-2px); border-color:var(--w-highlight); box-shadow:0 10px 26px -10px var(--w-glow) }
      .w-btn:hover:not(:disabled):before { opacity:.25 }
      .w-btn:disabled { opacity:.38; cursor:not-allowed; filter:grayscale(.45) }
      .w-btn.primary { color:var(--w-highlight) }
      .w-btn.danger { color:var(--w-error) }
      .w-btn.go { color:var(--w-success) }
      .w-btn.warn { color:var(--w-warning) }
      .progress-outer {
        height:14px;
        width:100%;
        border:1px solid var(--w-border);
        background:linear-gradient(90deg,rgba(255,255,255,.06),rgba(255,255,255,.02));
        border-radius:10px;
        overflow:hidden;
        position:relative;
      }
      .progress-bar {
        height:100%; width:0%;
        background:linear-gradient(90deg,var(--w-highlight),var(--w-success));
        box-shadow:0 0 0 1px var(--w-highlight),0 4px 16px -4px var(--w-glow);
        transition:width .45s cubic-bezier(.3,.7,.4,1);
      }
      .stats {
        display:grid;
        gap:10px;
        grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
      }
      .stat {
        border:1px solid var(--w-border);
        background:linear-gradient(150deg,var(--w-bg-accent),var(--w-bg-secondary));
        border-radius:14px;
        padding:9px 12px 10px;
        display:flex;
        flex-direction:column;
        gap:4px;
        font-size:12px;
        min-height:62px;
        position:relative;
      }
      .stat-label {
        text-transform:uppercase;
        font-size:10px;
        opacity:.6;
        letter-spacing:1.1px;
        font-weight:600;
      }
      .stat-value {
        font-size:14px;
        font-weight:600;
        display:flex;
        gap:6px;
        align-items:center;
      }
      .status-box {
        border:1px solid var(--w-border);
        background:linear-gradient(140deg,var(--w-bg-accent),var(--w-bg-secondary));
        border-radius:16px;
        padding:14px 16px;
        display:flex;
        gap:12px;
        font-size:13px;
        align-items:flex-start;
      }
      .status-icon {
        width:34px; height:34px;
        display:grid; place-items:center;
        border-radius:12px;
        background:linear-gradient(145deg,var(--w-highlight),transparent);
        color:var(--w-highlight);
        font-size:15px;
        box-shadow:0 0 0 1px var(--w-highlight) inset;
      }
      .status-text { flex:1; font-weight:500; letter-spacing:.3px; line-height:1.25 }
      .settings-grid {
        display:grid;
        gap:10px;
        grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
      }
      .setting {
        display:flex;
        flex-direction:column;
        gap:6px;
        background:linear-gradient(155deg,var(--w-bg-secondary),var(--w-bg-accent));
        border:1px solid var(--w-border);
        padding:10px 10px 11px;
        border-radius:12px;
      }
      .setting label {
        font-size:10px;
        text-transform:uppercase;
        letter-spacing:1.2px;
        font-weight:700;
        opacity:.75;
        display:flex; gap:6px; align-items:center;
      }
      .setting select,
      .setting .toggle-line {
        appearance:none;
        font:600 12.5px "Segoe UI",sans-serif;
        background:var(--w-bg-primary);
        color:var(--w-text);
        border:1px solid var(--w-border);
        border-radius:10px;
        padding:6px 8px;
        letter-spacing:.3px;
        outline:none;
        display:flex; align-items:center; gap:8px;
        cursor:pointer;
      }
      .toggle-line input { transform:scale(1.15); accent-color:var(--w-highlight); cursor:pointer }
      .row { display:flex; flex-wrap:wrap; gap:10px }
      .grow { flex:1 }
      .divider {
        height:1px;
        background:linear-gradient(90deg,transparent,var(--w-border),transparent);
        margin:4px 0;
      }
      .collapsed .settings-inner { display:none }
      .collapse-btn {
        position:absolute;
        top:10px; right:12px;
        font-size:11px;
        background:var(--w-bg-primary);
        color:var(--w-highlight);
        border:1px solid var(--w-border);
        padding:4px 10px;
        border-radius:18px;
        display:flex;
        align-items:center;
        gap:6px;
        cursor:pointer;
        font-weight:600;
        letter-spacing:.8px;
        transition:.25s;
      }
      .collapse-btn:hover {
        border-color:var(--w-highlight);
        box-shadow:0 4px 16px -6px var(--w-glow);
      }
      /* Modal resize */
      .resize-modal {
        position:fixed; inset:0;
        display:flex; align-items:center; justify-content:center;
        background:rgba(0,0,0,.55);
        backdrop-filter:blur(6px);
        z-index:10000;
        padding:20px;
      }
      .resize-box {
        width:clamp(300px,620px,95vw);
        background:linear-gradient(160deg,var(--w-bg-secondary),var(--w-bg-primary));
        border:1px solid var(--w-border);
        padding:24px 26px 26px;
        border-radius:24px;
        display:flex;
        flex-direction:column;
        gap:18px;
        max-height:90vh;
        overflow-y:auto;
        box-shadow:0 18px 48px -12px var(--w-glow);
      }
      .resize-box h3 { margin:0; display:flex; gap:10px; align-items:center; font-size:17px; color:var(--w-highlight) }
      .slider-line { display:flex; flex-direction:column; gap:6px }
      .slider-line span { font-size:12px; font-weight:600; letter-spacing:.5px }
      .slider-line input[type=range] {
        width:100%;
        accent-color:var(--w-highlight);
      }
      .preview-img {
        max-width:100%;
        max-height:300px;
        object-fit:contain;
        border:1px solid var(--w-border);
        border-radius:16px;
        background:var(--w-bg-primary);
        box-shadow:0 6px 22px -10px rgba(0,0,0,.6);
      }
      .modal-actions {
        display:flex; gap:12px; justify-content:flex-end; flex-wrap:wrap;
      }
      .badge-inline {
        display:inline-flex; align-items:center; gap:6px;
        background:var(--w-bg-accent);
        border:1px solid var(--w-border);
        padding:4px 10px;
        border-radius:20px;
        font-size:11px;
        letter-spacing:.5px;
      }
    `;
    document.head.appendChild(style);

    root = document.createElement("div");
    root.id = "wplace-bot-panel";
    root.innerHTML = `
      <div class="wplace-header no-drag">
        <div class="title"><i class="fas fa-palette"></i><span id="titleText">${utils.t("title")}</span></div>
        <div class="header-actions no-drag">
          <button class="icon-btn" id="themeToggle" title="${utils.t("theme")}" ><i class="fas fa-adjust"></i></button>
          <button class="icon-btn" id="langToggle" title="${utils.t("language")}" ><i class="fas fa-language"></i></button>
          <button class="icon-btn" id="minBtn" title="${utils.t("minimize")}" ><i class="fas fa-minus"></i></button>
        </div>
      </div>
      <div class="wplace-content">
        <div class="section" id="setupSection">
          <div class="section-title"><i class="fas fa-cogs"></i> SETUP</div>
          <div class="btn-grid">
            <button id="btnInit" class="w-btn primary"><i class="fas fa-robot"></i><span>${utils.t("initBot")}</span></button>
            <button id="btnUpload" class="w-btn" disabled><i class="fas fa-upload"></i><span>${utils.t("uploadImage")}</span></button>
            <button id="btnResize" class="w-btn" disabled><i class="fas fa-expand"></i><span>${utils.t("resizeImage")}</span></button>
            <button id="btnPos" class="w-btn" disabled><i class="fas fa-crosshairs"></i><span>${utils.t("selectPosition")}</span></button>
            <button id="btnStart" class="w-btn go" disabled><i class="fas fa-play"></i><span>${utils.t("startPainting")}</span></button>
            <button id="btnStop" class="w-btn danger" disabled><i class="fas fa-pause"></i><span>${utils.t("stopPainting")}</span></button>
            <button id="btnRebuild" class="w-btn warn" disabled><i class="fas fa-retweet"></i><span>${utils.t("rebuildList")}</span></button>
          </div>
        </div>

        <div class="section collapsed" id="settingsSection">
          <div class="section-title"><i class="fas fa-sliders-h"></i> ${utils.t("settings")}</div>
          <button class="collapse-btn" id="collapseSettings"><i class="fas fa-chevron-down"></i></button>
          <div class="settings-inner" style="display:none">
            <div class="settings-grid">
              <div class="setting">
                <label><i class="fas fa-random"></i> ${utils.t("order")}</label>
                <select id="orderSelect">
                  <option value="ltr">${utils.t("order_ltr")}</option>
                  <option value="rtl">${utils.t("order_rtl")}</option>
                  <option value="random">${utils.t("order_random")}</option>
                </select>
              </div>
              <div class="setting">
                <label><i class="fas fa-tachometer-alt"></i> ${utils.t("speed")}</label>
                <select id="speedSelect">
                  <option value="safe">${utils.t("speed_safe")}</option>
                  <option value="normal" selected>${utils.t("speed_normal")}</option>
                  <option value="fast">${utils.t("speed_fast")}</option>
                </select>
              </div>
              <div class="setting">
                <label><i class="fas fa-eraser"></i> ${utils.t("skipWhite")}</label>
                <div class="toggle-line"><input id="skipWhiteToggle" type="checkbox" checked></div>
              </div>
              <div class="setting">
                <label><i class="fas fa-eye-slash"></i> ${utils.t("skipTransparent")}</label>
                <div class="toggle-line"><input id="skipTransToggle" type="checkbox" checked></div>
              </div>
              <div class="setting">
                <label><i class="fas fa-adjust"></i> ${utils.t("theme")}</label>
                <select id="themeSelect">
                  <option value="dark" selected>${utils.t("theme_dark")}</option>
                  <option value="light">${utils.t("theme_light")}</option>
                </select>
              </div>
              <div class="setting">
                <label><i class="fas fa-language"></i> ${utils.t("language")}</label>
                <select id="langSelect">
                  <option value="pt" ${state.language==="pt"?"selected":""}>Português</option>
                  <option value="en" ${state.language==="en"?"selected":""}>English</option>
                </select>
              </div>
            </div>
            <div class="divider"></div>
            <button id="applySettings" class="w-btn go" style="justify-content:center;">
              <i class="fas fa-check"></i><span>${utils.t("apply")}</span>
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-title"><i class="fas fa-chart-line"></i> TRACKING</div>
          <div class="progress-outer"><div id="progressBar" class="progress-bar"></div></div>
          <div class="stats" id="statsArea"></div>
        </div>

        <div class="status-box">
          <div class="status-icon" id="statusIcon"><i class="fas fa-terminal"></i></div>
          <div class="status-text" id="statusText">${utils.t("waitingInit")}</div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    // Converter posicionamento right->left uma vez (evita salto ao arrastar)
    requestAnimationFrame(() => {
      if (getComputedStyle(root).right !== 'auto') {
        root.style.left = (window.innerWidth - root.offsetWidth - 20) + 'px';
        root.style.top = root.style.top || '20px';
        root.style.right = 'auto';
      }
    });

    initDrag(root.querySelector(".wplace-header"), root);

    // Referências
    const btnInit    = root.querySelector("#btnInit");
    const btnUpload  = root.querySelector("#btnUpload");
    const btnResize  = root.querySelector("#btnResize");
    const btnPos     = root.querySelector("#btnPos");
    const btnStart   = root.querySelector("#btnStart");
    const btnStop    = root.querySelector("#btnStop");
    const btnRebuild = root.querySelector("#btnRebuild");
    const progressBar = root.querySelector("#progressBar");
    const statsArea  = root.querySelector("#statsArea");
    const statusText = root.querySelector("#statusText");
    const statusIcon = root.querySelector("#statusIcon");
    const minBtn     = root.querySelector("#minBtn");
    const themeToggle= root.querySelector("#themeToggle");
    const langToggle = root.querySelector("#langToggle");
    const collapseSettings = root.querySelector("#collapseSettings");
    const settingsSection = root.querySelector("#settingsSection");
    const orderSelect = root.querySelector("#orderSelect");
    const speedSelect = root.querySelector("#speedSelect");
    const skipWhiteToggle = root.querySelector("#skipWhiteToggle");
    const skipTransToggle = root.querySelector("#skipTransToggle");
    const themeSelect = root.querySelector("#themeSelect");
    const langSelect = root.querySelector("#langSelect");
    const applySettings = root.querySelector("#applySettings");

    // Resize modal
    let resizeModal;
    function openResize() {
      if (!state.imageLoaded || !state.imageData.processor) return;
      if (resizeModal) resizeModal.remove();
      const { width, height } = state.imageData;
      const aspect = width / height;
      resizeModal = document.createElement("div");
      resizeModal.className = "resize-modal";
      resizeModal.innerHTML = `
        <div class="resize-box">
          <h3><i class="fas fa-expand"></i> ${utils.t("resizeImage")}</h3>
          <div class="row">
            <div class="slider-line grow">
              <span>${utils.t("width")}: <b id="wVal">${width}</b>px</span>
              <input type="range" id="wSlider" min="10" max="500" value="${width}">
            </div>
            <div class="slider-line grow">
              <span>${utils.t("height")}: <b id="hVal">${height}</b>px</span>
              <input type="range" id="hSlider" min="10" max="500" value="${height}">
            </div>
          </div>
          <label class="badge-inline" style="cursor:pointer;">
            <input type="checkbox" id="keepAspect" checked style="transform:scale(1.2);accent-color:var(--w-highlight)">
            ${utils.t("keepAspect")}
          </label>
          <img id="previewImg" class="preview-img" src="${state.imageData.processor.generatePreview(width,height)}">
          <div class="modal-actions">
            <button class="w-btn go" id="applyResize"><i class="fas fa-check"></i><span>${utils.t("apply")}</span></button>
            <button class="w-btn danger" id="cancelResize"><i class="fas fa-times"></i><span>${utils.t("cancel")}</span></button>
          </div>
        </div>
      `;
      document.body.appendChild(resizeModal);
      const wSlider = resizeModal.querySelector("#wSlider");
      const hSlider = resizeModal.querySelector("#hSlider");
      const wVal = resizeModal.querySelector("#wVal");
      const hVal = resizeModal.querySelector("#hVal");
      const keepAspect = resizeModal.querySelector("#keepAspect");
      const previewImg = resizeModal.querySelector("#previewImg");
      const applyResize = resizeModal.querySelector("#applyResize");
      const cancelResize= resizeModal.querySelector("#cancelResize");

      function updatePreview() {
        const w = parseInt(wSlider.value);
        const h = parseInt(hSlider.value);
        wVal.textContent = w;
        hVal.textContent = h;
        previewImg.src = state.imageData.processor.generatePreview(w,h);
      }
      wSlider.oninput = () => {
        if (keepAspect.checked) {
          const w = parseInt(wSlider.value);
            hSlider.value = Math.max(10, Math.round(w / aspect));
        }
        updatePreview();
      };
      hSlider.oninput = () => {
        if (keepAspect.checked) {
          const h = parseInt(hSlider.value);
          wSlider.value = Math.max(10, Math.round(h * aspect));
        }
        updatePreview();
      };
      applyResize.onclick = () => {
        const newW = parseInt(wSlider.value);
        const newH = parseInt(hSlider.value);
        const pixels = state.imageData.processor.resize(newW,newH);
        state.imageData.width = newW;
        state.imageData.height = newH;
        state.imageData.pixels = pixels;
        state.paintedPixels = 0;
        buildPixelList();
        updateUI("resizeSuccess","success",{ width:newW, height:newH });
        resizeModal.remove();
      };
      cancelResize.onclick = () => resizeModal.remove();
    }

    // UI Atualização
    window.updateUI = (key, type="default", vars={}) => {
      const msg = utils.t(key, vars);
      statusText.textContent = msg;
      const t = currentThemeObj();
      statusIcon.style.background = `linear-gradient(145deg,${t.accent},transparent)`;
      if (type === "success") statusIcon.style.color = t.success;
      else if (type === "error") statusIcon.style.color = t.error;
      else if (type === "warning") statusIcon.style.color = t.warning;
      else statusIcon.style.color = t.highlight;
    };

    window.updateStats = async () => {
      if (!state.colorsChecked || !state.imageLoaded) return;
      const { charges, cooldown } = await api.getCharges();
      state.currentCharges = Math.floor(charges);
      state.cooldown = cooldown;

      const painted = state.paintedPixels || 0;
      const total = state.totalPixels || state.imageData?.totalPixels || 0;
      const percent = total > 0 ? Math.round(painted / total * 100) : 0;
      const remaining = total - painted;
      state.estimatedTime = utils.calculateEstimatedTime(remaining, state.currentCharges, state.cooldown);

      progressBar.style.width = percent + "%";

      // px/s estimativa
      let pxps = 0;
      const now = performance.now();
      state.perf.recent = state.perf.recent.filter(r => now - r.t < 10000);
      const deltaPainted = state.perf.recent.length;
      const windowMs = Math.max(now - (state.perf.recent[0]?.t || now), 1);
      pxps = +(deltaPainted / (windowMs/1000)).toFixed(1);

      statsArea.innerHTML = `
        <div class="stat">
          <div class="stat-label">${utils.t("progress")}</div>
          <div class="stat-value"><i class="fas fa-chart-line"></i>${percent}%</div>
        </div>
        <div class="stat">
          <div class="stat-label">${utils.t("pixels")}</div>
          <div class="stat-value"><i class="fas fa-paint-brush"></i>${painted}/${total}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${utils.t("charges")}</div>
          <div class="stat-value"><i class="fas fa-bolt"></i>${state.currentCharges}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${utils.t("estimatedTime")}</div>
          <div class="stat-value"><i class="fas fa-clock"></i>${utils.formatTime(state.estimatedTime)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${utils.t("pixelsPerSec")}</div>
          <div class="stat-value"><i class="fas fa-burn"></i>${pxps}</div>
        </div>
      `;
    };

    // Colapsar settings
    collapseSettings.addEventListener("click", () => {
      const collapsed = settingsSection.classList.toggle("collapsed");
      const inner = settingsSection.querySelector(".settings-inner");
      if (collapsed) {
        inner.style.display = "none";
        collapseSettings.innerHTML = `<i class="fas fa-chevron-down"></i>`;
      } else {
        inner.style.display = "block";
        collapseSettings.innerHTML = `<i class="fas fa-chevron-up"></i>`;
      }
    });

    // Minimizar
    minBtn.addEventListener("click", () => {
      state.minimized = !state.minimized;
      if (state.minimized) {
        root.classList.add("wplace-minimized");
        minBtn.innerHTML = `<i class="fas fa-plus"></i>`;
      } else {
        root.classList.remove("wplace-minimized");
        minBtn.innerHTML = `<i class="fas fa-minus"></i>`;
      }
    });

    // Alternar tema rápido
    themeToggle.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      themeSelect.value = state.theme;
      applyTheme();
      utils.showToast(utils.t("themeChanged"), currentThemeObj());
    });

    // Alternar idioma rápido
    langToggle.addEventListener("click", () => {
      state.language = state.language === "pt" ? "en" : "pt";
      langSelect.value = state.language;
      refreshTexts();
      utils.showToast(utils.t("langChanged"), currentThemeObj());
    });

    function applySettingsFn() {
      state.settings.order = orderSelect.value;
      state.settings.speed = speedSelect.value;
      state.settings.skipWhite = !!skipWhiteToggle.checked;
      state.settings.skipTransparent = !!skipTransToggle.checked;
      state.theme = themeSelect.value;
      state.language = langSelect.value;
      applyTheme();
      if (state.imageLoaded) buildPixelList();
      updateUI("modeUpdated","success");
      refreshTexts();
    }
    applySettings.addEventListener("click", applySettingsFn);

    function refreshTexts() {
      root.querySelector("#titleText").textContent = utils.t("title");
      btnInit.querySelector("span").textContent = utils.t("initBot");
      btnUpload.querySelector("span").textContent = utils.t("uploadImage");
      btnResize.querySelector("span").textContent = utils.t("resizeImage");
      btnPos.querySelector("span").textContent = utils.t("selectPosition");
      btnStart.querySelector("span").textContent = utils.t("startPainting");
      btnStop.querySelector("span").textContent = utils.t(state.running ? "stopPainting":"stopPainting");
      btnRebuild.querySelector("span").textContent = utils.t("rebuildList");
      minBtn.title = utils.t("minimize");
      themeToggle.title = utils.t("theme");
      langToggle.title = utils.t("language");
      themeSelect.querySelectorAll("option").forEach(o => {
        if (o.value === "dark") o.textContent = utils.t("theme_dark");
        if (o.value === "light") o.textContent = utils.t("theme_light");
      });
      orderSelect.querySelectorAll("option").forEach(o => {
        if (o.value === "ltr") o.textContent = utils.t("order_ltr");
        if (o.value === "rtl") o.textContent = utils.t("order_rtl");
        if (o.value === "random") o.textContent = utils.t("order_random");
      });
      speedSelect.querySelectorAll("option").forEach(o => {
        if (o.value === "safe") o.textContent = utils.t("speed_safe");
        if (o.value === "normal") o.textContent = utils.t("speed_normal");
        if (o.value === "fast") o.textContent = utils.t("speed_fast");
      });
      updateStats();
    }

    // Eventos principais
    btnInit.addEventListener("click", async () => {
      updateUI("checkingColors");
      state.availableColors = utils.extractAvailableColors();
      if (state.availableColors.length === 0) {
        updateUI("noColorsFound", "error");
        utils.showToast(utils.t("noColorsFound"), currentThemeObj());
        return;
      }
      state.colorsChecked = true;
      btnUpload.disabled = false;
      btnPos.disabled = false;
      btnInit.disabled = true;
      updateUI("colorsFound","success",{ count: state.availableColors.length });
      updateStats();
    });

    btnUpload.addEventListener("click", async () => {
      try {
        updateUI("loadingImage");
        const base64 = await utils.createImageUploader();
        const processor = new ImageProcessor(base64);
        await processor.load();
        const { width, height } = processor.getDimensions();
        const data = processor.getPixelData();
        state.imageData = { width, height, pixels: data, totalPixels: 0, processor };
        state.imageLoaded = true;
        state.paintedPixels = 0;
        buildPixelList();
        btnResize.disabled = false;
        btnRebuild.disabled = false;
        if (state.startPosition) btnStart.disabled = false;
        updateUI("imageLoaded","success",{ count: state.imageData.totalPixels });
        updateStats();
      } catch {
        updateUI("imageError","error");
      }
    });

    btnResize.addEventListener("click", openResize);

    // Selecionar posição
    btnPos.addEventListener("click", () => {
      const nativeFetch = window.fetch;
      updateUI("waitingPosition");
      utils.showToast(utils.t("selectPositionAlert"), currentThemeObj(), 4000);
      let active = true;
      setTimeout(() => {
        if (active) {
          window.fetch = nativeFetch;
          updateUI("positionTimeout","error");
        }
      }, 120000);

      window.fetch = async (url, options) => {
        if (typeof url === "string" &&
            url.includes("https://backend.wplace.live/s0/pixel/") &&
            options?.method?.toUpperCase() === "POST") {
          try {
            const resp = await nativeFetch(url, options);
            const clone = resp.clone();
            const json = await clone.json();
            if (json?.painted === 1 && active) {
              const match = url.match(/\/pixel\/(\d+)\/(\d+)/);
              if (match) state.region = { x: +match[1], y: +match[2] };
              const body = JSON.parse(options.body);
              if (body?.coords) {
                state.startPosition = { x: body.coords[0], y: body.coords[1] };
                if (state.imageLoaded) btnStart.disabled = false;
                updateUI("positionSet","success");
                utils.showToast(utils.t("positionSet"), currentThemeObj());
                active = false;
                window.fetch = nativeFetch;
              }
            }
            return resp;
          } catch {
            return nativeFetch(url, options);
          }
        }
        return nativeFetch(url, options);
      };
    });

    btnRebuild.addEventListener("click", () => {
      buildPixelList();
    });

    btnStart.addEventListener("click", async () => {
      if (!state.imageLoaded || !state.startPosition || !state.region) {
        updateUI("missingRequirements","error");
        return;
      }
      state.running = true;
      state.stopFlag = false;
      btnStart.disabled = true;
      btnStop.disabled = false;
      btnUpload.disabled = true;
      btnResize.disabled = true;
      btnPos.disabled = true;
      btnRebuild.disabled = true;
      updateUI("startPaintingMsg","success");
      state.perf.startTime = performance.now();
      state.perf.paintedAtStart = state.paintedPixels;
      try {
        await paintingLoop();
      } catch {
        updateUI("paintingError","error");
      } finally {
        btnStop.disabled = true;
        btnUpload.disabled = false;
        btnResize.disabled = false;
        btnPos.disabled = false;
        btnRebuild.disabled = false;
        if (state.stopFlag) {
          btnStart.disabled = false;
        }
        state.running = false;
      }
    });

    btnStop.addEventListener("click", () => {
      state.stopFlag = true;
      updateUI("paintingStopped","warning");
      utils.showToast(utils.t("confirmStop"), currentThemeObj());
    });

    // Expor refreshTexts no escopo
    window._refreshTexts = refreshTexts;
  }

  // ---------------------------------------------------------------------------
  // Painting loop usando pixelList
  // ---------------------------------------------------------------------------
  async function paintingLoop() {
    const { x: baseX, y: baseY } = state.startPosition;
    const { x: regionX, y: regionY } = state.region;
    const pixelDelay = utils.getPixelDelay();

    while (state.pixelIndex < state.pixelList.length) {
      if (state.stopFlag) {
        updateUI("paintingPaused","warning", { x: state.pixelList[state.pixelIndex]?.x ?? 0, y: state.pixelList[state.pixelIndex]?.y ?? 0 });
        updateStats();
        return;
      }

      if (state.currentCharges < 1) {
        updateUI("noCharges","warning",{ time: utils.formatTime(state.cooldown) });
        await utils.sleep(state.cooldown);
        const fresh = await api.getCharges();
        state.currentCharges = fresh.charges;
        state.cooldown = fresh.cooldown;
      }

      const px = state.pixelList[state.pixelIndex];
      const nearestColorId = mapToNearestColor([px.r, px.g, px.b], state.availableColors);

      const painted = await api.paintPixelInRegion(regionX, regionY, baseX + px.x, baseY + px.y, nearestColorId);
      if (painted) {
        state.paintedPixels++;
        state.currentCharges--;
        state.perf.recent.push({ t: performance.now() });
        if (state.paintedPixels % CONFIG.LOG_INTERVAL === 0) {
          updateUI("paintingProgress","default",{ painted: state.paintedPixels, total: state.totalPixels });
          updateStats();
        }
      }

      state.pixelIndex++;
      await utils.sleep(pixelDelay);
    }

    updateUI("paintingComplete","success",{ count: state.paintedPixels });
    updateStats();
  }

  // ---------------------------------------------------------------------------
  // Inicialização
  // ---------------------------------------------------------------------------
  initUI();

})();