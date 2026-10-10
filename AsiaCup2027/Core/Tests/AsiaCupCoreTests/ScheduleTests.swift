import XCTest
@testable import AsiaCupCore

/// اختبارات تحميل الجدول — الهدف: ألّا يُخفي التطبيق نقصًا في البيانات.
final class ScheduleTests: XCTestCase {

    func testFiftyOneMatchesExpected() {
        // ٦ مجموعات × ٦ + ٨ + ٤ + ٢ + ١ = ٥١
        XCTAssertEqual(Schedule.expectedMatchCount, 51)
        XCTAssertEqual(6 * 6 + 8 + 4 + 2 + 1, Schedule.expectedMatchCount)
    }

    func testMatchWithDateButNoOfficialTimeGetsASafeProvisionalLock() {
        // الحالة الواقعية: الاتحاد الآسيوي نشر التاريخ ولم ينشر التوقيت.
        // يجب أن تُحمَّل المباراة بقفل مبدئي في ساعة مبكّرة من يومها، لا أن
        // تبقى بلا قفل فيتوقّع اللاعب بعد بدء المباراة.
        let json = """
        {
          "expectedMatchCount": 1, "provisionalLockUTCHour": 9,
          "matches": [
            {"id":"m1","number":1,"stage":"group","group":"A",
             "home":"Saudi Arabia","away":"Palestine","venue":"v","city":"الرياض",
             "date":"2027-01-07","kickoffUTC":null}
          ]
        }
        """
        let report = try! Schedule.parse(Data(json.utf8))
        XCTAssertEqual(report.matches.count, 1)
        let match = report.matches[0]
        XCTAssertTrue(match.isKickoffProvisional)
        XCTAssertEqual(report.provisional, ["m1"])
        // قابل للاستخدام (له قفل) لكنه ليس نهائيًا (التوقيت غير رسمي)
        XCTAssertTrue(report.isUsable)
        XCTAssertFalse(report.isFinal)

        // القفل في ٢٠٢٧-٠١-٠٧ الساعة ٠٩:٠٠ بتوقيت غرينتش بالضبط
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]
        XCTAssertEqual(match.kickoff, iso.date(from: "2027-01-07T09:00:00Z"))
    }

    func testProvisionalLockIsBeforeAnyPlausibleKickoff() {
        // ٠٩:٠٠ غرينتش = ١٢:٠٠ ظهرًا بتوقيت السعودية. أبكر انطلاق في
        // بطولات كأس آسيا كان نحو الواحدة بعد الظهر، فالقفل يسبقه يقينًا.
        XCTAssertEqual(Schedule.provisionalLockHourUTC, 9)
        XCTAssertLessThan(Schedule.provisionalLockHourUTC + 3, 13,
                          "القفل المبدئي يجب أن يسبق أبكر انطلاق محتمل")
    }

    func testMatchWithNeitherTimeNorDateIsRefused() {
        // بلا تاريخ ولا توقيت: لا سبيل لقفل التوقّع، فلا تُحمَّل إطلاقًا.
        let json = """
        {
          "expectedMatchCount": 1,
          "matches": [
            {"id":"m1","number":1,"stage":"group","group":"A",
             "home":"A","away":"B","venue":"v","city":"الرياض",
             "date":null,"kickoffUTC":null}
          ]
        }
        """
        let report = try! Schedule.parse(Data(json.utf8))
        XCTAssertTrue(report.matches.isEmpty)
        XCTAssertEqual(report.unusable, ["m1"])
        XCTAssertFalse(report.isUsable)
    }

    func testOfficialTimeWinsOverProvisional() {
        let json = """
        {
          "expectedMatchCount": 1,
          "matches": [
            {"id":"m1","number":1,"stage":"group","group":"A",
             "home":"A","away":"B","venue":"v","city":"الرياض",
             "date":"2027-01-07","kickoffUTC":"2027-01-07T17:00:00Z"}
          ]
        }
        """
        let report = try! Schedule.parse(Data(json.utf8))
        XCTAssertFalse(report.matches[0].isKickoffProvisional)
        XCTAssertTrue(report.isFinal)
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
        XCTAssertTrue(report.isFinal)
        XCTAssertTrue(report.provisional.isEmpty)
        XCTAssertTrue(report.arabicSummary.contains("نهائي"))
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
        XCTAssertFalse(report.isUsable)
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
        XCTAssertEqual(report.unusable, ["m1"])
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

    // ---- الجدول الرسمي المرفق: ٥١ مباراة من ملف الاتحاد الآسيوي ----

    func testBundledScheduleHasAllFiftyOneMatches() {
        let report = try! Schedule.load()
        XCTAssertEqual(report.expectedCount, 51)
        XCTAssertEqual(report.matches.count, 51)
        XCTAssertTrue(report.unusable.isEmpty)
        XCTAssertTrue(report.isUsable, "كل المباريات لها قفل صالح")
    }

    func testBundledScheduleIsHonestThatTimesAreNotOfficialYet() {
        // الاتحاد الآسيوي لم ينشر التوقيتات، فكل المباريات بقفل مبدئي،
        // والجدول ليس نهائيًا. لو صار نهائيًا فحدّث هذا الاختبار.
        let report = try! Schedule.load()
        XCTAssertEqual(report.provisional.count, 51)
        XCTAssertFalse(report.isFinal)
        XCTAssertTrue(report.arabicSummary.contains("مبدئي"))
    }

    func testStageCountsMatchTheTournamentFormat() {
        let report = try! Schedule.load()
        let byStage = Dictionary(grouping: report.matches, by: \.stage)
            .mapValues(\.count)
        XCTAssertEqual(byStage[.group], 36, "٦ مجموعات × ٦ مباريات")
        XCTAssertEqual(byStage[.round16], 8)
        XCTAssertEqual(byStage[.quarterFinal], 4)
        XCTAssertEqual(byStage[.semiFinal], 2)
        XCTAssertEqual(byStage[.final], 1)
    }

    func testMatchNumbersAndIDsAreCompleteAndUnique() {
        let report = try! Schedule.load()
        XCTAssertEqual(Set(report.matches.map(\.number)), Set(1...51))
        XCTAssertEqual(Set(report.matches.map(\.id)).count, 51)
    }

    func testOpeningMatchIsSaudiArabiaVersusPalestineInRiyadh() {
        let report = try! Schedule.load()
        let opener = report.matches.first { $0.number == 1 }!
        XCTAssertEqual(opener.home, "Saudi Arabia")
        XCTAssertEqual(opener.away, "Palestine")
        XCTAssertEqual(opener.city, "الرياض")
        XCTAssertEqual(opener.group, "A")
        XCTAssertEqual(opener.stage, .group)
    }

    func testFinalIsMatchFiftyOneInRiyadh() {
        let report = try! Schedule.load()
        let final = report.matches.first { $0.number == 51 }!
        XCTAssertEqual(final.stage, .final)
        XCTAssertEqual(final.city, "الرياض")
        // النهائي بين الفائزين من نصف النهائي (م٤٩ و م٥٠)
        XCTAssertEqual(final.home, "W49")
        XCTAssertEqual(final.away, "W50")
    }

    func testGroupStageIsACompleteRoundRobin() {
        // كل منتخب يلاقي الثلاثة الآخرين في مجموعته مرة واحدة بالضبط.
        let report = try! Schedule.load()
        var opponents: [String: [String]] = [:]
        for match in report.matches where match.stage == .group {
            opponents[match.home, default: []].append(match.away)
            opponents[match.away, default: []].append(match.home)
        }
        XCTAssertEqual(opponents.count, 24, "٢٤ منتخبًا")
        for (team, faced) in opponents {
            XCTAssertEqual(faced.count, 3, "\(team) يجب أن يلعب ٣ مباريات")
            XCTAssertEqual(Set(faced).count, 3, "\(team) لا يلاقي أحدًا مرتين")
            guard let group = Teams.group(of: team) else {
                XCTFail("\(team) بلا مجموعة"); continue
            }
            let expected = Set((Teams.byGroup[group] ?? []).map(\.key)).subtracting([team])
            XCTAssertEqual(Set(faced), expected, "\(team) يلاقي مجموعته فقط")
        }
    }

    func testEveryGroupHasExactlySixMatches() {
        let report = try! Schedule.load()
        for key in Groups.allKeys {
            let count = report.matches.filter { $0.stage == .group && $0.group == key }.count
            XCTAssertEqual(count, 6, "المجموعة \(key)")
        }
    }

    func testVenuesAreTheEightOfficialStadiumsInThreeCities() {
        let report = try! Schedule.load()
        XCTAssertEqual(Set(report.matches.map(\.venue)).count, 8, "ثمانية ملاعب")
        XCTAssertEqual(Set(report.matches.map(\.city)), ["الرياض", "جدة", "الخبر"])
    }

    func testKhobarVenueIsAramcoStadium() {
        // الملف الرسمي بعد القرعة يسمّيه «Aramco Stadium»، لا «Al Khobar»
        // كما كان في النسخة التي قبل القرعة.
        let report = try! Schedule.load()
        let khobar = report.matches.filter { $0.city == "الخبر" }
        XCTAssertEqual(khobar.count, 7)
        XCTAssertEqual(Set(khobar.map(\.venue)), ["استاد أرامكو"])
    }

    func testMatchCountsPerCityMatchTheOfficialSchedule() {
        let report = try! Schedule.load()
        let byCity = Dictionary(grouping: report.matches, by: \.city).mapValues(\.count)
        XCTAssertEqual(byCity["الرياض"], 31)
        XCTAssertEqual(byCity["جدة"], 13)
        XCTAssertEqual(byCity["الخبر"], 7)
    }

    func testSemiFinalsAreInKhobarThenJeddah() {
        // تحقّق مستقلّ: تقارير إخبارية ذكرت نصف النهائي في الخبر ١ فبراير
        // وجدة ٢ فبراير، وهو ما يقوله الملف الرسمي.
        let report = try! Schedule.load()
        let semis = report.matches.filter { $0.stage == .semiFinal }
            .sorted { $0.number < $1.number }
        XCTAssertEqual(semis.count, 2)
        XCTAssertEqual(semis[0].number, 49)
        XCTAssertEqual(semis[0].city, "الخبر")
        XCTAssertEqual(semis[1].number, 50)
        XCTAssertEqual(semis[1].city, "جدة")
    }

    func testNoTeamPlaysTwiceOnTheSameDay() {
        // سلامة منطقية: لا يلعب منتخب مباراتين في يوم واحد.
        let report = try! Schedule.load()
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        var seen: Set<String> = []
        for match in report.matches where match.stage == .group {
            let day = calendar.startOfDay(for: match.kickoff).timeIntervalSince1970
            for team in [match.home, match.away] {
                let key = "\(team)@\(day)"
                XCTAssertFalse(seen.contains(key), "\(team) يلعب مرتين في يوم واحد")
                seen.insert(key)
            }
        }
    }

    func testMatchesRunFromSeventhJanuaryToFifthFebruary() {
        let report = try! Schedule.load()
        let calendar = Calendar(identifier: .gregorian)
        let sorted = report.matches.sorted { $0.kickoff < $1.kickoff }
        let first = calendar.dateComponents(in: TimeZone(identifier: "UTC")!,
                                            from: sorted.first!.kickoff)
        let last = calendar.dateComponents(in: TimeZone(identifier: "UTC")!,
                                           from: sorted.last!.kickoff)
        XCTAssertEqual([first.year, first.month, first.day], [2027, 1, 7])
        XCTAssertEqual([last.year, last.month, last.day], [2027, 2, 5])
    }

    func testEveryGroupMatchUsesRealTeamNames() {
        let report = try! Schedule.load()
        for match in report.matches where match.stage == .group {
            XCTAssertTrue(Teams.isRealTeam(match.home), "\(match.home) ليس منتخبًا معروفًا")
            XCTAssertTrue(Teams.isRealTeam(match.away), "\(match.away) ليس منتخبًا معروفًا")
        }
    }

    func testEveryKnockoutMatchUsesSlotCodesNotTeams() {
        // الإقصائيات لا تُعرف أطرافها مسبقًا، فيجب أن تحمل رموز خانات.
        let report = try! Schedule.load()
        for match in report.matches where match.stage.isKnockout {
            XCTAssertFalse(Teams.isRealTeam(match.home), "م\(match.number)")
            XCTAssertFalse(Teams.isRealTeam(match.away), "م\(match.number)")
        }
    }

    // ---- شجرة الإقصائيات من المخطّط الرسمي ----

    func testRound16StructureCoversMatches37To44() {
        XCTAssertEqual(Set(Bracket.round16Structure.keys), Set(37...44))
    }

    func testFourRound16MatchesHostAThirdPlacedTeam() {
        let slots = Bracket.thirdPlaceSlots
        XCTAssertEqual(Set(slots.keys), [38, 39, 40, 44])
        XCTAssertEqual(slots[38].map(Set.init), Set(["A", "C", "D"]))
        XCTAssertEqual(slots[39].map(Set.init), Set(["B", "E", "F"]))
        XCTAssertEqual(slots[40].map(Set.init), Set(["C", "D", "E"]))
        XCTAssertEqual(slots[44].map(Set.init), Set(["A", "B", "F"]))
    }

    func testNoGroupWinnerCanFaceItsOwnGroupsThirdPlacedTeam() {
        // ضمانة منطقية: متصدّر المجموعة لا يلاقي ثالث مجموعته نفسها.
        for (number, pair) in Bracket.round16Structure {
            guard case .groupWinner(let winnerGroup) = pair.home,
                  case .thirdPlace(let groups) = pair.away else { continue }
            XCTAssertFalse(groups.contains(winnerGroup),
                           "م\(number): متصدّر \(winnerGroup) لا يجوز أن يلاقي ثالث \(winnerGroup)")
        }
    }

    func testLaterRoundsFeedForwardCorrectly() {
        // ربع النهائي يتغذّى من دور الـ١٦، ونصفه من الربع، والنهائي من النصف.
        let later = Bracket.laterRoundsStructure
        XCTAssertEqual(Set(later.keys), Set(45...51))
        for (number, pair) in later {
            for slot in [pair.home, pair.away] {
                guard case .winnerOf(let source) = slot else {
                    XCTFail("م\(number) يجب أن تتغذّى من فائز مباراة"); continue
                }
                XCTAssertLessThan(source, number, "م\(number) تتغذّى من مباراة سابقة")
            }
        }
        // كل مباراة من ٣٧ إلى ٥٠ تغذّي مباراة واحدة بعدها بالضبط
        var feeds: [Int: Int] = [:]
        for pair in later.values {
            for slot in [pair.home, pair.away] {
                if case .winnerOf(let source) = slot { feeds[source, default: 0] += 1 }
            }
        }
        for source in 37...50 {
            XCTAssertEqual(feeds[source], 1, "م\(source) يجب أن تغذّي مباراة واحدة")
        }
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
