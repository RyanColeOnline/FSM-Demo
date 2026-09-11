/**
 * Canonical Job Type, Category, and Trip Type Domain Models for Murphy's FSM Platform.
 * Matches 1:1 with the Murphy's Job Types Matrix.
 */

export type CanonicalJobCategory = 'Appliance' | 'HVAC';

export type CanonicalJobType =
  | 'Residential (R)'
  | 'Commercial (C)'
  | 'Home Warranty (HW)'
  | 'Resort (RES)'
  | 'COD';

export type CanonicalTripType =
  | 'Diagnostic'
  | 'Install'
  | 'Parts'
  | 'PM'
  | 'Recall'
  | 'AHS'
  | 'FI'
  | 'O.R.';

export interface CanonicalTripColor {
  tripType: CanonicalTripType;
  webHex: string;
  iosSemanticName: string; // SwiftUI Color name: "blue" | "indigo" | "purple" | "green" | "red" | "orange"
}

export const CANONICAL_TRIP_COLORS: Record<CanonicalTripType, CanonicalTripColor> = {
  'Diagnostic': { tripType: 'Diagnostic', webHex: '#0088ff', iosSemanticName: 'blue' },
  'Install':    { tripType: 'Install',    webHex: '#6255f5', iosSemanticName: 'indigo' },
  'Parts':      { tripType: 'Parts',      webHex: '#cb30e0', iosSemanticName: 'purple' },
  'PM':         { tripType: 'PM',         webHex: '#34c759', iosSemanticName: 'green' },
  'Recall':     { tripType: 'Recall',     webHex: '#FF3B30', iosSemanticName: 'red' },
  'AHS':        { tripType: 'AHS',        webHex: '#ff9500', iosSemanticName: 'orange' },
  'FI':         { tripType: 'FI',         webHex: '#ff9500', iosSemanticName: 'orange' },
  'O.R.':       { tripType: 'O.R.',       webHex: '#ff9500', iosSemanticName: 'orange' },
};

/**
 * Matrix entry representing a valid Dispatch Group + Job Category + Job Type + Trip Type combination.
 */
export interface CanonicalMatrixEntry {
  dispatchGroup: 'Appliance Techs' | 'HVAC Techs' | 'Installers';
  category: CanonicalJobCategory;
  jobType: CanonicalJobType;
  tripType: CanonicalTripType;
  webHex: string;
  iosSemanticName: string;
}

export const CANONICAL_JOB_MATRIX: CanonicalMatrixEntry[] = [
  // Appliance Techs
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Residential (R)',   tripType: 'Diagnostic', webHex: '#0088ff', iosSemanticName: 'blue' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Commercial (C)',    tripType: 'Diagnostic', webHex: '#0088ff', iosSemanticName: 'blue' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Home Warranty (HW)',tripType: 'Diagnostic', webHex: '#0088ff', iosSemanticName: 'blue' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Residential (R)',   tripType: 'Install',    webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Commercial (C)',    tripType: 'Install',    webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Home Warranty (HW)',tripType: 'Install',    webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Residential (R)',   tripType: 'Parts',      webHex: '#cb30e0', iosSemanticName: 'purple' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Commercial (C)',    tripType: 'Parts',      webHex: '#cb30e0', iosSemanticName: 'purple' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Home Warranty (HW)',tripType: 'Parts',      webHex: '#cb30e0', iosSemanticName: 'purple' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Residential (R)',   tripType: 'PM',         webHex: '#34c759', iosSemanticName: 'green' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Commercial (C)',    tripType: 'PM',         webHex: '#34c759', iosSemanticName: 'green' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Home Warranty (HW)',tripType: 'PM',         webHex: '#34c759', iosSemanticName: 'green' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Residential (R)',   tripType: 'Recall',     webHex: '#FF3B30', iosSemanticName: 'red' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Commercial (C)',    tripType: 'Recall',     webHex: '#FF3B30', iosSemanticName: 'red' },
  { dispatchGroup: 'Appliance Techs', category: 'Appliance', jobType: 'Home Warranty (HW)',tripType: 'Recall',     webHex: '#FF3B30', iosSemanticName: 'red' },

  // HVAC Techs
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'AHS',        webHex: '#ff9500', iosSemanticName: 'orange' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'Diagnostic', webHex: '#0088ff', iosSemanticName: 'blue' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Commercial (C)',    tripType: 'Diagnostic', webHex: '#0088ff', iosSemanticName: 'blue' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Resort (RES)',       tripType: 'Diagnostic', webHex: '#0088ff', iosSemanticName: 'blue' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'COD',                tripType: 'Diagnostic', webHex: '#0088ff', iosSemanticName: 'blue' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'FI',         webHex: '#ff9500', iosSemanticName: 'orange' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'Install',    webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Commercial (C)',    tripType: 'Install',    webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Resort (RES)',       tripType: 'Install',    webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'COD',                tripType: 'Install',    webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'O.R.',       webHex: '#ff9500', iosSemanticName: 'orange' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'Parts',      webHex: '#cb30e0', iosSemanticName: 'purple' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Commercial (C)',    tripType: 'Parts',      webHex: '#cb30e0', iosSemanticName: 'purple' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Resort (RES)',       tripType: 'Parts',      webHex: '#cb30e0', iosSemanticName: 'purple' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'COD',                tripType: 'Parts',      webHex: '#cb30e0', iosSemanticName: 'purple' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'PM',         webHex: '#34c759', iosSemanticName: 'green' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Commercial (C)',    tripType: 'PM',         webHex: '#34c759', iosSemanticName: 'green' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Resort (RES)',       tripType: 'PM',         webHex: '#34c759', iosSemanticName: 'green' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'COD',                tripType: 'PM',         webHex: '#34c759', iosSemanticName: 'green' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Home Warranty (HW)', tripType: 'Recall',     webHex: '#FF3B30', iosSemanticName: 'red' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Commercial (C)',    tripType: 'Recall',     webHex: '#FF3B30', iosSemanticName: 'red' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'Resort (RES)',       tripType: 'Recall',     webHex: '#FF3B30', iosSemanticName: 'red' },
  { dispatchGroup: 'HVAC Techs', category: 'HVAC', jobType: 'COD',                tripType: 'Recall',     webHex: '#FF3B30', iosSemanticName: 'red' },

  // Installers
  { dispatchGroup: 'Installers', category: 'HVAC',      jobType: 'Home Warranty (HW)', tripType: 'Install', webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'Installers', category: 'HVAC',      jobType: 'Commercial (C)',    tripType: 'Install', webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'Installers', category: 'HVAC',      jobType: 'Resort (RES)',       tripType: 'Install', webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'Installers', category: 'HVAC',      jobType: 'COD',                tripType: 'Install', webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'Installers', category: 'Appliance', jobType: 'Residential (R)',   tripType: 'Install', webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'Installers', category: 'Appliance', jobType: 'Commercial (C)',    tripType: 'Install', webHex: '#6255f5', iosSemanticName: 'indigo' },
  { dispatchGroup: 'Installers', category: 'Appliance', jobType: 'Home Warranty (HW)',tripType: 'Install', webHex: '#6255f5', iosSemanticName: 'indigo' },
];

