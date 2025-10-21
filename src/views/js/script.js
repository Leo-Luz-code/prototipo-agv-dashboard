document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURAÇÃO E REFERÊNCIAS ---
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
    btnStartPause.textContent = "Em Execução...";
  }

  function enableControls() {
    btnStartPause.disabled = false;
    btnReturn.disabled = false;
    selectInicio.disabled = false;
    selectDestino.disabled = false;
    btnStartPause.textContent = "Enviar Tarefa";
  }

  // --- FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE ---

  function updateDashboard(data) {
    // Atualiza Status
    statusElement.textContent = data.status;
    statusElement.className = "";
    if (data.status.includes("trânsito") || data.status.includes("Retornando"))
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

  // --- LÓGICA PRINCIPAL DA SIMULAÇÃO ---

  /**
   * SIMULAÇÃO DE API - Substitua isso pela sua chamada fetch real
   * Encontra um caminho simples (não é o ideal, mas funciona para demo)
   */
  async function fakeApiCall(inicio, destino) {
    console.log(`API FAKE: Solicitando rota de ${inicio} para ${destino}`);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simula latência de rede

    // Rota de placeholder - o seu backend faria isso com Dijkstra ou A*
    // Para este demo, vamos criar uma rota simples:
    let rota = [inicio];
    if (inicio !== "Lilás" && destino !== "Lilás") {
      rota.push("Lilás"); // Tenta passar pelo centro
    }
    if (rota[rota.length - 1] !== destino) {
      rota.push(destino);
    }

    // Remove duplicatas caso inicio/destino seja "Lilás"
    rota = [...new Set(rota)];

    console.log("API FAKE: Rota calculada:", rota);
    return { rota: rota };
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
      // *** TROQUE A LINHA ABAIXO PELA SUA CHAMADA FETCH REAL ***
      const data = await fakeApiCall(inicio, destino);
      // const res = await fetch('/api/route', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ inicio, destino })
      // });
      // const data = await res.json();
      // **********************************************************

      if (!data.rota || data.rota.length === 0) {
        throw new Error("API não retornou uma rota válida.");
      }

      alert("Rota recebida: " + JSON.stringify(data.rota));

      currentRoute = data.rota;
      currentRouteIndex = 0; // Começa no primeiro item (início)
      isMoving = true;

      // Teleporta o AGV para o ponto inicial (índice 0)
      setAgvPosition(currentRoute[0], `Iniciando rota para ${currentRoute[1]}`);

      // Prepara para mover para o *próximo* ponto (índice 1)
      currentRouteIndex = 1;
      simulationTimeout = setTimeout(executeRouteStep, 2000); // Inicia o 1º movimento
    } catch (error) {
      console.error("Falha ao buscar rota:", error);
      alert("Erro ao calcular rota: " + error.message);
      resetSimulation();
    }
  }

  /** Executa um único passo da rota atual */
  function executeRouteStep() {
    if (!isMoving || currentRouteIndex >= currentRoute.length) {
      isMoving = false;
      enableControls();
      return;
    }

    const prevPointName = currentRoute[currentRouteIndex - 1];
    const destinationPointName = currentRoute[currentRouteIndex];
    const destinationPoint = locations[destinationPointName];

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

    // 3. Verificar se é o fim da rota
    if (currentRouteIndex === currentRoute.length - 1) {
      statusText = `Chegou ao destino: ${destinationPointName}`;
      isMoving = false;
      enableControls();
      if (destinationPointName === "Vermelho") rfid = "SKU-A45-VER"; // Simula coleta
      if (destinationPointName === "Azul") rfid = "Nenhuma"; // Simula entrega
    } else {
      const nextPointName = currentRoute[currentRouteIndex + 1];
      statusText = `Em trânsito para ${nextPointName}`;
    }

    // 4. Atualizar o painel
    updateDashboard({
      status: statusText,
      battery: battery,
      rfid: rfid,
    });

    // 5. Agendar o próximo passo
    currentRouteIndex++;
    if (isMoving) {
      simulationTimeout = setTimeout(executeRouteStep, 3000); // 3 segundos por passo
    }
  }

  // --- INICIALIZAÇÃO ---
  setupMap();
  populateDropdowns();
  resetSimulation(); // Define o estado inicial

  // Adiciona o listener ao botão
  btnStartPause.addEventListener("click", enviarRota);
  // Opcional: fazer o botão de retorno funcionar
  btnReturn.addEventListener("click", () => {
    if (isMoving) {
      alert("Pare a tarefa atual antes de retornar à base.");
      return;
    }
    // Força o envio de uma rota para o "Branco"
    selectInicio.value =
      locations[currentRoute[currentRouteIndex - 1] || "Azul"].el.id; // Pega último ponto
    selectDestino.value = "Branco";
    enviarRota();
  });
});
