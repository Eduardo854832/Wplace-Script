(async () => {
  // =========== CONFIGURAÇÕES AVANÇADAS ===========
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    AREA_SIZE: 200,
    BASE_DELAY: 600,
    MIN_CHARGES_FOR_AUTO_REFRESH: 2,
    API_TIMEOUT: 8000,
    AUTO_RESTART_ATTEMPTS: 3,
    SMART_POSITIONING: true,
    AGGRESSIVE_MODE: true,
    AUTO_OPTIMIZE: true,
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
      glass: 'rgba(13, 17, 23, 0.95)',
      cardBg: 'rgba(22, 27, 34, 0.9)',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)'
    }
  };

  // =========== ESTADO AVANÇADO ===========
  const state = {
    running: false,
    paintedCount: 0,
    failedCount: 0,
    successRate: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    minimized: false,
    menuOpen: false,
    autoRefresh: true,
    autoRestart: true,
    restartAttempts: 0,
    lastActivity: Date.now(),
    statistics: {
      startTime: null,
      sessionTime: 0,
      averageSpeed: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalPixelsToday: 0,
      dailyGoal: 1000,
      efficiency: 0
    },
    performance: {
      apiCallCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      networkQuality: 'excellent',
      serverHealth: 'healthy',
      memoryUsage: 0,
      cacheHits: 0
    },
    ui: {
      isMobile: window.innerWidth <= 768,
      tabActive: 'main',
      notifications: true,
      compactMode: false,
      theme: 'dark'
    },
    ai: {
      adaptiveDelay: CONFIG.BASE_DELAY,
      successProbability: 0.8,
      learningRate: 0.1,
      strategies: { 
        current: 'intelligent',
        available: ['random', 'pattern', 'intelligent', 'aggressive']
      },
      patterns: [],
      predictions: {
        nextSuccess: 0.75,
        optimalDelay: CONFIG.BASE_DELAY,
        bestTime: null
      },
      optimization: {
        delayMultiplier: 1.0,
        positionWeight: 1.0,
        timeWeight: 1.0
      }
    },
    automation: {
      fullAuto: false,
      smartWait: true,
      autoOptimize: true,
      preventIdle: true,
      adaptiveStrategy: true
    }
  };

  // =========== SISTEMA DE CACHE AVANÇADO ===========
  const cache = {
    elements: new Map(),
    responses: new Map(),
    positions: new Map(),
    strategies: new Map(),
    
    get(key) {
      const item = this.responses.get(key);
      if (item && Date.now() - item.timestamp < 30000) {
        state.performance.cacheHits++;
        return item.data;
      }
      return null;
    },
    
    set(key, data) {
      this.responses.set(key, { data, timestamp: Date.now() });
      if (this.responses.size > 100) {
        const oldest = Array.from(this.responses.keys())[0];
        this.responses.delete(oldest);
      }
    }
  };

  // =========== UTILITÁRIOS AVANÇADOS ===========
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const getCachedElement = selector => {
    if (!cache.elements.has(selector)) {
      cache.elements.set(selector, document.querySelector(selector));
    }
    return cache.elements.get(selector);
  };
  
  const randomBetween = (min, max) => Math.random() * (max - min) + min;
  const normalDistribution = (mean, stdDev) => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  };

  // =========== INTERCEPTADOR AVANÇADO ===========
  const originalFetch = window.fetch;
  let capturedCaptchaToken = null;
  let tokenExpirationTime = null;
  let tokenRefreshInProgress = false;
  
  window.fetch = async (url, options = {}) => {
    if (typeof url === 'string' && url.includes('https://backend.wplace.live/s0/pixel/')) {
      try {
        const payload = JSON.parse(options.body || '{}');
        if (payload.t) {
          console.log('🔄 Token CAPTCHA atualizado automaticamente');
          capturedCaptchaToken = payload.t;
          tokenExpirationTime = Date.now() + (4 * 60 * 1000); // 4 minutos
          tokenRefreshInProgress = false;
          
          // Auto-restart se estava executando
          if (state.automation.fullAuto && !state.running) {
            setTimeout(() => {
              state.running = true;
              paintLoop();
              updateUI();
            }, 1000);
          }
        }
      } catch (e) {
        console.warn('Erro ao processar payload:', e);
      }
    }
    return originalFetch(url, options);
  };

  // =========== ENGINE DE IA AVANÇADA ===========
  const aiEngine = {
    learn(success, delay, position) {
      const pattern = { success, delay, position, timestamp: Date.now() };
      state.ai.patterns.push(pattern);
      
      // Mantém apenas os últimos 100 padrões
      if (state.ai.patterns.length > 100) {
        state.ai.patterns.shift();
      }
      
      // Atualiza probabilidade de sucesso
      const recentPatterns = state.ai.patterns.slice(-20);
      const successRate = recentPatterns.filter(p => p.success).length / recentPatterns.length;
      state.ai.successProbability = state.ai.successProbability * (1 - state.ai.learningRate) + 
                                   successRate * state.ai.learningRate;
      
      // Otimiza delay adaptativo
      if (success) {
        state.ai.adaptiveDelay = Math.max(200, state.ai.adaptiveDelay * 0.95);
      } else {
        state.ai.adaptiveDelay = Math.min(2000, state.ai.adaptiveDelay * 1.1);
      }
    },
    
    predictOptimalDelay() {
      const recent = state.ai.patterns.slice(-10);
      if (recent.length < 3) return state.ai.adaptiveDelay;
      
      const successful = recent.filter(p => p.success);
      if (successful.length === 0) return state.ai.adaptiveDelay;
      
      const avgSuccessDelay = successful.reduce((sum, p) => sum + p.delay, 0) / successful.length;
      const networkFactor = state.performance.avgResponseTime / 500;
      const timeFactor = this.getTimeOfDayFactor();
      
      return Math.max(300, avgSuccessDelay * networkFactor * timeFactor);
    },
    
    getTimeOfDayFactor() {
      const hour = new Date().getHours();
      // Horários de pico: manhã (8-12) e noite (18-22)
      if ((hour >= 8 && hour <= 12) || (hour >= 18 && hour <= 22)) {
        return 1.3; // Mais devagar nos picos
      }
      return 0.8; // Mais rápido fora dos picos
    },
    
    selectStrategy() {
      const errorRate = state.performance.errorCount / Math.max(1, state.performance.apiCallCount);
      const currentSuccess = state.ai.successProbability;
      
      if (errorRate > 0.3) {
        state.ai.strategies.current = 'conservative';
        return 'conservative';
      } else if (currentSuccess > 0.8) {
        state.ai.strategies.current = 'aggressive';
        return 'aggressive';
      } else if (currentSuccess > 0.6) {
        state.ai.strategies.current = 'intelligent';
        return 'intelligent';
      } else {
        state.ai.strategies.current = 'adaptive';
        return 'adaptive';
      }
    },
    
    getOptimalPosition() {
      const strategy = this.selectStrategy();
      const baseX = CONFIG.START_X;
      const baseY = CONFIG.START_Y;
      
      switch (strategy) {
        case 'aggressive':
          return {
            x: baseX + Math.floor(randomBetween(-50, 50)),
            y: baseY + Math.floor(randomBetween(-50, 50))
          };
          
        case 'intelligent':
          // Usa distribuição normal para posicionamento mais humano
          return {
            x: baseX + Math.floor(normalDistribution(0, 30)),
            y: baseY + Math.floor(normalDistribution(0, 30))
          };
          
        case 'conservative':
          return {
            x: baseX + Math.floor(randomBetween(-20, 20)),
            y: baseY + Math.floor(randomBetween(-20, 20))
          };
          
        default: // adaptive
          const variance = Math.max(10, 50 * state.ai.successProbability);
          return {
            x: baseX + Math.floor(randomBetween(-variance, variance)),
            y: baseY + Math.floor(randomBetween(-variance, variance))
          };
      }
    }
  };

  // =========== SISTEMA DE MONITORAMENTO ===========
  const monitoring = {
    checkHealth() {
      const errorRate = state.performance.errorCount / Math.max(1, state.performance.apiCallCount);
      const avgResponse = state.performance.avgResponseTime;
      
      // Qualidade da rede
      if (avgResponse < 500) {
        state.performance.networkQuality = 'excellent';
      } else if (avgResponse < 1000) {
        state.performance.networkQuality = 'good';
      } else if (avgResponse < 2000) {
        state.performance.networkQuality = 'fair';
      } else {
        state.performance.networkQuality = 'poor';
      }
      
      // Saúde do servidor
      if (errorRate < 0.1 && avgResponse < 1000) {
        state.performance.serverHealth = 'healthy';
      } else if (errorRate < 0.2 && avgResponse < 2000) {
        state.performance.serverHealth = 'degraded';
      } else {
        state.performance.serverHealth = 'unhealthy';
      }
      
      // Auto-otimização
      if (state.automation.autoOptimize) {
        this.autoOptimize();
      }
    },
    
    autoOptimize() {
      const successRate = parseFloat(state.successRate);
      
      if (successRate < 50) {
        // Performance ruim - ajusta configurações
        state.ai.adaptiveDelay = Math.min(state.ai.adaptiveDelay * 1.2, 2000);
        console.log('🔧 Auto-otimização: Aumentando delay para melhor estabilidade');
      } else if (successRate > 85) {
        // Performance excelente - pode ser mais agressivo
        state.ai.adaptiveDelay = Math.max(state.ai.adaptiveDelay * 0.9, 300);
        console.log('🚀 Auto-otimização: Diminuindo delay para maior velocidade');
      }
    },
    
    preventIdle() {
      const idleTime = Date.now() - state.lastActivity;
      
      if (idleTime > 300000 && state.automation.fullAuto) { // 5 minutos
        console.log('🔄 Sistema anti-idle: Reiniciando atividade');
        state.lastActivity = Date.now();
        
        if (!state.running && capturedCaptchaToken) {
          state.running = true;
          paintLoop();
        }
      }
    }
  };

  // =========== API AVANÇADA ===========
  const getCharge = async () => {
    const cacheKey = 'charges';
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await fetch('https://backend.wplace.live/me', {
        credentials: 'include',
        signal: AbortSignal.timeout(CONFIG.API_TIMEOUT)
      });
      
      if (response.ok) {
        const data = await response.json();
        state.userInfo = data;
        state.charges = {
          count: Math.floor(data.charges.count),
          max: Math.floor(data.charges.max),
          cooldownMs: data.charges.cooldownMs
        };
        
        cache.set(cacheKey, state.charges);
        return state.charges;
      }
    } catch (e) {
      console.warn('Erro ao obter cargas:', e.message);
      state.performance.errorCount++;
    }
    
    return state.charges;
  };

  const paintPixel = async (x, y) => {
    if (!capturedCaptchaToken) {
      throw new Error('Token CAPTCHA não disponível');
    }
    
    if (tokenExpirationTime && Date.now() > tokenExpirationTime) {
      console.log('🔄 Token expirado, aguardando renovação automática...');
      capturedCaptchaToken = null;
      return 'token_expired';
    }
    
    // Seleção inteligente de cores
    const colors = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
    const strategicColors = state.ai.strategies.current === 'aggressive' ? 
      colors.slice(0, 15) : colors; // Cores mais populares para modo agressivo
    
    const randomColor = strategicColors[Math.floor(Math.random() * strategicColors.length)];
    
    const url = `https://backend.wplace.live/s0/pixel/${x}/${y}`;
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
        headers: { 
          'Content-Type': 'text/plain;charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (compatible; WPlaceBot/2.0)'
        },
        credentials: 'include',
        body: payload,
        signal: AbortSignal.timeout(CONFIG.API_TIMEOUT)
      });
      
      const responseTime = Date.now() - startTime;
      state.performance.avgResponseTime = (state.performance.avgResponseTime + responseTime) / 2;
      state.lastActivity = Date.now();
      
      if (res.status === 403) {
        console.log('⚠️ Token inválido, aguardando renovação...');
        capturedCaptchaToken = null;
        return 'token_error';
      }
      
      if (res.status === 429) {
        console.log('⏱️ Rate limit detectado');
        return 'rate_limit';
      }
      
      const data = await res.json();
      
      // Aprende com o resultado
      aiEngine.learn(data.painted === 1, state.ai.adaptiveDelay, { x, y });
      
      return data;
    } catch (e) {
      state.performance.errorCount++;
      console.warn('Erro na API:', e.message);
      throw e;
    }
  };

  // =========== LOOP PRINCIPAL INTELIGENTE ===========
  const paintLoop = async () => {
    if (!state.statistics.startTime) {
      state.statistics.startTime = Date.now();
    }
    
    console.log('🚀 Loop automático iniciado - Modo 100% automático ativo!');
    
    while (state.running || state.automation.fullAuto) {
      try {
        // Verifica cargas
        await getCharge();
        const { count } = state.charges;
        
        if (count < 1) {
          const waitTime = Math.max(state.charges.cooldownMs, 15000);
          const waitMinutes = Math.ceil(waitTime / 60000);
          
          if (state.automation.fullAuto) {
            updateStatusMessage(`🔄 Auto-aguardando cargas (${waitMinutes}min)`, 'info');
            
            // Aguarda de forma inteligente
            await sleep(Math.min(waitTime, 60000)); // Máximo 1 minuto por vez
            continue;
          } else {
            updateStatusMessage(`Sem cargas. Aguardando ${waitMinutes}min...`);
            state.running = false;
            break;
          }
        }
        
        // Verifica token
        if (!capturedCaptchaToken) {
          if (state.automation.fullAuto) {
            updateStatusMessage('🔍 Aguardando token CAPTCHA automático...', 'warning');
            await sleep(5000);
            continue;
          } else {
            state.running = false;
            updateStatusMessage('Token CAPTCHA necessário');
            break;
          }
        }
        
        // Obtém posição otimizada pela IA
        const position = aiEngine.getOptimalPosition();
        const optimalDelay = aiEngine.predictOptimalDelay();
        
        // Executa a pintura
        const paintResult = await paintPixel(position.x, position.y);
        
        if (paintResult === 'token_error' || paintResult === 'token_expired') {
          if (state.automation.fullAuto) {
            updateStatusMessage('🔄 Renovando token automaticamente...', 'info');
            await sleep(3000);
            continue;
          } else {
            state.running = false;
            updateStatusMessage('Token expirado');
            break;
          }
        }
        
        if (paintResult === 'rate_limit') {
          const backoffTime = optimalDelay * 2;
          updateStatusMessage(`⏱️ Rate limit - aguardando ${Math.round(backoffTime/1000)}s`, 'warning');
          await sleep(backoffTime);
          continue;
        }
        
        // Processa resultado
        if (paintResult?.painted === 1) {
          state.paintedCount++;
          state.statistics.currentStreak++;
          state.statistics.totalPixelsToday++;
          
          if (state.statistics.currentStreak > state.statistics.bestStreak) {
            state.statistics.bestStreak = state.statistics.currentStreak;
          }
          
          state.charges.count--;
          triggerPaintEffect();
          
          const efficiency = Math.round(state.ai.successProbability * 100);
          updateStatusMessage(`✅ Pixel ${state.paintedCount} pintado! (${efficiency}% IA)`, 'success');
          
          if (state.ui.notifications) {
            showNotification(`Pixel ${state.paintedCount} pintado! Sequência: ${state.statistics.currentStreak}`, 'success');
          }
        } else {
          state.failedCount++;
          state.statistics.currentStreak = 0;
          updateStatusMessage('❌ Pixel já pintado, continuando...', 'info');
        }
        
        // Atualiza estatísticas
        const total = state.paintedCount + state.failedCount;
        state.successRate = total > 0 ? ((state.paintedCount / total) * 100).toFixed(1) : 0;
        state.statistics.efficiency = Math.round(state.ai.successProbability * parseFloat(state.successRate));
        
        // Delay inteligente
        const humanizedDelay = optimalDelay + randomBetween(-100, 100);
        await sleep(Math.max(200, humanizedDelay));
        
        // Atualiza UI periodicamente
        if (state.paintedCount % 5 === 0) {
          updateStats();
        }
        
        // Verifica se atingiu meta diária
        if (state.statistics.totalPixelsToday >= state.statistics.dailyGoal) {
          showNotification(`🎉 Meta diária atingida! ${state.statistics.dailyGoal} pixels`, 'success');
          
          if (!state.automation.fullAuto) {
            state.running = false;
            break;
          }
        }
        
      } catch (e) {
        console.error('Erro no loop principal:', e);
        state.performance.errorCount++;
        state.statistics.currentStreak = 0;
        
        if (state.automation.autoOptimize) {
          // Auto-recovery
          state.restartAttempts++;
          if (state.restartAttempts < CONFIG.AUTO_RESTART_ATTEMPTS) {
            console.log(`🔄 Auto-recovery tentativa ${state.restartAttempts}/${CONFIG.AUTO_RESTART_ATTEMPTS}`);
            await sleep(5000);
            continue;
          }
        }
        
        // Se não conseguir se recuperar automaticamente
        if (!state.automation.fullAuto) {
          state.running = false;
          updateStatusMessage('❌ Erro crítico - bot parado', 'error');
          break;
        }
        
        await sleep(10000); // Aguarda 10s antes de tentar novamente
      }
      
      // Reset das tentativas de restart se tudo estiver funcionando
      if (state.restartAttempts > 0) {
        state.restartAttempts = 0;
      }
    }
    
    console.log('🛑 Loop automático finalizado');
  };

  // =========== INTERFACE FUTURÍSTICA ===========
  const createUltimateUI = () => {
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
      .wplace-ultimate * {
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
        0%, 100% { opacity: 0.7; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.05); }
      }

      @keyframes glow {
        0%, 100% { box-shadow: 0 0 20px rgba(124, 58, 237, 0.3); }
        50% { box-shadow: 0 0 40px rgba(124, 58, 237, 0.6); }
      }

      .wplace-container {
        position: fixed;
        top: ${state.ui.isMobile ? '10px' : '20px'};
        right: ${state.ui.isMobile ? '10px' : '20px'};
        width: ${state.ui.isMobile ? 'calc(100vw - 20px)' : '360px'};
        max-width: 450px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: slideIn 0.5s ease-out;
      }

      .wplace-panel {
        background: ${CONFIG.THEME.glass};
        backdrop-filter: blur(25px);
        border: 1px solid ${CONFIG.THEME.border};
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        position: relative;
      }

      .wplace-panel::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: ${CONFIG.THEME.gradient};
        opacity: 0.1;
        pointer-events: none;
      }

      .wplace-header {
        background: ${CONFIG.THEME.gradient};
        padding: ${state.ui.isMobile ? '14px 18px' : '18px 24px'};
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        overflow: hidden;
      }

      .wplace-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        animation: shimmer 3s infinite;
      }

      @keyframes shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }

      .wplace-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: ${state.ui.isMobile ? '18px' : '20px'};
        font-weight: 800;
        color: white;
        text-shadow: 0 2px 10px rgba(0,0,0,0.3);
      }

      .wplace-title i {
        animation: pulse 2s infinite;
      }

      .wplace-auto-badge {
        background: rgba(16, 185, 129, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        animation: glow 2s infinite;
      }

      .wplace-header-controls {
        display: flex;
        gap: 8px;
      }

      .wplace-header-btn {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.15);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .wplace-header-btn:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: scale(1.1);
      }

      .wplace-content {
        display: ${state.minimized ? 'none' : 'block'};
        background: ${CONFIG.THEME.primary};
        position: relative;
      }

      .wplace-tabs {
        display: flex;
        background: ${CONFIG.THEME.secondary};
        border-bottom: 1px solid ${CONFIG.THEME.border};
      }

      .wplace-tab {
        flex: 1;
        padding: ${state.ui.isMobile ? '14px 10px' : '16px 14px'};
        border: none;
        background: transparent;
        color: ${CONFIG.THEME.textSecondary};
        cursor: pointer;
        font-size: ${state.ui.isMobile ? '13px' : '14px'};
        font-weight: 700;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        position: relative;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .wplace-tab.active {
        color: ${CONFIG.THEME.accent};
        background: ${CONFIG.THEME.primary};
        transform: translateY(-2px);
      }

      .wplace-tab.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: ${CONFIG.THEME.gradient};
        border-radius: 3px 3px 0 0;
      }

      .wplace-tab-content {
        padding: ${state.ui.isMobile ? '18px' : '24px'};
        display: none;
        min-height: 200px;
      }

      .wplace-tab-content.active {
        display: block;
      }

      .wplace-main-controls {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
      }

      .wplace-btn {
        flex: 1;
        padding: ${state.ui.isMobile ? '16px' : '18px'};
        border: none;
        border-radius: 14px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: ${state.ui.isMobile ? '15px' : '16px'};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        position: relative;
        overflow: hidden;
      }

      .wplace-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.6s;
      }

      .wplace-btn:hover::before {
        left: 100%;
      }

      .wplace-btn-auto {
        background: ${CONFIG.THEME.gradient};
        color: white;
        box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
        animation: glow 3s infinite;
      }

      .wplace-btn-stop {
        background: linear-gradient(135deg, ${CONFIG.THEME.error}, #dc2626);
        color: white;
        animation: pulse 1s infinite;
      }

      .wplace-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.3);
      }

      .wplace-stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
        margin-bottom: 20px;
      }

      .wplace-stat-card {
        background: ${CONFIG.THEME.cardBg};
        padding: ${state.ui.isMobile ? '14px' : '16px'};
        border-radius: 14px;
        border: 1px solid ${CONFIG.THEME.border};
        text-align: center;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .wplace-stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: ${CONFIG.THEME.gradient};
        transform: scaleX(0);
        transition: transform 0.3s ease;
      }

      .wplace-stat-card:hover {
        border-color: ${CONFIG.THEME.accent};
        transform: translateY(-3px);
        box-shadow: 0 10px 25px rgba(124, 58, 237, 0.2);
      }

      .wplace-stat-card:hover::before {
        transform: scaleX(1);
      }

      .wplace-stat-icon {
        font-size: ${state.ui.isMobile ? '20px' : '22px'};
        color: ${CONFIG.THEME.accent};
        margin-bottom: 8px;
        display: block;
      }

      .wplace-stat-value {
        font-size: ${state.ui.isMobile ? '20px' : '22px'};
        font-weight: 900;
        color: ${CONFIG.THEME.text};
        line-height: 1;
        margin-bottom: 4px;
        text-shadow: 0 2px 10px rgba(0,0,0,0.3);
      }

      .wplace-stat-label {
        font-size: 11px;
        color: ${CONFIG.THEME.textSecondary};
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }

      .wplace-ai-panel {
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(168, 85, 247, 0.15));
        border: 1px solid rgba(124, 58, 237, 0.4);
        border-radius: 16px;
        padding: ${state.ui.isMobile ? '16px' : '18px'};
        margin-bottom: 20px;
        position: relative;
        overflow: hidden;
      }

      .wplace-ai-panel::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: ${CONFIG.THEME.gradient};
        opacity: 0.05;
        pointer-events: none;
      }

      .wplace-ai-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .wplace-ai-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 800;
        color: ${CONFIG.THEME.accent};
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .wplace-ai-title i {
        animation: pulse 2s infinite;
      }

      .wplace-ai-metrics {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        font-size: 12px;
      }

      .wplace-ai-metric {
        text-align: center;
        padding: 8px;
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        border: 1px solid rgba(124, 58, 237, 0.2);
      }

      .wplace-ai-metric-value {
        font-weight: 900;
        color: ${CONFIG.THEME.text};
        font-size: 14px;
        margin-bottom: 2px;
      }

      .wplace-ai-metric-label {
        color: ${CONFIG.THEME.textSecondary};
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .wplace-status {
        padding: ${state.ui.isMobile ? '14px' : '16px'};
        border-radius: 14px;
        text-align: center;
        font-size: 13px;
        font-weight: 700;
        border: 1px solid ${CONFIG.THEME.border};
        background: ${CONFIG.THEME.cardBg};
        margin-top: 20px;
        position: relative;
        overflow: hidden;
      }

      .wplace-status::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        animation: shimmer 4s infinite;
      }

      .wplace-notification {
        position: fixed;
        top: ${state.ui.isMobile ? '80px' : '100px'};
        right: ${state.ui.isMobile ? '10px' : '20px'};
        padding: 14px 18px;
        border-radius: 14px;
        font-size: 13px;
        font-weight: 700;
        z-index: 1000000;
        animation: slideIn 0.4s ease-out;
        backdrop-filter: blur(20px);
        border: 1px solid;
        max-width: ${state.ui.isMobile ? 'calc(100vw - 20px)' : '320px'};
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      }

      .status-default {
        background: ${CONFIG.THEME.cardBg};
        color: ${CONFIG.THEME.text};
        border-color: ${CONFIG.THEME.border};
      }

      .status-success {
        background: rgba(16, 185, 129, 0.95);
        color: white;
        border-color: ${CONFIG.THEME.success};
        animation: glow 1s ease-out;
      }

      .status-error {
        background: rgba(239, 68, 68, 0.95);
        color: white;
        border-color: ${CONFIG.THEME.error};
      }

      .status-info {
        background: rgba(124, 58, 237, 0.95);
        color: white;
        border-color: ${CONFIG.THEME.accent};
      }

      .status-warning {
        background: rgba(245, 158, 11, 0.95);
        color: white;
        border-color: ${CONFIG.THEME.warning};
      }

      .status-running {
        background: ${CONFIG.THEME.cardBg};
        color: ${CONFIG.THEME.success};
        border-color: ${CONFIG.THEME.success};
        animation: pulse 2s infinite;
      }

      .wplace-progress {
        width: 100%;
        height: 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        margin-top: 12px;
        overflow: hidden;
      }

      .wplace-progress-bar {
        height: 100%;
        background: ${CONFIG.THEME.gradient};
        border-radius: 3px;
        transition: width 0.3s ease;
        animation: shimmer 2s infinite;
      }

      @media (max-width: 480px) {
        .wplace-container {
          top: 5px;
          right: 5px;
          left: 5px;
          width: auto;
        }
        
        .wplace-header {
          padding: 12px 16px;
        }
        
        .wplace-tab {
          padding: 10px 6px;
          font-size: 11px;
        }
        
        .wplace-tab-content {
          padding: 16px;
        }
        
        .wplace-stats-grid {
          gap: 10px;
        }
        
        .wplace-stat-card {
          padding: 12px;
        }
        
        .wplace-btn {
          padding: 14px;
          font-size: 14px;
        }
      }

      @media (max-height: 600px) {
        .wplace-tab-content {
          max-height: 350px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
      }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.className = 'wplace-container wplace-ultimate';
    container.innerHTML = `
      <div class="wplace-panel">
        <div class="wplace-header">
          <div class="wplace-title">
            <i class="fas fa-robot"></i>
            <span>Ultimate Bot</span>
            <div class="wplace-auto-badge">100% AUTO</div>
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
              <i class="fas fa-rocket"></i>
              <span>AUTO</span>
            </button>
            <button class="wplace-tab" data-tab="stats">
              <i class="fas fa-chart-line"></i>
              <span>STATS</span>
            </button>
            <button class="wplace-tab" data-tab="ai">
              <i class="fas fa-brain"></i>
              <span>IA</span>
            </button>
          </div>

          <!-- ABA PRINCIPAL -->
          <div class="wplace-tab-content active" data-content="main">
            <div class="wplace-main-controls">
              <button id="toggleBtn" class="wplace-btn wplace-btn-auto">
                <i class="fas fa-play"></i>
                <span>ATIVAR AUTO</span>
              </button>
            </div>

            <div class="wplace-ai-panel">
              <div class="wplace-ai-header">
                <div class="wplace-ai-title">
                  <i class="fas fa-brain"></i>
                  <span>IA Engine</span>
                </div>
              </div>
              <div class="wplace-ai-metrics">
                <div class="wplace-ai-metric">
                  <div class="wplace-ai-metric-value" id="successProb">80%</div>
                  <div class="wplace-ai-metric-label">Sucesso</div>
                </div>
                <div class="wplace-ai-metric">
                  <div class="wplace-ai-metric-value" id="currentDelay">600ms</div>
                  <div class="wplace-ai-metric-label">Delay</div>
                </div>
                <div class="wplace-ai-metric">
                  <div class="wplace-ai-metric-value" id="strategyName">Smart</div>
                  <div class="wplace-ai-metric-label">Estratégia</div>
                </div>
              </div>
            </div>

            <div class="wplace-stats-grid">
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-paint-brush"></i>
                <div class="wplace-stat-value" id="pixelCount">0</div>
                <div class="wplace-stat-label">Pixels</div>
              </div>
              
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-bolt"></i>
                <div class="wplace-stat-value" id="chargeCount">0/0</div>
                <div class="wplace-stat-label">Cargas</div>
              </div>
              
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-percentage"></i>
                <div class="wplace-stat-value" id="successRate">0%</div>
                <div class="wplace-stat-label">Taxa</div>
              </div>
              
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-fire"></i>
                <div class="wplace-stat-value" id="streakCount">0</div>
                <div class="wplace-stat-label">Sequência</div>
              </div>
            </div>

            <div class="wplace-progress">
              <div class="wplace-progress-bar" id="dailyProgress" style="width: 0%"></div>
            </div>
          </div>

          <!-- ABA ESTATÍSTICAS -->
          <div class="wplace-tab-content" data-content="stats">
            <div class="wplace-stats-grid">
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-clock"></i>
                <div class="wplace-stat-value" id="sessionTime">0m</div>
                <div class="wplace-stat-label">Sessão</div>
              </div>
              
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-tachometer-alt"></i>
                <div class="wplace-stat-value" id="avgSpeed">0</div>
                <div class="wplace-stat-label">Vel/min</div>
              </div>
              
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-server"></i>
                <div class="wplace-stat-value" id="apiCalls">0</div>
                <div class="wplace-stat-label">API Calls</div>
              </div>
              
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-exclamation-triangle"></i>
                <div class="wplace-stat-value" id="errorCount">0</div>
                <div class="wplace-stat-label">Erros</div>
              </div>

              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-trophy"></i>
                <div class="wplace-stat-value" id="bestStreak">0</div>
                <div class="wplace-stat-label">Melhor</div>
              </div>
              
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-chart-line"></i>
                <div class="wplace-stat-value" id="efficiency">0%</div>
                <div class="wplace-stat-label">Eficiência</div>
              </div>
            </div>
          </div>

          <!-- ABA IA -->
          <div class="wplace-tab-content" data-content="ai">
            <div class="wplace-stats-grid">
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-network-wired"></i>
                <div class="wplace-stat-value" id="networkQuality">Excelente</div>
                <div class="wplace-stat-label">Rede</div>
              </div>
              
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-heartbeat"></i>
                <div class="wplace-stat-value" id="serverHealth">Saudável</div>
                <div class="wplace-stat-label">Servidor</div>
              </div>
              
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-database"></i>
                <div class="wplace-stat-value" id="cacheHits">0</div>
                <div class="wplace-stat-label">Cache</div>
              </div>
              
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-memory"></i>
                <div class="wplace-stat-value" id="memoryUsage">0MB</div>
                <div class="wplace-stat-label">Memória</div>
              </div>

              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-target"></i>
                <div class="wplace-stat-value">${CONFIG.START_X},${CONFIG.START_Y}</div>
                <div class="wplace-stat-label">Coords</div>
              </div>
              
              <div class="wplace-stat-card">
                <i class="wplace-stat-icon fas fa-expand-arrows-alt"></i>
                <div class="wplace-stat-value">${CONFIG.AREA_SIZE}px</div>
                <div class="wplace-stat-label">Área</div>
              </div>
            </div>
          </div>

          <div id="statusText" class="wplace-status status-default">
            🚀 Sistema Ultimate pronto para automação total
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    setupUltimateEventListeners(container);
  };

  // =========== EVENT LISTENERS AVANÇADOS ===========
  const setupUltimateEventListeners = (container) => {
    const toggleBtn = container.querySelector('#toggleBtn');
    const minimizeBtn = container.querySelector('#minimizeBtn');
    const closeBtn = container.querySelector('#closeBtn');
    const content = container.querySelector('.wplace-content');
    const tabs = container.querySelectorAll('.wplace-tab');
    const tabContents = container.querySelectorAll('.wplace-tab-content');
    
    // Botão principal - 100% automático
    toggleBtn.addEventListener('click', () => {
      state.automation.fullAuto = !state.automation.fullAuto;
      state.running = state.automation.fullAuto;
      
      if (state.automation.fullAuto) {
        toggleBtn.innerHTML = `<i class="fas fa-stop"></i><span>PARAR AUTO</span>`;
        toggleBtn.classList.remove('wplace-btn-auto');
        toggleBtn.classList.add('wplace-btn-stop');
        updateStatusMessage('🚀 Modo 100% automático ativado!', 'running');
        showNotification('Sistema Ultimate ativado - Operação totalmente automática!', 'success');
        
        // Inicia imediatamente se tiver token, senão aguarda
        if (capturedCaptchaToken) {
          paintLoop();
        } else {
          updateStatusMessage('🔍 Aguardando token CAPTCHA automático...', 'info');
        }
      } else {
        state.running = false;
        toggleBtn.innerHTML = `<i class="fas fa-play"></i><span>ATIVAR AUTO</span>`;
        toggleBtn.classList.add('wplace-btn-auto');
        toggleBtn.classList.remove('wplace-btn-stop');
        updateStatusMessage('🛑 Modo automático desativado', 'default');
        showNotification('Sistema parado - Pronto para reativação', 'info');
      }
      
      updateUI();
    });
    
    // Controles do header
    minimizeBtn.addEventListener('click', () => {
      state.minimized = !state.minimized;
      content.style.display = state.minimized ? 'none' : 'block';
      minimizeBtn.innerHTML = `<i class="fas fa-${state.minimized ? 'expand' : 'minus'}"></i>`;
    });
    
    closeBtn.addEventListener('click', () => {
      state.automation.fullAuto = false;
      state.running = false;
      container.remove();
      state.menuOpen = false;
      showNotification('Sistema Ultimate encerrado', 'info');
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

  // =========== FUNÇÕES DE UI AVANÇADAS ===========
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
        notification.style.animation = 'slideIn 0.4s ease-out reverse';
        setTimeout(() => notification.remove(), 400);
      }
    }, 4000);
  };

  const updateStatusMessage = (message, type = 'default') => {
    const statusText = getCachedElement('#statusText');
    if (statusText) {
      statusText.textContent = message;
      statusText.className = `wplace-status status-${type}`;
      console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
    }
  };

  const triggerPaintEffect = () => {
    const panel = getCachedElement('.wplace-panel');
    if (panel) {
      panel.style.animation = 'glow 0.8s ease-out';
      setTimeout(() => {
        panel.style.animation = '';
      }, 800);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const updateUI = () => {
    const toggleBtn = getCachedElement('#toggleBtn');
    if (toggleBtn) {
      if (state.automation.fullAuto) {
        toggleBtn.innerHTML = `<i class="fas fa-stop"></i><span>PARAR AUTO</span>`;
        toggleBtn.classList.remove('wplace-btn-auto');
        toggleBtn.classList.add('wplace-btn-stop');
      } else {
        toggleBtn.innerHTML = `<i class="fas fa-play"></i><span>ATIVAR AUTO</span>`;
        toggleBtn.classList.add('wplace-btn-auto');
        toggleBtn.classList.remove('wplace-btn-stop');
      }
    }
  };

  // =========== ATUALIZAÇÃO DE ESTATÍSTICAS AVANÇADA ===========
  const updateStats = async () => {
    try {
      await getCharge();
      
      // Atualiza tempo de sessão
      if (state.statistics.startTime) {
        state.statistics.sessionTime = Math.floor((Date.now() - state.statistics.startTime) / 1000);
        state.statistics.averageSpeed = state.statistics.sessionTime > 0 ? 
          (state.paintedCount / (state.statistics.sessionTime / 60)).toFixed(1) : 0;
      }
      
      // Calcula métricas
      const total = state.paintedCount + state.failedCount;
      state.successRate = total > 0 ? ((state.paintedCount / total) * 100).toFixed(1) : 0;
      state.statistics.efficiency = Math.round(state.ai.successProbability * parseFloat(state.successRate));
      
      // Progresso diário
      const dailyProgress = Math.min(100, (state.statistics.totalPixelsToday / state.statistics.dailyGoal) * 100);
      
      // Uso de memória estimado
      state.performance.memoryUsage = Math.round((state.ai.patterns.length * 0.1 + cache.responses.size * 0.05));
      
      // Tradução de qualidade
      const qualityMap = { 
        'excellent': 'Excelente', 'good': 'Boa', 'fair': 'Regular', 'poor': 'Ruim' 
      };
      const healthMap = { 
        'healthy': 'Saudável', 'degraded': 'Degradado', 'unhealthy': 'Problema' 
      };
      
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
        '#bestStreak': state.statistics.bestStreak,
        '#efficiency': `${state.statistics.efficiency}%`,
        '#successProb': `${Math.round(state.ai.successProbability * 100)}%`,
        '#currentDelay': `${Math.round(state.ai.adaptiveDelay)}ms`,
        '#strategyName': state.ai.strategies.current,
        '#networkQuality': qualityMap[state.performance.networkQuality] || 'Boa',
        '#serverHealth': healthMap[state.performance.serverHealth] || 'OK',
        '#cacheHits': state.performance.cacheHits,
        '#memoryUsage': `${state.performance.memoryUsage}MB`
      };
      
      Object.entries(updates).forEach(([selector, value]) => {
        const element = getCachedElement(selector);
        if (element) element.textContent = value;
      });
      
      // Atualiza barra de progresso
      const progressBar = getCachedElement('#dailyProgress');
      if (progressBar) {
        progressBar.style.width = `${dailyProgress}%`;
      }
      
      // Atualiza saúde do sistema
      monitoring.checkHealth();
      
    } catch (e) {
      console.warn('Erro ao atualizar estatísticas:', e);
    }
  };

  // =========== INICIALIZAÇÃO ULTIMATE ===========
  console.log('🚀 WPlace Ultimate Bot iniciando sistemas avançados...');
  
  createUltimateUI();
  
  try {
    await getCharge();
    updateStats();
    showNotification('Sistema Ultimate inicializado com sucesso!', 'success');
    updateStatusMessage('✅ Todos os sistemas operacionais - Pronto para automação total');
  } catch (e) {
    console.error('Erro na inicialização:', e);
    showNotification('Sistema inicializado com limitações', 'warning');
    updateStatusMessage('⚠️ Inicializado com algumas limitações');
  }
  
  // Loops de monitoramento
  setInterval(() => {
    if (state.menuOpen) {
      updateStats();
      monitoring.preventIdle();
    }
  }, 5000);
  
  setInterval(() => {
    if (state.menuOpen) {
      monitoring.checkHealth();
    }
  }, 30000);
  
  // Auto-otimização em tempo real
  setInterval(() => {
    if (state.automation.fullAuto && state.running) {
      const newDelay = aiEngine.predictOptimalDelay();
      if (Math.abs(newDelay - state.ai.adaptiveDelay) > 100) {
        state.ai.adaptiveDelay = newDelay;
        console.log(`🎯 IA otimizou delay para ${Math.round(newDelay)}ms`);
      }
    }
  }, 15000);
  
  console.log('✅ WPlace Ultimate Bot carregado - Sistema 100% automático pronto!');
})();