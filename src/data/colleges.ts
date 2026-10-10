export const PRESET_COLLEGES = [
  'IIT Bombay',
  'IIT Delhi',
  'IIT Madras',
  'BITS Pilani',
  'NIT Trichy',
  'Delhi Technological Univ',
  'IIIT Hyderabad',
  'VIT Vellore',
  'NIT Surathkal',
  'IIT Kharagpur',
  'IIT Roorkee',
  'Jadavpur University',
  'Anna University',
  'SRM University',
  'Manipal Institute of Technology',
  'Thapar University',
  'PES University',
  'Other',
] as const;

export type PresetCollege = typeof PRESET_COLLEGES[number];
