// =====================================================
// Gerenciador Principal de Sensores
// Responsável por inicializar e coordenar todos os módulos
// de sensores na página
// =====================================================

class SensorsManager {
  constructor() {
    console.log("[Sensores] 🚀 Inicializando gerenciador de sensores...");
    
    // Lista de sensores ativos
    this.activeSensors = {};
    
    // Inicializa sensores disponíveis
    this.initializeSensors();
  }

  initializeSensors() {
    // Inicializa o sensor de distância se o card estiver presente
    if (document.getElementById("sensors-card")) {
      this.activeSensors.distance = new DistanceSensor();
    }

    // Inicializa o sensor IMU se o card estiver presente
    if (document.getElementById("imu-card")) {
      this.activeSensors.imu = new IMUSensor();
    }

    // Inicializa o sensor de cor se o card estiver presente
    if (document.getElementById("color-card")) {
      this.activeSensors.color = new ColorSensor();
    }

    // Aqui você pode adicionar a inicialização de outros sensores
    // seguindo o mesmo padrão, por exemplo:
    //
    // if (document.getElementById("temperatura-card")) {
    //   this.activeSensors.temperatura = new TemperatureSensor();
    // }
    //
    // if (document.getElementById("umidade-card")) {
    //   this.activeSensors.umidade = new UmidadeSensor();
    // }

    console.log("[Sensores] ✅ Sensores inicializados:", Object.keys(this.activeSensors));
  }
}

// Quando o DOM estiver pronto, inicializa o gerenciador
document.addEventListener("DOMContentLoaded", () => {
  window.sensorsManager = new SensorsManager();
});