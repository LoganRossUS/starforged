import './oracles.css';
import { useMemo, useState } from 'react';
import { SectionBanner, HexPanel } from '@/components/ui';
import { Markdown } from '@/components/Markdown';
import { useDice, ODDS } from '@/features/dice/diceStore';
import {
  oracles,
  flattenOracleTables,
  type OracleNode,
  type OracleTable,
  type OracleRow,
} from '@/content';

function rollTable(table: OracleTable) {
  useDice.getState().setupOracle({ label: table.name, tableId: table.id }, true);
}

function formatRange(row: OracleRow): string {
  if (row.min === null || row.max === null) return '—';
  return row.min === row.max ? String(row.min) : `${row.min}–${row.max}`;
}

// ---- Full-table preview (rows + ranges) ----
function TablePreview({ table }: { table: OracleTable }) {
  return (
    <div className="oracle-preview">
      <table className="oracle-rows">
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              <td className="oracle-range">{formatRange(row)}</td>
              <td className="oracle-text">
                <Markdown>{row.text}</Markdown>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- A single table leaf: roll + preview disclosure ----
function TableLeaf({ table, depth }: { table: OracleTable; depth: number }) {
  const [show, setShow] = useState(false);
  return (
    <div className="oracle-leaf" style={{ ['--depth' as string]: depth }}>
      <div className="oracle-leaf-row">
        <button className="oracle-leaf-name" onClick={() => rollTable(table)} title="Roll this oracle">
          <span className="oracle-leaf-label">{table.name}</span>
          <span className="oracle-leaf-dice">{table.dice}</span>
        </button>
        <button
          className={`btn sm ghost oracle-preview-toggle ${show ? 'on' : ''}`}
          onClick={() => setShow((v) => !v)}
          aria-expanded={show}
        >
          {show ? 'Hide table' : 'Show table'}
        </button>
      </div>
      {show && <TablePreview table={table} />}
    </div>
  );
}

// ---- A collapsible collection ----
function CollectionNode({ node, depth }: { node: OracleNode; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  if (node.kind === 'table') {
    return <TableLeaf table={node} depth={depth} />;
  }
  return (
    <div className="oracle-collection" style={{ ['--depth' as string]: depth }}>
      <button className="oracle-collection-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={`oracle-caret ${open ? 'open' : ''}`}>▸</span>
        <span className="oracle-collection-name">{node.name}</span>
        <span className="pill oracle-count">{node.children.length}</span>
      </button>
      {open && (
        <div className="oracle-children">
          {node.children.map((child) => (
            <CollectionNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Build a map of tableId -> ancestor collection names for search matching ----
function buildAncestry(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const walk = (nodes: OracleNode[], trail: string[]) => {
    for (const n of nodes) {
      if (n.kind === 'table') map.set(n.id, trail);
      else walk(n.children, [...trail, n.name]);
    }
  };
  walk(oracles, []);
  return map;
}

export function OracleBrowser() {
  const [query, setQuery] = useState('');
  const allTables = useMemo(() => flattenOracleTables(), []);
  const ancestry = useMemo(() => buildAncestry(), []);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return allTables.filter((t) => {
      if (t.name.toLowerCase().includes(q)) return true;
      const trail = ancestry.get(t.id) ?? [];
      return trail.some((name) => name.toLowerCase().includes(q));
    });
  }, [q, allTables, ancestry]);

  return (
    <div className="oracle-browser">
      <SectionBanner title="Oracles" />

      <HexPanel className="oracle-ask" accent="var(--cyan)">
        <div className="section-title">Ask the Oracle</div>
        <p className="muted oracle-ask-hint">Pose a yes/no question, pick the odds, and roll.</p>
        <div className="row wrap gap-sm oracle-odds">
          {ODDS.map((o) => (
            <button
              key={o.label}
              className="chip-toggle"
              onClick={() =>
                useDice
                  .getState()
                  .setupYesNo({ label: 'Ask the Oracle', odds: o.value, oddsLabel: o.label }, true)
              }
              title={`Yes on a d100 roll of ${o.value} or less`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </HexPanel>

      <HexPanel className="oracle-tables">
        <div className="oracle-search">
          <input
            type="text"
            placeholder="Search oracle tables…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {q && (
            <button className="btn sm ghost" onClick={() => setQuery('')}>
              Clear
            </button>
          )}
        </div>

        {q ? (
          <div className="oracle-results">
            <div className="muted oracle-results-count">
              {results.length} {results.length === 1 ? 'table' : 'tables'} found
            </div>
            {results.length === 0 ? (
              <div className="dim oracle-empty">No oracle tables match “{query}”.</div>
            ) : (
              results.map((t) => {
                const trail = ancestry.get(t.id) ?? [];
                return (
                  <div className="oracle-result" key={t.id}>
                    {trail.length > 0 && <div className="muted oracle-trail">{trail.join(' › ')}</div>}
                    <TableLeaf table={t} depth={0} />
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="oracle-tree">
            {oracles.map((node) => (
              <CollectionNode key={node.id} node={node} depth={0} />
            ))}
          </div>
        )}
      </HexPanel>
    </div>
  );
}
