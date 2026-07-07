const PALETTE_PAIRS: [string, string][] = [
  ["#7d0f22", "#14100e"],
  ["#b5893f", "#4a0812"],
  ["#660b1c", "#211a16"],
  ["#8a1530", "#1c1512"],
];

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Genera un póster placeholder (SVG) con la paleta de CineMax para una película. */
export function posterDataUri(title: string, seed: number): string {
  const [c1, c2] = PALETTE_PAIRS[seed % PALETTE_PAIRS.length];
  const safeTitle = title.length > 20 ? `${title.slice(0, 18)}…` : title;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="600">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c1}" />
          <stop offset="100%" stop-color="${c2}" />
        </linearGradient>
      </defs>
      <rect width="400" height="600" fill="url(#g)" />
      <circle cx="330" cy="70" r="36" fill="#e3b23c" opacity="0.9" />
      <text x="315" y="80" font-family="Georgia, serif" font-size="26" fill="#14100e" text-anchor="middle">🎬</text>
      <text x="30" y="500" font-family="Georgia, serif" font-size="32" font-weight="700" fill="#f6eee0">${escapeXml(safeTitle)}</text>
      <text x="30" y="540" font-family="monospace" font-size="14" letter-spacing="3" fill="#e3b23c">CINEMAX</text>
    </svg>
  `.trim();

  // encodeURIComponent leaves "(" and ")" unescaped (e.g. from fill="url(#g)"),
  // which breaks CSS url(...) wrapping since the browser treats the first
  // unescaped ")" as the end of the outer url() token.
  const encoded = encodeURIComponent(svg).replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `data:image/svg+xml;utf8,${encoded}`;
}
