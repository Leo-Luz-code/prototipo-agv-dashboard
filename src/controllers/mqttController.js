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
      console.log("[MQTT] Status recebido:", data);
    } catch (e) {
      console.error("[MQTT] Erro ao parsear mensagem:", e);
    }
  }
});

export function publicarComandos(comandos) {
  client.publish("agv/commands", JSON.stringify(comandos));
  console.log("[MQTT] Comandos enviados:", comandos);
}
