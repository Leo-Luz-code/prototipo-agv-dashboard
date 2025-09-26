import { calcularRota } from "../services/dijkstraService";
import { publicarComandos } from "./mqttController";

export function generateRoute(req, res) {
  const { inicio, destino } = req.body;
  const rota = calcularRota(inicio, destino);
  publicarComandos(rota.comandos);
  res.json({ rota });
}
