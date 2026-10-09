import XCTest
@testable import AsiaCupCore

/// اختبارات بطاقات ×٢ — الميزة التي كلّفت خليجي ٢٧ أكثر من درس.
final class BoostTests: XCTestCase {

    /// ستّ مباريات مرتَّبة زمنيًا، لاختبار «الأقدم أولًا».
    let matches: [Match] = (1...6).map { index in
        Fixture.group("m\(index)", number: index, group: "A",
                      home: "T\(index)A", away: "T\(index)B", day: index)
    }

    func testLimitIsFive() {
        XCTAssertEqual(Boosts.maxPerPlayer, 5)
    }

    // ---- الطبقة الأولى: العدّ يشمل المسوّدات ----

    func testDraftsCountTowardTheDisplayedTotal() {
        // بطاقتان محفوظتان + بطاقتان في مسوّدات لم تُحفظ = ٤
        let predictions: [String: [String: Prediction]] = [
            "m1": ["ali": Prediction(home: 1, away: 0, isBoosted: true)],
            "m2": ["ali": Prediction(home: 1, away: 0, isBoosted: true)]
        ]
        let drafts: [String: Prediction] = [
            "m3": Prediction(home: 2, away: 0, isBoosted: true),
            "m4": Prediction(home: 2, away: 0, isBoosted: true)
        ]
        XCTAssertEqual(Boosts.savedCount(playerID: "ali", in: predictions), 2)
        XCTAssertEqual(
            Boosts.displayedCount(playerID: "ali", in: predictions, drafts: drafts), 4)
        XCTAssertEqual(
            Boosts.remaining(playerID: "ali", in: predictions, drafts: drafts), 1)
    }

    func testDraftCannotCancelASavedBoost() {
        // أهمّ اختبار في الملف: البطاقة المحفوظة مستهلكة نهائيًا. حتى لو
        // أطفأ اللاعب الزر في المسوّدة، لا ترجع البطاقة إلى رصيده.
        let predictions: [String: [String: Prediction]] = [
            "m1": ["ali": Prediction(home: 1, away: 0, isBoosted: true)]
        ]
        let drafts: [String: Prediction] = [
            "m1": Prediction(home: 1, away: 0, isBoosted: false)
        ]
        XCTAssertEqual(
            Boosts.displayedCount(playerID: "ali", in: predictions, drafts: drafts), 1)
        XCTAssertEqual(
            Boosts.remaining(playerID: "ali", in: predictions, drafts: drafts), 4)
    }

    func testBoostsOfOtherPlayersAreNotCounted() {
        let predictions: [String: [String: Prediction]] = [
            "m1": ["ali": Prediction(home: 1, away: 0, isBoosted: true),
                   "sara": Prediction(home: 2, away: 0, isBoosted: true)],
            "m2": ["sara": Prediction(home: 1, away: 1, isBoosted: true)]
        ]
        XCTAssertEqual(Boosts.savedCount(playerID: "ali", in: predictions), 1)
        XCTAssertEqual(Boosts.savedCount(playerID: "sara", in: predictions), 2)
    }

    // ---- الطبقة الثانية: قرار الحفظ ----

    func testSavedBoostIsRewrittenEvenWhenNotRequested() {
        // اللاعب يحدّث نتيجة توقّعه ولم يطلب البطاقة هذه المرة. يجب أن
        // تُكتب البطاقة مرة أخرى، وإلّا ألغاها التحديث ورجعت لرصيده.
        let predictions: [String: [String: Prediction]] = [
            "m1": ["ali": Prediction(home: 1, away: 0, isBoosted: true)]
        ]
        let decision = Boosts.resolveBoostOnSave(
            matchID: "m1", playerID: "ali", requestedBoost: false, in: predictions)
        XCTAssertEqual(decision, true)
    }

    func testSaveRefusedWhenAllBoostsAreUsed() {
        var predictions: [String: [String: Prediction]] = [:]
        for index in 1...5 {
            predictions["m\(index)"] = ["ali": Prediction(home: 1, away: 0, isBoosted: true)]
        }
        // المباراة السادسة: الرصيد منتهٍ ⇒ nil تعني «ارفض ونبّه اللاعب».
        let decision = Boosts.resolveBoostOnSave(
            matchID: "m6", playerID: "ali", requestedBoost: true, in: predictions)
        XCTAssertNil(decision)
    }

    func testFifthBoostIsStillAllowed() {
        var predictions: [String: [String: Prediction]] = [:]
        for index in 1...4 {
            predictions["m\(index)"] = ["ali": Prediction(home: 1, away: 0, isBoosted: true)]
        }
        let decision = Boosts.resolveBoostOnSave(
            matchID: "m5", playerID: "ali", requestedBoost: true, in: predictions)
        XCTAssertEqual(decision, true)
    }

