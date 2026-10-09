import XCTest
@testable import AsiaCupCore

/// اختبارات قواعد الاحتساب — قلب التطبيق.
final class ScoringTests: XCTestCase {

    // ---- القاعدة الأساسية: ٥ / ٣ / ٠ ----

    func testExactScoreGivesFive() {
        let prediction = Prediction(home: 2, away: 1)
        let result = MatchResult(home: 2, away: 1)
        XCTAssertEqual(Scoring.points(prediction: prediction, result: result), 5)
    }

    func testCorrectDirectionOnlyGivesThree() {
        // توقّع فوز الطرف الأول، وفاز الطرف الأول بنتيجة مختلفة.
        let prediction = Prediction(home: 2, away: 1)
        let result = MatchResult(home: 3, away: 0)
        XCTAssertEqual(Scoring.points(prediction: prediction, result: result), 3)
    }

    func testWrongDirectionGivesZero() {
        let prediction = Prediction(home: 2, away: 1)
        let result = MatchResult(home: 0, away: 1)
        XCTAssertEqual(Scoring.points(prediction: prediction, result: result), 0)
    }

    func testExactDrawGivesFive() {
        let prediction = Prediction(home: 1, away: 1)
        let result = MatchResult(home: 1, away: 1)
        XCTAssertEqual(Scoring.points(prediction: prediction, result: result), 5)
    }

    func testDrawPredictedDifferentScoreGivesThree() {
        let prediction = Prediction(home: 0, away: 0)
        let result = MatchResult(home: 2, away: 2)
        XCTAssertEqual(Scoring.points(prediction: prediction, result: result), 3)
    }

    func testDrawPredictedButSomeoneWonGivesZero() {
        let prediction = Prediction(home: 1, away: 1)
        let result = MatchResult(home: 2, away: 1)
        XCTAssertEqual(Scoring.points(prediction: prediction, result: result), 0)
    }

    // ---- بونص ركلات الترجيح ----

    func testPenaltyBonusOnExactDraw() {
        // توقّع ٢-٢ وفوز الطرف الأول بالترجيح، والنتيجة ٢-٢ وفاز الأول.
        // ٥ (مطابقة) + ١ (الترجيح) = ٦
        let prediction = Prediction(home: 2, away: 2, penaltyWinner: .home)
        let result = MatchResult(home: 2, away: 2, penaltyWinner: .home)
        XCTAssertEqual(Scoring.points(prediction: prediction, result: result), 6)
    }

    func testPenaltyBonusOnInexactDraw() {
        // توقّع ١-١ والنتيجة ٢-٢، وأصاب الفائز بالترجيح: ٣ + ١ = ٤
        // البونص لا يشترط مطابقة النتيجة، بل تعادلًا من الطرفين وإصابة الفائز.
        let prediction = Prediction(home: 1, away: 1, penaltyWinner: .away)
        let result = MatchResult(home: 2, away: 2, penaltyWinner: .away)
        XCTAssertEqual(Scoring.points(prediction: prediction, result: result), 4)
    }

    func testNoPenaltyBonusWhenWrongShootoutWinner() {
        let prediction = Prediction(home: 1, away: 1, penaltyWinner: .home)
        let result = MatchResult(home: 1, away: 1, penaltyWinner: .away)
        // النتيجة مطابقة فله ٥، لكن لا بونص لأنه أخطأ الفائز بالترجيح.
        XCTAssertEqual(Scoring.points(prediction: prediction, result: result), 5)
    }

    func testNoPenaltyBonusWhenPredictionWasNotADraw() {
        // لم يتوقّع تعادلًا، فلا يستحقّ البونص مهما كان اختياره للترجيح.
        let prediction = Prediction(home: 2, away: 1, penaltyWinner: .home)
        let result = MatchResult(home: 1, away: 1, penaltyWinner: .home)
        XCTAssertEqual(Scoring.points(prediction: prediction, result: result), 0)
    }

