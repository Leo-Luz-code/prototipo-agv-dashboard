// ======================================================
// Módulo para o Sensor de Cor (GY-33)
// Responsável por gerenciar o card do sensor de cor
// ======================================================

class ColorSensor {
  constructor() {
    console.log("[Sensor Cor] 🚀 Inicializando...");

    // Apenas o elemento de texto
    this.colorDisplay = document.getElementById("color-display");

    if (!this.colorDisplay) {
      console.error("[Sensor Cor] ❌ Elemento 'color-display' NÃO encontrado!");
    } else {
      console.log("[Sensor Cor] ✅ Elemento encontrado");
    }

    // Conecta ao Socket.IO
    this.connectSocketIO();
  }

  connectSocketIO() {
    // Socket.IO
    const socket = io();

    console.log("[Sensor Cor] 🔌 Conectando ao Socket.IO...");

    // Conectado
    socket.on("connect", () => {
      console.log("[Sensor Cor] ✅ Conectado ao Socket.IO");
    });

    // Desconectado
    socket.on("disconnect", () => {
      console.log("[Sensor Cor] ❌ DESCONECTADO do servidor!");
    });

    // Ouve pelo evento 'agv/color' para atualizar dados de cor
    console.log("[Sensor Cor] 👂 Registrando listener para 'agv/color'");
    socket.on("agv/color", (data) => {
      console.log("[Sensor Cor] 📨 Evento 'agv/color' recebido!");
      this.handleColorData(data);
    });
  }

  handleColorData(data) {
    console.log("[Sensor Cor] 🎨 Dados recebidos:", data);

    if (data && data.color) {
      const detectedColor = data.color;

      // Atualiza o texto e a cor da fonte
      if (this.colorDisplay) {
        this.colorDisplay.textContent = detectedColor;

        // Obtém a cor hexadecimal e aplica ao texto
        const textColor = this.getColorValue(detectedColor);
        this.colorDisplay.style.color = textColor;

        // Sombra mais forte para cores claras
        if (detectedColor === "Branco" || detectedColor === "Amarelo") {
          this.colorDisplay.style.textShadow = `0 0 30px ${textColor}, 0 0 10px ${textColor}`;
        } else {
          this.colorDisplay.style.textShadow = `0 0 20px ${textColor}`;
        }

        console.log(`[Sensor Cor] ✅ Cor atualizada: ${detectedColor} (${textColor})`);
      } else {
        console.error("[Sensor Cor] ❌ Elemento color-display não encontrado!");
      }
    } else {
      console.warn("[Sensor Cor] ⚠️ Dados inválidos:", data);
    }
  }

  // Mapeia nome da cor para valor hexadecimal
  getColorValue(colorName) {
    const colorMap = {
      "Vermelho": "#ff0000",
      "Verde": "#00ff00",
      "Azul": "#0000ff",
      "Amarelo": "#ffff00",
      "Ciano": "#00ffff",
      "Magenta": "#ff00ff",
      "Laranja": "#ff8000",
      "Rosa": "#ff69b4",
      "Roxo": "#8000ff",
      "Branco": "#ffffff",
      "Preto": "#000000",
      "Cinza": "#808080",
      "Lilás": "#c8a2c8",
      "Lilás": "#c8a2c8",
      "Azul-escuro": "#00008b",
      "Azul-acinzentado": "#708090",
      "Azul-acizentado": "#708090",  // Variação com "c" em vez de "ç"
      "---": "#333333"
    };

    // Tenta encontrar a cor exata
    if (colorMap[colorName]) {
      return colorMap[colorName];
    }

    // Tenta encontrar sem considerar maiúsculas/minúsculas
    const lowerName = colorName.toLowerCase();
    for (const key in colorMap) {
      if (key.toLowerCase() === lowerName) {
        return colorMap[key];
      }
    }

    console.warn(`[Sensor Cor] ⚠️ Cor não mapeada: "${colorName}". Usando cinza padrão.`);
    return "#333333";
  }
}

// Exporta para uso global
window.ColorSensor = ColorSensor;

// Função de teste para debug
window.testColorSensor = function(colorName) {
  console.log("[TEST] 🧪 Testando sensor de cor com:", colorName);
  const testData = {
    color: colorName || "Vermelho",
    timestamp: Date.now()
  };

  // Simula recebimento de dados
  const event = new CustomEvent('test-color', { detail: testData });
  window.dispatchEvent(event);

  console.log("[TEST] 📤 Enviado:", testData);
};
