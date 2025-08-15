// ==UserScript==
// @name         WPlace Auto-Farm Avançado (Menu Redesenhado)
// @description  Auto painter com UI nova, múltiplos algoritmos, modos de cor, configurações persistentes e depuração.
// @version      2.0.1
// @author       Eduardo85482232
// @run-at       document-end
// ==/UserScript==

(function() {
  'use strict';

  /************** MARCA D'ÁGUA **************/
  const BRAND = 'Eduardo854832'; // Texto exibido como marca d'água

  /************** PERSISTÊNCIA **************/
  const LS_KEY = 'wplace_auto_farm_config_v2';
  const loadPersisted = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
  };
  const savePersisted = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(config.user));
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
      algorithmIndex: 0,
      spiral: { list: [], idx: 0 },
      sequential: { x: 0, y: 0 },
      serpentine: { x: 0, y: 0, dir: 1 },
      usedRandom: new Set(),
      statusInterval: null
    },
    user: Object.assign({
      startX: 742,
      startY: 1148,
      width: 100,
      height: 100,
      delayMs: 1000,
      retryDelayMs: 4000,
      paletteSize: 32,
      colorMode: 'random',       // random | fixed | cycling | list
      fixedColor: 0,
      cyclingColors: '0,1,2,3',
      listColors: '0,5,10,15',
      algorithm: 'random',       // random | sequential | serpentine | spiral
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
      watermarkRotation: -25
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
      algorithms: {
        random: 'Aleatório',
        sequential: 'Sequencial',
        serpentine: 'Serpentina',
        spiral: 'Espiral'
      },
      colorMode: 'Modo de Cor',
      colorModes: {
        random: 'Aleatória',
        fixed: 'Fixa',
        cycling: 'Cíclica',
        list: 'Lista'
      },
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
      watermark: 'Marca d\'água',
      watermarkOpacity: 'Opacidade marca',
      watermarkSize: 'Tamanho marca',
      watermarkRotation: 'Rotação marca'
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
      algorithms: {
        random: 'Random',
        sequential: 'Sequential',
        serpentine: 'Serpentine',
        spiral: 'Spiral'
      },
      colorMode: 'Color Mode',
      colorModes: {
        random: 'Random',
        fixed: 'Fixed',
        cycling: 'Cycling',
        list: 'List'
      },
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
      watermarkRotation: 'Watermark rotation'
    }
  };
  const L = () => (config.user.autoLanguage ? config.runtime.language : config.user.manualLanguage) in i18n
    ? i18n[config.user.autoLanguage ? config.runtime.language : config.user.manualLanguage]
    : i18n.en;

  /************** UTILS **************/
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const logLine = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${BRAND} | ${msg}`;
    config.runtime.lastLogLines.unshift(line);
    if (config.runtime.lastLogLines.length > 250) config.runtime.lastLogLines.pop();
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
  const fetchAPI = async (url, opt = {}) => {
    try {
      const res = await fetch(url, { credentials: 'include', cache: 'no-cache', ...opt });
      const data = await safeJSON(res);
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      return { ok: false, status: 0, data: { error: e.message } };
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
    const { ok, data } = await fetchAPI('https://backend.wplace.live/me');
    if (ok && data && data.charges) {
      config.runtime.userInfo = data;
      config.runtime.charges.count = Math.floor(data.charges.count);
      config.runtime.charges.max = Math.floor(data.charges.max);
      config.runtime.charges.cooldownMs = data.charges.cooldownMs;
      if (config.runtime.userInfo.level != null)
        config.runtime.userInfo.level = Math.floor(config.runtime.userInfo.level);
    } else {
      logLine('Falha /me', 'warn');
    }
  };

  /************** CORES **************/
  const parseColorList = str =>
    (str || '')
      .split(/[,;\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(n => parseInt(n, 10))
      .filter(n => !isNaN(n));
  const clampColor = c => {
    if (isNaN(c)) return 0;
    return Math.max(0, Math.min(config.user.paletteSize - 1, c));
  };
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
      return clampColor(arr[Math.floor(Math.random() * arr.length)]);
    }
    return 0;
  };

  /************** ALGORITMOS DE POSIÇÃO **************/
  const resetAlgorithms = () => {
    config.runtime.spiral = { list: [], idx: 0 };
    config.runtime.sequential = { x: 0, y: 0 };
    config.runtime.serpentine = { x: 0, y: 0, dir: 1 };
    if (config.user.skipRepeatRandom) config.runtime.usedRandom.clear();
  };
  const generateSpiral = () => {
    const w = config.user.width;
    const h = config.user.height;
    const list = [];
    let top = 0, bottom = h - 1, left = 0, right = w - 1;
    while (left <= right && top <= bottom) {
      for (let x = left; x <= right; x++) list.push({ x, y: top });
      for (let y = top + 1; y <= bottom; y++) list.push({ x: right, y });
      if (top !== bottom) {
        for (let x = right - 1; x >= left; x--) list.push({ x, y: bottom });
      }
      if (left !== right) {
        for (let y = bottom - 1; y > top; y--) list.push({ x: left, y });
      }
      top++; bottom--; left++; right--;
    }
    config.runtime.spiral.list = list;
    config.runtime.spiral.idx = 0;
  };
  const nextPosition = () => {
    const alg = config.user.algorithm;
    const w = config.user.width;
    const h = config.user.height;
    if (alg === 'random') {
      if (!config.user.skipRepeatRandom) {
        return { x: Math.floor(Math.random() * w), y: Math.floor(Math.random() * h) };
      }
      if (config.runtime.usedRandom.size > config.user.maxRandomMemory) {
        config.runtime.usedRandom.clear();
      }
      let x, y, key, tries = 0;
      do {
        x = Math.floor(Math.random() * w);
        y = Math.floor(Math.random() * h);
        key = `${x},${y}`;
        tries++;
        if (tries > 1000) {
          config.runtime.usedRandom.clear();
          break;
        }
      } while (config.runtime.usedRandom.has(key));
      config.runtime.usedRandom.add(key);
      return { x, y };
    }
    if (alg === 'sequential') {
      let { x, y } = config.runtime.sequential;
      const pos = { x, y };
      x++;
      if (x >= w) {
        x = 0;
        y++;
        if (y >= h) y = 0;
      }
      config.runtime.sequential = { x, y };
      return pos;
    }
    if (alg === 'serpentine') {
      let { x, y, dir } = config.runtime.serpentine;
      const pos = { x, y };
      x += dir;
      if (dir === 1 && x >= w) {
        dir = -1;
        x = w - 1;
        y++;
        if (y >= h) y = 0;
        logLine(L().serpentineDir);
      } else if (dir === -1 && x < 0) {
        dir = 1;
        x = 0;
        y++;
        if (y >= h) y = 0;
        logLine(L().serpentineDir);
      }
      config.runtime.serpentine = { x, y, dir };
      return pos;
    }
    if (alg === 'spiral') {
      if (!config.runtime.spiral.list.length || config.runtime.spiral.idx >= config.runtime.spiral.list.length) {
        logLine(L().spiralRegen);
        generateSpiral();
      }
      return config.runtime.spiral.list[config.runtime.spiral.idx++];
    }
    return { x: Math.floor(Math.random() * w), y: Math.floor(Math.random() * h) };
  };

  /************** PINTURA **************/
  const paintPixel = async (relX, relY, color) => {
    const absX = config.user.startX + relX;
    const absY = config.user.startY + relY;
    const url = `https://backend.wplace.live/s0/pixel/${absX}/${absY}`;
    const payload = {
      x: absX, y: absY, color,
      coords: [absX, absY],
      colors: [color],
      brand: BRAND
    };
    const res = await fetchAPI(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Brand': BRAND },
      body: JSON.stringify(payload)
    });
    const d = res.data || {};
    const success = res.ok && (
      d.painted === 1 || d.success === 1 || d.ok === true || d.placed === 1 || d.status === 'ok'
    );
    return { success, status: res.status, data: d, absX, absY, color };
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
        updateStatus(L().paintedOk, 'success');
        logLine(`${L().paintedOk} (${r.absX},${r.absY}) c${color}`);
        if (config.user.enableEffect) triggerEffect();
      } else {
        config.runtime.failures++;
        let msg;
        if (r.status === 429) msg = L().cooldown;
        else if (r.status === 0) msg = L().networkError;
        else msg = L().paintFail;
        updateStatus(msg, 'error');
        logLine(`${msg} (${r.status})`, r.status === 0 ? 'warn' : 'error');

        if (config.user.pauseOnManyFails && config.runtime.failures >= config.user.failThreshold) {
          updateStatus(L().manyFails, 'error');
          logLine(L().manyFails, 'error');
          toggleRun(false);
          break;
        }
        await sleep(config.user.retryDelayMs);
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
    injectWatermark(); // Marca d'água
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
  const escapeHtml = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const inputNumber = (label, key) => `
    <label class="af-field">
      <span>${label}</span>
      <input type="number" data-bind="${key}" value="${config.user[key]}">
    </label>`;
  const inputText = (label, key) => `
    <label class="af-field">
      <span>${label}</span>
      <input type="text" data-bind="${key}" value="${escapeHtml(config.user[key])}">
    </label>`;
  const checkboxField = (label, key) => `
    <label class="af-field af-check">
      <input type="checkbox" data-bind="${key}" ${config.user[key] ? 'checked' : ''}>
      <span>${label}</span>
    </label>`;
  const selectField = (label, key, map, value) => `
    <label class="af-field">
      <span>${label}</span>
      <select data-bind="${key}">
        ${Object.entries(map).map(([k,v]) => `<option value="${k}" ${k === value ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
    </label>`;

  const updateStatus = (msg, type) => {
    const el = document.getElementById('afStatus');
    if (el) {
      el.textContent = msg;
      el.className = `af-status-line ${type || ''}`;
    }
  };
  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  const updateStatsUI = () => {
    const r = config.runtime;
    const user = r.userInfo;
    const painted = r.paintedCount;
    const attempts = r.attempts;
    const fails = r.failures;
    const rate = attempts ? ((painted / attempts) * 100).toFixed(1) : '0.0';
    const last = r.lastPaint ? `${r.lastPaint.absX},${r.lastPaint.absY}#${r.lastPaint.color}` : '-';
    setText('afUser', user?.name || '-');
    setText('afLevel', user?.level ?? '-');
    setText('afPainted', painted);
    setText('afAttempts', attempts);
    setText('afFails', fails);
    setText('afRate', rate + '%');
    setText('afCharges', `${Math.floor(r.charges.count)}/${Math.floor(r.charges.max)}`);
    setText('afLast', last);
  };
  const updateLogUI = () => {
    const el = document.getElementById('afLog');
    if (!el) return;
    el.innerHTML = config.runtime.lastLogLines
      .slice(0, 120)
      .map(line => `<div>${escapeHtml(line)}</div>`).join('');
  };
  const triggerEffect = () => {
    rootPanel?.classList.add('af-pulse');
    setTimeout(() => rootPanel?.classList.remove('af-pulse'), 400);
  };
  const refreshSettingsInputs = () => {
    document.querySelectorAll('.af-form [data-bind]').forEach(inp => {
      const key = inp.getAttribute('data-bind');
      if (key in config.user) {
        if (inp.type === 'checkbox') inp.checked = !!config.user[key];
        else inp.value = config.user[key];
      }
    });
  };

  const bindUIEvents = () => {
    rootPanel.querySelectorAll('.af-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        rootPanel.querySelectorAll('.af-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.getAttribute('data-tab');
        rootPanel.querySelectorAll('.af-tab-content').forEach(c => {
          c.classList.toggle('hidden', c.getAttribute('data-tab') !== tab);
        });
      });
    });
    rootPanel.querySelectorAll('[data-bind]').forEach(inp => {
      inp.addEventListener('change', () => {
        const key = inp.getAttribute('data-bind');
        if (!(key in config.user)) return;
        if (inp.type === 'checkbox') config.user[key] = inp.checked;
        else if (inp.type === 'number') config.user[key] = parseFloat(inp.value) || 0;
        else config.user[key] = inp.value;
        savePersisted();
        if (['algorithm','width','height','startX','startY'].includes(key)) {
          resetAlgorithms();
        }
        if (key.startsWith('watermark')) updateWatermark();
        if (key === 'showWatermark') {
          updateWatermarkVisibility();
        }
      });
    });
    document.getElementById('afRunBtn')?.addEventListener('click', () => {
      toggleRun(!config.runtime.running);
    });
    document.getElementById('afCollapseBtn')?.addEventListener('click', () => {
      document.getElementById('afBody').classList.toggle('collapsed');
    });
    document.getElementById('afCloseBtn')?.addEventListener('click', () => {
      rootPanel.remove();
      config.runtime.running = false;
    });
    document.getElementById('afTestPixelBtn')?.addEventListener('click', async () => {
      const pos = nextPosition();
      const color = nextColor();
      const r = await paintPixel(pos.x, pos.y, color);
      if (r.success) {
        logLine(`[TEST] ${L().paintedOk} (${r.absX},${r.absY}) c${color}`);
        updateStatus('[TEST] ' + L().paintedOk, 'success');
      } else {
        logLine(`[TEST] ${L().paintFail} (${r.status})`, 'error');
        updateStatus('[TEST] ' + L().paintFail, 'error');
      }
      updateStatsUI();
    });
    document.getElementById('afResetStatsBtn')?.addEventListener('click', () => {
      config.runtime.paintedCount = 0;
      config.runtime.attempts = 0;
      config.runtime.failures = 0;
      config.runtime.lastPaint = null;
      resetAlgorithms();
      updateStatsUI();
      logLine('Stats reset');
    });
    document.getElementById('afExportConfigBtn')?.addEventListener('click', () => {
      const ta = document.getElementById('afConfigArea');
      ta.value = JSON.stringify(config.user, null, 2);
      updateStatus('JSON OK', 'success');
    });
    document.getElementById('afCopyConfigBtn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(config.user, null, 2));
        updateStatus(L().copied, 'success');
      } catch {
        updateStatus('Clipboard fail', 'error');
      }
    });
    document.getElementById('afPasteConfigBtn')?.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        document.getElementById('afConfigArea').value = text;
      } catch {
        updateStatus('Clipboard fail', 'error');
      }
    });
    document.getElementById('afImportConfigBtn')?.addEventListener('click', () => {
      const ta = document.getElementById('afConfigArea').value.trim();
      try {
        const parsed = JSON.parse(ta);
        Object.assign(config.user, parsed);
        savePersisted();
        refreshSettingsInputs();
        resetAlgorithms();
        updateWatermark();
        updateStatus(L().imported, 'success');
      } catch {
        updateStatus(L().invalidImport, 'error');
      }
    });
    document.getElementById('afClearLogBtn')?.addEventListener('click', () => {
      config.runtime.lastLogLines = [];
      updateLogUI();
    });
  };

  const toggleRun = (run) => {
    config.runtime.running = run;
    const btn = document.getElementById('afRunBtn');
    if (run) {
      btn.innerHTML = `<span>■</span> ${L().stop}`;
      btn.classList.add('running');
      updateStatus(L().started, 'success');
      resetAlgorithms();
      mainLoop();
    } else {
      btn.innerHTML = `<span>▶</span> ${L().start}`;
      btn.classList.remove('running');
      updateStatus(L().stopped, 'error');
    }
  };

  const draggable = (handle, el) => {
    let ox=0, oy=0, mx=0, my=0, dragging=false;
    handle.style.cursor = 'move';
    handle.addEventListener('mousedown', e=>{
      if (e.target.closest('.af-btn')) return;
      dragging=true; mx=e.clientX; my=e.clientY;
      ox = parseInt(getComputedStyle(el).left,10) || 20;
      oy = parseInt(getComputedStyle(el).top,10) || 20;
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
    function move(e){
      if (!dragging) return;
      const dx = e.clientX - mx;
      const dy = e.clientY - my;
      el.style.left = (ox + dx) + 'px';
      el.style.top = (oy + dy) + 'px';
    }
    function up(){
      dragging=false;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }
  };

  /************** MARCA D'ÁGUA **************/
  let wmEl;
  function injectWatermark() {
    if (wmEl) return;
    wmEl = document.createElement('div');
    wmEl.id = 'af-watermark';
    wmEl.setAttribute('data-brand', BRAND);
    document.body.appendChild(wmEl);
    updateWatermark();
    updateWatermarkVisibility();
  }
  function updateWatermarkVisibility() {
    if (!wmEl) return;
    wmEl.style.display = config.user.showWatermark ? 'block' : 'none';
  }
  function updateWatermark() {
    if (!wmEl) return;
    const size = config.user.watermarkSize || 240;
    const rot = config.user.watermarkRotation || -30;
    const op = Math.max(0, Math.min(1, config.user.watermarkOpacity));
    const pattern = `
      repeating-linear-gradient(
        ${rot}deg,
        rgba(255,255,255,${op}) 0,
        rgba(255,255,255,${op}) 2px,
        transparent 2px,
        transparent ${size}px
      )`;
    // We will overlay text using CSS background plus multiple pseudo elements
    wmEl.style.setProperty('--wm-opacity', op);
    wmEl.style.setProperty('--wm-rotation', rot + 'deg');
    wmEl.style.setProperty('--wm-size', size + 'px');
    wmEl.innerHTML = Array.from({length:12})
      .map((_,i)=>`<span class="wm-row" style="animation-delay:${i*0.35}s">${BRAND}</span>`).join('');
  }

  /************** ESTILOS **************/
  const injectStyles = () => {
    if (document.getElementById('af-styles')) return;
    const st = document.createElement('style');
    st.id = 'af-styles';
    st.textContent = `
      #af-watermark {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9998;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        align-items: center;
        font-family: system-ui,Segoe UI,Roboto,Arial,sans-serif;
        font-weight: 700;
        font-size: 56px;
        letter-spacing: 4px;
        color: rgba(255,255,255,0.05);
        mix-blend-mode: overlay;
        opacity: 0.7;
        user-select: none;
        padding: 40px 0;
        overflow: hidden;
        backdrop-filter: none;
      }
      #af-watermark .wm-row {
        opacity: .55;
        transform: rotate(var(--wm-rotation, -25deg)) scale(1.1);
        white-space: nowrap;
        text-transform: uppercase;
        animation: wmFloat 12s linear infinite;
        background: linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.15), rgba(255,255,255,0.0));
        -webkit-background-clip: text;
        color: transparent;
      }
      @keyframes wmFloat {
        0% { transform: translateX(-10%) rotate(var(--wm-rotation, -25deg)) scale(1.1); }
        50% { transform: translateX(10%) rotate(var(--wm-rotation, -25deg)) scale(1.1); }
        100% { transform: translateX(-10%) rotate(var(--wm-rotation, -25deg)) scale(1.1); }
      }
      .af-panel {
        position: fixed;
        top: 50px;
        left: 50px;
        width: 350px;
        font-family: system-ui,Segoe UI,Roboto,Arial,sans-serif;
        font-size: 13px;
        color: #e2e8f0;
        background: linear-gradient(145deg, rgba(25,25,35,0.92), rgba(15,15,22,0.92));
        border: 1px solid #3b3f52;
        border-radius: 14px;
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 25px rgba(0,0,0,0.6);
        z-index: 1000000;
        overflow: hidden;
        animation: afFadeIn .4s ease;
      }
      .af-panel.af-pulse { box-shadow: 0 0 0 3px rgba(0,255,140,0.4), 0 10px 25px rgba(0,0,0,0.65); transition: box-shadow .3s; }
      @keyframes afFadeIn { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:translateY(0);} }
      .af-header {
        display:flex; align-items:center; justify-content:space-between;
        background: linear-gradient(90deg,#232738,#1a1d27);
        padding:10px 12px;
        border-bottom:1px solid #343848;
        user-select:none;
      }
      .af-title { font-weight:600; letter-spacing:.5px; font-size:14px; display:flex; gap:6px; align-items:center; }
      .af-title .af-brand-tag {
        font-size:10px;
        padding:2px 6px;
        background:#364156;
        border:1px solid #4d5b72;
        border-radius:20px;
        text-transform:uppercase;
        letter-spacing:1px;
        color:#e0e6ef;
      }
      .af-actions { display:flex; gap:6px; }
      .af-btn {
        background:#343b4e;
        border:1px solid #475068;
        color:#dbe3ef;
        padding:5px 10px;
        border-radius:6px;
        cursor:pointer;
        font-size:12px;
        display:inline-flex;
        align-items:center;
        gap:4px;
        line-height:1.1;
        transition:.15s;
      }
      .af-btn:hover { background:#44506a; border-color:#5d6b86; }
      .af-btn.af-run.running { background:#c53030; border-color:#e53e3e; color:#fff; }
      .af-btn.af-run.running:hover { background:#9b2c2c; }
      .af-btn.af-mini { width:28px; justify-content:center; }
      .af-btn.af-close {
        background:#3d2f2f;
        border-color:#5a3838;
      }
      .af-btn.af-close:hover { background:#5a2f2f; border-color:#7e3b3b; }

      .af-body { max-height:640px; overflow-y:auto; scrollbar-width:thin; }
      .af-body.collapsed { display:none; }
      .af-footer-bar {
        font-size:11px;
        text-align:center;
        padding:4px 8px 6px;
        background:#1c212b;
        border-top:1px solid #2c323f;
        letter-spacing:.5px;
        color:#94a3b8;
      }

      .af-tabs { display:flex; border-bottom:1px solid #343848; }
      .af-tab {
        flex:1;
        background:transparent;
        border:none;
        padding:8px 6px;
        cursor:pointer;
        color:#a0aec0;
        font-weight:500;
        font-size:12px;
        transition:.2s;
      }
      .af-tab.active {
        color:#f0f3f9;
        background:linear-gradient(180deg,#2b3142,#232836);
        box-shadow: inset 0 -2px 0 #49cc90;
      }
      .af-tab:hover { background:#2b3142; color:#d1d9e6; }

      .af-tab-content { padding:12px 14px; }
      .af-tab-content.hidden { display:none; }

      .af-stats-grid {
        display:grid;
        grid-template-columns: repeat(2, 1fr);
        gap:8px 14px;
        margin-bottom:12px;
      }
      .af-stats-grid div {
        background:#2a3140;
        padding:6px 8px;
        border:1px solid #394052;
        border-radius:6px;
        display:flex;
        flex-direction:column;
        gap:2px;
      }
      .af-stats-grid label {
        font-size:10px;
        text-transform:uppercase;
        letter-spacing:.5px;
        color:#94a3b8;
      }
      .af-stats-grid span { font-size:13px; font-weight:600; color:#f8fafc; }

      .af-status-line {
        margin-bottom:10px;
        padding:8px 10px;
        border-radius:8px;
        background:#2b3445;
        border:1px solid #404a5d;
        font-size:12px;
        font-weight:500;
      }
      .af-status-line.success { border-color:#2f855a; background:#23423a; color:#68d391; }
      .af-status-line.error { border-color:#9b2c2c; background:#3f2222; color:#feb2b2; }

      .af-buttons-line { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
      .af-btn.sm { font-size:11px; padding:5px 8px; }
      .af-btn.xs { font-size:10px; padding:4px 6px; }

      .af-form { display:grid; grid-template-columns: repeat(2, 1fr); gap:10px 12px; }
      .af-field { display:flex; flex-direction:column; gap:4px; font-size:11px; }
      .af-field span { font-size:11px; color:#aab7cd; }
      .af-field input, .af-field select {
        background:#1f2531;
        border:1px solid #324055;
        color:#e2e8f0;
        border-radius:6px;
        padding:5px 6px;
        font-size:12px;
        outline:none;
        transition:.15s;
      }
      .af-field input:focus, .af-field select:focus {
        border-color:#4f9ae6;
        box-shadow:0 0 0 1px #4f9ae6;
      }
      .af-field.af-check {
        flex-direction:row;
        align-items:center;
        gap:6px;
        padding:6px 8px;
        background:#222a37;
        border:1px solid #313b4b;
        border-radius:6px;
      }
      .af-field.af-check:hover { background:#273341; }
      .af-field.af-check input { width:16px; height:16px; margin:0; }

      .af-export-import { margin-top:14px; }
      .af-textarea {
        width:100%; min-height:90px;
        background:#141a23;
        border:1px solid #2d3949;
        color:#e2e8f0;
        border-radius:8px;
        padding:6px;
        font-size:12px;
        resize:vertical;
        margin-bottom:8px;
      }

      .af-log-header {
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:6px;
        font-size:12px;
        font-weight:600;
        color:#cbd5e1;
      }
      .af-log {
        background:#141a23;
        border:1px solid #2d3949;
        border-radius:8px;
        padding:8px;
        font-family: ui-monospace,Consolas,monospace;
        font-size:11px;
        max-height:240px;
        overflow-y:auto;
        line-height:1.3;
        scrollbar-width: thin;
      }
      .af-log div { padding:2px 0; border-bottom:1px dotted #253041; }
      .af-log div:last-child { border-bottom:none; }
    `;
    document.head.appendChild(st);
  };

  /************** INICIALIZAÇÃO **************/
  const init = async () => {
    if (config.runtime.inited) return;
    config.runtime.inited = true;
    await detectLanguage();
    buildUI();
    await updateCharges();
    updateStatsUI();
    logLine('Inicializado');
  };

  /************** START **************/
  init();

})();
