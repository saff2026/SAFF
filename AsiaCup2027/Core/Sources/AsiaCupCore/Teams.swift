import Foundation

// ============================================================================
//  المنتخبات الأربعة والعشرون ومجموعاتها
// ----------------------------------------------------------------------------
//  مصدر هذه البيانات: قرعة كأس آسيا السعودية ٢٠٢٧، أُجريت في ٩ مايو ٢٠٢٦
//  بقصر سلوى في حيّ الطريف بالدرعية. المقعد الأخير في المجموعة الخامسة كان
//  معلَّقًا بين اليمن ولبنان، وحُسم لليمن في يونيو ٢٠٢٦.
//
//  هذه البيانات مؤكَّدة من عدة مصادر متوافقة (CNN العربية، beIN Sports،
//  Inside World Football)، وتبقى المطابقة النهائية على موقع الاتحاد الآسيوي
//  مطلوبة لأنه محجوب من بيئة العمل هذه.
// ============================================================================

/// منتخب مشارك.
public struct Team: Sendable, Equatable, Hashable, Codable {
    /// الاسم المعياري بالإنجليزية — وهو المفتاح الثابت في قاعدة البيانات.
    public let key: String
    /// الاسم المعروض بالعربية.
    public let arabicName: String
    /// رمز الدولة بحرفين لجلب العلم.
    public let countryCode: String

    public init(key: String, arabicName: String, countryCode: String) {
        self.key = key
        self.arabicName = arabicName
        self.countryCode = countryCode
    }
}

public enum Teams {

    /// المنتخبات الأربعة والعشرون موزَّعة على مجموعاتها.
    ///
    /// ترتيب المنتخبات داخل كل مجموعة هو ترتيب القرعة (المركز الأول في
    /// التصنيف أولًا)، لا ترتيب الجدول.
    public static let byGroup: [String: [Team]] = [
        "A": [
            Team(key: "Saudi Arabia", arabicName: "السعودية", countryCode: "sa"),
            Team(key: "Kuwait", arabicName: "الكويت", countryCode: "kw"),
            Team(key: "Oman", arabicName: "عُمان", countryCode: "om"),
            Team(key: "Palestine", arabicName: "فلسطين", countryCode: "ps")
        ],
        "B": [
            Team(key: "Uzbekistan", arabicName: "أوزبكستان", countryCode: "uz"),
            Team(key: "Bahrain", arabicName: "البحرين", countryCode: "bh"),
            Team(key: "North Korea", arabicName: "كوريا الشمالية", countryCode: "kp"),
            Team(key: "Jordan", arabicName: "الأردن", countryCode: "jo")
        ],
        "C": [
            Team(key: "Iran", arabicName: "إيران", countryCode: "ir"),
            Team(key: "Syria", arabicName: "سوريا", countryCode: "sy"),
            Team(key: "Kyrgyzstan", arabicName: "قيرغيزستان", countryCode: "kg"),
            Team(key: "China", arabicName: "الصين", countryCode: "cn")
        ],
        "D": [
            Team(key: "Australia", arabicName: "أستراليا", countryCode: "au"),
            Team(key: "Tajikistan", arabicName: "طاجيكستان", countryCode: "tj"),
            Team(key: "Iraq", arabicName: "العراق", countryCode: "iq"),
            Team(key: "Singapore", arabicName: "سنغافورة", countryCode: "sg")
        ],
        "E": [
            Team(key: "South Korea", arabicName: "كوريا الجنوبية", countryCode: "kr"),
            Team(key: "United Arab Emirates", arabicName: "الإمارات", countryCode: "ae"),
            Team(key: "Vietnam", arabicName: "فيتنام", countryCode: "vn"),
            Team(key: "Yemen", arabicName: "اليمن", countryCode: "ye")
        ],
        "F": [
            Team(key: "Japan", arabicName: "اليابان", countryCode: "jp"),
            Team(key: "Qatar", arabicName: "قطر", countryCode: "qa"),
            Team(key: "Thailand", arabicName: "تايلاند", countryCode: "th"),
            Team(key: "Indonesia", arabicName: "إندونيسيا", countryCode: "id")
        ]
    ]

    /// كل المنتخبات، مرتَّبة بالمجموعة ثم بترتيب القرعة.
    public static let all: [Team] = Groups.allKeys.flatMap { byGroup[$0] ?? [] }

    /// بحث سريع بالمفتاح الإنجليزي.
    public static let byKey: [String: Team] = {
        var map: [String: Team] = [:]
        for team in all { map[team.key] = team }
        return map
    }()

    /// الاسم العربي لمنتخب، أو المفتاح نفسه إن لم يكن معروفًا.
    public static func arabicName(for key: String) -> String {
        byKey[key]?.arabicName ?? key
    }

    /// مفتاح مجموعة منتخب.
    public static func group(of key: String) -> String? {
        for (groupKey, teams) in byGroup where teams.contains(where: { $0.key == key }) {
            return groupKey
        }
        return nil
    }

    /// هل هذا اسم منتخب حقيقي؟ (لا رمز خانة مثل "1A")
    public static func isRealTeam(_ name: String) -> Bool {
        byKey[name] != nil
    }
}
