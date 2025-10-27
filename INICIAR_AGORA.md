# 🚀 INICIAR O SISTEMA - GUIA RÁPIDO

**✅ Broker MQTT embutido - Sem necessidade de instalar Mosquitto!**

---

## 📝 O Que Foi Feito

Integrei um **broker MQTT dentro do seu backend Node.js** usando a biblioteca **Aedes**.

Agora você **NÃO precisa instalar o Mosquitto** separadamente! Tudo roda junto! 🎉

---

## 🔥 Como Iniciar (Apenas 1 Terminal!)

### **1️⃣ Iniciar o Sistema Completo**

```bash
cd C:\Users\Admin\Desktop\RFID_INTERFACE_LEO\prototipo-agv-dashboard
npm start
```

**O que você verá:**

```
[BROKER MQTT] 🚀 Broker iniciado na porta 1883
[BROKER MQTT] ✅ Pronto para receber conexões
[MQTT CLIENT] ✅ Conectado ao broker local
[MQTT] Conectado ao broker!
[MQTT] Inscrito em agv/status
[MQTT] Inscrito em agv/rfid
[SERVER] Rodando na porta 3000
[SERVER] Acesse: http://localhost:3000
```

✅ **Pronto! Tudo funcionando com apenas 1 comando!**

---

## 🌐 Abrir o Dashboard

1. Abra seu navegador
2. Acesse: **http://localhost:3000**

---

## 🧪 Testar RFID (Sem Hardware)

Em **outro terminal**, publique uma tag de teste:

```bash
npm run test-rfid
```

Ou manualmente:

```bash
npx mqtt pub -t "agv/rfid" -h localhost -m '{"tag":"TESTE123","timestamp":999}'
```

**Resultado esperado:**

**No terminal do backend:**
```
[BROKER MQTT] 📱 Cliente conectado: mqttjs_...
[BROKER MQTT] 📨 Cliente publicou em "agv/rfid"
[MQTT] 🏷️  RFID DETECTADO: TESTE123
[MQTT] ✅ Tag "TESTE123" transmitida para dashboard
```

**No dashboard:**
- Campo **"Carga Atual (RFID)"** atualiza para: **TESTE123** 🎉

---

## 🔌 Conectar o Raspberry Pi Pico W

### **⚠️ IMPORTANTE: Corrigir o WiFi no Pico W**

Você configurou uma rede **5GHz**, mas o Pico W **só funciona com 2.4GHz**!

**Edite o arquivo:** `RFID/main_mqtt.c`

**Linha 20 - Altere para uma rede 2.4GHz:**
```c
// ❌ NÃO FUNCIONA (5GHz):
#define WIFI_SSID "TP-Link_29B5_5G"

// ✅ FUNCIONA (2.4GHz):
#define WIFI_SSID "TP-Link_29B5"  // Sem "_5G"
// Ou use qualquer outra rede 2.4GHz disponível
```

**Como identificar redes 2.4GHz:**
- Se tem "_5G" no nome → É 5GHz (não funciona)
- Se não tem "_5G" → Provavelmente é 2.4GHz (funciona)

### **Linha 24 - IP do broker está correto:**
```c
#define MQTT_BROKER_IP "192.168.1.100"  // IP do seu PC
```

**Descobrir o IP correto do seu PC:**
```bash
ipconfig
# Procure por "Endereço IPv4" na sua rede WiFi
```

### **Recompilar e Gravar:**

1. **Corrija a rede WiFi** no `main_mqtt.c`
2. **Recompile:**
   ```bash
   cd RFID/build
   make -j4
   ```
3. **Grave o novo `.uf2`** no Pico W

### **Quando Conectar:**

**Serial Monitor do Pico W mostrará:**
```
[WiFi] Conectando a: TP-Link_29B5
[WiFi] Conectado com sucesso!
[WiFi] IP: 192.168.1.XXX

[MQTT] Conectando ao broker 192.168.1.100:1883...
[MQTT] Conectado ao broker!
```

**Backend mostrará:**
```
[BROKER MQTT] 📱 Cliente conectado: PicoW-RFID-Reader
```

**Quando aproximar uma tag:**
```
[BROKER MQTT] 📨 PicoW-RFID-Reader publicou em "agv/rfid"
[MQTT] 🏷️  RFID DETECTADO: A1B2C3D4
[MQTT] ✅ Tag "A1B2C3D4" transmitida para dashboard
```

**Dashboard atualiza instantaneamente!** 🎉

---

## 🛠️ Comandos Úteis

