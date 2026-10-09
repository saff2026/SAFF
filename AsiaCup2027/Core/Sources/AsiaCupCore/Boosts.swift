import Foundation

// ============================================================================
//  بطاقات ×٢
// ----------------------------------------------------------------------------
//  القاعدة الصارمة المأخوذة من تجربة خليجي ٢٧:
//
//      البطاقة المحفوظة في قاعدة البيانات مستهلكة نهائيًا،
//      ولا ترجع إلى الرصيد أبدًا — لا بالضغط على الزر،
//      ولا بتحديث التوقّع، ولا عند فشل الحفظ.
//
//  ولهذه القاعدة ثلاث طبقات حماية في تطبيق خليجي ٢٧، ننقلها كلّها:
//
//  ١) العدّ المعروض في الواجهة يحتسب المسوّدات غير المحفوظة أيضًا. بدون هذا
//     يستطيع اللاعب تفعيل ×٢ على عشر مباريات ثم حفظها كلها فيتجاوز الحد.
//
//  ٢) عند الحفظ: إذا كانت البطاقة محفوظة مسبقًا على هذه المباراة، تُكتب
//     قسرًا مرة أخرى حتى لا يُلغيها أيّ تحديث لاحق للتوقّع.
//
//  ٣) حارس أخير عند القراءة: لو وصلت بيانات فيها بطاقات أكثر من الحد (بيانات
//     قديمة أو كتابة مباشرة على قاعدة البيانات)، تُحتسب أوّل البطاقات حسب
//     موعد انطلاق المباراة ويُلغى الزائد.
// ============================================================================

public enum Boosts {

    /// عدد بطاقات ×٢ لكل لاعب في البطولة كلها.
    ///
    /// في خليجي ٢٧ كانت بطاقتين على ١٥ مباراة. كأس آسيا ٢٠٢٧ فيها ٥١
    /// مباراة، وقد اختار صاحب المسابقة **٥ بطاقات**.
    public static let maxPerPlayer = 5

    /// عدد البطاقات المحفوظة فعليًا في قاعدة البيانات لهذا اللاعب.
    ///
    /// هذا هو المرجع الوحيد عند الحفظ: البطاقة محفوظة = مستهلكة.
    ///
    /// - Parameters:
    ///   - playerID: مفتاح اللاعب.
    ///   - predictions: كل التوقّعات المحمَّلة، مرتَّبة `[معرّف المباراة: [مفتاح اللاعب: التوقّع]]`.
    ///   - excluding: معرّف مباراة تُستثنى من العدّ (المباراة التي نحفظها الآن).
    public static func savedCount(playerID: String,
                                  in predictions: [String: [String: Prediction]],
                                  excluding excludedMatchID: String? = nil) -> Int {
        var count = 0
        for (matchID, byPlayer) in predictions {
            if matchID == excludedMatchID { continue }
            if byPlayer[playerID]?.isBoosted == true { count += 1 }
        }
        return count
    }

    /// العدّ المعروض في الواجهة: المحفوظ + المسوّدات التي لم تُحفظ بعد.
    ///
    /// الطبقة الأولى من الحماية. لاحظ الاتجاه الواحد: المسوّدة **تزيد** العدد
    /// فقط (بطاقة مفعّلة ولم تُحفظ)، ولا تُلغي بطاقة محفوظة أبدًا.
    ///
    /// - Parameters:
    ///   - drafts: مسوّدات اللاعب الحالي التي عدّلها ولم يحفظها، `[معرّف المباراة: التوقّع]`.
    public static func displayedCount(playerID: String,
                                      in predictions: [String: [String: Prediction]],
                                      drafts: [String: Prediction],
                                      excluding excludedMatchID: String? = nil) -> Int {
        // كل معرّفات المباريات التي قد تحمل بطاقة: المحفوظة أو المسوّدة.
        var matchIDs = Set(predictions.keys)
        matchIDs.formUnion(drafts.keys)

        var count = 0
        for matchID in matchIDs {
            if matchID == excludedMatchID { continue }
            let isSaved = predictions[matchID]?[playerID]?.isBoosted == true
            // المحفوظة مستهلكة ولا ترجع؛ والمسوّدة تزيد فقط.
            let isDraft = drafts[matchID]?.isBoosted == true
            if isSaved || isDraft { count += 1 }
        }
        return count
    }

    /// كم بطاقة بقيت لهذا اللاعب بحسب ما يُعرض في الواجهة؟
    public static func remaining(playerID: String,
                                 in predictions: [String: [String: Prediction]],
                                 drafts: [String: Prediction] = [:]) -> Int {
        let used = displayedCount(playerID: playerID, in: predictions, drafts: drafts)
        return max(0, maxPerPlayer - used)
    }

