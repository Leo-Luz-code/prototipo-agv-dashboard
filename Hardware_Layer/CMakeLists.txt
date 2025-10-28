# == DO NOT EDIT THE FOLLOWING LINES for the Raspberry Pi Pico VS Code Extension to work ==
if(WIN32)
    set(USERHOME $ENV{USERPROFILE})
else()
    set(USERHOME $ENV{HOME})
endif()
set(sdkVersion 2.1.0)
set(toolchainVersion 13_3_Rel1)
set(picotoolVersion 2.1.0)
set(picoVscode ${USERHOME}/.pico-sdk/cmake/pico-vscode.cmake)
if (EXISTS ${picoVscode})
    include(${picoVscode})
endif()
# ====================================================================================

cmake_minimum_required(VERSION 3.13)

set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Configuração da placa Pico W (necessário para WiFi)
set(PICO_BOARD pico_w CACHE STRING "Board type")

# Importar SDK do Raspberry Pi Pico
include(pico_sdk_import.cmake)

# Definir projeto
project(Hardware_Layer C CXX ASM)

# Inicializar SDK
pico_sdk_init()

# ========== COLETAR ARQUIVOS FONTE ==========

# Bibliotecas do RFID
set(RFID_SOURCES
    lib/mfrc522.c
)

# Bibliotecas dos sensores de distância
file(GLOB_RECURSE DISTANCE_SOURCES
    "lib/tca9548a.c"
    "lib/vl53l0x/core/src/*.c"
    "lib/vl53l0x/platform/src/*.c"
)

# Arquivo principal
set(MAIN_SOURCE
    main.c
)

# ========== CRIAR EXECUTÁVEL ==========

add_executable(Hardware_Layer
    ${MAIN_SOURCE}
    ${RFID_SOURCES}
    ${DISTANCE_SOURCES}
)

# ========== CONFIGURAÇÕES DO PROGRAMA ==========

pico_set_program_name(Hardware_Layer "Hardware_Layer")
pico_set_program_version(Hardware_Layer "1.0")

# Habilitar saída UART e USB para debug
pico_enable_stdio_uart(Hardware_Layer 1)
pico_enable_stdio_usb(Hardware_Layer 1)

# ========== INCLUIR DIRETÓRIOS DE HEADERS ==========

target_include_directories(Hardware_Layer PRIVATE
    ${CMAKE_CURRENT_LIST_DIR}
    ${CMAKE_CURRENT_LIST_DIR}/lib
    ${CMAKE_CURRENT_LIST_DIR}/lib/vl53l0x/core/inc
    ${CMAKE_CURRENT_LIST_DIR}/lib/vl53l0x/platform/inc
)

# ========== BIBLIOTECAS NECESSÁRIAS ==========

target_link_libraries(Hardware_Layer
    # Biblioteca padrão do Pico
    pico_stdlib

    # WiFi + lwIP (necessário para MQTT)
    pico_cyw43_arch_lwip_poll

    # Cliente MQTT do lwIP
    pico_lwip_mqtt

    # Comunicação SPI (para RFID MFRC522)
    hardware_spi

    # Comunicação I2C (para sensores de distância)
    hardware_i2c

    # UART (para debug)
    hardware_uart
)

# ========== GERAR ARQUIVOS DE SAÍDA ==========

# Gera arquivos .uf2, .bin, .hex, .map
pico_add_extra_outputs(Hardware_Layer)


