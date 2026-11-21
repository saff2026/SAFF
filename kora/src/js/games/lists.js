/* =================== كم تعرف؟ (Futbol List A) =================== */
const LISTA={
  SECS:100,
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;
    const seed=seedFor('lista',mode);
    const q=makeQuestion(rng(seed),{min:25,max:500,famousTop:10,topFame:60});
    this.q=q;
    this.st=mode==='daily'?dayState('lista',()=>({found:[],end:null,done:false})):{found:[],end:null,done:false};
    if(mode==='daily'&&this.st.qt&&this.st.qt!==q.t)this.st={day:DAY,found:[],end:null,done:false};
    this.st.qt=q.t;this.set=new Set(q.ans.map(p=>p.q));this.draw();
  },
  stop(){clearInterval(this._iv);},
  save(){if(this.mode==='daily')saveDay('lista',this.st);},
  left(){return this.st.end?Math.max(0,Math.ceil((this.st.end-Date.now())/1000)):this.SECS;},
  kick(){this.st.end=Date.now()+this.SECS*1000;this.save();this.draw();this.loop();},
  loop(){clearInterval(this._iv);this._iv=setInterval(()=>{const l=this.left();const e=$('#lt');if(e)e.textContent=AR(l);const b=$('#lbar');if(b){b.style.width=Math.min(100,l)+'%';b.parentNode.classList.toggle('warn',l<=10);}if(l<=0){clearInterval(this._iv);this.finish();}},250);},
  finish(){const st=this.st;if(st.done)return;st.done=true;if(this.mode==='daily')recordResult('lista',st.found.length>=10,st.found.length);this.save();this.draw();},
  draw(){
    const st=this.st,q=this.q;
    let body;
    if(!st.end&&!st.done){
      body='<div class="card result"><div class="em">⏱️</div><h3>كم إجابة تعرف؟</h3><p>عند الضغط على «ابدأ» يظهر السؤال ويبدأ عدّاد ١٠٠ ثانية. كل إجابة صحيحة تضيف ٥ ثوانٍ، ولا عقوبة على الخطأ.</p><button class="btn block" onclick="LISTA.kick()">ابدأ</button></div>';
    } else if(st.done){
      const miss=q.ans.filter(p=>!st.found.includes(p.q)).slice(0,12);
      body='<div class="card"><h2 style="font-size:1.1rem;font-weight:800">'+esc(q.t)+'</h2></div>'+resultCard({em:'⚽',title:'وجدت '+AR(st.found.length)+' إجابة',sub:'من أصل '+AR(q.ans.length)+' لاعبًا في قاعدة البيانات',daily:this.mode==='daily',game:'lista',share:'LISTA.share()',again:"LISTA.start('free')",againLabel:'سؤال آخر'})+
        '<div class="card"><div class="muted small" style="margin-bottom:6px">أشهر من فاتك:</div><div class="chips">'+miss.map(p=>'<span class="pill">'+esc(p.n)+'</span>').join('')+'</div></div>';
    } else {
      const l=this.left();
      body='<div class="card"><h2 style="font-size:1.1rem;font-weight:800">'+esc(q.t)+'</h2><div class="tagrow" style="margin-top:8px"><span class="big-num num" id="lt">'+AR(l)+'</span><span class="pill a num">'+AR(st.found.length)+' إجابة</span></div><div class="timer" style="margin-top:8px"><i id="lbar" style="width:'+Math.min(100,l)+'%"></i></div><div style="margin-top:12px">'+answerBox('lain')+'</div></div>'+
        '<div class="card"><div class="chips">'+st.found.slice().reverse().map(x=>'<span class="pill a">'+esc(D.byQ[x].n)+'</span>').join('')+'</div></div>';
    }
    screen('كم تعرف؟','lista',modeSeg('LISTA',this.mode)+'<div class="stack" style="margin-top:12px">'+body+'</div>');
    if(st.end&&!st.done){bindAC($('#lain'),$('#lainL'),p=>this.guess(p),{isUsed:p=>st.found.includes(p.q)});$('#lain').focus();this.loop();}
  },
  guess(p){
    const st=this.st;if(st.done)return;
    if(this.set.has(p.q)){st.found.push(p.q);st.end+=5000;toast('✓ '+p.n+' +٥ ثوانٍ');this.save();this.draw();}
    else toast('✗ '+p.n+' لا يحقق الشرط');
  },
  share(){share('تحدّي الكورة · كم تعرف؟ #'+DAYNO+'\n'+this.q.t+'\n⚽ '+this.st.found.length+' إجابة');}
};
registerGame({id:'lista',name:'كم تعرف؟',desc:'أكبر عدد من الإجابات في ١٠٠ ثانية',color:'linear-gradient(160deg,#0EA5A4,#0B6E6D)',ic:'⏱',obj:LISTA,
 help:'<h3>طريقة لعب «كم تعرف؟»</h3><ol><li>اضغط «ابدأ» ليظهر السؤال ويبدأ عدّاد ١٠٠ ثانية.</li><li>اذكر أكبر عدد ممكن من اللاعبين الذين يحققون السؤال.</li><li>كل إجابة صحيحة تضيف ٥ ثوانٍ، ولا عقوبة على الخطأ.</li></ol>'});

