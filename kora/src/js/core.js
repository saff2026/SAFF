'use strict';
/* =================== أدوات عامة =================== */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const AR=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
/* توحيد الكتابة العربية للمقارنة */
function norm(s){
  return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[ً-ٰٟـ]/g,'')
    .replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ء/g,'')
    .replace(/گ/g,'ك').replace(/پ/g,'ب').replace(/ڤ/g,'ف').replace(/چ/g,'تش').replace(/ژ/g,'ج')
    .replace(/[\s\-_.'’"،,()]/g,'');
}
const noAl=s=>s.startsWith('ال')&&s.length>4?s.slice(2):s;
function same(a,b){const x=norm(a),y=norm(b);return !!x&&(x===y||noAl(x)===noAl(y));}
function letters(s){return [...String(s).replace(/[ً-ٰٟـ]/g,'').replace(/[\s\-_.'’"]/g,'')];}
const store={
  get(k,d){try{const v=localStorage.getItem('kora:'+k);return v?JSON.parse(v):d;}catch(e){return d;}},
  set(k,v){try{localStorage.setItem('kora:'+k,JSON.stringify(v));}catch(e){}}
};
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),2000);}
function shake(el){if(!el)return;el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');}
const fmt=n=>n==null?'—':AR(n);

/* اليوم والبذور */
const START=Date.UTC(2026,0,1);
function todayKey(){const d=new Date();return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());}
const DAY=Math.floor((todayKey()-START)/864e5);
const DAYNO=DAY+1;
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function shuffled(arr,r){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function pickN(arr,n,r){return shuffled(arr,r).slice(0,n);}
/* بذرة لعبة: اليومية ثابتة لكل لعبة ويوم، والحرة عشوائية */
function seedFor(game,mode){return mode==='daily'?hashStr(game+':'+DAY):Math.floor(Math.random()*4e9);}
/* اختيار اليوم من قائمة: يمر على الكل قبل أن يكرر */
function dailyPick(list,salt){const n=list.length,cyc=Math.floor(DAY/n),pos=((DAY%n)+n)%n;return shuffled(list,rng(hashStr(salt)+cyc))[pos];}

async function share(text){
  text+='\n'+(location.href.split('#')[0]);
  try{await navigator.clipboard.writeText(text);toast('تم نسخ النتيجة، الصقها لأصدقائك');}
  catch(e){openSheet('<h3>انسخ نتيجتك</h3><textarea class="field" id="shareTxt" rows="7" readonly style="resize:none">'+esc(text)+'</textarea><p class="muted small">اضغط على النص مطوّلًا ثم اختر «نسخ».</p>');const ta=$('#shareTxt');if(ta){ta.focus();ta.select();}}
}

/* إحصاءات التحدي اليومي لكل لعبة */
function recordResult(game,win,score){
  const s=store.get('stats:'+game,{p:0,w:0,cur:0,best:0,last:-1});
  if(s.last===DAY)return s;
  s.p++; if(win){s.w++;s.cur=(s.last===DAY-1?s.cur:0)+1;s.best=Math.max(s.best,s.cur);}else s.cur=0;
  s.last=DAY; if(score!=null)s.score=score; store.set('stats:'+game,s); return s;
}
function statsHTML(game){
  const s=store.get('stats:'+game,{p:0,w:0,cur:0,best:0});
  return '<div class="stats num"><div><b>'+AR(s.p)+'</b><span>لعبت</span></div><div><b>'+AR(s.p?Math.round(s.w*100/s.p):0)+'٪</b><span>فوز</span></div><div><b>'+AR(s.cur)+'</b><span>سلسلة</span></div><div><b>'+AR(s.best)+'</b><span>أفضل سلسلة</span></div></div>';
}
function dayState(game,fresh){
  let st=store.get('day:'+game,null);
  if(!st||st.day!==DAY){st=Object.assign({day:DAY},fresh());}
  return st;
}
function saveDay(game,st){store.set('day:'+game,st);}
function dailyDone(id){const s=store.get('day:'+id,null);return !!(s&&s.day===DAY&&s.done);}

/* النافذة السفلية */
function openSheet(html,onOpen,opts){
  closeSheet();
  const s=document.createElement('div');s.className='scrim';s.id='scrim';
  s.innerHTML='<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>'+html+((opts&&opts.noClose)?'':'<button class="btn sec block" style="margin-top:14px" data-close>إغلاق</button>')+'</div>';
  s.addEventListener('click',e=>{if((e.target===s&&!(opts&&opts.noClose))||e.target.closest('[data-close]'))closeSheet();});
  document.body.appendChild(s);requestAnimationFrame(()=>s.classList.add('show'));
  if(onOpen)onOpen(s);
}
function closeSheet(){const s=$('#scrim');if(s)s.remove();}
function confirmSheet(title,msg,btn,fn){
  openSheet('<h3>'+esc(title)+'</h3><p class="muted">'+esc(msg)+'</p><button class="btn block" style="background:var(--bad);color:#fff" id="cfOk">'+esc(btn)+'</button>',s=>{$('#cfOk',s).onclick=()=>{closeSheet();fn();};});
}

/* =================== البيانات =================== */
const D={P:[],byQ:{},T:{},C:{},A:{},M:[],W:{},L:[],ready:false};
const ARAB=new Set();
async function loadData(){
  if(D.ready)return;
  const r=await fetch('data/kora.json',{cache:'no-cache'});
  if(!r.ok)throw new Error('data '+r.status);
  const j=await r.json();
  D.v=j.v; D.T=j.T; D.C=j.C; D.A=j.A||{}; D.M=j.M||[]; D.W=j.W||{}; D.L=j.L||[];
  (j.arab||[]).forEach(q=>ARAB.add(q));
  D.P=j.P.map(a=>{
    const p={q:a[0],n:a[1],en:a[2],by:a[3],nat:a[4],pos:a[5],h:a[6],sl:a[7],car:a[8],nt:a[9],aw:a[10]||[],img:a[11],nat2:a[12],mgr:a[13]};
    p.clubs=new Set(p.car.map(c=>c[0]));
    p.leagues=new Set(p.car.map(c=>(D.T[c[0]]||[])[1]).filter(Boolean));
    p.awards=new Set(p.aw.map(x=>x[0]));
    p.arab=ARAB.has(p.nat);
    p.fame=p.sl+(p.arab?45:0);
    p.k=[norm(p.n),norm(p.en)];
    const w=p.n.split(/\s+/); p.last=w.length>1?w.slice(1).join(' '):p.n;
    p.kl=norm(p.last);
    p.mainClub=mainClub(p);
    return p;
  });
  D.P.forEach(p=>D.byQ[p.q]=p);
  D.famous=D.P.slice().sort((a,b)=>b.fame-a.fame);
  D.ready=true;
}
const team=q=>D.T[q]||['؟'];
const tName=q=>team(q)[0];
const cName=q=>(D.C[q]||['؟'])[0];
const flag=q=>(D.C[q]||['',''])[1]||'';
const posName=p=>p.pos||'—';
function mainClub(p){ // النادي الذي لعب له أكثر مباريات
  let best=null,bv=-1;
  for(const c of p.car){const v=(c[3]||0)+(c[5]?0:5);if(v>bv&&!c[5]){bv=v;best=c[0];}}
  return best||(p.car[0]&&p.car[0][0]);
}
function totals(p){let a=0,g=0,known=true;for(const c of p.car){if(c[3]==null)known=false;a+=c[3]||0;g+=c[4]||0;}return {apps:known?a:null,goals:known?g:null};}
function age(p){return p.by?(new Date().getFullYear()-p.by):null;}

/* بحث اللاعبين */
function findPlayers(q,limit=8,filter){
  const x=norm(q); if(x.length<2)return [];
  const out=[];
  for(const p of D.P){
    if(filter&&!filter(p))continue;
    let s=-1;
    for(const k of p.k){if(!k)continue; if(k===x)s=Math.max(s,4); else if(k.startsWith(x))s=Math.max(s,3); else if(k.includes(x))s=Math.max(s,1);}
    if(p.kl===x)s=Math.max(s,4); else if(p.kl.startsWith(x))s=Math.max(s,2.5);
    if(s>=0)out.push([s+Math.min(p.fame,300)/300,p]);
  }
  return out.sort((a,b)=>b[0]-a[0]).slice(0,limit).map(a=>a[1]);
}
function playerLine(p){return flag(p.nat)+' '+esc(p.n)+'<small>'+esc(tName(p.mainClub))+(p.by?' · '+AR(p.by):'')+'</small>';}

/* حقل البحث التلقائي */
function bindAC(input,list,onPick,opts){
  opts=opts||{};let items=[],hl=0;
  const paint=()=>{list.innerHTML=items.map((p,i)=>'<button type="button" class="ac-it'+(i===hl?' hl':'')+(opts.isUsed&&opts.isUsed(p)?' used':'')+'" data-i="'+i+'">'+playerLine(p)+'</button>').join('');};
  input.addEventListener('input',()=>{items=findPlayers(input.value,8,opts.filter);hl=0;paint();});
  input.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){hl=Math.min(hl+1,items.length-1);paint();e.preventDefault();}
    else if(e.key==='ArrowUp'){hl=Math.max(hl-1,0);paint();e.preventDefault();}
    else if(e.key==='Enter'){e.preventDefault();if(items[hl])choose(items[hl]);}
  });
  list.addEventListener('mousedown',e=>e.preventDefault());
  list.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)choose(items[+b.dataset.i]);});
  function choose(p){if(opts.isUsed&&opts.isUsed(p)){toast('استخدمت هذا اللاعب من قبل');return;}input.value='';items=[];paint();onPick(p);}
}
function acHTML(id,ph){return '<div class="ac"><input class="field" id="'+id+'" placeholder="'+esc(ph||'اكتب اسم لاعب…')+'" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"><div class="ac-list" id="'+id+'L"></div></div>';}
function pickPlayerSheet(title,sub,onPick,opts){
  openSheet('<h3>'+title+'</h3>'+(sub?'<p class="muted small" style="margin:0 0 10px">'+sub+'</p>':'')+acHTML('pk'),s=>{
    const i=$('#pk',s);bindAC(i,$('#pkL',s),p=>{closeSheet();onPick(p);},opts);setTimeout(()=>i.focus(),60);
  });
}

