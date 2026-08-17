import os
from copy import deepcopy
from datetime import datetime, timezone

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DATABASE = os.getenv("MONGO_DATABASE", "hydroalert_ai")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "telemetria")
MONGO_TIMEOUT_MS = int(os.getenv("MONGO_TIMEOUT_MS", "2000"))
MONGO_TTL_DIAS = int(os.getenv("MONGO_TTL_DIAS", "0") or "0")

_client: MongoClient | None = None


def obter_cliente() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=MONGO_TIMEOUT_MS,
            connectTimeoutMS=MONGO_TIMEOUT_MS,
        )
    return _client


def obter_colecao() -> Collection:
    return obter_cliente()[MONGO_DATABASE][MONGO_COLLECTION]


def preparar_banco() -> None:
    """Valida a conexao e garante os indices usados pelo projeto.

    Indices:
    - sensor_timestamp: consultas da API e do ML por sensor ordenadas por data;
    - risco: filtros de alertas por severidade;
    - timestamp_desc: consultas globais ordenadas pela leitura mais recente;
    - municipio_timestamp: painel territorial filtrado por municipio;
    - ttl_recebido_em (opcional): expira documentos apos MONGO_TTL_DIAS dias,
      quando a variavel de ambiente e definida com valor maior que zero.
    """
    cliente = obter_cliente()
    cliente.admin.command("ping")
    colecao = obter_colecao()
    colecao.create_index(
        [("sensor_id", ASCENDING), ("timestamp", DESCENDING)],
        name="sensor_timestamp",
    )
    colecao.create_index([("risco", ASCENDING)], name="risco")
    colecao.create_index([("timestamp", DESCENDING)], name="timestamp_desc")
    colecao.create_index(
        [("localizacao.municipio", ASCENDING), ("timestamp", DESCENDING)],
        name="municipio_timestamp",
    )
    if MONGO_TTL_DIAS > 0:
        colecao.create_index(
            [("recebido_em", ASCENDING)],
            name="ttl_recebido_em",
            expireAfterSeconds=MONGO_TTL_DIAS * 86400,
        )


def status_mongodb() -> dict:
    try:
        obter_cliente().admin.command("ping")
        return {
            "conectado": True,
            "database": MONGO_DATABASE,
            "collection": MONGO_COLLECTION,
        }
    except PyMongoError as erro:
        return {
            "conectado": False,
            "database": MONGO_DATABASE,
            "collection": MONGO_COLLECTION,
            "erro": str(erro),
        }


def salvar_telemetria(dados: dict) -> str:
    documento = deepcopy(dados)
    documento["recebido_em"] = datetime.now(timezone.utc)
    resultado = obter_colecao().insert_one(documento)
    return str(resultado.inserted_id)


def listar_telemetria(limite: int = 100, sensor_id: str | None = None) -> list[dict]:
    limite = max(1, min(int(limite), 5000))
    filtro = {"sensor_id": sensor_id} if sensor_id else {}
    cursor = (
        obter_colecao()
        .find(filtro)
        .sort("timestamp", DESCENDING)
        .limit(limite)
    )

    documentos = []
    for documento in cursor:
        documento["_id"] = str(documento["_id"])
        documentos.append(documento)
    return documentos


def contar_documentos() -> int:
    return obter_colecao().count_documents({})


def limpar_cliente() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
