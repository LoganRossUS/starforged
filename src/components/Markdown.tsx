import { useMemo } from 'react';

// Minimal, dependency-free markdown renderer tuned for Datasworn move/oracle/asset text.
// Supports: headings, bold (__x__ / **x**), italics (_x_ / *x*), bullet lists,
// inline `code`, line breaks, and Datasworn [Label](id:...) links (rendered as label).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(text: string): string {
  let s = escapeHtml(text);
  // Datasworn id links -> just the label, styled as a key term
  s = s.replace(/\[([^\]]+)\]\(id:[^)]+\)/g, '<span class="md-ref">$1</span>');
  // regular links
  s = s.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // italics
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  s = s.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  // inline code
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

function toHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inList = false;
  let inTable = false;
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  const closeTable = () => {
    if (inTable) {
      out.push('</tbody></table>');
      inTable = false;
    }
  };

  for (let raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      closeTable();
      continue;
    }
    // table rows (| a | b |) — render simply, skip separator rows
    if (/^\s*\|.*\|\s*$/.test(line)) {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue; // separator
      const cells = line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => `<td>${inline(c.trim())}</td>`)
        .join('');
      if (!inTable) {
        closeList();
        out.push('<table class="md-table"><tbody>');
        inTable = true;
      }
      out.push(`<tr>${cells}</tr>`);
      continue;
    } else {
      closeTable();
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  closeTable();
  return out.join('\n');
}

export function Markdown({ children, className }: { children: string; className?: string }) {
  const html = useMemo(() => toHtml(children ?? ''), [children]);
  return <div className={`markdown ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
