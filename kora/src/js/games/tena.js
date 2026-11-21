/* =================== القائمة العشرية (TenaBall) =================== */
const TENA={
  start(mode,tension){
    mode=mode||this.mode||'daily';this.mode=mode;if(tension!==undefined)this.tension=tension;
    const lists=D.L.filter(l=>l.a.length>=5);
    const key='tena'+(this.tension?'-t':'');
    const fresh=l=>({l:l.id,f:[],w:[],pts:0,mult:5,done:false});
    if(mode==='daily'){const l=dailyPick(lists,'tena');this.st=store.get('day:'+key,null);if(!this.st||this.st.day!==DAY||this.st.l!==l.id)this.st=Object.assign({day:DAY},fresh(l));}
    else{const l=lists[Math.floor(Math.random()*lists.length)];this.st=fresh(l);}
    this.key=key;this.draw();
  },
  L(){return D.L.find(x=>x.id===this.st.l);},
  lives(){return this.tension?5:3;},
  save(){if(this.mode==='daily'){store.set('day:'+this.key,this.st);store.set('day:tena',{day:DAY,done:this.st.done});}},
  draw(){
    const st=this.st,L=this.L(),n=L.a.length,left=this.lives()-st.w.length;
    const rows=L.a.map((a,i)=>{const f=st.f.includes(i);return '<div class="'+(f?'f pop':(st.done?'m':''))+'"><b class="num">'+AR(a[2]||i+1)+'</b><span style="flex:1;min-width:0">'+(f||st.done?esc(a[0]):'')+'</span>'+((f||st.done)&&a[3]!=null?'<span class="muted small num">'+AR(a[3])+'</span>':'')+'</div>';}).join('');
    let top;
    if(st.done){
      const win=st.f.length===n;
      top=resultCard({em:win?'🏆':'📋',title:win?'القائمة كاملة!':'انتهت المحاولات',sub:'وجدت '+AR(st.f.length)+' من '+AR(n)+(this.tension?' · النقاط '+AR(st.pts):''),daily:this.mode==='daily',game:'tena',share:'TENA.share()',again:"TENA.start('free')",againLabel:'قائمة أخرى'});
    } else top='<div class="card"><div class="tagrow"><span class="pill a num">'+AR(st.f.length)+' / '+AR(n)+'</span>'+(this.tension?'<span class="pill g num">×'+AR(st.mult)+' · '+AR(st.pts)+' نقطة</span>':'')+livesHTML(left,this.lives(),true)+'</div>'+
      '<form id="tf" style="display:flex;gap:8px;margin-top:12px" autocomplete="off"><input class="field" id="tin" placeholder="اكتب إجابة…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"><button class="btn" type="submit">أضف</button></form>'+
      (st.w.length?'<div class="wrong" style="margin-top:10px">'+st.w.map(w=>'<span>'+esc(w)+'</span>').join('')+'</div>':'')+'<div style="text-align:center;margin-top:6px"><button class="btn danger small" onclick="TENA.end()">استسلام وعرض الإجابات</button></div></div>';
    const modes='<div class="chips" style="margin:10px 0"><button class="chip '+(!this.tension?'on':'')+'" onclick="TENA.start(TENA.mode,false)">كلاسيكي · ٣ أرواح</button><button class="chip '+(this.tension?'on':'')+'" onclick="TENA.start(TENA.mode,true)">التوتر 🥶 · ٥ أرواح ونقاط</button></div>';
    screen('القائمة العشرية','tena',modeSeg('TENA',this.mode)+modes+'<div class="stack"><div class="card"><h2 style="font-size:1.2rem;font-weight:800">'+esc(L.t)+'</h2><div class="muted small">'+esc(L.sub||'')+'</div></div>'+top+'<div class="card"><div class="ans" style="grid-template-columns:1fr">'+rows+'</div></div></div>');
    if(!st.done)$('#tf').addEventListener('submit',e=>{e.preventDefault();this.guess($('#tin').value);});
  },
  guess(v){
    v=v.trim();if(!v)return;const st=this.st,L=this.L();
    const i=L.a.findIndex(a=>[a[0]].concat(a[1]||[]).some(x=>same(v,x)));
    if(i>=0){
      if(st.f.includes(i)){toast('ذكرتها من قبل');$('#tin').value='';return;}
      st.f.push(i);if(this.tension)st.pts+=(L.a[i][2]||i+1)*st.mult;
      if(st.f.length===L.a.length)this.finish(true);
    } else {
      if(st.w.some(w=>same(w,v))){toast('جرّبتها من قبل');return;}
      st.w.push(v);if(this.tension)st.mult=Math.max(1,st.mult-1);
      if(st.w.length>=this.lives())this.finish(false);
      else{this.save();this.draw();shake($('#tf'));toast('ليست في القائمة');$('#tin').focus({preventScroll:true});return;}
    }
    this.save();this.draw();const f=$('#tin');if(f)f.focus({preventScroll:true});
  },
  finish(win){this.st.done=true;if(this.mode==='daily')recordResult('tena',win);},
  end(){this.finish(this.st.f.length===this.L().a.length);this.save();this.draw();},
  share(){const st=this.st,L=this.L();share('تحدّي الكورة · القائمة العشرية #'+DAYNO+'\n'+L.t+'\n✅ '+st.f.length+'/'+L.a.length+(this.tension?' · '+st.pts+' نقطة':'')+' '+'❤️'.repeat(Math.max(0,this.lives()-st.w.length)));}
};
registerGame({id:'tena',name:'القائمة العشرية',desc:'سمِّ إجابات القائمة المرتبة قبل أن تنفد أرواحك',color:'linear-gradient(160deg,#7A5AF8,#4B2FC2)',ic:'١٠',obj:TENA,
 help:'<h3>طريقة لعب «القائمة العشرية»</h3><ol><li>سؤال له قائمة مرتبة (حتى ١٠ إجابات)، مثل أكثر الأندية فوزًا ببطولة.</li><li>اكتب الإجابات بأي ترتيب، وكل إجابة صحيحة تظهر في مركزها.</li><li><b>الكلاسيكي:</b> ٣ أرواح، وكل خطأ يخسرك روحًا.</li><li><b>التوتر:</b> ٥ أرواح، والنقاط = رقم المركز × المضاعف. يبدأ المضاعف ×٥ وينقص ١ مع كل خطأ، فابدأ بالمراكز المتأخرة.</li></ol><p class="muted small">القوائم محسوبة من سجلات أبطال البطولات في ويكي بيانات ومن أرقام اللاعبين في ويكيبيديا.</p>'});
