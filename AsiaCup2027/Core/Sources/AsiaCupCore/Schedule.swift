import Foundation

// ============================================================================
//  تحميل الجدول والتحقّق من اكتماله
// ----------------------------------------------------------------------------
//  الجدول يُقرأ من `schedule.json`، لا يُكتب في الكود، حتى يسهل تحديثه من
//  المصدر الرسمي دون لمس المنطق.
//
//  مسألة التوقيتات، وهي الأهمّ هنا:
//  الاتحاد الآسيوي نشر الجدول بالتواريخ والملاعب، لكنه **لم ينشر توقيتات
//  الانطلاق بعد**. وموعد الانطلاق هو ما يقفل التوقّعات، فتركه فارغًا يفتح
//  ثغرة: يبقى التوقّع مفتوحًا بعد أن تبدأ المباراة فيتوقّع اللاعب وهو يشاهد.
//
//  ولا نخترع توقيتًا يبدو مؤكَّدًا. الحلّ: **قفل مبدئي آمن** في ساعة مبكّرة
//  من يوم المباراة — أبكر من أيّ انطلاق محتمل — فينغلق التوقّع قبل أن تبدأ
//  أيّ مباراة يقينًا. ونُعلم اللاعب أن التوقيت مبدئي بـ
//  `Match.isKickoffProvisional`، ويُستبدل بالدقيق حين يُعلَن.
//
//  الجانب الذي نخطئ فيه مقصود: أن يُقفل التوقّع مبكّرًا أهون بكثير من أن
//  يبقى مفتوحًا بعد صافرة البداية.
// ============================================================================

/// تقرير عن حالة الجدول.
public struct ScheduleReport: Sendable {
    /// المباريات المحمَّلة، مرتَّبة بموعد القفل.
    public let matches: [Match]
    /// العدد المتوقَّع (٥١ لكأس آسيا ٢٠٢٧).
    public let expectedCount: Int
    /// مباريات لا تاريخ لها إطلاقًا — لا تُحمَّل، ولا يجوز التوقّع عليها.
    public let unusable: [String]
    /// مباريات قفلها مبدئي لأن توقيتها الرسمي لم يُعلَن.
    public var provisional: [String] {
        matches.filter { $0.isKickoffProvisional }.map { $0.id }
    }
    /// مباريات لم تُدخل بعد إطلاقًا.
    public var notEnteredCount: Int {
        max(0, expectedCount - matches.count - unusable.count)
    }
    /// هل كل المباريات موجودة وصالحة للتوقّع؟ (ولو بقفل مبدئي)
    public var isUsable: Bool {
        matches.count == expectedCount && unusable.isEmpty
    }
    /// هل الجدول نهائي بتوقيتات رسمية لكل مباراة؟
    public var isFinal: Bool { isUsable && provisional.isEmpty }

    /// وصف عربي للحالة، يُعرض في وضع الإدارة.
    public var arabicSummary: String {
        if isFinal {
            return "✅ الجدول نهائي: \(Arabic.numerals(expectedCount)) مباراة بتوقيتات رسمية."
        }
        var parts: [String] = []
        if matches.count != expectedCount || !unusable.isEmpty {
            parts.append("مُدخَل \(Arabic.numerals(matches.count)) من \(Arabic.numerals(expectedCount)) مباراة")
        }
        if !unusable.isEmpty {
            parts.append("و\(Arabic.numerals(unusable.count)) مباراة بلا تاريخ فلا يجوز التوقّع عليها")
        }
        if notEnteredCount > 0 {
            parts.append("و\(Arabic.numerals(notEnteredCount)) مباراة لم تُدخل بعد")
        }
        if !provisional.isEmpty {
            parts.append("و\(Arabic.numerals(provisional.count)) مباراة قفلها مبدئي لأن الاتحاد الآسيوي لم يُعلن توقيتها")
        }
        return "⚠️ " + parts.joined(separator: "، ") + "."
    }
}

public enum Schedule {

    /// ٦ مجموعات × ٦ = ٣٦، زائد ٨ دور الـ١٦، و٤ ربع، و٢ نصف، والنهائي = ٥١.
    public static let expectedMatchCount = 51

