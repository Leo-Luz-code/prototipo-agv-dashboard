import aedes from 'aedes';
import { createServer } from 'net';
import { updateStatus, getStatusFromAGV } from '../services/agvService.js';
import { getTagInfo } from '../services/rfidService.js';

const broker = aedes();
const port = 1883;

// Criar servidor TCP para o broker MQTT
const server = createServer(broker.handle);

// Inicializar broker com tratamento de erro
server.listen(port, () => {
  console.log(`[BROKER MQTT] 🚀 Broker iniciado na porta ${port}`);
  console.log(`[BROKER MQTT] ✅ Pronto para receber conexões`);
});

// Tratamento de erro de porta em uso
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERRO: A porta ${port} já está em uso!`);
    console.error(`\n📋 Possíveis causas:`);
    console.error(`   1. Já existe uma instância do servidor rodando`);
    console.error(`   2. O Mosquitto ou outro broker MQTT está ativo`);
    console.error(`   3. Uma instância anterior não foi encerrada corretamente`);
    console.error(`\n🔧 Soluções:`);
    console.error(`   • Windows: Abra o Gerenciador de Tarefas e encerre processos "node.exe"`);
    console.error(`   • Ou execute: npx kill-port 1883`);
    console.error(`   • Ou execute: npm run kill-port`);
    console.error(`\nEncerrando o servidor...\n`);
    process.exit(1);
  } else {
    console.error('[BROKER MQTT] ❌ Erro ao iniciar servidor:', err);
    process.exit(1);
  }
});

// Log quando um cliente conecta
broker.on('client', (client) => {
  console.log(`[BROKER MQTT] 📱 Cliente conectado: ${client.id}`);
});

// Log quando um cliente desconecta
broker.on('clientDisconnect', (client) => {
  console.log(`[BROKER MQTT] 📴 Cliente desconectado: ${client.id}`);
});

// Log quando um cliente se inscreve
broker.on('subscribe', (subscriptions, client) => {
  if (client) {
    subscriptions.forEach((sub) => {
      console.log(`[BROKER MQTT] 📬 ${client.id} inscreveu-se em "${sub.topic}"`);
    });
  }
});

// PROCESSAR MENSAGENS DIRETO AQUI!
broker.on('publish', async (packet, client) => {
  if (client) {
    const topic = packet.topic;
    const payload = packet.payload.toString();

    console.log(`[BROKER MQTT] 📨 ${client.id} publicou em "${topic}"`);
    console.log(`[BROKER MQTT] 📦 Payload: ${payload}`);

    // Processar mensagem RFID
    if (topic === 'agv/rfid') {
      try {
        const data = JSON.parse(payload);
        console.log(`[BROKER MQTT] 🏷️ RFID DETECTADO: ${data.tag}`);

        // Buscar informações da tag
        const tagInfo = getTagInfo(data.tag);
        const itemName = tagInfo ? tagInfo.name : null;

        if (itemName) {
          console.log(`[BROKER MQTT] 📦 Item identificado: ${itemName}`);
        } else {
          console.log(`[BROKER MQTT] ⚠️ Tag não cadastrada: ${data.tag}`);
        }

        // Atualizar status com tag e nome do item (se existir)
        updateStatus({
          sensores: {
            rfid: data.tag,
            rfidItemName: itemName,
            rfidTimestamp: data.timestamp || Date.now()
          }
        });

        const fullStatus = getStatusFromAGV();
        console.log(`[BROKER MQTT] 📡 Status atualizado:`, fullStatus);

        // Importar dinamicamente para evitar circular dependency
        const { broadcast } = await import('../services/socketService.js');
        broadcast('agv/status', fullStatus);
        console.log(`[BROKER MQTT] ✅ Tag "${data.tag}" transmitida para dashboard!`);
      } catch (e) {
        console.error('[BROKER MQTT] ❌ Erro ao processar RFID:', e);
      }
    }

    // Processar status do AGV
    if (topic === 'agv/status') {
      try {
        const data = JSON.parse(payload);
        updateStatus(data);
        const fullStatus = getStatusFromAGV();

        const { broadcast } = await import('../services/socketService.js');
        broadcast('agv/status', fullStatus);
      } catch (e) {
        console.error('[BROKER MQTT] ❌ Erro ao processar status:', e);
      }
    }

    // Processar dados de distância dos sensores VL53L0X
    if (topic === 'agv/distance') {
      try {
        const data = JSON.parse(payload);
        console.log(`[BROKER MQTT] 📏 DISTÂNCIA RECEBIDA:`, data);
        console.log(`[BROKER MQTT]   Left: ${data.left} cm`);
        console.log(`[BROKER MQTT]   Center: ${data.center} cm`);
        console.log(`[BROKER MQTT]   Right: ${data.right} cm`);

        // Converte para números e garante valores válidos
        const esquerda = parseFloat(data.left) || 0;
        const centro = parseFloat(data.center) || 0;
        const direita = parseFloat(data.right) || 0;

        console.log(`[BROKER MQTT]   Convertidos - Esq: ${esquerda} | Centro: ${centro} | Dir: ${direita}`);

        // Atualiza os dados de distância no estado
        updateStatus({
          sensores: {
            distancia: {
              esquerda: esquerda,
              centro: centro,
              direita: direita,
              timestamp: data.timestamp || Date.now(),
              unidade: data.unit || "cm"
            }
          }
        });

        // Envia dados de distância para o frontend
        const fullStatus = getStatusFromAGV();
        const distanceData = {
          distancia: fullStatus.sensores.distancia,
          ultimaAtualizacao: fullStatus.ultimaAtualizacao
        };

        console.log(`[BROKER MQTT] 📡 Enviando para frontend:`, JSON.stringify(distanceData));

        const { broadcast } = await import('../services/socketService.js');
        broadcast('agv/distance', distanceData);
        console.log(`[BROKER MQTT] ✅ Dados de distância transmitidos via Socket.IO!`);
      } catch (e) {
        console.error('[BROKER MQTT] ❌ Erro ao processar distância:', e);
      }
    }

    // Processar dados IMU (MPU6050)
    if (topic === 'agv/imu') {
      try {
        const data = JSON.parse(payload);
        console.log(`[BROKER MQTT] 📐 IMU: Accel(${data.accel.x.toFixed(2)}, ${data.accel.y.toFixed(2)}, ${data.accel.z.toFixed(2)})`);

        updateStatus({
          sensores: {
            imu: {
              accel: data.accel,
              gyro: data.gyro,
              temp: data.temp,
              timestamp: data.timestamp || Date.now()
            }
          }
        });

        const fullStatus = getStatusFromAGV();
        const { broadcast } = await import('../services/socketService.js');
        broadcast('agv/imu', fullStatus.sensores.imu);
        console.log('[BROKER MQTT] ✅ Dados IMU transmitidos!');
      } catch (e) {
        console.error('[BROKER MQTT] ❌ Erro ao processar IMU:', e);
      }
    }
  }
});

// Log de erros
broker.on('error', (error) => {
  console.error('[BROKER MQTT] ❌ Erro:', error);
});

export default broker;
