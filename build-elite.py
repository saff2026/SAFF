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
]

for old, new, at_least in CHANGES:
    n = s.count(old)
    if n < at_least:
        sys.exit('خطأ: لم أجد "%s" (وجدت %d مرة، المتوقع %d على الأقل)' % (old, n, at_least))
    s = s.replace(old, new)

for leftover in ['تمرين ساف الأسبوعي', 'saff_tr_', 'saff_training_v1', 'var ROOT = "training";']:
    if leftover in s:
        sys.exit('خطأ: بقي "%s" في الملف الجديد' % leftover)

open(OUT, 'w', encoding='utf-8').write(s)
print('تم إنشاء', OUT)
