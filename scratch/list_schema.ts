import * as fs from 'fs';

const fd = fs.openSync('schemawithdata.sql', 'r');
const buf = Buffer.alloc(1024 * 1024 * 4);
fs.readSync(fd, buf, 0, buf.length, 0);
fs.closeSync(fd);
const text = buf.toString('utf16le');

const matches = text.matchAll(/CREATE TABLE\s+\[dbo\]\.\[([^\]]+)\]\s*\(([\s\S]*?)\)\s*ON/gi);
for (const m of matches) {
  const tbl = m[1];
  const colLines = m[2].split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('[') || l.startsWith('`'))
    .map(l => {
      const cm = l.match(/^\[([^\]]+)\]/);
      return cm ? cm[1] : l;
    });
  console.log(tbl + ' (' + colLines.length + ' cols): ' + colLines.join(', '));
}
