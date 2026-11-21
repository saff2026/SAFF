/* =================== كلمة اللاعب (Football Wordle) =================== */
const WORD={
  MAX:6,
  KB:[['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح','ج','د'],['ش','س','ي','ب','ل','ا','ت','ن','م','ك','ط'],['⌫','ظ','ز','و','ر','ذ','↵']],
  pool(){
    if(this._p)return this._p;
    const out=[];for(const p of D.famous.slice(0,350)){const w=p.n.split(/\s+/);if(w.length<2)continue;const k=norm(w[w.length-1]);if(k.length>=4&&k.length<=6&&/^[ء-ي]+$/.test(k))out.push({q:p.q,k});}
    this._valid=new Set(D.P.map(p=>{const w=p.n.split(/\s+/);return norm(w[w.length-1]);}));
    return this._p=out;
  },
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;const pool=this.pool();
    const t=mode==='daily'?dailyPick(pool,'word'):pool[Math.floor(Math.random()*pool.length)];
    const fresh=()=>({t:t.q,k:t.k,g:[],done:false,win:false});
    this.st=mode==='daily'?dayState('word',fresh):fresh();if(mode==='daily'&&this.st.t!==t.q)this.st=Object.assign({day:DAY},fresh());
    this.cur='';this.draw();this.bindKeys();
  },
  stop(){document.removeEventListener('keydown',this._kh);},
  bindKeys(){
    document.removeEventListener('keydown',this._kh);
    this._kh=e=>{if(e.ctrlKey||e.metaKey||e.altKey||$('#scrim'))return;if(e.key==='Enter'){this.key('↵');e.preventDefault();}else if(e.key==='Backspace'){this.key('⌫');e.preventDefault();}else{const c=norm(e.key);if(c.length===1&&/[ء-ي]/.test(c)){this.key(c);e.preventDefault();}}};
    document.addEventListener('keydown',this._kh);
  },
  save(){if(this.mode==='daily')saveDay('word',this.st);},
  score(g){
    const k=[...this.st.k],gg=[...g],res=new Array(gg.length).fill('miss'),cnt={};
    k.forEach((c,j)=>{if(gg[j]!==c)cnt[c]=(cnt[c]||0)+1;});
    gg.forEach((c,j)=>{if(c===k[j])res[j]='ok';});
    gg.forEach((c,j)=>{if(res[j]!=='ok'&&cnt[c]>0){res[j]='near';cnt[c]--;}});
    return res;
  },
  draw(){
    const st=this.st,L=st.k.length;
    const rows=[];for(let i=0;i<this.MAX;i++){
      const g=st.g[i];
      if(g){const r=this.score(g);rows.push('<div class="tiles">'+[...g].map((c,j)=>'<div class="tile '+r[j]+'">'+c+'</div>').join('')+'</div>');}
      else if(i===st.g.length&&!st.done){rows.push('<div class="tiles" id="wcur">'+Array.from({length:L},(_,j)=>'<div class="tile '+(this.cur[j]?'':'empty')+'">'+(this.cur[j]||'')+'</div>').join('')+'</div>');}
      else rows.push('<div class="tiles">'+Array.from({length:L},()=>'<div class="tile empty"></div>').join('')+'</div>');
    }
    const ks={};st.g.forEach(g=>{const r=this.score(g);[...g].forEach((c,j)=>{const o=ks[c];if(r[j]==='ok'||(r[j]==='near'&&o!=='ok')||!o)ks[c]=r[j];});});
    const kb='<div class="kb">'+this.KB.map(r=>'<div class="r">'+r.map(c=>'<button class="'+(c.length>1||c==='⌫'||c==='↵'?'w ':'')+(ks[c]||'')+'" onclick="WORD.key(\''+c+'\')">'+(c==='↵'?'إدخال':c==='⌫'?'حذف':c)+'</button>').join('')+'</div>').join('')+'</div>';
    const t=D.byQ[st.t];
    const res=st.done?resultCard({em:st.win?'🎉':'😔',title:t.n,sub:(st.win?'في '+AR(st.g.length)+' محاولات':'الكلمة: '+st.k),daily:this.mode==='daily',game:'word',share:'WORD.share()',again:"WORD.start('free')",againLabel:'كلمة أخرى'}):'';
    screen('كلمة اللاعب','word',modeSeg('WORD',this.mode)+'<div class="stack" style="margin-top:12px"><div class="muted small" style="text-align:center">اسم عائلة لاعب من '+AR(L)+' حروف</div><div class="wgrid">'+rows.join('')+'</div>'+res+(st.done?'':kb)+'</div>');
  },
  key(c){
    const st=this.st;if(st.done)return;const L=st.k.length;
    if(c==='⌫'){this.cur=this.cur.slice(0,-1);}
    else if(c==='↵'){
      if(this.cur.length<L){toast('الكلمة ناقصة');shake($('#wcur'));return;}
      if(!this._valid.has(this.cur)){toast('ليس اسم لاعب في قاعدتنا');shake($('#wcur'));return;}
      st.g.push(this.cur);this.cur='';
      if(st.g[st.g.length-1]===st.k){st.done=true;st.win=true;}else if(st.g.length>=this.MAX)st.done=true;
      if(st.done&&this.mode==='daily')recordResult('word',st.win);
      this.save();
    } else if(this.cur.length<L)this.cur+=c;
    this.draw();
  },
  share(){const st=this.st;share('تحدّي الكورة · كلمة اللاعب #'+DAYNO+'\n'+(st.win?st.g.length:'X')+'/'+this.MAX+'\n'+st.g.map(g=>this.score(g).map(r=>r==='ok'?'🟩':r==='near'?'🟨':'⬛').join('')).join('\n'));}
};
registerGame({id:'word',name:'كلمة اللاعب',desc:'خمّن اسم عائلة اللاعب في ٦ محاولات',color:'linear-gradient(160deg,#22C55E,#15803D)',ic:'أ',obj:WORD,
 help:'<h3>طريقة لعب «كلمة اللاعب»</h3><ol><li>خمّن اسم عائلة لاعب مشهور (حالي أو معتزل) في ٦ محاولات.</li><li>كل تخمين يجب أن يكون اسم عائلة لاعب.</li><li><b style="color:var(--ok)">الأخضر</b> حرف في مكانه، <b style="color:var(--near)">الأصفر</b> حرف موجود في مكان آخر، <b>الرمادي</b> حرف غير موجود.</li></ol><p class="muted small">الهمزات تُكتب ألفًا (أ = ا)، والتاء المربوطة هاءً.</p>'});

