import express, { json } from "express";
import { join } from "path";
import routes from "./src/routes/index";
import { appConfig } from "./src/config/serverConfig";
import "./src/controllers/mqttController"; // inicia MQTT listener

const app = express();

app.use(json());
app.use("/api", routes);

// serve arquivos estáticos (HTML, CSS, JS)
app.use(express.static(join(__dirname, "src/views")));

app.listen(appConfig.port, () => {
  console.log(`[SERVER] Rodando na porta ${appConfig.port}`);
  console.log(`[SERVER] Acesse: http://localhost:${appConfig.port}`);
});
