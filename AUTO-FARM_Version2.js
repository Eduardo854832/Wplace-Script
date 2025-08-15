// ==UserScript==
// @name         WPlace Auto-Farm Avançado (Menu Redesenhado)
// @description  Auto painter com UI nova, múltiplos algoritmos, modos de cor, configurações persistentes, depuração e ajustes de CORS.
// @version      2.0.3
// @author       Eduardo85482232
// @match        https://wplace.live/*
// @match        https://www.wplace.live/*
// @run-at       document-end
// ==/UserScript==

(function() {
  'use strict';

  /************** MARCA D'ÁGUA **************/
  const BRAND = 'Eduardo854832';

  /************** PERSISTÊNCIA **************/
  const LS_KEY = 'wplace_auto_farm_config_v2';
  const loadPersisted = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
  };
  const savePersisted = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(config.user));
    } catch (e) {
      console.warn('[AutoFarm] Falha ao salvar config:', e);
    }
  };

  /************** CONFIG PADRÃO **************/
  const config = {
    runtime: {
      running: false,
      inited: false,
      lastPaint: null,
      paintedCount: 0,
      attempts: 0,
      failures: 0,
      charges: { count: 0, max: 0, cooldownMs: 30000 },
      userInfo: null,
      language: 'pt',
      lastLogLines: [],
      colorCycleIndex: 0,
      spiral: { list: [], idx: 0 },
      sequential: { x: 0, y: 0 },
      serpentine: { x: 0, y: 0, dir: 1 },
      usedRandom: new Set(),
      corsFailCount: 0,
      lastFetchMode: 'simple',
      backoffMs: 0
    },
    user: Object.assign({
      startX: 742,
      startY: 1148,
      width: 100,
      height: 100,
      delayMs: 1000,
      retryDelayMs: 4000,
      paletteSize: 32,
      colorMode: 'random',
      fixedColor: 0,
      cyclingColors: '0,1,2,3',
      listColors: '0,5,10,15',
      algorithm: 'random',
      skipRepeatRandom: true,
      maxRandomMemory: 5000,
      debug: true,
      autoLanguage: true,
      manualLanguage: 'pt',
      pauseOnManyFails: true,
      failThreshold: 15,
      enableEffect: true,
      showWatermark: true,
      watermarkOpacity: 0.08,
      watermarkSize: 280,
      watermarkRotation: -25,
      useSimpleRequest: true,
      sendBrandHeader: false,
      forceJsonContentType: false,
      maxBackoffMs: 20000,
      showCorsFailCount: true
    }, loadPersisted())
  };

  /************** TRADUÇÕES **************/
  const i18n = {
    pt: {
      title: 'Auto-Farm Avançado',
      start: 'Iniciar',
      stop: 'Parar',
      settings: 'Configurações',
      stats: 'Estatísticas',
      advanced: 'Avançado',
      debugTab: 'Depuração',
      algorithm: 'Algoritmo',
      algorithms: { random: 'Aleatório', sequential: 'Sequencial', serpentine: 'Serpentina', spiral: 'Espiral' },
      colorMode: 'Modo de Cor',
      colorModes: { random: 'Aleatória', fixed: 'Fixa', cycling: 'Cíclica', list: 'Lista' },
      baseX: 'Base X',
      baseY: 'Base Y',
      width: 'Largura',
      height: 'Altura',
      delay: 'Delay (ms)',
      retryDelay: 'Delay Falha (ms)',
      paletteSize: 'Paleta',
      fixedColor: 'Cor Fixa',
      cyclingColors: 'Cores Ciclo',
      listColors: 'Lista Cores',
      skipRepeatRandom: 'Evitar repetir (random)',
      maxRandomMemory: 'Memória repetição',
      debug: 'Debug Logs',
      autoLanguage: 'Idioma Automático',
      manualLanguage: 'Idioma Manual',
      pauseOnManyFails: 'Pausar após muitas falhas',
      failThreshold: 'Limite falhas',
      enableEffect: 'Efeito Visual',
      export: 'Exportar',
      import: 'Importar',
      copy: 'Copiar',
      paste: 'Colar',
      testPixel: 'Testar Pixel',
      resetStats: 'Reset Stats',
      painted: 'Pintados',
      attempts: 'Tentativas',
      fails: 'Falhas',
      successRate: 'Taxa Sucesso',
      charges: 'Cargas',
      user: 'Usuário',
      level: 'Level',
      lastPixel: 'Último',
      status: 'Status',
      log: 'Log',
      clearLog: 'Limpar Log',
      started: '🚀 Pintura iniciada',
      stopped: '⏸️ Pintura pausada',
      waitingCharges: s => `⌛ Aguardando cargas (${s}s)`,
      paintedOk: '✅ Pixel pintado',
      paintFail: '❌ Falha ao pintar',
      networkError: '🌐 Erro de rede',
      cooldown: '⏳ Cooldown',
      manyFails: '🚫 Muitas falhas. Pausado.',
      spiralRegen: '♻️ Gerando espiral',
      serpentineDir: '↔️ Mudando linha',
      copied: 'Config copiada',
      imported: 'Config importada',
      invalidImport: 'Import inválido',
      watermark: "Marca d'água",
      watermarkOpacity: 'Opacidade marca',
      watermarkSize: 'Tamanho marca',
      watermarkRotation: 'Rotação marca',
      useSimpleRequest: 'Req. simples',
      sendBrandHeader: 'Header Brand',
      forceJsonContentType: 'Force JSON CT',
      maxBackoffMs: 'Backoff máx',
      corsFails: 'Falhas CORS',
      showCorsFailCount: 'Mostrar falhas CORS'
    },
    en: {
      title: 'Advanced Auto-Farm',
      start: 'Start',
      stop: 'Stop',
      settings: 'Settings',
      stats: 'Stats',
      advanced: 'Advanced',
      debugTab: 'Debug',
      algorithm: 'Algorithm',
      algorithms: { random: 'Random', sequential: 'Sequential', serpentine: 'Serpentine', spiral: 'Spiral' },
      colorMode: 'Color Mode',
      colorModes: { random: 'Random', fixed: 'Fixed', cycling: 'Cycling', list: 'List' },
      baseX: 'Base X',
      baseY: 'Base Y',
      width: 'Width',
      height: 'Height',
      delay: 'Delay (ms)',
      retryDelay: 'Retry Delay (ms)',
      paletteSize: 'Palette',
      fixedColor: 'Fixed Color',
      cyclingColors: 'Cycle Colors',
      listColors: 'List Colors',
      skipRepeatRandom: 'Avoid repeat (random)',
      maxRandomMemory: 'Repeat memory',
      debug: 'Debug Logs',
      autoLanguage: 'Auto Language',
      manualLanguage: 'Manual Language',
      pauseOnManyFails: 'Pause on many fails',
      failThreshold: 'Fail threshold',
      enableEffect: 'Visual Effect',
      export: 'Export',
      import: 'Import',
      copy: 'Copy',
      paste: 'Paste',
      testPixel: 'Test Pixel',
      resetStats: 'Reset Stats',
      painted: 'Painted',
      attempts: 'Attempts',
      fails: 'Fails',
      successRate: 'Success Rate',
      charges: 'Charges',
      user: 'User',
      level: 'Level',
      lastPixel: 'Last',
      status: 'Status',
      log: 'Log',
      clearLog: 'Clear Log',
      started: '🚀 Painting started',
      stopped: '⏸️ Painting paused',
      waitingCharges: s => `⌛ Waiting charges (${s}s)`,
      paintedOk: '✅ Pixel painted',
      paintFail: '❌ Failed to paint',
      networkError: '🌐 Network error',
      cooldown: '⏳ Cooldown',
      manyFails: '🚫 Too many fails. Paused.',
      spiralRegen: '♻️ Generating spiral',
      serpentineDir: '↔️ Changing line',
      copied: 'Config copied',
      imported: 'Config imported',
      invalidImport: 'Invalid import',
      watermark: 'Watermark',
      watermarkOpacity: 'Watermark opacity',
      watermarkSize: 'Watermark size',
      watermarkRotation: 'Watermark rotation',
      useSimpleRequest: 'Simple req',
      sendBrandHeader: 'Brand header',
      forceJsonContentType: 'Force JSON CT',
      maxBackoffMs: 'Max backoff',
      corsFails: 'CORS fails',
      showCorsFailCount: 'Show CORS fails'
    }
  };
  const L = () => {
    const langKey = config.user.autoLanguage ? config.runtime.language : config.user.manualLanguage;
    return i18n[langKey] || i18n.en;
  };

  /************** UTILS **************/
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const logLine = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${BRAND} | ${msg}`;
    config.runtime.lastLogLines.unshift(line);
    if (config.runtime.lastLogLines.length > 300) config.runtime.lastLogLines.pop();
    if (config.user.debug) {
      const fn = type === 'error' ? console.error : (type === 'warn' ? console.warn : console.log);
      fn(`[${BRAND}]`, msg);
    }
    updateLogUI();
  };
  const safeJSON = async res => {
    const t = await res.text().catch(() => '');
    try { return JSON.parse(t); } catch { return { raw: t }; }
  };
  const escapeHtml = s => (s || '').toString()
    .replace(/[&<>"'`]/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'
    }[c]));

  const clampPos = () => {
    config.user.width = Math.max(1, parseInt(config.user.width)||1);
    config.user.height = Math.max(1, parseInt(config.user.height)||1);
    config.user.paletteSize = Math.max(1, parseInt(config.user.paletteSize)||1);
  };

  /************** FETCH ENVELOPE **************/
  const doFetch = async (url, opt, modeUsed) => {
    try {
      const res = await fetch(url, opt);
      const data = await safeJSON(res);
      return { ok: res.ok, status: res.status, data, modeUsed };
    } catch (e) {
      return { ok: false, status: 0, data: { error: e.message }, errorType: e.name, errorMessage: e.message, modeUsed };
    }
  };

  /************** DETECTAR LÍNGUA **************/
  const detectLanguage = async () => {
    try {
      const r = await fetch('https://ipapi.co/json/');
      const j = await r.json();
      config.runtime.language = j.country === 'BR' ? 'pt' : 'en';
    } catch {
      config.runtime.language = 'en';
    }
  };

  /************** CHARGES **************/
  const updateCharges = async () => {
    const r = await doFetch('https://backend.wplace.live/me', { credentials: 'include', cache: 'no-cache' }, 'charges');
    if (r.ok && r.data && r.data.charges) {
      config.runtime.userInfo = r.data;
      config.runtime.charges.count = Math.floor(r.data.charges.count);
      config.runtime.charges.max = Math.floor(r.data.charges.max);
      config.runtime.charges.cooldownMs = r.data.charges.cooldownMs;
      if (config.runtime.userInfo.level != null)
        config.runtime.userInfo.level = Math.floor(config.runtime.userInfo.level);
      updateStatsUI();
    } else if (r.status === 0) {
      logLine(`Falha /me (rede?) ${r.errorType || ''} ${r.errorMessage || ''}`, 'warn');
    } else {
      logLine(`/me status ${r.status}`, 'warn');
    }
  };

  /************** CORES **************/
  const parseColorList = str => (str || '')
    .split(/[,;]+|\s+/)
    .map(s=>s.trim()).filter(Boolean)
    .map(n=>+n).filter(n=>!isNaN(n));
  const clampColor = c => Math.max(0, Math.min(config.user.paletteSize - 1, isNaN(c)?0:c));
  const nextColor = () => {
    const mode = config.user.colorMode;
    if (mode === 'random') return Math.floor(Math.random() * config.user.paletteSize);
    if (mode === 'fixed') return clampColor(config.user.fixedColor);
    if (mode === 'cycling') {
      const arr = parseColorList(config.user.cyclingColors);
      if (!arr.length) return 0;
      const idx = config.runtime.colorCycleIndex % arr.length;
      config.runtime.colorCycleIndex++;
      return clampColor(arr[idx]);
    }
    if (mode === 'list') {
      const arr = parseColorList(config.user.listColors);
      if (!arr.length) return 0;
      return clampColor(arr[Math.floor(Math.random()*arr.length)]);
    }
    return 0;
  };

  /************** ALGORITMOS POSIÇÃO **************/
  const resetAlgorithms = () => {
    config.runtime.spiral = { list: [], idx: 0 };
    config.runtime.sequential = { x: 0, y: 0 };
    config.runtime.serpentine = { x: 0, y: 0, dir: 1 };
    if (config.user.skipRepeatRandom) config.runtime.usedRandom.clear();
  };

  const generateSpiral = () => {
    const w = config.user.width, h = config.user.height;
    const list=[];
    let top=0,bottom=h-1,left=0,right=w-1;
    while(left<=right && top<=bottom){
      for(let x=left;x<=right;x++) list.push({x,y:top});
      for(let y=top+1;y<=bottom;y++) list.push({x:right,y});
      if(top!==bottom) for(let x=right-1;x>=left;x--) list.push({x,y:bottom});
      if(left!==right) for(let y=bottom-1;y>top;y--) list.push({x:left,y});
      top++;bottom--;left++;right--;
    }
    config.runtime.spiral = { list, idx:0 };
  };

  const nextPosition = () => {
    const alg = config.user.algorithm;
    const w=config.user.width, h=config.user.height;
    if(alg==='random'){
      if(!config.user.skipRepeatRandom){
        return { x:Math.floor(Math.random()*w), y:Math.floor(Math.random()*h) };
      }
      if(config.runtime.usedRandom.size>config.user.maxRandomMemory) config.runtime.usedRandom.clear();
      let x,y,key,tries=0;
      do{
        x=Math.floor(Math.random()*w);
        y=Math.floor(Math.random()*h);
        key=`${x},${y}`;
        if(++tries>1000){ config.runtime.usedRandom.clear(); break; }
      } while(config.runtime.usedRandom.has(key));
      config.runtime.usedRandom.add(key);
      return {x,y};
    }
    if(alg==='sequential'){
      let {x,y}=config.runtime.sequential;
      const pos={x,y};
      x++; if(x>=w){ x=0; y++; if(y>=h) y=0; }
      config.runtime.sequential={x,y};
      return pos;
    }
    if(alg==='serpentine'){
      let {x,y,dir}=config.runtime.serpentine;
      const pos={x,y};
      x+=dir;
      if(dir===1 && x>=w){ dir=-1; x=w-1; y++; if(y>=h) y=0; logLine(L().serpentineDir); }
      else if(dir===-1 && x<0){ dir=1; x=0; y++; if(y>=h) y=0; logLine(L().serpentineDir); }
      config.runtime.serpentine={x,y,dir};
      return pos;
    }
    if(alg==='spiral'){
      if(!config.runtime.spiral.list.length || config.runtime.spiral.idx>=config.runtime.spiral.list.length){
        logLine(L().spiralRegen);
        generateSpiral();
      }
      return config.runtime.spiral.list[config.runtime.spiral.idx++];
    }
    return { x:Math.floor(Math.random()*w), y:Math.floor(Math.random()*h) };
  };

  /************** PINTURA **************/
  const paintPixel = async (relX, relY, color) => {
    const absX = config.user.startX + relX;
    const absY = config.user.startY + relY;
    const url = `https://backend.wplace.live/s0/pixel/${absX}/${absY}`;
    const baseBody = { x: absX, y: absY, color, coords:[absX,absY], colors:[color], brand: BRAND };

    const variants = [];

    if (config.user.useSimpleRequest) {
      variants.push({
        mode: 'simple',
        opts: {
          method: 'POST',
            credentials: 'include',
          cache: 'no-cache',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify(baseBody)
        }
      });
    }

    variants.push({
      mode: 'json',
      opts: {
        method: 'POST',
        credentials: 'include',
        cache: 'no-cache',
        headers: Object.assign(
          { 'Content-Type': config.user.forceJsonContentType ? 'application/json' :
              (config.user.useSimpleRequest ? 'text/plain;charset=UTF-8' : 'application/json') },
          config.user.sendBrandHeader ? { 'X-Brand': BRAND } : {}
        ),
        body: JSON.stringify(baseBody)
      }
    });

    const order = config.user.useSimpleRequest ? variants : [variants[variants.length - 1]];

    let lastResult = null;
    for (const variant of order) {
      config.runtime.lastFetchMode = variant.mode;
      const r = await doFetch(url, variant.opts, variant.mode);
      lastResult = r;
      if (r.status !== 0) {
        return finalizePaintResult(r, absX, absY, color);
      }
      logLine(`Tentativa modo=${variant.mode} falhou: ${r.errorType || ''} ${r.errorMessage || ''}`, 'warn');
    }

    config.runtime.corsFailCount++;
    return finalizePaintResult(lastResult, absX, absY, color);
  };

  const finalizePaintResult = (r, absX, absY, color) => {
    const d = (r && r.data) || {};
    const success = r.ok && (
      d.painted === 1 || d.success === 1 || d.ok === true || d.placed === 1 || d.status === 'ok'
    );
    return {
      success,
      status: r.status,
      data: d,
      absX, absY, color,
      modeUsed: r.modeUsed,
      errorType: r.errorType,
      errorMessage: r.errorMessage
    };
  };

  /************** BACKOFF **************/
  const applyBackoff = async (baseDelay) => {
    if (config.runtime.failures === 0) {
      config.runtime.backoffMs = 0;
      return;
    }
    const next = config.runtime.backoffMs ? config.runtime.backoffMs * 1.7 : baseDelay;
    config.runtime.backoffMs = Math.min(next, config.user.maxBackoffMs);
    logLine(`Backoff ${config.runtime.backoffMs}ms`);
    await sleep(config.runtime.backoffMs);
  };

  /************** LOOP PRINCIPAL **************/
  const mainLoop = async () => {
    while (config.runtime.running) {
      await updateCharges();
      if (!config.runtime.running) break;

      let { count, cooldownMs } = config.runtime.charges;
      if (count < 1) {
        let remaining = Math.ceil(cooldownMs / 1000);
        while (remaining > 0 && config.runtime.running && config.runtime.charges.count < 1) {
          updateStatus(L().waitingCharges(remaining));
          await sleep(1000);
          remaining--;
          await updateCharges();
          count = config.runtime.charges.count;
          if (count > 0) break;
        }
        if (!config.runtime.running) break;
        if (config.runtime.charges.count < 1) continue;
      }

      const pos = nextPosition();
      const color = nextColor();
      config.runtime.attempts++;

      const r = await paintPixel(pos.x, pos.y, color);

      if (r.success) {
        config.runtime.paintedCount++;
        config.runtime.charges.count = Math.max(0, config.runtime.charges.count - 1);
        config.runtime.lastPaint = r;
        config.runtime.failures = 0;
        config.runtime.backoffMs = 0;
        updateStatus(`${L().paintedOk} (${r.modeUsed})`, 'success');
        logLine(`${L().paintedOk} (${r.absX},${r.absY}) c${color} modo=${r.modeUsed}`);
        if (config.user.enableEffect) triggerEffect();
      } else {
        config.runtime.failures++;
        let msg;
        if (r.status === 429) msg = L().cooldown;
        else if (r.status === 0) {
          msg = `${L().networkError} (${r.errorType || 'TypeError'})`;
          logLine(`Detalhe rede: msg=${r.errorMessage || 'sem'} mode=${r.modeUsed}`, 'warn');
        } else {
          msg = L().paintFail + ` (${r.status})`;
        }
        updateStatus(msg, 'error');
        logLine(`${msg}`);

        if (config.user.pauseOnManyFails && config.runtime.failures >= config.user.failThreshold) {
          updateStatus(L().manyFails, 'error');
          logLine(L().manyFails, 'error');
          toggleRun(false);
          break;
        }
        await applyBackoff(config.user.retryDelayMs);
      }

      updateStatsUI();
      await sleep(config.user.delayMs);
    }
  };

  /************** UI **************/
  let rootPanel;
  const buildUI = () => {
    if (rootPanel) return;
    injectStyles();
    injectWatermark();
    rootPanel = document.createElement('div');
    rootPanel.className = 'af-panel';
    rootPanel.innerHTML = `
      <div class="af-header">
        <div class="af-title">${L().title} <span class="af-brand-tag">${BRAND}</span></div>
        <div class="af-actions">
          <button class="af-btn af-run" id="afRunBtn" title="${BRAND}"><span>▶</span> ${L().start}</button>
          <button class="af-btn af-mini" id="afCollapseBtn" title="Collapse">–</button>
          <button class="af-btn af-close" id="afCloseBtn" title="Close">×</button>
        </div>
      </div>
      <div class="af-body" id="afBody">
        <div class="af-tabs">
          <button class="af-tab active" data-tab="stats">${L().stats}</button>
          <button class="af-tab" data-tab="settings">${L().settings}</button>
          <button class="af-tab" data-tab="advanced">${L().advanced}</button>
          <button class="af-tab" data-tab="debug">${L().debugTab}</button>
        </div>
        <div class="af-tab-content" data-tab="stats">
          <div class="af-stats-grid">
            <div><label>${L().user}</label><span id="afUser">-</span></div>
            <div><label>${L().level}</label><span id="afLevel">-</span></div>
            <div><label>${L().painted}</label><span id="afPainted">0</span></div>
            <div><label>${L().attempts}</label><span id="afAttempts">0</span></div>
            <div><label>${L().fails}</label><span id="afFails">0</span></div>
            <div><label>${L().successRate}</label><span id="afRate">0%</span></div>
            <div><label>${L().charges}</label><span id="afCharges">0/0</span></div>
            <div><label>${L().lastPixel}</label><span id="afLast">-</span></div>
            <div><label>Mode</label><span id="afMode">-</span></div>
            <div class="${config.user.showCorsFailCount?'':'hidden'}"><label>${L().corsFails}</label><span id="afCorsFails">0</span></div>
          </div>
          <div class="af-status-line" id="afStatus">${L().stopped}</div>
          <div class="af-buttons-line">
            <button class="af-btn sm" id="afTestPixelBtn">${L().testPixel}</button>
            <button class="af-btn sm" id="afResetStatsBtn">${L().resetStats}</button>
          </div>
        </div>
        <div class="af-tab-content hidden" data-tab="settings">
          <div class="af-form">
            ${inputNumber(L().baseX, 'startX')}
            ${inputNumber(L().baseY, 'startY')}
            ${inputNumber(L().width, 'width')}
            ${inputNumber(L().height, 'height')}
            ${inputNumber(L().delay, 'delayMs')}
            ${inputNumber(L().retryDelay, 'retryDelayMs')}
            ${inputNumber(L().paletteSize, 'paletteSize')}
            ${selectField(L().algorithm, 'algorithm', i18n.en.algorithms, config.user.algorithm)}
            ${selectField(L().colorMode, 'colorMode', i18n.en.colorModes, config.user.colorMode)}
            ${inputNumber(L().fixedColor, 'fixedColor')}
            ${inputText(L().cyclingColors, 'cyclingColors')}
            ${inputText(L().listColors, 'listColors')}
            ${checkboxField(L().skipRepeatRandom, 'skipRepeatRandom')}
            ${inputNumber(L().maxRandomMemory, 'maxRandomMemory')}
          </div>
        </div>
        <div class="af-tab-content hidden" data-tab="advanced">
          <div class="af-form">
            ${checkboxField(L().debug, 'debug')}
            ${checkboxField(L().enableEffect, 'enableEffect')}
            ${checkboxField(L().autoLanguage, 'autoLanguage')}
            ${selectField(L().manualLanguage, 'manualLanguage', { pt:'Português', en:'English' }, config.user.manualLanguage)}
            ${checkboxField(L().pauseOnManyFails, 'pauseOnManyFails')}
            ${inputNumber(L().failThreshold, 'failThreshold')}
            ${checkboxField(L().watermark, 'showWatermark')}
            ${inputNumber(L().watermarkOpacity, 'watermarkOpacity')}
            ${inputNumber(L().watermarkSize, 'watermarkSize')}
            ${inputNumber(L().watermarkRotation, 'watermarkRotation')}
            ${checkboxField(L().useSimpleRequest, 'useSimpleRequest')}
            ${checkboxField(L().sendBrandHeader, 'sendBrandHeader')}
            ${checkboxField(L().forceJsonContentType, 'forceJsonContentType')}
            ${checkboxField(L().showCorsFailCount, 'showCorsFailCount')}
            ${inputNumber(L().maxBackoffMs, 'maxBackoffMs')}
          </div>
          <div class="af-export-import">
            <textarea id="afConfigArea" placeholder="JSON config" class="af-textarea"></textarea>
            <div class="af-buttons-line">
              <button class="af-btn xs" id="afCopyConfigBtn">${L().copy}</button>
              <button class="af-btn xs" id="afPasteConfigBtn">${L().paste}</button>
              <button class="af-btn xs" id="afImportConfigBtn">${L().import}</button>
              <button class="af-btn xs" id="afExportConfigBtn">${L().export}</button>
            </div>
          </div>
        </div>
        <div class="af-tab-content hidden" data-tab="debug">
          <div class="af-log-header">
            <span>${L().log} • ${BRAND}</span>
            <button class="af-btn xs" id="afClearLogBtn">${L().clearLog}</button>
          </div>
          <div class="af-log" id="afLog"></div>
        </div>
      </div>
      <div class="af-footer-bar">${BRAND} © ${new Date().getFullYear()}</div>
    `;
    document.body.appendChild(rootPanel);
    draggable(rootPanel.querySelector('.af-header'), rootPanel);
    bindUIEvents();
    refreshSettingsInputs();
    updateStatsUI();
    updateStatus(L().stopped);
  };

  /************** UI HELPERS **************/
  function el(id){ return document.getElementById(id); }

  function updateLogUI() {
    const logBox = el('afLog');
    if (!logBox) return;
    logBox.innerHTML = config.runtime.lastLogLines
      .slice(0,150)
      .map(l => `<div>${escapeHtml(l)}</div>`).join('');
    logBox.scrollTop = 0;
  }

  function updateStatsUI() {
    if (!rootPanel) return;
    const u = config.runtime.userInfo;
    const rate = config.runtime.attempts ?
      ((config.runtime.paintedCount / config.runtime.attempts) * 100).toFixed(1) : '0';
    setText('afPainted', config.runtime.paintedCount);
    setText('afAttempts', config.runtime.attempts);
    setText('afFails', config.runtime.failures);
    setText('afRate', rate + '%');
    setText('afCharges', `${config.runtime.charges.count}/${config.runtime.charges.max}`);
    setText('afMode', config.runtime.lastFetchMode);
    if (u) {
      setText('afUser', u.username || u.user || '-');
      setText('afLevel', u.level != null ? u.level : '-');
    }
    if (config.runtime.lastPaint) {
      const lp = config.runtime.lastPaint;
      setText('afLast', `${lp.absX},${lp.absY} c${lp.color}`);
    }
    if (config.user.showCorsFailCount) {
      setText('afCorsFails', config.runtime.corsFailCount);
    }
  }

  function setText(id, v) {
    const e = el(id);
    if (e) e.textContent = v;
  }

  function updateStatus(msg, cls) {
    const st = el('afStatus');
    if (!st) return;
    st.textContent = msg;
    st.className = 'af-status-line';
    if (cls) st.classList.add('af-status-' + cls);
  }

  function inputNumber(label, key){
    return `<label class="af-field"><span>${label}</span><input data-key="${key}" type="number" step="1"></label>`;
  }
  function inputText(label, key){
    return `<label class="af-field"><span>${label}</span><input data-key="${key}" type="text"></label>`;
  }
  function checkboxField(label, key){
    return `<label class="af-field chk"><span>${label}</span><input data-key="${key}" type="checkbox"></label>`;
  }
  function selectField(label, key, options, current){
    const opts = Object.entries(options).map(([k,v]) =>
      `<option value="${escapeHtml(k)}" ${k===current?'selected':''}>${escapeHtml(v)}</option>`
    ).join('');
    return `<label class="af-field"><span>${label}</span><select data-key="${key}">${opts}</select></label>`;
  }

  function refreshSettingsInputs() {
    if (!rootPanel) return;
    const inputs = rootPanel.querySelectorAll('[data-key]');
    inputs.forEach(inp => {
      const k = inp.getAttribute('data-key');
      if (!(k in config.user)) return;
      if (inp.type === 'checkbox') {
        inp.checked = !!config.user[k];
      } else {
        inp.value = config.user[k];
      }
    });
  }

  function bindUIEvents() {
    rootPanel.addEventListener('click', e => {
      const t = e.target;
      if (t.id === 'afRunBtn') {
        toggleRun(!config.runtime.running);
      } else if (t.id === 'afCollapseBtn') {
        rootPanel.classList.toggle('collapsed');
      } else if (t.id === 'afCloseBtn') {
        rootPanel.remove();
      } else if (t.id === 'afClearLogBtn') {
        config.runtime.lastLogLines = [];
        updateLogUI();
      } else if (t.id === 'afTestPixelBtn') {
        testSinglePixel();
      } else if (t.id === 'afResetStatsBtn') {
        resetStats();
      } else if (t.id === 'afCopyConfigBtn') {
        copyConfig();
      } else if (t.id === 'afPasteConfigBtn') {
        pasteConfig();
      } else if (t.id === 'afImportConfigBtn') {
        importConfig();
      } else if (t.id === 'afExportConfigBtn') {
        exportConfig();
      } else if (t.classList.contains('af-tab')) {
        switchTab(t.getAttribute('data-tab'));
      }
    });

    rootPanel.addEventListener('change', e => {
      const inp = e.target;
      if (inp.hasAttribute('data-key')) {
        const key = inp.getAttribute('data-key');
        if (inp.type === 'checkbox') {
          config.user[key] = inp.checked;
        } else if (inp.type === 'number') {
          config.user[key] = Number(inp.value);
        } else {
          config.user[key] = inp.value;
        }
        clampPos();
        savePersisted();
        if (key === 'algorithm') resetAlgorithms();
        if (key === 'showWatermark') updateWatermarkVisibility();
        if (key.startsWith('watermark')) updateWatermarkStyle();
        if (key === 'autoLanguage' || key === 'manualLanguage') relabelUI();
        if (key === 'showCorsFailCount') updateStatsUI();
      }
    });
  }

  function relabelUI() {
    const titleEl = rootPanel.querySelector('.af-title');
    if (titleEl) titleEl.innerHTML = `${L().title} <span class="af-brand-tag">${BRAND}</span>`;
    const tabMap = {
      stats: L().stats,
      settings: L().settings,
      advanced: L().advanced,
      debug: L().debugTab
    };
    rootPanel.querySelectorAll('.af-tab').forEach(btn => {
      const tb = btn.getAttribute('data-tab');
      if (tabMap[tb]) btn.textContent = tabMap[tb];
    });
    const runBtn = el('afRunBtn');
    if (runBtn) runBtn.innerHTML = `<span>${config.runtime.running?'⏸':'▶'}</span> ${config.runtime.running?L().stop:L().start}`;
  }

  function switchTab(tab) {
    rootPanel.querySelectorAll('.af-tab').forEach(b=>b.classList.toggle('active', b.getAttribute('data-tab')===tab));
    rootPanel.querySelectorAll('.af-tab-content').forEach(c=>{
      c.classList.toggle('hidden', c.getAttribute('data-tab')!==tab);
    });
  }

  function toggleRun(run) {
    if (run === config.runtime.running) return;
    config.runtime.running = run;
    const btn = el('afRunBtn');
    if (btn) {
      btn.innerHTML = `<span>${run?'⏸':'▶'}</span> ${run?L().stop:L().start}`;
    }
    if (run) {
      logLine(L().started);
      updateStatus(L().started, 'success');
      resetAlgorithms();
      mainLoop();
    } else {
      logLine(L().stopped);
      updateStatus(L().stopped);
    }
  }

  function testSinglePixel() {
    const pos = nextPosition();
    const color = nextColor();
    logLine(`Teste pixel rel(${pos.x},${pos.y}) c${color}`);
  }

  function resetStats() {
    config.runtime.paintedCount = 0;
    config.runtime.attempts = 0;
    config.runtime.failures = 0;
    config.runtime.corsFailCount = 0;
    config.runtime.lastPaint = null;
    updateStatsUI();
    logLine('Stats reset');
  }

  function copyConfig() {
    try {
      const json = JSON.stringify(config.user, null, 2);
      navigator.clipboard.writeText(json);
      setConfigArea(json);
      logLine(L().copied);
    } catch {
      logLine('Clipboard falhou', 'warn');
    }
  }

  function pasteConfig() {
    navigator.clipboard.readText().then(txt => {
      setConfigArea(txt);
    }).catch(()=>logLine('Não conseguiu ler clipboard','warn'));
  }

  function importConfig() {
    try {
      const txt = getConfigArea();
      const obj = JSON.parse(txt);
      Object.assign(config.user, obj);
      savePersisted();
      refreshSettingsInputs();
      logLine(L().imported);
      relabelUI();
    } catch {
      logLine(L().invalidImport, 'error');
    }
  }

  function exportConfig() {
    setConfigArea(JSON.stringify(config.user, null, 2));
    logLine('Export OK');
  }

  function getConfigArea() {
    const ta = el('afConfigArea');
    return ta ? ta.value : '';
  }
  function setConfigArea(v) {
    const ta = el('afConfigArea');
    if (ta) ta.value = v;
  }

  /************** EFEITO VISUAL **************/
  function triggerEffect() {
    const fx = document.createElement('div');
    fx.className = 'af-fx';
    fx.textContent = '•';
    document.body.appendChild(fx);
    setTimeout(()=>fx.remove(), 1200);
  }

  /************** WATERMARK **************/
  let watermarkEl;
  function injectWatermark() {
    watermarkEl = document.createElement('div');
    watermarkEl.className = 'af-watermark';
    watermarkEl.textContent = BRAND;
    document.body.appendChild(watermarkEl);
    updateWatermarkStyle();
    updateWatermarkVisibility();
  }
  function updateWatermarkStyle() {
    if (!watermarkEl) return;
    watermarkEl.style.opacity = config.user.watermarkOpacity;
    watermarkEl.style.fontSize = config.user.watermarkSize + 'px';
    watermarkEl.style.transform = `translate(-50%,-50%) rotate(${config.user.watermarkRotation}deg)`;
  }
  function updateWatermarkVisibility() {
    if (!watermarkEl) return;
    watermarkEl.style.display = config.user.showWatermark ? 'block' : 'none';
  }

  /************** DRAG **************/
  function draggable(handle, root) {
    let offX=0,offY=0,drag=false;
    handle.addEventListener('mousedown', e=>{
      drag=true;
      offX = e.clientX - root.offsetLeft;
      offY = e.clientY - root.offsetTop;
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
    function move(e){
      if(!drag) return;
      root.style.left = (e.clientX - offX) + 'px';
      root.style.top = (e.clientY - offY) + 'px';
    }
    function up(){
      drag=false;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }
  }

  /************** ESTILOS **************/
  function injectStyles() {
    if (document.getElementById('af-styles')) return;
    const st = document.createElement('style');
    st.id = 'af-styles';
    st.textContent = `
      .af-panel {
        position: fixed;
        z-index: 999999;
        top: 80px;
        left: 40px;
        background: #111c;
        color: #eee;
        font: 12px/1.4 Arial, sans-serif;
        backdrop-filter: blur(6px);
        border: 1px solid #444;
        border-radius: 8px;
        width: 340px;
        box-shadow: 0 4px 16px #0008;
        user-select: none;
      }
      .af-panel.collapsed .af-body,
      .af-panel.collapsed .af-footer-bar { display:none; }
      .af-header {
        display:flex; align-items:center; justify-content:space-between;
        cursor:move; padding:6px 8px; background:#222a; border-bottom:1px solid #333;
        border-radius:8px 8px 0 0;
      }
      .af-title { font-weight:bold; font-size:13px; }
      .af-brand-tag { background:#4b68ff; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px; margin-left:6px; }
      .af-actions button { margin-left:4px; }
      .af-body { padding:8px; }
      .af-tabs { display:flex; gap:4px; margin-bottom:6px; }
      .af-tab {
        flex:1; background:#2a2f; border:1px solid #444; color:#ccc; padding:4px 0;
        border-radius:4px; cursor:pointer; font-size:11px;
      }
      .af-tab.active { background:#4b68ff; color:#fff; border-color:#4b68ff; }
      .af-tab-content.hidden { display:none; }
      .af-stats-grid {
        display:grid;
        grid-template-columns: repeat(2, 1fr);
        gap:4px 8px;
        font-size:11px;
        margin-bottom:6px;
      }
      .af-stats-grid label { display:block; font-weight:bold; color:#9ecaff; font-size:10px; }
      .af-status-line {
        background:#222; border:1px solid #444; padding:6px 8px; border-radius:4px;
        font-size:11px; margin-bottom:6px; min-height:28px; display:flex; align-items:center;
      }
      .af-status-success { border-color:#2e8b57; color:#a5f9c3; }
      .af-status-error { border-color:#c0392b; color:#ffb3a9; }
      .af-buttons-line { display:flex; gap:6px; flex-wrap:wrap; }
      .af-btn {
        background:#39425e; border:1px solid #4b597a; color:#eee;
        padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;
        display:inline-flex; align-items:center; gap:4px;
      }
      .af-btn:hover { background:#4b597a; }
      .af-btn.af-run { background:#1f6b3a; border-color:#2d8d4e; }
      .af-btn.af-run:hover { background:#2d8d4e; }
      .af-btn.af-close { background:#6b1f1f; border-color:#8d2d2d; }
      .af-btn.af-close:hover { background:#8d2d2d; }
      .af-btn.af-mini { background:#444; border-color:#555; }
      .af-btn.sm { font-size:10px; padding:3px 6px; }
      .af-btn.xs { font-size:10px; padding:2px 5px; }
      .af-form { display:grid; grid-template-columns: 1fr 1fr; gap:6px 10px; }
      .af-field { display:flex; flex-direction:column; gap:2px; font-size:11px; }
      .af-field > span { font-size:10px; font-weight:bold; color:#9ecaff; }
      .af-field input, .af-field select, .af-textarea {
        background:#1b2233; border:1px solid #3a4a63; color:#eee; border-radius:4px; padding:4px;
        font-size:11px; width:100%; box-sizing:border-box;
      }
      .af-field.chk { flex-direction:row; align-items:center; }
      .af-field.chk span { flex:1; }
      .af-textarea { width:100%; height:90px; resize:vertical; font-family:monospace; }
      .af-log-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:11px; }
      .af-log {
        background:#0d1117; border:1px solid #2a3545; height:160px; overflow:auto; font-family:monospace;
        padding:6px; font-size:10px; line-height:1.4; border-radius:4px;
      }
      .af-footer-bar {
        background:#1a2230; border-top:1px solid #2d3645; padding:4px 8px; font-size:10px;
        text-align:center; border-radius:0 0 8px 8px; color:#7893b3;
      }
      .af-fx {
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        color:#4b68ff; font-size:42px; pointer-events:none; opacity:0;
        animation:afPulse 1.2s ease-out forwards;
        z-index:999999;
      }
      @keyframes afPulse {
        0% { transform:translate(-50%,-50%) scale(0.4); opacity:0.9; }
        60% { opacity:0.4; }
        100% { transform:translate(-50%,-50%) scale(1.8); opacity:0; }
      }
      .af-watermark {
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-25deg);
        font-size:280px; font-weight:800; font-family:Arial, sans-serif;
        color:#4b68ff; opacity:.08; pointer-events:none; z-index:999; mix-blend-mode:screen;
        text-shadow:0 0 20px #4b68ff88, 0 0 40px #4b68ff55;
      }
      .hidden { display:none !important; }
    `;
    document.head.appendChild(st);
  }

  /************** INÍCIO **************/
  async function init() {
    if (config.runtime.inited) return;
    config.runtime.inited = true;
    await detectLanguage();
    buildUI();
    logLine('UI pronta');
  }

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    init();
  }

})();