// =====================================================
// Hardware Layer Unificado - Raspberry Pi Pico W
// RFID (MFRC522) + Sensores de Distância (VL53L0X)
// Publicação via MQTT para Dashboard AGV
// =====================================================

#include <stdio.h>
#include <string.h>
#include <time.h>
#include "pico/stdlib.h"
#include "pico/cyw43_arch.h"
#include "hardware/spi.h"
#include "hardware/i2c.h"
#include "lwip/apps/mqtt.h"
#include "lwip/dns.h"

// Bibliotecas do RFID
#include "mfrc522.h"

// Bibliotecas dos sensores de distância
#include "tca9548a.h"
#include "vl53l0x/core/inc/vl53l0x_api.h"
#include "vl53l0x/platform/inc/vl53l0x_rp2040.h"

// Configurações do projeto
#include "config.h"

// ========== VARIÁVEIS GLOBAIS ==========

// Cliente MQTT
mqtt_client_t *mqtt_client = NULL;
bool mqtt_connected = false;
ip_addr_t mqtt_broker_ip;

// Controle de leitura RFID
volatile uint8_t last_uid[10] = {0};
volatile uint8_t last_uid_size = 0;
volatile absolute_time_t last_read_time;

// Status da conexão
bool wifi_connected = false;
absolute_time_t last_reconnect_attempt;

// Sensores de distância
VL53L0X_Dev_t gVL53L0XDevices[NUM_SENSORS];
bool sensor_ok[NUM_SENSORS] = {false};
tca9548a_t mux;
const uint8_t SENSOR_CHANNELS[NUM_SENSORS] = {SENSOR_CHANNEL_LEFT, SENSOR_CHANNEL_CENTER, SENSOR_CHANNEL_RIGHT};
const char* SENSOR_NAMES[NUM_SENSORS] = {"Esquerda", "Centro", "Direita"};

// Filtros de medição
uint16_t filter_buffer[NUM_SENSORS][FILTER_SIZE] = {0};
uint8_t buffer_index[NUM_SENSORS] = {0};

// Variáveis de distância
float distancia_esquerda = 0.0;
float distancia_centro = 0.0;
float distancia_direita = 0.0;

// ========== PROTÓTIPOS DE FUNÇÕES ==========

// Inicialização
void setup_gpio_rfid(void);
void setup_i2c_distance(void);
void connect_wifi(void);
void mqtt_init_and_connect(void);
void init_distance_sensors(void);

// Callbacks MQTT
void mqtt_connection_cb(mqtt_client_t *client, void *arg, mqtt_connection_status_t status);
void mqtt_pub_request_cb(void *arg, err_t result);
void dns_found_cb(const char *hostname, const ip_addr_t *ipaddr, void *arg);

// Operações RFID
void publish_rfid_tag(const uint8_t *uid, uint8_t uid_size);
bool is_same_tag(const uint8_t *uid, uint8_t uid_size);
void uid_to_hex_string(const uint8_t *uid, uint8_t size, char *output);

// Operações sensores de distância
void read_distance_sensors(void);
void publish_distance_data(void);
VL53L0X_Error singleRanging(VL53L0X_Dev_t *pDevice, uint16_t *MeasuredData);

// Gerais
void publish_status(const char *status);
void mqtt_reconnect(void);

// ========== IMPLEMENTAÇÃO - RFID ==========

void setup_gpio_rfid(void) {
    // Configura pino de reset
    gpio_init(PIN_RST);
    gpio_set_dir(PIN_RST, GPIO_OUT);
    gpio_put(PIN_RST, 1);  // Reset inativo (HIGH)

    // Inicializa SPI0 a 1MHz
    spi_init(spi0, 1000000);
    gpio_set_function(PIN_MISO, GPIO_FUNC_SPI);
    gpio_set_function(PIN_SCK, GPIO_FUNC_SPI);
    gpio_set_function(PIN_MOSI, GPIO_FUNC_SPI);

    // Configura Chip Select (CS)
    gpio_init(PIN_CS);
    gpio_set_dir(PIN_CS, GPIO_OUT);
    gpio_put(PIN_CS, 1);  // CS inativo (HIGH)

    printf("[RFID] GPIO configurado\n");
}

void uid_to_hex_string(const uint8_t *uid, uint8_t size, char *output) {
    for (uint8_t i = 0; i < size; i++) {
        sprintf(output + (i * 2), "%02X", uid[i]);
    }
    output[size * 2] = '\0';
}

