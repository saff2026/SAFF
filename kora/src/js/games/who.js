/* =================== من اللاعب؟ (Who Are Ya) =================== */
function curClub(p){
  for(let i=p.car.length-1;i>=0;i--){const c=p.car[i];if(c[2]==null&&c[1]&&c[1]>=2010)return c[0];}
  return null;
}
function isActive(p){return !!curClub(p)&&(!p.by||p.by>=1984);}
function photoURL(p,w){return p.img?'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(p.img)+'?width='+(w||240):null;}
const WHO={
  MAX:8,
  pool(){if(!this._pool)this._pool=D.P.filter(p=>isActive(p)&&p.pos&&p.fame>=55).sort((a,b)=>b.fame-a.fame).slice(0,700);return this._pool;},
  start(mode){
    mode=mode||this.mode||'daily';this.mode=mode;
    if(mode==='daily'){const t=dailyPick(this.pool(),'who');this.st=dayState('who',()=>({t:t.q,g:[],done:false,win:false}));if(this.st.t!==t.q)this.st={day:DAY,t:t.q,g:[],done:false,win:false};}
    else{const pl=this.pool();this.st={t:pl[Math.floor(Math.random()*pl.length)].q,g:[],done:false,win:false};}
    this.draw();
  },
  save(){if(this.mode==='daily')saveDay('who',this.st);},
  cmp(g,t){
    const out=[];const gc=curClub(g),tc=curClub(t);
    const gn=D.C[g.nat]||[],tn=D.C[t.nat]||[];
    out.push({c:g.nat===t.nat?'ok':(gn[2]&&gn[2]===tn[2]?'near':''),v:'<span class="big">'+(gn[1]||'')+'</span>'+esc(gn[0]||'')});
    const gl=(D.T[gc]||[])[1],tl=(D.T[tc]||[])[1];
    out.push({c:gl&&gl===tl?'ok':'',v:'<span class="big">'+flag(gl)+'</span>'+esc(cName(gl))});
    out.push({c:gc===tc?'ok':'',v:esc(tName(gc))});
    out.push({c:g.pos===t.pos?'ok':'',v:esc(g.pos||'—')});
    const ga=age(g),ta=age(t),d=ta-ga;
    out.push({c:d===0?'ok':(Math.abs(d)<=2?'near':''),v:'<span class="num">'+fmt(ga)+(d>0?' ↑':d<0?' ↓':'')+'</span>'});
    return out;
  },
  draw(){
    const st=this.st,t=D.byQ[st.t];
    const rows=st.g.map(q=>{const g=D.byQ[q];return '<div class="grow pop"><div class="nmc">'+esc(g.n)+'</div>'+this.cmp(g,t).map(c=>'<div class="cell '+c.c+'">'+c.v+'</div>').join('')+'</div>';}).join('');
    const left=this.MAX-st.g.length;
    const blur=st.done?0:Math.max(2,14-st.g.length*1.6);
    const img=photoURL(t,260);
    const pic=img?'<img class="photo" src="'+img+'" alt="" style="filter:blur('+blur+'px)'+(this.hidePic&&!st.done?';display:none':'')+'" onerror="this.remove()">':'';
    let top;
    if(st.done){
      top=resultCard({em:st.win?'🎉':'😔',title:t.n,sub:flag(t.nat)+' '+esc(cName(t.nat))+' · '+esc(t.pos||'')+' · '+esc(tName(curClub(t)))+'<br>'+(st.win?'عرفته في '+AR(st.g.length)+' محاولة':'انتهت المحاولات'),daily:this.mode==='daily',game:'who',share:'WHO.share()',again:"WHO.start('free')",againLabel:'لاعب آخر'});
      if(pic)top='<div class="card" style="display:flex;justify-content:center">'+pic+'</div>'+top;
    } else {
      top='<div class="card"><div class="mystery">'+(pic||'<div class="av">؟</div>')+'<div style="flex:1;min-width:0"><b class="disp">اللاعب الغامض</b><div class="muted small">لاعب حالي. باقي '+AR(left)+' من '+AR(this.MAX)+' محاولات</div><div style="margin-top:6px">'+livesHTML(left,this.MAX)+'</div>'+(img?'<button class="btn ghost small" style="padding:6px 0" onclick="WHO.hidePic=!WHO.hidePic;WHO.draw()">'+(this.hidePic?'أظهر الصورة':'أخفِ الصورة (أصعب)')+'</button>':'')+'</div></div>'+
        '<div style="margin-top:12px">'+acHTML('whoin')+'</div></div>';
    }
    screen('من اللاعب؟','who',modeSeg('WHO',this.mode)+'<div class="stack" style="margin-top:12px">'+top+
      (st.g.length?'<div class="card gtab"><div class="grow h"><div style="text-align:right">اللاعب</div><div>الجنسية</div><div>الدوري</div><div>النادي</div><div>المركز</div><div>العمر</div></div>'+rows+'</div>':'<div class="card muted small" style="text-align:center">اللاعب الغامض يلعب حاليًا. ابدأ بأي لاعب حالي تعرفه وستظهر المقارنة.</div>')+'</div>');
    if(!st.done)bindAC($('#whoin'),$('#whoinL'),p=>this.guess(p.q),{filter:isActive,isUsed:p=>st.g.includes(p.q)});
  },
  guess(q){
    const st=this.st;if(st.done||st.g.includes(q))return;
    st.g.push(q);
    if(q===st.t){st.done=true;st.win=true;}else if(st.g.length>=this.MAX){st.done=true;}
    if(st.done&&this.mode==='daily')recordResult('who',st.win);
    this.save();this.draw();
    if(!st.done){const f=$('#whoin');if(f)f.focus({preventScroll:true});}
  },
  share(){
    const st=this.st,t=D.byQ[st.t];const em=c=>c==='ok'?'🟩':c==='near'?'🟨':'⬛';
    share('تحدّي الكورة · من اللاعب؟ #'+DAYNO+'\n'+(st.win?st.g.length:'X')+'/'+this.MAX+'\n'+st.g.map(q=>this.cmp(D.byQ[q],t).map(c=>em(c.c)).join('')).join('\n'));
  }
};
registerGame({id:'who',name:'من اللاعب؟',desc:'٨ محاولات لتعرف اللاعب من الأدلة والصورة',color:'linear-gradient(160deg,#3A7BD5,#1F4E99)',ic:'؟',obj:WHO,
 help:'<h3>طريقة لعب «من اللاعب؟»</h3><ol><li>عندك <b>٨ محاولات</b> لتعرف لاعبًا حاليًا.</li><li>اكتب اسم لاعب حالي واختره من القائمة.</li><li>تظهر مقارنة: الجنسية، دوري ناديه، ناديه الحالي، المركز، العمر.</li><li><b style="color:var(--ok)">الأخضر</b> مطابق، <b style="color:var(--near)">الأصفر</b> قريب (نفس القارة، أو فرق سنتين أو أقل في العمر).</li><li>↑ يعني أن اللاعب الغامض أكبر سنًّا، و↓ أصغر.</li><li>إن توفرت صورة للاعب تظهر مموّهة وتتضح مع كل محاولة، ويمكنك إخفاؤها.</li></ol>'});