    /// هل البطاقة **محفوظة فعلًا** على هذه المباراة لهذا اللاعب؟
    ///
    /// محفوظة = مستهلكة نهائيًا. تستعملها شاشة التوقّع لتجميد زر ×٢ بعد
    /// الحفظ، ويستعملها الحفظ ليعيد كتابتها قسرًا (الطبقة الثانية).
    public static func isLocked(matchID: String,
                                playerID: String,
                                in predictions: [String: [String: Prediction]]) -> Bool {
        predictions[matchID]?[playerID]?.isBoosted == true
    }

    /// بطاقة أُلغيت لتجاوزها الحد — لعرضها للأدمن وتصحيحها في قاعدة البيانات.
    public struct CancelledBoost: Sendable, Equatable, Hashable {
        public let playerID: String
        public let matchID: String
        public init(playerID: String, matchID: String) {
            self.playerID = playerID
            self.matchID = matchID
        }
    }

    /// الحارس الأخير (الطبقة الثالثة): تطبيق الحدّ على بيانات واردة.
    ///
    /// من فعّل ×٢ على أكثر من `maxPerPlayer` مباراة تُحتسب له أوّل البطاقات
    /// فقط — **الأقدم حسب موعد انطلاق المباراة** — ويُلغى الزائد.
    ///
    /// يُرجع نسخة مصحَّحة من التوقّعات، وقائمة بما أُلغي. الإلغاء يسري داخل
    /// التطبيق فورًا فلا تُحسب النقاط مضاعفة، وعلى الأدمن أن يثبّت التصحيح
    /// في قاعدة البيانات مرة واحدة حتى تسري القاعدة على كل الأجهزة.
    ///
    /// - Parameter matches: كل مباريات البطولة، لمعرفة موعد الانطلاق.
    public static func applyCap(
        to predictions: [String: [String: Prediction]],
        matches: [Match]
    ) -> (predictions: [String: [String: Prediction]], cancelled: [CancelledBoost]) {

        // ترتيب المباريات: الأقدم موعدًا أولًا، وعند تساوي الموعد يُحسم
        // بالرقم الرسمي للمباراة حتى يكون الترتيب محدَّدًا لا عشوائيًا.
        var order: [String: Int] = [:]
        let sortedMatches = matches.sorted { lhs, rhs in
            if lhs.kickoff != rhs.kickoff { return lhs.kickoff < rhs.kickoff }
            return lhs.number < rhs.number
        }
        for (index, match) in sortedMatches.enumerated() {
            order[match.id] = index
        }

        // اجمع مباريات كل لاعب فعّل عليها بطاقة.
        var boostedByPlayer: [String: [String]] = [:]
        for (matchID, byPlayer) in predictions {
            for (playerID, prediction) in byPlayer where prediction.isBoosted {
                boostedByPlayer[playerID, default: []].append(matchID)
            }
        }

        var corrected = predictions
        var cancelled: [CancelledBoost] = []

        for (playerID, matchIDs) in boostedByPlayer where matchIDs.count > maxPerPlayer {
            // مباراة غير موجودة في الجدول تُدفع إلى الآخر بدل أن تنهار المقارنة.
            let sorted = matchIDs.sorted { lhs, rhs in
                let l = order[lhs] ?? Int.max
                let r = order[rhs] ?? Int.max
                if l != r { return l < r }
                return lhs < rhs
            }
            for matchID in sorted.dropFirst(maxPerPlayer) {
                corrected[matchID]?[playerID]?.isBoosted = false
                cancelled.append(CancelledBoost(playerID: playerID, matchID: matchID))
            }
        }

        // ترتيب ثابت للقائمة حتى تكون النتيجة قابلة للاختبار.
        cancelled.sort { lhs, rhs in
            if lhs.playerID != rhs.playerID { return lhs.playerID < rhs.playerID }
            return (order[lhs.matchID] ?? Int.max) < (order[rhs.matchID] ?? Int.max)
        }

        return (corrected, cancelled)
    }

    /// قرار الحفظ: ماذا نكتب في حقل `x2` عند حفظ توقّع؟
    ///
    /// هذه هي الطبقة الثانية من الحماية، معزولة في دالة واحدة قابلة للاختبار.
    ///
    /// - Returns: `true` تعني اكتب `x2: true`. و`nil` تعني أن اللاعب طلب
    ///   البطاقة لكنه استنفد رصيده، فيجب رفض الطلب وتنبيهه.
    public static func resolveBoostOnSave(
        matchID: String,
        playerID: String,
        requestedBoost: Bool,
        in predictions: [String: [String: Prediction]]
    ) -> Bool? {
        // محفوظة مسبقًا ⇒ تُكتب دائمًا، حتى لا يُلغيها تحديث التوقّع.
        if isLocked(matchID: matchID, playerID: playerID, in: predictions) {
            return true
        }
        guard requestedBoost else { return false }
        // تحقّق أخير قبل الكتابة، على المحفوظ لا على المعروض.
        let saved = savedCount(playerID: playerID, in: predictions, excluding: matchID)
        if saved >= maxPerPlayer { return nil }
        return true
    }
}
