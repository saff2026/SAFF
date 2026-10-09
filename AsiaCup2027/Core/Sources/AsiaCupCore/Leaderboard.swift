import Foundation

// ============================================================================
//  جدول الترتيب العام
// ----------------------------------------------------------------------------
//  نقاط اللاعب = مجموع نقاط مبارياته (بعد مضاعفة البطاقات) + نقاط توقّعات
//  البطولة الأربعة.
//
//  ملاحظة مهمة منقولة من خليجي ٢٧: توقّع التشكيلة الأساسية **لا يدخل** في
//  جدول النقاط إطلاقًا. تُعرض نتائجه لوحدها، لأنه لم يُتَح للجميع، وحسابه
//  قلب الترتيب في خليجي ٢٧ فكان لا بدّ من إخراجه.
// ============================================================================

/// صفّ في جدول الترتيب العام.
public struct LeaderboardRow: Sendable, Equatable {
    public let playerID: String
    public let playerName: String
    /// نقاط المباريات بعد مضاعفة البطاقات.
    public var matchPoints = 0
    /// نقاط توقّعات البطولة الأربعة.
    public var tournamentPoints = 0
    /// عدد المباريات التي احتُسبت له (دخلت نتيجتها وله فيها توقّع).
    public var scoredMatches = 0
    /// عدد النتائج المطابقة تمامًا (٥ نقاط).
    public var exactHits = 0
    /// عدد البطاقات المستهلكة.
    public var boostsUsed = 0

    public var total: Int { matchPoints + tournamentPoints }

    public init(playerID: String, playerName: String) {
        self.playerID = playerID
        self.playerName = playerName
    }
}

public enum Leaderboard {

    /// يبني جدول الترتيب العام.
    ///
    /// - Parameters:
    ///   - players: اللاعبون المشاركون.
    ///   - predictions: `[معرّف المباراة: [مفتاح اللاعب: التوقّع]]` **بعد**
    ///     تطبيق `Boosts.applyCap` — وإلّا احتُسبت بطاقات زائدة.
    ///   - results: النتائج المسجَّلة.
    ///   - truth: النتائج الفعلية لتوقّعات البطولة الأربعة.
    public static func build(
        players: [Player],
        predictions: [String: [String: Prediction]],
        results: [String: MatchResult],
        truth: TournamentPicks
    ) -> [LeaderboardRow] {

        var rows: [String: LeaderboardRow] = [:]
        for player in players {
            rows[player.id] = LeaderboardRow(playerID: player.id, playerName: player.name)
        }

        for (matchID, byPlayer) in predictions {
            for (playerID, prediction) in byPlayer {
                // توقّع لمفتاح لا يقابله لاعب مسجَّل (لاعب محذوف مثلًا) يُهمل.
                guard var row = rows[playerID] else { continue }

                // البطاقة تُعدّ مستهلكة فور حفظها، لا بعد انتهاء المباراة،
                // لأن اللاعب يحتاج أن يرى رصيده صحيحًا في الحال.
                if prediction.isBoosted { row.boostsUsed += 1 }

                if let result = results[matchID] {
                    row.matchPoints += Scoring.score(prediction: prediction, result: result)
                    row.scoredMatches += 1
                    if prediction.home == result.home && prediction.away == result.away {
                        row.exactHits += 1
                    }
                }

                rows[playerID] = row
            }
        }

        for player in players {
            guard var row = rows[player.id] else { continue }
            row.tournamentPoints =
                Scoring.tournamentPoints(picks: player.picks, truth: truth)
            rows[player.id] = row
        }

        // الترتيب: المجموع، ثم النتائج المطابقة تمامًا، ثم الاسم حتى يكون
        // الناتج محدَّدًا لا عشوائيًا.
        return rows.values.sorted { lhs, rhs in
            if lhs.total != rhs.total { return lhs.total > rhs.total }
            if lhs.exactHits != rhs.exactHits { return lhs.exactHits > rhs.exactHits }
            return lhs.playerName < rhs.playerName
        }
    }
}

// ============================================================================
//  حالة المباراة
// ============================================================================

public enum MatchGate {

    /// حالة المباراة من ناحية التوقّع.
    ///
    /// منقولة من `statusOf` في خليجي ٢٧:
    /// - دخلت نتيجتها ⇒ انتهت.
    /// - انطلقت صافرة البداية ⇒ مُقفلة (التوقّع يُقفل مع الصافرة بالضبط).
    /// - مباراة إقصائية لم يتأكّد طرفاها ⇒ بانتظار الفرق.
    /// - غير ذلك ⇒ مفتوحة.
    public static func status(
        match: Match,
        result: MatchResult?,
        homeResolved: Bool,
        awayResolved: Bool,
        now: Date
    ) -> MatchStatus {
        if result != nil { return .finished }
        if now >= match.kickoff { return .locked }
        if match.stage.isKnockout && !(homeResolved && awayResolved) {
            return .awaitingTeams
        }
        return .open
    }

    /// هل يُقبل حفظ توقّع لهذه المباراة الآن؟
    public static func canSave(status: MatchStatus) -> Bool {
        status == .open
    }

    /// هل اختيار الفائز بالترجيح إلزامي لهذا التوقّع؟
    ///
    /// نعم إذا كانت المباراة إقصائية وتوقّع اللاعب تعادلًا — لأن الإقصائيات
    /// لا تنتهي بتعادل.
    public static func requiresPenaltyWinner(match: Match, prediction: Prediction) -> Bool {
        match.stage.isKnockout && prediction.isDraw
    }

    /// هل التوقّع صالح للحفظ؟
    public static func isValid(match: Match, prediction: Prediction) -> Bool {
        if prediction.home < 0 || prediction.away < 0 { return false }
        if prediction.home > 30 || prediction.away > 30 { return false }
        if requiresPenaltyWinner(match: match, prediction: prediction)
            && prediction.penaltyWinner == nil {
            return false
        }
        return true
    }
}
