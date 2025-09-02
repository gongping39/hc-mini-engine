export * from './types';
export { recorder } from './record';
export { player } from './play';
export { dispatchToGame } from './dispatch';
import type { Replay } from './types';

// Base64 utilities
export function toBase64(r: Replay): string {
  const jsonStr = JSON.stringify(r);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(jsonStr);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function fromBase64(s: string): Replay {
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(bytes);
  return JSON.parse(jsonStr);
}