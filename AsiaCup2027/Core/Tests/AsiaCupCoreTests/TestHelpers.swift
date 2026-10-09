import Foundation
@testable import AsiaCupCore

// أدوات مساعدة للاختبارات: بناء مباريات وهمية بسرعة.
enum Fixture {

    /// تاريخ ثابت نبني عليه المواعيد، حتى تكون الاختبارات محدَّدة لا متقلّبة.
    static let base = Date(timeIntervalSince1970: 1_799_000_000)

    /// مباراة مجموعات. `day` يحدّد موعد الانطلاق بالأيام من `base`.
    static func group(_ id: String, number: Int, group: String,
                      home: String, away: String, day: Int) -> Match {
        Match(id: id, number: number, stage: .group, group: group,
              home: home, away: away,
              venue: "استاد الاختبار", city: "الرياض",
              kickoff: base.addingTimeInterval(TimeInterval(day) * 86_400))
    }

    /// مباراة إقصائية.
    static func knockout(_ id: String, number: Int, stage: Stage,
                         home: String, away: String, day: Int) -> Match {
        Match(id: id, number: number, stage: stage, group: nil,
              home: home, away: away,
              venue: "استاد الاختبار", city: "الرياض",
              kickoff: base.addingTimeInterval(TimeInterval(day) * 86_400))
    }

    /// صفّ جدول جاهز بقيم محدّدة — لاختبار ترتيب أفضل الثوالث.
    static func row(_ team: String, group: String, points: Int,
                    goalsFor: Int, goalsAgainst: Int,
                    disciplinary: Int = 0) -> TeamRow {
        var r = TeamRow(team: team, group: group)
        r.points = points
        r.goalsFor = goalsFor
        r.goalsAgainst = goalsAgainst
        r.disciplinaryPoints = disciplinary
        r.played = 3
        return r
    }
}
