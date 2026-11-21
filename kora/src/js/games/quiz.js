/* =================== المعرفة الكروية (General Ball Knowledge) =================== */
const QUIZ={
  TOPICS:null,
  topics(){
    if(this.TOPICS)return this.TOPICS;
    const C=allCats();
    const clubs=C.club.slice().sort((a,b)=>b.n-a.n).slice(0,14).map(c=>({k:'club',v:c.v,n:tName(c.v)}));
    const nats=C.nat.slice().sort((a,b)=>b.n-a.n).slice(0,10).map(c=>({k:'nat',v:c.v,n:cName(c.v)}));
    const arab=Object.keys(D.C).filter(q=>ARAB.has(q)&&C.nat.some(c=>c.v===q)).map(q=>({k:'nat',v:q,n:cName(q)}));
    const seen=new Set();return this.TOPICS=[{k:'all',n:'عام'}].concat(arab,clubs,nats).filter(t=>{const k=t.k+t.v;if(seen.has(k))return false;seen.add(k);return true;});
  },
  subjects(topic){
    if(!topic||topic.k==='all')return D.famous;
    const t=catTest(topic);return D.famous.filter(t);
  },
  gen(r,i,topic){
    const S=this.subjects(topic);const span=[60,60,150,150,300,300,600,600,1200,1200][i];
    const pool=S.slice(Math.floor(span/6),span).length>=8?S.slice(0,span):S;
    const pick=()=>pool[Math.floor(r()*pool.length)];
    const opts=(right,wrongs)=>{const w=[...new Set(wrongs.filter(x=>x!==right))];if(w.length<3)return null;return {o:shuffled([right].concat(pickN(w,3,r)),r),a:right};};
    for(let t=0;t<200;t++){
      const kind=Math.floor(r()*8),p=pick();if(!p)continue;let q=null,o=null;
      if(kind===0){q='ما جنسية '+p.n+'؟';o=opts(cName(p.nat),Object.keys(D.C).filter(c=>(D.C[c][2]===(D.C[p.nat]||[])[2])&&c!==p.nat).map(cName));}
      else if(kind===1){const mine=[...p.clubs];const c=mine[Math.floor(r()*mine.length)];q='أي نادٍ من هذه لعب له '+p.n+'؟';o=opts(tName(c),allCats().club.filter(x=>!p.clubs.has(x.v)&&(D.T[x.v]||[])[1]===(D.T[c]||[])[1]).map(x=>tName(x.v)).concat(allCats().club.filter(x=>!p.clubs.has(x.v)).slice(0,30).map(x=>tName(x.v))));}
      else if(kind===2&&p.by){q='في أي سنة وُلد '+p.n+'؟';o=opts(AR(p.by),[-3,-2,-1,1,2,3].map(d=>AR(p.by+d)));}
      else if(kind===3&&p.nt&&p.nt[1]>=10){q='كم مباراة دولية لعب '+p.n+' مع المنتخب الأول (حسب آخر تحديث)؟';const v=p.nt[1];o=opts(AR(v),[Math.round(v*0.6),Math.round(v*0.8),Math.round(v*1.25),Math.round(v*1.5)].map(AR));}
      else if(kind===4&&p.car.length>=2){q='ما أول نادٍ لعب له '+p.n+' في مسيرته الاحترافية؟';const first=p.car[0][0];o=opts(tName(first),p.car.slice(1).map(c=>tName(c[0])).concat(allCats().club.slice(0,40).map(x=>tName(x.v))));}
      else if(kind===5){const club=p.mainClub,T=D.T[club];if(!T||!T[2])continue;q='في أي سنة تأسس '+T[0]+'؟';o=opts(AR(T[2]),[-12,-6,-3,3,7,11].map(d=>AR(T[2]+d)));}
      else if(kind===6){const club=p.mainClub;const ins=D.famous.slice(0,span*2).filter(x=>x.clubs.has(club)&&x!==p);const outs=D.famous.slice(0,span*2).filter(x=>!x.clubs.has(club)&&x.nat===p.nat);if(ins.length<3||!outs.length)continue;const odd=outs[Math.floor(r()*Math.min(outs.length,30))];q='أي لاعب من هؤلاء لم يلعب لـ'+tName(club)+'؟';o={o:shuffled([odd.n].concat(pickN(ins,3,r).map(x=>x.n)),r),a:odd.n};}
      else if(kind===7){const W=Object.values(D.W).filter(w=>w.w.length>=10);if(!W.length)continue;const comp=W[Math.floor(r()*W.length)];const e=comp.w[Math.floor(r()*comp.w.length)];if(!e[1]||!D.T[e[0]])continue;q='من فاز بـ'+comp.n+' في نسخة '+AR(e[1])+'؟';o=opts(tName(e[0]),comp.w.filter(x=>x[0]!==e[0]&&D.T[x[0]]).map(x=>tName(x[0])));}
      if(q&&o&&o.o.length===4)return {q,o:o.o,a:o.a};
    }
    return null;
  },
  start(mode,topicIdx){
    mode=mode||this.mode||'daily';this.mode=mode;if(topicIdx!==undefined)this.ti=topicIdx;const ti=this.ti||0;
    const topic=this.topics()[ti];
    const r=rng(seedFor('quiz-'+ti,mode));const qs=[];
    for(let i=0;i<10;i++){const q=this.gen(r,i,topic);if(q)qs.push(q);}
    const key='quiz-'+ti;
    const fresh=()=>({qs,i:0,ans:[],done:false});
    this.st=mode==='daily'?(()=>{let s=store.get('day:'+key,null);if(!s||s.day!==DAY)s=Object.assign({day:DAY},fresh());return s;})():fresh();
    this.key=key;this.draw();
  },
  save(){if(this.mode==='daily'){store.set('day:'+this.key,this.st);if(this.st.done)store.set('day:quiz',{day:DAY,done:true});}},
  draw(){
    const st=this.st,score=st.ans.filter(Boolean).length;
    const topics='<div class="chips" style="margin:10px 0;flex-wrap:nowrap;overflow-x:auto">'+this.topics().map((t,i)=>'<button class="chip '+(i===(this.ti||0)?'on':'')+'" style="flex:none" onclick="QUIZ.start(QUIZ.mode,'+i+')">'+esc(t.n)+'</button>').join('')+'</div>';
    let body;
    if(st.done)body=resultCard({em:score>=8?'🧠':score>=5?'👏':'📚',title:AR(score)+' / '+AR(st.qs.length),sub:score>=8?'معرفة كروية ممتازة!':'جرّب موضوعًا آخر',daily:this.mode==='daily',game:'quiz',share:'QUIZ.share()',again:"QUIZ.start('free')",againLabel:'أسئلة جديدة'});
    else{
      const q=st.qs[st.i],a=st.picked;
      body='<div class="card"><div class="tagrow"><span class="pill a num">السؤال '+AR(st.i+1)+' / '+AR(st.qs.length)+'</span><span class="muted small">'+(st.i<3?'سهل':st.i<6?'متوسط':st.i<8?'صعب':'صعب جدًا')+'</span></div><h3 style="font-size:1.1rem;font-weight:800;margin:12px 0">'+esc(q.q)+'</h3>'+
        q.o.map((o,k)=>'<button class="opt '+(a!=null?(o===q.a?'ok':(k===a?'bad':'')):'')+'" '+(a!=null?'disabled':'')+' onclick="QUIZ.pick('+k+')">'+esc(o)+'</button>').join('')+
        (a!=null?'<button class="btn block" style="margin-top:12px" onclick="QUIZ.next()">'+(st.i+1<st.qs.length?'التالي':'النتيجة')+'</button>':'')+'</div>'+
        '<div class="tagrow">'+st.qs.map((x,k)=>'<i style="flex:1;height:6px;border-radius:3px;background:'+(k<st.ans.length?(st.ans[k]?'var(--ok)':'var(--bad)'):'var(--fill2)')+'"></i>').join('')+'</div>';
    }
    screen('المعرفة الكروية','quiz',modeSeg('QUIZ',this.mode)+topics+'<div class="stack">'+body+'</div>');
  },
  pick(k){const st=this.st;if(st.picked!=null)return;st.picked=k;const q=st.qs[st.i];st.ans.push(q.o[k]===q.a);this.save();this.draw();},
  next(){const st=this.st;st.picked=null;st.i++;if(st.i>=st.qs.length){st.done=true;if(this.mode==='daily')recordResult('quiz',st.ans.filter(Boolean).length>=7);}this.save();this.draw();},
  share(){const st=this.st;share('تحدّي الكورة · المعرفة الكروية #'+DAYNO+' ('+this.topics()[this.ti||0].n+')\n'+st.ans.filter(Boolean).length+'/'+st.qs.length+' '+st.ans.map(x=>x?'🟩':'🟥').join(''));}
};
registerGame({id:'quiz',name:'المعرفة الكروية',desc:'١٠ أسئلة تصعب تدريجيًا، اختر موضوعك',color:'linear-gradient(160deg,#8B5CF6,#5B21B6)',ic:'🧠',obj:QUIZ,
 help:'<h3>طريقة لعب «المعرفة الكروية»</h3><ol><li>١٠ أسئلة اختيار من متعدد، تبدأ سهلة وتصعب تدريجيًا.</li><li>اختر موضوعًا: عام، أو منتخب، أو نادٍ.</li><li>الأسئلة مولّدة من بيانات اللاعبين والأندية والبطولات.</li></ol>'});

