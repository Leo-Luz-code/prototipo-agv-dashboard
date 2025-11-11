// =====================================================
// Configurações - Hardware Layer Unificado
// RFID + Sensores de Distância
// =====================================================

#ifndef CONFIG_H
#define CONFIG_H

// ========== CONFIGURAÇÕES DE WIFI ==========
#define WIFI_SSID       "TP-Link_29B5"
#define WIFI_PASSWORD   "23438651"

// ========== CONFIGURAÇÕES DO BROKER MQTT ==========
#define MQTT_BROKER_IP      "192.168.0.103"
#define MQTT_BROKER_PORT    1883
#define MQTT_CLIENT_ID      "PicoW-Hardware-Layer"

// ========== TÓPICOS MQTT ==========
#define MQTT_TOPIC_RFID         "agv/rfid"
#define MQTT_TOPIC_DISTANCE     "agv/distance"
#define MQTT_TOPIC_COLOR        "agv/color"
#define MQTT_TOPIC_STATUS       "agv/sensors/status"

// ========== PINAGEM RFID (MFRC522) ==========
#define PIN_MISO    4   // SPI MISO
#define PIN_CS      5   // SPI CS (Chip Select)
#define PIN_SCK     2   // SPI Clock
#define PIN_MOSI    3   // SPI MOSI
#define PIN_RST     0   // Reset do MFRC522

// ========== PINAGEM SENSORES DE DISTÂNCIA (I2C0) ==========
#define I2C_PORT        i2c0
#define I2C_SDA_PIN     20
#define I2C_SCL_PIN     21
#define NUM_SENSORS     3

// ========== PINAGEM MPU6050 (I2C1) ==========
#define MPU_I2C_PORT    i2c1
#define MPU_SDA_PIN     18
#define MPU_SCL_PIN     19

// Canais do multiplexador TCA9548A para cada sensor
#define SENSOR_CHANNEL_LEFT     0   // Esquerda
#define SENSOR_CHANNEL_CENTER   1   // Centro
#define SENSOR_CHANNEL_RIGHT    2   // Direita
#define SENSOR_CHANNEL_COLOR    7   // Sensor de cor GY-33

// ========== CONFIGURAÇÕES DE OPERAÇÃO ==========
#define SCAN_INTERVAL_MS        100     // Intervalo entre leituras
#define RFID_DEBOUNCE_TIME_MS   3000    // Tempo para ignorar mesma tag
#define RECONNECT_DELAY_MS      5000    // Delay antes de reconectar MQTT
#define STATUS_PUBLISH_INTERVAL 30000000 // 30 segundos em microsegundos

// ========== FILTRO DE MEDIÇÃO ==========
#define FILTER_SIZE             10      // Tamanho do buffer de média móvel
#define DISTANCE_OFFSET         13      // Offset de calibração do sensor (mm)

// ========== CONFIGURAÇÕES MPU6050 ==========
#define MPU6050_ADDR        0x68    // Endereço I2C
#define MQTT_TOPIC_IMU      "agv/imu"

// ========== CONFIGURAÇÕES SENSOR DE COR GY-33 ==========
// Nota: O sensor GY-33 usa o barramento I2C0 (GP20/GP21)
// Conectado no canal 7 do multiplexador TCA9548A
#define GY33_I2C_PORT       I2C_PORT        // i2c0 (compartilhado com sensores de distância)
#define GY33_CHANNEL        SENSOR_CHANNEL_COLOR  // Canal 7 do TCA9548A
#define GY33_ADDR           0x29            // Endereço I2C do TCS34725

#endif // CONFIG_H
