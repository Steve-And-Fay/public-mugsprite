// Print a colorful Mugsprite calling card to the browser DevTools console.
// Runs once per page load. Hidden behind a guard so it doesn't fire in SSR,
// tests, or non-browser contexts. The text is intentionally playful — anyone
// who opens the console is curious, and curious people are who we want.
//
// Theme awareness: DevTools doesn't expose its own theme to scripts, but
// users who set OS / browser to dark mode almost always have a dark console
// too. We use `prefers-color-scheme` as a proxy and swap "ink" (near-black)
// for a paper-tinted near-white when dark is detected. The bright accent
// colors (pink/yellow/green/cyan/fox) work on both backgrounds, so they
// stay constant.

let printed = false;

const ACCENTS = {
  pink: '#FF66CC',
  yellow: '#FFCC33',
  green: '#33CC66',
  cyan: '#33CCCC',
  fox: '#FF6B1A',
};

const TEXT_LIGHT_BG = '#1a1a1a'; // ink on paper-ish console
const TEXT_DARK_BG = '#f0e6cf'; // paper-tinted near-white on dark console

const WORDMARK = [
  '███╗   ███╗██╗   ██╗ ██████╗ ███████╗██████╗ ██████╗ ██╗████████╗███████╗',
  '████╗ ████║██║   ██║██╔════╝ ██╔════╝██╔══██╗██╔══██╗██║╚══██╔══╝██╔════╝',
  '██╔████╔██║██║   ██║██║  ███╗███████╗██████╔╝██████╔╝██║   ██║   █████╗  ',
  '██║╚██╔╝██║██║   ██║██║   ██║╚════██║██╔═══╝ ██╔══██╗██║   ██║   ██╔══╝  ',
  '██║ ╚═╝ ██║╚██████╔╝╚██████╔╝███████║██║     ██║  ██║██║   ██║   ███████╗',
  '╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝   ╚═╝   ╚══════╝',
];

function isDarkConsole(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function bold(color: string): string {
  return `color: ${color}; font-weight: 700; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.1;`;
}
function plain(color: string): string {
  return `color: ${color}; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.4;`;
}

export function printConsoleBanner(): void {
  if (printed) return;
  if (typeof window === 'undefined' || !window.console || !console.log) return;
  printed = true;

  const TEXT = isDarkConsole() ? TEXT_DARK_BG : TEXT_LIGHT_BG;

  // Six rows, six colors. The last row uses TEXT instead of a fixed accent so
  // it stays readable on both light and dark consoles.
  const ROW_COLORS = [
    ACCENTS.pink,
    ACCENTS.yellow,
    ACCENTS.green,
    ACCENTS.cyan,
    ACCENTS.fox,
    TEXT,
  ];

  // Stack the wordmark with one color per row for a rainbow effect.
  const lineFmt = WORDMARK.map(() => '%c%s').join('\n');
  const styleArgs = WORDMARK.flatMap((line, i) => [bold(ROW_COLORS[i % ROW_COLORS.length]!), line]);
  console.log('\n' + lineFmt + '\n', ...styleArgs);

  // Tiny single-line mascot under the wordmark.
  console.log('%c        (  ●  ‿  ●  )', bold(ACCENTS.fox));

  // Tagline. Internet Crafters is the studio that makes things; Steve and
  // Fay LLC is the company behind it. Keep the studio front and center.
  console.log(
    '\n%cHey, curious mind. %c👋\n%cMugsprite is made by %cInternet Crafters%c — a small studio shipping fast, modern, mostly static websites.\n%cCompany: Steve and Fay LLC.',
    bold(TEXT),
    plain(TEXT),
    plain(TEXT),
    bold(ACCENTS.fox),
    plain(TEXT),
    plain(TEXT),
  );

  // Hiring pitch — the whole point.
  console.log(
    '\n%c✨ We are always looking for %ccurious-minded developers%c to join us.\n' +
      '%c   If that sounds like you, come say hello.',
    bold(ACCENTS.green),
    bold(ACCENTS.pink),
    bold(ACCENTS.green),
    plain(TEXT),
  );

  // Links — most modern devtools auto-detect URLs and make them clickable.
  console.log(
    '\n%c🌐 Studio:  %chttps://internetcrafters.com\n' +
      '%c🏢 Company: %chttps://steveandfay.com\n' +
      '%c🔗 Source:  %chttps://github.com/Steve-And-Fay/public-mugsprite',
    bold(TEXT),
    plain(ACCENTS.cyan),
    bold(TEXT),
    plain(ACCENTS.cyan),
    bold(TEXT),
    plain(ACCENTS.cyan),
  );

  console.log('\n');
}