/* =================== الفئات (أندية، دول، دوريات، جوائز) =================== */
function catTest(c){
  switch(c.k){
    case 'club':return p=>p.clubs.has(c.v);
    case 'nat':return p=>p.nat===c.v||p.nat2===c.v;
    case 'lg':return p=>p.leagues.has(c.v)&&p.nat!==c.v;
    case 'aw':return p=>p.awards.has(c.v);
    case 'cont':return p=>(D.C[p.nat]||[])[2]===c.v;
    case 'pos':return p=>p.pos===c.v;
  }
  return ()=>false;
}
function catLabel(c){
  switch(c.k){
    case 'club':return tName(c.v);
    case 'nat':return cName(c.v);
    case 'lg':return 'لعب في '+cName(c.v);
    case 'aw':return D.A[c.v]||'جائزة';
    case 'cont':return 'من '+c.v;
    case 'pos':return c.v;
  }
}
function catIcon(c){
  if(c.k==='nat')return '<span class="em" style="background:transparent;font-size:1.5rem">'+flag(c.v)+'</span>';
  if(c.k==='lg')return '<span class="em" style="background:var(--fill2);font-size:1.1rem">'+flag(c.v)+'</span>';
  if(c.k==='aw')return '<span class="em" style="background:#C9A24A">🏆</span>';
  const t=team(c.v),col=(t[4]&&t[4][0])||'#10654F';
  return '<span class="em" style="background:'+col+';color:'+(isLight(col)?'#111':'#fff')+'">'+esc((t[0]||'').replace(/^(نادي|ال)/,'').trim().charAt(0))+'</span>';
}
function catHead(c){return catIcon(c)+esc(catLabel(c));}
function isLight(hex){const h=hex.replace('#','');if(h.length<6)return false;const r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);return (r*299+g*587+b*114)/1000>165;}
/* مجموعة الفئات المتاحة: الأندية الأكثر لاعبين، الدول، الدوريات، الجوائز */
let _cats=null;
function allCats(){
  if(_cats)return _cats;
  const club={},nat={},lg={},aw={};
  for(const p of D.P){
    if(p.fame<35)continue;
    p.clubs.forEach(c=>club[c]=(club[c]||0)+1);
    nat[p.nat]=(nat[p.nat]||0)+1;
    p.leagues.forEach(l=>{if(l!==p.nat)lg[l]=(lg[l]||0)+1;});
    p.awards.forEach(a=>{if(D.A[a])aw[a]=(aw[a]||0)+1;});
  }
  const mk=(o,k,min)=>Object.keys(o).filter(x=>o[x]>=min&&(k!=='club'||D.T[x])).map(v=>({k,v,n:o[v]}));
  // الفئات العامة: أندية ودوريات ومنتخبات يعرفها الجمهور العربي
  const POP=new Set(['England','Spain','Italy','Germany','France','Portugal','Netherlands','Turkey','Saudi Arabia','Egypt','Morocco','Tunisia','Algeria','Qatar','United Arab Emirates','Brazil','Argentina','Scotland','United States']);
  const popC=q=>POP.has((D.C[q]||[])[5]);
  const clubAll=mk(club,'club',25);
  _cats={clubAll,club:clubAll.filter(c=>popC((D.T[c.v]||[])[1])).sort((a,b)=>b.n-a.n).slice(0,48),nat:mk(nat,'nat',40).filter(c=>(D.C[c.v]||[])[5]!=='Japan'),lg:mk(lg,'lg',40).filter(c=>popC(c.v)&&!['Egypt','Morocco','Tunisia','Algeria','Argentina','Brazil','Scotland'].includes((D.C[c.v]||[])[5])),aw:mk(aw,'aw',6)};
  _cats.all=[].concat(_cats.club,_cats.nat,_cats.lg,_cats.aw);
  return _cats;
}
function catKey(c){return c.k+':'+c.v;}
function playersFor(cats,minFame){const ts=cats.map(catTest);return D.P.filter(p=>p.fame>=(minFame||0)&&ts.every(t=>t(p)));}
/* مطابقة لاعب مختلف لكل خانة */
function matchCells(sets,taken){
  const own={};const res=new Array(sets.length).fill(null);const tk=new Set(taken||[]);
  function tryCell(i,seen){for(const pid of sets[i]){if(tk.has(pid)||seen.has(pid))continue;seen.add(pid);if(own[pid]===undefined||tryCell(own[pid],seen)){own[pid]=i;res[i]=pid;return true;}}return false;}
  for(let i=0;i<sets.length;i++){if(sets[i]===null)continue;if(!tryCell(i,new Set()))return null;}
  return res;
}
/* شبكة صفوف × أعمدة قابلة للحل */
function buildGrid(r,rowsN,colsN,opt){
  opt=opt||{};const C=allCats();const minAns=opt.minAns||2,minFame=opt.minFame||40;
  const poolR=C.club,poolC=[].concat(C.club,C.nat,C.aw,C.lg);
  for(let t=0;t<6000;t++){
    const rows=pickN(poolR,rowsN,r);
    const avail=poolC.filter(c=>!rows.some(x=>catKey(x)===catKey(c)));
    const cols=pickN(avail,colsN,r);
    if(cols.filter(c=>c.k!=='club').length>2)continue;
    const sets=[];let ok=true;
    for(const a of rows){for(const b of cols){const s=playersFor([a,b],minFame).map(p=>p.q);if(s.length<minAns){ok=false;break;}sets.push(s);}if(!ok)break;}
    if(!ok)continue;
    if(!matchCells(sets))continue;
    return {rows,cols,sets};
  }
  return null;
}
function gridSets(g){const s=[];for(const a of g.rows)for(const b of g.cols)s.push(D.P.filter(p=>catTest(a)(p)&&catTest(b)(p)).map(p=>p.q));return s;}

