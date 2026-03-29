import { readFileSync, writeFileSync } from 'fs';

const p = 'c:\\Users\\Admin\\Documents\\GitHub\\WINDAP~2\\apps\\water\\src\\App.jsx';
let content = readFileSync(p, 'utf8');
let changes = 0;

function r(from, to) {
  if (content.includes(from)) {
    content = content.split(from).join(to);
    changes++;
  }
}

// ── Fix garbled em-dashes (ΓÇö -> —) ──
r('\u0393\u00c7\u00f6', '\u2014');

// ── Fix garbled emojis ──
r('\u2261\u0192\u00f4\u00e8', '\uD83D\uDCCA');  // 📊
r('\u2261\u0192\u00ac\u20a7', '\uD83E\uDE9E');   // 🪞 (mirror)
r('\u2261\u0192\u00ee\u00e0', '\uD83C\uDF05');   // 🌅
r('\u2261\u0192\u00ee\u00e7', '\uD83C\uDF07');   // 🌇
r('\u00b7', '\u00b7'); // middot is fine

// ── Widen layout: max-w-2xl -> max-w-5xl ──
r('max-w-2xl mx-auto px-4">\n          <div className="flex items-center justify-between h-12">', 
  'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">\n          <div className="flex items-center justify-between h-14">');

r('<div className="max-w-2xl mx-auto px-4 py-4 space-y-4">',
  '<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">');

// ── Scale hero text up on larger screens ──
r('text-xl sm:text-2xl font-extrabold', 'text-xl sm:text-2xl lg:text-3xl font-extrabold');

// ── Scale data-number on larger screens ──
// Already handled by CSS, but make header title bigger on wide screens
r('text-base font-extrabold tracking-tight bg-gradient-to-r',
  'text-base sm:text-lg lg:text-xl font-extrabold tracking-tight bg-gradient-to-r');

// ── Make activity cards responsive (3 cols always, but bigger padding on wide) ──
r('grid grid-cols-3 gap-2">', 'grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">');

// ── Scale hero padding ──
r('relative z-10 p-5 sm:p-6">', 'relative z-10 p-5 sm:p-6 lg:p-8">');

// ── Scale card padding on wider screens ──
// Activity card buttons
r('relative flex flex-col items-center gap-1.5 p-3 rounded-xl',
  'relative flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl');

console.log('Applied', changes, 'replacements');
writeFileSync(p, content, 'utf8');
console.log('Written to', p);
