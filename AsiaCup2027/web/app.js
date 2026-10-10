/* ===========================================================================
 *  تطبيق توقّعات كأس آسيا ٢٠٢٧ — منطق الواجهة
 * ---------------------------------------------------------------------------
 *  كل حساب في هذا الملفّ يمرّ عبر AsiaRules (في rules.js)، وهي الوحيدة
 *  المُختبَرة على ملفّ المواصفة المشترك. فلا تُحسب نقطة واحدة هنا بيدك.
 *
 *  قاعدة البيانات: Firebase Realtime Database تحت الجذر `asia27` — منفصل
 *  تمامًا عن `gulf27` الذي يحمل بيانات بطولة منتهية بنتائج حقيقية.
 * =========================================================================== */
'use strict';

/* ---------------------------- إعدادات ---------------------------- */

var firebaseConfig = {
  apiKey: "AIzaSyBlRu52dh7N58H9j1HebKwI1OSttWyX5ZA",
  authDomain: "wc-2026-predictions---saff.firebaseapp.com",
  databaseURL: "https://wc-2026-predictions---saff-default-rtdb.firebaseio.com",
  projectId: "wc-2026-predictions---saff",
  storageBucket: "wc-2026-predictions---saff.firebasestorage.app",
  messagingSenderId: "505320213469",
  appId: "1:505320213469:web:3f008271525eeb5ef54434"
};

var DB_ROOT = 'asia27';          // ⛔ لا تُغيّره إلى gulf27 أبدًا
var ADMIN_CODE = '2027';         // رمز فتح وضع الإدارة
var ADMIN_NAME = 'Mnajjar3';     // الإعدادات وأدوات الإدارة لهذا الحساب وحده

var R = window.AsiaRules;
var D = window.ASIA_SCHEDULE;

/* ---------------------------- حالة التطبيق ---------------------------- */

var MATCHES = [];                // مباريات مُجهَّزة بموعد القفل
var BY_ID = {};
var myKey = null, myName = null;
var isAdmin = false;
var predsData = {};              // {mid: {key: pred}}
var resultsData = {};            // {mid: res}
var usersData = {};              // {key: {name, ph, champion, ...}}
var teamsData = {};              // {mid: {home, away}} + __truth__
var disciplineData = {};         // {teamKey: نقاط الإنذارات}
var lotsData = {};               // {scope: "A>B>C"} ترجيح يدوي
var draft = {}, draftEdited = {};
var predsLoaded = false;
var ROOT = null, db = null;
var activeFilter = 'next';
var activeGroupSub = 'tables';
var cancelledBoosts = [];

/* ---------------------------- أدوات ---------------------------- */

function $(id) { return document.getElementById(id); }
function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
function arNum(n) { return R.arNum(n); }

