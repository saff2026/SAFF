# يختم رقم نسخة جديد في الصفحتين قبل النشر، حتى تتحدّث الجوالات تلقائياً
import re,sys,time
stamp=time.strftime('%Y%m%d%H%M%S')
for f in sys.argv[1:]:
    s=open(f,encoding='utf-8').read()
    s2,n=re.subn(r"var BUILD='[^']*';","var BUILD='%s';"%stamp,s,count=1)
    assert n==1,f
    open(f,'w',encoding='utf-8').write(s2); print(f,stamp)
