#!/usr/bin/env bash
# يُعيد توليد firebase-rules-paste-me.json من database.rules.json.
#
# لماذا ملفّ ثانٍ؟ محرّر قواعد Firebase يُلصَق فيه النصّ كاملًا، والنسخ من
# ملفّ بـ٢٧٤ سطرًا ينقطع أحيانًا فيرفض المحرّر اللصق بخطأ Unexpected EOF.
# فنولّد نسخة بسطر واحد: لا أسطر فيها لتنقطع عندها.
#
# المصدر الوحيد للحقيقة هو database.rules.json. إذا عدّلته فشغّل هذا الملفّ
# حتى لا تتقادم النسخة المضغوطة، فيَلصق أحدهم قواعد قديمة بالخطأ.
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 - <<'PY'
import json
src = json.load(open('database.rules.json', encoding='utf-8'))
mini = json.dumps(src, ensure_ascii=False, separators=(',', ':'))
assert json.loads(mini) == src, "المضغوط لا يطابق الأصل"
open('firebase-rules-paste-me.json', 'w', encoding='utf-8').write(mini)
print(f"✅ تولّد firebase-rules-paste-me.json ({len(mini)} محرفًا، سطر واحد)")
print("   الجذور:", ", ".join(src['rules'].keys()))
PY
