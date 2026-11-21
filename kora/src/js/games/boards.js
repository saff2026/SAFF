/* =================== الروابط (Football Connections) =================== */
const CONN={
  make(seed){
    const r=rng(seed),C=allCats();
    const pool=[].concat(C.club,C.nat,C.aw,C.lg);
    for(let t=0;t<4000;t++){
      const cats=pickN(pool,4,r);
      if(new Set(cats.map(c=>c.k)).size<2)continue;
      const tests=cats.map(catTest);
      const groups=[];let ok=true;const used=new Set();
      for(let i=0;i<4;i++){
        // لاعبون يحققون هذه الفئة فقط دون الفئات الثلاث الأخرى
        const cand=D.famous.slice(0,2500).filter(p=>tests[i](p)&&tests.every((tt,j)=>j===i||!tt(p))&&!used.has(p.q));
        if(cand.length<4){ok=false;break;}
        const g=pickN(cand.slice(0,40),4,r);g.forEach(p=>used.add(p.q));
        groups.push({c:cats[i],p:g.map(p=>p.q),d:g.reduce((a,p)=>a+p.fame,0)});
      }
      if(!ok)continue;
      groups.sort((a,b)=>b.d-a.d); // الأسهل أولًا
      return groups;
    }
  },
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;
    const g=this.make(seedFor('conn',mode));
    const order=shuffled(g.flatMap(x=>x.p),rng(seedFor('conn-o',mode)));
    const fresh=()=>({g:g.map(x=>({c:x.c,p:x.p})),order,solved:[],sel:[],lives:4,hint:0,done:false});
    this.st=mode==='daily'?dayState('conn',fresh):fresh();
    this.draw();
  },
  save(){if(this.mode==='daily')saveDay('conn',this.st);},
  draw(){
    const st=this.st;
    const solved=st.solved.map(gi=>{const g=st.g[gi];return '<div class="cgrp g'+gi+' pop"><b>'+esc(catLabel(g.c))+'</b><span>'+g.p.map(q=>esc(D.byQ[q].n)).join('، ')+'</span></div>';}).join('');
    const rest=st.order.filter(q=>!st.solved.some(gi=>st.g[gi].p.includes(q)));
    const grid=st.done?'':'<div class="cg">'+rest.map(q=>'<button class="'+(st.sel.includes(q)?'sel':'')+'" onclick="CONN.tap(\''+q+'\')">'+esc(D.byQ[q].n)+'</button>').join('')+'</div>';
    let foot;
    if(st.done){const win=st.solved.length===4;foot=(win?'':st.g.map((g,gi)=>st.solved.includes(gi)?'':'<div class="cgrp g'+gi+'" style="opacity:.75"><b>'+esc(catLabel(g.c))+'</b><span>'+g.p.map(q=>esc(D.byQ[q].n)).join('، ')+'</span></div>').join(''))+resultCard({em:win?'🔗':'😔',title:win?'وجدت كل الروابط!':'انتهت المحاولات',sub:'أخطاء: '+AR(4-st.lives)+' · تلميحات: '+AR(st.hint),daily:this.mode==='daily',game:'conn',share:'CONN.share()',again:"CONN.start('free')",againLabel:'لعبة أخرى'});}
    else foot='<div class="tagrow"><span class="muted small">الأخطاء المتبقية</span>'+livesHTML(st.lives,4,true)+'</div><div class="btns"><button class="btn sec" onclick="CONN.hintMe()">تلميح</button><button class="btn sec" onclick="CONN.shuf()">خلط</button><button class="btn sec" onclick="CONN.st.sel=[];CONN.draw()">إلغاء التحديد</button><button class="btn" '+(st.sel.length!==4?'disabled':'')+' onclick="CONN.submit()">تحقّق</button></div>'+(st.hintTxt?'<div class="pill g" style="justify-self:center">💡 '+esc(st.hintTxt)+'</div>':'');
    screen('الروابط','conn',modeSeg('CONN',this.mode)+'<div class="stack" style="margin-top:12px"><div class="muted small" style="text-align:center">كوّن ٤ مجموعات من ٤ لاعبين يجمعهم شيء مشترك.</div><div>'+solved+grid+'</div>'+foot+'</div>');
  },
  tap(q){const st=this.st;if(st.sel.includes(q))st.sel=st.sel.filter(x=>x!==q);else if(st.sel.length<4)st.sel.push(q);this.draw();},
  shuf(){this.st.order=shuffled(this.st.order,Math.random);this.draw();},
  hintMe(){const st=this.st;const gi=st.g.findIndex((g,i)=>!st.solved.includes(i));if(gi<0)return;st.hint++;st.hintTxt=catLabel(st.g[gi].c);this.save();this.draw();},
  submit(){
    const st=this.st;if(st.sel.length!==4)return;
    const gi=st.g.findIndex((g,i)=>!st.solved.includes(i)&&st.sel.every(q=>g.p.includes(q)));
    if(gi>=0){st.solved.push(gi);st.sel=[];st.hintTxt=null;if(st.solved.length===4)this.end(true);}
    else{const close=st.g.some((g,i)=>!st.solved.includes(i)&&st.sel.filter(q=>g.p.includes(q)).length===3);st.lives--;toast(close?'قريب! ينقصك لاعب واحد':'ليست مجموعة');if(st.lives<=0)this.end(false);}
    this.save();this.draw();
  },
  end(win){this.st.done=true;if(this.mode==='daily')recordResult('conn',win);},
  share(){const st=this.st,e=['🟨','🟩','🟦','🟪'];share('تحدّي الكورة · الروابط #'+DAYNO+'\n'+st.solved.map(gi=>e[gi].repeat(4)).join('\n')+'\nأخطاء: '+(4-st.lives));}
};
registerGame({id:'conn',name:'الروابط',desc:'٤ مجموعات من ٤ لاعبين بينهم رابط',color:'linear-gradient(160deg,#9FD27A,#3F7D20)',ic:'🔗',obj:CONN,
 help:'<h3>طريقة لعب «الروابط»</h3><ol><li>أمامك ١٦ لاعبًا، كوّن منهم ٤ مجموعات، في كل مجموعة ٤ لاعبين يجمعهم شيء واحد.</li><li>أمثلة على الروابط: لعبوا لنفس النادي، من نفس الدولة، لعبوا في نفس الدوري، فازوا بنفس الجائزة.</li><li>اختر ٤ لاعبين واضغط «تحقّق». عندك ٤ أخطاء فقط.</li><li>لكل لعبة حل واحد فقط. انتبه للاعبين الذين يبدو أنهم يناسبون أكثر من مجموعة.</li><li>زر «تلميح» يكشف اسم أسهل مجموعة متبقية.</li></ol>'});

