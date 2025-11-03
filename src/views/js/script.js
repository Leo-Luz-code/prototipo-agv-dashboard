document.addEventListener("DOMContentLoaded", () => {
  console.log("[APP] 🚀 DOM carregado, inicializando...");

  // --- CONFIGURAÇÃO E REFERÊNCIAS ---
  const socket = io();
  const svg = document.getElementById("map-svg");
  const agvElement = document.getElementById("agv");
  const statusElement = document.getElementById("agv-status");
  const batteryLevelElement = document.getElementById("battery-level");
  const batteryPercentageElement =
    document.getElementById("battery-percentage");
  const agvCargoElement = document.getElementById("agv-cargo");
  const agvCargoNameElement = document.getElementById("agv-cargo-name");

  // Note: distance sensor DOM elements were moved to sensors.html

  // Inicializar visualização 3D dos sensores
  let distance3D = null;
  if (typeof Distance3DVisualization !== "undefined") {
    distance3D = new Distance3DVisualization("distance-3d-canvas");
    console.log("[APP] 🎯 Visualização 3D dos sensores inicializada");
  } else {
    console.warn("[APP] ⚠️ Distance3DVisualization não disponível");
  }

  // Estado persistente da carga atual
  let currentCargoTag = null;
  let currentCargoName = null;

  // Verificar se os elementos existem
  console.log("[APP] 📋 Elementos carregados:");
  console.log("  - agvCargoElement:", !!agvCargoElement);
  console.log("  - statusElement:", !!statusElement);
  console.log("  - socket:", !!socket);

  // Novas referências de controle
  const selectInicio = document.getElementById("select-inicio");
  const selectDestino = document.getElementById("select-destino");
  const btnStartPause = document.getElementById("btn-start-pause");
  const btnReturn = document.getElementById("btn-return");
  const btnEmergencyStop = document.getElementById("btn-emergency-stop");
  const btnClearCargo = document.getElementById("btn-clear-cargo");

  // drawer behavior moved to js/drawer.js (shared)

  // Desconectado
  socket.on("disconnect", () => {
    console.log("[Socket.IO] ❌ DESCONECTADO do servidor!");
  });

  // Ouve pelo evento 'agv/status' que o backend está transmitindo
  socket.on("agv/status", (status) => {
    console.log("[Socket.IO] 📩 Status COMPLETO recebido:", status);
    console.log("[Socket.IO] 📍 Posição no status:", status.posicao);
    console.log("[Socket.IO] 🚦 isMoving atual:", isMoving);

    // 'status' é o objeto completo { posicao, bateria, sensores, ... }

    // 1. Atualizar o Dashboard IMEDIATAMENTE
    const rfidValue = status.sensores?.rfid || "Nenhuma";
    const rfidItemName = status.sensores?.rfidItemName || null;
    console.log(`[Socket.IO] ✅ Atualizando RFID AGORA para: ${rfidValue}`);
    if (rfidItemName) {
      console.log(`[Socket.IO] 📦 Item: ${rfidItemName}`);
    }

    updateDashboard({
      status: status.posicao || "Ocioso",
      battery: status.bateria || 100,
      rfid: rfidValue,
      rfidItemName: rfidItemName,
    });

    // 2. Atualizar a posição visual do AGV APENAS se não estiver em movimento
    const dropdownInicio = document.getElementById("select-inicio");
    if (
      !isMoving &&
      status.posicao &&
      dropdownInicio.value !== status.posicao
    ) {
      console.log(
        `[Socket.IO] 🔄 Sincronizando posição: ${dropdownInicio.value} -> ${status.posicao}`
      );
      // O setAgvPosition já vai salvar a posição no localStorage
      setAgvPosition(status.posicao, "Ocioso (Sincronizado)");
      dropdownInicio.value = status.posicao;
    } else {
      console.log(
        `[Socket.IO] ⏸️ Sincronização de posição bloqueada (isMoving=${isMoving}, posicao=${status.posicao})`
      );
    }
  });

  // Ouve pelo evento 'agv/rfid/update' apenas para atualizar sensores RFID
  // SEM afetar a posição do AGV
  socket.on("agv/rfid/update", (update) => {
    console.log(
      "[Socket.IO] 📡 Update de RFID recebido (NÃO afeta posição):",
      update
    );

    const rfidValue = update.sensores?.rfid || "Nenhuma";
    const rfidItemName = update.sensores?.rfidItemName || null;
    console.log(`[Socket.IO] 🏷️ Tag RFID: ${rfidValue}`);
    if (rfidItemName) {
      console.log(`[Socket.IO] 📦 Item: ${rfidItemName}`);
    }

    // Verifica se é uma nova tag válida E diferente da atual
    if (rfidValue && rfidValue !== "Nenhuma" && rfidValue !== currentCargoTag) {
      // Nova tag detectada - atualiza o estado interno
      currentCargoTag = rfidValue;
      currentCargoName = rfidItemName;

      console.log(
        `[Socket.IO] ✅ Nova tag carregada no AGV: ${currentCargoTag}`
      );

      if (currentCargoName) {
        console.log(`[Socket.IO] 📦 Item: ${currentCargoName}`);
      } else {
        console.log(`[Socket.IO] ⚠️ Tag não cadastrada no sistema`);
      }

      // Atualiza o badge de carga do AGV com base no estado persistente
      if (agvCargoElement && agvCargoNameElement) {
        agvCargoElement.classList.remove("updated", "empty", "unregistered");
        if (currentCargoName) {
          agvCargoNameElement.textContent = currentCargoName;
          agvCargoElement.classList.add("updated");
        } else {
          agvCargoNameElement.textContent = "Não registrado";
          agvCargoElement.classList.add("unregistered");
          agvCargoElement.classList.add("updated");
        }
        setTimeout(() => {
          agvCargoElement.classList.remove("updated");
        }, 500);
      }
    }

    console.log("[Socket.IO] ⚠️ IMPORTANTE: Posição do AGV NÃO foi alterada!");
  });

  // Ouve pelo evento 'agv/distance' para atualizar visualização 3D
  socket.on("agv/distance", (data) => {
    console.log("[Socket.IO] 📏 Dados de distância recebidos:", data);

    if (data && data.distancia) {
      const { esquerda, centro, direita } = data.distancia;
      console.log(
        `[Socket.IO] 📏 Valores recebidos - Esq: ${esquerda} | Centro: ${centro} | Dir: ${direita}`
      );

      const DISTANCIA_PERIGO = 20; // 20 cm ou menos = PERIGO

      // Verifica se há perigo em qualquer sensor
      const temPerigo =
        parseFloat(esquerda) <= DISTANCIA_PERIGO ||
        parseFloat(centro) <= DISTANCIA_PERIGO ||
        parseFloat(direita) <= DISTANCIA_PERIGO;

      // Atualiza visualização 3D no dashboard
      if (distance3D && typeof distance3D.updateSensorData === "function") {
        distance3D.updateSensorData(
          parseFloat(centro) || 0,
          parseFloat(esquerda) || 0,  // Invertido: dados da esquerda vão para right
          parseFloat(direita) || 0,   // Invertido: dados da direita vão para left
          temPerigo // Passa se tem perigo ou não
        );
      }

      if (temPerigo) {
        console.warn(
          `[Socket.IO] ⚠️ PERIGO! Obstáculo muito próximo detectado!`
        );
      }
    } else {
      console.warn(
        "[Socket.IO] ⚠️ Dados de distância inválidos ou ausentes:",
        data
      );
    }
  });

  // Ouve pelo evento 'agv/imu' para atualizar física do AGV na visualização 3D
  socket.on("agv/imu", (data) => {
    console.log("[Socket.IO] 🎯 Dados IMU recebidos para visualização 3D:", data);

    // Atualiza visualização 3D com dados do IMU (acelerômetro e giroscópio)
    if (
      distance3D &&
      typeof distance3D.updateIMUData === "function" &&
      data &&
      data.accel &&
      data.gyro
    ) {
      distance3D.updateIMUData(data.accel, data.gyro);
      console.log("[Socket.IO] ✅ Visualização 3D atualizada com dados IMU");
    }
  });

  console.log("[Socket.IO] 📝 Event listeners registrados!");

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

    // Salva a posição atual no localStorage
    localStorage.setItem("currentAgvPosition", nodeName);

    // Adiciona classe para remover transição, força o reflow, e remove a classe
    agvElement.classList.add("no-transition");
    agvElement.style.left = `${point.x}%`;
    agvElement.style.top = `${point.y}%`;
    void agvElement.offsetWidth; // Força reflow
    agvElement.classList.remove("no-transition");

    updateDashboard({
      status: statusText,
      battery: parseInt(batteryPercentageElement.textContent) || 100, // Mantém bateria
      rfid: currentCargoTag || "Nenhuma",
    });
  }

  /** Reseta a simulação para o estado inicial */
  function resetSimulation() {
    isMoving = false;
    currentRoute = [];
    currentRouteIndex = 0;
    clearTimeout(simulationTimeout);
    stopAllPulseAnimations();

    // Recupera a última posição do AGV do localStorage, ou usa "Branco" como padrão
    const lastPosition = localStorage.getItem("currentAgvPosition") || "Branco";
    setAgvPosition(lastPosition, "Ocioso");
    enableControls();

    // Atualiza o dropdown de início para a posição atual
    if (selectInicio) {
      selectInicio.value = lastPosition;
    }

    // Não limpa a carga automaticamente no reset
    // A carga só é limpa quando o usuário clica em "Sem Carga"
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
    console.log("[Dashboard] 🔄 Atualizando dashboard com:", data);

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

    // Atualiza RFID - MODO PERSISTENTE
    // Só atualiza se uma NOVA tag for detectada E for diferente da atual
    console.log(`[Dashboard] 🏷️  Tag recebida do sensor: ${data.rfid}`);

    // Verifica se é uma nova tag válida E diferente da atual
    if (data.rfid && data.rfid !== "Nenhuma" && data.rfid !== currentCargoTag) {
      // Nova tag detectada - atualiza SOMENTE se for diferente
      currentCargoTag = data.rfid;
      currentCargoName = data.rfidItemName || null;

      console.log(
        `[Dashboard] ✅ Nova tag carregada no AGV: ${currentCargoTag}`
      );
      if (currentCargoName) {
        console.log(`[Dashboard] 📦 Item: ${currentCargoName}`);
      } else {
        console.log(`[Dashboard] ⚠️ Tag não cadastrada no sistema`);
      }
    } else if (data.rfid === currentCargoTag) {
      // Mesma tag detectada novamente - ignora (já está carregada)
      console.log(
        `[Dashboard] 📌 Tag já carregada, mantendo: ${currentCargoTag}`
      );
    } else if (currentCargoTag) {
      // Sensor não detectou nada (tag removida do leitor) - MANTÉM a tag anterior
      console.log(
        `[Dashboard] 🔒 Tag removida do leitor, mas mantendo carga: ${currentCargoTag}`
      );
    } else {
      // Estado inicial - sem nenhuma tag
      console.log(`[Dashboard] 📭 AGV sem carga`);
    }

    // Note: RFID detailed displays live on /rfid.html now. We only keep the
    // persistent state here (currentCargoTag/currentCargoName) and update the
    // AGV badge below.

    // Atualiza o badge de carga do AGV no mapa baseado no estado persistente
    if (agvCargoElement && agvCargoNameElement) {
      // Remove todas as classes de estado
      agvCargoElement.classList.remove("updated", "empty", "unregistered");

      if (currentCargoName) {
        // Tem carga identificada (tag cadastrada) - VERDE
        agvCargoNameElement.textContent = currentCargoName;
        // Adiciona animação de atualização
        void agvCargoElement.offsetWidth; // Força reflow
        agvCargoElement.classList.add("updated");
        console.log(`[Dashboard] 🚛 AGV transportando: ${currentCargoName}`);
      } else if (currentCargoTag) {
        // Tem tag mas NÃO está cadastrada - exibe 'Não registrado'
        agvCargoNameElement.textContent = "Não registrado";
        agvCargoElement.classList.add("unregistered");
        void agvCargoElement.offsetWidth;
        agvCargoElement.classList.add("updated");
        console.log(
          `[Dashboard] 🚛 AGV com tag não cadastrada: ${currentCargoTag}`
        );
      } else {
        // Sem carga - CINZA
        agvCargoNameElement.textContent = "Sem carga";
        agvCargoElement.classList.add("empty");
      }

      // Remove a animação após completar
      setTimeout(() => {
        agvCargoElement.classList.remove("updated");
      }, 500);
    }

    // Botão de limpar carga foi removido do dashboard; gerenciamento de
    // tags e cópia de leituras agora acontece em /rfid.html
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
      rfid: currentCargoTag || "Nenhuma",
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
        rfid: currentCargoTag,
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
    let rfid = currentCargoTag; // Manter RFID
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
      localStorage.setItem("currentAgvPosition", selectDestino.value);
      console.log("[SERVER] Posição do AGV salva: ", selectDestino.value);
    }
  }

  /**
   * Limpa manualmente a carga do AGV
   */
  function clearCargo() {
    console.log("[APP] 🚫 Limpando carga do AGV (estado interno)...");

    // Limpa apenas o estado interno. A interface detalhada de RFID
    // foi movida para /rfid.html; aqui atualizamos apenas o badge do AGV.
    currentCargoTag = null;
    currentCargoName = null;

    if (agvCargoElement && agvCargoNameElement) {
      agvCargoElement.classList.remove("updated", "unregistered");
      agvCargoElement.classList.add("empty");
      agvCargoNameElement.textContent = "Sem carga";
    }

    console.log("[APP] ✅ Estado interno de carga limpo.");

    // Opcional: informe ao servidor que a carga foi removida
    socket.emit("agv/clear-cargo", {
      message: "Carga removida manualmente pelo usuário",
    });
  }

  // --- INICIALIZAÇÃO ---
  setupMap();
  populateDropdowns();
  resetSimulation(); // Define o estado inicial

  // Adiciona os listeners aos botões
  btnStartPause.addEventListener("click", enviarRota);
  btnEmergencyStop.addEventListener("click", emergencyStop); // <-- ADICIONADO

  // Botão de limpar carga
  if (btnClearCargo) {
    btnClearCargo.addEventListener("click", clearCargo);
    btnClearCargo.disabled = true; // Inicialmente desabilitado
  }

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
    selectInicio.value = localStorage.getItem("currentAgvPosition");
    selectDestino.value = "Branco";
    enviarRota();
  });
});
