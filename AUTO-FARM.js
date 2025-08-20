(function () {
  // Bloqueia se removerem a proteção
  if (!window.WPLACE_PROTECT) {
    alert("⚠️ Script adulterado!\nBaixe a versão oficial:\nhttps://github.com/Eduardo854832/Wplace-Script");
    throw new Error("Script bloqueado por remoção da proteção.");
  }

  console.log("✅ Bot carregado com sucesso.");

  // =========================
  // SISTEMA DE LOGS
  // =========================
  const logBox = document.createElement("div");
  logBox.style.cssText = `
    position:fixed;top:10px;right:10px;width:280px;
    max-height:50%;overflow:auto;
    background:rgba(0,0,0,0.8);color:#0f0;
    font-family:monospace;font-size:12px;
    border-radius:10px;padding:10px;z-index:999999;
  `;
  document.body.appendChild(logBox);

  function log(msg, color="lime") {
    const time = new Date().toLocaleTimeString();
    const p = document.createElement("div");
    p.innerHTML = `[${time}] <span style="color:${color}">${msg}</span>`;
    logBox.appendChild(p);
    logBox.scrollTop = logBox.scrollHeight;
  }

  // =========================
  // BOT PRINCIPAL
  // =========================
  const WplaceBot = {
    running: false,

    start() {
      if (this.running) {
        log("⚠️ O bot já está rodando!", "yellow");
        return;
      }
      this.running = true;
      log("🚀 Bot STARTED", "cyan");
      this.loop();
    },

    stop() {
      if (!this.running) {
        log("⚠️ O bot já está parado!", "yellow");
        return;
      }
      this.running = false;
      log("🛑 Bot STOPPED", "orange");
    },

    loop() {
      if (!this.running) return;

      // Exemplo: aqui vai sua lógica real de "farm"
      const x = Math.floor(Math.random() * 1000);
      const y = Math.floor(Math.random() * 1000);
      log(`✅ Pixel colocado em (${x},${y})`, "lime");

      // repete a cada 5s
      setTimeout(() => this.loop(), 5000);
    }
  };

  // =========================
  // MENU VISUAL
  // =========================
  const menu = document.createElement("div");
  menu.style.cssText = `
    position:fixed;bottom:20px;right:20px;
    background:#222;color:#fff;
    border-radius:12px;padding:12px;
    font-family:Arial;font-size:14px;
    box-shadow:0 0 10px rgba(0,0,0,.5);
    z-index:999999;
  `;
  menu.innerHTML = `
    <b>🎨 Wplace Bot</b><br>
    <button id="startBtn">▶️ Start</button>
    <button id="stopBtn">⏹ Stop</button>
    <div id="status" style="margin-top:8px;color:cyan;">Status: Stopped</div>
  `;
  document.body.appendChild(menu);

  const statusEl = menu.querySelector("#status");
  menu.querySelector("#startBtn").onclick = () => {
    WplaceBot.start();
    statusEl.textContent = "Status: Running";
    statusEl.style.color = "lime";
  };
  menu.querySelector("#stopBtn").onclick = () => {
    WplaceBot.stop();
    statusEl.textContent = "Status: Stopped";
    statusEl.style.color = "red";
  };

  // =========================
  // EXPOR NO CONSOLE
  // =========================
  window.WplaceBot = WplaceBot;

})();
