import Foundation

public struct UserPermissions: Codable, Sendable, Equatable {
    public var accountType: AccountType
    public var hasWebPortalAccess: Bool
    public var reportingTabVisibility: Bool
    public var moreAppsAndSettingsVisibility: Bool
    public var appointmentVisibility: String
    public var allCustomerVisibility: Bool
    public var scheduleEventsPermission: String
    public var manuallyEnterCards: Bool
    public var manageRecurringPayments: Bool
    public var performCreditsAndVoids: Bool
    public var performFinancingActions: Bool
    public var receiptCopyRecipients: [String]
    public var editPricesAndTaxOnMobile: Bool
    public var createCustomLineItems: Bool
    public var viewJobPnL: Bool
    
    // Computed Helpers
    public var canSwitchTechnicianSchedules: Bool {
        accountType == .office || accountType == .admin
    }
    public var canViewAllTechnicians: Bool {
        appointmentVisibility.lowercased().contains("all")
    }
    public var canTakePayments: Bool {
        true
    }
    public var canEditPrices: Bool {
        editPricesAndTaxOnMobile
    }
    public var canCreateInvoices: Bool {
        true
    }
    public var canCreateProposals: Bool {
        true
    }
    
    public init(
        accountType: AccountType = .field,
        hasWebPortalAccess: Bool = false,
        reportingTabVisibility: Bool = false,
        moreAppsAndSettingsVisibility: Bool = false,
        appointmentVisibility: String = "All appointments",
        allCustomerVisibility: Bool = true,
        scheduleEventsPermission: String = "Cannot Schedule Any Events",
        manuallyEnterCards: Bool = true,
        manageRecurringPayments: Bool = false,
        performCreditsAndVoids: Bool = true,
        performFinancingActions: Bool = true,
        receiptCopyRecipients: [String] = ["None (No Emailed Receipts)"],
        editPricesAndTaxOnMobile: Bool = true,
        createCustomLineItems: Bool = false,
        viewJobPnL: Bool = false
    ) {
        self.accountType = accountType
        self.hasWebPortalAccess = hasWebPortalAccess
        self.reportingTabVisibility = reportingTabVisibility
        self.moreAppsAndSettingsVisibility = moreAppsAndSettingsVisibility
        self.appointmentVisibility = appointmentVisibility
        self.allCustomerVisibility = allCustomerVisibility
        self.scheduleEventsPermission = scheduleEventsPermission
        self.manuallyEnterCards = manuallyEnterCards
        self.manageRecurringPayments = manageRecurringPayments
        self.performCreditsAndVoids = performCreditsAndVoids
        self.performFinancingActions = performFinancingActions
        self.receiptCopyRecipients = receiptCopyRecipients
        self.editPricesAndTaxOnMobile = editPricesAndTaxOnMobile
        self.createCustomLineItems = createCustomLineItems
        self.viewJobPnL = viewJobPnL
    }
    
    public static func `default`(for accountType: AccountType) -> UserPermissions {
        switch accountType {
        case .field:
            return UserPermissions(
                accountType: .field,
                hasWebPortalAccess: false,
                reportingTabVisibility: false,
                moreAppsAndSettingsVisibility: false,
                appointmentVisibility: "All appointments",
                allCustomerVisibility: true,
                scheduleEventsPermission: "Cannot Schedule Any Events",
                manuallyEnterCards: true,
                manageRecurringPayments: false,
                performCreditsAndVoids: true,
                performFinancingActions: true,
                receiptCopyRecipients: ["None (No Emailed Receipts)"],
                editPricesAndTaxOnMobile: true,
                createCustomLineItems: false,
                viewJobPnL: false
            )
        case .office:
            return UserPermissions(
                accountType: .office,
                hasWebPortalAccess: true,
                reportingTabVisibility: true,
                moreAppsAndSettingsVisibility: false,
                appointmentVisibility: "All appointments",
                allCustomerVisibility: true,
                scheduleEventsPermission: "Can Schedule All Events",
                manuallyEnterCards: true,
                manageRecurringPayments: true,
                performCreditsAndVoids: true,
                performFinancingActions: true,
                receiptCopyRecipients: ["This User"],
                editPricesAndTaxOnMobile: true,
                createCustomLineItems: true,
                viewJobPnL: true
            )
        case .admin:
            return UserPermissions(
                accountType: .admin,
                hasWebPortalAccess: true,
                reportingTabVisibility: true,
                moreAppsAndSettingsVisibility: true,
                appointmentVisibility: "All appointments",
                allCustomerVisibility: true,
                scheduleEventsPermission: "Can Schedule All Events",
                manuallyEnterCards: true,
                manageRecurringPayments: true,
                performCreditsAndVoids: true,
                performFinancingActions: true,
                receiptCopyRecipients: ["This User"],
                editPricesAndTaxOnMobile: true,
                createCustomLineItems: true,
                viewJobPnL: true
            )
        }
    }
}
