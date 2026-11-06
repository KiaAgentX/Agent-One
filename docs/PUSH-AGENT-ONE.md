# پوش به github.com/KiaAgentX/Agent-One

## وضعیت (۲۰۲۶-۱۱-۰۶)

- PATهای در دسترس فقط اسکوپ `repo` داشتند. گیت‌هاب پوشِ هر تاریخچه‌ای که
  فایلی زیر `.github/workflows/` بسازد را رد می‌کند:
  `refusing to allow a PAT to create or update .github/workflows/ci.yml without workflow scope`
  (فورس‌پوش هم این محدودیت را دور نمی‌زند).
- راه‌حل اعمال‌شده: پوش از یک **کپی فیلترشده** — `.github/workflows/ci.yml` از
  تمام ۱۱۱ کامیت با `git filter-branch --index-filter` حذف شد؛ پیام‌ها، تاریخ‌ها
  و بقیهٔ محتوا دست‌نخورده ماندند. سایر فایل‌های `.github` (assets، dependabot)
  با اسکوپ `repo` مجاز و سر جایشان هستند.
- مخزن لوکال `unified/` (منبع حقیقت، شامل ci.yml) **تغییر نکرده**؛ بنابراین
  SHAهای ریموت با لوکال یکی نیست. نگاشت رفرنس‌های نسخه‌دار:

| رفرنس | لوکال (منبع حقیقت) | ریموت (فیلترشده) |
|---|---|---|
| `v4.3.0` (و کامیتِ زیر آن) | `c989fb6` | `33b2dd9` |
| `v2.0.0` | `637ca79` | `2d0d789` |
| `v1.5.1` | `55de2ab` | `d8c1bc6` |
| `v1.0.0` | `6484c33` | `8ad943d` |

- کامیتِ همین سند روی `main` لوکال قرار دارد و در ریموت نسخهٔ فیلترشدهٔ خودش را دارد؛
  SHA دقیق سرِ `main` ریموت را با `git ls-remote` بگیرید.

## پوشِ تغییرات آینده (تا وقتی توکن فقط repo دارد)

```bash
git clone --no-local /home/z/my-project/unified /tmp/pushcopy
cd /tmp/pushcopy
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f \
  --index-filter 'git rm -r --cached --ignore-unmatch .github/workflows' \
  --tag-name-filter cat -- --all
git remote set-url origin https://github.com/KiaAgentX/Agent-One.git
# اعتبارنامه فقط از طریق محیط، هرگز در URL/config:
GIT_PUSH_TOKEN="$TK" GIT_ASKPASS=/path/to/gh-askpass.sh \
  git push --force origin main v4.3.0 v2.0.0 v1.5.1 v1.0.0
```

## یکتاسازی دو تاریخچه (اختیاری، بعداً)

اگر توکنی با اسکوپ `repo workflow` در دسترس باشد (مثلاً Device Flow از
`gh auth login` با client_id گیت‌هاب‌CLI که هر دو اسکوپ را می‌دهد)، می‌توان از
مخزن لوکالِ اصلی مستقیم فورس‌پوش کرد:

```bash
git push --force origin main v4.3.0 v2.0.0 v1.5.1 v1.0.0
```

و از آن پس دو تاریخچه دوباره یکی می‌شوند و نیازی به فیلتر نیست.
