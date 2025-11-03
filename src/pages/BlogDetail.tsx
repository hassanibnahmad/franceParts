import { useEffect, useState } from 'react';
import { useSeo } from '../lib/seo';
import { Calendar, User } from 'lucide-react';
import { getPostBySlug } from '../lib/blogs';
import type { BlogPost } from '../lib/blogs';

export default function BlogDetail({ slug }: { slug: string }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const p = await getPostBySlug(slug);
        if (p) {
          setPost(p);
          // if featured_image looks like a storage path, request signed url
          // prefer featured_image, fall back to legacy cover_image
          const fv = (p as any).featured_image || (p as any).cover_image;
          if (fv && !/^https?:\/\//i.test(fv)) {
            try {
              const resp = await fetch('/api/signed-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: fv, expires: 60 * 60 }) });
              if (resp.ok) {
                const json = await resp.json().catch(() => ({}));
                if (json?.signedUrl) setImageUrl(json.signedUrl);
              }
            } catch (e) { /* ignore */ }
          } else if (fv) {
            setImageUrl(fv);
          }
        } else {
          setPost(null);
        }
      } catch (e) {
        console.error(e);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  // Update page title/description based on loaded post
  useSeo(
    post ? `${post.title} — France Parts` : 'France Parts | Article — Blog',
    post ? (post.excerpt || `${post.title} - Découvrez cet article sur France Parts.`) : 'Articles et conseils sur l\'entretien automobile, pièces et promotions.'
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) return <div className="min-h-screen pt-20 text-center py-20">Chargement...</div>;
  if (!post) return (
    <div className="min-h-screen pt-20 text-center py-20">
      <h2 className="text-2xl font-bold mb-4">Article introuvable</h2>
      <p>Le contenu demandé est introuvable ou a été supprimé.</p>
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-20 bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
  <h1 className="text-4xl font-bold text-gray-100 mb-4">{post.title}</h1>
        <div className="flex items-center text-sm text-gray-600 mb-8 gap-4">
          <div className="flex items-center"><Calendar className="w-4 h-4 mr-2" />{formatDate(post.created_at)}</div>
          <div className="flex items-center"><User className="w-4 h-4 mr-2" />{post.author}</div>
        </div>

        {imageUrl && (
          <div className="mb-8">
            <img src={imageUrl} alt={post.title} className="w-full h-80 object-cover rounded-lg shadow" />
          </div>
        )}

        {/* Sanitize content to fix common malformed hrefs that accidentally
            contain a duplicate absolute URL (e.g. "https://site.com/https://site.com/...").
            This normalizes such anchors by removing the duplicated prefix so links
            display and navigate correctly. */}
        <div className="prose prose-invert max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: ((): string => {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(post.content || '', 'text/html');
            const anchors = Array.from(doc.querySelectorAll('a')) as HTMLAnchorElement[];
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            anchors.forEach(a => {
              try {
                const raw = a.getAttribute('href') || '';
                if (!raw) return;
                // If the attribute contains two occurrences of an absolute scheme,
                // keep only the latter (e.g. ".../https://..." -> "https://...").
                const schemeMatches = Array.from(raw.matchAll(/https?:\/\//gi));
                if (schemeMatches.length >= 2) {
                  const secondIdx = schemeMatches[1].index ?? raw.indexOf('http', schemeMatches[0].index! + 1);
                  if (secondIdx > 0) {
                    const fixed = raw.substring(secondIdx);
                    a.setAttribute('href', fixed);
                  }
                } else if (origin && raw.startsWith(origin + '/https://')) {
                  // defensive: handle cases where the full origin was prepended once
                  const idx = raw.indexOf('/https://');
                  if (idx >= 0) a.setAttribute('href', raw.substring(idx + 1));
                } else if (raw.includes('/https://') && !raw.startsWith('https://')) {
                  // catch accidental "/https://..." patterns
                  const idx = raw.indexOf('/https://');
                  a.setAttribute('href', raw.substring(idx + 1));
                }
              } catch (e) { /* ignore per-anchor errors */ }
            });
            return doc.body.innerHTML;
          } catch (e) {
            return post.content || '';
          }
        })() }} />
      </div>
    </div>
  );
}
