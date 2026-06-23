import { create } from 'zustand';

export type DiceMode = 'action' | 'progress' | 'oracle' | 'yesno';

export interface ActionSetup {
  label: string;
  statOptions: { stat: string; value: number }[]; // selectable stats (from a move) — value is the stat score
  stat?: string;
  adds: number;
}

export interface ProgressSetup {
  label: string;
  trackId?: string;
  progressScore: number;
}

export interface OracleSetup {
  label: string;
  tableId?: string;
  // tens-die preference handled in panel
}

export interface YesNoSetup {
  label: string;
  odds: number; // threshold: yes if d100 <= odds
  oddsLabel: string;
}

interface DiceState {
  open: boolean;
  mode: DiceMode;
  action: ActionSetup;
  progress: ProgressSetup;
  oracle: OracleSetup;
  yesno: YesNoSetup;
  // generic roll request counter — bump to tell the panel to auto-roll
  autoRollToken: number;

  openPanel: () => void;
  closePanel: () => void;
  setupAction: (s: Partial<ActionSetup>, autoRoll?: boolean) => void;
  setupProgress: (s: ProgressSetup, autoRoll?: boolean) => void;
  setupOracle: (s: OracleSetup, autoRoll?: boolean) => void;
  setupYesNo: (s: YesNoSetup, autoRoll?: boolean) => void;
  setMode: (m: DiceMode) => void;
  setActionStat: (stat: string) => void;
  setActionAdds: (adds: number) => void;
}

export const ODDS: { label: string; value: number }[] = [
  { label: 'Almost Certain', value: 90 },
  { label: 'Likely', value: 75 },
  { label: '50/50', value: 50 },
  { label: 'Unlikely', value: 25 },
  { label: 'Small Chance', value: 10 },
];

export const useDice = create<DiceState>((set, get) => ({
  open: false,
  mode: 'action',
  action: { label: 'Quick Roll', statOptions: [], adds: 0 },
  progress: { label: 'Progress Roll', progressScore: 0 },
  oracle: { label: 'Oracle', },
  yesno: { label: 'Ask the Oracle', odds: 50, oddsLabel: '50/50' },
  autoRollToken: 0,

  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),
  setMode: (mode) => set({ mode }),
  setupAction: (s, autoRoll) =>
    set((st) => ({
      mode: 'action',
      open: true,
      action: {
        ...st.action,
        ...s,
        statOptions: s.statOptions ?? st.action.statOptions,
        stat: s.stat ?? s.statOptions?.[0]?.stat ?? st.action.stat,
        adds: s.adds ?? 0,
      },
      autoRollToken: autoRoll ? st.autoRollToken + 1 : st.autoRollToken,
    })),
  setupProgress: (s, autoRoll) =>
    set((st) => ({
      mode: 'progress',
      open: true,
      progress: s,
      autoRollToken: autoRoll ? st.autoRollToken + 1 : st.autoRollToken,
    })),
  setupOracle: (s, autoRoll) =>
    set((st) => ({
      mode: 'oracle',
      open: true,
      oracle: s,
      autoRollToken: autoRoll ? st.autoRollToken + 1 : st.autoRollToken,
    })),
  setupYesNo: (s, autoRoll) =>
    set((st) => ({
      mode: 'yesno',
      open: true,
      yesno: s,
      autoRollToken: autoRoll ? st.autoRollToken + 1 : st.autoRollToken,
    })),
  setActionStat: (stat) => {
    const opt = get().action.statOptions.find((o) => o.stat === stat);
    set((st) => ({ action: { ...st.action, stat, } }));
    void opt;
  },
  setActionAdds: (adds) => set((st) => ({ action: { ...st.action, adds } })),
}));
