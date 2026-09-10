# Timesheet Module Archive: Requests & Accruals

This directory contains archived features for **Time Off Requests** and **Accruals** that were removed from the active mobile navigation menu for future deployment.

---

## Features Archived

### 1. Time Off Requests Hub (`TimesheetRequestsStubScreen`)
- **Balance Cards**: Quick visual summary for Vacation and Sick Leave balances (Available vs. Used hours).
- **Recent Requests**: List of latest requests with color-coded status badges (`Pending`, `Approved`, `Denied`).
- **New Request Submission (`AddTimeOffRequestSheet`)**:
  - Modal sheet with `.presentationDetents([.medium, .large])`.
  - Type selection (`Vacation`, `Sick Leave`, `PTO`, `Personal`).
  - Native Start Date & End Date pickers.
  - Optional notes/reason field.
- **Request Details & Management (`RequestDetailScreen`)**:
  - Detailed view of dates, type, notes, and approval status.
  - Deletion confirmation dialog for pending requests.
- **Request History (`PastRequestsScreen`)**:
  - Full searchable/scrollable list of past time off requests.

### 2. Accruals Screen (`AccrualsScreen`)
- **Paid Time Off (PTO)**: Breakdown of Accrued YTD, Used YTD, and Total Available hours.
- **Sick Leave**: Breakdown of Accrued YTD, Used YTD, and Total Available hours.
- Matches standard Period Summary card styling.

---

## Dependencies & Architecture

- **Frameworks**: SwiftUI, Foundation
- **UI System**: Murphys UI design tokens (`Color.murphysCardBackground`, `Color.murphysGroupedBackground`)
- **State Integration**: Operates alongside `ScheduleStore` for technician hours tracking.

---

## How to Restore to the App

To restore these features into the active build:

1. **Move or Re-import the File**:
   - Copy or move `TimesheetRequestsAndAccruals.swift` into `apps/mobile/Sources/MurphysUI/Screens/`.

2. **Wire Up Navigation Links in `TimeClockScreen.swift`**:
   - Inside `TimeClockScreen`'s grouped table menu `VStack`, re-add the NavigationLinks for **Requests** and **Accruals**:

```swift
// Option 2: Requests
NavigationLink(destination: TimesheetRequestsStubScreen()) {
    HStack(spacing: 12) {
        Image(systemName: "clock.badge.questionmark")
            .font(.body)
            .foregroundColor(.indigo)
            .frame(width: 24, alignment: .center)
        Text("Requests")
            .font(.body)
            .foregroundColor(.primary)
        Spacer()
        Image(systemName: "chevron.right")
            .font(.caption.weight(.bold))
            .foregroundColor(.secondary.opacity(0.6))
    }
    .padding(.vertical, 14)
    .padding(.horizontal, 20)
}
.buttonStyle(PlainButtonStyle())

Divider()
    .padding(.horizontal, 20)

// Option 3: Accruals
NavigationLink(destination: AccrualsScreen()) {
    HStack(spacing: 12) {
        Image(systemName: "chart.bar.doc.horizontal")
            .font(.body)
            .foregroundColor(.indigo)
            .frame(width: 24, alignment: .center)
        Text("Accruals")
            .font(.body)
            .foregroundColor(.primary)
        Spacer()
        Image(systemName: "chevron.right")
            .font(.caption.weight(.bold))
            .foregroundColor(.secondary.opacity(0.6))
    }
    .padding(.vertical, 14)
    .padding(.horizontal, 20)
}
.buttonStyle(PlainButtonStyle())
```

3. **Re-build & Verify**:
   - Re-run `xcodebuild` / Skip build.
