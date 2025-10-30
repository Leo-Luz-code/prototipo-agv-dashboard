let agvStatus = {
  posicao: "Branco",
  bateria: 100,
  sensores: {
    rfid: "Nenhuma",
    distancia: {
      esquerda: 0,
      centro: 0,
      direita: 0,
      timestamp: null,
      unidade: "cm"
    },
    imu: {
      accel: { x: 0, y: 0, z: 0 },
      gyro: { x: 0, y: 0, z: 0 },
      temp: 0,
      timestamp: null
    }
  },
  ultimaAtualizacao: new Date(),
};

export function updateStatus(novoStatus) {
  console.log("[AGV SERVICE] 📝 Atualizando status com:", novoStatus);

  // Merge profundo para preservar campos de sensores não atualizados
  if (novoStatus.sensores) {
    agvStatus.sensores = { ...agvStatus.sensores, ...novoStatus.sensores };
    delete novoStatus.sensores;
  }

  agvStatus = {
    ...agvStatus,
    ...novoStatus,
    ultimaAtualizacao: new Date()
  };

  console.log("[AGV SERVICE] ✅ Status atualizado:", agvStatus);
}

export function getStatusFromAGV() {
  return agvStatus;
}
