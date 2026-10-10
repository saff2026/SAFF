/* ===========================================================================
 *  اختبار قواعد الاحتساب — يقرأ نفس ملفّ الحالات الذي يقرأه اختبار Swift
 * ---------------------------------------------------------------------------
 *  التشغيل:  node AsiaCup2027/web/rules.test.js
 *
 *  الغرض: إثبات أنّ نسخة JavaScript تحسب **بالضبط** كما تحسب نسخة Swift.
 *  القواعد مواصفة واحدة في shared/rules-fixtures.json، والنسختان تُقاسان
 *  عليها. فلو انحرفت إحداهما فشل اختبارها فورًا.
 * =========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const R = require('./rules.js');

const FIXTURES = path.join(__dirname, '..', 'shared', 'rules-fixtures.json');
const fx = JSON.parse(fs.readFileSync(FIXTURES, 'utf8'));

let passed = 0, failed = 0;
const failures = [];

function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) passed++;
  else { failed++; failures.push(`${label}\n      حصلنا: ${JSON.stringify(got)}\n      متوقَّع: ${JSON.stringify(want)}`); }
}

function section(name) { console.log(`\n── ${name} ──`); }

/* ---- ١) نقاط المباراة ---- */
section('نقاط المباراة');
fx.matchPoints.forEach((c) => {
  const pred = { h: c.pred[0], a: c.pred[1] };
  if (c.predPW) pred.pw = c.predPW;
  const res = { h: c.res[0], a: c.res[1] };
  if (c.resPW) res.pw = c.resPW;
  check(c.why, R.points(pred, res), c.points);
});
console.log(`   ${fx.matchPoints.length} حالة`);

/* ---- ٢) المضاعفة بالبطاقة ---- */
section('مضاعفة بطاقة ×٢');
fx.matchScoreWithBoost.forEach((c) => {
  const pred = { h: c.pred[0], a: c.pred[1], x2: c.boost };
  if (c.predPW) pred.pw = c.predPW;
  const res = { h: c.res[0], a: c.res[1] };
  if (c.resPW) res.pw = c.resPW;
  check(c.why, R.score(pred, res), c.score);
});
console.log(`   ${fx.matchScoreWithBoost.length} حالة`);

/* ---- ٣) نقاط توقّعات البطولة ---- */
section('توقّعات البطولة الأربعة');
// أسماء الحقول في الملفّ المشترك بأسماء Swift الكاملة؛ وفي JS مختصرة كما
// في قاعدة البيانات. هذا التحويل هو كل الفرق بين النسختين.
const toJsPicks = (p) => ({
  champion: p.champion, scorer: p.topScorer, mvp: p.bestPlayer, gk: p.bestGoalkeeper
});
fx.tournamentPoints.forEach((c) => {
  check(c.why, R.tournamentPoints(toJsPicks(c.picks), toJsPicks(c.truth)), c.points);
});
console.log(`   ${fx.tournamentPoints.length} حالة`);

/* ---- ٤) الحارس الأخير للبطاقات ---- */
section('حدّ بطاقات ×٢ (الحارس الأخير)');
check('الحدّ في الملفّ المشترك', R.MAX_BOOSTS, fx.maxBoostsPerPlayer);
fx.boostCap.forEach((c) => {
  const matches = c.kickoffOrder.map((id, i) => ({
    id, n: i + 1, kickoffMs: 1799000000000 + i * 86400000
  }));
  const preds = {};
  c.kickoffOrder.forEach((id) => {
    preds[id] = { p: { h: 1, a: 0, x2: c.boosted.indexOf(id) >= 0 } };
  });
  const cancelled = R.applyBoostCap(preds, matches);
  const kept = c.kickoffOrder.filter((id) => preds[id].p.x2);
  check(c.why + ' — الباقية', kept.slice().sort(), c.kept.slice().sort());
  check(c.why + ' — الملغاة',
        cancelled.map((x) => x.matchId).sort(), c.cancelled.slice().sort());
});
console.log(`   ${fx.boostCap.length} حالة`);

