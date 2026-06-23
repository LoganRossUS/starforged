import { useState, useEffect } from 'react';
import { useStore } from '@/store/store';
import { SectionBanner } from '@/components/ui';
import { Markdown } from '@/components/Markdown';
import './notes.css';

export function NotesView() {
  const notes = useStore((s) => s.campaign.notes);
  const addNote = useStore((s) => s.addNote);
  const updateNote = useStore((s) => s.updateNote);
  const removeNote = useStore((s) => s.removeNote);

  const [activeId, setActiveId] = useState<string>(notes[0]?.id ?? '');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!notes.find((n) => n.id === activeId) && notes.length) setActiveId(notes[0].id);
  }, [notes, activeId]);

  const active = notes.find((n) => n.id === activeId);

  return (
    <div>
      <SectionBanner
        title="Notes"
        right={
          <button
            className="btn sm"
            onClick={() => {
              const id = addNote({ title: 'New Note', body: '' });
              setActiveId(id);
            }}
          >
            + New Note
          </button>
        }
      />
      <div className="notes-layout">
        <div className="notes-list">
          {notes.map((n) => (
            <button
              key={n.id}
              className={`note-item ${n.id === activeId ? 'active' : ''}`}
              onClick={() => setActiveId(n.id)}
            >
              <span className="note-item-title">{n.title || 'Untitled'}</span>
              <span className="note-item-date">{new Date(n.updatedAt).toLocaleDateString()}</span>
            </button>
          ))}
          {notes.length === 0 && <div className="muted" style={{ padding: 12 }}>No notes yet.</div>}
        </div>

        {active ? (
          <div className="note-editor">
            <div className="note-editor-head">
              <input
                className="note-title-input"
                value={active.title}
                onChange={(e) => updateNote(active.id, { title: e.target.value })}
                placeholder="Note title"
              />
              <div className="row gap-sm">
                <button className={`chip-toggle ${preview ? '' : 'on'}`} onClick={() => setPreview(false)}>
                  Edit
                </button>
                <button className={`chip-toggle ${preview ? 'on' : ''}`} onClick={() => setPreview(true)}>
                  Preview
                </button>
                <button
                  className="icon-btn"
                  onClick={() => {
                    if (confirm('Delete this note?')) removeNote(active.id);
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
            {preview ? (
              <div className="note-preview">
                <Markdown>{active.body}</Markdown>
              </div>
            ) : (
              <textarea
                className="note-body"
                value={active.body}
                onChange={(e) => updateNote(active.id, { body: e.target.value })}
                placeholder="Write in Markdown… Oracle and dice results can be sent here from their panels."
              />
            )}
          </div>
        ) : (
          <div className="empty-state">Select or create a note.</div>
        )}
      </div>
    </div>
  );
}
