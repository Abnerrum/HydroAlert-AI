# HydroAlert AI — execução automática e link online

Esta configuração foi criada para evitar o uso diário de terminal, ambiente virtual e comandos manuais.

## Uso normal

Depois que o projeto estiver atualizado no computador, basta dar dois cliques em:

`INICIAR_HYDROALERT.bat`

O inicializador faz automaticamente:

1. verifica se o Docker está disponível;
2. inicia o Docker Desktop quando necessário;
3. verifica atualizações do repositório com `git pull --ff-only`;
4. constrói/atualiza os containers usando cache;
5. inicia MongoDB, Mosquitto, Subscriber e FastAPI;
6. aguarda a API ficar saudável;
7. cria um atalho `HydroAlert AI` na Área de Trabalho na primeira execução;
8. abre o dashboard no navegador.

Não é necessário ativar `.venv`, instalar novamente as dependências Python ou executar Uvicorn manualmente.

## Compartilhar o sistema pela internet

No topo do dashboard existe o botão **Compartilhar online**.

Ao clicar, a própria API inicia um Cloudflare Quick Tunnel e retorna um endereço público HTTPS. O painel permite:

- criar o link;
- abrir o link;
- copiar o link;
- encerrar o compartilhamento.

O `cloudflared` já faz parte da imagem Docker do HydroAlert, portanto não precisa ser instalado separadamente no Windows.

## Importante sobre o link rápido

O Quick Tunnel é destinado a demonstração e desenvolvimento. O endereço é temporário e muda quando o tunnel é reiniciado. O link fica disponível enquanto o HydroAlert estiver rodando no computador e houver conexão com a internet.

Para uma futura publicação permanente com domínio fixo, deve-se usar um Cloudflare Tunnel nomeado, um servidor/cloud ou outra plataforma de hospedagem.

## URLs locais

- Dashboard: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`
- Status do compartilhamento: `http://localhost:8000/api/compartilhamento/status`
