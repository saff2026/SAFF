import XCTest
@testable import AsiaCupCore

/// اختبارات جدول الترتيب العام وحالة المباراة.
final class LeaderboardTests: XCTestCase {

    let players = [
        Player(id: "ali", name: "علي"),
        Player(id: "sara", name: "سارة"),
        Player(id: "omar", name: "عمر")
    ]

    func testTotalsCombineMatchAndTournamentPoints() {
        let predictions: [String: [String: Prediction]] = [
            "m1": [
                "ali": Prediction(home: 2, away: 1),                    // مطابق ⇒ ٥
                "sara": Prediction(home: 1, away: 0),                   // اتجاه ⇒ ٣
                "omar": Prediction(home: 0, away: 2)                    // خطأ ⇒ ٠
            ],
            "m2": [
                "ali": Prediction(home: 1, away: 1, isBoosted: true),    // مطابق ×٢ ⇒ ١٠
                "sara": Prediction(home: 3, away: 0)                    // خطأ ⇒ ٠
            ]
        ]
        let results: [String: MatchResult] = [
            "m1": MatchResult(home: 2, away: 1),
            "m2": MatchResult(home: 1, away: 1)
        ]
        var withPick = players
        withPick[1].picks = TournamentPicks(champion: "Japan")
        let truth = TournamentPicks(champion: "Japan")

        let table = Leaderboard.build(players: withPick, predictions: predictions,
                                      results: results, truth: truth)

        XCTAssertEqual(table[0].playerID, "ali")
        XCTAssertEqual(table[0].matchPoints, 15)
        XCTAssertEqual(table[0].tournamentPoints, 0)
        XCTAssertEqual(table[0].total, 15)
        XCTAssertEqual(table[0].exactHits, 2)
        XCTAssertEqual(table[0].boostsUsed, 1)

        let sara = table.first { $0.playerID == "sara" }!
        XCTAssertEqual(sara.matchPoints, 3)
        XCTAssertEqual(sara.tournamentPoints, 5)
        XCTAssertEqual(sara.total, 8)

        let omar = table.first { $0.playerID == "omar" }!
        XCTAssertEqual(omar.total, 0)
    }

    func testUnplayedMatchesAreNotScored() {
        let predictions: [String: [String: Prediction]] = [
            "m1": ["ali": Prediction(home: 2, away: 1)]
        ]
        let table = Leaderboard.build(players: players, predictions: predictions,
                                      results: [:], truth: TournamentPicks())
        XCTAssertEqual(table.first { $0.playerID == "ali" }?.total, 0)
        XCTAssertEqual(table.first { $0.playerID == "ali" }?.scoredMatches, 0)
    }

    func testBoostsAreCountedEvenBeforeTheMatchIsPlayed() {
        // اللاعب يحتاج أن يرى بطاقاته مستهلكة فورًا، لا بعد انتهاء المباراة.
        let predictions: [String: [String: Prediction]] = [
            "m1": ["ali": Prediction(home: 2, away: 1, isBoosted: true)]
        ]
        let table = Leaderboard.build(players: players, predictions: predictions,
                                      results: [:], truth: TournamentPicks())
        XCTAssertEqual(table.first { $0.playerID == "ali" }?.boostsUsed, 1)
    }

    func testTieOnTotalIsBrokenByExactHits() {
        // تساوٍ حقيقي في المجموع (٦ لكل منهما)، لكن علي أصاب نتيجة مطابقة
        // وسارة لا. النتائج المطابقة تسبق الاسم، فيتقدّم علي — مع أن اسم
        // سارة يسبقه أبجديًا، وهذا ما يثبت أن المعيار طُبّق فعلًا.
        let knockout = Fixture.knockout("k1", number: 49, stage: .round16,
                                        home: "Japan", away: "Iran", day: 20)
        XCTAssertTrue(knockout.stage.isKnockout)

        let predictions: [String: [String: Prediction]] = [
            // مطابق ٥ + بونص الترجيح ١ = ٦، بلا بطاقة
            "k1": ["ali": Prediction(home: 1, away: 1, penaltyWinner: .home)],
            // اتجاه صحيح ٣ × بطاقة = ٦، بلا نتيجة مطابقة
            "m1": ["sara": Prediction(home: 1, away: 0, isBoosted: true)]
        ]
        let results: [String: MatchResult] = [
            "k1": MatchResult(home: 1, away: 1, penaltyWinner: .home),
            "m1": MatchResult(home: 3, away: 0)
        ]
        let table = Leaderboard.build(players: players, predictions: predictions,
                                      results: results, truth: TournamentPicks())

        let ali = table.first { $0.playerID == "ali" }!
        let sara = table.first { $0.playerID == "sara" }!
        XCTAssertEqual(ali.total, 6)
        XCTAssertEqual(sara.total, 6)
        XCTAssertEqual(ali.exactHits, 1)
        XCTAssertEqual(sara.exactHits, 0)
        XCTAssertEqual(table[0].playerID, "ali",
                       "النتائج المطابقة تسبق الاسم عند تساوي المجموع")
    }

