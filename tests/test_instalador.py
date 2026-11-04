import importlib.util
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "instalador", Path(__file__).resolve().parents[1] / "scripts" / "instalar_projeto.py"
)
instalador = importlib.util.module_from_spec(spec)
spec.loader.exec_module(instalador)


class TestInstalador(unittest.TestCase):
    def test_usb_nao_instala_docker(self):
        with patch.object(instalador.sys, "platform", "win32"), patch("builtins.input", return_value="1"), \
             patch.object(instalador, "preparar_python") as python, \
             patch.object(instalador, "preparar_esp32") as esp, \
             patch.object(instalador, "instalar_app") as app:
            instalador.main()
        python.assert_called_once_with(completo=False)
        esp.assert_called_once()
        app.assert_not_called()

    def test_completo_instala_docker_quando_ausente(self):
        with patch.object(instalador.sys, "platform", "win32"), patch("builtins.input", return_value="2"), \
             patch.object(instalador, "preparar_python") as python, \
             patch.object(instalador, "preparar_esp32"), \
             patch.object(instalador.shutil, "which", return_value=None), \
             patch.object(instalador, "instalar_app") as app:
            instalador.main()
        python.assert_called_once_with(completo=True)
        app.assert_called_once_with("Docker.DockerDesktop")

    def test_falha_interrompe_sem_instalar_proxima_etapa(self):
        with patch.object(instalador.sys, "platform", "win32"), patch("builtins.input", return_value="1"), \
             patch.object(instalador, "preparar_python", side_effect=subprocess.CalledProcessError(1, "pip")), \
             patch.object(instalador, "preparar_esp32") as esp:
            with self.assertRaises(subprocess.CalledProcessError):
                instalador.main()
        esp.assert_not_called()

    def test_prepara_e_compila_sem_fazer_upload(self):
        with patch.object(instalador, "localizar_cli", return_value=Path("arduino-cli.exe")), \
             patch.object(instalador, "executar") as executar:
            instalador.preparar_esp32()
        chamadas = [[str(a) for a in c.args[0]] for c in executar.call_args_list]
        self.assertTrue(any("compile" in c for c in chamadas))
        self.assertTrue(any("DHT sensor library" in c for c in chamadas))
        self.assertFalse(any("upload" in c for c in chamadas))
