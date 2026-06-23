import { SectionBanner, HexPanel } from '@/components/ui';
import { contentMeta } from '@/content';

export function CreditsView() {
  return (
    <div>
      <SectionBanner title="Credits & License" />
      <div className="col" style={{ gap: 16, maxWidth: 760 }}>
        <HexPanel className="accented" accent="var(--red)">
          <h3 style={{ fontSize: 22, marginBottom: 8 }}>Forge Companion</h3>
          <p className="dim">
            An <strong>unofficial</strong>, fan-made, fully client-side companion for playing{' '}
            <em>Ironsworn: Starforged</em>. This tool is <strong>not affiliated with, endorsed by, or sponsored
            by</strong> the publisher or author of Ironsworn or Starforged.
          </p>
        </HexPanel>

        <HexPanel>
          <div className="section-title">Game Content Attribution</div>
          <p className="dim">
            The moves, oracles, asset text, and setting truths in this app are derived from the{' '}
            <em>Ironsworn: Starforged</em> system reference content created by <strong>Shawn Tomkin</strong>, and
            from the machine-readable <strong>Datasworn</strong> dataset.
          </p>
          <ul className="dim">
            <li>
              Ironsworn / Starforged:{' '}
              <a href="https://ironswornrpg.com" target="_blank" rel="noopener">
                ironswornrpg.com
              </a>
            </li>
            <li>
              Datasworn dataset:{' '}
              <a href="https://github.com/rsek/datasworn" target="_blank" rel="noopener">
                github.com/rsek/datasworn
              </a>{' '}
              (v{contentMeta.dataswornVersion})
            </li>
          </ul>
        </HexPanel>

        <HexPanel>
          <div className="section-title">License (CC BY 4.0)</div>
          <p className="dim">
            The included game text is licensed under the{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">
              Creative Commons Attribution 4.0 International License
            </a>{' '}
            (CC BY 4.0). You are free to share and adapt this material for any purpose, even commercially, provided
            you give appropriate credit.
          </p>
          <p className="muted" style={{ fontSize: 13 }}>
            Source declared license: <span className="mono">{contentMeta.license}</span>
          </p>
          <p className="dim">
            Only CC-licensed game <em>text</em> is reproduced here. The official logos, painted illustrations, and
            the “Ironsworn” / “Starforged” wordmarks and trade dress are <strong>not</strong> CC-licensed and are
            <strong> not</strong> reproduced. All visuals in this app (palette, typography, hex motifs, icons, dice)
            are original recreations in a similar style.
          </p>
        </HexPanel>

        <HexPanel>
          <div className="section-title">Built With</div>
          <p className="muted" style={{ fontSize: 13 }}>
            Vite · React · TypeScript · Zustand · @3d-dice/dice-box (Three.js + cannon-es physics). Fonts: Saira
            Condensed, Barlow, JetBrains Mono (Google Fonts, open licensed lookalikes — not the proprietary book
            fonts).
          </p>
        </HexPanel>
      </div>
    </div>
  );
}
