(async () => {
  const CONFIG = {
    COOLDOWN_DEFAULT: 31000,
    TRANSPARENCY_THRESHOLD: 100,
    WHITE_THRESHOLD: 250,
    LOG_INTERVAL: 10,
    THEME: {
      primary: '#10141c',
      secondary: '#182230',
      accent: '#293446',
      text: '#f5f7fa',
      highlight: '#5dd6ff',
      success: '#35d07f',
      error: '#ff4d61',
      warning: '#ffb347'
    }
  };

  const TEXTS = {
    pt: {
      title: "WPlace Auto-Image",
      initBot: "Iniciar Auto-BOT",
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
      initMessage: "Clique em 'Iniciar Auto-BOT' para começar",
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
      initBot: "Start Auto-BOT",
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
    // Other languages omitted for brevity (retain original ones if needed)
  };

  const state = {
    running: false,
    imageLoaded: false,
    processing: false,
    totalPixels: 0,
    paintedPixels: 0,
    availableColors: [],
    currentCharges: 0,
    cooldown: CONFIG.COOLDOWN_DEFAULT,
    imageData: null,
    stopFlag: false,
    colorsChecked: false,
    startPosition: null,
    selectingPosition: false,
    region: null,
    minimized: false,
    lastPosition: { x: 0, y: 0 },
    estimatedTime: 0,
    language: 'en'
  };

  function detectLanguage() {
    const userLang = navigator.language.split('-')[0];
    if (TEXTS[userLang]) {
      state.language = userLang;
    }
  }

  const Utils = {
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    colorDistance: (a, b) => Math.sqrt(
      Math.pow(a[0] - b[0], 2) +
      Math.pow(a[1] - b[1], 2) +
      Math.pow(a[2] - b[2], 2)
    ),
    createImageUploader: () => new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg';
      input.onchange = () => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.readAsDataURL(input.files[0]);
      };
      input.click();
    }),
    extractAvailableColors: () => {
      const colorElements = document.querySelectorAll('[id^="color-"]');
      return Array.from(colorElements)
        .filter(el => !el.querySelector('svg'))
        .filter(el => {
          const id = parseInt(el.id.replace('color-', ''));
          return id !== 0 && id !== 5;
        })
        .map(el => {
          const id = parseInt(el.id.replace('color-', ''));
          const rgbStr = el.style.backgroundColor.match(/\d+/g);
          const rgb = rgbStr ? rgbStr.map(Number) : [0, 0, 0];
            return { id, rgb };
        });
    },
    formatTime: ms => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      let result = '';
      if (days > 0) result += `${days}d `;
      if (hours > 0 || days > 0) result += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
      result += `${seconds}s`;
      return result;
    },
    showAlert: (message, type = 'info') => {
      const alert = document.createElement('div');
      alert.style.position = 'fixed';
      alert.style.top = '16px';
      alert.style.left = '50%';
      alert.style.transform = 'translateX(-50%)';
      alert.style.padding = '12px 18px';
      alert.style.background = CONFIG.THEME.secondary;
      alert.style.border = `1px solid ${CONFIG.THEME.highlight}`;
      alert.style.color = CONFIG.THEME.text;
      alert.style.borderRadius = '10px';
      alert.style.font = '500 14px "Segoe UI",sans-serif';
      alert.style.zIndex = '10000';
      alert.style.display = 'flex';
      alert.style.alignItems = 'center';
      alert.style.gap = '10px';
      alert.style.backdropFilter = 'blur(6px)';
      alert.style.boxShadow = '0 4px 18px -2px rgba(0,0,0,.55)';
      alert.innerHTML = `<span style="filter:drop-shadow(0 0 4px rgba(255,255,255,0.15))">${message}</span>`;
      document.body.appendChild(alert);
      setTimeout(() => {
        alert.style.transition = 'all .4s';
        alert.style.opacity = '0';
        alert.style.transform += ' translateY(-8px)';
        setTimeout(() => alert.remove(), 450);
      }, 2600);
    },
    calculateEstimatedTime: (remainingPixels, currentCharges, cooldown) => {
      const pixelsPerCharge = currentCharges > 0 ? currentCharges : 0;
      const fullCycles = Math.ceil((remainingPixels - pixelsPerCharge) / Math.max(currentCharges, 1));
      return (fullCycles * cooldown) + ((remainingPixels - 1) * 100);
    },
    isWhitePixel: (r, g, b) =>
      r >= CONFIG.WHITE_THRESHOLD &&
      g >= CONFIG.WHITE_THRESHOLD &&
      b >= CONFIG.WHITE_THRESHOLD,
    t: (key, params = {}) => {
      let text = TEXTS[state.language]?.[key] || TEXTS.en[key] || key;
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, v);
      }
      return text;
    }
  };

  const WPlaceService = {
    async paintPixelInRegion(regionX, regionY, pixelX, pixelY, color) {
      try {
        const res = await fetch(`https://backend.wplace.live/s0/pixel/${regionX}/${regionY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          credentials: 'include',
          body: JSON.stringify({ coords: [pixelX, pixelY], colors: [color] })
        });
        const data = await res.json();
        return data?.painted === 1;
      } catch {
        return false;
      }
    },
    async getCharges() {
      try {
        const res = await fetch('https://backend.wplace.live/me', { credentials: 'include' });
        const data = await res.json();
        return {
          charges: data.charges?.count || 0,
          cooldown: data.charges?.cooldownMs || CONFIG.COOLDOWN_DEFAULT
        };
      } catch {
        return { charges: 0, cooldown: CONFIG.COOLDOWN_DEFAULT };
      }
    }
  };

  class ImageProcessor {
    constructor(imageSrc) {
      this.imageSrc = imageSrc;
      this.img = new Image();
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.previewCanvas = document.createElement('canvas');
      this.previewCtx = this.previewCanvas.getContext('2d');
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
      return { width: this.canvas.width, height: this.canvas.height };
    }
    resize(newWidth, newHeight) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = newWidth;
      tempCanvas.height = newHeight;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(this.img, 0, 0, newWidth, newHeight);
      this.canvas.width = newWidth;
      this.canvas.height = newHeight;
      this.ctx.drawImage(tempCanvas, 0, 0);
      return this.getPixelData();
    }
    generatePreview(newWidth, newHeight) {
      this.previewCanvas.width = newWidth;
      this.previewCanvas.height = newHeight;
      this.previewCtx.imageSmoothingEnabled = false;
      this.previewCtx.drawImage(this.img, 0, 0, newWidth, newHeight);
      return this.previewCanvas.toDataURL();
    }
  }

  function findClosestColor(rgb, palette) {
    return palette.reduce((closest, current) => {
      const currentDistance = Utils.colorDistance(rgb, current.rgb);
      return currentDistance < closest.distance
        ? { color: current, distance: currentDistance }
        : closest;
    }, { color: palette[0], distance: Utils.colorDistance(rgb, palette[0].rgb) }).color.id;
  }

  async function createUI() {
    detectLanguage();

    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesome);

    const style = document.createElement('style');
    style.textContent = `
      @keyframes wplaceSlide {
        from { transform: translateY(12px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes glowPulse {
        0% { box-shadow: 0 0 0 0 rgba(93,214,255,0.45); }
        70% { box-shadow: 0 0 0 10px rgba(93,214,255,0); }
        100% { box-shadow: 0 0 0 0 rgba(93,214,255,0); }
      }
      #wplace-image-bot-container {
        position: fixed;
        top: 24px;
        right: 24px;
        width: 340px;
        background: linear-gradient(155deg, rgba(24,34,48,0.92), rgba(16,20,28,0.92));
        -webkit-backdrop-filter: blur(14px) saturate(130%);
        backdrop-filter: blur(14px) saturate(130%);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px;
        padding: 0;
        box-shadow: 0 18px 48px -12px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset;
        z-index: 9998;
        font-family: "Segoe UI", Roboto, Oxygen, sans-serif;
        color: ${CONFIG.THEME.text};
        animation: wplaceSlide .45s cubic-bezier(.3,.7,.4,1);
        overflow: hidden;
      }
      .wplace-header {
        position: relative;
        padding: 14px 18px 12px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: radial-gradient(at 25% 0%, rgba(93,214,255,0.15), rgba(93,214,255,0) 70%);
        user-select: none;
      }
      .wplace-header-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        letter-spacing: .5px;
        font-size: 15px;
      }
      .wplace-header-title i {
        color: ${CONFIG.THEME.highlight};
        filter: drop-shadow(0 0 4px rgba(93,214,255,0.35));
      }
      .wplace-header-controls {
        display: flex;
        gap: 4px;
      }
      .wplace-header-btn {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255,255,255,0.08);
        background: linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
        border-radius: 10px;
        cursor: pointer;
        color: ${CONFIG.THEME.text};
        font-size: 13px;
        transition: .25s;
      }
      .wplace-header-btn:hover {
        border-color: rgba(93,214,255,0.6);
        color: ${CONFIG.THEME.highlight};
        box-shadow: 0 0 0 1px rgba(93,214,255,0.5), 0 4px 12px -4px rgba(93,214,255,0.4);
      }
      .wplace-content {
        padding: 4px 18px 18px 18px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .wplace-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill,minmax(130px,1fr));
        gap: 10px;
      }
      .wplace-btn {
        position: relative;
        border: 1px solid rgba(255,255,255,0.08);
        background: linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02));
        color: ${CONFIG.THEME.text};
        padding: 10px 10px;
        font-size: 12.5px;
        font-weight: 600;
        letter-spacing: .3px;
        border-radius: 11px;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        cursor: pointer;
        transition: .28s;
        min-height: 40px;
        overflow: hidden;
      }
      .wplace-btn:before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(160deg, rgba(93,214,255,0.18), rgba(93,214,255,0) 60%);
        opacity: 0;
        transition: .35s;
      }
      .wplace-btn:hover:before {
        opacity: 1;
      }
      .wplace-btn:hover {
        border-color: rgba(93,214,255,0.5);
        box-shadow: 0 4px 18px -6px rgba(93,214,255,0.55);
        transform: translateY(-2px);
      }
      .wplace-btn:disabled {
        opacity: .35;
        cursor: not-allowed;
        filter: grayscale(.5);
        transform: none;
      }
      .wplace-btn-primary { color: ${CONFIG.THEME.highlight}; }
      .wplace-btn-select { color: #ffe08a; }
      .wplace-btn-start { color: ${CONFIG.THEME.success}; }
      .wplace-btn-stop { color: ${CONFIG.THEME.error}; }
      .panel {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 14px 16px 16px;
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 16px;
        background: linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015));
        position: relative;
      }
      .panel:before {
        content:"";
        position:absolute;
        inset:0;
        border-radius:16px;
        padding:1px;
        background: linear-gradient(140deg,rgba(93,214,255,0.4),rgba(93,214,255,0) 45%);
        -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
        -webkit-mask-composite:xor;
                mask-composite:exclude;
        pointer-events:none;
        opacity:.35;
      }
      .panel-title {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1.4px;
        font-weight: 700;
        color: ${CONFIG.THEME.highlight};
        opacity: .85;
        display:flex;
        align-items:center;
        gap:6px;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill,minmax(130px,1fr));
        gap: 10px;
      }
      .stat-card {
        position: relative;
        border: 1px solid rgba(255,255,255,0.08);
        background: linear-gradient(150deg, rgba(255,255,255,0.07), rgba(255,255,255,0.015));
        border-radius: 12px;
        padding: 10px 12px 9px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 12px;
        line-height: 1.2;
        min-height: 62px;
        overflow: hidden;
      }
      .stat-card:before {
        content:"";
        position:absolute;
        inset:0;
        background: radial-gradient(circle at 80% 20%, rgba(93,214,255,0.3), rgba(93,214,255,0) 70%);
        opacity:.18;
        pointer-events:none;
      }
      .stat-label {
        font-size: 10px;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        opacity: .6;
        font-weight: 600;
      }
      .stat-value {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: .3px;
        display:flex;
        align-items:center;
        gap:6px;
      }
      .progress-wrapper {
        display:flex;
        flex-direction:column;
        gap:8px;
      }
      .progress-bar-outer {
        position: relative;
        width: 100%;
        height: 12px;
        background: linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
        border-radius: 10px;
        overflow: hidden;
        border:1px solid rgba(255,255,255,0.08);
      }
      .wplace-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, ${CONFIG.THEME.highlight}, #7effc8);
        width: 0%;
        transition: width .45s cubic-bezier(.25,.7,.4,1);
        box-shadow: 0 0 0 1px rgba(93,214,255,0.4), 0 4px 18px -4px rgba(93,214,255,0.7);
      }
      .status-zone {
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        padding: 14px 16px;
        font-size: 13px;
        line-height: 1.3;
        position:relative;
        background: linear-gradient(140deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02));
        display:flex;
        gap:10px;
        align-items:flex-start;
      }
      .status-zone:before{
        content:"";
        position:absolute;
        inset:0;
        background:radial-gradient(circle at 12% 20%,rgba(93,214,255,0.32),rgba(93,214,255,0) 75%);
        opacity:.25;
        pointer-events:none;
      }
      .status-icon {
        width: 30px;
        height: 30px;
        display:grid;
        place-items:center;
        border-radius:10px;
        background:linear-gradient(145deg,rgba(93,214,255,0.28),rgba(93,214,255,0.08));
        color:${CONFIG.THEME.highlight};
        font-size:14px;
        box-shadow:0 0 0 1px rgba(93,214,255,0.4);
      }
      .wplace-status {
        flex:1;
        font-weight:500;
        letter-spacing:.3px;
      }
      .status-success { color: ${CONFIG.THEME.success}; }
      .status-error { color: ${CONFIG.THEME.error}; }
      .status-warning { color: ${CONFIG.THEME.warning}; }
      .wplace-minimized .wplace-content { display: none; }
      .resize-container {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(160deg, #182230, #10141c);
        padding: 26px 28px 28px;
        border-radius: 22px;
        z-index: 10000;
        width: clamp(300px, 520px, 90%);
        border:1px solid rgba(255,255,255,0.08);
        box-shadow: 0 18px 42px -10px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,0.05) inset;
        animation: wplaceSlide .4s ease;
      }
      .resize-container h3 {
        margin:0 0 6px;
        font-size:16px;
        letter-spacing:.5px;
        font-weight:600;
        display:flex;
        align-items:center;
        gap:8px;
        color:${CONFIG.THEME.highlight};
      }
      .resize-controls {
        display:flex;
        flex-direction:column;
        gap:16px;
        margin-top:10px;
      }
      .resize-controls label {
        display:flex;
        flex-direction:column;
        gap:6px;
        font-size:12px;
        font-weight:600;
        letter-spacing:.4px;
        opacity:.9;
      }
      .resize-slider {
        width:100%;
        appearance:none;
        height:8px;
        border-radius:100px;
        background:linear-gradient(90deg,#203041,#16202c);
        border:1px solid rgba(255,255,255,0.1);
        outline:none;
      }
      .resize-slider::-webkit-slider-thumb{
        appearance:none;
        width:20px;
        height:20px;
        background:linear-gradient(145deg,${CONFIG.THEME.highlight},#9dffe0);
        border-radius:50%;
        cursor:pointer;
        box-shadow:0 0 0 4px rgba(93,214,255,0.35),0 4px 14px -4px rgba(93,214,255,0.7);
        border:none;
      }
      #resizePreview {
        max-width:100%;
        max-height:260px;
        border:1px solid rgba(255,255,255,0.1);
        border-radius:14px;
        background:#0c1015;
        object-fit:contain;
        box-shadow:0 4px 18px -6px rgba(0,0,0,.7);
      }
      .resize-buttons {
        display:flex;
        justify-content:flex-end;
        gap:12px;
      }
      .resize-overlay {
        position: fixed;
        inset: 0;
        background: rgba(10,14,20,0.85);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        z-index: 9999;
        display: none;
      }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'wplace-image-bot-container';
    container.innerHTML = `
      <div class="wplace-header">
        <div class="wplace-header-title">
          <i class="fas fa-shapes"></i>
          <span>${Utils.t('title')}</span>
        </div>
        <div class="wplace-header-controls">
          <button id="minimizeBtn" class="wplace-header-btn" title="${Utils.t('minimize')}">
            <i class="fas fa-minus"></i>
          </button>
        </div>
      </div>
      <div class="wplace-content">
        <div class="panel">
          <div class="panel-title">
            <i class="fas fa-cogs"></i> SETUP
          </div>
          <div class="wplace-grid">
            <button id="initBotBtn" class="wplace-btn wplace-btn-primary">
              <i class="fas fa-robot"></i><span>${Utils.t('initBot')}</span>
            </button>
            <button id="uploadBtn" class="wplace-btn" disabled>
              <i class="fas fa-upload"></i><span>${Utils.t('uploadImage')}</span>
            </button>
            <button id="resizeBtn" class="wplace-btn" disabled>
              <i class="fas fa-expand"></i><span>${Utils.t('resizeImage')}</span>
            </button>
            <button id="selectPosBtn" class="wplace-btn wplace-btn-select" disabled>
              <i class="fas fa-crosshairs"></i><span>${Utils.t('selectPosition')}</span>
            </button>
            <button id="startBtn" class="wplace-btn wplace-btn-start" disabled>
              <i class="fas fa-play"></i><span>${Utils.t('startPainting')}</span>
            </button>
            <button id="stopBtn" class="wplace-btn wplace-btn-stop" disabled>
              <i class="fas fa-stop"></i><span>${Utils.t('stopPainting')}</span>
            </button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">
            <i class="fas fa-chart-line"></i> TRACKING
          </div>
          <div class="progress-wrapper">
            <div class="progress-bar-outer">
              <div id="progressBar" class="wplace-progress-bar"></div>
            </div>
          </div>
          <div id="statsArea" class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">${Utils.t('progress')}</div>
              <div class="stat-value"><i class="fas fa-info-circle"></i> 0%</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">${Utils.t('pixels')}</div>
              <div class="stat-value"><i class="fas fa-paint-brush"></i> 0/0</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">${Utils.t('charges')}</div>
              <div class="stat-value"><i class="fas fa-bolt"></i> 0</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">${Utils.t('estimatedTime')}</div>
              <div class="stat-value"><i class="fas fa-clock"></i> 0s</div>
            </div>
          </div>
        </div>

        <div class="status-zone">
          <div class="status-icon">
            <i class="fas fa-terminal"></i>
          </div>
          <div id="statusText" class="wplace-status status-default">
            ${Utils.t('waitingInit')}
          </div>
        </div>
      </div>
    `;

    const resizeContainer = document.createElement('div');
    resizeContainer.className = 'resize-container';
    resizeContainer.innerHTML = `
      <h3><i class="fas fa-expand"></i> ${Utils.t('resizeImage')}</h3>
      <div class="resize-controls">
        <label>
          ${Utils.t('width')}: <span id="widthValue">0</span>px
          <input type="range" id="widthSlider" class="resize-slider" min="10" max="500" value="100">
        </label>
        <label>
          ${Utils.t('height')}: <span id="heightValue">0</span>px
          <input type="range" id="heightSlider" class="resize-slider" min="10" max="500" value="100">
        </label>
        <label style="flex-direction:row;align-items:center;gap:8px;font-size:12px;">
          <input type="checkbox" id="keepAspect" checked style="transform:scale(1.15);accent-color:${CONFIG.THEME.highlight}">
          ${Utils.t('keepAspect')}
        </label>
        <img id="resizePreview" src="">
        <div class="resize-buttons">
          <button id="confirmResize" class="wplace-btn wplace-btn-start" style="min-width:120px;justify-content:center;">
            <i class="fas fa-check"></i><span>${Utils.t('apply')}</span>
          </button>
          <button id="cancelResize" class="wplace-btn wplace-btn-stop" style="min-width:120px;justify-content:center;">
            <i class="fas fa-times"></i><span>${Utils.t('cancel')}</span>
          </button>
        </div>
      </div>
    `;

    const resizeOverlay = document.createElement('div');
    resizeOverlay.className = 'resize-overlay';

    document.body.appendChild(container);
    document.body.appendChild(resizeOverlay);
    document.body.appendChild(resizeContainer);

    const header = container.querySelector('.wplace-header');
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    header.onmousedown = dragMouseDown;
    function dragMouseDown(e) {
      if (e.target.closest('.wplace-header-btn')) return;
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
      container.style.top = (container.offsetTop - pos2) + "px";
      container.style.left = (container.offsetLeft - pos1) + "px";
    }
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }

    const initBotBtn = container.querySelector('#initBotBtn');
    const uploadBtn = container.querySelector('#uploadBtn');
    const resizeBtn = container.querySelector('#resizeBtn');
    const selectPosBtn = container.querySelector('#selectPosBtn');
    const startBtn = container.querySelector('#startBtn');
    const stopBtn = container.querySelector('#stopBtn');
    const minimizeBtn = container.querySelector('#minimizeBtn');
    const statusText = container.querySelector('#statusText');
    const progressBar = container.querySelector('#progressBar');
    const statsArea = container.querySelector('#statsArea');

    const widthSlider = resizeContainer.querySelector('#widthSlider');
    const heightSlider = resizeContainer.querySelector('#heightSlider');
    const widthValue = resizeContainer.querySelector('#widthValue');
    const heightValue = resizeContainer.querySelector('#heightValue');
    const keepAspect = resizeContainer.querySelector('#keepAspect');
    const resizePreview = resizeContainer.querySelector('#resizePreview');
    const confirmResize = resizeContainer.querySelector('#confirmResize');
    const cancelResize = resizeContainer.querySelector('#cancelResize');

    minimizeBtn.addEventListener('click', () => {
      state.minimized = !state.minimized;
      if (state.minimized) {
        container.classList.add('wplace-minimized');
        minimizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
      } else {
        container.classList.remove('wplace-minimized');
        minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
      }
    });

    window.updateUI = (messageKey, type = 'default', params = {}) => {
      const message = Utils.t(messageKey, params);
      statusText.textContent = message;
      statusText.className = `wplace-status status-${type}`;
      statusText.parentElement.querySelector('.status-icon').className = 'status-icon';
      if (type === 'success') statusText.parentElement.querySelector('.status-icon').style.background = 'linear-gradient(145deg,rgba(53,208,127,0.25),rgba(53,208,127,0.08))';
      if (type === 'error') statusText.parentElement.querySelector('.status-icon').style.background = 'linear-gradient(145deg,rgba(255,77,97,0.25),rgba(255,77,97,0.08))';
      if (type === 'warning') statusText.parentElement.querySelector('.status-icon').style.background = 'linear-gradient(145deg,rgba(255,179,71,0.25),rgba(255,179,71,0.08))';
    };

    window.updateStats = async () => {
      if (!state.colorsChecked || !state.imageLoaded) return;
      const { charges, cooldown } = await WPlaceService.getCharges();
      state.currentCharges = Math.floor(charges);
      state.cooldown = cooldown;

      const progress = state.totalPixels > 0 ?
        Math.round((state.paintedPixels / state.totalPixels) * 100) : 0;
      const remainingPixels = state.totalPixels - state.paintedPixels;

      state.estimatedTime = Utils.calculateEstimatedTime(
        remainingPixels,
        state.currentCharges,
        state.cooldown
      );

      progressBar.style.width = `${progress}%`;

      statsArea.innerHTML = `
        <div class="stat-card">
          <div class="stat-label">${Utils.t('progress')}</div>
          <div class="stat-value"><i class="fas fa-chart-line"></i> ${progress}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${Utils.t('pixels')}</div>
          <div class="stat-value"><i class="fas fa-paint-brush"></i> ${state.paintedPixels}/${state.totalPixels}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${Utils.t('charges')}</div>
          <div class="stat-value"><i class="fas fa-bolt"></i> ${Math.floor(state.currentCharges)}</div>
        </div>
        ${state.imageLoaded ? `
        <div class="stat-card">
          <div class="stat-label">${Utils.t('estimatedTime')}</div>
          <div class="stat-value"><i class="fas fa-clock"></i> ${Utils.formatTime(state.estimatedTime)}</div>
        </div>` : ''}
      `;
    };

    function showResizeDialog(processor) {
      const { width, height } = processor.getDimensions();
      const aspectRatio = width / height;
      widthSlider.value = width;
      heightSlider.value = height;
      widthValue.textContent = width;
      heightValue.textContent = height;
      resizePreview.src = processor.img.src;
      resizeOverlay.style.display = 'block';
      resizeContainer.style.display = 'block';

      const updatePreview = () => {
        const newWidth = parseInt(widthSlider.value);
        const newHeight = parseInt(heightSlider.value);
        widthValue.textContent = newWidth;
        heightValue.textContent = newHeight;
        resizePreview.src = processor.generatePreview(newWidth, newHeight);
      };
      widthSlider.oninput = () => {
        if (keepAspect.checked) {
          const newWidth = parseInt(widthSlider.value);
          const newHeight = Math.round(newWidth / aspectRatio);
          heightSlider.value = newHeight;
        }
        updatePreview();
      };
      heightSlider.oninput = () => {
        if (keepAspect.checked) {
          const newHeight = parseInt(heightSlider.value);
          const newWidth = Math.round(newHeight * aspectRatio);
          widthSlider.value = newWidth;
        }
        updatePreview();
      };
      confirmResize.onclick = () => {
        const newWidth = parseInt(widthSlider.value);
        const newHeight = parseInt(heightSlider.value);
        const newPixels = processor.resize(newWidth, newHeight);
        let totalValidPixels = 0;
        for (let y = 0; y < newHeight; y++) {
          for (let x = 0; x < newWidth; x++) {
            const idx = (y * newWidth + x) * 4;
            const r = newPixels[idx];
            const g = newPixels[idx + 1];
            const b = newPixels[idx + 2];
            const alpha = newPixels[idx + 3];
            if (alpha < CONFIG.TRANSPARENCY_THRESHOLD) continue;
            if (Utils.isWhitePixel(r, g, b)) continue;
            totalValidPixels++;
          }
        }
        state.imageData.pixels = newPixels;
        state.imageData.width = newWidth;
        state.imageData.height = newHeight;
        state.imageData.totalPixels = totalValidPixels;
        state.totalPixels = totalValidPixels;
        state.paintedPixels = 0;
        updateStats();
        updateUI('resizeSuccess', 'success', { width: newWidth, height: newHeight });
        closeResizeDialog();
      };
      cancelResize.onclick = closeResizeDialog;
    }

    function closeResizeDialog() {
      resizeOverlay.style.display = 'none';
      resizeContainer.style.display = 'none';
    }

    initBotBtn.addEventListener('click', async () => {
      try {
        updateUI('checkingColors', 'default');
        state.availableColors = Utils.extractAvailableColors();
        if (state.availableColors.length === 0) {
          Utils.showAlert(Utils.t('noColorsFound'), 'error');
          updateUI('noColorsFound', 'error');
          return;
        }
        state.colorsChecked = true;
        uploadBtn.disabled = false;
        selectPosBtn.disabled = false;
        initBotBtn.style.display = 'none';
        updateUI('colorsFound', 'success', { count: state.availableColors.length });
        updateStats();
      } catch {
        updateUI('imageError', 'error');
      }
    });

    uploadBtn.addEventListener('click', async () => {
      try {
        updateUI('loadingImage', 'default');
        const imageSrc = await Utils.createImageUploader();
        const processor = new ImageProcessor(imageSrc);
        await processor.load();
        const { width, height } = processor.getDimensions();
        const pixels = processor.getPixelData();
        let totalValidPixels = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            const alpha = pixels[idx + 3];
            if (alpha < CONFIG.TRANSPARENCY_THRESHOLD) continue;
            if (Utils.isWhitePixel(r, g, b)) continue;
            totalValidPixels++;
          }
        }
        state.imageData = { width, height, pixels, totalPixels: totalValidPixels, processor };
        state.totalPixels = totalValidPixels;
        state.paintedPixels = 0;
        state.imageLoaded = true;
        state.lastPosition = { x: 0, y: 0 };
        resizeBtn.disabled = false;
        if (state.startPosition) startBtn.disabled = false;
        updateStats();
        updateUI('imageLoaded', 'success', { count: totalValidPixels });
      } catch {
        updateUI('imageError', 'error');
      }
    });

    resizeBtn.addEventListener('click', () => {
      if (state.imageLoaded && state.imageData.processor) {
        showResizeDialog(state.imageData.processor);
      }
    });

    selectPosBtn.addEventListener('click', async () => {
      if (state.selectingPosition) return;
      state.selectingPosition = true;
      state.startPosition = null;
      state.region = null;
      startBtn.disabled = true;
      Utils.showAlert(Utils.t('selectPositionAlert'), 'info');
      updateUI('waitingPosition', 'default');
      const originalFetch = window.fetch;
      window.fetch = async (url, options) => {
        if (typeof url === 'string' &&
            url.includes('https://backend.wplace.live/s0/pixel/') &&
            options?.method?.toUpperCase() === 'POST') {
          try {
            const response = await originalFetch(url, options);
            const clonedResponse = response.clone();
            const data = await clonedResponse.json();
            if (data?.painted === 1) {
              const regionMatch = url.match(/\/pixel\/(\d+)\/(\d+)/);
              if (regionMatch && regionMatch.length >= 3) {
                state.region = { x: parseInt(regionMatch[1]), y: parseInt(regionMatch[2]) };
              }
              const payload = JSON.parse(options.body);
              if (payload?.coords && Array.isArray(payload.coords)) {
                state.startPosition = { x: payload.coords[0], y: payload.coords[1] };
                state.lastPosition = { x: 0, y: 0 };
                if (state.imageLoaded) startBtn.disabled = false;
                window.fetch = originalFetch;
                state.selectingPosition = false;
                updateUI('positionSet', 'success');
              }
            }
            return response;
          } catch {
            return originalFetch(url, options);
          }
        }
        return originalFetch(url, options);
      };
      setTimeout(() => {
        if (state.selectingPosition) {
          window.fetch = originalFetch;
            state.selectingPosition = false;
          updateUI('positionTimeout', 'error');
          Utils.showAlert(Utils.t('positionTimeout'), 'error');
        }
      }, 120000);
    });

    startBtn.addEventListener('click', async () => {
      if (!state.imageLoaded || !state.startPosition || !state.region) {
        updateUI('missingRequirements', 'error');
        return;
      }
      state.running = true;
      state.stopFlag = false;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      uploadBtn.disabled = true;
      selectPosBtn.disabled = true;
      resizeBtn.disabled = true;
      updateUI('startPaintingMsg', 'success');
      try {
        await processImage();
      } catch {
        updateUI('paintingError', 'error');
      } finally {
        state.running = false;
        stopBtn.disabled = true;
        if (!state.stopFlag) {
          startBtn.disabled = true;
          uploadBtn.disabled = false;
          selectPosBtn.disabled = false;
          resizeBtn.disabled = false;
        } else {
          startBtn.disabled = false;
        }
      }
    });

    stopBtn.addEventListener('click', () => {
      state.stopFlag = true;
      state.running = false;
      stopBtn.disabled = true;
      updateUI('paintingStopped', 'warning');
    });
  }

  async function processImage() {
    const { width, height, pixels } = state.imageData;
    const { x: startX, y: startY } = state.startPosition;
    const { x: regionX, y: regionY } = state.region;
    let startRow = state.lastPosition.y || 0;
    let startCol = state.lastPosition.x || 0;
    outerLoop:
    for (let y = startRow; y < height; y++) {
      for (let x = (y === startRow ? startCol : 0); x < width; x++) {
        if (state.stopFlag) {
          state.lastPosition = { x, y };
          updateUI('paintingPaused', 'warning', { x, y });
          break outerLoop;
        }
        const idx = (y * width + x) * 4;
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const alpha = pixels[idx + 3];
        if (alpha < CONFIG.TRANSPARENCY_THRESHOLD) continue;
        if (Utils.isWhitePixel(r, g, b)) continue;
        const rgb = [r, g, b];
        const colorId = findClosestColor(rgb, state.availableColors);
        if (state.currentCharges < 1) {
          updateUI('noCharges', 'warning', { time: Utils.formatTime(state.cooldown) });
          await Utils.sleep(state.cooldown);
          const chargeUpdate = await WPlaceService.getCharges();
          state.currentCharges = chargeUpdate.charges;
          state.cooldown = chargeUpdate.cooldown;
        }
        const pixelX = startX + x;
        const pixelY = startY + y;
        const success = await WPlaceService.paintPixelInRegion(
          regionX,
          regionY,
          pixelX,
          pixelY,
          colorId
        );
        if (success) {
          state.paintedPixels++;
          state.currentCharges--;
          state.estimatedTime = Utils.calculateEstimatedTime(
            state.totalPixels - state.paintedPixels,
            state.currentCharges,
            state.cooldown
          );
          if (state.paintedPixels % CONFIG.LOG_INTERVAL === 0) {
            updateStats();
            updateUI('paintingProgress', 'default', {
              painted: state.paintedPixels,
              total: state.totalPixels
            });
          }
        }
      }
    }
    if (state.stopFlag) {
      updateUI('paintingStopped', 'warning');
    } else {
      updateUI('paintingComplete', 'success', { count: state.paintedPixels });
      state.lastPosition = { x: 0, y: 0 };
    }
    updateStats();
  }

  createUI();
})();