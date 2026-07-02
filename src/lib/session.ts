import crypto from 'crypto';
import { cookies } from 'next/headers'; // Note: Next.js cookies API

const SECRET = process.env.SESSION_SECRET || 'fallback-super-secret-key-12345-poseparfaite';

export function encryptSession(payload: any): string {
  const jsonStr = JSON.stringify(payload);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', crypto.scryptSync(SECRET, 'salt', 32), iv);
  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  // Return token as iv:encrypted
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptSession(token: string): any | null {
  try {
    const [ivHex, encryptedHex] = token.split(':');
    if (!ivHex || !encryptedHex) return null;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.scryptSync(SECRET, 'salt', 32), iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Session decryption failed:', err);
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;
  return decryptSession(token);
}
