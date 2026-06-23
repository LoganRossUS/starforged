import { useMemo, useState } from 'react';
import './assets.css';
import { assets, ASSET_TYPE_LABELS, type AssetDef } from '@/content';
import type { AssetType } from '@/store/types';
import { useStore } from '@/store/store';
import { SectionBanner } from '@/components/ui';
import { AssetCard } from './AssetCard';
import { createAssetInstance } from './assetInstance';

// The distinct asset types present in the content, in label order.
const ASSET_TYPES = Object.keys(ASSET_TYPE_LABELS) as AssetType[];

type Filter = 'all' | AssetType;

export function AssetLibrary() {
  const equippedCount = useStore((s) => s.campaign.character.assets.length);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // instanceId-style key set to flash a transient "Added" state per card.
  const [recentlyAdded, setRecentlyAdded] = useState<Record<string, boolean>>({});

  // Filtered list of definitions (by type + free-text over name + ability text).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((def) => {
      if (filter !== 'all' && def.type !== filter) return false;
      if (!q) return true;
      if (def.name.toLowerCase().includes(q)) return true;
      return def.abilities.some((a) => a.text.toLowerCase().includes(q));
    });
  }, [search, filter]);

  // Stable read-only preview instances for the filtered list. Recomputed only
  // when the filtered set changes, so ids are not regenerated every render.
  const previews = useMemo(
    () => filtered.map((def) => ({ def, preview: createAssetInstance(def) })),
    [filtered],
  );

  const addToCharacter = (def: AssetDef) => {
    if (def.type === 'deed' && def.requirement) {
      const ok = window.confirm(
        `This deed normally requires: ${def.requirement}. Add anyway?`,
      );
      if (!ok) return;
    }
    useStore.getState().equipAsset(createAssetInstance(def));
    setRecentlyAdded((prev) => ({ ...prev, [def.id]: true }));
    window.setTimeout(() => {
      setRecentlyAdded((prev) => {
        const next = { ...prev };
        delete next[def.id];
        return next;
      });
    }, 1500);
  };

  return (
    <div className="asset-library">
      <SectionBanner
        title="Asset Library"
        right={<span className="pill">{equippedCount} equipped</span>}
      />

      <p className="muted asset-library-note">
        The Starship command vehicle is usually auto-equipped by the wizard.
      </p>

      <div className="asset-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets…"
        />
        <div className="type-filters">
          <button
            className={`chip-toggle ${filter === 'all' ? 'on' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {ASSET_TYPES.map((type) => (
            <button
              key={type}
              className={`chip-toggle ${filter === type ? 'on' : ''}`}
              onClick={() => setFilter(type)}
            >
              {ASSET_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {previews.length === 0 ? (
        <div className="empty-state">No assets match your search.</div>
      ) : (
        <div className="asset-grid">
          {previews.map(({ def, preview }) => {
            const added = !!recentlyAdded[def.id];
            return (
              <div key={def.id} className="asset-library-item">
                <AssetCard asset={preview} compact />
                {def.type === 'deed' && def.requirement && (
                  <div className="asset-requirement">
                    Requires: {def.requirement}
                  </div>
                )}
                <button
                  className="btn sm primary asset-add-btn"
                  onClick={() => addToCharacter(def)}
                  disabled={added}
                >
                  {added ? '✓ Added' : 'Add to Character'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
