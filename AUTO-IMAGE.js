(async () => {
  const CONFIG = {
    COOLDOWN_DEFAULT: 31000,
    TRANSPARENCY_THRESHOLD: 100,
    WHITE_THRESHOLD: 250,
    LOG_INTERVAL: 10,
    THEME: {
      primary: '#000000',
      secondary: '#111111',
      accent: '#222222',
      text: '#ffffff',
      highlight: '#775ce3',
      success: '#00ff00',
      error: '#ff0000',
      warning: '#ffaa00'
    }
  };

  const TEXTS = {
    pt: {
      title: "WPlace Auto-Image",
      initBot: "Iniciar Auto-BOT",
      uploadImage: "Upload da Imagem",
      resizeImage: "Redimensionar Imagem",
      selectPosition: "Selecionar Posição",
      startPainting: "Iniciar Pintura",
      stopPainting: "Parar Pintura",
      checkingColors: "🔍 Verificando cores disponíveis...",
      noColorsFound: "❌ Abra a paleta de cores no site e tente novamente!",
      colorsFound: "✅ {count} cores disponíveis encontradas",
      loadingImage: "🖼️ Carregando imagem...",
      imageLoaded: "✅ Imagem carregada com {count} pixels válidos",
      imageError: "❌ Erro ao carregar imagem",
      selectPositionAlert: "Pinte o primeiro pixel na localização onde deseja que a arte comece!",
      waitingPosition: "👆 Aguardando você pintar o pixel de referência...",
      positionSet: "✅ Posição definida com sucesso!",
      positionTimeout: "❌ Tempo esgotado para selecionar posição",
      startPaintingMsg: "🎨 Iniciando pintura...",
      paintingProgress: "🧱 Progresso: {painted}/{total} pixels...",
      noCharges: "⌛ Sem cargas. Aguardando {time}...",
      paintingStopped: "⏹️ Pintura interrompida pelo usuário",
      paintingComplete: "✅ Pintura concluída! {count} pixels pintados.",
      paintingError: "❌ Erro durante a pintura",
      missingRequirements: "❌ Carregue uma imagem e selecione uma posição primeiro",
      progress: "Progresso",
      pixels: "Pixels",
      charges: "Cargas",
      estimatedTime: "Tempo estimado",
      initMessage: "Clique em 'Iniciar Auto-BOT' para começar",
      waitingInit: "Aguardando inicialização...",
      resizeSuccess: "✅ Imagem redimensionada para {width}x{height}",
      paintingPaused: "⏸️ Pintura pausada na posição X: {x}, Y: {y}"
    },
    en: {
      title: "WPlace Auto-Image",
      initBot: "Start Auto-BOT",
      uploadImage: "Upload Image",
      resizeImage: "Resize Image",
      selectPosition: "Select Position",
      startPainting: "Start Painting",
      stopPainting: "Stop Painting",
      checkingColors: "🔍 Checking available colors...",
      noColorsFound: "❌ Open the color palette on the site and try again!",
      colorsFound: "✅ {count} available colors found",
      loadingImage: "🖼️ Loading image...",
      imageLoaded: "✅ Image loaded with {count} valid pixels",
      imageError: "❌ Error loading image",
      selectPositionAlert: "Paint the first pixel at the location where you want the art to start!",
      waitingPosition: "👆 Waiting for you to paint the reference pixel...",
      positionSet: "✅ Position set successfully!",
      positionTimeout: "❌ Timeout for position selection",
      startPaintingMsg: "🎨 Starting painting...",
      paintingProgress: "🧱 Progress: {painted}/{total} pixels...",
      noCharges: "⌛ No charges. Waiting {time}...",
      paintingStopped: "⏹️ Painting stopped by user",
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
      paintingPaused: "⏸️ Painting paused at position X: {x}, Y: {y}"
    },
    fr: {
      title: "WPlace Auto-Image",
      initBot: "Démarrer Auto-BOT",
      uploadImage: "Télécharger l'image",
      resizeImage: "Redimensionner l'image",
      selectPosition: "Sélectionner la position",
      startPainting: "Commencer la peinture",
      stopPainting: "Arrêter la peinture",
      checkingColors: "🔍 Vérification des couleurs disponibles...",
      noColorsFound: "❌ Ouvrez la palette de couleurs sur le site et réessayez !",
      colorsFound: "✅ {count} couleurs disponibles trouvées",
      loadingImage: "🖼️ Chargement de l'image...",
      imageLoaded: "✅ Image chargée avec {count} pixels valides",
      imageError: "❌ Erreur lors du chargement de l'image",
      selectPositionAlert: "Peignez le premier pixel à l’endroit où vous souhaitez commencer l’art !",
      waitingPosition: "👆 En attente que vous peigniez le pixel de référence...",
      positionSet: "✅ Position définie avec succès !",
      positionTimeout: "❌ Temps écoulé pour la sélection de la position",
      startPaintingMsg: "🎨 Début de la peinture...",
      paintingProgress: "🧱 Progression : {painted}/{total} pixels...",
      noCharges: "⌛ Pas de charges. Attente de {time}...",
      paintingStopped: "⏹️ Peinture arrêtée par l’utilisateur",
      paintingComplete: "✅ Peinture terminée ! {count} pixels peints.",
      paintingError: "❌ Erreur pendant la peinture",
      missingRequirements: "❌ Veuillez d'abord télécharger une image et sélectionner une position",
      progress: "Progression",
      pixels: "Pixels",
      charges: "Charges",
      estimatedTime: "Temps estimé",
      initMessage: "Cliquez sur 'Démarrer Auto-BOT' pour commencer",
      waitingInit: "En attente de l'initialisation...",
      resizeSuccess: "✅ Image redimensionnée à {width}x{height}",
      paintingPaused: "⏸️ Peinture en pause à la position X : {x}, Y : {y}"
    },
    ru: {
      title: "WPlace Auto-Image",
      initBot: "Запустить Auto-BOT",
      uploadImage: "Загрузить Изображение",
      resizeImage: "Изменить Размер",
      selectPosition: "Выбрать Позицию",
      startPainting: "Начать Рисование",
      stopPainting: "Завершить Рисование",
      checkingColors: "🔍 Проверка доступных цветов...",
      noColorsFound: "❌ Откройте палитру цветов на сайте и попробуйте снова!",
      colorsFound: "✅ {count} найдено доступных цветов",
      loadingImage: "🖼️ Загрузка изображения...",
      imageLoaded: "✅ Изображение загружено с {count} допустимых пикселей",
      imageError: "❌ Ошибка загрузки изображения",
      selectPositionAlert: "Нарисуйте первый пиксель в том месте, где вы хотите, чтобы начинался арт.!",
      waitingPosition: "👆 Ждем, когда вы нарисуете опорный пиксель...",
      positionSet: "✅ Положение установлено успешно!",
      positionTimeout: "❌ Время ожидания выбора позиции вышло",
      startPaintingMsg: "🎨 Начинаем рисовать...",
      paintingProgress: "🧱 Прогресс: {painted}/{total} пикселей...",
      noCharges: "⌛ Нет зарядов. ожидание {time}...",
      paintingStopped: "⏹️ Рисование остановлено пользователем",
      paintingComplete: "✅ Рисование завершено! {count} пикселей нарисовано.",
      paintingError: "❌ Ошибка во время рисование",
      missingRequirements: "❌ Сначала загрузите изображение и выберите позицию",
      progress: "Прогресс",
      pixels: "Пиксели",
      charges: "Заряды",
      estimatedTime: "Предположительное время",
      initMessage: "Нажмите «Запустить Auto-BOT», чтобы начать",
      waitingInit: "Ожидание инициализации...",
      resizeSuccess: "✅ Изображение изменено до {width}x{height}",
      paintingPaused: "⏸️ Рисование приостановлено на позиции X: {x}, Y: {y}"
    },
    nl: {
      title: "WPlaats Auto-Afbeelding",
      initBot: "Start Auto-BOT",
      uploadImage: "Upload Afbeelding",
      resizeImage: "Formaat Afbeelding Wijzigen",
      selectPosition: "Selecteer Positie",
      startPainting: "Start Schilderen",
      stopPainting: "Stop Schilderen",
      checkingColors: "🔍 Beschikbare kleuren controleren...",
      noColorsFound: "❌ Open het kleurenpalet op de site en probeer het opnieuw!",
      colorsFound: "✅ {count} beschikbare kleuren gevonden",
      loadingImage: "🖼️ Afbeelding laden...",
      imageLoaded: "✅ Afbeelding geladen met {count} geldige pixels",
      imageError: "❌ Fout bij het laden van de afbeelding",
      selectPositionAlert: "Schilder de eerste pixel op de locatie waar je de afbeelding wilt laten beginnen!",
      waitingPosition: "👆 Wacht tot je de referentiepixel schildert...",
      positionSet: "✅ Positie succesvol ingesteld!",
      positionTimeout: "❌ Time-out voor positieselectie",
      startPaintingMsg: "🎨 Schilderen starten...",
      paintingProgress: "🧱 Voortgang: {geschilderd}/{totaal} pixels...",
      noCharges: "⌛ Geen kosten. Wachten {time}...",
      paintingStopped: "⏹️ Schilderen gestopt door gebruiker",
      paintingComplete: "✅ Schilderen voltooid! {count} pixels geschilderd.",
      paintingError: "❌ Fout tijdens het schilderen",
      missingRequirements: "❌ Laad een afbeelding en selecteer eerst een positie",
      progress: "Voortgang",
      pixels: "Pixels",
      charges: "Kosten",
      estimatedTime: "Geschatte tijd",
      initMessage: "Klik op 'Start Auto-BOT' om te beginnen",
      waitingInit: "Wachten op initialisatie...",
      resizeSuccess: "✅ Afbeelding verkleind naar {breedte} x {hoogte}",
      paintingPaused: "⏸️ Schilderen gepauzeerd op positie X: {x}, Y: {y}"
    },
    uk: {
      title: "WPlace Auto-Image",
      initBot: "Запустити бота",
      uploadImage: "Завантажити зображення",
      resizeImage: "Змінити розмір зображення",
      selectPosition: "Вибрати позицію",
      startPainting: "Почати малювання",
      stopPainting: "Зупинити малювання",
      checkingColors: "🔍 Перевірка доступних кольорів...",
      noColorsFound: "❌ Відкрийте палітру кольорів на сайті та спробуйте ще раз!",
      colorsFound: "✅ Знайдено {count} доступних кольорів",
      loadingImage: "🖼️ Завантаження зображення...",
      imageLoaded: "✅ Зображення завантажено з {count} коректними пікселями",
      imageError: "❌ Помилка завантаження зображення",
      selectPositionAlert: "Намалюйте перший піксель у місці, з якого має початися арт!",
      waitingPosition: "👆 Очікування, поки ви намалюєте контрольний піксель...",
      positionSet: "✅ Позицію успішно встановлено!",
      positionTimeout: "❌ Час очікування вибору позиції вичерпано",
      startPaintingMsg: "🎨 Початок малювання...",
      paintingProgress: "🧱 Прогрес: {painted}/{total} пікселів...",
      noCharges: "⌛ Немає зарядів. Очікування {time}...",
      paintingStopped: "⏹️ Малювання зупинено користувачем",
      paintingComplete: "✅ Малювання завершено! Намальовано {count} пікселів.",
      paintingError: "❌ Помилка під час малювання",
      missingRequirements: "❌ Спочатку завантажте зображення та виберіть позицію",
      progress: "Прогрес",
      pixels: "Пікселі",
      charges: "Заряди",
      estimatedTime: "Орієнтовний час",
      initMessage: "Натисніть «Запустити бота», щоб почати",
      waitingInit: "Очікування запуску...",
      resizeSuccess: "✅ Зображення змінено до {width}x{height}",
      paintingPaused: "⏸️ Малювання призупинено на позиції X: {x}, Y: {y}"
    }
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
    const userLang = navigator.language.split('-')[0]

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
      alert.style.top = '20px';
      alert.style.left = '50%';
      alert.style.transform = 'translateX(-50%)';
      alert.style.padding = '15px 20px';
      alert.style.background = CONFIG.THEME[type] || CONFIG.THEME.accent;
      alert.style.color = CONFIG.THEME.text;
      alert.style.borderRadius = '5px';
      alert.style.zIndex = '10000';
      alert.style.boxShadow = '0 3px 10px rgba(0,0,0,0.3)';
      alert.style.display = 'flex';
      alert.style.alignItems = 'center';
      alert.style.gap = '10px';
      
      const icons = {
        error: 'exclamation-circle',
        success: 'check-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
      };
      
      alert.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${message}</span>
      `;
      
      document.body.appendChild(alert);
      
      setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transition = 'opacity 0.5s';
        setTimeout(() => alert.remove(), 500);
      }, 3000);
    },
    
    calculateEstimatedTime: (remainingPixels, currentCharges, cooldown) => {
      const pixelsPerCharge = currentCharges > 0 ? currentCharges : 0;
      const fullCycles = Math.ceil((remainingPixels - pixelsPerCharge) / Math.max(currentCharges, 1));
      return (fullCycles * cooldown) + ((remainingPixels - 1) * 100);
    },
    
    isWhitePixel: (r, g, b) => {
      return r >= CONFIG.WHITE_THRESHOLD && 
             g >= CONFIG.WHITE_THRESHOLD && 
             b >= CONFIG.WHITE_THRESHOLD;
    },
    
    t: (key, params = {}) => {
      let text = TEXTS[state.language][key] || TEXTS.en[key] || key;
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
        const res = await fetch('https://backend.wplace.live/me', { 
          credentials: 'include' 
        });
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
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(0, 255, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0); }
      }
      @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      #wplace-image-bot-container {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        background: ${CONFIG.THEME.primary};
        border: 1px solid ${CONFIG.THEME.accent};
        border-radius: 8px;
        padding: 0;
        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        z-index: 9998;
        font-family: 'Segoe UI', Roboto, sans-serif;
        color: ${CONFIG.THEME.text};
        animation: slideIn 0.4s ease-out;
        overflow: hidden;
      }
      .wplace-header {
        padding: 12px 15px;
        background: ${CONFIG.THEME.secondary};
        color: ${CONFIG.THEME.highlight};
        font-size: 16px;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        alig
