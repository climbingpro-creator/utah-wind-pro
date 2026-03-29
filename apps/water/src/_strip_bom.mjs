import { readFileSync, writeFileSync } from 'fs';

const files = [
  'c:\\Users\\Admin\\Documents\\GitHub\\WINDAP~2\\apps\\water\\src\\App.jsx',
  'c:\\Users\\Admin\\Documents\\GitHub\\WINDAP~2\\apps\\water\\src\\components\\FishingMode.jsx',
  'c:\\Users\\Admin\\Documents\\GitHub\\WINDAP~2\\apps\\water\\src\\components\\LocationSelector.jsx',
];

for (const f of files) {
  try {
    let content = readFileSync(f, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
      writeFileSync(f, content, 'utf8');
      console.log('Stripped BOM from', f.split('\\').pop());
    } else {
      console.log('No BOM in', f.split('\\').pop());
    }
  } catch (e) {
    console.log('Error:', f.split('\\').pop(), e.message);
  }
}
