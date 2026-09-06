FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire project
COPY . .

# Expose port
EXPOSE 5000

# Start gunicorn
CMD gunicorn wsgi:app --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 120
