import { CanonicalChecklistTemplate } from '../types/checklist';

export const CANONICAL_MOCK_CHECKLIST_TEMPLATES: CanonicalChecklistTemplate[] = [
  {
    id: 'ct-hvac-startup',
    title: 'HVAC Startup & Commissioning',
    category: 'HVAC Startup & Commissioning',
    dispatchGroup: 'HVAC Techs',
    version: 1,
    steps: [
      {
        id: 's-1',
        title: 'Verify line voltage within ±10% rating',
        required: true,
        valueType: 'number',
        unit: 'V',
        isCompleted: false
      },
      {
        id: 's-2',
        title: 'Check blower motor amp draw vs FLA',
        required: true,
        valueType: 'number',
        unit: 'A',
        isCompleted: false
      },
      {
        id: 's-3',
        title: 'Inspect condensate drain & verify float switch operation',
        required: true,
        valueType: 'boolean',
        isCompleted: false
      },
      {
        id: 's-4',
        title: 'Measure static pressure across evaporator coil',
        required: true,
        valueType: 'number',
        unit: 'in. w.g.',
        isCompleted: false
      }
    ]
  },
  {
    id: 'ct-appliance-diag',
    title: 'Appliance Diagnostic Verification',
    category: 'Appliance Inspection',
    dispatchGroup: 'Appliance Techs',
    version: 1,
    steps: [
      {
        id: 'ad-1',
        title: 'Verify water supply pressure & inlet valve seals',
        required: true,
        valueType: 'boolean',
        isCompleted: false
      },
      {
        id: 'ad-2',
        title: 'Run test cycle & inspect drain pump discharge',
        required: true,
        valueType: 'boolean',
        isCompleted: false
      }
    ]
  }
];
