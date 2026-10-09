import Foundation

// ============================================================================
//  ترتيب المجموعات
// ----------------------------------------------------------------------------
//  منقول من computeStandings و _rankTied و _applyFairPlay في خليجي ٢٧.
//
//  الدرس المكتوب في تعليقات المرجع، وننقله كما هو:
//  لا تُدخل «اللعب النظيف» داخل دالة المقارنة إذا كان ترتيبًا يدويًا جزئيًا.
//  لو فعلت، صارت المقارنة غير متعدّية فيخرج ترتيب غير محدَّد:
//      عُمان قبل العراق باللعب النظيف،
//      والعراق قبل الكويت أبجديًا،
//      والكويت قبل عُمان أبجديًا!
//  الحل: رتّب بالمعايير الرقمية أولًا، ثم أعد ترتيب المنتخبات المذكورة في
//  القائمة اليدوية داخل المواضع التي تحتلّها هي نفسها فقط.
// ============================================================================

/// صفّ واحد في جدول المجموعة.
public struct TeamRow: Sendable, Equatable {
    public let team: String
    public var played = 0
    public var won = 0
    public var drawn = 0
    public var lost = 0
    public var goalsFor = 0
    public var goalsAgainst = 0
    public var points = 0
    /// نقاط الإنذارات والطرد (أقلّ = أفضل). تُدخَل يدويًا من وضع الإدارة،
    /// لأنها لا تُستنتَج من النتائج.
    public var disciplinaryPoints = 0
    /// مفتاح المجموعة — يلزم عند مقارنة أصحاب المركز الثالث بين المجموعات.
    public var group: String = ""

    public var goalDifference: Int { goalsFor - goalsAgainst }

    public init(team: String, group: String = "") {
        self.team = team
        self.group = group
    }
}

public enum Standings {

    /// يحسب جدول مجموعة واحدة مرتَّبًا بالكامل.
    ///
    /// - Parameters:
    ///   - group: مفتاح المجموعة ("A" إلى "F").
    ///   - teams: المنتخبات الأربعة بأسمائها.
    ///   - matches: كل مباريات البطولة (نُرشّح منها مباريات هذه المجموعة).
    ///   - results: النتائج المسجَّلة `[معرّف المباراة: النتيجة]`.
    ///   - disciplinary: نقاط الإنذارات لكل منتخب (أقلّ = أفضل).
    ///   - lotsOrder: ترتيب يدوي يُحسم به التساوي التام (القرعة أو ما يقوم
    ///     مقامها). الأول في القائمة أعلى. يُستخدم فقط بين منتخبات تساوت في
    ///     كل المعايير الرقمية.
    public static func table(
        group: String,
        teams: [String],
        matches: [Match],
        results: [String: MatchResult],
        disciplinary: [String: Int] = [:],
        lotsOrder: [String] = []
    ) -> [TeamRow] {

        var rows: [String: TeamRow] = [:]
        for team in teams {
            var row = TeamRow(team: team, group: group)
            row.disciplinaryPoints = disciplinary[team] ?? 0
            rows[team] = row
        }

        let groupMatches = matches.filter { $0.stage == .group && $0.group == group }

        // في دور المجموعات لا يوجد ترجيح، فالنتيجة المسجَّلة هي الفيصل.
        var playedResults: [String: MatchResult] = [:]
        for match in groupMatches {
            guard let result = results[match.id] else { continue }
            playedResults[match.id] = result

            guard var homeRow = rows[match.home], var awayRow = rows[match.away] else {
                continue
            }

            homeRow.played += 1
            awayRow.played += 1
            homeRow.goalsFor += result.home
            homeRow.goalsAgainst += result.away
            awayRow.goalsFor += result.away
            awayRow.goalsAgainst += result.home

            if result.home > result.away {
                homeRow.won += 1
                homeRow.points += 3
                awayRow.lost += 1
            } else if result.home < result.away {
                awayRow.won += 1
                awayRow.points += 3
                homeRow.lost += 1
            } else {
                homeRow.drawn += 1
                awayRow.drawn += 1
                homeRow.points += 1
                awayRow.points += 1
            }

            rows[match.home] = homeRow
            rows[match.away] = awayRow
        }

        let allRows = teams.compactMap { rows[$0] }
        return sortGroup(allRows,
                         groupMatches: groupMatches,
                         results: playedResults,
                         lotsOrder: lotsOrder)
    }

