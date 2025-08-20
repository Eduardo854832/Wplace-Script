/* ==== PROTEÇÃO (OFUSCADA) ==== */
(function(){
  try {
    const _0x1 = "https://github.com/Eduardo854832/Wplace-Script";
    const _0x2 = "⚠️ ESTA NÃO É A VERSÃO OFICIAL!\n👉 Oficial: " + _0x1;

    if (window.WPLACE_PROTECT) return;
    Object.defineProperty(window, "WPLACE_PROTECT", {
      value: true,
      writable: false,
      configurable: false
    });

    console.log("%c" + _0x2,
      "color:red;font-size:16px;font-weight:bold;");

    setInterval(() => {
      if (!window.WPLACE_PROTECT) {
        alert("⚠️ Script inválido!\nBaixe a versão oficial:\n" + _0x1);
        throw new Error("Proteção acionada.");
      }
    }, 3000);

  } catch (e) {
    alert("⚠️ Script adulterado!\nUse somente a versão oficial!");
    throw new Error("Proteção acionada.");
  }
})();
/* ==== FIM DA PROTEÇÃO ==== */


/* ==== BOT (LEGÍVEL) ==== */
(function () {
  // Checagem da proteção
  if (!window.WPLACE_PROTECT) {
    alert("⚠️ Script adulterado!\nBaixe a versão oficial:\nhttps://github.com/Eduardo854832/Wplace-Script");
    throw new Error("Script bloqueado por remoção da proteção.");
  }

  console.log("✅ Bot iniciado corretamente.");

  // Exemplo de bot
  const WplaceBot = {
    running: false,

    start() {
      if (this.running) {
        console.warn("⚠️ O bot já está rodando!");
        return;
      }
      this.running = true;
      console.log("🚀 Bot STARTED");
      this.loop();
    },

    stop() {
      if (!this.running) {
        console.warn("⚠️ O bot já está parado!");
        return;
      }
      this.running = false;
      console.log("🛑 Bot STOPPED");
    },

    loop() {
      if (!this.running) return;
      console.log("🎨 Colocando pixel automático...");

      // simulação de delay
      setTimeout(() => this.loop(), 5000);
    }
  };

  // Expor no console
  window.WplaceBot = WplaceBot;

})();
