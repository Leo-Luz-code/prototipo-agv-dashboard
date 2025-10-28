#ifndef TCA9548A_H
#define TCA9548A_H

#include "hardware/i2c.h"
#include <stdint.h>
#include <stdbool.h>

#define TCA9548A_DEFAULT_ADDR 0x70

// Estrutura do multiplexador
typedef struct {
    i2c_inst_t *i2c_port;
    uint8_t address;
} tca9548a_t;

// Inicializa o multiplexador
void tca9548a_init(tca9548a_t *mux, i2c_inst_t *i2c_port, uint8_t address);

// Seleciona um canal (0-7)
bool tca9548a_select_channel(tca9548a_t *mux, uint8_t channel);

// Desabilita todos os canais
bool tca9548a_disable_all(tca9548a_t *mux);

// Verifica se está conectado
bool tca9548a_is_connected(tca9548a_t *mux);

// Lê status atual dos canais
bool tca9548a_get_status(tca9548a_t *mux, uint8_t *status);

// Ativa múltiplos canais (máscara de bits)
bool tca9548a_set_channels(tca9548a_t *mux, uint8_t channel_mask);

#endif
