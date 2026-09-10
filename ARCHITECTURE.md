# Field Service Management Platform Architecture

## 1. System Overview & Monorepo Layout

This repository is structured as a feature-first monorepo divided into target applications and shared packages:

* **`apps/mobile`**: Native iOS app built with SwiftUI and transpiled for Android using Skip.dev. Serves Field Technicians (HVAC and Appliance trades).
* **`apps/web`**: Web application built with Next.js (App Router), TypeScript, and Tailwind CSS. Serves Office Staff (Dispatchers, Invoicing) and System Administrators.
* **`packages/domain`**: Shared TypeScript specifications, 1:1 Swift/TypeScript model interfaces, static trade catalogs, mock datasets, and RBAC definitions.
* **`packages/migration`**: Tools, parsers, and transformers for cleaning and importing legacy WEX CSV/Excel export data into Firestore schemas.

### Explicit Prompting Scoping Tags
When executing development tasks, requests will specify target scope using tags:
- `[Target: Mobile App]`
- `[Target: Web Portal]`
- `[Target: Shared Domain]`
- `[Target: Migration]`

---

## 2. Shared Domain Models & Schema Design (`packages/domain`)

### 2.1 Single Source of Truth & 1:1 Model Mirroring
All core entities (`Customer`, `Appointment`, `Job`, `Invoice`, `Equipment`, `User`) are defined centrally in `packages/domain` as TypeScript definitions and mirrored 1:1 as Swift structs in `apps/mobile/Sources/MurphysUI/Models/`.

### 2.2 Dynamic Trade Filtering (HVAC vs. Appliance)
* **Rule**: HVAC and Appliance technicians share identical UI screen layouts.
* **Mechanism**: Trade-specific options (diagnostic checklists, part catalogs, service items) filter dynamically based on `userProfile.primaryTrade`, assigned to the user profile by Office/Admin during account creation.

### 2.3 Extended Schema & Legacy WEX Data Support
* To support historical reporting, administrative controls, and WEX data migration, shared domain schemas include extended fields:
  * `wex_legacy_id`: Optional string linking imported records to original WEX IDs.
  * `billing_metadata`: Tax rates, payment terms, legacy account notes.
  * `historical_logs`: Legacy invoice logs and service history timestamps.
* **Mobile UI Rule**: Technician mobile views consume lightweight View Models that omit internal administrative/billing logs not required for field execution.

---

## 3. Database Readiness & Service/Repository Pattern (Firebase / Firestore)

To ensure seamless integration with Firebase / Cloud Firestore in future phases without modifying UI view code, all data access uses an abstract Service/Repository pattern:

### 3.1 Service Protocols & Interfaces
Views and View Models consume abstract protocols rather than concrete storage logic:
- Mobile (Swift): `CustomerServiceProtocol`, `JobServiceProtocol`, `InvoiceServiceProtocol`, `UserServiceProtocol`
- Web (TypeScript): `ICustomerService`, `IJobService`, `IInvoiceService`, `IUserService`

### 3.2 Mock Implementations (Current Phase)
During client-side development, applications consume mock implementations:
- `MockCustomerService`, `MockJobService` returning local mock data and `AsyncStream` / async promises.

### 3.3 Firestore Implementations (Future Phase)
When Firebase SDK is initialized, `FirestoreCustomerService` and `FirestoreJobService` will implement the exact same protocol signatures. No UI code will require modification.

---

## 4. Legacy WEX Migration Architecture (`packages/migration`)

The `packages/migration` workspace is dedicated to processing historical WEX data exports:
1. **Parsers**: Raw CSV / XLSX file parsing for legacy customer lists, job logs, and equipment records.
2. **Transformers**: Data sanitizer and schema mapper translating legacy WEX columns to canonical `packages/domain` schemas (attaching `wex_legacy_id` and formatting addresses/phones).
3. **Delta Importers**: Script runner for dry-run validation and bulk seeding into Firestore collections.

---

## 5. UI & Styling Guidelines

### 5.1 Mobile App UI (`apps/mobile`)
* Must strictly comply with Native Apple Human Interface Guidelines (HIG).
* Pure system toolbar primitives only (`NavigationStack`, `.toolbar`, `ToolbarItem`).
* No custom header shapes, capsule backgrounds, or custom buttons in toolbars.

### 5.2 Web Portal UI (`apps/web`)
* Next.js App Router with TypeScript and Tailwind CSS.
* Clean, responsive dashboard layout optimized for multi-monitor office workflows (Dispatch board, Invoice approval, User & System Administration).
