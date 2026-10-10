import XCTest
@testable import AsiaCupCore

// ============================================================================
//  اختبارات حالات الملفّ المشترك
// ----------------------------------------------------------------------------
//  هذا الملفّ يقرأ `shared/rules-fixtures.json` ويطبّق كل حالة فيه على نسخة
//  Swift. ويقرأ **اختبار JavaScript نفس الملفّ** ويطبّقها على نسخة الويب.
//
//  الفائدة: القواعد مكتوبة مرة واحدة كمواصفة، لا مرتين كشِفرة. فلو انحرفت
//  نسخة عن الأخرى — بسبب خطأ نقل أو تعديل في واحدة ونسيان الثانية — فشل
//  أحد الاختبارين فورًا. وهذا هو الحارس الذي يمنع أن يختلف احتساب التطبيق
//  عن احتساب المواصفة بصمت.
// ============================================================================

final class SharedFixturesTests: XCTestCase {

    // ---- تحميل الملفّ ----

    /// مسار الملفّ المشترك، مُشتقّ من موقع هذا الملفّ المصدري.
    /// (ليس موردًا في الحزمة لأن نسخة JavaScript تقرأه من نفس المكان.)
    static let fixturesURL: URL = {
        URL(fileURLWithPath: #filePath)        // .../Tests/AsiaCupCoreTests/هذا الملف
            .deletingLastPathComponent()        // .../Tests/AsiaCupCoreTests
            .deletingLastPathComponent()        // .../Tests
            .deletingLastPathComponent()        // .../Core
            .deletingLastPathComponent()        // .../AsiaCup2027
            .appendingPathComponent("shared")
            .appendingPathComponent("rules-fixtures.json")
    }()

    struct Fixtures: Decodable {
        let maxBoostsPerPlayer: Int
        let matchPoints: [PointsCase]
        let matchScoreWithBoost: [ScoreCase]
        let tournamentPoints: [TournamentCase]
        let boostCap: [BoostCapCase]
        let groupTable: [GroupTableCase]
        let thirdPlace: [ThirdPlaceCase]

        struct PointsCase: Decodable {
            let why: String
            let pred: [Int]
            let predPW: String?
            let res: [Int]
            let resPW: String?
            let points: Int
        }
        struct ScoreCase: Decodable {
            let why: String
            let pred: [Int]
            let predPW: String?
            let boost: Bool
            let res: [Int]
            let resPW: String?
            let score: Int
        }
        struct TournamentCase: Decodable {
            let why: String
            let picks: Picks
            let truth: Picks
            let points: Int
            struct Picks: Decodable {
                let champion: String?
                let topScorer: String?
                let bestPlayer: String?
                let bestGoalkeeper: String?
            }
        }
        struct BoostCapCase: Decodable {
            let why: String
            let kickoffOrder: [String]
            let boosted: [String]
            let kept: [String]
            let cancelled: [String]
        }
        struct GroupTableCase: Decodable {
            let why: String
            let teams: [String]
            let fixtures: [[String]]
            let results: [String: [Int]]
            let lotsOrder: [String]?
            let disciplinary: [String: Int]?
            let order: [String]?
            let rows: [String: ExpectedRow]?
            let allRows: ExpectedRow?
            let iraqBeforeOman: Bool?

            struct ExpectedRow: Decodable {
                let played: Int?
                let won: Int?
                let drawn: Int?
                let lost: Int?
                let points: Int?
                let goalsFor: Int?
                let goalsAgainst: Int?
                let goalDifference: Int?
            }
        }
        struct ThirdPlaceCase: Decodable {
            let why: String
            let rows: [Row]
            let lotsOrder: [String]?
            let order: [String]
            let qualified: [String]?
            struct Row: Decodable {
                let team: String
                let group: String
                let points: Int
                let goalsFor: Int
                let goalsAgainst: Int
                let disciplinary: Int?
            }
        }
    }

    static var fixtures: Fixtures = {
        do {
            let data = try Data(contentsOf: fixturesURL)
            return try JSONDecoder().decode(Fixtures.self, from: data)
        } catch {
            fatalError("تعذّر قراءة ملفّ الحالات المشترك \(fixturesURL.path): \(error)")
        }
    }()

    var fx: Fixtures { Self.fixtures }

    // ---- أدوات ----

    private func winner(_ text: String?) -> PenaltyWinner? {
        guard let text else { return nil }
        return PenaltyWinner(rawValue: text)
    }

    // ---- الحالات ----

    func testTheSharedFileIsReachableAndNotEmpty() {
        // لو انتقل الملفّ أو أُعيد تنظيم المجلّدات، نريد خطأً واضحًا هنا
        // لا اختبارات تنجح لأنها لم تُطبَّق على شيء.
        XCTAssertFalse(fx.matchPoints.isEmpty)
        XCTAssertFalse(fx.groupTable.isEmpty)
        XCTAssertFalse(fx.thirdPlace.isEmpty)
    }

    func testBoostLimitMatchesTheSharedFile() {
        XCTAssertEqual(Boosts.maxPerPlayer, fx.maxBoostsPerPlayer)
    }

    func testAllMatchPointsCases() {
        for c in fx.matchPoints {
            let prediction = Prediction(home: c.pred[0], away: c.pred[1],
                                        penaltyWinner: winner(c.predPW))
            let result = MatchResult(home: c.res[0], away: c.res[1],
                                     penaltyWinner: winner(c.resPW))
            XCTAssertEqual(Scoring.points(prediction: prediction, result: result),
                           c.points, c.why)
        }
    }

    func testAllBoostedScoreCases() {
        for c in fx.matchScoreWithBoost {
            let prediction = Prediction(home: c.pred[0], away: c.pred[1],
                                        penaltyWinner: winner(c.predPW),
                                        isBoosted: c.boost)
            let result = MatchResult(home: c.res[0], away: c.res[1],
                                     penaltyWinner: winner(c.resPW))
            XCTAssertEqual(Scoring.score(prediction: prediction, result: result),
                           c.score, c.why)
        }
    }

    func testAllTournamentPointsCases() {
        for c in fx.tournamentPoints {
            let picks = TournamentPicks(champion: c.picks.champion,
                                        topScorer: c.picks.topScorer,
                                        bestPlayer: c.picks.bestPlayer,
                                        bestGoalkeeper: c.picks.bestGoalkeeper)
            let truth = TournamentPicks(champion: c.truth.champion,
                                        topScorer: c.truth.topScorer,
                                        bestPlayer: c.truth.bestPlayer,
                                        bestGoalkeeper: c.truth.bestGoalkeeper)
            XCTAssertEqual(Scoring.tournamentPoints(picks: picks, truth: truth),
                           c.points, c.why)
        }
    }

    func testAllBoostCapCases() {
        for c in fx.boostCap {
            // المباريات بترتيب الانطلاق المذكور في الحالة
            let matches = c.kickoffOrder.enumerated().map { index, id in
                Match(id: id, number: index + 1, stage: .group, group: "A",
                      home: "H", away: "A", venue: "v", city: "c",
                      kickoff: Date(timeIntervalSince1970: 1_799_000_000
                                    + Double(index) * 86_400))
            }
            var predictions: [String: [String: Prediction]] = [:]
            for id in c.kickoffOrder {
                predictions[id] = ["p": Prediction(home: 1, away: 0,
                                                   isBoosted: c.boosted.contains(id))]
            }

            let (corrected, cancelled) = Boosts.applyCap(to: predictions, matches: matches)

            let keptIDs = c.kickoffOrder.filter { corrected[$0]?["p"]?.isBoosted == true }
            XCTAssertEqual(Set(keptIDs), Set(c.kept), c.why)
            XCTAssertEqual(Set(cancelled.map(\.matchID)), Set(c.cancelled), c.why)
        }
    }

    func testAllGroupTableCases() {
        for c in fx.groupTable {
            let matches = c.fixtures.enumerated().map { index, row -> Match in
                Match(id: row[0], number: index + 1, stage: .group, group: "A",
                      home: row[1], away: row[2], venue: "v", city: "c",
                      kickoff: Date(timeIntervalSince1970: 1_799_000_000
                                    + Double(index) * 86_400))
            }
            var results: [String: MatchResult] = [:]
            for (id, score) in c.results {
                results[id] = MatchResult(home: score[0], away: score[1])
            }

            let table = Standings.table(group: "A", teams: c.teams,
                                        matches: matches, results: results,
                                        disciplinary: c.disciplinary ?? [:],
                                        lotsOrder: c.lotsOrder ?? [])

            if let expected = c.order {
                XCTAssertEqual(table.map(\.team), expected, c.why)
            }
            if let expected = c.rows {
                for (team, want) in expected {
                    guard let got = table.first(where: { $0.team == team }) else {
                        XCTFail("\(c.why): \(team) غير موجود في الجدول"); continue
                    }
                    assertRow(got, want, label: "\(c.why) — \(team)")
                }
            }
            if let want = c.allRows {
                for got in table { assertRow(got, want, label: "\(c.why) — \(got.team)") }
            }
            if c.iraqBeforeOman == true {
                guard let iraq = table.firstIndex(where: { $0.team == "Iraq" }),
                      let oman = table.firstIndex(where: { $0.team == "Oman" }) else {
                    XCTFail("\(c.why): العراق أو عُمان غير موجود"); continue
                }
                XCTAssertLessThan(iraq, oman, c.why)
            }
        }
    }

    private func assertRow(_ got: TeamRow,
                           _ want: Fixtures.GroupTableCase.ExpectedRow,
                           label: String) {
        if let v = want.played { XCTAssertEqual(got.played, v, "\(label): لعب") }
        if let v = want.won { XCTAssertEqual(got.won, v, "\(label): فاز") }
        if let v = want.drawn { XCTAssertEqual(got.drawn, v, "\(label): تعادل") }
        if let v = want.lost { XCTAssertEqual(got.lost, v, "\(label): خسر") }
        if let v = want.points { XCTAssertEqual(got.points, v, "\(label): نقاط") }
        if let v = want.goalsFor { XCTAssertEqual(got.goalsFor, v, "\(label): سجّل") }
        if let v = want.goalsAgainst { XCTAssertEqual(got.goalsAgainst, v, "\(label): عليه") }
        if let v = want.goalDifference {
            XCTAssertEqual(got.goalDifference, v, "\(label): فرق الأهداف")
        }
    }

    func testAllThirdPlaceCases() {
        for c in fx.thirdPlace {
            let rows = c.rows.map { row -> TeamRow in
                var r = TeamRow(team: row.team, group: row.group)
                r.played = 3
                r.points = row.points
                r.goalsFor = row.goalsFor
                r.goalsAgainst = row.goalsAgainst
                r.disciplinaryPoints = row.disciplinary ?? 0
                return r
            }
            let ranked = ThirdPlace.rank(rows, lotsOrder: c.lotsOrder ?? [])
            XCTAssertEqual(ranked.map(\.team), c.order, c.why)

            if let want = c.qualified {
                let got = ThirdPlace.qualified(rows, lotsOrder: c.lotsOrder ?? [])
                XCTAssertEqual(got.map(\.team), want, c.why)
            }
        }
    }
}
