import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Renders a QR code as a normal <img>. We ask the qrcode library for a PNG
// dataURL and hand that to the <img src>. No dangerouslySetInnerHTML and no
// canvas at render time — just a static image element. PNG is fine here:
// the container is fixed pixel size and QR codes don't benefit from vector
// scaling at typical UI sizes.

interface QrCodeProps {
  value: string;
  size?: number; // pixel width of the rendered QR
  className?: string;
  ariaLabel?: string;
  dark?: string;
  light?: string;
}

export function QrCode({
  value,
  size = 160,
  className,
  ariaLabel = 'QR code',
  dark = '#1a1a1a',
  light = '#fdf6e3',
}: QrCodeProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      // Render at 2x the display size so the PNG stays crisp on retina.
      width: size * 2,
      color: { dark, light },
    })
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size, dark, light]);

  if (!src) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, background: light }}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={src}
      alt={ariaLabel}
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
