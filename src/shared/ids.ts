// Browser/edge-safe ID + token helpers. Uses Web Crypto API (available in
// Node 20+, all browsers, and Netlify Edge Functions).

import {
  NumberDictionary,
  adjectives,
  animals,
  uniqueNamesGenerator,
} from 'unique-names-generator';

const roomNumberDict = NumberDictionary.generate({ min: 10, max: 99 });

// Room IDs are human-readable slugs (adjective-animal-NN). Surface area is
// adj (~1400) × animal (~350) × 90 ≈ 44M combinations — plenty for a beta.
// On the (~1-in-44M) collision the INSERT throws and the create handler retries.
export function generateRoomId(): string {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals, roomNumberDict],
    separator: '-',
    length: 3,
    style: 'lowerCase',
  });
}

// Whimsical agent names: hand-picked expressive moods paired with weird animals.
const SILLY_MOODS = [
  'grumpy', 'sassy', 'dizzy', 'kooky', 'wobbly', 'bashful', 'sleepy', 'sneaky',
  'cranky', 'jolly', 'mopey', 'peppy', 'prickly', 'quirky', 'rowdy', 'snazzy',
  'snoozy', 'soggy', 'sparkly', 'springy', 'twitchy', 'whimsy', 'witty', 'woozy',
  'zany', 'breezy', 'chipper', 'cheeky', 'drowsy', 'fluffy', 'spunky', 'derpy',
  'goofy', 'noodly', 'plucky', 'silly', 'sulky', 'wiggly',
];

const ODD_CREATURES = [
  'axolotl', 'narwhal', 'pangolin', 'quokka', 'tapir', 'okapi', 'capybara',
  'wombat', 'kakapo', 'platypus', 'dugong', 'fossa', 'kinkajou', 'lemur',
  'manatee', 'numbat', 'puffin', 'otter', 'marmot', 'slowloris', 'aardvark',
  'binturong', 'dhole', 'echidna', 'gerenuk', 'jerboa', 'klipspringer', 'markhor',
  'nyala', 'paca', 'serval', 'tarsier', 'vaquita', 'wallaroo', 'xerus', 'zorilla',
];

function pick<T>(arr: readonly T[]): T {
  const bytes = new Uint8Array(1);
  crypto.getRandomValues(bytes);
  return arr[bytes[0]! % arr.length]!;
}

export function generateAgentName(): string {
  const num = (crypto.getRandomValues(new Uint8Array(1))[0]! % 90) + 10; // 10–99
  return `${pick(SILLY_MOODS)}-${pick(ODD_CREATURES)}-${num}`;
}

export function generateUuid(): string {
  return crypto.randomUUID();
}

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
