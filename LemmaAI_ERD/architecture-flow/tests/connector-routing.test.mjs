import assert from "node:assert/strict";
import test from "node:test";
import { anchorConnectorJoints } from "../app/connectorRouting.ts";

test("parallel vertical connectors keep their separate lanes as either box moves or resizes", () => {
  for (const laneY of [300, 315, 330, 345]) {
    const saved = [{ x: 100, y: laneY }, { x: 400, y: laneY }];
    for (const sourceX of [90, 100, 120]) {
      for (const targetX of [380, 400, 430]) {
        const joints = anchorConnectorJoints(saved,
          { x: sourceX, y: 150 }, "bottom", { x: targetX, y: 500 }, "top");
        assert.deepEqual(joints, [{ x: sourceX, y: laneY }, { x: targetX, y: laneY }]);
      }
    }
    assert.deepEqual(saved, [{ x: 100, y: laneY }, { x: 400, y: laneY }]);
  }
});

test("horizontal ports keep straight terminal legs when their boxes move vertically", () => {
  const joints = anchorConnectorJoints([{ x: 250, y: 100 }, { x: 250, y: 400 }],
    { x: 150, y: 120 }, "right", { x: 500, y: 380 }, "left");
  assert.deepEqual(joints, [{ x: 250, y: 120 }, { x: 250, y: 380 }]);
});

test("moving an endpoint preserves inner corners of a manually routed connector", () => {
  const saved = [{ x: 100, y: 300 }, { x: 250, y: 300 }, { x: 250, y: 450 }, { x: 400, y: 450 }];
  const joints = anchorConnectorJoints(saved,
    { x: 130, y: 110 }, "bottom", { x: 420, y: 550 }, "top");
  assert.deepEqual(joints, [{ x: 130, y: 300 }, { x: 250, y: 300 }, { x: 250, y: 450 }, { x: 420, y: 450 }]);
});

test("a legacy single bend still follows both terminal port directions", () => {
  assert.deepEqual(anchorConnectorJoints([{ x: 100, y: 300 }],
    { x: 120, y: 100 }, "bottom", { x: 420, y: 500 }, "top"),
  [{ x: 120, y: 300 }, { x: 420, y: 300 }]);
  assert.deepEqual(anchorConnectorJoints([{ x: 250, y: 100 }],
    { x: 100, y: 120 }, "right", { x: 500, y: 420 }, "left"),
  [{ x: 250, y: 120 }, { x: 250, y: 420 }]);
  assert.deepEqual(anchorConnectorJoints([{ x: 100, y: 300 }],
    { x: 120, y: 100 }, "bottom", { x: 500, y: 320 }, "left"),
  [{ x: 120, y: 320 }]);
});
