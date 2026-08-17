import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # pragma: no cover - dotenv e opcional em producao
    pass

# Intervalo padrao entre ciclos dos sensores simulados.
INTERVALO_PADRAO_SEGUNDOS = float(os.getenv("INTERVALO_PADRAO_SEGUNDOS", "5"))

# Arquivos locais de apoio e auditoria.
PASTA_DADOS = Path(
    os.getenv("DATA_DIR", str(Path(__file__).resolve().parents[1] / "data"))
)
ARQUIVO_TELEMETRIA = PASTA_DADOS / "telemetria.jsonl"
ARQUIVO_MQTT_RECEBIDO = PASTA_DADOS / "mqtt_recebido.jsonl"

# Etapa 2 - configuracao MQTT. Todos os parametros podem ser sobrescritos
# por variaveis de ambiente (ver .env.example).
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_KEEPALIVE = int(os.getenv("MQTT_KEEPALIVE", "60"))
MQTT_QOS = int(os.getenv("MQTT_QOS", "1"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME") or None
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD") or None
MQTT_TOPIC_PREFIX = os.getenv("MQTT_TOPIC_PREFIX", "hydroalert/telemetria")
MQTT_TOPIC_WILDCARD = f"{MQTT_TOPIC_PREFIX}/+"


def aplicar_credenciais_mqtt(client) -> None:
    """Aplica autenticacao no cliente MQTT quando configurada via ambiente."""
    if MQTT_USERNAME:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)


# Rede de monitoramento 100% SIMULADA para demonstracao academica em Goias.
# Coordenadas representam pontos aproximados para visualizacao do prototipo e
# NAO correspondem a estacoes hidrologicas oficiais.
SENSORES = [
    {
        "sensor_id": "GYN-SIM-001",
        "nome": "Ponto Simulado 01 - Centro",
        "estado": "Goias",
        "uf": "GO",
        "municipio": "Goiania",
        "regiao": "Central",
        "bairro": "Setor Central",
        "latitude": -16.6869,
        "longitude": -49.2648,
        "cota_atencao_m": 1.80,
        "cota_alerta_m": 2.40,
        "cota_critica_m": 3.00,
    },
    {
        "sensor_id": "GYN-SIM-002",
        "nome": "Ponto Simulado 02 - Sul",
        "estado": "Goias",
        "uf": "GO",
        "municipio": "Goiania",
        "regiao": "Sul",
        "bairro": "Setor Bueno",
        "latitude": -16.7035,
        "longitude": -49.2715,
        "cota_atencao_m": 1.70,
        "cota_alerta_m": 2.30,
        "cota_critica_m": 2.90,
    },
    {
        "sensor_id": "GYN-SIM-003",
        "nome": "Ponto Simulado 03 - Oeste",
        "estado": "Goias",
        "uf": "GO",
        "municipio": "Goiania",
        "regiao": "Oeste",
        "bairro": "Setor Campinas",
        "latitude": -16.6775,
        "longitude": -49.2895,
        "cota_atencao_m": 1.90,
        "cota_alerta_m": 2.50,
        "cota_critica_m": 3.10,
    },
    {
        "sensor_id": "GYN-SIM-004",
        "nome": "Ponto Simulado 04 - Norte",
        "estado": "Goias",
        "uf": "GO",
        "municipio": "Goiania",
        "regiao": "Norte",
        "bairro": "Jardim Guanabara",
        "latitude": -16.6245,
        "longitude": -49.2120,
        "cota_atencao_m": 1.75,
        "cota_alerta_m": 2.35,
        "cota_critica_m": 2.95,
    },
    {
        "sensor_id": "APG-SIM-001",
        "nome": "Ponto Simulado 01 - Aparecida Centro",
        "estado": "Goias",
        "uf": "GO",
        "municipio": "Aparecida de Goiania",
        "regiao": "Central",
        "bairro": "Centro",
        "latitude": -16.8235,
        "longitude": -49.2433,
        "cota_atencao_m": 1.65,
        "cota_alerta_m": 2.20,
        "cota_critica_m": 2.80,
    },
    {
        "sensor_id": "APG-SIM-002",
        "nome": "Ponto Simulado 02 - Garavelo",
        "estado": "Goias",
        "uf": "GO",
        "municipio": "Aparecida de Goiania",
        "regiao": "Oeste",
        "bairro": "Garavelo",
        "latitude": -16.7535,
        "longitude": -49.3335,
        "cota_atencao_m": 1.80,
        "cota_alerta_m": 2.40,
        "cota_critica_m": 3.00,
    },
    {
        "sensor_id": "ANP-SIM-001",
        "nome": "Ponto Simulado 01 - Anapolis Centro",
        "estado": "Goias",
        "uf": "GO",
        "municipio": "Anapolis",
        "regiao": "Central",
        "bairro": "Centro",
        "latitude": -16.3281,
        "longitude": -48.9530,
        "cota_atencao_m": 1.70,
        "cota_alerta_m": 2.30,
        "cota_critica_m": 2.90,
    },
    {
        "sensor_id": "ANP-SIM-002",
        "nome": "Ponto Simulado 02 - Jundiai",
        "estado": "Goias",
        "uf": "GO",
        "municipio": "Anapolis",
        "regiao": "Leste",
        "bairro": "Jundiai",
        "latitude": -16.3260,
        "longitude": -48.9440,
        "cota_atencao_m": 1.85,
        "cota_alerta_m": 2.45,
        "cota_critica_m": 3.05,
    },
    {
        "sensor_id": "RVD-SIM-001",
        "nome": "Ponto Simulado 01 - Rio Verde",
        "estado": "Goias",
        "uf": "GO",
        "municipio": "Rio Verde",
        "regiao": "Central",
        "bairro": "Centro",
        "latitude": -17.7923,
        "longitude": -50.9192,
        "cota_atencao_m": 1.90,
        "cota_alerta_m": 2.50,
        "cota_critica_m": 3.10,
    },
    {
        "sensor_id": "LUZ-SIM-001",
        "nome": "Ponto Simulado 01 - Luziania",
        "estado": "Goias",
        "uf": "GO",
        "municipio": "Luziania",
        "regiao": "Central",
        "bairro": "Centro",
        "latitude": -16.2525,
        "longitude": -47.9500,
        "cota_atencao_m": 1.75,
        "cota_alerta_m": 2.35,
        "cota_critica_m": 2.95,
    },
    {
        "sensor_id": "TRI-SIM-001",
        "nome": "Ponto Simulado 01 - Trindade",
        "estado": "Goias",
        "uf": "GO",
        "municipio": "Trindade",
        "regiao": "Central",
        "bairro": "Centro",
        "latitude": -16.6517,
        "longitude": -49.4927,
        "cota_atencao_m": 1.80,
        "cota_alerta_m": 2.40,
        "cota_critica_m": 3.00,
    },
    {
        "sensor_id": "SEN-SIM-001",
        "nome": "Ponto Simulado 01 - Senador Canedo",
        "estado": "Goias",
        "uf": "GO",
        "municipio": "Senador Canedo",
        "regiao": "Central",
        "bairro": "Centro",
        "latitude": -16.7080,
        "longitude": -49.0910,
        "cota_atencao_m": 1.70,
        "cota_alerta_m": 2.30,
        "cota_critica_m": 2.90,
    },
]