### Monitorar Mensagens MQTT:
```bash
npx mqtt sub -t "agv/#" -h localhost -v
```

### Publicar Tag de Teste:
```bash
npx mqtt pub -t "agv/rfid" -h localhost -m '{"tag":"ABC123","timestamp":111}'
```

### Ver Status do Sistema:
```bash
curl http://localhost:3000/api/status
```

---

## 🎯 Arquitetura do Sistema

```
┌─────────────────────────────────────────────────┐
│  Backend Node.js (npm start)                    │
│  ┌───────────────────────────────────────────┐  │
│  │  🟢 Broker MQTT (porta 1883)              │  │
│  │     ↓                                      │  │
│  │  📡 Cliente MQTT (subscribe agv/rfid)     │  │
│  │     ↓                                      │  │
│  │  🔄 agvService (atualiza estado)          │  │
│  │     ↓                                      │  │
│  │  📤 WebSocket (transmite para navegador)  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
           ↑                           ↓
      Publica MQTT              Recebe WebSocket
           ↑                           ↓
┌──────────────────┐          ┌────────────────┐
│  Raspberry Pi    │          │   Dashboard    │
│  Pico W + RFID   │          │   (Browser)    │
└──────────────────┘          └────────────────┘
```

---

## ✅ Checklist Final

Antes de usar, certifique-se:

- [x] Backend modificado (já feito! ✅)
- [x] Broker MQTT integrado (já feito! ✅)
- [ ] WiFi 2.4GHz configurado no Pico W
- [ ] IP correto do broker no Pico W
- [ ] Código recompilado com correções
- [ ] Pico W gravado com novo firmware
- [ ] Backend rodando (`npm start`)
- [ ] Dashboard aberto no navegador

---

## 🐛 Troubleshooting

### Problema: Backend não inicia

**Erro:** `Error: listen EADDRINUSE: address already in use :::1883`

**Causa:** Outra coisa está usando a porta 1883.

**Solução:**
```bash
# Windows - encontre o processo
netstat -ano | findstr :1883

# Mate o processo (substitua PID)
taskkill /PID <número> /F
```

---

### Problema: Pico W não conecta ao broker

**Verificações:**

1. **WiFi é 2.4GHz?** ⚠️ **PRINCIPAL PROBLEMA!**
   - Altere para rede sem "_5G"

2. **IP do broker correto?**
   ```bash
   ipconfig
   ```

3. **Firewall bloqueando?**
   - Desabilite temporariamente para testar

4. **Pico W e PC na mesma rede?**
   - Ambos devem estar conectados no mesmo roteador

---

### Problema: Tag lida mas não aparece no dashboard

1. **Recarregue a página** (F5)
2. **Verifique o Console** (F12 → Console)
3. **Veja se WebSocket conectou:**
   - Deve aparecer: `Socket.IO is connected`

---

## 📊 Fluxo Completo Funcionando

```
1. npm start
   ↓
2. Broker MQTT inicia (porta 1883)
   ↓
3. Cliente MQTT conecta e inscreve em "agv/rfid"
   ↓
4. Servidor HTTP inicia (porta 3000)
   ↓
5. Abra http://localhost:3000
   ↓
6. Pico W conecta ao broker
   ↓
7. Aproxime tag RFID
   ↓
8. Pico publica: {"tag":"A1B2C3D4",...}
   ↓
9. Backend recebe e loga
   ↓
10. Backend transmite via WebSocket
   ↓
11. Dashboard atualiza INSTANTANEAMENTE! 🎉
```

---

## 🎉 Resumo

**ANTES:**
- ❌ Precisava instalar Mosquitto separadamente
- ❌ Rodar 2 terminais (broker + backend)
- ❌ Configurar manualmente

**AGORA:**
- ✅ Broker integrado ao backend
- ✅ 1 comando: `npm start`
- ✅ Tudo funciona automaticamente

---

## 🚀 Comando Único

```bash
npm start
```

**Isso inicia:**
- ✅ Broker MQTT (porta 1883)
- ✅ Cliente MQTT (conecta ao broker)
- ✅ Backend Express (porta 3000)
- ✅ WebSocket (tempo real)

**Abra:** http://localhost:3000

**Teste:**
```bash
npx mqtt pub -t "agv/rfid" -h localhost -m '{"tag":"TESTE","timestamp":1}'
```

---

**🎯 Pronto! Agora é só executar `npm start` e tudo funciona!**

Qualquer dúvida, olhe os logs no terminal - eles são bem detalhados! 📝
