// build-content.mjs
// Transforms the official Datasworn Starforged dataset (CC-BY 4.0) into normalized
// JSON the app imports. Re-run with: npm run build:content
//
// Source: @datasworn/starforged (bundled as a dev dependency).
// Output: src/data/generated/{moves,assets,oracles,truths,meta}.json

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'node_modules/@datasworn/starforged/json/starforged.json');
const OUT_DIR = resolve(ROOT, 'src/data/generated');

if (!existsSync(SRC)) {
  console.error('Datasworn source not found at', SRC);
  console.error('Run `npm install` first (it provides @datasworn/starforged).');
  process.exit(1);
}

const data = JSON.parse(readFileSync(SRC, 'utf-8'));
mkdirSync(OUT_DIR, { recursive: true });

const write = (name, obj) => {
  writeFileSync(resolve(OUT_DIR, name), JSON.stringify(obj, null, 0));
  console.log('wrote', name, '(' + JSON.stringify(obj).length + ' bytes)');
};

// ---------------------------------------------------------------------------
// MOVES
// ---------------------------------------------------------------------------
function statsFromTrigger(trigger) {
  const opts = [];
  for (const cond of trigger?.conditions ?? []) {
    for (const ro of cond.roll_options ?? []) {
      if (ro.using === 'stat' && ro.stat) opts.push(ro.stat);
      else if (ro.using === 'condition_meter' && ro.condition_meter) opts.push(ro.condition_meter);
    }
  }
  return [...new Set(opts)];
}

function buildMove(m) {
  const outcomes = m.outcomes
    ? {
        strong: m.outcomes.strong_hit?.text ?? '',
        weak: m.outcomes.weak_hit?.text ?? '',
        miss: m.outcomes.miss?.text ?? '',
      }
    : undefined;
  return {
    id: m._id,
    name: m.name,
    rollType: m.roll_type, // action_roll | progress_roll | no_roll | special_track
    stats: statsFromTrigger(m.trigger),
    triggerText: m.trigger?.text ?? '',
    text: m.text,
    outcomes,
  };
}

const moves = Object.values(data.moves).map((cat) => ({
  id: cat._id,
  name: cat.name,
  summary: cat.summary ?? cat.description ?? '',
  color: cat.color ?? null,
  moves: Object.values(cat.contents).map(buildMove),
}));
write('moves.json', moves);

// ---------------------------------------------------------------------------
// ASSETS
// ---------------------------------------------------------------------------
function buildControl(key, c) {
  if (c.field_type === 'condition_meter') {
    return {
      key,
      kind: 'meter',
      label: c.label,
      min: c.min ?? 0,
      max: c.max ?? 5,
      value: c.value ?? c.max ?? 0,
      // nested checkboxes (e.g. battered/cursed) become impacts
      impacts: Object.entries(c.controls ?? {}).map(([k, v]) => ({
        key: k,
        label: v.label,
        isImpact: !!v.is_impact,
      })),
    };
  }
  if (c.field_type === 'checkbox') {
    return { key, kind: 'checkbox', label: c.label, value: !!c.value, isImpact: !!c.is_impact };
  }
  if (c.field_type === 'counter') {
    return { key, kind: 'counter', label: c.label, min: c.min ?? 0, max: c.max ?? null, value: c.value ?? 0 };
  }
  if (c.field_type === 'select_enhancement') {
    return {
      key,
      kind: 'select',
      label: c.label,
      choices: Object.values(c.choices ?? {}).map((ch) => ({ label: ch.label })),
    };
  }
  return { key, kind: c.field_type, label: c.label, value: c.value ?? null };
}

function buildOption(key, o) {
  return {
    key,
    label: o.label,
    fieldType: o.field_type, // text | select_value | select_enhancement
    value: o.value ?? '',
    choices: o.choices ? Object.values(o.choices).map((c) => ({ label: c.label, value: c.value ?? c.label })) : undefined,
  };
}

function buildAsset(a, type) {
  return {
    id: a._id,
    name: a.name,
    type, // command_vehicle | module | support_vehicle | path | companion | deed
    category: a.category,
    color: a.color ?? null,
    countAsImpact: !!a.count_as_impact,
    shared: !!a.shared,
    requirement: a.requirement ?? null,
    options: Object.entries(a.options ?? {}).map(([k, o]) => buildOption(k, o)),
    controls: Object.entries(a.controls ?? {}).map(([k, c]) => buildControl(k, c)),
    abilities: a.abilities.map((ab) => ({
      text: ab.text,
      enabled: !!ab.enabled,
      // ability-level controls/options exist for some assets
      options: Object.entries(ab.options ?? {}).map(([k, o]) => buildOption(k, o)),
      controls: Object.entries(ab.controls ?? {}).map(([k, c]) => buildControl(k, c)),
    })),
  };
}

const assets = [];
for (const [type, coll] of Object.entries(data.assets)) {
  for (const a of Object.values(coll.contents)) {
    assets.push(buildAsset(a, type));
  }
}
write('assets.json', assets);

// ---------------------------------------------------------------------------
// ORACLES (recursive tree)
// ---------------------------------------------------------------------------
function buildRow(r) {
  const row = { min: r.min ?? null, max: r.max ?? null, text: r.text ?? '' };
  if (r.oracle_rolls) {
    row.oracleRolls = r.oracle_rolls.map((o) => ({
      oracle: o.oracle,
      auto: !!o.auto,
      number: o.number_of_rolls ?? 1,
    }));
  }
  if (r.suggestions?.oracles) row.suggestOracles = r.suggestions.oracles;
  return row;
}

function buildOracleNode(node) {
  if (node.oracle_type && node.rows) {
    // rollable table
    return {
      id: node._id,
      name: node.name,
      kind: 'table',
      oracleType: node.oracle_type,
      dice: node.dice,
      rows: node.rows.map(buildRow),
    };
  }
  // collection
  const children = [];
  for (const c of Object.values(node.contents ?? {})) children.push(buildOracleNode(c));
  for (const c of Object.values(node.collections ?? {})) children.push(buildOracleNode(c));
  return {
    id: node._id,
    name: node.name,
    kind: 'collection',
    children,
  };
}

const oracles = Object.values(data.oracles).map(buildOracleNode);
write('oracles.json', oracles);

// ---------------------------------------------------------------------------
// TRUTHS
// ---------------------------------------------------------------------------
const truths = Object.entries(data.truths).map(([key, t]) => ({
  id: key,
  fullId: t._id,
  name: t.name,
  dice: t.dice ?? '1d100',
  yourCharacter: t.your_character ?? '',
  options: t.options.map((o) => ({
    min: o.min ?? null,
    max: o.max ?? null,
    summary: o.summary ?? '',
    description: o.description ?? '',
    questStarter: o.quest_starter ?? '',
    // sub-oracle table embedded in some truth options
    table: o.table
      ? {
          dice: o.table.dice ?? '1d100',
          rows: (o.table.rows ?? []).map(buildRow),
        }
      : null,
  })),
}));
write('truths.json', truths);

// ---------------------------------------------------------------------------
// META (attribution)
// ---------------------------------------------------------------------------
write('meta.json', {
  title: data.title,
  authors: data.authors,
  date: data.date,
  url: data.url,
  license: data.license,
  dataswornVersion: data.datasworn_version,
});

console.log('\nContent build complete ->', OUT_DIR);