/* =================== بنغو الكورة =================== */
const BINGO={
  make(seed){
    const r=rng(seed),C=allCats();
    const pool=[].concat(C.club,C.nat,C.aw,C.lg);
    for(let t=0;t<500;t++){
      const cats=pickN(pool,16,r);if(cats.filter(c=>c.k==='aw').length>3)continue;
      const tests=cats.map(catTest);
      const cand=D.famous.slice(0,3000).filter(p=>tests.some(t=>t(p)));
      // كل فئة يجب أن يكون لها لاعب واحد على الأقل في القائمة
      const seq=[];const cover=new Array(16).fill(0);
      for(let i=0;i<16;i++){const c=cand.filter(p=>tests[i](p));if(!c.length){seq.length=0;break;}const p=c[Math.floor(r()*Math.min(25,c.length))];if(!seq.includes(p.q))seq.push(p.q);}
      if(!seq.length)continue;
      const extra=pickN(cand.slice(0,800),40,r).map(p=>p.q).filter(q=>!seq.includes(q));
      return {cats,seq:shuffled(seq.concat(extra).slice(0,40),r)};
    }
  },
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;
    const b=this.make(seedFor('bingo',mode));
    const fresh=()=>({cats:b.cats,seq:b.seq,i:0,filled:{},turns:0,miss:false,wild:true,done:false});
    this.st=mode==='daily'?dayState('bingo',fresh):fresh();
    this.tests=this.st.cats.map(catTest);this.draw();
  },
  save(){if(this.mode==='daily')saveDay('bingo',this.st);},
  draw(){
    const st=this.st,p=D.byQ[st.seq[st.i]];const nf=Object.keys(st.filled).length;
    const cells=st.cats.map((c,k)=>'<button class="'+(st.filled[k]?'done':'')+'" onclick="BINGO.place('+k+')" '+(st.done||st.filled[k]?'disabled':'')+'>'+(st.filled[k]?'<span class="em">✓</span>'+esc(D.byQ[st.filled[k]].n):catIcon(c)+esc(catLabel(c)))+'</button>').join('');
    let top;
    if(st.done)top=resultCard({em:nf===16?'🎉':'🎯',title:nf===16?'بنغو! البطاقة كاملة':'انتهى اللاعبون',sub:'ملأت '+AR(nf)+' من ١٦ في '+AR(st.turns)+' دور',daily:this.mode==='daily',game:'bingo',share:'BINGO.share()',again:"BINGO.start('free')",againLabel:'بطاقة أخرى'});
    else top='<div class="pcard"><div class="mt">اللاعب '+AR(st.i+1)+' من '+AR(st.seq.length)+'</div><div class="nm">'+flag(p.nat)+' '+esc(p.n)+'</div><div class="mt">'+esc(p.pos||'')+(p.by?' · مواليد '+AR(p.by):'')+'</div><div class="btns" style="margin-top:10px;justify-content:center"><button class="btn sec" style="background:rgba(255,255,255,.15);color:#fff" onclick="BINGO.skip()">تخطٍّ</button>'+(st.wild?'<button class="btn" style="background:#E6CC78;color:#1a1405" onclick="BINGO.wildcard()">🃏 الورقة الرابحة</button>':'')+'</div></div>';
    screen('بنغو الكورة','bingo',modeSeg('BINGO',this.mode)+'<div class="stack" style="margin-top:12px">'+top+'<div class="tagrow"><span class="pill a num">'+AR(nf)+' / ١٦</span><span class="muted small">الأدوار: '+AR(st.turns)+'</span></div><div class="bb c4">'+cells+'</div></div>');
  },
  advance(){const st=this.st;st.turns++;st.i++;if(st.miss){st.miss=false;st.i++;st.turns++;toast('فاتك دور بسبب الخطأ');}if(st.i>=st.seq.length||Object.keys(st.filled).length===16)this.end();this.save();this.draw();},
  place(k){
    const st=this.st;if(st.done||st.filled[k])return;const p=D.byQ[st.seq[st.i]];
    if(this.tests[k](p)){st.filled[k]=p.q;toast('✓ صح');}else{st.miss=true;toast('✗ '+p.n+' لا يحقق '+catLabel(st.cats[k]));}
    this.advance();
  },
  skip(){const st=this.st;st.i++;if(st.i>=st.seq.length)this.end();this.save();this.draw();},
  wildcard(){const st=this.st,p=D.byQ[st.seq[st.i]];let n=0;st.cats.forEach((c,k)=>{if(!st.filled[k]&&this.tests[k](p)){st.filled[k]=p.q;n++;}});st.wild=false;toast(n?'🃏 ملأت '+n+' خانات':'🃏 لا توجد خانة مناسبة');this.advance();},
  end(){this.st.done=true;if(this.mode==='daily')recordResult('bingo',Object.keys(this.st.filled).length===16);},
  share(){const st=this.st;let s='';for(let i=0;i<16;i++){s+=st.filled[i]?'🟩':'⬜';if(i%4===3)s+='\n';}share('تحدّي الكورة · بنغو الكورة #'+DAYNO+'\n'+Object.keys(st.filled).length+'/16 في '+st.turns+' دور\n'+s);}
};
registerGame({id:'bingo',name:'بنغو الكورة',desc:'ضع كل لاعب في الخانة المناسبة من البطاقة',color:'linear-gradient(160deg,#EC4899,#9D174D)',ic:'B',obj:BINGO,
 help:'<h3>طريقة لعب «بنغو الكورة»</h3><ol><li>البطاقة فيها ١٦ خانة: أندية ومنتخبات ودوريات وجوائز.</li><li>يظهر لاعب في كل دور، ضعه في خانة واحدة يحققها.</li><li>الخطأ يفوّت عليك اللاعب التالي.</li><li>تستطيع «تخطّي» اللاعب بدون عقوبة.</li><li>🃏 <b>الورقة الرابحة</b> (مرة واحدة): تملأ كل الخانات التي يحققها اللاعب الحالي.</li><li>الهدف إكمال البطاقة بأقل عدد من الأدوار.</li></ol>'});

