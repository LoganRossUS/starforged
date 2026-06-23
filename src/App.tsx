import { useStore } from './store/store';
import {
  IconSheet,
  IconAsset,
  IconOracle,
  IconMoves,
  IconSector,
  IconConnections,
  IconNotes,
  IconWizard,
  IconSave,
  IconInfo,
  IconHex,
} from './components/Icons';
import type { ComponentType } from 'react';
import { CharacterSheet } from './features/sheet/CharacterSheet';
import { AssetLibrary } from './features/assets/AssetLibrary';
import { OracleBrowser } from './features/oracles/OracleBrowser';
import { MoveReference } from './features/moves/MoveReference';
import { SectorMapView } from './features/sector/SectorMapView';
import { ConnectionsView } from './features/connections/ConnectionsView';
import { NotesView } from './features/notes/NotesView';
import { SetupWizard } from './features/wizard/SetupWizard';
import { SaveLoadView } from './features/save/SaveLoadView';
import { CreditsView } from './features/credits/CreditsView';
import { DicePanel } from './features/dice/DicePanel';

interface NavItem {
  id: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { id: 'sheet', label: 'Character', Icon: IconSheet },
  { id: 'assets', label: 'Assets', Icon: IconAsset },
  { id: 'oracles', label: 'Oracles', Icon: IconOracle },
  { id: 'moves', label: 'Moves', Icon: IconMoves },
  { id: 'sector', label: 'Sector', Icon: IconSector },
  { id: 'connections', label: 'Connections', Icon: IconConnections },
  { id: 'notes', label: 'Notes', Icon: IconNotes },
  { id: 'wizard', label: 'Setup Wizard', Icon: IconWizard },
  { id: 'save', label: 'Save / Load', Icon: IconSave },
  { id: 'credits', label: 'Credits', Icon: IconInfo },
];

function Section({ id }: { id: string }) {
  switch (id) {
    case 'sheet':
      return <CharacterSheet />;
    case 'assets':
      return <AssetLibrary />;
    case 'oracles':
      return <OracleBrowser />;
    case 'moves':
      return <MoveReference />;
    case 'sector':
      return <SectorMapView />;
    case 'connections':
      return <ConnectionsView />;
    case 'notes':
      return <NotesView />;
    case 'wizard':
      return <SetupWizard />;
    case 'save':
      return <SaveLoadView />;
    case 'credits':
      return <CreditsView />;
    default:
      return <CharacterSheet />;
  }
}

export function App() {
  const active = useStore((s) => s.activeSection);
  const setSection = useStore((s) => s.setSection);
  const title = useStore((s) => s.campaign.meta.title);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">
            <IconHex className="nav-icon" />
            <h1>
              FORGE<span className="accent">·</span>CO
            </h1>
          </div>
          <div className="tag">Starforged Companion</div>
        </div>
        <nav className="nav">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={active === id ? 'active' : ''}
              onClick={() => setSection(id)}
            >
              <Icon className="nav-icon" />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="tag" style={{ letterSpacing: '0.05em' }}>
            {title || 'Untitled'}
          </div>
          <div className="muted" style={{ fontSize: 10 }}>
            Autosaved locally · export JSON to back up
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="main-inner">
          <Section id={active} />
        </div>
      </main>
      <DicePanel />
    </div>
  );
}
