// Lightweight fetch wrapper to transparently convert PUT/DELETE calls to
// /api/posts/:id into POST _action payloads. This helps older deployed
// client bundles or edge rewrites that block PUT/DELETE to still work.
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  try {
    const originalFetch = window.fetch.bind(window) as typeof fetch;

  (window as any).fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        // Only handle simple string URLs (most app code uses template literals)
        const urlStr = (typeof input === 'string') ? input : (input instanceof Request ? input.url : String(input));
        const method = (init && init.method) ? String(init.method).toUpperCase() : (typeof input === 'object' && input instanceof Request ? input.method.toUpperCase() : 'GET');

        // Match /api/posts/:id (optionally with query/hash) and only for PUT/DELETE
        if ((method === 'PUT' || method === 'DELETE') && /\/api\/posts\/([^\/\?#]+)/.test(urlStr)) {
          const m = urlStr.match(/\/api\/posts\/([^\/\?#]+)/);
          const id = m ? decodeURIComponent(m[1]) : null;
          if (id) {
            // Attempt to parse the original body if present and JSON
            let origBody: any = {};
            try {
              if (init && init.body && typeof init.body === 'string') {
                origBody = JSON.parse(init.body as string) || {};
              }
            } catch (e) {
              // leave origBody as {} if parsing fails
            }

            const action = method === 'PUT' ? 'update' : 'delete';
            const newBody = { _action: action, id, ...origBody };

            const newHeaders: Record<string, string> = {};
            // normalize headers from init
            try {
              const h = init && init.headers ? init.headers : {};
              if (h instanceof Headers) {
                (h as Headers).forEach((v, k) => { newHeaders[k] = v; });
              } else if (Array.isArray(h)) {
                (h as [string,string][]).forEach(([k,v]) => newHeaders[k] = v);
              } else if (typeof h === 'object' && h) {
                Object.assign(newHeaders, h as Record<string,string>);
              }
            } catch (e) { /* ignore header normalization errors */ }

            newHeaders['content-type'] = newHeaders['content-type'] || 'application/json';

            const newInit: RequestInit = Object.assign({}, init || {}, {
              method: 'POST',
              body: JSON.stringify(newBody),
              headers: newHeaders,
            });

            // Send to canonical /api/posts endpoint
            return originalFetch('/api/posts', newInit);
          }
        }
      } catch (e) {
        // on any unexpected error, fall back to original fetch
        // and let the normal error handling take place
      }
      return originalFetch(input as any, init as any);
    };
  } catch (e) {
    // ignore if anything goes wrong while patching
    // (we don't want to break the app)
  }
}

export {};
