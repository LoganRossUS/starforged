import { useEffect, useRef, useState, useCallback } from 'react';
import DiceBox, { type DiceResult } from '@3d-dice/dice-box';
import { useDice, ODDS, type DiceMode, type ActionSetup } from './diceStore';
import { useStore } from '@/store/store';
import { resolveAction, clamp, uid } from '@/store/logic';
import { findOracleTable, type OracleTable, type OracleRow } from '@/content';
import type { RollLogEntry } from '@/store/types';

const RED = '#e23b2e';
const CYAN = '#3fa9d6';

interface ActionResult {
  d6: number;
  c1: number;
  c2: number;
  statValue: number;
  adds: number;
  canceled: boolean;
  score: number;
  outcome: 'strong' | 'weak' | 'miss';
  match: boolean;
  burned: boolean;
}
interface ProgressResult {
  c1: number;
  c2: number;
  score: number;
  outcome: 'strong' | 'weak' | 'miss';
  match: boolean;
}
interface OracleResult {
  d100: number;
  tensFirst: boolean;
  table?: OracleTable;
  row?: OracleRow;
  text: string;
}
interface YesNoResult {
  d100: number;
  yes: boolean;
  match: boolean;
  oddsLabel: string;
}

function percentile(a: number, b: number, tensFirst: boolean): number {
  const tens = (tensFirst ? a : b) % 10; // 10 -> 0
  const ones = (tensFirst ? b : a) % 10;
  const total = tens * 10 + ones;
  return total === 0 ? 100 : total;
}

function rowFor(table: OracleTable, n: number): OracleRow | undefined {
  return table.rows.find((r) => r.min !== null && r.max !== null && n >= r.min && n <= r.max);
}