    func testNoPenaltyBonusWhenMatchDidNotGoToPenalties() {
        // تعادل في دور المجموعات: لا ترجيح، فلا بونص.
        let prediction = Prediction(home: 1, away: 1, penaltyWinner: .home)
        let result = MatchResult(home: 1, away: 1, penaltyWinner: nil)
        XCTAssertEqual(Scoring.points(prediction: prediction, result: result), 5)
    }

    func testNoPenaltyBonusWhenPlayerDidNotPickAWinner() {
        let prediction = Prediction(home: 1, away: 1, penaltyWinner: nil)
        let result = MatchResult(home: 1, away: 1, penaltyWinner: .home)
        XCTAssertEqual(Scoring.points(prediction: prediction, result: result), 5)
    }

    // ---- مضاعفة بطاقة ×٢ ----

    func testBoostDoublesExactScore() {
        let prediction = Prediction(home: 2, away: 1, isBoosted: true)
        let result = MatchResult(home: 2, away: 1)
        XCTAssertEqual(Scoring.score(prediction: prediction, result: result), 10)
    }

    func testBoostDoublesDirectionScore() {
        let prediction = Prediction(home: 2, away: 1, isBoosted: true)
        let result = MatchResult(home: 3, away: 0)
        XCTAssertEqual(Scoring.score(prediction: prediction, result: result), 6)
    }

    func testBoostDoublesPenaltyBonusToo() {
        // ٥ + ١ = ٦، ثم ×٢ = ١٢. أعلى نتيجة ممكنة في مباراة واحدة.
        let prediction = Prediction(home: 2, away: 2, penaltyWinner: .home, isBoosted: true)
        let result = MatchResult(home: 2, away: 2, penaltyWinner: .home)
        XCTAssertEqual(Scoring.score(prediction: prediction, result: result), 12)
    }

    func testBoostOnZeroStaysZero() {
        // مضاعفة الصفر صفر — البطاقة تُستهلك بلا فائدة، وهذا مقصود.
        let prediction = Prediction(home: 3, away: 0, isBoosted: true)
        let result = MatchResult(home: 0, away: 2)
        XCTAssertEqual(Scoring.score(prediction: prediction, result: result), 0)
    }

    // ---- توقّعات البطولة الأربعة ----

    func testAllFourTournamentPicksCorrect() {
        let picks = TournamentPicks(champion: "Saudi Arabia", topScorer: "لاعب",
                                   bestPlayer: "لاعب ٢", bestGoalkeeper: "حارس")
        let truth = picks
        // ٥ + ٣ + ٣ + ٣ = ١٤
        XCTAssertEqual(Scoring.tournamentPoints(picks: picks, truth: truth), 14)
    }

    func testChampionOnlyGivesFive() {
        let picks = TournamentPicks(champion: "Japan", topScorer: "أ")
        let truth = TournamentPicks(champion: "Japan", topScorer: "ب")
        XCTAssertEqual(Scoring.tournamentPoints(picks: picks, truth: truth), 5)
    }

    func testNoPointsBeforeTruthIsSet() {
        // أهمّ حالة: النتيجة الفعلية لم تُثبَّت بعد ⇒ لا نقاط، لا أصفار خاطئة.
        let picks = TournamentPicks(champion: "Iran", topScorer: "أ",
                                    bestPlayer: "ب", bestGoalkeeper: "ج")
        let truth = TournamentPicks()
        XCTAssertEqual(Scoring.tournamentPoints(picks: picks, truth: truth), 0)
    }

    func testNoPointsWhenPlayerDidNotPick() {
        let picks = TournamentPicks()
        let truth = TournamentPicks(champion: "Qatar", topScorer: "أ",
                                    bestPlayer: "ب", bestGoalkeeper: "ج")
        XCTAssertEqual(Scoring.tournamentPoints(picks: picks, truth: truth), 0)
    }
}
