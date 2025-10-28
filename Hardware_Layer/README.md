# Hardware Layer Unificado - RFID + Sensores de Distância

Esta camada de hardware integra o leitor RFID (MFRC522) e os 3 sensores de distância (VL53L0X) em um único código, enviando dados simultaneamente via MQTT para o backend do AGV.

## Componentes Integrados

### 1. RFID (MFRC522)
- Lê tags RFID via comunicação SPI
- Publica no tópico MQTT: `agv/rfid`
- Formato JSON: `{"tag":"A1B2C3D4","timestamp":1234567890,"reader":"PicoW"}`

### 2. Sensores de Distância (VL53L0X x3)
- 3 sensores: Esquerda, Centro, Direita
- Comunicação I2C via multiplexador TCA9548A
- Publica no tópico MQTT: `agv/distance`
- Formato JSON: `{"left":10.5,"center":15.2,"right":12.8,"timestamp":1234567890,"unit":"cm"}`

## Estrutura do Projeto

```
Hardware_Layer/
├── main.c                      # Código principal unificado
├── config.h                    # Configurações WiFi/MQTT/Hardware
├── CMakeLists.txt              # Build system
├── pico_sdk_import.cmake       # SDK do Pico
├── lib/                        # Bibliotecas
│   ├── mfrc522.c/h            # Driver RFID
│   ├── tca9548a.c/h           # Multiplexador I2C
│   └── vl53l0x/               # Driver sensores VL53L0X
│       ├── core/              # APIs do sensor
│       └── platform/          # Abstração RP2040
└── README.md                  # Esta documentação
```

## Pinagem

### RFID (MFRC522) - SPI
| Função | GPIO | Descrição |
|--------|------|-----------|
| MISO   | GP4  | SPI MISO |
| MOSI   | GP3  | SPI MOSI |
| SCK    | GP2  | SPI Clock |
| CS     | GP5  | Chip Select |
| RST    | GP0  | Reset |
| VCC    | 3.3V | Alimentação |
| GND    | GND  | Ground |

### Sensores de Distância (VL53L0X) - I2C
| Função | GPIO | Descrição |
|--------|------|-----------|
| SDA    | GP20 | I2C Data |
| SCL    | GP21 | I2C Clock |
| VCC    | 3.3V | Alimentação (todos) |
| GND    | GND  | Ground (todos) |

**Multiplexador TCA9548A:**
- Esquerda: Canal 0
- Centro: Canal 1
- Direita: Canal 2

## Configuração

Edite o arquivo `config.h` para ajustar as configurações:

```c
// WiFi
#define WIFI_SSID       "Sua_Rede"
#define WIFI_PASSWORD   "Sua_Senha"

// MQTT Broker
#define MQTT_BROKER_IP      "192.168.0.103"
#define MQTT_BROKER_PORT    1883
```

## Compilação

### 1. Pré-requisitos
- Raspberry Pi Pico SDK instalado
- CMake 3.13 ou superior
- Compilador ARM (arm-none-eabi-gcc)

### 2. Comandos de Build

```bash
cd Hardware_Layer
mkdir build
cd build
cmake ..
make
```

### 3. Arquivos Gerados
- `Hardware_Layer.uf2` - Arquivo para gravação no Pico W
- `Hardware_Layer.elf` - Arquivo ELF para debug
- `Hardware_Layer.bin` - Binário

## Upload para o Pico W

1. Conecte o Pico W ao PC segurando o botão BOOTSEL
2. Copie o arquivo `Hardware_Layer.uf2` para o drive que aparecer
3. O Pico W reiniciará automaticamente

## Funcionamento

### Fluxo de Operação

1. **Inicialização**
   - Conecta ao WiFi
   - Conecta ao broker MQTT
   - Inicializa RFID (SPI)
   - Inicializa sensores de distância (I2C)

2. **Loop Principal**
   - Lê sensores de distância continuamente
   - Publica distâncias via MQTT a cada 1 segundo
   - Detecta tags RFID e publica imediatamente
   - Reconecta automaticamente se perder conexão

3. **Indicadores LED**
   - LED aceso: Conectado ao MQTT
   - LED piscando: Publicação bem-sucedida
   - LED apagado: Desconectado

## Tópicos MQTT

| Tópico | Descrição | QoS |
|--------|-----------|-----|
| `agv/rfid` | Leituras de tags RFID | 1 |
| `agv/distance` | Medições de distância | 1 |
| `agv/sensors/status` | Status do sistema | 0 |

## Dados Publicados

### RFID
```json
{
  "tag": "A1B2C3D4",
  "timestamp": 1234567890,
  "reader": "PicoW"
}
```

### Distância
```json
{
  "left": 10.5,
  "center": 15.2,
  "right": 12.8,
  "timestamp": 1234567890,
  "unit": "cm"
}
```

### Status
```json
{
  "status": "online",
  "rfid": true,
  "distance": true,
  "reader": "PicoW"
}
```

## Debugging

### Monitor Serial
Conecte ao serial (115200 baud) para ver logs:
```
[WiFi] Conectando a: TP-Link_29B5
[WiFi] Conectado com sucesso!
[MQTT] Conectado ao broker!
[RFID] Leitor inicializado com sucesso!
[DISTANCIA] Sensor Esquerda: OK
[DISTANCIA] Sensor Centro: OK
[DISTANCIA] Sensor Direita: OK
Sistema pronto!
```

## Troubleshooting

### WiFi não conecta
- Verifique SSID e senha em `config.h`
- Certifique-se que a rede é 2.4GHz (Pico W não suporta 5GHz)

### MQTT não conecta
- Verifique se o broker está rodando
- Confirme o IP do broker em `config.h`
- Teste conectividade de rede

### RFID não lê tags
- Verifique conexões SPI
- Confirme alimentação 3.3V
- Teste com diferentes tags

### Sensores de distância retornam 0
- Verifique conexões I2C
- Confirme endereço do TCA9548A (0x70)
- Teste cada sensor individualmente

## Bibliotecas Utilizadas

- **pico_stdlib** - Funções padrão do Pico
- **pico_cyw43_arch_lwip_poll** - WiFi + TCP/IP stack
- **pico_lwip_mqtt** - Cliente MQTT
- **hardware_spi** - Comunicação SPI (RFID)
- **hardware_i2c** - Comunicação I2C (sensores)
- **mfrc522** - Driver do leitor RFID
- **vl53l0x** - Driver dos sensores de distância
- **tca9548a** - Driver do multiplexador I2C

## Integração com Backend

Este código se integra com o backend Node.js do projeto AGV:
- Broker MQTT: Aedes (embutido no server.js)
- Dashboard: Socket.IO para visualização em tempo real
- Rotas: Express.js para API REST

## Licença

Este projeto faz parte do sistema AGV com integração RFID-MQTT.

## Autor

Desenvolvido para o projeto de AGV com navegação por RFID e detecção de obstáculos.
