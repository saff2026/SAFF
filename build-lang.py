# يبني نسخ اللغات الأخرى من تمرين ساف (العربي هو الأصل):
#   training.html -> training-en.html (إنجليزي)  و  training-fr.html (فرنسي)
# الترجمات في i18n-en.json و i18n-fr.json (النص العربي -> الترجمة).
# الاستخدام: python3 build-lang.py   (بعد أي تعديل على training.html)
# إذا أُضيف نص عربي جديد في الموقع ولم يُترجم، يتوقف ويطبع النصوص الناقصة.
import json, re, sys

AR_LETTER = re.compile('[\u0621-\u064A]')
RUN = re.compile('[\u0621-\u064A«][\u0600-\u06FF\u0660-\u0669 0-9·:،؛؟!.\\-«»()…/✓%+×]*')

# ---------- تقسيم الملف: نصوص HTML + سلاسل JS (بدون التعليقات) ----------
REGEX_PREV = set('(,=:[!&|?{};+-*%<>~^')
REGEX_KW = ('return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else')

def js_segments(code, base):
    out = []; i = 0; n = len(code); prev = ''
    while i < n:
        c = code[i]
        if c in ' \t\r\n':
            i += 1; continue
        if code.startswith('//', i):
            j = code.find('\n', i); i = n if j < 0 else j; continue
        if code.startswith('/*', i):
            j = code.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if c in '\'"':
            j = i + 1
            while j < n and code[j] != c:
                j += 2 if code[j] == '\\' else 1
            out.append((base + i, base + j + 1)); i = j + 1; prev = 'str'; continue
        if c == '`':
            j = i + 1
            while j < n and code[j] != '`':
                j += 2 if code[j] == '\\' else 1
            out.append((base + i, base + j + 1)); i = j + 1; prev = 'str'; continue
        if c == '/':
            is_re = prev == '' or prev in REGEX_PREV or prev in REGEX_KW
            if is_re:
                j = i + 1; cls = False
                while j < n:
                    ch = code[j]
                    if ch == '\\': j += 2; continue
                    if ch == '[': cls = True
                    elif ch == ']': cls = False
                    elif ch == '/' and not cls: break
                    elif ch == '\n': break
                    j += 1
                j += 1
                while j < n and code[j].isalpha(): j += 1
                i = j; prev = 'regex'; continue   # التعابير النمطية لا تُترجم
            prev = '/'; i += 1; continue
        if c.isalnum() or c in '_$':
            j = i
            while j < n and (code[j].isalnum() or code[j] in '_$'): j += 1
            prev = code[i:j]; i = j; continue
        prev = c; i += 1
    return out

def segments(src):
    out = []; last = 0
    pat = re.compile(r'<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>|<style[^>]*>[\s\S]*?</style>|<!--[\s\S]*?-->')
    for m in pat.finditer(src):
        if m.start() > last: out.append((last, m.start()))
        if m.group(1) is not None:
            out += js_segments(m.group(1), m.start(1))
        last = m.end()
    if last < len(src): out.append((last, len(src)))
    return out

def skip_line(src, pos):
    a = src.rfind('\n', 0, pos) + 1; b = src.find('\n', pos)
    return 'i18n-skip' in src[a:b if b >= 0 else len(src)]

def runs(src):
    res = []
    for a, b in segments(src):
        for m in RUN.finditer(src, a, b):
            t = m.group(0); s0 = m.start()
            core = t.strip(); s0 += len(t) - len(t.lstrip())
            if not AR_LETTER.search(core) or skip_line(src, s0): continue
            res.append((s0, s0 + len(core), core))
    return res

# ---------- تعديلات برمجية قبل الترجمة ----------
NOUN = {
 'en': r"""var NOUN={goal:['goal','goals'],vote:['vote','votes'],assist:['assist','assists'],time:['time','times'],player:['player','players'],session:['session','sessions'],minute:['minute','minutes'],year:['year','years'],photo:['photo','photos'],substitution:['substitution','substitutions'],late:['late','late'],sar:['SAR','SAR'],voter:['voter','voters'],comparison:['comparison','comparisons']};
function nounFor(n,w){var f=NOUN[String(w).toLowerCase()]; if(!f)return w; n=Math.abs(+n||0); return n===1?f[0]:f[1];}
""",
 'fr': r"""var NOUN={'but':['but','buts'],'vote':['vote','votes'],'passe décisive':['passe décisive','passes décisives'],'fois':['fois','fois'],'joueur':['joueur','joueurs'],'séance':['séance','séances'],'minute':['minute','minutes'],'an':['an','ans'],'photo':['photo','photos'],'remplacement':['remplacement','remplacements'],'retard':['en retard','en retard'],'sar':['SAR','SAR'],'votant':['votant','votants'],'comparaison':['comparaison','comparaisons']};
function nounFor(n,w){var f=NOUN[String(w).toLowerCase()]; if(!f)return w; n=Math.abs(+n||0); return n<2?f[0]:f[1];}
""",
}
CNT = r"""function cnt(n,w,gen,tag){n=Math.round(+n||0); var num=tag?'<'+tag+'>'+n+'</'+tag.split(' ')[0]+'>':String(n); return num+' '+nounFor(n,w);}
"""

