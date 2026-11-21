/* =================== إكس-أو الكورة (Tiki-Taka-Toe) =================== */
const TTT={
  multi:true,
  start(){this.setup();},
  setup(){
    screen('إكس-أو الكورة','ttt','<div class="stack" style="margin-top:14px"><div class="card"><h3 class="disp">لاعبان على نفس الجهاز</h3><label class="small muted">اسم لاعب ✕</label><input class="field" id="ta" value="اللاعب ١" style="margin:4px 0 10px"><label class="small muted">اسم لاعب ◯</label><input class="field" id="tb" value="اللاعب ٢" style="margin-top:4px"><label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-weight:700"><input type="checkbox" id="tsteal"> وضع الاستحواذ (٣ سرقات لكل لاعب)</label><button class="btn block" style="margin-top:14px" onclick="TTT.begin()">ابدأ</button></div></div>');
  },
  begin(){
    const g=buildGrid(rng(Math.floor(Math.random()*4e9)),3,3,{minFame:30});
    this.st={names:[$('#ta').value.trim()||'اللاعب ١',$('#tb').value.trim()||'اللاعب ٢'],rows:g.rows,cols:g.cols,cell:{},turn:0,steal:$('#tsteal').checked?[3,3]:null,done:false,win:null};
    this.sets=gridSets(this.st);this.draw();
  },
  line(){const c=this.st.cell,L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];for(const l of L){const o=l.map(i=>c[i]&&c[i].o);if(o[0]!=null&&o[0]===o[1]&&o[1]===o[2])return o[0];}return null;},
  draw(){
    const st=this.st,mk=['✕','◯'];
    let h='<div class="bx"><div></div>'+st.cols.map(c=>'<div class="hd">'+catHead(c)+'</div>').join('');
    for(let i=0;i<3;i++){h+='<div class="hd">'+catHead(st.rows[i])+'</div>';for(let j=0;j<3;j++){const k=i*3+j,c=st.cell[k];h+='<button class="cl '+(c?'ok':'empty')+'" style="'+(c?'background:'+(c.o===0?'#2EA96A':'#D2524B')+';color:#fff':'')+'" onclick="TTT.open('+k+')">'+(c?'<div><div style="font-size:1.4rem">'+mk[c.o]+'</div>'+esc(D.byQ[c.q].n)+'</div>':'+')+'</button>';}}
    h+='</div>';
    const msg=st.done?'<div class="card result pop"><div class="em">🏆</div><h3>'+(st.win==null?'تعادل!':'فاز '+esc(st.names[st.win]))+'</h3><button class="btn block" onclick="TTT.setup()">مباراة جديدة</button></div>':
      '<div class="card tagrow"><b>دور '+mk[st.turn]+' '+esc(st.names[st.turn])+'</b>'+(st.steal?'<span class="pill g">سرقات: '+AR(st.steal[st.turn])+'</span>':'')+'<button class="btn ghost small" onclick="TTT.pass()">تمرير الدور</button></div>';
    screen('إكس-أو الكورة','ttt','<div class="stack" style="margin-top:12px">'+msg+'<div class="card" style="padding:12px">'+h+'</div></div>');
  },
  open(k){
    const st=this.st;if(st.done)return;const c=st.cell[k];
    if(c){if(c.o===st.turn){toast('هذه خانتك');return;}if(!st.steal||!st.steal[st.turn]){toast('الخانة محجوزة');return;}}
    const a=st.rows[Math.floor(k/3)],b=st.cols[k%3];
    pickPlayerSheet(esc(catLabel(a))+' × '+esc(catLabel(b)),c?'سرقة: اذكر لاعبًا مختلفًا عن '+esc(D.byQ[c.q].n):'دور '+esc(st.names[st.turn]),p=>this.play(k,p),{isUsed:p=>c&&c.q===p.q});
  },
  play(k,p){
    const st=this.st,c=st.cell[k];
    if(this.sets[k].includes(p.q)){if(c)st.steal[st.turn]--;st.cell[k]={o:st.turn,q:p.q};toast('✓ '+p.n);}
    else toast('✗ '+p.n+' لا يحقق الشرطين، الدور ينتقل');
    const w=this.line();if(w!=null){st.done=true;st.win=w;}else if(Object.keys(st.cell).length===9&&!(st.steal&&(st.steal[0]||st.steal[1]))){st.done=true;}
    if(!st.done)st.turn=1-st.turn;this.draw();
  },
  pass(){this.st.turn=1-this.st.turn;this.draw();}
};
registerGame({id:'ttt',name:'إكس-أو الكورة',desc:'إكس-أو بأسئلة كرة قدم ضد صديقك',color:'linear-gradient(160deg,#0EA5E9,#075985)',ic:'✕◯',obj:TTT,multi:true,
 help:'<h3>طريقة لعب «إكس-أو الكورة»</h3><ol><li>لاعبان على نفس الجهاز. الشبكة ٣×٣، وكل صف وعمود شرط.</li><li>في دورك اختر خانة واذكر لاعبًا يحقق شرطيها لتضع علامتك.</li><li>الخطأ ينقل الدور لخصمك.</li><li>أول من يكمل ثلاثًا في صف أو عمود أو قطر يفوز.</li><li>في <b>وضع الاستحواذ</b> لكل لاعب ٣ سرقات: يأخذ خانة خصمه بلاعب مختلف.</li></ol>'});

