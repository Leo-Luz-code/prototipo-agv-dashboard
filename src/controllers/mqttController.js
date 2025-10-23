import client from "../config/mqttConfig.js";
import { updateStatus } from "../services/agvService.js";

client.on("connect", () => {
  client.subscribe("agv/status", (err) => {
    if (!err) console.log("[MQTT] Inscrito em agv/status");
  });
});

client.on("message", (topic, message) => {
  if (topic === "agv/status") {
    const raw = message.toString();

    try {
      const data = JSON.parse(raw);
      updateStatus(data);

      const fullStatus = getStatusFromAGV();
      broadcast("agv/status", fullStatus);

      console.log("[MQTT] Status recebido e transmitido:", fullStatus);
    } catch (e) {
      console.error("[MQTT] Erro ao parsear mensagem:", e);
    }
  }
});

export function publicarRota(rota) {
  client.publish("agv/commands", JSON.stringify(rota));
  console.log("[MQTT] rota enviada:", rota);
}