LTR_CSS = """
/* ===== من اليسار لليمين (الإنجليزي والفرنسي) ===== */
.cell+.cell:before{left:16px;right:0;}
.cell.ind+.cell:before,.cell+.cell.ind:before{left:60px;right:0;}
body.v2 .cell+.cell:before{right:16px;left:16px;}
select.field{background-position:calc(100% - 14px) 50%;padding-left:12px;padding-right:34px;}
.search svg{right:auto;left:10px;}
.search input{padding:0 12px 0 36px;}
.av-wrap .mini{left:auto;right:-4px;}
.wtab td:first-child,.wtab th:first-child{text-align:left;padding-right:0;padding-left:14px;}
.sgrid div:not(:nth-child(3n+1)):before{right:auto;left:0;}
.tgl i{right:auto;left:2px;transition:left .2s;} .tgl.on i{right:auto;left:22px;}
.gcol.B{text-align:right;}
.alert .btns button+button{border-right:none;border-left:.5px solid var(--sep);}
.switch:after{right:auto;left:2px;} .switch.on:after{transform:translateX(20px);}
.gh .fchev{transform:rotate(90deg);}
.confsel{width:112px;font-size:12.5px;}
.confseg{width:200px;} .confseg button{font-size:12px;padding-left:2px;padding-right:2px;}
.confrow .body .t{unicode-bidi:plaintext;text-align:left;}
"""
EXTRA_CSS = {'en': '', 'fr': """
.nav .org{font-size:17px;letter-spacing:-.2px;}
@media(max-width:430px){.gh .lnk .i{display:none;} .gh .acts{gap:11px;} .coach-btn .lbl2{display:none;}}
.confsel{width:118px;font-size:12px;}
.confseg{width:198px;} .confseg button{font-size:11px;}
.confrow .body .s{white-space:nowrap;}
"""}

