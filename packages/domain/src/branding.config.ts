/**
 * Single-Source White-Label Branding Configuration for Apex Field Solutions.
 * Centralizes company identity, contact emails, legal entities, portal titles, and assets.
 */

export interface BrandAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface BrandConfiguration {
  company: {
    name: string;
    shortName: string;
    legalName: string;
    tagline: string;
    supportEmail: string;
    billingEmail: string;
    phone: string;
    website: string;
    address: BrandAddress;
  };
  portal: {
    title: string;
    description: string;
    copyrightText: string;
  };
  mobile: {
    appName: string;
    bundleId: string;
    schemeName: string;
  };
  assets: {
    logoDark: string;
    logoLight: string;
    favicon: string;
    appIconName: string;
  };
  theme: {
    primaryColorHex: string;
    accentColorHex: string;
  };
}

export const BRAND_CONFIG: BrandConfiguration = {
  company: {
    name: "Apex Field Solutions",
    shortName: "Apex",
    legalName: "Apex Field Solutions LLC",
    tagline: "Intelligent Field Service Management & Dispatch",
    supportEmail: "support@apexfieldsolutions.com",
    billingEmail: "billing@apexfieldsolutions.com",
    phone: "(800) 555-2739",
    website: "https://apexfieldsolutions.com",
    address: {
      street: "100 Innovation Parkway, Suite 400",
      city: "Fort Walton Beach",
      state: "FL",
      zip: "32547",
    },
  },
  portal: {
    title: "Apex Field Solutions - Core FSM Platform",
    description: "Enterprise Dispatch, Invoicing, Equipment & Mobile Work Order Management",
    copyrightText: `Apex Field Solutions LLC © ${new Date().getFullYear()} • Field Service Management Platform`,
  },
  mobile: {
    appName: "Apex FSM",
    bundleId: "com.fsm.demo",
    schemeName: "Apex FSM",
  },
  assets: {
    logoDark: "/login-logo-dark.png",
    logoLight: "/login-logo-light.png",
    favicon: "/favicon.ico",
    appIconName: "AppIcon",
  },
  theme: {
    primaryColorHex: "#0F172A", // Slate 900
    accentColorHex: "#2563EB",  // Blue 600
  },
};