bool is_same_tag(const uint8_t *uid, uint8_t uid_size) {
    if (last_uid_size != uid_size) return false;

    for (uint8_t i = 0; i < uid_size; i++) {
        if (last_uid[i] != uid[i]) return false;
    }

    absolute_time_t now = get_absolute_time();
    int64_t diff_ms = absolute_time_diff_us(last_read_time, now) / 1000;

    return diff_ms < RFID_DEBOUNCE_TIME_MS;
}

void publish_rfid_tag(const uint8_t *uid, uint8_t uid_size) {
    if (!mqtt_connected) {
        printf("[MQTT] Nao conectado, pulando publicacao RFID...\n");
        return;
    }

    // Verifica se o cliente MQTT está pronto
    if (mqtt_client == NULL || !mqtt_client_is_connected(mqtt_client)) {
        printf("[MQTT] Cliente nao esta pronto, pulando publicacao...\n");
        mqtt_connected = false;
        return;
    }

    char uid_str[32] = {0};
    uid_to_hex_string(uid, uid_size, uid_str);

    char payload[128];
    uint32_t timestamp = to_ms_since_boot(get_absolute_time());

    snprintf(payload, sizeof(payload),
             "{\"tag\":\"%s\",\"timestamp\":%lu,\"reader\":\"PicoW\"}",
             uid_str, timestamp);

    printf("[RFID] Tag detectada: %s\n", uid_str);
    printf("[MQTT] Publicando RFID: %s\n", payload);

    err_t err = mqtt_publish(mqtt_client, MQTT_TOPIC_RFID, payload, strlen(payload),
                            1, 0, mqtt_pub_request_cb, NULL);

    if (err != ERR_OK) {
        printf("[MQTT] ERRO ao publicar RFID! Codigo: %d\n", err);
        if (err == ERR_CONN) {
            mqtt_connected = false;
        }
    }

    memcpy((void*)last_uid, uid, uid_size);
    last_uid_size = uid_size;
    last_read_time = get_absolute_time();
}

// ========== IMPLEMENTAÇÃO - SENSORES DE DISTÂNCIA ==========

