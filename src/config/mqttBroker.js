import aedes from 'aedes';
import { createServer } from 'net';

/**
 * Broker MQTT embutido usando Aedes
 * Isso elimina a necessidade de instalar Mosquitto separadamente
 */

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

// Log quando um cliente se inscreve em um tópico
broker.on('subscribe', (subscriptions, client) => {
  if (client) {
    subscriptions.forEach((sub) => {
      console.log(`[BROKER MQTT] 📬 ${client.id} inscreveu-se em "${sub.topic}"`);
    });
  }
});

// Log quando uma mensagem é publicada
broker.on('publish', (packet, client) => {
  if (client) {
    console.log(`[BROKER MQTT] 📨 ${client.id} publicou em "${packet.topic}"`);
    console.log(`[BROKER MQTT] 📦 Payload: ${packet.payload.toString()}`);
  }
});

// Log de erros
broker.on('error', (error) => {
  console.error('[BROKER MQTT] ❌ Erro:', error);
});

export default broker;
