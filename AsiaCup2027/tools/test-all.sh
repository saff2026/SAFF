#!/usr/bin/env bash
# يشغّل اختبارَي القواعد معًا: نسخة Swift ونسخة JavaScript.
#
# كلتاهما تقرأان shared/rules-fixtures.json، فنجاحهما معًا يعني أن
# احتساب التطبيق مطابق للمواصفة تمامًا.
set -uo pipefail
cd "$(dirname "$0")/.."
SWIFT_BIN=${SWIFT_BIN:-/opt/swift-6.0.3-RELEASE-ubuntu24.04/usr/bin}
[ -d "$SWIFT_BIN" ] && export PATH="$SWIFT_BIN:$PATH"

fail=0

echo "══ ١) اختبارات Swift (المواصفة) ══"
if command -v swift >/dev/null 2>&1; then
  out=$(cd Core && swift test 2>&1)
  if [ $? -ne 0 ]; then fail=1; fi
  echo "$out" | grep -E "^.*Executed [0-9]+ tests" | tail -1
  echo "$out" | grep -E "error:|XCTAssert.*failed" | head -10
else
  echo "⚠️  Swift غير مثبَّت — تُخطّى. (لتثبيته: انظر README)"
fi

echo
echo "══ ٢) اختبارات JavaScript (التطبيق) ══"
if command -v node >/dev/null 2>&1; then
  if ! node web/rules.test.js | tail -4; then fail=1; fi
else
  echo "❌ node غير مثبَّت"; fail=1
fi

echo
echo "══ ٣) هل asia27.html مطابق لمصادره؟ ══"
if ! python3 tools/build-web.py --check; then fail=1; fi

echo
echo "══ ٤) هل بيانات الجدول مطابقة لمصدرها؟ ══"
before=$(sha256sum web/schedule-data.js | cut -d" " -f1)
python3 tools/regen-schedule-data.py >/dev/null
after=$(sha256sum web/schedule-data.js | cut -d" " -f1)
if [ "$before" = "$after" ]; then
  echo "✅ schedule-data.js مطابق لـ schedule.json"
else
  echo "❌ schedule-data.js كان متقادمًا — أُعيد توليده الآن، راجع الفرق والتزمه"
  fail=1
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "✅ النسختان متطابقتان، والملفّات المولَّدة محدَّثة."
else
  echo "❌ فشل أحد الاختبارين — راجع المخرجات أعلاه."
fi
exit "$fail"
