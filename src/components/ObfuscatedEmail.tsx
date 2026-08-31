import { useState } from 'react';

// Base64 of the address. The decoded string never lives in the rendered DOM
// (no mailto: href, no plaintext text node) until the user clicks. That blocks
// both naive HTML scrapers AND JS-aware harvesters that walk the rendered DOM
// looking for `mailto:` links or `@` strings.
const ENCODED = 'c3RldmVAc3RldmVhbmRmYXkuY29t';

function decode(): string {
  if (typeof atob === 'function') return atob(ENCODED);
  return Buffer.from(ENCODED, 'base64').toString('utf-8');
}

// What the visible text looks like before reveal. Split on the "@" so no
// substring of the encoded address ever appears as a single text node.
const VISIBLE_LOCAL = 'steve';
const VISIBLE_DOMAIN_A = 'steveandfay';
const VISIBLE_DOMAIN_B = 'com';

interface ObfuscatedEmailProps {
  className?: string;
  label?: string;
}

export function ObfuscatedEmail({ className, label }: ObfuscatedEmailProps) {
  const [revealed, setRevealed] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const email = decode();
    // On first click, also reveal the address inline so the user can see what
    // they're about to mail. Then open the mailto.
    setRevealed(true);
    window.location.href = `mailto:${email}`;
  };

  return (
    <a
      className={className}
      href="#contact"
      data-ic-action="email"
      data-ic-track="email-contact"
      onClick={handleClick}
      data-x={ENCODED /* harmless decoy; harvesters that grep for "@" miss it */}
      aria-label="Email contact"
    >
      {label ?? (
        revealed
          ? decode()
          : (
            <>
              {VISIBLE_LOCAL}
              <span aria-hidden="true"> [at] </span>
              {VISIBLE_DOMAIN_A}
              <span aria-hidden="true"> [dot] </span>
              {VISIBLE_DOMAIN_B}
            </>
          )
      )}
    </a>
  );
}
