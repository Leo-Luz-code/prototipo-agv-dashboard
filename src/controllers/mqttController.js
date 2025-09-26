import { on, subscribe, publish } from "../config/mqttConfig";
import { updateStatus } from "../services/agvService";

on("connect", () => {
  subscribe("agv/status", (err) => {
    if (!err) console.log("[MQTT] Inscrito em agv/status");
  });
});

on("message", (topic, message) => {
  if (topic === "agv/status") {
    try {
      const data = JSON.parse(message.toString());
      updateStatus(data);
      console.log("[MQTT] Status recebido:", data);
    } catch (e) {
      console.error("[MQTT] Erro ao parsear mensagem:", e);
    }
  }
});

export function publicarComandos(comandos) {
  publish("agv/commands", JSON.stringify(comandos));
  console.log("[MQTT] Comandos enviados:", comandos);
}
