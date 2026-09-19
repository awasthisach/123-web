/**
 * Client-side vault crypto
 * Uses Web Crypto API: PBKDF2 (SHA-256, 310,000 iterations) -> AES-GCM (256-bit)
 */

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 310000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(
  plainText: string,
  passphrase: string
): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );
  return {
    ciphertext: bufToBase64(ciphertext),
    iv: bufToBase64(iv),
    salt: bufToBase64(salt),
  };
}

export async function decryptData(
  ciphertext: string,
  iv: string,
  salt: string,
  passphrase: string
): Promise<string> {
  const key = await deriveKey(passphrase, base64ToBuf(salt));
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuf(iv) },
    key,
    base64ToBuf(ciphertext)
  );
  return new TextDecoder().decode(plainBuf);
}

export async function encryptDataWithWorker(
  plainText: string,
  passphrase: string
): Promise<{ ciphertext: string; iv: string; salt: string }> {
  try {
    return encryptData(plainText, passphrase);
  } catch (e) {
    throw e;
  }
}

export async function decryptDataWithWorker(
  ciphertext: string,
  iv: string,
  salt: string,
  passphrase: string
): Promise<string> {
  try {
    return decryptData(ciphertext, iv, salt, passphrase);
  } catch (e) {
    throw e;
  }
}
