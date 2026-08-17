"""Schemas Pydantic para validacao da telemetria recebida via MQTT."""

from pydantic import BaseModel, Field


class Localizacao(BaseModel):
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    estado: str | None = None
    uf: str | None = None
    municipio: str | None = None
    regiao: str | None = None
    bairro: str | None = None

    model_config = {"extra": "allow"}


class LeituraTelemetria(BaseModel):
    """Contrato minimo de uma leitura de sensor do HydroAlert AI.

    Apenas os campos essenciais sao obrigatorios; os demais metadados
    territoriais sao opcionais para manter compatibilidade com documentos
    antigos gravados antes da etapa territorial.
    """

    sensor_id: str = Field(min_length=1, max_length=64)
    chuva_mm: float = Field(ge=0, le=1000)
    nivel_m: float = Field(ge=0, le=50)
    timestamp: str | None = None
    nome: str | None = None
    variacao_nivel_m: float | None = None
    tendencia: str | None = None
    cota_atencao_m: float | None = Field(default=None, ge=0)
    cota_alerta_m: float | None = Field(default=None, ge=0)
    cota_critica_m: float | None = Field(default=None, ge=0)
    risco: str | None = None
    status_sensor: str | None = None
    origem: str | None = None
    localizacao: Localizacao | None = None

    model_config = {"extra": "allow"}


def validar_leitura(dados: dict) -> LeituraTelemetria:
    """Valida um dicionario recebido do broker contra o schema de telemetria."""
    return LeituraTelemetria.model_validate(dados)
