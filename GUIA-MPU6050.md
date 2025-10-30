# 🚀 Guia Rápido: Adicionar MPU6050

## 1️⃣ HARDWARE LAYER

### `Hardware_Layer/config.h` (linha 51+)
```c
// ========== CONFIGURAÇÕES MPU6050 ==========
#define MPU6050_ADDR        0x68    // Endereço I2C
#define MQTT_TOPIC_IMU      "agv/imu"
```

### `Hardware_Layer/lib/mpu6050.h` (criar novo arquivo)
```c
#ifndef MPU6050_H
#define MPU6050_H

#include "hardware/i2c.h"

typedef struct {
    float accel_x, accel_y, accel_z;
    float gyro_x, gyro_y, gyro_z;
    float temp;
} MPU6050_Data;

void mpu6050_init(i2c_inst_t *i2c);
MPU6050_Data mpu6050_read(i2c_inst_t *i2c);

#endif
```

### `Hardware_Layer/lib/mpu6050.c` (criar novo arquivo)
```c
#include "mpu6050.h"

void mpu6050_init(i2c_inst_t *i2c) {
    uint8_t buf[] = {0x6B, 0x00}; // Wake up
    i2c_write_blocking(i2c, MPU6050_ADDR, buf, 2, false);
}

MPU6050_Data mpu6050_read(i2c_inst_t *i2c) {
    uint8_t buffer[14];
    uint8_t reg = 0x3B;
    i2c_write_blocking(i2c, MPU6050_ADDR, &reg, 1, true);
    i2c_read_blocking(i2c, MPU6050_ADDR, buffer, 14, false);

    MPU6050_Data data;
    data.accel_x = (int16_t)(buffer[0] << 8 | buffer[1]) / 16384.0;
    data.accel_y = (int16_t)(buffer[2] << 8 | buffer[3]) / 16384.0;
    data.accel_z = (int16_t)(buffer[4] << 8 | buffer[5]) / 16384.0;
    data.temp = (int16_t)(buffer[6] << 8 | buffer[7]) / 340.0 + 36.53;
    data.gyro_x = (int16_t)(buffer[8] << 8 | buffer[9]) / 131.0;
    data.gyro_y = (int16_t)(buffer[10] << 8 | buffer[11]) / 131.0;
    data.gyro_z = (int16_t)(buffer[12] << 8 | buffer[13]) / 131.0;
    return data;
}
```

### `Hardware_Layer/main.c`

**Linha 22 (imports):**
```c
#include "mpu6050.h"
```

**Linha 59 (variáveis globais):**
```c
MPU6050_Data imu_data = {0};
```

**Linha 495 (depois de init_distance_sensors):**
```c
// PASSO 5: Configurar MPU6050
printf("\n[IMU] Configurando MPU6050...\n");
mpu6050_init(I2C_PORT);
printf("[IMU] MPU6050 inicializado!\n");
```

**Linha 511 (variáveis de tempo):**
```c
absolute_time_t last_imu_publish = get_absolute_time();
```

**Linha 565 (antes do loop_count++):**
```c
// Publica IMU a cada 500ms
if (mqtt_connected && absolute_time_diff_us(last_imu_publish, now) > 500000) {
    imu_data = mpu6050_read(I2C_PORT);

    char payload[256];
    snprintf(payload, sizeof(payload),
             "{\"accel\":{\"x\":%.2f,\"y\":%.2f,\"z\":%.2f},"
             "\"gyro\":{\"x\":%.2f,\"y\":%.2f,\"z\":%.2f},"
             "\"temp\":%.1f,\"timestamp\":%lu}",
             imu_data.accel_x, imu_data.accel_y, imu_data.accel_z,
             imu_data.gyro_x, imu_data.gyro_y, imu_data.gyro_z,
             imu_data.temp, to_ms_since_boot(get_absolute_time()));

    mqtt_publish(mqtt_client, MQTT_TOPIC_IMU, payload, strlen(payload),
                1, 0, mqtt_pub_request_cb, NULL);
    printf("[IMU] Dados publicados\n");
    last_imu_publish = now;
    cyw43_arch_poll();
    sleep_ms(10);
}
```

**No CMakeLists.txt (adicionar):**
```cmake
target_sources(hardware_layer PRIVATE
    main.c
    lib/mpu6050.c  # <-- ADICIONAR
)
```

---

## 2️⃣ BACKEND

### `src/services/agvService.js` (linha 4, dentro de sensores)
```javascript
sensores: {
    rfid: "Nenhuma",
    distancia: { esquerda: 0, centro: 0, direita: 0 },
    imu: { accel: {x:0,y:0,z:0}, gyro: {x:0,y:0,z:0}, temp: 0 }  // ADICIONAR
}
```

