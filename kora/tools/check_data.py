"""فحص سلامة ملف البيانات: أعداد، حقول، وعينات معروفة."""
import json
import os
import sys

path = os.path.join(os.path.dirname(__file__), '..', 'data', 'kora.json')
d = json.load(open(path, encoding='utf-8'))
P, T, C = d['P'], d['T'], d['C']
errors = []


def need(cond, msg):
    if not cond:
        errors.append(msg)


need(len(P) > 5000, f'players too few: {len(P)}')
need(len(T) > 1500, f'teams too few: {len(T)}')
need(len(d['M']) >= 80, f'matches too few: {len(d["M"])}')
need(len(d['L']) >= 15, f'lists too few: {len(d["L"])}')
byq = {p[0]: p for p in P}
for p in P:
    need(all(c[0] in T for c in p[8]), f'unknown club in {p[0]}')
    need(p[4] in C, f'unknown nat in {p[0]}')
for m in d['M']:
    need(len(m['xi']) == 11, f'xi size {m["id"]}')

# عينات معروفة
messi = byq.get('Q615')
need(messi is not None, 'Messi missing')
if messi:
    names = [T[c[0]][0] for c in messi[8]]
    print('Messi:', names, messi[9])
    need(any('برشلونة' in n for n in names), 'Messi without Barcelona')
dawsari = byq.get('Q7404373')
if dawsari:
    print('Al-Dawsari:', [T[c[0]][0] for c in dawsari[8]], dawsari[9])
for q in ('Q8682', 'Q7156', 'Q1130849', 'Q193022'):
    if q in T:
        print(q, T[q][:4], T[q][4], T[q][7])
print('lists:', [l['t'] for l in d['L']][:40])
print('awards:', list(d['A'].values())[:40])
print('size MB', round(os.path.getsize(path) / 1e6, 2))
if errors:
    print('ERRORS', len(errors), errors[:20])
    sys.exit(1)
print('OK')