/* =================== واجهة مشتركة =================== */
const GAMES=[];const HELP={};
function registerGame(g){GAMES.push(g);HELP[g.id]=g.help;}
function navHTML(title,id){
  return '<div class="nav"><div class="in"><button class="nbtn" onclick="go(\'home\')" aria-label="رجوع"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>الألعاب</button><div class="t">'+esc(title)+'</div><div class="nbtn end"><button class="ibtn" aria-label="طريقة اللعب" onclick="openSheet(HELP[\''+id+'\'])">؟</button></div></div></div>';
}
function modeSeg(obj,mode,labels){
  labels=labels||['تحدّي اليوم #'+AR(DAYNO),'لعب حر'];
  return '<div class="seg" role="tablist"><button class="'+(mode==='daily'?'on':'')+'" onclick="'+obj+'.start(\'daily\')">'+labels[0]+'</button><button class="'+(mode==='free'?'on':'')+'" onclick="'+obj+'.start(\'free\')">'+labels[1]+'</button></div>';
}
function livesHTML(n,max,big){return '<div class="lives">'+Array.from({length:max},(_,i)=>'<i class="'+(i<n?'':'off')+'"'+(big?' style="width:12px;height:12px"':'')+'></i>').join('')+'</div>';}
function resultCard(o){
  return '<div class="card result pop"><div class="em">'+o.em+'</div><h3>'+esc(o.title)+'</h3>'+(o.sub?'<p>'+o.sub+'</p>':'')+(o.daily?statsHTML(o.game):'')+
    '<div class="btns">'+(o.daily&&o.share?'<button class="btn" onclick="'+o.share+'">مشاركة النتيجة</button>':'')+(o.again?'<button class="btn sec" onclick="'+o.again+'">'+esc(o.againLabel||'جولة جديدة')+'</button>':'')+'</div></div>';
}
function screen(title,id,body){$('#app').innerHTML=navHTML(title,id)+body;}
function fmtYears(s,e){if(!s)return '';return AR(s)+(e===s?'':'–'+(e?AR(e):''));}

