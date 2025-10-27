import client from "../config/mqttConfig.js";
import { updateStatus, getStatusFromAGV } from "../services/agvService.js";
import { broadcast } from "../services/socketService.js";

console.log("[MQTT CONTROLLER] 🚀 Inicializando controller...");
console.log("[MQTT CONTROLLER] 📋 Cliente importado:", !!client);

client.on("connect", () => {
  console.log("[MQTT] Conectado ao broker!");
  console.log("[MQTT] 🔑 Client ID:", client.options.clientId);

  // Inscrever em agv/status
  client.subscribe("agv/status", (err) => {
    if (err) {
      console.error("[MQTT] ❌ Erro ao subscrever agv/status:", err);
    } else {
      console.log("[MQTT] ✅ Inscrito em agv/status");
    }
  });

  // 🆕 Inscrever em agv/rfid (para o leitor RFID)
  client.subscribe("agv/rfid", (err) => {
    if (err) {
      console.error("[MQTT] ❌ Erro ao subscrever agv/rfid:", err);
    } else {
      console.log("[MQTT] ✅ Inscrito em agv/rfid");
    }
  });
});

client.on("message", (topic, message) => {
  const raw = message.toString();
  console.log(`[MQTT] 📩 Mensagem recebida no tópico "${topic}": ${raw}`);

  try {
    const data = JSON.parse(raw);

    // Handler para status geral do AGV
    if (topic === "agv/status") {
      updateStatus(data);
      const fullStatus = getStatusFromAGV();
      broadcast("agv/status", fullStatus);
      console.log("[MQTT] Status recebido e transmitido:", fullStatus);
    }

    // 🆕 Handler para leituras RFID
    if (topic === "agv/rfid") {
      console.log(`[MQTT] 🏷️  RFID DETECTADO: ${data.tag}`);

      // Atualiza o status com a tag RFID lida
      updateStatus({
        sensores: {
          rfid: data.tag,
          rfidTimestamp: data.timestamp || Date.now()
        }
      });

      // Transmite para todos os clientes conectados via WebSocket
      const fullStatus = getStatusFromAGV();
      console.log(`[MQTT] 📡 Status completo a ser transmitido:`, fullStatus);
      broadcast("agv/status", fullStatus);

      console.log(`[MQTT] ✅ Tag "${data.tag}" transmitida para dashboard`);
    }

  } catch (e) {
    console.error("[MQTT] ❌ Erro ao parsear mensagem:", e);
    console.error("[MQTT] Mensagem raw:", raw);
  }
});

export function publicarRota(rota) {
  client.publish("agv/commands", JSON.stringify(rota));
  console.log("[MQTT] rota enviada:", rota);
}
