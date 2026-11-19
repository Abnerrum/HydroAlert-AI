import unittest

from services.queimadas_service import INPE_URL, consultar_queimadas, interpretar_csv


class QueimadasTest(unittest.TestCase):
    def test_parse_csv_inpe_e_exclusao_pais_estrangeiro(self):
        raw = (
            "DataHora,Satelite,Pais,Estado,Municipio,Latitude,Longitude,FRP\n"
            "2026/11/19 18:00:00,GOES-19,Brasil,GOIAS,Goiânia,-16.7,-49.2,12\n"
            "2026/11/19 18:00:00,GOES-19,Bolivia,GOIAS,X,-16.7,-49.2,12\n"
        )
        ok, dados = interpretar_csv(raw)
        self.assertTrue(ok)
        self.assertEqual(len(dados), 1)
        self.assertEqual(dados[0]["uf"], "GO")
        self.assertEqual(dados[0]["timestamp_utc"], "2026-11-19T18:00:00Z")

    def test_sem_dados_e_falha_diferentes(self):
        self.assertFalse(interpretar_csv("")[0])
        self.assertEqual(interpretar_csv("Latitude,Longitude\n")[1], [])

    def test_uma_edicao_recente_e_nenhum_foco(self):
        base = "focos_10min_20261119_1800.csv"

        def obter(url):
            if url == INPE_URL:
                return '<a href="' + base + '">Arquivo</a>'
            return "DataHora,Latitude,Longitude,Estado\n"

        data = consultar_queimadas(forcar=True, obter=obter)
        self.assertEqual(data["arquivos_validos"], 1)
        self.assertEqual(data["total_deteccoes"], 0)
        self.assertEqual(data["focos"], [])

    def test_indisponibilidade_nao_inventa_zero(self):
        def obter(url):
            if url == INPE_URL:
                return "focos_10min_20261119_1800.csv"
            raise OSError("Serviço indisponível")

        with self.assertRaisesRegex(ValueError, "validado"):
            consultar_queimadas(forcar=True, obter=obter)


if __name__ == "__main__":
    unittest.main()
