#!/usr/bin/env python3
"""يبني asia27.html: ملفّ واحد مكتفٍ بنفسه، بدمج سكربتات المصدر فيه.

لماذا ملفّ واحد؟
عامل الخدمة sw.js — المشترك مع تطبيق خليجي ٢٧ — يخزّن الملفّات الثابتة
بأسلوب «الكاش أولًا»، ويتصفّح صفحات HTML بأسلوب «الشبكة أولًا». فلو تُركت
السكربتات ملفّات منفصلة، بقي اللاعبون على نسخة قديمة منها بعد كل تعديل،
ولا يُصلح ذلك إلا تعديل sw.js — وهو مشترك مع تطبيق يعمل الآن ولا نمسّه.

أمّا الملفّ الواحد فتصله التعديلات فورًا مع أوّل فتح للصفحة.

التشغيل:  python3 AsiaCup2027/tools/build-web.py
التحقّق:  python3 AsiaCup2027/tools/build-web.py --check   (يفشل إن تقادم)
"""
import sys, pathlib, hashlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPO = ROOT.parent
WEB = ROOT / "web"
TEMPLATE = WEB / "index.template.html"
OUT = REPO / "asia27.html"

PARTS = [
    ("{{DEMO}}", WEB / "demo-backend.js"),
    ("{{RULES}}", WEB / "rules.js"),
    ("{{SCHEDULE}}", WEB / "schedule-data.js"),
    ("{{APP}}", WEB / "app.js"),
]

def build() -> str:
    html = TEMPLATE.read_text(encoding="utf-8")
    for token, path in PARTS:
        if not path.exists():
            sys.exit(f"خطأ: الملفّ المصدر غير موجود — {path}")
        code = path.read_text(encoding="utf-8")
        # </script> داخل نصّ برمجي يُنهي الوسم مبكّرًا ويكسر الصفحة
        if "</script" in code.lower():
            sys.exit(f"خطأ: {path.name} يحتوي </script> ولا يصلح للدمج المباشر")
        marker = "<script>/*" + token + "*/</script>"
        if marker not in html:
            sys.exit(f"خطأ: علامة {token} غير موجودة في القالب")
        html = html.replace(
            marker,
            "<script>\n/* ===== " + path.name + " ===== */\n" + code + "\n</script>")
    stamp = datetime.date.today().isoformat()
    digest = hashlib.sha256(
        b"".join(p.read_bytes() for _, p in PARTS) + TEMPLATE.read_bytes()
    ).hexdigest()[:12]
    return html.replace("</head>",
        f'<meta name="build" content="{stamp} {digest}">\n</head>', 1)

def main() -> None:
    html = build()
    check = "--check" in sys.argv
    current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    if check:
        if current != html:
            sys.exit("❌ asia27.html متقادم عن مصادره.\n"
                     "   شغّل: python3 AsiaCup2027/tools/build-web.py")
        print("✅ asia27.html مطابق لمصادره")
        return
    OUT.write_text(html, encoding="utf-8")
    kb = len(html.encode("utf-8")) / 1024
    print(f"✅ تولّد asia27.html ({kb:.0f} كيلوبايت، ملفّ واحد مكتفٍ بنفسه)")
    for _, p in PARTS:
        print(f"   ← {p.name} ({len(p.read_text(encoding='utf-8').splitlines())} سطرًا)")

if __name__ == "__main__":
    main()
