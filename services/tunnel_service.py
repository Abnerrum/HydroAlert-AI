from __future__ import annotations

import re
import subprocess
import threading
import time
import urllib.error
import urllib.request
from collections import deque

_URL_RE = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.(?:com|app)", re.IGNORECASE)
_lock = threading.Lock()
_processo: subprocess.Popen[str] | None = None
_url_publica: str | None = None
_publico_pronto = False
_ultimo_erro: str | None = None
_logs: deque[str] = deque(maxlen=100)


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
            _url_publica = match.group(0).rstrip("/.,;)")


def _validar_link_publico(url: str, timeout_s: float) -> tuple[bool, str | None]:
    """Espera o DNS do Quick Tunnel propagar e confirma acesso real ao HydroAlert."""
    limite = time.monotonic() + timeout_s
    ultimo_erro: str | None = None
    sucessos = 0

    while time.monotonic() < limite:
        if not _processo_ativo():
            return False, "O processo do Cloudflare Tunnel foi encerrado antes do link ficar pronto."

        try:
            req = urllib.request.Request(
                f"{url.rstrip('/')}/health",
                headers={"User-Agent": "HydroAlert-AI/2.0"},
            )
            with urllib.request.urlopen(req, timeout=5) as resposta:
                if 200 <= resposta.status < 300:
                    sucessos += 1
                    if sucessos >= 2:
                        return True, None
                    time.sleep(1.0)
                    continue
                ultimo_erro = f"HTTP {resposta.status}"
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError) as erro:
            sucessos = 0
            ultimo_erro = str(erro)

        time.sleep(1.0)

    return False, ultimo_erro or "DNS/HTTPS ainda nao ficou disponivel."


def status_tunnel() -> dict:
    ativo = _processo_ativo()
    pronto = ativo and _publico_pronto and bool(_url_publica)
    return {
        "ativo": ativo,
        "pronto": pronto,
        "gerando": ativo and not pronto,
        "url": _url_publica if pronto else None,
        "modo": "quick_tunnel",
        "erro": _ultimo_erro,
        "aviso": "Link temporario para demonstracao. O endereco muda quando o tunnel e reiniciado.",
    }


def iniciar_tunnel(timeout_s: float = 60.0) -> dict:
    global _processo, _url_publica, _publico_pronto, _ultimo_erro

    with _lock:
        if _processo_ativo() and _publico_pronto and _url_publica:
            return status_tunnel()

        if not _processo_ativo():
            _url_publica = None
            _publico_pronto = False
            _ultimo_erro = None
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

    limite_url = time.monotonic() + min(20.0, timeout_s)
    while time.monotonic() < limite_url:
        if _url_publica:
            break
        if not _processo_ativo():
            detalhe = " | ".join(list(_logs)[-8:]) or "processo encerrado sem detalhes"
            _ultimo_erro = detalhe
            raise RuntimeError(f"Falha ao criar link publico: {detalhe}")
        time.sleep(0.25)

    if not _url_publica:
        detalhe = " | ".join(list(_logs)[-8:])
        _ultimo_erro = detalhe or "Cloudflare nao forneceu uma URL publica."
        parar_tunnel()
        raise RuntimeError(
            "O Cloudflare nao forneceu o endereco publico no tempo esperado. "
            + (f"Detalhes: {detalhe}" if detalhe else "Tente novamente em alguns segundos.")
        )

    restante = max(10.0, timeout_s - 20.0)
    pronto, erro = _validar_link_publico(_url_publica, restante)
    if not pronto:
        _ultimo_erro = erro
        url_falha = _url_publica
        parar_tunnel()
        raise RuntimeError(
            "O link foi criado, mas ainda nao ficou acessivel pela internet. "
            f"URL testada: {url_falha}. Detalhe: {erro}. Tente gerar novamente."
        )

    _publico_pronto = True
    _ultimo_erro = None
    return status_tunnel()


def parar_tunnel() -> dict:
    global _processo, _url_publica, _publico_pronto
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
        _publico_pronto = False
    return status_tunnel()