/* =================== الضغط العالي (Gegenpressure) =================== */
const GEGEN={
  T:10,TARGET:40,
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;
    const r=rng(seedFor('gegen',mode)),C=allCats();
    this.pool=[].concat(C.club,C.nat,C.lg,C.aw);
    this.r=r;
    const board=pickN(this.pool,9,r);
    const seq=pickN(D.famous.slice(0,1500),100,r).map(p=>p.q);
    this.st={board,seq,i:0,score:0,cnt:{},wild:3,started:false,done:false,lines:0};
    if(mode==='daily'){const d=store.get('day:gegen',null);if(d&&d.day===DAY&&d.done){this.st.done=true;this.st.score=d.score;}}
    this.draw();
  },
  stop(){clearInterval(this._iv);},
  begin(){this.st.started=true;this.next(true);},
  next(first){const st=this.st;if(!first)st.i++;if(st.i>=st.seq.length){this.end();return;}st.dl=Date.now()+this.T*1000;this.draw();this.loop();},
  loop(){clearInterval(this._iv);this._iv=setInterval(()=>{const l=Math.max(0,(this.st.dl-Date.now())/1000);const b=$('#ggbar');if(b)b.style.width=(l*100/this.T)+'%';if(l<=0){clearInterval(this._iv);toast('انتهى الوقت');this.next();}},100);},
  lines(){const L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];return L.filter(l=>l.every(i=>this.st.cnt[i]));},
  clear(){
    const st=this.st,ls=this.lines();if(!ls.length)return;
    const cells=new Set(ls.flat());st.score+=ls.length*3;st.lines+=ls.length;
    cells.forEach(i=>{delete st.cnt[i];let c;do{c=this.pool[Math.floor(this.r()*this.pool.length)];}while(st.board.some(b=>catKey(b)===catKey(c)));st.board[i]=c;});
    toast('🔥 خط كامل! +'+(ls.length*3));
  },
  tap(k){
    const st=this.st;if(!st.started||st.done)return;const p=D.byQ[st.seq[st.i]];
    if(catTest(st.board[k])(p)){st.score++;st.cnt[k]=(st.cnt[k]||0)+1;this.clear();this.next();}
    else{st.score=Math.max(0,st.score-1);if(st.cnt[k])st.cnt[k]--;toast('✗ '+p.n+' لا يحقق '+catLabel(st.board[k])+' (−١)');this.next();}
  },
  skip(){this.next();},
  wildcard(){const st=this.st;if(!st.wild)return;const p=D.byQ[st.seq[st.i]];let n=0;st.board.forEach((c,k)=>{if(catTest(c)(p)){st.score++;st.cnt[k]=(st.cnt[k]||0)+1;n++;}});st.wild--;toast(n?'🃏 +'+n:'🃏 لا توجد فئة مناسبة');this.clear();this.next();},
  end(){
    const st=this.st;clearInterval(this._iv);if(st.done)return;st.done=true;
    if(this.mode==='daily'){recordResult('gegen',st.score>=this.TARGET,st.score);store.set('day:gegen',{day:DAY,done:true,score:st.score});}
    this.draw();
  },
  draw(){
    const st=this.st;
    if(st.done){screen('الضغط العالي','gegen',modeSeg('GEGEN',this.mode)+'<div class="stack" style="margin-top:12px">'+resultCard({em:st.score>=this.TARGET?'🔥':'⚽',title:'نقاطك: '+AR(st.score),sub:(st.score>=this.TARGET?'تجاوزت هدف اليوم ('+AR(this.TARGET)+')':'هدف اليوم '+AR(this.TARGET)+' نقطة')+(st.lines?' · خطوط مكتملة: '+AR(st.lines):''),daily:this.mode==='daily',game:'gegen',share:'GEGEN.share()',again:"GEGEN.start('free')",againLabel:'جولة جديدة'})+'</div>');return;}
    const p=D.byQ[st.seq[st.i]];
    const cells=st.board.map((c,k)=>'<button onclick="GEGEN.tap('+k+')" class="'+(st.cnt[k]?'done':'')+'">'+catIcon(c)+esc(catLabel(c))+(st.cnt[k]?' ●':'')+'</button>').join('');
    const top=!st.started?'<div class="card result"><div class="em">⚡</div><h3>الهدف: '+AR(this.TARGET)+' نقطة</h3><p>١٠٠ لاعب، طابق كل لاعب مع فئة خلال ١٠ ثوانٍ.</p><button class="btn block" onclick="GEGEN.begin()">انطلق</button></div>':
      '<div class="pcard"><div class="tagrow"><span class="mt">النقاط '+AR(st.score)+' / '+AR(this.TARGET)+' · باقي '+AR(st.seq.length-st.i)+' لاعب</span><span class="mt">🃏 '+AR(st.wild)+'</span></div><div class="nm" style="margin-top:6px">'+flag(p.nat)+' '+esc(p.n)+'</div><div class="mt">'+esc(p.pos||'')+'</div><div class="timer" style="margin-top:10px;background:rgba(255,255,255,.2)"><i id="ggbar" style="width:100%;background:#E6CC78"></i></div><div class="btns" style="margin-top:10px;justify-content:center"><button class="btn sec" style="background:rgba(255,255,255,.15);color:#fff" onclick="GEGEN.skip()">تخطٍّ</button>'+(st.wild?'<button class="btn" style="background:#E6CC78;color:#1a1405" onclick="GEGEN.wildcard()">🃏 ورقة رابحة</button>':'')+'</div></div>';
    screen('الضغط العالي','gegen',modeSeg('GEGEN',this.mode)+'<div class="stack" style="margin-top:12px">'+top+'<div class="bb c3">'+cells+'</div></div>');
  },
  share(){share('تحدّي الكورة · الضغط العالي #'+DAYNO+'\n⚡ '+this.st.score+' نقطة'+(this.st.score>=this.TARGET?' ✅':''));}
};
registerGame({id:'gegen',name:'الضغط العالي',desc:'طابق اللاعبين بسرعة وحقق هدف اليوم',color:'linear-gradient(160deg,#F59E0B,#B45309)',ic:'⚡',obj:GEGEN,
 help:'<h3>طريقة لعب «الضغط العالي»</h3><ol><li>يظهر لاعب ومعه ١٠ ثوانٍ، اضغط على فئة يحققها من اللوحة.</li><li>كل إجابة صحيحة = نقطة وعلامة على الفئة.</li><li>أكمل صفًّا أو عمودًا أو قطرًا من العلامات لتحصل على ٣ نقاط إضافية، ثم تتبدل فئاته.</li><li>⏭️ التخطي مجاني. 🃏 ثلاث أوراق رابحة تحسب كل الفئات المناسبة للاعب دفعة واحدة.</li><li>❌ الخطأ يخصم نقطة وعلامة من الفئة. انتهاء الوقت ينقلك للاعب التالي.</li><li>الجولة ١٠٠ لاعب، وهدف اليوم ٤٠ نقطة، وبعدها استمر في رفع نتيجتك.</li></ol>'});
