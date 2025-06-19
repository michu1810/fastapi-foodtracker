FROM python:3.13

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN apt-get update && apt-get install -y libmagic1


RUN useradd --create-home --shell /bin/bash appuser

COPY foodtracker/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY foodtracker/ .

COPY start.sh .

RUN chown -R appuser:appuser /app

USER appuser

CMD ["bash", "start.sh", "uvicorn", "foodtracker_app.main:app", "--host", "0.0.0.0", "--port", "8000"]
