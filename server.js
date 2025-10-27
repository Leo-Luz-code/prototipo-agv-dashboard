import express, { json } from "express";
import { createServer } from "http";
import { join } from "path";
import { Server } from "socket.io";

import { appConfig } from "./src/config/serverConfig.js";
import router from "./src/routes/index.js";
import { initSocketService } from "./src/services/socketService.js";

// 🆕 Inicia o broker MQTT embutido (substitui o Mosquitto)
import "./src/config/mqttBroker.js";

// inicia MQTT listener (cliente que se conecta ao broker)
import "./src/controllers/mqttController.js";

const app = express();
const httpServer = createServer(app); // Cria o server http

// Anexa o socket.io ao servidor HTTP
const io = new Server(httpServer, {
  /* opções, se necessário */
});

// Passa a instância 'io' para o serviço (para poder ser usada em outros arquivos)
initSocketService(io);

app.use(json());
app.use("/api", router);

// serve arquivos estáticos (HTML, CSS, JS)
app.use(express.static(join("src/views")));

httpServer.listen(appConfig.port, () => {
  console.log(`[SERVER] Rodando na porta ${appConfig.port}`);
  console.log(`[SERVER] Acesse: http://localhost:${appConfig.port}`);
});
