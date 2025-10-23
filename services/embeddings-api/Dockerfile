# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better caching)
COPY services/embeddings-api/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model during build to avoid runtime download
# This downloads ~500MB but prevents first-request timeout on Railway
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-base-en-v1.5')"

# Copy application code
COPY services/embeddings-api/main.py .

# Copy embeddings from project root
COPY src/data/embeddings /app/embeddings

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV EMBEDDINGS_PATH=/app/embeddings
ENV PORT=8000

# Expose port
EXPOSE 8000

# Railway handles healthchecks via railway.json configuration
# No need for Dockerfile HEALTHCHECK

# Run the application
CMD ["python", "main.py"]
