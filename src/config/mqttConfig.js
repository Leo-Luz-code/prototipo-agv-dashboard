import { connect } from "mqtt";
import { updateStatus, getStatusFromAGV } from "../services/agvService.js";
import { getTagInfo } from "../services/rfidService.js";

const mqttOptions = {
  host: "localhost",
  port: 1883,
};

// Aguarda 500ms para garantir que o broker inicializou
await new Promise((resolve) => setTimeout(resolve, 500));

const client = connect(`mqtt://${mqttOptions.host}:${mqttOptions.port}`);

// REGISTRAR LISTENER IMEDIATAMENTE AQUI
client.on("message", (topic, message) => {
  const raw = message.toString();
  console.log(`\n========================================`);
  console.log(`[MQTT CONFIG] 📩 MENSAGEM RECEBIDA!`);
  console.log(`[MQTT CONFIG] Tópico: "${topic}"`);
  console.log(`[MQTT CONFIG] Payload: ${raw}`);
  console.log(`========================================\n`);

  try {
    const data = JSON.parse(raw);
    console.log(`[MQTT CONFIG] ✅ JSON parseado com sucesso`);
    console.log(`[MQTT CONFIG] 🔍 Verificando handlers para tópico: "${topic}"`);

    // Handler para leituras RFID
    if (topic === "agv/rfid") {
      console.log(`[MQTT CONFIG] 🏷️ RFID DETECTADO: ${data.tag}`);

      // Busca informações da tag no banco de dados
      const tagInfo = getTagInfo(data.tag);
      const itemName = tagInfo ? tagInfo.name : null;

      if (itemName) {
        console.log(`[MQTT CONFIG] 📦 Item identificado: ${itemName}`);
      } else {
        console.log(`[MQTT CONFIG] ⚠️ Tag não cadastrada no sistema`);
      }

      // Atualiza APENAS os sensores, sem afetar a posição
      updateStatus({
        sensores: {
          rfid: data.tag,
          rfidItemName: itemName,
          rfidTimestamp: data.timestamp || Date.now(),
        },
      });

      // Envia apenas os dados dos sensores, não todo o status
      // Isso evita que a posição seja resetada no frontend
      const fullStatus = getStatusFromAGV();
      const rfidUpdate = {
        sensores: fullStatus.sensores,
        bateria: fullStatus.bateria,
        ultimaAtualizacao: fullStatus.ultimaAtualizacao,
      };
      console.log(`[MQTT CONFIG] 📡 Enviando update de RFID:`, rfidUpdate);

      // Importa dinamicamente para evitar circular dependency
      import("../services/socketService.js").then(({ broadcast }) => {
        broadcast("agv/rfid/update", rfidUpdate);
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

    // Handler para dados de distância dos sensores VL53L0X
    if (topic === "agv/distance") {
      console.log(`[MQTT CONFIG] 📏 DISTÂNCIA RECEBIDA:`, data);
      console.log(`[MQTT CONFIG]   Raw data:`, JSON.stringify(data));
      console.log(
        `[MQTT CONFIG]   Left (${typeof data.left}): ${data.left} cm`
      );
      console.log(
        `[MQTT CONFIG]   Center (${typeof data.center}): ${data.center} cm`
      );
      console.log(
        `[MQTT CONFIG]   Right (${typeof data.right}): ${data.right} cm`
      );

      // Converte explicitamente para números e garante valores válidos
      const esquerda = parseFloat(data.left) || 0;
      const centro = parseFloat(data.center) || 0;
      const direita = parseFloat(data.right) || 0;

      console.log(
        `[MQTT CONFIG]   Convertidos - Esq: ${esquerda} | Centro: ${centro} | Dir: ${direita}`
      );

      // Atualiza os dados de distância no estado
      updateStatus({
        sensores: {
          distancia: {
            esquerda: esquerda,
            centro: centro,
            direita: direita,
            timestamp: data.timestamp || Date.now(),
            unidade: data.unit || "cm",
          },
        },
      });

      // Envia dados de distância para o frontend
      const fullStatus = getStatusFromAGV();
      const distanceData = {
        distancia: fullStatus.sensores.distancia,
        ultimaAtualizacao: fullStatus.ultimaAtualizacao,
      };

      console.log(
        `[MQTT CONFIG] 📡 Enviando para frontend:`,
        JSON.stringify(distanceData)
      );

      import("../services/socketService.js").then(({ broadcast }) => {
        broadcast("agv/distance", distanceData);
        console.log(
          `[MQTT CONFIG] ✅ Dados de distância transmitidos via Socket.IO!`
        );
      });
    }

    // Handler para dados do sensor de cor GY-33
    if (topic === "agv/color") {
      console.log(`\n🎨🎨🎨 [MQTT CONFIG] HANDLER DE COR ATIVADO! 🎨🎨🎨`);
      console.log(`[MQTT CONFIG] 🎨 COR RECEBIDA:`, data);
      console.log(`[MQTT CONFIG]   Raw data:`, JSON.stringify(data));
      console.log(`[MQTT CONFIG]   Color: ${data.color}`);
      console.log(`[MQTT CONFIG]   Timestamp: ${data.timestamp}`);

      // Envia dados de cor diretamente para o frontend
      console.log(`[MQTT CONFIG] 📤 Enviando para Socket.IO...`);
      import("../services/socketService.js").then(({ broadcast }) => {
        console.log(`[MQTT CONFIG] 🔊 Chamando broadcast('agv/color', ...)...`);
        broadcast("agv/color", data);
        console.log(`[MQTT CONFIG] ✅ Dados de cor transmitidos via Socket.IO!`);
      }).catch((err) => {
        console.error(`[MQTT CONFIG] ❌ ERRO ao importar socketService:`, err);
      });

      console.log(`🎨🎨🎨 [MQTT CONFIG] HANDLER DE COR FINALIZADO! 🎨🎨🎨\n`);
    }

    // Log se nenhum handler foi executado
    if (topic !== "agv/rfid" && topic !== "agv/status" && topic !== "agv/distance" && topic !== "agv/color" && topic !== "agv/imu") {
      console.warn(`[MQTT CONFIG] ⚠️ TÓPICO NÃO RECONHECIDO: "${topic}"`);
      console.warn(`[MQTT CONFIG] Handlers disponíveis: agv/rfid, agv/status, agv/distance, agv/color, agv/imu`);
    }
  } catch (e) {
    console.error("[MQTT CONFIG] ❌ Erro ao processar mensagem:", e);
    console.error("[MQTT CONFIG] Tópico:", topic);
    console.error("[MQTT CONFIG] Raw:", raw);
  }
});

client.on("connect", () => {
  console.log("[MQTT CLIENT] ✅ Conectado ao broker local");

  // Subscrever aos tópicos
  client.subscribe(
    ["agv/status", "agv/rfid", "agv/distance", "agv/color", "agv/imu"],
    { qos: 1 },
    (err, granted) => {
      if (err) {
        console.error("[MQTT CLIENT] ❌ Erro ao subscrever:", err);
      } else {
        console.log("[MQTT CLIENT] ✅ INSCRITO nos tópicos:");
        granted.forEach((g) => console.log(`   - ${g.topic} (QoS ${g.qos})`));
      }
    }
  );
});

client.on("error", (err) => {
  console.error("[MQTT CLIENT] ❌ Erro:", err);
});

client.on("reconnect", () => {
  console.log("[MQTT CLIENT] 🔄 Reconectando...");
});

export default client;
