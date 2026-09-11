export interface ChecklistOption {
  id: string;
  text: string;
}

export type ChecklistInputType = 'Short Answer' | 'Pass/Fail' | 'Multiple Choice' | 'Text Area' | 'Photo Upload';

export interface ChecklistItemDefinition {
  id: string;
  label: string;
  inputType: ChecklistInputType;
  options?: ChecklistOption[];
  defaultValue?: string;
}

export interface ChecklistDefinition {
  id: string;
  name: string;
  itemCount: number;
  associatedJobTypes: string[];
  autoAdd?: boolean;
  showSignature?: boolean;
  requireSignature?: boolean;
  requireCompletion?: boolean;
  allowDataInput?: boolean;
  isArchived?: boolean;
  items: ChecklistItemDefinition[];
}

export interface JobChecklistInstance {
  id: string;
  definitionId?: string;
  name: string;
  itemsCompleted: string;
  status: 'Incomplete' | 'In Progress' | 'Completed';
  savedValues?: Record<string, string>; // itemId -> value
  checkedItems?: Record<string, boolean>; // itemId -> isChecked
  skippedItems?: Record<string, boolean>; // itemId -> isSkipped
  comments?: string;
  customerSignatureName?: string;
  customerSignature?: string;
  completedBy?: string;
  completedAt?: string;
}