    func testSaveWithoutBoostRequestStaysFalse() {
        let decision = Boosts.resolveBoostOnSave(
            matchID: "m1", playerID: "ali", requestedBoost: false, in: [:])
        XCTAssertEqual(decision, false)
    }

    // ---- الطبقة الثالثة: الحارس الأخير ----

    func testCapKeepsTheEarliestFiveByKickoff() {
        // ستّ بطاقات محفوظة (كتابة مباشرة أو بيانات قديمة): تُحتسب أوّل
        // خمس حسب موعد الانطلاق، والسادسة تُلغى.
        var predictions: [String: [String: Prediction]] = [:]
        for index in 1...6 {
            predictions["m\(index)"] = ["ali": Prediction(home: 1, away: 0, isBoosted: true)]
        }
        let (corrected, cancelled) = Boosts.applyCap(to: predictions, matches: matches)

        for index in 1...5 {
            XCTAssertEqual(corrected["m\(index)"]?["ali"]?.isBoosted, true,
                           "البطاقة m\(index) من الأقدم ويجب أن تبقى")
        }
        XCTAssertEqual(corrected["m6"]?["ali"]?.isBoosted, false,
                       "البطاقة السادسة (الأحدث موعدًا) يجب أن تُلغى")
        XCTAssertEqual(cancelled.count, 1)
        XCTAssertEqual(cancelled.first?.matchID, "m6")
        XCTAssertEqual(cancelled.first?.playerID, "ali")
    }

    func testCapDoesNothingWhenWithinTheLimit() {
        var predictions: [String: [String: Prediction]] = [:]
        for index in 1...5 {
            predictions["m\(index)"] = ["ali": Prediction(home: 1, away: 0, isBoosted: true)]
        }
        let (corrected, cancelled) = Boosts.applyCap(to: predictions, matches: matches)
        XCTAssertTrue(cancelled.isEmpty)
        XCTAssertEqual(corrected, predictions)
    }

    func testCapIsPerPlayerNotGlobal() {
        var predictions: [String: [String: Prediction]] = [:]
        for index in 1...6 {
            predictions["m\(index)"] = [
                "ali": Prediction(home: 1, away: 0, isBoosted: true),
                "sara": Prediction(home: 2, away: 0, isBoosted: index <= 3)
            ]
        }
        let (corrected, cancelled) = Boosts.applyCap(to: predictions, matches: matches)
        // عليّ تجاوز الحد فأُلغيت له واحدة؛ وسارة داخل الحد فلم تُمسّ.
        XCTAssertEqual(cancelled.count, 1)
        XCTAssertEqual(cancelled.first?.playerID, "ali")
        for index in 1...3 {
            XCTAssertEqual(corrected["m\(index)"]?["sara"]?.isBoosted, true)
        }
    }

    func testCappedBoostNoLongerDoublesPoints() {
        // الإلغاء يجب أن يسري على النقاط فورًا، لا على العرض وحده.
        var predictions: [String: [String: Prediction]] = [:]
        for index in 1...6 {
            predictions["m\(index)"] = ["ali": Prediction(home: 2, away: 1, isBoosted: true)]
        }
        let (corrected, _) = Boosts.applyCap(to: predictions, matches: matches)
        let result = MatchResult(home: 2, away: 1)

        let fifth = corrected["m5"]!["ali"]!
        let sixth = corrected["m6"]!["ali"]!
        XCTAssertEqual(Scoring.score(prediction: fifth, result: result), 10)
        XCTAssertEqual(Scoring.score(prediction: sixth, result: result), 5,
                       "البطاقة الملغاة يجب ألّا تضاعف النقاط")
    }

    func testCapBreaksKickoffTiesByMatchNumber() {
        // مباراتان في نفس اللحظة: الترتيب يُحسم برقم المباراة حتى يكون
        // الناتج محدَّدًا لا عشوائيًا.
        let sameTime: [Match] = (1...6).map { index in
            Fixture.group("m\(index)", number: index, group: "A",
                          home: "H", away: "A", day: 1)
        }
        var predictions: [String: [String: Prediction]] = [:]
        for index in 1...6 {
            predictions["m\(index)"] = ["ali": Prediction(home: 1, away: 0, isBoosted: true)]
        }
        let (corrected, cancelled) = Boosts.applyCap(to: predictions, matches: sameTime)
        XCTAssertEqual(cancelled.count, 1)
        XCTAssertEqual(cancelled.first?.matchID, "m6")
        XCTAssertEqual(corrected["m6"]?["ali"]?.isBoosted, false)
    }
}
