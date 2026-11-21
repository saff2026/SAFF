"""المرحلة 3: التشكيلات الأساسية للمباريات التاريخية + أبطال البطولات -> data/matches.json, data/titles.json"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import wiki  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(OUT, exist_ok=True)

# ------------------------------------------------------------------ المباريات
# (عنوان الصفحة في ويكيبيديا الإنجليزية، اسم البطولة بالعربي، وعند صفحات المجموعات: الفريقان لتحديد المباراة)
MATCHES = []
for y in [1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026]:
    MATCHES.append((f'{y} FIFA World Cup final', f'نهائي كأس العالم {y}', None))
for y in [1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024]:
    MATCHES.append((f'UEFA Euro {y} final', f'نهائي كأس أمم أوروبا {y}', None))
for y in range(1993, 2027):
    MATCHES.append((f'{y} UEFA Champions League final', f'نهائي دوري أبطال أوروبا {y}', None))
for y in [2007, 2011, 2015, 2016, 2019, 2021, 2024]:
    MATCHES.append((f'{y} Copa América final', f'نهائي كوبا أمريكا {y}', None))
for y in [2000, 2004, 2007, 2011, 2015, 2019, 2023]:
    MATCHES.append((f'{y} AFC Asian Cup final', f'نهائي كأس آسيا {y}', None))
for y in [2006, 2008, 2010, 2012, 2013, 2015, 2017, 2019, 2021, 2023, 2025]:
    MATCHES.append((f'{y} Africa Cup of Nations final', f'نهائي كأس أمم أفريقيا {y}', None))
for y in [2019, 2021, 2022, '2023–24', '2024–25']:
    MATCHES.append((f'{y} AFC Champions League final' if not isinstance(y, str) else f'{y} AFC Champions League final',
                    f'نهائي دوري أبطال آسيا {y}', None))
MATCHES.append(('2025 AFC Champions League Elite final', 'نهائي دوري أبطال آسيا للنخبة 2025', None))
MATCHES.append(('2025 FIFA Club World Cup final', 'نهائي كأس العالم للأندية 2025', None))
for y in [2021, 2025]:
    MATCHES.append((f'{y} FIFA Arab Cup final', f'نهائي كأس العرب {y}', None))
MATCHES += [
    ('2022 FIFA World Cup Group C', 'كأس العالم 2022 — دور المجموعات', ('Argentina', 'Saudi Arabia')),
    ('Brazil v Germany (2014 FIFA World Cup)', 'نصف نهائي كأس العالم 2014', None),
    ('2022 FIFA World Cup knockout stage', 'ربع نهائي كأس العالم 2022', ('Morocco', 'Portugal')),
    ('2022 FIFA World Cup knockout stage', 'دور الـ16 في كأس العالم 2022', ('Morocco', 'Spain')),
    ('2022 FIFA World Cup knockout stage', 'نصف نهائي كأس العالم 2022', ('Argentina', 'Croatia')),
    ('2018 FIFA World Cup Group A', 'افتتاح كأس العالم 2018', ('Russia', 'Saudi Arabia')),
    ('1994 FIFA World Cup Group F', 'كأس العالم 1994 — دور المجموعات', ('Saudi Arabia', 'Belgium')),
    ('2014 FIFA World Cup knockout stage', 'ربع نهائي كأس العالم 2014', ('Netherlands', 'Costa Rica')),
    ('2006 FIFA World Cup knockout stage', 'ربع نهائي كأس العالم 2006', ('Germany', 'Argentina')),
    ('2018 FIFA World Cup knockout stage', 'دور الـ16 في كأس العالم 2018', ('France', 'Argentina')),
    ('2010 FIFA World Cup knockout stage', 'ربع نهائي كأس العالم 2010', ('Uruguay', 'Ghana')),
]

POS_ROW = {'GK': 0, 'SW': 1, 'RB': 1, 'CB': 1, 'LB': 1, 'RWB': 2, 'LWB': 2, 'DM': 2, 'CM': 3, 'RM': 3, 'LM': 3,
           'AM': 4, 'RW': 4, 'LW': 4, 'SS': 4, 'RF': 5, 'LF': 5, 'CF': 5, 'ST': 5, 'FW': 5, 'MF': 3, 'DF': 1}
POS_AR = {'GK': 'حارس', 'SW': 'ليبرو', 'RB': 'ظهير أيمن', 'CB': 'قلب دفاع', 'LB': 'ظهير أيسر', 'RWB': 'ظهير جناح أيمن',
          'LWB': 'ظهير جناح أيسر', 'DM': 'وسط دفاعي', 'CM': 'وسط', 'RM': 'وسط أيمن', 'LM': 'وسط أيسر',
          'AM': 'وسط هجومي', 'RW': 'جناح أيمن', 'LW': 'جناح أيسر', 'SS': 'مهاجم ثانٍ', 'RF': 'مهاجم أيمن',
          'LF': 'مهاجم أيسر', 'CF': 'مهاجم', 'ST': 'مهاجم', 'FW': 'مهاجم', 'MF': 'وسط', 'DF': 'مدافع'}
ROW_RE = re.compile(r"^\|\s*([A-Z]{2,3})\s*\|\|\s*'''\s*(\d+)\s*'''\s*\|\|\s*(?:\{\{[^{}]*\}\}\s*)?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", re.M)
LINK = re.compile(r'\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]')


def lineups_after(text, start):
    """يقرأ أول تشكيلتين (11 أساسيًا لكل فريق) بعد الموضع start."""
    teams = []
    pos = start
    while len(teams) < 2:
        m = ROW_RE.search(text, pos)
        if not m:
            return None
        rows = []
        k = m.start()
        while len(rows) < 11:
            m2 = ROW_RE.search(text, k)
            if not m2:
                return None
            between = text[k:m2.start()]
            if rows and re.search(r'Substitut|Manager|Coach', between):
                return None
            rows.append({'p': m2.group(1), 'no': int(m2.group(2)), 't': m2.group(3).strip(),
                         'd': (m2.group(4) or m2.group(3)).strip()})
            k = m2.end()
        teams.append(rows)
        nxt = text.find('\n|}', k)
        pos = nxt if nxt > 0 else k
    return teams


def match_meta(text, start):
    """الفريقان والنتيجة والتاريخ من قالب football box قبل التشكيلة."""
    ms = [m.start() for m in re.finditer(r'\{\{\s*(?:#invoke:\s*)?football ?box', text[:start], re.I)]
    i = ms[-1] if ms else -1
    if i < 0:
        return None
    box = text[i:start]
    f = {}
    for line in box.split('\n'):
        m = re.match(r'\s*\|\s*([a-z0-9_]+)\s*=\s*(.*)', line)
        if m and m.group(1) not in f:
            f[m.group(1)] = m.group(2).strip()
    return f


def strip_tpl(s):
    s = re.sub(r'<ref.*?(/>|</ref>)', '', s or '', flags=re.S)
    return s


CODES = {'Morocco': 'MAR', 'Portugal': 'POR', 'Spain': 'ESP', 'Argentina': 'ARG', 'Croatia': 'CRO', 'Russia': 'RUS',
         'Saudi Arabia': 'KSA', 'Belgium': 'BEL', 'Netherlands': 'NED', 'Costa Rica': 'CRC', 'Germany': 'GER',
         'France': 'FRA', 'Uruguay': 'URU', 'Ghana': 'GHA', 'Brazil': 'BRA', 'Italy': 'ITA', 'England': 'ENG'}
CODE2 = {v: k for k, v in CODES.items()}
CODE2.update({'FRG': 'West Germany', 'NED': 'Netherlands', 'MEX': 'Mexico', 'CHI': 'Chile', 'COL': 'Colombia',
              'JPN': 'Japan', 'KOR': 'South Korea', 'QAT': 'Qatar', 'IRN': 'Iran', 'AUS': 'Australia', 'SEN': 'Senegal',
              'EGY': 'Egypt', 'NGA': 'Nigeria', 'CMR': 'Cameroon', 'CIV': 'Ivory Coast', 'ALG': 'Algeria', 'TUN': 'Tunisia',
              'JOR': 'Jordan', 'UAE': 'United Arab Emirates', 'IRQ': 'Iraq', 'CZE': 'Czech Republic', 'GRE': 'Greece',
              'DEN': 'Denmark', 'TCH': 'Czechoslovakia', 'URS': 'Soviet Union', 'SUI': 'Switzerland', 'USA': 'United States',
              'PAR': 'Paraguay', 'PER': 'Peru', 'ZAM': 'Zambia', 'RSA': 'South Africa', 'CHN': 'China', 'UZB': 'Uzbekistan',
              'BHR': 'Bahrain', 'KUW': 'Kuwait', 'OMA': 'Oman', 'SYR': 'Syria', 'LBN': 'Lebanon', 'PLE': 'Palestine',
              'MLI': 'Mali', 'BFA': 'Burkina Faso', 'COD': 'DR Congo', 'GHA': 'Ghana', 'SWE': 'Sweden', 'TUR': 'Turkey'})


def team_name(v):
    v = strip_tpl(v)
    m = re.search(r'\{\{\s*(?:fb|fbw|fb-rt|fbw-rt|fbaicon|fb rt|fbicon)[^|}]*\|\s*([A-Z]{3})', v, re.I) or \
        re.search(r'\{\{\s*#invoke:\s*flagg[^{}]*\|\s*([A-Z]{3})\s*\}\}', v)
    links = [x for x in LINK.findall(v) if not x[0].startswith(('File:', 'Image:'))]
    if links:
        return (m.group(1) if m else None), links[0][0]
    if m and m.group(1).upper() in CODE2:
        return m.group(1), CODE2[m.group(1).upper()] + ' national football team'
    return (m.group(1) if m else None), None


def score_of(v):
    v = strip_tpl(v)
    m = re.search(r'(\d+)\s*[–-]\s*(\d+)', v)
    return (int(m.group(1)), int(m.group(2))) if m else None


def build_matches():
    pages = sorted({m[0] for m in MATCHES})
    texts = wiki.wikitext(pages, section0=False)
    out = []
    all_titles = set()
    raw = []
    for title, comp, pair in MATCHES:
        t = texts.get(title)
        if not t:
            print('missing page', title)
            continue
        start = 0
        if pair:
            # موضع قالب المباراة الذي يذكر الفريقين
            best = None
            for m in re.finditer(r'\{\{\s*(?:#invoke:\s*)?football ?box', t, re.I):
                seg = t[m.start():m.start() + 1500]
                a, b = pair
                ca, cb = CODES.get(a, a), CODES.get(b, b)
                if re.search(r'team1\s*=[^\n]*(' + a + '|' + ca + ')', seg) and re.search(r'team2\s*=[^\n]*(' + b + '|' + cb + ')', seg):
                    best = m.start()
                    break
            if best is None:
                print('pair not found', title, pair)
                continue
            start = best
        else:
            m = re.search(r'\{\{\s*(?:#invoke:\s*)?football ?box', t, re.I)
            start = m.start() if m else 0
        ln = lineups_after(t, start)
        if not ln:
            print('no lineup', title, pair)
            continue
        meta = match_meta(t, t.find('|GK', start) if t.find('|GK', start) > 0 else start + 10) or {}
        raw.append((title, comp, pair, ln, meta))
        for side in ln:
            for r in side:
                all_titles.add(r['t'])
    t2q = wiki.resolve_titles(all_titles)
    ents = wiki.entities(set(t2q.values()), props='labels|sitelinks', langs='ar|en')
    team_titles = set()
    for title, comp, pair, ln, meta in raw:
        for k in ('team1', 'team2'):
            _, lk = team_name(meta.get(k, ''))
            if lk:
                team_titles.add(lk)
    tq = wiki.resolve_titles(team_titles)
    tents = wiki.entities(set(tq.values()), props='labels|claims|sitelinks', langs='ar|en')
    ctry = {}
    for q, e in tents.items():
        c = [wiki.cval(x) for x in wiki.claims(e, 'P17')] + [wiki.cval(x) for x in wiki.claims(e, 'P1532')]
        if c and c[0]:
            ctry[q] = c[0]
    cents = wiki.entities(set(ctry.values()), props='labels|sitelinks', langs='ar|en')

    def team_ar(q):
        e = tents.get(q, {})
        en = wiki.label(e, 'en') or ''
        if 'national' in en.lower() and q in ctry:
            ce = cents.get(ctry[q], {})
            return re.sub(r'\s*\(.*?\)', '', ce.get('sitelinks', {}).get('arwiki', {}).get('title') or wiki.label(ce, 'ar') or '').strip()
        return re.sub(r'\s*\(.*?\)', '', e.get('sitelinks', {}).get('arwiki', {}).get('title') or wiki.label(e, 'ar') or '').strip()
    for title, comp, pair, ln, meta in raw:
        names = []
        for k in ('team1', 'team2'):
            _, lk = team_name(meta.get(k, ''))
            q = tq.get(lk)
            ar = team_ar(q) if q else None
            ar = re.sub(r'^منتخب\s+', '', re.sub(r'\s*(الوطني)?\s*لكرة القدم.*$', '', ar or '')).strip() if ar else None
            if ar and ar.startswith('نادي '):
                ar = ar[5:]
            names.append([ar, q])
        if 'awarded' in (meta.get('scorenote', '') + meta.get('score', '')).lower():
            continue
        sc = score_of(meta.get('score', ''))
        date = re.search(r'(\d{4})\|(\d{1,2})\|(\d{1,2})', meta.get('date', ''))
        for si, side in enumerate(ln):
            players = []
            ok = True
            for r in side:
                q = t2q.get(r['t'])
                ee = ents.get(q, {})
                ar = (ee.get('sitelinks', {}).get('arwiki', {}).get('title') or wiki.label(ee, 'ar')) if q else None
                if not ar:
                    ok = False
                    break
                ar = re.sub(r'\s*\(.*?\)\s*', ' ', ar).strip()
                players.append({'q': q, 'n': ar, 'en': r['d'], 'p': r['p'], 'no': r['no']})
            if not ok or not names[si][0] or not names[1 - si][0]:
                print('drop', title, si, ok, names)
                continue
            out.append({'id': re.sub(r'\W+', '-', title.lower())[:40] + (f'-{si}' if True else ''),
                        'comp': comp or title, 'date': '-'.join(date.groups()) if date else None,
                        'me': names[si][0], 'op': names[1 - si][0], 'meq': names[si][1], 'opq': names[1 - si][1],
                        'sc': [sc[si], sc[1 - si]] if sc else None, 'xi': players})
    print('lineups', len(out))
    return out


# ------------------------------------------------------------------ أبطال البطولات
COMPS = {
    'FIFA World Cup': 'كأس العالم', 'UEFA European Championship': 'كأس أمم أوروبا', 'Copa América': 'كوبا أمريكا',
    'AFC Asian Cup': 'كأس آسيا', 'Africa Cup of Nations': 'كأس أمم أفريقيا', 'Arabian Gulf Cup': 'كأس الخليج',
    'FIFA Arab Cup': 'كأس العرب', 'UEFA Champions League': 'دوري أبطال أوروبا', 'UEFA Europa League': 'الدوري الأوروبي',
    'AFC Champions League Elite': 'دوري أبطال آسيا', 'CAF Champions League': 'دوري أبطال أفريقيا',
    'Copa Libertadores': 'كأس ليبرتادوريس', 'FIFA Club World Cup': 'كأس العالم للأندية',
    'Premier League': 'الدوري الإنجليزي الممتاز', 'La Liga': 'الدوري الإسباني', 'Serie A': 'الدوري الإيطالي',
    'Bundesliga': 'الدوري الألماني', 'Ligue 1': 'الدوري الفرنسي', 'Saudi Pro League': 'الدوري السعودي',
    'FA Cup': 'كأس الاتحاد الإنجليزي', 'Copa del Rey': 'كأس ملك إسبانيا', "King's Cup (Saudi Arabia)": 'كأس الملك السعودي',
    'Egyptian Premier League': 'الدوري المصري', 'Botola': 'الدوري المغربي', 'Qatar Stars League': 'دوري نجوم قطر',
    'UAE Pro League': 'دوري الإمارات', 'Eredivisie': 'الدوري الهولندي', 'Primeira Liga': 'الدوري البرتغالي',
    'Ballon d\'Or': None,
}


def build_titles():
    t2q = wiki.resolve_titles([k for k in COMPS if COMPS[k]])
    out = {}
    for title, ar in COMPS.items():
        if not ar or title not in t2q:
            print('comp missing', title)
            continue
        q = t2q[title]
        rows = wiki.sparql(f'''SELECT ?s ?w ?wLabel ?y WHERE {{
          ?s wdt:P3450 wd:{q}; wdt:P1346 ?w .
          OPTIONAL {{ ?s wdt:P585 ?d1 }} OPTIONAL {{ ?s wdt:P582 ?d2 }} OPTIONAL {{ ?s wdt:P580 ?d3 }}
          BIND(YEAR(COALESCE(?d1, ?d2, ?d3)) AS ?y)
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "ar,en". }} }}''')
        wins = {}
        for b in rows:
            s = b['s']['value'].rsplit('/', 1)[1]
            w = b['w']['value'].rsplit('/', 1)[1]
            y = int(b['y']['value']) if 'y' in b else None
            wins.setdefault(s, set()).add((w, y))
        # موسم له أكثر من «فائز» غالبًا يعني جوائز فرعية، نأخذ فقط المواسم بفائز واحد من نوع فريق
        out[q] = {'n': ar, 'en': title, 'w': [[w, y] for s, ws in wins.items() if len(ws) == 1 for (w, y) in ws]}
        print(title, len(out[q]['w']))
    return out


def main():
    matches = build_matches()
    json.dump(matches, open(os.path.join(wiki.CACHE, 'matches.json'), 'w'), ensure_ascii=False)
    titles = build_titles()
    json.dump(titles, open(os.path.join(wiki.CACHE, 'titles.json'), 'w'), ensure_ascii=False)


if __name__ == '__main__':
    main()
