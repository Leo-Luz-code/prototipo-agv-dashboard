document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURAÇÃO E REFERÊNCIAS ---
  const socket = io();
  const svg = document.getElementById("map-svg");
  const agvElement = document.getElementById("agv");
  const statusElement = document.getElementById("agv-status");
  const batteryLevelElement = document.getElementById("battery-level");
  const batteryPercentageElement =
    document.getElementById("battery-percentage");
  const rfidDataElement = document.getElementById("rfid-data");

  // Novas referências de controle
  const selectInicio = document.getElementById("select-inicio");
  const selectDestino = document.getElementById("select-destino");
  const btnStartPause = document.getElementById("btn-start-pause");
  const btnReturn = document.getElementById("btn-return");
  const btnEmergencyStop = document.getElementById("btn-emergency-stop");

  // Ouve pelo evento 'agv/status' que o backend está transmitindo
  socket.on("agv/status", (status) => {
    console.log("[Socket.IO] Status recebido:", status);

    // 'status' é o objeto completo { posicao, bateria, sensores, ... }

    // 1. Atualizar o Dashboard
    updateDashboard({
      status: status.posicao || "Ocioso",
      battery: status.bateria || 100,
      rfid: status.sensores?.rfid || "Nenhuma",
    });

    // 2. Atualizar a posição visual do AGV
    const dropdownInicio = document.getElementById("select-inicio");
    if (
      !isMoving &&
      status.posicao &&
      dropdownInicio.value !== status.posicao
    ) {
      console.log(`Sincronizando posição (WebSocket): ${status.posicao}`);
      setAgvPosition(status.posicao, "Ocioso (Sincronizado)");
      dropdownInicio.value = status.posicao;
    }
  });

  // Mapeamento de Posições (coordenadas em % [x, y])
  const locations = {
    // Linha de Cima
    Vermelho: { x: 10, y: 20, el: document.getElementById("Vermelho") },
    Laranja: { x: 30, y: 20, el: document.getElementById("Laranja") },
    Amarelo: { x: 50, y: 20, el: document.getElementById("Amarelo") },
    Verde: { x: 70, y: 20, el: document.getElementById("Verde") },
    Azul: { x: 90, y: 20, el: document.getElementById("Azul") },
    // Linha do Meio
    Ciano: { x: 10, y: 50, el: document.getElementById("Ciano") },
    "Azul-acinzentado": {
      x: 30,
      y: 50,
      el: document.getElementById("Azul-acinzentado"),
    },
    Lilás: { x: 50, y: 50, el: document.getElementById("Lilás") },
    Roxo: { x: 70, y: 50, el: document.getElementById("Roxo") },
    "Azul-escuro": {
      x: 90,
      y: 50,
      el: document.getElementById("Azul-escuro"),
    },
    // Linha de Baixo
    Branco: { x: 50, y: 80, el: document.getElementById("Branco") },
  };

  // Definição dos segmentos do percurso (Baseado no seu 'grafo' final)
  const pathSegments = {
    Vermelho_Laranja: { from: "Vermelho", to: "Laranja", pulseEl: null },
    Laranja_Amarelo: { from: "Laranja", to: "Amarelo", pulseEl: null },
    Amarelo_Verde: { from: "Amarelo", to: "Verde", pulseEl: null },
    Verde_Azul: { from: "Verde", to: "Azul", pulseEl: null },
    "Ciano_Azul-acinzentado": {
      from: "Ciano",
      to: "Azul-acinzentado",
      pulseEl: null,
    },
    "Azul-acinzentado_Lilás": {
      from: "Azul-acinzentado",
      to: "Lilás",
      pulseEl: null,
    },
    Lilás_Roxo: { from: "Lilás", to: "Roxo", pulseEl: null },
    "Roxo_Azul-escuro": { from: "Roxo", to: "Azul-escuro", pulseEl: null },
    Vermelho_Ciano: { from: "Vermelho", to: "Ciano", pulseEl: null },
    "Laranja_Azul-acinzentado": {
      from: "Laranja",
      to: "Azul-acinzentado",
      pulseEl: null,
    },
    Amarelo_Lilás: { from: "Amarelo", to: "Lilás", pulseEl: null },
    Verde_Roxo: { from: "Verde", to: "Roxo", pulseEl: null },
    "Azul_Azul-escuro": { from: "Azul", to: "Azul-escuro", pulseEl: null },
    Lilás_Branco: { from: "Lilás", to: "Branco", pulseEl: null },
  };

  // --- VARIÁVEIS DE ESTADO DA SIMULAÇÃO ---
  let currentRoute = [];
  let currentCommands = []; // <-- ADICIONADO (Estava faltando na declaração global)
  let currentRouteIndex = 0;
  let isMoving = false;
  let simulationTimeout; // Referência para o setTimeout

  // --- FUNÇÕES DE INICIALIZAÇÃO E DESENHO ---

  function setupMap() {
    // Posiciona as zonas (divs)
    for (const key in locations) {
      if (locations[key].el) {
        locations[key].el.style.left = `${locations[key].x}%`;
        locations[key].el.style.top = `${locations[key].y}%`;
      }
    }
    // Desenha as linhas e os pontos de animação
    for (const key in pathSegments) {
      const seg = pathSegments[key];
      const from = locations[seg.from];
      const to = locations[seg.to];
      if (!from || !to) continue;
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line.setAttribute("x1", `${from.x}%`);
      line.setAttribute("y1", `${from.y}%`);
      line.setAttribute("x2", `${to.x}%`);
      line.setAttribute("y2", `${to.y}%`);
      line.classList.add("path-line");
      svg.appendChild(line);
      const pulse = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      pulse.setAttribute("r", "6");
      pulse.classList.add("path-pulse");
      pulse.style.offsetPath = `path('M ${from.x}% ${from.y}% L ${to.x}% ${to.y}%')`;
      seg.pulseEl = pulse;
      svg.appendChild(pulse);
    }
  }

  /** Popula os dropdowns de início e destino com os nós do mapa */
  function populateDropdowns() {
    const nodeNames = Object.keys(locations);
    selectInicio.innerHTML = "";
    selectDestino.innerHTML = "";

    nodeNames.forEach((name) => {
      const optionInicio = document.createElement("option");
      optionInicio.value = name;
      optionInicio.textContent = name;
      selectInicio.appendChild(optionInicio);

      const optionDestino = document.createElement("option");
      optionDestino.value = name;
      optionDestino.textContent = name;
      selectDestino.appendChild(optionDestino);
    });

    // Define padrões
    selectInicio.value = "Branco";
    selectDestino.value = "Vermelho";
  }

  // --- FUNÇÕES DE CONTROLE DE ESTADO ---

  /** Coloca o AGV em um nó específico, sem animação (teleporte) */
  function setAgvPosition(nodeName, statusText = "Ocioso") {
    const point = locations[nodeName];
    if (!point) return;

    // Adiciona classe para remover transição, força o reflow, e remove a classe
    agvElement.classList.add("no-transition");
    agvElement.style.left = `${point.x}%`;
    agvElement.style.top = `${point.y}%`;
    void agvElement.offsetWidth; // Força reflow
    agvElement.classList.remove("no-transition");

    updateDashboard({
      status: statusText,
      battery: parseInt(batteryPercentageElement.textContent) || 100, // Mantém bateria
      rfid: rfidDataElement.textContent || "Nenhuma",
    });
  }

  /** Reseta a simulação para o estado inicial */
  function resetSimulation() {
    isMoving = false;
    currentRoute = [];
    currentRouteIndex = 0;
    clearTimeout(simulationTimeout);
    stopAllPulseAnimations();
    setAgvPosition("Branco", "Ocioso");
    enableControls();
  }

  function disableControls() {
    btnStartPause.disabled = true;
    btnReturn.disabled = true;
    selectInicio.disabled = true;
    selectDestino.disabled = true;
    btnEmergencyStop.disabled = false; // <-- ADICIONADO (Agora pode parar)
    btnStartPause.textContent = "Em Execução...";
  }

  function enableControls() {
    btnStartPause.disabled = false;
    btnReturn.disabled = false;
    selectInicio.disabled = false;
    selectDestino.disabled = false;
    btnEmergencyStop.disabled = true; // <-- ADICIONADO (Não há o que parar)
    btnStartPause.textContent = "Enviar Tarefa";
  }

  // --- FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE ---

  function updateDashboard(data) {
    // Atualiza Status
    statusElement.textContent = data.status;
    statusElement.className = ""; // Limpa classes

    // <-- LÓGICA MODIFICADA para incluir o status de perigo -->
    if (data.status.includes("PARADA DE EMERGÊNCIA")) {
      statusElement.classList.add("status-danger");
    } else if (
      data.status.includes("trânsito") ||
      data.status.includes("Retornando")
    )
      statusElement.classList.add("status-moving");
    else if (data.status.includes("Ocioso"))
      statusElement.classList.add("status-online");
    else statusElement.classList.add("status-charging"); // Exemplo

    // Atualiza Bateria (simulando pequena queda)
    const battery = data.battery;
    batteryLevelElement.style.width = `${battery}%`;
    batteryPercentageElement.textContent = `${battery}%`;
    if (battery > 50)
      batteryLevelElement.style.backgroundColor = "var(--success-color)";
    else if (battery > 20)
      batteryLevelElement.style.backgroundColor = "var(--warning-color)";
    else batteryLevelElement.style.backgroundColor = "var(--danger-color)";

    // Atualiza RFID
    rfidDataElement.textContent = data.rfid;
  }

  function stopAllPulseAnimations() {
    document.querySelectorAll(".path-pulse.animate").forEach((el) => {
      el.classList.remove("animate");
    });
  }

  /** Ativa a animação de pulso para um segmento específico */
  function animateSegment(fromName, toName) {
    let segmentKey = `${fromName}_${toName}`;
    let reverseSegmentKey = `${toName}_${fromName}`;

    const segmentToAnimate =
      pathSegments[segmentKey] || pathSegments[reverseSegmentKey];

    if (segmentToAnimate) {
      segmentToAnimate.pulseEl.classList.remove("animate");
      void segmentToAnimate.pulseEl.offsetWidth;
      segmentToAnimate.pulseEl.classList.add("animate");
    }
  }

  // **NOVO: Função para simular o comando de virada**
  function executeCommand(command) {
    // Remove classes de rotação antigas
    agvElement.classList.remove("rotate-left", "rotate-right", "rotate-180");

    // Adiciona a classe de rotação apropriada para simular a virada
    if (command.includes("esquerda")) {
      agvElement.classList.add("rotate-left");
    } else if (command.includes("direita")) {
      agvElement.classList.add("rotate-right");
    } else if (command.includes("voltar")) {
      agvElement.classList.add("rotate-180");
    }
    // Para 'reto' ou 'parar', nenhuma classe é adicionada (ou a anterior é mantida)

    // O retorno à posição original (sem rotação) deve ser feito logo antes do próximo movimento.
  }

  // --- LÓGICA PRINCIPAL DA SIMULAÇÃO ---

  /** Função de parada de emergência */ // <-- ADICIONADO
  function emergencyStop() {
    console.warn("PARADA DE EMERGÊNCIA ACIONADA!");
    isMoving = false;
    clearTimeout(simulationTimeout);
    stopAllPulseAnimations();

    // Atualiza o painel
    updateDashboard({
      status: "PARADA DE EMERGÊNCIA",
      battery: parseInt(batteryPercentageElement.textContent) || 100,
      rfid: rfidDataElement.textContent || "Nenhuma",
    });

    // Trava os controles em um estado de "parado"
    // O usuário precisará recarregar ou usar o "Reset" (se houver)
    btnStartPause.disabled = true;
    btnReturn.disabled = true;
    selectInicio.disabled = true;
    selectDestino.disabled = true;
    btnEmergencyStop.disabled = true; // Já foi pressionado
    btnStartPause.textContent = "Parado (Emergência)";
  }

  /** Função principal que envia a rota para a "API" e inicia a execução */
  async function enviarRota() {
    const inicio = selectInicio.value;
    const destino = selectDestino.value;

    if (inicio === destino) {
      alert("O ponto de início e destino não podem ser iguais.");
      return;
    }

    disableControls();
    setAgvPosition(inicio, "Calculando rota...");

    try {
      // *** ATUALIZAÇÃO PARA RECEBER DADOS DO CÁLCULO DE ROTA ***
      // Chamada ao backend que deve retornar {custo, caminho, comandos}
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inicio, destino }),
      });

      // Verifica se a resposta foi bem-sucedida
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Erro ${res.status} do servidor`);
      }

      const { rota } = await res.json();
      // **********************************************************

      if (!rota.caminho || rota.caminho.length === 0 || !rota.comandos) {
        throw new Error("API não retornou um caminho ou comandos válidos.");
      }

      // Validação básica: O número de comandos deve ser o número de segmentos (caminho.length - 1) + 1 para o 'parar' final.
      if (rota.comandos.length !== rota.caminho.length) {
        throw new Error(
          `Comandos (${rota.comandos.length}) e Caminho (${rota.caminho.length}) dessincronizados.`
        );
      }

      console.log("Rota recebida:", rota.caminho);
      console.log("Comandos recebidos:", rota.comandos);

      currentRoute = rota.caminho;
      currentCommands = rota.comandos; // **Armazena os comandos**
      currentRouteIndex = 0; // Começa no primeiro nó (início)
      isMoving = true;

      // Teleporta o AGV para o ponto inicial (índice 0)
      setAgvPosition(currentRoute[0], `Iniciando rota para ${currentRoute[1]}`);

      // O primeiro comando é a ação de SAÍDA do nó inicial. Executamos imediatamente.
      const primeiroComando = currentCommands[0];
      executeCommand(primeiroComando);
      updateDashboard({
        status: `Comando: ${primeiroComando}. Em trânsito para ${currentRoute[1]}`,
        battery: parseInt(batteryPercentageElement.textContent),
        rfid: rfidDataElement.textContent,
      });

      // O índice de rota é 1 para começar o movimento para o SEGUNDO nó.
      currentRouteIndex = 1;
      simulationTimeout = setTimeout(executeRouteStep, 3000); // 3 segundos para 1º movimento (inclui a virada inicial)
    } catch (error) {
      console.error("Falha ao buscar rota:", error);
      alert("Erro ao calcular rota: " + error.message);
      resetSimulation();
    }
  }

  /** Executa um único passo da rota atual */
  function executeRouteStep() {
    // O currentRouteIndex aponta para o *próximo* nó que vamos chegar.
    if (!isMoving || currentRouteIndex >= currentRoute.length) {
      isMoving = false;
      enableControls();
      return;
    }

    // O comando na posição i-1 é a ação para ir de Nó(i-1) para Nó(i)
    const prevPointName = currentRoute[currentRouteIndex - 1]; // Nó que acabamos de sair
    const destinationPointName = currentRoute[currentRouteIndex]; // Nó que vamos chegar
    const destinationPoint = locations[destinationPointName];

    // O comando já foi executado no nó anterior (prevPointName).
    // O AGV agora se move.

    // 1. Mover o AGV (a transição do CSS faz a animação)
    agvElement.style.left = `${destinationPoint.x}%`;
    agvElement.style.top = `${destinationPoint.y}%`;

    // 2. Animar o segmento do caminho
    stopAllPulseAnimations();
    animateSegment(prevPointName, destinationPointName);

    let statusText;
    let rfid = rfidDataElement.textContent; // Manter RFID
    let battery = parseInt(batteryPercentageElement.textContent) - 1; // Simular queda
    if (battery < 0) battery = 100; // Recarrega se acabar (demo)

    // O comando a ser executado *após a chegada* no destinationPointName é:
    const nextCommandIndex = currentRouteIndex;
    const nextCommand = currentCommands[nextCommandIndex];

    // 3. Verificar se é o fim da rota
    if (destinationPointName === currentRoute[currentRoute.length - 1]) {
      // Se for o destino, o comando deve ser 'parar' (último comando na lista)
      statusText = `Chegou ao destino: ${destinationPointName}. Comando: ${nextCommand}`;
      isMoving = false;
      enableControls();
      if (destinationPointName === "Vermelho") rfid = "SKU-A45-VER"; // Simula coleta
      if (destinationPointName === "Azul") rfid = "Nenhuma"; // Simula entrega

      // Remove qualquer rotação ao parar
      agvElement.classList.remove("rotate-left", "rotate-right", "rotate-180");
    } else {
      // Se não for o destino, executa o comando de decisão (virar/reto) no ponto de chegada
      const nextPointName = currentRoute[currentRouteIndex + 1];

      // 4. Executa o comando de decisão para a próxima transição
      executeCommand(nextCommand);

      statusText = `Em trânsito para ${nextPointName}. Comando: ${nextCommand}`;
    }

    // 5. Atualizar o painel
    updateDashboard({
      status: statusText,
      battery: battery,
      rfid: rfid,
    });

    // 6. Agendar o próximo passo
    currentRouteIndex++;
    if (isMoving) {
      simulationTimeout = setTimeout(executeRouteStep, 3000); // 3 segundos por passo
    } else {
      selectInicio.value = selectDestino.value;
    }
  }

  // --- INICIALIZAÇÃO ---
  setupMap();
  populateDropdowns();
  resetSimulation(); // Define o estado inicial

  // Adiciona os listeners aos botões
  btnStartPause.addEventListener("click", enviarRota);
  btnEmergencyStop.addEventListener("click", emergencyStop); // <-- ADICIONADO

  // Opcional: fazer o botão de retorno funcionar
  btnReturn.addEventListener("click", () => {
    if (isMoving) {
      alert("Pare a tarefa atual antes de retornar à base.");
      return;
    }

    // Pega o último nó alcançado (ou o nó de início se a rota nunca começou)
    let ultimoNo = "Branco";
    if (currentRoute.length > 0) {
      // Se a rota terminou, o índice estará fora dos limites. Pegue o último item.
      if (currentRouteIndex >= currentRoute.length) {
        ultimoNo = currentRoute[currentRoute.length - 1];
      } else {
        // Se parou no meio, pegue o nó anterior ao próximo passo
        ultimoNo = currentRoute[currentRouteIndex - 1];
      }
    }

    // Força o envio de uma rota para o "Branco"
    selectInicio.value = ultimoNo;
    selectDestino.value = "Branco";
    enviarRota();
  });
});
