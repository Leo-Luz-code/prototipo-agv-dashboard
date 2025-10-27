import { connect } from "mqtt";
import { updateStatus, getStatusFromAGV } from "../services/agvService.js";

const mqttOptions = {
  host: "localhost",
  port: 1883,
};

// Aguarda 500ms para garantir que o broker inicializou
await new Promise(resolve => setTimeout(resolve, 500));

const client = connect(`mqtt://${mqttOptions.host}:${mqttOptions.port}`);

// REGISTRAR LISTENER IMEDIATAMENTE AQUI
client.on("message", (topic, message) => {
  const raw = message.toString();
  console.log(`[MQTT CONFIG] 📩 MENSAGEM RECEBIDA!`);
  console.log(`[MQTT CONFIG] Tópico: "${topic}"`);
  console.log(`[MQTT CONFIG] Payload: ${raw}`);

  try {
    const data = JSON.parse(raw);

    // Handler para leituras RFID
    if (topic === "agv/rfid") {
      console.log(`[MQTT CONFIG] 🏷️ RFID DETECTADO: ${data.tag}`);

      // Atualiza o status
      updateStatus({
        sensores: {
          rfid: data.tag,
          rfidTimestamp: data.timestamp || Date.now()
        }
      });

      const fullStatus = getStatusFromAGV();
      console.log(`[MQTT CONFIG] 📡 Status:`, fullStatus);

      // Importa dinamicamente para evitar circular dependency
      import("../services/socketService.js").then(({ broadcast }) => {
        broadcast("agv/status", fullStatus);
        console.log(`[MQTT CONFIG] ✅ Tag transmitida!`);
      });
    }

    // Handler para status geral do AGV
    if (topic === "agv/status") {
      updateStatus(data);
      const fullStatus = getStatusFromAGV();

      import("../services/socketService.js").then(({ broadcast }) => {
        broadcast("agv/status", fullStatus);
      });
    }

  } catch (e) {
    console.error("[MQTT CONFIG] ❌ Erro:", e);
  }
});

client.on("connect", () => {
  console.log("[MQTT CLIENT] ✅ Conectado ao broker local");

  // Subscrever aos tópicos
  client.subscribe(["agv/status", "agv/rfid"], { qos: 1 }, (err, granted) => {
    if (err) {
      console.error("[MQTT CLIENT] ❌ Erro ao subscrever:", err);
    } else {
      console.log("[MQTT CLIENT] ✅ INSCRITO nos tópicos:");
      granted.forEach(g => console.log(`   - ${g.topic} (QoS ${g.qos})`));
    }
  });
});

client.on("error", (err) => {
  console.error("[MQTT CLIENT] ❌ Erro:", err);
});

client.on("reconnect", () => {
  console.log("[MQTT CLIENT] 🔄 Reconectando...");
});

export default client;