void setup_i2c_distance(void) {
    i2c_init(I2C_PORT, 400 * 1000);
    gpio_set_function(I2C_SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(I2C_SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(I2C_SDA_PIN);
    gpio_pull_up(I2C_SCL_PIN);

    tca9548a_init(&mux, I2C_PORT, TCA9548A_DEFAULT_ADDR);
    printf("[I2C] Configurado com multiplexador TCA9548A\n");
}

void init_distance_sensors(void) {
    printf("[DISTANCIA] Inicializando sensores VL53L0X...\n");

    for (int i = 0; i < NUM_SENSORS; i++) {
        tca9548a_select_channel(&mux, SENSOR_CHANNELS[i]);
        VL53L0X_Dev_t *pDevice = &gVL53L0XDevices[i];
        pDevice->I2cDevAddr = 0x29;
        pDevice->comms_type = 1;
        pDevice->comms_speed_khz = 400;

        VL53L0X_Error status = VL53L0X_dev_i2c_initialise(pDevice, I2C_PORT,
                                                          I2C_SDA_PIN, I2C_SCL_PIN,
                                                          400, VL53L0X_DEFAULT_MODE);
        sensor_ok[i] = (status == VL53L0X_ERROR_NONE);
        printf("[DISTANCIA] Sensor %s: %s\n", SENSOR_NAMES[i],
               sensor_ok[i] ? "OK" : "FALHOU");
        sleep_ms(50);
    }
}

VL53L0X_Error singleRanging(VL53L0X_Dev_t *pDevice, uint16_t *MeasuredData) {
    return VL53L0X_SingleRanging(pDevice, MeasuredData);
}

void read_distance_sensors(void) {
    for (int i = 0; i < NUM_SENSORS; i++) {
        if (!sensor_ok[i]) continue;

        if (!tca9548a_select_channel(&mux, SENSOR_CHANNELS[i])) continue;

        VL53L0X_Dev_t *pDevice = &gVL53L0XDevices[i];
        uint16_t ranging_value = 0;
        VL53L0X_Error status = singleRanging(pDevice, &ranging_value);

        if (status == VL53L0X_ERROR_NONE) {
            // Adiciona ao buffer de filtro
            filter_buffer[i][buffer_index[i]] = ranging_value;
            buffer_index[i] = (buffer_index[i] + 1) % FILTER_SIZE;

            // Calcula média
            uint32_t sum_values = 0;
            for (int j = 0; j < FILTER_SIZE; j++) {
                sum_values += filter_buffer[i][j];
            }

            uint16_t averaged_value = sum_values / FILTER_SIZE;

            // Aplica offset de calibração
            if (averaged_value > DISTANCE_OFFSET) {
                averaged_value -= DISTANCE_OFFSET;
            } else {
                averaged_value = 0;
            }

            // Converte para cm e armazena
            float distancia_cm = averaged_value / 10.0f;

            if (i == 0) distancia_esquerda = distancia_cm;
            else if (i == 1) distancia_centro = distancia_cm;
            else if (i == 2) distancia_direita = distancia_cm;
        }
    }
}

void publish_distance_data(void) {
    if (!mqtt_connected) {
        printf("[MQTT] Nao conectado, pulando publicacao de distancia...\n");
        return;
    }

    // Verifica se o cliente MQTT está pronto
    if (mqtt_client == NULL || !mqtt_client_is_connected(mqtt_client)) {
        printf("[MQTT] Cliente nao esta pronto, pulando publicacao...\n");
        mqtt_connected = false;
        return;
    }

    char payload[256];
    uint32_t timestamp = to_ms_since_boot(get_absolute_time());

    snprintf(payload, sizeof(payload),
             "{\"left\":%.1f,\"center\":%.1f,\"right\":%.1f,\"timestamp\":%lu,\"unit\":\"cm\"}",
             distancia_esquerda, distancia_centro, distancia_direita, timestamp);

    printf("[DISTANCIA] Esq: %.1f cm | Centro: %.1f cm | Dir: %.1f cm\n",
           distancia_esquerda, distancia_centro, distancia_direita);
    printf("[MQTT] Publicando distancias: %s\n", payload);

    err_t err = mqtt_publish(mqtt_client, MQTT_TOPIC_DISTANCE, payload, strlen(payload),
                            1, 0, mqtt_pub_request_cb, NULL);

    if (err != ERR_OK) {
        printf("[MQTT] ERRO ao publicar distancias! Codigo: %d\n", err);
        if (err == ERR_CONN) {
            mqtt_connected = false;
        }
    }
}

// ========== IMPLEMENTAÇÃO - WIFI E MQTT ==========

void connect_wifi(void) {
    printf("[WiFi] Conectando a: %s\n", WIFI_SSID);

    if (cyw43_arch_init()) {
        printf("[WiFi] ERRO: Falha ao inicializar CYW43!\n");
        return;
    }

    cyw43_arch_enable_sta_mode();
    printf("[WiFi] Aguardando conexao...\n");

    if (cyw43_arch_wifi_connect_timeout_ms(WIFI_SSID, WIFI_PASSWORD,
                                           CYW43_AUTH_WPA2_AES_PSK, 30000)) {
        printf("[WiFi] ERRO: Falha ao conectar!\n");
        wifi_connected = false;
        return;
    }

    wifi_connected = true;
    printf("[WiFi] Conectado com sucesso!\n");
    printf("[WiFi] IP: %s\n", ip4addr_ntoa(netif_ip4_addr(netif_list)));
}

void dns_found_cb(const char *hostname, const ip_addr_t *ipaddr, void *arg) {
    if (ipaddr != NULL) {
        mqtt_broker_ip = *ipaddr;
        printf("[MQTT] Broker resolvido: %s\n", ip4addr_ntoa(ipaddr));
    } else {
        printf("[MQTT] ERRO: Falha ao resolver hostname!\n");
    }
}

void mqtt_connection_cb(mqtt_client_t *client, void *arg, mqtt_connection_status_t status) {
    if (status == MQTT_CONNECT_ACCEPTED) {
        mqtt_connected = true;
        printf("[MQTT] Conectado ao broker!\n");
        publish_status("online");
        cyw43_arch_gpio_put(CYW43_WL_GPIO_LED_PIN, 1);
    } else {
        mqtt_connected = false;
        printf("[MQTT] Conexao falhou! Status: %d\n", status);
        cyw43_arch_gpio_put(CYW43_WL_GPIO_LED_PIN, 0);
    }
}

void mqtt_pub_request_cb(void *arg, err_t result) {
    if (result == ERR_OK) {
        printf("[MQTT] Mensagem publicada com sucesso!\n");
        // Pisca LED
        cyw43_arch_gpio_put(CYW43_WL_GPIO_LED_PIN, 0);
        sleep_ms(50);
        cyw43_arch_gpio_put(CYW43_WL_GPIO_LED_PIN, 1);
    } else {
        printf("[MQTT] ERRO ao publicar! Codigo: %d\n", result);
    }
}

void mqtt_init_and_connect(void) {
    printf("[MQTT] Inicializando cliente...\n");

    // Limpa cliente antigo com cuidado para evitar memory leak
    if (mqtt_client != NULL) {
        printf("[MQTT] Liberando cliente antigo...\n");

        // Desconecta se estiver conectado
        if (mqtt_client_is_connected(mqtt_client)) {
            mqtt_disconnect(mqtt_client);
        }

        // Aguarda limpeza de recursos
        for (int i = 0; i < 10; i++) {
            cyw43_arch_poll();
            sleep_ms(100);
        }

        // Libera o cliente
        mqtt_client_free(mqtt_client);
        mqtt_client = NULL;
        mqtt_connected = false;

        // Aguarda mais um pouco
        sleep_ms(500);
        cyw43_arch_poll();
    }

    mqtt_client = mqtt_client_new();
    if (mqtt_client == NULL) {
        printf("[MQTT] ERRO: Falha ao criar cliente!\n");
        return;
    }

    if (!ip4addr_aton(MQTT_BROKER_IP, &mqtt_broker_ip)) {
        printf("[MQTT] IP invalido, tentando resolver DNS...\n");
        err_t err = dns_gethostbyname(MQTT_BROKER_IP, &mqtt_broker_ip, dns_found_cb, NULL);

        if (err == ERR_INPROGRESS) {
            printf("[MQTT] Aguardando resolucao DNS...\n");
            for (int i = 0; i < 50; i++) {
                sleep_ms(100);
                cyw43_arch_poll();
                if (mqtt_broker_ip.addr != 0) break;
            }
        }

        if (mqtt_broker_ip.addr == 0) {
            printf("[MQTT] ERRO: Nao foi possivel resolver o broker!\n");
            mqtt_client_free(mqtt_client);
            mqtt_client = NULL;
            return;
        }
    }

    printf("[MQTT] Conectando ao broker %s:%d...\n",
           ip4addr_ntoa(&mqtt_broker_ip), MQTT_BROKER_PORT);

    struct mqtt_connect_client_info_t ci;
    memset(&ci, 0, sizeof(ci));
    ci.client_id = MQTT_CLIENT_ID;
    ci.keep_alive = 60;

    err_t err = mqtt_client_connect(mqtt_client, &mqtt_broker_ip, MQTT_BROKER_PORT,
                                    mqtt_connection_cb, NULL, &ci);

    if (err != ERR_OK) {
        printf("[MQTT] ERRO ao iniciar conexao! Codigo: %d\n", err);
        mqtt_connected = false;
        mqtt_client_free(mqtt_client);
        mqtt_client = NULL;
    } else {
        printf("[MQTT] Conexao iniciada, aguardando confirmacao...\n");
    }
}

void publish_status(const char *status) {
    if (!mqtt_connected) return;

    char payload[128];
    snprintf(payload, sizeof(payload),
             "{\"status\":\"%s\",\"rfid\":true,\"distance\":true,\"reader\":\"PicoW\"}",
             status);

    mqtt_publish(mqtt_client, MQTT_TOPIC_STATUS, payload, strlen(payload),
                0, 0, mqtt_pub_request_cb, NULL);
}

void mqtt_reconnect(void) {
    if (mqtt_connected || !wifi_connected) return;

    absolute_time_t now = get_absolute_time();
    int64_t diff_ms = absolute_time_diff_us(last_reconnect_attempt, now) / 1000;

    if (diff_ms < RECONNECT_DELAY_MS) return;

    printf("[MQTT] Tentando reconectar...\n");
    last_reconnect_attempt = now;
    mqtt_init_and_connect();
}

// ========== FUNÇÃO PRINCIPAL ==========

int main() {
    stdio_init_all();
    sleep_ms(3000);

    printf("\n");
    printf("========================================\n");
    printf("  Hardware Layer Unificado\n");
    printf("  RFID + Sensores de Distancia\n");
    printf("  Dashboard Integration via MQTT\n");
    printf("========================================\n\n");

    // PASSO 1: Conectar ao WiFi
    connect_wifi();
    if (!wifi_connected) {
        printf("\n[ERRO] WiFi nao conectou! Verifique credenciais.\n");
        printf("Encerrando...\n");
        return 1;
    }

    // PASSO 2: Conectar ao broker MQTT
    mqtt_init_and_connect();
    sleep_ms(2000);

    if (!mqtt_connected) {
        printf("\n[AVISO] MQTT nao conectou! Tentando continuar...\n");
        printf("Verifique se o broker esta rodando em: %s:%d\n",
               MQTT_BROKER_IP, MQTT_BROKER_PORT);
    }

    // PASSO 3: Configurar hardware RFID
    printf("\n[RFID] Configurando hardware...\n");
    setup_gpio_rfid();

    MFRC522Ptr_t mfrc = MFRC522_Init();
    if (mfrc == NULL) {
        printf("[ERRO] Falha ao inicializar MFRC522!\n");
        printf("Verifique conexoes do modulo RFID:\n");
        printf("  MISO -> GP%d\n", PIN_MISO);
        printf("  MOSI -> GP%d\n", PIN_MOSI);
        printf("  SCK  -> GP%d\n", PIN_SCK);
        printf("  CS   -> GP%d\n", PIN_CS);
        printf("  RST  -> GP%d\n", PIN_RST);
        while(1) sleep_ms(1000);
    }

    PCD_Init(mfrc, spi0);
    printf("[RFID] Leitor inicializado com sucesso!\n");

    // PASSO 4: Configurar sensores de distância
    printf("\n[DISTANCIA] Configurando I2C e sensores...\n");
    setup_i2c_distance();
    init_distance_sensors();

    printf("\n========================================\n");
    printf("  Sistema pronto!\n");
    printf("========================================\n");
    printf("Topicos MQTT:\n");
    printf("  - RFID: %s\n", MQTT_TOPIC_RFID);
    printf("  - Distancia: %s\n", MQTT_TOPIC_DISTANCE);
    printf("  - Status: %s\n", MQTT_TOPIC_STATUS);
    printf("\nLendo sensores e publicando via MQTT...\n\n");

    // Inicializa controle de tempo
    last_read_time = get_absolute_time();
    last_reconnect_attempt = get_absolute_time();
    absolute_time_t last_status = get_absolute_time();
    absolute_time_t last_distance_publish = get_absolute_time();

    uint32_t loop_count = 0;

    // ========== LOOP PRINCIPAL ==========
    while (1) {
        // Processa eventos de rede (crítico para lwIP)
        cyw43_arch_poll();

        // Reconecta MQTT se necessário (com proteção de taxa)
        if (!mqtt_connected && wifi_connected) {
            mqtt_reconnect();
        }

        // Lê sensores de distância continuamente
        read_distance_sensors();

        // Obtém timestamp atual
        absolute_time_t now = get_absolute_time();

        // Publica distâncias a cada segundo (com verificação de conexão)
        if (mqtt_connected && absolute_time_diff_us(last_distance_publish, now) > 1000000) {
            publish_distance_data();
            last_distance_publish = now;
            // Dá tempo para processar a publicação
            cyw43_arch_poll();
            sleep_ms(10);
        }

        // Verifica se há cartão RFID próximo
        if (PICC_IsNewCardPresent(mfrc)) {
            if (PICC_ReadCardSerial(mfrc)) {
                if (!is_same_tag(mfrc->uid.uidByte, mfrc->uid.size)) {
                    publish_rfid_tag(mfrc->uid.uidByte, mfrc->uid.size);
                    printf("----------------------------------------\n");
                    // Dá tempo para processar a publicação
                    cyw43_arch_poll();
                    sleep_ms(10);
                }
                PCD_StopCrypto1(mfrc);
            }
        }

        // Publica status periodicamente (a cada 30 segundos)
        if (mqtt_connected && absolute_time_diff_us(last_status, now) > STATUS_PUBLISH_INTERVAL) {
            publish_status("online");
            last_status = now;
            printf("[INFO] Status publicado (loop: %lu)\n", loop_count);
            // Dá tempo para processar a publicação
            cyw43_arch_poll();
            sleep_ms(10);
        }

        loop_count++;
        sleep_ms(SCAN_INTERVAL_MS);
    }

    // Cleanup (nunca alcançado)
    if (wifi_connected) {
        mqtt_disconnect(mqtt_client);
        cyw43_arch_deinit();
    }

    return 0;
}
