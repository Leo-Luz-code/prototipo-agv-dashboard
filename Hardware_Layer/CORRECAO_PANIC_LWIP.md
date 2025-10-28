# Correção do Erro "PANIC: MEMP_SYS_TIMEOUT is empty"

## Problema Identificado

O erro `*** PANIC *** sys_timeout: timeout != NULL, pool MEMP_SYS_TIMEOUT is empty` ocorreu devido ao esgotamento do pool de timeouts do lwIP (lightweight IP stack).

### Causas Raiz

1. **Pool de timeouts insuficiente**: O valor padrão do lwIP (5 timeouts) é muito pequeno para aplicações MQTT com múltiplas operações simultâneas
2. **Falta de controle de taxa nas publicações MQTT**: Múltiplas chamadas `mqtt_publish()` sem verificação de estado
3. **Reconexões MQTT sem cleanup adequado**: Recursos não eram liberados corretamente antes de criar novos clientes
4. **Falta de verificação de estado do cliente MQTT**: Publicações eram tentadas mesmo quando o cliente não estava pronto

## Correções Aplicadas

### 1. Configuração do lwIP (lib/lwipopts.h)

Adicionadas configurações de pools de memória:

```c
// Pools críticos para evitar esgotamento de recursos
#define MEMP_NUM_SYS_TIMEOUT 16        // Aumentado de 5 para 16
#define MEMP_NUM_NETBUF 8
#define MEMP_NUM_NETCONN 8
#define MEMP_NUM_TCP_PCB 8
#define MEMP_NUM_TCP_PCB_LISTEN 4
#define MEMP_NUM_UDP_PCB 8
#define MEMP_NUM_PBUF 32
#define MEMP_NUM_TCPIP_MSG_INPKT 16

// Configurações MQTT específicas
#define MQTT_OUTPUT_RINGBUF_SIZE 512
#define MQTT_VAR_HEADER_BUFFER_LEN 128
#define MQTT_REQ_MAX_IN_FLIGHT 4       // Limita requisições simultâneas
```

### 2. Verificação de Estado do Cliente MQTT (main.c)

Adicionadas verificações antes de publicar:

```c
// Verifica se o cliente MQTT está pronto
if (mqtt_client == NULL || !mqtt_client_is_connected(mqtt_client)) {
    printf("[MQTT] Cliente nao esta pronto, pulando publicacao...\n");
    mqtt_connected = false;
    return;
}
```

### 3. Controle de Taxa no Loop Principal (main.c)

- Adicionado `cyw43_arch_poll()` após cada publicação MQTT
- Adicionado delay de 10ms após publicações para dar tempo de processar
- Verificação de `mqtt_connected` antes de tentar publicar

### 4. Melhor Gerenciamento de Reconexão (main.c)

```c
void mqtt_init_and_connect(void) {
    // Limpa cliente antigo com cuidado
    if (mqtt_client != NULL) {
        if (mqtt_client_is_connected(mqtt_client)) {
            mqtt_disconnect(mqtt_client);
        }

        // Aguarda limpeza de recursos
        for (int i = 0; i < 10; i++) {
            cyw43_arch_poll();
            sleep_ms(100);
        }

        mqtt_client_free(mqtt_client);
        mqtt_client = NULL;
    }
    // ... continua com nova conexão
}
```

## Como Recompilar

1. Navegue até a pasta do projeto:
   ```bash
   cd Hardware_Layer
   ```

2. Limpe o build anterior:
   ```bash
   rm -rf build
   ```

3. Crie novo diretório de build:
   ```bash
   mkdir build
   cd build
   ```

4. Configure o CMake:
   ```bash
   cmake ..
   ```

5. Compile:
   ```bash
   make
   ```

6. Flash no Raspberry Pi Pico W:
   - Segure o botão BOOTSEL no Pico W
   - Conecte o cabo USB
   - Copie o arquivo `build/main.uf2` para a unidade RPI-RP2 que aparecer

## Resultados Esperados

- Sistema não deve mais apresentar panic do lwIP
- Reconexões MQTT devem funcionar corretamente
- Publicações MQTT devem ser mais estáveis
- Memória do stack TCP/IP não deve esgotar

## Monitoramento

Para verificar se o sistema está funcionando corretamente:

1. Conecte via serial (115200 baud):
   ```bash
   screen /dev/ttyACM0 115200
   ```

2. Verifique as mensagens:
   - `[MQTT] Conectado ao broker!` - Conexão estabelecida
   - `[RFID] Tag detectada: XXXXXXXX` - RFID funcionando
   - `[DISTANCIA] Esq: X.X cm | Centro: X.X cm | Dir: X.X cm` - Sensores funcionando
   - Sem mensagens de PANIC ou ERRO

## Prevenção Futura

Para evitar problemas similares:

1. **Limite de requisições simultâneas**: Não envie mais de 4 publicações MQTT sem aguardar resposta
2. **Sempre verifique estado**: Use `mqtt_client_is_connected()` antes de publicar
3. **Cleanup adequado**: Sempre libere recursos antes de criar novos clientes
4. **Polling regular**: Chame `cyw43_arch_poll()` regularmente para processar eventos de rede

## Referências

- lwIP documentation: https://www.nongnu.org/lwip/2_1_x/group__lwip__opts.html
- Raspberry Pi Pico W SDK: https://www.raspberrypi.com/documentation/pico-sdk/
