# يبني موقع «تمرين نخبة السبت» (elite.html) من training.html
# نفس الموقع بالضبط، لكن باسم مختلف وقاعدة بيانات وإعدادات جوال منفصلة.
# الاستخدام: python3 build-elite.py
import sys

SRC = 'training.html'
OUT = 'elite.html'

s = open(SRC, encoding='utf-8').read()

# (النص القديم، النص الجديد، كم مرة لازم يوجد على الأقل)
CHANGES = [
    ('تمرين ساف', 'تمرين نخبة السبت', 5),       # الاسم في كل مكان
    ('var ROOT = "training";', 'var ROOT = "training_elite";', 1),  # قاعدة البيانات
    ("'saff_training_v1'", "'saff_elite_v1'", 1),        # الحفظ على الجهاز
    ('saff_tr_', 'saff_el_', 10),                        # إعدادات الجوال (الدخول، اسمي، الأقسام...)
    # بدون شعار الاتحاد: شعار «نخبة السبت» (درع ذهبي وكورة) بدلاً منه
    ('<picture><source srcset="saff-white.png" media="(prefers-color-scheme: dark)"><img class="logo" src="saff.png" alt="الاتحاد السعودي لكرة القدم"></picture>',
     '<img class="logo" src="emblem.png?v=3" alt="">', 1),
    ('icon-saff-192.png', 'icon-elite-192.png?v=3', 2),       # أيقونة الشاشة الرئيسية
    ("loadImg('saff-white.png')", "loadImg('emblem.png?v=3')", 2),  # صور المشاركة
    ('الاتحاد السعودي لكرة القدم · ', '', 1),             # تذييل صور المشاركة
    ('var FEAT_JOKER = false;', 'var FEAT_JOKER = true;', 1),  # وسام الجوكر لنخبة السبت فقط
    ('var FEAT_SELFISH = true;', 'var FEAT_SELFISH = false;', 1),
    ('var FEAT_TRAITS = true;', 'var FEAT_TRAITS = false;', 1),
    # قائمة المتأخرين العامة: تبدأ من التمرين 15، واللي في القائمة المنشورة بعد التمرين 14 متأخرين مرة
    ('var LATE_BASE = null;', 'var LATE_BASE = {from:15, ids:["pmwjnhmkz2fpn8","pmwgge5bxccfih","pmwggbwuk9bvs6","pmwggqzrquiejq","pmwggnfqvyjksj","pmwggs2yj8b3xl","pmwggt3uyxj1pb","pmwggkfuy2nnpm","pmwggld5c78l0s","pmwggsqrzpb3y0"]};', 1),  # بدون «يلعب تحت الضغط» و«لياقة عالية» في نخبة السبت  # خاصية «أناني» لتمرين ساف فقط
    ("LANG_PAGES={ar:'training.html',en:'training-en.html',fr:'training-fr.html'}", "LANG_PAGES={ar:'elite.html'}", 1),  # نخبة السبت بالعربي فقط
    ('    <button class="theme-btn" id="langBtn" onclick="openLang()"', '    <button class="theme-btn" id="langBtn" style="display:none" onclick="openLang()"', 1),  # بدون زر اللغة
]

for old, new, at_least in CHANGES:
    n = s.count(old)
    if n < at_least:
        sys.exit('خطأ: لم أجد "%s" (وجدت %d مرة، المتوقع %d على الأقل)' % (old, n, at_least))
    s = s.replace(old, new)

for leftover in ['تمرين ساف', 'saff_tr_', 'saff_training_v1', 'var ROOT = "training";', 'saff.png', 'saff-white.png', 'icon-saff', 'الاتحاد السعودي', 'training.html', 'training-en.html', 'training-fr.html']:
    if leftover in s:
        sys.exit('خطأ: بقي "%s" في الملف الجديد' % leftover)

open(OUT, 'w', encoding='utf-8').write(s)
print('تم إنشاء', OUT)
