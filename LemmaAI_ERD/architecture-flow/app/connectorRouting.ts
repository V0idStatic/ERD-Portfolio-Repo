type ConnectorPoint = { x: number; y: number };
type HandleSide = "top" | "bottom" | "left" | "right";

// Saved corners describe the connector's lanes. The terminal legs belong to
// their ports, so moving or resizing a node must update those legs as well.
export function anchorConnectorJoints(
  savedJoints: ConnectorPoint[],
  source: ConnectorPoint,
  sourceSide: HandleSide,
  target: ConnectorPoint,
  targetSide: HandleSide,
): ConnectorPoint[] {
  if (savedJoints.length === 0) return [];
  const sourceVertical = sourceSide === "top" || sourceSide === "bottom";
  const targetVertical = targetSide === "top" || targetSide === "bottom";

  if (savedJoints.length === 1) {
    const joint = savedJoints[0];
    if (sourceVertical && targetVertical) {
      return [{ x: source.x, y: joint.y }, { x: target.x, y: joint.y }];
    }
    if (!sourceVertical && !targetVertical) {
      return [{ x: joint.x, y: source.y }, { x: joint.x, y: target.y }];
    }
    return [sourceVertical
      ? { x: source.x, y: target.y }
      : { x: target.x, y: source.y }];
  }

  const joints = savedJoints.map((joint) => ({ ...joint }));
  const first = joints[0];
  const last = joints[joints.length - 1];
  if (sourceVertical) first.x = source.x;
  else first.y = source.y;
  if (targetVertical) last.x = target.x;
  else last.y = target.y;
  return joints;
}
