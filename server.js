import express, { json } from "express";
import { join } from "path";

import { appConfig } from "./src/config/serverConfig.js";
import router from "./src/routes/index.js";

import "./src/controllers/mqttController.js";

// inicia MQTT listener

const app = express();

app.use(json());
app.use("/api", router);

// serve arquivos estáticos (HTML, CSS, JS)
app.use(express.static(join("src/views")));

app.listen(appConfig.port, () => {
  console.log(`[SERVER] Rodando na porta ${appConfig.port}`);
  console.log(`[SERVER] Acesse: http://localhost:${appConfig.port}`);
});