/* =================== الدخيل (Rondo Ringer) — تمرير الجوال =================== */
const RING={
  multi:true,
  start(){this.setup();},
  setup(){
    const saved=store.get('ringer:names',['','','','']);
    screen('الدخيل','ringer','<div class="stack" style="margin-top:14px"><div class="card"><h3 class="disp">لعبة جماعية بتمرير الجوال</h3><p class="muted small">من ٣ إلى ١٠ لاعبين. اكتب الأسماء.</p><div id="rnames">'+saved.map((n,i)=>'<input class="field rn" style="margin-top:6px" placeholder="اسم اللاعب '+AR(i+1)+'" value="'+esc(n)+'">').join('')+'</div><div class="btns" style="margin-top:8px"><button class="btn sec" onclick="RING.addName()">+ لاعب</button></div><button class="btn block" style="margin-top:12px" onclick="RING.begin()">ابدأ الجولة</button></div></div>');
  },
  addName(){if($$('.rn').length>=10)return;const i=document.createElement('input');i.className='field rn';i.style.marginTop='6px';i.placeholder='اسم اللاعب';$('#rnames').appendChild(i);i.focus();},
  begin(){
    const names=$$('.rn').map(i=>i.value.trim()).filter(Boolean);
    if(names.length<3){toast('تحتاج ٣ لاعبين على الأقل');return;}
    store.set('ringer:names',names);
    const score=this.st&&this.st.names.join()===names.join()?this.st.score:names.map(()=>0);
    const pool=D.famous.slice(0,400);const p=pool[Math.floor(Math.random()*pool.length)];
    this.st={names,score,secret:p.q,ringer:Math.floor(Math.random()*names.length),step:'reveal',i:0,shown:false,votes:[],vi:0};
    this.draw();
  },
  draw(){
    const st=this.st,p=D.byQ[st.secret];let body='';
    if(st.step==='reveal'){
      if(st.i>=st.names.length){st.step='clues';return this.draw();}
      body=!st.shown?'<div class="card result"><div class="em">📱</div><h3>سلّم الجوال إلى '+esc(st.names[st.i])+'</h3><p>لا تدع أحدًا يرى الشاشة.</p><button class="btn block" onclick="RING.st.shown=true;RING.draw()">أنا '+esc(st.names[st.i])+'، اكشف</button></div>':
        (st.i===st.ringer?'<div class="card result"><div class="em">🕵️</div><h3>أنت الدخيل!</h3><p>لا تعرف اللاعب. اندمج مع الآخرين وحاول معرفته من تلميحاتهم.</p><button class="btn block" onclick="RING.nextReveal()">تم، أخفِ الشاشة</button></div>':
         '<div class="card result"><div class="em">⚽</div><p>اللاعب السري:</p><h3>'+flag(p.nat)+' '+esc(p.n)+'</h3><p>'+esc(tName(p.mainClub))+'</p><button class="btn block" onclick="RING.nextReveal()">حفظته، أخفِ الشاشة</button></div>');
    } else if(st.step==='clues'){
      const start=Math.floor(Math.random()*st.names.length);
      body='<div class="card"><h3 class="disp">جولة التلميحات</h3><p class="muted">كل لاعب يقول تلميحًا قصيرًا عن اللاعب السري بالترتيب، بدون أن يجعله واضحًا جدًا. الدخيل يحاول أن يندمج.</p><ol>'+st.names.map((n,k)=>'<li>'+esc(st.names[(start+k)%st.names.length])+'</li>').join('')+'</ol><p class="muted small">يمكنكم عمل جولتين من التلميحات قبل التصويت.</p><button class="btn block" onclick="RING.st.step=\'vote\';RING.st.shown=false;RING.draw()">انتقلوا للتصويت</button></div>';
    } else if(st.step==='vote'){
      if(st.vi>=st.names.length){this.tally();return;}
      const v=st.names[st.vi];
      body=!st.shown?'<div class="card result"><div class="em">🗳️</div><h3>سلّم الجوال إلى '+esc(v)+'</h3><button class="btn block" onclick="RING.st.shown=true;RING.draw()">أنا '+esc(v)+'</button></div>':
        '<div class="card"><h3 class="disp">'+esc(v)+': من الدخيل؟</h3>'+st.names.map((n,k)=>k===st.vi?'':'<button class="opt" onclick="RING.vote('+k+')">'+esc(n)+'</button>').join('')+'</div>';
    } else if(st.step==='guess'){
      body='<div class="card"><h3 class="disp">انكشف الدخيل: '+esc(st.names[st.ringer])+'</h3><p class="muted">آخر فرصة: إذا عرف اللاعب السري يفوز بـ٣ نقاط.</p>'+acHTML('rg','من هو اللاعب السري؟')+'<button class="btn danger block" style="margin-top:10px" onclick="RING.guess(null)">لا أعرف</button></div>';
    } else if(st.step==='result'){
      body='<div class="card result pop"><div class="em">'+(st.rw?'🕵️':'🛡️')+'</div><h3>'+esc(st.msg)+'</h3><p>اللاعب السري كان: <b>'+esc(p.n)+'</b></p></div><div class="card"><h3 class="disp" style="margin-bottom:6px">النقاط</h3>'+st.names.map((n,k)=>'<div class="tagrow" style="padding:4px 0"><span>'+esc(n)+'</span><b class="num">'+AR(st.score[k])+'</b></div>').join('')+'<button class="btn block" style="margin-top:12px" onclick="RING.begin2()">جولة جديدة</button></div>';
    }
    screen('الدخيل','ringer','<div class="stack" style="margin-top:12px">'+body+'</div>');
    if(st.step==='guess')bindAC($('#rg'),$('#rgL'),x=>this.guess(x));
  },
  begin2(){const st=this.st;const pool=D.famous.slice(0,400);st.secret=pool[Math.floor(Math.random()*pool.length)].q;st.ringer=Math.floor(Math.random()*st.names.length);st.step='reveal';st.i=0;st.shown=false;st.votes=[];st.vi=0;this.draw();},
  nextReveal(){this.st.i++;this.st.shown=false;this.draw();},
  vote(k){this.st.votes.push(k);this.st.vi++;this.st.shown=false;this.draw();},
  tally(){
    const st=this.st,cnt=st.names.map((n,k)=>st.votes.filter(v=>v===k).length),mx=Math.max(...cnt);
    const top=cnt.map((c,k)=>c===mx?k:-1).filter(k=>k>=0);
    if(top.length===1&&top[0]===st.ringer){st.step='guess';}
    else{const missed=st.votes.filter((v,k)=>k!==st.ringer&&v!==st.ringer).length;st.score[st.ringer]+=missed;st.rw=true;st.msg='الدخيل '+st.names[st.ringer]+' نجا! +'+missed;st.step='result';}
    this.draw();
  },
  guess(p){
    const st=this.st;
    if(p&&p.q===st.secret){st.score[st.ringer]+=3;st.rw=true;st.msg='الدخيل عرف اللاعب وخطف الفوز! +٣';}
    else{st.rw=false;st.msg='فاز الفريق!';st.votes.forEach((v,k)=>{if(v===st.ringer)st.score[k]+=1;});}
    st.step='result';this.draw();
  },
};
registerGame({id:'ringer',name:'الدخيل',desc:'لعبة جماعية: اكتشفوا من لا يعرف اللاعب السري',color:'linear-gradient(160deg,#6366F1,#312E81)',ic:'🕵',obj:RING,multi:true,
 help:'<h3>طريقة لعب «الدخيل»</h3><ol><li>من ٣ إلى ١٠ لاعبين بتمرير الجوال.</li><li>كل لاعب يرى اللاعب السري سرًّا، إلا واحدًا: <b>الدخيل</b>.</li><li>تتبادلون تلميحات قصيرة عن اللاعب. الفريق يحاول كشف الدخيل دون أن يجعل اللاعب واضحًا جدًا.</li><li>بعدها يصوّت كل لاعب سرًّا على الدخيل.</li><li>إذا لم يحصل الدخيل على أكثر الأصوات (أو تعادلت) يفوز ويأخذ نقطة عن كل من لم يصوّت عليه.</li><li>إذا كُشف، له فرصة أخيرة لتخمين اللاعب: إن أصاب أخذ ٣ نقاط، وإن أخطأ أخذ كل من صوّت عليه نقطة.</li></ol>'});

