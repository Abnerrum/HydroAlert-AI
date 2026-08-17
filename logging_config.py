"""Configuracao centralizada de logging do HydroAlert AI."""

import logging
import os

_FORMATO = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"


def configurar_logging(nome: str = "hydroalert") -> logging.Logger:
    """Inicializa o logging padrao do projeto e retorna um logger nomeado.

    O nivel pode ser ajustado pela variavel de ambiente LOG_LEVEL
    (DEBUG, INFO, WARNING, ERROR). Padrao: INFO.
    """
    nivel = os.getenv("LOG_LEVEL", "INFO").upper()
    if not logging.getLogger().handlers:
        logging.basicConfig(level=nivel, format=_FORMATO)
    else:
        logging.getLogger().setLevel(nivel)
    return logging.getLogger(nome)
