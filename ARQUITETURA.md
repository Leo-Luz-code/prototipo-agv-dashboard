# 🏗️ Arquitetura do Sistema AGV Dashboard

## 📐 Visão Geral

```
┌────────────────────────────────────────────────────┐
│  FRONTEND (Browser)                                │
│  • HTML/CSS/JS + Socket.IO Client                 │
│  • Visualização em tempo real                     │
└──────────────────┬─────────────────────────────────┘
                   │ WebSocket (Socket.IO)
                   │
┌──────────────────▼─────────────────────────────────┐
│  BACKEND (Node.js)                                 │
│  • Express REST API (porta 3000)                  │
│  • Broker MQTT Aedes (porta 1883)                │
│  • Gerenciamento de Estado (agvService)          │
│  • Banco de dados JSON (RFID tags)               │
└──────────────────┬─────────────────────────────────┘
                   │ MQTT
                   │
┌──────────────────▼─────────────────────────────────┐
│  HARDWARE (Raspberry Pi Pico W)                    │
│  • RFID Reader (MFRC522)                          │
│  • 3x Sensores de Distância (VL53L0X)            │
│  • Multiplexador I2C (TCA9548A)                   │
└────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Diretórios

```
prototipo-agv-dashboard/
├── server.js                    # Ponto de entrada Node.js
├── data/                        # Persistência de dados
│   └── rfid-tags.json          # Banco de tags RFID
│
├── src/
│   ├── config/                  # Configurações
│   │   ├── mqttBroker.js       # Broker MQTT (Aedes)
│   │   └── serverConfig.js     # Config do servidor
│   │
│   ├── services/                # Lógica de negócio
│   │   ├── agvService.js       # ⭐ Estado global do AGV
│   │   ├── rfidService.js      # CRUD de tags RFID
│   │   └── socketService.js    # Broadcast WebSocket
│   │
│   ├── controllers/             # Endpoints
│   │   ├── dataController.js   # GET /api/status
│   │   └── routeController.js  # POST /api/route
│   │
│   ├── routes/                  # Roteamento
│   │   ├── index.js            # Rotas principais
│   │   └── rfidRoutes.js       # Rotas RFID
│   │
│   ├── models/                  # Modelos de dados
│   │   └── mapModel.js         # Grafo + comandos
│   │
│   └── views/                   # Frontend
│       ├── index.html          # Dashboard principal
│       ├── rfid.html           # Gerenciamento RFID
│       ├── sensors.html        # Monitor de sensores
│       └── js/
│           ├── script.js       # Lógica dashboard
│           ├── rfidManager.js  # Lógica RFID
│           └── sensors.js      # Lógica sensores
│
└── Hardware_Layer/
    ├── main.c                   # Firmware principal
    ├── config.h                 # WiFi, MQTT, pinagem
    └── lib/
        ├── mfrc522.h/c         # Driver RFID
        └── vl53l0x/            # Driver distância
```

---

## 🔄 Fluxo de Dados

### Tópicos MQTT (Hardware → Backend)

| Tópico | Payload | Propósito |
|--------|---------|-----------|
| `agv/rfid` | `{tag, timestamp}` | Detecção de tag RFID |
| `agv/distance` | `{left, center, right, unit}` | Leitura de distância |
| `agv/status` | `{posicao, bateria, sensores}` | Status completo |

### Eventos Socket.IO (Backend → Frontend)

| Evento | Dados | Onde é usado |
|--------|-------|--------------|
| `agv/status` | Estado completo | Todas as páginas |
| `agv/rfid/update` | Dados RFID | rfid.html |
| `agv/distance` | Distâncias | sensors.html |

### Endpoints REST API

```
GET  /api/status              # Estado atual
POST /api/route               # Calcular rota
GET  /api/rfid/tags           # Listar tags
POST /api/rfid/tags           # Criar tag
PUT  /api/rfid/tags/:id       # Editar tag
DELETE /api/rfid/tags/:id     # Deletar tag
```

---

## ➕ Como Adicionar um Novo Sensor

### Exemplo: Sensor de Temperatura DHT22

#### 1️⃣ **HARDWARE LAYER** (`Hardware_Layer/`)

**a) Adicionar no `config.h`:**
```c
// ========== PINAGEM TEMPERATURA ==========
#define DHT22_PIN           22   // GPIO22

// ========== TÓPICOS MQTT ==========
#define MQTT_TOPIC_TEMP     "agv/temperature"
```

**b) Criar driver `lib/dht22.h` e `lib/dht22.c`:**
```c
float dht22_read_temperature(void);
float dht22_read_humidity(void);
```

**c) Atualizar `main.c`:**
```c
#include "dht22.h"

// Variáveis globais
float temperatura = 0.0;
float umidade = 0.0;

