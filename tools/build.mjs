// Prepare one self-contained HyperFrames project per output: dist/<target>/
// usage: node tools/build.mjs <target>   (promo-en | promo-de | loop | explainer-en | explainer-de)
import fs from 'fs'; import path from 'path';
const T = process.argv[2];
const MAP = { 'promo-en': ['promo', 'en'], 'promo-de': ['promo', 'de'], 'loop': ['loop', 'en'], 'explainer-en': ['explainer', 'en'], 'explainer-de': ['explainer', 'de'] };
if (!MAP[T]) { console.error('unknown target', T); process.exit(1); }
const [comp, lang] = MAP[T], out = path.join('dist', T);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), fs.readFileSync(`comps/${comp}/index.html`, 'utf8').split('__LANG__').join(lang));
for (const f of ['kit/kit.css', 'kit/kit.js']) fs.copyFileSync(f, path.join(out, path.basename(f)));
fs.copyFileSync('node_modules/gsap/dist/gsap.min.js', path.join(out, 'gsap.min.js'));
fs.cpSync('assets', path.join(out, 'assets'), { recursive: true });
// fonts: every latin woff2 of the three families, declared with @font-face
fs.mkdirSync(path.join(out, 'fonts'));
let css = '';
for (const [pkg, fam] of [['bodoni-moda', 'Bodoni Moda'], ['manrope', 'Manrope']]) {
  const dir = `node_modules/@fontsource/${pkg}/files`;
  const files = fs.readdirSync(dir).filter((f) => /-latin-\d+-(normal|italic)\.woff2$/.test(f));
  if (!files.length) throw new Error('no font files in ' + dir);
  for (const f of files) {
    const [, w, st] = /-latin-(\d+)-(normal|italic)\.woff2$/.exec(f);
    fs.copyFileSync(path.join(dir, f), path.join(out, 'fonts', f));
    css += `@font-face{font-family:'${fam}';font-style:${st};font-weight:${w};font-display:block;src:url(fonts/${f}) format('woff2');}\n`;
  }
}
fs.writeFileSync(path.join(out, 'fonts.css'), css);
console.log('built', out, fs.readdirSync(path.join(out, 'fonts')).length, 'font files');
