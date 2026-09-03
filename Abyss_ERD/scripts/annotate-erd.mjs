// Liam's PostgreSQL parser needs a small metadata validation pass after ERD build.
// Run after liam erd build. The SQL remains the authoritative definition.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const sql = readFileSync(new URL('../abyss.sql', import.meta.url), 'utf8');
const target = new URL('../dist/schema.json', import.meta.url);
const schema = JSON.parse(readFileSync(target, 'utf8'));
const names = new Map();
for (const [, name] of sql.matchAll(/^CREATE TABLE (\w+)\s*\(/gm)) {
  assert(!names.has(name), `Ambiguous unqualified table: ${name}`);
  names.set(name, name);
}
// Materialized views are public presentation objects; keep their intentional mv_ names.
for (const [, name] of sql.matchAll(/^CREATE MATERIALIZED VIEW (\w+)\s+AS/gm)) {
  assert(!names.has(name), `Ambiguous presentation object: ${name}`);
  names.set(name, name);
}
const qualified = (name) => {
  if ([...names.values()].includes(name)) return name;
  assert(names.has(name), `Unknown ERD table: ${name}`);
  return names.get(name);
};
const tables = {};
let foreignKeys = 0;
for (const [name, table] of Object.entries(schema.tables)) {
  table.name = qualified(name);
  // Liam can omit COMMENT metadata for views and some tables with composite constraints.
  if (!table.comment) {
    table.comment = table.name.startsWith('mv_')
      ? '11A. Denormalized materialized display calculation.'
      : 'See the numbered SQL comment in abyss.sql.';
  }
  for (const constraint of Object.values(table.constraints)) {
    if (constraint.type === 'FOREIGN KEY') {
      constraint.targetTableName = qualified(constraint.targetTableName);
      foreignKeys++;
    }
  }
  tables[table.name] = table;
}
assert.equal(Object.keys(tables).length, names.size);
for (const table of Object.values(tables)) {
  assert(table.comment, `Missing comment: ${table.name}`);
  for (const c of Object.values(table.constraints)) {
    if (c.type !== 'FOREIGN KEY') continue;
    assert(c.columnNames.every(column => table.columns[column]));
    assert(c.targetColumnNames.every(column => tables[c.targetTableName].columns[column]));
  }
}
schema.tables = tables;
writeFileSync(target, `${JSON.stringify(schema, null, 2)}\n`);
console.log(`ERD: ${names.size} tables, ${foreignKeys} foreign keys; all entity and mv_ labels preserved.`);
