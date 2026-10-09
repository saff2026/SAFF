import Foundation

// ============================================================================
//  تحميل الجدول والتحقّق من اكتماله
// ----------------------------------------------------------------------------
//  الجدول يُقرأ من ملف `schedule.json`، لا يُكتب في الكود، حتى يسهل تحديثه
//  من الملف الرسمي دون لمس المنطق.
//
//  المبدأ الحاكم هنا: **الجدول الناقص لا يُخفى**. التطبيق يعرف بالضبط كم
//  مباراة ينتظر (٥١)، وأيّ مباراة ما زالت بلا موعد انطلاق. وموعد الانطلاق
//  تحديدًا حرج، لأنه هو ما يقفل التوقّعات: مباراة بلا موعد = ثغرة تسمح
//  بالتوقّع بعد أن تبدأ المباراة.
// ============================================================================

/// تقرير عن حالة الجدول.
public struct ScheduleReport: Sendable {
    /// المباريات المحمَّلة التي لها موعد انطلاق صالح.
    public let matches: [Match]
    /// العدد المتوقَّع (٥١ لكأس آسيا ٢٠٢٧).
    public let expectedCount: Int
    /// مباريات مُدخلة لكنها بلا موعد انطلاق — لا يجوز فتح التوقّع عليها.
    public let missingKickoff: [String]
    /// عدد المباريات التي لم تُدخل بعد إطلاقًا.
    public var notEnteredCount: Int {
        max(0, expectedCount - matches.count - missingKickoff.count)
    }
    /// هل الجدول مكتمل وصالح لتشغيل البطولة؟
    public var isComplete: Bool {
        matches.count == expectedCount && missingKickoff.isEmpty
    }
    /// رسالة عربية تصف الحالة، تُعرض في وضع الإدارة.
    public var arabicSummary: String {
        if isComplete {
            return "الجدول مكتمل: \(Arabic.numerals(expectedCount)) مباراة."
        }
        var parts: [String] = []
        parts.append("مُدخَل \(Arabic.numerals(matches.count)) من \(Arabic.numerals(expectedCount)) مباراة")
        if !missingKickoff.isEmpty {
            parts.append("و\(Arabic.numerals(missingKickoff.count)) مباراة بلا موعد انطلاق")
        }
        if notEnteredCount > 0 {
            parts.append("و\(Arabic.numerals(notEnteredCount)) مباراة لم تُدخل بعد")
        }
        return "⚠️ الجدول ناقص — " + parts.joined(separator: "، ") + "."
    }
}

public enum Schedule {

    /// عدد مباريات كأس آسيا ٢٠٢٧: ٦ مجموعات × ٦ مباريات = ٣٦، زائد
    /// ٨ مباريات دور الـ١٦، و٤ ربع النهائي، و٢ نصف النهائي، والنهائي = ٥١.
    public static let expectedMatchCount = 51

    /// بنية ملف JSON.
    struct File: Decodable {
        let expectedMatchCount: Int
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
            let date: String
            let kickoffUTC: String?
        }
    }

    /// أخطاء التحميل.
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

    /// يحمّل الجدول من بيانات JSON خامّة.
    ///
    /// مفصولة عن قراءة الملف حتى تكون قابلة للاختبار ببيانات مُصطنعة.
    public static func parse(_ data: Data) throws -> ScheduleReport {
        let decoder = JSONDecoder()
        let file: File
        do {
            file = try decoder.decode(File.self, from: data)
        } catch {
            throw LoadError.unreadable(String(describing: error))
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]

        var matches: [Match] = []
        var missing: [String] = []

        for entry in file.matches {
            guard let stage = Stage(rawValue: entry.stage) else {
                missing.append(entry.id)
                continue
            }
            // بلا موعد انطلاق ⇒ لا تُحمَّل كمباراة قابلة للتوقّع.
            guard let iso = entry.kickoffUTC, let kickoff = formatter.date(from: iso) else {
                missing.append(entry.id)
                continue
            }
            matches.append(Match(id: entry.id, number: entry.number, stage: stage,
                                 group: entry.group, home: entry.home, away: entry.away,
                                 venue: entry.venue, city: entry.city, kickoff: kickoff))
        }

        matches.sort { lhs, rhs in
            if lhs.kickoff != rhs.kickoff { return lhs.kickoff < rhs.kickoff }
            return lhs.number < rhs.number
        }

        return ScheduleReport(matches: matches,
                              expectedCount: file.expectedMatchCount,
                              missingKickoff: missing.sorted())
    }

    /// يحمّل الجدول من ملف الحزمة.
    public static func load() throws -> ScheduleReport {
        guard let url = Bundle.module.url(forResource: "schedule", withExtension: "json") else {
            throw LoadError.resourceMissing
        }
        let data = try Data(contentsOf: url)
        return try parse(data)
    }
}
