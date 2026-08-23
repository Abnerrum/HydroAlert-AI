from __future__ import annotations

import re
import subprocess
import threading
import time
from collections import deque

_URL_RE = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.(?:com|app)", re.IGNORECASE)
_lock = threading.Lock()
_processo: subprocess.Popen[str] | None = None
_url_publica: str | None = None
_logs: deque[str] = deque(maxlen=80)


def _processo_ativo() -> bool:
    return _processo is not None and _processo.poll() is None


def _ler_saida(processo: subprocess.Popen[str]) -> None:
    global _url_publica
    if processo.stdout is None:
        return
    for linha in processo.stdout:
        texto = linha.strip()
        if texto:
            _logs.append(texto)
        match = _URL_RE.search(texto)
        if match:
            _url_publica = match.group(0)


def status_tunnel() -> dict:
    ativo = _processo_ativo()
    return {
        "ativo": ativo,
        "url": _url_publica if ativo else None,
        "modo": "quick_tunnel",
        "aviso": "Link temporario para demonstracao. O endereco muda quando o tunnel e reiniciado.",
    }


def iniciar_tunnel(timeout_s: float = 25.0) -> dict:
    global _processo, _url_publica

    with _lock:
        if _processo_ativo():
            return status_tunnel()

        _url_publica = None
        _logs.clear()
        try:
            _processo = subprocess.Popen(
                [
                    "cloudflared",
                    "tunnel",
                    "--url",
                    "http://127.0.0.1:8000",
                    "--no-autoupdate",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
        except FileNotFoundError as erro:
            raise RuntimeError(
                "cloudflared nao esta disponivel nesta imagem. Reconstrua o container da API."
            ) from erro

        threading.Thread(target=_ler_saida, args=(_processo,), daemon=True).start()

    limite = time.monotonic() + timeout_s
    while time.monotonic() < limite:
        if _url_publica:
            return status_tunnel()
        if not _processo_ativo():
            detalhe = " | ".join(list(_logs)[-8:]) or "processo encerrado sem detalhes"
            raise RuntimeError(f"Falha ao criar link publico: {detalhe}")
        time.sleep(0.25)

    detalhe = " | ".join(list(_logs)[-8:])
    parar_tunnel()
    raise RuntimeError(
        "O link publico nao ficou pronto no tempo esperado. "
        + (f"Detalhes: {detalhe}" if detalhe else "Verifique a conexao com a internet.")
    )


def parar_tunnel() -> dict:
    global _processo, _url_publica
    with _lock:
        if _processo_ativo():
            assert _processo is not None
            _processo.terminate()
            try:
                _processo.wait(timeout=5)
            except subprocess.TimeoutExpired:
                _processo.kill()
        _processo = None
        _url_publica = None
    return status_tunnel()