    /// الترتيب الكامل: نقاط، ثم فضّ التساوي بالمواجهات المباشرة بشكل تكراري.
    static func sortGroup(_ rows: [TeamRow],
                          groupMatches: [Match],
                          results: [String: MatchResult],
                          lotsOrder: [String]) -> [TeamRow] {

        let byPoints = rows.sorted { $0.points > $1.points }
        var output: [TeamRow] = []
        var index = 0
        while index < byPoints.count {
            var end = index
            while end + 1 < byPoints.count && byPoints[end + 1].points == byPoints[index].points {
                end += 1
            }
            if end == index {
                output.append(byPoints[index])
            } else {
                let tied = Array(byPoints[index...end])
                output.append(contentsOf: rankTied(tied,
                                                   groupMatches: groupMatches,
                                                   results: results,
                                                   lotsOrder: lotsOrder))
            }
            index = end + 1
        }
        return output
    }

    /// إحصاء المواجهات المباشرة بين مجموعة متساوية فقط.
    private struct HeadToHead {
        var points = 0
        var goalsFor = 0
        var goalsAgainst = 0
        var goalDifference: Int { goalsFor - goalsAgainst }
    }

    /// فضّ التساوي بالمواجهة المباشرة، بشكل تكراري.
    ///
    /// المعيار الأول: نقاط المواجهات المباشرة بين المتساويين، ثم فرق الأهداف
    /// فيها، ثم الأهداف المسجّلة فيها. من بقي متساويًا بعدها يُعاد تجزئته
    /// وتُطبَّق عليه القاعدة من جديد بمبارياته وحده — «المباريات بين
    /// المنتخبات المتبقية فقط». وإن لم تفصل المواجهة المباشرة بين الجميع
    /// إطلاقًا، انتقلنا إلى المعايير العامة.
    static func rankTied(_ tied: [TeamRow],
                         groupMatches: [Match],
                         results: [String: MatchResult],
                         lotsOrder: [String]) -> [TeamRow] {
        if tied.count <= 1 { return tied }

        let names = Set(tied.map { $0.team })
        var h2h: [String: HeadToHead] = [:]
        for row in tied { h2h[row.team] = HeadToHead() }

        for match in groupMatches {
            guard let result = results[match.id] else { continue }
            guard names.contains(match.home), names.contains(match.away) else { continue }
            guard var homeStats = h2h[match.home], var awayStats = h2h[match.away] else {
                continue
            }

            homeStats.goalsFor += result.home
            homeStats.goalsAgainst += result.away
            awayStats.goalsFor += result.away
            awayStats.goalsAgainst += result.home

            if result.home > result.away {
                homeStats.points += 3
            } else if result.home < result.away {
                awayStats.points += 3
            } else {
                homeStats.points += 1
                awayStats.points += 1
            }

            h2h[match.home] = homeStats
            h2h[match.away] = awayStats
        }

        let sorted = tied.sorted { lhs, rhs in
            let l = h2h[lhs.team] ?? HeadToHead()
            let r = h2h[rhs.team] ?? HeadToHead()
            if l.points != r.points { return l.points > r.points }
            if l.goalDifference != r.goalDifference { return l.goalDifference > r.goalDifference }
            if l.goalsFor != r.goalsFor { return l.goalsFor > r.goalsFor }
            // متساويان تمامًا في المواجهة المباشرة: نُبقي ترتيبهما كما هو
            // ونحسمه في مرحلة لاحقة، لا هنا.
            return false
        }

        // جمّع من بقي متساويًا تمامًا في إحصاء المواجهة المباشرة.
        var buckets: [[TeamRow]] = []
        var index = 0
        while index < sorted.count {
            var end = index
            while end + 1 < sorted.count {
                let a = h2h[sorted[end].team] ?? HeadToHead()
                let b = h2h[sorted[end + 1].team] ?? HeadToHead()
                if a.points == b.points && a.goalDifference == b.goalDifference && a.goalsFor == b.goalsFor {
                    end += 1
                } else {
                    break
                }
            }
            buckets.append(Array(sorted[index...end]))
            index = end + 1
        }

        // لم تفصل المواجهة المباشرة بين أيّ اثنين ⇒ المعايير العامة.
        if buckets.count == 1 && buckets[0].count == tied.count {
            return rankByOverall(tied, lotsOrder: lotsOrder)
        }

        // وإلّا: كل مجموعة بقيت متساوية تُعاد عليها القاعدة بمبارياتها وحدها.
        var output: [TeamRow] = []
        for bucket in buckets {
            output.append(contentsOf: rankTied(bucket,
                                               groupMatches: groupMatches,
                                               results: results,
                                               lotsOrder: lotsOrder))
        }
        return output
    }

