import XCTest
@testable import AsiaCupCore

/// اختبارات ترتيب المجموعات وفضّ التساوي.
final class StandingsTests: XCTestCase {

    // مجموعة من أربعة منتخبات، بست مباريات.
    let teams = ["Saudi Arabia", "Iraq", "Kuwait", "Oman"]

    lazy var matches: [Match] = [
        Fixture.group("m1", number: 1, group: "A",
                      home: "Saudi Arabia", away: "Kuwait", day: 1),
        Fixture.group("m2", number: 2, group: "A",
                      home: "Iraq", away: "Oman", day: 1),
        Fixture.group("m3", number: 3, group: "A",
                      home: "Kuwait", away: "Iraq", day: 4),
        Fixture.group("m4", number: 4, group: "A",
                      home: "Oman", away: "Saudi Arabia", day: 4),
        Fixture.group("m5", number: 5, group: "A",
                      home: "Saudi Arabia", away: "Iraq", day: 7),
        Fixture.group("m6", number: 6, group: "A",
                      home: "Oman", away: "Kuwait", day: 7)
    ]

    func testBasicPointsAndOrdering() {
        let results: [String: MatchResult] = [
            "m1": MatchResult(home: 2, away: 0),   // السعودية تفوز
            "m2": MatchResult(home: 1, away: 0),   // العراق يفوز
            "m3": MatchResult(home: 0, away: 1),   // العراق يفوز
            "m4": MatchResult(home: 0, away: 3),   // السعودية تفوز
            "m5": MatchResult(home: 1, away: 0),   // السعودية تفوز
            "m6": MatchResult(home: 2, away: 1)    // عُمان تفوز
        ]
        let table = Standings.table(group: "A", teams: teams,
                                    matches: matches, results: results)

        XCTAssertEqual(table.map(\.team),
                       ["Saudi Arabia", "Iraq", "Oman", "Kuwait"])
        XCTAssertEqual(table[0].points, 9)
        XCTAssertEqual(table[0].won, 3)
        XCTAssertEqual(table[0].goalsFor, 6)
        XCTAssertEqual(table[0].goalsAgainst, 0)
        XCTAssertEqual(table[0].goalDifference, 6)
        XCTAssertEqual(table[1].points, 6)
        XCTAssertEqual(table[2].points, 3)
        XCTAssertEqual(table[3].points, 0)
        XCTAssertEqual(table[3].lost, 3)
    }

    func testDrawsCountOnePointEach() {
        let results: [String: MatchResult] = [
            "m1": MatchResult(home: 1, away: 1),
            "m2": MatchResult(home: 0, away: 0)
        ]
        let table = Standings.table(group: "A", teams: teams,
                                    matches: matches, results: results)
        for row in table {
            XCTAssertEqual(row.points, 1)
            XCTAssertEqual(row.drawn, 1)
            XCTAssertEqual(row.played, 1)
        }
    }

    // ---- فضّ التساوي بالمواجهة المباشرة ----

    func testHeadToHeadBreaksATwoWayTie() {
        // العراق وعُمان متساويان في النقاط (٣ لكل منهما)، وفرق أهداف عُمان
        // أفضل بكثير (+٣ مقابل −٣)، لكن العراق فاز في مواجهتهما المباشرة
        // ١-٠. والمواجهة المباشرة تسبق فرق الأهداف، فالعراق يتقدّم.
        let results: [String: MatchResult] = [
            "m1": MatchResult(home: 1, away: 0),   // السعودية ١-٠ الكويت
            "m2": MatchResult(home: 1, away: 0),   // العراق ١-٠ عُمان
            "m3": MatchResult(home: 2, away: 0),   // الكويت ٢-٠ العراق
            "m4": MatchResult(home: 5, away: 0),   // عُمان ٥-٠ السعودية
            "m5": MatchResult(home: 2, away: 0),   // السعودية ٢-٠ العراق
            "m6": MatchResult(home: 0, away: 1)    // عُمان ٠-١ الكويت
        ]
        let table = Standings.table(group: "A", teams: teams,
                                    matches: matches, results: results)
        let iraq = table.firstIndex { $0.team == "Iraq" }!
        let oman = table.firstIndex { $0.team == "Oman" }!

        // تحقّق أنهما فعلًا متساويان في النقاط قبل الحكم على الترتيب،
        // وإلّا فالاختبار لا يختبر المواجهة المباشرة أصلًا.
        XCTAssertEqual(table[iraq].points, 3)
        XCTAssertEqual(table[oman].points, 3)
        // فرق أهداف عُمان أفضل، فلو كان فرق الأهداف هو المعيار لتقدّمت.
        XCTAssertEqual(table[oman].goalDifference, 3)
        XCTAssertEqual(table[iraq].goalDifference, -3)
        XCTAssertLessThan(iraq, oman, "المواجهة المباشرة تسبق فرق الأهداف")
    }

