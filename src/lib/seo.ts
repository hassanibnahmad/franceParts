import { useEffect } from 'react';

/**
 * Simple SEO helper to set document title and meta description in SPA pages.
 * Restores previous values on unmount.
 */
export function useSeo(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    const meta = (() => {
      let m = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!m) {
        m = document.createElement('meta');
        m.name = 'description';
        document.head.appendChild(m);
      }
      return m;
    })();
    const prevDesc = meta?.content || '';

    if (title) document.title = title;
    if (meta && description) meta.content = description;

    return () => {
      document.title = prevTitle;
      if (meta) meta.content = prevDesc;
    };
  }, [title, description]);
}