// No loop principal
void read_temperature_sensor(void) {
    temperatura = dht22_read_temperature();
    umidade = dht22_read_humidity();
}

void publish_temperature_data(void) {
    char payload[128];
    snprintf(payload, sizeof(payload),
             "{\"temp\":%.1f,\"humidity\":%.1f,\"timestamp\":%lu}",
             temperatura, umidade, timestamp);

    mqtt_publish(mqtt_client, MQTT_TOPIC_TEMP, payload, strlen(payload),
                1, 0, mqtt_pub_request_cb, NULL);
}

// No while(1)
if (mqtt_connected && absolute_time_diff_us(last_temp_publish, now) > 5000000) {
    read_temperature_sensor();
    publish_temperature_data();
    last_temp_publish = now;
}
```

---

#### 2️⃣ **BACKEND** (`src/`)

**a) Atualizar `agvService.js` - Adicionar campo de estado:**
```javascript
let agvStatus = {
  posicao: "Branco",
  bateria: 100,
  sensores: {
    rfid: "Nenhuma",
    distancia: { esquerda: 0, centro: 0, direita: 0 },
    temperatura: { temp: 0, humidity: 0 }  // ⬅️ NOVO
  }
};
```

**b) Atualizar `mqttBroker.js` - Processar mensagens:**
```javascript
// Adicionar depois da linha 161
if (topic === 'agv/temperature') {
  try {
    const data = JSON.parse(payload);
    console.log(`[BROKER MQTT] 🌡️ TEMPERATURA: ${data.temp}°C | Umidade: ${data.humidity}%`);

    updateStatus({
      sensores: {
        temperatura: {
          temp: parseFloat(data.temp) || 0,
          humidity: parseFloat(data.humidity) || 0,
          timestamp: data.timestamp || Date.now()
        }
      }
    });

    const fullStatus = getStatusFromAGV();
    const { broadcast } = await import('../services/socketService.js');
    broadcast('agv/temperature', fullStatus.sensores.temperatura);
    console.log('[BROKER MQTT] ✅ Temperatura transmitida!');
  } catch (e) {
    console.error('[BROKER MQTT] ❌ Erro ao processar temperatura:', e);
  }
}
```

**c) Criar `routes/temperatureRoutes.js` (se precisar de REST API):**
```javascript
import express from 'express';
const router = express.Router();

// GET /api/temperature - Obter temperatura atual
router.get('/', (req, res) => {
  const status = getStatusFromAGV();
  res.json({
    success: true,
    data: status.sensores.temperatura
  });
});

export default router;
```

**d) Registrar rota no `server.js`:**
```javascript
import temperatureRoutes from './src/routes/temperatureRoutes.js';
app.use('/api/temperature', temperatureRoutes);
```

---

#### 3️⃣ **FRONTEND** (`src/views/`)

**a) Criar página `temperature.html` (ou adicionar em `sensors.html`):**
```html
<div id="temperature-card" class="info-card">
  <h3>🌡️ Sensor de Temperatura</h3>
  <div class="sensor-reading">
    <span>Temperatura:</span>
    <p id="temp-value" class="value">--°C</p>
  </div>
  <div class="sensor-reading">
    <span>Umidade:</span>
    <p id="humidity-value" class="value">--%</p>
  </div>
</div>
```

**b) Criar `js/temperatureManager.js`:**
```javascript
document.addEventListener("DOMContentLoaded", () => {
  const tempElement = document.getElementById("temp-value");
  const humidityElement = document.getElementById("humidity-value");

  // Inicializar Socket.IO
  const socket = io();

  // Listener para temperatura
  socket.on("agv/temperature", (data) => {
    console.log("[TEMP] Dados recebidos:", data);
    tempElement.textContent = `${data.temp.toFixed(1)}°C`;
    humidityElement.textContent = `${data.humidity.toFixed(1)}%`;

    // Alertas
    if (data.temp > 40) {
      tempElement.style.color = "var(--danger-color)";
    } else {
      tempElement.style.color = "var(--success-color)";
    }
  });

  // Também ouve no agv/status
  socket.on("agv/status", (status) => {
    const temp = status.sensores?.temperatura;
    if (temp) {
      tempElement.textContent = `${temp.temp.toFixed(1)}°C`;
      humidityElement.textContent = `${temp.humidity.toFixed(1)}%`;
    }
  });
});
```

**c) Incluir script no HTML:**
```html
<script src="/socket.io/socket.io.js"></script>
<script src="js/temperatureManager.js"></script>
```

---

## 📋 Checklist para Novo Sensor

### Hardware Layer
- [ ] Adicionar pinagem em `config.h`
- [ ] Criar driver do sensor em `lib/`
- [ ] Adicionar variáveis globais no `main.c`
- [ ] Implementar função `read_SENSOR()`
- [ ] Implementar função `publish_SENSOR_data()`
- [ ] Adicionar no loop principal com intervalo adequado
- [ ] Definir tópico MQTT em `config.h`

### Backend
- [ ] Atualizar `agvService.js` com novo campo em `sensores`
- [ ] Adicionar handler em `mqttBroker.js` para processar mensagem
- [ ] Criar `routes/sensorRoutes.js` se precisar de REST API
- [ ] Registrar rota em `server.js`
- [ ] Adicionar broadcast Socket.IO com evento específico

### Frontend
- [ ] Criar/atualizar HTML com elementos para exibir dados
- [ ] Criar `js/sensorManager.js` com listener Socket.IO
- [ ] Adicionar estilo CSS para visualização
- [ ] Incluir scripts no HTML
- [ ] Adicionar link no drawer (menu lateral) se necessário

---

## 🎯 Padrões a Seguir

### 1. **Nomenclatura**
```javascript
// Tópicos MQTT: agv/nome-do-sensor
"agv/rfid"
"agv/distance"
"agv/temperature"

