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

    // Escala: 1 unidade = 10 cm (para visualização mais compacta)
    this.scale = 0.1;
    this.maxDistance = 100; // 100 cm = 10 unidades no gráfico

    this.init();
    this.createScene();
    this.animate();

    console.log('[3D VIZ] ✅ Visualização 3D inicializada');
  }

  init() {
    // Criar cena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e14);

    // Configurar câmera FIXA - Visão de cima/trás do AGV
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);

    // Câmera posicionada atrás e acima do AGV, olhando para frente
    this.camera.position.set(0, 12, -8);
    this.camera.lookAt(0, 0, 5);

    // Criar renderizador
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Iluminação mais forte
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(0, 20, 0);
    this.scene.add(directionalLight);

    // Listener para redimensionamento
    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  createScene() {
    // ========== CRIAR AGV NO CENTRO ==========
    // Corpo do AGV (caixa retangular)
    const agvBodyGeometry = new THREE.BoxGeometry(1.5, 0.4, 1);
    const agvBodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x36d1dc,
      emissive: 0x36d1dc,
      emissiveIntensity: 0.2
    });
    this.agvBody = new THREE.Mesh(agvBodyGeometry, agvBodyMaterial);
    this.agvBody.position.y = 0.2;
    this.scene.add(this.agvBody);

    // Seta indicando a FRENTE do AGV
    const arrowLength = 1.2;
    const arrowDir = new THREE.Vector3(0, 0, 1).normalize();
    const arrowOrigin = new THREE.Vector3(0, 0.5, 0);
    const arrowColor = 0xffff00;
    this.frontArrow = new THREE.ArrowHelper(arrowDir, arrowOrigin, arrowLength, arrowColor, 0.4, 0.3);
    this.scene.add(this.frontArrow);

    // ========== CRIAR CHÃO/GRID ==========
    const gridSize = 30;
    const gridDivisions = 30;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x404040, 0x202020);
    this.scene.add(gridHelper);

    // Linhas de referência de distância (círculos concêntricos)
    this.createDistanceCircles();

    // ========== CRIAR RAIOS/BEAMS DOS SENSORES ==========

    // Raio do sensor FRONTAL/CENTRO (Vermelho)
    const centerBeamGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    const centerBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.6
    });
    this.centerBeam = new THREE.Mesh(centerBeamGeometry, centerBeamMaterial);
    this.centerBeam.rotation.x = Math.PI / 2;
    this.scene.add(this.centerBeam);

    // Obstáculo detectado pelo sensor frontal
    const centerObstacleGeometry = new THREE.BoxGeometry(0.8, 1, 0.3);
    const centerObstacleMaterial = new THREE.MeshPhongMaterial({
      color: 0xff4444,
      emissive: 0xff4444,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.7
    });
    this.centerObstacle = new THREE.Mesh(centerObstacleGeometry, centerObstacleMaterial);
    this.centerObstacle.position.y = 0.5;
    this.scene.add(this.centerObstacle);

    // Raio do sensor DIREITA (Verde)
    const rightBeamGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    const rightBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0x44ff44,
      transparent: true,
      opacity: 0.6
    });
    this.rightBeam = new THREE.Mesh(rightBeamGeometry, rightBeamMaterial);
    this.rightBeam.rotation.z = -Math.PI / 2;
    this.scene.add(this.rightBeam);

    // Obstáculo detectado pelo sensor direito
    const rightObstacleGeometry = new THREE.BoxGeometry(0.3, 1, 0.8);
    const rightObstacleMaterial = new THREE.MeshPhongMaterial({
      color: 0x44ff44,
      emissive: 0x44ff44,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.7
    });
    this.rightObstacle = new THREE.Mesh(rightObstacleGeometry, rightObstacleMaterial);
    this.rightObstacle.position.y = 0.5;
    this.scene.add(this.rightObstacle);

    // Raio do sensor ESQUERDA (Azul)
    const leftBeamGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    const leftBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0x4444ff,
      transparent: true,
      opacity: 0.6
    });
    this.leftBeam = new THREE.Mesh(leftBeamGeometry, leftBeamMaterial);
    this.leftBeam.rotation.z = Math.PI / 2;
    this.scene.add(this.leftBeam);

    // Obstáculo detectado pelo sensor esquerdo
    const leftObstacleGeometry = new THREE.BoxGeometry(0.3, 1, 0.8);
    const leftObstacleMaterial = new THREE.MeshPhongMaterial({
      color: 0x4444ff,
      emissive: 0x4444ff,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.7
    });
    this.leftObstacle = new THREE.Mesh(leftObstacleGeometry, leftObstacleMaterial);
    this.leftObstacle.position.y = 0.5;
    this.scene.add(this.leftObstacle);

    // SEM rotação automática
    this.autoRotate = false;
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

  updateSensorData(center, right, left) {
    this.sensorData.center = center || 0;
    this.sensorData.right = right || 0;
    this.sensorData.left = left || 0;

    // Converter cm para unidades do gráfico (1 unidade = 10 cm)
    const centerDist = Math.min(this.sensorData.center * this.scale, this.maxDistance * this.scale);
    const rightDist = Math.min(this.sensorData.right * this.scale, this.maxDistance * this.scale);
    const leftDist = Math.min(this.sensorData.left * this.scale, this.maxDistance * this.scale);

    // ========== ATUALIZAR SENSOR FRONTAL (CENTRO) ==========
    // Posicionar raio/beam
    this.centerBeam.position.set(0, 0.2, centerDist / 2);
    this.centerBeam.scale.set(1, centerDist, 1);

    // Posicionar obstáculo
    this.centerObstacle.position.set(0, 0.5, centerDist);

    // Tornar invisível se distância muito grande ou zero
    this.centerObstacle.visible = centerDist > 0.5 && centerDist < 10;
    this.centerBeam.visible = centerDist > 0.1;

    // ========== ATUALIZAR SENSOR DIREITA ==========
    // Posicionar raio/beam
    this.rightBeam.position.set(rightDist / 2, 0.2, 0);
    this.rightBeam.scale.set(1, rightDist, 1);

    // Posicionar obstáculo
    this.rightObstacle.position.set(rightDist, 0.5, 0);

    // Tornar invisível se distância muito grande ou zero
    this.rightObstacle.visible = rightDist > 0.5 && rightDist < 10;
    this.rightBeam.visible = rightDist > 0.1;

    // ========== ATUALIZAR SENSOR ESQUERDA ==========
    // Posicionar raio/beam
    this.leftBeam.position.set(-leftDist / 2, 0.2, 0);
    this.leftBeam.scale.set(1, leftDist, 1);

    // Posicionar obstáculo
    this.leftObstacle.position.set(-leftDist, 0.5, 0);

    // Tornar invisível se distância muito grande ou zero
    this.leftObstacle.visible = leftDist > 0.5 && leftDist < 10;
    this.leftBeam.visible = leftDist > 0.1;

    console.log(`[3D VIZ] 📊 Dados atualizados - Centro: ${center} cm | Direita: ${right} cm | Esquerda: ${left} cm`);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

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
