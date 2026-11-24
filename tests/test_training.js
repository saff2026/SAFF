const { chromium } = require('playwright');
const SP = process.argv[2], MODE = process.argv[3]; // 'local' | 'cloud'
const fs=require('fs');
(async()=>{
  const browser=await chromium.launch();
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:'ar',colorScheme:process.argv[4]||'light'});
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push('PAGEERR '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/net::|Failed to load resource/.test(m.text()))errors.push('CONSOLE '+m.text());});
  const mock=fs.readFileSync(__dirname+'/fbmock.js','utf8');
  await page.route(/gstatic\.com|googleapis\.com/,r=>{
    const u=r.request().url();
    if(MODE==='cloud'&&u.includes('firebase-app-compat'))return r.fulfill({status:200,contentType:'application/javascript',body:mock});
    if(MODE==='cloud'&&u.includes('firebasejs'))return r.fulfill({status:200,contentType:'application/javascript',body:'/*noop*/'});
    return r.abort();
  });
  await page.route(/cdn\.jsdelivr\.net\/npm\/@vladmandic\/face-api@1\.7\.13\/(.*)$/,r=>{const m=r.request().url().match(/face-api@1\.7\.13\/(.*)$/);const p=SP+'/fa/package/'+m[1];if(!fs.existsSync(p))return r.fulfill({status:404,body:''});return r.fulfill({status:200,contentType:p.endsWith('.js')?'application/javascript':p.endsWith('.json')?'application/json':'application/octet-stream',body:fs.readFileSync(p)});});
  const shot=async n=>page.screenshot({path:`${SP}/${MODE}-${process.argv[4]||'light'}-${n}.png`,fullPage:true});
  const ok=(c,m)=>{ if(!c){ console.log('❌ FAIL: '+m); process.exitCode=1;} else console.log('✓ '+m); };
  await page.addInitScript(()=>{try{localStorage.setItem('saff_tr_open','*')}catch(e){}});await page.goto('http://127.0.0.1:8765/training.html');
  await page.waitForSelector('#pg-home.active');
  ok(await page.isVisible('#bnLocal')===(MODE==='local'),'storage banner correct for mode');
  await shot('01-home-empty');
  // viewer cannot see add button
  await page.click('[data-t=players]');
  ok(!(await page.isVisible('#addPlayer')),'viewer has no add button');
  // wrong code
  await page.click('#coachBtn'); await page.fill('#cc','0000'); await page.click('#ccBtn');
  ok(await page.isVisible('#cc'),'wrong code rejected');
  await page.fill('#cc','062001'); await page.click('#ccBtn');
  await page.waitForTimeout(100);
  ok((await page.textContent('#coachBtn')).includes('مجلس الإدارة')&&(await page.getAttribute('#coachBtn','class')).includes('coach'),'board access on');
  // add players
  const roster=[['محمد العويس',1,32,'R','GK','',{gk:84,phy:70,pas:60,def:55}],['نواف العقيدي',21,24,'R','GK','',{gk:78}],
   ['سالم الدوسري',10,33,'L','LW','ST',{pac:84,dri:86,sho:82,pas:78}],['فراس البريكان',9,24,'R','ST','RW',{sho:80,pac:78}],
   ['سعود عبدالحميد',12,26,'R','RB','RW',{pac:82,def:72}],['علي البليهي',5,35,'R','CB','',{def:80,phy:78}],
   ['حسان تمبكتي',4,25,'R','CB','CM',{def:79,phy:80}],['ياسر الشهراني',13,33,'L','LB','LW',{def:73,pac:74}],
   ['محمد كنو',23,30,'R','CM','',{pas:76,def:70,phy:78}],['عبدالإله المالكي',8,30,'R','CM','',{def:74,pas:72}],
   ['ناصر الدوسري',16,26,'R','CM','',{pas:75,dri:74}],['مصعب الجوير',17,22,'R','CM','',{pas:77,dri:78}],
   ['عبدالله الحمدان',19,25,'R','ST','',{sho:75,pac:72}],['أيمن يحيى',11,24,'R','RW','LW',{pac:83,dri:79}],['لاعب إضافي',30,19,'B','CM','',{}]];
  for(const r of roster){
    await page.click('#addPlayer');
    await page.fill('#f_name',r[0]); await page.fill('#f_age',String(r[2]));
    await page.click(`#f_foot >> text=${{R:'اليمنى',L:'اليسرى',B:'كلتاهما'}[r[3]]}`);
    await page.selectOption('#f_pos',r[4]); if(r[5])await page.selectOption('#f_pos2',r[5]);
    for(const [k,v] of Object.entries(r[6])) await page.$eval('#f_'+k,(el,v)=>{el.value=v;el.dispatchEvent(new Event('input'));},v);
    await page.click('#f_save');
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(100);
  ok((await page.$$('.pcard')).length===roster.length,'all '+roster.length+' players added');
  // duplicate name
  await page.click('#addPlayer'); await page.fill('#f_name','علي البليهي'); await page.click('#f_save');
  ok(await page.isVisible('#ov.show #f_name'),'duplicate name blocked'); await page.click('#ov .m-x'); await page.waitForTimeout(400);
  // filter + search
  await page.click('.cap >> text=حراس'); ok((await page.$$('.pcard')).length===2,'GK filter shows 2');
  await page.click('.cap >> text=الكل'); await page.fill('#pSearch','سالم'); await page.waitForTimeout(50);
  ok((await page.$$('.pcard')).length===1,'search works'); await page.fill('#pSearch',''); await page.waitForTimeout(50);
  await shot('02-players');
  // sort button: age ascending
  await page.click('#sortBtn'); await page.click('.sortopt[data-k=age][data-d=asc]'); await page.waitForTimeout(450);
  const ages=await page.$$eval('.pcard .pc-meta',e=>e.map(x=>+(x.textContent.match(/(\d+) سنة/)||[0,0])[1]));
  ok(ages.every((a,i)=>i==0||a>=ages[i-1]),'sort by age ascending works');
  await page.click('#sortBtn'); await page.click('.sortopt[data-k=ovr][data-d=asc]'); await page.waitForTimeout(450);
  const ovs=await page.$$eval('.pcard .ovr b',e=>e.map(x=>+x.textContent));
  ok(ovs.every((a,i)=>i==0||a>=ovs[i-1]),'sort by rating low to high works');
  await page.click('#sortBtn'); await page.click('.sortopt[data-k=ovr][data-d=desc]'); await page.waitForTimeout(450);
  const ovd=await page.$$eval('.pcard .ovr b',e=>e.map(x=>+x.textContent));
  ok(ovd.every((a,i)=>i==0||a<=ovd[i-1]),'sort by rating high to low works');
  ok(!(await page.$eval('#pg-players',e=>e.innerHTML.includes('الرقم'))),'no shirt number on players page');
  const gk=await page.evaluate(()=>{const p=Object.values(S.players).find(p=>p.name==='محمد العويس');return [ovr(p),Math.round(p.attrs.gk*.8+p.attrs.pas*.2),cardAttrs(p).join(',')];});
  ok(gk[0]===gk[1]&&gk[2]==='gk,pas','GK rating = goalkeeping+passing only ('+gk[0]+'), card shows '+gk[2]);
  await page.click('.pcard >> text=محمد العويس'); await page.click('#editPlayer');
  const vis=await page.$$eval('#f_attrs .slider',e=>e.filter(x=>x.style.display!=='none').map(x=>x.dataset.a).join(','));
  ok(vis==='pas,gk','GK form shows only passing and goalkeeping ('+vis+')');
  ok(!(await page.isVisible('#f_num')),'no shirt number field');
  await page.click('#f_traits .trait[data-k="press"]'); await page.click('#f_traits .trait[data-k="stamina"]');
  await page.click('#f_sm button[data-v="5"]'); await page.click('#f_wf button[data-v="2"]');
  ok((await page.$$('#f_sm button.on')).length===5&&(await page.$$('#f_wf button.on')).length===2,'star pickers work');
  await page.click('#f_save'); await page.waitForTimeout(500);
  const st=await page.evaluate(()=>{const p=Object.values(S.players).find(p=>p.name==='محمد العويس');return [p.sm,p.wf];});
  ok(st[0]===5&&st[1]===2,'skill/weak-foot stars saved ('+st.join('/')+')');
  const tr=await page.evaluate(()=>{const p=Object.values(S.players).find(p=>p.name==='محمد العويس');return [traitsOf(p).join(','),ovr(p)];});
  ok(tr[0]==='press,stamina','traits saved ('+tr[0]+')');
  ok(await page.$eval('.pcard >> nth=0',()=>true).catch(()=>true)&&await page.evaluate(()=>{const c=[...document.querySelectorAll('.pcard')].find(e=>e.textContent.includes('محمد العويس'));return !!c&&c.querySelectorAll('.pc-stars .stars').length===2;}),'stars shown on player card');
  // open profile & edit
  await page.click('.pcard >> text=سالم الدوسري');
  ok(await page.isVisible('#ov.show'),'profile modal opens');
  await shot('03-profile');
  await page.click('#editPlayer'); ok(await page.isVisible('#f_name'),'edit form opens');
  await page.fill('#f_age','34'); await page.click('#f_save'); await page.waitForTimeout(80);
  ok(await page.$eval('#pg-players',e=>e.textContent.includes('34 سنة')),'edit saved');
  await page.waitForTimeout(400); ok(!(await page.isVisible('#ov.show')),'form closed after save');
  // session
  await page.click('[data-t=session]');
  await page.click('#newSess');
  await page.click('#ns_size >> text=7'); 
  await page.click('#ns_save'); await page.waitForSelector('#invOut',{timeout:5000}); ok((await page.inputValue('#invOut')).length>10,'invite message shown after creating a session'); await page.evaluate(()=>closeModal()); await page.waitForTimeout(400);
  ok(await page.isVisible('.pitch'),'session created with pitch');
  ok((await page.$$('.tok:not(.subtok)')).length===14,'14 slots (7v7)');
  await page.click('[data-t=home]'); await page.waitForTimeout(400);
  ok(await page.$eval('#pg-home',e=>{const lv=!!liveState(openSession());return e.textContent.includes(Date.now()>=startTs(openSession())?'التمرين الحالي':'التمرين القادم')&&(lv?!!e.querySelector('#upcomingCard .nums'):!e.querySelector('#upcomingCard .nums'));}),'home shows the training (live score once it started)');
  await page.click('[data-t=session]'); await page.waitForTimeout(300);
  await page.click('#attAll'); await page.waitForTimeout(80);
  await page.click('#attToggle'); await page.waitForTimeout(100);
  ok((await page.$$('.attrow.on')).length===15,'all attendance (dropdown open, grouped)');
  ok((await page.$$('#pg-session .att-gh')).length===4,'attendance grouped by 4 position groups');
  await page.click('#attG-gk'); await page.waitForTimeout(80); ok((await page.$$('.attrow.on')).length===13,'group untick removes 2 goalkeepers');
  await page.click('#attG-gk'); await page.waitForTimeout(80); ok((await page.$$('.attrow.on')).length===15,'group tick re-adds goalkeepers');
  await page.click('#autoBal'); await page.waitForTimeout(120);
  const filled=(await page.$$('.tok:not(.empty):not(.subtok)')).length; ok(filled===14,'auto-balance filled 14 slots (got '+filled+')');
  const str=await page.$$eval('.teams-h2 .tag',e=>e.map(x=>+x.textContent.replace(/[^0-9]/g,''))); ok(Math.abs(str[0]-str[1])<=3,'teams balanced '+str.join(' vs '));
  const gkOK=await page.evaluate(()=>{const s=openSession();const sl=slotsOf(s);return ['A','B'].every(t=>{const g=sl.find(x=>x.pos==='GK');return P(s.teams[t].slots[g.id]).pos==='GK';});});
  ok(gkOK,'each team got a real GK');
  const before0=await page.evaluate(()=>JSON.stringify(Object.values(S.players).map(p=>ovr(p))));
  // give 4 players 'stamina' (saved like the form does), rebalance, check spread and that ratings did not change
  await page.evaluate(()=>{const m={};Object.keys(S.players).filter(id=>S.players[id].pos!=='GK').slice(0,4).forEach(id=>{m['players/'+id+'/traits']={stamina:true};});putMany(m);});
  await page.waitForTimeout(300); await page.evaluate(()=>autoBalance()); await page.waitForTimeout(300);
  const tb=await page.evaluate(b0=>{const s2=openSession();const cnt=t=>teamPlayers(s2,t).filter(id=>S.players[id].traits&&S.players[id].traits.stamina).length;
    const after=JSON.stringify(Object.values(S.players).map(p=>ovr(p)));return [cnt('A'),cnt('B'),b0===after];},before0);
  ok(Math.abs(tb[0]-tb[1])<=1&&tb[2],'traits spread evenly between teams ('+tb[0]+' vs '+tb[1]+'), ratings unchanged');
  const nonum=await page.evaluate(()=>[...document.querySelectorAll('#pg-session .tok[data-pid]')].every(t=>!/[0-9]/.test(t.querySelector('.sh').textContent)&&!t.querySelector('.ov')));
  ok(nonum,'no ratings shown on the lineup (photo or initial only)');
  const pk=await page.evaluate(()=>{openSlot('A','s1');const ok2=[...document.querySelectorAll('#ov.show .picker .li')].every(li=>true);const vals=[...document.querySelectorAll('#ov.show .picker .li .v')].map(e=>+e.textContent);const names=[...document.querySelectorAll('#ov.show .picker .li .t')].map(e=>e.childNodes[0].textContent.trim());closeModal();return names.every((n,i)=>{const p=Object.values(S.players).find(x=>x.name===n);return p&&ovr(p)===vals[i];});});
  ok(pk,'position picker shows each player\'s own rating');
  const rot=await page.evaluate(()=>{const s=openSession();const t=subsOf(s,'A').length?'A':'B';const pl=rotationPlan(s,t,'att');const sl=slotsOf(s);
    const gk=s.teams[t].slots[sl.find(x=>x.pos==='GK').id];const outs=pl.steps.map(x=>x.out);
    const chain=pl.steps.every((x,i)=>i===0?subsOf(s,t).includes(x.inn):x.inn===pl.steps[i-1].out);
    return {subs:subsOf(s,'A').length+subsOf(s,'B').length,steps:pl.steps.length,uniq:new Set(outs).size,gkOut:outs.includes(gk),chain,firstPos:pl.steps[0].outPos,pct:Math.round(pl.fitTotal/pl.slotsTotal*100)};});
  ok(rot.subs===1,'15 players for 7v7 -> 1 substitute');
  ok(rot.steps===6&&rot.uniq===6&&!rot.gkOut&&rot.chain,'rotation: 6 changes, every outfield player rests once, GK stays, each change brings back the previous one ('+JSON.stringify(rot)+')');
  ok(['ST','LW','RW'].includes(rot.firstPos),'attack-to-defense rotation starts from attack ('+rot.firstPos+')');
  ok(await page.isVisible('.rotstep'),'rotation order shown on page');
  await page.click('#rot-def'); await page.waitForTimeout(150);
  const fp=await page.evaluate(()=>{const s=openSession();const t=subsOf(s,'A').length?'A':'B';return rotationPlan(s,t,s.rotDir).steps[0].outPos;});
  ok(['CB','LB','RB'].includes(fp),'defense-to-attack rotation starts from defense ('+fp+')');
  // different formation per team
  await page.click('#formB'); await page.click('#ov.show .formopt[data-f="3-2-1"]'); await page.waitForTimeout(300);
  const pf2=await page.evaluate(()=>{const s=openSession();return [teamForm(s,'A'),teamForm(s,'B'),slotsOf(s,'B').map(x=>x.pos).join(','),slotPlayers(s,'B').length];});
  ok(pf2[0]==='2-3-1'&&pf2[1]==='3-2-1'&&pf2[2]==='GK,LB,CB,RB,CM,CM,ST'&&pf2[3]===7,'each team keeps its own formation, players re-placed ('+pf2.join(' | ')+')');
  await page.click('#formB'); await page.click('#ov.show .formopt[data-f="2-3-1"]'); await page.waitForTimeout(300);
  ok(await page.isVisible('.pitch .pteam.A')&&await page.isVisible('.pitch .pteam.B'),'team names shown on each half of the pitch');
  await page.click('#rot-att'); await page.waitForTimeout(150);
  await shot('04b-rotation');
  await page.click('#lineupImg'); await page.waitForSelector('#ov.show img.lineup-img',{timeout:20000}); await page.waitForTimeout(300);
  const li=await page.$eval('#ov.show img.lineup-img',e=>[e.naturalWidth,e.naturalHeight,e.src.length]);
  ok(li[0]===2160&&li[1]===2160,'lineup image created (HD) ('+li[0]+'x'+li[1]+')');
  ok(await page.isVisible('#imgDl'),'download button shown');
  if(MODE==='local'&&(process.argv[4]||'light')==='light'){const src=await page.$eval('#ov.show img.lineup-img',e=>e.src);require('fs').writeFileSync(SP+'/lineup.png',Buffer.from(src.split(',')[1],'base64'));}
  await page.click('#ov .m-x'); await page.waitForTimeout(400);
  await shot('04-lineup');
  // swap via slot picker
  const before=await page.evaluate(()=>{const s=openSession();return [s.teams.A.slots.s6,s.teams.B.slots.s6];});
  await page.locator('.tok.A').nth(6).click();
  ok(await page.isVisible('.picker'),'slot picker opens');
  await page.click(`.picker .li >> text=${await page.evaluate(id=>pname(id),before[1])}`); await page.waitForTimeout(80);
  const after=await page.evaluate(()=>{const s=openSession();return [s.teams.A.slots.s6,s.teams.B.slots.s6];});
  ok(after[0]===before[1]&&after[1]===before[0],'swap between teams works');
  // goals
  const aST=await page.evaluate(()=>{const s=openSession();return pname(s.teams.A.slots.s6);});
  for(let i=0;i<2;i++){ await page.click('#addGoal'); await page.selectOption('#g_s',{label:aST}); await page.waitForTimeout(30);
    await page.selectOption('#g_a',{index:2}); await page.click('#g_save'); await page.waitForTimeout(60);}
  await page.click('#addGoal'); await page.click('#modal .seg button >> nth=1'); await page.click('#g_save'); await page.waitForTimeout(60);
  ok((await page.textContent('#pg-session .score .nums')).replace(/[\s–-]/g,'')==='21','score 2-1 from goals');
  const pos=await page.evaluate(()=>{const sp=document.querySelectorAll('#pg-session .score .nums span');const a=document.querySelector('#pg-session .score .tm');return [sp[0].getBoundingClientRect().x,sp[1].getBoundingClientRect().x,a.getBoundingClientRect().x];});
  ok(pos[0]>pos[1]&&pos[2]>pos[0],'team A score shown next to team A (right side)');
  // delete a goal then re-add
  await page.locator('.gx').last().click(); await page.click('#cfYes'); await page.waitForTimeout(60);
  ok((await page.textContent('#pg-session .score .nums')).replace(/[\s–-]/g,'')==='20','goal deleted -> 2-0');
  // check-in at the field
  await page.click('#checkinBtn'); await page.waitForTimeout(400);
  ok(await page.isVisible('#ov.show .ci-ok'),'check-in sheet opens with on-time / late / absent');
  const cid=await page.$eval('#ov.show .cirow',e=>e.dataset.id);
  const ciSt=()=>page.evaluate(id=>{const s=openSession();return [ciStatus(s,id),!!s.checkin[id],participants(s).includes(id)];},cid);
  await page.click(`#ov.show .cirow[data-id="${cid}"] .ci-ok`); await page.waitForTimeout(200);
  let r=await ciSt(); ok(r[0]==='ok'&&r[1],'manual: on time');
  await page.click(`#ov.show .cirow[data-id="${cid}"] .ci-late`); await page.waitForTimeout(200);
  r=await ciSt(); ok(r[0]==='late'&&r[1],'manual: late');
  await page.click(`#ov.show .cirow[data-id="${cid}"] .ci-abs`); await page.waitForTimeout(200);
  r=await ciSt(); ok(r[0]==='abs'&&!r[1]&&!r[2],'manual: absent (not counted as playing)');
  await page.click(`#ov.show .cirow[data-id="${cid}"] .ci-abs`); await page.waitForTimeout(200);
  r=await ciSt(); ok(r[0]===''&&r[2],'tapping the active status again clears it');
  await page.click(`#ov.show .cirow[data-id="${cid}"] .ci-ok`); await page.waitForTimeout(200);
  const lt=await page.evaluate(()=>{const s=JSON.parse(JSON.stringify(openSession()));s.time='10:00';s.date='2026-01-05';return [lateMin(s,new Date(2026,0,5,10,12,30).getTime()),lateMin(s,new Date(2026,0,5,9,55).getTime())];});
  ok(lt[0]===12&&lt[1]===0,'late minutes computed correctly (12 / 0)');
  await shot('05a-checkin'); await page.click('#ov .m-x'); await page.waitForTimeout(400);
  // ratings
  const n=await page.$$eval('.rrow',e=>e.length);
  for(let i=0;i<n;i++){ const plus=page.locator('.rrow').nth(i).locator('button').nth(1); const clicks=(i%5)+1; for(let c=0;c<clicks;c++){await plus.click();await page.waitForTimeout(15);} }
  await page.waitForTimeout(80);
  const rated=await page.evaluate(()=>Object.keys(openSession().ratings).length); ok(rated===n,'all '+n+' players rated');
  const mvp=await page.evaluate(()=>pname(autoMvp(openSession()))); ok(!!mvp,'auto MVP suggested: '+mvp);
  await page.fill('textarea','تمرين ممتاز وضغط عالي'); await page.evaluate(()=>document.activeElement&&document.activeElement.blur()); await page.waitForTimeout(60);
  ok(await page.evaluate(()=>openSession().notes)==='تمرين ممتاز وضغط عالي','notes saved');
  const mvpPick=await page.evaluate(()=>{const s=openSession();return participants(s).find(id=>id!==autoMvp(s));});
  await page.selectOption('#mvpSel',mvpPick); await page.waitForTimeout(100);
  ok(await page.evaluate(id=>openSession().mvp===id,mvpPick),'MVP chosen from dropdown');
  await page.selectOption('#mvpSel',''); await page.waitForTimeout(100);
  ok(await page.evaluate(()=>!openSession().mvp),'MVP dropdown back to automatic');
  await shot('05-session-full');
  // finish
  const exp1=await page.evaluate(()=>{const s=openSession();const ch=sessionChanges(s);const o={};Object.keys(ch).forEach(id=>o[id]=ch[id].after);return o;});
  const before1=await page.evaluate(()=>JSON.parse(JSON.stringify(Object.fromEntries(Object.values(S.players).map(p=>[p.id,p.attrs])))));
  await page.click('#finishBtn'); await page.click('#cfYes'); await page.waitForTimeout(900);
  const after1=await page.evaluate(()=>Object.fromEntries(Object.values(S.players).map(p=>[p.id,p.attrs])));
  ok(Object.keys(exp1).every(id=>JSON.stringify(after1[id])===JSON.stringify(exp1[id])),'attributes updated right after finishing training');
  ok(Object.keys(exp1).some(id=>JSON.stringify(after1[id])!==JSON.stringify(before1[id])),'some attributes actually changed');
  const cons=await page.evaluate(()=>{const s=doneSessions()[0];return Object.values(s.upd).every(c=>c.perf==null||(c.perf>c.exp+0.6?c.ovrA>=c.ovrB:true)&&(c.perf<c.exp-0.6?c.ovrA<=c.ovrB:true));});
  ok(cons,'model: better-than-expected never drops, worse-than-expected never rises');
  const elo=await page.evaluate(()=>{const s=JSON.parse(JSON.stringify(openSession()||doneSessions()[0]));return 1;});
  const gku=await page.evaluate(()=>{const s=doneSessions()[0];const p=Object.values(S.players).find(p=>p.name==='محمد العويس');const c=s.upd[p.id];return !c||!c.d||Object.keys(c.d).every(k=>k==='gk'||k==='pas');});
  ok(gku,'GK update only touches goalkeeping/passing');
  ok(await page.isVisible('#ov.show #updSec .updrow'),'training detail opens with attribute changes');
  await shot('06b-changes'); await page.click('#ov .m-x'); await page.waitForTimeout(400);
  ok(await page.isVisible('#pg-archive.active'),'moved to archive');
  ok((await page.$$('#pg-archive .li')).length===1,'archive has 1 session');
  await shot('06-archive');
  await page.click('#pg-archive .li'); ok(await page.isVisible('#ov.show .pitch'),'session detail opens');
  await shot('07-detail'); await page.click('#ov .m-x'); await page.waitForTimeout(400);
  // second session in an earlier week (via settings date) to test week ordering + absence
  await page.click('[data-t=session]'); await page.click('#newSess');
  await page.fill('#ns_date','2026-11-01'); await page.click('#ns_size >> text=5'); await page.click('#ns_save'); await page.waitForSelector('#invOut',{timeout:5000}); ok((await page.inputValue('#invOut')).length>10,'invite message shown after creating a session'); await page.evaluate(()=>closeModal()); await page.waitForTimeout(400);
  ok((await page.$$('.tok:not(.subtok)')).length===10,'5v5 -> 10 slots');
  await page.evaluate(()=>{PER_POS=99;render();}); // إخفاء الباقي عند اكتمال المركز له اختبار خاص (perpos.js)
  if(!(await page.isVisible('.attrow'))) await page.click('#attToggle');
  for(const nm of ['محمد العويس','نواف العقيدي','سالم الدوسري','فراس البريكان','علي البليهي','حسان تمبكتي','محمد كنو','مصعب الجوير','أيمن يحيى','ناصر الدوسري','لاعب إضافي']){ await page.click(`.attrow >> text=${nm}`); await page.waitForTimeout(25);}
  await page.click('.attrow >> text=ياسر الشهراني'); await page.waitForTimeout(60);
  await page.click('.attrow >> text=عبدالإله المالكي'); await page.waitForTimeout(60);
  ok(await page.evaluate(()=>listCount(openSession()))===12,'list capped at 12 for 5v5 (13th blocked)');
  await page.click('#autoBal'); await page.waitForTimeout(100);
  ok((await page.$$('.tok:not(.empty):not(.subtok)')).length===10,'5v5 filled');
  ok(await page.evaluate(()=>{const s=openSession();return subsOf(s,'A').length===1&&subsOf(s,'B').length===1;}),'one sub per team');
  ok((await page.$$('#pg-session .tok.subtok')).length===2,'each sub shown in the corner of the pitch');
  ok(!(await page.isVisible('#pg-session >> text=خارج التشكيلة')),'out-of-lineup list removed');
  // change formation in settings keeps players
  await page.click('#editSess'); await page.click('#ns_size >> text=6'); await page.click('#ns_save'); await page.waitForTimeout(100);
  ok((await page.$$('.tok:not(.empty):not(.subtok)')).length===11 || (await page.$$('.tok:not(.empty):not(.subtok)')).length===10,'formation change keeps players');
  const r2=await page.$$eval('.rrow',e=>e.length);
  for(let i=0;i<r2;i++){await page.locator('.rrow').nth(i).locator('button').nth(1).click();await page.waitForTimeout(15);}
  await page.click('#addGoal'); await page.selectOption('#g_s',{index:1}); await page.click('#g_save'); await page.waitForTimeout(60);
  const saud0=await page.evaluate(()=>JSON.stringify(Object.values(S.players).find(p=>p.name==='سعود عبدالحميد').attrs));
  await page.click('#finishBtn'); await page.click('#cfYes'); await page.waitForTimeout(900); await page.click('#ov .m-x'); await page.waitForTimeout(400);
  ok((await page.$$('#pg-archive .li')).length===2,'archive has 2 sessions');
  ok(await page.evaluate(()=>JSON.stringify(Object.values(S.players).find(p=>p.name==='سعود عبدالحميد').attrs))===saud0,'absent player attributes unchanged');
  // reopen reverts, finishing again re-applies
  const sid2=await page.evaluate(()=>doneSessions().find(s=>s.date==='2026-11-01').id);
  const pre2=await page.evaluate(id=>{const s=S.sessions[id];const o={};Object.keys(s.upd).forEach(p=>{const a=JSON.parse(JSON.stringify(S.players[p].attrs));const d=s.upd[p].d||{};Object.keys(d).forEach(k=>a[k]-=d[k]);o[p]=a;});return o;},sid2);
  const post2=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.values(S.players).map(p=>[p.id,p.attrs]))));
  await page.evaluate(id=>openSessionDetail(id),sid2); await page.waitForTimeout(500);
  await page.click('#ov.show >> text=إعادة فتح'); await page.click('#cfYes'); await page.waitForTimeout(300);
  const rev=await page.evaluate(()=>Object.fromEntries(Object.values(S.players).map(p=>[p.id,p.attrs])));
  ok(Object.keys(pre2).every(id=>JSON.stringify(rev[id])===JSON.stringify(pre2[id])),'reopening a training reverts its attribute changes');
  await page.click('#finishBtn'); await page.click('#cfYes'); await page.waitForTimeout(900); await page.click('#ov .m-x'); await page.waitForTimeout(400);
  ok(await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.values(S.players).map(p=>[p.id,p.attrs]))))===post2,'finishing again re-applies the same changes');
  // stats
  await page.click('[data-t=stats]');
  ok(await page.$eval('#pg-stats',e=>e.textContent.includes(e.ownerDocument.defaultView.pname(Object.keys(e.ownerDocument.defaultView.computeStats()).sort((a,b)=>window.computeStats()[b].goals-window.computeStats()[a].goals)[0]))),'top scorer listed');
  ok(await page.$eval('#rulesSec',e=>e.textContent.includes('إيلو')&&!e.textContent.includes('+3')),'short rating-system card shown (no detailed rules)');
  await shot('08-stats');
  await page.click('[data-t=players]'); await shot('11-players-trend');
  await page.click('.pcard >> nth=0'); await page.waitForTimeout(400);
  ok(await page.isVisible('#ov.show .spark'),'profile shows rating progress chart'); await shot('12-profile-history'); await page.click('#ov .m-x'); await page.waitForTimeout(400);
  // photo upload
  const shotBuf=await page.screenshot();
  await page.click('.pcard >> text=سالم الدوسري'); await page.click('#editPlayer');
  await page.setInputFiles('#f_file',{name:'me.png',mimeType:'image/png',buffer:shotBuf}); await page.waitForSelector('#ov3.show #cropBox',{timeout:20000}); await page.waitForTimeout(300);
  ok(await page.isVisible('#ov3.show #cropBox'),'crop tool opens after choosing photo');
  const bb=await page.$eval('#cropBox',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
  await page.$eval('#cropZoom',e=>{e.value=2.5;e.dispatchEvent(new Event('input'));});
  await page.evaluate(()=>{CR.x=0;CR.y=0;cropDraw();});
  const c0=await page.evaluate(()=>[CR.x,CR.y]);
  await page.mouse.move(bb.x,bb.y); await page.mouse.down(); await page.mouse.move(bb.x+40,bb.y+30,{steps:5}); await page.mouse.up();
  const crs=await page.evaluate(c0=>[CR.scale,Math.round(CR.x-c0[0]),Math.round(CR.y-c0[1])],c0);
  ok(crs[0]===2.5&&crs[1]===40&&crs[2]===30,'zoom and drag work ('+crs.join(',')+')');
  await page.click('#cropOk'); await page.waitForTimeout(500);
  ok(await page.isVisible('#f_pv img.pv'),'photo preview shown');
  await page.click('#f_save'); await page.waitForTimeout(500);
  const ph=await page.evaluate(()=>{const p=Object.values(S.players).find(p=>p.name==='سالم الدوسري');return p.photo?[p.photo.slice(0,23),p.photo.length]:null;});
  ok(ph&&ph[0]==='data:image/jpeg;base64,'&&ph[1]<80000,'photo saved compressed ('+(ph?Math.round(ph[1]/1024)+'KB':'none')+')');
  ok(await page.isVisible('.pcard img.pc-photo'),'photo shows on player card');
  await page.click('.pcard >> text=سالم الدوسري'); await page.waitForTimeout(400); ok(await page.isVisible('#ov.show .ring img.ph'),'photo shows in profile'); await shot('12b-profile-photo');
  await page.click('#editPlayer'); await page.click('#f_rmphoto'); await page.click('#f_save'); await page.waitForTimeout(400);
  ok(await page.evaluate(()=>!Object.values(S.players).find(p=>p.name==='سالم الدوسري').photo),'photo can be removed');
  await page.click('.pcard >> text=سالم الدوسري'); await page.click('#editPlayer');
  await page.setInputFiles('#f_file',{name:'me.png',mimeType:'image/png',buffer:shotBuf}); await page.waitForSelector('#ov3.show #cropBox',{timeout:20000}); await page.waitForTimeout(300); await page.click('#cropOk'); await page.waitForTimeout(500); await page.click('#f_save'); await page.waitForTimeout(400);
  // bulk import: file name = player name (with spelling variations)
  await page.setInputFiles('#bulkFiles',[{name:'علي البليهي.jpg',mimeType:'image/png',buffer:shotBuf},{name:'حسان_تمبكتي.png',mimeType:'image/png',buffer:shotBuf},{name:'محمد كنّو.jpeg',mimeType:'image/png',buffer:shotBuf},{name:'شخص مجهول.jpg',mimeType:'image/png',buffer:shotBuf}]);
  await page.waitForSelector('#ov.show .bulk-row',{timeout:30000});
  ok(await page.isVisible('#ov.show .bulk-row'),'bulk photo sheet opens');
  const bm=await page.evaluate(()=>BULK.map(b=>b.pid?pname(b.pid):null));
  ok(bm[0]==='علي البليهي'&&bm[1]==='حسان تمبكتي'&&bm[2]==='محمد كنو'&&bm[3]===null,'file names matched to players ('+JSON.stringify(bm)+')');
  await page.locator('#ov.show .bulk-row').nth(3).locator('select').selectOption({label:'ياسر الشهراني'}); await page.waitForTimeout(150);
  await page.locator('#ov.show .bulk-row').nth(0).locator('button').click(); await page.waitForTimeout(500);
  ok(await page.isVisible('#ov3.show #cropBox'),'adjust opens crop tool from bulk list'); await page.click('#cropOk'); await page.waitForTimeout(400);
  await shot('12c-bulk'); await page.click('#bulkSave'); await page.waitForTimeout(500);
  const withPh=await page.evaluate(()=>['علي البليهي','حسان تمبكتي','محمد كنو','ياسر الشهراني'].every(n=>!!Object.values(S.players).find(p=>p.name===n).photo));
  ok(withPh,'bulk save stored 4 photos (incl. manual pick)');
  // home
  await page.click('[data-t=home]'); await shot('13-home');
  ok(!(await page.isVisible('#pg-home .mvp')),'home has no best-player card');
  ok(await page.$eval('#pg-home',e=>e.textContent.includes('لاعبون في الفورمة')),'home shows most improved from last training');
  // reload persistence
  if(MODE==='local'){ await page.evaluate(()=>{localStorage.setItem('saff_tr_crowdintro','1');localStorage.setItem('saff_el_crowdintro','1');}); await page.reload(); await page.waitForSelector('#pg-home.active'); ok((await page.evaluate(()=>Object.keys(S.players).length))===roster.length,'data persists after reload'); }
  await page.click('[data-t=home]'); await page.waitForTimeout(300);
  ok(await page.$eval('#pg-home',e=>e.textContent.includes('التمرين السابق')&&!!e.querySelector('.score .nums')),'home shows previous training with score');
  // viewer mode
  await page.click('#coachBtn'); await page.click('#logoutBtn'); await page.waitForTimeout(60);
  await page.click('[data-t=archive]'); await page.click('#pg-archive .li >> nth=0');
  ok(!(await page.isVisible('#delSessDetail')),'viewer cannot delete'); await page.click('#ov .m-x'); await page.waitForTimeout(400);
  ok(!(await page.isVisible('[data-t=session]')),'players see only 4 pages (no training tab)');
  await page.click('[data-t=stats]'); ok(await page.$eval('#pg-stats',e=>e.textContent.includes('الأكثر تأخراً')),'stats has most-late board');
  ok(await page.evaluate(()=>{var n=0;var o=window.toast;window.toast=function(m){n++;o(m)};put('players/x',{name:'hack'});window.toast=o;return n===1&&!S.players.x;}),'viewer writes blocked');
  // desktop width
  await page.setViewportSize({width:1280,height:900}); await page.click('[data-t=players]'); await shot('14-desktop');
  // horizontal overflow check on phone
  await page.setViewportSize({width:360,height:740});
  for(const t of ['home','players','archive','stats']){ await page.click(`[data-t=${t}]`); const ov=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1); ok(!ov,'no horizontal scroll on '+t);}
  if(MODE==='cloud'){ ok(await page.evaluate(()=>window.__fbWrites)>50,'writes went to Firebase mock ('+await page.evaluate(()=>window.__fbWrites)+')'); }
  console.log(errors.length?'ERRORS:\n'+errors.join('\n'):'✓ no JS errors');
  if(errors.length)process.exitCode=1;
  await browser.close();
})().catch(e=>{console.log('CRASH',e.message);process.exit(1);});
