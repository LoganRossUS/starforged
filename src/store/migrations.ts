import type { Campaign } from './types';
import { CAMPAIGN_VERSION } from './types';
import { defaultCampaign } from './defaults';

/**
 * Validate + migrate an imported/persisted campaign object to the current schema.
 * Unknown / older versions are merged onto a fresh default so missing fields are
 * always present (defensive against partial saves).
 */
export function migrate(raw: unknown): Campaign {
  if (!raw || typeof raw !== 'object') return defaultCampaign();
  const input = raw as Partial<Campaign>;

  // Future version-specific migrations would branch on input.version here.
  const base = defaultCampaign(input.meta?.title ?? 'Imported Campaign');

  const merged: Campaign = {
    ...base,
    ...input,
    version: CAMPAIGN_VERSION,
    meta: { ...base.meta, ...input.meta },
    character: { ...base.character, ...input.character },
    sector: { ...base.sector, ...input.sector },
    connections: input.connections ?? base.connections,
    progressTracks: input.progressTracks ?? base.progressTracks,
    notes: input.notes && input.notes.length ? input.notes : base.notes,
    log: input.log ?? base.log,
    truths: input.truths ?? base.truths,
    wizardComplete: input.wizardComplete ?? base.wizardComplete,
  } as Campaign;

  // Ensure nested character objects are complete
  merged.character = {
    ...base.character,
    ...input.character,
    stats: { ...base.character.stats, ...input.character?.stats },
    meters: { ...base.character.meters, ...input.character?.meters },
    momentum: { ...base.character.momentum, ...input.character?.momentum },
    legacy: { ...base.character.legacy, ...input.character?.legacy },
    impacts: { ...base.character.impacts, ...input.character?.impacts },
    backgroundVow: { ...base.character.backgroundVow, ...input.character?.backgroundVow },
    assets: input.character?.assets ?? base.character.assets,
  };

  return merged;
}
