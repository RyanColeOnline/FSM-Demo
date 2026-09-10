# Hybrid Workflow & Deployment Rules

## Host Architecture
- **Development Environment:** Windows host (`E:\Murphys`)
- **Build & Simulation Environment:** M4 Cloud Mac Mini
- **Remote Host User:** `ryancole`
- **Remote Host IP / Alias:** `macmini` (`100.111.159.84`)
- **Sync Method:** Mutagen continuous directory sync

## Execution Protocols
1. **Tooling Boundary:** Never attempt to run macOS CLI tools (`xcrun`, `xcodebuild`, `simctl`, `swift`) directly in the Windows local terminal.
2. **Build Execution:** Always issue macOS commands remotely via SSH using:
   `ssh macmini "<command>"`

## Automatic Simulator Refresh Pipeline
Whenever you modify, refactor, or generate code in this workspace, automatically run the combined installation and launch sequence on the remote Mac Mini as the final step of your turn:

```bash
ssh macmini "cd /Users/ryancole/Developer/workspace/Murphys && xcodebuild -workspace Project.xcworkspace -scheme \"Murphys App\" -sdk iphonesimulator -jobs 4 build && xcrun simctl install booted /Users/ryancole/Library/Developer/Xcode/DerivedData/Project-gqyascjzfjzxlecluaudluuwayda/Build/Products/Debug-iphonesimulator/MurphysUI.app && xcrun simctl launch --terminate-running-process booted com.murphys.app"
```

## Strict Native Apple HIG Toolbar Directive
1. ABSOLUTELY NO CUSTOM TOOLBARS OR HEADERS: Never construct header bars using custom `HStack`, `ZStack`, or standalone `Button` views wrapped in custom background shapes (e.g., circular white bubbles, drop shadows, capsules, or custom paddings).
2. ONLY NATIVE SYSTEM PRIMITIVES: All screen headers and modals MUST use SwiftUI's native `NavigationStack`, `.navigationTitle(...)`, `.navigationBarTitleDisplayMode(...)`, and `.toolbar` modifier.
3. STRICT TOOLBAR PLACEMENTS: Always use standard `ToolbarItem` or `ToolbarItemGroup` with explicit system placements:
   - Dismissal/Cancel: `placement: .topBarLeading`
   - Primary Confirmation/Save: `placement: .topBarTrailing`
   - Bottom Actions: `placement: .bottomBar`
4. PURE APPLE ASSETS ONLY: Use standard text strings (`Cancel`, `Done`, `Save`) or official SF Symbols strings via `Image(systemName: "...")` with system semantic roles (`role: .destructive`).
5. NO CUSTOM COLOR STYLES FOR DISABLED STATES: Use SwiftUI's native `.disabled(condition)` modifier directly on system buttons. Do not manually apply `Color.gray.opacity(...)` to button icons or backgrounds.

## RULE 6: ABSOLUTE APPLE HIG TOOLBAR STRICTNESS (ZERO CUSTOMIZATION)

You MUST follow pure, un-styled Apple HIG navigation bar standards. You are STRICTLY FORBIDDEN from adding visual fluff, filled icons, or custom button containers to any `ToolbarItem`.

### 1. STRICTLY FORBIDDEN IN TOOLBARS (NEVER DO THIS):
- ❌ NEVER use filled icon variants in toolbars (e.g., `checkmark.circle.fill`, `xmark.circle.fill`, `plus.circle.fill`). Use ONLY plain outline symbols (`xmark`, `checkmark`, `plus`).
- ❌ NEVER apply `.buttonStyle()`, `.buttonBorderShape()`, `.background()`, `.clipShape()`, or custom padding inside a `ToolbarItem`.
- ❌ NEVER wrap toolbar content in custom `HStack`, `ZStack`, or rounded shapes to create "fake" buttons.
- ❌ NEVER draw pill, capsule, or circle backgrounds around toolbar items.

### 2. THE ONLY PERMITTED TOOLBAR BUTTON SYNTAXES:

#### Type A: Primary Action / Confirmation (Text Only)
Primary toolbar actions (Save, Done, Add, Next, Cancel) MUST be plain system text:
```swift
ToolbarItem(placement: .topBarTrailing) {
    Button("Save") {
        // action
    }
    .disabled(isSaveDisabled)
}
```

#### Type B: Secondary / Dismissal Actions (Symbol Only)
Secondary actions or dismissals MUST use standard, un-filled, un-bordered SF Symbols:
```swift
ToolbarItem(placement: .topBarLeading) {
    Button {
        dismiss()
    } label: {
        Image(systemName: "xmark")
    }
}
```

#### Type C: System Menus (Dropdown)
Dropdowns attached to toolbars MUST use native Menu:
```swift
ToolbarItem(placement: .topBarTrailing) {
    Menu {
        Button("Take Photo", systemImage: "camera") { }
        Button("Photo Library", systemImage: "photo") { }
    } label: {
        Image(systemName: "plus")
    }
}
```
