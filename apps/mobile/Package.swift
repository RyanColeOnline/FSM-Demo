// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MurphysUI",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "MurphysUI", type: .dynamic, targets: ["MurphysUI"])
    ],
    dependencies: [],
    targets: [
        .target(
            name: "MurphysUI",
            dependencies: [],
            path: "Sources/MurphysUI"
        )
    ]
)
