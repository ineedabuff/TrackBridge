FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN useradd --create-home --shell /usr/sbin/nologin trackbridge

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir -e .

RUN mkdir -p /app/storage/attachments && chown -R trackbridge:trackbridge /app

USER trackbridge

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
