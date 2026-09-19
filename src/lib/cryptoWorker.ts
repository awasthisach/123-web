/**
 * Web Worker for AES-256-GCM & PBKDF2 (310,000 iterations).
 */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
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
      salt: salt as BufferSource,
      iterations: 310000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;

  try {
    if (type === 'encrypt') {
      const { plainText, passphrase } = payload;
      const enc = new TextEncoder();
      const data = enc.encode(plainText);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(passphrase, salt);

      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        data
      );

      self.postMessage({
        id,
        success: true,
        result: {
          ciphertext: arrayBufferToBase64(encryptedBuffer),
          iv: arrayBufferToBase64(iv.buffer),
          salt: arrayBufferToBase64(salt.buffer),
        },
      });
    } else if (type === 'decrypt') {
      const { ciphertext, iv, salt, passphrase } = payload;
      const saltBuf = new Uint8Array(base64ToArrayBuffer(salt));
      const ivBuf = new Uint8Array(base64ToArrayBuffer(iv));
      const cipherBuf = base64ToArrayBuffer(ciphertext);
      const key = await deriveKey(passphrase, saltBuf);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuf as BufferSource },
        key,
        cipherBuf
      );

      self.postMessage({
        id,
        success: true,
        result: new TextDecoder().decode(decryptedBuffer),
      });
    } else {
      throw new Error('Unknown worker task type: ' + type);
    }
  } catch (err: any) {
    self.postMessage({
      id,
      success: false,
      error: err?.message || 'Crypto worker operation failed',
    });
  }
};
