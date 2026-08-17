FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api ./api
COPY dashboard ./dashboard
COPY database ./database
COPY iot ./iot
COPY ml ./ml
COPY services ./services
COPY logging_config.py .

RUN mkdir -p /app/data /app/models

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
