import XCTest

final class AdPlacementTests: XCTestCase {
    @MainActor
    func testPreviewSlotIsLabeledAndOutsideThePriceList() {
        let app = XCUIApplication()
        app.launchArguments = ["--demo-data", "--preview-ad-slot"]
        app.launch()
        XCTAssertTrue(app.staticTexts["ad.label"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["ad.label"].label, "Anzeige")

        openMilk(in: app)
        let priceList = app.descendants(matching: .any)["product.priceList"].firstMatch
        XCTAssertTrue(priceList.waitForExistence(timeout: 5))
        XCTAssertFalse(priceList.descendants(matching: .any)["ad.slot"].exists)
        XCTAssertFalse(priceList.staticTexts["Anzeige"].exists)
    }

    @MainActor
    func testPreviewSlotLeavesObservationOrderUnchanged() {
        let app = XCUIApplication()
        app.launchArguments = ["--demo-data"]
        app.launch()
        openMilk(in: app)
        let withoutSlot = observationIDs(in: app)
        XCTAssertFalse(withoutSlot.isEmpty)
        app.terminate()

        app.launchArguments = ["--demo-data", "--preview-ad-slot"]
        app.launch()
        XCTAssertTrue(app.staticTexts["ad.label"].waitForExistence(timeout: 5))
        openMilk(in: app)
        XCTAssertEqual(observationIDs(in: app), withoutSlot)
    }

    @MainActor
    private func openMilk(in app: XCUIApplication) {
        app.tabBars.buttons["Suche"].tap()
        let search = app.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        search.tap()
        search.typeText("milch\n")
        let product = app.buttons["product.open.milk_15"].firstMatch
        XCTAssertTrue(product.waitForExistence(timeout: 10))
        product.tap()
        XCTAssertTrue(app.buttons["product.listAction"].waitForExistence(timeout: 5))
    }

    @MainActor
    private func observationIDs(in app: XCUIApplication) -> [String] {
        app.descendants(matching: .any)
            .matching(NSPredicate(format: "identifier BEGINSWITH %@", "observation."))
            .allElementsBoundByIndex
            .sorted { $0.frame.minY < $1.frame.minY }
            .map(\.identifier)
    }
}