// Eventos Socket.IO: agv/nome-do-sensor
socket.on("agv/rfid", ...)
socket.emit("agv/distance", ...)

// Arquivos: nomeDoSensor + tipo
temperatureService.js
temperatureRoutes.js
temperatureManager.js
```

### 2. **Logging Consistente**
```javascript
// Backend
console.log(`[BROKER MQTT] 🌡️ TEMPERATURA: ${data.temp}°C`);
console.log(`[SENSOR SERVICE] ✅ Dados processados`);
console.error(`[TEMP ROUTES] ❌ Erro:`, error);

// Frontend
console.log("[TEMP MANAGER] 📡 Dados recebidos:", data);
console.log("[TEMP MANAGER] ✅ Elementos atualizados");
```

### 3. **Estrutura de Payload MQTT**
```json
{
  "value": 25.5,
  "unit": "°C",
  "timestamp": 1234567890,
  "reader": "PicoW"
}
```

### 4. **Tratamento de Erro**
```javascript
// Sempre validar e fornecer fallback
const temp = parseFloat(data.temp) || 0;
const sensorData = status.sensores?.temperatura || { temp: 0, humidity: 0 };
```

### 5. **Estado Centralizado**
- **NUNCA** armazenar estado em múltiplos lugares
- **SEMPRE** usar `agvService.js` como fonte única da verdade
- **SEMPRE** usar `updateStatus()` para modificar estado

---

## 🚀 Exemplo Completo: Sensor GPS

### Hardware (`main.c`)
```c
void publish_gps_data(void) {
    char payload[256];
    snprintf(payload, sizeof(payload),
             "{\"lat\":%.6f,\"lon\":%.6f,\"speed\":%.1f,\"timestamp\":%lu}",
             gps_latitude, gps_longitude, gps_speed, timestamp);
    mqtt_publish(mqtt_client, "agv/gps", payload, strlen(payload), 1, 0, NULL, NULL);
}
```

### Backend (`mqttBroker.js`)
```javascript
if (topic === 'agv/gps') {
  const data = JSON.parse(payload);
  updateStatus({
    sensores: {
      gps: { lat: data.lat, lon: data.lon, speed: data.speed }
    }
  });
  broadcast('agv/gps', getStatusFromAGV().sensores.gps);
}
```

### Frontend (`gpsManager.js`)
```javascript
socket.on("agv/gps", (data) => {
  document.getElementById("gps-lat").textContent = data.lat.toFixed(6);
  document.getElementById("gps-lon").textContent = data.lon.toFixed(6);
  updateMapMarker(data.lat, data.lon); // Atualiza mapa
});
```

---

## 📊 Hierarquia de Comunicação

```
Sensor → MQTT Publish → Broker MQTT → mqttBroker.js →
→ agvService.updateStatus() → socketService.broadcast() →
→ Frontend Socket.IO Listener → Atualização UI
```

**Tempo total de latência:** ~50-200ms

---

## 🔧 Ferramentas de Debug

1. **Hardware:** Monitor Serial do Pico W
2. **MQTT:** Logs no `mqttBroker.js`
3. **Backend:** `console.log` nos services
4. **Frontend:** DevTools Console (F12)

---

## 📝 Notas Importantes

- **Não duplicar lógica:** Use funções compartilhadas
- **Intervalo de publicação:** RFID (sob demanda), Distância (1s), Status (30s)
- **QoS MQTT:** Use QoS 1 para dados críticos
- **Socket.IO broadcast:** Envia para TODOS os clientes conectados
- **Persistência:** Use JSON para dados simples, SQLite para dados complexos

---

**Última atualização:** 2025-10-29
**Versão:** 1.0
