import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

function setCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
}

let supabase = null;

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).end();

  // derive origin (absolute URLs are preferred in sitemaps)
  const origin = process.env.SITE_URL || process.env.DEV_SITE_ORIGIN || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

  // static public pages to include in the sitemap
  const staticPaths = [
    '/',
    '/services',
    '/tarifs',
    '/blog',
    '/about',
    '/contact'
  ];

  // attempt to initialize Supabase admin client; if not available, fall back to static-only sitemap
  if (!supabase && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } catch (e) {
      console.warn('sitemap: supabase init failed', e);
      supabase = null;
    }
  }

  // build entries array
  const urls = [];

  // add static pages
  const now = new Date().toISOString();
  for (const p of staticPaths) {
    urls.push({ loc: `${origin}${p}`, lastmod: now, changefreq: 'weekly', priority: p === '/' ? '1.0' : '0.7' });
  }

  // add blog posts from Supabase (published only when possible)
  if (supabase) {
    try {
      const { data, error } = await supabase.from('blog_posts').select('slug,updated_at,created_at,published').order('updated_at', { ascending: false }).limit(1000);
      if (error) console.warn('sitemap: supabase select error', error.message || error);
      else if (data && data.length) {
        for (const row of data) {
          // only include published posts (if column exists)
          if (typeof row.published !== 'undefined' && !row.published) continue;
          const slug = row.slug || '';
          if (!slug) continue;
          const last = row.updated_at || row.created_at || now;
          const loc = `${origin}/blog/${encodeURIComponent(slug)}`;
          urls.push({ loc, lastmod: new Date(last).toISOString(), changefreq: 'monthly', priority: '0.7' });
        }
      }
    } catch (e) {
      console.warn('sitemap: supabase query exception', e);
    }
  }

  // generate XML
  const xmlParts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];

  for (const u of urls) {
    xmlParts.push('  <url>');
    xmlParts.push(`    <loc>${u.loc}</loc>`);
    if (u.lastmod) xmlParts.push(`    <lastmod>${u.lastmod}</lastmod>`);
    if (u.changefreq) xmlParts.push(`    <changefreq>${u.changefreq}</changefreq>`);
    if (u.priority) xmlParts.push(`    <priority>${u.priority}</priority>`);
    xmlParts.push('  </url>');
  }

  xmlParts.push('</urlset>');
  const xml = xmlParts.join('\n');

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
}
