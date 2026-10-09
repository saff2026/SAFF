// swift-tools-version:5.9
import PackageDescription

// حزمة «المنطق الخالص» لتطبيق كأس آسيا ٢٠٢٧.
//
// لماذا حزمة منفصلة؟
// قلب التطبيق هو قواعد الاحتساب: النقاط، بطاقات ×٢، ترتيب المجموعات،
// وترتيب أفضل أربعة ثوالث. هذه القواعد لا تحتاج شاشة ولا إنترنت، فعزلناها
// في حزمة لا تعتمد على SwiftUI ولا على Firebase إطلاقًا.
//
// الفائدة العملية: هذه الحزمة تُبنى وتُختبر على أي نظام فيه Swift — بما
// فيه لينكس — لا على macOS وحده. فيصير بالإمكان إثبات صحّة الاحتساب
// باختبارات تعمل فعلًا، بدل الاعتماد على القراءة بالعين.
let package = Package(
    name: "AsiaCupCore",
    products: [
        .library(name: "AsiaCupCore", targets: ["AsiaCupCore"])
    ],
    targets: [
        .target(
            name: "AsiaCupCore",
            resources: [.process("Resources")]
        ),
        .testTarget(
            name: "AsiaCupCoreTests",
            dependencies: ["AsiaCupCore"]
        )
    ]
)
