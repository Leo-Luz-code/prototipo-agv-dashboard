let agvStatus = {
  posicao: "Branco",
  bateria: 100,
  sensores: {
    rfid: "Nenhuma"
  },
  ultimaAtualizacao: new Date(),
};

export function updateStatus(novoStatus) {
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
}

export function getStatusFromAGV() {
  return agvStatus;
}
