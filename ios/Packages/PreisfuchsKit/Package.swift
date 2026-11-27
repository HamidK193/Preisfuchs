// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PreisfuchsKit",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "PreisfuchsDomain", targets: ["PreisfuchsDomain"]),
        .library(name: "PreisfuchsData", targets: ["PreisfuchsData"]),
    ],
    targets: [
        .target(name: "PreisfuchsDomain"),
        .target(
            name: "PreisfuchsData",
            dependencies: ["PreisfuchsDomain"],
            resources: [.process("Resources")]
        ),
        .testTarget(
            name: "PreisfuchsDomainTests",
            dependencies: ["PreisfuchsDomain"]
        ),
        .testTarget(
            name: "PreisfuchsDataTests",
            dependencies: ["PreisfuchsData", "PreisfuchsDomain"],
            resources: [.copy("Fixtures")]
        ),
    ]
)
