import type { AssetDef } from '@/content';
import type { AssetInstance } from '@/store/types';
import { uid } from '@/store/logic';

/** Build a fresh equipped AssetInstance from a content definition. */
export function createAssetInstance(def: AssetDef): AssetInstance {
  const fields: Record<string, string> = {};
  for (const opt of def.options) fields[opt.label] = opt.value ?? '';
  for (const ab of def.abilities) {
    for (const opt of ab.options) fields[opt.label] = opt.value ?? '';
  }

  // First condition meter found becomes the primary conditionMeter.
  let conditionMeter: AssetInstance['conditionMeter'];
  const controls: Record<string, number | boolean | string> = {};
  const collectControls = (list: AssetDef['controls']) => {
    for (const c of list) {
      if (c.kind === 'meter') {
        if (!conditionMeter) {
          conditionMeter = { label: c.label, value: c.value as number, max: c.max ?? 5 };
        }
        for (const imp of c.impacts ?? []) controls[imp.key] = false;
      } else if (c.kind === 'checkbox') {
        controls[c.key] = !!c.value;
      } else if (c.kind === 'counter') {
        controls[c.key] = (c.value as number) ?? 0;
      } else if (c.kind === 'select') {
        controls[c.key] = '';
      }
    }
  };
  collectControls(def.controls);
  for (const ab of def.abilities) collectControls(ab.controls);

  return {
    instanceId: uid('asset'),
    assetId: def.id,
    name: def.name,
    type: def.type,
    abilities: def.abilities.map((a) => ({ text: a.text, enabled: a.enabled })),
    fields,
    conditionMeter,
    controls,
  };
}

export const ASSET_TYPE_COLOR: Record<string, string> = {
  command_vehicle: 'var(--type-command)',
  module: 'var(--type-module)',
  support_vehicle: 'var(--type-support)',
  path: 'var(--type-path)',
  companion: 'var(--type-companion)',
  deed: 'var(--type-deed)',
};
