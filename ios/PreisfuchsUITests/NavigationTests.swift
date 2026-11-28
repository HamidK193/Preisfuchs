import XCTest

final class NavigationTests: XCTestCase {
    @MainActor
    func testFiveTabsSwitchAndListsShareOneTab() {
        let app = XCUIApplication()
        app.launchArguments = ["--demo-data"]
        app.launch()
        for title in ["Start", "Suche", "Angebote", "Liste", "Profil"] {
            let tab = app.tabBars.buttons[title]
            XCTAssertTrue(tab.waitForExistence(timeout: 5))
            tab.tap()
            XCTAssertTrue(tab.isSelected)
        }
        app.tabBars.buttons["Liste"].tap()
        XCTAssertTrue(app.segmentedControls.buttons["Einkauf"].exists)
        app.segmentedControls.buttons["Favoriten"].tap()
        XCTAssertTrue(app.segmentedControls.buttons["Favoriten"].isSelected)
    }

    @MainActor
    func testHomeLayoutAndScreenshot() {
        let app = XCUIApplication()
        app.launchArguments = ["--demo-data"]
        app.launch()
        XCTAssertTrue(app.textFields["Lebensmittel suchen"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Kategorien"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Beobachtete Angebote"].exists)
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "S3-Start-Demo"
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    @MainActor
    func testProductOpensMarketSheetAndAddsToList() {
        let app = XCUIApplication()
        app.launchArguments = ["--demo-data"]
        app.launch()
        app.tabBars.buttons["Suche"].tap()
        let search = app.textFields["Lebensmittel suchen"]
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        search.tap()
        search.typeText("milch")
        let product = app.buttons["product.open.milk_15"]
        XCTAssertTrue(product.waitForExistence(timeout: 10))
        product.tap()
        let listAction = app.buttons["product.listAction"]
        XCTAssertTrue(listAction.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Preise je Markt"].exists)
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "S5-Produkt-Sheet-Demo"
        attachment.lifetime = .keepAlways
        add(attachment)
        listAction.tap()
        app.buttons["Schließen"].tap()
        app.tabBars.buttons["Liste"].tap()
        XCTAssertTrue(app.buttons["product.open.milk_15"].waitForExistence(timeout: 5))
    }
}
