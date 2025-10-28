# Correção do Bug de Reset de Posição ao Ler Tag RFID

## Problema
Quando uma tag RFID era lida, o AGV voltava visualmente para a posição inicial ("Branco"), mesmo que internamente o estado estivesse correto.

## Causa
O backend estava enviando o status completo do AGV (incluindo `posicao: "Branco"`) quando uma tag RFID era lida, fazendo o frontend sincronizar a posição visual com esse valor incorreto.

## Solução Implementada

### 1. Backend - `src/config/mqttConfig.js`
- **Mudança principal**: Quando uma tag RFID é lida, agora envia um evento **separado** `agv/rfid/update` que contém APENAS:
  - Sensores RFID
  - Bateria
  - Timestamp
- **NÃO inclui** a posição do AGV
- Busca automaticamente o nome do item cadastrado para a tag

### 2. Backend - `src/controllers/routeController.js`
- Adicionada sincronização da posição no `agvService` quando uma rota é gerada
- Isso mantém o backend e frontend sincronizados

### 3. Frontend - `src/views/js/script.js`
- **Novo listener** `agv/rfid/update`: Atualiza APENAS os elementos visuais de RFID
- **NÃO chama** `setAgvPosition()` ou qualquer função que mova o AGV
- **NÃO chama** `updateDashboard()` que poderia ter efeitos colaterais
- Atualiza diretamente os elementos DOM relacionados ao RFID
- Logs detalhados para debug

## Como Testar

1. **Reinicie o servidor Node.js**:
   ```bash
   # Pare o servidor atual (Ctrl+C)
   node server.js
   ```

2. **Limpe o cache do navegador**:
   - Pressione `Ctrl+Shift+R` (ou `Cmd+Shift+R` no Mac)
   - Ou abra o DevTools (F12) > Console e digite:
     ```javascript
     location.reload(true);
     ```

3. **Teste o fluxo**:
   - Mande o AGV se mover para um destino (ex: Branco → Vermelho)
   - Durante ou após o movimento, aproxime uma tag RFID do leitor
   - **Resultado esperado**:
     - A tag é detectada e mostrada na interface
     - O AGV **NÃO volta** para a posição inicial
     - O AGV permanece na posição correta

4. **Verifique os logs no console do navegador**:
   - Você deve ver: `[Socket.IO] 📡 Update de RFID recebido (NÃO afeta posição)`
   - Você deve ver: `[Socket.IO] ⚠️ IMPORTANTE: Posição do AGV NÃO foi alterada!`
   - Você **NÃO deve ver** sincronização de posição para "Branco"

## Arquivos Modificados

1. `src/config/mqttConfig.js` (linhas 1-3, 25-63)
2. `src/controllers/routeController.js` (linhas 1-3, 50-52)
3. `src/views/js/script.js` (linhas 47-148)

## Fluxo Correto Agora

```
1. Raspberry Pi Pico W detecta tag RFID
2. Envia para tópico MQTT "agv/rfid"
3. Backend (mqttConfig.js) recebe e:
   a. Busca nome do item no banco de dados
   b. Atualiza APENAS sensores no agvService
   c. Envia evento Socket.IO "agv/rfid/update" (SEM posição)
4. Frontend recebe "agv/rfid/update" e:
   a. Atualiza display da tag
   b. Atualiza nome do item
   c. Atualiza badge de carga
   d. NÃO toca na posição visual do AGV
```

## Notas Importantes

- A posição do AGV só é sincronizada quando o evento `agv/status` é recebido E o AGV não está em movimento
- O evento `agv/rfid/update` é completamente isolado e não afeta a posição
- O backend agora mantém a posição sincronizada quando rotas são calculadas
