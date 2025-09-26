import { grafo } from "../models/mapModel";

// Exemplo simples de Dijkstra (pode ser expandido)
export function calcularRota(inicio, destino) {
  // Aqui entraria a lógica de Dijkstra
  // Para simplificar, vamos retornar um exemplo:
  return {
    caminho: [inicio, "B", "C", destino],
    comandos: ["frente", "direita", "esquerda", "frente"],
  };
}
