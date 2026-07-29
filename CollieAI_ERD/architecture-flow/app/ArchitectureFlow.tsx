"use client";

import {
  addEdge,
  BaseEdge,
  Background,
  BackgroundVariant,
  Connection,
  ConnectionMode,
  Controls,
  Edge,
  EdgeProps,
  getSmoothStepPath,
  getNodesBounds,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  NodeResizer,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  BellRing,
  Bot,
  BrainCircuit,
  Check,
  CircleHelp,
  Cloud,
  Copy,
  Database,
  Download,
  FolderOpen,
  FileText,
  GitBranch,
  GraduationCap,
  HardDrive,
  History as HistoryIcon,
  LayoutDashboard,
  List,
  LoaderCircle,
  Maximize2,
  MessageSquareText,
  Network,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Repeat,
  RotateCcw,
  Route,
  Server,
  SkipBack,
  SkipForward,
  Sparkles,
  Square,
  Trash2,
  UserRound,
  Workflow,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toBlob, toCanvas, toPng } from "html-to-image";
import type { ComponentType, CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type NodeShape =
  | "service"
  | "decision"
  | "database"
  | "cloud"
  | "terminal"
  | "legend"
  | "legend-key";
type DocsExportMode = "readable" | "full-design";
type DiagramPage = { id: string; name: string; deletedAt?: string };
type DeleteIntent = { page: DiagramPage; mode: "trash" | "permanent" };
type DiagramHistoryEntry = {
  id: string;
  timestamp: string;
  summary: string;
  nodes: ArchitectureNode[];
  edges: Edge[];
};
type NodeIcon =
  | "play"
  | "app"
  | "input"
  | "decision"
  | "storage"
  | "server"
  | "session"
  | "brain"
  | "route"
  | "database"
  | "workflow"
  | "worker"
  | "bot"
  | "memory"
  | "dashboard"
  | "alert"
  | "sparkles"
  | "user"
  | "check";
type NodeTone = "cyan" | "violet" | "amber" | "emerald" | "slate" | "rose";

type ArchitectureNodeData = {
  label: string;
  description?: string;
  titleSize?: number;
  descriptionSize?: number;
  shape: NodeShape;
  icon: NodeIcon;
  tone: NodeTone;
  legendColor?: string;
  legendOpacity?: number;
  legendNodeIds?: string[];
  legendEntries?: LegendKeyEntry[];
  _animState?: "inactive" | "active" | "completed";
};

type LegendKeyEntry = {
  id: string;
  label: string;
  color: string;
  count: number;
};

type LegendDraft = {
  label: string;
  color: string;
  opacity: number;
  nodeIds: string[];
};

type ArchitectureNode = Node<ArchitectureNodeData, "architecture">;

type AnimationStep = {
  id: string;
  elementIds: string[];
  duration: number;
  delayAfter: number;
};

type AnimationSequence = {
  id: string;
  name: string;
  loop: boolean;
  playbackSpeed: number;
  steps: AnimationStep[];
};

const iconMap: Record<NodeIcon, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  play: Play,
  app: GraduationCap,
  input: MessageSquareText,
  decision: GitBranch,
  storage: HardDrive,
  server: Server,
  session: UserRound,
  brain: BrainCircuit,
  route: Route,
  database: Database,
  workflow: Workflow,
  worker: Zap,
  bot: Bot,
  memory: Cloud,
  dashboard: LayoutDashboard,
  alert: BellRing,
  sparkles: Sparkles,
  user: UserRound,
  check: Check,
};

