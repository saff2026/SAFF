"""أدوات مشتركة للاتصال بـ Wikidata وWikipedia مع ذاكرة مؤقتة وإعادة المحاولة."""
import hashlib
import json
import os
import time

import requests

UA = 'kora-games-data/1.0 (static football quiz snapshot; https://github.com/saff2026/SAFF)'
CACHE = os.environ.get('KORA_CACHE', os.path.join(os.path.dirname(__file__), '.cache'))
os.makedirs(CACHE, exist_ok=True)
S = requests.Session()
S.headers['User-Agent'] = UA


def _cached(key, fn, max_age=None):
    h = hashlib.sha1(key.encode()).hexdigest()
    path = os.path.join(CACHE, h + '.json')
    if os.path.exists(path) and (max_age is None or time.time() - os.path.getmtime(path) < max_age):
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    data = fn()
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    return data


def _get(url, params, tries=8):
    delay = 3
    for i in range(tries):
        try:
            r = S.get(url, params=params, timeout=200)
            if r.status_code == 200:
                return r.json()
            if r.status_code in (429, 500, 502, 503, 504):
                ra = r.headers.get('Retry-After')
                time.sleep(int(ra) if ra and ra.isdigit() else delay)
                delay = min(delay * 2, 90)
                continue
            raise RuntimeError(f'HTTP {r.status_code}: {r.text[:300]}')
        except (requests.ConnectionError, requests.Timeout):
            time.sleep(delay)
            delay = min(delay * 2, 90)
    raise RuntimeError('failed after retries: ' + url)


def sparql(q, max_age=None):
    return _cached('sparql:' + q, lambda: _get('https://query.wikidata.org/sparql',
                   {'query': q, 'format': 'json'})['results']['bindings'], max_age)


def entities(ids, props='labels|claims|sitelinks', langs='ar|en', max_age=None):
    """يرجع قاموس id -> entity، على دفعات من 50."""
    out = {}
    ids = sorted(set(i for i in ids if i))
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        key = 'ent:' + props + langs + ','.join(chunk)
        data = _cached(key, lambda: _get('https://www.wikidata.org/w/api.php', {
            'action': 'wbgetentities', 'ids': '|'.join(chunk), 'props': props,
            'languages': langs, 'format': 'json', 'formatversion': 2}), max_age)
        got = data.get('entities', {})
        out.update(got)
        # الاستجابات الكبيرة قد تُقتطع بصمت: نعيد طلب الناقص على دفعات أصغر
        miss = [x for x in chunk if x not in got]
        if miss and len(chunk) > 1:
            step = max(1, len(miss) // 4)
            for j in range(0, len(miss), step):
                out.update(entities(miss[j:j + step], props, langs, max_age))
        time.sleep(0.2)
    return out


def wikitext(titles, site='en', section0=True, max_age=None):
    """يرجع قاموس عنوان -> نص الصفحة (المقدمة فقط إذا section0)، على دفعات من 50."""
    out = {}
    titles = sorted(set(titles))
    step = 50 if section0 else 1
    for i in range(0, len(titles), step):
        chunk = titles[i:i + step]
        params = {'action': 'query', 'prop': 'revisions|pageprops', 'rvprop': 'content', 'rvslots': 'main',
                  'titles': '|'.join(chunk), 'redirects': 1, 'format': 'json', 'formatversion': 2,
                  'ppprop': 'wikibase_item'}
        if section0:
            params['rvsection'] = 0
        data = _cached('wt:' + site + str(section0) + '|'.join(chunk),
                       lambda: _get(f'https://{site}.wikipedia.org/w/api.php', params), max_age)
        q = data.get('query', {})
        back = {}
        for n in q.get('normalized', []) + q.get('redirects', []):
            back[n['to']] = back.get(n['from'], n['from'])
        for p in q.get('pages', []):
            if 'revisions' not in p:
                continue
            txt = p['revisions'][0]['slots']['main']['content']
            t = p['title']
            out[t] = txt
            src = t
            while src in back:
                src = back[src]
                out[src] = txt
        time.sleep(0.3)
    return out


def resolve_titles(titles, site='en', max_age=None):
    """عنوان صفحة -> رقم Wikidata (يتبع التحويلات)."""
    out = {}
    titles = sorted(set(t for t in titles if t))
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        params = {'action': 'query', 'prop': 'pageprops', 'ppprop': 'wikibase_item', 'titles': '|'.join(chunk),
                  'redirects': 1, 'format': 'json', 'formatversion': 2}
        data = _cached('res:' + site + '|'.join(chunk),
                       lambda: _get(f'https://{site}.wikipedia.org/w/api.php', params), max_age)
        q = data.get('query', {})
        fwd = {}
        for n in q.get('normalized', []):
            fwd[n['from']] = n['to']
        red = {r['from']: r['to'] for r in q.get('redirects', [])}
        page_q = {p['title']: p.get('pageprops', {}).get('wikibase_item') for p in q.get('pages', [])}
        for t in chunk:
            x = fwd.get(t, t)
            seen = 0
            while x in red and seen < 5:
                x = red[x]
                seen += 1
            if page_q.get(x):
                out[t] = page_q[x]
        time.sleep(0.2)
    return out


def label(ent, lang='ar'):
    l = ent.get('labels', {}).get(lang)
    return l['value'] if l else None


def claims(ent, pid):
    return [c for c in ent.get('claims', {}).get(pid, []) if c.get('rank') != 'deprecated']


def cval(c):
    dv = c.get('mainsnak', {}).get('datavalue')
    if not dv:
        return None
    v = dv['value']
    if isinstance(v, dict):
        if 'id' in v:
            return v['id']
        if 'time' in v:
            return v['time']
        if 'amount' in v:
            return float(v['amount'])
        if 'latitude' in v:
            return (v['latitude'], v['longitude'])
    return v


def qual(c, pid):
    out = []
    for q in c.get('qualifiers', {}).get(pid, []):
        dv = q.get('datavalue')
        if not dv:
            continue
        v = dv['value']
        if isinstance(v, dict):
            v = v.get('id') or v.get('time') or v.get('amount')
        out.append(v)
    return out


def year(t):
    if not t:
        return None
    try:
        return int(t[1:5]) if t[0] in '+-' else int(t[:4])
    except ValueError:
        return None