/* =================== التوجيه =================== */
function go(h){if(location.hash.slice(1)!==h)location.hash=h;else render();}
window.addEventListener('hashchange',render);
let CUR=null;
async function render(){
  closeSheet();
  if(CUR&&CUR.stop)try{CUR.stop();}catch(e){}
  CUR=null;
  const h=location.hash.slice(1);
  const g=GAMES.find(x=>x.id===h);
  window.scrollTo(0,0);
  if(!D.ready){
    $('#app').innerHTML='<div class="loading"><div class="spin"></div>جارِ تحميل بيانات اللاعبين…</div>';
    try{await loadData();}catch(e){$('#app').innerHTML='<div class="loading">تعذّر تحميل البيانات. تأكد من اتصالك ثم أعد تحميل الصفحة.</div>';return;}
  }
  if(!g)return renderHome();
  CUR=g.obj; g.obj.start();
}
function renderHome(){
  const d=new Date();
  const dateTxt=d.toLocaleDateString('ar-SA-u-ca-gregory-nu-arab',{weekday:'long',day:'numeric',month:'long'});
  const row=g=>{const done=dailyDone(g.id);return '<button class="row" onclick="go(\''+g.id+'\')"><span class="app-ic" style="background:'+g.color+'">'+g.ic+'</span><span class="tx"><b>'+g.name+'</b><span>'+g.desc+'</span></span>'+(g.multi?'':'<span class="st '+(done?'done':'')+'">'+(done?'✓ لُعبت':'اليوم')+'</span>')+'<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg></button>';};
  const groups=[['ألغاز يومية',GAMES.filter(g=>!g.multi&&g.group!=='more')],['مع أصدقائك على نفس الجهاز',GAMES.filter(g=>g.multi)],['ألعاب أخرى',GAMES.filter(g=>g.group==='more')]];
  const f=GAMES.find(g=>g.id==='m11');
  $('#app').innerHTML=
   '<header class="hero"><div class="date">'+esc(dateTxt)+' · التحدي رقم '+AR(DAYNO)+'</div><h1>تحدّي الكورة</h1><p>'+AR(GAMES.length)+' لعبة كرة قدم بالعربي، تتجدد ألغازها كل يوم عند منتصف الليل.</p></header>'+
   (f?'<div class="grp-t">لعبة اليوم المميزة</div><button class="feature" onclick="go(\'m11\')"><div class="mini">'+(f.obj.miniDots?f.obj.miniDots():'')+'</div><div class="k">الناقص 11 · '+(dailyDone('m11')?'✓ لُعبت اليوم':'جديد اليوم')+'</div><h2>'+esc(f.obj.featureTitle?f.obj.featureTitle():'التشكيلة الناقصة')+'</h2><p>'+esc(f.obj.featureSub?f.obj.featureSub():'')+'</p><span class="go">ابدأ ←</span></button>':'')+
   groups.filter(x=>x[1].length).map(x=>'<div class="grp-t">'+x[0]+'</div><div class="list">'+x[1].map(row).join('')+'</div>').join('')+
   '<div class="foot">البيانات من ويكي بيانات (Wikidata) وويكيبيديا، آخر تحديث '+esc(D.v||'')+'.<br>'+AR(D.P.length)+' لاعبًا و'+AR(Object.keys(D.T).length)+' ناديًا ومنتخبًا. نتائجك محفوظة على جهازك فقط.</div>';
}
