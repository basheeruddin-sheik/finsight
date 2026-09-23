import client from './client';

export interface UploadTarget {
  path: string;        // storage object path to persist on the transaction
  uploadUrl: string;   // Supabase signed URL to PUT the bytes to
  contentType: string;
}

// Ask the backend for one signed upload URL per file.
export const getUploadUrls = (contentTypes: string[]) =>
  client.post<UploadTarget[]>('/storage/upload-urls', { contentTypes }).then(r => r.data);

// Get short-lived signed URLs to display private receipts (path → signed URL).
export const getViewUrls = (paths: string[]) =>
  client.post<Record<string, string>>('/storage/view-urls', { paths }).then(r => r.data);

// Upload a blob straight to Supabase Storage using its signed URL. The token is
// in the URL, so this request carries no Authorization header (and must not go
// through the API client, which would attach the Auth0 token).
export async function uploadToSignedUrl(uploadUrl: string, blob: Blob, contentType: string) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': contentType, 'x-upsert': 'true' },
    body: blob,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}
