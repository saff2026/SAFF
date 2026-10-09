import Foundation

// ============================================================================
//  أفضل أربعة أصحاب مركز ثالث
// ----------------------------------------------------------------------------
//  هذا منطق جديد كليًّا لا وجود له في تطبيق خليجي ٢٧، لأن خليجي ٢٧ كانت
//  مجموعتين يتأهّل منهما أصحاب المركزين الأولين مباشرة إلى نصف النهائي.
//
//  كأس آسيا ٢٠٢٧: ست مجموعات، يتأهّل أصحاب المركزين الأولين (١٢ منتخبًا)
//  زائد **أفضل أربعة** من أصحاب المراكز الثالثة (٤ منتخبات) = ١٦ منتخبًا.
//
//  فرق جوهري عن ترتيب المجموعة: أصحاب المراكز الثالثة من مجموعات مختلفة،
//  فلا توجد بينهم مواجهة مباشرة يُحتكَم إليها. ولذلك المعايير هنا كلّها
//  معايير عامة من البداية.
//
//  ⚠️ تنبيه أمانة: ترتيب المعايير أدناه هو الترتيب القياسي المعتمد في
//  بطولات الـ٢٤ منتخبًا، ولم نتمكّن من مطابقته على لائحة الاتحاد الآسيوي
//  الرسمية لأن موقع AFC محجوب من بيئة العمل هذه. ولهذا كُتبت المعايير
//  كقائمة معلَنة في `criteria` أدناه: مطابقتها على اللائحة الرسمية وتعديلها
//  إن لزم مسألة سطر واحد، لا إعادة كتابة.
// ============================================================================

public enum ThirdPlace {

    /// عدد أصحاب المراكز الثالثة المتأهّلين إلى دور الـ١٦.
    public static let qualifyingCount = 4

    /// معيار ترجيح واحد بين أصحاب المراكز الثالثة.
    public enum Criterion: String, Sendable, CaseIterable {
        /// عدد النقاط في دور المجموعات (الأكثر أفضل).
        case points
        /// فرق الأهداف في دور المجموعات (الأكبر أفضل).
        case goalDifference
        /// الأهداف المسجّلة في دور المجموعات (الأكثر أفضل).
        case goalsScored
        /// نقاط الإنذارات والطرد (الأقلّ أفضل).
        case disciplinaryPoints

        public var arabicName: String {
            switch self {
            case .points: return "النقاط"
            case .goalDifference: return "فرق الأهداف"
            case .goalsScored: return "الأهداف المسجّلة"
            case .disciplinaryPoints: return "نقاط الإنذارات"
            }
        }
    }

    /// المعايير بالترتيب المطبَّق. ما بقي متساويًا بعدها يُحسم بالقرعة.
    ///
    /// هذه القائمة هي الموضع الوحيد الذي يُعدَّل فيه ترتيب الترجيح.
    public static let criteria: [Criterion] = [
        .points,
        .goalDifference,
        .goalsScored,
        .disciplinaryPoints
    ]

    /// يرتّب أصحاب المراكز الثالثة الستة من الأفضل إلى الأسوأ.
    ///
    /// - Parameters:
    ///   - rows: صفّ صاحب المركز الثالث من كل مجموعة (ستة صفوف عند اكتمال
    ///     دور المجموعات). كل صفّ يحمل مفتاح مجموعته في `group`.
    ///   - lotsOrder: ترتيب القرعة اليدوي، يُستخدم فقط بين من تساوى في كل
    ///     المعايير الرقمية. الأول أعلى.
    /// - Returns: القائمة مرتَّبة. الأربعة الأُوَل هم المتأهّلون.
    public static func rank(_ rows: [TeamRow], lotsOrder: [String] = []) -> [TeamRow] {
        let sorted = rows.sorted { lhs, rhs in
            for criterion in criteria {
                switch criterion {
                case .points:
                    if lhs.points != rhs.points { return lhs.points > rhs.points }
                case .goalDifference:
                    if lhs.goalDifference != rhs.goalDifference {
                        return lhs.goalDifference > rhs.goalDifference
                    }
                case .goalsScored:
                    if lhs.goalsFor != rhs.goalsFor { return lhs.goalsFor > rhs.goalsFor }
                case .disciplinaryPoints:
                    if lhs.disciplinaryPoints != rhs.disciplinaryPoints {
                        return lhs.disciplinaryPoints < rhs.disciplinaryPoints
                    }
                }
            }
            // تساوٍ تام في كل المعايير: نرتّب بمفتاح المجموعة ثم الاسم حتى
            // يكون الناتج محدَّدًا لا عشوائيًا، ثم تأتي القرعة فتصحّحه.
            if lhs.group != rhs.group { return lhs.group < rhs.group }
            return lhs.team < rhs.team
        }
        return applyLots(sorted, lotsOrder: lotsOrder)
    }

    /// المتأهّلون الأربعة فقط.
    public static func qualified(_ rows: [TeamRow], lotsOrder: [String] = []) -> [TeamRow] {
        Array(rank(rows, lotsOrder: lotsOrder).prefix(qualifyingCount))
    }

    /// يطبّق القرعة اليدوية بين من تساوى في كل المعايير الرقمية فقط.
    /// نفس الأسلوب المستخدم في `Standings` حتى تبقى المقارنة متعدّية.
    static func applyLots(_ sorted: [TeamRow], lotsOrder: [String]) -> [TeamRow] {
        guard !lotsOrder.isEmpty else { return sorted }
        var result = sorted
        var index = 0
        while index < result.count {
            var end = index
            while end + 1 < result.count,
                  result[end + 1].points == result[index].points,
                  result[end + 1].goalDifference == result[index].goalDifference,
                  result[end + 1].goalsFor == result[index].goalsFor,
                  result[end + 1].disciplinaryPoints == result[index].disciplinaryPoints {
                end += 1
            }
            if end > index {
                var slots: [Int] = []
                var picks: [TeamRow] = []
                for position in index...end where lotsOrder.contains(result[position].team) {
                    slots.append(position)
                    picks.append(result[position])
                }
                if picks.count > 1 {
                    picks.sort { lhs, rhs in
                        let l = lotsOrder.firstIndex(of: lhs.team) ?? Int.max
                        let r = lotsOrder.firstIndex(of: rhs.team) ?? Int.max
                        return l < r
                    }
                    for (offset, slot) in slots.enumerated() {
                        result[slot] = picks[offset]
                    }
                }
            }
            index = end + 1
        }
        return result
    }
}
