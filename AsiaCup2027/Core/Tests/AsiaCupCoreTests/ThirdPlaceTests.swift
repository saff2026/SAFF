import XCTest
@testable import AsiaCupCore

/// اختبارات ترتيب أفضل أربعة أصحاب مركز ثالث — منطق جديد لا وجود له في
/// خليجي ٢٧، ولذلك هو أخطر ما يحتاج اختبارًا.
final class ThirdPlaceTests: XCTestCase {

    func testFourQualifyOutOfSix() {
        XCTAssertEqual(ThirdPlace.qualifyingCount, 4)
    }

    func testPointsComeFirst() {
        let rows = [
            Fixture.row("A3", group: "A", points: 3, goalsFor: 9, goalsAgainst: 0),
            Fixture.row("B3", group: "B", points: 4, goalsFor: 1, goalsAgainst: 1),
            Fixture.row("C3", group: "C", points: 1, goalsFor: 5, goalsAgainst: 5),
            Fixture.row("D3", group: "D", points: 6, goalsFor: 2, goalsAgainst: 1),
            Fixture.row("E3", group: "E", points: 0, goalsFor: 0, goalsAgainst: 9),
            Fixture.row("F3", group: "F", points: 2, goalsFor: 3, goalsAgainst: 3)
        ]
        let ranked = ThirdPlace.rank(rows)
        XCTAssertEqual(ranked.map(\.team), ["D3", "B3", "A3", "F3", "C3", "E3"])
        // النقاط تسبق فرق الأهداف: A3 فرق أهدافه +٩ لكنه ثالثًا بسبب نقاطه.
        XCTAssertEqual(ThirdPlace.qualified(rows).map(\.team), ["D3", "B3", "A3", "F3"])
    }

    func testGoalDifferenceBreaksEqualPoints() {
        let rows = [
            Fixture.row("A3", group: "A", points: 4, goalsFor: 3, goalsAgainst: 3),
            Fixture.row("B3", group: "B", points: 4, goalsFor: 5, goalsAgainst: 2),
            Fixture.row("C3", group: "C", points: 4, goalsFor: 1, goalsAgainst: 4)
        ]
        XCTAssertEqual(ThirdPlace.rank(rows).map(\.team), ["B3", "A3", "C3"])
    }

    func testGoalsScoredBreaksEqualPointsAndGoalDifference() {
        let rows = [
            Fixture.row("A3", group: "A", points: 4, goalsFor: 2, goalsAgainst: 2),
            Fixture.row("B3", group: "B", points: 4, goalsFor: 4, goalsAgainst: 4),
            Fixture.row("C3", group: "C", points: 4, goalsFor: 3, goalsAgainst: 3)
        ]
        // فرق الأهداف صفر للثلاثة، فيُحتكَم إلى الأهداف المسجّلة.
        XCTAssertEqual(ThirdPlace.rank(rows).map(\.team), ["B3", "C3", "A3"])
    }

    func testDisciplinaryPointsBreakTheTieAndFewerIsBetter() {
        let rows = [
            Fixture.row("A3", group: "A", points: 4, goalsFor: 3,
                        goalsAgainst: 3, disciplinary: 8),
            Fixture.row("B3", group: "B", points: 4, goalsFor: 3,
                        goalsAgainst: 3, disciplinary: 2),
            Fixture.row("C3", group: "C", points: 4, goalsFor: 3,
                        goalsAgainst: 3, disciplinary: 5)
        ]
        XCTAssertEqual(ThirdPlace.rank(rows).map(\.team), ["B3", "C3", "A3"])
    }

    func testNoHeadToHeadIsUsedAcrossGroups() {
        // أصحاب المراكز الثالثة من مجموعات مختلفة فلا مواجهة مباشرة بينهم.
        // الدليل: الترتيب يعتمد على الأرقام وحدها ولا يتغيّر بوجود مباريات.
        let rows = [
            Fixture.row("A3", group: "A", points: 4, goalsFor: 5, goalsAgainst: 2),
            Fixture.row("B3", group: "B", points: 4, goalsFor: 3, goalsAgainst: 3)
        ]
        XCTAssertEqual(ThirdPlace.rank(rows).map(\.team), ["A3", "B3"])
    }

