import XCTest
@testable import AsiaCupCore

/// اختبارات تحميل الجدول — الهدف: ألّا يُخفي التطبيق نقصًا في البيانات.
final class ScheduleTests: XCTestCase {

    func testFiftyOneMatchesExpected() {
        // ٦ مجموعات × ٦ + ٨ + ٤ + ٢ + ١ = ٥١
        XCTAssertEqual(Schedule.expectedMatchCount, 51)
        XCTAssertEqual(6 * 6 + 8 + 4 + 2 + 1, Schedule.expectedMatchCount)
    }

    func testMatchWithoutKickoffIsReportedAsMissing() {
        // أخطر حالة: مباراة بلا موعد انطلاق تعني ثغرة تسمح بالتوقّع بعد
        // بدايتها. يجب ألّا تُحمَّل، وأن تُذكر صريحة في التقرير.
        let json = """
        {
          "expectedMatchCount": 2,
          "matches": [
            {"id":"m1","number":1,"stage":"group","group":"A",
             "home":"Saudi Arabia","away":"Palestine","venue":"v","city":"الرياض",
             "date":"2027-01-07","kickoffUTC":"2027-01-07T17:00:00Z"},
            {"id":"m2","number":2,"stage":"group","group":"A",
             "home":"Kuwait","away":"Oman","venue":"v","city":"الرياض",
             "date":"2027-01-08","kickoffUTC":null}
          ]
        }
        """
        let report = try! Schedule.parse(Data(json.utf8))
        XCTAssertEqual(report.matches.count, 1)
        XCTAssertEqual(report.matches.first?.id, "m1")
        XCTAssertEqual(report.missingKickoff, ["m2"])
        XCTAssertFalse(report.isComplete)
        XCTAssertTrue(report.arabicSummary.contains("ناقص"))
    }

    func testCompleteScheduleIsReportedComplete() {
        let json = """
        {
          "expectedMatchCount": 1,
          "matches": [
            {"id":"m1","number":1,"stage":"group","group":"A",
             "home":"Saudi Arabia","away":"Palestine","venue":"v","city":"الرياض",
             "date":"2027-01-07","kickoffUTC":"2027-01-07T17:00:00Z"}
          ]
        }
        """
        let report = try! Schedule.parse(Data(json.utf8))
        XCTAssertTrue(report.isComplete)
        XCTAssertTrue(report.missingKickoff.isEmpty)
        XCTAssertFalse(report.arabicSummary.contains("ناقص"))
    }

    func testNotEnteredMatchesAreCounted() {
        let json = """
        {
          "expectedMatchCount": 51,
          "matches": [
            {"id":"m1","number":1,"stage":"group","group":"A",
             "home":"Saudi Arabia","away":"Palestine","venue":"v","city":"الرياض",
             "date":"2027-01-07","kickoffUTC":"2027-01-07T17:00:00Z"}
          ]
        }
        """
        let report = try! Schedule.parse(Data(json.utf8))
        XCTAssertEqual(report.notEnteredCount, 50)
        XCTAssertFalse(report.isComplete)
    }

    func testUnknownStageIsRejectedNotGuessed() {
        let json = """
        {
          "expectedMatchCount": 1,
          "matches": [
            {"id":"m1","number":1,"stage":"THIRD_PLACE_PLAYOFF","group":null,
             "home":"A","away":"B","venue":"v","city":"الرياض",
             "date":"2027-02-04","kickoffUTC":"2027-02-04T17:00:00Z"}
          ]
        }
        """
        let report = try! Schedule.parse(Data(json.utf8))
        XCTAssertTrue(report.matches.isEmpty)
        XCTAssertEqual(report.missingKickoff, ["m1"])
    }

    func testMatchesAreSortedByKickoff() {
        let json = """
        {
          "expectedMatchCount": 2,
          "matches": [
            {"id":"m2","number":2,"stage":"group","group":"A",
             "home":"Kuwait","away":"Oman","venue":"v","city":"الرياض",
             "date":"2027-01-08","kickoffUTC":"2027-01-08T17:00:00Z"},
            {"id":"m1","number":1,"stage":"group","group":"A",
             "home":"Saudi Arabia","away":"Palestine","venue":"v","city":"الرياض",
             "date":"2027-01-07","kickoffUTC":"2027-01-07T17:00:00Z"}
          ]
        }
        """
        let report = try! Schedule.parse(Data(json.utf8))
        XCTAssertEqual(report.matches.map(\.id), ["m1", "m2"])
    }