/* =================== باك 11 (بطاقات المقارنة) =================== */
const PACK={
  STATS:[['apps','مباريات مع الأندية',p=>totals(p).apps],['goals','أهداف مع الأندية',p=>totals(p).goals],['caps','مباريات دولية',p=>p.nt?p.nt[1]:null],['ig','أهداف دولية',p=>p.nt?p.nt[2]:null],['h','الطول (سم)',p=>p.h],['nc','عدد الأندية',p=>new Set(p.car.map(c=>c[0])).size]],
  pool(){return D.famous.slice(0,1200).filter(p=>this.STATS.every(s=>s[2](p)!=null));},
  start(mode,hard){
    mode=mode||this.mode||'daily';this.mode=mode;if(hard!==undefined)this.hard=hard;
    const r=rng(seedFor('pack'+(this.hard?'h':''),mode));
    const pool=this.pool();const cards=pickN(this.hard?pool.slice(300):pool.slice(0,500),12,r).map(p=>p.q);
    const statIdx=cards.map(()=>pickN([0,1,2,3,4,5],5,r));
    const fresh=()=>({cards,statIdx,i:0,yellow:false,done:false,win:false,hist:[]});
    const key='pack'+(this.hard?'h':'');
    this.st=mode==='daily'?(()=>{let s=store.get('day:'+key,null);if(!s||s.day!==DAY)s=Object.assign({day:DAY},fresh());return s;})():fresh();
    this.key=key;this.sel=null;this.draw();
  },
  save(){if(this.mode==='daily'){store.set('day:'+this.key,this.st);store.set('day:pack',{day:DAY,done:this.st.done});}},
  card(q,si,show,gold,mark){
    const p=D.byQ[q];
    return '<div class="tcard'+(gold?' gold':'')+'"><div class="mt">'+esc(p.pos||'')+' · '+flag(p.nat)+'</div><div class="nm">'+esc(p.n)+'</div><div class="mt">'+esc(tName(p.mainClub))+'</div>'+
      si.map(k=>{const s=this.STATS[k],v=s[2](p);const cls=mark&&mark.k===k?mark.c:(show&&this.sel===k?'sel':'');return '<button class="st '+cls+'" '+(show?'onclick="PACK.sel='+k+';PACK.draw()"':'disabled')+'><span>'+s[1]+'</span><b class="num">'+(show||mark?AR(v):'؟')+'</b></button>';}).join('')+'</div>';
  },
  draw(){
    const st=this.st;
    let body;
    if(st.done){
      body=resultCard({em:st.win?'🥇':'🟥',title:st.win?'أكملت البطاقات الـ١١!':'طُردت!',sub:'وصلت إلى البطاقة '+AR(Math.min(st.i+1,11))+' من ١١',daily:this.mode==='daily',game:'pack',share:'PACK.share()',again:"PACK.start('free')",againLabel:'رزمة جديدة'});
    } else {
      const a=st.cards[st.i],b=st.cards[st.i+1],si=st.statIdx[st.i];
      body='<div class="tagrow"><span class="pill a num">البطاقة '+AR(st.i+1)+' / ١١</span><span>'+(st.yellow?'<span class="yc"></span> إنذار':'')+'</span></div>'+
        '<div class="cards2">'+this.card(a,si,true,false,st.lastMark)+this.card(b,si,false,st.i===10)+'</div>'+
        '<p class="muted small" style="text-align:center;margin:0">اختر رقمًا من البطاقة اليمنى تتوقع أنه أكبر من أو يساوي الرقم نفسه في البطاقة اليسرى.</p>'+
        '<button class="btn block" '+(this.sel==null?'disabled':'')+' onclick="PACK.go()">تأكيد الاختيار</button>';
    }
    const modes='<div class="chips" style="margin:10px 0"><button class="chip '+(!this.hard?'on':'')+'" onclick="PACK.start(PACK.mode,false)">عادي</button><button class="chip '+(this.hard?'on':'')+'" onclick="PACK.start(PACK.mode,true)">صعب</button></div>';
    screen('باك 11','pack',modeSeg('PACK',this.mode)+modes+'<div class="stack">'+body+'</div>');
  },
  go(){
    const st=this.st,k=this.sel;if(k==null)return;const s=this.STATS[k];
    const va=s[2](D.byQ[st.cards[st.i]]),vb=s[2](D.byQ[st.cards[st.i+1]]);
    const ok=va>=vb;st.hist.push(ok?1:0);
    toast((ok?'✓ صح: ':'✗ خطأ: ')+AR(va)+' مقابل '+AR(vb));
    if(!ok){if(st.yellow){st.done=true;st.win=false;}else st.yellow=true;}
    if(!st.done){st.i++;if(st.i>=11){st.done=true;st.win=true;}}
    if(st.done&&this.mode==='daily')recordResult('pack',st.win);
    st.lastMark=null;this.sel=null;this.save();this.draw();
  },
  share(){share('تحدّي الكورة · باك 11 #'+DAYNO+'\n'+this.st.hist.map(x=>x?'🟩':'🟨').join('')+(this.st.win?' 🥇':' 🟥'));}
};
registerGame({id:'pack',name:'باك 11',desc:'بطاقات مقارنة أرقام اللاعبين',color:'linear-gradient(160deg,#C9A24A,#6b4f12)',ic:'🃏',obj:PACK,
 help:'<h3>طريقة لعب «باك 11»</h3><ol><li>أمامك بطاقتا لاعبين، الأولى أرقامها ظاهرة والثانية مخفية.</li><li>اختر رقمًا من البطاقة الأولى تتوقع أنه <b>أكبر من أو يساوي</b> الرقم نفسه في البطاقة الثانية.</li><li>إذا أصبت تنتقل للبطاقة التالية.</li><li>أول خطأ = إنذار 🟨، والثاني = طرد 🟥.</li><li>تجاوز ١١ بطاقة والبطاقة الذهبية لتفوز.</li></ol><p class="muted small">الأرقام لمسيرة اللاعب كاملة من صندوق معلوماته في ويكيبيديا: مباريات الدوري وأهدافه، والمباريات الدولية مع المنتخب الأول.</p>'});
