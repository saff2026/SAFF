"""المرحلة 4: يجمع كل البيانات في ملف واحد kora/data/kora.json يقرؤه الموقع."""
import datetime
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(__file__))
import wiki  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(OUT, exist_ok=True)


def strip(s):
    return re.sub(r'\s*\(.*?\)\s*', ' ', s or '').strip()


def nat_team_name(ar):
    ar = re.sub(r'^منتخب\s+', '', ar or '')
    ar = re.sub(r'\s*(الوطني|الأول)?\s*لكرة القدم.*$', '', ar).strip()
    return ar


def main():
    s2 = json.load(open(os.path.join(wiki.CACHE, 'stage2.json'), encoding='utf-8'))
    s1 = json.load(open(os.path.join(wiki.CACHE, 'stage1.json'), encoding='utf-8'))
    matches = json.load(open(os.path.join(wiki.CACHE, 'matches.json'), encoding='utf-8'))
    titles = json.load(open(os.path.join(wiki.CACHE, 'titles.json'), encoding='utf-8'))
    players, clubs, countries = s2['players'], s2['clubs'], s2['countries']

    # الدول العربية
    arab = [b['c']['value'].rsplit('/', 1)[1] for b in wiki.sparql('SELECT ?c WHERE { ?c wdt:P463 wd:Q7172 }')]

    # الجوائز: نبقي جوائز كرة القدم الفردية التي فاز بها ٥ لاعبين على الأقل من قاعدتنا
    aw_count = Counter()
    for p in players.values():
        for a in {x[0] for x in p.get('aw', [])}:
            aw_count[a] += 1
    cand = [a for a, n in aw_count.items() if n >= 5]
    aents = wiki.entities(cand, props='labels|claims', langs='ar|en')
    awards = {}
    for q, e in aents.items():
        ar = strip(wiki.label(e, 'ar'))
        en = (wiki.label(e, 'en') or '').lower()
        if not ar:
            continue
        # نستبعد الأوسمة والجوائز غير الكروية والجوائز الجماعية العامة
        if any(w in en for w in ('order of', 'medal', 'knight', 'honorary', 'hall of fame', 'cross of', 'merit', 'citizen',
                                 'decoration', 'olympic', 'golden foot', 'team of the', 'world xi', 'fifpro', 'ufwc',
                                 'dream team', 'iffhs', 'belgian', 'goalkeeper')):
            continue
        if not any(w in en for w in ('ballon', 'player of the year', 'footballer of the year', 'golden boy', 'golden shoe',
                                     'golden boot', 'best', 'golden ball', 'kopa', 'yashin', 'pichichi', 'top scorer',
                                     'puskás', 'puskas', 'fifa world player', 'onze', 'trofeo', 'champions league',
                                     'young player', 'of the season', 'african footballer', 'asian footballer')):
            continue
        awards[q] = ar

    # الفرق: نضيف أبطال البطولات غير الموجودين
    win_q = {w[0] for t in titles.values() for w in t['w']}
    missing = [q for q in win_q if q not in clubs]
    if missing:
        ents = wiki.entities(missing, props='labels|claims|sitelinks', langs='ar|en')
        cq = set()
        for q, e in ents.items():
            c = [wiki.cval(x) for x in wiki.claims(e, 'P17')]
            en = wiki.label(e, 'en') or ''
            ar = strip(e.get('sitelinks', {}).get('arwiki', {}).get('title') or wiki.label(e, 'ar'))
            nt = 'national' in en.lower()
            clubs[q] = {'n': ar, 'en': en, 'c': c[0] if c else None, 'f': None, 'cap': None, 'hex': [], 'lg': [],
                        'nt': 1 if nt else 0, 'u': 0}
            if c and c[0]:
                cq.add(c[0])
        cents = wiki.entities([c for c in cq if c not in countries], props='labels|claims', langs='ar|en')
        for q, e in cents.items():
            countries[q] = {'ar': strip(wiki.label(e, 'ar')), 'en': wiki.label(e, 'en') or '', 'fl': '', 'cont': None,
                            'xy': None}

    # أندية المملكة المتحدة: نحدد الدولة الرياضية (إنجلترا، إسكتلندا، ويلز، أيرلندا الشمالية) من الدوري
    UK = {'إنجلي': 'Q21', 'اسكتل': 'Q22', 'إسكتل': 'Q22', 'ويلز': 'Q25', 'الويلزي': 'Q25', 'أيرلندا الشمالية': 'Q26'}
    uk_fix = 0
    for q, t in clubs.items():
        if t.get('c') == 'Q145' and not t['nt']:
            lg = ' '.join(t.get('lg') or [])
            for k, v in UK.items():
                if k in lg:
                    t['c'] = v
                    uk_fix += 1
                    break
            else:
                t['c'] = 'Q21'  # أغلب أندية المملكة المتحدة بلا دوري مسجّل إنجليزية
    need = {'Q21', 'Q22', 'Q25', 'Q26'} - set(countries)
    if need:
        ce = wiki.entities(need, props='labels|claims', langs='ar|en')
        flags = {'Q21': '🏴\U000E0067\U000E0062\U000E0065\U000E006E\U000E0067\U000E007F',
                 'Q22': '🏴\U000E0067\U000E0062\U000E0073\U000E0063\U000E0074\U000E007F',
                 'Q25': '🏴\U000E0067\U000E0062\U000E0077\U000E006C\U000E0073\U000E007F', 'Q26': '🇬🇧'}
        for q, e in ce.items():
            countries[q] = {'ar': strip(wiki.label(e, 'ar')), 'en': wiki.label(e, 'en') or '', 'fl': flags[q],
                            'cont': 'أوروبا', 'xy': None}
    print('uk clubs fixed by league', uk_fix)

    # أسماء المنتخبات = اسم الدولة (أسلم من تسميات الفرق)
    def team_ar(q):
        t = clubs[q]
        if t['nt'] and t.get('c') == 'Q145':
            en = t.get('en', '')
            for k, v in (('England', 'Q21'), ('Scotland', 'Q22'), ('Wales', 'Q25'), ('Northern Ireland', 'Q26')):
                if k in en and v in countries:
                    t['c'] = v
                    break
        if t['nt'] and t.get('c') in countries and countries[t['c']]['ar']:
            return countries[t['c']]['ar']
        return nat_team_name(t['n']) if t['nt'] else re.sub(r'^نادي\s+', '', t['n'])

    T = {}
    for q, t in clubs.items():
        name = team_ar(q)
        if not name:
            continue
        xy = t.get('xy') or [None, None]
        T[q] = [name, t.get('c'), t.get('f'), t.get('cap'), t.get('hex') or [], xy[0], xy[1],
                (t.get('lg') or [None])[0], t['nt'], t.get('en', ''), t.get('u', 0), t.get('stn')]
    C = {}
    for q, c in countries.items():
        if not c['ar']:
            continue
        xy = c.get('xy') or [None, None]
        C[q] = [c['ar'], c['fl'], c['cont'], xy[0], xy[1], c['en']]

    P = []
    for q, p in players.items():
        car = [c for c in p['car'] if c[0] in T]
        if not car or p['nat'] not in C:
            continue
        pos = p.get('pos')
        aw = [[a[0], a[1]] for a in p.get('aw', []) if a[0] in awards]
        nt = p.get('nt')
        P.append([q, p['n'], p['en'], p['by'], p['nat'], pos, p.get('h'), p['sl'], car,
                  [nt[0], nt[1], nt[2]] if nt else None, aw or None, p.get('img'), p.get('nat2') if p.get('nat2') in C else None,
                  p.get('mgr') or None])
    P.sort(key=lambda x: -x[7])

    # ---------------- القوائم المرتبة (القائمة العشرية)
    L = []

    def aliases_team(q):
        t = T[q]
        out = {t[0], re.sub(r'^نادي\s+', '', t[0]), t[9]}
        return [x for x in out if x and x != t[0]]

    for cq, t in titles.items():
        cnt = Counter(w[0] for w in t['w'] if w[0] in T)
        if len(cnt) < 5:
            continue
        yrs = sorted({w[1] for w in t['w'] if w[1]})
        if len(yrs) < 5:
            continue
        gaps = sorted(y2 - y1 for y1, y2 in zip(yrs, yrs[1:]))
        g = max(1, gaps[len(gaps) // 2])
        expected = (yrs[-1] - yrs[0]) / g + 1
        if len(yrs) < 0.9 * expected:
            print('skip list (gaps)', t['n'], len(yrs), round(expected))
            continue
        first, last = yrs[0], yrs[-1]
        ranked = cnt.most_common()
        top = ranked[:10]
        if len(ranked) > 10 and ranked[10][1] == ranked[9][1]:
            top = [x for x in ranked if x[1] > ranked[9][1]]
        if len(top) < 5:
            continue
        rows = []
        rank = 0
        prev = None
        for i, (q, n) in enumerate(top):
            if n != prev:
                rank = i + 1
                prev = n
            rows.append([T[q][0], aliases_team(q), rank, n])
        L.append({'id': 'w-' + cq, 't': 'أكثر الفرق فوزًا بـ' + t['n'], 'sub': f'عدد الألقاب من نسخة {first} حتى نسخة {last}', 'a': rows})

    # المنتخبات: الأكثر مشاركة والأكثر تسجيلًا (من صندوق معلومات اللاعبين في ويكيبيديا)
    by_nat = defaultdict(list)
    for p in P:
        if p[9] and p[9][1]:
            by_nat[p[4]].append(p)
    for nq, ps in by_nat.items():
        if len(ps) < 40 or nq not in C:
            continue
        for idx, label in ((1, 'أكثر اللاعبين مشاركة دولية مع منتخب '), (2, 'أكثر الهدافين الدوليين في تاريخ منتخب ')):
            srt = sorted([p for p in ps if p[9][idx]], key=lambda p: -p[9][idx])
            if len(srt) < 10:
                continue
            top = srt[:10]
            if len(srt) > 10 and srt[10][9][idx] == srt[9][9][idx]:
                top = [p for p in srt if p[9][idx] > srt[9][9][idx]]
            if len(top) < 5:
                continue
            rows = []
            rank, prev = 0, None
            for i, p in enumerate(top):
                v = p[9][idx]
                if v != prev:
                    rank, prev = i + 1, v
                w = p[1].split()
                rows.append([p[1], [w[-1], ' '.join(w[1:]), p[2]] if len(w) > 1 else [p[2]], rank, v])
            L.append({'id': f'n{idx}-{nq}', 't': label + C[nq][0], 'sub': 'حسب أرقام ويكيبيديا للاعبين في قاعدة البيانات', 'a': rows})

    W = {}
    for cq, t in titles.items():
        W[cq] = {'n': t['n'], 'w': [w for w in t['w'] if w[0] in T]}

    M = [m for m in matches if len(m['xi']) == 11]
    data = {'v': datetime.date.today().isoformat(), 'P': P, 'T': T, 'C': C, 'A': awards, 'M': M, 'W': W, 'L': L,
            'arab': [q for q in arab if q in C]}
    path = os.path.join(OUT, 'kora.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print('players', len(P), 'teams', len(T), 'countries', len(C), 'awards', len(awards), 'matches', len(M),
          'lists', len(L), 'size', os.path.getsize(path))


if __name__ == '__main__':
    main()
