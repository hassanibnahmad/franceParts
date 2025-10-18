import React, { useEffect, useRef, useState } from 'react';

type Item = { question: string; answer: string };

export default function Accordion({
  items,
  singleOpen = true,
  autoScroll = true,
  breakpoint = 768,
}: {
  items: Item[];
  singleOpen?: boolean;
  autoScroll?: boolean;
  breakpoint?: number; // px
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);

  const focusButton = (idx: number) => {
    const el = buttonRefs.current[idx];
    el?.focus();
  };

  const toggle = (idx: number) => {
    setOpenIndex((prev) => {
      const next = prev === idx ? null : (singleOpen ? idx : idx);
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const key = e.key;
    const last = items.length - 1;
    if (key === 'ArrowDown') {
      e.preventDefault();
      focusButton((idx + 1) % items.length);
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      focusButton((idx - 1 + items.length) % items.length);
    } else if (key === 'Home') {
      e.preventDefault();
      focusButton(0);
    } else if (key === 'End') {
      e.preventDefault();
      focusButton(last);
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      toggle(idx);
    }
  };

  useEffect(() => {
    // when openIndex changes, update maxHeight for panels and optionally auto-scroll on small screens
    panelRefs.current.forEach((panel, i) => {
      if (!panel) return;
      panel.style.transition = 'max-height 400ms ease';
      if (openIndex === i) {
        panel.style.maxHeight = `${panel.scrollHeight}px`;
        if (autoScroll && window.matchMedia && window.matchMedia(`(max-width: ${breakpoint}px)`).matches) {
          // scroll the panel into view after a tiny delay so the layout has settled
          setTimeout(() => {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 120);
        }
      } else {
        panel.style.maxHeight = '0px';
      }
    });
  }, [openIndex, autoScroll, breakpoint]);

  return (
    <div className="space-y-6" role="list" aria-label="Accordion">
      {items.map((it, i) => (
        <div key={i} className="rounded-3xl p-2 border border-gray-800/20 transition-colors">
          <div className="bg-[#1b1b1b] rounded-2xl p-3">
            <h3>
              <button
                id={`accordion-btn-${i}`}
                ref={(el) => { buttonRefs.current[i] = el; return; }}
                aria-controls={`accordion-panel-${i}`}
                aria-expanded={openIndex === i}
                type="button"
                onClick={() => toggle(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className="w-full flex items-center justify-between text-left gap-4 py-4 px-4 rounded-lg focus:outline-none"
              >
                <span className="font-semibold text-lg text-gray-100">{it.question}</span>
                <svg className={`w-6 h-6 text-[#FFD700] transform transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
            </h3>

            <div id={`accordion-panel-${i}`} role="region" aria-labelledby={`accordion-btn-${i}`} ref={(el) => { panelRefs.current[i] = el; return; }} style={{ maxHeight: 0, overflow: 'hidden' }}>
              <div className="pt-2 pb-4 text-gray-300 leading-relaxed">{it.answer}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
