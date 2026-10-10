#!/usr/bin/env python3
"""يولّد web/schedule-data.js من Core/.../schedule.json ومن Teams.swift.

المصدر الوحيد للحقيقة هو schedule.json (المستخرَج من ملف الاتحاد الآسيوي
الرسمي) وTeams.swift (المنتخبات الـ٢٤). ولأن المتصفّح لا يقرأ ملفًّا محليًّا
عبر fetch من file://، نولّد ملفّ JS يُحمَّل بوسم script.

شغّله بعد أيّ تعديل على الجدول:  python3 AsiaCup2027/tools/regen-schedule-data.py
"""
import json, re, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCHED = ROOT / "Core/Sources/AsiaCupCore/Resources/schedule.json"
TEAMS = ROOT / "Core/Sources/AsiaCupCore/Teams.swift"
OUT = ROOT / "web/schedule-data.js"

doc = json.loads(SCHED.read_text(encoding="utf-8"))

# المنتخبات تُقرأ من Teams.swift حتى لا تُكتب الأسماء العربية مرتين.
src = TEAMS.read_text(encoding="utf-8")
teams, group = {}, None
for line in src.splitlines():
    m = re.match(r'\s*"([A-F])":\s*\[', line)
    if m:
        group = m.group(1)
        continue
    m = re.search(r'Team\(key:\s*"([^"]+)",\s*arabicName:\s*"([^"]+)",\s*countryCode:\s*"([^"]+)"\)', line)
    if m and group:
        key, ar, code = m.groups()
        teams[key] = {"ar": ar, "code": code, "group": group}

if len(teams) != 24:
    sys.exit(f"خطأ: قُرئ {len(teams)} منتخبًا لا ٢٤ — راجع Teams.swift")

matches = []
for m in doc["matches"]:
    matches.append({
        "id": m["id"], "n": m["number"], "stage": m["stage"],
        "group": m["group"], "home": m["home"], "away": m["away"],
        "venue": m["venue"], "city": m["city"],
        "date": m["date"], "kickoffUTC": m["kickoffUTC"],
    })

if len(matches) != doc["expectedMatchCount"]:
    sys.exit(f"خطأ: {len(matches)} مباراة والمتوقَّع {doc['expectedMatchCount']}")

payload = {
    "expectedMatchCount": doc["expectedMatchCount"],
    "tournamentStart": doc["tournamentStart"],
    "tournamentEnd": doc["tournamentEnd"],
    "provisionalLockUTCHour": doc.get("provisionalLockUTCHour", 9),
    "teams": teams,
    "matches": matches,
}

body = json.dumps(payload, ensure_ascii=False, indent=1)
OUT.write_text(
    "/* ملفّ مولَّد — لا تعدّله بيدك.\n"
    " * المصدر: Core/Sources/AsiaCupCore/Resources/schedule.json و Teams.swift\n"
    " * لإعادة توليده: python3 AsiaCup2027/tools/regen-schedule-data.py\n"
    " *\n"
    " * توقيتات الانطلاق غير معلَنة من الاتحاد الآسيوي بعد، فـkickoffUTC=null\n"
    " * ويُحسب قفل مبدئي آمن من التاريخ. انظر rules.js و app.js.\n"
    " */\n"
    "(function (root) {\n"
    "  var DATA = " + body.replace("\n", "\n  ") + ";\n"
    "  if (typeof module === 'object' && module.exports) module.exports = DATA;\n"
    "  else root.ASIA_SCHEDULE = DATA;\n"
    "})(typeof self !== 'undefined' ? self : this);\n",
    encoding="utf-8")

print(f"✅ تولّد {OUT.relative_to(ROOT.parent)}")
print(f"   {len(matches)} مباراة · {len(teams)} منتخبًا · "
      f"{len({m['venue'] for m in matches})} ملاعب · "
      f"{len({m['city'] for m in matches})} مدن")
