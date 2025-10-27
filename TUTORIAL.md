# 🚀 Tutorial - Como Rodar o Projeto

## 📋 Requisitos
- Node.js instalado
- Pico SDK instalado (para compilar código do Pico W)
- Leitor RFID MFRC522 conectado ao Pico W

---

## 🔧 PASSO 1: Configurar Código do Pico W

### 1.1 Descobrir IP do seu computador
Abra o terminal e digite:
```bash
ipconfig
```
Anote o **IPv4** (exemplo: `192.168.0.103`)

### 1.2 Editar credenciais WiFi e IP
Abra o arquivo: `RFID/main_mqtt.c`

**Altere as linhas 20-24:**
```c
#define WIFI_SSID       "NOME_DA_SUA_REDE"     // ⚠️ Coloque o nome da sua WiFi
#define WIFI_PASSWORD   "SENHA_DA_SUA_REDE"    // ⚠️ Coloque a senha da WiFi
#define MQTT_BROKER_IP  "192.168.0.103"        // ⚠️ Coloque o IP que você anotou
```

### 1.3 Compilar código do Pico W
```bash
cd RFID
mkdir build
cd build
cmake ..
make
```

O arquivo `RFID.uf2` será gerado em `RFID/build/`

### 1.4 Gravar no Pico W
1. **Desconecte** o Pico W do USB
2. **Segure o botão BOOTSEL** no Pico W
3. **Conecte o USB** (continue segurando BOOTSEL)
4. **Solte o botão** - aparecerá uma unidade chamada `RPI-RP2`
5. **Arraste o arquivo** `RFID.uf2` para dentro da unidade
6. **Aguarde** - o Pico W vai reiniciar automaticamente

✅ Pico W programado!

---

## 📡 PASSO 2: Broker MQTT (Já está embutido!)

**⚠️ IMPORTANTE:** Este projeto JÁ TEM um broker MQTT embutido!

Você **NÃO precisa instalar Mosquitto**. O broker inicia automaticamente junto com o backend.

### Se quiser usar Mosquitto (opcional):

#### 2.1 Baixar Mosquitto
Download: https://mosquitto.org/download/

**Windows:** Baixe o instalador `.exe`

#### 2.2 Instalar
Execute o instalador e instale em: `C:\Program Files\mosquitto`

#### 2.3 Iniciar Mosquitto
Abra o **Terminal 1:**
```bash
cd "C:\Program Files\mosquitto"
mosquitto -v
```

**Deve aparecer:**
```
1234567890: mosquitto version 2.x.x starting
1234567890: Opening ipv4 listen socket on port 1883.
1234567890: mosquitto running
```

✅ Mosquitto rodando na porta 1883!

#### 2.4 Desabilitar broker embutido
Edite `server.js` e comente a linha:
```javascript
// import "./src/config/mqttBroker.js";  // ← Comente esta linha
```

**DEIXE ESTE TERMINAL ABERTO!**

---

## 🖥️ PASSO 3: Iniciar o Backend

### Terminal 2: Backend Node.js

```bash
# Navegar até a pasta do projeto
cd prototipo-agv-dashboard

# Instalar dependências (só precisa fazer 1 vez)
npm install

# Iniciar servidor
npm start
```

**Deve aparecer:**
```
[SERVER] Rodando na porta 3000
[BROKER MQTT] 🚀 Broker iniciado na porta 1883
[MQTT CLIENT] ✅ Conectado ao broker local
```

✅ Backend rodando!

**DEIXE ESTE TERMINAL ABERTO!**

---

## 🌐 PASSO 4: Abrir o Dashboard

Abra o navegador e acesse:
```
http://localhost:3000
```

✅ Dashboard aberto!

---

## 📡 PASSO 5: Verificar Conexão do Pico W

No terminal do backend deve aparecer:
```
[BROKER MQTT] 📱 Cliente conectado: PicoW-RFID-Reader
[BROKER MQTT] 📨 PicoW-RFID-Reader publicou em "agv/sensors/rfid/status"
```

✅ Pico W conectado e enviando dados!

---

## 🏷️ PASSO 6: Testar Detecção de Tag RFID

### 6.1 Aproxime uma tag do leitor

No **terminal do backend** deve aparecer:
```
[BROKER MQTT] 📨 PicoW-RFID-Reader publicou em "agv/rfid"
[BROKER MQTT] 🏷️ RFID DETECTADO: 91B657A4
[BROKER MQTT] ⚠️ Tag não cadastrada: 91B657A4
```

No **dashboard do navegador** a seção "Carga Atual (RFID)" deve atualizar para:
```
91B657A4
⚠️ Tag não cadastrada
```

✅ Detecção funcionando em tempo real!

### 6.2 Cadastrar a tag

1. No dashboard, role até **"Gerenciamento de Tags RFID"**
2. No campo **"ID da Tag"**, cole: `91B657A4` (o ID que apareceu)
3. No campo **"Nome do Item"**, digite: `Caixa de Peças`
4. Clique em **"Cadastrar Tag"**

**Deve aparecer notificação:** "Tag cadastrada com sucesso!"

### 6.3 Teste novamente

**Aproxime a tag novamente** do leitor.

Agora deve aparecer:
```
91B657A4
📦 Caixa de Peças
```

✅ Item identificado com sucesso!

---

## 📝 Resumo dos Terminais Abertos

**Se usar broker embutido (padrão):**
- **Terminal 1:** Backend (`npm start`)

**Se usar Mosquitto:**
- **Terminal 1:** Mosquitto (`mosquitto -v`)
- **Terminal 2:** Backend (`npm start`)

---

## 🔌 Conexões Hardware (MFRC522 → Pico W)

```
MFRC522          Pico W
───────────────────────
VCC       →      3.3V
GND       →      GND
MISO      →      GP4
MOSI      →      GP3
SCK       →      GP2
CS        →      GP5
RST       →      GP0
```
