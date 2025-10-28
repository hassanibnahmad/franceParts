import React, { useState, useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import type { BlogPost } from '../lib/supabase';
import { useToasts } from './Toast';

type Props = {
  initial?: Partial<BlogPost> | null;
  onCancel: () => void;
  onSave: (post: Partial<BlogPost>) => Promise<void>;
  submitLabel?: string;
  uploadToken?: string | null;
};

export default function BlogForm({ initial, onCancel, onSave, submitLabel, uploadToken }: Props) {
  const init = initial ?? {};
  const [title, setTitle] = useState(init.title ?? '');
  // slug is generated server-side; remove from the admin form
  const [excerpt, setExcerpt] = useState(init.excerpt ?? '');
  const [content, setContent] = useState(init.content ?? '');
  // using Quill directly: content is stored as HTML
  const contentRef = useRef<any | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const [featuredImageUrl] = useState(init.featured_image ?? '');
  // Author is fixed for all posts
  const [author] = useState('FranceParts Team');
  const [published, setPublished] = useState(!!init.published);
  const [category, setCategory] = useState((init as any).category ?? '');

  const [file, setFile] = useState<File | null>(null);
  // Only use an initial preview if it's already an absolute URL. If it's a
  // Supabase storage path (not an http(s) URL) we keep preview null until the
  // server provides a signed URL — this avoids rendering a broken <img>
  // with a storage path that the browser can't resolve.
  const initialPreview = (init.featured_image && /^https?:\/\//i.test(String(init.featured_image))) ? String(init.featured_image) : null;
  const [preview, setPreview] = useState<string | null>(initialPreview);
  const [submitting, setSubmitting] = useState(false);
  const { push } = useToasts();

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // When editing an existing post, if the initial featured_image is a storage path
  // (not an absolute URL), request a signed URL from the server so we can show a preview.
  useEffect(() => {
    let cancelled = false;
    const fv = init.featured_image ?? '';
    if (file) return; // don't override when a new file is selected
    if (!fv) return;
    // if already an absolute URL, use it directly
    if (/^https?:\/\//i.test(fv)) {
      setPreview(fv);
      return;
    }

    (async () => {
      try {
        const resp = await fetch('/api/signed-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: fv, expires: 60 * 60 }) });
        if (!resp.ok) return;
        const json = await resp.json().catch(() => ({}));
        if (json?.signedUrl && !cancelled) setPreview(json.signedUrl);
      } catch (e) {
        // ignore — preview will remain empty
        console.warn('failed to fetch signed-url for preview', e);
      }
    })();

    return () => { cancelled = true; };
  }, [file, init.featured_image]);

  const handleFile = (f?: File | null) => {
    if (!f) { setFile(null); setPreview(null); return; }
    setFile(f);
  };

  // Attach rich controls (selection, 8 resize handles, rotation) to an image element.
  const attachImageControls = (img: HTMLImageElement) => {
    try {
      // Avoid double-wrapping
      if (img.closest && img.closest('[data-image-controls]')) return;

      const wrapper = document.createElement('span');
      wrapper.setAttribute('data-image-controls', '1');
      wrapper.style.display = 'inline-block';
      wrapper.style.position = 'relative';
      wrapper.style.lineHeight = '0';
      const parent = img.parentNode as Node | null;
      if (parent) parent.insertBefore(wrapper, img);
      wrapper.appendChild(img);

      // selection box
      const box = document.createElement('div');
      box.style.position = 'absolute';
      box.style.top = '0';
      box.style.left = '0';
      box.style.right = '0';
      box.style.bottom = '0';
      box.style.boxSizing = 'border-box';
      box.style.border = '2px dashed rgba(150,160,180,0.6)';
      box.style.pointerEvents = 'none';
      box.style.borderRadius = '6px';
      wrapper.appendChild(box);

      // handles config: position name and whether to keep aspect ratio
      const handles = [
        { pos: 'nw', x: 0, y: 0, ratio: true },
        { pos: 'n', x: 50, y: 0, ratio: false },
        { pos: 'ne', x: 100, y: 0, ratio: true },
        { pos: 'e', x: 100, y: 50, ratio: false },
        { pos: 'se', x: 100, y: 100, ratio: true },
        { pos: 's', x: 50, y: 100, ratio: false },
        { pos: 'sw', x: 0, y: 100, ratio: true },
        { pos: 'w', x: 0, y: 50, ratio: false },
      ];

      const createHandle = (h: any) => {
        const el = document.createElement('div');
        el.setAttribute('data-handle', h.pos);
        el.style.position = 'absolute';
        el.style.width = '12px';
        el.style.height = '12px';
        // blue square handles with white border to match the screenshot
        el.style.background = '#2b8af6';
        el.style.border = '2px solid #ffffff';
        el.style.boxShadow = '0 0 0 3px rgba(43,138,246,0.08)';
        el.style.borderRadius = '2px';
        el.style.boxSizing = 'border-box';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.left = `${h.x}%`;
        el.style.top = `${h.y}%`;
        el.style.cursor = h.ratio ? 'nwse-resize' : (h.pos === 'n' || h.pos === 's' ? 'ns-resize' : 'ew-resize');
        el.style.display = 'none'; // hidden until image selected
        wrapper.appendChild(el);
        return el;
      };

      const handleEls: HTMLElement[] = handles.map(createHandle);

      // rotation knob (top-center)
      const rot = document.createElement('div');
      rot.style.position = 'absolute';
      rot.style.left = '50%';
      rot.style.top = '-18px';
      rot.style.transform = 'translateX(-50%)';
      rot.style.width = '12px';
      rot.style.height = '12px';
      rot.style.borderRadius = '50%';
      rot.style.background = '#ffd24d';
      rot.style.cursor = 'grab';
      wrapper.appendChild(rot);

  // show controls when image is clicked, hide on outside click
  const show = () => { box.style.display = 'block'; handleEls.forEach(h => h.style.display = 'block'); rot.style.display = 'block'; };
  const hide = () => { box.style.display = 'none'; handleEls.forEach(h => h.style.display = 'none'); rot.style.display = 'none'; };

  // initially hidden until user selects the image
  hide();

  // click on image should show; clicking outside editor should hide
  img.addEventListener('click', (ev) => { ev.stopPropagation(); show(); });
      const onDocClick = (ev: Event) => {
        if (!wrapper.contains(ev.target as Node)) hide();
      };
      document.addEventListener('click', onDocClick);

  // resizing logic
  let startX = 0, startY = 0, startW = 0, startH = 0;
      const onPointerMove = (ev: PointerEvent, handlePos: string, keepRatio: boolean) => {
        try {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          let newW = startW, newH = startH;
          if (handlePos.includes('e')) newW = Math.max(40, Math.round(startW + dx));
          if (handlePos.includes('s')) newH = Math.max(40, Math.round(startH + dy));
          if (handlePos.includes('w')) newW = Math.max(40, Math.round(startW - dx));
          if (handlePos.includes('n')) newH = Math.max(40, Math.round(startH - dy));
          if (keepRatio) {
            const ratio = startW / Math.max(1, startH);
            if (newW / newH > ratio) newH = Math.round(newW / ratio);
            else newW = Math.round(newH * ratio);
          }
          img.style.width = `${newW}px`;
          img.style.height = `${newH}px`;
        } catch (e) { }
      };

      const convertPxToPercent = (imgEl: HTMLImageElement) => {
        try {
          const editorEl = editorContainerRef.current as HTMLDivElement | null;
          const editorWidth = (editorEl && editorEl.clientWidth) ? editorEl.clientWidth : 800;
          const rect = imgEl.getBoundingClientRect();
          const pct = Math.min(100, Math.max(5, Math.round((rect.width / editorWidth) * 100)));
          imgEl.style.width = `${pct}%`;
          imgEl.style.height = 'auto';
          imgEl.setAttribute('data-width-percent', String(pct));
        } catch (e) { /* ignore */ }
      };

      const onPointerUp = (moveFn?: any, finalizer?: (() => void) | null) => {
        try {
          document.removeEventListener('pointermove', moveFn);
          document.removeEventListener('pointerup', onPointerUp as any);
        } catch (e) { }
        try { if (finalizer) finalizer(); } catch (e) { }
      };

      handleEls.forEach((hEl, idx) => {
        const info = handles[idx];
        const down = (ev: PointerEvent) => {
          ev.preventDefault(); ev.stopPropagation();
          startX = ev.clientX; startY = ev.clientY; startW = img.width || img.clientWidth || img.getBoundingClientRect().width; startH = img.height || img.clientHeight || img.getBoundingClientRect().height;
          const moveFn = (e: PointerEvent) => onPointerMove(e, info.pos, !!info.ratio);
          document.addEventListener('pointermove', moveFn as any);
          // on pointerup, finalize sizing to percent
          document.addEventListener('pointerup', () => onPointerUp(moveFn as any, () => convertPxToPercent(img)) as any, { once: true } as any);
        };
        hEl.addEventListener('pointerdown', down as any);
      });

      // rotation logic
  let rotating = false;
      let lastAngle = 0;
      const onRotateMove = (ev: PointerEvent) => {
        if (!rotating) return;
        try {
          const rect = img.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
          img.style.transform = `rotate(${angle}deg)`;
          lastAngle = angle;
        } catch (e) { }
      };
      rot.addEventListener('pointerdown', (ev: PointerEvent) => {
        ev.preventDefault(); ev.stopPropagation(); rotating = true;
        document.addEventListener('pointermove', onRotateMove as any);
        const up = () => { rotating = false; document.removeEventListener('pointermove', onRotateMove as any); try { img.setAttribute('data-rotate', String(Math.round(lastAngle))); } catch (e) { } document.removeEventListener('pointerup', up as any); };
        document.addEventListener('pointerup', up as any);
      });

      // cleanup when wrapper removed
      const obs = new MutationObserver((mutations) => {
        mutations.forEach(m => {
          m.removedNodes.forEach(n => {
            if (n === wrapper) {
              try { document.removeEventListener('click', onDocClick); obs.disconnect(); } catch (e) { }
            }
          });
        });
      });
      obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) { /* ignore control attach errors */ }
  };
  // MARKDOWN editing helpers for the content textarea
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const applyInline = (prefix: string, suffix?: string) => {
    const el = contentRef.current; if (!el) return;
    const s = el.selectionStart ?? 0; const e = el.selectionEnd ?? 0;
    const before = content.slice(0, s);
    const selected = content.slice(s, e);
    const after = content.slice(e);
    const endSuffix = suffix ?? prefix;
    const newContent = before + prefix + selected + endSuffix + after;
    setContent(newContent);
    // restore focus and selection
    requestAnimationFrame(() => {
      el.focus();
      const newPos = e + prefix.length + endSuffix.length;
      el.setSelectionRange(newPos, newPos);
    });
  };

  const applyBlockPrefix = (prefix: string) => {
    const el = contentRef.current; if (!el) return;
    const s = el.selectionStart ?? 0; const e = el.selectionEnd ?? 0;
    // find start indices for selected block
    const startLineIdx = content.lastIndexOf('\n', s - 1) + 1;
    const selected = content.slice(startLineIdx, e);
    const lines = selected.split('\n').map(l => (l.startsWith(prefix) ? l : prefix + l));
    const newContent = content.slice(0, startLineIdx) + lines.join('\n') + content.slice(e);
    setContent(newContent);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + prefix.length, e + prefix.length * lines.length); });
  };

  const applyList = (itemPrefix: string) => {
    const el = contentRef.current; if (!el) return;
    const s = el.selectionStart ?? 0; const e = el.selectionEnd ?? 0;
    const startLineIdx = content.lastIndexOf('\n', s - 1) + 1;
    const selected = content.slice(startLineIdx, e);
    const lines = selected.split('\n').map(l => (l.trim().length === 0 ? l : itemPrefix + l));
    const newContent = content.slice(0, startLineIdx) + lines.join('\n') + content.slice(e);
    setContent(newContent);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + itemPrefix.length, e + itemPrefix.length * lines.length); });
  };

  const applyOrderedList = () => {
    const el = contentRef.current; if (!el) return;
    const s = el.selectionStart ?? 0; const e = el.selectionEnd ?? 0;
    const startLineIdx = content.lastIndexOf('\n', s - 1) + 1;
    const selected = content.slice(startLineIdx, e);
    const lines = selected.split('\n').map((l, i) => (l.trim().length === 0 ? l : `${i + 1}. ${l}`));
    const newContent = content.slice(0, startLineIdx) + lines.join('\n') + content.slice(e);
    setContent(newContent);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + 3, e + 3 * lines.length); });
  };

  const insertLink = () => {
    const el = contentRef.current; if (!el) return;
    const s = el.selectionStart ?? 0; const e = el.selectionEnd ?? 0;
    const selected = content.slice(s, e) || 'link text';
    const url = window.prompt('Enter URL', 'https://');
    if (!url) return;
    const insertion = `[${selected}](${url})`;
    const newContent = content.slice(0, s) + insertion + content.slice(e);
    setContent(newContent);
    requestAnimationFrame(() => { el.focus(); const pos = s + insertion.length; el.setSelectionRange(pos, pos); });
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */

  // Reference helpers to avoid TypeScript "declared but never used" in strict builds.
  void applyInline; void applyBlockPrefix; void applyList; void applyOrderedList; void insertLink; void attachImageControls;

  // Upload helper: multipart/FormData uploader with progress (production-ready)
  const uploadToServer = (f: File, onProgress?: (percent: number) => void): Promise<{ url?: string | null; path?: string | undefined }> => {
    // Try multipart/FormData upload first. If the server responds with a known
    // error about missing multipart support (e.g. 'Server missing optional dependency: formidable'),
    // fall back to sending JSON with base64-encoded content which some servers accept.
    const doMultipart = (): Promise<{ url?: string | null; path?: string | undefined }> => {
      return new Promise((resolve, reject) => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/upload', true);
          if (uploadToken) xhr.setRequestHeader('x-upload-token', uploadToken);
          xhr.onload = () => {
            let json: any = null;
            try { json = JSON.parse(xhr.responseText || '{}'); } catch (e) { json = {}; }
            // If server indicates missing multipart handler, reject with a special flag
            const bodyMsg = (json && (json.error || json.message)) || xhr.responseText || '';
            if (xhr.status >= 500 && /formidable/i.test(bodyMsg)) {
              const err = new Error('ServerMissingFormidable');
              (err as any)._serverMessage = bodyMsg;
              return reject(err);
            }
            if (xhr.status < 200 || xhr.status >= 300) return reject(new Error((json && (json.error || json.message)) || `Upload failed (${xhr.status})`));
            const storagePath = json.path as string | undefined;
            if (json.signedUrl) return resolve({ url: json.signedUrl as string, path: storagePath });
            if (json.publicUrl) return resolve({ url: json.publicUrl as string, path: storagePath });
            return resolve({ url: null as any, path: storagePath });
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.upload.onprogress = (ev) => { if (ev.lengthComputable && typeof onProgress === 'function') { try { onProgress(Math.round((ev.loaded / ev.total) * 100)); } catch (e) {} } };
          const form = new FormData(); form.append('file', f, f.name);
          xhr.send(form);
        } catch (e) { reject(e); }
      });
    };

    const doBase64Json = (): Promise<{ url?: string | null; path?: string | undefined }> => {
      return new Promise((resolve, reject) => {
        try {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('Failed to read file for base64 fallback'));
          reader.onload = async () => {
            try {
              const result = reader.result as string || '';
              // result format: data:<mime>;base64,<data>
              let base64 = result;
              if (base64.startsWith('data:')) {
                base64 = base64.split(',', 2)[1] || '';
              }
              // Some servers expect { filename, data } (base64) — send both keys for compatibility.
              const payload: any = { filename: f.name, data: base64 };
              // include mimeType where supported, but keep `data` as the required property
              if (f.type) payload.mimeType = f.type;
              const resp = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(uploadToken ? { 'x-upload-token': uploadToken } : {}) }, body: JSON.stringify(payload) });
              const json = await resp.json().catch(() => ({}));
              if (!resp.ok) return reject(new Error((json && (json.error || json.message)) || `Upload failed (${resp.status})`));
              const storagePath = json.path as string | undefined;
              if (json.signedUrl) return resolve({ url: json.signedUrl as string, path: storagePath });
              if (json.publicUrl) return resolve({ url: json.publicUrl as string, path: storagePath });
              return resolve({ url: null as any, path: storagePath });
            } catch (e) { reject(e); }
          };
          reader.readAsDataURL(f);
        } catch (e) { reject(e); }
      });
    };

    // Execute: try multipart, if server missing multipart support, fallback to base64 JSON
    return doMultipart().catch((err) => {
      try {
        if ((err as any)?.message === 'ServerMissingFormidable' || /formidable/i.test((err as any)?._serverMessage || (err as any)?.message || '')) {
          console.warn('multipart upload rejected by server; falling back to base64 JSON upload', (err as any)?._serverMessage || err);
          return doBase64Json();
        }
      } catch (e) { /* ignore */ }
      return Promise.reject(err);
    });
  };

  // Convert a data URL (base64) to a File so it can be uploaded via FormData
  const dataURLToFile = (dataurl: string, filename = 'pasted-image.png') => {
    try {
      const arr = dataurl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      return new File([u8arr], filename, { type: mime });
    } catch (e) { return null as any; }
  };

  // initialize Quill editor
  useEffect(() => {
  const container = editorContainerRef.current;
  if (!container) return;

  // Clear any previous DOM left behind (defensive against duplicate toolbars)
  try { container.innerHTML = ''; } catch (e) { /* ignore */ }

  // avoid double-init
  if ((container as any).__quill) return;

    // custom toolbar: remove the image button and add a color picker control
    const toolbarOptions = {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', { color: [] }],
        ['clean']
      ],
      handlers: {
        // custom link handler: prompt for a URL and ensure it has a protocol
        // This avoids links being inserted without http(s):// which can behave
        // unexpectedly when rendered or clicked.
        link: function(this: any, value: any) {
          try {
            const quillInstance = (this as any).quill as Quill;
            const range = quillInstance.getSelection && quillInstance.getSelection();
            // If no selection, do nothing
            if (!range) return;
            // Prompt for URL (pre-fill with selection text if it looks like a URL)
            const selectedText = quillInstance.getText(range.index, range.length) || '';
            let input = window.prompt('Enter URL', selectedText.startsWith('http') ? selectedText : 'https://');
            if (input == null) return; // cancelled
            input = String(input).trim();
            if (!input) return;
            // Add protocol if missing
            if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(input)) {
              input = 'https://' + input.replace(/^https?:\/\//i, '');
            }
            // Apply the link format to the selection
            quillInstance.format('link', input);
          } catch (e) {
            // fallback: let Quill handle it
            try { (this as any).quill.format('link', value); } catch (er) { /* ignore */ }
          }
        }
      }
    } as any;

    // Initialize Quill with our toolbar and handlers
    const quill = new Quill(container, {
      modules: { toolbar: toolbarOptions },
      theme: 'snow',
    });

    // expose on the container for other handlers to find
    try { (container as any).__quill = quill; } catch (e) { /* ignore */ }

      // set initial content if provided
      try { if (init.content) quill.root.innerHTML = init.content as string; } catch (e) { /* ignore */ }

    // handler to sync content back to React state
    const handleTextChange = () => {
      try { setContent(quill.root.innerHTML); } catch (e) { /* ignore */ }
    };

    // intercept image inserts (paste/drop/insert) and treat the image as the single featured image
    quill.on('text-change', (delta: any) => {
      try {
        if (!delta || !delta.ops) return;
        for (const op of delta.ops) {
          if (op.insert && op.insert.image) {
            const src = op.insert.image as string;
            // find any matching img nodes in the editor and remove them, but use the src as the featured preview
            setTimeout(() => {
              try {
                const imgs = Array.from(quill.root.querySelectorAll(`img[src="${src}"]`)) as HTMLImageElement[];
                if (imgs.length === 0) return;
                const img = imgs[0];
                // set preview; if it's a data URL convert to File on submit
                setPreview(img.src);
                setFile(null);
                push({ type: 'success', message: 'Image sélectionnée comme image mise en avant.' });
                // remove the inline image from the editor
                try { img.remove(); } catch (e) { /* ignore */ }
              } catch (e) { /* ignore */ }
            }, 20);
          }
        }
      } catch (e) { /* ignore */ }
    });

    quill.on('text-change', handleTextChange);

    return () => {
      try { quill.off('text-change', handleTextChange); } catch (e) { /* ignore */ }
      try { quill.disable(); } catch (e) { /* ignore */ }
      try { if (container) (container as any).__quill = null; } catch (e) { /* ignore */ }
      // clear container DOM so remount doesn't accumulate toolbars
      try { if (container) container.innerHTML = ''; } catch (e) { /* ignore */ }
      contentRef.current = null;
    };
    // run only once on mount/unmount; do NOT depend on `content` to avoid re-initializing
  }, []);

  

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) { push({ type: 'error', message: 'Le titre est requis.' }); return; }
    setSubmitting(true);
    try {
      let imageUrl = featuredImageUrl || '';
      // If the admin selected an image via the editor (preview may be a data: or blob: URL)
      // try to convert it to a File so we can upload it. Otherwise if a File was chosen via the file input, use that.
      let toUpload: File | null = file;
      if (!toUpload && preview) {
        if (preview.startsWith('data:')) {
          toUpload = dataURLToFile(preview, 'cover.png');
        } else if (preview.startsWith('blob:')) {
          try {
            const resp = await fetch(preview);
            const b = await resp.blob();
            toUpload = new File([b], 'cover.png', { type: b.type || 'image/png' });
          } catch (e) { /* ignore */ }
        }
      }

      if (toUpload) {
        try {
          const res = await uploadToServer(toUpload);
          // prefer storing the storage path in the DB when available for consistency; otherwise store a usable URL
          if (res?.path) imageUrl = res.path;
          else if (res?.url) imageUrl = res.url;
        } catch (err: any) {
          // Log technical details to console for debugging, show a generic toast to the user
          console.error('upload-to-server error', err);
          push({ type: 'error', message: 'Échec de l\'upload de l\'image. Vérifiez le serveur.' });
        }
      } else {
        // If preview is an external http URL, use it directly (no upload needed)
        if (!file && preview && /^https?:\/\//i.test(preview)) imageUrl = preview;
      }

      // Normalize image sizes in the content to percentage-based widths (responsive)
      const normalizeImageSizes = (html: string) => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const imgs = Array.from(doc.querySelectorAll('img')) as HTMLImageElement[];
          const editorEl = editorContainerRef.current as HTMLDivElement | null;
          const editorWidth = (editorEl && editorEl.clientWidth) ? editorEl.clientWidth : 800;
          imgs.forEach(img => {
            try {
              // prefer explicit style width px or percent
              const style = img.getAttribute('style') || '';
              let widthPx: number | null = null;
              const mPx = style.match(/width:\s*([0-9]+)px/);
              const mPct = style.match(/width:\s*([0-9]+(?:\.[0-9]+)?)%/);
              if (mPx) widthPx = parseInt(mPx[1], 10);
              else if (mPct) widthPx = Math.round(parseFloat(mPct[1]) * (editorWidth / 100));
              else if (img.width) widthPx = img.width;
              // if still unknown, try naturalWidth scaled by current display
              if (!widthPx && img.naturalWidth && img.naturalHeight && img.clientWidth) widthPx = img.clientWidth;
              if (!widthPx) return;
              const pct = Math.min(100, Math.max(5, Math.round((widthPx / editorWidth) * 100)));
              img.style.width = `${pct}%`;
              img.style.height = 'auto';
            } catch (e) { /* ignore per-image errors */ }
          });
          // Remove any <img> tags from the content — the editor should not save inline images.
          try { doc.querySelectorAll('img').forEach(n => n.remove()); } catch (e) { /* ignore */ }
          return doc.body.innerHTML;
        } catch (e) { return html; }
      };

      const finalContent = normalizeImageSizes(content.trim());

      const post: Partial<BlogPost> & { category?: string } = {
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: finalContent,
        featured_image: imageUrl,
        // enforce canonical author
        author: 'FranceParts Team',
        published,
      };
  // NOTE: do not include legacy `cover_image` field here because some servers
  // may not have that column in the database schema and will return 500 errors.
  // The server should accept `featured_image` (preferred). If you control the
  // API and want `cover_image` support, add the column server-side.
      if (category) post.category = category.trim();

      await onSave(post);
    } catch (err) {
      // Log the full error to console for diagnostics and show a generic message to the admin
      console.error('save post error', err);
      push({ type: 'error', message: 'Erreur lors de l\'enregistrement. Vérifiez la console pour plus de détails.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
      {/* Inject a few styles so the Quill toolbar stays on one row and images are responsive */}
      <style>{`
        /* Keep the toolbar on a single line with horizontal scroll when needed */
        .ql-toolbar {
          white-space: nowrap !important;
          overflow-x: auto !important;
          background: #0b1b2b !important;
          border: 1px solid #1f2940 !important;
          border-radius: 6px 6px 0 0 !important;
          padding: 4px 4px 20px 4px !important;
          height: auto !important;
        }
        .ql-toolbar .ql-formats { display: inline-flex !important; gap: 6px; align-items: center; }

        /* Toolbar controls styling */
        .ql-toolbar button, .ql-toolbar .ql-picker {
          background: transparent !important;
          border: none !important;
          color: #93a2b6 !important;
          box-shadow: none !important;
        }
        .ql-toolbar button:hover, .ql-toolbar .ql-picker:hover { color: #ffd24d !important; }
        .ql-toolbar .ql-active { color: #ffd24d !important; }

        /* SVG icon strokes/fills */
        .ql-toolbar .ql-stroke { stroke: #93a2b6 !important; }
        .ql-toolbar .ql-fill { fill: #93a2b6 !important; }
        .ql-toolbar .ql-stroke.ql-fill, .ql-toolbar .ql-fill.ql-stroke { fill: #93a2b6 !important; stroke: #93a2b6 !important; }
        .ql-toolbar .ql-active .ql-stroke, .ql-toolbar .ql-active .ql-fill { stroke: #ffd24d !important; fill: #ffd24d !important; }

        /* Picker dropdowns */
        .ql-picker-options { background: #081220 !important; color: #e6edf3 !important; border: 1px solid #1f2940 !important; }
        .ql-picker-label { color: #93a2b6 !important; }

        /* Editor/container styling to match dark admin theme */
        .ql-container { background: transparent !important; color: #e6edf3 !important; border-radius: 0 0 6px 6px !important; border: 1px solid #1f2940 !important; }
        .ql-editor { min-height: 180px; color: #e6edf3 !important; background: transparent !important; padding: 12px !important; }
        .ql-editor p { margin: 0 0 0.75rem 0; }
        .ql-editor h1, .ql-editor h2, .ql-editor h3 { color: #ffffff !important; }
        .ql-editor img { max-width: 100% !important; height: auto !important; display:block; margin: 0.5rem 0; }

        /* Compact spacing */
        .ql-toolbar button, .ql-toolbar .ql-picker { margin: 0 6px !important; padding: 4px !important; }

        /* Tooltip/link editor styling */
        .ql-tooltip { background: #081220 !important; color: #e6edf3 !important; border: 1px solid #1f2940 !important; }

        /* Remove default white background from the editor container wrapper */
        .ql-snow .ql-toolbar.ql-snow, .ql-snow .ql-container.ql-snow { background: transparent; }
      `}</style>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-100">{initial ? 'Modifier l\'article' : 'Nouvel article'}</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-yellow-500 font-medium mb-2">Titre *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100" required />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Catégorie</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700">
            <option value="">-- Choisir une catégorie --</option>
            <option value="pièces">Pièces</option>
            <option value="conseils">Conseils</option>
            <option value="nouveautés">Nouveautés</option>
            <option value="promotions">Promotions</option>
            <option value="guides">Guides</option>
            <option value="technique">Technique</option>
            <option value="information">Information</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Extrait</label>
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700" />
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Contenu</label>

          {/* Quill WYSIWYG editor (initialized imperatively) */}
          <div className="mb-2 border border-gray-700 rounded">
            <div ref={editorContainerRef} className="rounded" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Image mise en avant</label>
          <div className="flex items-center gap-3">
            <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} className="text-sm text-gray-300" />
            {preview && (<img src={preview} alt="preview" className="w-28 h-20 object-cover rounded-md border border-gray-700" />)}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="w-1/3">
            <label className="block text-sm text-gray-300 mb-1">Visibilité</label>
            <select
              value={published ? 'public' : 'private'}
              onChange={(e) => setPublished(e.target.value === 'public')}
              className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700"
            >
              <option value="public">Public</option>
              <option value="private">Privé</option>
            </select>
          </div>

          <div className="w-1/2">
            <label className="block text-sm text-gray-300 mb-1">Auteur</label>
            <input value={author} readOnly className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700 opacity-70 cursor-not-allowed" />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 text-gray-200 rounded">Annuler</button>
          <button type="submit" disabled={submitting || !title.trim()} className={`px-4 py-2 rounded font-semibold ${submitting || !title.trim() ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-yellow-500 text-black'}`}>{submitLabel ?? (initial ? 'Enregistrer les modifications' : 'Enregistrer')}</button>
        </div>
      </form>
    </div>
  );
}
