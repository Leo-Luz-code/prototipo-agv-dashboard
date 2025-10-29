document.addEventListener("DOMContentLoaded", () => {
  console.log("[Sensores] 🚀 Inicializando página de sensores...");

  // Inicializar visualização 3D dos sensores
  let distance3D = null;
  if (typeof Distance3DVisualization !== "undefined") {
    distance3D = new Distance3DVisualization("distance-3d-canvas");
    console.log("[Sensores] 🎯 Visualização 3D dos sensores inicializada");
  } else {
    console.warn("[Sensores] ⚠️ Distance3DVisualization não disponível");
  }

  // Referências DOM
  const distanceLeftElement = document.getElementById("distance-left");
  const distanceCenterElement = document.getElementById("distance-center");
  const distanceRightElement = document.getElementById("distance-right");

  // Socket.IO
  const socket = io();

  // Desconectado
  socket.on("disconnect", () => {
    console.log("[Socket.IO] ❌ DESCONECTADO do servidor!");
  });

  // Ouve pelo evento 'agv/distance' para atualizar sensores de distância
  socket.on("agv/distance", (data) => {
    console.log("[Socket.IO] 📏 Dados de distância recebidos:", data);

    if (data && data.distancia) {
      const { esquerda, centro, direita, unidade } = data.distancia;

      console.log(
        `[Socket.IO] 📏 Valores recebidos - Esq: ${esquerda} | Centro: ${centro} | Dir: ${direita}`
      );

      const DISTANCIA_PERIGO = 20; // 20 cm ou menos = PERIGO

      // Atualiza elementos visuais de distância com validação e alerta de perigo
      if (distanceLeftElement && esquerda !== undefined && esquerda !== null) {
        distanceLeftElement.textContent = `${parseFloat(esquerda).toFixed(1)} ${
          unidade || "cm"
        }`;

        // Adiciona classe de perigo se <= 20cm
        if (parseFloat(esquerda) <= DISTANCIA_PERIGO) {
          distanceLeftElement.classList.add("distance-danger");
          distanceLeftElement.classList.remove("distance-safe");
        } else {
          distanceLeftElement.classList.remove("distance-danger");
          distanceLeftElement.classList.add("distance-safe");
        }

        console.log(
          `[Socket.IO] ✅ Esquerda atualizada: ${esquerda} ${unidade}`
        );
      }

      if (distanceCenterElement && centro !== undefined && centro !== null) {
        distanceCenterElement.textContent = `${parseFloat(centro).toFixed(1)} ${
          unidade || "cm"
        }`;

        // Adiciona classe de perigo se <= 20cm
        if (parseFloat(centro) <= DISTANCIA_PERIGO) {
          distanceCenterElement.classList.add("distance-danger");
          distanceCenterElement.classList.remove("distance-safe");
        } else {
          distanceCenterElement.classList.remove("distance-danger");
          distanceCenterElement.classList.add("distance-safe");
        }

        console.log(`[Socket.IO] ✅ Centro atualizado: ${centro} ${unidade}`);
      }

      if (distanceRightElement && direita !== undefined && direita !== null) {
        distanceRightElement.textContent = `${parseFloat(direita).toFixed(1)} ${
          unidade || "cm"
        }`;

        // Adiciona classe de perigo se <= 20cm
        if (parseFloat(direita) <= DISTANCIA_PERIGO) {
          distanceRightElement.classList.add("distance-danger");
          distanceRightElement.classList.remove("distance-safe");
        } else {
          distanceRightElement.classList.remove("distance-danger");
          distanceRightElement.classList.add("distance-safe");
        }

        console.log(`[Socket.IO] ✅ Direita atualizada: ${direita} ${unidade}`);
      }

      // Verifica se há perigo em qualquer sensor
      const temPerigo =
        parseFloat(esquerda) <= DISTANCIA_PERIGO ||
        parseFloat(centro) <= DISTANCIA_PERIGO ||
        parseFloat(direita) <= DISTANCIA_PERIGO;

      // Atualiza visualização 3D
      if (distance3D && typeof distance3D.updateSensorData === "function") {
        distance3D.updateSensorData(
          parseFloat(centro) || 0,
          parseFloat(direita) || 0,
          parseFloat(esquerda) || 0,
          temPerigo // Passa se tem perigo ou não
        );
      }

      if (temPerigo) {
        console.warn(
          `[Socket.IO] ⚠️ PERIGO! Obstáculo muito próximo detectado!`
        );
      }

      console.log(
        `[Socket.IO] ✅ Distâncias atualizadas - Esq: ${esquerda} | Centro: ${centro} | Dir: ${direita} ${unidade}`
      );
    } else {
      console.warn(
        "[Socket.IO] ⚠️ Dados de distância inválidos ou ausentes:",
        data
      );
    }
  });

  console.log("[Sensores] ✅ Página de sensores inicializada");
});
