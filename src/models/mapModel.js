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
  Verde: { Amarelo: 1, Azul: 1, Roxo: 1 },
  Azul: { Verde: 1, "Azul-escuro": 1 },
  "Azul-escuro": { Azul: 1, Roxo: 1 },
  Roxo: { "Azul-escuro": 1, Lilás: 1, Verde: 1 },
  Branco: { Lilás: 1 },
};

/**
 * Dicionário de Comandos de Ação para Navegação (AGV)
 * Estrutura: { "Nó_Anterior,Nó_Atual,Nó_Próximo": "Comando_AGV" }
 * As chaves são strings concatenadas para facilitar a busca na função calcularRota.
 */
export const acoes = {
  // Ponto de decisão: Branco (Fim de linha)
  "Branco,Branco,Lilás": "reto", // Comando inicial/partida
  "Lilás,Branco,Lilás": "voltar", // Única ação possível

  // Ponto de decisão: Vermelho (Canto)
  "Laranja,Vermelho,Ciano": "esquerda",
  "Ciano,Vermelho,Laranja": "direita",
  "Laranja,Vermelho,Laranja": "voltar",
  "Ciano,Vermelho,Ciano": "voltar",

  // Ponto de decisão: Laranja (Junção T)
  "Vermelho,Laranja,Amarelo": "reto",
  "Vermelho,Laranja,Azul-acinzentado": "direita",
  "Amarelo,Laranja,Vermelho": "reto",
  "Amarelo,Laranja,Azul-acinzentado": "esquerda",
  "Azul-acinzentado,Laranja,Amarelo": "direita",
  "Azul-acinzentado,Laranja,Vermelho": "esquerda",
  "Vermelho,Laranja,Vermelho": "voltar",
  "Amarelo,Laranja,Amarelo": "voltar",
  "Azul-acinzentado,Laranja,Azul-acinzentado": "voltar",

  // Ponto de decisão: Amarelo (Junção T)
  "Laranja,Amarelo,Verde": "reto",
  "Laranja,Amarelo,Lilás": "direita",
  "Verde,Amarelo,Laranja": "reto",
  "Verde,Amarelo,Lilás": "esquerda",
  "Lilás,Amarelo,Verde": "direita",
  "Lilás,Amarelo,Laranja": "esquerda", // Estava faltando
  "Laranja,Amarelo,Laranja": "voltar",
  "Verde,Amarelo,Verde": "voltar",
  "Lilás,Amarelo,Lilás": "voltar",

  // Ponto de decisão: Verde (Junção T)
  "Amarelo,Verde,Azul": "reto",
  "Azul,Verde,Amarelo": "reto",
  "Amarelo,Verde,Amarelo": "voltar",
  "Azul,Verde,Azul": "voltar",
  "Roxo,Verde,Azul": "direita",
  "Roxo,Verde,Amarelo": "esquerda",
  "Roxo,Verde,Roxo": "voltar",
  "Azul,Verde,Roxo": "esquerda",
  "Amarelo,Verde,Roxo": "direita",

  // Ponto de decisão: Azul (Canto)
  "Verde,Azul,Azul-escuro": "direita",
  "Azul-escuro,Azul,Verde": "esquerda",
  "Verde,Azul,Verde": "voltar",
  "Azul-escuro,Azul,Azul-escuro": "voltar",

  // Ponto de decisão: Ciano (Canto / Nó de passagem)
  "Vermelho,Ciano,Azul-acinzentado": "reto", // Conforme regra especial
  "Azul-acinzentado,Ciano,Vermelho": "reto", // Conforme regra especial
  "Vermelho,Ciano,Vermelho": "voltar",
  "Azul-acinzentado,Ciano,Azul-acinzentado": "voltar",

  // Ponto de decisão: Azul-acinzentado (Junção T)
  "Ciano,Azul-acinzentado,Lilás": "reto",
  "Ciano,Azul-acinzentado,Laranja": "esquerda",
  "Lilás,Azul-acinzentado,Ciano": "reto",
  "Lilás,Azul-acinzentado,Laranja": "direita",
  "Laranja,Azul-acinzentado,Lilás": "esquerda",
  "Laranja,Azul-acinzentado,Ciano": "direita",
  "Ciano,Azul-acinzentado,Ciano": "voltar",
  "Lilás,Azul-acinzentado,Lilás": "voltar",
  "Laranja,Azul-acinzentado,Laranja": "voltar",

  // Ponto de decisão: Lilás (Cruzamento 4 vias)
  "Branco,Lilás,Amarelo": "reto",
  "Branco,Lilás,Roxo": "direita",
  "Branco,Lilás,Azul-acinzentado": "esquerda",
  "Amarelo,Lilás,Branco": "reto",
  "Amarelo,Lilás,Roxo": "esquerda",
  "Amarelo,Lilás,Azul-acinzentado": "direita",
  "Roxo,Lilás,Azul-acinzentado": "reto",
  "Roxo,Lilás,Amarelo": "direita",
  "Roxo,Lilás,Branco": "esquerda",
  "Azul-acinzentado,Lilás,Roxo": "reto",
  "Azul-acinzentado,Lilás,Amarelo": "esquerda",
  "Azul-acinzentado,Lilás,Branco": "direita",
  "Branco,Lilás,Branco": "voltar",
  "Amarelo,Lilás,Amarelo": "voltar",
  "Roxo,Lilás,Roxo": "voltar",
  "Azul-acinzentado,Lilás,Azul-acinzentado": "voltar",

  // Ponto de decisão: Roxo (Junção T)
  "Lilás,Roxo,Azul-escuro": "reto",
  "Azul-escuro,Roxo,Lilás": "reto",
  "Lilás,Roxo,Verde": "esquerda",
  "Azul-escuro,Roxo,Verde": "direita",
  "Verde,Roxo,Lilás": "direita",
  "Verde,Roxo,Azul-escuro": "esquerda",
  "Lilás,Roxo,Lilás": "voltar",
  "Azul-escuro,Roxo,Azul-escuro": "voltar",
  "Verde,Roxo,Verde": "voltar",

  // Ponto de decisão: Azul-escuro (Canto)
  "Azul,Azul-escuro,Roxo": "direita",
  "Roxo,Azul-escuro,Azul": "esquerda",
  "Azul,Azul-escuro,Azul": "voltar",
  "Roxo,Azul-escuro,Roxo": "voltar",
};