    func testBundledScheduleParsesAndIsHonestAboutBeingIncomplete() {
        // الملف المرفق في الحزمة ناقص عن قصد حتى يُستكمل من المصدر الرسمي.
        // هذا الاختبار يضمن أنه (أ) يُقرأ بلا خطأ، و(ب) لا يدّعي الاكتمال.
        let report = try! Schedule.load()
        XCTAssertEqual(report.expectedCount, 51)
        XCTAssertFalse(report.isComplete,
                       "الجدول المرفق ناقص؛ لو صار مكتملًا فحدّث هذا الاختبار")
    }

    // ---- المنتخبات والمجموعات ----

    func testTwentyFourTeamsInSixGroups() {
        XCTAssertEqual(Teams.byGroup.count, 6)
        XCTAssertEqual(Teams.all.count, 24)
        for key in Groups.allKeys {
            XCTAssertEqual(Teams.byGroup[key]?.count, 4, "المجموعة \(key) يجب أن تكون أربعة")
        }
    }

    func testTeamKeysAreUnique() {
        let keys = Teams.all.map(\.key)
        XCTAssertEqual(Set(keys).count, 24, "لا يجوز تكرار منتخب")
    }

    func testEveryTeamHasArabicNameAndCountryCode() {
        for team in Teams.all {
            XCTAssertFalse(team.arabicName.isEmpty, "\(team.key) بلا اسم عربي")
            XCTAssertEqual(team.countryCode.count, 2, "\(team.key) رمز دولته غير صحيح")
        }
    }

    func testGroupLookupWorksBothWays() {
        XCTAssertEqual(Teams.group(of: "Saudi Arabia"), "A")
        XCTAssertEqual(Teams.group(of: "Japan"), "F")
        XCTAssertEqual(Teams.arabicName(for: "Saudi Arabia"), "السعودية")
        XCTAssertNil(Teams.group(of: "Brazil"))
    }

    func testSlotCodesAreNotMistakenForTeams() {
        // رمز الخانة ليس منتخبًا: لو اعتُبر كذلك فُتح التوقّع قبل أوانه.
        XCTAssertTrue(Teams.isRealTeam("Iran"))
        XCTAssertFalse(Teams.isRealTeam("1A"))
        XCTAssertFalse(Teams.isRealTeam("3BCDE"))
        XCTAssertFalse(Teams.isRealTeam("W49"))
    }

    func testElevenArabTeamsQualified() {
        let arab = ["Saudi Arabia", "Kuwait", "Oman", "Palestine", "Bahrain",
                    "Jordan", "Syria", "Iraq", "United Arab Emirates", "Yemen", "Qatar"]
        for team in arab {
            XCTAssertNotNil(Teams.byKey[team], "\(team) يجب أن يكون في القائمة")
        }
        XCTAssertEqual(arab.count, 11)
    }

    // ---- التنسيق العربي ----

    func testArabicNumerals() {
        XCTAssertEqual(Arabic.numerals(0), "٠")
        XCTAssertEqual(Arabic.numerals(5), "٥")
        XCTAssertEqual(Arabic.numerals(51), "٥١")
        XCTAssertEqual(Arabic.numerals(2027), "٢٠٢٧")
    }

    func testArabicPointsPhrase() {
        XCTAssertEqual(Arabic.pointsPhrase(0), "لا نقاط")
        XCTAssertEqual(Arabic.pointsPhrase(1), "نقطة")
        XCTAssertEqual(Arabic.pointsPhrase(2), "نقطتان")
        XCTAssertEqual(Arabic.pointsPhrase(5), "٥ نقاط")
        XCTAssertEqual(Arabic.pointsPhrase(12), "١٢ نقطة")
    }

    func testGroupArabicNames() {
        XCTAssertEqual(Groups.arabicName(for: "A"), "المجموعة الأولى")
        XCTAssertEqual(Groups.arabicName(for: "F"), "المجموعة السادسة")
        XCTAssertEqual(Groups.arabicNumeral(for: "C"), "٣")
    }

    func testSlotLabelsReadCorrectlyInArabic() {
        XCTAssertEqual(Bracket.Slot.groupWinner("A").arabicLabel, "متصدّر المجموعة الأولى")
        XCTAssertEqual(Bracket.Slot.groupRunnerUp("B").arabicLabel, "وصيف المجموعة الثانية")
        XCTAssertEqual(Bracket.Slot.winnerOf(matchNumber: 49).arabicLabel,
                       "الفائز من المباراة ٤٩")
        XCTAssertFalse(Bracket.Slot.groupWinner("A").isResolved)
        XCTAssertTrue(Bracket.Slot.team("Iran").isResolved)
    }
}