export function DicePanel() {
  const dice = useDice();
  const {
    open,
    mode,
    action,
    progress,
    oracle,
    yesno,
    autoRollToken,
    closePanel,
    openPanel,
    setMode,
    setActionStat,
    setActionAdds,
  } = dice;

  const character = useStore((s) => s.campaign.character);
  const burnMomentum = useStore((s) => s.burnMomentum);
  const addLog = useStore((s) => s.addLog);

  const boxRef = useRef<DiceBox | null>(null);
  const [ready, setReady] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [tensFirst, setTensFirst] = useState(true);

  const [actionRes, setActionRes] = useState<ActionResult | null>(null);
  const [progressRes, setProgressRes] = useState<ProgressResult | null>(null);
  const [oracleRes, setOracleRes] = useState<OracleResult | null>(null);
  const [yesnoRes, setYesnoRes] = useState<YesNoResult | null>(null);

  // Initialize dice-box once the panel first opens.
  useEffect(() => {
    if (!open || boxRef.current) return;
    let cancelled = false;
    const box = new DiceBox({
      container: '#dice-canvas',
      assetPath: `${import.meta.env.BASE_URL}assets/dice-box/`,
      theme: 'default',
      scale: 7,
      gravity: 2,
      enableShadows: true,
      shadowTransparency: 0.6,
    });
    box
      .init()
      .then(() => {
        if (cancelled) return;
        boxRef.current = box;
        setReady(true);
      })
      .catch((e) => console.error('dice-box init failed', e));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const clearResults = () => {
    setActionRes(null);
    setProgressRes(null);
    setOracleRes(null);
    setYesnoRes(null);
  };

  const log = (entry: Omit<RollLogEntry, 'id' | 'timestamp'>) =>
    addLog({ ...entry, id: uid('roll'), timestamp: new Date().toISOString() });

  const splitDice = (results: DiceResult[]) => {
    const d6 = results.filter((r) => r.sides === 6).map((r) => r.value);
    const d10 = results.filter((r) => r.sides === 10).map((r) => r.value);
    return { d6, d10 };
  };

  const rollAction = useCallback(async () => {
    if (!boxRef.current || rolling) return;
    clearResults();
    setRolling(true);
    try {
      const results = await boxRef.current.roll([
        { qty: 1, sides: 6, themeColor: RED },
        { qty: 2, sides: 10, themeColor: CYAN },
      ]);
      const { d6, d10 } = splitDice(results);
      const die = d6[0] ?? 1;
      const [c1, c2] = [d10[0] ?? 1, d10[1] ?? 1];
      const opt = action.statOptions.find((o) => o.stat === action.stat);
      const statValue = opt?.value ?? 0;
      const mom = character.momentum.value;
      const canceled = mom < 0 && die === -mom;
      const score = clamp((canceled ? 0 : die) + statValue + action.adds, 0, 10);
      const r = resolveAction(score, c1, c2);
      const res: ActionResult = {
        d6: die,
        c1,
        c2,
        statValue,
        adds: action.adds,
        canceled,
        score,
        outcome: r.outcome,
        match: r.match,
        burned: false,
      };
      setActionRes(res);
      log({
        type: 'action',
        label: action.label,
        stat: action.stat,
        adds: action.adds,
        actionDie: die,
        challengeDice: [c1, c2],
        score,
        canceledByMomentum: canceled,
        outcome: r.outcome,
        match: r.match,
      });
    } finally {
      setRolling(false);
    }
  }, [action, character.momentum.value, rolling]);

  const doBurn = () => {
    if (!actionRes) return;
    const mom = character.momentum.value;
    const score = clamp(mom, 0, 10);
    const r = resolveAction(score, actionRes.c1, actionRes.c2);
    const res: ActionResult = { ...actionRes, score, outcome: r.outcome, match: r.match, burned: true };
    setActionRes(res);
    log({
      type: 'action',
      label: `${action.label} (burned momentum)`,
      stat: action.stat,
      score,
      challengeDice: [actionRes.c1, actionRes.c2],
      burnedMomentum: true,
      outcome: r.outcome,
      match: r.match,
    });
    burnMomentum();
  };

  const rollProgress = useCallback(async () => {
    if (!boxRef.current || rolling) return;
    clearResults();
    setRolling(true);
    try {
      const results = await boxRef.current.roll([{ qty: 2, sides: 10, themeColor: CYAN }]);
      const { d10 } = splitDice(results);
      const [c1, c2] = [d10[0] ?? 1, d10[1] ?? 1];
      const r = resolveAction(progress.progressScore, c1, c2);
      setProgressRes({ c1, c2, score: progress.progressScore, outcome: r.outcome, match: r.match });
      log({
        type: 'progress',
        label: progress.label,
        progressScore: progress.progressScore,
        challengeDice: [c1, c2],
        outcome: r.outcome,
        match: r.match,
      });
    } finally {
      setRolling(false);
    }
  }, [progress, rolling]);

  const rollOracle = useCallback(async () => {
    if (!boxRef.current || rolling) return;
    clearResults();
    setRolling(true);
    try {
      const results = await boxRef.current.roll([
        { qty: 1, sides: 10, themeColor: RED },
        { qty: 1, sides: 10, themeColor: CYAN },
      ]);
      const { d10 } = splitDice(results);
      const [a, b] = [d10[0] ?? 1, d10[1] ?? 1];
      const n = percentile(a, b, tensFirst);
      const table = oracle.tableId ? findOracleTable(oracle.tableId) : undefined;
      const row = table ? rowFor(table, n) : undefined;
      const text = row?.text ?? `${n}`;
      setOracleRes({ d100: n, tensFirst, table, row, text });
      log({ type: 'oracle', label: oracle.label, d100: n, oracleResult: text });
    } finally {
      setRolling(false);
    }
  }, [oracle, tensFirst, rolling]);

  const rollYesNo = useCallback(async () => {
    if (!boxRef.current || rolling) return;
    clearResults();
    setRolling(true);
    try {
      const results = await boxRef.current.roll([
        { qty: 1, sides: 10, themeColor: RED },
        { qty: 1, sides: 10, themeColor: CYAN },
      ]);
      const { d10 } = splitDice(results);
      const [a, b] = [d10[0] ?? 1, d10[1] ?? 1];
      const n = percentile(a, b, true);
      const yes = n <= yesno.odds;
      const match = a % 10 === b % 10;
      setYesnoRes({ d100: n, yes, match, oddsLabel: yesno.oddsLabel });
      log({
        type: 'yesno',
        label: `${yesno.label}: ${yesno.oddsLabel}`,
        d100: n,
        oracleResult: `${yes ? 'Yes' : 'No'}${match ? ' (match — extreme/twist)' : ''}`,
        match,
      });
    } finally {
      setRolling(false);
    }
  }, [yesno, rolling]);

  const rollCurrent = useCallback(() => {
    if (mode === 'action') return rollAction();
    if (mode === 'progress') return rollProgress();
    if (mode === 'oracle') return rollOracle();
    return rollYesNo();
  }, [mode, rollAction, rollProgress, rollOracle, rollYesNo]);

  // Auto-roll when a feature requests it.
  const lastToken = useRef(autoRollToken);
  useEffect(() => {
    if (autoRollToken !== lastToken.current && ready) {
      lastToken.current = autoRollToken;
      void rollCurrent();
    } else {
      lastToken.current = autoRollToken;
    }
  }, [autoRollToken, ready, rollCurrent]);

  if (!open) {
    return (
      <button className="dice-fab" onClick={openPanel} title="Open dice roller">
        <DiceFabIcon />
      </button>
    );
  }

  const canBurn =
    mode === 'action' &&
    actionRes &&
    !actionRes.burned &&
    character.momentum.value > actionRes.score &&
    character.momentum.value > 0;

  return (
    <div className="dice-drawer">
      <div className="dice-head">
        <strong>DICE</strong>
        <div className="dice-modes">
          {(['action', 'progress', 'oracle', 'yesno'] as DiceMode[]).map((m) => (
            <button
              key={m}
              className={`chip-toggle ${mode === m ? 'on' : ''}`}
              onClick={() => {
                setMode(m);
                clearResults();
              }}
            >
              {m === 'yesno' ? 'Ask' : m}
            </button>
          ))}
        </div>
        <button className="icon-btn" onClick={closePanel}>
          ✕
        </button>
      </div>

      <div id="dice-canvas" className="dice-canvas">
        {!ready && <div className="dice-loading">Loading dice…</div>}
      </div>

      <div className="dice-controls">
        {mode === 'action' && (
          <ActionControls
            action={action}
            momentum={character.momentum.value}
            onStat={setActionStat}
            onAdds={setActionAdds}
          />
        )}
        {mode === 'progress' && (
          <div className="muted">
            {progress.label} — progress score <strong className="accent-cyan">{progress.progressScore}</strong>
          </div>
        )}
        {mode === 'oracle' && (
          <OracleControls
            label={oracle.label}
            tensFirst={tensFirst}
            onToggleTens={() => setTensFirst((v) => !v)}
          />
        )}
        {mode === 'yesno' && <YesNoControls />}

        <button className="btn primary roll-btn" onClick={() => void rollCurrent()} disabled={!ready || rolling}>
          {rolling ? 'Rolling…' : 'Roll'}
        </button>

        {mode === 'action' && actionRes && (
          <ActionReadout res={actionRes} canBurn={!!canBurn} onBurn={doBurn} />
        )}
        {mode === 'progress' && progressRes && <ProgressReadout res={progressRes} />}
        {mode === 'oracle' && oracleRes && <OracleReadout res={oracleRes} />}
        {mode === 'yesno' && yesnoRes && <YesNoReadout res={yesnoRes} />}
      </div>
    </div>
  );
}

function ActionControls({
  action,
  momentum,
  onStat,
  onAdds,
}: {
  action: ActionSetup;
  momentum: number;
  onStat: (s: string) => void;
  onAdds: (n: number) => void;
}) {
  const opts =
    action.statOptions.length > 0
      ? action.statOptions
      : (['edge', 'heart', 'iron', 'shadow', 'wits'] as string[]).map((s) => ({ stat: s, value: 0 }));
  return (
    <div className="col gap-sm">
      <div className="dim" style={{ fontSize: 13 }}>{action.label}</div>
      <div className="row wrap gap-sm">
        {opts.map((o) => (
          <button
            key={o.stat}
            className={`chip-toggle ${action.stat === o.stat ? 'on' : ''}`}
            onClick={() => onStat(o.stat)}
          >
            {o.stat} {o.value ? `+${o.value}` : ''}
          </button>
        ))}
      </div>
      <div className="row center gap-sm">
        <span className="field-label">Adds</span>
        <button className="meter-btn" onClick={() => onAdds(Math.max(0, action.adds - 1))}>−</button>
        <span className="mono">{action.adds}</span>
        <button className="meter-btn" onClick={() => onAdds(action.adds + 1)}>+</button>
        <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>
          momentum {momentum > 0 ? `+${momentum}` : momentum}
        </span>
      </div>
    </div>
  );
}

function OracleControls({
  label,
  tensFirst,
  onToggleTens,
}: {
  label: string;
  tensFirst: boolean;
  onToggleTens: () => void;
}) {
  return (
    <div className="col gap-sm">
      <div className="dim" style={{ fontSize: 13 }}>{label}</div>
      <button className="chip-toggle on" onClick={onToggleTens}>
        Tens die: {tensFirst ? 'RED' : 'CYAN'} (tap to swap)
      </button>
    </div>
  );
}

function YesNoControls() {
  const yesno = useDice((s) => s.yesno);
  const setupYesNo = useDice((s) => s.setupYesNo);
  return (
    <div className="col gap-sm">
      <div className="dim" style={{ fontSize: 13 }}>Ask the Oracle — odds</div>
      <div className="row wrap gap-sm">
        {ODDS.map((o) => (
          <button
            key={o.label}
            className={`chip-toggle ${yesno.oddsLabel === o.label ? 'on' : ''}`}
            onClick={() => setupYesNo({ label: 'Ask the Oracle', odds: o.value, oddsLabel: o.label })}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome, match }: { outcome: 'strong' | 'weak' | 'miss'; match: boolean }) {
  const text =
    outcome === 'strong' ? 'Strong Hit' : outcome === 'weak' ? 'Weak Hit' : 'Miss';
  return (
    <div className={`outcome-badge ${outcome}`}>
      {text}
      {match && <span className="match-flag">★ MATCH</span>}
    </div>
  );
}

function ActionReadout({
  res,
  canBurn,
  onBurn,
}: {
  res: ActionResult;
  canBurn: boolean;
  onBurn: () => void;
}) {
  return (
    <div className="readout">
      <div className="dice-faces">
        <span className={`face d6 ${res.canceled ? 'canceled' : ''}`} title="Action die">
          {res.d6}
        </span>
        <span className="plus">+{res.statValue + res.adds}</span>
        <span className="eq">=</span>
        <span className="score">{res.score}</span>
        <span className="vs">vs</span>
        <span className={`face d10 ${res.score > res.c1 ? 'beat' : ''}`}>{res.c1}</span>
        <span className={`face d10 ${res.score > res.c2 ? 'beat' : ''}`}>{res.c2}</span>
      </div>
      {res.canceled && <div className="note miss">Action die canceled by negative momentum</div>}
      {res.burned && <div className="note accent-cyan">Momentum burned</div>}
      <OutcomeBadge outcome={res.outcome} match={res.match} />
      {canBurn && (
        <button className="btn cyan" onClick={onBurn}>
          Burn Momentum
        </button>
      )}
    </div>
  );
}

function ProgressReadout({ res }: { res: ProgressResult }) {
  return (
    <div className="readout">
      <div className="dice-faces">
        <span className="score">{res.score}</span>
        <span className="vs">vs</span>
        <span className={`face d10 ${res.score > res.c1 ? 'beat' : ''}`}>{res.c1}</span>
        <span className={`face d10 ${res.score > res.c2 ? 'beat' : ''}`}>{res.c2}</span>
      </div>
      <OutcomeBadge outcome={res.outcome} match={res.match} />
    </div>
  );
}

function OracleReadout({ res }: { res: OracleResult }) {
  const setSection = useStore((s) => s.setSection);
  const addNote = useStore((s) => s.addNote);
  const updateNote = useStore((s) => s.updateNote);
  const notes = useStore((s) => s.campaign.notes);
  const send = () => {
    const target = notes[0];
    const line = `\n- **${res.table?.name ?? 'Oracle'}** (${res.d100}): ${res.text}`;
    if (target) updateNote(target.id, { body: target.body + line });
    else addNote({ title: 'Oracle Results', body: line });
    setSection('notes');
  };
  return (
    <div className="readout">
      <div className="dice-faces">
        <span className="score big">{res.d100}</span>
      </div>
      <div className="oracle-result">{res.text}</div>
      <button className="btn ghost sm" onClick={send}>
        → Send to notes
      </button>
    </div>
  );
}

function YesNoReadout({ res }: { res: YesNoResult }) {
  return (
    <div className="readout">
      <div className="dice-faces">
        <span className="score big">{res.d100}</span>
      </div>
      <div className={`outcome-badge ${res.yes ? 'strong' : 'miss'}`}>
        {res.yes ? 'YES' : 'NO'}
        {res.match && <span className="match-flag">★ MATCH — twist</span>}
      </div>
      <div className="muted" style={{ fontSize: 12 }}>odds: {res.oddsLabel}</div>
    </div>
  );
}

function DiceFabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2l8.5 5v10L12 22 3.5 17V7z" />
      <circle cx="12" cy="9" r="1.2" fill="currentColor" />
      <circle cx="9" cy="14" r="1.2" fill="currentColor" />
      <circle cx="15" cy="14" r="1.2" fill="currentColor" />
    </svg>
  );
}