function toast(msg) {
  var t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

/** مفتاح اللاعب في قاعدة البيانات، مشتقّ من اسمه. */
function sanitize(s) { return String(s).replace(/[.#$\[\]\/]/g, '_').trim(); }

/** تلبيس خفيف للرقم السرّي — لعبة بين أصدقاء لا نظام بنكي. */
function hashPin(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h |= 0; }
  return 'p' + (h >>> 0).toString(36);
}

/* ---- أسماء وأعلام المنتخبات ---- */

function teamAr(key) {
  var t = D.teams[key];
  if (t) return t.ar;
  return slotLabel(key) || key;
}
function isRealTeam(key) { return !!D.teams[key]; }
/**
 * رمز العلم من رمز الدولة: "sa" ← 🇸🇦
 * يُشتَق حسابيًّا من حرفَي الرمز، فلا نحتاج جدولًا ثانيًا يتقادم.
 */
function flagEmoji(code) {
  if (!code || code.length !== 2) return '🏳️';
  return String.fromCodePoint(
    0x1F1E6 + code.toUpperCase().charCodeAt(0) - 65,
    0x1F1E6 + code.toUpperCase().charCodeAt(1) - 65
  );
}

/**
 * علم المنتخب: صورة من flagcdn، وإن تعذّر تحميلها يحلّ محلّها رمز العلم.
 *
 * الاحتياط مهم: لو تعطّل المصدر الخارجي أثناء البطولة تبقى الأعلام ظاهرة،
 * ورموز الأعلام تُرسَم على الآيفون بالألوان أصلًا.
 */
function flagHTML(key, w) {
  var t = D.teams[key];
  w = w || 46;
  var h = Math.round(w * .67);
  if (!t) return '<span class="ph" style="width:' + w + 'px;height:' + h + 'px"></span>';
  var em = flagEmoji(t.code);
  return '<img class="flag flagimg" width="' + w + '" height="' + h + '" alt="' + esc(t.ar) +
    '" loading="lazy" src="https://flagcdn.com/w80/' + t.code + '.png"' +
    ' onerror="this.outerHTML=\'<span class=&quot;flagem&quot; style=&quot;font-size:' +
    Math.round(h * .92) + 'px;line-height:1&quot;>' + em + '</span>\'">';
}

var GROUP_AR = { A: 'الأولى', B: 'الثانية', C: 'الثالثة', D: 'الرابعة', E: 'الخامسة', F: 'السادسة' };
var GROUP_NUM = { A: '١', B: '٢', C: '٣', D: '٤', E: '٥', F: '٦' };
function groupAr(g) { return 'المجموعة ' + (GROUP_AR[g] || g); }

/**
 * يحوّل رمز الخانة إلى نصّ عربي.
 * @param {boolean} short نسخة مختصرة للشجرة حيث المساحة ضيّقة:
 *   "1A" ← «متصدّر المجموعة الأولى»، والمختصر «متصدّر ١»
 */
function slotLabel(code, short) {
  if (!code) return '';
  var m = /^([1-2])([A-F])$/.exec(code);
  if (m) {
    var role = m[1] === '1' ? 'متصدّر' : 'وصيف';
    return short ? role + ' ' + GROUP_NUM[m[2]] : role + ' ' + groupAr(m[2]);
  }
  m = /^3([A-F]{3,4})$/.exec(code);
  if (m) {
    var nums = m[1].split('').map(function (g) { return GROUP_NUM[g]; }).join('/');
    return short ? 'ثالث ' + nums : 'ثالث إحدى المجموعات ' + nums;
  }
  m = /^W(\d{2})$/.exec(code);
  if (m) return short ? 'فائز ' + arNum(+m[1]) : 'الفائز من المباراة ' + arNum(+m[1]);
  return '';
}

/** اسم المنتخب أو الخانة، بالنسخة المختصرة للشجرة. */
function teamArShort(key) {
  var t = D.teams[key];
  if (t) return t.ar;
  return slotLabel(key, true) || key;
}

var STAGE_AR = {
  group: 'دور المجموعات', R16: 'دور الـ١٦', QF: 'ربع النهائي',
  SF: 'نصف النهائي', FINAL: 'النهائي'
};
function isKnockout(m) { return m.stage !== 'group'; }

/* ---- التاريخ والوقت ---- */

var AR_WEEKDAY = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
var AR_MONTH = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function arDate(ms) {
  var d = new Date(ms);
  return AR_WEEKDAY[d.getDay()] + ' ' + arNum(d.getDate()) + ' ' + AR_MONTH[d.getMonth()];
}
function arTime(ms) {
  var d = new Date(ms);
  var h = d.getHours(), mm = d.getMinutes();
  var ampm = h < 12 ? 'ص' : 'م';
  var h12 = h % 12 || 12;
  return arNum(h12) + ':' + arNum(mm < 10 ? '0' + mm : mm) + ' ' + ampm;
}

/**
 * يُجهّز المباريات: يحسب موعد القفل لكل مباراة.
 *
 * إن أعلن الاتحاد الآسيوي التوقيت استعملناه. وإن لم يُعلَن — وهو الواقع
 * الآن — فالقفل **مبدئي آمن** في ساعة مبكّرة من يوم المباراة، أبكر من أيّ
 * انطلاق محتمل، فلا يبقى التوقّع مفتوحًا بعد أن تبدأ المباراة.
 *
 * الجانب الذي نخطئ فيه مقصود: القفل المبكّر أهون من قفل متأخّر.
 */
function prepareMatches() {
  MATCHES = D.matches.map(function (m) {
    var kickoffMs, provisional;
    if (m.kickoffUTC) {
      kickoffMs = Date.parse(m.kickoffUTC);
      provisional = false;
    } else {
      // منتصف ليل يوم المباراة بتوقيت غرينتش + ساعة القفل المبدئي
      kickoffMs = Date.parse(m.date + 'T00:00:00Z') + D.provisionalLockUTCHour * 3600000;
      provisional = true;
    }
    return {
      id: m.id, n: m.n, stage: m.stage, group: m.group,
      home: m.home, away: m.away, venue: m.venue, city: m.city,
      date: m.date, kickoffMs: kickoffMs, provisional: provisional
    };
  }).sort(function (x, y) {
    return x.kickoffMs !== y.kickoffMs ? x.kickoffMs - y.kickoffMs : x.n - y.n;
  });
  BY_ID = {};
  MATCHES.forEach(function (m) { BY_ID[m.id] = m; });
}

/* ---- الفرق الفعلية للمباراة (الأدمن يملأ خانات الإقصائيات) ---- */

function teamsOf(m) {
  var o = teamsData[m.id] || {};
  return { home: o.home || m.home, away: o.away || m.away };
}
function resultOf(m) { return resultsData[m.id] || null; }

function statusOf(m) {
  var t = teamsOf(m);
  return R.matchStatus({
    now: Date.now(), kickoffMs: m.kickoffMs, result: resultOf(m),
    isKnockout: isKnockout(m),
    homeResolved: isRealTeam(t.home), awayResolved: isRealTeam(t.away)
  });
}

/* ---------------------------- تسجيل الدخول ---------------------------- */

var configReady = firebaseConfig.apiKey && firebaseConfig.apiKey.indexOf('YOUR_') !== 0;

/** وضع التجربة: ?demo=1 يُبدِل Firebase بقاعدة بيانات محليّة مؤقّتة. */
var DEMO = /(?:\?|&)demo=1(?:&|$)/.test(location.search);

function initFirebase() {
  if (DEMO) {
    if (!window.ASIA_DEMO) { $('login-err').textContent = 'ملفّ وضع التجربة غير محمَّل.'; return false; }
    var d = window.ASIA_DEMO.create(D);
    ROOT = d.root;
    return true;
  }
  if (!configReady) return false;
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  ROOT = db.ref(DB_ROOT);
  firebase.auth().signInAnonymously().catch(function (e) {
    $('login-err').textContent = 'تعذّر الاتصال بقاعدة البيانات: ' + (e && e.message || e);
  });
  return true;
}

function attemptLogin(name, pin, fromAuto) {
  var key = sanitize(name);
  if (!key) { return loginFail('اكتب اسمك'); }
  if (!pin || pin.length < 4) { return loginFail('الرقم السرّي ٤ أرقام على الأقل'); }
  if (!ROOT) { return loginFail('قاعدة البيانات غير متصلة'); }

  // في وضع التجربة ندخل مباشرة بلا تحقّق — لا بيانات حقيقية تُحمى
  if (DEMO) { loginOK(name, pin); return true; }

  var ph = hashPin(pin);
  var ref = ROOT.child('users/' + key);
  ref.once('value').then(function (snap) {
    var u = snap.val();
    if (!u) {
      // أوّل من يستخدم الاسم يملكه
      return ref.set({ name: name.trim(), ph: ph }).then(function () { loginOK(name, pin); });
    }
    if (u.ph && u.ph !== ph) {
      return loginFail('هذا الاسم مستخدم برقم سرّي مختلف. اختر اسمًا غيره أو تذكّر رقمك.', fromAuto);
    }
    if (!u.ph) return ref.update({ ph: ph }).then(function () { loginOK(name, pin); });
    loginOK(name, pin);
  }).catch(function (e) {
    loginFail('فشل الدخول: ' + (e && e.message || e), fromAuto);
  });
}

function loginFail(msg, fromAuto) {
  if (!fromAuto) $('login-err').textContent = msg;
  try { localStorage.removeItem('asia27_auth'); } catch (e) {}
  return false;
}

function loginOK(name, pin) {
  myName = name.trim();
  myKey = sanitize(name);
  try { localStorage.setItem('asia27_auth', JSON.stringify({ n: myName, p: pin })); } catch (e) {}
  $('me-name').textContent = myName;
  applyAdminUI();
  listen();
  showScreen('s-matches');
}

function logout() {
  if (!confirm('تبي تخرج من حسابك؟')) return;
  try { localStorage.removeItem('asia27_auth'); } catch (e) {}
  location.reload();
}

function isAdminUser() {
  return !!myName && myName.trim().toLowerCase() === ADMIN_NAME.toLowerCase();
}
function applyAdminUI() {
  $('btn-settings').style.display = isAdminUser() ? '' : 'none';
}

/* ---------------------------- المستمعون ---------------------------- */

function listen() {
  ROOT.child('users').on('value', function (s) {
    usersData = s.val() || {};
    renderLeader();
  });
  ROOT.child('predictions').on('value', function (s) {
    predsData = s.val() || {};
    // الحارس الأخير: من تجاوز حدّ البطاقات تُحتسب له الأقدم موعدًا فقط.
    cancelledBoosts = R.applyBoostCap(predsData, MATCHES);
    predsLoaded = true;
    renderAll();
  });
  ROOT.child('results').on('value', function (s) {
    resultsData = s.val() || {};
    renderAll();
  });
  ROOT.child('teams').on('value', function (s) {
    teamsData = s.val() || {};
    renderAll();
  });
  ROOT.child('discipline').on('value', function (s) {
    disciplineData = s.val() || {};
    renderGroups(); renderBracket();
  });
  ROOT.child('lots').on('value', function (s) {
    lotsData = s.val() || {};
    renderGroups(); renderBracket();
  });
}

function renderAll() {
  renderBoostBar();
  renderMatches();
  renderLeader();
  renderGroups();
  renderBracket();
}

/* ---------------------------- شاشة المباريات ---------------------------- */

var FILTERS = [
  { k: 'next', t: 'القادمة' },
  { k: 'open', t: 'مفتوحة للتوقّع' },
  { k: 'mine', t: 'توقّعاتي' },
  { k: 'done', t: 'انتهت' },
  { k: 'all', t: 'الكل' }
];

function buildChips() {
  var box = $('match-chips');
  box.innerHTML = '';
  FILTERS.forEach(function (f) {
    var b = document.createElement('button');
    b.className = 'chip' + (activeFilter === f.k ? ' active' : '');
    b.textContent = f.t;
    b.addEventListener('click', function () { activeFilter = f.k; buildChips(); renderMatches(); });
    box.appendChild(b);
  });
  // شرائح المجموعات والأدوار
  ['A', 'B', 'C', 'D', 'E', 'F'].forEach(function (g) {
    var b = document.createElement('button');
    b.className = 'chip' + (activeFilter === 'g' + g ? ' active' : '');
    b.textContent = 'المجموعة ' + GROUP_NUM[g];
    b.addEventListener('click', function () { activeFilter = 'g' + g; buildChips(); renderMatches(); });
    box.appendChild(b);
  });
  ['R16', 'QF', 'SF', 'FINAL'].forEach(function (s) {
    var b = document.createElement('button');
    b.className = 'chip' + (activeFilter === 's' + s ? ' active' : '');
    b.textContent = STAGE_AR[s];
    b.addEventListener('click', function () { activeFilter = 's' + s; buildChips(); renderMatches(); });
    box.appendChild(b);
  });
}

function filteredMatches() {
  var now = Date.now();
  if (activeFilter === 'all') return MATCHES;
  if (activeFilter === 'done') return MATCHES.filter(function (m) { return !!resultOf(m); });
  if (activeFilter === 'open') return MATCHES.filter(function (m) { return statusOf(m) === 'open'; });
  if (activeFilter === 'mine') {
    return MATCHES.filter(function (m) { return predsData[m.id] && predsData[m.id][myKey]; });
  }
  if (activeFilter.indexOf('g') === 0 && activeFilter.length === 2) {
    return MATCHES.filter(function (m) { return m.group === activeFilter[1]; });
  }
  if (activeFilter.indexOf('s') === 0) {
    var st = activeFilter.slice(1);
    return MATCHES.filter(function (m) { return m.stage === st; });
  }
  // القادمة: ما لم تنتهِ نتيجته، وأقربها زمنيًّا أولًا
  var next = MATCHES.filter(function (m) { return !resultOf(m); });
  return next.length ? next : MATCHES.slice().reverse();
}

function renderBoostBar() {
  var box = $('boost-bar');
  box.innerHTML = '';
  if (!myKey) return;
  var used = R.displayedBoostCount(predsData, myKey, currentDrafts());
  var left = Math.max(0, R.MAX_BOOSTS - used);
  var d = document.createElement('div');
  d.className = 'notice';
  d.innerHTML = '⚡ <b>بطاقات ×٢:</b> بقي لك ' + arNum(left) + ' من ' + arNum(R.MAX_BOOSTS) +
    '. البطاقة تضاعف نقاط مباراة واحدة، و<b>لا ترجع بعد الحفظ أبدًا</b>.';
  box.appendChild(d);

  if (isAdmin && cancelledBoosts.length) {
    var w = document.createElement('div');
    w.className = 'notice warn';
    w.innerHTML = '⚠️ أُلغيت ' + arNum(cancelledBoosts.length) + ' بطاقة زائدة عن الحد: ' +
      cancelledBoosts.map(function (c) {
        var u = usersData[c.playerKey];
        return esc((u && u.name) || c.playerKey) + ' (مباراة ' + arNum(BY_ID[c.matchId] ? BY_ID[c.matchId].n : 0) + ')';
      }).join('، ') + '. تظهر لك وحدك.';
    box.appendChild(w);
  }
}

function currentDrafts() {
  var out = {};
  Object.keys(draft).forEach(function (id) {
    if (draftEdited[id]) out[id] = draft[id];
  });
  return out;
}

/* ---------------------------- توقّعات البطولة ---------------------------- */

/** تُقفل توقّعات البطولة مع انطلاق أوّل مباراة. */
function tournamentLockMs() {
  return MATCHES.length ? MATCHES[0].kickoffMs : Infinity;
}
function tournamentLocked() { return Date.now() >= tournamentLockMs(); }

var TOUR_FIELDS = [
  { k: 'champion', icon: '🏆', label: 'بطل الكأس', pts: 5, teams: true },
  { k: 'scorer', icon: '⚽', label: 'هدّاف البطولة', pts: 3 },
  { k: 'mvp', icon: '⭐', label: 'أفضل لاعب', pts: 3 },
  { k: 'gk', icon: '🧤', label: 'أفضل حارس', pts: 3 }
];

function tournamentCard() {
  var me = usersData[myKey] || {};
  var card = document.createElement('div');
  card.className = 'tour-card';
  var locked = tournamentLocked();
  var truth = truthOf();

  var h = document.createElement('h3');
  h.textContent = '🏆 توقّعات البطولة';
  card.appendChild(h);

  if (locked) {
    var earned = R.tournamentPoints(
      { champion: me.champion, scorer: me.scorer, mvp: me.mvp, gk: me.gk }, truth);
    TOUR_FIELDS.forEach(function (f) {
      var mine = me[f.k], real = truth[f.k];
      var row = document.createElement('div');
      row.className = 'locked-box';
      var state = !mine ? '<span class="pts-pill p0">ما توقّعت</span>'
        : !real ? '<span class="pts-pill p0">بانتظار النتيجة</span>'
        : mine === real ? '<span class="pts-pill p5">+' + arNum(f.pts) + '</span>'
        : '<span class="pts-pill p0">لا نقاط</span>';
      row.innerHTML = '<div><div class="lb">' + f.icon + ' ' + f.label + '</div>' +
        '<div class="lv">' + esc(mine ? (f.teams ? teamAr(mine) : mine) : '—') + '</div></div>' + state;
      card.appendChild(row);
    });
    var tot = document.createElement('div');
    tot.className = 'hint';
    tot.style.textAlign = 'center';
    tot.textContent = 'مجموعك من توقّعات البطولة: ' + R.arPoints(earned);
    card.appendChild(tot);
    return card;
  }

  var sub = document.createElement('div');
  sub.className = 'hint';
  sub.textContent = 'تُقفل مع انطلاق أوّل مباراة. اكتب الاسم كما تحبّ — نحن نقارنه كما كتبته.';
  card.appendChild(sub);

  var inputs = {};
  TOUR_FIELDS.forEach(function (f) {
    var row = document.createElement('div');
    row.className = 'tour-row';
    row.innerHTML = '<label><span>' + f.icon + ' ' + f.label + '</span>' +
      '<span class="pts-tag">' + arNum(f.pts) + ' نقاط</span></label>';
    var el;
    if (f.teams) {
      el = document.createElement('select');
      el.className = 'field';
      el.innerHTML = '<option value="">— اختر منتخبًا —</option>' +
        Object.keys(D.teams).map(function (k) {
          return '<option value="' + esc(k) + '"' + (me[f.k] === k ? ' selected' : '') + '>' +
                 esc(D.teams[k].ar) + '</option>';
        }).join('');
    } else {
      el = document.createElement('input');
      el.className = 'field';
      el.placeholder = 'اكتب اسم اللاعب';
      el.value = me[f.k] || '';
    }
    inputs[f.k] = el;
    row.appendChild(el);
    card.appendChild(row);
  });

  var save = document.createElement('button');
  save.className = 'btn btn-gold';
  save.textContent = '💾 احفظ توقّعات البطولة';
  save.addEventListener('click', function () {
    var patch = {};
    TOUR_FIELDS.forEach(function (f) {
      var v = (inputs[f.k].value || '').trim();
      patch[f.k] = v || null;
    });
    ROOT.child('users/' + myKey).update(patch)
      .then(function () { toast('تم حفظ توقّعات البطولة ✅'); })
      .catch(function (e) { toast('فشل الحفظ: ' + (e && e.message || e)); });
  });
  card.appendChild(save);
  return card;
}

/* ---------------------------- توقّعات بقية اللاعبين ---------------------------- */

/** تُعرض فقط بعد قفل المباراة — قبل ذلك سرّ. */
function othersBlock(m) {
  var all = predsData[m.id] || {};
  var keys = Object.keys(all).filter(function (k) { return k !== myKey; });
  if (!keys.length) return null;

  var res = resultOf(m);
  var wrap = document.createElement('details');
  wrap.style.cssText = 'width:100%;background:var(--surface);border:1px solid var(--line);' +
    'border-radius:12px;padding:10px 12px;';
  var sum = document.createElement('summary');
  sum.style.cssText = 'cursor:pointer;font-size:.82rem;font-weight:800;color:var(--muted)';
  sum.textContent = '👀 توقّعات بقية اللاعبين (' + arNum(keys.length) + ')';
  wrap.appendChild(sum);

  keys.sort(function (a, b) {
    if (!res) return 0;
    return R.score(all[b], res) - R.score(all[a], res);
  }).forEach(function (k) {
    var u = usersData[k] || {};
    var p = all[k];
    var line = document.createElement('div');
    line.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;' +
      'padding:6px 0;font-size:.84rem;border-top:1px solid rgba(255,255,255,.05)';
    var pts = res ? R.score(p, res) : null;
    var raw = res ? R.points(p, res) : null;
    var cls = raw === null ? 'p0' : (raw >= 5 ? 'p5' : raw >= 3 ? 'p3' : 'p0');
    line.innerHTML = '<span style="font-weight:700">' + esc(u.name || k) + '</span>' +
      '<span style="font-weight:800;color:#fff">' + arNum(p.h) + ' — ' + arNum(p.a) +
      (p.x2 ? ' <span class="x2-tag">×٢</span>' : '') + '</span>' +
      (pts === null ? '' : '<span class="pts-pill ' + cls + '">' + R.arPoints(pts) + '</span>');
    wrap.appendChild(line);
  });
  return wrap;
}

function renderMatches() {
  var list = $('matches-list');
  if (!list) return;
  if (!predsLoaded) { list.innerHTML = '<div class="spin"></div>'; return; }
  list.innerHTML = '';
  buildChips();

  if (activeFilter === 'next' || activeFilter === 'open') {
    list.appendChild(tournamentCard());
  }

  var ms = filteredMatches();
  if (!ms.length) {
    list.innerHTML = '<div class="empty">ما فيه مباريات في هذا التصنيف.</div>';
    return;
  }
  ms.forEach(function (m) { list.appendChild(matchCard(m)); });
}

function matchCard(m) {
  var t = teamsOf(m);
  var st = statusOf(m);
  var res = resultOf(m);
  var saved = (predsData[m.id] || {})[myKey] || null;

  var c = document.createElement('div');
  c.className = 'match' + (st === 'finished' ? ' finished' : st === 'locked' ? ' locked' : '');

  // ترويسة: المجموعة/الدور · رقم المباراة · الحالة
  var head = document.createElement('div');
  head.className = 'match-head';
  var label = m.stage === 'group' ? groupAr(m.group) : STAGE_AR[m.stage];
  var stTxt = { open: 'مفتوحة', locked: 'مُقفلة', finished: 'انتهت', awaitingTeams: 'بانتظار الفرق' }[st];
  var stCls = st === 'awaitingTeams' ? 'soon' : st;
  head.innerHTML = '<span class="hc-l grp-badge">' + esc(label) + '</span>' +
    '<span class="hc-c">مباراة ' + arNum(m.n) + '</span>' +
    '<span class="hc-r status-badge ' + stCls + '">' + stTxt + '</span>';
  c.appendChild(head);

  // الطرفان
  var teams = document.createElement('div');
  teams.className = 'teams';
  teams.innerHTML =
    '<div class="team">' + flagHTML(t.home) +
      '<div class="' + (isRealTeam(t.home) ? 'tname' : 'tslot') + '">' + esc(teamAr(t.home)) + '</div></div>' +
    '<div class="vs">×</div>' +
    '<div class="team">' + flagHTML(t.away) +
      '<div class="' + (isRealTeam(t.away) ? 'tname' : 'tslot') + '">' + esc(teamAr(t.away)) + '</div></div>';
  c.appendChild(teams);

  // الموعد والملعب
  var meta = document.createElement('div');
  meta.className = 'match-meta';
  meta.innerHTML = esc(arDate(m.kickoffMs)) + ' — ' + esc(m.venue) + '، ' + esc(m.city) +
    (m.provisional
      ? '<br><span class="prov">⏰ التوقيت الرسمي لم يُعلَن بعد — التوقّع يُقفل ' +
        esc(arTime(m.kickoffMs)) + '</span>'
      : '<br>' + esc(arTime(m.kickoffMs)));
  c.appendChild(meta);

  if (st === 'finished') {
    c.appendChild(finishedBox(m, res, saved));
    var ob = othersBlock(m);
    if (ob) c.appendChild(ob);
    if (isAdmin) c.appendChild(adminBox(m));
    return c;
  }
  if (st === 'awaitingTeams') {
    var w = document.createElement('div');
    w.className = 'hint';
    w.style.textAlign = 'center';
    w.textContent = 'التوقّع يفتح بعد ما يتأكّد الفريقان المتأهّلان.';
    c.appendChild(w);
    return c;
  }
  if (st === 'locked') {
    c.appendChild(lockedBox(m, saved));
    var ob2 = othersBlock(m);
    if (ob2) c.appendChild(ob2);
    if (isAdmin) c.appendChild(adminBox(m));
    return c;
  }
  c.appendChild(predictBox(m, t, saved));
  if (isAdmin) c.appendChild(adminBox(m));
  return c;
}

/* ---------------------------- وضع الإدارة ---------------------------- */

/** إدخال النتيجة الفعلية وتحديد المتأهّلين للخانات الإقصائية. */
function adminBox(m) {
  var t = teamsOf(m);
  var res = resultOf(m) || { h: 0, a: 0, pw: null };
  var d = { h: +res.h || 0, a: +res.a || 0, pw: res.pw || null };

  var box = document.createElement('div');
  box.className = 'admin-card';
  var h = document.createElement('h4');
  h.textContent = '🔧 إدارة — مباراة ' + arNum(m.n);
  box.appendChild(h);

  // تحديد المتأهّلَين في الإقصائيات
  if (isKnockout(m)) {
    [['home', t.home], ['away', t.away]].forEach(function (pair) {
      var row = document.createElement('div');
      row.className = 'tour-row';
      row.innerHTML = '<label>' + (pair[0] === 'home' ? 'الطرف الأول' : 'الطرف الثاني') +
        ' — حاليًّا: ' + esc(teamAr(pair[1])) + '</label>';
      var sel = document.createElement('select');
      sel.className = 'field';
      sel.innerHTML = '<option value="">— لم يتحدّد —</option>' +
        Object.keys(D.teams).map(function (k) {
          return '<option value="' + esc(k) + '"' + (pair[1] === k ? ' selected' : '') + '>' +
                 esc(D.teams[k].ar) + '</option>';
        }).join('');
      sel.addEventListener('change', function () {
        var patch = {};
        patch[pair[0]] = sel.value || null;
        ROOT.child('teams/' + m.id).update(patch)
          .then(function () { toast('تم تحديد المتأهّل ✅'); })
          .catch(function (e) { toast('فشل: ' + (e && e.message || e)); });
      });
      row.appendChild(sel);
      box.appendChild(row);
    });
  }

  // النتيجة
  var grid = document.createElement('div');
  grid.className = 'adm-grid';
  function num(side) {
    var wrap = document.createElement('div');
    wrap.className = 'stepper';
    var mi = document.createElement('button'); mi.className = 'stp'; mi.textContent = '−';
    var vv = document.createElement('div'); vv.className = 'stv'; vv.textContent = arNum(d[side]);
    var pl = document.createElement('button'); pl.className = 'stp'; pl.textContent = '+';
    mi.addEventListener('click', function () { d[side] = Math.max(0, d[side] - 1); vv.textContent = arNum(d[side]); refreshPen(); });
    pl.addEventListener('click', function () { d[side] = Math.min(30, d[side] + 1); vv.textContent = arNum(d[side]); refreshPen(); });
    wrap.appendChild(mi); wrap.appendChild(vv); wrap.appendChild(pl);
    return wrap;
  }
  grid.appendChild(num('h'));
  var dash = document.createElement('div'); dash.className = 'vs'; dash.textContent = '—';
  grid.appendChild(dash);
  grid.appendChild(num('a'));
  box.appendChild(grid);

  // الفائز بالترجيح — يظهر فقط في الإقصائيات عند التعادل
  var penWrap = document.createElement('div');
  box.appendChild(penWrap);
  function refreshPen() {
    penWrap.innerHTML = '';
    if (!isKnockout(m) || d.h !== d.a) { d.pw = null; return; }
    var p = document.createElement('div');
    p.className = 'pen-row';
    p.innerHTML = '<div class="pen-lbl">الفائز بالترجيح</div>';
    var opts = document.createElement('div');
    opts.className = 'pen-opts';
    [['h', t.home], ['a', t.away]].forEach(function (pair) {
      var b = document.createElement('button');
      b.className = 'pen-opt' + (d.pw === pair[0] ? ' on' : '');
      b.textContent = teamAr(pair[1]);
      b.addEventListener('click', function () { d.pw = pair[0]; refreshPen(); });
      opts.appendChild(b);
    });
    p.appendChild(opts);
    penWrap.appendChild(p);
  }
  refreshPen();

  var row = document.createElement('div');
  row.className = 'act-row';
  var save = document.createElement('button');
  save.className = 'save-btn';
  save.textContent = '💾 احفظ النتيجة';
  save.addEventListener('click', function () {
    if (isKnockout(m) && d.h === d.a && !d.pw) { toast('اختر الفائز بالترجيح'); return; }
    var data = { h: d.h, a: d.a };
    if (d.pw) data.pw = d.pw;
    ROOT.child('results/' + m.id).set(data)
      .then(function () { toast('تم حفظ النتيجة ✅'); })
      .catch(function (e) { toast('فشل: ' + (e && e.message || e)); });
  });
  var del = document.createElement('button');
  del.className = 'x2-btn';
  del.textContent = '🗑 امسح';
  del.addEventListener('click', function () {
    if (!confirm('تمسح نتيجة مباراة ' + m.n + '؟')) return;
    ROOT.child('results/' + m.id).remove()
      .then(function () { toast('انمسحت النتيجة'); })
      .catch(function (e) { toast('فشل: ' + (e && e.message || e)); });
  });
  row.appendChild(del);
  row.appendChild(save);
  box.appendChild(row);
  return box;
}

function finishedBox(m, res, saved) {
  var box = document.createElement('div');
  box.className = 'locked-box';
  var pts = saved ? R.score(saved, res) : null;
  var raw = saved ? R.points(saved, res) : null;
  var cls = raw === null ? 'p0' : (raw >= 5 ? 'p5' : raw >= 3 ? 'p3' : 'p0');
  var pwTxt = res.pw ? ' (بالترجيح لـ' + esc(teamAr(res.pw === 'h' ? teamsOf(m).home : teamsOf(m).away)) + ')' : '';
  box.innerHTML =
    '<div><div class="lb">النتيجة</div><div class="lv">' + arNum(res.h) + ' — ' + arNum(res.a) + pwTxt + '</div></div>' +
    (saved
      ? '<div style="text-align:center"><div class="lb">توقّعك</div><div class="lv">' +
        arNum(saved.h) + ' — ' + arNum(saved.a) + (saved.x2 ? ' <span class="x2-tag">×٢</span>' : '') + '</div></div>' +
        '<span class="pts-pill ' + cls + '">' + R.arPoints(pts) + '</span>'
      : '<span class="pts-pill p0">ما توقّعت</span>');
  return box;
}

function lockedBox(m, saved) {
  var box = document.createElement('div');
  box.className = 'locked-box';
  box.innerHTML = saved
    ? '<div><div class="lb">توقّعك</div><div class="lv">' + arNum(saved.h) + ' — ' + arNum(saved.a) +
      (saved.x2 ? ' <span class="x2-tag">×٢</span>' : '') + '</div></div>' +
      '<span class="pts-pill p0">بانتظار النتيجة</span>'
    : '<span class="pts-pill p0">أُقفلت وما توقّعت</span>';
  return box;
}

/** مُدخل التوقّع: أزرار زيادة/نقصان + الترجيح + بطاقة ×٢ + حفظ */
function predictBox(m, t, saved) {
  if (!draft[m.id]) {
    draft[m.id] = saved
      ? { h: saved.h, a: saved.a, pw: saved.pw || null, x2: !!saved.x2 }
      : { h: 0, a: 0, pw: null, x2: false };
  }
  var d = draft[m.id];
  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:11px';

  // الأرقام — نمرّر refresh مباشرة فلا نحتاج البحث في شجرة العناصر
  var row = document.createElement('div');
  row.className = 'pred-row';
  var stepHome = stepper(m, 'h', function () { refresh(); });
  var stepAway = stepper(m, 'a', function () { refresh(); });
  var sep = document.createElement('div');
  sep.className = 'vs';
  sep.textContent = '—';
  row.appendChild(stepHome.el);
  row.appendChild(sep);
  row.appendChild(stepAway.el);
  wrap.appendChild(row);

  var penBox = document.createElement('div');
  wrap.appendChild(penBox);

  var actions = document.createElement('div');
  actions.className = 'act-row';
  var x2 = document.createElement('button');
  x2.className = 'x2-btn';
  var save = document.createElement('button');
  save.className = 'save-btn';
  actions.appendChild(x2);
  actions.appendChild(save);
  wrap.appendChild(actions);

  function refresh() {
    stepHome.paint();
    stepAway.paint();

    // الترجيح — إلزامي إذا كانت إقصائية والتوقّع تعادل
    if (R.requiresPenaltyWinner(isKnockout(m), d)) {
      if (!penBox.firstChild) {
        var p = document.createElement('div');
        p.className = 'pen-row';
        p.innerHTML = '<div class="pen-lbl">⚽ الإقصائيات ما تنتهي بتعادل — اختر الفائز بالترجيح</div>';
        var opts = document.createElement('div');
        opts.className = 'pen-opts';
        p._buttons = [];
        [['h', t.home], ['a', t.away]].forEach(function (pair) {
          var b = document.createElement('button');
          b.className = 'pen-opt';
          b.textContent = teamAr(pair[1]);
          b.dataset.side = pair[0];
          b.addEventListener('click', function () {
            d.pw = pair[0]; draftEdited[m.id] = true; refresh();
          });
          opts.appendChild(b);
          p._buttons.push(b);
        });
        p.appendChild(opts);
        penBox.appendChild(p);
      }
      penBox.querySelectorAll('.pen-opt').forEach(function (b) {
        b.classList.toggle('on', d.pw === b.dataset.side);
      });
    } else {
      penBox.innerHTML = '';
      if (d.pw) d.pw = null;   // ما عاد تعادلًا ⇒ لا معنى للترجيح
    }

    // بطاقة ×٢
    var locked = R.isBoostLocked(predsData, m.id, myKey);
    var left = R.MAX_BOOSTS - R.displayedBoostCount(predsData, myKey, currentDrafts(), m.id) - (d.x2 ? 1 : 0);
    x2.className = 'x2-btn' + (d.x2 ? ' on' : '');
    x2.disabled = locked || (!d.x2 && left <= 0);
    x2.innerHTML = '<span>⚡</span><span>' +
      (locked ? '×٢ مُستهلكة' : d.x2 ? '×٢ ✓' : '×٢ (' + arNum(Math.max(0, left)) + ')') + '</span>';

    // الحفظ
    var valid = R.isValidPrediction(isKnockout(m), d);
    save.disabled = !valid;
    save.textContent = !valid ? 'اختر الفائز بالترجيح' : (saved ? 'حدّث التوقّع' : 'احفظ التوقّع');
    renderBoostBar();
  }

  x2.addEventListener('click', function () {
    if (R.isBoostLocked(predsData, m.id, myKey)) {
      toast('البطاقة محفوظة على هذي المباراة ولا ترجع'); return;
    }
    if (!d.x2) {
      var left = R.MAX_BOOSTS - R.displayedBoostCount(predsData, myKey, currentDrafts(), m.id);
      if (left <= 0) { toast('استخدمت كل بطاقات ×٢ (' + arNum(R.MAX_BOOSTS) + ')'); return; }
    }
    d.x2 = !d.x2;
    draftEdited[m.id] = true;
    refresh();
  });
  save.addEventListener('click', function () { savePred(m.id); });

  refresh();
  return wrap;
}

/**
 * زرّا زيادة/نقصان لرقم واحد.
 * @returns {{el: HTMLElement, paint: function}} العنصر ودالة إعادة الرسم
 */
function stepper(m, side, onChange) {
  var d = draft[m.id];
  var el = document.createElement('div');
  el.className = 'stepper';
  var minus = document.createElement('button');
  minus.className = 'stp'; minus.textContent = '−';
  minus.setAttribute('aria-label', 'أنقص هدفًا');
  var val = document.createElement('div');
  val.className = 'stv';
  var plus = document.createElement('button');
  plus.className = 'stp'; plus.textContent = '+';
  plus.setAttribute('aria-label', 'أضف هدفًا');

  function paint() {
    val.textContent = arNum(d[side]);
    minus.disabled = d[side] <= 0;
    plus.disabled = d[side] >= 30;
  }
  function bump(delta) {
    d[side] = Math.max(0, Math.min(30, d[side] + delta));
    draftEdited[m.id] = true;
    onChange();
  }
  minus.addEventListener('click', function () { bump(-1); });
  plus.addEventListener('click', function () { bump(1); });

  el.appendChild(minus); el.appendChild(val); el.appendChild(plus);
  paint();
  return { el: el, paint: paint };
}

function savePred(id) {
  var m = BY_ID[id];
  var st = statusOf(m);
  if (st === 'awaitingTeams') { toast('التوقّع يفتح بعد ما تتأكّد الفرق'); renderMatches(); return; }
  if (st !== 'open') { toast('التوقّعات مُقفلة لهذي المباراة'); renderMatches(); return; }
  if (!predsLoaded) { toast('جاري تحميل توقّعك… حاول بعد لحظة'); return; }

  var d = draft[id];
  if (!R.isValidPrediction(isKnockout(m), d)) { toast('اختر الفائز بالترجيح'); return; }

  var data = { h: d.h, a: d.a };
  if (R.requiresPenaltyWinner(isKnockout(m), d)) data.pw = d.pw;

  // قرار البطاقة يمرّ عبر القواعد المُختبَرة، لا بحساب هنا
  var boost = R.resolveBoostOnSave(predsData, id, myKey, !!d.x2);
  if (boost === null) {
    d.x2 = false;
    toast('استخدمت كل بطاقات ×٢ (' + arNum(R.MAX_BOOSTS) + ')');
    renderMatches();
    return;
  }
  if (boost) { d.x2 = true; data.x2 = true; }

  ROOT.child('predictions/' + id + '/' + myKey).set(data)
    .then(function () { draftEdited[id] = false; toast('تم حفظ التوقّع ✅'); })
    .catch(function (e) { toast('فشل الحفظ: ' + (e && e.message || e)); });
}

/* ---------------------------- الترتيب العام ---------------------------- */

function truthOf() {
  var manual = teamsData.__truth__ || {};
  var out = { champion: manual.champion || null, scorer: manual.scorer || null,
              mvp: manual.mvp || null, gk: manual.gk || null };
  if (!out.champion) {
    // البطل يُستنتَج من نتيجة النهائي إن لم يُثبّته الأدمن
    var fm = MATCHES.filter(function (m) { return m.stage === 'FINAL'; })[0];
    if (fm) {
      var r = resultOf(fm);
      if (r) {
        var t = teamsOf(fm), w = null;
        if (+r.h > +r.a) w = t.home;
        else if (+r.a > +r.h) w = t.away;
        else if (r.pw === 'h') w = t.home;
        else if (r.pw === 'a') w = t.away;
        if (w && isRealTeam(w)) out.champion = w;
      }
    }
  }
  return out;
}

function renderLeader() {
  var box = $('leader-list');
  if (!box) return;
  var players = Object.keys(usersData).map(function (k) {
    var u = usersData[k] || {};
    return { key: k, name: u.name || k,
             picks: { champion: u.champion, scorer: u.scorer, mvp: u.mvp, gk: u.gk } };
  });
  if (!players.length) { box.innerHTML = '<div class="empty">ما فيه لاعبون بعد.</div>'; return; }

  var table = R.leaderboard({
    players: players, preds: predsData, results: resultsData, truth: truthOf()
  });

  box.innerHTML = '';
  table.forEach(function (r, i) {
    var row = document.createElement('div');
    row.className = 'ld-row' + (r.key === myKey ? ' me' : '');
    row.innerHTML =
      '<div class="ld-rank">' + arNum(i + 1) + '</div>' +
      '<div class="ld-name"><div class="nm">' + esc(r.name) + '</div>' +
      '<div class="sub">' + arNum(r.scoredMatches) + ' مباراة، ' + arNum(r.exactHits) +
      ' مطابقة، ' + arNum(r.boostsUsed) + ' من ' + arNum(R.MAX_BOOSTS) + ' بطاقات</div></div>' +
      '<div class="ld-pts">' + arNum(r.total) + '<small>نقطة</small></div>';
    box.appendChild(row);
  });

  var played = MATCHES.filter(function (m) { return !!resultOf(m); }).length;
  $('leader-hint').textContent = 'دخلت نتائج ' + arNum(played) + ' من ' + arNum(MATCHES.length) +
    ' مباراة. توقّعات البطولة الأربعة تنزل نقاطها بعد ما تُثبَّت النتائج الفعلية.';
}

/* ---------------------------- المجموعات ---------------------------- */

function lotsFor(scope) {
  var v = lotsData[scope];
  return v ? String(v).split('>').map(function (s) { return s.trim(); }).filter(Boolean) : [];
}

function groupRows(g) {
  var teams = Object.keys(D.teams).filter(function (k) { return D.teams[k].group === g; });
  var results = {};
  Object.keys(resultsData).forEach(function (id) {
    var r = resultsData[id];
    if (r) results[id] = { h: +r.h, a: +r.a };
  });
  return R.groupTable({
    group: g, teams: teams, matches: MATCHES, results: results,
    disciplinary: disciplineData, lotsOrder: lotsFor(g)
  });
}

function renderGroups() {
  var box = $('groups-body');
  if (!box) return;
  box.innerHTML = '';
  if (activeGroupSub === 'third') { renderThirdPlace(box); return; }

  ['A', 'B', 'C', 'D', 'E', 'F'].forEach(function (g) {
    var rows = groupRows(g);
    var card = document.createElement('div');
    card.className = 'gr-card';
    var h = document.createElement('h4');
    h.textContent = groupAr(g);
    card.appendChild(h);

    var tbl = document.createElement('table');
    tbl.className = 'gr-tbl';
    tbl.innerHTML = '<thead><tr><th>#</th><th>المنتخب</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th>' +
      '<th>له</th><th>عليه</th><th>+/−</th><th>نقاط</th></tr></thead>';
    var tb = document.createElement('tbody');
    rows.forEach(function (r, i) {
      var cls = i < 2 ? 'adv' : (i === 2 ? 'third' : 'out');
      var tr = document.createElement('tr');
      tr.className = cls;
      tr.innerHTML = '<td>' + arNum(i + 1) + '</td>' +
        '<td class="gr-team"><div class="gr-team">' + flagHTML(r.team, 26) + esc(teamAr(r.team)) + '</div></td>' +
        '<td>' + arNum(r.played) + '</td><td>' + arNum(r.won) + '</td><td>' + arNum(r.drawn) + '</td>' +
        '<td>' + arNum(r.lost) + '</td><td>' + arNum(r.goalsFor) + '</td><td>' + arNum(r.goalsAgainst) + '</td>' +
        '<td>' + (r.gd > 0 ? '+' : r.gd < 0 ? '−' : '') + arNum(Math.abs(r.gd)) + '</td>' +
        '<td style="font-weight:900;color:var(--gold-soft)">' + arNum(r.points) + '</td>';
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    card.appendChild(tbl);
    box.appendChild(card);
  });

  var lg = document.createElement('div');
  lg.className = 'legend';
  lg.innerHTML = '<span><i style="background:var(--ok)"></i>يتأهّل مباشرة</span>' +
    '<span><i style="background:var(--gold)"></i>ثالث — يتأهّل إن كان من أفضل أربعة</span>' +
    '<span><i style="background:#4b5563"></i>يخرج</span>';
  box.appendChild(lg);
}

function renderThirdPlace(box) {
  var rows = ['A', 'B', 'C', 'D', 'E', 'F'].map(function (g) {
    var t = groupRows(g);
    return t[2] || null;
  }).filter(Boolean);

  var note = document.createElement('div');
  note.className = 'notice';
  note.innerHTML = '🥉 يتأهّل إلى دور الـ١٦ أصحاب المركزين الأوّلين من كل مجموعة (١٢ منتخبًا) ' +
    'زائد <b>أفضل أربعة</b> من أصحاب المراكز الثالثة.<br>' +
    'والترجيح بينهم: النقاط ← فرق الأهداف ← الأهداف المسجّلة ← نقاط الإنذارات ← القرعة. ' +
    'ولا مواجهة مباشرة بينهم لأنهم من مجموعات مختلفة.';
  box.appendChild(note);

  var ranked = R.rankThirdPlaced(rows, lotsFor('third'));
  ranked.forEach(function (r, i) {
    var row = document.createElement('div');
    row.className = 'tp-row' + (i < R.THIRD_PLACE_QUALIFY ? ' in' : '');
    row.innerHTML = '<div class="tp-rank">' + arNum(i + 1) + '</div>' +
      '<div class="tp-main">' +
        '<div class="tp-team">' + flagHTML(r.team, 26) +
          '<span class="nm">' + esc(teamAr(r.team)) + '</span></div>' +
        '<div class="tp-sub">' + esc(groupAr(r.group)) +
          (i < R.THIRD_PLACE_QUALIFY ? ' — متأهّل' : ' — خارج') + '</div>' +
      '</div>' +
      '<div class="tp-stats">' +
        '<div class="tp-pts">' + arNum(r.points) + '</div>' +
        '<div class="tp-sub">فارق ' + (r.gd > 0 ? '+' : r.gd < 0 ? '−' : '') +
          arNum(Math.abs(r.gd)) + '، سجّل ' + arNum(r.goalsFor) + '</div>' +
      '</div>';
    box.appendChild(row);
  });

  if (!ranked.length) {
    box.appendChild(Object.assign(document.createElement('div'), {
      className: 'empty', textContent: 'يظهر الترتيب بعد ما تبدأ نتائج المجموعات.'
    }));
  }
}

/* ---------------------------- الشجرة ---------------------------- */

var R16 = {
  37: ['2A', '2C'], 38: ['1B', '3ACD'], 39: ['1D', '3BEF'], 40: ['1A', '3CDE'],
  41: ['1F', '2E'], 42: ['2B', '2F'], 43: ['1E', '2D'], 44: ['1C', '3ABF']
};

function renderBracket() {
  var grid = $('bracket-grid');
  if (!grid) return;
  grid.innerHTML = '';
  var cols = [
    { t: 'دور الـ١٦', ns: [37, 38, 39, 40, 41, 42, 43, 44] },
    { t: 'ربع النهائي', ns: [45, 46, 47, 48] },
    { t: 'نصف النهائي', ns: [49, 50] },
    { t: 'النهائي', ns: [51] }
  ];
  cols.forEach(function (col) {
    var c = document.createElement('div');
    c.className = 'br-col';
    var h = document.createElement('div');
    h.className = 'br-col-h';
    h.textContent = col.t;
    c.appendChild(h);
    var body = document.createElement('div');
    body.className = 'br-col-body';
    col.ns.forEach(function (n) {
      var m = MATCHES.filter(function (x) { return x.n === n; })[0];
      if (m) body.appendChild(bracketCard(m));
    });
    c.appendChild(body);
    grid.appendChild(c);
  });

  $('bracket-hint').innerHTML =
    '↔️ اسحب الشجرة يمينًا ويسارًا لترى بقية الأدوار.<br>' +
    'الأرقام هي أرقام المباريات الرسمية. و«ثالث إحدى المجموعات» يُحدَّد بعد ' +
    'اكتمال دور المجموعات — وجدول توزيعهم رسميّ من الاتحاد الآسيوي ولم يُنشر بعد، ' +
    'فلا نفترضه.';
}

function bracketCard(m) {
  var t = teamsOf(m);
  var res = resultOf(m);
  var c = document.createElement('div');
  c.className = 'br-card';
  var meta = document.createElement('div');
  meta.className = 'br-meta';
  meta.innerHTML = '<span class="no">مباراة ' + arNum(m.n) + '</span><span>' +
    esc(arDate(m.kickoffMs)) + '</span>';
  c.appendChild(meta);

  [[t.home, res ? +res.h : null, 'h'], [t.away, res ? +res.a : null, 'a']].forEach(function (pair) {
    var key = pair[0], sc = pair[1], side = pair[2];
    var row = document.createElement('div');
    var real = isRealTeam(key);
    var cls = 'br-team';
    if (!real) cls += ' tba';
    else if (res) {
      var hw = +res.h > +res.a || (+res.h === +res.a && res.pw === 'h');
      var win = side === 'h' ? hw : !hw;
      cls += win ? ' win' : ' lose';
    }
    row.className = cls;
    row.innerHTML = (real ? flagHTML(key, 28) : '<span class="ph"></span>') +
      '<span class="nm">' + esc(teamArShort(key)) + '</span>' +
      '<span class="sc">' + (sc === null ? '' : arNum(sc)) + '</span>';
    c.appendChild(row);
  });
  return c;
}

/* ---------------------------- القوانين ---------------------------- */

function renderRules() {
  var box = $('rules-body');
  if (!box) return;
  box.innerHTML = '';

  function card(title, html) {
    var c = document.createElement('div');
    c.className = 'rule-card';
    c.innerHTML = '<h4>' + title + '</h4>' + html;
    box.appendChild(c);
  }

  card('⚽ نقاط المباراة',
    '<div class="rule-line"><span>النتيجة مطابقة تمامًا</span><span class="v">٥ نقاط</span></div>' +
    '<div class="rule-line"><span>الاتجاه صحيح فقط (فوز/تعادل/خسارة)</span><span class="v">٣ نقاط</span></div>' +
    '<div class="rule-line"><span>الاتجاه خاطئ</span><span class="v">لا نقاط</span></div>' +
    '<div class="rule-line"><span>توقّعت تعادلًا في مباراة إقصائية وأصبت الفائز بالترجيح</span><span class="v">+١</span></div>' +
    '<div class="rule-p">وبونص الترجيح لا يشترط مطابقة النتيجة: من توقّع ١-١ وانتهت ٢-٢ بالترجيح وأصاب الفائز يأخذ <b>٤</b>. ومن توقّع ٢-٢ بالضبط وأصاب الفائز يأخذ <b>٦</b>.</div>');

  card('⚡ بطاقات ×٢',
    '<div class="rule-line"><span>عدد البطاقات في البطولة كلها</span><span class="v">' + arNum(R.MAX_BOOSTS) + ' بطاقات</span></div>' +
    '<div class="rule-line"><span>أعلى نتيجة ممكنة في مباراة واحدة</span><span class="v">١٢ نقطة</span></div>' +
    '<div class="rule-p">البطاقة تضاعف نقاط المباراة التي تُفعَّل عليها. وقاعدة صارمة: <b>البطاقة المحفوظة مستهلكة نهائيًا ولا ترجع لرصيدك أبدًا</b> — لا بالضغط على الزر، ولا بتحديث التوقّع. فاختر بتدبّر.</div>' +
    '<div class="rule-p">ولو فعّلتها على نتيجة خاطئة، تُستهلك ويبقى حسابك صفرًا في تلك المباراة.</div>');

  card('🏆 توقّعات البطولة',
    '<div class="rule-line"><span>بطل البطولة</span><span class="v">٥ نقاط</span></div>' +
    '<div class="rule-line"><span>هدّاف البطولة</span><span class="v">٣ نقاط</span></div>' +
    '<div class="rule-line"><span>أفضل لاعب</span><span class="v">٣ نقاط</span></div>' +
    '<div class="rule-line"><span>أفضل حارس</span><span class="v">٣ نقاط</span></div>' +
    '<div class="rule-p">تُقفل مع انطلاق أوّل مباراة، ولا تنزل نقاطها إلا بعد أن تُثبَّت النتيجة الفعلية.</div>');

  card('📊 التأهّل وترتيب المجموعات',
    '<div class="rule-line"><span>عدد المنتخبات</span><span class="v">٢٤</span></div>' +
    '<div class="rule-line"><span>المتأهّلون إلى دور الـ١٦</span><span class="v">١٦</span></div>' +
    '<div class="rule-p">يتأهّل أصحاب المركزين الأوّلين من كل مجموعة (١٢ منتخبًا) زائد <b>أفضل أربعة</b> من أصحاب المراكز الثالثة.</div>' +
    '<div class="rule-p">وترتيب المجموعة: النقاط ← المواجهة المباشرة بين المتساويين (نقاطها، فرق أهدافها، أهدافها المسجّلة) ← ومن بقي متساويًا تُعاد عليه القاعدة بمبارياته وحده ← ثم فرق الأهداف الكلي ← الأهداف المسجّلة ← نقاط الإنذارات ← القرعة.</div>');

  card('⏰ متى يُقفل التوقّع؟',
    '<div class="rule-p">التوقّع يُقفل <b>مع صافرة البداية</b>. وبعدها تظهر لك توقّعات بقية اللاعبين.</div>' +
    '<div class="rule-p">والاتحاد الآسيوي <b>لم يُعلن توقيتات الانطلاق بعد</b>. فحتى يُعلنها، يُقفل التوقّع في ساعة مبكّرة من يوم المباراة — أبكر من أيّ انطلاق محتمل — حتى لا يبقى مفتوحًا بعد أن تبدأ المباراة. وستظهر الساعة الدقيقة في بطاقة كل مباراة أوّل ما تُعلَن.</div>');

  card('ℹ️ عن البطولة',
    '<div class="rule-line"><span>المضيف</span><span class="v">السعودية</span></div>' +
    '<div class="rule-line"><span>التاريخ</span><span class="v">٧ يناير — ٥ فبراير ٢٠٢٧</span></div>' +
    '<div class="rule-line"><span>المباريات</span><span class="v">٥١</span></div>' +
    '<div class="rule-line"><span>الملاعب</span><span class="v">٨ في ٣ مدن</span></div>' +
    '<div class="rule-p">الرياض ٣١ مباراة، جدة ١٣، الخبر ٧. والافتتاح <b>السعودية × فلسطين</b> في استاد مدينة الملك فهد، والنهائي في الملعب نفسه.</div>');
}

/* ---------------------------- التنقّل ---------------------------- */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
  var el = $(id);
  if (el) el.classList.add('active');
  document.querySelectorAll('.tab').forEach(function (t) {
    t.classList.toggle('active', t.dataset.screen === id);
  });
  window.scrollTo(0, 0);
  if (id === 's-rules') renderRules();
  if (id === 's-groups') renderGroups();
  if (id === 's-bracket') renderBracket();
  if (id === 's-leader') renderLeader();
}

/* ---------------------------- الإقلاع ---------------------------- */

function boot() {
  prepareMatches();
  renderRules();

  var provisional = MATCHES.filter(function (m) { return m.provisional; }).length;
  $('login-note').innerHTML = '📅 الجدول الكامل محمَّل: <b>' + arNum(MATCHES.length) +
    ' مباراة</b> بتواريخها وملاعبها، من ملفّ الاتحاد الآسيوي الرسمي.' +
    (provisional ? '<br>⏰ توقيتات الانطلاق لم تُعلَن بعد لـ' + arNum(provisional) +
      ' مباراة، فالتوقّع يُقفل في ساعة مبكّرة آمنة من يوم المباراة.' : '');

  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { showScreen(t.dataset.screen); });
  });
  document.querySelectorAll('[data-gsub]').forEach(function (b) {
    b.addEventListener('click', function () {
      activeGroupSub = b.dataset.gsub;
      document.querySelectorAll('[data-gsub]').forEach(function (x) {
        x.classList.toggle('active', x === b);
      });
      renderGroups();
    });
  });
  $('me-chip').addEventListener('click', logout);
  $('btn-login').addEventListener('click', function () {
    attemptLogin($('in-name').value, $('in-pin').value, false);
  });
  $('in-pin').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') $('btn-login').click();
  });
  $('btn-settings').addEventListener('click', function () {
    var code = prompt('رمز الإدارة:');
    if (code === null) return;
    if (code === ADMIN_CODE) {
      isAdmin = !isAdmin;
      $('btn-settings').classList.toggle('on', isAdmin);
      toast(isAdmin ? 'وضع الإدارة مفتوح' : 'وضع الإدارة مُغلق');
      renderAll();
    } else toast('رمز خاطئ');
  });

  if (!initFirebase()) {
    $('login-err').textContent = 'إعدادات Firebase غير مضبوطة.';
    return;
  }
  if (DEMO) {
    // بانر واضح حتى لا يُظنّ أنها بيانات حقيقية
    var b = document.createElement('div');
    b.className = 'notice warn';
    b.innerHTML = '🧪 <b>وضع التجربة:</b> البيانات وهمية وتُنسى عند تحديث الصفحة، ' +
      'ولا شيء يُكتب في قاعدة البيانات. لاستخدام التطبيق فعليًّا احذف <code>?demo=1</code> من الرابط.';
    $('s-login').insertBefore(b, $('s-login').firstChild);
    $('in-name').value = 'Mnajjar3';
    $('in-pin').value = '0000';
    return;
  }
  // دخول تلقائي إن كان الجهاز مسجّلًا من قبل
  try {
    var saved = JSON.parse(localStorage.getItem('asia27_auth') || 'null');
    if (saved && saved.n && saved.p) {
      firebase.auth().onAuthStateChanged(function (u) {
        if (u) attemptLogin(saved.n, saved.p, true);
      });
    }
  } catch (e) {}
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
