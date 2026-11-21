/* =================== مولّد أسئلة القوائم (لاعبون يحققون شرطًا) =================== */
function catQuestion(cats){
  const lab=cats.map(c=>{
    if(c.k==='club')return 'لعبوا لنادي '+tName(c.v);
    if(c.k==='nat')return 'من '+cName(c.v);
    if(c.k==='lg')return 'أجانب لعبوا في دوري '+cName(c.v);
    if(c.k==='aw')return 'فازوا بجائزة '+(D.A[c.v]||'');
    return catLabel(c);
  });
  return 'لاعبون '+lab.join(' و');
}
/* يرجع سؤالًا عشوائيًا: {t, cats, ans:[players sorted by fame]} */
function makeQuestion(r,opt){
  opt=opt||{};const C=allCats();const minA=opt.min||8,maxA=opt.max||400;
  for(let t=0;t<3000;t++){
    const kind=r();let cats;
    if(kind<0.35)cats=[pickN(C.club,1,r)[0]];
    else if(kind<0.7)cats=[pickN(C.club,1,r)[0],pickN(C.nat,1,r)[0]];
    else if(kind<0.85)cats=[pickN(C.club,2,r)].flat();
    else if(kind<0.93)cats=[pickN(C.lg,1,r)[0]];
    else cats=[pickN(C.aw.filter(c=>c.n>=8),1,r)[0]];
    if(cats.some(c=>!c))continue;
    const ans=playersFor(cats,opt.minFame||0).sort((a,b)=>b.fame-a.fame);
    if(ans.length<minA||ans.length>maxA)continue;
    if(opt.famousTop&&ans.slice(0,opt.famousTop).some(p=>p.fame<opt.topFame))continue;
    return {t:catQuestion(cats),cats,ans};
  }
  return null;
}
/* شكل موحّد لإدخال إجابة لاعب مع البحث */
function answerBox(id,ph){return acHTML(id,ph||'اكتب اسم لاعب…');}
