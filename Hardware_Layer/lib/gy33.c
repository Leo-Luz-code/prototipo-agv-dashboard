#include "gy33.h"

// --- Definições do Sensor GY-33 ---
#define GY33_I2C_ADDR 0x29          // Endereço I2C padrão do sensor

// --- Registos do Sensor GY-33 ---
#define ENABLE_REG 0x80             // Habilita o sensor e controla modos de operação
#define ATIME_REG 0x81              // Configura o tempo de integração do ADC
#define CONTROL_REG 0x8F            // Controla o ganho do sensor
#define CDATA_REG 0x94              // Registrador de dados de luz clara (Clear)
#define RDATA_REG 0x96              // Registrador de dados do canal vermelho (Red)
#define GDATA_REG 0x98              // Registrador de dados do canal verde (Green)
#define BDATA_REG 0x9A              // Registrador de dados do canal azul (Blue)

// --- Funções Internas (privadas à biblioteca) ---

// Escreve um valor em um registrador específico
static void gy33_write_register(i2c_inst_t *i2c, uint8_t reg, uint8_t value) {
    uint8_t buffer[2] = {reg, value};
    // Timeout de 100ms
    i2c_write_timeout_us(i2c, GY33_I2C_ADDR, buffer, 2, false, 100000);
}

// Lê um valor de 16 bits de um registrador específico
static uint16_t gy33_read_register(i2c_inst_t *i2c, uint8_t reg) {
    uint8_t buffer[2] = {0};
    // Timeout de 100ms para escrita e leitura
    int ret = i2c_write_timeout_us(i2c, GY33_I2C_ADDR, &reg, 1, true, 100000);
    if (ret < 0) return 0; // Retorna 0 se falhar

    ret = i2c_read_timeout_us(i2c, GY33_I2C_ADDR, buffer, 2, false, 100000);
    if (ret < 0) return 0; // Retorna 0 se falhar

    return (buffer[1] << 8) | buffer[0];
}

// --- Funções Públicas (declaradas em gy33.h) ---

// Inicializa o sensor com configurações padrão
void gy33_init(i2c_inst_t *i2c) {
    gy33_write_register(i2c, ENABLE_REG, 0x03);    // Habilita sensor e ADC
    gy33_write_register(i2c, ATIME_REG, 0xF5);      // Define tempo de integração (700ms)
    gy33_write_register(i2c, CONTROL_REG, 0x00);    // Configura ganho 1x
}

// Lê os valores de cor do sensor
void gy33_read_color(i2c_inst_t *i2c, uint16_t *r, uint16_t *g, uint16_t *b, uint16_t *c) {
    *c = gy33_read_register(i2c, CDATA_REG);        // Luz clara (intensidade total)
    *r = gy33_read_register(i2c, RDATA_REG);        // Componente vermelho
    *g = gy33_read_register(i2c, GDATA_REG);        // Componente verde
    *b = gy33_read_register(i2c, BDATA_REG);        // Componente azul
}

typedef struct {
    const char *nome;
    float r_norm;
    float g_norm;
    float b_norm;
} CorReferencia;

const CorReferencia cores_referencia[] = {
    {"Vermelho",        0.400, 0.300, 0.300},
    {"Ciano",           0.190, 0.420, 0.390},
    {"Laranja",         0.360, 0.340, 0.290},
    {"Azul-acizentado", 0.250, 0.380, 0.380},
    {"Lilas",           0.300, 0.350, 0.360},
    {"Amarelo",         0.340, 0.410, 0.250},
    {"Branco",          0.290, 0.370, 0.340},
    {"Verde",           0.250, 0.450, 0.300},
    {"Roxo",            0.245, 0.355, 0.395},
    {"Azul",            0.210, 0.350, 0.440},
    {"Azul-escuro",     0.240, 0.380, 0.380}
};

float calcular_distancia(float r1, float g1, float b1, float r2, float g2, float b2) {
    float dr = r1 - r2;
    float dg = g1 - g2;
    float db = b1 - b2;
    return dr*dr + dg*dg + db*db;
}

const char* identificar_cor(uint16_t r, uint16_t g, uint16_t b, uint16_t c) {
    if (c < 30) return "---";

    float total = r + g + b;
    if (total == 0) return "---";

    float rn = r / total;
    float gn = g / total;
    float bn = b / total;

    int num_cores = sizeof(cores_referencia) / sizeof(cores_referencia[0]);
    float menor_distancia = 999999.0;
    int indice_melhor = 0;

    for (int i = 0; i < num_cores; i++) {
        float dist = calcular_distancia(rn, gn, bn,
                                        cores_referencia[i].r_norm,
                                        cores_referencia[i].g_norm,
                                        cores_referencia[i].b_norm);
        if (dist < menor_distancia) {
            menor_distancia = dist;
            indice_melhor = i;
        }
    }

    return cores_referencia[indice_melhor].nome;
}