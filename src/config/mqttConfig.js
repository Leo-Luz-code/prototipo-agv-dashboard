import { connect } from "mqtt";

const mqttOptions = {
  host: "localhost", // ou IP do broker
  port: 1883,
};

// Aguarda 500ms para garantir que o broker inicializou
await new Promise(resolve => setTimeout(resolve, 500));

const client = connect(`mqtt://${mqttOptions.host}:${mqttOptions.port}`);

client.on("connect", () => {
  console.log("[MQTT CLIENT] ✅ Conectado ao broker local");
  console.log("[MQTT CLIENT] 📋 Client ID:", client.options.clientId);
});

client.on("error", (err) => {
  console.error("[MQTT CLIENT] ❌ Erro:", err);
});

client.on("reconnect", () => {
  console.log("[MQTT CLIENT] 🔄 Reconectando ao broker...");
});

// Log de debug para TODAS as mensagens recebidas
client.on("message", (topic, message) => {
  console.log(`[MQTT CLIENT - DEBUG] 📨 Mensagem recebida diretamente no client!`);
  console.log(`[MQTT CLIENT - DEBUG] Tópico: "${topic}"`);
  console.log(`[MQTT CLIENT - DEBUG] Payload: ${message.toString()}`);
});

export default client;
