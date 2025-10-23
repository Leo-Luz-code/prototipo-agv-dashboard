import { calcularRota } from "../services/dijkstraService.js";
import { publicarComandos } from "./mqttController.js";

// --- Estado do Robô ---
// O robô sempre começa em "Branco".
// Para a primeira execução (Branco, Branco, Próximo),
// o anterior e o atual são "Branco".
let noAtual = "Branco";
let noAnterior = "Branco";
// Não precisamos mais do routeCounter

export function generateRoute(req, res) {
  // Confiamos no nosso estado interno. O 'inicio' da rota é sempre o 'noAtual'.
  const { destino } = req.body;

  // Se o cliente enviar um 'inicio', podemos usá-lo para verificar se há dessincronização
  const { inicio } = req.body;
  if (inicio && inicio !== noAtual) {
    console.warn(
      `Alerta de dessincronização: Cliente acha que está em '${inicio}', mas servidor diz '${noAtual}'. Confiando no servidor.`
    );
    // Poderíamos também resetar o estado:
    // noAtual = inicio;
    // noAnterior = inicio;
  }

  // 1. Calcula a rota usando o estado ATUAL
  const rota = calcularRota(noAnterior, noAtual, destino);

  if (!rota || !rota.caminho || rota.caminho.length === 0) {
    return res.status(404).json({ error: "Rota não encontrada ou inválida." });
  }

  // 2. Publica os comandos
  publicarComandos(rota.comandos);

  // 3. Atualiza o estado do servidor para a PRÓXIMA requisição
  // O novo 'noAtual' é o último item do caminho (o destino).
  // O novo 'noAnterior' é o penúltimo item do caminho.
  const caminho = rota.caminho;

  // Só atualiza se o robô realmente se moveu
  if (caminho.length > 1) {
    // O novo 'atual' é o fim do caminho
    noAtual = caminho[caminho.length - 1];
    // O novo 'anterior' é o penúltimo nó
    noAnterior = caminho[caminho.length - 2];
  }
  // Se caminho.length <= 1, significa que o destino era o próprio início,
  // então o estado (noAtual e noAnterior) não muda.

  // 4. Retorna a rota
  res.json({ rota });
}
