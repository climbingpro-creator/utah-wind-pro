import { readFileSync, writeFileSync } from 'fs';

const files = [
  'c:\\Users\\Admin\\Documents\\GitHub\\WINDAP~2\\apps\\water\\src\\App.jsx',
  'c:\\Users\\Admin\\Documents\\GitHub\\WINDAP~2\\apps\\water\\src\\components\\FishingMode.jsx',
  'c:\\Users\\Admin\\Documents\\GitHub\\WINDAP~2\\apps\\water\\src\\components\\LocationSelector.jsx',
];

for (const f of files) {
  try {
    const buf = readFileSync(f);
    const name = f.split('\\').pop();

    // Check for UTF-16 LE BOM (FF FE)
    if (buf[0] === 0xFF && buf[1] === 0xFE) {
      const content = buf.toString('utf16le').slice(1); // skip BOM
      writeFileSync(f, content, 'utf8');
      console.log('Converted UTF-16 LE -> UTF-8:', name);
    }
    // Check for UTF-8 BOM (EF BB BF)
    else if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
      const content = buf.toString('utf8').slice(1);
      writeFileSync(f, content, 'utf8');
      console.log('Stripped UTF-8 BOM:', name);
    }
    else {
      console.log('Already UTF-8, no BOM:', name, '(first bytes:', buf[0].toString(16), buf[1].toString(16), ')');
    }
  } catch (e) {
    console.log('Error:', f.split('\\').pop(), e.message);
  }
}