/* =================== التشكيلة الحلم (SuperDraft) =================== */
const DRAFT={
  F:[['GK','حارس',50,88,'حارس'],['RB','ظهير أيمن',85,68,'دفاع'],['CB','قلب دفاع',62,72,'دفاع'],['CB','قلب دفاع',38,72,'دفاع'],['LB','ظهير أيسر',15,68,'دفاع'],['CM','وسط',72,46,'وسط'],['CM','وسط',50,50,'وسط'],['CM','وسط',28,46,'وسط'],['RW','جناح أيمن',82,20,'هجوم'],['ST','مهاجم',50,15,'هجوم'],['LW','جناح أيسر',18,20,'هجوم']],
  LINKS:[[0,2],[0,3],[1,2],[2,3],[3,4],[1,5],[2,6],[3,6],[4,7],[5,6],[6,7],[5,8],[6,9],[7,10],[8,9],[9,10]],
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;
    const r=rng(seedFor('draft',mode));
    const byPos={};D.famous.slice(0,1500).forEach(p=>{if(p.pos)(byPos[p.pos]=byPos[p.pos]||[]).push(p.q);});
    const offers=this.F.map(f=>pickN(byPos[f[4]],4,r));
    const fresh=()=>({offers,team:new Array(11).fill(null),done:false});
    this.st=mode==='daily'?dayState('draft',fresh):fresh();this.draw();
  },
  save(){if(this.mode==='daily')saveDay('draft',this.st);},
  rating(p){return Math.round(Math.min(99,55+Math.log2(1+p.fame)*5));},
  chem(){
    const t=this.st.team;let c=0;const det=[];
    for(const [a,b] of this.LINKS){const A=D.byQ[t[a]],B=D.byQ[t[b]];if(!A||!B)continue;let v=0;
      if([...A.clubs].some(x=>B.clubs.has(x)))v+=2;if(A.nat===B.nat)v+=1;if([...A.leagues].some(x=>B.leagues.has(x)))v+=1;c+=Math.min(3,v);det.push(v);}
    return c;
  },
  draw(){
    const st=this.st;const slot=st.team.findIndex(x=>!x);
    const toks=this.F.map((f,i)=>{const p=D.byQ[st.team[i]];return '<button class="tok '+(p?'ok':'')+(i===slot&&!st.done?' sel':'')+'" style="left:'+f[2]+'%;top:'+f[3]+'%" onclick="DRAFT.focus('+i+')"><span class="sh num">'+(p?AR(this.rating(p)):'+')+'</span><span class="nm">'+(p?esc(p.n.split(/\s+/).slice(-1)[0]):esc(f[1]))+'</span></button>';}).join('');
    const lines=this.LINKS.map(([a,b])=>{const A=D.byQ[st.team[a]],B=D.byQ[st.team[b]];if(!A||!B)return '';let v=0;if([...A.clubs].some(x=>B.clubs.has(x)))v+=2;if(A.nat===B.nat)v+=1;if([...A.leagues].some(x=>B.leagues.has(x)))v+=1;const col=v>=3?'#2EB866':v>=1?'#E3B523':'#D93A3A';const fa=this.F[a],fb=this.F[b];return '<line x1="'+fa[2]+'" y1="'+fa[3]+'" x2="'+fb[2]+'" y2="'+fb[3]+'" stroke="'+col+'" stroke-width="0.8" stroke-linecap="round"/>';}).join('');
    const filled=st.team.filter(Boolean).map(q=>D.byQ[q]);const avg=filled.length?Math.round(filled.reduce((a,p)=>a+this.rating(p),0)/filled.length):0;const chem=this.chem();
    let panel;
    if(slot<0||st.done){if(!st.done){st.done=true;if(this.mode==='daily')recordResult('draft',true,avg+chem);this.save();}panel=resultCard({em:'📋',title:'تقييم فريقك: '+AR(avg+chem),sub:'متوسط اللاعبين '+AR(avg)+' + الانسجام '+AR(chem)+' من '+AR(this.LINKS.length*3),daily:this.mode==='daily',game:'draft',share:'DRAFT.share()',again:"DRAFT.start('free')",againLabel:'مسودة جديدة'});}
    else{const f=this.F[slot];panel='<div class="card"><div class="tagrow"><b class="disp">اختر '+esc(f[1])+'</b><span class="pill num">'+AR(st.team.filter(Boolean).length)+' / ١١</span></div>'+st.offers[slot].map(q=>{const p=D.byQ[q];return '<button class="opt" onclick="DRAFT.choose('+slot+',\''+q+'\')"><span class="tagrow"><span>'+flag(p.nat)+' '+esc(p.n)+'<br><span class="muted small">'+esc(tName(p.mainClub))+'</span></span><b class="num" style="font-family:var(--f-display);font-size:1.2rem">'+AR(this.rating(p))+'</b></span></button>';}).join('')+'</div>';}
    screen('التشكيلة الحلم','draft',modeSeg('DRAFT',this.mode)+'<div class="stack" style="margin-top:12px"><div class="tagrow"><span class="pill a num">التقييم '+AR(avg)+'</span><span class="pill g num">الانسجام '+AR(chem)+'</span></div><div class="pitch"><div class="ln mid"></div><div class="ln circ"></div><div class="ln box"></div><div class="ln six"></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">'+lines+'</svg>'+toks+'</div>'+panel+'</div>');
  },
  focus(i){},
  choose(i,q){this.st.team[i]=q;this.save();this.draw();},
  share(){const f=this.st.team.map(q=>D.byQ[q]);const avg=Math.round(f.reduce((a,p)=>a+this.rating(p),0)/11);share('تحدّي الكورة · التشكيلة الحلم #'+DAYNO+'\n📋 '+(avg+this.chem())+' (تقييم '+avg+' + انسجام '+this.chem()+')');}
};
registerGame({id:'draft',name:'التشكيلة الحلم',desc:'اختر ١١ لاعبًا وابنِ أكثر فريق انسجامًا',color:'linear-gradient(160deg,#0F4636,#06231B)',ic:'📋',obj:DRAFT,group:'more',
 help:'<h3>طريقة لعب «التشكيلة الحلم»</h3><ol><li>لكل مركز في خطة ٤-٣-٣ يُعرض عليك ٤ لاعبين، اختر واحدًا.</li><li>تقييم اللاعب محسوب من شهرته.</li><li><b>الانسجام</b> بين كل لاعبين متجاورين: نادٍ مشترك +٢، نفس الجنسية +١، نفس الدوري +١ (بحد أقصى ٣ لكل رابط).</li><li>الخطوط الخضراء انسجام قوي، والصفراء متوسط، والحمراء ضعيف.</li><li>النتيجة = متوسط التقييم + الانسجام.</li></ol>'});
