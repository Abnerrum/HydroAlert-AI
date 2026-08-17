"""Configuracao central de logging do HydroAlert AI."""

import logging
import os


def configurar_logging() -> None:
    """Inicializa o logging com nivel controlado pela variavel LOG_LEVEL."""
    nivel = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=nivel,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
