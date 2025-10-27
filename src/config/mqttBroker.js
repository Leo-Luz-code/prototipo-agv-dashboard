import aedes from 'aedes';
import { createServer } from 'net';
import { updateStatus, getStatusFromAGV } from '../services/agvService.js';

const broker = aedes();
const port = 1883;

// Criar servidor TCP para o broker MQTT
const server = createServer(broker.handle);

// Inicializar broker
server.listen(port, () => {
  console.log(`[BROKER MQTT] 🚀 Broker iniciado na porta ${port}`);
  console.log(`[BROKER MQTT] ✅ Pronto para receber conexões`);
});

// Log quando um cliente conecta
broker.on('client', (client) => {
  console.log(`[BROKER MQTT] 📱 Cliente conectado: ${client.id}`);
});

// Log quando um cliente desconecta
broker.on('clientDisconnect', (client) => {
  console.log(`[BROKER MQTT] 📴 Cliente desconectado: ${client.id}`);
});

// Log quando um cliente se inscreve
broker.on('subscribe', (subscriptions, client) => {
  if (client) {
    subscriptions.forEach((sub) => {
      console.log(`[BROKER MQTT] 📬 ${client.id} inscreveu-se em "${sub.topic}"`);
    });
  }
});

// PROCESSAR MENSAGENS DIRETO AQUI!
broker.on('publish', async (packet, client) => {
  if (client) {
    const topic = packet.topic;
    const payload = packet.payload.toString();

    console.log(`[BROKER MQTT] 📨 ${client.id} publicou em "${topic}"`);
    console.log(`[BROKER MQTT] 📦 Payload: ${payload}`);

    // Processar mensagem RFID
    if (topic === 'agv/rfid') {
      try {
        const data = JSON.parse(payload);
        console.log(`[BROKER MQTT] 🏷️ RFID DETECTADO: ${data.tag}`);

        // Atualizar status
        updateStatus({
          sensores: {
            rfid: data.tag,
            rfidTimestamp: data.timestamp || Date.now()
          }
        });

        const fullStatus = getStatusFromAGV();
        console.log(`[BROKER MQTT] 📡 Status atualizado:`, fullStatus);

        // Importar dinamicamente para evitar circular dependency
        const { broadcast } = await import('../services/socketService.js');
        broadcast('agv/status', fullStatus);
        console.log(`[BROKER MQTT] ✅ Tag "${data.tag}" transmitida para dashboard!`);
      } catch (e) {
        console.error('[BROKER MQTT] ❌ Erro ao processar RFID:', e);
      }
    }

    // Processar status do AGV
    if (topic === 'agv/status') {
      try {
        const data = JSON.parse(payload);
        updateStatus(data);
        const fullStatus = getStatusFromAGV();

        const { broadcast } = await import('../services/socketService.js');
        broadcast('agv/status', fullStatus);
      } catch (e) {
        console.error('[BROKER MQTT] ❌ Erro ao processar status:', e);
      }
    }
  }
});

// Log de erros
broker.on('error', (error) => {
  console.error('[BROKER MQTT] ❌ Erro:', error);
});

export default broker;
