/* =================== تحدي المسيرة (Career Path) =================== */
const CAREER={
  LV:{easy:['سهل',180],normal:['متوسط',90],hard:['صعب',45]},
  pool(lv){
    const min=this.LV[lv][1],max=lv==='easy'?99999:(lv==='normal'?180:90);
    return D.P.filter(p=>p.fame>=min&&p.fame<max&&p.car.length>=3&&p.car.length<=10&&p.car.every(c=>c[1]));
  },
  start(mode,lv){
    mode=mode||this.mode||'daily';this.mode=mode;lv=lv||this.lv||'normal';this.lv=lv;
    const pool=this.pool(lv).sort((a,b)=>a.q<b.q?-1:1);
    if(mode==='daily'){const t=dailyPick(pool,'career-'+lv);const k='career-'+lv;let st=store.get('day:'+k,null);if(!st||st.day!==DAY||st.t!==t.q)st={day:DAY,t:t.q,g:[],done:false,win:false};this.st=st;}
    else this.st={t:pool[Math.floor(Math.random()*pool.length)].q,g:[],done:false,win:false};
    this.draw();
  },
  save(){if(this.mode==='daily'){store.set('day:career-'+this.lv,this.st);store.set('day:career',{day:DAY,done:this.st.done});}},
  draw(){
    const st=this.st,t=D.byQ[st.t],car=t.car,MAX=car.length;
    const shown=st.done?MAX:Math.min(MAX,1+st.g.length);
    const rows=car.map((c,i)=>{const vis=i<shown;return '<tr class="'+(vis?'':'hid')+'"><td class="n">'+(vis?fmtYears(c[1],c[2]):'••••')+'</td><td>'+(vis?(c[5]?'← ':'')+esc(tName(c[0]))+(c[5]?' <span class="muted small">(إعارة)</span>':''):'نادٍ مخفي')+'</td><td class="n">'+(vis&&c[3]!=null?AR(c[3])+' ('+AR(c[4]||0)+')':'')+'</td></tr>';}).join('');
    const left=MAX-st.g.length;
    const wrong=st.g.filter(q=>q!==st.t).map(q=>'<span>'+esc(D.byQ[q].n)+'</span>').join('');
    let top;
    if(st.done)top=resultCard({em:st.win?'🎯':'😔',title:t.n,sub:flag(t.nat)+' '+esc(cName(t.nat))+'<br>'+(st.win?'عرفته في '+AR(st.g.length)+' من '+AR(MAX)+' محاولات':'انتهت المحاولات'),daily:this.mode==='daily',game:'career',share:'CAREER.share()',again:"CAREER.start('free')",againLabel:'مسيرة أخرى'});
    else top='<div class="card"><div class="tagrow"><b class="disp">من صاحب هذه المسيرة؟</b><span class="pill num">'+AR(left)+' محاولات</span></div><p class="muted small" style="margin:4px 0 10px">عدد المحاولات = عدد الأندية، وكل تخمين خاطئ يكشف النادي التالي.</p>'+acHTML('cin')+(wrong?'<div class="wrong" style="margin-top:10px">'+wrong+'</div>':'')+'</div>';
    const lv=Object.keys(this.LV).map(k=>'<button class="chip '+(k===this.lv?'on':'')+'" onclick="CAREER.start(CAREER.mode,\''+k+'\')">'+this.LV[k][0]+'</button>').join('');
    screen('تحدي المسيرة','career',modeSeg('CAREER',this.mode)+'<div class="chips" style="margin:10px 0">'+lv+'</div><div class="stack">'+top+
      '<div class="card" style="overflow-x:auto"><table class="ctable"><thead><tr><th>السنوات</th><th>النادي</th><th style="text-align:center">مباريات (أهداف)</th></tr></thead><tbody>'+rows+'</tbody></table></div></div>');
    if(!st.done)bindAC($('#cin'),$('#cinL'),p=>this.guess(p.q),{isUsed:p=>st.g.includes(p.q)});
  },
  guess(q){
    const st=this.st,t=D.byQ[st.t];if(st.done||st.g.includes(q))return;
    st.g.push(q);
    if(q===st.t){st.done=true;st.win=true;}else if(st.g.length>=t.car.length)st.done=true;
    if(st.done&&this.mode==='daily')recordResult('career',st.win);
    this.save();this.draw();
    if(!st.done){toast('ليس هو، انكشف نادٍ جديد');const f=$('#cin');if(f)f.focus({preventScroll:true});}
  },
  share(){const st=this.st,t=D.byQ[st.t];share('تحدّي الكورة · تحدي المسيرة #'+DAYNO+' ('+this.LV[this.lv][0]+')\n'+(st.win?st.g.length:'X')+'/'+t.car.length+' '+st.g.map(q=>q===st.t?'🟩':'🟥').join(''));}
};
registerGame({id:'career',name:'تحدي المسيرة',desc:'اعرف اللاعب من جدول أنديته كما في ويكيبيديا',color:'linear-gradient(160deg,#D2524B,#9A2B26)',ic:'↗',obj:CAREER,
 help:'<h3>طريقة لعب «تحدي المسيرة»</h3><ol><li>يظهر أول نادٍ في مسيرة لاعب مشهور مع السنوات وعدد المباريات والأهداف.</li><li>عدد محاولاتك = عدد الأندية التي لعب لها.</li><li>كل تخمين خاطئ يكشف النادي التالي.</li><li>اختر المستوى: سهل (نجوم كبار)، متوسط، صعب.</li></ol><p class="muted small">جدول المسيرة من صندوق معلومات اللاعب في ويكيبيديا (الفريق الأول فقط، بدون فرق الشباب).</p>'});
