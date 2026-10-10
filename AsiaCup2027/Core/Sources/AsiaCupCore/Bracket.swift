import Foundation

// ============================================================================
//  شجرة الإقصائيات
// ----------------------------------------------------------------------------
//  دور الـ١٦ ← ربع النهائي ← نصف النهائي ← النهائي.
//
//  في مباريات الإقصائيات لا يكون الطرفان معروفين مسبقًا، فيحمل الجدول
//  «رموز خانات» تتحوّل إلى أسماء منتخبات حقيقية مع تقدّم البطولة:
//
//      "1A"  ← متصدّر المجموعة الأولى
//      "2C"  ← وصيف المجموعة الثالثة
//      "3ABCD" ← صاحب مركز ثالث من إحدى المجموعات A أو B أو C أو D
//      "W49" ← الفائز من المباراة رقم ٤٩
//
//  ⚠️ نقطة حرجة: أيّ صاحب مركز ثالث يلاقي أيّ متصدّر يعتمد على **تركيبة
//  المجموعات الأربع** التي خرج منها المتأهّلون الثوالث. وعدد التركيبات
//  الممكنة ١٥ (اختيار ٤ من ٦). وهذا الجدول **رسميّ يصدر مع لائحة البطولة**،
//  ولا يجوز استنتاجه ولا تخمينه: جدول خاطئ يقلب دور الـ١٦ كلّه بصمت.
//
//  ولهذا السبب تُرجع `resolveThirdPlaceSlots` قيمة `nil` صريحة عندما يكون
//  الجدول الرسمي غير محمَّل، فيظهر في الواجهة «بانتظار الجدول الرسمي» بدل
//  أن يعرض التطبيق مواجهات مفترَضة يظنّها اللاعبون صحيحة.
// ============================================================================

public enum Bracket {

    /// رمز خانة في الجدول.
    public enum Slot: Sendable, Equatable {
        /// متصدّر مجموعة.
        case groupWinner(String)
        /// وصيف مجموعة.
        case groupRunnerUp(String)
        /// صاحب مركز ثالث من إحدى المجموعات المذكورة.
        case thirdPlace(from: [String])
        /// الفائز من مباراة سابقة.
        case winnerOf(matchNumber: Int)
        /// اسم منتخب حقيقي (تأكّد فعلًا).
        case team(String)

        /// النصّ العربي الذي يُعرض قبل أن يتأكّد المنتخب.
        public var arabicLabel: String {
            switch self {
            case .groupWinner(let g):
                return "متصدّر \(Groups.arabicName(for: g))"
            case .groupRunnerUp(let g):
                return "وصيف \(Groups.arabicName(for: g))"
            case .thirdPlace(let groups):
                let names = groups.map { Groups.arabicNumeral(for: $0) }.joined(separator: "/")
                return "ثالث إحدى المجموعات \(names)"
            case .winnerOf(let number):
                return "الفائز من المباراة \(Arabic.numerals(number))"
            case .team(let name):
                return name
            }
        }

        /// هل تحوّلت الخانة إلى منتخب حقيقي؟
        public var isResolved: Bool {
            if case .team = self { return true }
            return false
        }
    }

    /// جدول توزيع أصحاب المراكز الثالثة على مباريات دور الـ١٦.
    ///
    /// المفتاح: المجموعات الأربع التي خرج منها الثوالث المتأهّلون، مرتَّبة
    /// أبجديًا ومدموجة (مثال: "ABCD").
    /// القيمة: `[رقم مباراة دور الـ١٦: مفتاح المجموعة]` — أي أنّ ثالث هذه
    /// المجموعة يلعب في تلك المباراة.
    ///
    /// ⚠️ فارغ حتى الآن **عن قصد**، ولا يجوز استنتاجه.
    ///
    /// قد يُظنّ أن `round16Structure` تكفي لاستنتاجه: فمباراة ٣٨ تأخذ ثالث
    /// إحدى A/C/D، ومباراة ٣٩ من B/E/F، ومباراة ٤٠ من C/D/E، ومباراة ٤٤
    /// من A/B/F. لكنّ الحساب يُبطل هذا الظنّ: جرّبنا التركيبات الخمس عشرة
    /// كلّها، فوجدنا لكلّ واحدة منها **حلّين على الأقل** يحقّقان القيود
    /// (وأربعة حلول لتركيبة B/C/D/F). فلا تركيبة واحدة محدَّدة بالقيود.
    ///
    /// إذن الجدول الرسمي هو المرجع الوحيد، ولم يُنشر بعد.
    public static var officialThirdPlaceAllocation: [String: [Int: String]] = [:]

    /// هل الجدول الرسمي محمَّل؟ يجب أن يكون فيه ١٥ تركيبة.
    public static var isThirdPlaceAllocationLoaded: Bool {
        officialThirdPlaceAllocation.count == expectedCombinationCount
    }

    /// عدد التركيبات الممكنة: اختيار ٤ مجموعات من ٦ = ١٥.
    public static let expectedCombinationCount = 15

