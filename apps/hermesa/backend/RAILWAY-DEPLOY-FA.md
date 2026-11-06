# 🚀 دیپلوی DropAgentX روی Railway

> این فایل فقط مسیر **Railway** را می‌دهد. برای VPS به `DEPLOY.md` نگاه کن.

---

## ۰) پیش‌نیاز

- [ ] حساب Railway (پلن Hobby یا بالاتر — Trial فقط برای تست کوتاه است)
- [ ] یک repo خالی روی GitHub (خصوصی توصیه می‌شود)
- [ ] `BOT_TOKEN` از [@BotFather](https://t.me/BotFather)
- [ ] آیدی عددی خودت از [@userinfobot](https://t.me/userinfobot) → برای `ADMIN_IDS`

---

## ۱) کد را push کن

```bash
cd DropAgentXBot-main
git init
git add -A
git commit -m "DropAgentX initial deploy"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

> ✅ پوشه `data/`، `uploads/` و فایل `.env` به‌خاطر `.gitignore` push **نمی‌شوند** — درست است، همان‌ها باید روی Volume بروند.

---

## ۲) سرویس بساز

1. Railway → **New Project** → **Deploy from GitHub repo** → repo را انتخاب کن.
2. Railway فایل `railway.json` را می‌بیند و با **Dockerfile** بیلد می‌کند.
3. منتظر بمان تا بیلد تمام شود (اولین بیلد ~۳ تا ۵ دقیقه: pip install + timezone).

---

## ۳) متغیرها را ست کن

**Variables → Raw Editor** و این را پیست کن (جاهای خالی را پر کن):

```ini
BOT_TOKEN=123456:ABC...
ADMIN_IDS=123456789

WEB_PASSWORD=یک-رمز-قوی
WEB_SECRET=کلید-تصادفی-۶۴-کاراکتری
COOKIE_SECURE=1

DATA_DIR=/data
A2A_ENABLED=0

AI_API_KEY=کلید-جمینای-یا-اوپن‌روتر
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_MODEL=gemini-2.0-flash
```

ساخت `WEB_SECRET`:

```bash
python -c "import secrets;print(secrets.token_hex(32))"
```

> فهرست کامل و توضیح هر متغیر: `.env.example` در ریشهٔ پروژه.

---

## ۴) Volume بساز — ⚠️ مهم‌ترین قدم

**Service → Settings → Volumes → Add Volume**

| فیلد | مقدار |
|---|---|
| Mount path | `/data` |

این باعث می‌شود `DATA_DIR=/data` روی دیسک دائمی بنشیند و **دیتابیس با هر Redeploy پاک نشود**.

- دیتابیس → `/data/marketplace.db`
- آپلودها → `/data/uploads/`
- بکاپ‌ها → `/data/backups/`

> بدون این قدم، هر بار که کد را push کنی، همهٔ کاربران و محصولاتت صفر می‌شوند. این رایج‌ترین اشتباه در Railway است.

---

## ۵) Domain بگیر

**Settings → Networking → Generate Domain** → یک آدرس مثل
`https://dropagentx-production.up.railway.app` می‌گیری.

- `COOKIE_SECURE=1` را نگه دار (HTTPS دارد).
- آدرس را برای Mini App تلگرام / دکمه‌های وب استفاده کن.

---

## ۶) چک نهایی

| بررسی | انتظار |
|---|---|
| Deploy status | `Active` (سبز) |
| `https://<domain>/healthz` | `{"ok":true,"service":"hermes-marketplace","version":"2.0.0"}` |
| `https://<domain>/` | فروشگاه |
| `https://<domain>/shop` | فروشگاه |
| `https://<domain>/login` | فرم رمز (`WEB_PASSWORD`) |
| `https://<domain>/admin` | داشبورد ادمین بعد از لاگین |
| لاگ Railway | `Web dashboard on http://0.0.0.0:$PORT` |
| بات تلگرام | `/start` جواب می‌دهد |

---

## ۷) عیب‌یابی

### ❌ `502 / Application failed to respond`

**علت شمارهٔ یک:** اپ روی پورتی غیر از `PORT` گوش می‌دهد.

این پروژه اصلاح شده است (`run.py` حالا `PORT` را بر `WEB_PORT` ترجیح می‌دهد). اگر باز هم دیدی:

```bash
# در لاگ باید این را ببینی — عدد باید دقیقاً برابر PORT باشد
Web dashboard on http://0.0.0.0:6432
```

اگر عدد با `PORT` فرق داشت، یعنی جایی `WEB_PORT` را دستی ست کرده‌ای → پاکش کن.

### ❌ Healthcheck timeout

- `healthcheckTimeout` در `railway.json` برابر ۱۸۰ ثانیه است.
- اگر دیتابیس روی Volume کند باز می‌شود، اولین بوت می‌تواند ۳۰-۶۰ ثانیه طول بکشد. طبیعی است.

### ❌ بات جواب نمی‌دهد ولی سایت بالاست

- `BOT_TOKEN` را چک کن (اگر خالی باشد، پروژه عمداً در **حالت وب‌تنها** بالا می‌آید).
- **دو instance با یک توکن = خطای 409 Conflict.** مطمئن شو نسخهٔ VPS/لوکال خاموش است و `numReplicas` روی ۱ مانده.

### ❌ دیتابیس بعد از هر deploy خالی می‌شود

→ قدم ۴ (Volume) را انجام نداده‌ای.

### ❌ `WEB_SECRET تنظیم نشده` هنگام لاگین ادمین

→ `WEB_SECRET` را در Variables ست کن و redeploy کن.

---

## ۸) آپدیت نسخه

```bash
git add -A && git commit -m "update" && git push
```

Railway خودش دوباره بیلد و deploy می‌کند (با همان Volume → داده‌ها سالم می‌مانند).

### بکاپ دستی دیتابیس

```bash
railway run sqlite3 /data/marketplace.db ".backup /data/backups/manual-$(date +%F).db"
```

---

## ۹) هزینه و منابع

| مورد | پیشنهاد |
|---|---|
| RAM | ۵۱۲ MB برای ~۵۰۰ کاربر کافی است (SQLite + polling) |
| Replicas | **همیشه ۱** — polling تلگرام با چند replica کانفلیکت می‌کند |
| Sleep | خاموشش کن (بات باید ۲۴/۷ بیدار بماند) |
| Region | نزدیک‌ترین به کاربرانت — `EU West` برای ایران/اروپا خوب است |

---

## ضمیمه — چه چیزی در این نسخه اصلاح شد

| فایل | تغییر | چرا |
|---|---|---|
| `run.py` | `PORT` همیشه بر `WEB_PORT` مقدم است | جلوگیری از ۵۰۲ روی Railway |
| `bot.py` | حالت **وب‌تنها** وقتی `BOT_TOKEN` خالی است | سرویس بدون توکن هم بالا می‌آید و healthcheck پاس می‌شود |
| `Dockerfile` | حذف `ENV WEB_PORT=8080`، افزودن `APP_ENV=production` و `CMD python run.py` | پورت پویا + بالا آمدن هم‌زمان بات و وب |
| `Dockerfile` (HEALTHCHECK) | از `$PORT` استفاده می‌کند نه ۸۰۸۰ هاردکد | healthcheck واقعی |
| `database.py` | `os.makedirs(os.path.dirname(DB_PATH) or ".")` | جلوگیری از کرش وقتی `DB_PATH` بدون پوشه باشد |
| `.dockerignore` | بازنویسی | بیلد سریع‌تر و ایمیج سبک‌تر |
| `.env.example` | ساخته شد | مرجع متغیرها |
| `.gitignore` | بازنویسی | جلوگیری از لو رفتن `.env` و کامیت شدن `data/` |
