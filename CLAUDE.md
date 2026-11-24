# مشروع SAFF — تطبيقا «تمرين ساف» و«تمرين نخبة السبت»

## المستخدم
- مبتدئ جداً في البرمجة: اشرح بالعربي الفصيح المبسّط وبخطوات واضحة.
- كل رد للمستخدم داخل `<div dir="rtl">…</div>` (عشان الكلمات الإنجليزية ما تلخبط الاتجاه).
- لا تقول «خلصت» إلا بعد ما تختبر بنفسك. اذكر نتيجة الاختبارات بالأرقام.
- أي ميزة تنطبق على التطبيقين إلا إذا قال غير كذا.

## الملفات
- `training.html` = «تمرين ساف» (ملف واحد: HTML + CSS + JS). **كل التعديلات هنا.**
- `elite.html` = «تمرين نخبة السبت»، **ينبني تلقائياً** من training.html: `python3 build-elite.py`. لا تعدّله يدوياً.
  - الفروق (الاسم، قاعدة البيانات، مفاتيح الجوال `saff_tr_`→`saff_el_`، الشعار، قائمة المتأخرين LATE_BASE) في `CHANGES` داخل build-elite.py.
- `stamp-build.py` يحط رقم النسخة في الملفين قبل النشر.
- `manifest-training.json` / `manifest-elite.json` + `sw.js` (مشترك مع تطبيقات ثانية في نفس الموقع — لا تحذف جزء التذكيرات في آخره).
- `.github/push/send.js` + `.github/workflows/push-reminders.yml`: تذكيرات الجوال (كل 10 دقائق، تحتاج Secret اسمه `VAPID_PRIVATE_KEY`).
- `tests/`: الاختبارات الكاملة (`bash tests/run.sh`).

## الفروع (مهم)
- التطوير والحفظ: `claude/trusting-gates-ohlt4j`.
- **الموقع المنشور (GitHub Pages)** ينشر من: `claude/weekly-volleyball-app-jsjjbd` — فيه ملفات تطبيقات ثانية، لا تلمسها. انسخ له training.html و elite.html (وملفات التطبيقين بس).
- الفرع الرئيسي (default): `claude/files-previous-conversation-4f2uv` — فيه مهمة التذكيرات (المهام المجدولة لازم تكون فيه).
- الرابط: https://saff2026.github.io/SAFF/training.html و .../elite.html

## قاعدة البيانات (Firebase Realtime DB)
- `training` و `training_elite` (القواعد: أي مستخدم مسجّل، والتطبيق يسجّل دخول مجهول).
- أقسام: players, sessions, weeks, settings, potm, crowd, pins, inj, push, pushLog, photos (صور اللاعبين منفصلة + `players/<id>/pv` رقم نسختها), sandbox (التمرين التجريبي).
- التطبيق يستمع لكل قسم لحاله (CKEYS) — بدون photos و sandbox — عشان السرعة.
- قراءة من الطرفية: توكن مجهول من identitytoolkit signUp بمفتاح Firebase اللي في training.html، ثم `<DB>/<root>.json?auth=<token>`.
- **قبل أي تعديل جماعي على البيانات خذ نسخة احتياطية.** لا تشغّل send.js بدون `DRY=1` من الطرفية (يرسل تنبيهات حقيقية ويكتب pushLog).

## طريقة الشغل
1. عدّل training.html (سكربت بايثون صغير بـ replace مع `assert count==1` أسلم من sed).
2. `python3 build-elite.py`
3. اختبار مركّز للميزة بـ Playwright (`?local` في الرابط = وضع بدون إنترنت؛ `localStorage saff_tr_coach=1` = مجلس الإدارة).
4. انشر (`/publish`)، ثم شغّل الاختبارات الكاملة بالخلفية (`/test`). لا تعدّل الملفات والاختبارات الكاملة شغّالة.
5. Commit على فرع التطوير بعد كل ميزة.

## ملاحظات
- كلمة سر مجلس الإدارة في الكود (`COACH_CODE`) — مشكلة أمان معروفة، فيه خطة لنقلها لـ Firebase Auth.
- `sleep` ممنوع في الطرفية؛ استخدم `timeout N true`.
- الصور اللي يشوفها المستخدم: deviceScaleFactor 2، وصور المشاركة في التطبيق بدقة 2160.
