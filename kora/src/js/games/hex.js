/* =================== أدوات لوحة الخلايا السداسية =================== */
const HEX={
  ROWS:[4,5,4,5,4,5,4], // ٣١ خلية
  cells(){
    if(this._c)return this._c;const out=[];
    this.ROWS.forEach((n,r)=>{for(let c=0;c<n;c++)out.push({r,c,i:out.length});});
    out.forEach(a=>{a.nb=out.filter(b=>{
      if(b===a)return false;
      if(b.r===a.r)return Math.abs(b.c-a.c)===1;
      if(Math.abs(b.r-a.r)!==1)return false;
      return this.ROWS[a.r]===4?(b.c===a.c||b.c===a.c+1):(b.c===a.c-1||b.c===a.c);
    }).map(b=>b.i);});
    return this._c=out;
  },
  html(cls,label,onclick,width){
    const W=Math.min(width||360,560),w=Math.floor(W/5.2),h=w*1.1547;
    const cells=this.cells();
    const body=cells.map(c=>{const x=(this.ROWS[c.r]===4?w/2:0)+c.c*w*1.02,y=c.r*h*0.77;return '<button class="hx '+cls(c.i)+'" style="left:'+x+'px;top:'+y+'px" onclick="'+onclick+'('+c.i+')">'+label(c.i)+'</button>';}).join('');
    return '<div class="hexwrap"><div class="hexb" style="--hw:'+w+'px;width:'+(5*w*1.02)+'px;height:'+(6*h*0.77+h)+'px">'+body+'</div></div>';
  },
  board(r,n){
    const C=allCats();const pool=[].concat(C.club,C.nat,C.lg,C.aw);
    return pickN(pool,n||31,r);
  },
  width(){return Math.min(window.innerWidth-60,560);}
};
function shortCat(c){const l=catLabel(c);return esc(l.replace('لعب في ','دوري ').replace(/^نادي /,''));}