/* =================== فطيرة الألوان (Who Ate All the Pies) =================== */
function distKm(a,b){const R=6371,t=x=>x*Math.PI/180;const dl=t(b[0]-a[0]),dn=t(b[1]-a[1]);const h=Math.sin(dl/2)**2+Math.cos(t(a[0]))*Math.cos(t(b[0]))*Math.sin(dn/2)**2;return Math.round(2*R*Math.asin(Math.sqrt(h)));}
function bearingArrow(a,b){const t=x=>x*Math.PI/180;const y=Math.sin(t(b[1]-a[1]))*Math.cos(t(b[0])),x=Math.cos(t(a[0]))*Math.sin(t(b[0]))-Math.sin(t(a[0]))*Math.cos(t(b[0]))*Math.cos(t(b[1]-a[1]));const d=(Math.atan2(y,x)*180/Math.PI+360)%360;return ['⬆️','↗️','➡️','↘️','⬇️','↙️','⬅️','↖️'][Math.round(d/45)%8];}
const PIES={
  MAX:6,
  pool(){if(!this._p)this._p=Object.keys(D.T).filter(q=>{const t=D.T[q];return !t[8]&&t[4]&&t[4].length>=2&&t[5]!=null&&t[2]&&t[10]>=12;}).sort((a,b)=>D.T[b][10]-D.T[a][10]).slice(0,350);return this._p;},
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;const pool=this.pool();
    const t=mode==='daily'?dailyPick(pool,'pies'):pool[Math.floor(Math.random()*pool.length)];
    const fresh=()=>({t,g:[],done:false,win:false});
    this.st=mode==='daily'?dayState('pies',fresh):fresh();if(mode==='daily'&&this.st.t!==t)this.st=Object.assign({day:DAY},fresh());
    this.draw();
  },
  save(){if(this.mode==='daily')saveDay('pies',this.st);},
  pie(cols){const n=cols.length;let a=0;return 'conic-gradient('+cols.map(c=>{const s=a;a+=360/n;return c+' '+s+'deg '+a+'deg';}).join(',')+')';},
  cmp(g,t){
    const G=D.T[g],T=D.T[t],out=[];
    out.push({c:G[1]===T[1]?'ok':((D.C[G[1]]||[])[2]===(D.C[T[1]]||[])[2]?'near':''),v:'<span class="big">'+flag(G[1])+'</span>'+esc(cName(G[1]))});
    out.push({c:G[2]===T[2]?'ok':'',v:'<span class="num">'+fmt(G[2])+(T[2]>G[2]?' ↑':T[2]<G[2]?' ↓':'')+'</span>'});
    out.push({c:G[3]&&G[3]===T[3]?'ok':'',v:'<span class="num">'+(G[3]?AR(Math.round(G[3]/1000))+'ألف':'—')+(T[3]&&G[3]?(T[3]>G[3]?' ↑':T[3]<G[3]?' ↓':''):'')+'</span>'});
    const d=G[5]!=null&&T[5]!=null?distKm([G[5],G[6]],[T[5],T[6]]):null;
    out.push({c:d===0?'ok':'',v:d===0?'📍':(d!=null?bearingArrow([G[5],G[6]],[T[5],T[6]]):'—')});
    out.push({c:d===0?'ok':(d!=null&&d<300?'near':''),v:d!=null?'<span class="num">'+AR(d)+'</span> كم':'—'});
    return out;
  },
  draw(){
    const st=this.st,T=D.T[st.t];
    const rows=st.g.map(g=>'<div class="pgrow pop"><div class="nmc" style="font-weight:800;font-size:.78rem;display:flex;align-items:center">'+esc(tName(g))+'</div>'+this.cmp(g,st.t).map(c=>'<div class="cell '+c.c+'">'+c.v+'</div>').join('')+'</div>').join('');
    const left=this.MAX-st.g.length;
    let top;
    if(st.done)top=resultCard({em:st.win?'🥧':'😔',title:T[0],sub:flag(T[1])+' '+esc(cName(T[1]))+(T[2]?' · تأسس '+AR(T[2]):'')+'<br>'+(st.win?'عرفته في '+AR(st.g.length)+' محاولات':'انتهت المحاولات'),daily:this.mode==='daily',game:'pies',share:'PIES.share()',again:"PIES.start('free')",againLabel:'نادٍ آخر'});
    else top='<div class="card"><div class="tagrow"><b class="disp">أي نادٍ هذه ألوانه؟</b><span class="pill num">'+AR(left)+' محاولات</span></div><div style="margin-top:12px">'+acHTML('pin','اكتب اسم نادٍ…')+'</div></div>';
    screen('فطيرة الألوان','pies',modeSeg('PIES',this.mode)+'<div class="stack" style="margin-top:12px"><div class="card" style="text-align:center"><div class="pie" style="background:'+this.pie(T[4])+'"></div><div class="muted small" style="margin-top:8px">ألوان النادي الرسمية</div></div>'+top+
      (st.g.length?'<div class="card gtab"><div class="pgrow grow h"><div style="text-align:right">النادي</div><div>الدولة</div><div>التأسيس</div><div>الملعب</div><div>الاتجاه</div><div>المسافة</div></div>'+rows+'</div>':'')+'</div>');
    if(!st.done)this.bindClub();
  },
  bindClub(){
    const input=$('#pin'),list=$('#pinL');const pool=this.pool();let items=[];
    input.addEventListener('input',()=>{const x=norm(input.value);items=x.length<2?[]:Object.keys(D.T).filter(q=>{const t=D.T[q];return !t[8]&&t[10]>=3&&(norm(t[0]).includes(x)||norm(t[9]||'').includes(x));}).sort((a,b)=>D.T[b][10]-D.T[a][10]).slice(0,8);list.innerHTML=items.map((q,i)=>'<button type="button" class="ac-it" data-i="'+i+'">'+flag(D.T[q][1])+' '+esc(D.T[q][0])+'</button>').join('');});
    list.addEventListener('mousedown',e=>e.preventDefault());
    list.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)this.guess(items[+b.dataset.i]);});
    input.addEventListener('keydown',e=>{if(e.key==='Enter'&&items[0]){e.preventDefault();this.guess(items[0]);}});
  },
  guess(q){
    const st=this.st;if(st.done||st.g.includes(q))return;
    st.g.push(q);if(q===st.t){st.done=true;st.win=true;}else if(st.g.length>=this.MAX)st.done=true;
    if(st.done&&this.mode==='daily')recordResult('pies',st.win);
    this.save();this.draw();if(!st.done)$('#pin').focus({preventScroll:true});
  },
  share(){const st=this.st;share('تحدّي الكورة · فطيرة الألوان #'+DAYNO+'\n'+(st.win?st.g.length:'X')+'/'+this.MAX+'\n'+st.g.map(g=>this.cmp(g,st.t).map(c=>c.c==='ok'?'🟩':c.c==='near'?'🟨':'⬛').join('')).join('\n'));}
};
registerGame({id:'pies',name:'فطيرة الألوان',desc:'اعرف النادي من ألوانه',color:'conic-gradient(#C8102E 0 33%,#FFFFFF 0 66%,#1D428A 0)',ic:'',obj:PIES,
 help:'<h3>طريقة لعب «فطيرة الألوان»</h3><ol><li>الدائرة تعرض ألوان نادٍ من أي مكان في العالم.</li><li>عندك ٦ محاولات، اكتب اسم نادٍ واختره.</li><li>تظهر مقارنة: الدولة (أخضر = نفسها، أصفر = نفس القارة)، سنة التأسيس، سعة الملعب، الاتجاه نحو النادي المطلوب، والمسافة بالكيلومتر.</li><li>↑ يعني أن الرقم المطلوب أكبر، و↓ أصغر.</li></ol><p class="muted small">الألوان الرسمية للنادي كما في ويكي بيانات، وليست تحليلًا لصورة الشعار.</p>'});

