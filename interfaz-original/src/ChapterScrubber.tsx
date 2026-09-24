import { useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export type Chapter = {
  id: string;
  title: string;
  meta: string;
  description: ReactNode;
};

/** Compact chapter rail adapted to the application's tokens and touch controls. */
export function ChapterScrubber({
  chapters,
  initialId,
  onSelect,
  renderAction,
}: {
  chapters: Chapter[];
  initialId?: string;
  onSelect: (chapter: Chapter) => void;
  renderAction: (chapter: Chapter) => ReactNode;
}) {
  const initial = Math.max(
    0,
    chapters.findIndex((chapter) => chapter.id === initialId),
  );
  const [active, setActive] = useState(initial);
  const [pointer, setPointer] = useState(initial);
  const [engaged, setEngaged] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const touch = useRef(false);
  const id = useId();
  const index = Math.min(active, chapters.length - 1);
  const chapter = chapters[index];
  if (!chapter) return null;
  const select = (next: number) => {
    setActive(next);
    setPointer(next);
    setEngaged(true);
  };
  return (
    <div className="chapter-scrubber">
      <div
        className="chapter-rail"
        role="listbox"
        aria-label="Entradas del historial"
        aria-orientation="vertical"
        onPointerMove={(event) => {
          if (event.pointerType === 'touch') return;
          const first = buttons.current[0]?.getBoundingClientRect();
          if (!first) return;
          const position = Math.max(
            0,
            Math.min(chapters.length - 1, (event.clientY - first.top) / first.height - 0.5),
          );
          setPointer(position);
          setActive(Math.round(position));
          setEngaged(true);
        }}
        onPointerLeave={() => {
          setPointer(index);
          setEngaged(false);
        }}
        onKeyDown={(event) => {
          let next = index;
          if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next++;
          else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next--;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = chapters.length - 1;
          else return;
          event.preventDefault();
          buttons.current[Math.max(0, Math.min(chapters.length - 1, next))]?.focus();
        }}
      >
        {chapters.map((item, i) => {
          const distance = Math.abs(i - pointer);
          const rise = engaged && distance < 4 ? (1 + Math.cos((Math.PI * distance) / 4)) / 2 : 0;
          return (
            <button
              key={item.id}
              ref={(element) => {
                buttons.current[i] = element;
              }}
              type="button"
              role="option"
              className="chapter-tick"
              aria-selected={i === index}
              aria-label={`${item.title}. ${item.meta}`}
              aria-controls={id}
              tabIndex={i === index ? 0 : -1}
              onFocus={() => select(i)}
              onPointerDown={(event) => {
                touch.current = event.pointerType === 'touch';
              }}
              onClick={(event) => {
                select(i);
                // Touch selects a preview; its explicit link opens the record.
                if (!touch.current || event.detail === 0) onSelect(item);
                touch.current = false;
              }}
              style={
                {
                  '--chapter-length': `${14 + rise * 42}px`,
                  '--chapter-opacity': i === index ? 1 : 0.25 + rise * 0.65,
                } as CSSProperties
              }
            >
              <span className="chapter-tick-mark" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className="chapter-preview" id={id}>
        <div className="chapter-preview-content" aria-live="polite" aria-atomic="true">
          <time className="chapter-meta">{chapter.meta}</time>
          <h3>{chapter.title}</h3>
          {chapter.description}
        </div>
        {renderAction(chapter)}
      </div>
    </div>
  );
}
