# Guia do iniciador multiplataforma

O HydroAlert AI agora possui um iniciador de um clique para **Windows, macOS e Linux**. O iniciador prepara os containers com Docker Compose, aguarda o endpoint de saúde da API e abre o dashboard no navegador padrão.

> O iniciador simplifica a execução, mas não elimina os requisitos do ambiente. É necessário instalar o Docker Desktop no Windows/macOS ou Docker Engine com Docker Compose v2 no Linux.

## Arquivos disponíveis

| Sistema | Arquivo | Uso |
| --- | --- | --- |
| Windows | `INICIAR_HYDROALERT.bat` | Clique duplo no Explorador de Arquivos. |
| Windows, macOS e Linux | `INICIAR_HYDROALERT.py` | Execução portátil com Python 3.11 ou superior. |
| macOS e Linux | `INICIAR_HYDROALERT.sh` | Execução pelo terminal. |
| macOS | `INICIAR_HYDROALERT.command` | Clique duplo no Finder após conceder permissão de execução. |

## Requisitos

O computador precisa ter:

1. Docker Desktop atualizado no Windows ou macOS. No Linux, Docker Engine e o plugin `docker compose` são suficientes.
2. Python 3.11 ou superior para usar o iniciador Python. O restante das dependências roda dentro da imagem Docker.
3. Aproximadamente 4 GB de memória livre para MongoDB, Mosquitto e a API durante a primeira inicialização.
4. As portas locais `8000`, `1883` e `27017` livres.

## Windows

A opção mais simples é abrir `INICIAR_HYDROALERT.bat` com duplo clique. O arquivo verifica o Docker Desktop, tenta iniciá-lo quando encontra a instalação padrão, executa `docker compose up -d --build`, aguarda a API e abre `http://127.0.0.1:8000`.

Como alternativa, abra o PowerShell na pasta do projeto:

```powershell
py INICIAR_HYDROALERT.py
```

Para iniciar também a telemetria simulada contínua:

```powershell
py INICIAR_HYDROALERT.py --simulacao
```

## macOS

Abra `INICIAR_HYDROALERT.command` com duplo clique. Na primeira utilização, pode ser necessário permitir a execução em **Privacidade e Segurança**. Também é possível executar pelo Terminal:

```bash
chmod +x INICIAR_HYDROALERT.command INICIAR_HYDROALERT.sh
./INICIAR_HYDROALERT.command
```

O Docker Desktop precisa estar aberto e pronto antes da execução.

## Linux

Execute:

```bash
chmod +x INICIAR_HYDROALERT.sh
./INICIAR_HYDROALERT.sh
```

O usuário atual precisa conseguir executar Docker sem `sudo`. Caso contrário, adicione o usuário ao grupo Docker, reinicie a sessão e repita o comando. A configuração de permissões varia conforme a distribuição.

## Opções úteis

O iniciador Python aceita as seguintes opções:

```bash
python3 INICIAR_HYDROALERT.py --sem-navegador
python3 INICIAR_HYDROALERT.py --simulacao
python3 INICIAR_HYDROALERT.py --simulacao --sem-navegador
```

A opção `--sem-navegador` mantém os serviços em execução sem abrir uma janela. A opção `--simulacao` ativa o perfil `simulacao` do Docker Compose e inicia o publisher MQTT contínuo.

## Parar o sistema

No Windows, execute `PARAR_DOCKER.bat`. Em qualquer sistema com Docker Compose:

```bash
docker compose down
```

Esse comando preserva os volumes do MongoDB, da telemetria e dos modelos. Para remover também os dados persistidos, use `docker compose down -v` com cuidado.

## Diagnóstico rápido

| Sintoma | Ação |
| --- | --- |
| `Docker não foi encontrado` | Instale o Docker Desktop ou Docker Engine e reabra o terminal. |
| Docker não fica pronto | Abra o Docker Desktop manualmente e aguarde o indicador de funcionamento. |
| API não responde | Execute `docker compose ps` e `docker compose logs api`. |
| Porta ocupada | Pare o processo que usa a porta ou ajuste as portas no `docker-compose.yml`. |
| macOS bloqueia o arquivo `.command` | Rode `chmod +x INICIAR_HYDROALERT.command` e autorize a execução nas configurações do sistema. |

## Limitação importante

Não existe um arquivo único que rode em qualquer computador sem instalar requisitos. O iniciador oferece a mesma experiência de um clique nos três principais sistemas operacionais, mas depende de Docker para manter MongoDB, MQTT e FastAPI consistentes entre ambientes.

## Referências

[1]: https://docs.docker.com/compose/ "Docker Compose documentation"
[2]: https://docs.python.org/3/library/argparse.html "Python argparse documentation"
[3]: https://docs.python.org/3/library/webbrowser.html "Python webbrowser documentation"
