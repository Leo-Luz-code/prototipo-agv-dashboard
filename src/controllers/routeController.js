import { calcularRota } from "../services/dijkstraService.js";
import { publicarComandos } from "./mqttController.js";

export function generateRoute(req, res) {
  const { inicio, destino } = req.body;
  const rota = calcularRota(inicio, destino);
  publicarComandos(rota.comandos);
  res.json({ rota });
}
