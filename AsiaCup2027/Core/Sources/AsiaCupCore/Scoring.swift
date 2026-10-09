import Foundation

// ============================================================================
//  قواعد الاحتساب
// ----------------------------------------------------------------------------
//  منقولة حرفيًا من pointsFor و scoreOf و tournamentPointsFor في تطبيق
//  خليجي ٢٧، الذي عمل فعليًا مع ٢٩ لاعبًا حتى نهاية البطولة. لم نعد اختراع
//  أيّ قاعدة.
// ============================================================================

public enum Scoring {

    // ---- نقاط المباراة ----

    /// نتيجة مطابقة تمامًا (الرقمان صحيحان).
    public static let exactPoints = 5
    /// الاتجاه صحيح فقط (فوز/تعادل/خسارة) دون مطابقة الأرقام.
    public static let directionPoints = 3
    /// بونص إصابة الفائز بركلات الترجيح.
    public static let penaltyBonusPoints = 1

    /// نقاط التوقّع قبل مضاعفة البطاقة.
    ///
    /// القواعد:
    /// - الرقمان صحيحان  ← ٥
    /// - الاتجاه صحيح فقط ← ٣
    /// - الاتجاه خاطئ     ← ٠
    /// - **زائد ١** إذا حُسمت المباراة بالترجيح، وتوقّع اللاعب تعادلًا،
    ///   وأصاب الفائز بالترجيح.
    ///
    /// ملاحظة مهمة على البونص: لا يُشترط أن يكون التعادل مطابقًا. من توقّع
    /// ١-١ وانتهت ٢-٢ بالترجيح وأصاب الفائز يأخذ ٣+١ = ٤. ومن توقّع ٢-٢
    /// بالضبط وأصاب الفائز يأخذ ٥+١ = ٦. هذا سلوك خليجي ٢٧ نفسه.
    public static func points(prediction: Prediction, result: MatchResult) -> Int {
        let isExact = prediction.home == result.home && prediction.away == result.away
        let base: Int
        if isExact {
            base = exactPoints
        } else if sign(prediction.home - prediction.away) == sign(result.home - result.away) {
            base = directionPoints
        } else {
            base = 0
        }

        var bonus = 0
        if result.wentToPenalties,
           let predictedWinner = prediction.penaltyWinner,
           let actualWinner = result.penaltyWinner,
           prediction.isDraw,
           predictedWinner == actualWinner {
            bonus = penaltyBonusPoints
        }

        return base + bonus
    }

    /// النقاط النهائية للمباراة بعد تطبيق بطاقة ×٢ إن كانت مفعّلة.
    public static func score(prediction: Prediction, result: MatchResult) -> Int {
        let raw = points(prediction: prediction, result: result)
        return prediction.isBoosted ? raw * 2 : raw
    }

    /// إشارة العدد: ١ للموجب، ‏−١ للسالب، ٠ للصفر. تُستخدم لمقارنة الاتجاه.
    static func sign(_ n: Int) -> Int {
        if n > 0 { return 1 }
        if n < 0 { return -1 }
        return 0
    }

    // ---- نقاط توقّعات البطولة الأربعة ----

    public static let championPoints = 5
    public static let topScorerPoints = 3
    public static let bestPlayerPoints = 3
    public static let bestGoalkeeperPoints = 3

    /// نقاط توقّعات البطولة.
    ///
    /// كلّ بند يُحسب فقط عندما يكون توقّع اللاعب موجودًا **و** النتيجة
    /// الفعلية معروفة **و** متطابقين. فلا تنزل نقاط قبل أن تُثبَّت النتيجة.
    public static func tournamentPoints(picks: TournamentPicks,
                                        truth: TournamentPicks) -> Int {
        var total = 0
        if let p = picks.champion, let t = truth.champion, p == t {
            total += championPoints
        }
        if let p = picks.topScorer, let t = truth.topScorer, p == t {
            total += topScorerPoints
        }
        if let p = picks.bestPlayer, let t = truth.bestPlayer, p == t {
            total += bestPlayerPoints
        }
        if let p = picks.bestGoalkeeper, let t = truth.bestGoalkeeper, p == t {
            total += bestGoalkeeperPoints
        }
        return total
    }
}