/* =================== المفضّلة الجماهيرية (Fan Favourites) =================== */
/* بدل استطلاع ١٠٠ مشجع نستخدم شهرة اللاعب (عدد لغات ويكيبيديا التي كُتبت عنه) لتقدير نسبة من سيذكره */
function popShares(ans,N){
  const top=ans.slice(0,N),w=top.map(p=>Math.pow(p.fame,2)),s=w.reduce((a,b)=>a+b,0);
  let sh=w.map(x=>Math.max(1,Math.round(x*100/s)));
  const diff=100-sh.reduce((a,b)=>a+b,0);sh[0]+=diff;
  return top.map((p,i)=>({q:p.q,s:sh[i]}));
}
const FANS={
  N:8,
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;
    const q=makeQuestion(rng(seedFor('fans',mode)),{min:12,max:300,famousTop:4,topFame:80});
    this.q=q;this.board=popShares(q.ans,this.N);
    this.st=mode==='daily'?dayState('fans',()=>({f:[],w:[],done:false})):{f:[],w:[],done:false};
    this.draw();
  },
  save(){if(this.mode==='daily')saveDay('fans',this.st);},
  draw(){
    const st=this.st,left=3-st.w.length,score=this.board.filter(b=>st.f.includes(b.q)).reduce((a,b)=>a+b.s,0);
    const rows=this.board.map((b,i)=>{const f=st.f.includes(b.q),show=f||st.done;return '<div class="'+(f?'f pop':(st.done?'m':''))+'"><b class="num">'+AR(i+1)+'</b><span style="flex:1;min-width:0">'+(show?esc(D.byQ[b.q].n):'')+'</span><span class="num" style="font-family:var(--f-display)">'+(show?AR(b.s):'')+'</span></div>';}).join('');
    let top;
    if(st.done)top=resultCard({em:st.f.length===this.N?'🏆':'📣',title:'نقاطك: '+AR(score),sub:'وجدت '+AR(st.f.length)+' من '+AR(this.N)+' إجابات',daily:this.mode==='daily',game:'fans',share:'FANS.share()',again:"FANS.start('free')",againLabel:'سؤال آخر'});
    else top='<div class="card"><div class="tagrow"><span class="pill a num">'+AR(score)+' نقطة</span>'+livesHTML(left,3,true)+'</div><div style="margin-top:12px">'+answerBox('fin','من الأشهر برأيك؟')+'</div>'+(st.w.length?'<div class="wrong" style="margin-top:10px">'+st.w.map(q=>'<span>'+esc(D.byQ[q].n)+'</span>').join('')+'</div>':'')+'</div>';
    screen('المفضّلة الجماهيرية','fans',modeSeg('FANS',this.mode)+'<div class="stack" style="margin-top:12px"><div class="card"><div class="muted small">سألنا ١٠٠ مشجع أن يذكروا…</div><h2 style="font-size:1.15rem;font-weight:800">'+esc(this.q.t)+'</h2></div>'+top+'<div class="card"><div class="ans" style="grid-template-columns:1fr">'+rows+'</div></div></div>');
    if(!st.done)bindAC($('#fin'),$('#finL'),p=>this.guess(p),{isUsed:p=>st.f.includes(p.q)||st.w.includes(p.q)});
  },
  guess(p){
    const st=this.st;if(st.done)return;
    if(this.board.some(b=>b.q===p.q)){st.f.push(p.q);toast('✓ على اللوحة!');if(st.f.length===this.N)this.finish();}
    else{st.w.push(p.q);toast(this.q.ans.some(a=>a.q===p.q)?'إجابة صحيحة لكنها ليست من الأشهر':'لا يحقق السؤال');if(st.w.length>=3)this.finish();}
    this.save();this.draw();
  },
  finish(){this.st.done=true;if(this.mode==='daily')recordResult('fans',this.st.f.length===this.N);},
  share(){const st=this.st,s=this.board.filter(b=>st.f.includes(b.q)).reduce((a,b)=>a+b.s,0);share('تحدّي الكورة · المفضّلة الجماهيرية #'+DAYNO+'\n'+s+' نقطة · '+st.f.length+'/'+this.N+'\n'+this.board.map(b=>st.f.includes(b.q)?'🟩':'⬜').join(''));}
};
registerGame({id:'fans',name:'المفضّلة الجماهيرية',desc:'خمّن الإجابات الأكثر شيوعًا عند المشجعين',color:'linear-gradient(160deg,#F2994A,#C2410C)',ic:'📣',obj:FANS,
 help:'<h3>طريقة لعب «المفضّلة الجماهيرية»</h3><ol><li>سؤال عن مجموعة لاعبين، ولوحة فيها أشهر ٨ إجابات.</li><li>كل إجابة لها نقاط تمثل نسبة المشجعين الذين سيذكرونها، والأشهر نقاطها أعلى.</li><li>عندك ٣ أرواح. الإجابة الصحيحة غير الموجودة على اللوحة تخسرك روحًا أيضًا.</li><li>فكّر في الأسماء الأشهر وليس النادرة.</li></ol><p class="muted small">النسب تقديرية محسوبة من شهرة اللاعب: عدد لغات ويكيبيديا التي لها مقال عنه.</p>'});

