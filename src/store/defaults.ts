import type { Campaign, Character, ProgressTrack, Rank, SectorMap } from './types';
import { CAMPAIGN_VERSION } from './types';
import { uid } from './logic';

export function defaultSector(partial: Partial<SectorMap> = {}): SectorMap {
  return {
    id: uid('sector'),
    name: '',
    region: '',
    control: '',
    locations: [],
    links: [],
    ...partial,
  };
}

export function emptyProgressTrack(
  partial: Partial<ProgressTrack> & { name: string; type: ProgressTrack['type'] },
): ProgressTrack {
  return {
    id: uid('track'),
    rank: 'dangerous' as Rank,
    ticks: 0,
    ...partial,
  };
}

export function defaultCharacter(): Character {
  return {
    name: '',
    pronouns: '',
    callsign: '',
    characteristics: '',
    stats: { edge: 1, heart: 1, iron: 1, shadow: 1, wits: 1 },
    meters: { health: 5, spirit: 5, supply: 5 },
    momentum: { value: 2, max: 10, reset: 2 },
    legacy: {
      quests: 0,
      bonds: 0,
      discoveries: 0,
      questsCleared: false,
      bondsCleared: false,
      discoveriesCleared: false,
      xpEarned: 0,
      xpSpent: 0,
    },
    impacts: {
      wounded: false,
      shaken: false,
      unprepared: false,
      permanentlyHarmed: false,
      traumatized: false,
      doomed: false,
      tormented: false,
      indebted: false,
      battered: false,
      cursed: false,
      other: [],
    },
    backgroundVow: {
      id: uid('track'),
      name: 'Background Vow',
      type: 'vow',
      rank: 'epic',
      ticks: 0,
    },
    assets: [],
  };
}

export function defaultCampaign(title = 'Untitled Campaign'): Campaign {
  const now = new Date().toISOString();
  const sector = defaultSector();
  return {
    version: CAMPAIGN_VERSION,
    meta: { title, createdAt: now, updatedAt: now },
    truths: {},
    character: defaultCharacter(),
    sectors: [sector],
    currentSectorId: sector.id,
    connections: [],
    progressTracks: [],
    notes: [
      {
        id: uid('note'),
        title: 'Campaign Journal',
        body: '# Campaign Journal\n\nBegin your story here…',
        updatedAt: now,
      },
    ],
    log: [],
    wizardComplete: false,
  };
}