    func testCompleteTieIsDeterministicNotRandom() {
        let rows = [
            Fixture.row("F3", group: "F", points: 4, goalsFor: 3, goalsAgainst: 3),
            Fixture.row("B3", group: "B", points: 4, goalsFor: 3, goalsAgainst: 3),
            Fixture.row("D3", group: "D", points: 4, goalsFor: 3, goalsAgainst: 3)
        ]
        let first = ThirdPlace.rank(rows).map(\.team)
        let second = ThirdPlace.rank(rows.reversed()).map(\.team)
        XCTAssertEqual(first, second, "الترتيب يجب أن يكون محدَّدًا لا عشوائيًا")
        // التساوي التام يُرتَّب بمفتاح المجموعة حتى تصحّحه القرعة.
        XCTAssertEqual(first, ["B3", "D3", "F3"])
    }

    func testLotsOrderOverridesACompleteTie() {
        let rows = [
            Fixture.row("B3", group: "B", points: 4, goalsFor: 3, goalsAgainst: 3),
            Fixture.row("D3", group: "D", points: 4, goalsFor: 3, goalsAgainst: 3)
        ]
        let ranked = ThirdPlace.rank(rows, lotsOrder: ["D3", "B3"])
        XCTAssertEqual(ranked.map(\.team), ["D3", "B3"])
    }

    func testLotsOrderDoesNotMoveTeamsThatAreNotTied() {
        let rows = [
            Fixture.row("A3", group: "A", points: 6, goalsFor: 5, goalsAgainst: 1),
            Fixture.row("B3", group: "B", points: 1, goalsFor: 1, goalsAgainst: 5)
        ]
        let ranked = ThirdPlace.rank(rows, lotsOrder: ["B3", "A3"])
        XCTAssertEqual(ranked.map(\.team), ["A3", "B3"],
                       "القرعة آخر مرجّح ولا تسبق النقاط")
    }

    func testCriteriaOrderIsTheDocumentedOne() {
        // المعايير قائمة معلَنة حتى تُراجَع على اللائحة الرسمية بسهولة.
        XCTAssertEqual(ThirdPlace.criteria,
                       [.points, .goalDifference, .goalsScored, .disciplinaryPoints])
    }

    // ---- جدول توزيع الثوالث على دور الـ١٦ ----

    func testBracketRefusesToGuessWhenOfficialTableIsMissing() {
        // أهمّ اختبار هنا: الكود يجب أن يرفض التخمين. جدول خاطئ يقلب دور
        // الـ١٦ كلّه بصمت، واللاعبون يظنّون المواجهات صحيحة.
        Bracket.officialThirdPlaceAllocation = [:]
        XCTAssertFalse(Bracket.isThirdPlaceAllocationLoaded)
        XCTAssertNil(Bracket.resolveThirdPlaceSlots(qualifiedGroups: ["A", "B", "C", "D"]))
    }

    func testBracketLookupIsOrderIndependent() {
        Bracket.officialThirdPlaceAllocation = [
            "ABCD": [49: "A", 50: "B", 51: "C", 52: "D"]
        ]
        let forward = Bracket.resolveThirdPlaceSlots(qualifiedGroups: ["A", "B", "C", "D"])
        let shuffled = Bracket.resolveThirdPlaceSlots(qualifiedGroups: ["D", "B", "A", "C"])
        XCTAssertEqual(forward, shuffled)
        XCTAssertEqual(forward?[49], "A")
        Bracket.officialThirdPlaceAllocation = [:]
    }

    func testBracketRejectsWrongNumberOfGroups() {
        Bracket.officialThirdPlaceAllocation = [
            "ABCD": [49: "A", 50: "B", 51: "C", 52: "D"]
        ]
        XCTAssertNil(Bracket.resolveThirdPlaceSlots(qualifiedGroups: ["A", "B", "C"]))
        XCTAssertNil(Bracket.resolveThirdPlaceSlots(qualifiedGroups: ["A", "B", "C", "D", "E"]))
        Bracket.officialThirdPlaceAllocation = [:]
    }

    func testFifteenCombinationsAreExpected() {
        // اختيار ٤ مجموعات من ٦ = ١٥ تركيبة. لو نقص الجدول عن ذلك فهو ناقص.
        XCTAssertEqual(Bracket.expectedCombinationCount, 15)
    }
}
