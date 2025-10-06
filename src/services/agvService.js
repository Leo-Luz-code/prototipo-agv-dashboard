let agvStatus = {
  posicao: null,
  bateria: null,
  sensores: {},
  ultimaAtualizacao: null,
};

export function updateStatus(novoStatus) {
  agvStatus = { ...agvStatus, ...novoStatus, ultimaAtualizacao: new Date() };
}

export function getStatusFromAGV() {
  return agvStatus;
}
