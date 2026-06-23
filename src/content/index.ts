// Typed accessors over the generated Datasworn content.
import movesData from '@/data/generated/moves.json';
import assetsData from '@/data/generated/assets.json';
import oraclesData from '@/data/generated/oracles.json';
import truthsData from '@/data/generated/truths.json';
import metaData from '@/data/generated/meta.json';
import type { AssetType } from '@/store/types';

// ---- Moves ----
export interface MoveOutcomes {
  strong: string;
  weak: string;
  miss: string;
}
export interface Move {
  id: string;
  name: string;
  rollType: 'action_roll' | 'progress_roll' | 'no_roll' | 'special_track';
  stats: string[];
  triggerText: string;
  text: string;
  outcomes?: MoveOutcomes;
}
export interface MoveCategory {
  id: string;
  name: string;
  summary: string;
  color: string | null;
  moves: Move[];
}
export const moveCategories = movesData as unknown as MoveCategory[];
export const allMoves: Move[] = moveCategories.flatMap((c) => c.moves);
export const moveById = (id: string): Move | undefined => allMoves.find((m) => m.id === id);

// ---- Assets ----
export interface AssetMeterImpact {
  key: string;
  label: string;
  isImpact: boolean;
}
export interface AssetControl {
  key: string;
  kind: 'meter' | 'checkbox' | 'counter' | 'select' | string;
  label: string;
  min?: number;
  max?: number | null;
  value?: number | boolean | null;
  isImpact?: boolean;
  impacts?: AssetMeterImpact[];
  choices?: { label: string }[];
}
export interface AssetOption {
  key: string;
  label: string;
  fieldType: string;
  value: string;
  choices?: { label: string; value: string }[];
}
export interface AssetAbilityDef {
  text: string;
  enabled: boolean;
  options: AssetOption[];
  controls: AssetControl[];
}
export interface AssetDef {
  id: string;
  name: string;
  type: AssetType;
  category: string;
  color: string | null;
  countAsImpact: boolean;
  shared: boolean;
  requirement: string | null;
  options: AssetOption[];
  controls: AssetControl[];
  abilities: AssetAbilityDef[];
}
export const assets = assetsData as unknown as AssetDef[];
export const assetById = (id: string): AssetDef | undefined => assets.find((a) => a.id === id);
export const assetsByType = (type: AssetType): AssetDef[] => assets.filter((a) => a.type === type);

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  command_vehicle: 'Command Vehicle',
  module: 'Module',
  support_vehicle: 'Support Vehicle',
  path: 'Path',
  companion: 'Companion',
  deed: 'Deed',
};

// ---- Oracles ----
export interface OracleRow {
  min: number | null;
  max: number | null;
  text: string;
  oracleRolls?: { oracle: string; auto: boolean; number: number }[];
  suggestOracles?: string[];
}
export interface OracleTable {
  id: string;
  name: string;
  kind: 'table';
  oracleType: string;
  dice: string;
  rows: OracleRow[];
}
export interface OracleCollection {
  id: string;
  name: string;
  kind: 'collection';
  children: OracleNode[];
}
export type OracleNode = OracleTable | OracleCollection;
export const oracles = oraclesData as unknown as OracleNode[];

export function findOracleTable(id: string, nodes: OracleNode[] = oracles): OracleTable | undefined {
  for (const n of nodes) {
    if (n.kind === 'table' && n.id === id) return n;
    if (n.kind === 'collection') {
      const found = findOracleTable(id, n.children);
      if (found) return found;
    }
  }
  return undefined;
}

export function flattenOracleTables(nodes: OracleNode[] = oracles): OracleTable[] {
  const out: OracleTable[] = [];
  for (const n of nodes) {
    if (n.kind === 'table') out.push(n);
    else out.push(...flattenOracleTables(n.children));
  }
  return out;
}

// ---- Truths ----
export interface TruthOption {
  min: number | null;
  max: number | null;
  summary: string;
  description: string;
  questStarter: string;
  table: { dice: string; rows: OracleRow[] } | null;
}
export interface TruthCategory {
  id: string;
  fullId: string;
  name: string;
  dice: string;
  yourCharacter: string;
  options: TruthOption[];
}
export const truths = truthsData as unknown as TruthCategory[];

// ---- Meta / attribution ----
export interface ContentMeta {
  title: string;
  authors: { name: string }[];
  date: string;
  url: string;
  license: string;
  dataswornVersion: string;
}
export const contentMeta = metaData as unknown as ContentMeta;

// The default command vehicle (Starship) the wizard auto-equips.
export const starshipAsset = assets.find((a) => a.type === 'command_vehicle' && /starship/i.test(a.name));