/* =================== خريطة الحرارة (The Heatmap) =================== */
const HEAT={
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;
    const fresh=()=>({cats:HEX.board(rng(seedFor('heat',mode))),heat:{},used:[],score:0,moves:0,done:false});
    this.st=mode==='daily'?dayState('heat',fresh):fresh();this.sel=null;this.draw();
  },
  save(){if(this.mode==='daily')saveDay('heat',this.st);},
  draw(){
    const st=this.st,claimed=Object.keys(st.heat).length;
    const board=HEX.html(i=>{const h=st.heat[i]||0;return (this.sel===i?'sel ':'')+(h?'h'+Math.min(5,h):'');},i=>shortCat(st.cats[i]),'HEAT.pick',HEX.width());
    const dens=claimed?(Object.values(st.heat).reduce((a,b)=>a+b,0)/claimed):0;
    let top;
    if(st.done)top=resultCard({em:'🔥',title:'نقاطك: '+AR(st.score),sub:'في '+AR(st.moves)+' حركة · كثافة الحرارة '+AR(dens.toFixed(1)),daily:this.mode==='daily',game:'heat',share:'HEAT.share()',again:"HEAT.start('free')",againLabel:'لوحة جديدة'});
    else top='<div class="card"><div class="tagrow"><span class="pill a num">'+AR(st.score)+' نقطة</span><span class="muted small">'+AR(claimed)+' / ٣١ · '+AR(st.moves)+' حركة</span></div><p class="muted small" style="margin:8px 0 0">اختر خلية ثم اذكر لاعبًا يحققها. ينتشر اختيارك عبر الخلايا المتصلة التي يحققها اللاعب نفسه.</p><div style="text-align:center"><button class="btn danger small" onclick="HEAT.end()">إنهاء</button></div></div>';
    screen('خريطة الحرارة','heat',modeSeg('HEAT',this.mode)+'<div class="stack" style="margin-top:12px">'+top+'<div class="card" style="padding:10px">'+board+'</div></div>');
  },
  pick(i){
    const st=this.st;if(st.done)return;if(st.heat[i]){toast('هذه الخلية محجوزة، ابدأ من خلية فارغة');return;}
    this.sel=i;this.draw();
    pickPlayerSheet(shortCat(st.cats[i]),'اذكر لاعبًا يحقق هذه الفئة.',p=>this.play(i,p),{isUsed:p=>st.used.includes(p.q)});
  },
  play(i,p){
    const st=this.st,cells=HEX.cells();this.sel=null;
    if(!catTest(st.cats[i])(p)){toast('✗ '+p.n+' لا يحقق الفئة');st.moves++;this.save();this.draw();return;}
    st.used.push(p.q);
    const seen=new Set([i]),q=[i];
    while(q.length){const x=q.shift();for(const n of cells[x].nb){if(!seen.has(n)&&catTest(st.cats[n])(p)){seen.add(n);q.push(n);}}}
    let nw=0,re=0;seen.forEach(x=>{if(st.heat[x]){re++;}else nw++;st.heat[x]=(st.heat[x]||0)+1;});
    const pts=nw*(nw+1)/2+re;st.score+=pts;st.moves++;
    toast('🔥 '+AR(seen.size)+' خلايا · +'+AR(pts));
    if(Object.keys(st.heat).length===31)this.end();
    this.save();this.draw();
  },
  end(){const st=this.st;st.done=true;if(this.mode==='daily')recordResult('heat',Object.keys(st.heat).length===31,st.score);this.save();this.draw();},
  share(){share('تحدّي الكورة · خريطة الحرارة #'+DAYNO+'\n🔥 '+this.st.score+' نقطة في '+this.st.moves+' حركة');}
};
registerGame({id:'heat',name:'خريطة الحرارة',desc:'سخّن اللوحة بسلاسل من الخلايا المتصلة',color:'linear-gradient(160deg,#E4572E,#7C1D0F)',ic:'⬢',obj:HEAT,
 help:'<h3>طريقة لعب «خريطة الحرارة»</h3><ol><li>كل خلية فيها فئة: نادٍ، منتخب، دوري، أو جائزة.</li><li>اختر خلية فارغة واذكر لاعبًا يحققها.</li><li>ينتشر اللاعب عبر الخلايا المتصلة التي يحقق فئاتها، ويتوقف عند فئة لا يحققها.</li><li>نقاط الخلايا الجديدة تتضاعف: ١ خلية = ١، ٢ = ٣، ٣ = ٦، ٤ = ١٠ وهكذا.</li><li>الخلايا المحجوزة التي يمر بها اللاعب تسخن أكثر وتضيف نقطة لكل منها.</li><li>املأ اللوحة كاملة. لا يمكن تكرار اللاعب.</li></ol>'});

