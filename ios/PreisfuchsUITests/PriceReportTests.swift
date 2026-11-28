import XCTest

final class PriceReportTests: XCTestCase {
    @MainActor
    func testDemoReportExplainsUnavailableFeaturesAndCannotSend() {
        let app = XCUIApplication()
        app.launchArguments = ["--demo-data"]
        app.launch()
        app.tabBars.buttons["Profil"].tap()
        let openReport = app.buttons["report.open"]
        XCTAssertTrue(openReport.waitForExistence(timeout: 5))
        openReport.tap()

        XCTAssertTrue(app.navigationBars["Preis melden"].waitForExistence(timeout: 5))
        // SwiftUI Forms may create rows only as they approach the visible area.
        XCTAssertTrue(scrollTo(app.staticTexts["report.storeUnavailable"], in: app))
        XCTAssertTrue(scrollTo(app.staticTexts["report.photoUnavailable"], in: app))
        let submit = app.buttons["report.submit"]
        XCTAssertTrue(submit.exists)
        XCTAssertFalse(submit.isEnabled)

        let login = app.buttons["report.login"]
        XCTAssertTrue(scrollTo(login, in: app, upwards: false))
        login.tap()
        XCTAssertTrue(app.staticTexts["login.unavailable"].waitForExistence(timeout: 5))
    }

    @MainActor
    func testProductReportDismissesBackToProduct() {
        let app = XCUIApplication()
        app.launchArguments = ["--demo-data"]
        app.launch()
        app.tabBars.buttons["Suche"].tap()
        let search = app.searchFields["Lebensmittel suchen"]
        XCTAssertTrue(search.waitForExistence(timeout: 5))
        search.tap()
        search.typeText("milch\n")
        let product = app.buttons["product.open.milk_15"]
        XCTAssertTrue(product.waitForExistence(timeout: 10))
        product.tap()

        let openReport = app.buttons["report.open"]
        XCTAssertTrue(scrollTo(openReport, in: app))
        openReport.tap()
        let reportBar = app.navigationBars["Preis melden"]
        XCTAssertTrue(reportBar.waitForExistence(timeout: 5))
        reportBar.buttons["Schließen"].tap()

        XCTAssertTrue(app.buttons["product.listAction"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Preise je Markt"].exists)
        XCTAssertFalse(reportBar.exists)
    }

    @MainActor
    private func scrollTo(_ element: XCUIElement, in app: XCUIApplication, upwards: Bool = true) -> Bool {
        for _ in 0..<8 {
            if element.exists && element.isHittable { return true }
            if upwards { app.swipeUp() }
            else { app.swipeDown() }
        }
        return element.exists && element.isHittable
    }
}