/* ---- ٥) ترتيب المجموعات ---- */
section('ترتيب المجموعات وفضّ التساوي');
fx.groupTable.forEach((c) => {
  const matches = c.fixtures.map((f, i) => ({
    id: f[0], n: i + 1, stage: 'group', group: 'A', home: f[1], away: f[2],
    kickoffMs: 1799000000000 + i * 86400000
  }));
  const results = {};
  Object.keys(c.results).forEach((id) => {
    results[id] = { h: c.results[id][0], a: c.results[id][1] };
  });
  const table = R.groupTable({
    group: 'A', teams: c.teams, matches, results,
    disciplinary: c.disciplinary || {}, lotsOrder: c.lotsOrder || []
  });

  if (c.order) check(c.why + ' — الترتيب', table.map((r) => r.team), c.order);

  const KEYS = { played: 'played', won: 'won', drawn: 'drawn', lost: 'lost',
                 points: 'points', goalsFor: 'goalsFor',
                 goalsAgainst: 'goalsAgainst', goalDifference: 'gd' };
  const checkRow = (row, want, label) => {
    Object.keys(want).forEach((k) => {
      if (KEYS[k] === undefined) return;
      check(`${label} — ${k}`, row[KEYS[k]], want[k]);
    });
  };
  if (c.rows) {
    Object.keys(c.rows).forEach((team) => {
      const row = table.find((r) => r.team === team);
      if (!row) { failed++; failures.push(`${c.why}: ${team} غير موجود`); return; }
      checkRow(row, c.rows[team], `${c.why} — ${team}`);
    });
  }
  if (c.allRows) {
    table.forEach((row) => checkRow(row, c.allRows, `${c.why} — ${row.team}`));
  }
  if (c.iraqBeforeOman) {
    const names = table.map((r) => r.team);
    check(c.why + ' — العراق قبل عُمان',
          names.indexOf('Iraq') < names.indexOf('Oman'), true);
  }
});
console.log(`   ${fx.groupTable.length} حالة`);

/* ---- ٦) أفضل أربعة ثوالث ---- */
section('ترتيب أفضل أربعة ثوالث');
fx.thirdPlace.forEach((c) => {
  const ranked = R.rankThirdPlaced(c.rows, c.lotsOrder || []);
  check(c.why + ' — الترتيب', ranked.map((r) => r.team), c.order);
  if (c.qualified) {
    const q = R.qualifiedThirdPlaced(c.rows, c.lotsOrder || []);
    check(c.why + ' — المتأهّلون', q.map((r) => r.team), c.qualified);
  }
});
console.log(`   ${fx.thirdPlace.length} حالة`);

/* ---- ٧) تحقّقات إضافية خاصة بنسخة JS ---- */
section('طبقات حماية البطاقات');
{
  // الطبقة الأولى: المسوّدة تزيد العدد ولا تُلغي محفوظة
  const preds = { m1: { ali: { h: 1, a: 0, x2: true } } };
  check('المحفوظة تُعدّ', R.savedBoostCount(preds, 'ali'), 1);
  check('المسوّدة تزيد العدد',
        R.displayedBoostCount(preds, 'ali', { m2: { h: 1, a: 0, x2: true } }), 2);
  check('المسوّدة لا تُلغي محفوظة',
        R.displayedBoostCount(preds, 'ali', { m1: { h: 1, a: 0, x2: false } }), 1);
  check('الرصيد الباقي', R.remainingBoosts(preds, 'ali', {}), 4);
  check('بطاقات غيره لا تُعدّ', R.savedBoostCount(preds, 'sara'), 0);

  // الطبقة الثانية: قرار الحفظ
  check('المحفوظة تُكتب قسرًا ولو لم تُطلب',
        R.resolveBoostOnSave(preds, 'm1', 'ali', false), true);
  check('لم يطلب بطاقة', R.resolveBoostOnSave({}, 'm1', 'ali', false), false);
  const full = {};
  for (let i = 1; i <= 5; i++) full['m' + i] = { ali: { h: 1, a: 0, x2: true } };
  check('الرصيد منتهٍ ⇒ رفض', R.resolveBoostOnSave(full, 'm9', 'ali', true), null);
  const four = {};
  for (let i = 1; i <= 4; i++) four['m' + i] = { ali: { h: 1, a: 0, x2: true } };
  check('الخامسة مسموحة', R.resolveBoostOnSave(four, 'm5', 'ali', true), true);
}

section('حالة المباراة وصحّة التوقّع');
{
  const K = 1799000000000;
  check('مفتوحة قبل الانطلاق', R.matchStatus({ now: K - 1000, kickoffMs: K,
    isKnockout: false, homeResolved: true, awayResolved: true }), 'open');
  check('تُقفل مع الصافرة بالضبط', R.matchStatus({ now: K, kickoffMs: K,
    isKnockout: false, homeResolved: true, awayResolved: true }), 'locked');
  check('النتيجة تسبق كل شيء', R.matchStatus({ now: K - 99999, kickoffMs: K,
    result: { h: 1, a: 0 }, isKnockout: false, homeResolved: true, awayResolved: true }), 'finished');
  check('إقصائية بانتظار الفرق', R.matchStatus({ now: K - 86400000, kickoffMs: K,
    isKnockout: true, homeResolved: true, awayResolved: false }), 'awaitingTeams');
  check('مجموعات لا تنتظر الفرق', R.matchStatus({ now: K - 1000, kickoffMs: K,
    isKnockout: false, homeResolved: false, awayResolved: false }), 'open');
  check('الحفظ مسموح للمفتوحة فقط', [R.canSave('open'), R.canSave('locked')], [true, false]);

  check('تعادل إقصائي يلزمه فائز بالترجيح',
        R.requiresPenaltyWinner(true, { h: 1, a: 1 }), true);
  check('تعادل في المجموعات لا يلزمه',
        R.requiresPenaltyWinner(false, { h: 1, a: 1 }), false);
  check('تعادل إقصائي بلا فائز مرفوض',
        R.isValidPrediction(true, { h: 1, a: 1 }), false);
  check('تعادل إقصائي بفائز مقبول',
        R.isValidPrediction(true, { h: 1, a: 1, pw: 'h' }), true);
  check('نتيجة سالبة مرفوضة', R.isValidPrediction(false, { h: -1, a: 0 }), false);
  check('٣١ هدفًا مرفوض', R.isValidPrediction(false, { h: 0, a: 31 }), false);
  check('٣٠ هدفًا مقبول', R.isValidPrediction(false, { h: 0, a: 30 }), true);
}

