# قائمة المتأخرين العامة لـ «تمرين نخبة السبت»
# يقرأ التمارين المنتهية من قاعدة البيانات ويطبّق القوانين:
#   - تأخيران = قائمة الحرمان
#   - المحروم يوقف عن 3 تمارين متتالية (التمارين اللي بعد التأخير الثاني)
#   - حضور تمرينين في الوقت يمحو تأخيرًا واحدًا
# نقطة البداية: القائمة المنشورة بعد التمرين 14 — كل من فيها (ما عدا متعب العتيبي
# اللي انمحى تأخيره) يُعتبر متأخر مرة، والهجلة والنهدي والمشحن حضروا في الوقت مرة بعدها.
# الاستخدام: python3 late-list.py   (أو python3 late-list.py db.json لملف محفوظ)
import json, sys, datetime, urllib.request

API_KEY = 'AIzaSyBlRu52dh7N58H9j1HebKwI1OSttWyX5ZA'
DB = 'https://wc-2026-predictions---saff-default-rtdb.firebaseio.com/training_elite.json'
START_NUM = 15          # أول تمرين يُحسب (القائمة المنشورة تشمل تأخير التمرين 14)
BAN_LEN = 3
BASE_OK = {'عبدالرحمن الهجلة': 1, 'محمد النهدي': 1, 'عبدالعزيز المشحن': 1}  # حضروا في الوقت مرة بعد تأخيرهم
BASELINE = ['عبدالرحمن الهجلة', 'محمد النهدي', 'عبدالعزيز المشحن', 'محمود خطيري', 'أيمن الحازمي',
            'مشعل الشهري', 'أبوبكر بخش', 'نوّاف الفاضل', 'عمّار المطيري', 'عبدالله باجبع']

def load():
    if len(sys.argv) > 1:
        return json.load(open(sys.argv[1], encoding='utf-8'))
    req = urllib.request.Request('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + API_KEY,
                                 data=b'{"returnSecureToken":true}', headers={'Content-Type': 'application/json'})
    tok = json.load(urllib.request.urlopen(req))['idToken']
    return json.load(urllib.request.urlopen(DB + '?auth=' + tok))

def start_ts(s):
    y, m, d = map(int, s['date'].split('-')); h, mi = map(int, (s.get('time') or '20:00').split(':'))
    return datetime.datetime(y, m, d, h, mi, tzinfo=datetime.timezone(datetime.timedelta(hours=3))).timestamp()

def main():
    data = load(); P = data.get('players') or {}; S = data.get('sessions') or {}
    name = lambda i: (P.get(i) or {}).get('name', 'لاعب محذوف')
    by_name = {p.get('name'): i for i, p in P.items()}
    st = {i: {'late': 0, 'ok': 0, 'ban': 0, 'banned_at': None, 'lates': [], 'oks': 0, 'apps': 0} for i in P}
    for n in BASELINE:
        if n in by_name:
            st[by_name[n]]['late'] = 1
            st[by_name[n]]['ok'] = BASE_OK.get(n, 0)
        else: print('تنبيه: ما لقيت اللاعب', n)
    done = sorted([s for s in S.values() if s.get('status') == 'done' and (s.get('num') or 0) >= START_NUM],
                  key=lambda s: (s['date'], s.get('time') or ''))
    log = []
    for s in done:
        ci = s.get('checkin') or {}; ls = s.get('lateSet') or {}; ab = s.get('absent') or {}
        came = {i for i in set(ci) | {k for k, v in ls.items() if v in (True, False)} if not ab.get(i)}
        late = {i for i in came if ls.get(i) is True or (ls.get(i) is not False and i in ci and ci[i] / 1000 - start_ts(s) >= 60)}
        for i, x in st.items():
            if x['ban'] > 0:                       # يقضي الإيقاف
                x['ban'] -= 1
                if i in came: log.append('⚠️ %s حضر التمرين %s وهو موقوف' % (name(i), s.get('num')))
                continue
            if i not in came: continue
            x['apps'] += 1
            if i in late:
                x['late'] += 1; x['ok'] = 0; x['lates'].append(s.get('num'))
                if x['late'] >= 2:
                    x['ban'] = BAN_LEN; x['banned_at'] = s.get('num'); x['late'] = 0
            else:
                x['oks'] += 1
                if x['late'] > 0:
                    x['ok'] += 1
                    if x['ok'] >= 2: x['late'] -= 1; x['ok'] = 0
    last = done[-1]['num'] if done else START_NUM - 1
    print('التمارين المحسوبة:', ', '.join(str(s.get('num')) for s in done) or 'لا يوجد')
    print('\n⛔ قائمة الحرمان:')
    for i, x in sorted(st.items(), key=lambda kv: name(kv[0])):
        if x['ban'] > 0:
            nums = list(range(last + 1, last + 1 + x['ban']))
            print('  %s — موقوف عن التمارين %s (تأخّر في التمرين %s)' % (name(i), ' و'.join(map(str, nums)), x['banned_at']))
    print('\n🟠 متأخر مرة:')
    for i, x in sorted(st.items(), key=lambda kv: name(kv[0])):
        if x['ban'] == 0 and x['late'] > 0:
            print('  %s — %d/2 حضور في الوقت (باقي %d ويُمحى)' % (name(i), x['ok'], 2 - x['ok']))
    for l in log: print(l)
    print('\n📋 الحضور في التمارين المحسوبة:')
    for s in done:
        ci = s.get('checkin') or {}; ls = s.get('lateSet') or {}
        print('  التمرين %s (%s):' % (s.get('num'), s['date']))
        rows = []
        for i in set(ci) | set(ls):
            if (s.get('absent') or {}).get(i): continue
            m = int((ci[i] / 1000 - start_ts(s)) // 60) if i in ci else None
            lt = ls.get(i) is True or (ls.get(i) is not False and m is not None and m > 0)
            rows.append((lt, name(i), m))
        for lt, n, m in sorted(rows):
            print('    %s %s%s' % ('🔴 متأخر' if lt else '🟢 في الوقت', n, '' if m is None else ' (وصل %+d د)' % m))

main()
