FROM node:22-alpine AS frontend

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# cloudflared e opcional (compartilhamento publico). Nao bloquear
# a API e os sensores quando o download externo estiver indisponivel.
# A funcionalidade de tunel avisa quando a ferramenta nao esta instalada.

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api ./api
COPY --from=frontend /dashboard ./dashboard
COPY database ./database
COPY iot ./iot
COPY ml ./ml
COPY services ./services
COPY logging_config.py .

RUN mkdir -p /app/data /app/models

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
