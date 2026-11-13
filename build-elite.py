# يبني موقع «تمرين نخبة السبت» (elite.html) من training.html
# نفس الموقع بالضبط، لكن باسم مختلف وقاعدة بيانات وإعدادات جوال منفصلة.
# الاستخدام: python3 build-elite.py
import sys

SRC = 'training.html'
OUT = 'elite.html'

s = open(SRC, encoding='utf-8').read()

# (النص القديم، النص الجديد، كم مرة لازم يوجد على الأقل)
CHANGES = [
    ('تمرين ساف الأسبوعي', 'تمرين نخبة السبت', 5),       # الاسم في كل مكان
    ('var ROOT = "training";', 'var ROOT = "training_elite";', 1),  # قاعدة البيانات
    ("'saff_training_v1'", "'saff_elite_v1'", 1),        # الحفظ على الجهاز
    ('saff_tr_', 'saff_el_', 10),                        # إعدادات الجوال (الدخول، اسمي، الأقسام...)
    # بدون شعار الاتحاد: كورة بدلاً منه
    ('<picture><source srcset="saff-white.png" media="(prefers-color-scheme: dark)"><img class="logo" src="saff.png" alt="الاتحاد السعودي لكرة القدم"></picture>',
     '<img class="logo" src="ball.png?v=2" alt="">', 1),
    ('icon-saff-192.png', 'icon-elite-192.png?v=2', 2),       # أيقونة الشاشة الرئيسية
    ("loadImg('saff-white.png')", "loadImg('ball.png?v=2')", 2),  # صور المشاركة
    ('الاتحاد السعودي لكرة القدم · ', '', 1),             # تذييل صور المشاركة
]

for old, new, at_least in CHANGES:
    n = s.count(old)
    if n < at_least:
        sys.exit('خطأ: لم أجد "%s" (وجدت %d مرة، المتوقع %d على الأقل)' % (old, n, at_least))
    s = s.replace(old, new)

for leftover in ['تمرين ساف الأسبوعي', 'saff_tr_', 'saff_training_v1', 'var ROOT = "training";', 'saff.png', 'saff-white.png', 'icon-saff', 'الاتحاد السعودي']:
    if leftover in s:
        sys.exit('خطأ: بقي "%s" في الملف الجديد' % leftover)

open(OUT, 'w', encoding='utf-8').write(s)
print('تم إنشاء', OUT)
