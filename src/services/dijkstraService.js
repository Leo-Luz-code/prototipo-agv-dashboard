import { acoes, grafo } from "../models/mapModel.js";

/**
 * Classe utilitária para simular o heapq do Python em JavaScript.
 * Armazena itens como [prioridade, valor] e sempre extrai o item com o menor prioridade.
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
 * Calcula a rota mais curta entre dois pontos usando o algoritmo de Dijkstra,
 * considerando a posição anterior real do robô para o primeiro comando.
 *
 * @param {string} noAnteriorReal - O nó *real* onde o robô estava ANTES do 'inicio'.
 * @param {string} inicio - O nó atual (onde o robô está).
 * @param {string} destino - O nó de destino.
 * @returns {{custo: number, caminho: string[], comandos: string[]} | null} - Objeto contendo o caminho e os comandos de movimento, ou null se o destino não for alcançável.
 */
export function calcularRota(noAnteriorReal, inicio, destino) {
  // Inicializa a fila de prioridade: [custo, nó_atual, caminho_percorrido]
  const fila = new PriorityQueue();
  // O caminho_percorrido aqui armazena o caminho até o no_atual, *excluindo* o no_atual por enquanto.
  fila.push([0, inicio, []]);

  // Mapa para armazenar o custo mínimo encontrado até um nó
  const custos = new Map();
  custos.set(inicio, 0);

  // Mapa para rastrear o caminho mais curto (nó anterior)
  const pais = new Map();

  let destinoAlcancado = false;

  while (fila.size > 0) {
    const [custo, no_atual, caminho] = fila.pop();

    if (custo > (custos.get(no_atual) ?? Infinity)) {
      continue;
    }

    // Se o nó atual é o destino, a rota foi encontrada
    if (no_atual === destino) {
      destinoAlcancado = true;
      break; // Saída após encontrar o caminho mais curto
    }

    // Explora os vizinhos
    const vizinhos = grafo[no_atual];
    if (vizinhos) {
      for (const vizinho in vizinhos) {
        const peso = vizinhos[vizinho];
        const novoCusto = custo + peso;

        if (novoCusto < (custos.get(vizinho) ?? Infinity)) {
          custos.set(vizinho, novoCusto);
          pais.set(vizinho, no_atual);
          fila.push([novoCusto, vizinho, null]); // O caminho é reconstruído no final
        }
      }
    }
  }

  // --- Reconstrução do Caminho ---
  if (!destinoAlcancado) {
    return null;
  }

  const caminhoMinimo = [];
  let no = destino;
  while (no !== undefined) {
    caminhoMinimo.unshift(no); // Adiciona no início do array
    no = pais.get(no);
  }

  // O custo mínimo é o custo final no mapa
  const custoMinimo = custos.get(destino);

  // --- Geração dos Comandos de Movimento (Correção da Lógica) ---
  const comandos = [];

  // A lógica original usava [caminhoMinimo[0]] (o nó de início) como o "anterior" fictício.
  // Agora, usaremos o 'noAnteriorReal' que foi passado para a função.
  const caminhoComDecisoes = [noAnteriorReal].concat(caminhoMinimo);

  // Percorre os nós de decisão (começa no primeiro nó real de partida)
  // O loop vai até o penúltimo elemento de caminhoComDecisoes, que é o último nó de decisão.
  for (let i = 1; i < caminhoComDecisoes.length - 1; i++) {
    const anterior = caminhoComDecisoes[i - 1];
    const atual = caminhoComDecisoes[i];
    const proximo = caminhoComDecisoes[i + 1];

    // Chave para buscar a ação no dicionário: (anterior, atual, proximo)
    const chave = `${anterior},${atual},${proximo}`;

    console.log(chave); // Mantido seu log

    // Busca a ação no mapa de ações, com "reto" como padrão de segurança (ou um erro)
    const direcao = acoes[chave] || "reto"; // O padrão 'reto' pode mascarar um erro de mapeamento
    comandos.push(direcao);
  }

  // Adiciona o comando final de parada
  comandos.push("parar");

  return {
    custo: custoMinimo,
    caminho: caminhoMinimo,
    comandos: comandos,
  };
}

// O restante do código do DOM (document.addEventListener...) permanece inalterado.
// ...
