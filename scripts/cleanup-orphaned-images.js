// Usage:
// set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env, then:
// node scripts/cleanup-orphaned-images.js --dry-run
// or to actually delete:
// node scripts/cleanup-orphaned-images.js --delete

(async () => {
  const args = process.argv.slice(2);
  const doDelete = args.includes('--delete');
  const dryRun = !doDelete;

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Fetching blog_posts featured_image/cover_image fields...');
    const { data: posts, error: postsErr } = await supabase
      .from('blog_posts')
      .select('id,featured_image,cover_image');
    if (postsErr) {
      console.error('Failed to fetch posts:', postsErr);
      process.exit(1);
    }

    // helper: extract storage path inside bucket from stored URL
    const extractStoragePath = (featured) => {
      if (!featured) return null;
      try {
        const s = String(featured);
        const idx = s.indexOf('/blog-images/');
        if (idx !== -1) return s.substring(idx + '/blog-images/'.length);
        const m = s.match(/\/object\/(?:public|sign)\/[\w-]+\/(.+)$/);
        if (m) return m[1];
      } catch (e) { /* ignore */ }
      return null;
    };

    const referenced = new Set();
    for (const p of posts || []) {
      const f1 = extractStoragePath(p.featured_image);
      const f2 = extractStoragePath(p.cover_image);
      if (f1) referenced.add(f1);
      if (f2) referenced.add(f2);
    }

    console.log('Referenced storage paths found:', referenced.size);

    // List files under 'posts' folder in the bucket
    const bucket = 'blog-images';
    let files = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list('posts', { limit, offset });
      if (error) {
        console.error('Failed to list storage files:', error);
        process.exit(1);
      }
      if (!data || data.length === 0) break;
      files = files.concat(data);
      if (data.length < limit) break;
      offset += data.length;
    }

    // Build full paths (posts/<name>) for comparison
    const storagePaths = files.map(f => `posts/${f.name}`);

    const orphaned = storagePaths.filter(p => !referenced.has(p));

    console.log(`Found ${storagePaths.length} files in ${bucket}/posts, ${orphaned.length} orphaned.`);
    if (orphaned.length === 0) {
      console.log('No orphaned files to remove.');
      process.exit(0);
    }

    if (dryRun) {
      console.log('Dry run mode — the following files appear orphaned and would be removed if run with --delete:');
      orphaned.forEach(p => console.log('  ', p));
      console.log('\nTo delete them, re-run with --delete and ensure SUPABASE_SERVICE_ROLE_KEY is set.');
      process.exit(0);
    }

    console.log('Deleting orphaned files...');
    const chunkSize = 50;
    for (let i = 0; i < orphaned.length; i += chunkSize) {
      const chunk = orphaned.slice(i, i + chunkSize);
      try {
        const { error } = await supabase.storage.from(bucket).remove(chunk);
        if (error) {
          console.error('Error removing chunk:', error);
        } else {
          console.log(`Removed ${chunk.length} files`);
        }
      } catch (e) {
        console.error('Exception removing chunk:', e);
      }
    }

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Script error', err);
    process.exit(1);
  }
})();