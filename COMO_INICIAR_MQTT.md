# 🚀 Como Iniciar o Sistema MQTT + RFID

Guia rápido para colocar tudo funcionando!

---

## 📋 Checklist Antes de Começar

- [ ] Mosquitto instalado
- [ ] Código do Pico W compilado e gravado
- [ ] WiFi e IP do broker configurados no `main_mqtt.c`
- [ ] Backend modificado (já feito! ✅)

---

## 🔥 Passo a Passo de Inicialização

### **1️⃣ Abra 3 Terminais**

Você vai precisar de 3 terminais abertos ao mesmo tempo:
- Terminal 1: Broker MQTT
- Terminal 2: Backend Node.js
- Terminal 3: Monitorar mensagens (opcional)

---

### **2️⃣ Terminal 1 - Iniciar Broker MQTT**

```bash
# Navegue até qualquer pasta e execute:
mo
```

**O que você verá:**
```
1234567890: mosquitto version 2.0.18 starting
1234567890: Opening ipv4 listen socket on port 1883.
1234567890: mosquitto version 2.0.18 running
```

✅ **Deixe este terminal aberto!**

---

### **3️⃣ Terminal 2 - Iniciar Backend Node.js**

```bash
# Navegue até a pasta do projeto
cd C:\Users\Admin\Desktop\RFID_INTERFACE_LEO\prototipo-agv-dashboard

# Inicie o backend
npm start
```

**O que você verá:**
```
[MQTT] Conectado ao broker!
[MQTT] Inscrito em agv/status
[MQTT] Inscrito em agv/rfid
Servidor rodando na porta 3000
Socket.IO inicializado
```

✅ **Deixe este terminal aberto!**

---

### **4️⃣ Terminal 3 (Opcional) - Monitorar Mensagens MQTT**

```bash
# Em outro terminal
mosquitto_sub -h localhost -t "agv/#" -v
```

Isso mostrará TODAS as mensagens MQTT publicadas nos tópicos `agv/*`.

---

### **5️⃣ Abrir o Dashboard no Navegador**

1. Abra seu navegador
2. Navegue até: **http://localhost:3000**
3. O dashboard deve carregar normalmente

---

### **6️⃣ Ligar o Raspberry Pi Pico W**

1. Conecte o Pico W com o código `RFID_MQTT.uf2` já gravado
2. Abra o **Serial Monitor** (opcional, para ver logs)

**No Serial Monitor você verá:**
```
========================================
  Leitor RFID com MQTT para AGV
  Dashboard Integration
========================================

[WiFi] Conectando a: TP-Link_29B5_5G
[WiFi] Conectado com sucesso!
[WiFi] IP: 192.168.1.XXX

[MQTT] Conectando ao broker 192.168.1.100:1883...
[MQTT] Conectado ao broker!

[RFID] Leitor inicializado com sucesso!

========================================
  Sistema pronto!
========================================
Aproxime tags RFID do leitor...
```

---

## 🏷️ Testar Leitura RFID

### **1. Aproxime uma tag RFID do leitor**

**No Serial Monitor do Pico W:**
```
[RFID] Tag detectada: A1B2C3D4
[MQTT] Publicando: {"tag":"A1B2C3D4","timestamp":12345,"reader":"PicoW"}
[MQTT] Mensagem publicada com sucesso!
```

**No Terminal 2 (Backend Node.js):**
```
[MQTT] 🏷️  RFID DETECTADO: A1B2C3D4
[MQTT] ✅ Tag "A1B2C3D4" transmitida para dashboard
```

**No Terminal 3 (mosquitto_sub):**
```
agv/rfid {"tag":"A1B2C3D4","timestamp":12345,"reader":"PicoW"}
```

**No Dashboard:**
- Campo **"Carga Atual (RFID)"** atualiza instantaneamente para: **A1B2C3D4**

---

## ✅ Fluxo Completo Funcionando

```
Tag RFID aproximada do leitor
        ↓
Pico W publica no MQTT
        ↓
Terminal 3 mostra mensagem (se estiver rodando)
        ↓
Backend Node.js recebe
        ↓
Backend loga: [MQTT] 🏷️  RFID DETECTADO
        ↓
Backend transmite via WebSocket
        ↓
Dashboard atualiza campo RFID instantaneamente! 🎉
```

