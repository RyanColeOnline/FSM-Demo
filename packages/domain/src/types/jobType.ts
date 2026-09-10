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

/**
 * Returns the exact web hex color string for a given trip type or job type string.
 */
export function getTripTypeWebHex(raw: string | null | undefined): string {
  const tripType = extractTripType(raw);
  return CANONICAL_TRIP_COLORS[tripType]?.webHex || '#0088ff';
}