    /// ساعة القفل المبدئي بتوقيت UTC حين لا يكون التوقيت الرسمي معلومًا.
    ///
    /// ٠٩:٠٠ بتوقيت غرينتش = ١٢:٠٠ ظهرًا بتوقيت السعودية. ولا تنطلق مباراة
    /// في كأس آسيا قبل الظهر، فالقفل يسبق الانطلاق يقينًا.
    public static let provisionalLockHourUTC = 9

    struct File: Decodable {
        let expectedMatchCount: Int
        let provisionalLockUTCHour: Int?
        let matches: [Entry]

        struct Entry: Decodable {
            let id: String
            let number: Int
            let stage: String
            let group: String?
            let home: String
            let away: String
            let venue: String
            let city: String
            let date: String?
            let kickoffUTC: String?
        }
    }

    public enum LoadError: Error, CustomStringConvertible {
        case resourceMissing
        case unreadable(String)

        public var description: String {
            switch self {
            case .resourceMissing:
                return "لم يُعثر على ملف الجدول schedule.json داخل الحزمة."
            case .unreadable(let reason):
                return "ملف الجدول غير قابل للقراءة: \(reason)"
            }
        }
    }

    /// يحمّل الجدول من بيانات JSON خامّة. مفصولة عن قراءة الملف لتكون
    /// قابلة للاختبار ببيانات مُصطنعة.
    public static func parse(_ data: Data) throws -> ScheduleReport {
        let file: File
        do {
            file = try JSONDecoder().decode(File.self, from: data)
        } catch {
            throw LoadError.unreadable(String(describing: error))
        }

        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]

        var calendar = Calendar(identifier: .gregorian)
        guard let utc = TimeZone(identifier: "UTC") else {
            throw LoadError.unreadable("تعذّر إنشاء المنطقة الزمنية UTC")
        }
        calendar.timeZone = utc
        let lockHour = file.provisionalLockUTCHour ?? provisionalLockHourUTC

        var matches: [Match] = []
        var unusable: [String] = []

        for entry in file.matches {
            guard let stage = Stage(rawValue: entry.stage) else {
                unusable.append(entry.id)
                continue
            }

            var kickoff: Date?
            var provisional = false

            if let text = entry.kickoffUTC, let exact = iso.date(from: text) {
                kickoff = exact
            } else if let day = entry.date, let parsed = parseDay(day, calendar: calendar) {
                // قفل مبدئي آمن في ساعة مبكّرة من يوم المباراة.
                kickoff = calendar.date(byAdding: .hour, value: lockHour, to: parsed)
                provisional = true
            }

            guard let lock = kickoff else {
                // لا توقيت ولا تاريخ ⇒ لا سبيل لقفل التوقّع، فلا تُحمَّل.
                unusable.append(entry.id)
                continue
            }

            matches.append(Match(id: entry.id, number: entry.number, stage: stage,
                                 group: entry.group, home: entry.home, away: entry.away,
                                 venue: entry.venue, city: entry.city,
                                 kickoff: lock, isKickoffProvisional: provisional))
        }

        matches.sort { lhs, rhs in
            if lhs.kickoff != rhs.kickoff { return lhs.kickoff < rhs.kickoff }
            return lhs.number < rhs.number
        }

        return ScheduleReport(matches: matches,
                              expectedCount: file.expectedMatchCount,
                              unusable: unusable.sorted())
    }

    /// يحوّل "2027-01-07" إلى منتصف ليل ذلك اليوم بتوقيت UTC.
    static func parseDay(_ text: String, calendar: Calendar) -> Date? {
        let parts = text.split(separator: "-")
        guard parts.count == 3,
              let year = Int(parts[0]), let month = Int(parts[1]), let day = Int(parts[2])
        else { return nil }
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        return calendar.date(from: components)
    }

    /// يحمّل الجدول من ملف الحزمة.
    public static func load() throws -> ScheduleReport {
        guard let url = Bundle.module.url(forResource: "schedule", withExtension: "json") else {
            throw LoadError.resourceMissing
        }
        return try parse(try Data(contentsOf: url))
    }
}