    // ---- الحالة الحقيقية من خليجي ٢٧ ----
    //
    // تساوت عُمان والعراق في: النقاط (٤)، والمواجهة المباشرة (١-١)،
    // وفرق الأهداف (−١)، والأهداف المسجّلة (٤). وتأهّلت عُمان باللعب النظيف.
    //
    // هذه الحالة ليست نظرية: حدثت فعلًا، وبدون معالجتها يرجع الترتيب إلى
    // الحروف الأبجدية فيظهر العراق وصيفًا، وهو خطأ.

    /// نتائج تُنتج التساوي التام بين عُمان والعراق.
    private var gulf27TieResults: [String: MatchResult] {
        [
            "m1": MatchResult(home: 2, away: 0),   // السعودية ٢-٠ الكويت
            "m2": MatchResult(home: 1, away: 1),   // العراق ١-١ عُمان
            "m3": MatchResult(home: 0, away: 2),   // الكويت ٠-٢ العراق
            "m4": MatchResult(home: 2, away: 1),   // عُمان ٢-١ السعودية
            "m5": MatchResult(home: 4, away: 1),   // السعودية ٤-١ العراق
            "m6": MatchResult(home: 1, away: 3)    // عُمان ١-٣ الكويت
        ]
    }

    func testTheGulf27TieIsGenuinelyIdenticalOnEveryNumericCriterion() {
        // أولًا نثبت أن السيناريو فعلًا متساوٍ تمامًا، وإلّا فالاختبار التالي
        // لا يختبر شيئًا.
        let table = Standings.table(group: "A", teams: teams,
                                    matches: matches, results: gulf27TieResults)
        let iraq = table.first { $0.team == "Iraq" }!
        let oman = table.first { $0.team == "Oman" }!

        XCTAssertEqual(iraq.points, 4)
        XCTAssertEqual(oman.points, 4)
        XCTAssertEqual(iraq.goalDifference, -1)
        XCTAssertEqual(oman.goalDifference, -1)
        XCTAssertEqual(iraq.goalsFor, 4)
        XCTAssertEqual(oman.goalsFor, 4)
    }

    func testWithoutLotsTheTieFallsBackToAlphabeticalOrder() {
        // بدون ترجيح يدوي: الترتيب أبجدي، فيظهر العراق قبل عُمان.
        // هذا هو الخطأ الذي وقع في خليجي ٢٧ قبل إضافة اللعب النظيف.
        let table = Standings.table(group: "A", teams: teams,
                                    matches: matches, results: gulf27TieResults)
        let iraq = table.firstIndex { $0.team == "Iraq" }!
        let oman = table.firstIndex { $0.team == "Oman" }!
        XCTAssertLessThan(iraq, oman)
    }

    func testLotsOrderPutsOmanAheadAsItActuallyHappened() {
        let table = Standings.table(group: "A", teams: teams,
                                    matches: matches, results: gulf27TieResults,
                                    lotsOrder: ["Oman", "Iraq"])
        let iraq = table.firstIndex { $0.team == "Iraq" }!
        let oman = table.firstIndex { $0.team == "Oman" }!
        XCTAssertLessThan(oman, iraq, "عُمان تأهّلت فعلًا باللعب النظيف")
        // ويجب ألّا يتغيّر ترتيب غيرهما.
        XCTAssertEqual(table[0].team, "Saudi Arabia")
        XCTAssertEqual(table[3].team, "Kuwait")
    }