/**
 * Extracts the canonical trip type from any string format (e.g. "Residential - Diagnostic", "Diagnostic", "HVAC - Install").
 */
export function extractTripType(raw: string | null | undefined): CanonicalTripType {
  if (!raw) return 'Diagnostic';
  const clean = raw.trim();
  const lower = clean.toLowerCase();

  if (lower.includes('diag')) return 'Diagnostic';
  if (lower.includes('install')) return 'Install';
  if (lower.includes('part')) return 'Parts';
  if (lower.includes('recall')) return 'Recall';
  if (lower.includes('pm') || lower.includes('preventative') || lower.includes('preventive') || lower.includes('maint') || lower.includes('tune')) return 'PM';
  if (lower.includes('ahs')) return 'AHS';
  if (lower.includes('fi')) return 'FI';
  if (lower.includes('o.r.') || lower.includes('or')) return 'O.R.';

  return 'Diagnostic';
}

export const VIBRANT_JOB_TYPE_PALETTE: Record<string, string> = {
  'hvac repair': '#0284c7',             // Vivid Sky Blue
  'commercial appliance': '#d97706',      // Warm Amber Gold
  'preventative maintenance': '#16a34a', // Emerald / Green
  'preventive maintenance': '#16a34a',
  'pm': '#16a34a',
  'maintenance': '#16a34a',
  'appliance repair': '#7c3aed',         // Royal Purple / Violet
  'commercial hvac': '#059669',          // Deep Teal Green
  'commercial refrigeration': '#059669',
  'equipment replacement': '#e11d48',    // Vibrant Rose Red
  'hvac installation': '#4f46e5',        // Deep Indigo
  'installation': '#4f46e5',
  'install': '#4f46e5',
  'diagnostic': '#2563eb',               // Cobalt Blue
  'diagnostic & repair': '#0891b2',      // Ocean Cyan
  'recall': '#dc2626',                   // Red
  'parts': '#c026d3',                    // Magenta Fuchsia
  'home warranty': '#ea580c',            // Tangerine Orange
  'warranty': '#ea580c',
  'ahs': '#ea580c',
  'residential repair': '#0284c7',       // Sky Blue
  'residential': '#0284c7',
  'commercial': '#059669',
  'cod': '#6366f1',                      // Soft Indigo
};

export const VIBRANT_COLOR_POOL = [
  '#0284c7', // Sky Blue
  '#7c3aed', // Purple
  '#059669', // Emerald
  '#d97706', // Amber
  '#4f46e5', // Indigo
  '#e11d48', // Rose Red
  '#0891b2', // Cyan
  '#16a34a', // Green
  '#c026d3', // Fuchsia
  '#ea580c', // Orange
  '#2563eb', // Royal Blue
  '#0d9488', // Teal
  '#9333ea', // Violet
  '#dc2626', // Crimson
];

/**
 * Returns the exact web hex color string for a given trip type or job type string.
 * Diversifies job types across a distinct vibrant palette.
 */
export function getTripTypeWebHex(raw: string | null | undefined): string {
  if (!raw) return VIBRANT_COLOR_POOL[0];
  const clean = raw.trim().toLowerCase();

  // 1. Direct match in dictionary
  if (VIBRANT_JOB_TYPE_PALETTE[clean]) {
    return VIBRANT_JOB_TYPE_PALETTE[clean];
  }

  // 2. Keyword substring match
  for (const [key, color] of Object.entries(VIBRANT_JOB_TYPE_PALETTE)) {
    if (clean.includes(key)) {
      return color;
    }
  }

  // 3. Deterministic hash fallback to ensure unique, reproducible color per job type
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % VIBRANT_COLOR_POOL.length;
  return VIBRANT_COLOR_POOL[index];
}