S = None  # «نفس الشيء في كل اللغات»
# (النص القديم، الإنجليزي، الفرنسي، العدد المتوقع) — S تعني نفس النص الإنجليزي
OVERRIDES = [
    ('<html lang="ar" dir="rtl">', '<html lang="en" dir="ltr">', '<html lang="fr" dir="ltr">', 1),
    ("var LANG='ar',", "var LANG='en',", "var LANG='fr',", 1),
    # الصور المرسومة تبقى بتصميمها العربي، لكن الجمل اللاتينية تُكتب من اليسار لليمين
    ("function switchLang(to){", "(function(){var P=CanvasRenderingContext2D.prototype,f=P.fillText,m=P.measureText;function w(c,t){t=String(t);return c.direction==='rtl'&&/[A-Za-z]/.test(t)?'\\u2066'+t+'\\u2069':t;}P.fillText=function(t,x,y,mw){return mw===undefined?f.call(this,w(this,t),x,y):f.call(this,w(this,t),x,y,mw);};P.measureText=function(t){return m.call(this,w(this,t));};})();\nfunction switchLang(to){", S, 1),
    ("var AR_LOC='ar-u-ca-gregory-nu-latn';", "var AR_LOC='en-GB';", "var AR_LOC='fr-FR';", 1),
    ("toLocaleTimeString(AR_LOC,{hour:'numeric',minute:'2-digit'})", "toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})", "toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})", 1),
    ("desc:'أ ← ي',asc:'ي ← أ'", "desc:'A → Z',asc:'Z → A'", S, 1),
    ("[['att','هجوم ← دفاع'],['def','دفاع ← هجوم'],", "[['att','Attack → Defence'],['def','Defence → Attack'],", "[['att','Attaque → Défense'],['def','Défense → Attaque'],", 1),
    ('<span class="varr">←</span>', '<span class="varr">→</span>', S, 1),
    ('في الآيفون: الإعدادات ← الخصوصية والأمان ← خدمات الموقع ← مواقع Safari ← «أثناء الاستخدام»',
     'On iPhone: Settings → Privacy & Security → Location Services → Safari Websites → “While Using”',
     'Sur iPhone : Réglages → Confidentialité et sécurité → Service de localisation → Sites web Safari → « Lorsque l’app est active »', 1),
    ("a.slice(0,-1).join('، ')+' و'+a[a.length-1]", "a.slice(0,-1).join(', ')+' and '+a[a.length-1]", "a.slice(0,-1).join(', ')+' et '+a[a.length-1]", 1),
    # السهم (›) يتجه لليمين
    ("chev:'<path d=\"M14.5 6.5 9 12l5.5 5.5\"/>',", "chev:'<path d=\"M9.5 6.5 15 12l-5.5 5.5\"/>',", S, 1),
    ("(open?'90deg':'-90deg')", "(open?'-90deg':'90deg')", S, 1),
    # أسماء اللاعبين عربية: نعزلها حتى لا تتلخبط مع الأرقام في سطر لاتيني
    ("function pname(id){var p=P(id);return p?p.name:'لاعب محذوف';}", "function pname(id){var p=P(id);return p?'\\u2068'+p.name+'\\u2069':'لاعب محذوف';}", S, 1),
    ("function shortName(id){var n=pname(id).trim().split(/\\s+/);return n.length>1&&n[0].length<=3?n.slice(0,2).join(' '):n[0];}",
     "function shortName(id){var p=P(id);if(!p)return pname(id);var n=p.name.trim().split(/\\s+/);return '\\u2068'+(n.length>1&&n[0].length<=3?n.slice(0,2).join(' '):n[0])+'\\u2069';}", S, 1),
    ("pname(id).trim().charAt(0)", "pname(id).replace(/[\\u2068\\u2069]/g,'').trim().charAt(0)", S, 2),
    ("a.push('التقييمات');return a.length?", "a.push('التقييمات');a=a.map(function(x){return x.toLowerCase();});return a.length?", "a.push('التقييمات');a=a.map(function(x){return ({'Composition':'la composition','Buts':'les buts','Notes':'les notes'})[x]||x;});return a.length?", 1),
    ("askConfirm('<b>إنهاء '+(t.half===1?'الشوط الأول':'الشوط الثاني')+'؟</b>", "askConfirm('<b>End the '+(t.half===1?'first half':'second half')+'?</b>", "askConfirm('<b>Terminer la '+(t.half===1?'1re mi-temps':'2e mi-temps')+' ?</b>", 1),
    ("' مع '+(nA+nB)+' بدلاء'", "' with '+(nA+nB)+(nA+nB===1?' sub':' subs')", "' avec '+(nA+nB)+(nA+nB===1?' remplaçant':' remplaçants')", 1),
    ("'قارنت '+fmtNum(r.total)+' توزيع'", "'compared '+fmtNum(r.total)+' lineups'", "'comparé '+fmtNum(r.total)+' compositions'", 1),
    ("'، مركزه '+ORD[r]+')</span>'", "', their '+ORD[r]+' position)</span>'", "', son '+ORD[r]+' poste)</span>'", 1),
    ('<span class="small muted">في</span>', '<span class="small muted">as</span>', '<span class="small muted">en</span>', 1),
    ('<span class="small muted">من</span>', '<span class="small muted">from</span>', '<span class="small muted">de</span>', 2),
    # أسطر قصيرة في قائمة التأكيد
    ("'أكّد <span class=\"num\">'+a+'</span> من <span class=\"num\">'+PER_POS+'</span>'+(a===PER_POS?' · مكتمل':a>PER_POS?' · زيادة':'')",
     "'<span class=\"num\">'+a+'/'+PER_POS+'</span> confirmed'+(a>PER_POS?' · too many':'')",
     "'<span class=\"num\">'+a+'/'+PER_POS+'</span> confirmés'+(a>PER_POS?' · trop':'')", 1),
    ("(all?'إلغاء الكل':'تحديد الكل')", "(all?'None':'All')", "(all?'Aucun':'Tous')", 1),
    ("['gk','حراس'],['def','دفاع'],['mid','وسط'],['att','هجوم']];", "['gk','GKs'],['def','Defence'],['mid','Midfield'],['att','Attack']];", "['gk','Gardiens'],['def','Défense'],['mid','Milieu'],['att','Attaque']];", 1),
    # بطاقة اللاعب: اختصارات الطاقات (مثل فيفا)
    ("<div class=\"r\"><span>'+ATTR[a]+'</span>", "<div class=\"r\"><span>'+({pac:'PAC',sho:'SHO',pas:'PAS',dri:'DRI',def:'DEF',phy:'PHY',gk:'GK'}[a]||ATTR[a])+'</span>", "<div class=\"r\"><span>'+({pac:'VIT',sho:'TIR',pas:'PAS',dri:'DRI',def:'DÉF',phy:'PHY',gk:'GB'}[a]||ATTR[a])+'</span>", 2),
    # ترتيب الكلمات (اسم الفريق قبل الوصف)
    ('<span class="full">صلاحيات </span>مجلس الإدارة</span>', 'Board<span class="full"> access</span></span>', 'Bureau</span>', 1),
    ("isCoach?ic('unlock','xs')+'مجلس الإدارة'", "isCoach?ic('unlock','xs')+'Board'", "isCoach?ic('unlock','xs')+'<span class=\"lbl2\">Bureau</span>'", 1),
    ("بديل '+esc(s.teams[t].name)+'", "'+esc(s.teams[t].name)+' sub", "Remplaçant '+esc(s.teams[t].name)+'", 2),
    ("mh('بديل '+esc(s.teams[t].name))", "mh(esc(s.teams[t].name)+' sub')", "mh('Remplaçant '+esc(s.teams[t].name))", 1),
    ("x.tm.sub?'بديل '+tn(t)+'", "x.tm.sub?tn(t)+' sub", "x.tm.sub?'Remplaçant '+tn(t)+'", 1),
    ("x.tm.sub?'بديل '+tn(o)+'", "x.tm.sub?tn(o)+' sub", "x.tm.sub?'Remplaçant '+tn(o)+'", 1),
    ("{h:'من '+tn(t)", "{h:tn(t)", S, 1),
    ("{h:'من '+tn(t==='A'?'B':'A')", "{h:tn(t==='A'?'B':'A')", S, 1),
    ("'+ بديل'", "'+ sub'", "'+ remplaçant'", 1),
    ("'تبديل '+s.teams[t].name", "s.teams[t].name+' substitutions'", "'Remplacements '+s.teams[t].name", 1),
    ("mh('خطة '+esc(s.teams[t].name))", "mh(esc(s.teams[t].name)+' formation')", "mh('Formation '+esc(s.teams[t].name))", 1),
    ("toast('خطة '+s.teams[t].name+': '+fk)", "toast(s.teams[t].name+' formation: '+fk)", "toast('Formation '+s.teams[t].name+' : '+fk)", 1),
    ("mh('أين ينزل '+esc(pname(pid))+'؟')", "mh('Where does '+esc(pname(pid))+' go?')", "mh('Où placer '+esc(pname(pid))+' ?')", 1),
    ("var a1=c.measureText('يدخل ').width;", "var a1=c.measureText('Out ').width;", "var a1=c.measureText('Entre ').width;", 1),
    ("POS[mv.from].ar+' ← '+POS[mv.to].ar", "POS[mv.from].ar+' → '+POS[mv.to].ar", S, 1),
    ('<span class="tag on num">القوة ', '<span class="tag on num">OVR ', '<span class="tag on num">Note ', 2),
    # النتيجة: رقم الفريق الأول بجانب اسمه (يسار)
    ('font-size:44px;font-weight:700;direction:rtl;line-height:1;}', 'font-size:44px;font-weight:700;direction:ltr;line-height:1;}', S, 1),
    ('.tm-final{font-size:54px;font-weight:900;margin:8px 0 4px;direction:rtl;', '.tm-final{font-size:54px;font-weight:900;margin:8px 0 4px;direction:ltr;', S, 1),
    ('<span style="display:inline-flex;direction:rtl;gap:5px;margin:0 6px;font-weight:700">', '<span style="display:inline-flex;direction:ltr;gap:5px;margin:0 6px;font-weight:700">', S, 1),
    ("'مشاركة '+(done?'ملخص التمرين':'التشكيلة')", "'Share '+(done?'the summary':'the lineup')", "'Partager '+(done?'le résumé':'la composition')", 1),
    ('<div class="body"><div class="t">\'+esc(pname(id))+\'</div>\'+(s.att[id]?\'<div class="s" style="color:var(--green)">✓ في القائمة',
     '<div class="body"><div class="t">\'+esc((P(id)||{}).name||pname(id))+\'</div>\'+(s.att[id]?\'<div class="s" style="color:var(--green)">✓ listed',
     '<div class="body"><div class="t">\'+esc((P(id)||{}).name||pname(id))+\'</div>\'+(s.att[id]?\'<div class="s" style="color:var(--green)">✓ inscrit', 1),
    # أسماء المراكز الطويلة في الصور
    ("x.sub?'بديل':POS[x.pos].ar", S, "x.sub?'بديل':POS[x.pos].ar.replace('Défenseur','Déf.')", 1),
    ("pill(P0+26+190,cy6,POS[x.inPos].ar", S, "pill(P0+26+190,cy6,POS[x.inPos].ar.replace('Défenseur','Déf.')", 1),
    # عناوين الصور (سطران: الثاني يظهر يسار الأول)
    ("var T={sum:['ملخص','التمرين'],list:['قائمة','اللاعبين'],rot:['ترتيب','التبديل'],mvp:['أفضل','لاعب'],attr:['تغيّر','الطاقات'],post:['انتهت','المباراة'],final:['أفضل','لاعب']}[kind];",
     "var T={sum:['Summary','Session'],list:['List','Players'],rot:['Order','Substitution'],mvp:['Player','Best'],attr:['Changes','Attribute'],post:['Over','Match'],final:['Player','Best']}[kind];",
     "var T={sum:['séance','Résumé'],list:['joueurs','Liste'],rot:['rempl.','Ordre'],mvp:['joueur','Meilleur'],attr:['attributs','Évolution'],post:['terminé','Match'],final:['joueur','Meilleur']}[kind];", 1),
]

