(async () => {
  // =========== CONFIGURAÇÕES ===========
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    PIXELS_PER_LINE: 100,
    BASE_DELAY: 800,
    MIN_CHARGES_FOR_AUTO_REFRESH: 3,
    API_TIMEOUT: 10000,
    THEME: {
      primary: '#0d1117',
      secondary: '#161b22', 
      accent: '#7c3aed',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
      text: '#f0f6ff',
      textSecondary: '#8b949e',
      border: 'rgba(240, 246, 255, 0.1)',
      glass: 'rgba(13, 17, 23, 0.9)',
      cardBg: 'rgba(22, 27, 34, 0.8)',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)'
    }
  };

  // =========== ESTADO ===========
  const state = {
    running: false,
    paintedCount: 0,
    failedCount: 0,
    successRate: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    minimized: false,
    menuOpen: false,
    language: 'pt',
    autoRefresh: true,
    statistics: {
      startTime: null,
      sessionTime: 0,
      averageSpeed: 0,
      currentStreak: 0,
      bestStreak: 0
    },
    performance: {
      apiCallCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      networkQuality: 'good',
      serverHealth: 'healthy'
    },
    ui: {
      isMobile: window.innerWidth <= 768,
      tabActive: 'main',
      notifications: true
    },
    ai: {
      adaptiveDelay: CONFIG.BASE_DELAY,
      successProbability: 0.5,
      strategies: { current: 'smart' }
    }
  };

  // =========== UTILITÁRIOS ===========
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const getCachedElement = selector => document.querySelector(selector);
  
  // =========== INTERCEPTADOR DE FETCH ===========
  const originalFetch = window.fetch;
  let capturedCaptchaToken = null;
  let tokenExpirationTime = null;
  
  window.fetch = async (url, options = {}) => {
    if (typeof url === 'string' && url.includes('https://backend.wplace.live/s0/pixel/')) {
      try {
        const payload = JSON.parse(options.body || '{}');
        if (payload.t) {
          console.log('✅ Token CAPTCHA capturado');
          capturedCaptchaToken = payload.t;
          tokenExpirationTime = Date.now() + (5 * 60 * 1000);
          
          if (state.running) {
            showNotification('Bot reiniciado automaticamente!', 'success');
            paintLoop();
          }
        }
      } catch (e) {
        console.warn('Erro ao processar payload:', e);
      }
    }
    return originalFetch(url, options);
  };

  // =========== API ===========
  const getCharge = async () => {
    try {
      const response = await fetch('https://backend.wplace.live/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        state.userInfo = data;
        state.charges = {
          count: Math.floor(data.charges.count),
          max: Math.floor(data.charges.max),
          cooldownMs: data.charges.cooldownMs
        };
      }
    } catch (e) {
      console.warn('Erro ao obter cargas:', e.message);
    }
    
    return state.charges;
  };

  const paintPixel = async (x, y) => {
    if (!capturedCaptchaToken) {
      throw new Error('Token CAPTCHA não disponível');
    }
    
    if (tokenExpirationTime && Date.now() > tokenExpirationTime) {
      capturedCaptchaToken = null;
      return 'token_expired';
    }
    
    const colors = Array.from({length: 31}, (_, i) => i + 1);
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const url = `https://backend.wplace.live/s0/pixel/${CONFIG.START_X}/${CONFIG.START_Y}`;
    const payload = JSON.stringify({ 
      coords: [x, y], 
      colors: [randomColor], 
      t: capturedCaptchaToken 
    });
    
    try {
      state.performance.apiCallCount++;
      const startTime = Date.now();
      
      const res = await originalFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        credentials: 'include',
        body: payload
      });
      
      state.performance.avgResponseTime = Date.now() - startTime;
      
      if (res.status === 403) {
        capturedCaptchaToken = null;
        return 'token_error';
      }
      
      if (res.status === 429) {
        return 'rate_limit';
      }
      
      const data = await res.json();
      return data;
    } catch (e) {
      state.performance.errorCount++;
      throw e;
    }
  };

  // =========== ALGORITMO DE POSICIONAMENTO ===========
  const getOptimalPosition = () => {
    return {
      x: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE),
      y: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE)
    };
  };

  // =========== LOOP PRINCIPAL ===========
  const paintLoop = async () => {
    if (!state.statistics.startTime) {
      state.statistics.startTime = Date.now();
    }
    
    while (state.running) {
      try {
        const { count } = state.charges;
        
        if (count < 1) {
          const waitTime = Math.max(state.charges.cooldownMs, 10000);
          updateStatusMessage(`Sem cargas. Aguardando ${Math.ceil(waitTime/1000)}s...`);
          await sleep(waitTime);
          await getCharge();
          continue;
        }
        
        const position = getOptimalPosition();
        const paintResult = await paintPixel(position.x, position.y);
        
        if (paintResult === 'token_error' || paintResult === 'token_expired') {
          if (state.autoRefresh) {
            updateStatusMessage('Tentando renovar token...');
            await sleep(5000);
          } else {
            state.running = false;
            updateStatusMessage('Token expirado. Clique em um pixel para renovar.');
            break;
          }
          continue;
        }
        
        if (paintResult === 'rate_limit') {
          updateStatusMessage('Rate limit. Aguardando...');
          await sleep(state.ai.adaptiveDelay * 2);
          continue;
        }
        
        if (paintResult?.painted === 1) {
          state.paintedCount++;
          state.statistics.currentStreak++;
          
          if (state.statistics.currentStreak > state.statistics.bestStreak) {
            state.statistics.bestStreak = state.statistics.currentStreak;
          }
          
          state.charges.count--;
          triggerPaintEffect();
          showNotification('Pixel pintado!', 'success');
        } else {
          state.failedCount++;
          state.statistics.currentStreak = 0;
        }
        
        // Atualiza estatísticas
        const total = state.paintedCount + state.failedCount;
        state.successRate = total > 0 ? ((state.paintedCount / total) * 100).toFixed(1) : 0;
        
        await sleep(state.ai.adaptiveDelay);
        updateStats();
        
      } catch (e) {
        console.error('Erro no loop:', e);
        state.performance.errorCount++;
        state.statistics.currentStreak = 0;
        await sleep(2000);
      }
    }
  };

  // =========== INTERFACE MOBILE ===========
  const createMobileUI = () => {
    if (state.menuOpen) return;
    state.menuOpen = true;

    // Font Awesome
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const fontAwesome = document.createElement('link');
      fontAwesome.rel = 'stylesheet';
      fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(fontAwesome);
    }

    const style = document.createElement('style');
    style.textContent = `
      .wplace-mobile * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-tap-highlight-color: transparent;
      }

      @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes pulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }

      .wplace-container {
        position: fixed;
        top: ${state.ui.isMobile ? '10px' : '20px'};
        right: ${state.ui.isMobile ? '10px' : '20px'};
        width: ${state.ui.isMobile ? 'calc(100vw - 20px)' : '320px'};
        max-width: 400px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: slideIn 0.4s ease-out;
      }

      .wplace-panel {
        background: ${CONFIG.THEME.glass};
        backdrop-filter: blur(20px);
        border: 1px solid ${CONFIG.THEME.border};
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      }

      .wplace-header {
        background: ${CONFIG.THEME.gradient};
        padding: ${state.ui.isMobile ? '12px 16px' : '16px 20px'};
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .wplace-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: ${state.ui.isMobile ? '16px' : '18px'};
        font-weight: 700;
        color: white;
      }

      .wplace-title i {
        animation: pulse 2s infinite;
      }

      .wplace-header-controls {
        display: flex;
        gap: 8px;
      }

      .wplace-header-btn {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .wplace-header-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.05);
      }

      .wplace-content {
        display: ${state.minimized ? 'none' : 'block'};
        background: ${CONFIG.THEME.primary};
      }

      .wplace-tabs {
        display: flex;
        background: ${CONFIG.THEME.secondary};
        border-bottom: 1px solid ${CONFIG.THEME.border};
      }

      .wplace-tab {
        flex: 1;
        padding: ${state.ui.isMobile ? '12px 8px' : '14px 12px'};
        border: none;
        background: transparent;
        color: ${CONFIG.THEME.textSecondary};
        cursor: pointer;
        font-size: ${state.ui.isMobile ? '12px' : '13px'};
        font-weight: 600;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        position: relative;
      }

      .wplace-tab.active {
        color: ${CONFIG.THEME.accent};
        background: ${CONFIG.THEME.primary};
      }

      .wplace-tab.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: ${CONFIG.THEME.accent};
      }

      .wplace-tab-content {
        padding: ${state.ui.isMobile ? '16px' : '20px'};
        display: none;
      }

      .wplace-tab-content.active {
        display: block;
      }

      .wplace-main-controls {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }

      .wplace-btn {
        flex: 1;
        padding: ${state.ui.isMobile ? '14px' : '16px'};
        border: none;
        border-radius: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: ${state.ui.isMobile ? '14px' : '15px'};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .wplace-btn-primary {
        background: ${CONFIG.THEME.gradient};
        color: white;
        box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
      }

      .wplace-btn-stop {
        background: linear-gradient(135deg, ${CONFIG.THEME.error}, #dc2626);
        color: white;
      }

      .wplace-btn:hover {
        transform: translateY(-1px);
      }

      .wplace-quick-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 16px;
      }

      .wplace-quick-stat {
        background: ${CONFIG.THEME.cardBg};
        padding: ${state.ui.isMobile ? '12px' : '14px'};
        border-radius: 12px;
        border: 1px solid ${CONFIG.THEME.border};
        text-align: center;
        transition: all 0.2s ease;
      }

      .wplace-quick-stat:hover {
        border-color: ${CONFIG.THEME.accent};
        transform: translateY(-2px);
      }

      .wplace-quick-stat-icon {
        font-size: ${state.ui.isMobile ? '18px' : '20px'};
        color: ${CONFIG.THEME.accent};
        margin-bottom: 6px;
      }

      .wplace-quick-stat-value {
        font-size: ${state.ui.isMobile ? '18px' : '20px'};
        font-weight: 800;
        color: ${CONFIG.THEME.text};
        line-height: 1;
        margin-bottom: 2px;
      }

      .wplace-quick-stat-label {
        font-size: 11px;
        color: ${CONFIG.THEME.textSecondary};
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .wplace-ai-compact {
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(168, 85, 247, 0.1));
        border: 1px solid rgba(124, 58, 237, 0.3);
        border-radius: 12px;
        padding: ${state.ui.isMobile ? '12px' : '14px'};
        margin-bottom: 16px;
      }

      .wplace-ai-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .wplace-ai-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: ${CONFIG.THEME.accent};
      }

      .wplace-ai-metrics {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
      }

      .wplace-ai-metric {
        text-align: center;
      }

      .wplace-ai-metric-value {
        font-weight: 700;
        color: ${CONFIG.THEME.text};
      }

      .wplace-ai-metric-label {
        color: ${CONFIG.THEME.textSecondary};
        font-size: 10px;
        margin-top: 2px;
      }

      .wplace-status {
        padding: ${state.ui.isMobile ? '12px' : '14px'};
        border-radius: 12px;
        text-align: center;
        font-size: 13px;
        font-weight: 600;
        border: 1px solid ${CONFIG.THEME.border};
        background: ${CONFIG.THEME.cardBg};
        margin-top: 16px;
      }

      .wplace-notification {
        position: fixed;
        top: ${state.ui.isMobile ? '70px' : '90px'};
        right: ${state.ui.isMobile ? '10px' : '20px'};
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        z-index: 1000000;
        animation: slideIn 0.3s ease-out;
        backdrop-filter: blur(15px);
        border: 1px solid;
        max-width: ${state.ui.isMobile ? 'calc(100vw - 20px)' : '300px'};
      }

      .status-default {
        background: ${CONFIG.THEME.cardBg};
        color: ${CONFIG.THEME.text};
        border-color: ${CONFIG.THEME.border};
      }

      .status-success {
        background: rgba(16, 185, 129, 0.9);
        color: white;
        border-color: ${CONFIG.THEME.success};
      }

      .status-error {
        background: rgba(239, 68, 68, 0.9);
        color: white;
        border-color: ${CONFIG.THEME.error};
      }

      .status-info {
        background: rgba(124, 58, 237, 0.9);
        color: white;
        border-color: ${CONFIG.THEME.accent};
      }

      .status-running {
        background: ${CONFIG.THEME.cardBg};
        color: ${CONFIG.THEME.success};
        border-color: ${CONFIG.THEME.success};
      }

      @media (max-width: 480px) {
        .wplace-container {
          top: 5px;
          right: 5px;
          left: 5px;
          width: auto;
        }
        
        .wplace-header {
          padding: 10px 12px;
        }
        
        .wplace-tab {
          padding: 8px 4px;
          font-size: 10px;
        }
        
        .wplace-tab-content {
          padding: 12px;
        }
        
        .wplace-quick-stats {
          gap: 8px;
        }
        
        .wplace-quick-stat {
          padding: 8px;
        }
        
        .wplace-btn {
          padding: 12px;
          font-size: 13px;
        }
      }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.className = 'wplace-container wplace-mobile';
    container.innerHTML = `
      <div class="wplace-panel">
        <div class="wplace-header">
          <div class="wplace-title">
            <i class="fas fa-robot"></i>
            <span>WPlace Bot</span>
          </div>
          <div class="wplace-header-controls">
            <button id="minimizeBtn" class="wplace-header-btn">
              <i class="fas fa-minus"></i>
            </button>
            <button id="closeBtn" class="wplace-header-btn">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <div class="wplace-content">
          <div class="wplace-tabs">
            <button class="wplace-tab active" data-tab="main">
              <i class="fas fa-home"></i>
              <span>Principal</span>
            </button>
            <button class="wplace-tab" data-tab="stats">
              <i class="fas fa-chart-bar"></i>
              <span>Stats</span>
            </button>
            <button class="wplace-tab" data-tab="settings">
              <i class="fas fa-cog"></i>
              <span>Config</span>
            </button>
          </div>

          <!-- ABA PRINCIPAL -->
          <div class="wplace-tab-content active" data-content="main">
            <div class="wplace-main-controls">
              <button id="toggleBtn" class="wplace-btn wplace-btn-primary">
                <i class="fas fa-play"></i>
                <span>INICIAR</span>
              </button>
            </div>

            <div class="wplace-ai-compact">
              <div class="wplace-ai-header">
                <div class="wplace-ai-title">
                  <i class="fas fa-brain"></i>
                  <span>IA Ativa</span>
                </div>
              </div>
              <div class="wplace-ai-metrics">
                <div class="wplace-ai-metric">
                  <div class="wplace-ai-metric-value" id="successProb">75%</div>
                  <div class="wplace-ai-metric-label">Sucesso</div>
                </div>
                <div class="wplace-ai-metric">
                  <div class="wplace-ai-metric-value" id="currentDelay">800ms</div>
                  <div class="wplace-ai-metric-label">Delay</div>
                </div>
                <div class="wplace-ai-metric">
                  <div class="wplace-ai-metric-value" id="strategyName">Smart</div>
                  <div class="wplace-ai-metric-label">Modo</div>
                </div>
              </div>
            </div>

            <div class="wplace-quick-stats">
              <div class="wplace-quick-stat">
                <div class="wplace-quick-stat-icon">
                  <i class="fas fa-paint-brush"></i>
                </div>
                <div class="wplace-quick-stat-value" id="pixelCount">0</div>
                <div class="wplace-quick-stat-label">Pixels</div>
              </div>
              
              <div class="wplace-quick-stat">
                <div class="wplace-quick-stat-icon">
                  <i class="fas fa-bolt"></i>
                </div>
                <div class="wplace-quick-stat-value" id="chargeCount">0/0</div>
                <div class="wplace-quick-stat-label">Cargas</div>
              </div>
              
              <div class="wplace-quick-stat">
                <div class="wplace-quick-stat-icon">
                  <i class="fas fa-percentage"></i>
                </div>
                <div class="wplace-quick-stat-value" id="successRate">0%</div>
                <div class="wplace-quick-stat-label">Taxa</div>
              </div>
              
              <div class="wplace-quick-stat">
                <div class="wplace-quick-stat-icon">
                  <i class="fas fa-fire"></i>
                </div>
                <div class="wplace-quick-stat-value" id="streakCount">0</div>
                <div class="wplace-quick-stat-label">Sequência</div>
              </div>
            </div>
          </div>

          <!-- ABA ESTATÍSTICAS -->
          <div class="wplace-tab-content" data-content="stats">
            <div class="wplace-quick-stats">
              <div class="wplace-quick-stat">
                <div class="wplace-quick-stat-icon">
                  <i class="fas fa-clock"></i>
                </div>
                <div class="wplace-quick-stat-value" id="sessionTime">0m</div>
                <div class="wplace-quick-stat-label">Tempo</div>
              </div>
              
              <div class="wplace-quick-stat">
                <div class="wplace-quick-stat-icon">
                  <i class="fas fa-tachometer-alt"></i>
                </div>
                <div class="wplace-quick-stat-value" id="avgSpeed">0</div>
                <div class="wplace-quick-stat-label">Velocidade</div>
              </div>
              
              <div class="wplace-quick-stat">
                <div class="wplace-quick-stat-icon">
                  <i class="fas fa-server"></i>
                </div>
                <div class="wplace-quick-stat-value" id="apiCalls">0</div>
                <div class="wplace-quick-stat-label">API Calls</div>
              </div>
              
              <div class="wplace-quick-stat">
                <div class="wplace-quick-stat-icon">
                  <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="wplace-quick-stat-value" id="errorCount">0</div>
                <div class="wplace-quick-stat-label">Erros</div>
              </div>
            </div>
          </div>

          <!-- ABA CONFIGURAÇÕES -->
          <div class="wplace-tab-content" data-content="settings">
            <div class="wplace-quick-stats">
              <div class="wplace-quick-stat">
                <div class="wplace-quick-stat-icon">
                  <i class="fas fa-crosshairs"></i>
                </div>
                <div class="wplace-quick-stat-value">${CONFIG.START_X}</div>
                <div class="wplace-quick-stat-label">Coord X</div>
              </div>
              
              <div class="wplace-quick-stat">
                <div class="wplace-quick-stat-icon">
                  <i class="fas fa-crosshairs"></i>
                </div>
                <div class="wplace-quick-stat-value">${CONFIG.START_Y}</div>
                <div class="wplace-quick-stat-label">Coord Y</div>
              </div>
              
              <div class="wplace-quick-stat">
                <div class="wplace-quick-stat-icon">
                  <i class="fas fa-refresh"></i>
                </div>
                <div class="wplace-quick-stat-value" id="autoRefreshStatus">ON</div>
                <div class="wplace-quick-stat-label">Auto Refresh</div>
              </div>
              
              <div class="wplace-quick-stat">
                <div class="wplace-quick-stat-icon">
                  <i class="fas fa-hourglass-half"></i>
                </div>
                <div class="wplace-quick-stat-value">${CONFIG.BASE_DELAY}ms</div>
                <div class="wplace-quick-stat-label">Delay Base</div>
              </div>
            </div>
          </div>

          <div id="statusText" class="wplace-status status-default">
            Bot pronto para usar
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    setupEventListeners(container);
  };

  // =========== EVENT LISTENERS ===========
  const setupEventListeners = (container) => {
    const toggleBtn = container.querySelector('#toggleBtn');
    const minimizeBtn = container.querySelector('#minimizeBtn');
    const closeBtn = container.querySelector('#closeBtn');
    const content = container.querySelector('.wplace-content');
    const tabs = container.querySelectorAll('.wplace-tab');
    const tabContents = container.querySelectorAll('.wplace-tab-content');
    
    // Botão principal
    toggleBtn.addEventListener('click', () => {
      state.running = !state.running;
      
      if (state.running && !capturedCaptchaToken) {
        showNotification('Clique em um pixel primeiro para capturar o token CAPTCHA', 'error');
        state.running = false;
        return;
      }
  
      if (state.running) {
        toggleBtn.innerHTML = `<i class="fas fa-stop"></i><span>PARAR</span>`;
        toggleBtn.classList.remove('wplace-btn-primary');
        toggleBtn.classList.add('wplace-btn-stop');
        showNotification('Bot iniciado!', 'success');
        paintLoop();
        updateStatusMessage('Bot executando...', 'running');
      } else {
        toggleBtn.innerHTML = `<i class="fas fa-play"></i><span>INICIAR</span>`;
        toggleBtn.classList.add('wplace-btn-primary');
        toggleBtn.classList.remove('wplace-btn-stop');
        showNotification('Bot parado', 'info');
        updateStatusMessage('Bot parado', 'default');
      }
    });
    
    // Controles do header
    minimizeBtn.addEventListener('click', () => {
      state.minimized = !state.minimized;
      content.style.display = state.minimized ? 'none' : 'block';
      minimizeBtn.innerHTML = `<i class="fas fa-${state.minimized ? 'expand' : 'minus'}"></i>`;
    });
    
    closeBtn.addEventListener('click', () => {
      state.running = false;
      container.remove();
      state.menuOpen = false;
      showNotification('Bot encerrado', 'info');
    });
    
    // Sistema de abas
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        tab.classList.add('active');
        const targetContent = container.querySelector(`[data-content="${targetTab}"]`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
        
        state.ui.tabActive = targetTab;
      });
    });
  };

  // =========== FUNÇÕES DE UI ===========
  const showNotification = (message, type = 'info') => {
    if (!state.ui.notifications) return;
    
    const existing = document.querySelector('.wplace-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `wplace-notification status-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 3000);
  };

  const updateStatusMessage = (message, type = 'default') => {
    const statusText = getCachedElement('#statusText');
    if (statusText) {
      statusText.textContent = message;
      statusText.className = `wplace-status status-${type}`;
    }
  };

  const triggerPaintEffect = () => {
    const panel = getCachedElement('.wplace-panel');
    if (panel) {
      panel.style.boxShadow = '0 0 30px rgba(124, 58, 237, 0.5)';
      setTimeout(() => {
        panel.style.boxShadow = '';
      }, 500);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${secs}s`;
    }
  };

  // =========== ATUALIZAÇÃO DE ESTATÍSTICAS ===========
  const updateStats = async () => {
    try {
      await getCharge();
      
      // Atualiza tempo de sessão
      if (state.statistics.startTime) {
        state.statistics.sessionTime = Math.floor((Date.now() - state.statistics.startTime) / 1000);
        state.statistics.averageSpeed = state.statistics.sessionTime > 0 ? 
          (state.paintedCount / (state.statistics.sessionTime / 60)).toFixed(1) : 0;
      }
      
      // Calcula taxa de sucesso
      const total = state.paintedCount + state.failedCount;
      state.successRate = total > 0 ? ((state.paintedCount / total) * 100).toFixed(1) : 0;
      
      // Atualiza elementos da UI
      const updates = {
        '#pixelCount': state.paintedCount,
        '#chargeCount': `${state.charges.count}/${state.charges.max}`,
        '#successRate': `${state.successRate}%`,
        '#streakCount': state.statistics.currentStreak,
        '#sessionTime': formatTime(state.statistics.sessionTime),
        '#avgSpeed': state.statistics.averageSpeed,
        '#apiCalls': state.performance.apiCallCount,
        '#errorCount': state.performance.errorCount,
        '#successProb': `${Math.round(state.ai.successProbability * 100)}%`,
        '#currentDelay': `${Math.round(state.ai.adaptiveDelay)}ms`,
        '#strategyName': state.ai.strategies.current,
        '#autoRefreshStatus': state.autoRefresh ? 'ON' : 'OFF'
      };
      
      Object.entries(updates).forEach(([selector, value]) => {
        const element = getCachedElement(selector);
        if (element) element.textContent = value;
      });
      
    } catch (e) {
      console.warn('Erro ao atualizar estatísticas:', e);
    }
  };

  // =========== INICIALIZAÇÃO ===========
  console.log('🤖 WPlace Bot Mobile iniciando...');
  
  createMobileUI();
  
  try {
    await getCharge();
    updateStats();
    showNotification('Bot inicializado com sucesso!', 'success');
    updateStatusMessage('✅ Bot pronto para usar');
  } catch (e) {
    console.error('Erro na inicialização:', e);
    showNotification('Bot inicializado com limitações', 'warning');
    updateStatusMessage('⚠️ Inicializado com limitações');
  }
  
  // Loop de atualização
  setInterval(() => {
    if (state.menuOpen) {
      updateStats();
    }
  }, 3000);
  
  console.log('✅ WPlace Bot Mobile carregado com sucesso!');
})();