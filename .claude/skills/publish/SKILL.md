---
name: publish
description: ينشر تطبيقي «تمرين ساف» و«تمرين نخبة السبت» على الموقع (GitHub Pages) ويتأكد إن النشر نجح. استخدمه بعد أي تعديل على training.html أو لما المستخدم يقول «انشر».
---

# النشر

1. ابنِ نخبة السبت: `cd /home/user/SAFF && python3 build-elite.py`
2. احفظ على فرع التطوير:
   `git add training.html elite.html <أي ملف ثاني تغيّر> && git commit -m "<وصف بالعربي>" && git push -u origin HEAD:claude/trusting-gates-ohlt4j`
   (أضف سطور الـ attribution اللي يطلبها النظام في آخر رسالة الـ commit)
3. انسخ لفرع الموقع (في مجلد مؤقت، مو في المشروع):
   ```bash
   L=<scratchpad>/live
   [ -d $L ] || git clone -q --depth 5 --branch claude/weekly-volleyball-app-jsjjbd "$(git -C /home/user/SAFF remote get-url origin)" $L
   cd $L && git fetch -q origin claude/weekly-volleyball-app-jsjjbd && git reset -q --hard origin/claude/weekly-volleyball-app-jsjjbd
   cp /home/user/SAFF/training.html /home/user/SAFF/elite.html .   # + manifest-*.json / sw.js إذا تغيّرت
   python3 /home/user/SAFF/stamp-build.py training.html elite.html
   git add training.html elite.html && git commit -q -m "تحديث: <وصف>" && git push -q origin HEAD:claude/weekly-volleyball-app-jsjjbd
   ```
   لا تلمس ملفات التطبيقات الثانية في هذا الفرع.
4. تأكد من النشر: `mcp__github__actions_list` (method list_workflow_runs, owner saff2026, repo SAFF, perPage 1) لين يصير `completed` + `success` لنفس الـ head_sha. الحالة أحياناً تتأخر بالتحديث؛ انتظر بـ `timeout 90 true` بين كل فحص.
5. قل للمستخدم: انتشر، ويسكّر التطبيق ويفتحه من جديد.
