import { toolContent } from './lib/toolContent.js';
import { categories } from './lib/tools.js';
import fs from 'fs';

const meta = {};
for (const c of categories) for (const t of c.tools) meta[t.slug] = { name: t.name, desc: t.description, cat: c.slug };

const out = [];
for (const slug of Object.keys(toolContent)) {
  const m = meta[slug] || {};
  out.push({
    slug,
    name: m.name || slug,
    desc: m.desc || '',
    cat: m.cat || '',
    about: (toolContent[slug].about || '').replace(/\s+/g, ' ').trim().slice(0, 420),
  });
}
const dst = 'C:/Users/anmta/.claude/New Business Idea/DeadPan Scripts/pipeline/built-tools.json';
fs.writeFileSync(dst, JSON.stringify(out));
console.log(out.length, 'built tools ->', dst);
