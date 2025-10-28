import { supabase } from './supabase'
import type { BlogPost as SupabaseBlogPost } from './supabase'

export type BlogPost = SupabaseBlogPost

export async function listPosts(opts?: { published?: boolean; category?: string | null; q?: string }): Promise<BlogPost[]> {
  let query = supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
  if (opts?.published !== undefined) {
    query = query.eq('published', opts.published)
  }

  // category filter (exact match)
  if (opts?.category) {
    query = query.eq('category', opts.category)
  }

  // simple text search across title and excerpt
  if (opts?.q) {
    const q = opts.q.trim()
    if (q.length > 0) {
      // use ilike to perform case-insensitive partial match on title or excerpt
      // the .or() accepts a comma-separated list of expressions
      const expr = `title.ilike.%${q}%,excerpt.ilike.%${q}%`
      query = query.or(expr)
    }
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as BlogPost[]
}

export async function getPost(id: string): Promise<BlogPost | null> {
  const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).single()
  if (error) throw error
  return (data ?? null) as BlogPost | null
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  // Try to find by slug first. Use maybeSingle to avoid throwing when none found.
  const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (data) return data as BlogPost;

  // Fallback: some older posts may not have slug set. Try to interpret the slug as a
  // title-derived slug (decode, replace hyphens with spaces) and find by title.
  try {
    const decoded = decodeURIComponent(String(slug || '')).replace(/-/g, ' ').trim();
    if (!decoded) return null;

    // 1) Try exact title match (case-sensitive equality). If your DB uses different
    // casing, consider normalizing instead.
    let res = await supabase.from('blog_posts').select('*').eq('title', decoded).maybeSingle();
    if (res.error) throw res.error;
    if (res.data) return res.data as BlogPost;

    // 2) Try a case-insensitive partial match as a last resort.
    const approx = await supabase.from('blog_posts').select('*').ilike('title', `%${decoded}%`).limit(1).maybeSingle();
    if (approx.error) throw approx.error;
    if (approx.data) return approx.data as BlogPost;
  } catch (e) {
    // ignore fallback errors and return null below
    console.warn('getPostBySlug fallback error', e);
  }

  return null;
}

export async function createPost(post: Partial<BlogPost>): Promise<BlogPost> {
  const { data, error } = await supabase.from('blog_posts').insert([post]).select().single()
  if (error) throw error
  return data as BlogPost
}

export async function updatePost(id: string, updates: Partial<BlogPost>): Promise<BlogPost> {
  const { data, error } = await supabase.from('blog_posts').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as BlogPost
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) throw error
}
