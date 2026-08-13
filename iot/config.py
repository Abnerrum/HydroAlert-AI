from pathlib import Path

# Intervalo padrao entre ciclos dos sensores simulados.
INTERVALO_PADRAO_SEGUNDOS = 5

# Arquivos locais de apoio e auditoria.
PASTA_DADOS = Path(__file__).resolve().parents[1] / "data"
ARQUIVO_TELEMETRIA = PASTA_DADOS / "telemetria.jsonl"
ARQUIVO_MQTT_RECEBIDO = PASTA_DADOS / "mqtt_recebido.jsonl"

# Etapa 2 - configuracao MQTT local.
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_KEEPALIVE = 60
MQTT_QOS = 1
MQTT_TOPIC_PREFIX = "hydroalert/telemetria"
MQTT_TOPIC_WILDCARD = f"{MQTT_TOPIC_PREFIX}/+"

# Pontos de monitoramento SIMULADOS para o MVP em Goiania/GO.
# As coordenadas servem apenas para demonstracao academica nesta etapa.
SENSORES = [
    {
        "sensor_id": "GYN-SIM-001",
        "nome": "Ponto Simulado 01 - Regiao Central",
        "latitude": -16.6869,
        "longitude": -49.2648,
        "cota_atencao_m": 1.80,
        "cota_alerta_m": 2.40,
        "cota_critica_m": 3.00,
    },
    {
        "sensor_id": "GYN-SIM-002",
        "nome": "Ponto Simulado 02 - Regiao Sul",
        "latitude": -16.7150,
        "longitude": -49.2650,
        "cota_atencao_m": 1.70,
        "cota_alerta_m": 2.30,
        "cota_critica_m": 2.90,
    },
    {
        "sensor_id": "GYN-SIM-003",
        "nome": "Ponto Simulado 03 - Regiao Oeste",
        "latitude": -16.6900,
        "longitude": -49.3000,
        "cota_atencao_m": 1.90,
        "cota_alerta_m": 2.50,
        "cota_critica_m": 3.10,
    },
]
