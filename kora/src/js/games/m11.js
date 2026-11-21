/* =================== الناقص 11 =================== */
const M11={
  ROWS:{GK:0,SW:1,RB:1,CB:1,LB:1,DF:1,RWB:2,LWB:2,DM:2,CM:3,RM:3,LM:3,MF:3,AM:4,RW:4,LW:4,SS:4,RF:5,LF:5,CF:5,ST:5,FW:5},
  POS:{GK:'حارس',SW:'ليبرو',RB:'ظهير أيمن',CB:'قلب دفاع',LB:'ظهير أيسر',DF:'مدافع',RWB:'ظهير جناح أيمن',LWB:'ظهير جناح أيسر',DM:'وسط دفاعي',CM:'وسط',RM:'وسط أيمن',LM:'وسط أيسر',MF:'وسط',AM:'وسط هجومي',RW:'جناح أيمن',LW:'جناح أيسر',SS:'مهاجم ثانٍ',RF:'مهاجم أيمن',LF:'مهاجم أيسر',CF:'مهاجم',ST:'مهاجم',FW:'مهاجم'},
  TRIES:6,
  pool(){
    // مباريات منذ 1990 أولًا، ونعطي الأولوية لكل مباراة فيها منتخب أو نادٍ عربي
    return D.M.filter(m=>!m.date||+m.date.slice(0,4)>=1986);
  },
  todays(){return dailyPick(this.pool(),'m11');},
  featureTitle(){const m=this.todays();return m?m.me:'';},
  featureSub(){const m=this.todays();return m?m.comp+'. هل تتذكر التشكيلة الأساسية كاملة؟':'';},
  miniDots(){const m=this.todays();if(!m)return '';return this.layout(m).map(p=>'<i style="left:'+p.x+'%;top:'+p.y+'%"></i>').join('');},
  layout(m){
    const rows={};m.xi.forEach((p,i)=>{const r=this.ROWS[p.p]!=null?this.ROWS[p.p]:3;(rows[r]=rows[r]||[]).push(i);});
    const keys=Object.keys(rows).map(Number).sort((a,b)=>a-b);
    const out=new Array(m.xi.length);
    keys.forEach((r,ri)=>{
      const y=r===0?88:(keys.length>1?74-(ri-1)*(60/Math.max(1,keys.length-2)):50);
      const idx=rows[r];const n=idx.length;
      const span=n===2?30:n===3?50:72;idx.forEach((pi,ci)=>{const x=n===1?50:(50+span/2-ci*(span/(n-1)));out[pi]={x,y:Math.max(12,y),i:pi};});
    });
    return out;
  },
  key(p){const w=p.n.split(/\s+/);return norm(w[w.length-1]);},
  shown(p){const w=p.n.split(/\s+/);return w[w.length-1];},
  accepts(p,v){
    const w=p.n.split(/\s+/),x=norm(v);if(!x)return false;
    const opts=[p.n,w[w.length-1],w.slice(-2).join(' '),w.slice(1).join(' ')];
    const enw=(p.en||'').split(/\s+/);opts.push(p.en,enw[enw.length-1]);
    return opts.some(o=>o&&same(o,v));
  },
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;
    const fresh=m=>({mid:m.id,solved:{},hist:{},fail:{},done:false,gave:false});
    if(mode==='daily'){const m=this.todays();this.st=dayState('m11',()=>fresh(m));if(this.st.mid!==m.id)this.st=Object.assign({day:DAY},fresh(m));}
    else{let m;do{m=this.pool()[Math.floor(Math.random()*this.pool().length)];}while(this.st&&m.id===this.st.mid&&this.pool().length>1);this.st=fresh(m);}
    this.m=D.M.find(x=>x.id===this.st.mid);this.pos=this.layout(this.m);
    this.sel=this.m.xi.findIndex((p,i)=>!this.st.solved[i]&&!this.st.fail[i]);if(this.sel<0)this.sel=0;
    this.draw();
  },
  save(){if(this.mode==='daily')saveDay('m11',this.st);},
  known(i){
    const k=[...this.key(this.m.xi[i])],kn=new Array(k.length).fill(false);
    (this.st.hist[i]||[]).forEach(g=>{[...norm(g)].forEach((c,j)=>{if(c===k[j])kn[j]=true;});});
    return kn;
  },
  pattern(i){const L=letters(this.shown(this.m.xi[i])),kn=this.known(i);return L.map((c,j)=>kn[j]?c:'•').join('');},
  draw(){
    const m=this.m,st=this.st;
    const nSolved=Object.keys(st.solved).length;
    const toks=m.xi.map((p,i)=>{
      const ok=st.solved[i],rv=(st.done||st.fail[i])&&!ok,ps=this.pos[i];
      const cls='tok'+(ok?' ok':'')+(rv?' rev':'')+(i===this.sel&&!st.done?' sel':'');
      const label=(ok||rv)?esc(this.shown(p)):esc(this.pattern(i));
      return '<button class="'+cls+'" style="left:'+ps.x+'%;top:'+ps.y+'%" onclick="M11.pick('+i+')" aria-label="'+esc(this.POS[p.p]||p.p)+'"><span class="sh num">'+(ok?'✓':(rv?'✕':AR(letters(this.shown(p)).length)))+'</span><span class="nm">'+label+'</span><span class="ps">'+esc(this.POS[p.p]||p.p)+'</span></button>';
    }).join('');
    const sc=m.sc?'<div class="sc num">'+AR(m.sc[0])+' – '+AR(m.sc[1])+'</div>':'<div class="sc">ضد</div>';
    screen('الناقص 11','m11',modeSeg('M11',this.mode)+
     '<div class="stack" style="margin-top:12px"><div class="card"><div class="match"><div class="tm me">'+esc(m.me)+'</div>'+sc+'<div class="tm">'+esc(m.op)+'</div></div><div class="match-sub"><b>'+esc(m.comp)+'</b>'+(m.date?'<br>'+esc(new Date(m.date).toLocaleDateString('ar-SA-u-ca-gregory-nu-arab',{day:'numeric',month:'long',year:'numeric'})):'')+'</div></div>'+
     '<div class="tagrow" style="padding:0 4px"><span class="pill a num">'+AR(nSolved)+' / ١١</span><span class="muted small">٦ محاولات لكل لاعب</span></div>'+
     '<div class="pitch"><div class="ln mid"></div><div class="ln circ"></div><div class="ln box"></div><div class="ln six"></div>'+toks+'</div>'+
     '<div id="m11panel"></div></div>');
    this.panel();
  },
  pick(i){if(this.st.done)return;this.sel=i;this.draw();const f=$('#m11in');if(f)f.focus({preventScroll:true});},
  panel(){
    const st=this.st,i=this.sel,p=this.m.xi[i];
    if(st.done){
      const n=Object.keys(st.solved).length,win=n===11;
      $('#m11panel').innerHTML=resultCard({em:win?'🏆':'📋',title:win?'أكملت التشكيلة!':'هذه هي التشكيلة',sub:'عرفت '+AR(n)+' من ١١ لاعبًا',daily:this.mode==='daily',game:'m11',share:'M11.share()',again:"M11.start('free')",againLabel:'مباراة أخرى'});
      return;
    }
    if(st.solved[i]||st.fail[i]){$('#m11panel').innerHTML='<div class="card muted" style="text-align:center">'+(st.solved[i]?'✓ عرفته: ':'✕ انتهت محاولاتك: ')+'<b style="color:var(--fg)">'+esc(p.n)+'</b><br><span class="small">اختر لاعبًا آخر من الملعب.</span></div>';return;}
    const L=letters(this.shown(p)),kn=this.known(i),left=this.TRIES-(st.hist[i]||[]).length;
    const slots='<div class="tiles">'+L.map((c,j)=>'<div class="tile '+(kn[j]?'k':'empty')+'">'+(kn[j]?esc(c):'')+'</div>').join('')+'</div>';
    const hist=(st.hist[i]||[]).slice().reverse().map(g=>this.tilesFor(g,i)).join('');
    $('#m11panel').innerHTML='<div class="card"><div class="tagrow" style="margin-bottom:10px"><b class="disp">'+esc(this.POS[p.p]||p.p)+(p.no?' · رقم '+AR(p.no):'')+'</b><span class="pill num">'+AR(left)+' محاولات</span></div>'+slots+
     '<form id="m11f" style="display:flex;gap:8px;margin-top:12px" autocomplete="off"><input class="field" id="m11in" placeholder="اسم عائلة اللاعب" enterkeyhint="done" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn" type="submit">تحقّق</button></form>'+
     '<div class="hist">'+hist+'</div><div class="btns" style="margin-top:10px"><button class="btn danger" onclick="M11.giveUpAsk()">استسلام</button></div></div>';
    $('#m11f').addEventListener('submit',e=>{e.preventDefault();this.guess($('#m11in').value);});
  },
  tilesFor(g,i){
    const k=[...this.key(this.m.xi[i])],gg=[...norm(g)],disp=letters(g);
    const res=new Array(gg.length).fill('miss'),cnt={};
    k.forEach((c,j)=>{if(gg[j]!==c)cnt[c]=(cnt[c]||0)+1;});
    gg.forEach((c,j)=>{if(c===k[j])res[j]='ok';});
    gg.forEach((c,j)=>{if(res[j]!=='ok'&&cnt[c]>0){res[j]='near';cnt[c]--;}});
    const show=disp.length===gg.length?disp:gg;
    return '<div class="tiles sm">'+gg.map((c,j)=>'<div class="tile '+res[j]+'">'+esc(show[j])+'</div>').join('')+'</div>';
  },
  next(){const st=this.st,n=this.m.xi.length;for(let k=1;k<=n;k++){const j=(this.sel+k)%n;if(!st.solved[j]&&!st.fail[j])return j;}return -1;},
  checkEnd(){const st=this.st;if(this.m.xi.every((p,i)=>st.solved[i]||st.fail[i])){st.done=true;if(this.mode==='daily')recordResult('m11',Object.keys(st.solved).length===11);}},
  guess(v){
    v=v.trim();if(!v)return;const st=this.st,i=this.sel,p=this.m.xi[i];
    if(this.accepts(p,v)){
      st.solved[i]=true;toast('أحسنت! '+p.n);
    } else {
      const other=this.m.xi.findIndex((q,j)=>j!==i&&!st.solved[j]&&this.accepts(q,v));
      (st.hist[i]=st.hist[i]||[]).push(v);
      if(st.hist[i].length>=this.TRIES){st.fail[i]=true;toast('انتهت المحاولات: '+p.n);}
      else if(other>=0)toast('هذا اللاعب في التشكيلة، لكن في مركز آخر');
    }
    this.checkEnd();
    if(!st.done&&(st.solved[i]||st.fail[i])){const nx=this.next();if(nx>=0)this.sel=nx;}
    this.save();this.draw();
    const f=$('#m11in');if(f)f.focus({preventScroll:true});
  },
  giveUpAsk(){confirmSheet('تستسلم؟','ستظهر التشكيلة كاملة.','نعم، اعرض التشكيلة',()=>{const st=this.st;this.m.xi.forEach((p,i)=>{if(!st.solved[i])st.fail[i]=true;});this.checkEnd();this.save();this.draw();});},
  share(){
    const st=this.st,m=this.m;
    const g=m.xi.map((p,i)=>st.solved[i]?'🟩':'🟥').join('');
    share('تحدّي الكورة · الناقص 11 #'+DAYNO+'\n'+m.me+' — '+m.comp+'\n'+Object.keys(st.solved).length+'/11\n'+g);
  }
};
registerGame({id:'m11',name:'الناقص 11',desc:'أكمل التشكيلة الأساسية لمباراة تاريخية',color:'linear-gradient(160deg,#17775A,#0A3528)',ic:'11',obj:M11,
 help:'<h3>طريقة لعب «الناقص 11»</h3><ol><li>تظهر مباراة تاريخية وتشكيلة أحد الفريقين على الملعب بدون أسماء.</li><li>اضغط على لاعب واكتب <b>اسم عائلته</b> (أو اسمه الكامل).</li><li>لكل لاعب <b>٦ محاولات</b>. <b style="color:var(--ok)">الأخضر</b> حرف في مكانه، <b style="color:var(--near)">الأصفر</b> حرف موجود في مكان آخر، <b>الرمادي</b> غير موجود.</li><li>عدد الحروف ظاهر على اللاعب، والحروف الخضراء تبقى ظاهرة.</li><li>أكمل الأحد عشر لاعبًا لتفوز.</li></ol><p class="muted small">التشكيلات من صفحات المباريات في ويكيبيديا، والأسماء العربية من ويكي بيانات.</p>'});
