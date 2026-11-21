/* =================== بوكس تو بوكس: شبكة الكورة =================== */
function countryOfName(en){return Object.keys(D.C).find(q=>D.C[q][5]===en);}
const GRID={
  SECS:180,
  LEAGUES:[['global','عالمي',null],['eng','إنجلترا','England'],['esp','إسبانيا','Spain'],['ita','إيطاليا','Italy'],['ksa','السعودية','Saudi Arabia']],
  make(seed,lg){
    const r=rng(seed);
    if(!lg)return buildGrid(r,3,3,{minFame:35});
    const cq=countryOfName(this.LEAGUES.find(x=>x[0]===lg)[2]);
    const C=allCats();
    const clubs=C.clubAll.filter(c=>(D.T[c.v]||[])[1]===cq&&c.n>=30);
    const nats=C.nat;
    for(let t=0;t<5000;t++){
      const rows=pickN(clubs,3,r);
      const cols=pickN(clubs.filter(c=>!rows.includes(c)).concat(nats,nats),3,r);
      if(new Set(cols.map(catKey)).size<3)continue;
      const sets=[];let ok=true;
      for(const a of rows){for(const b of cols){const s=playersFor([a,b],0).map(p=>p.q);if(s.length<1){ok=false;break;}sets.push(s);}if(!ok)break;}
      if(ok&&matchCells(sets))return {rows,cols,sets};
    }
    return buildGrid(r,3,3,{minFame:35});
  },
  start(mode,lg){
    mode=mode||this.mode||'daily';this.mode=mode;if(lg!==undefined)this.lg=lg;lg=this.lg||null;
    const key='grid'+(lg?'-'+lg:'');
    if(mode==='daily'){
      let st=store.get('day:'+key,null);
      if(!st||st.day!==DAY){const g=this.make(hashStr(key+DAY),lg);st={day:DAY,rows:g.rows,cols:g.cols,cells:{},extra:0,used:[],t0:null,done:false};}
      this.st=st;
    } else {const g=this.make(Math.floor(Math.random()*4e9),lg);this.st={rows:g.rows,cols:g.cols,cells:{},extra:0,used:[],t0:null,done:false};}
    this.key=key;this.sets=gridSets(this.st);this.draw();this.tick();
  },
  stop(){clearInterval(this._iv);},
  save(){if(this.mode==='daily'){store.set('day:'+this.key,this.st);store.set('day:grid',{day:DAY,done:this.st.done});}},
  left(){const st=this.st;if(!st.t0)return this.SECS;return Math.max(0,this.SECS-Math.floor((Date.now()-st.t0)/1000));},
  tick(){
    clearInterval(this._iv);
    this._iv=setInterval(()=>{
      if(!this.st.t0||this.st.done)return;
      const l=this.left();const el=$('#gtime');if(el)el.textContent=AR(Math.floor(l/60))+':'+AR(String(l%60).padStart(2,'0'));
      const b=$('#gbar');if(b)b.style.width=(l*100/this.SECS)+'%';
      if(l<=0)this.finish();
    },500);
  },
  finish(){const st=this.st;if(st.done)return;st.done=true;closeSheet();if(this.mode==='daily')recordResult('grid',Object.keys(st.cells).length===9);this.save();this.draw();},
  draw(){
    const st=this.st;let rev=null;
    if(st.done){const s=this.sets.map((x,i)=>st.cells[i]!==undefined?null:x);rev=matchCells(s,st.used)||[];}
    let h='<div class="bx"><div></div>'+st.cols.map(c=>'<div class="hd">'+catHead(c)+'</div>').join('');
    for(let i=0;i<3;i++){
      h+='<div class="hd">'+catHead(st.rows[i])+'</div>';
      for(let j=0;j<3;j++){
        const k=i*3+j,q=st.cells[k];
        if(q!==undefined)h+='<button class="cl ok" '+(st.done?'disabled':'')+' onclick="GRID.open('+k+')">'+esc(D.byQ[q].n)+'</button>';
        else if(rev&&rev[k])h+='<button class="cl rev" disabled>'+esc(D.byQ[rev[k]].n)+'</button>';
        else h+='<button class="cl empty" '+(st.done?'disabled':'')+' onclick="GRID.open('+k+')" aria-label="خانة">+</button>';
      }
    }
    h+='</div>';
    const n=Object.keys(st.cells).length,l=this.left();
    const lgs=this.LEAGUES.map(x=>'<button class="chip '+((this.lg||null)===(x[2]?x[0]:null)?'on':'')+'" onclick="GRID.start(GRID.mode,'+(x[2]?'\''+x[0]+'\'':'null')+')">'+x[1]+'</button>').join('');
    let foot;
    if(st.done)foot=resultCard({em:n===9?'🏆':'🧩',title:n===9?'شبكة كاملة!':'انتهى الوقت',sub:'ملأت '+AR(n)+' من ٩ خانات · مجموع الإجابات الصحيحة '+AR(n+st.extra)+(n<9?'<br>الخانات الرمادية أمثلة لإجابات صحيحة.':''),daily:this.mode==='daily',game:'grid',share:'GRID.share()',again:"GRID.start('free')",againLabel:'شبكة جديدة'});
    else foot='<div class="card"><div class="tagrow"><div><b class="disp num" id="gtime">'+AR(Math.floor(l/60))+':'+AR(String(l%60).padStart(2,'0'))+'</b> <span class="muted small">'+(st.t0?'':'يبدأ الوقت مع أول اختيار')+'</span></div><span class="pill a">'+AR(n)+' من ٩'+(st.extra?' · إضافية '+AR(st.extra):'')+'</span></div><div class="timer" style="margin-top:8px"><i id="gbar" style="width:'+(l*100/this.SECS)+'%"></i></div><p class="muted small" style="margin:8px 0 0">بعد إكمال الشبكة استمر في ذكر لاعبين صحيحين لأي خانة لزيادة نقاطك حتى ينتهي الوقت.</p><div style="text-align:center"><button class="btn danger" onclick="GRID.finish()">إنهاء</button></div></div>';
    screen('شبكة الكورة','grid',modeSeg('GRID',this.mode)+'<div class="chips" style="margin:10px 0">'+lgs+'</div><div class="stack"><div class="card" style="padding:12px">'+h+'</div>'+foot+'</div>');
  },
  open(k){
    const st=this.st;if(st.done)return;
    if(!st.t0){st.t0=Date.now();this.save();}
    const a=st.rows[Math.floor(k/3)],b=st.cols[k%3];
    pickPlayerSheet(esc(catLabel(a))+' × '+esc(catLabel(b)),'اختر لاعبًا يحقق الشرطين.',p=>this.guess(k,p),{isUsed:p=>st.used.includes(p.q)});
  },
  guess(k,p){
    const st=this.st;if(st.done)return;
    if(this.sets[k].includes(p.q)){
      st.used.push(p.q);
      if(st.cells[k]===undefined){st.cells[k]=p.q;toast('صح! '+p.n);}else{st.extra++;toast('إجابة إضافية صحيحة +١');}
    } else toast('خطأ: '+p.n+' لا يحقق الشرطين');
    this.save();this.draw();
  },
  share(){const st=this.st;let g='';for(let i=0;i<3;i++){for(let j=0;j<3;j++)g+=st.cells[i*3+j]!==undefined?'🟩':'⬜';g+='\n';}share('تحدّي الكورة · شبكة الكورة #'+DAYNO+'\n'+Object.keys(st.cells).length+'/9 · '+(Object.keys(st.cells).length+st.extra)+' إجابة\n'+g);}
};
registerGame({id:'grid',name:'شبكة الكورة',desc:'أكمل شبكة ٣×٣ في ٣ دقائق',color:'linear-gradient(160deg,#C9A24A,#8E6C1E)',ic:'#',obj:GRID,
 help:'<h3>طريقة لعب «شبكة الكورة»</h3><ol><li>كل صف وعمود شرط: نادٍ، منتخب، دوري لعب فيه، أو جائزة.</li><li>في كل خانة اختر لاعبًا يحقق شرط صفها وعمودها.</li><li>عندك <b>٣ دقائق</b> تبدأ مع أول خانة تفتحها.</li><li>بعد إكمال الشبكة استمر في ذكر لاعبين صحيحين لتزيد نقاطك.</li><li>لا يمكن استخدام اللاعب نفسه مرتين.</li><li>اختر الدوري: عالمي، إنجلترا، إسبانيا، إيطاليا، أو السعودية.</li></ol><p class="muted small">«لعب في دولة» يعني أنه لعب لنادٍ من دوري تلك الدولة، ولا يشمل لاعبيها المحليين.</p>'});