function ArchitectureNodeCard({ data, selected }: NodeProps<ArchitectureNode>) {
  const Icon = iconMap[data.icon] ?? Server;
  if (data.shape === "legend") {
    const color = data.legendColor ?? "#0ea5c6";
    const opacity = data.legendOpacity ?? 0.12;
    const normalized = color.replace("#", "");
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    const fill = `rgba(${red}, ${green}, ${blue}, ${opacity})`;

    return (
      <div
        className={`architecture-node shape-legend ${selected ? "is-selected" : ""}`}
        style={
          {
            "--legend-color": color,
            "--legend-fill": fill,
          } as CSSProperties
        }
      >
        <div className="legend-area-label">
          <i aria-hidden="true" />
          <span>
            <strong>{data.label || "Untitled legend"}</strong>
            <small>{data.legendNodeIds?.length ?? 0} components</small>
          </span>
        </div>
      </div>
    );
  }

  if (data.shape === "legend-key") {
    return (
      <div className={`architecture-node shape-legend-key ${selected ? "is-selected" : ""}`}>
        <NodeResizer
          minWidth={190}
          minHeight={110}
          isVisible={selected}
          autoScale={false}
          color="#0ea5c6"
          handleStyle={{ width: 10, height: 10, borderRadius: 3 }}
        />
        <div className="legend-key-head">
          <span>
            <strong>{data.label || "Legend"}</strong>
            <small>Drag to move</small>
          </span>
          <LayoutDashboard size={17} strokeWidth={2.1} aria-hidden="true" />
        </div>
        <div className="legend-key-list">
          {(data.legendEntries ?? []).map((entry) => (
            <div className="legend-key-entry" key={entry.id}>
              <i style={{ backgroundColor: entry.color }} aria-hidden="true" />
              <span>
                <strong>{entry.label}</strong>
                <small>{entry.count} component{entry.count === 1 ? "" : "s"}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const animState = data._animState;
  return (
    <div
      className={`architecture-node shape-${data.shape} tone-${data.tone} ${
        selected ? "is-selected" : ""
      } ${animState ? `anim-${animState}` : ""}`}
      style={
        {
          "--node-title-size": `${data.titleSize ?? 13}px`,
          "--node-description-size": `${data.descriptionSize ?? 10}px`,
        } as CSSProperties
      }
    >
      {data.shape !== "legend-key" && data.shape !== "legend" && (
        <NodeResizer
          minWidth={80}
          minHeight={40}
          isVisible={selected}
          color="#0ea5c6"
          handleStyle={{ width: 10, height: 10, borderRadius: 3 }}
        />
      )}
            {data.shape === "decision"
        ? (() => {
            // Diamond corners in % (matches SVG viewBox 230×126)
            const corners = [
              [0.87, 50],   // left point
              [50, 1.59],   // top point
              [99.13, 50],  // right point
              [50, 98.41],  // bottom point
            ];
            // 4 edges: left→top, top→right, right→bottom, bottom→left
            const edgePos: Position[] = [Position.Top, Position.Right, Position.Bottom, Position.Left];
            const hs: { id: string; left: number; top: number; pos: Position }[] = [];
            for (let e = 0; e < 4; e++) {
              const [x1, y1] = corners[e];
              const [x2, y2] = corners[(e + 1) % 4];
              for (let i = 0; i < 2; i++) {
                const t = (i + 1) / 3;
                hs.push({
                  id: `diamond-side-${e}-${i}`,
                  left: x1 + t * (x2 - x1),
                  top: y1 + t * (y2 - y1),
                  pos: edgePos[e],
                });
              }
            }
            return [
              ...hs.map((h) => (
                <Handle key={h.id} className="side-handle" type="source" position={h.pos} id={h.id} style={{ left: `${h.left}%`, top: `${h.top}%`, transform: "none" }} />
              )),
              <Handle key="diamond-top" className="side-handle diamond-tip-handle" type="source" position={Position.Top} id="top" style={{ left: "50%" }} />,
              <Handle key="diamond-right" className="side-handle diamond-tip-handle" type="source" position={Position.Right} id="right" style={{ top: "50%" }} />,
              <Handle key="diamond-bottom" className="side-handle diamond-tip-handle" type="source" position={Position.Bottom} id="bottom" style={{ left: "50%" }} />,
              <Handle key="diamond-left" className="side-handle diamond-tip-handle" type="source" position={Position.Left} id="left" style={{ top: "50%" }} />,
            ];
          })()
        : [10, 30, 50, 70, 90].map((pct, i) => (
            <Handle key={`top-${i}`} className="side-handle" type="source" position={Position.Top} id={i === 2 ? "top" : `top-${i}`} style={{ left: `${pct}%` }} />
          ))}
      {data.shape === "cloud" ? (
        <svg className="cloud-art" viewBox="0 0 290 116" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="cloudFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
          </defs>
          <path fill="url(#cloudFill)" d="M34 100 C12 100 4 84 4 66 C4 44 16 30 34 28 C36 14 52 4 72 4 C94 4 108 16 114 28 C124 12 144 4 168 4 C198 4 218 20 226 36 C250 34 286 46 286 74 C286 96 264 100 244 100 Z" />
        </svg>
      ) : null}
      {data.shape === "database" ? (
        <svg className="database-art" viewBox="0 0 270 80" preserveAspectRatio="none" aria-hidden="true">
          <path className="db-body" d="M27 48 L27 66 A108 8 0 0 0 243 66 L243 48 A108 8 0 0 1 27 48 Z" />
          <path className="db-body" d="M27 28 L27 46 A108 8 0 0 0 243 46 L243 28 A108 8 0 0 1 27 28 Z" />
          <path className="db-body" d="M27 8 L27 26 A108 8 0 0 0 243 26 L243 8 A108 8 0 0 1 27 8 Z" />
          <ellipse className="db-top" cx="135" cy="8" rx="108" ry="8" />
        </svg>
      ) : null}
      {data.shape === "decision" ? (
        <svg className="decision-art" viewBox="0 0 230 126" preserveAspectRatio="none" aria-hidden="true">
          <path d="M115 2 L228 63 L115 124 L2 63 Z" />
        </svg>
      ) : null}
      <div className="node-inner">
        {data.shape !== "database" && data.shape !== "decision" ? (
          <span className="node-icon" aria-hidden="true">
            <Icon size={17} strokeWidth={2.2} />
          </span>
        ) : null}
        <div className="node-copy">
          <strong>{data.label}</strong>
          {data.description ? <span>{data.description}</span> : null}
        </div>
      </div>
            {data.shape !== "decision" && [10, 30, 50, 70, 90].map((pct, i) => (
        <Handle key={`bottom-${i}`} className="side-handle" type="source" position={Position.Bottom} id={i === 2 ? "bottom" : `bottom-${i}`} style={{ left: `${pct}%` }} />
      ))}
      {data.shape !== "decision" && [10, 30, 50, 70, 90].map((pct, i) => (
        <Handle key={`right-${i}`} className="side-handle" type="source" position={Position.Right} id={i === 2 ? "right" : `right-${i}`} style={{ top: `${pct}%` }} />
      ))}
      {data.shape !== "decision" && [10, 30, 50, 70, 90].map((pct, i) => (
        <Handle key={`left-${i}`} className="side-handle" type="source" position={Position.Left} id={i === 2 ? "left" : `left-${i}`} style={{ top: `${pct}%` }} />
      ))}
    </div>
  );
}

const nodeTypes = { architecture: ArchitectureNodeCard };

const defaultShapeSize = (shape: NodeShape) => {
  if (shape === "decision") return { width: 230, height: 126 };
  if (shape === "cloud") return { width: 290, height: 118 };
  if (shape === "database") return { width: 270, height: 78 };
  if (shape === "terminal") return { width: 250, height: 62 };
  return { width: 270, height: 78 };
};

function FlowingConnectorEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <path
        d={edgePath}
        pathLength={1}
        className="connector-water-pulse"
        style={{ animationDuration: `${Number(data?._flowDuration) || 900}ms` }}
        aria-hidden="true"
      />
    </>
  );
}

const edgeTypes = { flowing: FlowingConnectorEdge };

const n = (
  id: string,
  x: number,
  y: number,
  label: string,
  description: string,
  shape: NodeShape,
  icon: NodeIcon,
  tone: NodeTone,
): ArchitectureNode => ({
  id,
  type: "architecture",
  position: { x, y },
  data: { label, description, shape, icon, tone },
});

const getLegendFrame = (allNodes: ArchitectureNode[], nodeIds: string[]) => {
  const members = allNodes.filter(
    (node) =>
      node.data.shape !== "legend" &&
      node.data.shape !== "legend-key" &&
      nodeIds.includes(node.id),
  );
  if (!members.length) return null;

  const bounds = getNodesBounds(members);
  const horizontalPadding = 72;
  const topPadding = 88;
  const bottomPadding = 62;
  return {
    position: {
      x: bounds.x - horizontalPadding,
      y: bounds.y - topPadding,
    },
    width: Math.max(360, bounds.width + horizontalPadding * 2),
    height: Math.max(230, bounds.height + topPadding + bottomPadding),
  };
};

const synchronizeLegendKey = (allNodes: ArchitectureNode[]) => {
  const legends = allNodes.filter((node) => node.data.shape === "legend");
  const existingKey = allNodes.find((node) => node.data.shape === "legend-key");
  const withoutKey = allNodes.filter((node) => node.data.shape !== "legend-key");

  if (!legends.length) return withoutKey;

  const entries: LegendKeyEntry[] = legends.map((legend) => ({
    id: legend.id,
    label: legend.data.label || "Untitled legend",
    color: legend.data.legendColor ?? "#0ea5c6",
    count: legend.data.legendNodeIds?.length ?? 0,
  }));
  const width = 250;
  const height = 67 + entries.length * 43;

  if (existingKey) {
    return [
      ...withoutKey,
      {
        ...existingKey,
        data: { ...existingKey.data, legendEntries: entries },
        style: { ...existingKey.style, zIndex: 5 },
        deletable: false,
      },
    ];
  }

  const right = Math.max(
    ...legends.map((legend) => legend.position.x + Number(legend.style?.width ?? 420)),
  );
  const top = Math.min(...legends.map((legend) => legend.position.y));
  return [
    ...withoutKey,
    {
      id: `legend-key-${Date.now()}`,
      type: "architecture",
      position: { x: right + 70, y: top },
      data: {
        label: "Legend",
        description: "",
        shape: "legend-key",
        icon: "dashboard",
        tone: "slate",
        legendEntries: entries,
      },
      style: { width, height, zIndex: 5, "--legend-scale": 1 } as CSSProperties,
      deletable: false,
    },
  ];
};

const initialNodes: ArchitectureNode[] = [
  n("start", 910, 10, "Start", "Student opens CollieAI", "terminal", "play", "emerald"),
  n("app", 875, 135, "Parent / Teacher App", "React · Expo · Next.js candidate", "service", "app", "cyan"),
  n("input", 850, 285, "Multimodal Input", "Text · selected object · voice · image", "service", "input", "violet"),
  n("media", 900, 440, "Media included?", "Route uploads before the request", "decision", "decision", "amber"),
  n("storage", 1260, 430, "Object Storage", "Supabase Storage · S3 candidate", "cloud", "storage", "violet"),
  n("api", 870, 610, "Backend API", "Auth · validation · rate limits · roles", "service", "server", "cyan"),
  n("session", 870, 755, "Tutoring Session Service", "Creates sessions and session states", "service", "session", "cyan"),
  n("classifier", 870, 900, "Response Classifier", "Understands answer, help, or off-topic intent", "service", "brain", "violet"),
  n("response", 900, 1050, "Student response type?", "Submitted answer or help request", "decision", "decision", "amber"),
  n("answer-check", 410, 1220, "Answer correct?", "Evaluate submitted answer", "decision", "decision", "amber"),
  n("correct", 120, 1400, "Record Correct Attempt", "Store successful learning event", "service", "check", "emerald"),
  n("wrong", 470, 1400, "Record Wrong Attempt", "Store retry and error context", "service", "input", "rose"),
  n("help-check", 1360, 1220, "Help request valid?", "Confused, help, or off-topic", "decision", "decision", "amber"),
  n("help", 1210, 1400, "Record Help Event", "Capture confused or help request", "service", "input", "violet"),
  n("redirect", 1530, 1400, "Redirect Student", "Return to the current lesson", "service", "route", "slate"),
  n("router", 850, 1570, "Event Router", "Separates answer attempts from help events", "service", "route", "cyan"),
  n("events-db", 850, 1740, "Learning Event Database", "Postgres · attempts · help · breakdowns", "database", "database", "cyan"),
  n("n8n", 210, 1930, "n8n Orchestrator", "Jobs · retries · background automation", "service", "workflow", "slate"),
  n("feature", 210, 2080, "Feature Aggregation Worker", "Builds student_skill_features", "service", "worker", "slate"),
  n("ml", 210, 2230, "ML Prediction Worker", "Risk · mastery · recommendations", "service", "brain", "violet"),
  n("intervention", 240, 2380, "Intervention required?", "Apply prediction threshold", "decision", "decision", "amber"),
  n("plan", 40, 2550, "Create Intervention Plan", "Lesson · hint · review data · mastery target", "service", "sparkles", "rose"),
  n("alert", 40, 2710, "Parent / Teacher Alert", "Dashboard · email · push notification", "cloud", "alert", "rose"),
  n("prediction-db", 480, 2550, "Prediction Tables", "Recommendations stored in Postgres", "database", "database", "slate"),
  n("dashboard", 480, 2710, "Dashboard Views", "Progress · mastery · risks · recommendations", "service", "dashboard", "emerald"),
  n("engine", 1360, 1930, "Adaptive Learning Engine", "Counter → object reframe → visual hint", "service", "sparkles", "violet"),
  n("adaptive-feature", 1360, 2080, "Feature Aggregation Worker", "Loads current student context", "service", "worker", "slate"),
  n("tutor", 1360, 2230, "AI Tutor / LLM Service", "Generates child-friendly prompts", "service", "bot", "violet"),
  n("memory", 1090, 2410, "Vector / Memory Store", "pgvector · knowledge chunks · prompt memory", "database", "memory", "slate"),
  n("adaptive-ui", 1510, 2410, "Adaptive UI Response", "Hint · counter · reframe · guided feedback", "cloud", "sparkles", "cyan"),
  n("continue", 1600, 2580, "Continue practicing?", "Loop or finish the lesson", "decision", "decision", "amber"),
  n("end", 1600, 2750, "End", "Session complete", "terminal", "check", "emerald"),
];

const edge = (
  id: string,
  source: string,
  target: string,
  label?: string,
  dashed = false,
  sourceHandle?: string,
  targetHandle?: string,
): Edge => ({
  id,
  source,
  target,
  label,
  sourceHandle: sourceHandle ?? "bottom-0",
  targetHandle: targetHandle ?? "top-0",
  type: "smoothstep",
  animated: dashed,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
  style: { stroke: "#64748b", strokeWidth: 1.7, strokeDasharray: dashed ? "6 5" : undefined },
  labelStyle: { fill: "#334155", fontWeight: 700, fontSize: 12 },
  labelBgStyle: { fill: "#ffffff", fillOpacity: 1, stroke: "#ffffff", strokeWidth: 4 },
  labelBgPadding: [6, 4],
  labelBgBorderRadius: 5,
});

const initialEdges: Edge[] = [
  edge("e1", "start", "app"),
  edge("e2", "app", "input"),
  edge("e3", "input", "media"),
  edge("e4", "media", "storage", "Yes", false, "de1-2", "left-0"),
  edge("e5", "media", "api", "No", false, "de2-2"),
  edge("e6", "storage", "api", "File reference", false, undefined, "left-0"),
  edge("e7", "api", "session"),
  edge("e8", "session", "classifier"),
  edge("e9", "classifier", "response", undefined, false, undefined, "de0-2"),
  edge("e10", "response", "answer-check", "Submitted answer", false, "de3-2", "de3-2"),
  edge("e11", "response", "help-check", "Help or other input", false, "de1-2", "de3-2"),
  edge("e12", "answer-check", "correct", "Yes", false, "de3-2", "left-0"),
  edge("e13", "answer-check", "wrong", "No", false, "de2-2"),
  edge("e14", "help-check", "help", "Yes", false, "de3-2", "left-0"),
  edge("e15", "help-check", "redirect", "Off-topic", false, "de1-2", "left-0"),
  edge("e16", "correct", "router"),
  edge("e17", "wrong", "router"),
  edge("e18", "help", "router"),
  edge("e19", "redirect", "router"),
  edge("e20", "router", "events-db"),
  edge("e21", "events-db", "n8n", "Analytics path", false, undefined, "left-0"),
  edge("e22", "n8n", "feature"),
  edge("e23", "feature", "ml"),
  edge("e24", "ml", "intervention", undefined, false, undefined, "de0-2"),
  edge("e25", "intervention", "plan", "Yes", false, "de3-2", "left-0"),
  edge("e26", "plan", "alert"),
  edge("e27", "intervention", "prediction-db", "No", false, "de1-2", "left-0"),
  edge("e28", "prediction-db", "dashboard"),
  edge("e29", "events-db", "engine", "Tutoring path", false, "right-0", "left-0"),
  edge("e30", "engine", "adaptive-feature"),
  edge("e31", "adaptive-feature", "tutor"),
  edge("e32", "tutor", "memory", "Retrieve context", false, undefined, "right-0"),
  edge("e33", "tutor", "adaptive-ui"),
  edge("e34", "adaptive-ui", "continue", undefined, false, undefined, "de0-2"),
  edge("e35", "continue", "end", "No", false, "de2-2"),
  edge("e36", "continue", "input", "Yes · next turn", true, "de0-2", "right-0"),
];

const shapeOptions: { value: NodeShape; label: string }[] = [
  { value: "service", label: "Service" },
  { value: "decision", label: "Diamond" },
  { value: "database", label: "Database" },
  { value: "cloud", label: "Cloud" },
  { value: "terminal", label: "Start / End" },
];

const iconOptions: { value: NodeIcon; label: string }[] = [
  { value: "server", label: "Service" },
  { value: "decision", label: "Decision" },
  { value: "database", label: "Database" },
  { value: "storage", label: "Storage" },
  { value: "workflow", label: "Workflow" },
  { value: "worker", label: "Worker" },
  { value: "brain", label: "AI / ML" },
  { value: "bot", label: "Tutor" },
  { value: "dashboard", label: "Dashboard" },
  { value: "alert", label: "Alert" },
];

const createNodeDraft = (): ArchitectureNodeData => ({
  label: "New Service",
  description: "Describe its responsibility",
  shape: "service",
  icon: "server",
  tone: "cyan",
});

const createLegendDraft = (): LegendDraft => ({
  label: "User",
  color: "#0ea5c6",
  opacity: 0.12,
  nodeIds: [],
});

const PAGE_INDEX_KEY = "collieai-architecture-pages-v1";
const LEGACY_STORAGE_KEY = "collieai-architecture-v1";
const defaultPages: DiagramPage[] = [{ id: "main", name: "Main architecture" }];
const pageStorageKey = (pageId: string) => `collieai-architecture-page-${pageId}`;
const historyStorageKey = (pageId: string) => `collieai-architecture-history-${pageId}`;
const MAX_HISTORY_ENTRIES = 40;

const diagramSignature = (nodes: ArchitectureNode[], edges: Edge[]) =>
  JSON.stringify({ nodes, edges }, (key, value) =>
    ["selected", "dragging", "resizing", "measured", "_animState"].includes(key) ? undefined : value,
  );

const describeDiagramChange = (
  previous: DiagramHistoryEntry | undefined,
  nodes: ArchitectureNode[],
  edges: Edge[],
) => {
  if (!previous) return "Created first saved version";
  const nodeDelta = nodes.length - previous.nodes.length;
  const edgeDelta = edges.length - previous.edges.length;
  const changes: string[] = [];
  if (nodeDelta > 0) changes.push(`Added ${nodeDelta} component${nodeDelta === 1 ? "" : "s"}`);
  if (nodeDelta < 0) changes.push(`Removed ${Math.abs(nodeDelta)} component${nodeDelta === -1 ? "" : "s"}`);
  if (edgeDelta > 0) changes.push(`Added ${edgeDelta} connection${edgeDelta === 1 ? "" : "s"}`);
  if (edgeDelta < 0) changes.push(`Removed ${Math.abs(edgeDelta)} connection${edgeDelta === -1 ? "" : "s"}`);
  return changes.join(" · ") || "Updated layout or content";
};

const removeAnimationEdgeClasses = (className?: string) =>
  (className ?? "")
    .split(/\s+/)
    .filter((name) => name && name !== "anim-edge-active" && name !== "anim-edge-completed")
    .join(" ");

function FlowWorkspace() {
  const [nodes, setNodes, onNodesChange] = useNodesState<ArchitectureNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [legendCreatorOpen, setLegendCreatorOpen] = useState(false);
  const [docsExportOpen, setDocsExportOpen] = useState(false);
  const [docsExportMode, setDocsExportMode] = useState<DocsExportMode>("readable");
  const [docsShowTitles, setDocsShowTitles] = useState(true);
  const [docsShowDescriptions, setDocsShowDescriptions] = useState(true);
  const [docsTitleScale, setDocsTitleScale] = useState(1);
  const [docsDescriptionScale, setDocsDescriptionScale] = useState(1);
  const [docsEdgeLabelScale, setDocsEdgeLabelScale] = useState(1);
  const [docsExportZoom, setDocsExportZoom] = useState(1);
  const [docsPreviewReady, setDocsPreviewReady] = useState(false);
  const [docsPreviewing, setDocsPreviewing] = useState(false);
  const [docsPreviewRefreshTick, setDocsPreviewRefreshTick] = useState(0);
  const [docsInspectZoom, setDocsInspectZoom] = useState(1.6);
  const [docsPreviewPan, setDocsPreviewPan] = useState({ x: 0, y: 0 });
  const docsPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const docsPreviewRenderIdRef = useRef(0);
  const docsPreviewInFlightRef = useRef(false);
  const docsPreviewDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [pages, setPages] = useState<DiagramPage[]>(defaultPages);
  const [trashedPages, setTrashedPages] = useState<DiagramPage[]>([]);
  const [activePageId, setActivePageId] = useState("main");
  const [pagesOpen, setPagesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<DiagramHistoryEntry[]>([]);
  const [autoSaveState, setAutoSaveState] = useState<"saved" | "saving">("saved");
  const [trashOpen, setTrashOpen] = useState(false);
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [nodeDraft, setNodeDraft] = useState<ArchitectureNodeData>(createNodeDraft);
  const [applyTitleSizeToAll, setApplyTitleSizeToAll] = useState(false);
  const [applyDescriptionSizeToAll, setApplyDescriptionSizeToAll] = useState(false);
  const [legendDraft, setLegendDraft] = useState<LegendDraft>(createLegendDraft);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const historyReadyRef = useRef(false);
  const lastHistorySignatureRef = useRef("");
  const animationStorageKeySuffix = useCallback((pageId: string) => `collieai-animation-${pageId}`, []);
  const [animationOpen, setAnimationOpen] = useState(false);
  const [animationMode, setAnimationMode] = useState<"editing" | "presentation">("editing");
  const [animationSequences, setAnimationSequences] = useState<AnimationSequence[]>([]);
  const [animationBranchChoices, setAnimationBranchChoices] = useState<Record<string, string>>({});
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [animationPaused, setAnimationPaused] = useState(false);
  const [animActiveIds, setAnimActiveIds] = useState<Set<string>>(new Set());
  const [animCompletedIds, setAnimCompletedIds] = useState<Set<string>>(new Set());
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const textSizeMeasureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { fitView, screenToFlowPosition } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    // React Flow's internal ResizeObserver can occasionally finish a resize
    // after the browser's delivery pass. It is non-fatal, but Vite displays it
    // as a full-screen error. Suppress that browser-only notification only.
    const resizeObserverMessage =
      "ResizeObserver loop completed with undelivered notifications";
    const isResizeObserverNotification = (value: unknown) =>
      String(value instanceof Error ? value.message : value).includes(resizeObserverMessage);

    const suppressResizeObserverNotification = (event: ErrorEvent) => {
      if (!isResizeObserverNotification(event.error ?? event.message)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const suppressResizeObserverRejection = (event: PromiseRejectionEvent) => {
      if (!isResizeObserverNotification(event.reason)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    // Vinext installs its listener before the application hydrates. Guard its
    // overlay root as a fallback and leave it visible for every genuine error.
    const updateVinextOverlayVisibility = () => {
      const overlayRoot = document.getElementById("__vinext_dev_error_overlay_root");
      if (!overlayRoot) return;
      overlayRoot.style.display = overlayRoot.textContent?.includes(resizeObserverMessage)
        ? "none"
        : "";
    };
    const overlayObserver = new MutationObserver(updateVinextOverlayVisibility);
    overlayObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    updateVinextOverlayVisibility();

    window.addEventListener("error", suppressResizeObserverNotification, true);
    window.addEventListener("unhandledrejection", suppressResizeObserverRejection, true);
    return () => {
      overlayObserver.disconnect();
      window.removeEventListener("error", suppressResizeObserverNotification, true);
      window.removeEventListener("unhandledrejection", suppressResizeObserverRejection, true);
    };
  }, []);

  useEffect(() => {
    try {
      const savedIndex = window.localStorage.getItem(PAGE_INDEX_KEY);
      const parsedIndex = savedIndex
        ? (JSON.parse(savedIndex) as {
            pages?: DiagramPage[];
            trashedPages?: DiagramPage[];
            activePageId?: string;
          })
        : null;
      const restoredPages = parsedIndex?.pages?.length ? parsedIndex.pages : defaultPages;
      const restoredActive =
        restoredPages.find((page) => page.id === parsedIndex?.activePageId)?.id ??
        restoredPages[0].id;
      const pageData =
        window.localStorage.getItem(pageStorageKey(restoredActive)) ??
        (restoredActive === "main" ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null);

      setPages(restoredPages);
      setTrashedPages(parsedIndex?.trashedPages ?? []);
      setActivePageId(restoredActive);
      const storedHistory = window.localStorage.getItem(historyStorageKey(restoredActive));
      const restoredHistory = storedHistory
        ? (JSON.parse(storedHistory) as DiagramHistoryEntry[])
        : [];
      setHistoryEntries(restoredHistory);
      lastHistorySignatureRef.current = restoredHistory[0]
        ? diagramSignature(restoredHistory[0].nodes, restoredHistory[0].edges)
        : "";
      const storedAnimation = window.localStorage.getItem(`collieai-animation-${restoredActive}`);
      if (storedAnimation) {
        try {
          const parsed = JSON.parse(storedAnimation) as {
            sequences?: AnimationSequence[];
            activeSequenceId?: string;
            branchChoices?: Record<string, string>;
          };
          setAnimationSequences(parsed.sequences ?? []);
          setAnimationBranchChoices(parsed.branchChoices ?? {});
          if (parsed.activeSequenceId && (parsed.sequences ?? []).some((s: AnimationSequence) => s.id === parsed.activeSequenceId)) {
            setActiveSequenceId(parsed.activeSequenceId);
          }
        } catch { /* ignore */ }
      }
      if (pageData) {
        const parsed = JSON.parse(pageData) as { nodes?: ArchitectureNode[]; edges?: Edge[] };
        setNodes(synchronizeLegendKey(parsed.nodes ?? []));
        setEdges(parsed.edges ?? []);
      } else if (restoredActive !== "main") {
        setNodes([]);
        setEdges([]);
      }
    } catch {
      window.localStorage.removeItem(PAGE_INDEX_KEY);
    }
    window.setTimeout(() => {
      historyReadyRef.current = true;
    }, 0);
  }, [setEdges, setNodes]);

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null;
  const selectedLegend = selectedNode?.data.shape === "legend" ? selectedNode : null;
  const selectedLegendKey = selectedNode?.data.shape === "legend-key" ? selectedNode : null;
  const selectedEdge = edges.find((edgeItem) => edgeItem.id === selectedEdgeId) ?? null;
  const historyGroups = historyEntries.reduce<{ key: string; label: string; entries: DiagramHistoryEntry[] }[]>(
    (groups, entry) => {
      const date = new Date(entry.timestamp);
      const key = [date.getFullYear(), date.getMonth(), date.getDate()].join("-");
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.entries.push(entry);
        return groups;
      }
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const isSameDay = (candidate: Date) =>
        candidate.getFullYear() === date.getFullYear() &&
        candidate.getMonth() === date.getMonth() &&
        candidate.getDate() === date.getDate();
      groups.push({
        key,
        label: isSameDay(today)
          ? "Today"
          : isSameDay(yesterday)
            ? "Yesterday"
            : date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
        entries: [entry],
      });
      return groups;
    },
    [],
  );
  const componentNodes = nodes.filter(
    (node) => node.data.shape !== "legend" && node.data.shape !== "legend-key",
  );
  const updateSelected = useCallback(
    (patch: Partial<ArchitectureNodeData>) => {
      if (!selectedId) return;
      setNodes((current) => {
        const selectedShape = current.find((node) => node.id === selectedId)?.data.shape;
        const updated = current.map((node) =>
          node.id === selectedId ? { ...node, data: { ...node.data, ...patch } } : node,
        );
        return selectedShape === "legend" ? synchronizeLegendKey(updated) : updated;
      });
    },
    [selectedId, setNodes],
  );

  const updateTextSize = (key: "titleSize" | "descriptionSize", value: number, applyToAll: boolean) => {
    if (!selectedId) return;
    const affectedNodeIds: string[] = [];
    setNodes((current) =>
      current.map((node) => {
        const isComponent = node.data.shape !== "legend" && node.data.shape !== "legend-key";
        if (!isComponent || (!applyToAll && node.id !== selectedId)) return node;
        affectedNodeIds.push(node.id);
        const nextData = { ...node.data, [key]: value };
        const base = defaultShapeSize(node.data.shape);
        const textScale = Math.max(
          1,
          (nextData.titleSize ?? 13) / 13,
          (nextData.descriptionSize ?? 10) / 10,
        );
        const shapeScale = 1 + (textScale - 1) * 0.55;
        const requiredWidth = Math.ceil(base.width * shapeScale);
        const requiredHeight = Math.ceil(base.height * shapeScale);
        return {
          ...node,
          data: nextData,
          // Keep React Flow's measured node box in sync with the card style.
          // Without these two properties, some nodes keep their old outer
          // dimensions after a global text-size update.
          width: requiredWidth,
          height: requiredHeight,
          style: {
            ...node.style,
            // This is derived from the text scale, so reducing text restores
            // the node to its normal compact dimensions as well.
            width: requiredWidth,
            height: requiredHeight,
          },
        };
      }),
    );
    // React Flow needs one post-render measurement for the actively selected
    // node (its resize handles are mounted there). Updating every node on
    // every slider tick is costly and makes the “apply to all” slider lag.
    if (textSizeMeasureTimerRef.current) window.clearTimeout(textSizeMeasureTimerRef.current);
    textSizeMeasureTimerRef.current = window.setTimeout(() => {
      // One batched post-render measurement updates every connection anchor
      // without making the global slider wait for one node at a time.
      updateNodeInternals(affectedNodeIds);
      textSizeMeasureTimerRef.current = null;
    }, 0);
  };

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
            style: { stroke: "#64748b", strokeWidth: 1.7 },
            labelStyle: { fill: "#334155", fontWeight: 700, fontSize: 12 },
            labelBgStyle: { fill: "#ffffff", fillOpacity: 1, stroke: "#ffffff", strokeWidth: 4 },
            labelBgPadding: [6, 4],
            labelBgBorderRadius: 5,
          },
          current,
        ),
      ),
    [setEdges],
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.sourceHandle) return true;
      return !edges.some(
        (e) => e.source === connection.source && e.sourceHandle === connection.sourceHandle,
      );
    },
    [edges],
  );

  const updateSelectedEdge = useCallback(
    (patch: Partial<Edge>) => {
      if (!selectedEdgeId) return;
      setEdges((current) =>
        current.map((edgeItem) =>
          edgeItem.id === selectedEdgeId ? { ...edgeItem, ...patch } : edgeItem,
        ),
      );
    },
    [selectedEdgeId, setEdges],
  );

  const setEdgeStyle = (dashed: boolean) => {
    if (!selectedEdge) return;
    updateSelectedEdge({
      animated: dashed,
      style: {
        ...selectedEdge.style,
        strokeDasharray: dashed ? "7 6" : undefined,
      },
    });
  };

  const removeSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setEdges((current) => current.filter((edgeItem) => edgeItem.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    setInspectorOpen(false);
  };

  const persistPageIndex = (
    nextPages: DiagramPage[],
    nextActivePageId: string,
    nextTrashedPages: DiagramPage[] = trashedPages,
  ) => {
    window.localStorage.setItem(
      PAGE_INDEX_KEY,
      JSON.stringify({
        pages: nextPages,
        trashedPages: nextTrashedPages,
        activePageId: nextActivePageId,
      }),
    );
  };

  const persistCurrentPage = () => {
    const cleanNodes = nodes.map((n) => {
      const { _animState, ...cleanData } = n.data;
      return { ...n, data: cleanData };
    });
    window.localStorage.setItem(pageStorageKey(activePageId), JSON.stringify({ nodes: cleanNodes, edges }));
    if (activePageId === "main") {
      window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ nodes: cleanNodes, edges }));
    }
  };

  const persistAnimationData = () => {
    window.localStorage.setItem(
      `collieai-animation-${activePageId}`,
      JSON.stringify({ sequences: animationSequences, activeSequenceId, branchChoices: animationBranchChoices }),
    );
  };

  const loadHistory = (pageId: string) => {
    try {
      const stored = window.localStorage.getItem(historyStorageKey(pageId));
      const nextHistory = stored ? (JSON.parse(stored) as DiagramHistoryEntry[]) : [];
      setHistoryEntries(nextHistory);
      lastHistorySignatureRef.current = nextHistory[0]
        ? diagramSignature(nextHistory[0].nodes, nextHistory[0].edges)
        : "";
    } catch {
      setHistoryEntries([]);
      lastHistorySignatureRef.current = "";
    }
  };

  const loadPage = (pageId: string) => {
    const stored =
      window.localStorage.getItem(pageStorageKey(pageId)) ??
      (pageId === "main" ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null);
    if (!stored) {
      setNodes(pageId === "main" ? initialNodes : []);
      setEdges(pageId === "main" ? initialEdges : []);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as { nodes?: ArchitectureNode[]; edges?: Edge[] };
      setNodes(synchronizeLegendKey(parsed.nodes ?? []));
      setEdges(parsed.edges ?? []);
    } catch {
      setNodes(pageId === "main" ? initialNodes : []);
      setEdges(pageId === "main" ? initialEdges : []);
    }
  };

  const switchPage = (pageId: string) => {
    if (pageId === activePageId) {
      setPagesOpen(false);
      return;
    }
    persistCurrentPage();
    persistPageIndex(pages, pageId);
    historyReadyRef.current = false;
    setActivePageId(pageId);
    loadPage(pageId);
    loadHistory(pageId);
    setSelectedId(null);
    setSelectedEdgeId(null);
    setAnimationOpen(false);
    if (animationMode === "presentation") stopPlayback();
    else clearAnimationEffects();
    setInspectorOpen(false);
    setPagesOpen(false);
    setHistoryOpen(false);
    window.setTimeout(() => {
      historyReadyRef.current = true;
    }, 0);
    window.setTimeout(() => fitView({ padding: 0.12, duration: 450 }), 40);
  };

  const addPage = () => {
    persistCurrentPage();
    const page: DiagramPage = {
      id: `page-${Date.now()}`,
      name: `Architecture page ${pages.length + 1}`,
    };
    const nextPages = [...pages, page];
    window.localStorage.setItem(pageStorageKey(page.id), JSON.stringify({ nodes: [], edges: [] }));
    persistPageIndex(nextPages, page.id);
    setPages(nextPages);
    setActivePageId(page.id);
    setHistoryEntries([]);
    lastHistorySignatureRef.current = "";
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
    setSelectedEdgeId(null);
    setInspectorOpen(false);
  };

  const renamePage = (pageId: string, name: string) => {
    const nextPages = pages.map((page) => (page.id === pageId ? { ...page, name } : page));
    setPages(nextPages);
    persistPageIndex(nextPages, activePageId);
  };

  const requestPageDeletion = (page: DiagramPage, mode: DeleteIntent["mode"]) => {
    setDeleteConfirmation("");
    setDeleteIntent({ page, mode });
  };

  const movePageToTrash = (page: DiagramPage) => {
    persistCurrentPage();
    let nextPages = pages.filter((item) => item.id !== page.id);
    let nextActive = activePageId;
    const nextTrashedPages = [
      { ...page, deletedAt: new Date().toISOString() },
      ...trashedPages.filter((item) => item.id !== page.id),
    ];

    if (nextPages.length === 0) {
      const replacement: DiagramPage = {
        id: `page-${Date.now()}`,
        name: "Main architecture",
      };
      nextPages = [replacement];
      nextActive = replacement.id;
      window.localStorage.setItem(
        pageStorageKey(replacement.id),
        JSON.stringify({ nodes: [], edges: [] }),
      );
    } else if (page.id === activePageId) {
      nextActive = nextPages[0].id;
    }

    setPages(nextPages);
    setTrashedPages(nextTrashedPages);
    setActivePageId(nextActive);
    persistPageIndex(nextPages, nextActive, nextTrashedPages);
    if (page.id === activePageId) loadPage(nextActive);
    setSelectedId(null);
    setSelectedEdgeId(null);
    setInspectorOpen(false);
  };

  const restorePage = (page: DiagramPage) => {
    const restoredPage = { id: page.id, name: page.name };
    const nextPages = [...pages, restoredPage];
    const nextTrashedPages = trashedPages.filter((item) => item.id !== page.id);
    setPages(nextPages);
    setTrashedPages(nextTrashedPages);
    persistPageIndex(nextPages, activePageId, nextTrashedPages);
  };

  const permanentlyDeletePage = (page: DiagramPage) => {
    const nextTrashedPages = trashedPages.filter((item) => item.id !== page.id);
    window.localStorage.removeItem(pageStorageKey(page.id));
    window.localStorage.removeItem(historyStorageKey(page.id));
    setTrashedPages(nextTrashedPages);
    persistPageIndex(pages, activePageId, nextTrashedPages);
  };

  const confirmPageDeletion = () => {
    if (!deleteIntent) return;
    const expectedName = deleteIntent.page.name.trim() || "Untitled page";
    if (deleteConfirmation !== expectedName) return;
    if (deleteIntent.mode === "trash") movePageToTrash(deleteIntent.page);
    else permanentlyDeletePage(deleteIntent.page);
    setDeleteIntent(null);
    setDeleteConfirmation("");
  };

  const activeSequence = animationSequences.find((s) => s.id === activeSequenceId) ?? null;

  const clearAnimationEffects = useCallback(() => {
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationTimerRef.current = null;
    animationFrameRef.current = null;
    setAnimationPlaying(false);
    setAnimationPaused(false);
    setAnimActiveIds(new Set());
    setAnimCompletedIds(new Set());
    setCurrentStepIndex(-1);
  }, []);

  const createSequence = () => {
    const newSeq: AnimationSequence = {
      id: `anim-${Date.now()}`,
      name: `Sequence ${animationSequences.length + 1}`,
      loop: false,
      playbackSpeed: 1,
      steps: [],
    };
    const next = [...animationSequences, newSeq];
    setAnimationSequences(next);
    setActiveSequenceId(newSeq.id);
    clearAnimationEffects();
    window.setTimeout(persistAnimationData, 0);
  };

  const decisionNodesWithBranches = nodes.filter(
    (node) =>
      node.data.shape === "decision" &&
      edges.filter((edgeItem) => edgeItem.source === node.id).length > 1,
  );

  const buildGuidedSequence = () => {
    const start = nodes.find((node) => node.id === "start") ?? nodes.find(
      (node) => !edges.some((edgeItem) => edgeItem.target === node.id),
    );
    if (!start) return;

    const steps: AnimationStep[] = [{
      id: `step-${Date.now()}-start`,
      elementIds: [start.id],
      duration: 900,
      delayAfter: 180,
    }];
    const visited = new Set([start.id]);
    let currentId = start.id;
    for (let index = 0; index < 80; index += 1) {
      const outgoing = edges.filter((edgeItem) => edgeItem.source === currentId);
      if (!outgoing.length) break;
      const chosenEdgeId = animationBranchChoices[currentId];
      const nextEdge = outgoing.find((edgeItem) => edgeItem.id === chosenEdgeId) ?? outgoing[0];
      if (visited.has(nextEdge.target)) break;
      steps.push({
        id: `step-${Date.now()}-${index}`,
        elementIds: [nextEdge.id, nextEdge.target],
        duration: 900,
        delayAfter: 180,
      });
      visited.add(nextEdge.target);
      currentId = nextEdge.target;
    }

    const sequence: AnimationSequence = {
      id: `anim-${Date.now()}`,
      name: `Guided flow ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
      loop: false,
      playbackSpeed: 1,
      steps,
    };
    setAnimationSequences((previous) => [...previous, sequence]);
    setActiveSequenceId(sequence.id);
    clearAnimationEffects();
    window.setTimeout(persistAnimationData, 0);
  };

  const duplicateSequence = (seqId: string) => {
    const seq = animationSequences.find((s) => s.id === seqId);
    if (!seq) return;
    const copy: AnimationSequence = {
      ...JSON.parse(JSON.stringify(seq)),
      id: `anim-${Date.now()}`,
      name: `${seq.name} (copy)`,
    };
    setAnimationSequences((prev) => [...prev, copy]);
    window.setTimeout(persistAnimationData, 0);
  };

  const renameSequence = (seqId: string, name: string) => {
    setAnimationSequences((prev) => prev.map((s) => (s.id === seqId ? { ...s, name } : s)));
  };

  const deleteSequence = (seqId: string) => {
    clearAnimationEffects();
    setAnimationSequences((prev) => {
      const next = prev.filter((s) => s.id !== seqId);
      if (activeSequenceId === seqId) {
        setActiveSequenceId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
    window.setTimeout(persistAnimationData, 0);
  };

  const addStep = (elementIds: string[]) => {
    if (!activeSequence) return;
    const newStep: AnimationStep = {
      id: `step-${Date.now()}`,
      elementIds,
      duration: 1200,
      delayAfter: 300,
    };
    setAnimationSequences((prev) =>
      prev.map((s) =>
        s.id === activeSequenceId ? { ...s, steps: [...s.steps, newStep] } : s,
      ),
    );
    window.setTimeout(persistAnimationData, 0);
  };

  const removeStep = (stepId: string) => {
    setAnimationSequences((prev) =>
      prev.map((s) =>
        s.id === activeSequenceId
          ? { ...s, steps: s.steps.filter((st) => st.id !== stepId) }
          : s,
      ),
    );
    window.setTimeout(persistAnimationData, 0);
  };

  const duplicateStep = (stepId: string) => {
    if (!activeSequence) return;
    const idx = activeSequence.steps.findIndex((st) => st.id === stepId);
    if (idx === -1) return;
    const copy: AnimationStep = {
      ...JSON.parse(JSON.stringify(activeSequence.steps[idx])),
      id: `step-${Date.now()}`,
    };
    setAnimationSequences((prev) =>
      prev.map((s) =>
        s.id === activeSequenceId
          ? { ...s, steps: [...s.steps.slice(0, idx + 1), copy, ...s.steps.slice(idx + 1)] }
          : s,
      ),
    );
    window.setTimeout(persistAnimationData, 0);
  };

  const moveStep = (stepId: string, direction: -1 | 1) => {
    if (!activeSequence) return;
    const idx = activeSequence.steps.findIndex((st) => st.id === stepId);
    if (idx === -1) return;
    const target = idx + direction;
    if (target < 0 || target >= activeSequence.steps.length) return;
    const steps = [...activeSequence.steps];
    [steps[idx], steps[target]] = [steps[target], steps[idx]];
    setAnimationSequences((prev) =>
      prev.map((s) => (s.id === activeSequenceId ? { ...s, steps } : s)),
    );
    window.setTimeout(persistAnimationData, 0);
  };

  const updateStep = (stepId: string, patch: Partial<AnimationStep>) => {
    setAnimationSequences((prev) =>
      prev.map((s) =>
        s.id === activeSequenceId
          ? { ...s, steps: s.steps.map((st) => (st.id === stepId ? { ...st, ...patch } : st)) }
          : s,
      ),
    );
  };

  const toggleLoop = () => {
    if (!activeSequence) return;
    setAnimationSequences((prev) =>
      prev.map((s) =>
        s.id === activeSequenceId ? { ...s, loop: !s.loop } : s,
      ),
    );
  };

  const setPlaybackSpeed = (speed: number) => {
    if (!activeSequence) return;
    setAnimationSequences((prev) =>
      prev.map((s) => (s.id === activeSequenceId ? { ...s, playbackSpeed: speed } : s)),
    );
  };

  const playStep = useCallback((stepIndex: number) => {
    if (!activeSequence || stepIndex < 0 || stepIndex >= activeSequence.steps.length) {
      clearAnimationEffects();
      return;
    }
    const step = activeSequence.steps[stepIndex];
    const speed = activeSequence.playbackSpeed || 1;
    const effectiveDuration = step.duration / speed;

    setCurrentStepIndex(stepIndex);
    const edgeIds = step.elementIds.filter((id) => edges.some((e) => e.id === id));
    // Playback is intentionally connector-only: nodes remain still and the
    // travelling light can never extend beyond the actual SVG edge path.
    setAnimActiveIds(new Set(edgeIds));
    if (edgeIds.length > 0) {
      setEdges((prev) =>
        prev.map((e) =>
          edgeIds.includes(e.id)
            ? {
                ...e,
                className: `${removeAnimationEdgeClasses(e.className)} anim-edge-active`.trim(),
                type: "flowing",
                data: { ...e.data, _flowDuration: effectiveDuration },
                animated: false,
                style: {
                  ...e.style,
                  stroke: "#64748b",
                  strokeWidth: 1.7,
                  strokeDasharray: undefined,
                },
              }
            : e,
        ),
      );
    }

    animationTimerRef.current = setTimeout(() => {
      setAnimCompletedIds((prev) => {
        const next = new Set(prev);
        edgeIds.forEach((id) => next.add(id));
        return next;
      });
      setAnimActiveIds(new Set());

      const edgeIdsCompleted = step.elementIds.filter((id) => edges.some((e) => e.id === id));
      if (edgeIdsCompleted.length > 0) {
        setEdges((prev) =>
          prev.map((e) =>
            edgeIdsCompleted.includes(e.id)
              ? {
                  ...e,
                  className: `${removeAnimationEdgeClasses(e.className)} anim-edge-completed`.trim(),
                  type: "smoothstep",
                  data: { ...e.data, _flowDuration: undefined },
                  animated: false,
                  style: { ...e.style, stroke: "#94a3b8", strokeWidth: 1.7, strokeDasharray: undefined },
                }
              : e,
          ),
        );
      }

      const delay = (step.delayAfter || 300) / speed;
      animationTimerRef.current = setTimeout(() => {
        const nextIndex = stepIndex + 1;
        if (nextIndex < activeSequence.steps.length) {
          playStep(nextIndex);
        } else if (activeSequence.loop) {
          setAnimCompletedIds(new Set());
          setCurrentStepIndex(-1);
          playStep(0);
        } else {
          clearAnimationEffects();
        }
      }, delay);
    }, effectiveDuration);
  }, [activeSequence, edges, setEdges, clearAnimationEffects]);

  const startPlayback = useCallback(() => {
    if (!activeSequence || activeSequence.steps.length === 0) return;
    setAnimationMode("presentation");
    setCurrentStepIndex(-1);
    setAnimActiveIds(new Set());
    setAnimCompletedIds(new Set());
    playStep(0);
  }, [activeSequence, playStep]);

  const pausePlayback = () => {
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    setAnimationPaused(true);
    setAnimationPlaying(false);
  };

  const resumePlayback = useCallback(() => {
    if (!animationPaused || currentStepIndex < 0) return;
    setAnimationPaused(false);
    const speed = activeSequence?.playbackSpeed || 1;
    const step = activeSequence?.steps[currentStepIndex];
    if (!step) return;
    const remaining = step.duration / speed;
    animationTimerRef.current = setTimeout(() => {
      setAnimCompletedIds((prev) => {
        const next = new Set(prev);
        step.elementIds
          .filter((id) => edges.some((edge) => edge.id === id))
          .forEach((id) => next.add(id));
        return next;
      });
      setAnimActiveIds(new Set());
      const delay = (step.delayAfter || 300) / speed;
      animationTimerRef.current = setTimeout(() => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < (activeSequence?.steps.length || 0)) {
          playStep(nextIndex);
        } else if (activeSequence?.loop) {
          setAnimCompletedIds(new Set());
          setCurrentStepIndex(-1);
          playStep(0);
        } else {
          clearAnimationEffects();
        }
      }, delay);
    }, remaining);
  }, [animationPaused, currentStepIndex, activeSequence, playStep, clearAnimationEffects, edges]);

  const goToStep = (stepIndex: number) => {
    if (!activeSequence || stepIndex < 0 || stepIndex >= activeSequence.steps.length) return;
    clearAnimationEffects();
    setAnimCompletedIds(new Set());
    if (stepIndex > 0) {
      const completed = new Set<string>();
      for (let i = 0; i < stepIndex; i++) {
        activeSequence.steps[i].elementIds
          .filter((id) => edges.some((edge) => edge.id === id))
          .forEach((id) => completed.add(id));
      }
      setAnimCompletedIds(completed);
    }
    setCurrentStepIndex(stepIndex);
  };

  const previousStep = () => {
    if (!activeSequence) return;
    const prev = Math.max(0, currentStepIndex - 1);
    clearAnimationEffects();
    goToStep(prev);
  };

  const nextStep = useCallback(() => {
    if (!activeSequence) return;
    const nxt = Math.min(activeSequence.steps.length - 1, currentStepIndex + 1);
    clearAnimationEffects();
    goToStep(nxt);
  }, [activeSequence, currentStepIndex, clearAnimationEffects]);

  const stopPlayback = useCallback(() => {
    clearAnimationEffects();
    setAnimationMode("editing");
    setEdges((prev) =>
      prev.map((e) => ({
        ...e,
        className: removeAnimationEdgeClasses(e.className),
        type: "smoothstep",
        data: { ...e.data, _flowDuration: undefined },
        animated: false,
        style: { ...e.style, stroke: "#64748b", strokeWidth: 1.7, strokeDasharray: undefined },
      })),
    );
  }, [clearAnimationEffects, setEdges]);

  const exitPresentationMode = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  useEffect(() => {
    if (animationMode !== "presentation") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitPresentationMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [animationMode, exitPresentationMode]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const tryAddElementToSequence = useCallback((elementId: string) => {
    if (!activeSequence || animationMode !== "editing") return;
    const lastStep = activeSequence.steps[activeSequence.steps.length - 1];
    if (lastStep && lastStep.elementIds.length < 2 && !lastStep.elementIds.includes(elementId)) {
      updateStep(lastStep.id, { elementIds: [...lastStep.elementIds, elementId] });
    } else {
      addStep([elementId]);
    }
  }, [activeSequence, animationMode]);

  const saveDiagram = () => {
    persistCurrentPage();
    persistPageIndex(pages, activePageId, trashedPages);
    persistAnimationData();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  };

  useEffect(() => {
    if (!historyReadyRef.current) return;
    setAutoSaveState("saving");
    const autoSaveTimer = window.setTimeout(() => {
      const signature = diagramSignature(nodes, edges);
      const cleanDiagram = JSON.parse(signature) as {
        nodes: ArchitectureNode[];
        edges: Edge[];
      };
      window.localStorage.setItem(
        pageStorageKey(activePageId),
        JSON.stringify(cleanDiagram),
      );
      if (activePageId === "main") {
        window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(cleanDiagram));
      }
      window.localStorage.setItem(
        PAGE_INDEX_KEY,
        JSON.stringify({ pages, trashedPages, activePageId }),
      );

      if (signature !== lastHistorySignatureRef.current) {
        const entry: DiagramHistoryEntry = {
          id: `history-${Date.now()}`,
          timestamp: new Date().toISOString(),
          summary: describeDiagramChange(historyEntries[0], cleanDiagram.nodes, cleanDiagram.edges),
          nodes: cleanDiagram.nodes,
          edges: cleanDiagram.edges,
        };
        const nextHistory = [entry, ...historyEntries].slice(0, MAX_HISTORY_ENTRIES);
        setHistoryEntries(nextHistory);
        window.localStorage.setItem(historyStorageKey(activePageId), JSON.stringify(nextHistory));
        lastHistorySignatureRef.current = signature;
      }
      setAutoSaveState("saved");
    }, 900);

    return () => window.clearTimeout(autoSaveTimer);
  }, [activePageId, edges, historyEntries, nodes, pages, trashedPages]);

  const restoreHistoryEntry = (entry: DiagramHistoryEntry) => {
    const currentSignature = diagramSignature(nodes, edges);
    const currentDiagram = JSON.parse(currentSignature) as {
      nodes: ArchitectureNode[];
      edges: Edge[];
    };
    const recoveryEntry: DiagramHistoryEntry = {
      id: `history-${Date.now()}-recovery`,
      timestamp: new Date().toISOString(),
      summary: "Before restoring an earlier version",
      nodes: currentDiagram.nodes,
      edges: currentDiagram.edges,
    };
    const restoredEntry: DiagramHistoryEntry = {
      ...entry,
      id: `history-${Date.now()}-restored`,
      timestamp: new Date().toISOString(),
      summary: `Restored version from ${new Date(entry.timestamp).toLocaleString()}`,
    };
    const nextHistory = [restoredEntry, recoveryEntry, ...historyEntries].slice(
      0,
      MAX_HISTORY_ENTRIES,
    );
    historyReadyRef.current = false;
    setNodes(synchronizeLegendKey(entry.nodes));
    setEdges(entry.edges);
    setHistoryEntries(nextHistory);
    lastHistorySignatureRef.current = diagramSignature(entry.nodes, entry.edges);
    window.localStorage.setItem(
      pageStorageKey(activePageId),
      JSON.stringify({ nodes: entry.nodes, edges: entry.edges }),
    );
    window.localStorage.setItem(historyStorageKey(activePageId), JSON.stringify(nextHistory));
    if (activePageId === "main") {
      window.localStorage.setItem(
        LEGACY_STORAGE_KEY,
        JSON.stringify({ nodes: entry.nodes, edges: entry.edges }),
      );
    }
    setSelectedId(null);
    setSelectedEdgeId(null);
    setInspectorOpen(false);
    window.setTimeout(() => {
      historyReadyRef.current = true;
      fitView({ padding: 0.12, duration: 450 });
    }, 40);
  };

  const exportPng = async () => {
    if (exporting || nodes.length === 0) return;
    const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewport) return;

    setExporting(true);
    setExportNotice("Preparing a high-resolution smart crop…");
    setSelectedId(null);
    setSelectedEdgeId(null);
    setInspectorOpen(false);
    setNodes((current) => current.map((node) => ({ ...node, selected: false })));
    setEdges((current) => current.map((edgeItem) => ({ ...edgeItem, selected: false })));

    try {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      prepareExportSafeSvgPaint(viewport);
      const bounds = getNodesBounds(nodes);
      const padding = 180;
      const cropWidth = Math.ceil(bounds.width + padding * 2);
      const cropHeight = Math.ceil(bounds.height + padding * 2);
      const idealScale = 3;
      const maxDimension = 14_000;
      const maxPixels = 60_000_000;
      const safeScale = Math.min(
        idealScale,
        maxDimension / cropWidth,
        maxDimension / cropHeight,
        Math.sqrt(maxPixels / (cropWidth * cropHeight)),
      );
      const renderScale = Math.max(0.5, Math.floor(safeScale * 10) / 10);
      const exportWidth = Math.max(1, Math.floor(cropWidth * renderScale));
      const exportHeight = Math.max(1, Math.floor(cropHeight * renderScale));

      const dataUrl = await toPng(viewport, {
        backgroundColor: "#f6f8fb",
        cacheBust: true,
        pixelRatio: 1,
        width: exportWidth,
        height: exportHeight,
        style: {
          width: `${exportWidth}px`,
          height: `${exportHeight}px`,
          transformOrigin: "top left",
          transform: `translate(${(padding - bounds.x) * renderScale}px, ${
            (padding - bounds.y) * renderScale
          }px) scale(${renderScale})`,
        },
        filter: (domNode) =>
          !(
            domNode instanceof HTMLElement &&
            (domNode.classList.contains("react-flow__handle") ||
              domNode.classList.contains("react-flow__edgeupdater"))
          ),
      });

      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      link.download = `collieai-system-architecture-${stamp}.png`;
      link.href = dataUrl;
      link.click();
      setExportNotice(
        `Exported ${exportWidth.toLocaleString()} × ${exportHeight.toLocaleString()} PNG · ${renderScale.toFixed(1)}× detail`,
      );
    } catch {
      setExportNotice("PNG export could not finish. Try closing other large tabs and export again.");
    } finally {
      setExporting(false);
      window.setTimeout(() => setExportNotice(null), 5200);
    }
  };

  const setDocsViewportStyles = (viewport: HTMLElement, mode: DocsExportMode) => {
    viewport.classList.add("docs-custom-export");
    if (mode === "readable") viewport.classList.add("document-export-mode");
    if (!docsShowTitles) viewport.classList.add("docs-hide-titles");
    if (!docsShowDescriptions) viewport.classList.add("docs-hide-descriptions");
    viewport.style.setProperty("--docs-title-scale", String(docsTitleScale));
    viewport.style.setProperty("--docs-description-scale", String(docsDescriptionScale));
  };

  const prepareExportEdgeLabelStyles = (viewport: HTMLElement, scale: number) => {
    viewport.querySelectorAll<SVGTextElement>(".react-flow__edge-text").forEach((label) => {
      const existingSize = Number.parseFloat(getComputedStyle(label).fontSize);
      const baseSize = Number.isFinite(existingSize) ? existingSize : 12;
      label.dataset.exportBaseFontSize ??= String(baseSize);
      const preservedSize = Number.parseFloat(label.dataset.exportBaseFontSize);
      label.style.fontSize = `${(Number.isFinite(preservedSize) ? preservedSize : baseSize) * scale}px`;
    });
  };

  const clearDocsViewportStyles = (viewport: HTMLElement) => {
    viewport.classList.remove(
      "document-export-mode",
      "docs-custom-export",
      "docs-hide-titles",
      "docs-hide-descriptions",
    );
    viewport.style.removeProperty("--docs-title-scale");
    viewport.style.removeProperty("--docs-description-scale");
    viewport.querySelectorAll<SVGTextElement>(".react-flow__edge-text").forEach((label) => {
      label.style.removeProperty("font-size");
      delete label.dataset.exportBaseFontSize;
    });
  };

  const prepareExportSafeSvgPaint = (viewport: HTMLElement) => {
    viewport.querySelectorAll<SVGPathElement>(".decision-art path").forEach((path) => {
      const node = path.closest<HTMLElement>(".architecture-node");
      const stroke = node
        ? getComputedStyle(node).getPropertyValue("--node").trim()
        : "#0ea5c6";
      path.setAttribute("fill", "#ffffff");
      path.setAttribute("stroke", stroke || "#0ea5c6");
      path.setAttribute("stroke-width", "2.5");
    });
    viewport.querySelectorAll<SVGElement>(".database-art .db-body").forEach((path) => {
      const node = path.closest<HTMLElement>(".architecture-node");
      const color = node ? getComputedStyle(node).getPropertyValue("--node").trim() : "#0ea5c6";
      path.setAttribute("fill", "#ffffff");
      path.setAttribute("stroke", color || "#0ea5c6");
      path.setAttribute("stroke-width", "2");
    });
    viewport.querySelectorAll<SVGElement>(".database-art .db-top").forEach((path) => {
      const node = path.closest<HTMLElement>(".architecture-node");
      const color = node ? getComputedStyle(node).getPropertyValue("--node").trim() : "#0ea5c6";
      path.setAttribute("fill", "#ffffff");
      path.setAttribute("stroke", color || "#0ea5c6");
      path.setAttribute("stroke-width", "2");
    });
    viewport.querySelectorAll<SVGElement>(".cloud-art path").forEach((path) => {
      const node = path.closest<HTMLElement>(".architecture-node");
      const color = node ? getComputedStyle(node).getPropertyValue("--node").trim() : "#0ea5c6";
      path.setAttribute("fill", "#ffffff");
      path.setAttribute("stroke", color || "#0ea5c6");
      path.setAttribute("stroke-width", "2.5");
    });
    viewport.querySelectorAll<SVGRectElement>(".react-flow__edge-textbg").forEach((rect) => {
      rect.setAttribute("fill", "#ffffff");
      rect.setAttribute("stroke", "#ffffff");
      rect.setAttribute("stroke-width", "4");
    });
  };

  const getDocsLayout = (
    mode: DocsExportMode,
    outputScale = 1,
    manualZoom = docsExportZoom,
  ) => {
    const bounds = getNodesBounds(nodes);
    const cropPadding = mode === "readable" ? 140 : 115;
    const cropWidth = bounds.width + cropPadding * 2;
    const cropHeight = bounds.height + cropPadding * 2;
    const pageMargin = 55 * outputScale;
    const portrait = {
      width: Math.round(2550 * outputScale),
      height: Math.round(3300 * outputScale),
      name: "portrait",
    };
    const landscape = {
      width: Math.round(3300 * outputScale),
      height: Math.round(2550 * outputScale),
      name: "landscape",
    };
    const fitScale = (page: typeof portrait) =>
      Math.min(
        (page.width - pageMargin * 2) / cropWidth,
        (page.height - pageMargin * 2) / cropHeight,
      );
    const page = fitScale(portrait) >= fitScale(landscape) ? portrait : landscape;
    const renderScale = fitScale(page) * manualZoom;
    const contentWidth = cropWidth * renderScale;
    const contentHeight = cropHeight * renderScale;
    const originX = bounds.x - cropPadding;
    const originY = bounds.y - cropPadding;
    return {
      page,
      renderScale,
      translateX: (page.width - contentWidth) / 2 - originX * renderScale,
      translateY: (page.height - contentHeight) / 2 - originY * renderScale,
    };
  };

  const changeDocsInspectZoom = (change: number) => {
    setDocsInspectZoom((current) =>
      Math.min(4, Math.max(0.75, Math.round((current + change) * 10) / 10)),
    );
  };

  const fitDocsPreview = () => {
    setDocsInspectZoom(1);
    setDocsPreviewPan({ x: 0, y: 0 });
  };

  const exportDocsPng = async (mode: DocsExportMode) => {
    if (exporting || nodes.length === 0) return;
    const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewport) return;

    setExporting(true);
    setExportNotice(
      mode === "readable"
        ? "Building a readable single-page document image…"
        : "Fitting the full visual design onto one document page…",
    );
    setSelectedId(null);
    setSelectedEdgeId(null);
    setInspectorOpen(false);
    setNodes((current) => current.map((node) => ({ ...node, selected: false })));
    setEdges((current) => current.map((edgeItem) => ({ ...edgeItem, selected: false })));
    setDocsViewportStyles(viewport, mode);

    try {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      prepareExportSafeSvgPaint(viewport);
      prepareExportEdgeLabelStyles(viewport, docsEdgeLabelScale);
      const { page, renderScale, translateX, translateY } = getDocsLayout(mode);

      const blob = await toBlob(viewport, {
        backgroundColor: mode === "readable" ? "#ffffff" : "#f6f8fb",
        cacheBust: false,
        pixelRatio: 1,
        width: page.width,
        height: page.height,
        style: {
          width: `${page.width}px`,
          height: `${page.height}px`,
          transformOrigin: "top left",
          transform: `translate(${translateX}px, ${translateY}px) scale(${renderScale})`,
        },
        filter: (domNode) =>
          !(
            domNode instanceof HTMLElement &&
            (domNode.classList.contains("react-flow__handle") ||
              domNode.classList.contains("react-flow__edgeupdater"))
          ),
      });
      if (!blob) throw new Error("Document image could not be created");

      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      link.download = `collieai-architecture-docs-${mode}-${page.name}-${stamp}.png`;
      const downloadUrl = URL.createObjectURL(blob);
      link.href = downloadUrl;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
      setExportNotice(
        `Exported ${mode === "readable" ? "readable overview" : "full design"} · ${Math.round(
          docsTitleScale * 100,
        )}% text · ${Math.round(docsExportZoom * 100)}% zoom`,
      );
    } catch {
      setExportNotice("Document export could not finish. Try closing other large tabs and export again.");
    } finally {
      clearDocsViewportStyles(viewport);
      setExporting(false);
      window.setTimeout(() => setExportNotice(null), 5200);
    }
  };

  useEffect(() => {
    const renderId = ++docsPreviewRenderIdRef.current;

    if (!docsExportOpen || nodes.length === 0) {
      setDocsPreviewReady(false);
      setDocsPreviewing(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      // Canvas rendering cannot be interrupted safely. Coalesce rapid slider
      // changes instead of queueing an expensive render for every value.
      if (docsPreviewInFlightRef.current) return;
      docsPreviewInFlightRef.current = true;
      const renderPreview = async () => {
        if (cancelled || renderId !== docsPreviewRenderIdRef.current) {
          docsPreviewInFlightRef.current = false;
          return;
        }

        const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
        if (!viewport) {
          docsPreviewInFlightRef.current = false;
          return;
        }

        setDocsPreviewing(true);
        setDocsViewportStyles(viewport, docsExportMode);
        try {
          await document.fonts.ready;
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          if (cancelled || renderId !== docsPreviewRenderIdRef.current) return;

          const { page, renderScale, translateX, translateY } = getDocsLayout(
            docsExportMode,
            0.32,
          );
          prepareExportSafeSvgPaint(viewport);
          prepareExportEdgeLabelStyles(viewport, docsEdgeLabelScale);
          const renderedCanvas = await toCanvas(viewport, {
            backgroundColor: docsExportMode === "readable" ? "#ffffff" : "#f6f8fb",
            cacheBust: false,
            pixelRatio: 1,
            width: page.width,
            height: page.height,
            style: {
              width: `${page.width}px`,
              height: `${page.height}px`,
              transformOrigin: "top left",
              transform: `translate(${translateX}px, ${translateY}px) scale(${renderScale})`,
            },
            filter: (domNode) =>
              !(
                domNode instanceof HTMLElement &&
                (domNode.classList.contains("react-flow__handle") ||
                  domNode.classList.contains("react-flow__edgeupdater"))
              ),
          });
          if (cancelled || renderId !== docsPreviewRenderIdRef.current) return;

          const previewCanvas = docsPreviewCanvasRef.current;
          const context = previewCanvas?.getContext("2d");
          if (!previewCanvas || !context) throw new Error("Preview canvas is unavailable");

          previewCanvas.width = renderedCanvas.width;
          previewCanvas.height = renderedCanvas.height;
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          context.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
          context.drawImage(renderedCanvas, 0, 0);
          setDocsPreviewReady(true);
        } catch {
          if (!cancelled && renderId === docsPreviewRenderIdRef.current) {
            setDocsPreviewReady(false);
          }
        } finally {
          clearDocsViewportStyles(viewport);
          docsPreviewInFlightRef.current = false;
          if (!cancelled && renderId === docsPreviewRenderIdRef.current) {
            setDocsPreviewing(false);
          }
          if (renderId !== docsPreviewRenderIdRef.current) {
            setDocsPreviewRefreshTick((current) => current + 1);
          }
        }
      };
      void renderPreview();
    }, 75);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    docsExportMode,
    docsExportOpen,
    docsExportZoom,
    docsShowTitles,
    docsShowDescriptions,
    docsTitleScale,
    docsDescriptionScale,
    docsEdgeLabelScale,
    docsPreviewRefreshTick,
    edges,
    nodes,
  ]);

  const resetDiagram = () => {
    window.localStorage.removeItem(pageStorageKey(activePageId));
    if (activePageId === "main") window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    setNodes(activePageId === "main" ? initialNodes : []);
    setEdges(activePageId === "main" ? initialEdges : []);
    setSelectedId(null);
    setSelectedEdgeId(null);
    window.setTimeout(() => fitView({ padding: 0.08, duration: 500 }), 30);
  };

  const applySmartLandscapeLayout = () => {
    const components = nodes.filter(
      (node) => node.data.shape !== "legend" && node.data.shape !== "legend-key",
    );
    if (!components.length) return;

    const componentIds = new Set(components.map((node) => node.id));
    const incoming = new Map(components.map((node) => [node.id, 0]));
    const outgoing = new Map(components.map((node) => [node.id, [] as string[]]));
    edges.forEach((edgeItem) => {
      if (!componentIds.has(edgeItem.source) || !componentIds.has(edgeItem.target)) return;
      outgoing.get(edgeItem.source)?.push(edgeItem.target);
      incoming.set(edgeItem.target, (incoming.get(edgeItem.target) ?? 0) + 1);
    });

    const byId = new Map(components.map((node) => [node.id, node]));
    const layer = new Map<string, number>();
    const queue = components
      .filter((node) => (incoming.get(node.id) ?? 0) === 0)
      .sort((a, b) => a.position.y - b.position.y);
    queue.forEach((node) => layer.set(node.id, 0));

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      const currentLayer = layer.get(current.id) ?? 0;
      (outgoing.get(current.id) ?? []).forEach((targetId) => {
        layer.set(targetId, Math.max(layer.get(targetId) ?? 0, currentLayer + 1));
        const remaining = (incoming.get(targetId) ?? 1) - 1;
        incoming.set(targetId, remaining);
        if (remaining === 0 && byId.has(targetId)) queue.push(byId.get(targetId)!);
      });
    }

    // Cycles such as a “continue” route receive a final column instead of
    // preventing the rest of the diagram from being laid out.
    const lastLayer = Math.max(0, ...layer.values());
    components.forEach((node) => {
      if (!layer.has(node.id)) layer.set(node.id, lastLayer + 1);
    });

    const columns = new Map<number, ArchitectureNode[]>();
    components.forEach((node) => {
      const index = layer.get(node.id) ?? 0;
      columns.set(index, [...(columns.get(index) ?? []), node]);
    });
    const largestColumn = Math.max(...[...columns.values()].map((column) => column.length));
    const positioned = nodes.map((node) => {
      if (!componentIds.has(node.id)) return node;
      const columnIndex = layer.get(node.id) ?? 0;
      const column = (columns.get(columnIndex) ?? []).sort((a, b) => a.position.y - b.position.y);
      const rowIndex = column.findIndex((item) => item.id === node.id);
      return {
        ...node,
        position: {
          x: 80 + columnIndex * 370,
          y: 90 + (largestColumn - column.length) * 95 + rowIndex * 190,
        },
      };
    });
    const withLegendFrames = positioned.map((node) => {
      if (node.data.shape !== "legend") return node;
      const frame = getLegendFrame(positioned, node.data.legendNodeIds ?? []);
      return frame
        ? { ...node, position: frame.position, style: { ...node.style, width: frame.width, height: frame.height, zIndex: 0 } }
        : node;
    });

    setNodes(synchronizeLegendKey(withLegendFrames));
    setEdges((current) =>
      current.map((edgeItem) =>
        componentIds.has(edgeItem.source) && componentIds.has(edgeItem.target)
          ? { ...edgeItem, sourceHandle: "right", targetHandle: "left" }
          : edgeItem,
      ),
    );
    setSelectedId(null);
    setSelectedEdgeId(null);
    setExportNotice("Smart landscape layout applied.");
    window.setTimeout(() => setExportNotice(null), 2600);
    window.setTimeout(() => fitView({ padding: 0.1, duration: 550 }), 30);
  };

  const addNode = () => {
    if (!nodeDraft.label.trim()) return;
    const id = `service-${Date.now()}`;
    const canvasPoint = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    setNodes((current) => [
      ...current,
      n(
        id,
        canvasPoint.x - 135,
        canvasPoint.y - 45,
        nodeDraft.label.trim(),
        nodeDraft.description.trim(),
        nodeDraft.shape,
        nodeDraft.icon,
        nodeDraft.tone,
      ),
    ]);
    setSelectedId(id);
    setSelectedEdgeId(null);
    setCreatorOpen(false);
    setNodeDraft(createNodeDraft());
    setInspectorOpen(true);
  };

  const addLegendArea = () => {
    if (!legendDraft.label.trim() || legendDraft.nodeIds.length === 0) return;
    const frame = getLegendFrame(nodes, legendDraft.nodeIds);
    if (!frame) return;

    const id = `legend-${Date.now()}`;
    const legendNode: ArchitectureNode = {
      id,
      type: "architecture",
      position: frame.position,
      data: {
        label: legendDraft.label.trim(),
        description: "",
        shape: "legend",
        icon: "dashboard",
        tone: "slate",
        legendColor: legendDraft.color,
        legendOpacity: legendDraft.opacity,
        legendNodeIds: legendDraft.nodeIds,
      },
      style: {
        width: frame.width,
        height: frame.height,
        zIndex: -1,
      },
    };

    setNodes((current) => synchronizeLegendKey([legendNode, ...current]));
    setSelectedId(id);
    setSelectedEdgeId(null);
    setLegendCreatorOpen(false);
    setLegendDraft(createLegendDraft());
    setInspectorOpen(true);
  };

  const updateLegendMembers = (legendId: string, nodeIds: string[]) => {
    setNodes((current) => {
      const frame = getLegendFrame(current, nodeIds);
      return synchronizeLegendKey(current.map((node) =>
        node.id === legendId
          ? {
              ...node,
              ...(frame ? { position: frame.position } : {}),
              data: { ...node.data, legendNodeIds: nodeIds },
              style: {
                ...node.style,
                ...(frame ? { width: frame.width, height: frame.height } : {}),
                zIndex: -1,
              },
            }
          : node,
      ));
    });
  };

  const fitLegendToMembers = (legendId: string) => {
    const legend = nodes.find((node) => node.id === legendId);
    if (!legend) return;
    updateLegendMembers(legendId, legend.data.legendNodeIds ?? []);
  };

  const removeLegendArea = (legendId: string) => {
    setNodes((current) =>
      synchronizeLegendKey(current.filter((node) => node.id !== legendId)),
    );
    setSelectedId(null);
    setInspectorOpen(false);
  };

  return (
    <main className="architecture-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Network size={19} /></span>
          <div>
            <strong>LemmaAI</strong>
            <span>System architecture</span>
          </div>
        </div>
        <div className="topbar-center">
          <span className="status-dot" />
          Interactive system map
        </div>
        <div className="topbar-actions">
          <button
            className={`button secondary ${pagesOpen ? "active" : ""}`}
            onClick={() => setPagesOpen((open) => !open)}
            title="Open architecture pages"
          >
            <FolderOpen size={15} /> <span className="button-label">Pages ({pages.length})</span>
          </button>
          <button className="button secondary export-button" onClick={() => setDocsExportOpen(true)} disabled={exporting} title="Export a readable one-page document PNG">
            {exporting ? <LoaderCircle className="spin" size={15} /> : <FileText size={15} />}
            <span className="button-label">Docs PNG</span>
          </button>
          <button className="button secondary export-button" onClick={exportPng} disabled={exporting} title="Export a smart-cropped high-resolution PNG">
            {exporting ? <LoaderCircle className="spin" size={15} /> : <Download size={15} />}
            <span className="button-label">{exporting ? "Rendering…" : "Export PNG"}</span>
          </button>
          <button
            className={`button secondary ${historyOpen ? "active" : ""}`}
            onClick={() => {
              setHistoryOpen((open) => !open);
              setPagesOpen(false);
              setInspectorOpen(false);
            }}
            title="Open auto-save version history"
          >
            <HistoryIcon size={15} />
            <span className="button-label">History ({historyEntries.length})</span>
          </button>
          <button className="button primary" onClick={saveDiagram}>
            {autoSaveState === "saving" ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
            <span className="button-label">
              {autoSaveState === "saving" ? "Saving…" : saved ? "Saved" : "Auto-saved"}
            </span>
          </button>
        </div>
      </header>

      <nav className="tool-navbar" aria-label="Diagram tools">
        <div className="tool-navbar-label">
          <span>DIAGRAM TOOLS</span>
          <strong>Build and organize your architecture</strong>
        </div>
        <div className="tool-navbar-actions">
          <button className="button secondary" onClick={() => setCreatorOpen(true)}>
            <Plus size={15} /> <span className="button-label">Add node</span>
          </button>
          <button
            className="button secondary"
            onClick={() => {
              setLegendDraft(createLegendDraft());
              setLegendCreatorOpen(true);
            }}
            title="Create a colored legend area around selected components"
          >
            <LayoutDashboard size={15} /> <span className="button-label">Add legend</span>
          </button>
          <button
            className="button secondary"
            onClick={applySmartLandscapeLayout}
            title="Arrange components in a landscape-friendly left-to-right flow"
          >
            <Maximize2 size={15} /> <span className="button-label">Smart landscape</span>
          </button>
          <button className="button secondary" onClick={resetDiagram} title="Restore original diagram">
            <RefreshCcw size={15} /> <span className="button-label">Reset</span>
          </button>
          <button
            className="button secondary export-button tool-duplicate"
            onClick={exportPng}
            disabled={exporting}
            title="Export a smart-cropped high-resolution PNG"
          >
            {exporting ? <LoaderCircle className="spin" size={15} /> : <Download size={15} />}
            <span className="button-label">{exporting ? "Rendering…" : "Export PNG"}</span>
          </button>
          <button
            className={`button secondary ${animationOpen ? "active" : ""}`}
            onClick={() => {
              setAnimationOpen((open) => !open);
              setPagesOpen(false);
              setInspectorOpen(false);
              setHistoryOpen(false);
            }}
            title="Create and play highlight animation sequences"
          >
            <List size={15} />
            <span className="button-label">Flow Animation</span>
          </button>
          <button
            className={`button secondary tool-duplicate ${historyOpen ? "active" : ""}`}
            onClick={() => {
              setHistoryOpen((open) => !open);
              setPagesOpen(false);
              setInspectorOpen(false);
              setAnimationOpen(false);
            }}
            title="Open auto-save version history"
          >
            <HistoryIcon size={15} />
            <span className="button-label">History ({historyEntries.length})</span>
          </button>
          <button className="button primary tool-duplicate" onClick={saveDiagram}>
            {autoSaveState === "saving" ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
            <span className="button-label">
              {autoSaveState === "saving" ? "Savingâ€¦" : saved ? "Saved" : "Auto-saved"}
            </span>
          </button>
        </div>
      </nav>

      <aside className={`page-manager ${pagesOpen ? "is-open" : ""}`} aria-label="Architecture pages">
        <div className="inspector-head">
          <div>
            <span>PROJECT FOLDER</span>
            <strong>Architecture pages</strong>
          </div>
          <button aria-label="Close pages" onClick={() => setPagesOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="page-manager-body">
          <p>Keep multiple diagrams in this project. Each page has its own nodes and connections.</p>
          <div className="page-list">
            {pages.map((page, index) => (
              <div className={`page-row ${page.id === activePageId ? "active" : ""}`} key={page.id}>
                <button className="page-select" onClick={() => switchPage(page.id)}>
                  <FileText size={16} />
                  <span>
                    <strong>{page.name || `Page ${index + 1}`}</strong>
                    <small>{page.id === activePageId ? "Open now" : "Open page"}</small>
                  </span>
                </button>
                <button
                  className="page-delete"
                  aria-label={`Move ${page.name || "Untitled page"} to trash`}
                  onClick={() => requestPageDeletion(page, "trash")}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <label className="page-name-field">
            <span>Current page name</span>
            <input
              value={pages.find((page) => page.id === activePageId)?.name ?? ""}
              onChange={(event) => renamePage(activePageId, event.target.value)}
              placeholder="Name this architecture page"
            />
          </label>
          <button className="add-page-button" onClick={addPage}>
            <Plus size={16} />
            Add a new blank page
          </button>
          <section className={`trash-section ${trashOpen ? "is-open" : ""}`}>
            <button className="trash-toggle" onClick={() => setTrashOpen((open) => !open)}>
              <span><Trash2 size={15} /> Trash</span>
              <small>{trashedPages.length}</small>
            </button>
            {trashOpen ? (
              <div className="trash-list">
                {trashedPages.length ? (
                  trashedPages.map((page) => (
                    <div className="trash-row" key={page.id}>
                      <div>
                        <strong>{page.name || "Untitled page"}</strong>
                        <small>
                          Deleted{" "}
                          {page.deletedAt
                            ? new Date(page.deletedAt).toLocaleDateString()
                            : "recently"}
                        </small>
                      </div>
                      <div className="trash-actions">
                        <button
                          aria-label={`Restore ${page.name || "Untitled page"}`}
                          title="Restore page"
                          onClick={() => restorePage(page)}
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          className="danger"
                          aria-label={`Permanently delete ${page.name || "Untitled page"}`}
                          title="Permanently delete"
                          onClick={() => requestPageDeletion(page, "permanent")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="trash-empty">Deleted pages will appear here.</p>
                )}
              </div>
            ) : null}
          </section>
        </div>
      </aside>

      <aside className={`history-panel ${historyOpen ? "is-open" : ""}`} aria-label="Version history">
        <div className="inspector-head">
          <div>
            <span>VERSION HISTORY</span>
            <strong>Auto-saved changes</strong>
          </div>
          <button aria-label="Close history" onClick={() => setHistoryOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="history-panel-body">
          <div className="history-autosave-status">
            {autoSaveState === "saving" ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
            <span>
              <strong>{autoSaveState === "saving" ? "Saving changes" : "All changes saved"}</strong>
              <small>Versions are grouped after you pause editing.</small>
            </span>
          </div>
          {historyEntries.length ? (
            <div className="history-list">
              {historyGroups.map((group, groupIndex) => (
                <details className="history-date-group" key={group.key} defaultOpen={groupIndex === 0}>
                  <summary>
                    <span>{group.label}</span>
                    <small>{group.entries.length} version{group.entries.length === 1 ? "" : "s"}</small>
                  </summary>
                  <div className="history-date-entries">
              {group.entries.map((entry) => (
                <article className="history-entry" key={entry.id}>
                  <div className="history-entry-marker" />
                  <div className="history-entry-copy">
                    <strong>{entry.id === historyEntries[0]?.id ? "Current version" : entry.summary}</strong>
                    <time dateTime={entry.timestamp}>
                      {new Date(entry.timestamp).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                    {entry.id === historyEntries[0]?.id ? <small>{entry.summary}</small> : null}
                    <small>{entry.nodes.length} components Â· {entry.edges.length} connections</small>
                  </div>
                  {entry.id !== historyEntries[0]?.id ? (
                    <button onClick={() => restoreHistoryEntry(entry)} title="Restore this version">
                      <RotateCcw size={14} /> Restore
                    </button>
                  ) : null}
                </article>
              ))}
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="history-empty">
              <HistoryIcon size={22} />
              <strong>No saved versions yet</strong>
              <p>Make a diagram change and pause briefly to create the first version.</p>
            </div>
          )}
        </div>
      </aside>

      {animationMode === "presentation" && (
        <div className="presentation-bar">
          <span className="presentation-bar-label">
            Presentation Mode — Step {currentStepIndex + 1} of {activeSequence?.steps.length ?? 0}
            {activeSequence && currentStepIndex >= 0 && currentStepIndex < activeSequence.steps.length ? (
              <> &mdash; {activeSequence.steps[currentStepIndex].elementIds.map((eid) => {
                const n = nodes.find((nd) => nd.id === eid);
                const ed = edges.find((eg) => eg.id === eid);
                return n ? n.data.label : ed ? `Connection: ${ed.source} → ${ed.target}` : eid;
              }).join(", ")}</>
            ) : null}
          </span>
          <button className="button secondary" onClick={stopPlayback} title="Stop presentation (Esc)">
            <Square size={14} /> <span className="button-label">Stop</span>
          </button>
        </div>
      )}
      <section className="canvas-wrap" aria-label="CollieAI architecture canvas">
        <ReactFlow
          nodes={nodes.map((node) => {
            if (!animActiveIds.size && !animCompletedIds.size) return node;
            let state: "inactive" | "active" | "completed" = "inactive";
            if (animActiveIds.has(node.id)) state = "active";
            else if (animCompletedIds.has(node.id)) state = "completed";
            return { ...node, data: { ...node.data, _animState: state } };
          })}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={animationMode === "presentation" ? () => {} : onNodesChange}
          onNodesDelete={(deletedNodes) => {
            if (animationMode === "presentation") return;
            if (deletedNodes.some((node) => node.data.shape === "legend")) {
              const deletedIds = new Set(deletedNodes.map((node) => node.id));
              setNodes((current) =>
                synchronizeLegendKey(current.filter((node) => !deletedIds.has(node.id))),
              );
            }
          }}
          onEdgesChange={animationMode === "presentation" ? () => {} : onEdgesChange}
          onConnect={animationMode === "presentation" ? () => {} : onConnect}
          connectionMode={ConnectionMode.Loose}
          isValidConnection={isValidConnection}
          nodesDraggable={animationMode !== "presentation"}
          nodesFocusable={animationMode !== "presentation"}
          elementsSelectable={animationMode !== "presentation"}
          onNodeClick={(_, node) => {
            if (animationMode === "presentation") return;
            if (animationOpen && activeSequence) {
              tryAddElementToSequence(node.id);
              return;
            }
            setSelectedId(node.id);
            setSelectedEdgeId(null);
            setInspectorOpen(true);
          }}
          onEdgeClick={(_, edgeItem) => {
            if (animationMode === "presentation") return;
            if (animationOpen && activeSequence) {
              tryAddElementToSequence(edgeItem.id);
              return;
            }
            setSelectedEdgeId(edgeItem.id);
            setSelectedId(null);
            setInspectorOpen(true);
          }}
          onPaneClick={() => {
            if (animationMode === "presentation") return;
            setSelectedId(null);
            setSelectedEdgeId(null);
          }}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.18}
          maxZoom={1.5}
          elevateNodesOnSelect={false}
          deleteKeyCode={animationMode === "presentation" ? [] : ["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#cbd5e1" />
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) => {
              const data = node.data as ArchitectureNodeData;
              if (data.shape === "legend") return data.legendColor ?? "#0ea5c6";
              if (data.shape === "legend-key") return "#334155";
              const tone = data.tone;
              return tone === "violet" ? "#8b5cf6" : tone === "amber" ? "#f59e0b" : "#21b6d7";
            }}
            maskColor="rgba(241,245,249,.72)"
          />
          <Controls showInteractive={false} />
          <Panel position="top-left" className="canvas-note">
            <span>PAGE {String(pages.findIndex((page) => page.id === activePageId) + 1).padStart(2, "0")}</span>
            <strong>{pages.find((page) => page.id === activePageId)?.name || "Untitled architecture"}</strong>
            <small>Drag nodes · connect dot to dot · select any line to edit</small>
          </Panel>
          <Panel position="bottom-center" className="legend">
            <span><i className="legend-swatch cyan" /> Application & services</span>
            <span><i className="legend-swatch violet" /> Intelligence</span>
            <span><i className="legend-swatch amber" /> Decisions</span>
            <span><i className="legend-swatch emerald" /> Outcomes</span>
          </Panel>
        </ReactFlow>
      </section>

      <aside className={`animation-panel ${animationOpen ? "is-open" : ""}`} aria-label="Flow animation sequencer">
        <div className="inspector-head">
          <div>
            <span>FLOW ANIMATION</span>
            <strong>{activeSequence ? activeSequence.name : "No sequence selected"}</strong>
          </div>
          <button aria-label="Close animation panel" onClick={() => { setAnimationOpen(false); if (animationMode === "presentation") stopPlayback(); }}>
            <X size={18} />
          </button>
        </div>
        <div className="animation-panel-body">
          {/* Sequence selector */}
          <div className="animation-sequence-selector">
            <select
              value={activeSequenceId ?? ""}
              onChange={(e) => {
                clearAnimationEffects();
                setActiveSequenceId(e.target.value || null);
              }}
              aria-label="Select animation sequence"
            >
              {animationSequences.length === 0 && <option value="">No sequences</option>}
              {animationSequences.map((seq) => (
                <option key={seq.id} value={seq.id}>{seq.name}</option>
              ))}
            </select>
            <div className="animation-sequence-actions">
              <button className="button secondary" onClick={createSequence} title="Create new sequence"><Plus size={14} /></button>
              {activeSequence && (
                <>
                  <button className="button secondary" onClick={() => duplicateSequence(activeSequence.id)} title="Duplicate sequence"><Copy size={14} /></button>
                  <button className="button secondary" onClick={() => {
                    const name = window.prompt("Rename sequence", activeSequence.name);
                    if (name?.trim()) renameSequence(activeSequence.id, name.trim());
                  }} title="Rename sequence"><FileText size={14} /></button>
                  <button className="button secondary" onClick={() => {
                    if (window.confirm(`Delete "${activeSequence.name}"?`)) deleteSequence(activeSequence.id);
                  }} title="Delete sequence"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          </div>

          <section className="guided-flow-builder">
            <div>
              <span>GUIDED PATH</span>
              <strong>Choose each decision outcome</strong>
              <p>Each diamond follows the selected connection label when the sequence is generated.</p>
            </div>
            {decisionNodesWithBranches.length ? (
              <div className="guided-branch-list">
                {decisionNodesWithBranches.map((node) => {
                  const outgoing = edges.filter((edgeItem) => edgeItem.source === node.id);
                  const selectedEdgeId = animationBranchChoices[node.id] ?? outgoing[0].id;
                  return (
                    <label key={node.id}>
                      <span>{node.data.label}</span>
                      <select
                        value={selectedEdgeId}
                        onChange={(event) =>
                          setAnimationBranchChoices((previous) => ({
                            ...previous,
                            [node.id]: event.target.value,
                          }))
                        }
                      >
                        {outgoing.map((edgeItem, index) => (
                          <option key={edgeItem.id} value={edgeItem.id}>
                            {edgeItem.label || `Option ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="guided-flow-empty">No branching diamonds are available on this page.</p>
            )}
            <button className="guided-flow-create" onClick={buildGuidedSequence}>
              <Route size={15} /> Generate selected flow
            </button>
          </section>

          {activeSequence && (
            <>
              {/* Step list */}
              <div className="animation-step-list">
                <div className="animation-step-list-header">
                  <span>Steps ({activeSequence.steps.length})</span>
                  {activeSequence.steps.length > 0 && (
                    <button className="button secondary" onClick={() => {
                      if (window.confirm("Clear all steps?")) {
                        setAnimationSequences((prev) =>
                          prev.map((s) => s.id === activeSequenceId ? { ...s, steps: [] } : s)
                        );
                        window.setTimeout(persistAnimationData, 0);
                      }
                    }} title="Clear all steps"><Trash2 size={12} /> Clear</button>
                  )}
                </div>
                {activeSequence.steps.length === 0 && (
                  <div className="animation-empty">
                    <List size={22} />
                    <strong>No steps yet</strong>
                    <p>Click nodes or connectors on the diagram to add them to this sequence.</p>
                  </div>
                )}
                <div className="animation-steps">
                  {activeSequence.steps.map((step, index) => (
                    <div key={step.id} className={`animation-step ${currentStepIndex === index && animationMode === "presentation" ? "is-current" : ""}`}>
                      <div className="animation-step-handle">
                        <span className="animation-step-number">{index + 1}</span>
                      </div>
                      <div className="animation-step-content">
                        <div className="animation-step-elements">
                          {step.elementIds.map((eid) => {
                            const n = nodes.find((nd) => nd.id === eid);
                            const ed = edges.find((eg) => eg.id === eid);
                            const missing = !n && !ed;
                            return (
                              <span key={eid} className={`animation-step-element ${missing ? "is-missing" : ""}`} title={eid}>
                                {missing ? "⚠ Missing element" : n ? n.data.label : `Connection: ${ed!.source} → ${ed!.target}`}
                              </span>
                            );
                          })}
                        </div>
                        <div className="animation-step-controls">
                          <div className="animation-step-timing">
                            <label>
                              <span>Dur.</span>
                              <input
                                type="range"
                                min="200" max="4000" step="100"
                                value={step.duration}
                                onChange={(e) => updateStep(step.id, { duration: Number(e.target.value) })}
                              />
                              <output>{(step.duration / 1000).toFixed(1)}s</output>
                            </label>
                            <label>
                              <span>Delay</span>
                              <input
                                type="range"
                                min="0" max="3000" step="100"
                                value={step.delayAfter}
                                onChange={(e) => updateStep(step.id, { delayAfter: Number(e.target.value) })}
                              />
                              <output>{(step.delayAfter / 1000).toFixed(1)}s</output>
                            </label>
                          </div>
                          <div className="animation-step-actions">
                            <button className="button secondary" onClick={() => moveStep(step.id, -1)} disabled={index === 0} title="Move up"><SkipBack size={12} /></button>
                            <button className="button secondary" onClick={() => moveStep(step.id, 1)} disabled={index === activeSequence.steps.length - 1} title="Move down"><SkipForward size={12} /></button>
                            <button className="button secondary" onClick={() => duplicateStep(step.id)} title="Duplicate step"><Copy size={12} /></button>
                            <button className="button secondary" onClick={() => removeStep(step.id)} title="Remove step"><X size={12} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Playback controls */}
              <div className="animation-playback">
                <div className="animation-playback-main">
                  <button className="button secondary" onClick={previousStep} disabled={currentStepIndex <= 0 || animationPlaying} title="Previous step"><SkipBack size={15} /></button>
                  {animationPaused ? (
                    <button className="button primary" onClick={resumePlayback} title="Resume"><Play size={15} /> <span className="button-label">Resume</span></button>
                  ) : animationPlaying ? (
                    <button className="button primary" onClick={pausePlayback} title="Pause"><Pause size={15} /> <span className="button-label">Pause</span></button>
                  ) : (
                    <button className="button primary" onClick={startPlayback} disabled={activeSequence.steps.length === 0} title="Play"><Play size={15} /> <span className="button-label">Play</span></button>
                  )}
                  <button className="button secondary" onClick={nextStep} disabled={currentStepIndex >= activeSequence.steps.length - 1 || animationPlaying} title="Next step"><SkipForward size={15} /></button>
                  <button className="button secondary" onClick={stopPlayback} disabled={!animationPlaying && !animationPaused} title="Stop"><Square size={15} /></button>
                </div>
                <div className="animation-playback-settings">
                  <label className="animation-loop-toggle">
                    <input type="checkbox" checked={activeSequence.loop} onChange={toggleLoop} />
                    <Repeat size={13} />
                    <span>Loop</span>
                  </label>
                  <label className="animation-speed">
                    <span>Speed</span>
                    <select value={activeSequence.playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))}>
                      <option value={0.5}>0.5×</option>
                      <option value={0.75}>0.75×</option>
                      <option value={1}>1×</option>
                      <option value={1.5}>1.5×</option>
                      <option value={2}>2×</option>
                    </select>
                  </label>
                </div>
                {currentStepIndex >= 0 && (
                  <div className="animation-progress">
                    Step {currentStepIndex + 1} of {activeSequence.steps.length}
                    {activeSequence.steps[currentStepIndex] && (
                      <> &mdash; {activeSequence.steps[currentStepIndex].elementIds.map((eid) => {
                        const n = nodes.find((nd) => nd.id === eid);
                        const ed = edges.find((eg) => eg.id === eid);
                        return n ? n.data.label : ed ? `${ed.source} → ${ed.target}` : eid;
                      }).join(", ")}</>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          {!animationSequences.length && (
            <div className="animation-empty">
              <List size={22} />
              <strong>No animation sequences</strong>
              <p>Create a sequence to get started. Then click nodes and connectors in the order you want them to highlight.</p>
              <button className="button primary" onClick={createSequence}><Plus size={15} /> Create first sequence</button>
            </div>
          )}
        </div>
      </aside>

      <aside className={`inspector ${inspectorOpen && (selectedNode || selectedEdge) ? "is-open" : ""}`}>
        <div className="inspector-head">
          <div>
            <span>
              {selectedEdge
                ? "CONNECTION INSPECTOR"
                : selectedLegend
                  ? "LEGEND AREA INSPECTOR"
                  : selectedLegendKey
                    ? "LEGEND KEY INSPECTOR"
                  : "NODE INSPECTOR"}
            </span>
            <strong>
              {selectedEdge
                ? "Edit connection"
                : selectedLegend
                  ? "Edit mapped area"
                  : selectedLegendKey
                    ? "Edit stacked identifiers"
                  : "Edit component"}
            </strong>
          </div>
          <button aria-label="Close inspector" onClick={() => setInspectorOpen(false)}>
            <X size={18} />
          </button>
        </div>
        {selectedLegendKey ? (
          <div className="inspector-body">
            <label>
              <span>Legend title</span>
              <input
                value={selectedLegendKey.data.label}
                onChange={(event) => updateSelected({ label: event.target.value })}
              />
            </label>
            <div className="legend-key-inspector-list">
              {(selectedLegendKey.data.legendEntries ?? []).map((entry) => (
                <div key={entry.id}>
                  <i style={{ backgroundColor: entry.color }} />
                  <span>
                    <strong>{entry.label}</strong>
                    <small>{entry.count} component{entry.count === 1 ? "" : "s"}</small>
                  </span>
                </div>
              ))}
            </div>
            <div className="inspector-tip">
              <CircleHelp size={16} />
              This card updates automatically. Drag it anywhere on the canvas and edit each area to
              change its label or color.
            </div>
          </div>
        ) : selectedLegend ? (
          <div className="inspector-body">
            <label>
              <span>Legend label</span>
              <input
                value={selectedLegend.data.label}
                onChange={(event) => updateSelected({ label: event.target.value })}
              />
            </label>
            <label className="legend-color-control">
              <span>Area color</span>
              <div>
                <input
                  type="color"
                  value={selectedLegend.data.legendColor ?? "#0ea5c6"}
                  onChange={(event) => updateSelected({ legendColor: event.target.value })}
                />
                <output>{selectedLegend.data.legendColor ?? "#0ea5c6"}</output>
              </div>
            </label>
            <label className="line-label-size">
              <span>Transparency</span>
              <div>
                <input
                  type="range"
                  min="0.04"
                  max="0.32"
                  step="0.02"
                  value={selectedLegend.data.legendOpacity ?? 0.12}
                  onChange={(event) =>
                    updateSelected({ legendOpacity: Number(event.target.value) })
                  }
                />
                <output>{Math.round((selectedLegend.data.legendOpacity ?? 0.12) * 100)}%</output>
              </div>
              <small>Lower values keep the architecture easier to read.</small>
            </label>
            <fieldset>
              <legend>Components in this area</legend>
              <div className="legend-member-list">
                {componentNodes.map((node) => {
                  const memberIds = selectedLegend.data.legendNodeIds ?? [];
                  const checked = memberIds.includes(node.id);
                  return (
                    <label key={node.id} className="legend-member-option">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const nextIds = checked
                            ? memberIds.filter((id) => id !== node.id)
                            : [...memberIds, node.id];
                          updateLegendMembers(selectedLegend.id, nextIds);
                        }}
                      />
                      <span>{node.data.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <button
              type="button"
              className="fit-legend-button"
              disabled={!selectedLegend.data.legendNodeIds?.length}
              onClick={() => fitLegendToMembers(selectedLegend.id)}
            >
              <Maximize2 size={15} />
              Fit area to selected components
            </button>
            <button
              type="button"
              className="delete-connection"
              onClick={() => removeLegendArea(selectedLegend.id)}
            >
              <Trash2 size={16} />
              Remove legend area
            </button>
            <div className="inspector-tip">
              <CircleHelp size={16} />
              Drag the colored area anywhere on the canvas. Use Fit area after moving its components.
            </div>
          </div>
        ) : selectedNode ? (
          <div className="inspector-body">
            <label>
              <span>Title</span>
              <input
                value={selectedNode.data.label}
                onChange={(event) => updateSelected({ label: event.target.value })}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                rows={3}
                value={selectedNode.data.description ?? ""}
                onChange={(event) => updateSelected({ description: event.target.value })}
              />
            </label>
            <fieldset>
              <legend>Text size</legend>
              <label className="line-label-size">
                <span>Title size</span>
                <div>
                  <input
                    type="range"
                    min="8"
                    max="42"
                    step="1"
                    value={selectedNode.data.titleSize ?? 13}
                    onChange={(event) =>
                      updateTextSize("titleSize", Number(event.target.value), applyTitleSizeToAll)
                    }
                  />
                  <output>{selectedNode.data.titleSize ?? 13}px</output>
                </div>
              </label>
              <label className="description-toggle inspector-apply-toggle">
                <span>
                  <strong>Apply title size to all</strong>
                  <small>Changes every component title.</small>
                </span>
                <input
                  type="checkbox"
                  checked={applyTitleSizeToAll}
                  onChange={(event) => {
                    setApplyTitleSizeToAll(event.target.checked);
                    if (event.target.checked) {
                      updateTextSize("titleSize", selectedNode.data.titleSize ?? 13, true);
                    }
                  }}
                />
                <i aria-hidden="true" />
              </label>
              <label className="line-label-size">
                <span>Description size</span>
                <div>
                  <input
                    type="range"
                    min="7"
                    max="32"
                    step="1"
                    value={selectedNode.data.descriptionSize ?? 10}
                    onChange={(event) =>
                      updateTextSize("descriptionSize", Number(event.target.value), applyDescriptionSizeToAll)
                    }
                  />
                  <output>{selectedNode.data.descriptionSize ?? 10}px</output>
                </div>
              </label>
              <label className="description-toggle inspector-apply-toggle">
                <span>
                  <strong>Apply description size to all</strong>
                  <small>Changes every component description.</small>
                </span>
                <input
                  type="checkbox"
                  checked={applyDescriptionSizeToAll}
                  onChange={(event) => {
                    setApplyDescriptionSizeToAll(event.target.checked);
                    if (event.target.checked) {
                      updateTextSize("descriptionSize", selectedNode.data.descriptionSize ?? 10, true);
                    }
                  }}
                />
                <i aria-hidden="true" />
              </label>
            </fieldset>
            <fieldset>
              <legend>Shape</legend>
              <div className="option-grid shape-grid">
                {shapeOptions.map((option) => (
                  <button
                    key={option.value}
                    className={selectedNode.data.shape === option.value ? "active" : ""}
                    onClick={() => updateSelected({ shape: option.value })}
                  >
                    {option.value === "database" ? (
                      <svg className="shape-preview shape-preview-database" width="18" height="14" viewBox="0 0 18 14">
                        <path fill="currentColor" opacity="0.5" d="M3 10 L3 12 A2.5 1.5 0 0 0 15 12 L15 10 A2.5 1.5 0 0 1 3 10 Z" />
                        <path fill="currentColor" opacity="0.7" d="M3 7 L3 9 A2.5 1.5 0 0 0 15 9 L15 7 A2.5 1.5 0 0 1 3 7 Z" />
                        <path fill="currentColor" d="M3 4 L3 6 A2.5 1.5 0 0 0 15 6 L15 4 A2.5 1.5 0 0 1 3 4 Z" />
                        <ellipse fill="currentColor" cx="9" cy="4" rx="6" ry="1.5" />
                      </svg>
                    ) : option.value === "cloud" ? (
                      <svg className="shape-preview shape-preview-cloud" width="21" height="14" viewBox="0 0 21 14">
                        <path fill="#fff" stroke="currentColor" strokeWidth="1.1" d="M3 12 C1 12 1 9.5 1 8 C1 6 2.5 5 3.5 5 C3.5 4 4.5 2 6.5 2 C8 2 9 3 9.5 3.5 C10.5 2.5 12 2 14 2 C16 2 17 3 17.5 4 C18.5 4 20 5 20 7 C20 10 19 12 17 12 Z" />
                      </svg>
                    ) : option.value === "decision" ? (
                      <svg className="shape-preview shape-preview-decision" width="22" height="18" viewBox="0 0 22 18">
                        <path d="M11 1 L21 9 L11 17 L1 9 Z" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    ) : (
                      <i className={`shape-preview shape-preview-${option.value}`} />
                    )}
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Icon</legend>
              <div className="option-grid icon-grid">
                {iconOptions.map((option) => {
                  const Icon = iconMap[option.value];
                  return (
                    <button
                      key={option.value}
                      title={option.label}
                      aria-label={option.label}
                      className={selectedNode.data.icon === option.value ? "active" : ""}
                      onClick={() => updateSelected({ icon: option.value })}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend>Color</legend>
              <div className="tone-row">
                {(["cyan", "violet", "amber", "emerald", "slate", "rose"] as NodeTone[]).map(
                  (tone) => (
                    <button
                      key={tone}
                      className={`tone-button ${tone} ${
                        selectedNode.data.tone === tone ? "active" : ""
                      }`}
                      aria-label={`${tone} color`}
                      onClick={() => updateSelected({ tone })}
                    />
                  ),
                )}
              </div>
            </fieldset>
            <div className="inspector-tip">
              <CircleHelp size={16} />
              Changes stay in your browser when you choose Save layout.
            </div>
          </div>
        ) : selectedEdge ? (
          <div className="inspector-body">
            <label>
              <span>Line label</span>
              <input
                placeholder="Example: Yes, No, File reference"
                value={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
                onChange={(event) => updateSelectedEdge({ label: event.target.value })}
              />
            </label>
            <label className="line-label-size">
              <span>Label text size</span>
              <div>
                <input
                  type="range"
                  min="8"
                  max="36"
                  step="1"
                  value={
                    typeof selectedEdge.labelStyle?.fontSize === "number"
                      ? selectedEdge.labelStyle.fontSize
                      : 12
                  }
                  onChange={(event) =>
                    updateSelectedEdge({
                      labelStyle: {
                        ...selectedEdge.labelStyle,
                        fontSize: Number(event.target.value),
                      },
                    })
                  }
                />
                <output>
                  {typeof selectedEdge.labelStyle?.fontSize === "number"
                    ? selectedEdge.labelStyle.fontSize
                    : 12}
                  px
                </output>
              </div>
              <small>Applies to this connection label only.</small>
            </label>
            <fieldset>
              <legend>Line style</legend>
              <div className="line-style-grid">
                <button
                  className={!selectedEdge.animated ? "active" : ""}
                  onClick={() => setEdgeStyle(false)}
                >
                  <i className="line-sample solid" />
                  Solid
                </button>
                <button
                  className={selectedEdge.animated ? "active" : ""}
                  onClick={() => setEdgeStyle(true)}
                >
                  <i className="line-sample dashed" />
                  Dashed + moving
                </button>
              </div>
            </fieldset>
            <div className="connection-summary">
              <span>{nodes.find((node) => node.id === selectedEdge.source)?.data.label}</span>
              <i>→</i>
              <span>{nodes.find((node) => node.id === selectedEdge.target)?.data.label}</span>
            </div>
            <button className="delete-connection" onClick={removeSelectedEdge}>
              <Trash2 size={16} />
              Remove connection
            </button>
            <div className="inspector-tip">
              <CircleHelp size={16} />
              Create a new line by dragging from a node dot to another node dot. Select a line and press Delete to remove it quickly.
            </div>
          </div>
        ) : null}
      </aside>

      {creatorOpen ? (
        <div className="creator-backdrop" onMouseDown={() => setCreatorOpen(false)}>
          <form
            className="node-creator"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-node-title"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              addNode();
            }}
          >
            <div className="inspector-head">
              <div>
                <span>NEW COMPONENT</span>
                <strong id="create-node-title">Add node to canvas</strong>
              </div>
              <button type="button" aria-label="Close node creator" onClick={() => setCreatorOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="creator-body">
              <label>
                <span>Title</span>
                <input
                  autoFocus
                  value={nodeDraft.label}
                  onChange={(event) => setNodeDraft({ ...nodeDraft, label: event.target.value })}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  rows={2}
                  value={nodeDraft.description}
                  onChange={(event) => setNodeDraft({ ...nodeDraft, description: event.target.value })}
                />
              </label>
              <fieldset>
                <legend>Shape</legend>
                <div className="option-grid shape-grid">
                  {shapeOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={nodeDraft.shape === option.value ? "active" : ""}
                      onClick={() =>
                        setNodeDraft({
                          ...nodeDraft,
                          shape: option.value,
                          icon:
                            option.value === "decision"
                              ? "decision"
                              : option.value === "database"
                                ? "database"
                                : option.value === "cloud"
                                  ? "memory"
                                  : option.value === "terminal"
                                    ? "play"
                                    : "server",
                        })
                      }
                    >
                      {option.value === "database" ? (
                        <svg className="shape-preview shape-preview-database" width="18" height="14" viewBox="0 0 18 14">
                          <path fill="currentColor" opacity="0.5" d="M3 10 L3 12 A2.5 1.5 0 0 0 15 12 L15 10 A2.5 1.5 0 0 1 3 10 Z" />
                          <path fill="currentColor" opacity="0.7" d="M3 7 L3 9 A2.5 1.5 0 0 0 15 9 L15 7 A2.5 1.5 0 0 1 3 7 Z" />
                          <path fill="currentColor" d="M3 4 L3 6 A2.5 1.5 0 0 0 15 6 L15 4 A2.5 1.5 0 0 1 3 4 Z" />
                          <ellipse fill="currentColor" cx="9" cy="4" rx="6" ry="1.5" />
                        </svg>
                      ) : option.value === "cloud" ? (
                        <svg className="shape-preview shape-preview-cloud" width="21" height="14" viewBox="0 0 21 14">
                          <path fill="#fff" stroke="currentColor" strokeWidth="1.1" d="M3 12 C1 12 1 9.5 1 8 C1 6 2.5 5 3.5 5 C3.5 4 4.5 2 6.5 2 C8 2 9 3 9.5 3.5 C10.5 2.5 12 2 14 2 C16 2 17 3 17.5 4 C18.5 4 20 5 20 7 C20 10 19 12 17 12 Z" />
                        </svg>
                      ) : option.value === "decision" ? (
                        <svg className="shape-preview shape-preview-decision" width="22" height="18" viewBox="0 0 22 18">
                          <path d="M11 1 L21 9 L11 17 L1 9 Z" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      ) : (
                        <i className={`shape-preview shape-preview-${option.value}`} />
                      )}
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Icon</legend>
                <div className="option-grid icon-grid">
                  {iconOptions.map((option) => {
                    const Icon = iconMap[option.value];
                    return (
                      <button
                        type="button"
                        key={option.value}
                        title={option.label}
                        className={nodeDraft.icon === option.value ? "active" : ""}
                        onClick={() => setNodeDraft({ ...nodeDraft, icon: option.value })}
                      >
                        <Icon size={18} />
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend>Color</legend>
                <div className="tone-row">
                  {(["cyan", "violet", "amber", "emerald", "slate", "rose"] as NodeTone[]).map(
                    (tone) => (
                      <button
                        type="button"
                        key={tone}
                        className={`tone-button ${tone} ${nodeDraft.tone === tone ? "active" : ""}`}
                        aria-label={`${tone} color`}
                        onClick={() => setNodeDraft({ ...nodeDraft, tone })}
                      />
                    ),
                  )}
                </div>
              </fieldset>
              <button className="create-node-submit" type="submit" disabled={!nodeDraft.label.trim()}>
                <Plus size={16} />
                Add to current view
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {legendCreatorOpen ? (
        <div className="creator-backdrop" onMouseDown={() => setLegendCreatorOpen(false)}>
          <form
            className="node-creator legend-creator"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-legend-title"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              addLegendArea();
            }}
          >
            <div className="inspector-head">
              <div>
                <span>NEW MAP AREA</span>
                <strong id="create-legend-title">Create a draggable legend</strong>
              </div>
              <button
                type="button"
                aria-label="Close legend creator"
                onClick={() => setLegendCreatorOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="creator-body">
              <label>
                <span>Legend label</span>
                <input
                  autoFocus
                  value={legendDraft.label}
                  placeholder="Example: User, Backend, AI services"
                  onChange={(event) =>
                    setLegendDraft({ ...legendDraft, label: event.target.value })
                  }
                />
              </label>
              <div className="legend-appearance-grid">
                <label className="legend-color-control">
                  <span>Area color</span>
                  <div>
                    <input
                      type="color"
                      value={legendDraft.color}
                      onChange={(event) =>
                        setLegendDraft({ ...legendDraft, color: event.target.value })
                      }
                    />
                    <output>{legendDraft.color}</output>
                  </div>
                </label>
                <label className="line-label-size">
                  <span>Transparency</span>
                  <div>
                    <input
                      type="range"
                      min="0.04"
                      max="0.32"
                      step="0.02"
                      value={legendDraft.opacity}
                      onChange={(event) =>
                        setLegendDraft({
                          ...legendDraft,
                          opacity: Number(event.target.value),
                        })
                      }
                    />
                    <output>{Math.round(legendDraft.opacity * 100)}%</output>
                  </div>
                </label>
              </div>
              <fieldset>
                <legend>Select components inside this legend</legend>
                <div className="legend-member-list legend-member-create-list">
                  {componentNodes.length ? (
                    componentNodes.map((node) => {
                      const checked = legendDraft.nodeIds.includes(node.id);
                      return (
                        <label key={node.id} className="legend-member-option">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setLegendDraft({
                                ...legendDraft,
                                nodeIds: checked
                                  ? legendDraft.nodeIds.filter((id) => id !== node.id)
                                  : [...legendDraft.nodeIds, node.id],
                              })
                            }
                          />
                          <span>{node.data.label}</span>
                        </label>
                      );
                    })
                  ) : (
                    <p className="legend-empty-state">Add components before creating a legend area.</p>
                  )}
                </div>
              </fieldset>
              <div className="legend-selection-summary">
                <LayoutDashboard size={16} />
                <span>
                  {legendDraft.nodeIds.length
                    ? `${legendDraft.nodeIds.length} components selected`
                    : "Select at least one component"}
                </span>
              </div>
              <button
                className="create-node-submit"
                type="submit"
                disabled={!legendDraft.label.trim() || legendDraft.nodeIds.length === 0}
              >
                <Plus size={16} />
                Create legend area
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {deleteIntent ? (
        <div className="creator-backdrop" onMouseDown={() => setDeleteIntent(null)}>
          <form
            className="node-creator delete-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-page-title"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              confirmPageDeletion();
            }}
          >
            <div className="inspector-head danger-head">
              <div>
                <span>
                  {deleteIntent.mode === "trash" ? "MOVE TO TRASH" : "PERMANENT DELETION"}
                </span>
                <strong id="delete-page-title">
                  {deleteIntent.mode === "trash"
                    ? "Confirm page deletion"
                    : "Delete this page forever?"}
                </strong>
              </div>
              <button type="button" aria-label="Cancel deletion" onClick={() => setDeleteIntent(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="delete-confirm-body">
              <div className="delete-warning">
                <Trash2 size={18} />
                <p>
                  {deleteIntent.mode === "trash"
                    ? "The page and its full diagram will be kept in Trash so you can restore it later."
                    : "This permanently removes the page, nodes, and connections. This action cannot be undone."}
                </p>
              </div>
              <label>
                <span>
                  Type <strong>{deleteIntent.page.name.trim() || "Untitled page"}</strong> to confirm
                </span>
                <input
                  autoFocus
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  autoComplete="off"
                />
              </label>
              <div className="delete-confirm-actions">
                <button type="button" className="cancel-delete" onClick={() => setDeleteIntent(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="confirm-delete"
                  disabled={
                    deleteConfirmation !==
                    (deleteIntent.page.name.trim() || "Untitled page")
                  }
                >
                  <Trash2 size={15} />
                  {deleteIntent.mode === "trash" ? "Move page to Trash" : "Permanently delete page"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
      {docsExportOpen ? (
        <div className="creator-backdrop" onMouseDown={() => setDocsExportOpen(false)}>
          <section
            className="node-creator docs-export-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="docs-export-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="inspector-head">
              <div>
                <span>DOCUMENT EXPORT</span>
                <strong id="docs-export-title">Preview and customize your document PNG</strong>
              </div>
              <button
                type="button"
                aria-label="Close document export"
                onClick={() => setDocsExportOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="creator-body docs-export-body">
              <div className="docs-format-grid">
                <button
                  type="button"
                  className={`docs-format-card ${docsExportMode === "readable" ? "active" : ""}`}
                  onClick={() => setDocsExportMode("readable")}
                >
                  <span className="docs-format-icon"><FileText size={21} /></span>
                  <strong>Readable overview</strong>
                  <p>Keeps the complete design while enlarging names, descriptions, icons, and connections.</p>
                  <i>{docsExportMode === "readable" ? <Check size={14} /> : null}</i>
                </button>
                <button
                  type="button"
                  className={`docs-format-card ${docsExportMode === "full-design" ? "active" : ""}`}
                  onClick={() => setDocsExportMode("full-design")}
                >
                  <span className="docs-format-icon"><Sparkles size={21} /></span>
                  <strong>Full visual design</strong>
                  <p>Preserves every icon, description, color, shape, and connection at its original proportions.</p>
                  <i>{docsExportMode === "full-design" ? <Check size={14} /> : null}</i>
                </button>
              </div>
              <div className="docs-preview-workspace">
                <section className="docs-preview-panel" aria-label="Document export preview">
                  <div className="docs-preview-head">
                    <div>
                      <span>LIVE PREVIEW</span>
                      <strong>
                        {docsExportMode === "readable"
                          ? "Readable overview"
                          : "Full visual design"}
                      </strong>
                    </div>
                    <div className="docs-preview-toolbar">
                      <small>Export {Math.round(docsExportZoom * 100)}%</small>
                      <button
                        type="button"
                        aria-label="Zoom preview out"
                        onClick={() => changeDocsInspectZoom(-0.2)}
                      >
                        <ZoomOut size={14} />
                      </button>
                      <output>{Math.round(docsInspectZoom * 100)}%</output>
                      <button
                        type="button"
                        aria-label="Zoom preview in"
                        onClick={() => changeDocsInspectZoom(0.2)}
                      >
                        <ZoomIn size={14} />
                      </button>
                      <button type="button" className="fit-preview" onClick={fitDocsPreview}>
                        <Maximize2 size={13} /> Fit
                      </button>
                    </div>
                  </div>
                  <div
                    className={`docs-preview-stage ${docsPreviewReady ? "is-draggable" : ""}`}
                    onPointerDown={(event) => {
                      if (!docsPreviewReady) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      docsPreviewDrag.current = {
                        pointerId: event.pointerId,
                        startX: event.clientX,
                        startY: event.clientY,
                        panX: docsPreviewPan.x,
                        panY: docsPreviewPan.y,
                      };
                    }}
                    onPointerMove={(event) => {
                      const drag = docsPreviewDrag.current;
                      if (!drag || drag.pointerId !== event.pointerId) return;
                      setDocsPreviewPan({
                        x: drag.panX + event.clientX - drag.startX,
                        y: drag.panY + event.clientY - drag.startY,
                      });
                    }}
                    onPointerUp={(event) => {
                      if (docsPreviewDrag.current?.pointerId === event.pointerId) {
                        docsPreviewDrag.current = null;
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                    }}
                    onPointerCancel={() => {
                      docsPreviewDrag.current = null;
                    }}
                    onWheel={(event) => {
                      if (!docsPreviewReady) return;
                      event.preventDefault();
                      changeDocsInspectZoom(event.deltaY < 0 ? 0.2 : -0.2);
                    }}
                  >
                    <div
                      className={`docs-preview-image-shell ${docsPreviewReady ? "" : "is-empty"}`}
                      style={{
                        transform: `translate(${docsPreviewPan.x}px, ${docsPreviewPan.y}px) scale(${docsInspectZoom})`,
                      }}
                    >
                      <canvas
                        ref={docsPreviewCanvasRef}
                        role="img"
                        aria-label="Preview of the document PNG export"
                      />
                    </div>
                    {!docsPreviewReady ? (
                      <div className="docs-preview-loading">
                        {docsPreviewing ? <LoaderCircle className="spin" size={18} /> : <FileText size={18} />}
                        <span>{docsPreviewing ? "Updating preview…" : "Preview unavailable"}</span>
                      </div>
                    ) : null}
                    {docsPreviewing && docsPreviewReady ? (
                      <span className="preview-refreshing">
                        <LoaderCircle className="spin" size={13} /> Updating
                      </span>
                    ) : null}
                    {docsPreviewReady ? (
                      <span className="preview-drag-hint">Drag to inspect · scroll to zoom</span>
                    ) : null}
                  </div>
                </section>
                <section className="docs-customize-panel" aria-label="Export customization">
                  <div className="docs-settings-head">
                    <span>CUSTOMIZE</span>
                    <strong>Document appearance</strong>
                  </div>
                  <label className="description-toggle">
                    <span>
                      <strong>Show titles</strong>
                      <small>
                        {docsShowTitles ? "Component and decision names" : "Titles are hidden"}
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      checked={docsShowTitles}
                      onChange={(event) => setDocsShowTitles(event.target.checked)}
                    />
                    <i aria-hidden="true" />
                  </label>
                  <label className="description-toggle">
                    <span>
                      <strong>Show descriptions</strong>
                      <small>
                        {docsShowDescriptions ? "Secondary component text" : "Descriptions are hidden"}
                      </small>
                    </span>
                    <input
                      type="checkbox"
                      checked={docsShowDescriptions}
                      onChange={(event) => setDocsShowDescriptions(event.target.checked)}
                    />
                    <i aria-hidden="true" />
                  </label>
                  <label className="docs-range-control">
                    <span>
                      <strong>Title text size</strong>
                      <output>{Math.round(docsTitleScale * 100)}%</output>
                    </span>
                    <input
                      type="range"
                      min="0.75"
                      max="1.5"
                      step="0.05"
                      value={docsTitleScale}
                      onChange={(event) => setDocsTitleScale(Number(event.target.value))}
                    />
                    <small>Adjusts component titles and decision names.</small>
                  </label>
                  <label className="docs-range-control">
                    <span>
                      <strong>Description text size</strong>
                      <output>{Math.round(docsDescriptionScale * 100)}%</output>
                    </span>
                    <input
                      type="range"
                      min="0.65"
                      max="1.5"
                      step="0.05"
                      value={docsDescriptionScale}
                      onChange={(event) => setDocsDescriptionScale(Number(event.target.value))}
                    />
                    <small>Adjusts the subtext independently from titles.</small>
                  </label>
                  <label className="docs-range-control">
                    <span>
                      <strong>Connection label size</strong>
                      <output>{Math.round(docsEdgeLabelScale * 100)}%</output>
                    </span>
                    <input
                      type="range"
                      min="0.75"
                      max="1.75"
                      step="0.05"
                      value={docsEdgeLabelScale}
                      onChange={(event) => setDocsEdgeLabelScale(Number(event.target.value))}
                    />
                    <small>Adjusts text attached to connection lines.</small>
                  </label>
                  <label className="docs-range-control">
                    <span>
                      <strong>Export zoom</strong>
                      <output>{Math.round(docsExportZoom * 100)}%</output>
                    </span>
                    <input
                      type="range"
                      min="0.7"
                      max="1.3"
                      step="0.05"
                      value={docsExportZoom}
                      onChange={(event) => setDocsExportZoom(Number(event.target.value))}
                    />
                    <small>Zoom above 100% may crop the outer edges.</small>
                  </label>
                  <button
                    type="button"
                    className="reset-docs-settings"
                    onClick={() => {
                      setDocsShowDescriptions(true);
                      setDocsTitleScale(1);
                      setDocsDescriptionScale(1);
                      setDocsEdgeLabelScale(1);
                      setDocsExportZoom(1);
                    }}
                  >
                    <RefreshCcw size={14} /> Reset appearance
                  </button>
                </section>
              </div>
              <div className="smart-crop-note">
                <span><LayoutDashboard size={17} /></span>
                <div>
                  <strong>Smart page fitting</strong>
                  <p>Automatically crops empty space, selects portrait or landscape, and maximizes the diagram on one page.</p>
                </div>
              </div>
              <button
                className="create-node-submit"
                type="button"
                onClick={() => {
                  setDocsExportOpen(false);
                  void exportDocsPng(docsExportMode);
                }}
              >
                <Download size={16} />
                Export this preview
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {exportNotice ? (
        <div className="export-notice" role="status" aria-live="polite">
          {exporting ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
          {exportNotice}
        </div>
      ) : null}
    </main>
  );
}

export default function ArchitectureFlow() {
  return (
    <ReactFlowProvider>
      <FlowWorkspace />
    </ReactFlowProvider>
  );
}
