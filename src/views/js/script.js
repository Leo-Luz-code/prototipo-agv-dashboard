document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURAÇÃO E REFERÊNCIAS ---
  const svg = document.getElementById("map-svg");
  const agvElement = document.getElementById("agv");
  const statusElement = document.getElementById("agv-status");
  const batteryLevelElement = document.getElementById("battery-level");
  const batteryPercentageElement =
    document.getElementById("battery-percentage");
  const rfidDataElement = document.getElementById("rfid-data");

  // Mapeamento de Posições (coordenadas em % [x, y])
  const locations = {
    "recharge-station": {
      x: 10,
      y: 85,
      el: document.getElementById("recharge-station"),
    },
    "dock-a": { x: 10, y: 15, el: document.getElementById("dock-a") },
    crossroads: { x: 40, y: 85, el: document.getElementById("crossroads") },
    "corridor-1": { x: 40, y: 50, el: document.getElementById("corridor-1") },
    "corridor-2": { x: 80, y: 50, el: document.getElementById("corridor-2") },
    "delivery-b": { x: 80, y: 15, el: document.getElementById("delivery-b") },
  };

  // Definição dos segmentos do percurso com referência ao elemento de animação
  const pathSegments = {
    "recharge-station_crossroads": {
      from: "recharge-station",
      to: "crossroads",
      pulseEl: null,
    },
    "crossroads_corridor-1": {
      from: "crossroads",
      to: "corridor-1",
      pulseEl: null,
    },
    "corridor-1_corridor-2": {
      from: "corridor-1",
      to: "corridor-2",
      pulseEl: null,
    },
    "corridor-2_delivery-b": {
      from: "corridor-2",
      to: "delivery-b",
      pulseEl: null,
    },
    "corridor-1_dock-a": { from: "corridor-1", to: "dock-a", pulseEl: null },
  };

  // Rota simulada do AGV (sequência de pontos a visitar)
  const simulatedRoute = [
    {
      point: "recharge-station",
      status: "Aguardando Tarefa",
      rfid: "Nenhuma",
      battery: 98,
    },
    {
      point: "crossroads",
      status: "Em trânsito para Corredor 1",
      rfid: "Nenhuma",
      battery: 95,
    },
    {
      point: "corridor-1",
      status: "Em trânsito para Ponto A",
      rfid: "Nenhuma",
      battery: 92,
    },
    {
      point: "dock-a",
      status: "Coletando carga no Ponto A",
      rfid: "PROD-SKU-4815A",
      battery: 90,
    },
    {
      point: "corridor-1",
      status: "Em trânsito para Corredor 2",
      rfid: "PROD-SKU-4815A",
      battery: 86,
    },
    {
      point: "corridor-2",
      status: "Em trânsito para Entrega B",
      rfid: "PROD-SKU-4815A",
      battery: 82,
    },
    {
      point: "delivery-b",
      status: "Entregando carga no Ponto B",
      rfid: "Nenhuma",
      battery: 80,
    },
    {
      point: "corridor-2",
      status: "Retornando para a base",
      rfid: "Nenhuma",
      battery: 75,
    },
    {
      point: "corridor-1",
      status: "Retornando para a base",
      rfid: "Nenhuma",
      battery: 71,
    },
    {
      point: "crossroads",
      status: "Retornando para a base",
      rfid: "Nenhuma",
      battery: 68,
    },
  ];
  let routeIndex = 0;

  // --- FUNÇÕES DE INICIALIZAÇÃO E DESENHO ---

  function setupMap() {
    // Posiciona as zonas (divs)
    for (const key in locations) {
      locations[key].el.style.left = `${locations[key].x}%`;
      locations[key].el.style.top = `${locations[key].y}%`;
    }

    // Desenha as linhas e os pontos de animação
    for (const key in pathSegments) {
      const seg = pathSegments[key];
      const from = locations[seg.from];
      const to = locations[seg.to];

      // Cria a linha SVG
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

      // Cria o círculo de animação para esta linha
      const pulse = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      pulse.setAttribute("r", "6");
      pulse.classList.add("path-pulse");
      // Define o caminho que a animação deve seguir
      pulse.style.offsetPath = `path('M ${from.x}% ${from.y}% L ${to.x}% ${to.y}%')`;
      seg.pulseEl = pulse; // Guarda a referência
      svg.appendChild(pulse);
    }
  }

  // --- FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE ---

  function updateDashboard(data) {
    // Atualiza Status
    statusElement.textContent = data.status;
    statusElement.className = "";
    if (data.status.includes("trânsito"))
      statusElement.classList.add("status-moving");
    else if (data.status.includes("Carregando"))
      statusElement.classList.add("status-charging");
    else statusElement.classList.add("status-online");

    // Atualiza Bateria
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

  // --- LÓGICA PRINCIPAL DA SIMULAÇÃO ---

  function simulationTick() {
    const destinationStep = simulatedRoute[routeIndex];
    const destinationPoint = locations[destinationStep.point];

    agvElement.style.left = `${destinationPoint.x}%`;
    agvElement.style.top = `${destinationPoint.y}%`;

    updateDashboard(destinationStep);

    stopAllPulseAnimations(); // Desativa as animações de todas as bolinhas

    const currentPointName = destinationStep.point;
    const nextIndex = (routeIndex + 1) % simulatedRoute.length;
    const nextPointName = simulatedRoute[nextIndex].point;

    let segmentKey = `${currentPointName}_${nextPointName}`;
    let reverseSegmentKey = `${nextPointName}_${currentPointName}`;

    const segmentToAnimate =
      pathSegments[segmentKey] || pathSegments[reverseSegmentKey];

    if (segmentToAnimate) {
      // Força o navegador a reiniciar a animação removendo e adicionando a classe
      // Isso é crucial para que a animação "teletransporte" para o início da nova rota
      segmentToAnimate.pulseEl.classList.remove("animate");
      // Força um reflow (repaint) para que a remoção da classe seja processada
      void segmentToAnimate.pulseEl.offsetWidth;
      segmentToAnimate.pulseEl.classList.add("animate");
    }

    routeIndex = (routeIndex + 1) % simulatedRoute.length;
  }

  // --- INICIALIZAÇÃO ---
  setupMap();

  // Inicia o ciclo da simulação com a primeira chamada imediata
  simulationTick();
  setInterval(simulationTick, 3000); // Repete a cada 3 segundos
});
