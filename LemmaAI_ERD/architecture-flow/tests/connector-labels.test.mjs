import assert from "node:assert/strict";
import test from "node:test";
import { computeGappedPolyline, getLabelClipBox } from "../app/connectorLabels.ts";

test("stacked DFD labels each create one gap on their own horizontal lane", () => {
  const rows = [200, 140, 180, 160, 240].map((width, index) => ({
    y: index * 18,
    box: getLabelClipBox({ x: 250, y: index * 18 }, width, 16, false),
  }));
  for (const row of rows) {
    const path = computeGappedPolyline([{ x: 0, y: row.y }, { x: 500, y: row.y }], rows.map(r => r.box), true);
    assert.equal((path.match(/M/g) ?? []).length, 2, `Unexpected fragments on lane ${row.y}`);
    assert.equal(path,
      `M0.00,${row.y.toFixed(2)} L${row.box.minX.toFixed(2)},${row.y.toFixed(2)} M${row.box.maxX.toFixed(2)},${row.y.toFixed(2)} L500.00,${row.y.toFixed(2)}`);
  }
});

test("rendered padding is counted once when sizing the label gap", () => {
  const box = getLabelClipBox({ x: 250, y: 100 }, 200, 24, false);
  assert.deepEqual(box, { minX: 146, maxX: 354, minY: 87.5, maxY: 112.5 });
});

test("rotated labels use their rendered orientation without cutting adjacent vertical lanes", () => {
  const own = getLabelClipBox({ x: 100, y: 250 }, 180, 16, true);
  const neighbor = getLabelClipBox({ x: 118, y: 250 }, 220, 16, true);
  assert.equal(computeGappedPolyline([{ x: 100, y: 0 }, { x: 100, y: 500 }], [own, neighbor], true),
    "M100.00,0.00 L100.00,156.00 M100.00,344.00 L100.00,500.00");
});

test("moving a label updates the gap to its actual position", () => {
  const points = [{ x: 0, y: 0 }, { x: 500, y: 0 }];
  assert.equal(computeGappedPolyline(points, [getLabelClipBox({ x: 300, y: 0 }, 100, 16, false)]),
    "M0.00,0.00 L246.00,0.00 M354.00,0.00 L500.00,0.00");
});
