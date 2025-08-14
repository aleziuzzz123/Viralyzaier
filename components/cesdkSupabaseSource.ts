import { supabase } from '../services/supabaseClient';

type AssetKind = 'image' | 'video' | 'audio';
const BUCKET = 'assets'; // change if your bucket name differs

function extToKind(name: string): AssetKind {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['mp4','mov','webm'].includes(ext)) return 'video';
  if (['mp3','m4a','wav','aac','ogg'].includes(ext)) return 'audio';
  return 'image';
}

export async function listSupabaseAssets(prefix = ''): Promise<Array<{ id: string; uri: string; type: AssetKind; title: string }>> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' }
  });
  if (error) throw error;

  const files = (data || []).filter((f: { name: string; }) => !f.name.endsWith('/'));

  const mapped = await Promise.all(files.map(async (f: { name: string; }) => {
    const path = prefix ? `${prefix}/${f.name}` : f.name;
    const { data: signed, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    if (sErr) throw sErr;
    const fallback = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const uri = signed?.signedUrl || fallback;
    return { id: `sb_${path}`, uri, type: extToKind(f.name), title: f.name };
  }));

  return mapped;
}

export async function addSupabaseAssetsToCESDK(editor: any, prefix = ''): Promise<void> {
  const assets = await listSupabaseAssets(prefix);
  if (editor?.asset?.addAssets) {
    await editor.asset.addAssets(
      assets.map(a => ({ id: a.id, meta: { uri: a.uri, type: a.type, title: a.title }}))
    );
  }
}

export async function uploadToSupabase(file: File, userId: string, prefix = ''): Promise<{ path: string; url: string }> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Max file size is 10 MB.');
  const safePrefix = prefix ? `${prefix.replace(/\/+$/, '')}/` : '';
  const path = `${safePrefix}${userId}/${Date.now()}_${file.name}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || undefined
  });
  if (upErr) throw upErr;

  const { data: signed, error: sErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (sErr) throw sErr;

  const url = signed?.signedUrl || supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return { path, url };
}