### `src/config/mqttBroker.js` (linha 161, depois do if agv/distance)
```javascript
// Processar dados IMU (MPU6050)
if (topic === 'agv/imu') {
  try {
    const data = JSON.parse(payload);
    console.log(`[BROKER MQTT] 📐 IMU: Accel(${data.accel.x.toFixed(2)}, ${data.accel.y.toFixed(2)}, ${data.accel.z.toFixed(2)})`);

    updateStatus({
      sensores: {
        imu: {
          accel: data.accel,
          gyro: data.gyro,
          temp: data.temp,
          timestamp: data.timestamp || Date.now()
        }
      }
    });

    const fullStatus = getStatusFromAGV();
    const { broadcast } = await import('../services/socketService.js');
    broadcast('agv/imu', fullStatus.sensores.imu);
    console.log('[BROKER MQTT] ✅ Dados IMU transmitidos!');
  } catch (e) {
    console.error('[BROKER MQTT] ❌ Erro ao processar IMU:', e);
  }
}
```

---

## 3️⃣ FRONTEND

### `src/views/sensors.html` (linha 143, antes do fechamento </main>)
```html
<!-- CARD IMU MPU6050 -->
<div id="imu-card" class="info-card">
  <h3>📐 Acelerômetro/Giroscópio (MPU6050)</h3>

  <div class="sensor-group">
    <h4>Aceleração (g)</h4>
    <div class="sensor-reading">
      <span>X:</span>
      <p id="imu-accel-x" class="value">0.00</p>
    </div>
    <div class="sensor-reading">
      <span>Y:</span>
      <p id="imu-accel-y" class="value">0.00</p>
    </div>
    <div class="sensor-reading">
      <span>Z:</span>
      <p id="imu-accel-z" class="value">0.00</p>
    </div>
  </div>

  <div class="sensor-group">
    <h4>Giroscópio (°/s)</h4>
    <div class="sensor-reading">
      <span>X:</span>
      <p id="imu-gyro-x" class="value">0.00</p>
    </div>
    <div class="sensor-reading">
      <span>Y:</span>
      <p id="imu-gyro-y" class="value">0.00</p>
    </div>
    <div class="sensor-reading">
      <span>Z:</span>
      <p id="imu-gyro-z" class="value">0.00</p>
    </div>
  </div>

  <div class="sensor-reading">
    <span>Temperatura:</span>
    <p id="imu-temp" class="value">--°C</p>
  </div>
</div>
```

### `src/views/js/sensors/imu-sensor.js` (criar novo arquivo)
```javascript
export function initIMU(socket) {
  const accelX = document.getElementById("imu-accel-x");
  const accelY = document.getElementById("imu-accel-y");
  const accelZ = document.getElementById("imu-accel-z");
  const gyroX = document.getElementById("imu-gyro-x");
  const gyroY = document.getElementById("imu-gyro-y");
  const gyroZ = document.getElementById("imu-gyro-z");
  const temp = document.getElementById("imu-temp");

  socket.on("agv/imu", (data) => {
    console.log("[IMU] Dados recebidos:", data);

    accelX.textContent = data.accel.x.toFixed(2);
    accelY.textContent = data.accel.y.toFixed(2);
    accelZ.textContent = data.accel.z.toFixed(2);

    gyroX.textContent = data.gyro.x.toFixed(2);
    gyroY.textContent = data.gyro.y.toFixed(2);
    gyroZ.textContent = data.gyro.z.toFixed(2);

    temp.textContent = `${data.temp.toFixed(1)}°C`;
  });

  console.log("[IMU] Listener Socket.IO registrado");
}
```

### `src/views/js/sensors.js` (linha 3, imports)
```javascript
import { initIMU } from "./sensors/imu-sensor.js";
```

### `src/views/js/sensors.js` (linha 10, depois de initDistanceSensors)
```javascript
initIMU(socket);
```

---

## 📋 Checklist

Hardware Layer:
- [ ] Criar `lib/mpu6050.h` e `lib/mpu6050.c`
- [ ] Adicionar defines no `config.h`
- [ ] Incluir header no `main.c`
- [ ] Adicionar variável global `imu_data`
- [ ] Inicializar sensor no setup
- [ ] Adicionar loop de publicação
- [ ] Atualizar `CMakeLists.txt`

Backend:
- [ ] Adicionar campo `imu` no `agvService.js`
- [ ] Adicionar handler no `mqttBroker.js`

Frontend:
- [ ] Adicionar card HTML no `sensors.html`
- [ ] Criar `js/sensors/imu-sensor.js`
- [ ] Importar e chamar no `js/sensors.js`

---

## 🔌 Pinagem MPU6050

```
MPU6050    →    Pico W
VCC        →    3.3V
GND        →    GND
SCL        →    GPIO21 (já usado pelo I2C)
SDA        →    GPIO20 (já usado pelo I2C)
```

**Importante:** MPU6050 usa o mesmo barramento I2C dos VL53L0X, mas não precisa do multiplexador pois tem endereço diferente (0x68).

---

## 🚀 Build e Deploy

```bash
cd Hardware_Layer/build
cmake ..
make
# Copiar hardware_layer.uf2 para o Pico W
```

```bash
cd ../..
npm start
# Acesse http://localhost:3000/sensors.html
```

**Pronto!** O MPU6050 vai aparecer na página de sensores atualizando em tempo real.
