/* ===========================================================================
 *  قواعد احتساب كأس آسيا ٢٠٢٧
 * ---------------------------------------------------------------------------
 *  هذا الملفّ هو **المرجع الوحيد** لكل حساب في التطبيق: النقاط، بطاقات ×٢،
 *  ترتيب المجموعات، وترتيب أفضل أربعة ثوالث.
 *
 *  وهو منقول من نسخة Swift في AsiaCup2027/Core، وكلتاهما تُختبَران على
 *  **نفس ملفّ الحالات** في AsiaCup2027/shared/rules-fixtures.json. فلو
 *  انحرفت إحداهما عن الأخرى فشل اختبارها فورًا.
 *
 *  القواعد نفسها منقولة من تطبيق خليجي ٢٧ الذي عمل فعليًا مع ٢٩ لاعبًا
 *  حتى نهاية البطولة. لم نُعد اختراع شيء.
 *
 *  يعمل في المتصفّح (window.AsiaRules) وفي node (module.exports).
 * =========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AsiaRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---- نقاط المباراة ---- */

  var EXACT_POINTS = 5;        // نتيجة مطابقة تمامًا
  var DIRECTION_POINTS = 3;    // الاتجاه صحيح فقط
  var PENALTY_BONUS = 1;       // إصابة الفائز بالترجيح

  function sign(n) { return n > 0 ? 1 : (n < 0 ? -1 : 0); }

  /**
   * نقاط التوقّع قبل مضاعفة البطاقة.
   *
   * الرقمان صحيحان ← ٥ · الاتجاه صحيح فقط ← ٣ · الاتجاه خاطئ ← ٠
   * **زائد ١** إذا حُسمت المباراة بالترجيح، وتوقّع اللاعب تعادلًا، وأصاب
   * الفائز بالترجيح.
   *
   * ملاحظة على البونص: لا يُشترط أن يكون التعادل مطابقًا. من توقّع ١-١
   * وانتهت ٢-٢ بالترجيح وأصاب الفائز يأخذ ٣+١ = ٤. ومن توقّع ٢-٢ بالضبط
   * وأصاب الفائز يأخذ ٥+١ = ٦. هذا سلوك خليجي ٢٧ نفسه.
   *
   * @param {{h:number,a:number,pw?:string}} pred توقّع اللاعب
   * @param {{h:number,a:number,pw?:string}} res  النتيجة الفعلية
   * @returns {number|null} null إذا لم يوجد توقّع أو نتيجة
   */
  function points(pred, res) {
    if (!pred || !res) return null;
    var ph = Number(pred.h), pa = Number(pred.a);
    var rh = Number(res.h), ra = Number(res.a);

    var isExact = ph === rh && pa === ra;
    var base = isExact ? EXACT_POINTS
             : (sign(ph - pa) === sign(rh - ra) ? DIRECTION_POINTS : 0);

    var bonus = 0;
    var wentToPenalties = rh === ra && !!res.pw;   // تعادل + فائز بالترجيح
    if (wentToPenalties && pred.pw && ph === pa && pred.pw === res.pw) {
      bonus = PENALTY_BONUS;
    }
    return base + bonus;
  }

  /** النقاط النهائية بعد تطبيق بطاقة ×٢ إن كانت مفعّلة. */
  function score(pred, res) {
    var raw = points(pred, res);
    if (raw === null) return null;
    return pred && pred.x2 ? raw * 2 : raw;
  }

  /* ---- نقاط توقّعات البطولة الأربعة ---- */

  var CHAMPION_POINTS = 5;
  var SCORER_POINTS = 3;
  var MVP_POINTS = 3;
  var GK_POINTS = 3;

  /**
   * كل بند يُحسب فقط عندما يكون توقّع اللاعب موجودًا **و** النتيجة الفعلية
   * معروفة **و** متطابقين. فلا تنزل نقاط قبل أن تُثبَّت النتيجة.
   */
  function tournamentPoints(picks, truth) {
    if (!picks || !truth) return 0;
    var total = 0;
    if (picks.champion && truth.champion && picks.champion === truth.champion) total += CHAMPION_POINTS;
    if (picks.scorer && truth.scorer && picks.scorer === truth.scorer) total += SCORER_POINTS;
    if (picks.mvp && truth.mvp && picks.mvp === truth.mvp) total += MVP_POINTS;
    if (picks.gk && truth.gk && picks.gk === truth.gk) total += GK_POINTS;
    return total;
  }

  /* ---- بطاقات ×٢ ----
   *
   * القاعدة الصارمة المأخوذة من تجربة خليجي ٢٧:
   *   البطاقة المحفوظة في قاعدة البيانات مستهلكة نهائيًا، ولا ترجع إلى
   *   الرصيد أبدًا — لا بالضغط على الزر، ولا بتحديث التوقّع، ولا عند فشل
   *   الحفظ.
   * ولها ثلاث طبقات حماية، كلّها هنا.
   */

  var MAX_BOOSTS = 5;   // خليجي ٢٧ كان ٢ على ١٥ مباراة؛ وهنا ٥١ مباراة

  /**
   * البطاقات المحفوظة فعليًا في قاعدة البيانات. هي المرجع عند الحفظ.
   * @param {Object} preds {معرّف المباراة: {مفتاح اللاعب: توقّع}}
   */
  function savedBoostCount(preds, playerKey, exceptMatchId) {
    var n = 0;
    for (var mid in preds) {
      if (!Object.prototype.hasOwnProperty.call(preds, mid)) continue;
      if (mid === exceptMatchId) continue;
      var p = preds[mid] && preds[mid][playerKey];
      if (p && p.x2) n++;
    }
    return n;
  }

  /**
   * الطبقة الأولى: العدّ المعروض يشمل المسوّدات التي لم تُحفظ بعد.
   * بدونها يستطيع اللاعب تفعيل ×٢ على عشر مباريات ثم حفظها كلها فيتجاوز الحد.
   *
   * اتجاه واحد: المسوّدة **تزيد** العدد فقط، ولا تُلغي بطاقة محفوظة أبدًا.
   */
  function displayedBoostCount(preds, playerKey, drafts, exceptMatchId) {
    drafts = drafts || {};
    var ids = {};
    for (var a in preds) if (Object.prototype.hasOwnProperty.call(preds, a)) ids[a] = 1;
    for (var b in drafts) if (Object.prototype.hasOwnProperty.call(drafts, b)) ids[b] = 1;

    var n = 0;
    for (var mid in ids) {
      if (mid === exceptMatchId) continue;
      var saved = !!(preds[mid] && preds[mid][playerKey] && preds[mid][playerKey].x2);
      var draft = !!(drafts[mid] && drafts[mid].x2);
      if (saved || draft) n++;
    }
    return n;
  }

  /** كم بطاقة بقيت للاعب بحسب ما يُعرض في الواجهة؟ */
  function remainingBoosts(preds, playerKey, drafts) {
    return Math.max(0, MAX_BOOSTS - displayedBoostCount(preds, playerKey, drafts));
  }

  /** هل البطاقة محفوظة فعلًا على هذه المباراة؟ (محفوظة = مستهلكة نهائيًا) */
  function isBoostLocked(preds, matchId, playerKey) {
    return !!(preds[matchId] && preds[matchId][playerKey] && preds[matchId][playerKey].x2);
  }

  /**
   * الطبقة الثانية: ماذا نكتب في حقل x2 عند الحفظ؟
   * @returns {boolean|null} null تعني أن اللاعب طلب بطاقة واستنفد رصيده،
   *   فيجب رفض الطلب وتنبيهه.
   */
  function resolveBoostOnSave(preds, matchId, playerKey, requested) {
    // محفوظة مسبقًا ⇒ تُكتب دائمًا، حتى لا يُلغيها تحديث التوقّع.
    if (isBoostLocked(preds, matchId, playerKey)) return true;
    if (!requested) return false;
    // تحقّق أخير على المحفوظ لا على المعروض.
    if (savedBoostCount(preds, playerKey, matchId) >= MAX_BOOSTS) return null;
    return true;
  }

  /**
   * الطبقة الثالثة (الحارس الأخير): تطبيق الحدّ على بيانات واردة.
   *
   * من فعّل ×٢ على أكثر من MAX_BOOSTS مباراة تُحتسب له أوّل البطاقات فقط
   * — **الأقدم حسب موعد انطلاق المباراة** — ويُلغى الزائد.
   *
   * يعدّل preds في مكانها (كما يفعل خليجي ٢٧) ويُرجع قائمة ما أُلغي.
   * @param {Array} matches مباريات البطولة، لمعرفة موعد الانطلاق
   * @returns {Array<{playerKey:string, matchId:string}>}
   */
  function applyBoostCap(preds, matches) {
    // ترتيب المباريات: الأقدم موعدًا، وعند التساوي يُحسم بالرقم الرسمي
    // حتى يكون الترتيب محدَّدًا لا عشوائيًا.
    var order = {};
    matches.slice().sort(function (x, y) {
      if (x.kickoffMs !== y.kickoffMs) return x.kickoffMs - y.kickoffMs;
      return x.n - y.n;
    }).forEach(function (m, i) { order[m.id] = i; });

    var byPlayer = {};
    for (var mid in preds) {
      if (!Object.prototype.hasOwnProperty.call(preds, mid)) continue;
      var byKey = preds[mid];
      for (var key in byKey) {
        if (!Object.prototype.hasOwnProperty.call(byKey, key)) continue;
        if (byKey[key] && byKey[key].x2) {
          (byPlayer[key] = byPlayer[key] || []).push(mid);
        }
      }
    }

    var cancelled = [];
    Object.keys(byPlayer).forEach(function (key) {
      var ids = byPlayer[key];
      if (ids.length <= MAX_BOOSTS) return;
      ids.sort(function (x, y) {
        // مباراة غير موجودة في الجدول تُدفع إلى الآخر بدل أن تنهار المقارنة.
        var ox = order[x] === undefined ? Infinity : order[x];
        var oy = order[y] === undefined ? Infinity : order[y];
        if (ox !== oy) return ox - oy;
        return x < y ? -1 : (x > y ? 1 : 0);
      });
      ids.slice(MAX_BOOSTS).forEach(function (mid) {
        preds[mid][key].x2 = false;   // لا تُحسب مضاعفة في أيّ شاشة أو ملصق
        cancelled.push({ playerKey: key, matchId: mid });
      });
    });

    cancelled.sort(function (x, y) {
      if (x.playerKey !== y.playerKey) return x.playerKey < y.playerKey ? -1 : 1;
      var ox = order[x.matchId] === undefined ? Infinity : order[x.matchId];
      var oy = order[y.matchId] === undefined ? Infinity : order[y.matchId];
      return ox - oy;
    });
    return cancelled;
  }

  /* ---- ترتيب المجموعات ----
   *
   * الدرس المكتوب في تعليقات خليجي ٢٧، وننقله كما هو:
   * لا تُدخل الترجيح اليدوي داخل دالة المقارنة. لو فعلت، صارت المقارنة غير
   * متعدّية فيخرج ترتيب غير محدَّد:
   *     عُمان قبل العراق باللعب النظيف،
   *     والعراق قبل الكويت أبجديًا،
   *     والكويت قبل عُمان أبجديًا!
   * الحل: رتّب بالمعايير الرقمية أولًا، ثم أعد ترتيب المنتخبات المذكورة في
   * القائمة اليدوية داخل المواضع التي تحتلّها هي نفسها فقط.
   */

  function newRow(team, group) {
    return { team: team, group: group || '', played: 0, won: 0, drawn: 0, lost: 0,
             goalsFor: 0, goalsAgainst: 0, points: 0, disciplinary: 0, gd: 0 };
  }

  /**
   * جدول مجموعة واحدة مرتَّبًا بالكامل.
   * @param {Object} opts {group, teams, matches, results, disciplinary, lotsOrder}
   */
  function groupTable(opts) {
    var group = opts.group;
    var teams = opts.teams;
    var results = opts.results || {};
    var disciplinary = opts.disciplinary || {};
    var lotsOrder = opts.lotsOrder || [];

    var rows = {};
    teams.forEach(function (t) {
      rows[t] = newRow(t, group);
      rows[t].disciplinary = disciplinary[t] || 0;
    });

    var groupMatches = (opts.matches || []).filter(function (m) {
      return m.stage === 'group' && m.group === group;
    });

    var played = {};
    groupMatches.forEach(function (m) {
      var r = results[m.id];
      if (!r) return;
      var home = rows[m.home], away = rows[m.away];
      if (!home || !away) return;
      played[m.id] = r;

      var hg = Number(r.h !== undefined ? r.h : r[0]);
      var ag = Number(r.a !== undefined ? r.a : r[1]);

      home.played++; away.played++;
      home.goalsFor += hg; home.goalsAgainst += ag;
      away.goalsFor += ag; away.goalsAgainst += hg;
      if (hg > ag)      { home.won++;  home.points += 3; away.lost++; }
      else if (hg < ag) { away.won++;  away.points += 3; home.lost++; }
      else              { home.drawn++; away.drawn++; home.points++; away.points++; }
    });

    var list = teams.map(function (t) { return rows[t]; });
    list.forEach(function (r) { r.gd = r.goalsFor - r.goalsAgainst; });
    return sortGroup(list, groupMatches, played, lotsOrder);
  }

  /** نقاط، ثم فضّ التساوي بالمواجهات المباشرة بشكل تكراري. */
  function sortGroup(rows, groupMatches, results, lotsOrder) {
    var byPoints = rows.slice().sort(function (x, y) { return y.points - x.points; });
    var out = [], i = 0;
    while (i < byPoints.length) {
      var j = i;
      while (j + 1 < byPoints.length && byPoints[j + 1].points === byPoints[i].points) j++;
      if (j === i) out.push(byPoints[i]);
      else out = out.concat(rankTied(byPoints.slice(i, j + 1), groupMatches, results, lotsOrder));
      i = j + 1;
    }
    return out;
  }

  /**
   * فضّ التساوي بالمواجهة المباشرة، بشكل تكراري.
   *
   * نقاط المواجهات المباشرة بين المتساويين، ثم فرق الأهداف فيها، ثم الأهداف
   * المسجّلة فيها. ومن بقي متساويًا بعدها يُعاد تجزئته وتُطبَّق القاعدة عليه
   * من جديد بمبارياته وحده. وإن لم تفصل المواجهة المباشرة بين الجميع إطلاقًا،
   * انتقلنا إلى المعايير العامة.
   */
  function rankTied(tied, groupMatches, results, lotsOrder) {
    if (tied.length <= 1) return tied.slice();

    var names = {};
    tied.forEach(function (r) { names[r.team] = 1; });
    var h2h = {};
    tied.forEach(function (r) { h2h[r.team] = { points: 0, gf: 0, ga: 0 }; });

    groupMatches.forEach(function (m) {
      var r = results[m.id];
      if (!r) return;
      if (!names[m.home] || !names[m.away]) return;
      var hg = Number(r.h !== undefined ? r.h : r[0]);
      var ag = Number(r.a !== undefined ? r.a : r[1]);
      var home = h2h[m.home], away = h2h[m.away];
      home.gf += hg; home.ga += ag;
      away.gf += ag; away.ga += hg;
      if (hg > ag)      home.points += 3;
      else if (hg < ag) away.points += 3;
      else            { home.points++; away.points++; }
    });
    Object.keys(h2h).forEach(function (t) { h2h[t].gd = h2h[t].gf - h2h[t].ga; });

    var sorted = tied.slice().sort(function (x, y) {
      var a = h2h[x.team], b = h2h[y.team];
      if (a.points !== b.points) return b.points - a.points;
      if (a.gd !== b.gd) return b.gd - a.gd;
      if (a.gf !== b.gf) return b.gf - a.gf;
      return 0;   // متساويان تمامًا: نحسمه في مرحلة لاحقة لا هنا
    });

    // جمّع من بقي متساويًا تمامًا في إحصاء المواجهة المباشرة
    var buckets = [], i = 0;
    while (i < sorted.length) {
      var j = i;
      while (j + 1 < sorted.length) {
        var a = h2h[sorted[j].team], b = h2h[sorted[j + 1].team];
        if (a.points === b.points && a.gd === b.gd && a.gf === b.gf) j++;
        else break;
      }
      buckets.push(sorted.slice(i, j + 1));
      i = j + 1;
    }

    // لم تفصل المواجهة المباشرة بين أيّ اثنين ⇒ المعايير العامة
    if (buckets.length === 1 && buckets[0].length === tied.length) {
      return rankByOverall(tied, lotsOrder);
    }

    var out = [];
    buckets.forEach(function (b) {
      out = out.concat(rankTied(b, groupMatches, results, lotsOrder));
    });
    return out;
  }

  /**
   * المعايير العامة: فرق الأهداف الكلي، ثم الأهداف المسجّلة، ثم نقاط
   * الإنذارات (الأقلّ أفضل)، ثم القرعة، وإلّا أبجديًا ليكون الناتج محدَّدًا.
   */
  function rankByOverall(rows, lotsOrder) {
    var sorted = rows.slice().sort(function (x, y) {
      if (x.gd !== y.gd) return y.gd - x.gd;
      if (x.goalsFor !== y.goalsFor) return y.goalsFor - x.goalsFor;
      if (x.disciplinary !== y.disciplinary) return x.disciplinary - y.disciplinary;
      return x.team < y.team ? -1 : (x.team > y.team ? 1 : 0);
    });
    return applyLots(sorted, lotsOrder);
  }

  /**
   * يطبّق الترجيح اليدوي (القرعة) بين من تساوى في كل المعايير الرقمية فقط،
   * ودون المساس بترتيب غيره — فتبقى المقارنة متعدّية.
   */
  function applyLots(sorted, lotsOrder) {
    if (!lotsOrder || !lotsOrder.length) return sorted;
    var result = sorted.slice();
    var i = 0;
    while (i < result.length) {
      var j = i;
      while (j + 1 < result.length &&
             result[j + 1].points === result[i].points &&
             result[j + 1].gd === result[i].gd &&
             result[j + 1].goalsFor === result[i].goalsFor &&
             result[j + 1].disciplinary === result[i].disciplinary) j++;
      if (j > i) {
        var slots = [], picks = [];
        for (var k = i; k <= j; k++) {
          if (lotsOrder.indexOf(result[k].team) >= 0) { slots.push(k); picks.push(result[k]); }
        }
        if (picks.length > 1) {
          picks.sort(function (x, y) {
            return lotsOrder.indexOf(x.team) - lotsOrder.indexOf(y.team);
          });
          slots.forEach(function (slot, idx) { result[slot] = picks[idx]; });
        }
      }
      i = j + 1;
    }
    return result;
  }

  /* ---- أفضل أربعة أصحاب مركز ثالث ----
   *
   * منطق جديد لا وجود له في خليجي ٢٧. وفرق جوهري عن ترتيب المجموعة: أصحاب
   * المراكز الثالثة من مجموعات مختلفة، فلا مواجهة مباشرة بينهم، فالمعايير
   * كلّها عامة من البداية.
   */

  var THIRD_PLACE_QUALIFY = 4;

  /** ترتيب أصحاب المراكز الثالثة من الأفضل إلى الأسوأ. */
  function rankThirdPlaced(rows, lotsOrder) {
    var list = rows.map(function (r) {
      var c = newRow(r.team, r.group);
      c.played = r.played === undefined ? 3 : r.played;
      c.points = r.points;
      c.goalsFor = r.goalsFor;
      c.goalsAgainst = r.goalsAgainst;
      c.disciplinary = r.disciplinary || 0;
      c.gd = c.goalsFor - c.goalsAgainst;
      return c;
    });
    var sorted = list.sort(function (x, y) {
      if (x.points !== y.points) return y.points - x.points;
      if (x.gd !== y.gd) return y.gd - x.gd;
      if (x.goalsFor !== y.goalsFor) return y.goalsFor - x.goalsFor;
      if (x.disciplinary !== y.disciplinary) return x.disciplinary - y.disciplinary;
      // تساوٍ تام: بمفتاح المجموعة ثم الاسم حتى يكون الناتج محدَّدًا لا
      // عشوائيًا، ثم تأتي القرعة فتصحّحه.
      if (x.group !== y.group) return x.group < y.group ? -1 : 1;
      return x.team < y.team ? -1 : (x.team > y.team ? 1 : 0);
    });
    return applyLots(sorted, lotsOrder || []);
  }

  /** المتأهّلون الأربعة فقط. */
  function qualifiedThirdPlaced(rows, lotsOrder) {
    return rankThirdPlaced(rows, lotsOrder).slice(0, THIRD_PLACE_QUALIFY);
  }

  /* ---- حالة المباراة ---- */

  /**
   * منقولة من statusOf في خليجي ٢٧:
   * دخلت نتيجتها ⇒ انتهت · انطلقت الصافرة ⇒ مُقفلة · مباراة إقصائية لم
   * يتأكّد طرفاها ⇒ بانتظار الفرق · غير ذلك ⇒ مفتوحة.
   */
  function matchStatus(opts) {
    if (opts.result) return 'finished';
    if (opts.now >= opts.kickoffMs) return 'locked';
    if (opts.isKnockout && !(opts.homeResolved && opts.awayResolved)) return 'awaitingTeams';
    return 'open';
  }

  function canSave(status) { return status === 'open'; }

  /** الفائز بالترجيح إلزامي إذا كانت المباراة إقصائية وتوقّع اللاعب تعادلًا. */
  function requiresPenaltyWinner(isKnockout, pred) {
    return !!isKnockout && Number(pred.h) === Number(pred.a);
  }

  function isValidPrediction(isKnockout, pred) {
    var h = Number(pred.h), a = Number(pred.a);
    if (!isFinite(h) || !isFinite(a)) return false;
    if (h < 0 || a < 0 || h > 30 || a > 30) return false;
    if (requiresPenaltyWinner(isKnockout, pred) && !pred.pw) return false;
    return true;
  }

  /* ---- جدول الترتيب العام ----
   *
   * نقاط اللاعب = مجموع نقاط مبارياته (بعد مضاعفة البطاقات) + نقاط توقّعات
   * البطولة الأربعة.
   *
   * وتوقّع التشكيلة الأساسية **لا يدخل** في الحساب إطلاقًا: تُعرض نتائجه
   * لوحدها، لأنه لم يُتَح للجميع، وحسابه قلب الترتيب في خليجي ٢٧.
   */
  function leaderboard(opts) {
    var players = opts.players || [];
    var preds = opts.preds || {};
    var results = opts.results || {};
    var truth = opts.truth || {};

    var rows = {};
    players.forEach(function (p) {
      rows[p.key] = { key: p.key, name: p.name, matchPoints: 0, tournamentPoints: 0,
                      scoredMatches: 0, exactHits: 0, boostsUsed: 0, total: 0 };
    });

    for (var mid in preds) {
      if (!Object.prototype.hasOwnProperty.call(preds, mid)) continue;
      var byKey = preds[mid];
      for (var key in byKey) {
        if (!Object.prototype.hasOwnProperty.call(byKey, key)) continue;
        var row = rows[key];
        if (!row) continue;              // توقّع لمفتاح بلا لاعب مسجَّل
        var pred = byKey[key];
        // البطاقة تُعدّ مستهلكة فور حفظها، لا بعد انتهاء المباراة.
        if (pred && pred.x2) row.boostsUsed++;
        var res = results[mid];
        if (!res) continue;
        row.matchPoints += score(pred, res);
        row.scoredMatches++;
        if (Number(pred.h) === Number(res.h) && Number(pred.a) === Number(res.a)) {
          row.exactHits++;
        }
      }
    }

    players.forEach(function (p) {
      var row = rows[p.key];
      if (row) row.tournamentPoints = tournamentPoints(p.picks || {}, truth);
    });

    var list = Object.keys(rows).map(function (k) {
      var r = rows[k];
      r.total = r.matchPoints + r.tournamentPoints;
      return r;
    });

    // المجموع، ثم النتائج المطابقة تمامًا، ثم الاسم حتى يكون محدَّدًا.
    return list.sort(function (x, y) {
      if (x.total !== y.total) return y.total - x.total;
      if (x.exactHits !== y.exactHits) return y.exactHits - x.exactHits;
      return x.name < y.name ? -1 : (x.name > y.name ? 1 : 0);
    });
  }

  /* ---- التنسيق العربي ---- */

  var AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

  /** يحوّل الأرقام الإنجليزية إلى عربية-هندية: 12 ← ١٢ */
  function arNum(n) {
    return String(n).replace(/[0-9]/g, function (d) { return AR_DIGITS[+d]; });
  }

  /** ٠ ← «لا نقاط» · ١ ← «نقطة» · ٢ ← «نقطتان» · ٥ ← «٥ نقاط» */
  function arPoints(n) {
    if (n === 0) return 'لا نقاط';
    if (n === 1) return 'نقطة';
    if (n === 2) return 'نقطتان';
    return arNum(n) + (n >= 3 && n <= 10 ? ' نقاط' : ' نقطة');
  }

  return {
    // نقاط المباراة
    EXACT_POINTS: EXACT_POINTS,
    DIRECTION_POINTS: DIRECTION_POINTS,
    PENALTY_BONUS: PENALTY_BONUS,
    points: points,
    score: score,
    // توقّعات البطولة
    CHAMPION_POINTS: CHAMPION_POINTS,
    SCORER_POINTS: SCORER_POINTS,
    MVP_POINTS: MVP_POINTS,
    GK_POINTS: GK_POINTS,
    tournamentPoints: tournamentPoints,
    // البطاقات
    MAX_BOOSTS: MAX_BOOSTS,
    savedBoostCount: savedBoostCount,
    displayedBoostCount: displayedBoostCount,
    remainingBoosts: remainingBoosts,
    isBoostLocked: isBoostLocked,
    resolveBoostOnSave: resolveBoostOnSave,
    applyBoostCap: applyBoostCap,
    // الترتيب
    groupTable: groupTable,
    THIRD_PLACE_QUALIFY: THIRD_PLACE_QUALIFY,
    rankThirdPlaced: rankThirdPlaced,
    qualifiedThirdPlaced: qualifiedThirdPlaced,
    // حالة المباراة
    matchStatus: matchStatus,
    canSave: canSave,
    requiresPenaltyWinner: requiresPenaltyWinner,
    isValidPrediction: isValidPrediction,
    // الترتيب العام
    leaderboard: leaderboard,
    // التنسيق
    arNum: arNum,
    arPoints: arPoints
  };
});
