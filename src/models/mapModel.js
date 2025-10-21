// Arquivo: mapModel.js

/**
 * Grafo de Conexões do Ambiente (Mapa)
 * Estrutura: { Nó_Atual: { Vizinho_1: Peso, Vizinho_2: Peso, ... } }
 */
export const grafo = {
  Vermelho: { Laranja: 1, Ciano: 1 },
  Laranja: { Vermelho: 1, Amarelo: 1, "Azul-acinzentado": 1 },
  Amarelo: { Laranja: 1, Verde: 1, Lilás: 1 },
  Ciano: { Vermelho: 1, "Azul-acinzentado": 1 },
  "Azul-acinzentado": { Ciano: 1, Laranja: 1, Lilás: 1 },
  Lilás: { Amarelo: 1, "Azul-acinzentado": 1, Roxo: 1, Branco: 1 },
  Verde: { Amarelo: 1, Azul: 1 },
  Azul: { Verde: 1, "Azul-escuro": 1 },
  "Azul-escuro": { Azul: 1, Roxo: 1 },
  Roxo: { "Azul-escuro": 1, Lilás: 1 },
  Branco: { Lilás: 1 },
};

/**
 * Dicionário de Comandos de Ação para Navegação (AGV)
 * Estrutura: { "Nó_Anterior,Nó_Atual,Nó_Próximo": "Comando_AGV" }
 * As chaves são strings concatenadas para facilitar a busca na função calcularRota.
 */
export const acoes = {
  // Ponto de decisão: Branco
  "Branco,Branco,Lilás": "reto",
  "Lilás,Branco,Lilás": "voltar", // Se o AGV tivesse que voltar para o início após um movimento

  // Ponto de decisão: Lilás
  "Branco,Lilás,Amarelo": "reto",
  "Branco,Lilás,Roxo": "direita",
  "Branco,Lilás,Azul-acinzentado": "esquerda",
  "Amarelo,Lilás,Roxo": "esquerda",
  "Amarelo,Lilás,Azul-acinzentado": "direita",
  "Amarelo,Lilás,Branco": "reto",
  "Roxo,Lilás,Azul-acinzentado": "reto",
  "Roxo,Lilás,Amarelo": "direita",
  "Roxo,Lilás,Branco": "esquerda",
  "Azul-acinzentado,Lilás,Roxo": "reto",
  "Azul-acinzentado,Lilás,Amarelo": "esquerda",
  "Azul-acinzentado,Lilás,Branco": "direita",

  // Ponto de decisão: Amarelo
  "Laranja,Amarelo,Verde": "reto",
  "Laranja,Amarelo,Lilás": "direita",
  "Verde,Amarelo,Laranja": "reto",
  "Verde,Amarelo,Lilás": "esquerda",
  "Lilás,Amarelo,Verde": "direita",
  "Lilás,Amarelo,Laranja": "esquerda", // Adicionado para cobrir a volta

  // Ponto de decisão: Verde
  "Amarelo,Verde,Azul": "reto",
  // 'Amarelo,Verde,Roxo': 'direita', // Roxo não é vizinho direto de Verde no grafo

  // Ponto de decisão: Laranja
  "Vermelho,Laranja,Amarelo": "reto",
  "Vermelho,Laranja,Azul-acinzentado": "direita",
  "Amarelo,Laranja,Vermelho": "reto",
  "Amarelo,Laranja,Azul-acinzentado": "esquerda",
  "Azul-acinzentado,Laranja,Amarelo": "direita",
  "Azul-acinzentado,Laranja,Vermelho": "esquerda",

  // Ponto de decisão: Azul-acinzentado
  "Ciano,Azul-acinzentado,Lilás": "reto",
  "Ciano,Azul-acinzentado,Laranja": "esquerda",
  "Lilás,Azul-acinzentado,Ciano": "reto",
  "Lilás,Azul-acinzentado,Laranja": "direita",
  "Laranja,Azul-acinzentado,Lilás": "esquerda", // Adicionado
  "Laranja,Azul-acinzentado,Ciano": "direita", // Adicionado

  // Ponto de decisão: Vermelho (canto)
  "Laranja,Vermelho,Ciano": "esquerda",
  "Ciano,Vermelho,Laranja": "direita",

  // Ponto de decisão: Roxo
  "Lilás,Roxo,Azul-escuro": "reto",
  "Azul-escuro,Roxo,Lilás": "reto",

  // Movimentos em linha reta (nós com apenas 2 conexões)
  "Vermelho,Ciano,Azul-acinzentado": "reto", // Alterado de 'esquerda' para 'reto' (nó de passagem)
  "Azul-acinzentado,Ciano,Vermelho": "reto", // Alterado de 'direita' para 'reto' (nó de passagem)
  "Amarelo,Verde,Azul": "reto",
  "Azul,Verde,Amarelo": "reto",
  "Verde,Azul,Azul-escuro": "direita",
  "Azul-escuro,Azul,Verde": "esquerda",
  "Azul,Azul-escuro,Roxo": "direita",
  "Roxo,Azul-escuro,Azul": "esquerda",

  // Ponto de destino: Branco (saída única)
  "Lilás,Branco,Lilás": "reto", // Para a ação 'parar' antes de voltar
};
