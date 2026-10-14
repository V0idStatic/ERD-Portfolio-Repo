type EdgeBend = { x: number; y: number };

// Width and height are the rendered label's outer dimensions, including its
// padding. Tight perpendicular bounds avoid cutting neighboring DFD lanes.
export function getLabelClipBox(position: EdgeBend, width: number, height: number, vertical: boolean): BoundingBox2D {
  const along = width / 2 + 4;
  const across = height / 2 + 0.5;
  const halfX = vertical ? across : along;
  const halfY = vertical ? along : across;
  return {
    minX: position.x - halfX, maxX: position.x + halfX,
    minY: position.y - halfY, maxY: position.y + halfY,
  };
}

export interface BoundingBox2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function clipSegmentWithBox(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  box: BoundingBox2D,
): Array<{ p1: { x: number; y: number }; p2: { x: number; y: number } }> {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  let t0 = 0.0;
  let t1 = 1.0;

  const p = [-dx, dx, -dy, dy];
  const q = [p1.x - box.minX, box.maxX - p1.x, p1.y - box.minY, box.maxY - p1.y];

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) {
        return [{ p1, p2 }];
      }
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return [{ p1, p2 }];
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return [{ p1, p2 }];
        if (t < t1) t1 = t;
      }
    }
  }

  if (t0 >= t1) {
    return [{ p1, p2 }];
  }

  const result: Array<{ p1: { x: number; y: number }; p2: { x: number; y: number } }> = [];
  if (t0 > 0.001) {
    result.push({
      p1: { x: p1.x, y: p1.y },
      p2: { x: p1.x + t0 * dx, y: p1.y + t0 * dy },
    });
  }
  if (t1 < 0.999) {
    result.push({
      p1: { x: p1.x + t1 * dx, y: p1.y + t1 * dy },
      p2: { x: p2.x, y: p2.y },
    });
  }
  return result;
}

export function computeGappedPolyline(
  points: EdgeBend[],
  boxes: BoundingBox2D[],
  hasMarkerEnd = false,
  markerClearance = 14,
): string {
  if (points.length < 2) return "";
  if (!boxes || boxes.length === 0) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  }

  let segments: Array<{ p1: { x: number; y: number }; p2: { x: number; y: number } }> = [];
  for (let i = 0; i < points.length - 1; i++) {
    segments.push({ p1: points[i], p2: points[i + 1] });
  }

  for (const box of boxes) {
    const nextSegments: Array<{ p1: { x: number; y: number }; p2: { x: number; y: number } }> = [];
    for (const seg of segments) {
      const clipped = clipSegmentWithBox(seg.p1, seg.p2, box);
      for (const piece of clipped) {
        const pieceLen = Math.hypot(piece.p2.x - piece.p1.x, piece.p2.y - piece.p1.y);
        if (pieceLen >= 0.5) {
          nextSegments.push(piece);
        }
      }
    }
    segments = nextSegments;
  }

  const subpaths: Array<Array<{ x: number; y: number }>> = [];
  let currentSub: Array<{ x: number; y: number }> = [];

  for (const seg of segments) {
    if (currentSub.length === 0) {
      currentSub.push(seg.p1, seg.p2);
    } else {
      const lastPt = currentSub[currentSub.length - 1];
      if (Math.hypot(lastPt.x - seg.p1.x, lastPt.y - seg.p1.y) < 0.5) {
        currentSub.push(seg.p2);
      } else {
        if (currentSub.length > 1) subpaths.push(currentSub);
        currentSub = [seg.p1, seg.p2];
      }
    }
  }
  if (currentSub.length > 1) {
    subpaths.push(currentSub);
  }

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const prevPoint = points[points.length - 2];
  const dLen = Math.hypot(lastPoint.x - prevPoint.x, lastPoint.y - prevPoint.y) || 1;
  const ux = (lastPoint.x - prevPoint.x) / dLen;
  const uy = (lastPoint.y - prevPoint.y) / dLen;

  const validSubpaths: Array<Array<{ x: number; y: number }>> = [];
  let hasConnectedEnd = false;

  for (let i = 0; i < subpaths.length; i++) {
    const sub = subpaths[i];
    let subLen = 0;
    for (let j = 0; j < sub.length - 1; j++) {
      subLen += Math.hypot(sub[j + 1].x - sub[j].x, sub[j + 1].y - sub[j].y);
    }

    const endPt = sub[sub.length - 1];
    const startPt = sub[0];
    const touchesEnd = Math.hypot(endPt.x - lastPoint.x, endPt.y - lastPoint.y) < 1.0;
    const touchesStart = Math.hypot(startPt.x - firstPoint.x, startPt.y - firstPoint.y) < 1.0;

    if (touchesEnd) {
      if (hasMarkerEnd && subLen < markerClearance) {
        continue;
      }
      hasConnectedEnd = true;
      validSubpaths.push(sub);
    } else {
      if (touchesStart) {
        if (subLen >= 12) {
          validSubpaths.push(sub);
        }
      } else if (subLen >= 14) {
        validSubpaths.push(sub);
      }
    }
  }

  if (hasMarkerEnd && !hasConnectedEnd) {
    validSubpaths.push([
      { x: lastPoint.x - ux * 0.5, y: lastPoint.y - uy * 0.5 },
      { x: lastPoint.x, y: lastPoint.y },
    ]);
  }

  return validSubpaths
    .map((sub) => sub.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" "))
    .join(" ");
}
