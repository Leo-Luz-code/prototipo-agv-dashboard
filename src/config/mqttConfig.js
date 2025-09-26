import { connect } from "mqtt";

const mqttOptions = {
  host: "localhost", // ou IP do broker
  port: 1883,
};

const client = connect(`mqtt://${mqttOptions.host}:${mqttOptions.port}`);

client.on("connect", () => {
  console.log("[MQTT] Conectado ao broker");
});

client.on("error", (err) => {
  console.error("[MQTT] Erro:", err);
});

export default client;
