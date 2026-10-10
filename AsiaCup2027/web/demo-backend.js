/* ===========================================================================
 *  وضع التجربة — قاعدة بيانات وهمية في الذاكرة
 * ---------------------------------------------------------------------------
 *  يُحمَّل فقط عند إضافة ?demo=1 إلى الرابط، ويُبدِل Firebase بنسخة محليّة
 *  مؤقّتة. الغرض ثلاثة:
 *
 *  ١) تجربة التطبيق وتصويره بلا الكتابة في قاعدة البيانات الحقيقية.
 *  ٢) أن يرى اللاعب شكل التطبيق قبل البطولة ببيانات مُفترَضة.
 *  ٣) أن تُفحَص كل الحالات: مباراة انتهت، مباراة مُقفلة، مباراة بانتظار
 *     الفرق، بطاقة مستهلكة، رصيد بطاقات منتهٍ.
 *
 *  ⚠️ لا يكتب شيئًا على الشبكة إطلاقًا. كل تعديل يذهب للذاكرة ويُنسى عند
 *     تحديث الصفحة.
 * =========================================================================== */
(function (root) {
  'use strict';

  /** يبني الحالة الابتدائية للتجربة من الجدول الحقيقي. */
  function seed(schedule) {
    var teams = schedule.teams;
    var matches = schedule.matches;

    var users = {
      Mnajjar3: { name: 'Mnajjar3', ph: 'demo', champion: 'Saudi Arabia', scorer: 'سالم الدوسري', mvp: 'سالم الدوسري', gk: 'نواف العقيدي' },
      Faisal:   { name: 'فيصل', ph: 'demo', champion: 'Japan', scorer: 'تاكيفوسا كوبو', mvp: 'ريتسو دوان', gk: 'زيون سوزوكي' },
      Abdullah: { name: 'عبدالله', ph: 'demo', champion: 'Saudi Arabia', scorer: 'فراس البريكان' },
      Majed:    { name: 'ماجد', ph: 'demo', champion: 'Iran' },
      Turki:    { name: 'تركي', ph: 'demo' },
      Nawaf:    { name: 'نواف', ph: 'demo', champion: 'South Korea', scorer: 'سون هيونغ مين' }
    };
    var keys = Object.keys(users);

    // نتائج أوّل ١٤ مباراة — فيها تعادلات وفوارق، لتظهر الجداول عاملة
    var SCORES = [
      [2, 0], [1, 1], [0, 2], [3, 1], [2, 1], [1, 0], [4, 0],
      [1, 1], [2, 2], [3, 0], [0, 0], [1, 2], [2, 1], [1, 3]
    ];
    var results = {};
    SCORES.forEach(function (sc, i) {
      results[matches[i].id] = { h: sc[0], a: sc[1] };
    });

    // توقّعات: لكل لاعب نمط مختلف، وبطاقات ×٢ موزّعة
    var preds = {};
    // توليد محدَّد (لا عشوائي) حتى تتكرّر الصورة نفسها في كل تشغيل
    function pseudo(i, j) { return (i * 7 + j * 13) % 5; }
    matches.slice(0, 22).forEach(function (m, i) {
      preds[m.id] = {};
      keys.forEach(function (k, j) {
        if (pseudo(i, j) === 4) return;                  // بعضهم لم يتوقّع
        var h = pseudo(i, j) % 3;
        var a = pseudo(i, j + 2) % 3;
        var p = { h: h, a: a };
        if (m.stage !== 'group' && h === a) p.pw = (i + j) % 2 ? 'h' : 'a';
        preds[m.id][k] = p;
      });
    });
    // بطاقات ×٢: Mnajjar3 استهلك خمسًا (الحدّ)، وفيصل اثنتين
    [0, 3, 6, 9, 12].forEach(function (i) {
      if (preds[matches[i].id] && preds[matches[i].id].Mnajjar3) {
        preds[matches[i].id].Mnajjar3.x2 = true;
      }
    });
    [1, 5].forEach(function (i) {
      if (preds[matches[i].id] && preds[matches[i].id].Faisal) {
        preds[matches[i].id].Faisal.x2 = true;
      }
    });

    // نقاط إنذارات لبعض المنتخبات، ليظهر المعيار عاملًا
    var discipline = { Oman: 3, Kuwait: 7, Palestine: 5, Syria: 4 };

    return {
      users: users, predictions: preds, results: results,
      teams: {}, discipline: discipline, lots: {}
    };
  }

  /** يُنشئ مرجعًا وهميًّا يُحاكي الجزء المستخدَم من واجهة Firebase. */
  function makeRoot(state) {
    var listeners = [];   // {path, cb}

    function get(path) {
      var parts = path.split('/').filter(Boolean);
      var node = state;
      for (var i = 0; i < parts.length; i++) {
        if (node == null) return null;
        node = node[parts[i]];
      }
      return node === undefined ? null : node;
    }
    function put(path, value) {
      var parts = path.split('/').filter(Boolean);
      var node = state;
      for (var i = 0; i < parts.length - 1; i++) {
        if (node[parts[i]] == null || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
        node = node[parts[i]];
      }
      if (value === null) delete node[parts[parts.length - 1]];
      else node[parts[parts.length - 1]] = value;
    }
    function fire() {
      listeners.forEach(function (l) {
        l.cb({ val: function () { return get(l.path); } });
      });
    }
    function snapOf(path) { return { val: function () { return get(path); } }; }

    function refAt(path) {
      return {
        child: function (sub) { return refAt(path ? path + '/' + sub : sub); },
        on: function (ev, cb) {
          listeners.push({ path: path, cb: cb });
          cb(snapOf(path));
        },
        once: function () { return Promise.resolve(snapOf(path)); },
        set: function (v) { put(path, v); fire(); return Promise.resolve(); },
        update: function (patch) {
          var cur = get(path) || {};
          Object.keys(patch).forEach(function (k) {
            if (patch[k] === null) delete cur[k];
            else cur[k] = patch[k];
          });
          put(path, cur); fire(); return Promise.resolve();
        },
        remove: function () { put(path, null); fire(); return Promise.resolve(); }
      };
    }
    return refAt('');
  }

  root.ASIA_DEMO = {
    /** يُنشئ الواجهة الوهمية. يُنادى من app.js عند ?demo=1 */
    create: function (schedule) {
      var state = seed(schedule);
      return { root: makeRoot(state), state: state };
    }
  };
})(typeof self !== 'undefined' ? self : this);
