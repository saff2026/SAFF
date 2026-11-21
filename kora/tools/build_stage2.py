"""المرحلة 2: مسيرة اللاعبين من ويكيبيديا + بيانات الأندية والدول من Wikidata -> kora/data/players.json, clubs.json"""
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(__file__))
import wiki  # noqa: E402
from infobox import parse_infobox  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '..', 'data')
YOUTH = re.compile(r'(\bU-?\d{2}\b|under-\d{2}|\bB\b|\bII\b|\bReserves?\b|\bAtl[eè]tic\b|\bCastilla\b|\bYouth\b|\bAcademy\b|'
                   r'\bC\b$|\bJong\b|\bPrimavera\b|\bJuniors? team\b|\bOlympic\b|\bAmateurs?\b|\bAcademia\b|\bSub-\d\d|'
                   r'\bII$|\b2$|\bU\d\d$|Next Pro|\bB team\b)', re.I)
AR_YOUTH = re.compile(r'(تحت \d|للشباب|الرديف|للناشئين|الأولمبي|أتلتيك$|كاستيا|الثاني$|\bب$|\bبي$|أكاديمية)')

FLAG_FIX = {'GB-ENG': '🏴\U000E0067\U000E0062\U000E0065\U000E006E\U000E0067\U000E007F',
            'GB-SCT': '🏴\U000E0067\U000E0062\U000E0073\U000E0063\U000E0074\U000E007F',
            'GB-WLS': '🏴\U000E0067\U000E0062\U000E0077\U000E006C\U000E0073\U000E007F'}


def flag(iso):
    if not iso:
        return ''
    if iso in FLAG_FIX:
        return FLAG_FIX[iso]
    if len(iso) != 2:
        return ''
    return ''.join(chr(0x1F1E6 + ord(c) - 65) for c in iso.upper())


def strip_paren(s):
    return re.sub(r'\s*\(.*?\)\s*', ' ', s or '').strip()


