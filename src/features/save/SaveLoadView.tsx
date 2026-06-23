import { useRef, useState } from 'react';
import { useStore } from '@/store/store';
import { SectionBanner, HexPanel } from '@/components/ui';

export function SaveLoadView() {
  const campaign = useStore((s) => s.campaign);
  const loadCampaign = useStore((s) => s.loadCampaign);
  const newCampaign = useStore((s) => s.newCampaign);
  const setTitle = useStore((s) => s.setTitle);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('');

  const exportJson = () => {
    const data = JSON.stringify(campaign, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = (campaign.meta.title || 'campaign').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `forge-${safe}-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Campaign exported.');
  };

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        loadCampaign(parsed);
        setStatus(`Loaded "${parsed?.meta?.title ?? 'campaign'}".`);
      } catch {
        setStatus('Import failed — not a valid campaign file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <SectionBanner title="Save / Load" />
      <div className="col" style={{ gap: 16 }}>
        <HexPanel>
          <div className="section-title">Campaign</div>
          <label className="field" style={{ maxWidth: 420 }}>
            <span className="field-label">Title</span>
            <input value={campaign.meta.title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            Created {new Date(campaign.meta.createdAt).toLocaleString()} · Updated{' '}
            {new Date(campaign.meta.updatedAt).toLocaleString()}
          </p>
        </HexPanel>

        <HexPanel className="accented" accent="var(--cyan)">
          <div className="section-title">Export (canonical backup)</div>
          <p className="muted" style={{ fontSize: 13 }}>
            Your campaign auto-saves to this browser's local storage, but the downloadable JSON file is the real,
            portable backup. Export regularly.
          </p>
          <button className="btn primary" onClick={exportJson} style={{ marginTop: 10 }}>
            ⭳ Export JSON
          </button>
        </HexPanel>

        <HexPanel>
          <div className="section-title">Import</div>
          <p className="muted" style={{ fontSize: 13 }}>
            Load a previously exported <code>.json</code> campaign file. This replaces your current campaign.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
          <button className="btn" onClick={() => fileRef.current?.click()} style={{ marginTop: 10 }}>
            ⭱ Import JSON
          </button>
        </HexPanel>

        <HexPanel className="accented" accent="var(--red)">
          <div className="section-title">New Campaign</div>
          <p className="muted" style={{ fontSize: 13 }}>
            Start fresh and run the setup wizard. Export your current campaign first if you want to keep it.
          </p>
          <button
            className="btn"
            style={{ marginTop: 10 }}
            onClick={() => {
              if (confirm('Start a new campaign? Unexported changes to the current one will be lost.')) {
                newCampaign('New Campaign');
              }
            }}
          >
            ✦ New Campaign
          </button>
        </HexPanel>

        {status && <div className="pill">{status}</div>}
      </div>
    </div>
  );
}
