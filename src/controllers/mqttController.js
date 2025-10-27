import client from "../config/mqttConfig.js";

// O listener de mensagens agora está em mqttConfig.js
// Este arquivo apenas exporta a função de publicar rota

export function publicarRota(rota) {
  client.publish("agv/commands", JSON.stringify(rota));
  console.log("[MQTT] Rota enviada:", rota);
}
