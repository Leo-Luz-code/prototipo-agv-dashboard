// ======================================================
// Módulo para o Sensor IMU (MPU6050)
// Responsável por gerenciar o card do acelerômetro/giroscópio
// ======================================================

class IMUSensor {
  constructor() {
    console.log("[Sensor IMU] 🚀 Inicializando módulo...");

    // Inicializa referências DOM - Acelerômetro
    this.accelX = document.getElementById("imu-accel-x");
    this.accelY = document.getElementById("imu-accel-y");
    this.accelZ = document.getElementById("imu-accel-z");

    // Inicializa referências DOM - Giroscópio
    this.gyroX = document.getElementById("imu-gyro-x");
    this.gyroY = document.getElementById("imu-gyro-y");
    this.gyroZ = document.getElementById("imu-gyro-z");

    // Inicializa referência DOM - Temperatura
    this.temp = document.getElementById("imu-temp");

    // Conecta ao Socket.IO
    this.connectSocketIO();

    console.log("[Sensor IMU] ✅ Módulo inicializado");
  }

  connectSocketIO() {
    // Socket.IO
    const socket = io();

    // Desconectado
    socket.on("disconnect", () => {
      console.log("[Socket.IO] ❌ DESCONECTADO do servidor!");
    });

    // Ouve pelo evento 'agv/imu' para atualizar dados do IMU
    socket.on("agv/imu", (data) => this.handleIMUData(data));
  }

  handleIMUData(data) {
    console.log("[Socket.IO] 📐 Dados IMU recebidos:", data);

    if (data && data.accel && data.gyro) {
      // Atualiza acelerômetro
      this.accelX.textContent = data.accel.x.toFixed(2);
      this.accelY.textContent = data.accel.y.toFixed(2);
      this.accelZ.textContent = data.accel.z.toFixed(2);

      // Atualiza giroscópio
      this.gyroX.textContent = data.gyro.x.toFixed(2);
      this.gyroY.textContent = data.gyro.y.toFixed(2);
      this.gyroZ.textContent = data.gyro.z.toFixed(2);

      // Atualiza temperatura
      if (data.temp !== undefined && data.temp !== null) {
        this.temp.textContent = `${data.temp.toFixed(1)}°C`;
      }

      console.log("[Socket.IO] ✅ Dados IMU atualizados");
    } else {
      console.warn("[Socket.IO] ⚠️ Dados IMU inválidos ou ausentes:", data);
    }
  }
}

// Exporta para uso global
window.IMUSensor = IMUSensor;