def main():
    st1 = json.load(open(os.path.join(wiki.CACHE, 'stage1.json'), encoding='utf-8'))
    players = st1['players']

    # ---------- 1) جداول المسيرة من ويكيبيديا الإنجليزية
    titles = [p['enwiki'] for p in players.values() if p.get('enwiki')]
    print('fetching infoboxes', len(titles))
    texts = wiki.wikitext(titles)
    boxes = {}
    link_titles = set()
    for q, p in players.items():
        t = p.get('enwiki')
        if t and t in texts:
            b = parse_infobox(texts[t])
            if b:
                boxes[q] = b
                for c in b['clubs'] + b['nat'] + b['mgr']:
                    link_titles.add(c['t'])
    print('infoboxes', len(boxes), 'links', len(link_titles))
    t2q = wiki.resolve_titles(link_titles)

    # ---------- 2) كيانات الفرق
    team_q = set(t2q.values()) | set(st1['teams'])
    print('teams', len(team_q))
    tents = wiki.entities(team_q, props='labels|claims', langs='ar|en')
    stad_q, color_q, country_q, league_q, loc_q = set(), set(), set(), set(), set()
    teams = {}
    for q, e in tents.items():
        en = wiki.label(e, 'en') or ''
        ar = strip_paren(wiki.label(e, 'ar') or '')
        p31 = {wiki.cval(c) for c in wiki.claims(e, 'P31')}
        nat_team = bool(p31 & {'Q6979593', 'Q1194951', 'Q23759293'}) or 'national' in en.lower() or ar.startswith('منتخب')
        youth = bool(YOUTH.search(en)) or bool(AR_YOUTH.search(ar))
        women = 'women' in en.lower() or 'للسيدات' in ar or 'نسائي' in ar
        country = [wiki.cval(c) for c in wiki.claims(e, 'P17')]
        league = [wiki.cval(c) for c in wiki.claims(e, 'P118')]
        inc = [wiki.year(wiki.cval(c)) for c in wiki.claims(e, 'P571')]
        stad = [wiki.cval(c) for c in wiki.claims(e, 'P115')]
        col = [wiki.cval(c) for c in wiki.claims(e, 'P6364')]
        coord = [wiki.cval(c) for c in wiki.claims(e, 'P625')]
        loc = [wiki.cval(c) for c in wiki.claims(e, 'P159')] + [wiki.cval(c) for c in wiki.claims(e, 'P131')]
        teams[q] = {'ar': ar, 'en': en, 'nt': nat_team, 'youth': youth, 'women': women,
                    'c': country[0] if country else None, 'lg': [x for x in league if x][:3],
                    'f': inc[0] if inc and inc[0] else None, 'st': stad[0] if stad else None,
                    'col': [x for x in col if x], 'xy': coord[0] if coord else None, 'loc': loc[0] if loc else None}
        if country and country[0]:
            country_q.add(country[0])
        league_q.update(x for x in league if x)
        if stad:
            stad_q.add(stad[0])
        color_q.update(x for x in col if x)
        if loc and loc[0] and not coord:
            loc_q.add(loc[0])
    sents = wiki.entities(stad_q | loc_q, props='labels|claims', langs='ar|en')
    cents = wiki.entities(color_q, props='labels|claims', langs='ar|en')
    lents = wiki.entities(league_q, props='labels|claims', langs='ar|en')

    # الدول: من الفرق ومن جنسيات اللاعبين
    for p in players.values():
        country_q.update(p['nat'])
    for l in lents.values():
        country_q.update(wiki.cval(c) for c in wiki.claims(l, 'P17'))
    country_q.discard(None)
    kents = wiki.entities(country_q, props='labels|claims', langs='ar|en')
    countries = {}
    for q, e in kents.items():
        iso = [wiki.cval(c) for c in wiki.claims(e, 'P297')]
        iso3166_2 = [wiki.cval(c) for c in wiki.claims(e, 'P300')]
        cont = [wiki.cval(c) for c in wiki.claims(e, 'P30')]
        coord = [wiki.cval(c) for c in wiki.claims(e, 'P625')]
        code = iso[0] if iso else (iso3166_2[0] if iso3166_2 else None)
        countries[q] = {'ar': strip_paren(wiki.label(e, 'ar') or ''), 'en': wiki.label(e, 'en') or '',
                        'fl': flag(code), 'cont': cont[0] if cont else None, 'xy': coord[0] if coord else None}
    # تصحيح القارات للدول العابرة
    CONT_AR = {'Q46': 'أوروبا', 'Q48': 'آسيا', 'Q15': 'أفريقيا', 'Q18': 'أمريكا الجنوبية', 'Q49': 'أمريكا الشمالية',
               'Q538': 'أوقيانوسيا', 'Q55643': 'أوقيانوسيا', 'Q3960': 'أوقيانوسيا', 'Q5401': 'أوروبا'}
    for q, c in countries.items():
        c['cont'] = CONT_AR.get(c['cont'], c['cont'])
    for q in ('Q159', 'Q43', 'Q230', 'Q227', 'Q399'):  # روسيا تركيا جورجيا أذربيجان أرمينيا
        if q in countries:
            countries[q]['cont'] = 'أوروبا'
    for q in ('Q408',):  # أستراليا في الاتحاد الآسيوي
        if q in countries:
            countries[q]['cont'] = 'آسيا'

    def hexcol(q):
        e = cents.get(q)
        if not e:
            return None
        h = [wiki.cval(c) for c in wiki.claims(e, 'P465')]
        return ('#' + h[0].lower()) if h and h[0] else None

    for q, t in teams.items():
        s = sents.get(t['st']) if t['st'] else None
        t['cap'] = None
        if s:
            capv = [wiki.cval(c) for c in wiki.claims(s, 'P1083')]
            capv = [x for x in capv if x]
            t['cap'] = int(max(capv)) if capv else None
            t['stn'] = strip_paren(wiki.label(s, 'ar') or wiki.label(s, 'en') or '')
            if not t['xy']:
                xy = [wiki.cval(c) for c in wiki.claims(s, 'P625')]
                t['xy'] = xy[0] if xy else None
        if not t['xy'] and t['loc'] and t['loc'] in sents:
            xy = [wiki.cval(c) for c in wiki.claims(sents[t['loc']], 'P625')]
            t['xy'] = xy[0] if xy else None
        t['hex'] = [h for h in (hexcol(c) for c in t['col']) if h]
        t['lgn'] = [strip_paren(wiki.label(lents[l], 'ar') or '') for l in t['lg'] if l in lents]

    # ---------- 3) سجل اللاعب النهائي
    out_players = {}
    club_use = Counter()
    for q, p in players.items():
        b = boxes.get(q)
        car = []
        nt = None
        if b:
            for c in b['clubs']:
                tq = t2q.get(c['t'])
                if not tq or tq not in teams:
                    continue
                tm = teams[tq]
                if tm['nt'] or tm['youth'] or tm['women'] or not tm['ar']:
                    continue
                car.append([tq, c['s'], c['e'], c['apps'], c['g'], 1 if c['loan'] else 0])
            senior = [n for n in b['nat'] if t2q.get(n['t']) in teams and not teams[t2q[n['t']]]['youth']
                      and teams[t2q[n['t']]]['nt']]
            if senior:
                n = max(senior, key=lambda n: (n['apps'] or 0))
                nt = [t2q[n['t']], n['apps'], n['g'], n['s']]
            src = 'wp'
        else:
            for c in p['car']:
                tq = c[0]
                tm = teams.get(tq)
                if not tm or tm['nt'] or tm['youth'] or tm['women'] or not tm['ar']:
                    continue
                car.append([tq, c[1], c[2], c[3], c[4], 1 if c[5] else 0])
            car.sort(key=lambda c: (c[1] or 9999))
            src = 'wd'
        if not car:
            continue
        for c in car:
            club_use[c[0]] += 1
        nat = [n for n in p['nat'] if n in countries and countries[n]['ar']]
        if not nat:
            continue
        rec = {'n': p['n'], 'en': p['en'], 'by': p['by'], 'nat': nat[0], 'pos': p['pos'][:1][0] if p['pos'] else None,
               'h': p.get('h'), 'sl': p['sl'], 'car': car, 'src': src}
        if nt:
            rec['nt'] = nt
        if len(nat) > 1:
            rec['nat2'] = nat[1]
        if p.get('img'):
            rec['img'] = p['img']
        aw = [a for a in p['aw']]
        if aw:
            rec['aw'] = aw
        if b and b['mgr']:
            rec['mgr'] = [[t2q[m['t']], m['s'], m['e']] for m in b['mgr'] if t2q.get(m['t']) in teams]
        out_players[q] = rec
    print('final players', len(out_players))

    used_teams = set(club_use) | {p['nt'][0] for p in out_players.values() if 'nt' in p}
    for p in out_players.values():
        for m in p.get('mgr', []):
            used_teams.add(m[0])
    out_clubs = {}
    for q in used_teams:
        t = teams[q]
        rec = {'n': t['ar'], 'en': t['en'], 'c': t['c'], 'f': t['f'], 'cap': t['cap'], 'hex': t['hex'],
               'lg': t['lgn'][:1], 'nt': 1 if t['nt'] else 0, 'u': club_use.get(q, 0)}
        if t['xy']:
            rec['xy'] = [round(t['xy'][0], 3), round(t['xy'][1], 3)]
        if t.get('stn'):
            rec['stn'] = t['stn']
        out_clubs[q] = rec
    used_c = {p['nat'] for p in out_players.values()} | {p.get('nat2') for p in out_players.values()} | \
             {c['c'] for c in out_clubs.values()}
    out_countries = {q: countries[q] for q in used_c if q in countries}
    json.dump({'players': out_players, 'clubs': out_clubs, 'countries': out_countries},
              open(os.path.join(wiki.CACHE, 'stage2.json'), 'w'), ensure_ascii=False)
    print('clubs', len(out_clubs), 'countries', len(out_countries))


if __name__ == '__main__':
    main()