/* =================== الاستحواذ (Possession Play) — لاعبان على نفس الجهاز =================== */
const POSS={
  CLOCK:180,multi:true,
  start(){this.st=null;this.setup();},
  stop(){clearInterval(this._iv);},
  setup(){
    screen('الاستحواذ','poss','<div class="stack" style="margin-top:14px"><div class="card"><h3 class="disp">لاعبان على نفس الجهاز</h3><p class="muted small">تبادلا الجهاز. لكل لاعب ساعة ٣ دقائق تعمل في دوره فقط.</p><label class="small muted">اسم اللاعب الأخضر</label><input class="field" id="pa" value="اللاعب ١" style="margin:4px 0 10px"><label class="small muted">اسم اللاعب الأحمر</label><input class="field" id="pb" value="اللاعب ٢" style="margin-top:4px"><button class="btn block" style="margin-top:14px" onclick="POSS.begin()">ابدأ المباراة</button></div></div>');
  },
  begin(){
    const names=[$('#pa').value.trim()||'اللاعب ١',$('#pb').value.trim()||'اللاعب ٢'];
    this.st={names,cats:HEX.board(rng(Math.floor(Math.random()*4e9))),own:{},turn:0,clock:[this.CLOCK,this.CLOCK],used:[],done:false,last:Date.now()};
    this.draw();this.loop();
  },
  loop(){clearInterval(this._iv);this._iv=setInterval(()=>{const st=this.st;if(!st||st.done)return;const now=Date.now();st.clock[st.turn]-=(now-st.last)/1000;st.last=now;if(st.clock[st.turn]<=0){st.clock[st.turn]=0;toast('انتهى وقت '+st.names[st.turn]);this.pass();}const e=$('#pc'+st.turn);if(e)e.textContent=this.fmt(st.clock[st.turn]);},250);},
  tickReset(){if(this.st)this.st.last=Date.now();},
  fmt(s){s=Math.max(0,Math.ceil(s));return AR(Math.floor(s/60))+':'+AR(String(s%60).padStart(2,'0'));},
  pass(){closeSheet();const st=this.st;const o=1-st.turn;if(st.clock[o]>0)st.turn=o;else if(st.clock[st.turn]<=0)return this.end();st.last=Date.now();this.draw();},
  draw(){
    const st=this.st,cnt=[0,0];Object.values(st.own).forEach(o=>cnt[o]++);
    const board=HEX.html(i=>st.own[i]===0?'a':st.own[i]===1?'b':'',i=>shortCat(st.cats[i]),'POSS.pick',HEX.width());
    const side=k=>'<div style="flex:1;text-align:center;border-radius:14px;padding:8px;background:'+(k===0?'rgba(46,169,106,.15)':'rgba(210,82,75,.15)')+(st.turn===k&&!st.done?';box-shadow:0 0 0 2.5px '+(k===0?'#2EA96A':'#D2524B'):'')+'"><b>'+esc(st.names[k])+'</b><div class="big-num num">'+AR(cnt[k])+'</div><div class="small num" id="pc'+k+'">'+this.fmt(st.clock[k])+'</div></div>';
    let msg;
    if(st.done){const w=cnt[0]===cnt[1]?null:(cnt[0]>cnt[1]?0:1);msg='<div class="card result pop"><div class="em">🏆</div><h3>'+(w==null?'تعادل!':'فاز '+esc(st.names[w]))+'</h3><p>'+AR(cnt[0])+' – '+AR(cnt[1])+'</p><button class="btn block" onclick="POSS.setup()">مباراة جديدة</button></div>';}
    else msg='<div class="muted small" style="text-align:center">دور <b style="color:var(--fg)">'+esc(st.names[st.turn])+'</b>: اختر خلية محايدة</div>';
    screen('الاستحواذ','poss','<div class="stack" style="margin-top:12px"><div style="display:flex;gap:8px">'+side(0)+side(1)+'</div>'+msg+'<div class="card" style="padding:10px">'+board+'</div></div>');
  },
  pick(i){
    const st=this.st;if(st.done)return;if(st.own[i]!==undefined){toast('اختر خلية محايدة');return;}
    pickPlayerSheet(shortCat(st.cats[i]),'دور '+esc(st.names[st.turn])+': اذكر لاعبًا يحقق الفئة.',p=>this.play(i,p),{isUsed:p=>st.used.includes(p.q)});
  },
  play(i,p){
    const st=this.st,cells=HEX.cells();st.last=Date.now();
    if(!catTest(st.cats[i])(p)){toast('✗ خطأ، الدور ينتقل');this.pass();return;}
    st.used.push(p.q);let n=1;st.own[i]=st.turn;
    for(const x of cells[i].nb){if(st.own[x]!==st.turn&&catTest(st.cats[x])(p)){if(st.own[x]!==undefined)toast('🔁 استحواذ على خلية من الخصم');st.own[x]=st.turn;n++;}}
    if(n>1)toast('+'+AR(n)+' خلايا');
    if(Object.keys(st.own).length===31)return this.end();
    this.pass();
  },
  end(){this.st.done=true;clearInterval(this._iv);this.draw();}
};
registerGame({id:'poss',name:'الاستحواذ',desc:'نافس صديقك على السيطرة على اللوحة',color:'linear-gradient(160deg,#2EA96A,#D2524B)',ic:'⬣',obj:POSS,multi:true,
 help:'<h3>طريقة لعب «الاستحواذ»</h3><ol><li>لاعبان على نفس الجهاز يتبادلان الأدوار.</li><li>في دورك اختر خلية محايدة واذكر لاعبًا يحقق فئتها.</li><li>إذا كان اللاعب يحقق أيضًا فئات الخلايا الملاصقة فتحصل عليها كذلك، حتى لو كانت لخصمك.</li><li>لكل لاعب ساعة ٣ دقائق تعمل في دوره فقط، والخطأ ينقل الدور.</li><li>عند امتلاء الخلايا الـ٣١ يفوز صاحب العدد الأكبر.</li></ol>'});