section('جدول الترتيب العام');
{
  const players = [
    { key: 'ali', name: 'علي', picks: {} },
    { key: 'sara', name: 'سارة', picks: { champion: 'Japan' } },
    { key: 'omar', name: 'عمر', picks: {} }
  ];
  const preds = {
    m1: { ali: { h: 2, a: 1 }, sara: { h: 1, a: 0 }, omar: { h: 0, a: 2 } },
    m2: { ali: { h: 1, a: 1, x2: true }, sara: { h: 3, a: 0 } }
  };
  const results = { m1: { h: 2, a: 1 }, m2: { h: 1, a: 1 } };
  const table = R.leaderboard({ players, preds, results, truth: { champion: 'Japan' } });
  check('المتصدّر', table[0].key, 'ali');
  check('نقاط مبارياته', table[0].matchPoints, 15);
  check('نتائجه المطابقة', table[0].exactHits, 2);
  check('بطاقاته المستهلكة', table[0].boostsUsed, 1);
  const sara = table.find((r) => r.key === 'sara');
  check('مجموع سارة مع البطل', sara.total, 8);
  check('مجموع عمر', table.find((r) => r.key === 'omar').total, 0);

  // البطاقة تُعدّ مستهلكة قبل انتهاء المباراة
  const t2 = R.leaderboard({ players, preds: { m1: { ali: { h: 1, a: 0, x2: true } } },
                             results: {}, truth: {} });
  check('البطاقة مستهلكة فورًا', t2.find((r) => r.key === 'ali').boostsUsed, 1);
  check('بلا نتيجة لا نقاط', t2.find((r) => r.key === 'ali').total, 0);

  // التقييد يجب أن يسبق بناء الجدول
  const raw = {}, res6 = {};
  const matches6 = [];
  for (let i = 1; i <= 6; i++) {
    raw['m' + i] = { ali: { h: 1, a: 0, x2: true } };
    res6['m' + i] = { h: 1, a: 0 };
    matches6.push({ id: 'm' + i, n: i, kickoffMs: 1799000000000 + i * 86400000 });
  }
  const before = R.leaderboard({ players, preds: raw, results: res6, truth: {} });
  check('بلا تقييد: ٦×١٠', before.find((r) => r.key === 'ali').total, 60);
  R.applyBoostCap(raw, matches6);
  const after = R.leaderboard({ players, preds: raw, results: res6, truth: {} });
  check('بعد التقييد: ٥×١٠ + ٥', after.find((r) => r.key === 'ali').total, 55);
  check('البطاقات المحتسبة', after.find((r) => r.key === 'ali').boostsUsed, 5);
}

section('التنسيق العربي');
check('الأرقام ٥١', R.arNum(51), '٥١');
check('الأرقام ٢٠٢٧', R.arNum(2027), '٢٠٢٧');
check('الأرقام ٠', R.arNum(0), '٠');
check('لا نقاط', R.arPoints(0), 'لا نقاط');
check('نقطة', R.arPoints(1), 'نقطة');
check('نقطتان', R.arPoints(2), 'نقطتان');
check('٥ نقاط', R.arPoints(5), '٥ نقاط');
check('١٢ نقطة', R.arPoints(12), '١٢ نقطة');

/* ---- النتيجة ---- */
console.log('\n' + '═'.repeat(60));
if (failed === 0) {
  console.log(`✅ نجحت كل التحقّقات: ${passed} تحقّقًا، صفر فشل`);
  console.log('   ونسخة JavaScript تحسب بالضبط كما تحسب نسخة Swift،');
  console.log('   لأن كلتيهما قُيستا على نفس ملفّ الحالات.');
  process.exit(0);
} else {
  console.log(`❌ فشل ${failed} من ${passed + failed} تحقّقًا:\n`);
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exit(1);
}
