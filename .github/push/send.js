// تذكيرات «تمرين ساف» و«تمرين نخبة السبت»: تشتغل كل 10 دقائق من GitHub Actions
// تقرأ التمرين المفتوح من قاعدة البيانات، وترسل التذكير مرة وحدة في وقته لكل الجوالات اللي فعّلت التذكيرات.
// المفتاح السري VAPID_PRIVATE_KEY محفوظ في إعدادات GitHub (Secrets) — لا تحطه هنا أبداً.
const DB = 'https://wc-2026-predictions---saff-default-rtdb.firebaseio.com';
const API_KEY = 'AIzaSyBlRu52dh7N58H9j1HebKwI1OSttWyX5ZA'; // مفتاح Firebase العام (نفس اللي في التطبيق)
const SITE = 'https://saff2026.github.io/SAFF/';
const VAPID_PUB = 'BNVKWLcEbGEPg8UbotgKEw2Y1SlLraw_78p4pziF_YIApU_GHQqdcKnS4KFT5BGs6pTEsuXhaXDzVaj2CR13GVQ';
const APPS = [
  { root: 'training', name: 'تمرين ساف', page: 'training.html', icon: 'icon-saff-192.png' },
  { root: 'training_elite', name: 'تمرين نخبة السبت', page: 'elite.html', icon: 'icon-elite-192.png' }
];
const H = 3600e3, M = 60e3;
const VOTE_AFTER = 2 * H, VOTE_LEN = 12 * H; // نفس أرقام التطبيق

const ar = n => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
// وقت بداية التمرين بتوقيت الرياض (UTC+3)
function startTs(s) {
  const [y, m, d] = String(s.date).split('-').map(Number);
  const [h, mi] = String(/^\d\d:\d\d$/.test(s.time || '') ? s.time : '20:00').split(':').map(Number);
  return Date.UTC(y, m - 1, d, h - 3, mi);
}
function clock(s) {
  const [h, mi] = String(s.time || '20:00').split(':').map(Number);
  return ar((h % 12) || 12) + (mi ? ':' + ar(String(mi).padStart(2, '0')) : '') + (h < 12 ? ' صباحًا' : ' مساءً');
}
function dayTxt(s) {
  const d = new Date(startTs(s));
  const f = o => new Intl.DateTimeFormat('ar-u-ca-gregory-nu-arab', Object.assign({ timeZone: 'Asia/Riyadh' }, o)).format(d);
  return f({ weekday: 'long' }) + ' ' + f({ day: 'numeric', month: 'long' });
}
function voteWindow(s) {
  const st = startTs(s) + VOTE_AFTER, c = +s.voteEndAt || 0;
  return [st, c > st ? c : st + VOTE_LEN];
}

// وش لازم ينرسل الحين؟ (كل تذكير مرة وحدة، ومسجّل في pushLog)
function plan(app, sessions, log, now) {
  const open = Object.entries(sessions || {}).filter(([, s]) => s && s.status !== 'done')
    .sort((a, b) => (b[1].created || 0) - (a[1].created || 0));
  const out = [];
  for (const [sid, s] of open.slice(0, 1)) {
    const L = (log || {})[sid] || {}, st = startTs(s), [v0, v1] = voteWindow(s), url = SITE + app.page;
    const num = +s.num ? ' #' + ar(s.num) : '';
    const add = (kind, title, body, send = true) => out.push({ sid, kind, send, msg: { title, body, url, icon: SITE + app.icon, tag: app.root + '-' + sid + '-' + kind } });
    if (!L.new) add('new', app.name + ': تمرين جديد' + num + ' 🔥', dayTxt(s) + ' الساعة ' + clock(s) + ' — سجّل في القروب', (s.created || 0) > now - 36 * H && now < st);
    if (!L.pre && now >= st - 2 * H && now < st - 30 * M) add('pre', app.name + ' ⏰', 'التمرين اليوم الساعة ' + clock(s) + '، لا تتأخر ❤️');
    if (!L.ci && now >= st - 30 * M && now < st + H) add('ci', app.name + ' 📍', 'التمرين بعد شوي. أول ما توصل الملعب سجّل حضورك من التطبيق');
    if (!L.vote && now >= v0 && now < v1) add('vote', app.name + ' ⭐', 'تصويت أفضل لاعب مفتوح الحين، صوّت قبل ما يقفل!');
  }
  return out;
}

async function token() {
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + API_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' });
  const j = await r.json(); if (!j.idToken) throw new Error('auth failed'); return j.idToken;
}
async function get(path, tk) { const r = await fetch(DB + '/' + path + '.json?auth=' + tk); if (!r.ok) throw new Error('read ' + path + ' ' + r.status); return r.json(); }
async function patch(path, val, tk) { const r = await fetch(DB + '/' + path + '.json?auth=' + tk, { method: 'PATCH', body: JSON.stringify(val) }); if (!r.ok) throw new Error('write ' + path + ' ' + r.status); }
async function del(path, tk) { await fetch(DB + '/' + path + '.json?auth=' + tk, { method: 'DELETE' }); }

async function main() {
  const DRY = process.env.DRY === '1', now = process.env.NOW ? +process.env.NOW : Date.now();
  let webpush = null;
  if (!DRY) {
    if (!process.env.VAPID_PRIVATE_KEY) { console.log('⚠️ المفتاح السري VAPID_PRIVATE_KEY مو موجود في Secrets حق GitHub — ما انرسل شي'); return; } // بدون فشل عشان ما توصلك رسائل خطأ كل 10 دقائق
    webpush = require('web-push');
    webpush.setVapidDetails(SITE, VAPID_PUB, process.env.VAPID_PRIVATE_KEY);
  }
  const tk = await token();
  for (const app of APPS) {
    const [sessions, log, subs] = await Promise.all([get(app.root + '/sessions', tk), get(app.root + '/pushLog', tk), get(app.root + '/push', tk)]);
    const todo = plan(app, sessions, log, now), list = Object.entries(subs || {}).filter(([, x]) => x && x.s && x.s.endpoint);
    console.log(app.name + ': ' + list.length + ' جوال مفعّل، تذكيرات الحين: ' + (todo.map(t => t.kind + (t.send ? '' : '(بدون إرسال)')).join('، ') || 'لا شي'));
    for (const t of todo) {
      if (DRY) { console.log('  [تجربة]', t.kind, t.send ? JSON.stringify(t.msg) : ''); continue; }
      await patch(app.root + '/pushLog/' + t.sid, { [t.kind]: now }, tk); // نسجّل أول عشان ما يتكرر
      if (!t.send) continue;
      let ok = 0, gone = 0;
      for (const [k, x] of list) {
        try { await webpush.sendNotification(x.s, JSON.stringify(t.msg), { TTL: 6 * 3600, urgency: 'high' }); ok++; }
        catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { gone++; await del(app.root + '/push/' + k, tk); } else console.log('  خطأ', e.statusCode || e.message); }
      }
      console.log('  أُرسل «' + t.kind + '» إلى ' + ok + ' جوال' + (gone ? '، وانحذف ' + gone + ' اشتراك منتهي' : ''));
    }
  }
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { plan, startTs, clock, dayTxt, APPS };
