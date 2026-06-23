import './sector.css';
import { useMemo, useRef, useState } from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { useStore } from '@/store/store';
import { uid, currentSector } from '@/store/logic';
import type { LocationKind, SectorLocation, SectorLink } from '@/store/types';
import { findOracleTable } from '@/content';
import { useDice } from '@/features/dice/diceStore';
import { SectionBanner, HexPanel, Modal, Field } from '@/components/ui';

// ---- Hex geometry (flat-top, axial coords) ----
const HEX_SIZE = 34; // center-to-corner radius
const SQRT3 = Math.sqrt(3);

function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (1.5 * q);
  const y = HEX_SIZE * (SQRT3 * (r + q / 2));
  return { x, y };
}

function pixelToHex(x: number, y: number): { q: number; r: number } {
  // inverse of flat-top axial layout
  const q = ((2 / 3) * x) / HEX_SIZE;
  const r = ((-1 / 3) * x + (SQRT3 / 3) * y) / HEX_SIZE;
  return hexRound(q, r);
}

function hexRound(q: number, r: number): { q: number; r: number } {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

function hexCorners(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i); // flat-top: start at 0deg
    pts.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

// ---- Local oracle rolling (for auto-naming charted sectors/settlements) ----
// Picks a random row from a dataset table. Rolls within the table's own range
// so it works regardless of the die size, and never misses a row.
function rollTableText(tableId: string): string {
  const t = findOracleTable(tableId);
  if (!t || t.rows.length === 0) return '';
  const lo = t.rows[0].min ?? 1;
  const hi = t.rows[t.rows.length - 1].max ?? 100;
  const n = lo + Math.floor(Math.random() * (hi - lo + 1));
  const row = t.rows.find((r) => r.min !== null && r.max !== null && n >= r.min && n <= r.max);
  return row?.text ?? '';
}

function rollSectorName(): string {
  const prefix = rollTableText('starforged/oracles/space/sector_name/prefix');
  const suffix = rollTableText('starforged/oracles/space/sector_name/suffix');
  return [prefix, suffix].filter(Boolean).join(' ').trim();
}

function rollSettlementName(): string {
  return rollTableText('starforged/oracles/settlements/name');
}

// ---- Kind metadata ----
const KIND_LABELS: Record<LocationKind, string> = {
  settlement: 'Settlement',
  star: 'Star',
  planet: 'Planet',
  derelict: 'Derelict',
  vault: 'Vault',
  creature: 'Creature',
  ship: 'Ship',
  other: 'Other',
};

const KIND_ORDER: LocationKind[] = [
  'settlement',
  'star',
  'planet',
  'derelict',
  'vault',
  'creature',
  'ship',
  'other',
];

function kindColor(kind: LocationKind): string {
  return `var(--kind-${kind})`;
}

interface OracleButton {
  label: string;
  tableId: string;
}

// Settlements aren't a single thing — they sit Planetside, in Orbit, or out in
// Deep Space, and their population scales with the region of space. Build the
// settlement oracle table from those facts rather than a flat list.
function populationTableId(region: string): string {
  const r = region.toLowerCase();
  if (r.includes('terminus')) return 'starforged/oracles/settlements/population/terminus';
  if (r.includes('expanse')) return 'starforged/oracles/settlements/population/expanse';
  // Outlands is the canonical default when the region is blank/ambiguous.
  return 'starforged/oracles/settlements/population/outlands';
}

function settlementOracles(region: string): OracleButton[] {
  return [
    { label: 'Location', tableId: 'starforged/oracles/settlements/location' },
    { label: 'Name', tableId: 'starforged/oracles/settlements/name' },
    { label: 'Population', tableId: populationTableId(region) },
    { label: 'First Look', tableId: 'starforged/oracles/settlements/first_look' },
    { label: 'Initial Contact', tableId: 'starforged/oracles/settlements/initial_contact' },
    { label: 'Authority', tableId: 'starforged/oracles/settlements/authority' },
    { label: 'Projects', tableId: 'starforged/oracles/settlements/projects' },
    { label: 'Trouble', tableId: 'starforged/oracles/settlements/trouble' },
  ];
}

// Map a location kind to one or more candidate oracle tables for detail generation.
// Resolved at runtime so we never wire ids that don't exist in the dataset.
// Settlements are computed separately (see settlementOracles) because they vary
// by region; this record covers the fixed kinds.
const KIND_ORACLES: Record<Exclude<LocationKind, 'settlement'>, OracleButton[]> = {
  star: [{ label: 'Stellar Object', tableId: 'starforged/oracles/space/stellar_object' }],
  planet: [
    { label: 'Class', tableId: 'starforged/oracles/planets/class' },
    { label: 'Observed From Space', tableId: 'starforged/oracles/space/stellar_object' },
  ],
  derelict: [
    { label: 'Type', tableId: 'starforged/oracles/derelicts/type/deep_space' },
    { label: 'Condition', tableId: 'starforged/oracles/derelicts/condition' },
    { label: 'Outer First Look', tableId: 'starforged/oracles/derelicts/outer_first_look' },
  ],
  vault: [
    { label: 'Scale', tableId: 'starforged/oracles/vaults/scale' },
    { label: 'Form', tableId: 'starforged/oracles/vaults/form' },
    { label: 'Outer First Look', tableId: 'starforged/oracles/vaults/outer_first_look' },
  ],
  creature: [
    { label: 'Environment', tableId: 'starforged/oracles/creatures/environment' },
    { label: 'First Look', tableId: 'starforged/oracles/creatures/first_look' },
  ],
  ship: [
    { label: 'Name', tableId: 'starforged/oracles/starships/starship_name' },
    { label: 'Type', tableId: 'starforged/oracles/starships/type' },
    { label: 'First Look', tableId: 'starforged/oracles/starships/first_look' },
  ],
  other: [
    { label: 'Descriptor', tableId: 'starforged/oracles/core/descriptor' },
    { label: 'Focus', tableId: 'starforged/oracles/core/focus' },
  ],
};

function oracleButtonsFor(kind: LocationKind, region: string): OracleButton[] {
  if (kind === 'settlement') return settlementOracles(region);
  return KIND_ORACLES[kind] ?? [];
}

type Mode = 'select' | 'place' | 'link';

export function SectorMapView() {
  const sector = useStore((s) => currentSector(s.campaign));
  const sectors = useStore((s) => s.campaign.sectors);
  const currentSectorId = useStore((s) => s.campaign.currentSectorId);
  const setSectorField = useStore((s) => s.setSectorField);
  const addLocation = useStore((s) => s.addLocation);
  const updateLocation = useStore((s) => s.updateLocation);
  const removeLocation = useStore((s) => s.removeLocation);
  const addLink = useStore((s) => s.addLink);
  const removeLink = useStore((s) => s.removeLink);
  const addSector = useStore((s) => s.addSector);
  const selectSector = useStore((s) => s.selectSector);
  const removeSector = useStore((s) => s.removeSector);
  const addEdgePassage = useStore((s) => s.addEdgePassage);
  const chartBeyond = useStore((s) => s.chartBeyond);
  const setSection = useStore((s) => s.setSection);

  const [mode, setMode] = useState<Mode>('select');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [linkArmed, setLinkArmed] = useState<string | null>(null);
  const [hoverHex, setHoverHex] = useState<{ q: number; r: number } | null>(null);
  // World-space cursor position, tracked only while drawing a path for preview.
  const [linkCursor, setLinkCursor] = useState<{ x: number; y: number } | null>(null);
  const [confirmRemoveSector, setConfirmRemoveSector] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const panState = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const selected = sector.locations.find((l) => l.id === selectedId) ?? null;
  const selectedLink = sector.links.find((k) => k.id === selectedLinkId && k.edge) ?? null;

  const locById = useMemo(() => {
    const m = new Map<string, SectorLocation>();
    for (const l of sector.locations) m.set(l.id, l);
    return m;
  }, [sector.locations]);

  const sectorNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sectors) m.set(s.id, s.name || 'Unnamed Sector');
    return m;
  }, [sectors]);

  // ---- Sector navigation ----
  function clearSelection() {
    setSelectedId(null);
    setSelectedLinkId(null);
    setLinkArmed(null);
  }
  function switchSector(id: string) {
    selectSector(id);
    clearSelection();
    setMode('select');
  }
  function handleAddSector() {
    // A fresh sector gets a rolled name; you can rename it in the field above.
    addSector({ name: rollSectorName() });
    clearSelection();
    setMode('select');
  }
  function chartSectorBeyond(linkId: string) {
    chartBeyond(linkId, {
      sectorName: rollSectorName() || 'Uncharted Sector',
      settlementName: rollSettlementName() || 'New Settlement',
    });
    clearSelection();
    setMode('select');
  }

  // Convert a pointer event into world coordinates (pre-transform svg space).
  function eventToWorld(e: { clientX: number; clientY: number }): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return {
      x: (px - offset.x) / scale,
      y: (py - offset.y) / scale,
    };
  }

  function onCanvasPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    // Only start panning on background (target is the svg or grid layer)
    panState.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onCanvasPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const ps = panState.current;
    if (ps.active) {
      const dx = e.clientX - ps.startX;
      const dy = e.clientY - ps.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) ps.moved = true;
      if (ps.moved) setOffset({ x: ps.originX + dx, y: ps.originY + dy });
    }
    if (mode === 'place') {
      const w = eventToWorld(e);
      if (w) setHoverHex(pixelToHex(w.x, w.y));
    } else if (hoverHex) {
      setHoverHex(null);
    }

    if (mode === 'link' && linkArmed) {
      const w = eventToWorld(e);
      if (w) setLinkCursor(w);
    } else if (linkCursor) {
      setLinkCursor(null);
    }
  }

  function onCanvasPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    const ps = panState.current;
    panState.current = { ...ps, active: false };
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (ps.moved) return; // it was a drag, not a click

    if (mode === 'place') {
      const w = eventToWorld(e);
      if (!w) return;
      const { q, r } = pixelToHex(w.x, w.y);
      // avoid stacking two locations on the same hex
      if (sector.locations.some((l) => l.q === q && l.r === r)) return;
      const id = uid('loc');
      addLocation({ id, name: 'New Location', kind: 'other', q, r });
      setSelectedId(id);
      setSelectedLinkId(null);
      return;
    }

    if (mode === 'link' && linkArmed) {
      // Armed source + click on empty space → a passage out to the sector edge.
      const w = eventToWorld(e);
      if (w) {
        const { q, r } = pixelToHex(w.x, w.y);
        const from = locById.get(linkArmed);
        if (from && !(from.q === q && from.r === r)) addEdgePassage(linkArmed, q, r);
      }
      setLinkArmed(null);
      return;
    }

    // clicking empty canvas in select/link mode clears selection / arming
    clearSelection();
  }

  function onLocationClick(e: ReactMouseEvent<SVGGElement>, loc: SectorLocation) {
    e.stopPropagation();
    if (mode === 'link') {
      // First tap arms a source; second tap on a different location draws the
      // path. Read links/armed state directly so it never depends on a stale
      // render closure.
      const armed = linkArmed;
      if (!armed || armed === loc.id) {
        setLinkArmed(armed === loc.id ? null : loc.id);
        return;
      }
      const exists = sector.links.some(
        (k) => (k.from === armed && k.to === loc.id) || (k.from === loc.id && k.to === armed),
      );
      if (!exists) addLink({ id: uid('link'), from: armed, to: loc.id });
      setLinkArmed(null);
      return;
    }
    setSelectedLinkId(null);
    setSelectedId(loc.id);
  }

  function onGatewayClick(e: ReactMouseEvent<SVGGElement>, link: SectorLink) {
    e.stopPropagation();
    if (mode === 'link') {
      removeLink(link.id);
      if (selectedLinkId === link.id) setSelectedLinkId(null);
      return;
    }
    setSelectedId(null);
    setSelectedLinkId(link.id);
  }

  function onWheel(e: ReactWheelEvent<SVGSVGElement>) {
    const delta = e.deltaY > 0 ? -0.12 : 0.12;
    setScale((s) => clampScale(s + delta * s));
  }

  function zoomBy(factor: number) {
    setScale((s) => clampScale(s * factor));
  }

  // Upsert a detail row on a location, reading the latest store state so the
  // write is correct even though it runs after the async dice roll resolves.
  function upsertDetail(locId: string, label: string, value: string) {
    const cur = currentSector(useStore.getState().campaign).locations.find((l) => l.id === locId);
    if (!cur) return;
    const details = [...(cur.details ?? [])];
    const idx = details.findIndex((d) => d.label === label);
    if (idx >= 0) details[idx] = { label, value };
    else details.push({ label, value });
    useStore.getState().updateLocation(locId, { details });
  }

  function rollOracle(detailLabel: string, tableId: string) {
    if (!selected) return;
    if (!findOracleTable(tableId)) {
      // table id missing from dataset — fall back to the Oracles section
      setSection('oracles');
      return;
    }
    const locId = selected.id;
    useDice.getState().setupOracle(
      {
        label: `${KIND_LABELS[selected.kind]} — ${detailLabel}`,
        tableId,
        // Capture the rolled outcome straight into a labelled detail row.
        onResult: (text) => upsertDetail(locId, detailLabel, text),
      },
      true,
    );
  }

  // ---- Detail editing helpers (operate on the selected location) ----
  function patchSelected(patch: Partial<SectorLocation>) {
    if (selected) updateLocation(selected.id, patch);
  }
  function setDetail(index: number, key: 'label' | 'value', value: string) {
    if (!selected) return;
    const details = (selected.details ?? []).map((d, i) =>
      i === index ? { ...d, [key]: value } : d,
    );
    updateLocation(selected.id, { details });
  }
  function addDetail() {
    if (!selected) return;
    const details = [...(selected.details ?? []), { label: '', value: '' }];
    updateLocation(selected.id, { details });
  }
  function removeDetail(index: number) {
    if (!selected) return;
    const details = (selected.details ?? []).filter((_, i) => i !== index);
    updateLocation(selected.id, { details });
  }

  const showEditor = !!selected || !!selectedLink;

  return (
    <div className="sector-view">
      <SectionBanner title="Sector" />

      <HexPanel style={{ marginTop: 12 }}>
        <div className="sector-switcher">
          <Field label="Active Sector">
            <select value={currentSectorId} onChange={(e) => switchSector(e.target.value)}>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || 'Unnamed Sector'}
                  {s.region ? ` · ${s.region}` : ''}
                </option>
              ))}
            </select>
          </Field>
          <button className="btn sm cyan" onClick={handleAddSector} title="Chart a new, empty sector">
            + New Sector
          </button>
          {sectors.length > 1 && (
            <button
              className="btn sm"
              onClick={() => setConfirmRemoveSector(true)}
              title="Delete the active sector"
            >
              Remove Sector
            </button>
          )}
        </div>

        <div className="sector-fields" style={{ marginTop: 12 }}>
          <Field label="Sector Name">
            <input
              type="text"
              value={sector.name}
              placeholder="Unnamed Sector"
              onChange={(e) => setSectorField({ name: e.target.value })}
            />
          </Field>
          <Field label="Region">
            <input
              type="text"
              value={sector.region}
              placeholder="Terminus / Outlands / Expanse"
              onChange={(e) => setSectorField({ region: e.target.value })}
            />
          </Field>
          <Field label="Faction Control">
            <input
              type="text"
              value={sector.control}
              placeholder="Who holds sway here?"
              onChange={(e) => setSectorField({ control: e.target.value })}
            />
          </Field>
        </div>
      </HexPanel>

      <div className="sector-toolbar">
        <div className="row gap-sm">
          <button
            className={`btn sm ${mode === 'select' ? 'cyan' : ''}`}
            onClick={() => {
              setMode('select');
              setLinkArmed(null);
            }}
          >
            Select
          </button>
          <button
            className={`btn sm ${mode === 'place' ? 'cyan' : ''}`}
            onClick={() => {
              setMode('place');
              setLinkArmed(null);
            }}
          >
            Place
          </button>
          <button
            className={`btn sm ${mode === 'link' ? 'cyan' : ''}`}
            onClick={() => {
              setMode(mode === 'link' ? 'select' : 'link');
              setLinkArmed(null);
            }}
            title="Connect two settlements, or run a passage out to the sector edge"
          >
            Passage
          </button>
        </div>
        <div className="row gap-sm" style={{ marginLeft: 'auto' }}>
          <button
            className="btn sm"
            onClick={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
            title="Reset view"
          >
            Reset View
          </button>
        </div>
      </div>

      <div className={`sector-layout ${showEditor ? 'has-editor' : ''}`}>
        <div className="sector-map-wrap">
          <svg
            ref={svgRef}
            className={`sector-map-svg ${mode === 'place' ? 'place-mode' : ''} ${
              panState.current.active && panState.current.moved ? 'panning' : ''
            }`}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onWheel={onWheel}
          >
            <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`}>
              <GridLayer hoverHex={mode === 'place' ? hoverHex : null} />

              {/* Passage-in-progress preview from the armed source to the cursor */}
              {mode === 'link' &&
                linkArmed &&
                linkCursor &&
                (() => {
                  const a = locById.get(linkArmed);
                  if (!a) return null;
                  const pa = hexToPixel(a.q, a.r);
                  return (
                    <line
                      className="sector-link-line armed"
                      x1={pa.x}
                      y1={pa.y}
                      x2={linkCursor.x}
                      y2={linkCursor.y}
                      pointerEvents="none"
                    />
                  );
                })()}

              {/* Settlement-to-settlement passages */}
              {sector.links.map((k) => {
                if (k.edge || !k.to) return null;
                const a = locById.get(k.from);
                const b = locById.get(k.to);
                if (!a || !b) return null;
                const pa = hexToPixel(a.q, a.r);
                const pb = hexToPixel(b.q, b.r);
                return (
                  <line
                    key={k.id}
                    className="sector-link-line"
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (mode === 'link') removeLink(k.id);
                    }}
                  />
                );
              })}

              {/* Edge passages — routes to neighbouring sectors */}
              {sector.links.map((k) => {
                if (!k.edge) return null;
                const a = locById.get(k.from);
                if (!a) return null;
                const pa = hexToPixel(a.q, a.r);
                const pe = hexToPixel(k.edge.q, k.edge.r);
                const charted = !!k.edge.targetSectorId;
                const isSel = k.id === selectedLinkId;
                const label = charted
                  ? (sectorNameById.get(k.edge.targetSectorId!) ?? 'Sector')
                  : 'Uncharted';
                return (
                  <g key={k.id}>
                    <line
                      className={`sector-edge-line ${charted ? 'charted' : ''}`}
                      x1={pa.x}
                      y1={pa.y}
                      x2={pe.x}
                      y2={pe.y}
                      pointerEvents="none"
                    />
                    <g
                      transform={`translate(${pe.x},${pe.y})`}
                      onPointerDown={(ev) => ev.stopPropagation()}
                      onPointerUp={(ev) => ev.stopPropagation()}
                      onClick={(ev) => onGatewayClick(ev, k)}
                      style={{ cursor: 'pointer' }}
                    >
                      <polygon
                        className={`sector-gateway ${charted ? 'charted' : ''} ${
                          isSel ? 'selected' : ''
                        }`}
                        points={gatewayPoints(13)}
                      />
                      <text className="sector-loc-label" y={28}>
                        {label}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Locations */}
              {sector.locations.map((loc) => {
                const { x, y } = hexToPixel(loc.q, loc.r);
                const isSel = loc.id === selectedId;
                const isArmed = loc.id === linkArmed;
                return (
                  <g
                    key={loc.id}
                    transform={`translate(${x},${y})`}
                    // Swallow pointer events so a click on a location never reaches
                    // the canvas handler (which would pan, or clear the armed link).
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={(e) => onLocationClick(e, loc)}
                    style={{ cursor: 'pointer' }}
                  >
                    <polygon
                      className={`sector-loc-hex ${isSel ? 'selected' : ''} ${
                        isArmed ? 'link-armed' : ''
                      }`}
                      points={hexCorners(0, 0, HEX_SIZE * 0.82)}
                      style={{ fill: kindColor(loc.kind) }}
                    />
                    <text className="sector-loc-label" y={HEX_SIZE + 12}>
                      {loc.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="sector-hint">
            {mode === 'place'
              ? 'Click an empty hex to place a location. Drag to pan.'
              : mode === 'link'
                ? linkArmed
                  ? 'Click another settlement to connect, or click an edge hex to run a passage out of the sector.'
                  : 'Click a settlement to start a passage. Click a passage to remove it.'
                : 'Drag to pan · wheel to zoom · click a location or passage to edit.'}
          </div>

          <div className="sector-zoom-controls">
            <button className="btn sm" onClick={() => zoomBy(1 / 1.2)} title="Zoom out">
              −
            </button>
            <button className="btn sm" onClick={() => zoomBy(1.2)} title="Zoom in">
              +
            </button>
          </div>
        </div>

        {selected ? (
          <LocationEditor
            key={selected.id}
            loc={selected}
            oracleButtons={oracleButtonsFor(selected.kind, sector.region)}
            onPatch={patchSelected}
            onSetDetail={setDetail}
            onAddDetail={addDetail}
            onRemoveDetail={removeDetail}
            onDelete={() => {
              removeLocation(selected.id);
              setSelectedId(null);
            }}
            onRollOracle={rollOracle}
            onClose={() => setSelectedId(null)}
          />
        ) : selectedLink && selectedLink.edge ? (
          <EdgePassageEditor
            key={selectedLink.id}
            fromName={locById.get(selectedLink.from)?.name ?? 'a settlement'}
            targetSectorName={
              selectedLink.edge.targetSectorId
                ? (sectorNameById.get(selectedLink.edge.targetSectorId) ?? 'Sector')
                : null
            }
            onChart={() => chartSectorBeyond(selectedLink.id)}
            onTravel={() =>
              selectedLink.edge?.targetSectorId && switchSector(selectedLink.edge.targetSectorId)
            }
            onDelete={() => {
              removeLink(selectedLink.id);
              setSelectedLinkId(null);
            }}
            onClose={() => setSelectedLinkId(null)}
          />
        ) : null}
      </div>

      <div className="sector-legend">
        {KIND_ORDER.map((k) => (
          <span className="swatch" key={k}>
            <i style={{ background: kindColor(k) }} />
            {KIND_LABELS[k]}
          </span>
        ))}
        <span className="swatch">
          <i className="swatch-gateway" />
          Edge Passage
        </span>
      </div>

      {sector.locations.length === 0 && (
        <p className="empty-state" style={{ marginTop: 12 }}>
          No locations yet. Switch to <strong>Place</strong> mode and click a hex to chart your first
          discovery.
        </p>
      )}

      <Modal
        open={confirmRemoveSector}
        onClose={() => setConfirmRemoveSector(false)}
        title="Remove Sector"
      >
        <p>
          Delete <strong>{sector.name || 'this sector'}</strong> and everything charted in it? This
          can't be undone.
        </p>
        <div className="row gap-sm" style={{ marginTop: 12 }}>
          <button
            className="btn primary"
            onClick={() => {
              removeSector(currentSectorId);
              clearSelection();
              setConfirmRemoveSector(false);
            }}
          >
            Delete
          </button>
          <button className="btn" onClick={() => setConfirmRemoveSector(false)}>
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}

// Diamond gateway marker points centred on origin.
function gatewayPoints(r: number): string {
  return `0,${-r} ${r},0 0,${r} ${-r},0`;
}

// ---- Background hex grid ----
function GridLayer({ hoverHex }: { hoverHex: { q: number; r: number } | null }) {
  // Render a fixed window of hexes around origin for a subtle grid backdrop.
  const cells = useMemo(() => {
    const out: { q: number; r: number; x: number; y: number }[] = [];
    for (let q = -8; q <= 8; q++) {
      for (let r = -8; r <= 8; r++) {
        const { x, y } = hexToPixel(q, r);
        out.push({ q, r, x, y });
      }
    }
    return out;
  }, []);

  return (
    <g>
      {cells.map((c) => {
        const isHover = hoverHex && hoverHex.q === c.q && hoverHex.r === c.r;
        return (
          <polygon
            key={`${c.q},${c.r}`}
            className={`sector-grid-cell ${isHover ? 'hover' : ''}`}
            points={hexCorners(c.x, c.y, HEX_SIZE)}
          />
        );
      })}
    </g>
  );
}

// ---- Edge passage editor panel ----
function EdgePassageEditor({
  fromName,
  targetSectorName,
  onChart,
  onTravel,
  onDelete,
  onClose,
}: {
  fromName: string;
  targetSectorName: string | null;
  onChart: () => void;
  onTravel: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <HexPanel className="sector-editor" accent="var(--cyan)">
      <div className="editor-head">
        <h3 className="section-title">
          <span className="sector-kind-dot" style={{ background: 'var(--cyan)' }} />
          Edge Passage
        </h3>
        <button className="btn sm" onClick={onClose}>
          Close
        </button>
      </div>

      <p className="dim" style={{ fontSize: 13 }}>
        A passage running from <strong>{fromName}</strong> to the edge of the sector — a route to
        a neighbouring sector.
      </p>

      {targetSectorName ? (
        <>
          <div className="section-title" style={{ marginTop: 8 }}>
            Leads to
          </div>
          <p style={{ marginTop: 2 }}>
            <strong>{targetSectorName}</strong>
          </p>
          <button className="btn sm cyan" style={{ marginTop: 8 }} onClick={onTravel}>
            Travel to {targetSectorName} →
          </button>
        </>
      ) : (
        <>
          <p className="dim" style={{ fontSize: 12, marginTop: 8 }}>
            When you leave the sector along this passage, chart the sector beyond — it rolls a new
            sector and settlement, and this passage becomes the link between them.
          </p>
          <button className="btn sm cyan" style={{ marginTop: 8 }} onClick={onChart}>
            Chart Sector Beyond
          </button>
        </>
      )}

      <div style={{ marginTop: 14 }}>
        <button className="btn sm" onClick={onDelete}>
          Remove Passage
        </button>
      </div>
    </HexPanel>
  );
}

// ---- Location editor panel ----
function LocationEditor({
  loc,
  oracleButtons,
  onPatch,
  onSetDetail,
  onAddDetail,
  onRemoveDetail,
  onDelete,
  onRollOracle,
  onClose,
}: {
  loc: SectorLocation;
  oracleButtons: OracleButton[];
  onPatch: (patch: Partial<SectorLocation>) => void;
  onSetDetail: (index: number, key: 'label' | 'value', value: string) => void;
  onAddDetail: () => void;
  onRemoveDetail: (index: number) => void;
  onDelete: () => void;
  onRollOracle: (label: string, tableId: string) => void;
  onClose: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <HexPanel className="sector-editor" accent={kindColor(loc.kind)}>
      <div className="editor-head">
        <h3 className="section-title">
          <span className="sector-kind-dot" style={{ background: kindColor(loc.kind) }} />
          Edit Location
        </h3>
        <button className="btn sm" onClick={onClose}>
          Close
        </button>
      </div>

      <Field label="Name">
        <input
          type="text"
          value={loc.name}
          onChange={(e) => onPatch({ name: e.target.value })}
        />
      </Field>

      <Field label="Kind">
        <select
          value={loc.kind}
          onChange={(e) => onPatch({ kind: e.target.value as LocationKind })}
        >
          {KIND_ORDER.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Notes">
        <textarea
          rows={3}
          value={loc.notes ?? ''}
          onChange={(e) => onPatch({ notes: e.target.value })}
        />
      </Field>

      <div className="section-title" style={{ marginTop: 10 }}>
        Generate Details
      </div>
      <div className="sector-oracle-buttons">
        {oracleButtons.map((o) => (
          <button
            key={o.tableId + o.label}
            className="btn sm"
            onClick={() => onRollOracle(o.label, o.tableId)}
            title="Roll this oracle — the result drops into a detail row automatically"
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="dim" style={{ fontSize: 12, marginTop: 2 }}>
        Rolls land in the dice panel and fill a matching detail row below — re-roll any time.
      </p>

      <div className="section-title" style={{ marginTop: 10 }}>
        Details
      </div>
      {(loc.details ?? []).map((d, i) => (
        <div className="sector-detail-row" key={i}>
          <input
            type="text"
            value={d.label}
            placeholder="Label"
            onChange={(e) => onSetDetail(i, 'label', e.target.value)}
          />
          <input
            type="text"
            value={d.value}
            placeholder="Value"
            onChange={(e) => onSetDetail(i, 'value', e.target.value)}
          />
          <button className="btn sm" onClick={() => onRemoveDetail(i)} title="Remove detail">
            ✕
          </button>
        </div>
      ))}
      <button className="btn sm" onClick={onAddDetail}>
        + Add Detail
      </button>

      <div style={{ marginTop: 14 }}>
        <button className="btn sm" onClick={() => setConfirmDelete(true)}>
          Delete Location
        </button>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Location"
      >
        <p>
          Delete <strong>{loc.name || 'this location'}</strong>? Linked connections will also be
          removed.
        </p>
        <div className="row gap-sm" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={onDelete}>
            Delete
          </button>
          <button className="btn" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
        </div>
      </Modal>
    </HexPanel>
  );
}

function clampScale(s: number): number {
  return Math.max(0.4, Math.min(3, s));
}
