let ioInstance = null;

/**
 * Armazena a instância global do Socket.IO
 * @param {import('socket.io').Server} io
 */
export function initSocketService(io) {
  ioInstance = io;
  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);
  });
}

/**
 * Transmite uma mensagem para todos os clientes conectados.
 * @param {string} topic - O nome do "evento" (ex: 'agv/status')
 * @param {any} data - Os dados para enviar
 */
export function broadcast(topic, data) {
  if (ioInstance) {
    ioInstance.emit(topic, data);
  }
}