export const defaultChecklistDefinitions: ChecklistDefinition[] = [
  {
    id: 'chk-gas-pm',
    name: 'Gas Systems PM Checklist',
    itemCount: 20,
    associatedJobTypes: ['Preventative Maintenance', 'HVAC service'],
    autoAdd: true,
    showSignature: true,
    requireSignature: false,
    requireCompletion: false,
    allowDataInput: true,
    items: [
      {
        id: 'g-1',
        label: 'Gas Type?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-nat', text: 'Natural Gas' },
          { id: 'opt-pro', text: 'Propane (LP)' },
          { id: 'opt-na', text: 'N/A' },
        ],
        defaultValue: 'Natural Gas',
      },
      {
        id: 'g-2',
        label: 'BTU?',
        inputType: 'Short Answer',
        defaultValue: '80,000 BTU',
      },
      {
        id: 'g-3',
        label: 'Ignition type?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-ds', text: 'Direct Spark' },
          { id: 'opt-hsi', text: 'Hot Surface Igniter (HSI)' },
          { id: 'opt-sp', text: 'Standing Pilot' },
          { id: 'opt-ip', text: 'Intermittent Pilot' },
        ],
        defaultValue: 'Hot Surface Igniter (HSI)',
      },
      {
        id: 'g-4',
        label: 'Burners cond.?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-cg', text: 'Clean & Good' },
          { id: 'opt-nc', text: 'Needs Cleaning' },
          { id: 'opt-ru', text: 'Rusted / Pitted' },
          { id: 'opt-rep', text: 'Replaced' },
        ],
        defaultValue: 'Clean & Good',
      },
      {
        id: 'g-5',
        label: 'Roll out switches hooked up?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-y', text: 'Yes' },
          { id: 'opt-n', text: 'No' },
          { id: 'opt-na', text: 'N/A' },
        ],
        defaultValue: 'Yes',
      },
      {
        id: 'g-6',
        label: 'Burner chamber clean?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-y', text: 'Yes' },
          { id: 'opt-n', text: 'No' },
          { id: 'opt-nc', text: 'Cleaned during service' },
        ],
        defaultValue: 'Yes',
      },
      {
        id: 'g-7',
        label: 'Rusted?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-none', text: 'None' },
          { id: 'opt-slight', text: 'Slight surface rust' },
          { id: 'opt-heavy', text: 'Heavy / Action required' },
        ],
        defaultValue: 'None',
      },
      {
        id: 'g-8',
        label: 'Door switch works?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-y', text: 'Yes' },
          { id: 'opt-n', text: 'No' },
          { id: 'opt-byp', text: 'Bypassed' },
        ],
        defaultValue: 'Yes',
      },
      {
        id: 'g-9',
        label: 'Pressure switches working?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-y', text: 'Yes' },
          { id: 'opt-n', text: 'No' },
          { id: 'opt-rep', text: 'Replaced' },
        ],
        defaultValue: 'Yes',
      },
      {
        id: 'g-10',
        label: 'Pressure switch tube clear?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-y', text: 'Yes' },
          { id: 'opt-n', text: 'No' },
          { id: 'opt-clr', text: 'Cleared' },
        ],
        defaultValue: 'Yes',
      },
      {
        id: 'g-11',
        label: 'Draft motor comes on/off?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-y', text: 'Yes' },
          { id: 'opt-n', text: 'No' },
          { id: 'opt-noi', text: 'Noisy / Bearings wearing' },
        ],
        defaultValue: 'Yes',
      },
      {
        id: 'g-12',
        label: 'Flue pipe hooked up correct?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-y', text: 'Yes' },
          { id: 'opt-n', text: 'No' },
          { id: 'opt-adj', text: 'Adjusted on-site' },
        ],
        defaultValue: 'Yes',
      },
      {
        id: 'g-13',
        label: 'Pipe?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-sec', text: 'Secure & Clear' },
          { id: 'opt-loose', text: 'Loose joints' },
          { id: 'opt-na', text: 'N/A' },
        ],
        defaultValue: 'Secure & Clear',
      },
      {
        id: 'g-14',
        label: 'Carbon monoxide detector?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-pres', text: 'Present & Operational' },
          { id: 'opt-rec', text: 'Missing - Recommended to homeowner' },
          { id: 'opt-exp', text: 'Expired' },
        ],
        defaultValue: 'Present & Operational',
      },
      {
        id: 'g-15',
        label: 'Condenser Serial #',
        inputType: 'Short Answer',
        defaultValue: '1920E12345',
      },
      {
        id: 'g-16',
        label: 'Furnace Model #',
        inputType: 'Short Answer',
        defaultValue: '59TP6B080V1716',
      },
      {
        id: 'g-17',
        label: 'Furnace Serial #',
        inputType: 'Short Answer',
        defaultValue: '3419A98214',
      },
      {
        id: 'g-18',
        label: 'If last P.M. did you advise homeowner to renew?',
        inputType: 'Short Answer',
        defaultValue: 'Yes, homeowner enrolled in Annual PM agreement.',
      },
      {
        id: 'g-19',
        label: 'Did you make sure all equipment is stickered?',
        inputType: 'Short Answer',
        defaultValue: 'Yes, Apex maintenance tag applied to indoor and outdoor units.',
      },
      {
        id: 'g-20',
        label: 'Flame Sensor Current (µA)',
        inputType: 'Short Answer',
        defaultValue: '4.2 µA (Healthy)',
      },
    ],
  },
  {
    id: 'chk-hp-pm',
    name: 'Heat Pump / Straight Cool Sytems PM Checklist',
    itemCount: 28,
    associatedJobTypes: ['Preventative Maintenance'],
    autoAdd: true,
    showSignature: true,
    requireSignature: false,
    requireCompletion: false,
    allowDataInput: true,
    items: [
      {
        id: 'hp-1',
        label: 'System Type?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-hp', text: 'Heat Pump' },
          { id: 'opt-sc', text: 'Straight Cool' },
          { id: 'opt-df', text: 'Dual Fuel' },
        ],
      },
      { id: 'hp-2', label: 'Tonnage / Capacity?', inputType: 'Short Answer' },
      {
        id: 'hp-3',
        label: 'Refrigerant Type?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-410', text: 'R-410A' },
          { id: 'opt-22', text: 'R-22' },
          { id: 'opt-454', text: 'R-454B' },
          { id: 'opt-32', text: 'R-32' },
        ],
      },
      { id: 'hp-4', label: 'Suction Pressure (PSI)', inputType: 'Short Answer' },
      { id: 'hp-5', label: 'Liquid Pressure (PSI)', inputType: 'Short Answer' },
      { id: 'hp-6', label: 'Subcooling (°F)', inputType: 'Short Answer' },
      { id: 'hp-7', label: 'Superheat (°F)', inputType: 'Short Answer' },
      {
        id: 'hp-8',
        label: 'Outdoor Coil Condition?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-c', text: 'Clean' },
          { id: 'opt-w', text: 'Washed / Degreased' },
          { id: 'opt-d', text: 'Dirty' },
        ],
      },
      {
        id: 'hp-9',
        label: 'Indoor Coil Condition?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-ic', text: 'Clean & Good' },
          { id: 'opt-id', text: 'Inspected' },
          { id: 'opt-nc', text: 'Needs Cleaning' },
        ],
      },
      { id: 'hp-10', label: 'Compressor Amps (Running)', inputType: 'Short Answer' },
      { id: 'hp-11', label: 'Outdoor Fan Motor Amps', inputType: 'Short Answer' },
      { id: 'hp-12', label: 'Blower Motor Amps', inputType: 'Short Answer' },
      {
        id: 'hp-13',
        label: 'Capacitor MFD Test?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-cap-ok', text: 'Within Tolerance (±5%)' },
          { id: 'opt-cap-wk', text: 'Weak / Degraded' },
          { id: 'opt-cap-rep', text: 'Replaced on-site' },
        ],
      },
      {
        id: 'hp-14',
        label: 'Contactor Points Condition?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-con-g', text: 'Good / Clean' },
          { id: 'opt-con-p', text: 'Pitted / Burned' },
          { id: 'opt-con-r', text: 'Replaced' },
        ],
      },
      {
        id: 'hp-15',
        label: 'Thermostat Operation & Calibration?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-t-p', text: 'Passed / Verified' },
          { id: 'opt-t-f', text: 'Failed / Needs Replacement' },
          { id: 'opt-t-c', text: 'Calibrated' },
        ],
      },
      {
        id: 'hp-16',
        label: 'Condensate Drain Line Clear?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-cd-c', text: 'Flowing Clear' },
          { id: 'opt-cd-f', text: 'Flushed & Chemically Treated' },
          { id: 'opt-cd-b', text: 'Clogged / Cleared' },
        ],
      },
      {
        id: 'hp-17',
        label: 'Float Switch Safety Cutoff Test?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-fl-p', text: 'Passed (Cuts power immediately)' },
          { id: 'opt-fl-f', text: 'Failed' },
          { id: 'opt-fl-n', text: 'None Installed' },
        ],
      },
      {
        id: 'hp-18',
        label: 'Air Filter Condition?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-af-c', text: 'Clean' },
          { id: 'opt-af-r', text: 'Replaced with New Filter' },
          { id: 'opt-af-cp', text: 'Customer to replace' },
        ],
      },
      { id: 'hp-19', label: 'Supply Air Temp (°F)', inputType: 'Short Answer' },
      { id: 'hp-20', label: 'Return Air Temp (°F)', inputType: 'Short Answer' },
      { id: 'hp-21', label: 'Temperature Split (Delta T)', inputType: 'Short Answer' },
      { id: 'hp-22', label: 'Condenser Model #', inputType: 'Short Answer' },
      { id: 'hp-23', label: 'Condenser Serial #', inputType: 'Short Answer' },
      { id: 'hp-24', label: 'Air Handler Model #', inputType: 'Short Answer' },
      { id: 'hp-25', label: 'Air Handler Serial #', inputType: 'Short Answer' },
      { id: 'hp-26', label: 'Defrost Cycle Test (Heat Pump)', inputType: 'Short Answer' },
      { id: 'hp-27', label: 'Reversing Valve Operation', inputType: 'Short Answer' },
      {
        id: 'hp-28',
        label: 'Did you make sure all equipment is stickered?',
        inputType: 'Multiple Choice',
        options: [
          { id: 'opt-st-y', text: 'Yes' },
          { id: 'opt-st-n', text: 'No' },
        ],
      },
    ],
  },
];
