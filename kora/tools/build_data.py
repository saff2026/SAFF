"""يبني ملفات بيانات «تحدّي الكورة» من Wikidata وWikipedia.

التشغيل:  python3 kora/tools/build_data.py
النتيجة:  kora/data/*.json  (نسخة ثابتة يقرؤها الموقع، فلا يتوقف الموقع لو تعطّل المصدر)
"""
import json
import math
import os
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(__file__))
import wiki  # noqa: E402
from infobox import parse_infobox  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(OUT, exist_ok=True)
AGE = None  # ذاكرة مؤقتة دائمة أثناء البناء الواحد

# ---------------------------------------------------------------- 1) قائمة اللاعبين
def player_ids():
    rows = wiki.sparql('''SELECT ?p ?sl WHERE { ?p wikibase:sitelinks ?sl . FILTER(?sl >= 30)
      ?p wdt:P106 wd:Q937857 . ?p wdt:P21 wd:Q6581097 . }''', AGE)
    rows += wiki.sparql('''SELECT DISTINCT ?p ?sl WHERE { ?c wdt:P463 wd:Q7172 .
      ?p wdt:P27 ?c; wdt:P106 wd:Q937857; wdt:P21 wd:Q6581097; wikibase:sitelinks ?sl . FILTER(?sl >= 10) }''', AGE)
    out = {}
    for b in rows:
        q = b['p']['value'].rsplit('/', 1)[1]
        out[q] = max(out.get(q, 0), int(b['sl']['value']))
    return out


POS = {  # المركز من Wikidata -> مجموعة عربية
    'Q201330': 'حارس', 'Q336286': 'دفاع', 'Q1196129': 'دفاع', 'Q4677': 'دفاع', 'Q6862366': 'دفاع',
    'Q5703034': 'دفاع', 'Q1756454': 'دفاع', 'Q193592': 'وسط', 'Q1622417': 'وسط', 'Q1323290': 'وسط',
    'Q2251990': 'وسط', 'Q1356957': 'وسط', 'Q2735366': 'وسط', 'Q280658': 'هجوم', 'Q1033000': 'هجوم',
    'Q2101624': 'هجوم', 'Q3346155': 'هجوم', 'Q12350394': 'هجوم', 'Q3780335': 'هجوم', 'Q1050571': 'هجوم',
    'Q11346036': 'هجوم', 'Q1366210': 'وسط', 'Q2617066': 'دفاع', 'Q17025419': 'دفاع'
}


def clean_ar(s):
    if not s:
        return s
    s = re.sub(r'\s*\(.*?\)\s*', ' ', s).strip()
    return s


def main():
    ids = player_ids()
    print('players', len(ids))
    ents = wiki.entities(list(ids), props='labels|claims|sitelinks/urls|sitelinks', langs='ar|en', max_age=AGE)
    players = {}
    team_ids = set()
    award_ids = Counter()
    for q, e in ents.items():
        n = clean_ar(wiki.label(e, 'ar'))
        if not n:
            continue
        p = {'id': q, 'n': n, 'en': wiki.label(e, 'en') or '', 'sl': ids.get(q, 0)}
        b = [wiki.cval(c) for c in wiki.claims(e, 'P569')]
        p['by'] = wiki.year(b[0]) if b else None
        nat = [wiki.cval(c) for c in wiki.claims(e, 'P1532')] or [wiki.cval(c) for c in wiki.claims(e, 'P27')]
        p['nat'] = [x for x in nat if x][:2]
        p['pos'] = sorted({POS[x] for x in (wiki.cval(c) for c in wiki.claims(e, 'P413')) if x in POS})
        h = [wiki.cval(c) for c in wiki.claims(e, 'P2048')]
        if h and h[0]:
            v = h[0]
            p['h'] = int(round(v * 100)) if v < 3 else int(round(v))
        img = [wiki.cval(c) for c in wiki.claims(e, 'P18')]
        if img and img[0]:
            p['img'] = img[0]
        car = []
        for c in wiki.claims(e, 'P54'):
            t = wiki.cval(c)
            if not t:
                continue
            st = wiki.year((wiki.qual(c, 'P580') or [None])[0])
            en = wiki.year((wiki.qual(c, 'P582') or [None])[0])
            apps = wiki.qual(c, 'P1350')
            gls = wiki.qual(c, 'P1351')
            loan = 'Q2914547' in wiki.qual(c, 'P1642') or 'Q19902856' in wiki.qual(c, 'P1642')
            car.append([t, st, en, int(float(apps[0])) if apps else None, int(float(gls[0])) if gls else None, loan])
            team_ids.add(t)
        p['car'] = car
        aw = []
        for c in wiki.claims(e, 'P166'):
            a = wiki.cval(c)
            if a:
                yrs = wiki.qual(c, 'P585')
                aw.append([a, wiki.year(yrs[0]) if yrs else None])
                award_ids[a] += 1
        p['aw'] = aw
        p['enwiki'] = e.get('sitelinks', {}).get('enwiki', {}).get('title')
        p['arwiki'] = e.get('sitelinks', {}).get('arwiki', {}).get('title')
        players[q] = p
    print('with arabic label', len(players), 'teams', len(team_ids))
    json.dump({'players': players, 'teams': sorted(team_ids), 'awards': award_ids.most_common(400)},
              open(os.path.join(wiki.CACHE, 'stage1.json'), 'w'), ensure_ascii=False)


if __name__ == '__main__':
    main()
