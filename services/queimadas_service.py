"""Consulta focos satelitais recentes do INPE. Não representa incêndios confirmados."""
from __future__ import annotations

import csv
import io
import re
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from threading import Lock
from urllib.request import Request, urlopen

INPE_URL = "https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/10min/"
PADRAO = re.compile(r"focos_10min_\d{8}_\d{4}\.csv")
ESTADOS = {
    "ACRE": "AC", "ALAGOAS": "AL", "AMAPA": "AP", "AMAZONAS": "AM",
    "BAHIA": "BA", "CEARA": "CE", "DISTRITO FEDERAL": "DF",
    "ESPIRITO SANTO": "ES", "GOIAS": "GO", "MARANHAO": "MA",
    "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS",
    "MINAS GERAIS": "MG", "PARA": "PA", "PARAIBA": "PB",
    "PARANA": "PR", "PERNAMBUCO": "PE", "PIAUI": "PI",
    "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN",
    "RIO GRANDE DO SUL": "RS", "RONDONIA": "RO", "RORAIMA": "RR",
    "SANTA CATARINA": "SC", "SAO PAULO": "SP", "SERGIPE": "SE",
    "TOCANTINS": "TO",
}
_CACHE: tuple[float, dict] | None = None
_LOCK = Lock()


def _normalizar(valor: str | None) -> str:
    n = unicodedata.normalize("NFD", str(valor or "").upper().strip())
    return "".join(c for c in n if not unicodedata.combining(c))


def _linha(linha: dict, *nomes: str):
    chaves = {_normalizar(k).replace("_", ""): v for k, v in linha.items()}
    for nome in nomes:
        v = chaves.get(_normalizar(nome).replace("_", ""))
        if v is not None:
            return v
    return None


def _numero(valor):
    if valor is None or str(valor).strip() == "":
        return None
    try:
        n = float(str(valor).replace(",", "."))
    except (ValueError, TypeError):
        return None
    import math

    return n if math.isfinite(n) else None


def _data(valor):
    m = re.match(r"^(\d{4})[/-](\d{2})[/-](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?", str(valor or ""))
    return f"{m[1]}-{m[2]}-{m[3]}T{m[4]}:{m[5]}:{m[6] or '00'}Z" if m else None


def interpretar_csv(texto: str) -> tuple[bool, list[dict]]:
    if not texto.strip():
        return False, []
    primeira = texto.removeprefix("\ufeff").splitlines()[0]
    delim = ";" if primeira.count(";") > primeira.count(",") else ","
    leitor = csv.DictReader(io.StringIO(texto.removeprefix("\ufeff")), delimiter=delim)
    cabe = {_normalizar(v).replace("_", "") for v in (leitor.fieldnames or [])}
    if not (("LATITUDE" in cabe or "LAT" in cabe) and
            ("LONGITUDE" in cabe or "LON" in cabe)):
        return False, []
    registros = []
    for linha in leitor:
        lat = _numero(_linha(linha, "Latitude", "Lat"))
        lon = _numero(_linha(linha, "Longitude", "Lon"))
        if lat is None or lon is None or not (-34 <= lat <= 6 and -74.5 <= lon <= -33):
            continue
        pais = _normalizar(_linha(linha, "Pais", "Country"))
        if pais and pais not in {"BRASIL", "BRAZIL", "BR"}:
            continue
        estado = _normalizar(_linha(linha, "Estado", "UF", "State"))
        uf = estado if estado in ESTADOS.values() else ESTADOS.get(estado)
        if not uf:
            continue
        registros.append({
            "latitude": lat, "longitude": lon, "uf": uf,
            "municipio": str(_linha(linha, "Municipio") or "")[:100],
            "satelite": str(_linha(linha, "Satelite", "Satellite") or "")[:40],
            "timestamp_utc": _data(_linha(linha, "DataHora", "data_hora_gmt")),
            "bioma": str(_linha(linha, "Bioma") or "")[:50],
            "frp": _numero(_linha(linha, "FRP")),
        })
    return True, registros


def _obter(url: str) -> str:
    with urlopen(Request(url, headers={"User-Agent": "HydroAlertAI-Academic/3.0"}), timeout=8) as r:
        return r.read(3_000_000).decode("utf-8-sig", errors="replace")


def consultar_queimadas(forcar: bool = False, obter=None, uf: str = '') -> dict:
    """Mostra as seis últimas edições de 10min. Sem dados fictícios."""
    global _CACHE
    obter = obter or _obter
    with _LOCK:
        if obter is _obter and not forcar and not uf and _CACHE and time.monotonic() < _CACHE[0]:
            return _CACHE[1]

    nomes = sorted(set(PADRAO.findall(obter(INPE_URL))))[-6:]
    if not nomes:
        raise ValueError("INPE sem arquivos recentes publicados")
    por_chave: dict[tuple, dict] = {}
    validos = 0
    with ThreadPoolExecutor(max_workers=6) as pool:
        jobs = [pool.submit(obter, INPE_URL + nome) for nome in nomes]
        for f in as_completed(jobs):
            try:
                valido, dados = interpretar_csv(f.result())
            except (OSError, ValueError, TimeoutError):
                continue
            if not valido:
                continue
            validos += 1
            for item in dados:
                key = (item["latitude"], item["longitude"], item["timestamp_utc"], item["satelite"])
                por_chave.setdefault(key, item)
    if validos == 0:
        raise ValueError("Nenhum CSV do INPE pôde ser validado")
    focos = sorted(por_chave.values(), key=lambda x: x["timestamp_utc"] or "", reverse=True)
    por_uf: dict[str, int] = {}
    for foco in focos:
        uf = foco["uf"]
        por_uf[uf] = por_uf.get(uf, 0) + 1
    ultimo = nomes[-1].removeprefix("focos_10min_").removesuffix(".csv")
    stamp = datetime.strptime(ultimo, "%Y%m%d_%H%M").replace(tzinfo=UTC)
    idade = max(0, int((datetime.now(UTC) - stamp).total_seconds() / 60))
    resposta = {
        "fonte": "INPE / Programa Queimadas",
        "tipo": "deteccoes_satelitais",
        "status": "desatualizado" if idade > 90 else "recente",
        "periodo": "6 edições de ~10 minutos (não acumulado nacional 24h)",
        "arquivos_consultados": len(nomes), "arquivos_validos": validos,
        "parcial": validos < len(nomes),
        "ultimo_arquivo_utc": stamp.isoformat().replace("+00:00", "Z"),
        "consulta_em_utc": datetime.now(UTC).isoformat(),
        "atraso_minutos": idade,
        "total_deteccoes": len(focos), "por_uf": por_uf,
        "focos": [f for f in focos if not uf or f["uf"] == uf][:600],
        "total_exibido": min(600, (por_uf.get(uf, 0) if uf else len(focos))),
        "filtro_uf": uf or None,
        "url_fonte": INPE_URL,
        "aviso": (
            "Focos de calor detectados por satélite, não incêndios confirmados. "
            "A origem tem atrasos e limites de detecção; não são alertas de emergência."
        ),
    }
    with _LOCK:
        if obter is _obter and not uf:
            _CACHE = (time.monotonic() + 600, resposta)
    return resposta
