#include "mpu6050.h"
#include "pico/stdlib.h"
#include <stdio.h>

//Endereço I2C padrão do MPU6050
static const uint8_t MPU6050_ADDR = 0x68;

//Registradores do MPU6050
static const uint8_t REG_WHO_AM_I = 0x75;
static const uint8_t REG_SMPLRT_DIV = 0x19;
static const uint8_t REG_CONFIG = 0x1A;
static const uint8_t REG_GYRO_CONFIG = 0x1B;
static const uint8_t REG_ACCEL_CONFIG = 0x1C;
static const uint8_t REG_ACCEL_XOUT_H = 0x3B;
static const uint8_t REG_GYRO_XOUT_H = 0x43;
static const uint8_t REG_TEMP_OUT_H = 0x41;
static const uint8_t REG_PWR_MGMT_1 = 0x6B;
static const uint8_t REG_PWR_MGMT_2 = 0x6C;

//Fatores de sensibilidade (configuração padrão)
//Aceleração: ±2g -> 16384 LSB/g
//Giroscópio: ±250°/s -> 131 LSB/°/s
static const float ACCEL_SENSITIVITY = 16384.0;
static const float GYRO_SENSITIVITY = 131.0;
static const float GRAVITY_MS2 = 9.81; //Aceleração da gravidade

//Ponteiro para instância I2C
static i2c_inst_t *i2c_port;

//Reseta o MPU6050 e remove do modo de suspensão
//Função interna chamada por mpu6050_init
static void mpu6050_reset() {
    uint8_t buf[2];
    uint8_t who_am_i;

    //1. Verifica WHO_AM_I (deve retornar 0x68 ou 0x70-0x72)
    buf[0] = REG_WHO_AM_I;
    i2c_write_blocking(i2c_port, MPU6050_ADDR, buf, 1, true);
    i2c_read_blocking(i2c_port, MPU6050_ADDR, &who_am_i, 1, false);
    printf("[MPU6050] WHO_AM_I = 0x%02X (esperado: 0x68)\n", who_am_i);

    //2. Reset completo do dispositivo
    buf[0] = REG_PWR_MGMT_1;
    buf[1] = 0x80; // Bit RESET
    i2c_write_blocking(i2c_port, MPU6050_ADDR, buf, 2, false);
    sleep_ms(200); // Aguarda reset completo

    //3. Sai do modo sleep e seleciona clock
    buf[0] = REG_PWR_MGMT_1;
    buf[1] = 0x01; // Clock = PLL com referência do giroscópio X
    i2c_write_blocking(i2c_port, MPU6050_ADDR, buf, 2, false);
    sleep_ms(100);

    //4. CRÍTICO: Habilita TODOS os eixos (acelerômetro + giroscópio)
    buf[0] = REG_PWR_MGMT_2;
    buf[1] = 0x00; // Todos os eixos ativos
    i2c_write_blocking(i2c_port, MPU6050_ADDR, buf, 2, false);
    sleep_ms(50);

    //5. Configura Sample Rate Divider (1kHz / (1+0) = 1kHz)
    buf[0] = REG_SMPLRT_DIV;
    buf[1] = 0x00;
    i2c_write_blocking(i2c_port, MPU6050_ADDR, buf, 2, false);
    sleep_ms(10);

    //6. Configura filtro passa-baixa (DLPF = 6, bandwidth 5Hz)
    buf[0] = REG_CONFIG;
    buf[1] = 0x06;
    i2c_write_blocking(i2c_port, MPU6050_ADDR, buf, 2, false);
    sleep_ms(10);

    //7. Configura giroscópio para ±250°/s (FS_SEL=0)
    buf[0] = REG_GYRO_CONFIG;
    buf[1] = 0x00;
    i2c_write_blocking(i2c_port, MPU6050_ADDR, buf, 2, false);
    sleep_ms(10);

    //8. Configura acelerômetro para ±2g (AFS_SEL=0)
    buf[0] = REG_ACCEL_CONFIG;
    buf[1] = 0x00;
    i2c_write_blocking(i2c_port, MPU6050_ADDR, buf, 2, false);
    sleep_ms(10);

    printf("[MPU6050] Configuracao completa!\n");
}

//Inicializa o MPU6050
//Parâmetro: i2c - Instância I2C a ser utilizada
void mpu6050_init(i2c_inst_t *i2c) {
    i2c_port = i2c;
    mpu6050_reset();
    printf("MPU6050 inicializado com sucesso.\n");
}

//Lê e converte dados do sensor
//Parâmetro: data - Ponteiro para estrutura de dados de saída
void mpu6050_read_data(mpu6050_data_t *data) {
    uint8_t buffer[14];
    
    //Inicia leitura sequencial a partir do registrador de aceleração
    uint8_t start_reg = REG_ACCEL_XOUT_H;
    i2c_write_blocking(i2c_port, MPU6050_ADDR, &start_reg, 1, true); //Mantém controle do barramento
    i2c_read_blocking(i2c_port, MPU6050_ADDR, buffer, 14, false);

    //Combina bytes high e low para formar valores brutos (int16_t)
    int16_t raw_ax = (buffer[0] << 8) | buffer[1];
    int16_t raw_ay = (buffer[2] << 8) | buffer[3];
    int16_t raw_az = (buffer[4] << 8) | buffer[5];
    int16_t raw_temp = (buffer[6] << 8) | buffer[7];
    int16_t raw_gx = (buffer[8] << 8) | buffer[9];
    int16_t raw_gy = (buffer[10] << 8) | buffer[11];
    int16_t raw_gz = (buffer[12] << 8) | buffer[13];

    //Debug: mostra valores brutos
    printf("RAW -> AX:%d AY:%d AZ:%d TEMP:%d GX:%d GY:%d GZ:%d\n",
           raw_ax, raw_ay, raw_az, raw_temp, raw_gx, raw_gy, raw_gz);

    //Conversão para unidades físicas
    //Aceleração: LSB -> g -> m/s²
    data->accel_x = (raw_ax / ACCEL_SENSITIVITY) * GRAVITY_MS2;
    data->accel_y = (raw_ay / ACCEL_SENSITIVITY) * GRAVITY_MS2;
    data->accel_z = (raw_az / ACCEL_SENSITIVITY) * GRAVITY_MS2;

    //Giroscópio: LSB -> °/s
    data->gyro_x = raw_gx / GYRO_SENSITIVITY;
    data->gyro_y = raw_gy / GYRO_SENSITIVITY;
    data->gyro_z = raw_gz / GYRO_SENSITIVITY;

    //Temperatura: fórmula correta do datasheet MPU6050
    data->temp_c = (raw_temp / 340.0) + 36.53;
}