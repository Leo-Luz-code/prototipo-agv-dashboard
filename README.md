# 🤖 Sistema AGV com Leitor RFID

Dashboard web em tempo real para controle de AGV (Automated Guided Vehicle) com integração RFID usando Raspberry Pi Pico W.

![Status](https://img.shields.io/badge/status-active-success.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 🎯 Funcionalidades

✅ **Dashboard Web Responsivo**
- Visualização em tempo real da posição do AGV
- Monitoramento de bateria
- Detecção de tags RFID ao vivo
- Controle de rotas e tarefas

✅ **Leitor RFID (Pico W + MFRC522)**
- Detecção automática de tags
- Publicação via MQTT em tempo real
- Identificação de itens cadastrados

✅ **Gerenciamento de Tags RFID**
- Cadastro de tags com nomes de itens
- Edição e exclusão de registros
- Interface visual com notificações

✅ **Comunicação MQTT**
- Broker MQTT embutido (sem necessidade de Mosquitto)
- WebSocket para atualização em tempo real
- QoS 1 para garantia de entrega

---

## 📚 Documentação

### Início Rápido
- **[TUTORIAL_RAPIDO.md](TUTORIAL_RAPIDO.md)** - Guia completo passo a passo
- **[COMANDOS.md](COMANDOS.md)** - Comandos diretos para copiar e colar
- **[SETUP_PICO_SDK.md](SETUP_PICO_SDK.md)** - Instalação do Pico SDK

### Arquivos Adicionais
- **[COMO_INICIAR_MQTT.md](COMO_INICIAR_MQTT.md)** - Guia do broker MQTT embutido
- **[INICIAR_AGORA.md](INICIAR_AGORA.md)** - Guia rápido de inicialização

---

## 🚀 Quick Start

### 1️⃣ Backend
```bash
npm install
npm start
```
Acesse: http://localhost:3000

### 2️⃣ Pico W (RFID)
```bash
# Edite RFID/main_mqtt.c (linhas 20-24)
# Configure: WIFI_SSID, WIFI_PASSWORD, MQTT_BROKER_IP

cd RFID/build
cmake ..
make

# Grave RFID.uf2 no Pico W (modo BOOTSEL)
```

### 3️⃣ Conectar Hardware
```
MFRC522 → Pico W
VCC     → 3.3V
GND     → GND
MISO    → GP4
MOSI    → GP3
SCK     → GP2
CS      → GP5
RST     → GP0
```

---

## 🏗️ Arquitetura

```
┌─────────────────┐
│  Dashboard Web  │ ← WebSocket em tempo real
│  (React/HTML)   │
└────────┬────────┘
         │
┌────────▼────────┐
│  Node.js Server │
│  + Broker MQTT  │
│  + Socket.IO    │
└────────┬────────┘
         │ MQTT
┌────────▼────────┐
│  Pico W + RFID  │ ← Detecta tags e publica
│    (MFRC522)    │
└─────────────────┘
```

---

## 🛠️ Tecnologias

### Backend
- **Node.js** - Servidor principal
- **Express** - Framework web
- **Aedes** - Broker MQTT embutido
- **Socket.IO** - WebSocket para tempo real
- **MQTT.js** - Cliente MQTT

### Frontend
- **HTML5/CSS3/JavaScript** - Interface web
- **Socket.IO Client** - Comunicação em tempo real
- **Fetch API** - Requisições HTTP

### Hardware
- **Raspberry Pi Pico W** - Microcontrolador WiFi
- **MFRC522** - Módulo leitor RFID
- **Pico SDK** - Framework de desenvolvimento
- **LWIP** - Pilha TCP/IP

---

## 📦 Estrutura do Projeto

```
prototipo-agv-dashboard/
├── server.js                    # Servidor principal
├── package.json                 # Dependências Node.js
│
├── src/
│   ├── config/
│   │   ├── mqttBroker.js       # Broker MQTT embutido
│   │   └── mqttConfig.js       # Cliente MQTT
│   │
│   ├── controllers/
│   │   ├── mqttController.js   # Controlador MQTT
│   │   └── routeController.js  # Cálculo de rotas
│   │
│   ├── services/
│   │   ├── agvService.js       # Lógica de negócio AGV
│   │   ├── rfidService.js      # CRUD de tags RFID
│   │   └── socketService.js    # WebSocket
│   │
│   ├── routes/
│   │   ├── index.js            # Rotas principais
│   │   └── rfidRoutes.js       # API RFID
│   │
│   └── views/
│       ├── index.html          # Dashboard
│       ├── css/style.css       # Estilos
│       └── js/
│           ├── script.js       # Lógica principal
│           └── rfidManager.js  # Gerenciador de tags
│
├── RFID/                        # Firmware Pico W
│   ├── main_mqtt.c             # Código principal
│   ├── lib/
│   │   ├── mfrc522.c           # Driver RFID
│   │   └── lwipopts.h          # Config LWIP
│   └── build/
│       └── RFID.uf2            # Firmware compilado
│
└── data/
    └── rfid-tags.json          # Banco de dados de tags
```

---

## 🔧 Configuração

### Variáveis de Ambiente (Backend)
```javascript
// src/config/serverConfig.js
port: 3000              // Porta do servidor
mqttPort: 1883          // Porta do broker MQTT
```

### Configuração Pico W
```c
// RFID/main_mqtt.c
#define WIFI_SSID       "sua_rede"
#define WIFI_PASSWORD   "sua_senha"
#define MQTT_BROKER_IP  "192.168.0.xxx"
```

---

## 🎮 Como Usar

### 1. Cadastrar Tag RFID
1. Abra http://localhost:3000
2. Aproxime uma tag do leitor
3. Copie o ID que aparece (ex: `91B657A4`)
4. No campo "ID da Tag", cole o ID
5. Em "Nome do Item", digite: `Caixa de Peças`
6. Clique "Cadastrar Tag"

### 2. Testar Detecção
1. Aproxime a tag cadastrada do leitor
2. Na interface deve aparecer:
   - Tag: `91B657A4`
   - 📦 `Caixa de Peças` (em verde)

### 3. Controlar AGV
1. Selecione ponto de início
2. Selecione ponto de destino
3. Clique "Enviar Tarefa"
4. Acompanhe a rota no mapa

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Tag não aparece | Verifique conexões hardware e logs do console |
| Pico W não conecta ao WiFi | Rede deve ser 2.4GHz, verifique SSID/senha |
| `ERR_CONNECTION_REFUSED` | Reinicie o servidor Node.js |
| Tag não cadastra | Verifique console (F12) para erros |

---

## 📊 API Endpoints

### Status AGV
```http
GET /api/status
```

### Calcular Rota
```http
POST /api/route
Content-Type: application/json

{
  "inicio": "Branco",
  "destino": "Vermelho"
}
```

### Gerenciamento RFID
```http
GET    /api/rfid/tags              # Listar todas
GET    /api/rfid/tags/:tagId       # Buscar por ID
POST   /api/rfid/tags              # Cadastrar
PUT    /api/rfid/tags/:tagId       # Renomear
DELETE /api/rfid/tags/:tagId       # Deletar
```

---

## 📝 Tópicos MQTT

| Tópico | Direção | Descrição |
|--------|---------|-----------|
| `agv/rfid` | Pico W → Backend | Leituras de tags RFID |
| `agv/status` | AGV → Backend | Status do veículo |
| `agv/commands` | Backend → AGV | Comandos de controle |
| `agv/sensors/rfid/status` | Pico W → Backend | Status do leitor |

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/MinhaFeature`
3. Commit: `git commit -m 'Add: nova funcionalidade'`
4. Push: `git push origin feature/MinhaFeature`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT.

---

## 👨‍💻 Autor

**Leonardo**

---

## 🙏 Agradecimentos

- Raspberry Pi Foundation (Pico SDK)
- MQTT.js
- Aedes MQTT Broker
- Socket.IO

---

**⭐ Se este projeto te ajudou, deixe uma estrela!**