LANGS = {
    'en': {'dict': 'i18n-en.json', 'pages': [('training.html', 'training-en.html')],
           'punct': {'،': ',', '؛': ';', '؟': '?', '«': '“', '»': '”'}},
    'fr': {'dict': 'i18n-fr.json', 'pages': [('training.html', 'training-fr.html')],
           'punct': {'،': ',', '؛': ';', '؟': ' ?', '«': '«\u00a0', '»': '\u00a0»'}},
}

def build(lang, src_path, out_path):
    cfg = LANGS[lang]
    D = json.load(open(cfg['dict'], encoding='utf-8'))
    D = {k: v.replace("'", '’') for k, v in D.items()}  # الفاصلة العليا تكسر النصوص البرمجية
    s = open(src_path, encoding='utf-8').read()
    i = s.index('var NOUN={'); j = s.index('function scoreOf(')
    s = s[:i] + NOUN[lang] + CNT + s[j:]
    i = s.index('</style>')
    s = s[:i] + LTR_CSS + EXTRA_CSS[lang] + s[i:]
    for old, en, fr, n in OVERRIDES:
        new = en if lang == 'en' or fr is None else fr
        if new is None: new = old
        c = s.count(old)
        if c != n: sys.exit('خطأ في %s: "%s" موجود %d مرة والمتوقع %d' % (src_path, old[:70], c, n))
        s = s.replace(old, new)
    rs = runs(s)
    missing = sorted({t for _, _, t in rs if t not in D})
    if missing:
        sys.exit('نصوص بدون ترجمة (%s) في %s:\n' % (lang, src_path) + '\n'.join(missing))
    out = []; last = 0
    for a, b, t in rs:
        out.append(s[last:a]); out.append(D[t]); last = b
    out.append(s[last:]); s = ''.join(out)
    # علامات الترقيم العربية الباقية داخل النصوص
    out = []; last = 0
    for a, b in segments(s):
        if skip_line(s, a): continue
        out.append(s[last:a]); seg = s[a:b]
        for k, v in cfg['punct'].items(): seg = seg.replace(k, v)
        seg = seg.replace('«\u00a0 ', '«\u00a0').replace(' \u00a0»', '\u00a0»').replace('«\u00a0\u00a0', '«\u00a0').replace('\u00a0\u00a0»', '\u00a0»')
        out.append(seg); last = b
    out.append(s[last:]); s = ''.join(out)
    left = [t for _, _, t in runs(s)]
    if left: sys.exit('بقي نص عربي في %s: %s' % (out_path, left[:20]))
    open(out_path, 'w', encoding='utf-8').write(s)
    print('تم إنشاء', out_path)

for lang, cfg in LANGS.items():
    for a, b in cfg['pages']:
        build(lang, a, b)
