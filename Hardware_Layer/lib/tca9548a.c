#include "tca9548a.h"

// Inicializa a estrutura do multiplexador com a porta e o endereço I2C.
void tca9548a_init(tca9548a_t *mux, i2c_inst_t *i2c_port, uint8_t address) {
    mux->i2c_port = i2c_port;
    mux->address = address;
}

// Seleciona e ativa um único canal do multiplexador (de 0 a 7).
bool tca9548a_select_channel(tca9548a_t *mux, uint8_t channel) {
    if (channel > 7) return false;
    
    uint8_t buf = 1 << channel;
    return (i2c_write_blocking(mux->i2c_port, mux->address, &buf, 1, false) == 1);
}

// Desativa todos os canais, desconectando todos os dispositivos I2C do barramento.
bool tca9548a_disable_all(tca9548a_t *mux) {
    uint8_t buf = 0x00;
    return (i2c_write_blocking(mux->i2c_port, mux->address, &buf, 1, false) == 1);
}

// Verifica se o multiplexador está respondendo no endereço I2C configurado.
bool tca9548a_is_connected(tca9548a_t *mux) {
    uint8_t dummy;
    return (i2c_read_blocking(mux->i2c_port, mux->address, &dummy, 1, false) >= 0);
}

// Lê e retorna o byte que representa os canais atualmente ativos.
bool tca9548a_get_status(tca9548a_t *mux, uint8_t *status) {
    return (i2c_read_blocking(mux->i2c_port, mux->address, status, 1, false) >= 0);
}

// Define quais canais devem estar ativos usando uma máscara de bits (ex: 0b00000101 ativa os canais 0 e 2).
bool tca9548a_set_channels(tca9548a_t *mux, uint8_t channel_mask) {
    return (i2c_write_blocking(mux->i2c_port, mux->address, &channel_mask, 1, false) == 1);
}