import XCTest
@testable import DreamSkinCore

final class MotionSettingsTests: XCTestCase {
  private func settingsJSON(mode: String = "system", status: Bool = true) -> String {
    """
    {"schemaVersion":1,"mode":"\(mode)","effects":{"interactions":true,"status":\(status),"character":true,"ambient":false,"themeTransition":true}}
    """
  }

  func testPreferencesDecodeAllFourModesAndKeepEachEffect() throws {
    for mode in DreamSkinMotionMode.allCases {
      let settings = try XCTUnwrap(DreamSkinMotionSettings(jsonData: Data(settingsJSON(mode: mode.rawValue).utf8)))
      XCTAssertEqual(settings.mode, mode)
      XCTAssertTrue(settings.isEnabled(.interactions))
      XCTAssertTrue(settings.isEnabled(.status))
      XCTAssertTrue(settings.isEnabled(.character))
      XCTAssertFalse(settings.isEnabled(.ambient))
      XCTAssertTrue(settings.isEnabled(.themeTransition))
    }
  }

  func testPreferencesRejectUnknownOrUnboundedOutput() {
    let source = settingsJSON()
    let invalid = [
      source.replacingOccurrences(of: "\"schemaVersion\":1", with: "\"schemaVersion\":2"),
      source.replacingOccurrences(of: "\"schemaVersion\":1", with: "\"schemaVersion\":true"),
      source.replacingOccurrences(of: "\"system\"", with: "\"fast\""),
      source.replacingOccurrences(of: "\"status\":true", with: "\"status\":1"),
      source.replacingOccurrences(of: "\"status\":true,", with: ""),
      source.replacingOccurrences(of: "\"status\":true", with: "\"status\":true,\"script\":true"),
      source.replacingOccurrences(of: "\"schemaVersion\":1", with: "\"schemaVersion\":1,\"theme\":{}"),
      source + String(repeating: " ", count: 16_384),
      "not JSON",
      "[]"
    ]
    for value in invalid {
      XCTAssertNil(DreamSkinMotionSettings(jsonData: Data(value.utf8)), value.prefix(200).description)
    }
  }

  func testNativeFeedbackRequiresRealOperationAndHonorsOffReduceMotionAndStatusToggle() throws {
    for mode in DreamSkinMotionMode.allCases {
      let settings = try XCTUnwrap(DreamSkinMotionSettings(jsonData: Data(settingsJSON(mode: mode.rawValue).utf8)))
      XCTAssertEqual(settings.animatesOperationFeedback(busy: true, reduceMotion: false), mode != .off)
      XCTAssertFalse(settings.animatesOperationFeedback(busy: false, reduceMotion: false))
      XCTAssertFalse(settings.animatesOperationFeedback(busy: true, reduceMotion: true))
      let disabledStatus = try XCTUnwrap(DreamSkinMotionSettings(jsonData: Data(settingsJSON(mode: mode.rawValue, status: false).utf8)))
      XCTAssertFalse(disabledStatus.animatesOperationFeedback(busy: true, reduceMotion: false))
    }
  }

  func testMotionMenuLabelsAndDefaultContract() {
    let chinese = DreamSkinCopy(language: .chinese)
    let english = DreamSkinCopy(language: .english)
    XCTAssertEqual(DreamSkinMotionMode.allCases.map { chinese.text($0.copyKey) }, ["跟随系统", "关闭", "轻量", "完整"])
    XCTAssertEqual(DreamSkinMotionMode.allCases.map { english.text($0.copyKey) }, ["Follow System", "Off", "Subtle", "Full"])
    XCTAssertEqual(DreamSkinMotionSettings.defaults.mode, .system)
    XCTAssertEqual(DreamSkinMotionEffect.allCases.count, 5)
    XCTAssertTrue(DreamSkinMotionEffect.allCases.allSatisfy { DreamSkinMotionSettings.defaults.isEnabled($0) })
  }
}
