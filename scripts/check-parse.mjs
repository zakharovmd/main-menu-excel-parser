import fs from "node:fs";
import { parseWorkbook } from "../src/lib/parse.js";
const p = process.argv[2];
const buf = fs.readFileSync(p);
const doc = await parseWorkbook({ name: p.split(/[\/]/).pop(), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) });
console.log(doc.title);
for (const b of doc.blocks) {
  console.log(`\n## ${b.title} | ${b.subtitle} | note: ${b.note}`);
  for (const s of b.sections) {
    console.log(`  # ${s.title || "(без названия)"} (${s.items.length})`);
    for (const i of s.items) console.log(`     ${i.weight.padEnd(7)} [${i.kbju || "-"}] ${i.name}${i.desc ? "  {" + i.desc + "}" : ""}  — ${i.price}`);
  }
}
