import { grafo, acoes } from "../models/mapModel.js";

/**
 * Classe utilitária para simular o heapq do Python em JavaScript.
 * Armazena itens como [prioridade, valor] e sempre extrai o item com a menor prioridade.
 */
class PriorityQueue {
  constructor() {
    // Array para armazenar os elementos da fila de prioridade
    // Usaremos a estrutura [custo, no_atual, caminho]
    this.heap = [];
  }

  // Compara dois elementos com base em seu custo (primeiro elemento)
  _compare(i, j) {
    return this.heap[i][0] < this.heap[j][0];
  }

  // Troca dois elementos no heap
  _swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  // Move o elemento para cima, mantendo a propriedade do min-heap
  _bubbleUp(i) {
    let parent = Math.floor((i - 1) / 2);
    while (i > 0 && this._compare(i, parent)) {
      this._swap(i, parent);
      i = parent;
      parent = Math.floor((i - 1) / 2);
    }
  }

  // Move o elemento para baixo, mantendo a propriedade do min-heap
  _bubbleDown(i) {
    let minIndex = i;
    let left = 2 * i + 1;
    let right = 2 * i + 2;

    if (left < this.heap.length && this._compare(left, minIndex)) {
      minIndex = left;
    }
    if (right < this.heap.length && this._compare(right, minIndex)) {
      minIndex = right;
    }

    if (minIndex !== i) {
      this._swap(i, minIndex);
      this._bubbleDown(minIndex);
    }
  }

  /**
   * Adiciona um item à fila de prioridade.
   * @param {Array} item - Array na forma [custo, no, caminho]
   */
  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove e retorna o item com a menor prioridade (menor custo).
   * @returns {Array | null} - Array na forma [custo, no, caminho] ou null se vazio.
   */
  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this._bubbleDown(0);
    return min;
  }

  /**
   * @returns {number} - O número de elementos na fila.
   */
  get size() {
    return this.heap.length;
  }
}

/**
 * Calcula a rota mais curta entre dois pontos usando o algoritmo de Dijkstra.
 *
 * @param {string} inicio - O nó inicial.
 * @param {string} destino - O nó de destino.
 * @returns {{caminho: string[], comandos: string[]} | null} - Objeto contendo o caminho e os comandos de movimento, ou null se o destino não for alcançável.
 */
export function calcularRota(inicio, destino) {
  // Inicializa a fila de prioridade: [custo, nó_atual, caminho_percorrido]
  const fila = new PriorityQueue();
  fila.push([0, inicio, []]);

  // Conjunto de nós já visitados para evitar loops e reprocessamento
  const visitados = new Set();

  // Variáveis para armazenar o resultado final
  let custoMinimo = null;
  let caminhoMinimo = null;

  while (fila.size > 0) {
    const [custo, no_atual, caminho] = fila.pop();

    if (visitados.has(no_atual)) {
      continue;
    }

    // Adiciona o nó atual ao caminho
    const novoCaminho = caminho.concat([no_atual]);
    visitados.add(no_atual);

    // Se o nó atual é o destino, a rota foi encontrada
    if (no_atual === destino) {
      custoMinimo = custo;
      caminhoMinimo = novoCaminho;
      break; // Saída após encontrar o caminho mais curto
    }

    // Explora os vizinhos
    const vizinhos = grafo[no_atual];
    if (vizinhos) {
      for (const vizinho in vizinhos) {
        const peso = vizinhos[vizinho];
        if (!visitados.has(vizinho)) {
          fila.push([custo + peso, vizinho, novoCaminho]);
        }
      }
    }
  }

  // Se o caminho não foi encontrado, retorna nulo
  if (!caminhoMinimo) {
    return null;
  }

  // --- Geração dos Comandos de Movimento ---
  const comandos = [];

  // Para gerar a ação, precisamos de: nó_anterior, nó_atual e nó_próximo.
  // O nó anterior ao início é o próprio início.
  const caminhoCompleto = [caminhoMinimo[0]].concat(caminhoMinimo);

  for (let i = 1; i < caminhoMinimo.length; i++) {
    // nó_atual no caminho é caminhoMinimo[i]
    // nó_anterior é caminhoMinimo[i-1] (ou caminhoCompleto[i-1])
    // nó_proximo é caminhoMinimo[i+1]

    const anterior = caminhoMinimo[i - 1]; // Nó que acabou de visitar
    const atual = caminhoMinimo[i]; // Ponto de decisão
    const proximo = caminhoMinimo[i + 1]; // Próximo nó na rota

    // Se for o último nó, a ação é simplesmente "parar" ou "chegou".
    if (!proximo) {
      comandos.push("parar");
      break;
    }

    // Chave para buscar a ação no dicionário: (anterior, atual, proximo)
    const chave = `${anterior},${atual},${proximo}`;

    // Busca a ação no mapa de ações, com "reto" como padrão de segurança
    const direcao = acoes[chave] || "reto";
    comandos.push(direcao);
  }

  return {
    custo: custoMinimo,
    caminho: caminhoMinimo,
    comandos: comandos,
  };
}