---

## 🧪 Testar Manualmente (Sem Hardware)

Se você ainda não tem o Pico W conectado, pode testar manualmente:

```bash
# Publique uma tag de teste
mosquitto_pub -h localhost -t "agv/rfid" -m '{"tag":"TESTE123","timestamp":999}'
```

Você verá no backend:
```
[MQTT] 🏷️  RFID DETECTADO: TESTE123
[MQTT] ✅ Tag "TESTE123" transmitida para dashboard
```

E o dashboard atualiza para: **TESTE123**

---

## 🐛 Troubleshooting

### Problema: "Error: connect ECONNREFUSED 127.0.0.1:1883"

**Causa:** Broker MQTT não está rodando.

**Solução:**
```bash
# Inicie o broker
mosquitto -v
```

---

### Problema: Backend conecta mas Pico W não

**Verifique:**

1. **WiFi está conectado?**
   - Veja no Serial Monitor se mostra: `[WiFi] Conectado com sucesso!`

2. **IP do broker está correto?**
   - No `main_mqtt.c`, linha 24, deve ser o IP do SEU computador:
   ```c
   #define MQTT_BROKER_IP  "192.168.1.100"  // CONFIRME ESTE IP!
   ```

3. **Descobrir IP correto:**
   ```bash
   # Windows
   ipconfig
   # Procure por "Endereço IPv4" na sua rede WiFi
   ```

4. **Firewall bloqueando?**
   ```bash
   # Desabilite temporariamente para testar
   # Windows: Painel de Controle > Firewall do Windows > Desativar
   ```

---

### Problema: Tag lida mas não aparece no dashboard

**Verificações:**

1. **Backend recebeu?**
   - Terminal 2 deve mostrar: `[MQTT] 🏷️  RFID DETECTADO`

2. **WebSocket conectado?**
   - Abra DevTools (F12) no navegador
   - Procure por: `Socket.IO is connected`

3. **Recarregue a página:**
   - Pressione F5 no dashboard

---

### Problema: "TP-Link_29B5_5G" é rede 5GHz

**IMPORTANTE:** ⚠️ Raspberry Pi Pico W **NÃO suporta redes 5GHz**!

Você precisa:
1. Conectar a uma rede 2.4GHz
2. Ou configurar seu roteador para criar uma rede 2.4GHz
3. Alterar o SSID no `main_mqtt.c` para a rede 2.4GHz

**Como identificar:**
- Se o nome da rede tem "5G" no final → É 5GHz (não funciona)
- Se não tem "5G" → Provavelmente é 2.4GHz (funciona)

**Solução:**
```c
// Em main_mqtt.c, troque para uma rede 2.4GHz:
#define WIFI_SSID       "TP-Link_29B5"  // SEM o "_5G"
```

---

## 📊 Comandos Úteis para Debug

### Ver todas as mensagens MQTT:
```bash
mosquitto_sub -h localhost -t "#" -v
```

### Ver apenas RFID:
```bash
mosquitto_sub -h localhost -t "agv/rfid" -v
```

### Publicar tag de teste:
```bash
mosquitto_pub -h localhost -t "agv/rfid" -m '{"tag":"ABC123","timestamp":111}'
```

### Verificar se porta 1883 está aberta:
```bash
# Windows
netstat -an | findstr :1883

# Linux/Mac
netstat -an | grep 1883
```

---

## 🎯 Resumo dos Comandos

```bash
# Terminal 1
mosquitto -v

# Terminal 2
cd C:\Users\Admin\Desktop\RFID_INTERFACE_LEO\prototipo-agv-dashboard
npm start

# Terminal 3 (opcional)
mosquitto_sub -h localhost -t "agv/#" -v

# Navegador
http://localhost:3000
```

---

## ✨ Sistema Funcionando!

Quando tudo estiver certo:

1. ✅ Broker MQTT rodando
2. ✅ Backend conectado ao MQTT
3. ✅ Dashboard aberto no navegador
4. ✅ Pico W conectado ao WiFi e MQTT
5. ✅ Tags RFID sendo lidas
6. ✅ Dashboard atualizando em tempo real

**🎉 Pronto! Seu sistema está completo e funcional!**

---

**💡 Dica:** Mantenha os 3 terminais abertos lado a lado para ver tudo acontecendo em tempo real!