/* =================== اللاعب الأقرب (Contextinho) =================== */
const CTX={
  pool(){if(!this._p)this._p=D.famous.slice(0,3000);return this._p;},
  sim(a,b){
    let s=0;if(a.nat===b.nat)s+=6;else if((D.C[a.nat]||[])[2]===(D.C[b.nat]||[])[2])s+=1.5;
    a.clubs.forEach(c=>{if(b.clubs.has(c))s+=5;});a.leagues.forEach(l=>{if(b.leagues.has(l))s+=1.2;});
    if(a.pos&&a.pos===b.pos)s+=2;if(a.by&&b.by)s+=Math.max(0,3-Math.abs(a.by-b.by)/3);
    a.awards.forEach(x=>{if(b.awards.has(x))s+=1;});
    return s+Math.min(a.fame,b.fame)/400;
  },
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;
    const top=D.famous.slice(0,400);const t=mode==='daily'?dailyPick(top,'ctx'):top[Math.floor(Math.random()*top.length)];
    const fresh=()=>({t:t.q,g:[],done:false});
    this.st=mode==='daily'?dayState('ctx',fresh):fresh();if(mode==='daily'&&this.st.t!==t.q)this.st=Object.assign({day:DAY},fresh());
    const T=D.byQ[this.st.t];
    const ranked=D.P.filter(p=>p!==T).map(p=>[this.sim(T,p),p.q]).sort((a,b)=>b[0]-a[0]);
    this.rank={};this.rank[T.q]=1;ranked.forEach((x,i)=>this.rank[x[1]]=i+2);this.N=ranked.length+1;
    this.draw();
  },
  save(){if(this.mode==='daily')saveDay('ctx',this.st);},
  color(r){return r===1?'var(--ok)':r<=50?'#2EA96A':r<=300?'#D9A514':r<=1500?'#F2994A':'var(--bad)';},
  draw(){
    const st=this.st;const sorted=st.g.slice().sort((a,b)=>this.rank[a]-this.rank[b]);
    const rows=sorted.map(q=>{const r=this.rank[q];const w=Math.max(4,100-Math.log10(r)*25);return '<div style="position:relative;border-radius:10px;background:var(--fill);overflow:hidden;margin-top:6px"><div style="position:absolute;inset:0 auto 0 0;width:'+w+'%;background:'+this.color(r)+';opacity:.35"></div><div class="tagrow" style="position:relative;padding:9px 12px"><b>'+esc(D.byQ[q].n)+'</b><span class="num" style="font-family:var(--f-display);font-weight:800">'+AR(r)+'</span></div></div>';}).join('');
    let top;
    if(st.done)top=resultCard({em:'🎯',title:D.byQ[st.t].n,sub:'وجدته في '+AR(st.g.length)+' محاولة',daily:this.mode==='daily',game:'ctx',share:'CTX.share()',again:"CTX.start('free')",againLabel:'لاعب آخر'});
    else top='<div class="card"><div class="tagrow"><b class="disp">ابحث عن اللاعب السري</b><span class="pill num">'+AR(st.g.length)+' محاولة</span></div><p class="muted small" style="margin:4px 0 10px">كل تخمين يظهر ترتيبه في القرب من اللاعب السري. رقم ١ هو اللاعب نفسه.</p>'+acHTML('xin')+'<div style="text-align:center;margin-top:6px"><button class="btn danger small" onclick="CTX.giveUp()">استسلام</button></div></div>';
    const last=st.g.length&&!st.done?'<div class="card" style="text-align:center"><span class="muted small">آخر تخمين</span><div class="big-num num" style="color:'+this.color(this.rank[st.g[st.g.length-1]])+'">'+AR(this.rank[st.g[st.g.length-1]])+'</div><b>'+esc(D.byQ[st.g[st.g.length-1]].n)+'</b></div>':'';
    screen('اللاعب الأقرب','ctx',modeSeg('CTX',this.mode)+'<div class="stack" style="margin-top:12px">'+top+last+(rows?'<div class="card">'+rows+'</div>':'')+'</div>');
    if(!st.done)bindAC($('#xin'),$('#xinL'),p=>this.guess(p.q),{isUsed:p=>st.g.includes(p.q)});
  },
  guess(q){const st=this.st;st.g.push(q);if(q===st.t){st.done=true;if(this.mode==='daily')recordResult('ctx',true);}this.save();this.draw();if(!st.done)$('#xin').focus({preventScroll:true});},
  giveUp(){confirmSheet('تستسلم؟','سيظهر اللاعب السري.','نعم',()=>{const st=this.st;st.done=true;st.g.push(st.t);if(this.mode==='daily')recordResult('ctx',false);this.save();this.draw();});},
  share(){share('تحدّي الكورة · اللاعب الأقرب #'+DAYNO+'\n🎯 في '+this.st.g.length+' محاولة');}
};
registerGame({id:'ctx',name:'اللاعب الأقرب',desc:'كل تخمين يخبرك كم أنت قريب من اللاعب السري',color:'linear-gradient(160deg,#14B8A6,#0F766E)',ic:'≈',obj:CTX,
 help:'<h3>طريقة لعب «اللاعب الأقرب»</h3><ol><li>ابحث عن اللاعب السري، ومحاولاتك غير محدودة.</li><li>بعد كل تخمين يظهر ترتيبه في القرب من اللاعب السري. اللاعب السري رقمه ١.</li><li>القرب محسوب من: الجنسية، الأندية المشتركة، الدوريات، المركز، العمر، والجوائز.</li><li>مثال: إذا كان السري رونالدينيو وخمّنت ريفالدو فسيكون ترتيبه قريبًا (برازيلي ولعب لبرشلونة).</li></ol>'});
