#ifndef MPU6050_H
#define MPU6050_H
#include "hardware/i2c.h"

//Estrutura para armazenar dados convertidos do sensor
typedef struct {
    float accel_x; //Aceleração no eixo X (m/s²)
    float accel_y; //Aceleração no eixo Y (m/s²)
    float accel_z; //Aceleração no eixo Z (m/s²)
    float gyro_x;  //Velocidade angular no eixo X (rad/s)
    float gyro_y;  //Velocidade angular no eixo Y (rad/s)
    float gyro_z;  //Velocidade angular no eixo Z (rad/s)
    float temp_c;  //Temperatura (°C)
} mpu6050_data_t;

//Inicializa o sensor MPU6050
void mpu6050_init(i2c_inst_t *i2c); //Configura registradores e ativa o dispositivo

//Lê e converte dados do sensor
void mpu6050_read_data(mpu6050_data_t *data); //Preenche a estrutura com dados calibrados

#endif //MPU6050_H