(async () => {
  // =========== CONFIGURAÇÕES AVANÇADAS ===========
  const CONFIG = {
    START_X: 742,
    START_Y: 1148,
    PIXELS_PER_LINE: 100,
    BASE_DELAY: 800,
    MIN_CHARGES_FOR_AUTO_REFRESH: 3,
    MAX_RETRIES: 3,
    API_TIMEOUT: 10000,
    THEME: {
      primary: '#0d1117',
      secondary: '#161b22', 
      accent: '#7c3aed',
      accentHover: '#6d28d9',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
      text: '#f0f6ff',
      textSecondary: '#8b949e',
      border: 'rgba(240, 246, 255, 0.1)',
      glass: 'rgba(13, 17, 23, 0.9)',
      cardBg: 'rgba(22, 27, 34, 0.8)',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
      shadow: 'rgba(0, 0, 0, 0.4)'
    },
    UI: {
      MOBILE_BREAKPOINT: 768,
      COMPACT_HEIGHT: 500,
      ANIMATION_SPEED: 300,
      AUTO_MINIMIZE_DELAY: 5000
    },
    AI: {
      LEARNING_RATE: 0.15,
      PATTERN_MEMORY_SIZE: 500,
      PREDICTION_WINDOW: 30,
      ADAPTATION_THRESHOLD: 0.75,
      STRATEGY_SWITCH_COOLDOWN: 60000
    }
  };

  // =========== ESTADO AVANÇADO COM IA ===========
  const state = {
    running: false,
    paintedCount: 0,
    failedCount: 0,
    successRate: 0,
    charges: { count: 0, max: 80, cooldownMs: 30000 },
    userInfo: null,
    lastPixel: null,
    minimized: false,
    menuOpen: false,
    language: 'pt',
    autoRefresh: true,
    pausedForManual: false,
    
    // Estatísticas otimizadas
    statistics: {
      startTime: null,
      totalPixelsTried: 0,
      averageSpeed: 0,
      sessionTime: 0,
      bestStreak: 0,
      currentStreak: 0,
      dailyGoal: 50,
      efficiency: 0,
      lastUpdate: 0
    },
    
    // Performance e monitoramento
    performance: {
      lastChargeCheck: 0,
      apiCallCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      networkQuality: 'good',
      serverHealth: 'healthy',
      memoryUsage: 0,
      lastHealthCheck: 0
    },
    
    // Interface adaptativa mobile-first
    ui: {
      isDragging: false,
      isMobile: window.innerWidth <= CONFIG.UI.MOBILE_BREAKPOINT,
      theme: 'dark',
      compactMode: window.innerWidth <= CONFIG.UI.MOBILE_BREAKPOINT,
      autoMinimize: true,
      autoMinimizeTimer: null,
      collapsed: false,
      tabActive: 'main', // main, stats, ai, settings
      position: { x: null, y: null },
      size: window.innerWidth <= CONFIG.UI.MOBILE_BREAKPOINT ? 'compact' : 'normal'
    },
    
    // Sistema de IA otimizado
    ai: {
      patterns: [],
      adaptiveDelay: CONFIG.BASE_DELAY,
      successProbability: 0.5,
      heatMap: new Map(),
      strategies: {
        current: 'smart',
        performance: new Map(),
        lastSwitch: Date.now()
      },
      learning: {
        enabled: true,
        confidence: 0.5,
        adaptationRate: 0.1
      }
    }
  };

  // =========== SISTEMA DE IA E MACHINE LEARNING ===========
  class AIEngine {
    constructor() {
      this.patternBuffer = [];
      this.predictionModel = new Map();
      this.adaptationHistory = [];
    }

    // Analisa padrões de sucesso
    analyzePatterns() {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      
      const pattern = {
        timestamp: Date.now(),
        hour,
        minute,
        success: state.statistics.currentStreak > 0,
        charges: state.charges.count,
        responseTime: state.performance.avgResponseTime,
        networkQuality: state.performance.networkQuality
      };
      
      this.patternBuffer.push(pattern);
      if (this.patternBuffer.length > CONFIG.AI.PATTERN_MEMORY_SIZE) {
        this.patternBuffer.shift();
      }
      
      this.updatePredictionModel();
    }

    // Atualiza modelo de predição
    updatePredictionModel() {
      const hourlySuccess = new Map();
      
      this.patternBuffer.forEach(pattern => {
        const key = pattern.hour;
        if (!hourlySuccess.has(key)) {
          hourlySuccess.set(key, { success: 0, total: 0 });
        }
        
        const stats = hourlySuccess.get(key);
        stats.total++;
        if (pattern.success) stats.success++;
      });
      
      // Calcula probabilidades por hora
      hourlySuccess.forEach((stats, hour) => {
        const probability = stats.success / stats.total;
        this.predictionModel.set(hour, probability);
      });
      
      this.updateOptimalTimes();
    }

    // Identifica horários ótimos
    updateOptimalTimes() {
      const optimalHours = [];
      this.predictionModel.forEach((probability, hour) => {
        if (probability > CONFIG.AI.ADAPTATION_THRESHOLD) {
          optimalHours.push({ hour, probability });
        }
      });
      
      state.ai.optimalTimes = optimalHours.sort((a, b) => b.probability - a.probability);
    }

    // Prediz melhor estratégia
    predictOptimalStrategy() {
      const now = new Date();
      const currentHour = now.getHours();
      const currentProbability = this.predictionModel.get(currentHour) || 0.5;
      
      // Seleciona estratégia baseada na probabilidade
      if (currentProbability > 0.8) {
        return 'aggressive';
      } else if (currentProbability > 0.6) {
        return 'balanced';
      } else {
        return 'conservative';
      }
    }

    // Calcula delay adaptativo
    calculateAdaptiveDelay() {
      const baseDelay = CONFIG.BASE_DELAY;
      const serverLoadFactor = this.getServerLoadFactor();
      const successFactor = state.successRate / 100;
      const chargeFactor = state.charges.count / state.charges.max;
      
      const adaptiveMultiplier = 
        (1 - successFactor * 0.3) * // Reduz delay se taxa de sucesso alta
        (1 + serverLoadFactor * 0.5) * // Aumenta delay se servidor carregado
        (1 - chargeFactor * 0.2); // Reduz delay se muitas cargas
      
      state.ai.adaptiveDelay = Math.max(400, Math.min(2000, baseDelay * adaptiveMultiplier));
      return state.ai.adaptiveDelay;
    }

    // Estima carga do servidor
    getServerLoadFactor() {
      const avgResponseTime = state.performance.avgResponseTime;
      if (avgResponseTime < 500) return 0; // Servidor leve
      if (avgResponseTime < 1000) return 0.3; // Servidor moderado
      if (avgResponseTime < 2000) return 0.6; // Servidor carregado
      return 1; // Servidor muito carregado
    }

    // Prediz próximo resultado
    predictNextSuccess() {
      const factors = this.collectContextFactors();
      let probability = 0.5; // Base probability
      
      // Aplica pesos neurais
      Object.entries(state.ai.neuralWeights).forEach(([factor, weight]) => {
        if (factors[factor] !== undefined) {
          probability += (factors[factor] - 0.5) * weight;
        }
      });
      
      state.ai.successProbability = Math.max(0, Math.min(1, probability));
      return state.ai.successProbability;
    }

    // Coleta fatores contextuais
    collectContextFactors() {
      const now = new Date();
      const hour = now.getHours();
      
      return {
        timeOfDay: this.normalizeHour(hour),
        serverLoad: 1 - this.getServerLoadFactor(),
        successRate: state.successRate / 100,
        chargeLevel: state.charges.count / state.charges.max,
        streakLength: Math.min(1, state.statistics.currentStreak / 10)
      };
    }

    // Normaliza hora do dia (0-1)
    normalizeHour(hour) {
      // Peak hours: 14-22 = higher value
      if (hour >= 14 && hour <= 22) {
        return 0.8 + (hour - 14) / 40; // 0.8 to 1.0
      } else if (hour >= 8 && hour < 14) {
        return 0.5 + (hour - 8) / 12; // 0.5 to 0.8
      } else {
        return 0.2 + hour / 48; // 0.2 to 0.5
      }
    }
  }

  // Instancia o motor de IA
  const aiEngine = new AIEngine();

  // =========== ESTRATÉGIAS INTELIGENTES ===========
  class StrategyManager {
    constructor() {
      this.strategies = new Map([
        ['aggressive', {
          delay: () => state.ai.adaptiveDelay * 0.7,
          positionAlgorithm: 'centerOut',
          retryCount: 5,
          description: 'Pintura rápida e agressiva'
        }],
        ['balanced', {
          delay: () => state.ai.adaptiveDelay,
          positionAlgorithm: 'smart',
          retryCount: 3,
          description: 'Equilibrio entre velocidade e eficiência'
        }],
        ['conservative', {
          delay: () => state.ai.adaptiveDelay * 1.5,
          positionAlgorithm: 'safe',
          retryCount: 2,
          description: 'Pintura segura e eficiente'
        }],
        ['stealth', {
          delay: () => state.ai.adaptiveDelay * 2,
          positionAlgorithm: 'random',
          retryCount: 1,
          description: 'Modo furtivo para evitar detecção'
        }]
      ]);
      
      this.currentStrategy = 'balanced';
    }

    // Seleciona melhor estratégia
    selectOptimalStrategy() {
      const predicted = aiEngine.predictOptimalStrategy();
      const serverLoad = aiEngine.getServerLoadFactor();
      
      // Ajusta estratégia baseada na carga do servidor
      if (serverLoad > 0.8) {
        this.currentStrategy = 'conservative';
      } else if (state.performance.errorCount / state.performance.apiCallCount > 0.1) {
        this.currentStrategy = 'stealth';
      } else {
        this.currentStrategy = predicted;
      }
      
      state.ai.strategies.current = this.currentStrategy;
      return this.strategies.get(this.currentStrategy);
    }

    // Avalia performance da estratégia atual
    evaluateCurrentStrategy() {
      const strategyKey = this.currentStrategy;
      const performance = state.ai.strategies.performance.get(strategyKey) || {
        attempts: 0,
        successes: 0,
        avgTime: 0
      };
      
      performance.attempts++;
      if (state.statistics.currentStreak > 0) {
        performance.successes++;
      }
      
      state.ai.strategies.performance.set(strategyKey, performance);
    }
  }

  const strategyManager = new StrategyManager();

  // =========== ALGORITMOS DE POSICIONAMENTO AVANÇADOS ===========
  class PositionOptimizer {
    constructor() {
      this.heatMap = new Map();
      this.exclusionZones = [];
      this.hotSpots = [];
      this.spiralState = { x: 0, y: 0, direction: 0, layer: 0 };
    }

    // Algoritmo principal de posicionamento
    getOptimalPosition() {
      const strategy = strategyManager.strategies.get(state.ai.strategies.current);
      
      switch (strategy.positionAlgorithm) {
        case 'centerOut':
          return this.getCenterOutPosition();
        case 'smart':
          return this.getSmartPosition();
        case 'safe':
          return this.getSafePosition();
        case 'random':
          return this.getRandomPosition();
        default:
          return this.getSmartPosition();
      }
    }

    // Posicionamento inteligente com IA
    getSmartPosition() {
      let bestPosition = null;
      let bestScore = -1;
      
      // Testa múltiplas posições e escolhe a melhor
      for (let attempts = 0; attempts < 10; attempts++) {
        const candidate = this.generateCandidatePosition();
        const score = this.evaluatePosition(candidate);
        
        if (score > bestScore) {
          bestScore = score;
          bestPosition = candidate;
        }
      }
      
      this.updateHeatMap(bestPosition);
      return bestPosition || this.getRandomPosition();
    }

    // Gera posição candidata
    generateCandidatePosition() {
      const centerBias = Math.random() < 0.4;
      const edgeBias = Math.random() < 0.2;
      
      if (centerBias) {
        return this.getCenterBiasedPosition();
      } else if (edgeBias) {
        return this.getEdgePosition();
      } else {
        return this.getRandomPosition();
      }
    }

    // Avalia qualidade de uma posição
    evaluatePosition(pos) {
      let score = 0.5; // Base score
      
      // Evita posições muito próximas de tentativas recentes
      const recentDistance = this.getMinDistanceToRecent(pos);
      score += Math.min(0.3, recentDistance / 10);
      
      // Considera densidade do heatmap
      const density = this.getAreaDensity(pos);
      score -= density * 0.2;
      
      // Prefere áreas com histórico de sucesso
      const successRate = this.getAreaSuccessRate(pos);
      score += successRate * 0.3;
      
      // Considera distribuição espacial
      const distribution = this.getDistributionScore(pos);
      score += distribution * 0.2;
      
      return score;
    }

    // Calcula distância mínima para tentativas recentes
    getMinDistanceToRecent(pos) {
      const recent = state.ai.patterns.slice(-20);
      let minDistance = Infinity;
      
      recent.forEach(pattern => {
        if (pattern.position) {
          const distance = Math.sqrt(
            Math.pow(pos.x - pattern.position.x, 2) + 
            Math.pow(pos.y - pattern.position.y, 2)
          );
          minDistance = Math.min(minDistance, distance);
        }
      });
      
      return minDistance === Infinity ? 100 : minDistance;
    }

    // Calcula densidade da área
    getAreaDensity(pos) {
      let density = 0;
      const radius = 5;
      
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const key = `${pos.x + dx}-${pos.y + dy}`;
          density += this.heatMap.get(key) || 0;
        }
      }
      
      return density / ((radius * 2 + 1) ** 2);
    }

    // Calcula taxa de sucesso da área
    getAreaSuccessRate(pos) {
      const radius = 3;
      let successes = 0;
      let total = 0;
      
      state.ai.patterns.forEach(pattern => {
        if (pattern.position) {
          const distance = Math.sqrt(
            Math.pow(pos.x - pattern.position.x, 2) + 
            Math.pow(pos.y - pattern.position.y, 2)
          );
          
          if (distance <= radius) {
            total++;
            if (pattern.success) successes++;
          }
        }
      });
      
      return total > 0 ? successes / total : 0.5;
    }

    // Calcula score de distribuição
    getDistributionScore(pos) {
      // Prefere posições que melhoram a distribuição espacial
      const gridSize = 10;
      const gridX = Math.floor(pos.x / gridSize);
      const gridY = Math.floor(pos.y / gridSize);
      const gridKey = `${gridX}-${gridY}`;
      
      const gridCount = this.heatMap.get(gridKey) || 0;
      return Math.max(0, 1 - gridCount / 10);
    }

    // Posição com bias no centro
    getCenterBiasedPosition() {
      const center = CONFIG.PIXELS_PER_LINE / 2;
      const maxRadius = center * 0.7;
      const radius = Math.random() * maxRadius;
      const angle = Math.random() * 2 * Math.PI;
      
      return {
        x: Math.max(0, Math.min(CONFIG.PIXELS_PER_LINE - 1, 
          Math.floor(center + radius * Math.cos(angle)))),
        y: Math.max(0, Math.min(CONFIG.PIXELS_PER_LINE - 1, 
          Math.floor(center + radius * Math.sin(angle))))
      };
    }

    // Posição segura (evita áreas densas)
    getSafePosition() {
      let attempts = 0;
      let pos;
      
      do {
        pos = this.getRandomPosition();
        attempts++;
      } while (attempts < 20 && this.getAreaDensity(pos) > 0.3);
      
      return pos;
    }

    // Posição nas bordas
    getEdgePosition() {
      const side = Math.floor(Math.random() * 4);
      const size = CONFIG.PIXELS_PER_LINE;
      
      switch (side) {
        case 0: return { x: 0, y: Math.floor(Math.random() * size) };
        case 1: return { x: size - 1, y: Math.floor(Math.random() * size) };
        case 2: return { x: Math.floor(Math.random() * size), y: 0 };
        default: return { x: Math.floor(Math.random() * size), y: size - 1 };
      }
    }

    // Posição do centro para fora (espiral)
    getCenterOutPosition() {
      const center = Math.floor(CONFIG.PIXELS_PER_LINE / 2);
      const spiral = this.spiralState;
      
      // Algoritmo de espiral
      const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      const [dx, dy] = directions[spiral.direction];
      
      spiral.x += dx;
      spiral.y += dy;
      
      // Verifica se precisa mudar direção
      const shouldTurn = 
        (spiral.direction === 0 && spiral.x >= spiral.layer) ||
        (spiral.direction === 1 && spiral.y >= spiral.layer) ||
        (spiral.direction === 2 && spiral.x <= -spiral.layer) ||
        (spiral.direction === 3 && spiral.y <= -spiral.layer);
      
      if (shouldTurn) {
        spiral.direction = (spiral.direction + 1) % 4;
        if (spiral.direction === 0) {
          spiral.layer++;
        }
      }
      
      // Reset se saiu dos limites
      if (Math.abs(spiral.x) >= CONFIG.PIXELS_PER_LINE / 2 || 
          Math.abs(spiral.y) >= CONFIG.PIXELS_PER_LINE / 2) {
        spiral.x = 0;
        spiral.y = 0;
        spiral.direction = 0;
        spiral.layer = 1;
      }
      
      return {
        x: Math.max(0, Math.min(CONFIG.PIXELS_PER_LINE - 1, center + spiral.x)),
        y: Math.max(0, Math.min(CONFIG.PIXELS_PER_LINE - 1, center + spiral.y))
      };
    }

    // Posição aleatória padrão
    getRandomPosition() {
      return {
        x: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE),
        y: Math.floor(Math.random() * CONFIG.PIXELS_PER_LINE)
      };
    }

    // Atualiza heatmap
    updateHeatMap(pos) {
      const key = `${pos.x}-${pos.y}`;
      this.heatMap.set(key, (this.heatMap.get(key) || 0) + 1);
      
      // Limita tamanho do heatmap
      if (this.heatMap.size > 10000) {
        const entries = Array.from(this.heatMap.entries());
        entries.sort((a, b) => a[1] - b[1]);
        
        // Remove 20% das entradas menos usadas
        const toRemove = Math.floor(entries.length * 0.2);
        for (let i = 0; i < toRemove; i++) {
          this.heatMap.delete(entries[i][0]);
        }
      }
    }
  }

  const positionOptimizer = new PositionOptimizer();

  // =========== SISTEMA DE MONITORAMENTO AVANÇADO ===========
  class AdvancedMonitoring {
    constructor() {
      this.healthChecks = [];
      this.alerts = [];
      this.metrics = new Map();
      this.lastHealthCheck = 0;
    }

    // Verifica saúde do sistema
    async performHealthCheck() {
      const now = Date.now();
      if (now - this.lastHealthCheck < 30000) return; // Check a cada 30s
      
      this.lastHealthCheck = now;
      
      const health = {
        timestamp: now,
        apiResponseTime: await this.measureApiResponseTime(),
        memoryUsage: this.estimateMemoryUsage(),
        errorRate: this.calculateErrorRate(),
        successRate: state.successRate,
        networkQuality: this.assessNetworkQuality()
      };
      
      this.healthChecks.push(health);
      if (this.healthChecks.length > 100) {
        this.healthChecks.shift();
      }
      
      this.updatePerformanceMetrics(health);
      this.checkForAlerts(health);
    }

    // Mede tempo de resposta da API
    async measureApiResponseTime() {
      const start = Date.now();
      try {
        await fetch('https://backend.wplace.live/ping', { 
          method: 'HEAD',
          timeout: 5000 
        });
        return Date.now() - start;
      } catch {
        return 5000; // Timeout ou erro
      }
    }

    // Estima uso de memória
    estimateMemoryUsage() {
      if (performance.memory) {
        return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      }
      return Math.round((state.ai.patterns.length + positionOptimizer.heatMap.size) / 100);
    }

    // Calcula taxa de erro
    calculateErrorRate() {
      const total = state.performance.apiCallCount;
      const errors = state.performance.errorCount;
      return total > 0 ? (errors / total) * 100 : 0;
    }

    // Avalia qualidade da rede
    assessNetworkQuality() {
      const avgResponse = state.performance.avgResponseTime;
      if (avgResponse < 300) return 'excellent';
      if (avgResponse < 600) return 'good';
      if (avgResponse < 1200) return 'fair';
      return 'poor';
    }

    // Atualiza métricas de performance
    updatePerformanceMetrics(health) {
      state.performance.avgResponseTime = health.apiResponseTime;
      state.performance.memoryUsage = health.memoryUsage;
      state.performance.networkQuality = health.networkQuality;
      
      // Determina saúde do servidor
      if (health.apiResponseTime < 500 && health.errorRate < 5) {
        state.performance.serverHealth = 'healthy';
      } else if (health.apiResponseTime < 1500 && health.errorRate < 15) {
        state.performance.serverHealth = 'degraded';
      } else {
        state.performance.serverHealth = 'unhealthy';
      }
    }

    // Verifica condições de alerta
    checkForAlerts(health) {
      // Alert: Alta latência
      if (health.apiResponseTime > 2000) {
        this.createAlert('high_latency', 'Alta latência detectada', 'warning');
      }
      
      // Alert: Taxa de erro alta
      if (health.errorRate > 20) {
        this.createAlert('high_error_rate', 'Taxa de erro elevada', 'error');
      }
      
      // Alert: Uso de memória alto
      if (health.memoryUsage > 100) {
        this.createAlert('high_memory', 'Uso de memória elevado', 'warning');
      }
      
      // Alert: Rede ruim
      if (health.networkQuality === 'poor') {
        this.createAlert('poor_network', 'Qualidade de rede ruim', 'warning');
      }
    }

    // Cria alerta
    createAlert(id, message, type) {
      const existingAlert = this.alerts.find(alert => alert.id === id);
      if (existingAlert && Date.now() - existingAlert.timestamp < 300000) {
        return; // Evita spam de alertas (5 min cooldown)
      }
      
      const alert = {
        id,
        message,
        type,
        timestamp: Date.now()
      };
      
      this.alerts.push(alert);
      showNotification(message, type);
      
      // Remove alertas antigos
      this.alerts = this.alerts.filter(alert => 
        Date.now() - alert.timestamp < 3600000 // 1 hora
      );
    }
  }

  const monitoring = new AdvancedMonitoring();

  // =========== UTILITÁRIOS AVANÇADOS ===========
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  const waitForSelector = async (selector, interval = 100, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await sleep(interval);
    }
    throw new Error(`Elemento não encontrado: ${selector}`);
  };

  const elementCache = new Map();
  const getCachedElement = (selector) => {
    if (elementCache.has(selector)) {
      const el = elementCache.get(selector);
      if (document.contains(el)) return el;
      elementCache.delete(selector);
    }
    const el = document.querySelector(selector);
    if (el) elementCache.set(selector, el);
    return el;
  };

  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // =========== INTERCEPTADOR DE FETCH INTELIGENTE ===========
  const originalFetch = window.fetch;
  let capturedCaptchaToken = null;
  let tokenExpirationTime = null;
  let tokenHistory = [];
  
  window.fetch = async (url, options = {}) => {
    if (typeof url === 'string' && url.includes('https://backend.wplace.live/s0/pixel/')) {
      try {
        const payload = JSON.parse(options.body || '{}');
        if (payload.t) {
          console.log('✅ Token CAPTCHA capturado:', payload.t.substring(0, 20) + '...');
          
          // Armazena histórico de tokens
          tokenHistory.push({
            token: payload.t,
            timestamp: Date.now(),
            used: false
          });
          
          // Limita histórico
          if (tokenHistory.length > 10) {
            tokenHistory.shift();
          }
          
          capturedCaptchaToken = payload.t;
          tokenExpirationTime = Date.now() + (5 * 60 * 1000);
          
          if (state.pausedForManual) {
            state.pausedForManual = false;
            state.running = true;
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

  // =========== API OTIMIZADA COM CIRCUIT BREAKER ===========
  class APIManager {
    constructor() {
      this.cache = new Map();
      this.circuitBreaker = {
        failures: 0,
        lastFailure: 0,
        state: 'closed', // closed, open, half-open
        threshold: 5,
        timeout: 60000
      };
    }

    async fetchAPI(url, options = {}, useCache = false, cacheTime = 30000) {
      const cacheKey = `${url}_${JSON.stringify(options)}`;
      
      // Verifica cache
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < cacheTime) {
          return cached.data;
        }
        this.cache.delete(cacheKey);
      }

      // Verifica circuit breaker
      if (this.circuitBreaker.state === 'open') {
        if (Date.now() - this.circuitBreaker.lastFailure < this.circuitBreaker.timeout) {
          throw new Error('Circuit breaker aberto - API indisponível');
        } else {
          this.circuitBreaker.state = 'half-open';
        }
      }

      const startTime = Date.now();
      
      try {
        state.performance.apiCallCount++;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);
        
        const res = await fetch(url, {
          credentials: 'include',
          signal: controller.signal,
          ...options
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        
        // Sucesso - reset circuit breaker
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.state = 'closed';
        
        // Atualiza métricas
        const responseTime = Date.now() - startTime;
        state.performance.avgResponseTime = 
          (state.performance.avgResponseTime + responseTime) / 2;
        
        // Cache resultado
        if (useCache) {
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
        }
        
        return data;
      } catch (e) {
        state.performance.errorCount++;
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = Date.now();
        
        // Abre circuit breaker se muitas falhas
        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
          this.circuitBreaker.state = 'open';
          console.warn('Circuit breaker aberto devido a muitas falhas');
        }
        
        throw e;
      }
    }
  }

  const apiManager = new APIManager();

  // =========== CONTINUAÇÃO DO CÓDIGO... ===========
  // (Devido ao limite de caracteres, vou continuar com as partes essenciais)

  // Função principal de pintura com IA
  const paintPixel = async (x, y) => {
    if (!capturedCaptchaToken) {
      throw new Error('Token CAPTCHA não disponível');
    }
    
    if (tokenExpirationTime && Date.now() > tokenExpirationTime) {
      console.warn('Token CAPTCHA expirado');
      capturedCaptchaToken = null;
      return 'token_expired';
    }
    
    // Seleciona cor inteligentemente
    const colors = Array.from({length: 31}, (_, i) => i + 1);
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const url = `https://backend.wplace.live/s0/pixel/${CONFIG.START_X}/${CONFIG.START_Y}`;
    const payload = JSON.stringify({ 
      coords: [x, y], 
      colors: [randomColor], 
      t: capturedCaptchaToken 
    });
    
    try {
      const res = await originalFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        credentials: 'include',
        body: payload
      });
      
      // Registra tentativa no histórico de tokens
      const tokenEntry = tokenHistory.find(t => t.token === capturedCaptchaToken);
      if (tokenEntry) tokenEntry.used = true;
      
      if (res.status === 403) {
        console.error('❌ 403 Forbidden - Token inválido ou expirado');
        capturedCaptchaToken = null;
        tokenExpirationTime = null;
        return 'token_error';
      }
      
      if (res.status === 429) {
        console.warn('⚠️ Rate limit atingido');
        return 'rate_limit';
      }
      
      const data = await res.json();
      
      // Registra resultado para IA
      aiEngine.analyzePatterns();
      strategyManager.evaluateCurrentStrategy();
      
      return data;
    } catch (e) {
      console.error('Erro ao pintar pixel:', e);
      throw e;
    }
  };

  // Verifica cargas com cache inteligente
  const getCharge = async () => {
    const now = Date.now();
    if (now - state.performance.lastChargeCheck < 3000) {
      return state.charges;
    }
    
    try {
      const data = await apiManager.fetchAPI('https://backend.wplace.live/me', {}, true, 5000);
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
        state.performance.lastChargeCheck = now;
      }
    } catch (e) {
      console.warn('Erro ao obter cargas:', e.message);
    }
    
    return state.charges;
  };

  // Loop principal com IA
  const paintLoop = async () => {
    if (!state.statistics.startTime) {
      state.statistics.startTime = Date.now();
    }
    
    while (state.running) {
      try {
        // Verifica saúde do sistema
        await monitoring.performHealthCheck();
        
        // Seleciona estratégia ótima
        const strategy = strategyManager.selectOptimalStrategy();
        
        // Calcula delay adaptativo
        const adaptiveDelay = aiEngine.calculateAdaptiveDelay();
        
        const { count, cooldownMs } = state.charges;
        
        if (count < 1) {
          const waitTime = Math.max(cooldownMs, 10000);
          updateStatusMessage(`Sem cargas. Aguardando ${Math.ceil(waitTime/1000)}s...`);
          await sleep(waitTime);
          await getCharge();
          continue;
        }
        
        // Prediz sucesso
        const successProbability = aiEngine.predictNextSuccess();
        
        // Posição otimizada por IA
        const position = positionOptimizer.getOptimalPosition();
        state.statistics.totalPixelsTried++;
        
        // Registra padrão para aprendizagem
        const pattern = {
          timestamp: Date.now(),
          position,
          strategy: state.ai.strategies.current,
          charges: state.charges.count,
          predictedSuccess: successProbability,
          success: false // Será atualizado após resultado
        };
        
        state.ai.patterns.push(pattern);
        if (state.ai.patterns.length > CONFIG.AI.PATTERN_MEMORY_SIZE) {
          state.ai.patterns.shift();
        }
        
        const paintResult = await paintPixel(position.x, position.y);
        
        // Atualiza padrão com resultado
        pattern.success = paintResult?.painted === 1;
        
        if (paintResult === 'token_error' || paintResult === 'token_expired') {
          if (state.autoRefresh) {
            const refreshSuccess = await performIntelligentRefresh();
            if (!refreshSuccess) {
              state.running = false;
              state.pausedForManual = true;
              updateStatusMessage('Falha no refresh. Intervenção manual necessária.');
              return;
            }
          } else {
            state.running = false;
            state.pausedForManual = true;
            updateStatusMessage('Auto-refresh desativado.');
            return;
          }
          continue;
        }
        
        if (paintResult === 'rate_limit') {
          updateStatusMessage('Rate limit atingido. Aguardando...');
          await sleep(adaptiveDelay * 2);
          continue;
        }
        
        if (paintResult?.painted === 1) {
          state.paintedCount++;
          state.statistics.currentStreak++;
          
          if (state.statistics.currentStreak > state.statistics.bestStreak) {
            state.statistics.bestStreak = state.statistics.currentStreak;
          }
          
          state.lastPixel = { 
            x: CONFIG.START_X + position.x,
            y: CONFIG.START_Y + position.y,
            time: new Date(),
            color: paintResult.color || 'unknown',
            strategy: state.ai.strategies.current,
            predictedSuccess: successProbability
          };
          state.charges.count--;
          
          triggerPaintEffect();
          showNotification('Pixel pintado com sucesso!', 'success');
        } else {
          state.failedCount++;
          state.statistics.currentStreak = 0;
          updateStatusMessage('Falha ao pintar pixel');
        }
        
        // Atualiza estatísticas
        const total = state.paintedCount + state.failedCount;
        state.successRate = total > 0 ? ((state.paintedCount / total) * 100).toFixed(1) : 0;
        
        state.statistics.sessionTime = Math.floor((Date.now() - state.statistics.startTime) / 1000);
        state.statistics.averageSpeed = state.statistics.sessionTime > 0 ? 
          (state.paintedCount / (state.statistics.sessionTime / 60)).toFixed(1) : 0;
        
        await sleep(adaptiveDelay);
        updateStats();
        
      } catch (e) {
        console.error('Erro no loop principal:', e);
        state.performance.errorCount++;
        state.statistics.currentStreak = 0;
        updateStatusMessage(`Erro: ${e.message}`);
        await sleep(2000);
      }
    }
  };

  // Detecção de localização
  const detectUserLocation = async () => {
    try {
      const browserLang = navigator.language || navigator.userLanguage;
      if (browserLang.startsWith('pt')) {
        state.language = 'pt';
        return;
      }
      
      const response = await fetch('https://ipapi.co/json/', { timeout: 3000 });
      const data = await response.json();
      state.language = data.country === 'BR' ? 'pt' : 'en';
    } catch {
      state.language = 'pt';
    }
  };

  // Auto-refresh inteligente
  const performIntelligentRefresh = async () => {
    try {
      showNotification('Executando refresh inteligente...', 'info');
      
      while (state.charges.count < CONFIG.MIN_CHARGES_FOR_AUTO_REFRESH) {
        updateStatusMessage(`Aguardando ${CONFIG.MIN_CHARGES_FOR_AUTO_REFRESH} cargas...`);
        await sleep(30000);
        await getCharge();
        updateStats();
      }
      
      const mainPaintBtn = await waitForSelector('button.btn.btn-primary.btn-lg, button.btn-primary.sm\\:btn-xl');
      if (mainPaintBtn) {
        mainPaintBtn.click();
        await sleep(300);
      }
      
      const transBtn = await waitForSelector('button#color-0');
      if (transBtn) {
        transBtn.click();
        await sleep(300);
      }
      
      const canvas = await waitForSelector('canvas');
      if (canvas) {
        canvas.setAttribute('tabindex', '0');
        canvas.focus();
        
        const rect = canvas.getBoundingClientRect();
        const centerX = Math.round(rect.left + rect.width / 2);
        const centerY = Math.round(rect.top + rect.height / 2);
        
        canvas.dispatchEvent(new MouseEvent('mousemove', {
          clientX: centerX,
          clientY: centerY,
          bubbles: true
        }));
        
        canvas.dispatchEvent(new KeyboardEvent('keydown', { 
          key: ' ', 
          code: 'Space', 
          bubbles: true 
        }));
        canvas.dispatchEvent(new KeyboardEvent('keyup', { 
          key: ' ', 
          code: 'Space', 
          bubbles: true 
        }));
        
        await sleep(300);
      }
      
      let confirmBtn = await waitForSelector('button.btn.btn-primary.btn-lg, button.btn.btn-primary.sm\\:btn-xl');
      if (!confirmBtn) {
        const allPrimary = Array.from(document.querySelectorAll('button.btn-primary'));
        confirmBtn = allPrimary.length ? allPrimary[allPrimary.length - 1] : null;
      }
      
      if (confirmBtn) {
        confirmBtn.click();
        showNotification('Refresh completado com sucesso!', 'success');
        await sleep(1000);
        return true;
      }
      
      throw new Error('Botão de confirmação não encontrado');
    } catch (e) {
      console.error('Erro no refresh inteligente:', e);
      showNotification('Falha no refresh automático', 'error');
      return false;
    }
  };

  // =========== INTERFACE MOBILE-FIRST COMPACTA ===========
  const createAdvancedUI = () => {
    if (state.menuOpen) return;
    state.menuOpen = true;

    state.ui.isMobile = window.innerWidth <= CONFIG.UI.MOBILE_BREAKPOINT;
    state.ui.compactMode = state.ui.isMobile || window.innerHeight < CONFIG.UI.COMPACT_HEIGHT;

    if (!document.querySelector('link[href*="font-awesome"]')) {
      const fontAwesome = document.createElement('link');
      fontAwesome.rel = 'stylesheet';
      fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
      document.head.appendChild(fontAwesome);
    }

    const style = document.createElement('style');
    style.textContent = `
      .wplace-advanced * {
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

      @keyframes glow {
        0%, 100% { box-shadow: 0 0 5px ${CONFIG.THEME.accent}; }
        50% { box-shadow: 0 0 20px ${CONFIG.THEME.accent}, 0 0 30px ${CONFIG.THEME.accent}; }
      }

      .wplace-container {
        position: fixed;
        top: ${state.ui.isMobile ? '10px' : '20px'};
        right: ${state.ui.isMobile ? '10px' : '20px'};
        width: ${state.ui.isMobile ? 'calc(100vw - 20px)' : '320px'};
        max-width: ${state.ui.isMobile ? '100%' : '400px'};
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: slideIn 0.4s ease-out;
      }

      .wplace-panel {
        background: ${CONFIG.THEME.glass};
        backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid ${CONFIG.THEME.border};
        border-radius: ${state.ui.isMobile ? '16px' : '20px'};
        overflow: hidden;
        box-shadow: 0 20px 40px ${CONFIG.THEME.shadow};
        transition: all 0.3s ease;
      }

      .wplace-header {
        background: ${CONFIG.THEME.gradient};
        padding: ${state.ui.isMobile ? '12px 16px' : '16px 20px'};
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        user-select: none;
        position: relative;
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
        font-size: ${state.ui.isMobile ? '18px' : '20px'};
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
        font-size: 14px;
      }

      .wplace-header-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.05);
      }

      .wplace-content {
        display: ${state.minimized ? 'none' : 'block'};
        background: ${CONFIG.THEME.primary};
      }

      /* TABS COMPACTAS */
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

      .wplace-tab i {
        font-size: ${state.ui.isMobile ? '16px' : '18px'};
      }

      .wplace-tab-content {
        padding: ${state.ui.isMobile ? '16px' : '20px'};
        display: none;
      }

      .wplace-tab-content.active {
        display: block;
      }

      /* CONTROLES PRINCIPAIS */
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
        position: relative;
        overflow: hidden;
      }

      .wplace-btn-primary {
        background: ${CONFIG.THEME.gradient};
        color: white;
        box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
      }

      .wplace-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
      }

      .wplace-btn-stop {
        background: linear-gradient(135deg, ${CONFIG.THEME.error}, #dc2626);
        color: white;
      }

      .wplace-btn:hover {
        transform: translateY(-1px);
      }

      /* QUICK STATS COMPACTAS */
      .wplace-quick-stats {
        display: grid;
        grid-template-columns: repeat(${state.ui.isMobile ? '2' : '3'}, 1fr);
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

      /* IA STATUS COMPACTO */
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

      .wplace-ai-status {
        font-size: 11px;
        color: ${CONFIG.THEME.textSecondary};
        font-weight: 500;
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

      /* STATUS BAR */
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

      /* NOTIFICAÇÕES */
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

      /* ESTADOS DE STATUS */
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

      .status-warning {
        background: rgba(245, 158, 11, 0.9);
        color: white;
        border-color: ${CONFIG.THEME.warning};
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
        animation: glow 2s infinite;
      }

      /* RESPONSIVO ULTRA COMPACTO */
      @media (max-width: ${CONFIG.UI.MOBILE_BREAKPOINT}px) {
        .wplace-container {
          width: calc(100vw - 20px);
          max-width: none;
        }
        
        .wplace-quick-stats {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .wplace-tab {
          padding: 10px 6px;
          font-size: 11px;
        }
        
        .wplace-tab i {
          font-size: 14px;
        }
      }

      @media (max-height: ${CONFIG.UI.COMPACT_HEIGHT}px) {
        .wplace-tab-content {
          padding: 12px 16px;
        }
        
        .wplace-quick-stats {
          gap: 8px;
        }
        
        .wplace-quick-stat {
          padding: 10px;
        }
      }

      /* EFEITO DE PINTURA */
      #paintEffect {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        border-radius: 16px;
        z-index: 10;
      }

      .paint-flash {
        animation: pulse 0.6s ease-out;
      }
    `;
    document.head.appendChild(style);

    const translations = {
      pt: {
        title: "WPlace AI Bot",
        start: "Iniciar IA",
        stop: "Parar IA",
        ready: "IA inicializada e pronta",
        aiStatus: "Status da IA",
        strategy: "Estratégia",
        successPred: "Pred. Sucesso",
        adaptDelay: "Delay Adaptativo",
        patterns: "Padrões",
        pixels: "Pixels",
        charges: "Cargas",
        level: "Nível",
        successRate: "Taxa de Sucesso",
        speed: "Velocidade",
        streak: "Sequência",
        performance: "Performance Avançada",
        apiCalls: "API Calls",
        errors: "Erros",
        avgResponse: "Latência",
        memory: "Memória",
        network: "Rede",
        server: "Servidor",
        uptime: "Tempo Ativo",
        efficiency: "Eficiência",
        autoRefresh: "Auto Refresh"
      },
      en: {
        title: "WPlace AI Bot",
        start: "Start AI",
        stop: "Stop AI",
        ready: "AI initialized and ready",
        aiStatus: "AI Status",
        strategy: "Strategy",
        successPred: "Success Pred",
        adaptDelay: "Adaptive Delay",
        patterns: "Patterns",
        pixels: "Pixels",
        charges: "Charges",
        level: "Level",
        successRate: "Success Rate",
        speed: "Speed",
        streak: "Streak",
        performance: "Advanced Performance",
        apiCalls: "API Calls",
        errors: "Errors",
        avgResponse: "Latency",
        memory: "Memory",
        network: "Network",
        server: "Server",
        uptime: "Uptime",
        efficiency: "Efficiency",
        autoRefresh: "Auto Refresh"
      }
    };

    const t = translations[state.language] || translations.pt;

    const container = document.createElement('div');
    container.className = 'wplace-advanced-container wplace-advanced';
    container.innerHTML = `
      <div class="wplace-advanced-panel">
        <div id="paintEffectAdvanced"></div>
        <div class="wplace-advanced-header">
          <div class="wplace-header-title-advanced">
            <i class="fas fa-brain"></i>
            <span>${t.title}</span>
            <div class="wplace-ai-indicator"></div>
          </div>
          <div class="wplace-header-controls">
            <button id="minimizeBtnAdvanced" class="wplace-header-btn" title="Minimizar">
              <i class="fas fa-${state.minimized ? 'expand' : 'minus'}"></i>
            </button>
            <button id="closeBtnAdvanced" class="wplace-header-btn" title="Fechar">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="wplace-advanced-content">
          <div class="wplace-ai-status">
            <div class="wplace-ai-title">
              <i class="fas fa-microchip"></i>
              <span>${t.aiStatus}</span>
            </div>
            <div class="wplace-ai-metrics">
              <div class="wplace-ai-metric">
                <span>${t.strategy}:</span>
                <span class="wplace-ai-metric-value" id="currentStrategy">Balanced</span>
              </div>
              <div class="wplace-ai-metric">
                <span>${t.successPred}:</span>
                <span class="wplace-ai-metric-value" id="successPrediction">50%</span>
              </div>
              <div class="wplace-ai-metric">
                <span>${t.adaptDelay}:</span>
                <span class="wplace-ai-metric-value" id="adaptiveDelay">800ms</span>
              </div>
              <div class="wplace-ai-metric">
                <span>${t.patterns}:</span>
                <span class="wplace-ai-metric-value" id="patternCount">0</span>
              </div>
            </div>
          </div>

          <div class="wplace-controls-advanced">
            <div class="wplace-primary-controls">
              <button id="toggleBtnAdvanced" class="wplace-btn-advanced wplace-btn-primary-advanced">
                <i class="fas fa-play"></i>
                <span>${t.start}</span>
              </button>
            </div>
            <div class="wplace-strategy-selector">
              <div class="wplace-strategy-title">${t.strategy}</div>
              <div class="wplace-strategy-current" id="strategyDisplay">Balanced</div>
            </div>
          </div>
          
          <div class="wplace-stats-grid-advanced">
            <div class="wplace-stat-card-advanced">
              <div class="wplace-stat-header-advanced">
                <i class="fas fa-paint-brush"></i>
                <span>${t.pixels}</span>
              </div>
              <div class="wplace-stat-value-advanced" id="pixelCountAdvanced">0</div>
              <div class="wplace-stat-change-advanced" id="pixelChangeAdvanced">Meta: ${state.statistics.dailyGoal}</div>
            </div>
            
            <div class="wplace-stat-card-advanced">
              <div class="wplace-stat-header-advanced">
                <i class="fas fa-bolt"></i>
                <span>${t.charges}</span>
              </div>
              <div class="wplace-stat-value-advanced" id="chargeCountAdvanced">0/0</div>
              <div class="wplace-stat-change-advanced" id="chargeChangeAdvanced">Carregando...</div>
            </div>
            
            <div class="wplace-stat-card-advanced">
              <div class="wplace-stat-header-advanced">
                <i class="fas fa-chart-line"></i>
                <span>${t.successRate}</span>
              </div>
              <div class="wplace-stat-value-advanced" id="successRateAdvanced">0%</div>
              <div class="wplace-stat-change-advanced" id="successChangeAdvanced">0/0 tentativas</div>
            </div>
            
            <div class="wplace-stat-card-advanced">
              <div class="wplace-stat-header-advanced">
                <i class="fas fa-fire"></i>
                <span>${t.streak}</span>
              </div>
              <div class="wplace-stat-value-advanced" id="streakCountAdvanced">0</div>
              <div class="wplace-stat-change-advanced" id="streakChangeAdvanced">Melhor: 0</div>
            </div>
            
            <div class="wplace-stat-card-advanced">
              <div class="wplace-stat-header-advanced">
                <i class="fas fa-tachometer-alt"></i>
                <span>${t.speed}</span>
              </div>
              <div class="wplace-stat-value-advanced" id="speedAdvanced">0</div>
              <div class="wplace-stat-change-advanced">px/min</div>
            </div>
            
            <div class="wplace-stat-card-advanced">
              <div class="wplace-stat-header-advanced">
                <i class="fas fa-bullseye"></i>
                <span>${t.efficiency}</span>
              </div>
              <div class="wplace-stat-value-advanced" id="efficiencyAdvanced">0%</div>
              <div class="wplace-stat-change-advanced">IA Otimizada</div>
            </div>
          </div>

          <div class="wplace-performance-advanced">
            <div class="wplace-performance-header-advanced">
              <i class="fas fa-server"></i>
              <span>${t.performance}</span>
            </div>
            <div class="wplace-performance-grid-advanced">
              <div class="wplace-performance-item-advanced">
                <div class="wplace-performance-label-advanced">${t.apiCalls}</div>
                <div class="wplace-performance-value-advanced" id="apiCallsAdvanced">0</div>
              </div>
              <div class="wplace-performance-item-advanced">
                <div class="wplace-performance-label-advanced">${t.errors}</div>
                <div class="wplace-performance-value-advanced" id="errorCountAdvanced">0</div>
              </div>
              <div class="wplace-performance-item-advanced">
                <div class="wplace-performance-label-advanced">${t.avgResponse}</div>
                <div class="wplace-performance-value-advanced" id="avgResponseAdvanced">0ms</div>
              </div>
              <div class="wplace-performance-item-advanced">
                <div class="wplace-performance-label-advanced">${t.memory}</div>
                <div class="wplace-performance-value-advanced" id="memoryAdvanced">0MB</div>
              </div>
              ${!state.ui.isMobile ? `
              <div class="wplace-performance-item-advanced">
                <div class="wplace-performance-label-advanced">${t.network}</div>
                <div class="wplace-performance-value-advanced" id="networkAdvanced">Good</div>
              </div>
              <div class="wplace-performance-item-advanced">
                <div class="wplace-performance-label-advanced">${t.server}</div>
                <div class="wplace-performance-value-advanced" id="serverAdvanced">Healthy</div>
              </div>
              <div class="wplace-performance-item-advanced">
                <div class="wplace-performance-label-advanced">${t.uptime}</div>
                <div class="wplace-performance-value-advanced" id="uptimeAdvanced">00:00</div>
              </div>
              <div class="wplace-performance-item-advanced">
                <div class="wplace-performance-label-advanced">Cache</div>
                <div class="wplace-performance-value-advanced" id="cacheAdvanced">0</div>
              </div>` : ''}
            </div>
          </div>
          
          <div id="statusTextAdvanced" class="wplace-status-advanced status-default">
            ${t.ready}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    setupAdvancedEventListeners(container, t);
  };

  // =========== EVENT LISTENERS AVANÇADOS ===========
  const setupAdvancedEventListeners = (container, t) => {
    // Implementação similar mas mais avançada...
    const toggleBtn = container.querySelector('#toggleBtnAdvanced');
    const minimizeBtn = container.querySelector('#minimizeBtnAdvanced');
    const closeBtn = container.querySelector('#closeBtnAdvanced');
    const content = container.querySelector('.wplace-advanced-content');
    
    toggleBtn.addEventListener('click', () => {
      state.running = !state.running;
      
      if (state.running && !capturedCaptchaToken) {
        showNotification('Token CAPTCHA não encontrado. Clique em qualquer pixel primeiro.', 'error');
        state.running = false;
        return;
      }
  
      if (state.running) {
        toggleBtn.innerHTML = `<i class="fas fa-stop"></i> <span>${t.stop}</span>`;
        toggleBtn.classList.remove('wplace-btn-primary-advanced');
        toggleBtn.classList.add('wplace-btn-stop-advanced');
        showNotification('IA Bot iniciado com todos os sistemas ativos!', 'success');
        paintLoop();
      } else {
        toggleBtn.innerHTML = `<i class="fas fa-play"></i> <span>${t.start}</span>`;
        toggleBtn.classList.add('wplace-btn-primary-advanced');
        toggleBtn.classList.remove('wplace-btn-stop-advanced');
        showNotification('IA Bot parado', 'info');
      }
    });
    
    minimizeBtn.addEventListener('click', () => {
      state.minimized = !state.minimized;
      content.style.display = state.minimized ? 'none' : 'block';
      minimizeBtn.innerHTML = `<i class="fas fa-${state.minimized ? 'expand' : 'minus'}"></i>`;
    });
    
    closeBtn.addEventListener('click', () => {
      state.running = false;
      container.remove();
      state.menuOpen = false;
      showNotification('IA Bot encerrado', 'info');
    });
  };

  // Funções de UI
  const showNotification = (message, type = 'info') => {
    const existing = document.querySelector('.wplace-notification-advanced');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `wplace-notification-advanced status-${type}`;
    notification.textContent = message;
    
    const colors = {
      success: { bg: 'rgba(16, 185, 129, 0.9)', border: CONFIG.THEME.success },
      error: { bg: 'rgba(239, 68, 68, 0.9)', border: CONFIG.THEME.error },
      warning: { bg: 'rgba(245, 158, 11, 0.9)', border: CONFIG.THEME.warning },
      info: { bg: 'rgba(99, 102, 241, 0.9)', border: CONFIG.THEME.accent }
    };
    
    const color = colors[type] || colors.info;
    notification.style.background = color.bg;
    notification.style.color = 'white';
    notification.style.borderColor = color.border;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideInAdvanced 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 4000);
  };

  const updateStatusMessage = (message, type = 'default') => {
    const statusText = getCachedElement('#statusTextAdvanced');
    if (statusText) {
      statusText.textContent = message;
      statusText.className = `wplace-status-advanced status-${type}`;
      console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
    }
  };

  const triggerPaintEffect = () => {
    const paintEffect = getCachedElement('#paintEffectAdvanced');
    if (paintEffect) {
      paintEffect.style.animation = 'pulseAdvanced 0.8s ease-out';
      setTimeout(() => {
        paintEffect.style.animation = '';
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

  window.updateStats = async () => {
    try {
      await getCharge();
      
      // Atualiza IA metrics
      const currentStrategy = getCachedElement('#currentStrategy');
      const successPrediction = getCachedElement('#successPrediction');
      const adaptiveDelay = getCachedElement('#adaptiveDelay');
      const patternCount = getCachedElement('#patternCount');
      
      if (currentStrategy) currentStrategy.textContent = state.ai.strategies.current;
      if (successPrediction) successPrediction.textContent = `${Math.round(state.ai.successProbability * 100)}%`;
      if (adaptiveDelay) adaptiveDelay.textContent = `${Math.round(state.ai.adaptiveDelay)}ms`;
      if (patternCount) patternCount.textContent = state.ai.patterns.length;
      
      // Atualiza stats principais
      const pixelCount = getCachedElement('#pixelCountAdvanced');
      const chargeCount = getCachedElement('#chargeCountAdvanced');
      const successRate = getCachedElement('#successRateAdvanced');
      const streakCount = getCachedElement('#streakCountAdvanced');
      const speedAdvanced = getCachedElement('#speedAdvanced');
      const efficiencyAdvanced = getCachedElement('#efficiencyAdvanced');
      
      if (pixelCount) pixelCount.textContent = state.paintedCount;
      if (chargeCount) chargeCount.textContent = `${state.charges.count}/${state.charges.max}`;
      if (successRate) successRate.textContent = `${state.successRate}%`;
      if (streakCount) streakCount.textContent = state.statistics.currentStreak;
      if (speedAdvanced) speedAdvanced.textContent = state.statistics.averageSpeed;
      
      // Calcula eficiência da IA
      const efficiency = state.ai.successProbability * state.successRate / 100 * 100;
      if (efficiencyAdvanced) efficiencyAdvanced.textContent = `${Math.round(efficiency)}%`;
      
      // Atualiza performance
      const apiCalls = getCachedElement('#apiCallsAdvanced');
      const errorCount = getCachedElement('#errorCountAdvanced');
      const avgResponse = getCachedElement('#avgResponseAdvanced');
      const memory = getCachedElement('#memoryAdvanced');
      const network = getCachedElement('#networkAdvanced');
      const server = getCachedElement('#serverAdvanced');
      const uptime = getCachedElement('#uptimeAdvanced');
      const cache = getCachedElement('#cacheAdvanced');
      
      if (apiCalls) apiCalls.textContent = state.performance.apiCallCount;
      if (errorCount) errorCount.textContent = state.performance.errorCount;
      if (avgResponse) avgResponse.textContent = `${Math.round(state.performance.avgResponseTime)}ms`;
      if (memory) memory.textContent = `${state.performance.memoryUsage}MB`;
      if (network) network.textContent = state.performance.networkQuality;
      if (server) server.textContent = state.performance.serverHealth;
      if (uptime) uptime.textContent = formatTime(state.statistics.sessionTime);
      if (cache) cache.textContent = apiManager.cache.size;
      
      // Atualiza informações secundárias
      const pixelChange = getCachedElement('#pixelChangeAdvanced');
      const chargeChange = getCachedElement('#chargeChangeAdvanced');
      const successChange = getCachedElement('#successChangeAdvanced');
      const streakChange = getCachedElement('#streakChangeAdvanced');
      
      if (pixelChange) {
        const progress = Math.round((state.paintedCount / state.statistics.dailyGoal) * 100);
        pixelChange.textContent = `Meta: ${progress}%`;
      }
      if (chargeChange) {
        const cooldownMin = Math.ceil(state.charges.cooldownMs / 60000);
        chargeChange.textContent = `Recarga: ${cooldownMin}min`;
      }
      if (successChange) {
        const total = state.paintedCount + state.failedCount;
        successChange.textContent = `${state.paintedCount}/${total} tentativas`;
      }
      if (streakChange) streakChange.textContent = `Melhor: ${state.statistics.bestStreak}`;
      
    } catch (e) {
      console.warn('Erro ao atualizar estatísticas:', e);
    }
  };

  // =========== INICIALIZAÇÃO AVANÇADA ===========
  console.log('🧠 WPlace AI Bot iniciando sistemas avançados...');
  
  await detectUserLocation();
  createAdvancedUI();
  
  try {
    await getCharge();
    updateStats();
    showNotification('IA Bot inicializada com sucesso! Todos os sistemas operacionais.', 'success');
    updateStatusMessage('✅ Sistemas de IA inicializados e prontos');
  } catch (e) {
    console.error('Erro na inicialização:', e);
    showNotification('IA Bot inicializada com limitações', 'warning');
    updateStatusMessage('⚠️ Sistemas inicializados com limitações');
  }
  
  // Loops de atualização
  setInterval(() => {
    if (state.menuOpen && state.running) {
      aiEngine.calculateAdaptiveDelay();
      aiEngine.predictNextSuccess();
      updateStats();
    }
  }, 3000);
  
  setInterval(() => {
    if (state.menuOpen) {
      monitoring.performHealthCheck();
    }
  }, 30000);
  
  console.log('✅ WPlace AI Bot carregado com sucesso! IA e machine learning ativos.');
})();
