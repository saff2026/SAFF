#!/bin/bash
# الاختبارات الكاملة للتطبيقين: كل تطبيق في 4 أوضاع (بدون إنترنت/قاعدة بيانات × فاتح/داكن)
# الاستخدام:  bash tests/run.sh            ← الكل
#             bash tests/run.sh training   ← تمرين ساف بس
#             bash tests/run.sh elite      ← نخبة السبت بس
cd "$(dirname "$0")/.." || exit 1
ROOT=$PWD; W=$ROOT/tests/.work; mkdir -p "$W"
# مكتبة التعرّف على الوجوه (لاختبار رفع الصور) — تنزل مرة وحدة
if [ ! -d "$W/fa/package" ]; then (cd "$W" && mkdir -p fa && cd fa && npm pack @vladmandic/face-api@1.7.13 --silent >/dev/null 2>&1 && tar xzf vladmandic-face-api-1.7.13.tgz && rm -f *.tgz) || echo "⚠️ ما قدرت أنزّل face-api (اختبار رفع الصور ممكن يفشل)"; fi
# سيرفر محلي على 8765
curl -s -o /dev/null http://127.0.0.1:8765/training.html || { python3 -m http.server 8765 >/dev/null 2>&1 & timeout 1 true; }
case "$1" in training) T="test_training.js";; elite) T="test_elite.js";; *) T="test_training.js test_elite.js";; esac
fail=0
for t in $T; do for m in "local light" "cloud dark" "local dark" "cloud light"; do
  o=$(timeout 280 node "tests/$t" "$W" $m 2>&1)
  n=$(echo "$o"|grep -c '^✓'); f=$(echo "$o"|grep -c 'FAIL\|CRASH\|ERRORS')
  echo "$t $m ok=$n fail=$f"; echo "$o"|grep 'FAIL\|CRASH\|PAGEERR\|CONSOLE'|head -3
  [ "$f" -gt 0 ] && fail=1
done; done
exit $fail