    func testFewerDisciplinaryPointsWinsBeforeLots() {
        // نقاط الإنذارات معيار رقمي يسبق القرعة: الأقلّ أفضل.
        let table = Standings.table(group: "A", teams: teams,
                                    matches: matches, results: gulf27TieResults,
                                    disciplinary: ["Oman": 3, "Iraq": 7])
        let iraq = table.firstIndex { $0.team == "Iraq" }!
        let oman = table.firstIndex { $0.team == "Oman" }!
        XCTAssertLessThan(oman, iraq)
    }

    func testLotsOrderDoesNotReorderTeamsThatAreNotTied() {
        // ضمانة ضد الخطأ الذي حذّر منه المرجع: القائمة اليدوية يجب ألّا
        // تحرّك منتخبات غير متساوية، وإلّا خرج ترتيب غير محدَّد.
        let results: [String: MatchResult] = [
            "m1": MatchResult(home: 2, away: 0),
            "m2": MatchResult(home: 1, away: 0),
            "m3": MatchResult(home: 0, away: 1),
            "m4": MatchResult(home: 0, away: 3),
            "m5": MatchResult(home: 1, away: 0),
            "m6": MatchResult(home: 2, away: 1)
        ]
        let plain = Standings.table(group: "A", teams: teams,
                                    matches: matches, results: results)
        let withLots = Standings.table(group: "A", teams: teams,
                                       matches: matches, results: results,
                                       lotsOrder: ["Kuwait", "Saudi Arabia"])
        XCTAssertEqual(plain.map(\.team), withLots.map(\.team))
    }

    func testThreeWayTieSeparatedByHeadToHeadSubgroup() {
        // ثلاثة متساوون في النقاط. المواجهة المباشرة تفصل واحدًا منهم،
        // ويبقى اثنان متساويين فتُعاد عليهما القاعدة بمبارياتهما وحدهما.
        let results: [String: MatchResult] = [
            "m2": MatchResult(home: 3, away: 0),   // العراق ٣-٠ عُمان
            "m3": MatchResult(home: 1, away: 0),   // الكويت ١-٠ العراق
            "m6": MatchResult(home: 1, away: 0),   // عُمان ١-٠ الكويت
            "m1": MatchResult(home: 0, away: 1),   // الكويت يفوز على السعودية
            "m4": MatchResult(home: 1, away: 0),   // عُمان تفوز على السعودية
            "m5": MatchResult(home: 0, away: 1)    // العراق يفوز على السعودية
        ]
        let table = Standings.table(group: "A", teams: teams,
                                    matches: matches, results: results)
        // السعودية خسرت الثلاث ⇒ الأخيرة بلا نقاط.
        XCTAssertEqual(table.last?.team, "Saudi Arabia")
        XCTAssertEqual(table.last?.points, 0)
        // والثلاثة الآخرون ٦ نقاط لكل منهم.
        for row in table.prefix(3) {
            XCTAssertEqual(row.points, 6)
        }
        // الترتيب محدَّد ولا يتغيّر بين التشغيلات.
        let again = Standings.table(group: "A", teams: teams,
                                    matches: matches, results: results)
        XCTAssertEqual(table.map(\.team), again.map(\.team))
    }

    func testEmptyResultsGivesAllZeros() {
        let table = Standings.table(group: "A", teams: teams,
                                    matches: matches, results: [:])
        XCTAssertEqual(table.count, 4)
        for row in table {
            XCTAssertEqual(row.played, 0)
            XCTAssertEqual(row.points, 0)
            XCTAssertEqual(row.goalDifference, 0)
        }
    }

    func testMatchesFromOtherGroupsAreIgnored() {
        let mixed = matches + [
            Fixture.group("x1", number: 99, group: "B",
                          home: "Japan", away: "Qatar", day: 2)
        ]
        let results: [String: MatchResult] = [
            "m1": MatchResult(home: 1, away: 0),
            "x1": MatchResult(home: 5, away: 0)
        ]
        let table = Standings.table(group: "A", teams: teams,
                                    matches: mixed, results: results)
        let total = table.reduce(0) { $0 + $1.played }
        XCTAssertEqual(total, 2, "مباراة المجموعة الثانية يجب ألّا تُحتسب هنا")
    }
}
