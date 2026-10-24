export interface TeamDef {
  name: string;
  short: string;
  primary: number;
  secondary: number;
  keeper: number;
}

export const TEAMS: TeamDef[] = [
  { name: 'Emerald United', short: 'EMU', primary: 0x14a85a, secondary: 0xffffff, keeper: 0xffd23f },
  { name: 'Red Phoenix',    short: 'PHX', primary: 0xe03a3a, secondary: 0xffd23f, keeper: 0x7ee0ff },
  { name: 'Blue Sharks',    short: 'SHK', primary: 0x2f6df0, secondary: 0xffffff, keeper: 0xff9f43 },
  { name: 'Golden Tigers',  short: 'TGR', primary: 0xf2b705, secondary: 0x222222, keeper: 0xb06cff },
  { name: 'Shadow Wolves',  short: 'WLF', primary: 0x3a3f4b, secondary: 0xb8c0cc, keeper: 0xff5d8f },
  { name: 'White Falcons',  short: 'FLC', primary: 0xf1f3f6, secondary: 0x2f6df0, keeper: 0x2ecc71 },
  { name: 'Orange Rockets', short: 'RKT', primary: 0xff7a1a, secondary: 0x1b1b1b, keeper: 0x7ee0ff },
  { name: 'Purple Storm',   short: 'STM', primary: 0x8a3ffc, secondary: 0xffffff, keeper: 0xf2e94e },
];
