import Foundation

// ============================================================================
//  النماذج الأساسية
// ----------------------------------------------------------------------------
//  أسماء الحقول في Firebase مختصرة (h, a, pw, x2) لأن تطبيق خليجي ٢٧ كتبها
//  كذلك، ونحن نحافظ على نفس التسمية حتى تبقى البنية مألوفة ومجرَّبة. لكن
//  أسماء الخصائص في Swift مكتوبة بالكامل لتكون مقروءة، والربط بينهما يجري
//  عبر CodingKeys.
// ============================================================================

/// دور المباراة في البطولة.
public enum Stage: String, Codable, Sendable, CaseIterable {
    case group = "group"
    case round16 = "R16"
    case quarterFinal = "QF"
    case semiFinal = "SF"
    case final = "FINAL"

    /// هل المباراة إقصائية؟ المهم في هذا السؤال أن التعادل في الإقصائيات
    /// يذهب إلى ركلات الترجيح، فيصير اختيار الفائز بالترجيح إلزاميًا.
    public var isKnockout: Bool { self != .group }

    /// الاسم العربي للدور كما يُعرض في الواجهة.
    public var arabicName: String {
        switch self {
        case .group: return "دور المجموعات"
        case .round16: return "دور الـ١٦"
        case .quarterFinal: return "ربع النهائي"
        case .semiFinal: return "نصف النهائي"
        case .final: return "النهائي"
        }
    }
}

/// أيّ الطرفين فاز بركلات الترجيح. يُخزَّن في Firebase كـ "h" أو "a".
public enum PenaltyWinner: String, Codable, Sendable {
    case home = "h"
    case away = "a"
}

/// مباراة واحدة في الجدول.
///
/// في الأدوار الإقصائية قد يكون `home` أو `away` رمز خانة لا اسم منتخب
/// (مثل "1A" أو "W49")، لأن المتأهّل لم يُعرف بعد. تتحوّل الخانة إلى اسم
/// منتخب حقيقي إمّا تلقائيًا عند اكتمال الدور السابق أو بإدخال الأدمن.
public struct Match: Codable, Identifiable, Sendable, Equatable {
    /// معرّف ثابت لا يتغيّر أبدًا، لأنه مفتاح التوقّعات في Firebase.
    public let id: String
    /// رقم المباراة الرسمي في جدول الاتحاد الآسيوي (١ إلى ٥١).
    public let number: Int
    public let stage: Stage
    /// مفتاح المجموعة ("A" إلى "F") لمباريات المجموعات، و nil لغيرها.
    public let group: String?
    public let home: String
    public let away: String
    public let venue: String
    public let city: String
    /// الموعد الذي يُقفل عنده التوقّع بتوقيت UTC.
    ///
    /// إذا أعلن الاتحاد الآسيوي توقيت الانطلاق فهو توقيت الانطلاق نفسه.
    /// وإن لم يُعلَن بعد فهذا **قفل مبدئي آمن** في ساعة مبكّرة من يوم
    /// المباراة، و`isKickoffProvisional` تساوي `true`. انظر `Schedule`.
    public let kickoff: Date

    /// هل `kickoff` قفل مبدئي لا توقيت انطلاق رسمي؟
    ///
    /// الواجهة تعرض حينها «التوقيت الرسمي لم يُعلَن» بدل ساعة تبدو مؤكَّدة.
    public let isKickoffProvisional: Bool

    public init(id: String, number: Int, stage: Stage, group: String?,
                home: String, away: String, venue: String, city: String,
                kickoff: Date, isKickoffProvisional: Bool = false) {
        self.id = id
        self.number = number
        self.stage = stage
        self.group = group
        self.home = home
        self.away = away
        self.venue = venue
        self.city = city
        self.kickoff = kickoff
        self.isKickoffProvisional = isKickoffProvisional
    }
}

/// توقّع لاعب لمباراة واحدة.
public struct Prediction: Codable, Sendable, Equatable {
    /// عدد أهداف الطرف الأول المتوقَّع.
    public var home: Int
    /// عدد أهداف الطرف الثاني المتوقَّع.
    public var away: Int
    /// الفائز بالترجيح — إلزامي إذا توقّع اللاعب تعادلًا في مباراة إقصائية.
    public var penaltyWinner: PenaltyWinner?
    /// هل فُعِّلت بطاقة ×٢ على هذه المباراة؟
    ///
    /// قاعدة صارمة: البطاقة المحفوظة في قاعدة البيانات **مستهلكة نهائيًا**
    /// ولا ترجع إلى الرصيد بأيّ طريقة. انظر `Boosts` للتفصيل.
    public var isBoosted: Bool