    /// المعايير العامة: فرق الأهداف الكلي، ثم الأهداف المسجّلة الكلية، ثم
    /// نقاط الإنذارات (الأقلّ أفضل). وما بقي متساويًا بعدها يُحسم بالترتيب
    /// اليدوي (القرعة)، وإلّا فأبجديًا ليكون الناتج محدَّدًا لا عشوائيًا.
    static func rankByOverall(_ rows: [TeamRow], lotsOrder: [String]) -> [TeamRow] {
        let sorted = rows.sorted { lhs, rhs in
            if lhs.goalDifference != rhs.goalDifference {
                return lhs.goalDifference > rhs.goalDifference
            }
            if lhs.goalsFor != rhs.goalsFor { return lhs.goalsFor > rhs.goalsFor }
            if lhs.disciplinaryPoints != rhs.disciplinaryPoints {
                return lhs.disciplinaryPoints < rhs.disciplinaryPoints
            }
            return lhs.team < rhs.team
        }
        return applyLots(sorted, lotsOrder: lotsOrder)
    }

    /// يطبّق الترتيب اليدوي (القرعة) بين المنتخبات التي تساوت في كل المعايير
    /// الرقمية فقط، ودون المساس بترتيب غيرها — فتبقى المقارنة متعدّية.
    static func applyLots(_ sorted: [TeamRow], lotsOrder: [String]) -> [TeamRow] {
        guard !lotsOrder.isEmpty else { return sorted }
        var result = sorted
        var index = 0
        while index < result.count {
            var end = index
            // لا نبدّل إلا بين متساويين تمامًا في كل المعايير الرقمية، لأن
            // القرعة آخر مرجّح ولا تسبق أيًّا منها.
            while end + 1 < result.count,
                  result[end + 1].points == result[index].points,
                  result[end + 1].goalDifference == result[index].goalDifference,
                  result[end + 1].goalsFor == result[index].goalsFor,
                  result[end + 1].disciplinaryPoints == result[index].disciplinaryPoints {
                end += 1
            }
            if end > index {
                var slots: [Int] = []
                var picks: [TeamRow] = []
                for position in index...end where lotsOrder.contains(result[position].team) {
                    slots.append(position)
                    picks.append(result[position])
                }
                if picks.count > 1 {
                    picks.sort { lhs, rhs in
                        let l = lotsOrder.firstIndex(of: lhs.team) ?? Int.max
                        let r = lotsOrder.firstIndex(of: rhs.team) ?? Int.max
                        return l < r
                    }
                    for (offset, slot) in slots.enumerated() {
                        result[slot] = picks[offset]
                    }
                }
            }
            index = end + 1
        }
        return result
    }
}