/* =================== الإجابة النادرة (GoalLess) =================== */
const RARE={
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;
    const q=makeQuestion(rng(seedFor('rare',mode)),{min:15,max:400});
    this.q=q;
    const N=Math.min(40,q.ans.length);this.board=popShares(q.ans,N);
    this.st=mode==='daily'?dayState('rare',()=>({a:[],done:false})):{a:[],done:false};
    this.draw();
  },
  save(){if(this.mode==='daily')saveDay('rare',this.st);},
  scoreOf(q){if(!this.q.ans.some(p=>p.q===q))return 100;const b=this.board.find(x=>x.q===q);return b?b.s:0;},
  total(){let s=this.st.a.map(q=>this.scoreOf(q));if(s.includes(0)&&s.length===5){const m=Math.max(...s);s.splice(s.indexOf(m),1);}return s.reduce((a,b)=>a+b,0);},
  tier(t){const b=this.board.map(x=>x.s).sort((a,b)=>a-b);const lo=b.slice(0,5).reduce((a,c)=>a+c,0);if(t===0)return '⭐ لا يُقهر!';if(t<=lo+5)return '🏆 الأبطال';if(t<=lo+25)return '🌍 التأهل الأوروبي';if(t<=lo+80)return '📊 منتصف الجدول';return '⬇️ الهبوط';},
  draw(){
    const st=this.st;
    const rows=st.a.map(q=>{const s=this.scoreOf(q);return '<div class="'+(s===100?'m':'f')+'"><b class="num">'+(s===0?'٠':AR(s))+'</b>'+esc(D.byQ[q].n)+(s===0?' <span class="pill g">نادرة!</span>':'')+'</div>';}).join('');
    let top;
    if(st.done){const t=this.total();top=resultCard({em:t===0?'⭐':'🥅',title:'مجموعك: '+AR(t),sub:this.tier(t)+(st.a.some(q=>this.scoreOf(q)===0)?'<br>🛡️ درع الصفر أسقط أعلى نتيجة':''),daily:this.mode==='daily',game:'rare',share:'RARE.share()',again:"RARE.start('free')",againLabel:'سؤال آخر'})+'<div class="card"><div class="muted small" style="margin-bottom:6px">الأكثر شيوعًا:</div><div class="chips">'+this.board.slice(0,6).map(b=>'<span class="pill">'+esc(D.byQ[b.q].n)+' '+AR(b.s)+'</span>').join('')+'</div></div>';}
    else top='<div class="card"><div class="tagrow"><span class="pill a num">'+AR(st.a.length)+' / ٥ إجابات</span><span class="muted small">الأقل أفضل</span></div><div style="margin-top:12px">'+answerBox('rin','اذكر إجابة نادرة…')+'</div></div>';
    screen('الإجابة النادرة','rare',modeSeg('RARE',this.mode)+'<div class="stack" style="margin-top:12px"><div class="card"><div class="muted small">تذكّر: كلما ندرت الإجابة كان أفضل!</div><h2 style="font-size:1.15rem;font-weight:800">'+esc(this.q.t)+'</h2></div>'+top+(rows?'<div class="card"><div class="ans" style="grid-template-columns:1fr">'+rows+'</div></div>':'')+'</div>');
    if(!st.done)bindAC($('#rin'),$('#rinL'),p=>this.guess(p),{isUsed:p=>st.a.includes(p.q)});
  },
  guess(p){const st=this.st;if(st.done)return;st.a.push(p.q);const s=this.scoreOf(p.q);toast(s===100?'✗ خطأ: +١٠٠':s===0?'⭐ إجابة نادرة: صفر!':'+'+s);if(st.a.length>=5){st.done=true;if(this.mode==='daily')recordResult('rare',this.total()<100);}this.save();this.draw();},
  share(){share('تحدّي الكورة · الإجابة النادرة #'+DAYNO+'\n'+this.total()+' · '+this.tier(this.total())+'\n'+this.st.a.map(q=>{const s=this.scoreOf(q);return s===100?'❌':s===0?'⭐':'⚽';}).join(''));}
};
registerGame({id:'rare',name:'الإجابة النادرة',desc:'٥ إجابات، وكلما ندرت قلّت نقاطك',color:'linear-gradient(160deg,#334155,#0F172A)',ic:'٠',obj:RARE,
 help:'<h3>طريقة لعب «الإجابة النادرة»</h3><ol><li>اقرأ السؤال واذكر <b>٥ إجابات</b>.</li><li>لكل إجابة نقاط من ٠ إلى ١٠٠ حسب شيوعها: الشائعة نقاطها عالية، والنادرة نقاطها صفر.</li><li>الهدف أقل مجموع ممكن. الإجابة الخاطئة تضيف ١٠٠.</li><li>🛡️ <b>درع الصفر:</b> إذا وجدت إجابة بصفر، تُحذف أعلى نتيجة من مجموعك.</li></ol><p class="muted small">الشيوع تقديري محسوب من شهرة اللاعب في ويكيبيديا.</p>'});

