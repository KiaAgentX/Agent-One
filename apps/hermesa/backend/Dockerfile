# mirror.gcr.io: هنگِ چند دقیقه‌ای در «Building the image» معمولاً pull-rate-limit
# ناشناس Docker Hub است — مخصوصاً وقتی چند دپلوی پشت‌سرهم می‌زنی. GCR میرور آزاد است.
FROM mirror.gcr.io/library/python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DEFAULT_TIMEOUT=100 \
    PIP_RETRIES=5

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Tehran local time: Debian-slim ships without a tz database, so a plain
# TZ=... env var is silently ignored and daily reports / log rotation roll at
# UTC midnight (4:30am Tehran) instead. Placed after pip install to keep the
# dependency layer cached.
ENV TZ=Asia/Tehran
RUN DEBIAN_FRONTEND=noninteractive apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# full app incl. web_admin.py + web/ templates + memory/skills/a2a modules
COPY . .

# ⚠️ Railway: پورت را خودِ پلتفرم با PORT تزریق می‌کند و همان را برای healthcheck
# هم استفاده می‌کند. اینجا WEB_PORT را ست نمی‌کنیم تا هیچ‌وقت PORT را سایه نیندازد
# (علت کلاسیک خطای 502 / "Application failed to respond").
# WEB_PORT فقط به‌عنوان fallback داخل کد است (run.py / web_admin.py).
ENV PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    A2A_ENABLED=0

# Railway حجم متغیر دارد؛ این فقط مستندسازی پورت پیش‌فرض محلی است.
EXPOSE 8080

# Railway healthcheck — /healthz بدون احراز هویت و روی همان پورتی که اپ گوش می‌دهد.
HEALTHCHECK --interval=60s --timeout=10s --start-period=60s --retries=5 \
    CMD python -c "import os,urllib.request,sys; p=os.getenv('PORT','8080'); sys.exit(0 if urllib.request.urlopen(f'http://127.0.0.1:{p}/healthz', timeout=5).status==200 else 1)"

# run.py: PORT → WEB_PORT نگاشت می‌شود و هم بات (polling) هم وب (FastAPI) بالا می‌آید.
# بدون BOT_TOKEN فقط بخش وب بالا می‌آید (وب‌تنها).
CMD ["python", "run.py"]
