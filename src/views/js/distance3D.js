// =====================================================
// Visualização 3D dos Sensores de Distância
// Usando Three.js para renderização em tempo real
// =====================================================

class Distance3DVisualization {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error('[3D VIZ] Canvas não encontrado:', canvasId);
      return;
    }

    // Dados dos sensores (em cm)
    this.sensorData = {
      center: 0,   // Sensor frontal (eixo X - vermelho)
      right: 0,    // Sensor direito (eixo Y - verde)
      left: 0      // Sensor esquerdo (eixo Z - azul)
    };

    // Dados do IMU (acelerômetro e giroscópio)
    this.imuData = {
      accel: { x: 0, y: 0, z: 0 },  // Aceleração em g
      gyro: { x: 0, y: 0, z: 0 }    // Rotação em graus/s
    };

    // Estado da animação do AGV
    this.agvAnimation = {
      vibration: { x: 0, y: 0, z: 0 },  // Vibração atual
      rotation: { x: 0, y: 0, z: 0 },   // Rotação atual (pitch, yaw, roll)
      targetVibration: { x: 0, y: 0, z: 0 },  // Vibração alvo
      targetRotation: { x: 0, y: 0, z: 0 },   // Rotação alvo (pitch, yaw, roll)
      basePosition: { x: 0, y: 0.2, z: 0 },   // Posição FIXA do AGV
      baseRotation: { x: 0, y: 0, z: 0 }      // Rotação base
    };

    // Escala: 1 unidade = 10 cm (para visualização mais compacta)
    this.scale = 0.1;
    this.maxDistance = 100; // 100 cm = 10 unidades no gráfico

    // Sensibilidade dos efeitos IMU
    this.imuSensitivity = {
      vibration: 0.01,      // Sensibilidade da vibração (mais baixo = menos vibração)
      rotationAccel: 1.2,   // Sensibilidade da rotação por acelerômetro (orientação)
      rotationGyro: 1.5,    // Sensibilidade da rotação por giroscópio (movimento)
      smoothing: 0.1        // Suavização da animação (0-1, mais alto = mais rápido)
    };

    this.init();
    this.createScene();
    this.animate();

    console.log('[3D VIZ] ✅ Visualização 3D inicializada');
  }

  init() {
    // Criar cena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e14);

    // Configurar câmera FIXA - Visão de cima/trás do AGV (mais próxima)
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);

    // Câmera mais próxima para ver melhor o carrinho maior
    this.camera.position.set(0, 10, -10);
    this.camera.lookAt(0, 0, 3);

    // Criar renderizador
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Iluminação melhorada para destacar o AGV
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Luz direcional de cima (simula luz do ambiente)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 20, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Luz frontal para iluminar bem o AGV
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
    frontLight.position.set(0, 5, 10);
    this.scene.add(frontLight);

    // Luz de preenchimento (fill light) para suavizar sombras
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-10, 5, -5);
    this.scene.add(fillLight);

    // Listener para redimensionamento
    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  createScene() {
    // ========== CRIAR AGV NO CENTRO (VERSÃO REALISTA - QUADRADO 30x30cm) ==========
    // Criar um grupo para todo o AGV (facilita rotação e posicionamento)
    this.agvBody = new THREE.Group();

    // Corpo principal do AGV (quadrado 30x30cm = 3.0 x 3.0 unidades)
    const bodyGeometry = new THREE.BoxGeometry(3.0, 0.8, 3.0);
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x36d1dc,
      emissive: 0x1a6870,
      emissiveIntensity: 0.3,
      shininess: 60
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    this.agvBody.add(body);

    // Parte superior do AGV (plataforma de carga - quadrada)
    const topGeometry = new THREE.BoxGeometry(2.7, 0.3, 2.7);
    const topMaterial = new THREE.MeshPhongMaterial({
      color: 0x2a9d8f,
      emissive: 0x1a6870,
      emissiveIntensity: 0.2,
      shininess: 80
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 1.15;
    this.agvBody.add(top);

    // Frente identificável (painel frontal em amarelo)
    const frontPanelGeometry = new THREE.BoxGeometry(3.1, 0.6, 0.1);
    const frontPanelMaterial = new THREE.MeshPhongMaterial({
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.4,
      shininess: 100
    });
    const frontPanel = new THREE.Mesh(frontPanelGeometry, frontPanelMaterial);
    frontPanel.position.set(0, 0.6, 1.55); // Ajustado para o tamanho quadrado
    this.agvBody.add(frontPanel);

    // Base/chassi do AGV (parte inferior escura - quadrada)
    const chassisGeometry = new THREE.BoxGeometry(2.8, 0.2, 2.8);
    const chassisMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      shininess: 30
    });
    const chassis = new THREE.Mesh(chassisGeometry, chassisMaterial);
    chassis.position.y = 0.1;
    this.agvBody.add(chassis);

    // ========== CRIAR RODAS ==========
    const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
    const wheelMaterial = new THREE.MeshPhongMaterial({
      color: 0x2d2d2d,
      shininess: 20
    });

    // Posições das 4 rodas (ajustadas para o formato quadrado)
    const wheelPositions = [
      { x: 1.2, z: 1.2 },   // Frente direita
      { x: -1.2, z: 1.2 },  // Frente esquerda
      { x: 1.2, z: -1.2 },  // Traseira direita
      { x: -1.2, z: -1.2 }  // Traseira esquerda
    ];

    this.wheels = [];
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(pos.x, 0.2, pos.z);
      wheel.rotation.z = Math.PI / 2; // Rotacionar para orientação correta
      this.agvBody.add(wheel);
      this.wheels.push(wheel);
    });

    // Posicionar o grupo do AGV
    this.agvBody.position.y = 0.2;
    this.scene.add(this.agvBody);

    // Seta indicando a FRENTE do AGV (MAIOR e mais visível)
    const arrowLength = 2.5;
    const arrowDir = new THREE.Vector3(0, 0, 1).normalize();
    const arrowOrigin = new THREE.Vector3(0, 1.8, 0);
    const arrowColor = 0xff00ff; // Magenta para destacar
    this.frontArrow = new THREE.ArrowHelper(arrowDir, arrowOrigin, arrowLength, arrowColor, 0.8, 0.6);
    this.scene.add(this.frontArrow);

    // ========== CRIAR CHÃO/GRID ==========
    const gridSize = 30;
    const gridDivisions = 30;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x404040, 0x202020);
    this.scene.add(gridHelper);

    // Linhas de referência de distância (círculos concêntricos)
    this.createDistanceCircles();

    // ========== CRIAR RAIOS/BEAMS DOS SENSORES ==========

    // Raio do sensor FRONTAL/CENTRO (Vermelho) - Mais grosso e visível
    const centerBeamGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 16);
    const centerBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.7
    });
    this.centerBeam = new THREE.Mesh(centerBeamGeometry, centerBeamMaterial);
    this.centerBeam.rotation.x = Math.PI / 2;
    this.scene.add(this.centerBeam);

    // Obstáculo detectado pelo sensor frontal (maior)
    const centerObstacleGeometry = new THREE.BoxGeometry(1.5, 2, 0.5);
    const centerObstacleMaterial = new THREE.MeshPhongMaterial({
      color: 0xff4444,
      emissive: 0xff4444,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7
    });
    this.centerObstacle = new THREE.Mesh(centerObstacleGeometry, centerObstacleMaterial);
    this.centerObstacle.position.y = 0.5;
    this.scene.add(this.centerObstacle);

    // Raio do sensor DIREITA (Verde) - Mais grosso e visível
    const rightBeamGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 16);
    const rightBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0x44ff44,
      transparent: true,
      opacity: 0.7
    });
    this.rightBeam = new THREE.Mesh(rightBeamGeometry, rightBeamMaterial);
    this.rightBeam.rotation.z = -Math.PI / 2;
    this.scene.add(this.rightBeam);

    // Obstáculo detectado pelo sensor direito (maior)
    const rightObstacleGeometry = new THREE.BoxGeometry(0.5, 2, 1.5);
    const rightObstacleMaterial = new THREE.MeshPhongMaterial({
      color: 0x44ff44,
      emissive: 0x44ff44,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7
    });
    this.rightObstacle = new THREE.Mesh(rightObstacleGeometry, rightObstacleMaterial);
    this.rightObstacle.position.y = 0.5;
    this.scene.add(this.rightObstacle);

    // Raio do sensor ESQUERDA (Azul) - Mais grosso e visível
    const leftBeamGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 16);
    const leftBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0x4444ff,
      transparent: true,
      opacity: 0.7
    });
    this.leftBeam = new THREE.Mesh(leftBeamGeometry, leftBeamMaterial);
    this.leftBeam.rotation.z = Math.PI / 2;
    this.scene.add(this.leftBeam);

    // Obstáculo detectado pelo sensor esquerdo (maior)
    const leftObstacleGeometry = new THREE.BoxGeometry(0.5, 2, 1.5);
    const leftObstacleMaterial = new THREE.MeshPhongMaterial({
      color: 0x4444ff,
      emissive: 0x4444ff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7
    });
    this.leftObstacle = new THREE.Mesh(leftObstacleGeometry, leftObstacleMaterial);
    this.leftObstacle.position.y = 0.5;
    this.scene.add(this.leftObstacle);

    // SEM rotação automática
    this.autoRotate = false;

    // ========== CRIAR TEXTO DE PERIGO ==========
    this.createDangerText();
  }

  createDangerText() {
    // Criar sprite de texto "PERIGO"
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    // Fundo vermelho semi-transparente
    context.fillStyle = 'rgba(220, 53, 69, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Borda preta
    context.strokeStyle = '#000000';
    context.lineWidth = 8;
    context.strokeRect(0, 0, canvas.width, canvas.height);

    // Texto "PERIGO" em branco
    context.fillStyle = '#ffffff';
    context.font = 'Bold 80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('⚠️ PERIGO ⚠️', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    this.dangerSprite = new THREE.Sprite(spriteMaterial);
    this.dangerSprite.position.set(0, 3, 2);
    this.dangerSprite.scale.set(6, 1.5, 1);
    this.dangerSprite.visible = false; // Inicialmente invisível
    this.scene.add(this.dangerSprite);
  }

  createDistanceCircles() {
    // Criar círculos de referência a cada 20cm
    const distances = [2, 4, 6, 8, 10]; // em unidades (20cm, 40cm, 60cm, 80cm, 100cm)

    distances.forEach(distance => {
      const circleGeometry = new THREE.RingGeometry(distance - 0.02, distance + 0.02, 64);
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0x303030,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
      });
      const circle = new THREE.Mesh(circleGeometry, circleMaterial);
      circle.rotation.x = -Math.PI / 2;
      circle.position.y = 0.01;
      this.scene.add(circle);
    });
  }

  updateSensorData(center, right, left, hasDanger = false) {
    this.sensorData.center = center || 0;
    this.sensorData.right = right || 0;
    this.sensorData.left = left || 0;

    // Converter cm para unidades do gráfico (1 unidade = 10 cm)
    const centerDist = Math.min(this.sensorData.center * this.scale, this.maxDistance * this.scale);
    const rightDist = Math.min(this.sensorData.right * this.scale, this.maxDistance * this.scale);
    const leftDist = Math.min(this.sensorData.left * this.scale, this.maxDistance * this.scale);

    // Obter rotação atual do AGV (yaw - rotação horizontal)
    const yaw = this.agvAnimation.rotation.y || 0;

    // Dimensões do AGV (para começar sensores nas bordas) - QUADRADO 30x30cm
    const agvWidth = 3.0;   // Largura do AGV (30cm)
    const agvLength = 3.0;  // Comprimento do AGV (30cm)

    // ========== MOSTRAR/OCULTAR ALERTA DE PERIGO ==========
    if (this.dangerSprite) {
      this.dangerSprite.visible = hasDanger;

      // Fazer o texto piscar quando há perigo
      if (hasDanger) {
        const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
        this.dangerSprite.scale.set(6 * pulseScale, 1.5 * pulseScale, 1);
      }
    }

    // ========== ATUALIZAR SENSOR FRONTAL (CENTRO) ==========
    // Offset para começar na frente do AGV
    const frontOffset = agvLength / 2; // 1.25

    // Posição local do sensor (começa na frente do AGV)
    const centerLocalX = 0;
    const centerLocalZ = frontOffset + centerDist / 2; // Começa na borda + metade da distância

    // Converter para coordenadas globais considerando rotação
    const centerWorldX = centerLocalX * Math.cos(yaw) - centerLocalZ * Math.sin(yaw);
    const centerWorldZ = centerLocalX * Math.sin(yaw) + centerLocalZ * Math.cos(yaw);

    // Posicionar raio/beam
    this.centerBeam.position.set(
      centerWorldX,
      0.6,  // Altura ajustada para ficar no nível do corpo do AGV
      centerWorldZ
    );
    this.centerBeam.scale.set(1, centerDist, 1);
    this.centerBeam.rotation.set(Math.PI / 2, 0, 0);
    this.centerBeam.rotation.y = yaw;

    // Posicionar obstáculo (distância completa a partir da frente do AGV)
    const obstacleLocalX = 0;
    const obstacleLocalZ = frontOffset + centerDist;
    const obstacleWorldX = obstacleLocalX * Math.cos(yaw) - obstacleLocalZ * Math.sin(yaw);
    const obstacleWorldZ = obstacleLocalX * Math.sin(yaw) + obstacleLocalZ * Math.cos(yaw);
    this.centerObstacle.position.set(
      obstacleWorldX,
      0.5,
      obstacleWorldZ
    );

    // Tornar invisível se distância muito grande ou zero
    this.centerObstacle.visible = centerDist > 0.5 && centerDist < 10;
    this.centerBeam.visible = centerDist > 0.1;

    // ========== ATUALIZAR SENSOR DIREITA ==========
    // Offset para começar na lateral direita do AGV
    const rightOffset = agvWidth / 2; // 1.75

    // Posição local do sensor (começa na lateral direita)
    const rightLocalX = rightOffset + rightDist / 2;
    const rightLocalZ = 0;

    // Converter para coordenadas globais
    const rightWorldX = rightLocalX * Math.cos(yaw) - rightLocalZ * Math.sin(yaw);
    const rightWorldZ = rightLocalX * Math.sin(yaw) + rightLocalZ * Math.cos(yaw);

    // Posicionar raio/beam
    this.rightBeam.position.set(
      rightWorldX,
      0.6,
      rightWorldZ
    );
    this.rightBeam.scale.set(1, rightDist, 1);
    this.rightBeam.rotation.set(0, 0, -Math.PI / 2);
    this.rightBeam.rotation.y = yaw;

    // Posicionar obstáculo
    const rightObstacleLocalX = rightOffset + rightDist;
    const rightObstacleLocalZ = 0;
    const rightObstacleWorldX = rightObstacleLocalX * Math.cos(yaw) - rightObstacleLocalZ * Math.sin(yaw);
    const rightObstacleWorldZ = rightObstacleLocalX * Math.sin(yaw) + rightObstacleLocalZ * Math.cos(yaw);
    this.rightObstacle.position.set(
      rightObstacleWorldX,
      0.5,
      rightObstacleWorldZ
    );

    // Tornar invisível se distância muito grande ou zero
    this.rightObstacle.visible = rightDist > 0.5 && rightDist < 10;
    this.rightBeam.visible = rightDist > 0.1;

    // ========== ATUALIZAR SENSOR ESQUERDA ==========
    // Offset para começar na lateral esquerda do AGV
    const leftOffset = agvWidth / 2; // 1.75

    // Posição local do sensor (começa na lateral esquerda)
    const leftLocalX = -(leftOffset + leftDist / 2);
    const leftLocalZ = 0;

    // Converter para coordenadas globais
    const leftWorldX = leftLocalX * Math.cos(yaw) - leftLocalZ * Math.sin(yaw);
    const leftWorldZ = leftLocalX * Math.sin(yaw) + leftLocalZ * Math.cos(yaw);

    // Posicionar raio/beam
    this.leftBeam.position.set(
      leftWorldX,
      0.6,
      leftWorldZ
    );
    this.leftBeam.scale.set(1, leftDist, 1);
    this.leftBeam.rotation.set(0, 0, Math.PI / 2);
    this.leftBeam.rotation.y = yaw;

    // Posicionar obstáculo
    const leftObstacleLocalX = -(leftOffset + leftDist);
    const leftObstacleLocalZ = 0;
    const leftObstacleWorldX = leftObstacleLocalX * Math.cos(yaw) - leftObstacleLocalZ * Math.sin(yaw);
    const leftObstacleWorldZ = leftObstacleLocalX * Math.sin(yaw) + leftObstacleLocalZ * Math.cos(yaw);
    this.leftObstacle.position.set(
      leftObstacleWorldX,
      0.5,
      leftObstacleWorldZ
    );

    // Tornar invisível se distância muito grande ou zero
    this.leftObstacle.visible = leftDist > 0.5 && leftDist < 10;
    this.leftBeam.visible = leftDist > 0.1;

    console.log(`[3D VIZ] 📊 Dados atualizados - Centro: ${center} cm | Esquerda: ${right} cm | Direita: ${left} cm`);
  }

  updateIMUData(accel, gyro) {
    // Atualizar dados do IMU
    if (accel) {
      this.imuData.accel.x = accel.x || 0;
      this.imuData.accel.y = accel.y || 0;
      this.imuData.accel.z = accel.z || 0;
    }

    if (gyro) {
      this.imuData.gyro.x = gyro.x || 0;
      this.imuData.gyro.y = gyro.y || 0;
      this.imuData.gyro.z = gyro.z || 0;
    }

    // ========== ROTAÇÃO DO CARRINHO BASEADA NA ORIENTAÇÃO DO ACELERÔMETRO ==========
    // O acelerômetro detecta a gravidade em g (0-1), ou em m/s² (0-10)
    // Z ≈ 1g (ou ~10 m/s²) significa que o acelerômetro está em pé/vertical

    // PITCH (rotação X): Inclinação frente/trás
    // Quando Z = 1 (em pé), Y = 0 → pitch = 0 (carrinho normal)
    // Quando Y = 1 (deitado para frente), Z = 0 → pitch = 90° (carrinho inclinado)
    const pitch = Math.atan2(this.imuData.accel.y, this.imuData.accel.z) * this.imuSensitivity.rotationAccel;

    // ROLL (rotação Z): Inclinação lateral (esquerda/direita)
    // Quando X = 0, Z = 1 → roll = 0 (carrinho normal)
    // Quando X = 1 (inclinado para direita), Z = 0 → roll = 90°
    const roll = Math.atan2(this.imuData.accel.x, this.imuData.accel.z) * this.imuSensitivity.rotationAccel;

    // YAW (rotação Y): Rotação horizontal (curvas)
    // Integrar giroscópio Z para acumular rotação horizontal
    const gyroZtoRad = (this.imuData.gyro.z * Math.PI / 180) * this.imuSensitivity.rotationGyro * 0.016; // ~60fps

    // Atualizar rotações alvo
    this.agvAnimation.targetRotation.x = pitch;
    this.agvAnimation.targetRotation.y = (this.agvAnimation.rotation.y || 0) + gyroZtoRad; // Acumular yaw
    this.agvAnimation.targetRotation.z = roll;

    // ========== PEQUENA VIBRAÇÃO ==========
    // Vibração sutil baseada na aceleração (movimento rápido)
    this.agvAnimation.targetVibration.x = this.imuData.accel.x * this.imuSensitivity.vibration;
    this.agvAnimation.targetVibration.y = Math.abs(this.imuData.accel.y - 1) * this.imuSensitivity.vibration; // -1 pois gravidade é ~1g
    this.agvAnimation.targetVibration.z = this.imuData.accel.z * this.imuSensitivity.vibration;

    console.log(`[3D VIZ] 🎯 IMU atualizado - Accel: (${accel.x.toFixed(2)}, ${accel.y.toFixed(2)}, ${accel.z.toFixed(2)}) | Gyro: (${gyro.x.toFixed(2)}, ${gyro.y.toFixed(2)}, ${gyro.z.toFixed(2)}) | Pitch: ${(pitch * 180 / Math.PI).toFixed(1)}° Roll: ${(roll * 180 / Math.PI).toFixed(1)}°`);
  }

  applyAGVPhysics() {
    // Suavizar animação usando interpolação linear (lerp)
    const smoothing = this.imuSensitivity.smoothing;

    // ========== INTERPOLAR VIBRAÇÃO (SUTIL) ==========
    this.agvAnimation.vibration.x += (this.agvAnimation.targetVibration.x - this.agvAnimation.vibration.x) * smoothing;
    this.agvAnimation.vibration.y += (this.agvAnimation.targetVibration.y - this.agvAnimation.vibration.y) * smoothing;
    this.agvAnimation.vibration.z += (this.agvAnimation.targetVibration.z - this.agvAnimation.vibration.z) * smoothing;

    // ========== INTERPOLAR ROTAÇÕES (PITCH, YAW, ROLL) ==========
    this.agvAnimation.rotation.x += (this.agvAnimation.targetRotation.x - this.agvAnimation.rotation.x) * smoothing;
    this.agvAnimation.rotation.y += (this.agvAnimation.targetRotation.y - this.agvAnimation.rotation.y) * smoothing;
    this.agvAnimation.rotation.z += (this.agvAnimation.targetRotation.z - this.agvAnimation.rotation.z) * smoothing;

    // ========== APLICAR POSIÇÃO FIXA + VIBRAÇÃO SUTIL ==========
    // A posição base é SEMPRE (0, 0.2, 0) - o carrinho NÃO se move
    this.agvBody.position.x = this.agvAnimation.basePosition.x + this.agvAnimation.vibration.x;
    this.agvBody.position.y = this.agvAnimation.basePosition.y + this.agvAnimation.vibration.y;
    this.agvBody.position.z = this.agvAnimation.basePosition.z + this.agvAnimation.vibration.z;

    // ========== APLICAR ROTAÇÃO FINAL ==========
    // A rotação reflete a orientação do acelerômetro
    this.agvBody.rotation.x = this.agvAnimation.baseRotation.x + this.agvAnimation.rotation.x; // PITCH
    this.agvBody.rotation.y = this.agvAnimation.baseRotation.y + this.agvAnimation.rotation.y; // YAW
    this.agvBody.rotation.z = this.agvAnimation.baseRotation.z + this.agvAnimation.rotation.z; // ROLL

    // ========== ATUALIZAR SETA FRONTAL ==========
    // A seta frontal acompanha o carrinho
    this.frontArrow.position.copy(this.agvBody.position);
    this.frontArrow.rotation.copy(this.agvBody.rotation);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Aplicar física/animação do AGV baseada no IMU
    this.applyAGVPhysics();

    // Renderizar cena (sem rotação - câmera fixa)
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }
}

// Exportar para uso global
window.Distance3DVisualization = Distance3DVisualization;
