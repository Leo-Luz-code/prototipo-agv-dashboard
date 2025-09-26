import heapq

def dijkstra(grafo, inicio, destino):
    fila = [(0, inicio, [])]
    visitados = set()

    while fila:
        (custo, no_atual, caminho) = heapq.heappop(fila)
        if no_atual in visitados:
            continue
        caminho = caminho + [no_atual]
        visitados.add(no_atual)
        if no_atual == destino:
            return (custo, caminho)
        for vizinho, peso in grafo[no_atual].items():
            if vizinho not in visitados:
                heapq.heappush(fila, (custo + peso, vizinho, caminho))
    return None

grafo = {
    'Vermelho': {'Laranja': 1, 'Ciano': 1},
    'Laranja': {'Vermelho': 1, 'Amarelo': 1, 'Azul-acinzentado': 1},
    'Amarelo': {'Laranja': 1, 'Verde': 1, 'Lilás': 1},
    'Ciano': {'Vermelho': 1, 'Azul-acinzentado': 1},
    'Azul-acinzentado': {'Ciano': 1, 'Laranja': 1, 'Lilás': 1},
    'Lilás': {'Amarelo': 1, 'Azul-acinzentado': 1, 'Roxo': 50, 'Branco': 1},
    'Verde': {'Amarelo': 1, 'Azul': 1},
    'Azul': {'Verde': 1, 'Azul-escuro': 1},
    'Azul-escuro': {'Azul': 1, 'Roxo': 1},
    'Roxo': {'Azul-escuro': 1, 'Lilás': 50},
    'Branco': {'Lilás': 1}
}

# Caminho mais curto
custo, caminho = dijkstra(grafo, 'Branco', 'Roxo')
print(f"Custo: {custo}, Caminho: {caminho}")

# Dicionário de direções pré-definidas
acoes = {
    # Ponto de decisão: Branco (início de um caminho)
    ('Branco', 'Branco', 'Lilás'): 'reto',
    ('Lilás', 'Branco', 'Lilás'): 'voltar',
        
    # Ponto de decisão: Lilás
    ('Branco', 'Lilás', 'Amarelo'): 'reto',
    ('Branco', 'Lilás', 'Roxo'): 'direita',
    ('Branco', 'Lilás', 'Azul-acinzentado'): 'esquerda',
    ('Amarelo', 'Lilás', 'Roxo'): 'esquerda',
    ('Amarelo', 'Lilás', 'Azul-acinzentado'): 'direita',
    ('Amarelo', 'Lilás', 'Branco'): 'reto',
    ('Roxo', 'Lilás', 'Azul-acinzentado'): 'reto',
    ('Roxo', 'Lilás', 'Amarelo'): 'direita',
    ('Roxo', 'Lilás', 'Branco'): 'esquerda', # Relativo ao caminho Roxo->Lilás
    ('Azul-acinzentado', 'Lilás', 'Roxo'): 'reto',
    ('Azul-acinzentado', 'Lilás', 'Amarelo'): 'esquerda',
    ('Azul-acinzentado', 'Lilás', 'Branco'): 'direita',

    # Ponto de decisão: Amarelo
    ('Laranja', 'Amarelo', 'Verde'): 'reto',
    ('Laranja', 'Amarelo', 'Lilás'): 'direita',
    ('Verde', 'Amarelo', 'Laranja'): 'reto',
    ('Verde', 'Amarelo', 'Lilás'): 'esquerda',
    ('Lilás', 'Amarelo', 'Verde'): 'direita',

    #Ponto de decisão: Verde
    ('Amarelo', 'Verde', 'Azul'): 'reto',
    ('Amarelo', 'Verde', 'Roxo'): 'direita',


    # Ponto de decisão: Laranja
    ('Vermelho', 'Laranja', 'Amarelo'): 'reto',
    ('Vermelho', 'Laranja', 'Azul-acinzentado'): 'direita',
    ('Amarelo', 'Laranja', 'Vermelho'): 'reto',
    ('Amarelo', 'Laranja', 'Azul-acinzentado'): 'esquerda',
    ('Azul-acinzentado', 'Laranja', 'Amarelo'): 'direita',
    ('Azul-acinzentado', 'Laranja', 'Vermelho'): 'esquerda',

    # Ponto de decisão: Azul-acinzentado
    ('Ciano', 'Azul-acinzentado', 'Lilás'): 'reto',
    ('Ciano', 'Azul-acinzentado', 'Laranja'): 'esquerda',
    ('Lilás', 'Azul-acinzentado', 'Ciano'): 'reto',
    ('Lilás', 'Azul-acinzentado', 'Laranja'): 'direita',

    # Ponto de decisão: Vermelho (canto)
    ('Laranja', 'Vermelho', 'Ciano'): 'esquerda',
    ('Ciano', 'Vermelho', 'Laranja'): 'direita',
    
    # Ponto de decisão: Roxo
    ('Lilás', 'Roxo', 'Azul-escuro'): 'reto',
    ('Azul-escuro', 'Roxo', 'Lilás'): 'reto',

    # Movimentos em linha reta (nós com apenas 2 conexões)
    ('Vermelho', 'Ciano', 'Azul-acinzentado'): 'esquerda',
    ('Azul-acinzentado', 'Ciano', 'Vermelho'): 'direita',
    ('Amarelo', 'Verde', 'Azul'): 'reto',
    ('Azul', 'Verde', 'Amarelo'): 'reto',
    ('Verde', 'Azul', 'Azul-escuro'): 'direita',
    ('Azul-escuro', 'Azul', 'Verde'): 'esquerda',
    ('Azul', 'Azul-escuro', 'Roxo'): 'direita',
    ('Roxo', 'Azul-escuro', 'Azul'): 'esquerda',
}

caminho_completo = [caminho[0]] + caminho 

# Geração dos movimentos
movimentos = []
for i in range(1, len(caminho_completo)-1):
    anterior = caminho_completo[i-1]
    atual = caminho_completo[i]
    proximo = caminho_completo[i+1]

    direcao = acoes.get((anterior, atual, proximo), 'reto')  # padrão reto
    movimentos.append((anterior, atual, proximo, direcao))

# Impressão no formato C
print("\nMovimento movimentos[] = {")
for (ant, at, prox, direcao) in movimentos:
    print(f'    {{"{ant}", "{at}", "{prox}", "{direcao}"}},')
print("};")
