"""قراءة جدول مسيرة اللاعب من صندوق المعلومات في ويكيبيديا الإنجليزية (Infobox football biography)."""
import re

LINK = re.compile(r'\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]')


def _fields(text):
    """يرجع قاموس الحقول من أول قالب Infobox football biography."""
    m = re.search(r'\{\{\s*Infobox\s+football\s+biography', text, re.I)
    if not m:
        return None
    i = m.end()
    depth = 2
    j = i
    n = len(text)
    while j < n and depth > 0:
        if text.startswith('{{', j):
            depth += 2
            j += 2
            continue
        if text.startswith('}}', j):
            depth -= 2
            j += 2
            continue
        j += 1
    body = text[i:j - 2]
    # نقسم على | في المستوى الأعلى فقط
    parts, cur, d, k = [], [], 0, 0
    while k < len(body):
        two = body[k:k + 2]
        if two in ('{{', '[['):
            d += 1
            cur.append(two)
            k += 2
            continue
        if two in ('}}', ']]'):
            d -= 1
            cur.append(two)
            k += 2
            continue
        ch = body[k]
        if ch == '|' and d == 0:
            parts.append(''.join(cur))
            cur = []
        else:
            cur.append(ch)
        k += 1
    parts.append(''.join(cur))
    out = {}
    for p in parts:
        if '=' in p:
            key, val = p.split('=', 1)
            out[re.sub(r'[\s_-]', '', key.strip().lower())] = val.strip()
    return out


def _clean(v):
    v = re.sub(r'<ref[^>]*/>', '', v)
    v = re.sub(r'<ref[^>]*>.*?</ref>', '', v, flags=re.S)
    v = re.sub(r'<!--.*?-->', '', v, flags=re.S)
    v = re.sub(r'\{\{\s*(?:efn|sfn|refn|ref label|nowrap)[^{}]*\}\}', '', v, flags=re.I)
    return v.strip()


def _num(v):
    v = _clean(v or '')
    v = LINK.sub(lambda m: (m.group(2) or m.group(1)), v)
    v = re.sub(r'\{\{[^{}]*\}\}', '', v)
    m = re.search(r'\d+', v.replace(',', ''))
    return int(m.group()) if m else None


def _years(v):
    v = _clean(v or '')
    ys = [int(x) for x in re.findall(r'(1[89]\d\d|20\d\d)', v)]
    if not ys:
        return None, None
    s = ys[0]
    e = ys[1] if len(ys) > 1 else (None if re.search(r'[–-]\s*$', v) else s)
    return s, e


def _link(v):
    v = _clean(v or '')
    m = LINK.search(v)
    if not m:
        return None, v.strip()
    return m.group(1).strip(), (m.group(2) or m.group(1)).strip()


def parse_infobox(text):
    f = _fields(text or '')
    if not f:
        return None
    clubs = []
    for i in range(1, 40):
        c = f.get(f'clubs{i}')
        if c is None:
            continue
        title, name = _link(c)
        if not title:
            continue
        s, e = _years(f.get(f'years{i}'))
        clubs.append({'t': title, 'loan': '→' in c or '(loan)' in c.lower() or 'loan' in c.lower(),
                      's': s, 'e': e, 'apps': _num(f.get(f'caps{i}')), 'g': _num(f.get(f'goals{i}'))})
    nat = []
    for i in range(1, 25):
        c = f.get(f'nationalteam{i}')
        if c is None:
            continue
        title, name = _link(c)
        if not title:
            continue
        s, e = _years(f.get(f'nationalyears{i}'))
        nat.append({'t': title, 's': s, 'e': e, 'apps': _num(f.get(f'nationalcaps{i}')),
                    'g': _num(f.get(f'nationalgoals{i}'))})
    mgr = []
    for i in range(1, 30):
        c = f.get(f'managerclubs{i}')
        if c is None:
            continue
        title, name = _link(c)
        if title:
            s, e = _years(f.get(f'manageryears{i}'))
            mgr.append({'t': title, 's': s, 'e': e})
    total = None
    if f.get('totalcaps'):
        total = [_num(f.get('totalcaps')), _num(f.get('totalgoals'))]
    return {'clubs': clubs, 'nat': nat, 'mgr': mgr, 'total': total,
            'upd': _clean(f.get('clubupdate') or f.get('pcupdate') or '')[:40]}


if __name__ == '__main__':
    import sys
    sys.path.insert(0, '.')
    import wiki
    t = wiki.wikitext(['Lionel Messi', 'Salem Al-Dawsari'])
    for k, v in t.items():
        r = parse_infobox(v)
        print(k, r and r['clubs'], r and r['nat'][-1:], r and r['upd'])
