import type { AssetInstance } from '@/store/types';
import './assets.css';
import { assetById, ASSET_TYPE_LABELS } from '@/content';
import { Markdown } from '@/components/Markdown';
import { ASSET_TYPE_COLOR } from './assetInstance';
import { clamp } from '@/store/logic';

interface Props {
  asset: AssetInstance;
  onChange?: (patch: Partial<AssetInstance>) => void;
  onRemove?: () => void;
  compact?: boolean;
}

export function AssetCard({ asset, onChange, onRemove, compact }: Props) {
  const def = assetById(asset.assetId);
  const color = ASSET_TYPE_COLOR[asset.type] ?? 'var(--red)';
  const editable = !!onChange;

  const toggleAbility = (i: number) => {
    if (!onChange) return;
    const abilities = asset.abilities.map((a, idx) => (idx === i ? { ...a, enabled: !a.enabled } : a));
    onChange({ abilities });
  };
  const setField = (key: string, value: string) => {
    if (!onChange) return;
    onChange({ fields: { ...asset.fields, [key]: value } });
  };
  const setMeter = (value: number) => {
    if (!onChange || !asset.conditionMeter) return;
    onChange({
      conditionMeter: { ...asset.conditionMeter, value: clamp(value, 0, asset.conditionMeter.max) },
    });
  };
  const setControl = (key: string, value: number | boolean | string) => {
    if (!onChange) return;
    onChange({ controls: { ...asset.controls, [key]: value } });
  };

  // Collect editable field labels from the definition (options) for input rendering.
  const fieldDefs = def
    ? [...def.options, ...def.abilities.flatMap((a) => a.options)]
    : [];

  // Counter / select controls (non-impact, non-meter) from definition.
  const extraControls = def
    ? [...def.controls, ...def.abilities.flatMap((a) => a.controls)].filter(
        (c) => c.kind === 'counter' || c.kind === 'checkbox',
      )
    : [];

  // Impact checkboxes nested under the condition meter (battered/cursed, etc.)
  const meterImpacts = def
    ? def.controls.flatMap((c) => (c.kind === 'meter' ? (c.impacts ?? []) : []))
    : [];

  return (
    <div className="asset-card" style={{ borderTopColor: color }}>
      <div className="asset-card-head">
        <div>
          <span className="asset-type" style={{ color }}>
            {ASSET_TYPE_LABELS[asset.type]}
          </span>
          <h4>{asset.name}</h4>
        </div>
        {onRemove && (
          <button className="icon-btn" onClick={onRemove} title="Remove">
            ✕
          </button>
        )}
      </div>

      {fieldDefs.length > 0 && (
        <div className="asset-fields">
          {fieldDefs.map((f) => (
            <label key={f.label} className="asset-field">
              <span>{f.label}</span>
              {f.choices && f.choices.length ? (
                <select
                  value={asset.fields[f.label] ?? ''}
                  onChange={(e) => setField(f.label, e.target.value)}
                  disabled={!editable}
                >
                  <option value="">—</option>
                  {f.choices.map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={asset.fields[f.label] ?? ''}
                  onChange={(e) => setField(f.label, e.target.value)}
                  disabled={!editable}
                  placeholder="…"
                />
              )}
            </label>
          ))}
        </div>
      )}

      <div className="asset-abilities">
        {asset.abilities.map((ab, i) => (
          <div key={i} className={`asset-ability ${ab.enabled ? 'on' : 'off'}`}>
            <button
              className={`ability-dot ${ab.enabled ? 'on' : ''}`}
              onClick={() => toggleAbility(i)}
              title={ab.enabled ? 'Enabled' : 'Disabled'}
              disabled={!editable}
            />
            <Markdown className="ability-text">{ab.text}</Markdown>
          </div>
        ))}
      </div>

      {!compact && asset.conditionMeter && (
        <div className="asset-meter">
          <span className="field-label">{asset.conditionMeter.label}</span>
          <div className="row center gap-sm">
            <button className="meter-btn" onClick={() => setMeter(asset.conditionMeter!.value - 1)} disabled={!editable}>
              −
            </button>
            <span className="mono" style={{ minWidth: 30, textAlign: 'center' }}>
              {asset.conditionMeter.value}/{asset.conditionMeter.max}
            </span>
            <button className="meter-btn" onClick={() => setMeter(asset.conditionMeter!.value + 1)} disabled={!editable}>
              +
            </button>
          </div>
        </div>
      )}

      {!compact && (extraControls.length > 0 || meterImpacts.length > 0) && (
        <div className="asset-controls">
          {extraControls.map((c) =>
            c.kind === 'counter' ? (
              <div key={c.key} className="asset-control">
                <span>{c.label}</span>
                <div className="row center gap-sm">
                  <button
                    className="meter-btn sm"
                    onClick={() => setControl(c.key, Math.max(c.min ?? 0, ((asset.controls?.[c.key] as number) ?? 0) - 1))}
                    disabled={!editable}
                  >
                    −
                  </button>
                  <span className="mono">{(asset.controls?.[c.key] as number) ?? 0}</span>
                  <button
                    className="meter-btn sm"
                    onClick={() => setControl(c.key, ((asset.controls?.[c.key] as number) ?? 0) + 1)}
                    disabled={!editable}
                  >
                    +
                  </button>
                </div>
              </div>
            ) : (
              <label key={c.key} className="asset-control checkbox">
                <input
                  type="checkbox"
                  checked={!!asset.controls?.[c.key]}
                  onChange={(e) => setControl(c.key, e.target.checked)}
                  disabled={!editable}
                />
                <span>{c.label}</span>
              </label>
            ),
          )}
          {meterImpacts.map((imp) => (
            <label key={imp.key} className="asset-control checkbox">
              <input
                type="checkbox"
                checked={!!asset.controls?.[imp.key]}
                onChange={(e) => setControl(imp.key, e.target.checked)}
                disabled={!editable}
              />
              <span>{imp.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