    public init(home: Int, away: Int,
                penaltyWinner: PenaltyWinner? = nil,
                isBoosted: Bool = false) {
        self.home = home
        self.away = away
        self.penaltyWinner = penaltyWinner
        self.isBoosted = isBoosted
    }

    private enum CodingKeys: String, CodingKey {
        case home = "h"
        case away = "a"
        case penaltyWinner = "pw"
        case isBoosted = "x2"
    }

    // Firebase قد لا يكتب x2 إطلاقًا عندما تكون البطاقة غير مفعّلة (توفيرًا
    // للمساحة)، فغيابه يعني false لا خطأ في القراءة.
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.home = try c.decode(Int.self, forKey: .home)
        self.away = try c.decode(Int.self, forKey: .away)
        self.penaltyWinner = try c.decodeIfPresent(PenaltyWinner.self, forKey: .penaltyWinner)
        self.isBoosted = try c.decodeIfPresent(Bool.self, forKey: .isBoosted) ?? false
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(home, forKey: .home)
        try c.encode(away, forKey: .away)
        try c.encodeIfPresent(penaltyWinner, forKey: .penaltyWinner)
        // نكتب x2 فقط عندما تكون مفعّلة، تمامًا كما يفعل تطبيق خليجي ٢٧.
        if isBoosted { try c.encode(true, forKey: .isBoosted) }
    }

    /// هل التوقّع تعادل؟
    public var isDraw: Bool { home == away }
}

/// النتيجة الفعلية لمباراة، كما يدخلها الأدمن.
public struct MatchResult: Codable, Sendable, Equatable {
    public var home: Int
    public var away: Int
    /// الفائز بالترجيح، إن ذهبت المباراة الإقصائية إلى الترجيح.
    public var penaltyWinner: PenaltyWinner?

    public init(home: Int, away: Int, penaltyWinner: PenaltyWinner? = nil) {
        self.home = home
        self.away = away
        self.penaltyWinner = penaltyWinner
    }

    private enum CodingKeys: String, CodingKey {
        case home = "h"
        case away = "a"
        case penaltyWinner = "pw"
    }

    public var isDraw: Bool { home == away }

    /// هل حُسمت هذه المباراة بركلات الترجيح؟ (تعادل + فائز بالترجيح مسجَّل)
    public var wentToPenalties: Bool { isDraw && penaltyWinner != nil }
}

/// حالة المباراة من ناحية التوقّع.
public enum MatchStatus: Sendable, Equatable {
    /// انتهت ودخلت نتيجتها.
    case finished
    /// انطلقت صافرة البداية فأُقفل التوقّع، ولم تدخل النتيجة بعد.
    case locked
    /// التوقّع مفتوح.
    case open
    /// مباراة إقصائية لم يتأكّد طرفاها بعد، فالتوقّع لم يُفتح أصلًا.
    case awaitingTeams
}

/// توقّعات البطولة الأربعة.
public struct TournamentPicks: Codable, Sendable, Equatable {
    public var champion: String?
    public var topScorer: String?
    public var bestPlayer: String?
    public var bestGoalkeeper: String?

    public init(champion: String? = nil, topScorer: String? = nil,
                bestPlayer: String? = nil, bestGoalkeeper: String? = nil) {
        self.champion = champion
        self.topScorer = topScorer
        self.bestPlayer = bestPlayer
        self.bestGoalkeeper = bestGoalkeeper
    }

    private enum CodingKeys: String, CodingKey {
        case champion
        case topScorer = "scorer"
        case bestPlayer = "mvp"
        case bestGoalkeeper = "gk"
    }
}

/// لاعب مشارك في المسابقة (لا لاعب كرة — بل المستخدم).
public struct Player: Codable, Sendable, Identifiable, Equatable {
    /// المفتاح في Firebase، مشتقّ من الاسم.
    public let id: String
    public var name: String
    public var picks: TournamentPicks

    public init(id: String, name: String, picks: TournamentPicks = TournamentPicks()) {
        self.id = id
        self.name = name
        self.picks = picks
    }
}