    func testCompleteTieIsBrokenByNameAscending() {
        // تساوٍ في المجموع وفي النتائج المطابقة ⇒ يُحسم بالاسم تصاعديًا،
        // حتى يكون الترتيب محدَّدًا لا متقلّبًا بين التشغيلات.
        let predictions: [String: [String: Prediction]] = [
            "m1": ["ali": Prediction(home: 1, away: 0, isBoosted: true)],
            "m2": ["sara": Prediction(home: 1, away: 0, isBoosted: true)]
        ]
        let results: [String: MatchResult] = [
            "m1": MatchResult(home: 3, away: 0),
            "m2": MatchResult(home: 2, away: 0)
        ]
        let table = Leaderboard.build(players: players, predictions: predictions,
                                      results: results, truth: TournamentPicks())

        let scored = table.filter { $0.total > 0 }
        XCTAssertEqual(scored.count, 2)
        XCTAssertEqual(scored[0].total, 6)
        XCTAssertEqual(scored[1].total, 6)
        XCTAssertEqual(scored[0].exactHits, 0)
        XCTAssertEqual(scored[1].exactHits, 0)
        // لا نفترض ترتيب الحروف العربية في Swift، بل نقارن بالترتيب نفسه.
        let expectedFirst = ["علي", "سارة"].sorted().first!
        XCTAssertEqual(scored[0].playerName, expectedFirst)
    }

    func testCappedBoostsMustBeAppliedBeforeBuildingTheTable() {
        // جدول الترتيب يثق بأن البطاقات مقيَّدة مسبقًا. هذا الاختبار يوثّق
        // الترتيب الصحيح للعمليات: applyCap أولًا، ثم build.
        let matches: [Match] = (1...6).map { index in
            Fixture.group("m\(index)", number: index, group: "A",
                          home: "H", away: "A", day: index)
        }
        var raw: [String: [String: Prediction]] = [:]
        var results: [String: MatchResult] = [:]
        for index in 1...6 {
            raw["m\(index)"] = ["ali": Prediction(home: 1, away: 0, isBoosted: true)]
            results["m\(index)"] = MatchResult(home: 1, away: 0)
        }

        // بدون تقييد: ٦ مباريات × ١٠ = ٦٠ — وهذا خطأ.
        let wrong = Leaderboard.build(players: players, predictions: raw,
                                      results: results, truth: TournamentPicks())
        XCTAssertEqual(wrong.first { $0.playerID == "ali" }?.total, 60)

        // بعد التقييد: ٥ × ١٠ + ١ × ٥ = ٥٥ — وهذا الصحيح.
        let (capped, cancelled) = Boosts.applyCap(to: raw, matches: matches)
        XCTAssertEqual(cancelled.count, 1)
        let right = Leaderboard.build(players: players, predictions: capped,
                                      results: results, truth: TournamentPicks())
        XCTAssertEqual(right.first { $0.playerID == "ali" }?.total, 55)
        XCTAssertEqual(right.first { $0.playerID == "ali" }?.boostsUsed, 5)
    }

    func testPlayersWithoutAnyPredictionStillAppear() {
        let table = Leaderboard.build(players: players, predictions: [:],
                                      results: [:], truth: TournamentPicks())
        XCTAssertEqual(table.count, 3)
    }

    // ---- حالة المباراة ----

