import unittest
from unittest.mock import patch

from services import meteorologia_brasil_service as br


class TestMeteorologiaBrasil(unittest.TestCase):
    def test_capitais_27_ufs_validas_sem_duplicatas(self):
        self.assertEqual(len(br.CAPITAIS), 27)
        self.assertEqual(len({c["uf"] for c in br.CAPITAIS}), 27)
        self.assertIn("DF", {c["uf"] for c in br.CAPITAIS})
        self.assertTrue(all(-35 <= c["latitude"] <= 6 and -75 <= c["longitude"] <= -30
                            for c in br.CAPITAIS))

    def test_nao_inventa_dados_quando_provedor_falha(self):
        ponto = br._converter(br.CAPITAIS[0], None)
        self.assertFalse(ponto["disponivel"])
        self.assertIsNone(ponto["precipitacao_mm"])
        self.assertIsNone(ponto["temperatura_c"])
        self.assertIsNone(ponto["timestamp_utc"])

    def test_retorna_tempo_em_utc_e_preserva_zero(self):
        data = {"current": {
            "time": "2026-11-19T20:00",
            "temperature_2m": 26.0, "relative_humidity_2m": 65,
            "precipitation": 0, "wind_speed_10m": 9,
        }}
        ponto = br._converter(br.CAPITAIS[0], data)
        self.assertTrue(ponto["disponivel"])
        self.assertEqual(ponto["precipitacao_mm"], 0)
        self.assertEqual(ponto["timestamp_utc"], "2026-11-19T20:00Z")

    def test_falha_em_lote_nao_apaga_outros_estados(self):
        def simular(grupo):
            if grupo[0]["uf"] == "AC":
                raise OSError("Indisponível")
            return [br._converter(c, {"current": {
                "time": "2026-11-19T20:00", "temperature_2m": 22,
            }}) for c in grupo]

        with patch.object(br, "_lote", side_effect=simular), patch.object(br, "_CACHE", None):
            resultado = br.consultar_meteorologia_brasil(forcar=True)
        self.assertEqual(len(resultado["pontos"]), 27)
        self.assertEqual(resultado["com_dados"], 18)
        self.assertFalse(resultado["pontos"][0]["disponivel"])
        self.assertTrue(resultado["pontos"][-1]["disponivel"])


if __name__ == "__main__":
    unittest.main()