/* =================== حقل الألغام (Mine Games) =================== */
const MINES={
  start(mode,hard){
    mode=mode||this.mode||'daily';this.mode=mode;if(hard!==undefined)this.hard=hard;
    const r=rng(seedFor('mines',mode));
    let q,good,bad;
    for(let t=0;t<200;t++){
      q=makeQuestion(r,{min:14,max:400});if(!q)continue;
      good=q.ans.filter(p=>p.fame>=60);if(good.length<8)continue;
      const tst=q.cats.map(catTest);
      // ألغام مقنعة: لاعبون مشهورون يشاركون في جزء من الشرط
      bad=D.famous.slice(0,1500).filter(p=>!tst.every(t=>t(p))&&(tst.some(t=>t(p))||q.cats.some(c=>c.k==='club'&&p.leagues.has((D.T[c.v]||[])[1]))));
      if(bad.length>=10)break;
    }
    const nGood=8+Math.floor(r()*7);
    const cells=shuffled(pickN(good.slice(0,60),nGood,r).concat(pickN(bad.slice(0,200),20-nGood,r)),r).map(p=>p.q);
    this.q=q;this.good=new Set(q.ans.map(p=>p.q));
    this.st=mode==='daily'?dayState('mines',()=>({cells,sel:[],done:false})):{cells,sel:[],done:false};
    if(this.st.cells.length!==20)this.st.cells=cells;
    this.draw();
  },
  save(){if(this.mode==='daily')saveDay('mines',this.st);},
  draw(){
    const st=this.st,nGood=st.cells.filter(q=>this.good.has(q)).length;
    const cells=st.cells.map((q,i)=>{const p=D.byQ[q],sel=st.sel.includes(q);let cls='';if(st.done){cls=this.good.has(q)?(sel?'done':'hint'):(sel?'flash':'');}else if(sel)cls='done';return '<button class="'+cls+'" onclick="MINES.tap('+i+')" '+(st.done?'disabled':'')+'>'+(st.done&&!this.good.has(q)?'<span class="em">💣</span>':'')+esc(p.n)+'</button>';}).join('');
    let top;
    if(st.done){const hits=st.sel.filter(q=>this.good.has(q)).length,boom=st.sel.some(q=>!this.good.has(q));top=resultCard({em:boom?'💥':(hits===nGood?'🏆':'✅'),title:boom?'انفجر لغم!':(hits===nGood?'كل الإجابات صحيحة!':'نجوت'),sub:'اخترت '+AR(hits)+' صحيحة من '+AR(nGood),daily:this.mode==='daily',game:'mines',share:'MINES.share()',again:"MINES.start('free')",againLabel:'حقل آخر'});}
    else top='<div class="card"><div class="tagrow"><span class="pill a num">'+AR(st.sel.length)+' محددة</span><span class="muted small">'+(this.hard?'عدد الصحيح مخفي':'اختر '+AR(nGood)+' إجابات صحيحة · '+AR(20-nGood)+' ألغام')+'</span></div><button class="btn block" style="margin-top:10px;background:var(--bad);color:#fff" onclick="MINES.detonate()">💣 فجّر</button></div>';
    const modes='<div class="chips" style="margin:10px 0"><button class="chip '+(!this.hard?'on':'')+'" onclick="MINES.start(MINES.mode,false)">عادي</button><button class="chip '+(this.hard?'on':'')+'" onclick="MINES.start(MINES.mode,true)">صعب</button></div>';
    screen('حقل الألغام','mines',modeSeg('MINES',this.mode)+modes+'<div class="stack"><div class="card"><h2 style="font-size:1.1rem;font-weight:800">'+esc(this.q.t)+'</h2><div class="muted small">حدد كل اللاعبين الصحيحين وتجنب الألغام، ثم اضغط «فجّر».</div></div><div class="bb c4">'+cells+'</div>'+top+'</div>');
  },
  tap(i){const st=this.st;if(st.done)return;const q=st.cells[i];st.sel=st.sel.includes(q)?st.sel.filter(x=>x!==q):st.sel.concat(q);this.save();this.draw();},
  detonate(){const st=this.st;st.done=true;const boom=st.sel.some(q=>!this.good.has(q)),all=st.cells.filter(q=>this.good.has(q)).every(q=>st.sel.includes(q));if(this.mode==='daily')recordResult('mines',!boom&&all);this.save();this.draw();},
  share(){const st=this.st;share('تحدّي الكورة · حقل الألغام #'+DAYNO+'\n'+st.cells.map(q=>this.good.has(q)?(st.sel.includes(q)?'🟩':'⬜'):(st.sel.includes(q)?'💥':'⬛')).join('').replace(/(.{8})/gu,'$1'));}
};
registerGame({id:'mines',name:'حقل الألغام',desc:'اختر الإجابات الصحيحة وتجنب الألغام',color:'linear-gradient(160deg,#EF4444,#7F1D1D)',ic:'💣',obj:MINES,
 help:'<h3>طريقة لعب «حقل الألغام»</h3><ol><li>سؤال و٢٠ لاعبًا، بعضهم يحقق السؤال والباقي ألغام.</li><li>اضغط على اللاعبين الصحيحين لتحديدهم، واضغط مرة أخرى لإلغاء التحديد.</li><li>اضغط «فجّر» عندما تنتهي. أي لغم محدد يفجّر الجولة.</li><li><b>عادي:</b> يظهر عدد الإجابات الصحيحة. <b>صعب:</b> العدد مخفي.</li></ol>'});
