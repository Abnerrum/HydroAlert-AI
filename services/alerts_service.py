"""Modulo de alertas automaticos por severidade e regiao.

Regras academicas do prototipo:
- CRITICA: risco CRITICO ou nivel acima da cota critica;
- ALTA: risco ALTO ou 2+ leituras consecutivas acima da cota de alerta;
- MEDIA: risco MODERADO ou 3+ leituras consecutivas com nivel subindo.
"""

from collections import defaultdict

from iot.config import SENSORES
from logging_config import configurar_logging
from services.telemetry_service import obter_telemetria

logger = configurar_logging("hydroalert.alertas")

SENSOR_POR_ID = {sensor["sensor_id"]: sensor for sensor in SENSORES}
PESO_SEVERIDADE = {"CRITICA": 3, "ALTA": 2, "MEDIA": 1}

# Quantidade de leituras recentes analisadas por sensor.
JANELA_LEITURAS = 5
# Leituras consecutivas acima da cota de alerta para escalar para ALTA.
CONSECUTIVAS_COTA_ALERTA = 2
# Leituras consecutivas subindo para escalar para MEDIA.
CONSECUTIVAS_SUBINDO = 3


def _para_float(valor, padrao: float = 0.0) -> float:
    try:
        return float(valor)
    except (TypeError, ValueError):
        return padrao


def _contar_consecutivas(leituras: list[dict], condicao) -> int:
    """Conta quantas leituras do fim da serie atendem a condicao em sequencia."""
    total = 0
    for leitura in reversed(leituras):
        if not condicao(leitura):
            break
        total += 1
    return total


def _avaliar_sensor(sensor: dict, leituras: list[dict]) -> dict | None:
    ultima = leituras[-1]
    nivel = _para_float(ultima.get("nivel_m"))
    risco = str(ultima.get("risco", "DESCONHECIDO"))

    cota_alerta = _para_float(ultima.get("cota_alerta_m"), sensor["cota_alerta_m"])
    cota_critica = _para_float(ultima.get("cota_critica_m"), sensor["cota_critica_m"])

    acima_alerta = _contar_consecutivas(
        leituras, lambda r: _para_float(r.get("nivel_m")) >= cota_alerta
    )
    subindo = _contar_consecutivas(
        leituras, lambda r: _para_float(r.get("variacao_nivel_m")) > 0
    )

    if risco == "CRITICO" or nivel >= cota_critica:
        severidade = "CRITICA"
        motivo = f"Nivel {nivel:.3f} m atingiu ou superou a cota critica ({cota_critica:.2f} m)."
    elif risco == "ALTO" or acima_alerta >= CONSECUTIVAS_COTA_ALERTA:
        severidade = "ALTA"
        motivo = (
            f"Nivel {nivel:.3f} m acima da cota de alerta ({cota_alerta:.2f} m) "
            f"ha {max(acima_alerta, 1)} leitura(s) consecutiva(s)."
        )
    elif risco == "MODERADO" or subindo >= CONSECUTIVAS_SUBINDO:
        severidade = "MEDIA"
        motivo = (
            f"Nivel em {nivel:.3f} m com tendencia de elevacao "
            f"({subindo} leitura(s) consecutiva(s) subindo)."
        )
    else:
        return None

    return {
        "sensor_id": sensor["sensor_id"],
        "nome": sensor["nome"],
        "severidade": severidade,
        "motivo": motivo,
        "nivel_m": nivel,
        "risco": risco,
        "timestamp": ultima.get("timestamp"),
        "municipio": sensor["municipio"],
        "regiao": sensor["regiao"],
        "bairro": sensor["bairro"],
        "uf": sensor["uf"],
        "mensagem": (
            f"[{severidade}] {sensor['municipio']}/{sensor['uf']} - "
            f"{sensor['bairro']}: {motivo}"
        ),
    }


def avaliar_alertas(
    municipio: str | None = None,
    severidade: str | None = None,
) -> dict:
    """Avalia a telemetria recente e retorna os alertas ativos ordenados."""
    registros, fonte = obter_telemetria(limite=5000)

    por_sensor: dict[str, list[dict]] = defaultdict(list)
    for registro in reversed(registros):  # ordem cronologica
        sid = registro.get("sensor_id")
        if sid:
            por_sensor[sid].append(registro)

    alertas = []
    for sid, leituras in por_sensor.items():
        sensor = SENSOR_POR_ID.get(sid)
        if not sensor:
            continue
        alerta = _avaliar_sensor(sensor, leituras[-JANELA_LEITURAS:])
        if alerta:
            alertas.append(alerta)

    if municipio:
        alertas = [
            a for a in alertas if a["municipio"].casefold() == municipio.strip().casefold()
        ]
    if severidade:
        alertas = [
            a for a in alertas if a["severidade"] == severidade.strip().upper()
        ]

    alertas.sort(
        key=lambda a: (PESO_SEVERIDADE.get(a["severidade"], 0), a["nivel_m"]),
        reverse=True,
    )

    logger.info("Avaliacao de alertas: %d alerta(s) ativo(s).", len(alertas))
    return {
        "fonte": fonte,
        "total": len(alertas),
        "alertas": alertas,
    }
