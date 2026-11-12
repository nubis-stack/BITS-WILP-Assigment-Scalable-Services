FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5002

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY wsgi.py .

RUN useradd -m appuser
USER appuser

EXPOSE 5002

CMD ["sh", "-c", "gunicorn --preload --bind 0.0.0.0:${PORT} --workers 2 --access-logfile - wsgi:app"]
