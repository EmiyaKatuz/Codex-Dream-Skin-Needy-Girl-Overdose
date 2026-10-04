import Foundation

public enum DreamSkinMotionMode: String, CaseIterable, Decodable, Sendable {
  case system
  case off
  case subtle
  case full

  public var copyKey: DreamSkinCopy.Key {
    switch self {
    case .system: return .motionSystem
    case .off: return .motionOff
    case .subtle: return .motionSubtle
    case .full: return .motionFull
    }
  }
}

public enum DreamSkinMotionEffect: String, CaseIterable, Sendable {
  case interactions
  case status
  case character
  case ambient
  case themeTransition

  public var copyKey: DreamSkinCopy.Key {
    switch self {
    case .interactions: return .motionInteractions
    case .status: return .motionStatus
    case .character: return .motionCharacter
    case .ambient: return .motionAmbient
    case .themeTransition: return .motionThemeTransition
    }
  }
}

/// Only the validated settings tool's bounded JSON output is accepted here.
/// Native menus never write theme.json or construct a preferences file directly.
public struct DreamSkinMotionSettings: Decodable, Equatable, Sendable {
  public struct Effects: Decodable, Equatable, Sendable {
    public let interactions: Bool
    public let status: Bool
    public let character: Bool
    public let ambient: Bool
    public let themeTransition: Bool
  }

  public let schemaVersion: Int
  public let mode: DreamSkinMotionMode
  public let effects: Effects

  public static let defaults = DreamSkinMotionSettings(
    schemaVersion: 1,
    mode: .system,
    effects: Effects(
      interactions: true, status: true, character: true, ambient: true, themeTransition: true
    )
  )

  private init(schemaVersion: Int, mode: DreamSkinMotionMode, effects: Effects) {
    self.schemaVersion = schemaVersion
    self.mode = mode
    self.effects = effects
  }

  public init?(jsonData: Data) {
    guard jsonData.count <= 16_384,
          let object = try? JSONSerialization.jsonObject(with: jsonData),
          let root = object as? [String: Any],
          Set(root.keys) == Set(["schemaVersion", "mode", "effects"]),
          let effects = root["effects"] as? [String: Any],
          Set(effects.keys) == Set(DreamSkinMotionEffect.allCases.map(\.rawValue)),
          let parsed = try? JSONDecoder().decode(Self.self, from: jsonData),
          parsed.schemaVersion == 1 else { return nil }
    self = parsed
  }

  public func isEnabled(_ effect: DreamSkinMotionEffect) -> Bool {
    switch effect {
    case .interactions: return effects.interactions
    case .status: return effects.status
    case .character: return effects.character
    case .ambient: return effects.ambient
    case .themeTransition: return effects.themeTransition
    }
  }

  public func animatesOperationFeedback(busy: Bool, reduceMotion: Bool) -> Bool {
    busy && mode != .off && effects.status && !reduceMotion
  }
}
