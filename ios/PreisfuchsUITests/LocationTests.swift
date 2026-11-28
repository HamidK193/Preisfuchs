import XCTest

final class LocationTests: XCTestCase {
    @MainActor
    func testExactlyFiveDigitsSaveAndSurviveRelaunch() {
        let app = XCUIApplication()
        app.launchArguments = ["--demo-data"]
        app.launch()
        let location = app.buttons["location.open"]
        XCTAssertTrue(location.waitForExistence(timeout: 5))
        location.tap()
        let postalCode = app.textFields["location.postalCode"]
        XCTAssertTrue(postalCode.waitForExistence(timeout: 5))
        let oldValue = postalCode.value as? String ?? ""
        postalCode.tap()
        if oldValue != "Genau 5 Ziffern" {
            postalCode.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: oldValue.count))
        }
        postalCode.typeText("1234")
        let save = app.buttons["location.save"]
        XCTAssertFalse(save.isEnabled)
        postalCode.typeText("56")
        XCTAssertFalse(save.isEnabled)
        postalCode.typeText(XCUIKeyboardKey.delete.rawValue)
        XCTAssertTrue(save.isEnabled)
        save.tap()
        app.terminate()
        app.launch()
        XCTAssertTrue(location.waitForExistence(timeout: 5))
        location.tap()
        XCTAssertTrue(postalCode.waitForExistence(timeout: 5))
        XCTAssertEqual(postalCode.value as? String, "12345")
    }
}
