// ======================================================
// Módulo para o Sensor de Distância
// Responsável por gerenciar o card dos sensores de distância
// e a visualização 3D
// ======================================================

class DistanceSensor {
  constructor() {
    console.log("[Sensor Distância] 🚀 Inicializando módulo...");

    // Inicializa referências DOM
    this.leftElement = document.getElementById("distance-left");
    this.centerElement = document.getElementById("distance-center");
    this.rightElement = document.getElementById("distance-right");

    // Inicializa visualização 3D
    this.distance3D = null;
    if (typeof Distance3DVisualization !== "undefined") {
      this.distance3D = new Distance3DVisualization("distance-3d-canvas");
      console.log("[Sensor Distância] 🎯 Visualização 3D inicializada");
    } else {
      console.warn(
        "[Sensor Distância] ⚠️ Distance3DVisualization não disponível"
      );
    }

    // Conecta ao Socket.IO
    this.connectSocketIO();

    console.log("[Sensor Distância] ✅ Módulo inicializado");
  }

  connectSocketIO() {
    // Socket.IO
    const socket = io();

    // Desconectado
    socket.on("disconnect", () => {
      console.log("[Socket.IO] ❌ DESCONECTADO do servidor!");
    });

    // Ouve pelo evento 'agv/distance' para atualizar sensores de distância
    socket.on("agv/distance", (data) => this.handleDistanceData(data));

    // Ouve pelo evento 'agv/imu' para atualizar física do AGV na visualização 3D
    socket.on("agv/imu", (data) => this.handleIMUData(data));
  }

  handleIMUData(data) {
    console.log("[Socket.IO] 🎯 Dados IMU recebidos para visualização 3D:", data);

    // Atualiza visualização 3D com dados do IMU (acelerômetro e giroscópio)
    if (
      this.distance3D &&
      typeof this.distance3D.updateIMUData === "function" &&
      data &&
      data.accel &&
      data.gyro
    ) {
      this.distance3D.updateIMUData(data.accel, data.gyro);
      console.log("[Socket.IO] ✅ Visualização 3D atualizada com dados IMU");
    }
  }

  handleDistanceData(data) {
    console.log("[Socket.IO] 📏 Dados de distância recebidos:", data);

    if (data && data.distancia) {
      const { esquerda, centro, direita, unidade } = data.distancia;

      console.log(
        `[Socket.IO] 📏 Valores recebidos - Esq: ${esquerda} | Centro: ${centro} | Dir: ${direita}`
      );

      const DISTANCIA_PERIGO = 20; // 20 cm ou menos = PERIGO

      // Atualiza elementos visuais
      this.updateSensorDisplay(
        this.leftElement,
        esquerda,
        unidade,
        DISTANCIA_PERIGO,
        "Esquerda"
      );
      this.updateSensorDisplay(
        this.centerElement,
        centro,
        unidade,
        DISTANCIA_PERIGO,
        "Centro"
      );
      this.updateSensorDisplay(
        this.rightElement,
        direita,
        unidade,
        DISTANCIA_PERIGO,
        "Direita"
      );

      // Verifica se há perigo em qualquer sensor
      const temPerigo =
        this.isInDanger(esquerda, DISTANCIA_PERIGO) ||
        this.isInDanger(centro, DISTANCIA_PERIGO) ||
        this.isInDanger(direita, DISTANCIA_PERIGO);

      // Atualiza visualização 3D
      if (
        this.distance3D &&
        typeof this.distance3D.updateSensorData === "function"
      ) {
        this.distance3D.updateSensorData(
          parseFloat(centro) || 0,
          parseFloat(direita) || 0,   // right sensor data (azul - direita)
          parseFloat(esquerda) || 0,  // left sensor data (verde - esquerda)
          temPerigo
        );
      }

      if (temPerigo) {
        console.warn(
          `[Socket.IO] ⚠️ PERIGO! Obstáculo muito próximo detectado!`
        );
      }

      console.log(
        `[Socket.IO] ✅ Distâncias atualizadas - Esq: ${esquerda} | Centro: ${centro} | Dir: ${direita} ${unidade}`
      );
    } else {
      console.warn(
        "[Socket.IO] ⚠️ Dados de distância inválidos ou ausentes:",
        data
      );
    }
  }

  updateSensorDisplay(
    element,
    value,
    unit = "cm",
    dangerThreshold,
    sensorName
  ) {
    if (element && value !== undefined && value !== null) {
      // Atualiza texto
      element.textContent = `${parseFloat(value).toFixed(1)} ${unit}`;

      // Atualiza classes de perigo
      if (this.isInDanger(value, dangerThreshold)) {
        element.classList.add("distance-danger");
        element.classList.remove("distance-safe");
      } else {
        element.classList.remove("distance-danger");
        element.classList.add("distance-safe");
      }

      console.log(`[Socket.IO] ✅ ${sensorName} atualizado: ${value} ${unit}`);
    }
  }

  isInDanger(value, threshold) {
    return parseFloat(value) <= threshold;
  }
}

// Exporta para uso global
window.DistanceSensor = DistanceSensor;
