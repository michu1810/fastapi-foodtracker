FROM python:3.13-bookworm

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN apt-get update \
 && apt-get install -y libmagic1 redis-server \
 && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash appuser

COPY foodtracker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY foodtracker/ .
COPY start.sh .
RUN chmod +x start.sh

RUN chown -R appuser:appuser /app
USER appuser

CMD ["bash", "start.sh"]
