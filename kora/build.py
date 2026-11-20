# يبني index.html (صفحة مستقلة كاملة) من app.html
s=open('app.html',encoding='utf-8').read()
i=s.index('<div class="wrap" id="app">')
head,body=s[:i],s[i:]
out='<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'+head+'</head>\n<body>\n'+body+'</body>\n</html>\n'
open('index.html','w',encoding='utf-8').write(out)
print('ok',len(out))
