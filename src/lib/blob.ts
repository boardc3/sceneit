import { put } from '@vercel/blob';

function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function uploadImage(base64DataUrl: string, prefix: string): Promise<{ url: string; size: number } | null> {
  if (!isBlobConfigured()) return null;

  const commaIndex = base64DataUrl.indexOf(',');
  if (commaIndex < 0) return null;

  const header = base64DataUrl.substring(0, commaIndex);
  const mimeMatch = header.match(/^data:(image\/[\w+.-]+);base64$/);
  const mimeType = mimeMatch?.[1] || 'image/jpeg';
  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
  const base64 = base64DataUrl.substring(commaIndex + 1);
  const buffer = Buffer.from(base64, 'base64');

  const blob = await put(`${prefix}/${crypto.randomUUID()}.${ext}`, buffer, {
    access: 'public',
    contentType: mimeType,
  });

  return { url: blob.url, size: buffer.length };
}
