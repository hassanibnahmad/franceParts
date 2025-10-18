import { supabase } from './supabase'
import type { BlogPost as SupabaseBlogPost } from './supabase'

export type BlogPost = SupabaseBlogPost

export async function listPosts(opts?: { published?: boolean }): Promise<BlogPost[]> {
  let query = supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
  if (opts?.published !== undefined) {
    query = query.eq('published', opts.published)
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