    /// بنية دور الـ١٦ كما في مخطّط الاتحاد الآسيوي الرسمي.
    ///
    /// رقم المباراة ← خانتاها. وهي **مؤكَّدة من الملف الرسمي**، بخلاف جدول
    /// توزيع الثوالث أدناه الذي لم يُنشر بعد.
    public static let round16Structure: [Int: (home: Slot, away: Slot)] = [
        37: (.groupRunnerUp("A"), .groupRunnerUp("C")),
        38: (.groupWinner("B"),   .thirdPlace(from: ["A", "C", "D"])),
        39: (.groupWinner("D"),   .thirdPlace(from: ["B", "E", "F"])),
        40: (.groupWinner("A"),   .thirdPlace(from: ["C", "D", "E"])),
        41: (.groupWinner("F"),   .groupRunnerUp("E")),
        42: (.groupRunnerUp("B"), .groupRunnerUp("F")),
        43: (.groupWinner("E"),   .groupRunnerUp("D")),
        44: (.groupWinner("C"),   .thirdPlace(from: ["A", "B", "F"]))
    ]

    /// بنية ربع النهائي ونصفه والنهائي، من المخطّط الرسمي.
    public static let laterRoundsStructure: [Int: (home: Slot, away: Slot)] = [
        45: (.winnerOf(matchNumber: 37), .winnerOf(matchNumber: 39)),
        46: (.winnerOf(matchNumber: 38), .winnerOf(matchNumber: 41)),
        47: (.winnerOf(matchNumber: 44), .winnerOf(matchNumber: 43)),
        48: (.winnerOf(matchNumber: 40), .winnerOf(matchNumber: 42)),
        49: (.winnerOf(matchNumber: 45), .winnerOf(matchNumber: 46)),
        50: (.winnerOf(matchNumber: 47), .winnerOf(matchNumber: 48)),
        51: (.winnerOf(matchNumber: 49), .winnerOf(matchNumber: 50))
    ]

    /// مباريات دور الـ١٦ التي يلعب فيها صاحب مركز ثالث، ومجموعاته المحتملة.
    ///
    /// مستخرجة من `round16Structure`، فلا تتكرّر البيانات في موضعين.
    public static var thirdPlaceSlots: [Int: [String]] {
        var out: [Int: [String]] = [:]
        for (number, pair) in round16Structure {
            if case .thirdPlace(let groups) = pair.away { out[number] = groups }
            if case .thirdPlace(let groups) = pair.home { out[number] = groups }
        }
        return out
    }

    /// يحدّد أيّ صاحب مركز ثالث يلعب في أيّ مباراة من دور الـ١٦.
    ///
    /// - Parameter qualifiedGroups: مفاتيح المجموعات الأربع التي تأهّل ثوالثها.
    /// - Returns: `[رقم المباراة: مفتاح المجموعة]`، أو `nil` إذا لم يكن
    ///   الجدول الرسمي محمَّلًا أو كانت التركيبة غير معروفة فيه. القيمة
    ///   `nil` مقصودة: أفضل من تخمين يبدو صحيحًا.
    public static func resolveThirdPlaceSlots(qualifiedGroups: [String]) -> [Int: String]? {
        guard qualifiedGroups.count == ThirdPlace.qualifyingCount else { return nil }
        let key = qualifiedGroups.sorted().joined()
        return officialThirdPlaceAllocation[key]
    }
}

/// أسماء المجموعات بالعربية.
public enum Groups {
    /// مفاتيح المجموعات الست.
    public static let allKeys = ["A", "B", "C", "D", "E", "F"]

    private static let ordinals: [String: String] = [
        "A": "الأولى", "B": "الثانية", "C": "الثالثة",
        "D": "الرابعة", "E": "الخامسة", "F": "السادسة"
    ]

    private static let numerals: [String: String] = [
        "A": "١", "B": "٢", "C": "٣", "D": "٤", "E": "٥", "F": "٦"
    ]

    /// "A" ← "المجموعة الأولى"
    public static func arabicName(for key: String) -> String {
        "المجموعة \(ordinals[key] ?? key)"
    }

    /// "A" ← "١"
    public static func arabicNumeral(for key: String) -> String {
        numerals[key] ?? key
    }
}

/// مساعدات التنسيق العربي.
public enum Arabic {
    /// يحوّل الأرقام الإنجليزية إلى أرقام عربية-هندية: 12 ← ١٢
    public static func numerals(_ value: Int) -> String {
        let digits = Array("٠١٢٣٤٥٦٧٨٩")
        return String(String(value).map { character in
            if let digit = character.wholeNumberValue, digit >= 0, digit <= 9 {
                return digits[digit]
            }
            return character
        })
    }

    /// صيغة الجمع العربية لكلمة «نقطة».
    public static func pointsWord(_ count: Int) -> String {
        switch count {
        case 0: return "لا نقاط"
        case 1: return "نقطة"
        case 2: return "نقطتان"
        case 3...10: return "نقاط"
        default: return "نقطة"
        }
    }

    /// عبارة كاملة: ٣ ← "٣ نقاط"، ٢ ← "نقطتان"، ١ ← "نقطة"
    public static func pointsPhrase(_ count: Int) -> String {
        switch count {
        case 0: return "لا نقاط"
        case 1: return "نقطة"
        case 2: return "نقطتان"
        default: return "\(numerals(count)) \(pointsWord(count))"
        }
    }
}
