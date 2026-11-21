"""يبني صفحة الموقع من ملفات src:
- app.html  : نسخة الرابط المنشور (بدون رأس الصفحة لأن المنصة تضيفه)
- index.html: صفحة كاملة مستقلة لأي استضافة (GitHub Pages أو غيرها)
البيانات تبقى في data/kora.json ويقرؤها الموقع عند التشغيل.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
JS_ORDER = ['core.js', 'games/m11.js', 'games/who.js', 'games/grid.js', 'games/career.js', 'games/questions.js',
            'games/tena.js', 'games/more.js', 'games/boards.js', 'games/lists.js', 'games/hex.js', 'games/quiz.js',
            'games/party.js', 'main.js']

HEAD = '''<title>تحدّي الكورة</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="ألعاب ألغاز كرة القدم بالعربي: الناقص 11، من اللاعب؟، شبكة الكورة، الروابط، كلمة اللاعب، وغيرها.">
<meta name="theme-color" content="#F2F4F3">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Alexandria:wght@500;600;700;800&display=swap" rel="stylesheet">
'''


def main():
    css = open(os.path.join(SRC, 'style.css'), encoding='utf-8').read()
    js = '\n'.join(open(os.path.join(SRC, 'js', f), encoding='utf-8').read() for f in JS_ORDER)
    body = '<div class="wrap" id="app"></div>\n<div class="toast" id="toast" role="status" aria-live="polite"></div>\n<script>\n' + js + '\n</script>\n'
    app = HEAD + '<style>\n' + css + '</style>\n\n' + body
    with open(os.path.join(HERE, 'app.html'), 'w', encoding='utf-8') as f:
        f.write(app)
    site = os.environ.get('KORA_SITE_URL', 'https://saff2026.github.io/Kora/')
    meta = ('<link rel="manifest" href="manifest.webmanifest">\n'
            '<link rel="icon" type="image/png" href="assets/icon-192.png">\n'
            '<link rel="apple-touch-icon" href="assets/icon-192.png">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n'
            '<meta name="apple-mobile-web-app-title" content="تحدّي الكورة">\n'
            '<meta property="og:type" content="website">\n'
            '<meta property="og:title" content="تحدّي الكورة">\n'
            '<meta property="og:description" content="22 لعبة كرة قدم يومية بالعربي: الناقص 11، من اللاعب؟، شبكة الكورة، الروابط وغيرها.">\n'
            f'<meta property="og:url" content="{site}">\n'
            f'<meta property="og:image" content="{site}assets/share.png">\n'
            '<meta name="twitter:card" content="summary_large_image">\n')
    full = ('<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="UTF-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + HEAD + meta + '<style>\n' + css + '</style>\n</head>\n<body>\n' + body + '</body>\n</html>\n')
    with open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(full)
    print('app.html', len(app), 'index.html', len(full))


if __name__ == '__main__':
    main()
