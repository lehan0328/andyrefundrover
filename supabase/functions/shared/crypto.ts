// supabase/functions/shared/crypto.ts
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')!;

export async function encrypt(text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(ENCRYPTION_KEY),
    { name: "AES-GCM" }, false, ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, new TextEncoder().encode(text)
  );

  // Return IV + Ciphertext as a single string for storage
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encoded: string): Promise<string> {
  const data = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(ENCRYPTION_KEY),
    { name: "AES-GCM" }, false, ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}