    func testMatchIsOpenBeforeKickoff() {
        let match = Fixture.group("m1", number: 1, group: "A",
                                  home: "Saudi Arabia", away: "Kuwait", day: 1)
        let status = MatchGate.status(match: match, result: nil,
                                      homeResolved: true, awayResolved: true,
                                      now: match.kickoff.addingTimeInterval(-60))
        XCTAssertEqual(status, .open)
        XCTAssertTrue(MatchGate.canSave(status: status))
    }

    func testMatchLocksExactlyAtKickoff() {
        let match = Fixture.group("m1", number: 1, group: "A",
                                  home: "Saudi Arabia", away: "Kuwait", day: 1)
        let status = MatchGate.status(match: match, result: nil,
                                      homeResolved: true, awayResolved: true,
                                      now: match.kickoff)
        XCTAssertEqual(status, .locked, "التوقّع يُقفل مع صافرة البداية بالضبط")
        XCTAssertFalse(MatchGate.canSave(status: status))
    }

    func testFinishedTakesPrecedenceOverEverything() {
        let match = Fixture.group("m1", number: 1, group: "A",
                                  home: "Saudi Arabia", away: "Kuwait", day: 1)
        let status = MatchGate.status(match: match,
                                      result: MatchResult(home: 1, away: 0),
                                      homeResolved: true, awayResolved: true,
                                      now: match.kickoff.addingTimeInterval(-99999))
        XCTAssertEqual(status, .finished)
    }

    func testKnockoutWaitsForBothTeamsToBeConfirmed() {
        let match = Fixture.knockout("k1", number: 49, stage: .round16,
                                     home: "1A", away: "3BCDE", day: 20)
        let waiting = MatchGate.status(match: match, result: nil,
                                       homeResolved: true, awayResolved: false,
                                       now: match.kickoff.addingTimeInterval(-86400))
        XCTAssertEqual(waiting, .awaitingTeams)
        XCTAssertFalse(MatchGate.canSave(status: waiting))

        let ready = MatchGate.status(match: match, result: nil,
                                     homeResolved: true, awayResolved: true,
                                     now: match.kickoff.addingTimeInterval(-86400))
        XCTAssertEqual(ready, .open)
    }

    func testGroupMatchNeverWaitsForTeams() {
        let match = Fixture.group("m1", number: 1, group: "A",
                                  home: "Saudi Arabia", away: "Kuwait", day: 1)
        let status = MatchGate.status(match: match, result: nil,
                                      homeResolved: false, awayResolved: false,
                                      now: match.kickoff.addingTimeInterval(-60))
        XCTAssertEqual(status, .open)
    }

    // ---- صحّة التوقّع ----

    func testKnockoutDrawRequiresAPenaltyWinner() {
        let match = Fixture.knockout("k1", number: 49, stage: .round16,
                                     home: "Japan", away: "Iran", day: 20)
        let withoutWinner = Prediction(home: 1, away: 1)
        XCTAssertTrue(MatchGate.requiresPenaltyWinner(match: match, prediction: withoutWinner))
        XCTAssertFalse(MatchGate.isValid(match: match, prediction: withoutWinner))

        let withWinner = Prediction(home: 1, away: 1, penaltyWinner: .home)
        XCTAssertTrue(MatchGate.isValid(match: match, prediction: withWinner))
    }

    func testGroupDrawDoesNotRequireAPenaltyWinner() {
        let match = Fixture.group("m1", number: 1, group: "A",
                                  home: "Saudi Arabia", away: "Kuwait", day: 1)
        let prediction = Prediction(home: 1, away: 1)
        XCTAssertFalse(MatchGate.requiresPenaltyWinner(match: match, prediction: prediction))
        XCTAssertTrue(MatchGate.isValid(match: match, prediction: prediction))
    }

    func testNegativeAndAbsurdScoresAreRejected() {
        let match = Fixture.group("m1", number: 1, group: "A",
                                  home: "Saudi Arabia", away: "Kuwait", day: 1)
        XCTAssertFalse(MatchGate.isValid(match: match, prediction: Prediction(home: -1, away: 0)))
        XCTAssertFalse(MatchGate.isValid(match: match, prediction: Prediction(home: 0, away: 31)))
        XCTAssertTrue(MatchGate.isValid(match: match, prediction: Prediction(home: 0, away: 30)))
    }
}
