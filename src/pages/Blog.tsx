import { useEffect, useState } from 'react';
import { Calendar, User, ArrowRight } from 'lucide-react';
import { listPosts } from '../lib/blogs';
import type { BlogPost } from '../lib/blogs';

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageMap, setImageMap] = useState<Record<string, string>>({}); // postId -> url
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({}); // postId -> loaded
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchPosts();
  }, []);

  // refetch when filters change
  useEffect(() => {
    // small optimization: if initial load still running, fetchPosts already called; still safe to call again
    fetchPosts();
  }, [categoryFilter, searchQuery]);

  const fetchPosts = async () => {
    setLoading(true);
    const opts: any = { published: true };
    if (categoryFilter) opts.category = categoryFilter;
    if (searchQuery) opts.q = searchQuery;
    const data = await listPosts(opts);
    setPosts(data);
    // Resolve any storage-path featured_image values to signed URLs
    resolveSignedUrls(data);
    setLoading(false);
  };

  const resolveSignedUrls = async (items: BlogPost[]) => {
    if (!items || items.length === 0) return;
    const toFetch: { id: string; path: string }[] = [];
    for (const p of items) {
      // support either `featured_image` or legacy `cover_image`
      const fv = (p as any).featured_image || (p as any).cover_image;
      if (!fv) continue;
      // Heuristic: if it doesn't look like an http(s) url, treat as storage path
      if (!/^https?:\/\//i.test(fv)) {
        toFetch.push({ id: String(p.id), path: fv });
      }
    }
    if (toFetch.length === 0) return;

    const newMap: Record<string, string> = {};
    await Promise.all(toFetch.map(async (t) => {
      try {
        const resp = await fetch('/api/signed-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: t.path, expires: 60 * 60 }) });
        if (!resp.ok) return;
        const json = await resp.json().catch(() => ({}));
        if (json?.signedUrl) newMap[t.id] = json.signedUrl;
      } catch (e) { /* ignore per-item error */ }
    }));

    if (Object.keys(newMap).length > 0) setImageMap(prev => ({ ...prev, ...newMap }));
  };

  const markImageLoaded = (id: string) => setLoadedImages(prev => (prev[id] ? prev : { ...prev, [id]: true }));
  const markImageErrored = (id: string) => setLoadedImages(prev => (prev[id] ? prev : { ...prev, [id]: true }));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen pt-20 pb-20">
  <div className="bg-gradient-to-br from-black to-gray-900 py-24 bg-squares">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-100 mb-6">
            Actualités & <span className="text-yellow-500">Conseils Auto</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Retrouvez nos articles sur l'entretien, les nouveautés et les bons plans automobiles
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        {/* Filters: category select and search */}
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-1/2">
            <input
              type="search"
              placeholder="Rechercher un article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-1/3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700"
            >
              <option value="">Toutes les catégories</option>
              <option value="pièces">Pièces</option>
              <option value="conseils">Conseils</option>
              <option value="nouveautés">Nouveautés</option>
              <option value="promotions">Promotions</option>
              <option value="guides">Guides</option>
              <option value="technique">Technique</option>
              <option value="information">Information</option>
            </select>
          </div>
        </div>
        {loading ? (
          // Skeleton grid while loading posts and images
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl shadow-xl overflow-hidden">
                <div className="h-48 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse" />
                <div className="p-6">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-3 animate-pulse" />
                  <div className="h-3 bg-gray-700 rounded w-1/2 mb-4 animate-pulse" />
                  <div className="h-3 bg-gray-700 rounded w-2/3 mb-2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => {
              // compute a slug to use in links: prefer stored slug, otherwise derive from title
              const makeSlug = (s: string) => encodeURIComponent(String(s || '').toLowerCase().trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-'));
              const slugPart = post.slug ? post.slug : makeSlug(post.title);

              const imgSrc = (imageMap[String(post.id)] ?? ((post as any).featured_image || (post as any).cover_image)) as string | undefined;
              const hasImage = !!imgSrc && /^https?:\/\//i.test(String(imgSrc));
              const isLoaded = Boolean(loadedImages[String(post.id)]) || !hasImage;

              return (
                <article
                  key={post.id}
                  className={`bg-gray-800 rounded-xl shadow-xl overflow-hidden transition-all duration-500 transform ${isLoaded ? 'opacity-100 translate-y-0 shadow-2xl' : 'opacity-0 translate-y-4'} group`}
                  aria-hidden={!isLoaded}
                >
                  {/* Render image only when we have a usable URL: either a signed URL
                      resolved into imageMap, or an absolute http(s) URL already stored
                      in the post. If the DB stores a storage path (e.g. "blog-images/...")
                      we wait for the signed-url resolver to populate imageMap; this
                      avoids showing broken image icons for raw storage paths. */}
                  {hasImage ? (
                    <div className="h-48 overflow-hidden bg-gray-900 flex items-center justify-center">
                      {/* skeleton until loaded */}
                      {!isLoaded && (
                        <div className="w-full h-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse" />
                      )}
                      <img
                        src={imgSrc}
                        alt={post.title}
                        onLoad={() => markImageLoaded(String(post.id))}
                        onError={() => markImageErrored(String(post.id))}
                        className={`w-full h-full object-cover ${isLoaded ? 'group-hover:scale-110 transition-transform duration-500' : 'hidden'}`}
                      />
                    </div>
                  ) : (
                    // no image: keep the card visible immediately with a subtle header
                    <div className="h-48 bg-gray-800" />
                  )}
                  <div className="p-6">
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(post.created_at)}
                      </div>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {post.author}
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-100 mb-3 group-hover:text-yellow-500 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-gray-600 mb-4 leading-relaxed">{post.excerpt}</p>

                    <a
                      href={`/blog/${slugPart}`}
                      className="inline-flex items-center text-yellow-500 font-bold hover:text-yellow-600 transition-colors"
                    >
                      Lire la suite
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl shadow-xl p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Aucun article pour le moment</h2>
            <p className="text-gray-600">
              De nouveaux articles seront bientôt disponibles. Revenez prochainement !
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
