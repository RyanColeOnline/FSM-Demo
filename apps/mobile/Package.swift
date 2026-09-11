// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FSMDemoUI",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "FSMDemoUI", type: .dynamic, targets: ["FSMDemoUI"])
    ],
    dependencies: [],
    targets: [
        .target(
            name: "FSMDemoUI",
            dependencies: [],
            path: "Sources/FSMDemoUI"
        )
    ]
)
