FROM python:3.11-slim-bookworm
WORKDIR /app
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 libgomp1 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
# Pre-download the Stage-2 rerank pack (glintr100) so the first
# borderline scan never pays a download. FaceAnalysis downloads the
# zip (extraction happens lazily in main.py); ignore the pack-shape
# assertion — the zip is what matters.
RUN python3 -c "from insightface.app import FaceAnalysis; FaceAnalysis(name='antelopev2')" || true
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
