let ioInstance = null;

/**
 * Armazena a instância global do Socket.IO
 * @param {import('socket.io').Server} io
 */
export function initSocketService(io) {
  console.log(`[SOCKET SERVICE] 🚀 Inicializando Socket.IO...`);
  ioInstance = io;
  console.log(`[SOCKET SERVICE] ✅ ioInstance definida:`, !!ioInstance);

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] 📱 Cliente conectado: ${socket.id}`);
    console.log(`[Socket.IO] 👥 Total de clientes conectados:`, io.engine.clientsCount);
  });
}

/**
 * Transmite uma mensagem para todos os clientes conectados.
 * @param {string} topic - O nome do "evento" (ex: 'agv/status')
 * @param {any} data - Os dados para enviar
 */
export function broadcast(topic, data) {
  console.log(`[SOCKET SERVICE] 📡 Broadcast chamado para tópico "${topic}"`);
  console.log(`[SOCKET SERVICE] 📦 Dados:`, data);

  if (ioInstance) {
    console.log(`[SOCKET SERVICE] ✅ Emitindo para todos os clientes conectados...`);
    ioInstance.emit(topic, data);
    console.log(`[SOCKET SERVICE] ✅ Broadcast enviado com sucesso!`);
  } else {
    console.error(`[SOCKET SERVICE] ❌ ioInstance é null! Socket.IO não foi inicializado!`);
  }
}
