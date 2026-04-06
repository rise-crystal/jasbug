import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !url.startsWith('http')) {
    return null;
  }
  return url;
}

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance) {
    const url = getSupabaseUrl();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (url && anonKey) {
      supabaseInstance = createClient(url, anonKey);
    }
  }
  return supabaseInstance;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseAdminInstance) {
    const url = getSupabaseUrl();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && serviceKey) {
      supabaseAdminInstance = createClient(url, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }
  return supabaseAdminInstance;
}

/**
 * Upload file ke Supabase Storage
 * @param file File object dari input
 * @param bucket Bucket name (default: 'payment-proofs')
 * @param path Path di dalam bucket
 */
export async function uploadFile(
  file: File,
  bucket: string = 'payment-proofs',
  path?: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { url: null, error: 'Supabase client not initialized' };
  }

  try {
    // Generate unique filename jika tidak ada path
    const fileName = path || `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
    const filePath = `proofs/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('Upload error:', error);
    return { url: null, error: 'Upload failed' };
  }
}

