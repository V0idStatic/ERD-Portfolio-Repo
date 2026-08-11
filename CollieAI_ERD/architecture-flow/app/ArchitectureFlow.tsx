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
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
  getNodesBounds,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  NodeResizer,
  NodeToolbar,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  ViewportPortal,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  BellRing,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Globe2,
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
  LockKeyhole,
  ShieldCheck,
  List,
  LoaderCircle,
  MessageCircle,
  Send,
  Maximize2,
  MessageSquareText,
  Monitor,
  MousePointer2,
  Network,
  Hand,
  Pause,
  Pencil,
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
  Highlighter,
  Eraser,
  Smartphone,
  Trash2,
  UserRound,
  UserRoundCheck,
  Workflow,
  X,
Type,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toBlob, toCanvas, toPng } from "html-to-image";
import type { ComponentType, CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { Fragment, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import DashboardHome, { setLocalStorageItem } from "./DashboardHome";

type NodeShape =
  | "service"
  | "decision"
  | "database"
  | "cloud"
  | "terminal"
  | "predefined-process"
  | "circle"
  | "pentagon"
  | "callout"
  | "arrow"
  | "hexagon"
  | "triangle"
  | "star"
  | "parallelogram"
  | "document"
  | "header-card"
  | "side-panel"
  | "left-panel"
  | "legend"
  | "legend-key"
  | "text"
  | "comment";
type DocsExportMode = "readable" | "full-design";
type DiagramPage = { id: string; name: string; deletedAt?: string };
type DiagramCommentReply = { id: string; author: string; text: string; createdAt: string };
type DiagramComment = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  position: { x: number; y: number };
  replies: DiagramCommentReply[];
  resolved?: boolean;
};
type DeleteIntent = { page: DiagramPage; mode: "trash" | "permanent" };
type EdgeBend = { x: number; y: number };
type ConnectorLineStyle = "solid" | "dashed" | "flow-dot";
type ErdCardinality = "default" | "one" | "zero-or-one" | "many" | "one-or-many" | "zero-or-many";
type ErdColumn = { id: string; name: string };
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
type NodeTone = "cyan" | "violet" | "amber" | "emerald" | "slate" | "rose" | "black";
type ComponentCategory = "service" | "shape" | "flowchart" | "erd";
type ComponentTextTarget = "title" | "description" | "header";
type ComponentTextStyle = Pick<CSSProperties, "color" | "fontFamily" | "fontStyle" | "fontWeight" | "textAlign" | "textDecoration">;

type ArchitectureNodeData = {
  label: string;
  description?: string;
  titleSize?: number;
  descriptionSize?: number;
  headerSize?: number;
  shape: NodeShape;
  icon: NodeIcon;
  tone: NodeTone;
  componentCategory?: ComponentCategory;
  legendColor?: string;
  legendOpacity?: number;
  legendNodeIds?: string[];
  legendEntries?: LegendKeyEntry[];
  _animState?: "inactive" | "active" | "completed";
  editing?: boolean;
  fontWeight?: CSSProperties["fontWeight"];
  fontStyle?: CSSProperties["fontStyle"];
  fontFamily?: CSSProperties["fontFamily"];
  titleTextStyle?: ComponentTextStyle;
  descriptionTextStyle?: ComponentTextStyle;
  headerText?: string;
  headerTextStyle?: ComponentTextStyle;
  headerColor?: string;
  leftPanelColor?: string;
  rightPanelColor?: string;
  panelSide?: "left" | "right";
  editingTextTarget?: ComponentTextTarget;
  showTitle?: boolean;
  showDescription?: boolean;
  autoGrowWithText?: boolean;
  onLabelChange?: (value: string) => void;
  onEditingChange?: (editing: boolean) => void;
  onTextStyleChange?: (patch: Partial<ArchitectureNodeData>) => void;
  onTextEditingChange?: (target: ComponentTextTarget) => void;
  commentId?: string;
  serviceLogo?: string;
  serviceSymbol?: "mobile" | "user" | "vector" | "computer" | "server" | "security" | "cloud" | "domain" | "auth" | "protection" | "ai";
  hideIcon?: boolean;
  fillColor?: string;
  fillOpacity?: number;
  outlineColor?: string;
  outlineStyle?: "solid" | "dashed" | "small-dashed";
  erdColumns?: Array<ErdColumn | string>;
  erdExpanded?: boolean;
  onErdExpandedChange?: (expanded: boolean) => void;
};

const normalizeErdColumns = (columns?: Array<ErdColumn | string>): ErdColumn[] =>
  (columns ?? []).map((column, index) => typeof column === "string"
    ? { id: `legacy-column-${index}`, name: column }
    : column);

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
type CanvasSnapshot = { nodes: ArchitectureNode[]; edges: Edge[] };
type AlignmentGuide = {
  axis: "x" | "y";
  position: number;
  start: number;
  end: number;
};
type AnnotationTool = "pen" | "highlighter" | "eraser";
type AnnotationStroke = {
  id: string;
  tool: Exclude<AnnotationTool, "eraser">;
  points: { x: number; y: number }[];
  color: string;
  thickness: number;
  opacity: number;
};
type AnnotationConfig = { color: string; thickness: number; opacity: number };
const ANNOTATION_COLORS = [
  "#ffffff", "#94a3b8", "#111827", "#38bdf8", "#f59e0b", "#fde68a",
  "#facc15", "#34d399", "#7dd3fc", "#f0abfc", "#ec4899", "#f43f5e",
  "#8b5cf6", "#0ea5e9", "#f97316", "#eab308", "#10b981", "#d946ef",
];

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

function ArchitectureNodeCard({ id, data, selected, width, height }: NodeProps<ArchitectureNode>) {
  const Icon = iconMap[data.icon] ?? Server;
  const animState = data._animState;
  const componentCategory = componentCategoryFor(data);
  const isServiceNode = Boolean(data.serviceLogo || data.serviceSymbol);
  const titleTextStyle = data.titleTextStyle ?? {};
  const descriptionTextStyle = data.descriptionTextStyle ?? {};
  const headerTextStyle = data.headerTextStyle ?? {};
  const showTitle = data.showTitle !== false;
  const showDescription = data.showDescription !== false;
  const serviceIconSize = Math.max(44, Math.min(180, Math.min(width ?? 190, height ?? 150) * 0.48));
  const connectorStops = data.shape === "header-card" || (data.shape === "service" && componentCategory === "flowchart")
    ? [6.25, 18.75, 31.25, 43.75, 56.25, 68.75, 81.25, 93.75]
    : isServiceNode ? [25, 50, 75] : [10, 30, 50, 70, 90];
  const connectorCenterIndex = Math.floor((connectorStops.length - 1) / 2);
  const serviceTileSize = Math.min((width ?? 112) * 0.96, (height ?? 142) - 32);
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
    // React Flow supplies the live resized dimensions.  Scale the legend from
    // its area, so growing either dimension gives the labels room to grow too.
    const keyWidth = width ?? 250;
    const keyHeight = height ?? 240;
    const entryCount = data.legendEntries?.length ?? 0;
    const isWideLegend = keyWidth / keyHeight > 1.45;
    // Wide legend keys are a single horizontal row: each item receives an
    // equal share of the free width rather than wrapping into columns.
    const legendColumns = isWideLegend ? Math.max(1, entryCount) : 1;
    const legendScale = Math.min(
      3.5,
      Math.max(
        0.8,
        isWideLegend
          ? keyWidth / (entryCount <= 2 ? 280 : entryCount <= 4 ? 400 : 520)
          : Math.sqrt((keyWidth * keyHeight) / (250 * 240)),
      ),
    );
    return (
      <div
        className={`architecture-node shape-legend-key ${isWideLegend ? "is-wide" : ""} ${selected ? "is-selected" : ""}`}
        style={{ "--legend-scale": legendScale, "--legend-columns": legendColumns } as CSSProperties}
      >
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

  if (data.shape === "comment") {
    return (
      <>
        <div className={`comment-marker comment-marker-hit ${selected ? "is-selected" : ""}`} title={data.label || "Comment"} />
        <NodeToolbar nodeId={id} isVisible position={Position.Top} offset={-40} className="comment-marker-toolbar">
          <MessageCircle size={27} fill="currentColor" strokeWidth={2.2} aria-label="Comment" />
        </NodeToolbar>
      </>
    );
  }

  if (data.shape === "text") {
    return (
      <div
        className={`architecture-node shape-text ${selected ? "is-selected" : ""} ${animState ? `anim-${animState}` : ""}`}
        style={
          {
            "--node-title-size": `${data.titleSize ?? 16}px`,
            "--node-description-size": `${data.descriptionSize ?? 12}px`,
          } as CSSProperties
        }
      >
        <NodeResizer
          minWidth={60}
          minHeight={24}
          isVisible={selected}
          color="#0ea5c6"
          handleStyle={{ width: 8, height: 8, borderRadius: 3 }}
        />
        {data.editing ? (
          <textarea
            className="text-node-editor nodrag nopan"
            autoFocus
            rows={1}
            value={data.label}
            placeholder="Type something"
            aria-label="Text annotation"
            style={{ fontSize: `${data.titleSize ?? 16}px`, color: data.legendColor ?? "#334155", fontWeight: data.fontWeight ?? 400, fontStyle: data.fontStyle ?? "normal", fontFamily: data.fontFamily }}
            onChange={(event) => data.onLabelChange?.(event.target.value)}
            onBlur={() => data.onEditingChange?.(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                data.onEditingChange?.(false);
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                data.onEditingChange?.(false);
              }
            }}
          />
        ) : (
          <div className={`text-node-content ${data.label ? "" : "is-placeholder"}`} style={{ fontSize: `${data.titleSize ?? 16}px`, color: data.legendColor ?? "#334155", fontWeight: data.fontWeight ?? 400, fontStyle: data.fontStyle ?? "normal", fontFamily: data.fontFamily }}>
            {data.label || "Type something"}
          </div>
        )}
        <NodeToolbar nodeId={id} isVisible={selected} position={Position.Top} offset={10} className="text-format-toolbar nodrag nopan">
            <select aria-label="Text size" value={data.titleSize ?? 16} onChange={(event) => data.onTextStyleChange?.({ titleSize: Number(event.target.value) })}>
              {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72].map((size) => <option key={size} value={size}>{size}px</option>)}
            </select>
            <span className="text-toolbar-divider" aria-hidden="true">|</span>
            <select className="text-font-family-select" aria-label="Font family" value={data.fontFamily ?? ""} onChange={(event) => data.onTextStyleChange?.({ fontFamily: event.target.value || undefined })}>
              <option value="">System</option>
              <option value="Inter, Arial, sans-serif">Inter</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Times New Roman', Times, serif">Times New Roman</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Courier New', monospace">Courier New</option>
            </select>
            <span className="text-toolbar-divider" aria-hidden="true">|</span>
            <button type="button" className={data.fontWeight === 700 ? "active" : ""} title="Bold" onClick={() => data.onTextStyleChange?.({ fontWeight: data.fontWeight === 700 ? 400 : 700 })}><strong>B</strong></button>
            <button type="button" className={data.fontStyle === "italic" ? "active" : ""} title="Italic" onClick={() => data.onTextStyleChange?.({ fontStyle: data.fontStyle === "italic" ? "normal" : "italic" })}><em>I</em></button>
            <label title="Text color" style={{ "--text-color": data.legendColor ?? "#334155" } as CSSProperties}><span>A</span><input type="color" value={data.legendColor ?? "#334155"} onChange={(event) => data.onTextStyleChange?.({ legendColor: event.target.value })} /></label>
            <span className="text-toolbar-divider" aria-hidden="true">|</span>
            <button type="button" title="Edit text" onClick={() => data.onEditingChange?.(true)}><Type size={16} /></button>
        </NodeToolbar>
        {selected && (
          <Handle className="side-handle" type="source" position={Position.Right} id="right" style={{ top: "50%" }} />
        )}
      </div>
    );
  }

  const erdColumns = normalizeErdColumns(data.erdColumns);
  const namedErdColumns = erdColumns.filter((column) => column.name.trim());

  return (
      <div
        className={`architecture-node shape-${data.shape} tone-${data.tone} ${data.shape === "left-panel" && data.panelSide === "right" ? "left-panel-on-right" : ""} ${
          selected ? "is-selected" : ""
      } ${isServiceNode ? "service-node" : ""} ${!showTitle && !showDescription ? "no-text" : ""} ${data.fillColor || data.outlineColor || data.outlineStyle ? "has-component-style" : ""} ${animState ? `anim-${animState}` : ""}`}
      style={
        {
          "--node-title-size": `${data.titleSize ?? 13}px`,
          "--node-description-size": `${data.descriptionSize ?? 10}px`,
          "--service-icon-size": `${serviceIconSize}px`,
          "--shape-fill": `color-mix(in srgb, ${data.fillColor ?? "#ffffff"} ${data.fillOpacity ?? 100}%, transparent)`,
          "--shape-outline": data.outlineColor ?? data.legendColor ?? "var(--node)",
          "--shape-border-style": data.outlineStyle === "small-dashed" ? "dotted" : (data.outlineStyle ?? "solid"),
          "--shape-dasharray": data.outlineStyle === "dashed" ? "10 7" : data.outlineStyle === "small-dashed" ? "3 4" : "none",
          ...(data.legendColor ? {
            "--node": data.legendColor,
            "--node-soft": `color-mix(in srgb, ${data.legendColor} 11%, white)`,
            "--node-line": `color-mix(in srgb, ${data.legendColor} 45%, white)`,
          } : {}),
        } as CSSProperties
      }
      onDoubleClick={(event) => { event.stopPropagation(); data.onTextEditingChange?.("title"); }}
    >
      {data.shape !== "legend-key" && data.shape !== "legend" && data.shape !== "database" && (
        <NodeResizer
          minWidth={80}
          minHeight={40}
          isVisible={selected}
          color="#0ea5c6"
          handleStyle={{ width: 10, height: 10, borderRadius: 3 }}
        />
      )}
            {isServiceNode ? (
              data.shape === "service" ? (
                <div className="service-connector-frame" aria-hidden="true">
                  {connectorStops.map((pct, i) => <Handle key={`service-top-${i}`} className="side-handle" type="source" position={Position.Top} id={i === connectorCenterIndex ? "top" : `top-${i}`} style={{ left: `${pct}%`, top: 0 }} />)}
                  {connectorStops.map((pct, i) => <Handle key={`service-bottom-${i}`} className="side-handle" type="source" position={Position.Bottom} id={i === connectorCenterIndex ? "bottom" : `bottom-${i}`} style={{ left: `${pct}%`, top: "100%", bottom: "auto" }} />)}
                  {connectorStops.map((pct, i) => <Handle key={`service-left-${i}`} className="side-handle" type="source" position={Position.Left} id={i === connectorCenterIndex ? "left" : `left-${i}`} style={{ left: 0, top: `${pct}%` }} />)}
                  {connectorStops.map((pct, i) => <Handle key={`service-right-${i}`} className="side-handle" type="source" position={Position.Right} id={i === connectorCenterIndex ? "right" : `right-${i}`} style={{ left: "100%", top: `${pct}%`, right: "auto" }} />)}
                </div>
              ) : (
                <>
                  {connectorStops.map((pct, i) => <Handle key={`service-top-${i}`} className="side-handle" type="source" position={Position.Top} id={i === connectorCenterIndex ? "top" : `top-${i}`} style={{ left: `calc(50% + ${(pct - 50) * serviceTileSize / 100}px)`, top: 0 }} />)}
                  {connectorStops.map((pct, i) => <Handle key={`service-bottom-${i}`} className="side-handle" type="source" position={Position.Bottom} id={i === connectorCenterIndex ? "bottom" : `bottom-${i}`} style={{ left: `calc(50% + ${(pct - 50) * serviceTileSize / 100}px)`, top: serviceTileSize, bottom: "auto" }} />)}
                  {connectorStops.map((pct, i) => <Handle key={`service-left-${i}`} className="side-handle" type="source" position={Position.Left} id={i === connectorCenterIndex ? "left" : `left-${i}`} style={{ left: `calc(50% - ${serviceTileSize / 2}px)`, top: serviceTileSize * pct / 100 }} />)}
                  {connectorStops.map((pct, i) => <Handle key={`service-right-${i}`} className="side-handle" type="source" position={Position.Right} id={i === connectorCenterIndex ? "right" : `right-${i}`} style={{ left: `calc(50% + ${serviceTileSize / 2}px)`, top: serviceTileSize * pct / 100, right: "auto" }} />)}
                </>
              )
            ) : data.shape === "database" ? (
              <>
                {namedErdColumns.map((column, index) => {
                  const top = data.erdExpanded ? 52 + index * 28 + 14 : 26;
                  return (
                    <Fragment key={column.id}>
                      <Handle className="side-handle erd-column-handle" type="source" position={Position.Left} id={`erd-left-${column.id}`} style={{ left: 0, top }} />
                      <Handle className="side-handle erd-column-handle" type="source" position={Position.Right} id={`erd-right-${column.id}`} style={{ left: "100%", right: "auto", top }} />
                    </Fragment>
                  );
                })}
              </>
            ) : data.shape === "decision"
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
        : connectorStops.map((pct, i) => (
            <Handle key={`top-${i}`} className="side-handle" type="source" position={Position.Top} id={i === connectorCenterIndex ? "top" : `top-${i}`} style={{ left: `${pct}%` }} />
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
      {data.shape === "decision" ? (
        <svg className="decision-art" viewBox="0 0 230 126" preserveAspectRatio="none" aria-hidden="true">
          <path d="M115 2 L228 63 L115 124 L2 63 Z" />
        </svg>
      ) : null}
      {data.shape === "hexagon" && (data.serviceLogo || data.serviceSymbol) ? (
        <svg className="service-hexagon-art" viewBox="0 0 190 150" preserveAspectRatio="none" aria-hidden="true">
          <path d="M48 2 H142 L188 75 L142 148 H48 L2 75 Z" />
        </svg>
      ) : null}
      {data.shape === "database" ? (
        <div className="erd-table-card">
          <header>
            <span className="erd-table-icon" aria-hidden="true"><Database size={16} /></span>
            <strong>{data.label}</strong>
            <button
              type="button"
              className="nodrag nopan"
              disabled={!namedErdColumns.length}
              onClick={(event) => {
                event.stopPropagation();
                data.onErdExpandedChange?.(!data.erdExpanded);
              }}
            >
              {data.erdExpanded && namedErdColumns.length ? "Hide" : "Details"}
            </button>
          </header>
          {data.erdExpanded && namedErdColumns.length ? (
            <div className="erd-column-list">
              {namedErdColumns.map((column) => <div key={column.id}>{column.name}</div>)}
            </div>
          ) : null}
        </div>
      ) : (
        <>
        {data.shape === "header-card" ? <div
          className="segmented-header node-editable-text"
          style={{ backgroundColor: data.headerColor ?? "#f59e0b" }}
          onDoubleClick={(event) => { event.stopPropagation(); data.onTextEditingChange?.("header"); }}
          title="Double-click to edit header text"
        ><span style={{ ...headerTextStyle, fontSize: `${data.headerSize ?? 11}px` }}>{data.headerText ?? "Header"}</span></div> : null}
        {data.shape === "side-panel" || data.shape === "left-panel" ? <div className="segmented-side segmented-side-left" style={{ backgroundColor: data.leftPanelColor ?? "#dbeafe" }} aria-hidden="true" /> : null}
        <div className="node-inner">
          {(componentCategory === "service" || componentCategory === "flowchart") && data.shape !== "decision" && !data.hideIcon ? (
            <span className="node-icon" aria-hidden="true">
              {data.serviceLogo ? <img className="node-service-logo" src={data.serviceLogo} alt="" /> : data.serviceSymbol === "mobile" ? <Smartphone size={serviceIconSize} strokeWidth={2.1} /> : data.serviceSymbol === "user" ? <UserRound size={serviceIconSize} strokeWidth={2.1} /> : data.serviceSymbol === "vector" ? <Database size={serviceIconSize} strokeWidth={2.1} /> : data.serviceSymbol === "computer" ? <Monitor size={serviceIconSize} strokeWidth={2.1} /> : data.serviceSymbol === "server" ? <Server size={serviceIconSize} strokeWidth={2.1} /> : data.serviceSymbol === "security" ? <LockKeyhole size={serviceIconSize} strokeWidth={2.1} /> : data.serviceSymbol === "cloud" ? <Cloud size={serviceIconSize} strokeWidth={2.1} /> : data.serviceSymbol === "domain" ? <Globe2 size={serviceIconSize} strokeWidth={2.1} /> : data.serviceSymbol === "auth" ? <UserRoundCheck size={serviceIconSize} strokeWidth={2.1} /> : data.serviceSymbol === "protection" ? <ShieldCheck size={serviceIconSize} strokeWidth={2.1} /> : data.serviceSymbol === "ai" ? <BrainCircuit size={serviceIconSize} strokeWidth={2.1} /> : <Icon size={17} strokeWidth={2.2} />}
            </span>
          ) : null}
          <div className="node-copy">
            {showTitle ? <strong
              className="node-editable-text"
              style={titleTextStyle}
              onDoubleClick={(event) => { event.stopPropagation(); data.onTextEditingChange?.("title"); }}
              title="Double-click to edit title style"
            >{data.label}</strong> : null}
            {showDescription && data.description ? <span
              className="node-editable-text"
              style={descriptionTextStyle}
              onDoubleClick={(event) => { event.stopPropagation(); data.onTextEditingChange?.("description"); }}
              title="Double-click to edit description style"
            >{data.description}</span> : null}
          </div>
        </div>
        {data.shape === "side-panel" ? <div className="segmented-side segmented-side-right" style={{ backgroundColor: data.rightPanelColor ?? "#dbeafe" }} aria-hidden="true" /> : null}
        </>
      )}
            {!isServiceNode && data.shape !== "decision" && data.shape !== "database" && connectorStops.map((pct, i) => (
        <Handle key={`bottom-${i}`} className="side-handle" type="source" position={Position.Bottom} id={i === connectorCenterIndex ? "bottom" : `bottom-${i}`} style={{ left: `${pct}%` }} />
      ))}
      {!isServiceNode && data.shape !== "decision" && data.shape !== "database" && connectorStops.map((pct, i) => (
        <Handle key={`right-${i}`} className="side-handle" type="source" position={Position.Right} id={i === connectorCenterIndex ? "right" : `right-${i}`} style={{ top: `${pct}%` }} />
      ))}
      {!isServiceNode && data.shape !== "decision" && data.shape !== "database" && connectorStops.map((pct, i) => (
        <Handle key={`left-${i}`} className="side-handle" type="source" position={Position.Left} id={i === connectorCenterIndex ? "left" : `left-${i}`} style={{ top: `${pct}%` }} />
      ))}
    </div>
  );
}

const nodeTypes = { architecture: memo(ArchitectureNodeCard) };

const defaultShapeSize = (shape: NodeShape) => {
  if (shape === "decision") return { width: 230, height: 126 };
  if (shape === "cloud") return { width: 290, height: 118 };
  if (shape === "database") return { width: 270, height: 78 };
  if (shape === "terminal") return { width: 250, height: 62 };
  if (shape === "predefined-process") return { width: 260, height: 92 };
  if (shape === "header-card") return { width: 270, height: 130 };
  if (shape === "side-panel") return { width: 310, height: 130 };
  if (shape === "left-panel") return { width: 270, height: 130 };
  if (shape === "text") return { width: 200, height: 40 };
  return { width: 270, height: 78 };
};

const nodeSize = (node: ArchitectureNode) => {
  const fallback = defaultShapeSize(node.data.shape);
  const styleWidth = Number.parseFloat(String(node.style?.width ?? ""));
  const styleHeight = Number.parseFloat(String(node.style?.height ?? ""));
  return {
    width: node.measured?.width ?? node.width ?? (Number.isFinite(styleWidth) ? styleWidth : fallback.width),
    height: node.measured?.height ?? node.height ?? (Number.isFinite(styleHeight) ? styleHeight : fallback.height),
  };
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
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  selected,
  data,
}: EdgeProps) {
  const edgeData = (data ?? {}) as {
    bend?: EdgeBend;
    joints?: EdgeBend[];
    onJointsChange?: (joints: EdgeBend[]) => void;
    labelPosition?: EdgeBend;
    onLabelPositionChange?: (position?: EdgeBend) => void;
    _flowDuration?: number;
    lineStyle?: ConnectorLineStyle;
    sourceCardinality?: ErdCardinality;
    targetCardinality?: ErdCardinality;
    labelBackground?: boolean;
  };
  const pathMeasureRef = useRef<SVGPathElement | null>(null);
  // Keep one editable elbow control, like a classic orthogonal diagram line.
  const storedJoint = (edgeData.joints ?? (edgeData.bend ? [edgeData.bend] : []))[0];
  // A bad value from a previous drag must never be allowed into an SVG path.
  // SVG silently renders malformed path geometry as large, opaque wedges.
  const joint = storedJoint && Number.isFinite(storedJoint.x) && Number.isFinite(storedJoint.y)
    ? storedJoint
    : undefined;
  // A connector only counts as straight when its endpoints are genuinely on
  // the same axis. Small placement differences still need a usable elbow.
  const portsAreAligned =
    Math.abs(targetX - sourceX) < 1 || Math.abs(targetY - sourceY) < 1;
  const useDirectPath = portsAreAligned;
  const hasHorizontalHandles =
    (sourcePosition === Position.Left || sourcePosition === Position.Right)
    && (targetPosition === Position.Left || targetPosition === Position.Right);
  const hasVerticalHandles =
    (sourcePosition === Position.Top || sourcePosition === Position.Bottom)
    && (targetPosition === Position.Top || targetPosition === Position.Bottom);
  const useHorizontalLane = !useDirectPath && hasHorizontalHandles;
  const useVerticalLane = !useDirectPath && hasVerticalHandles;
  const laneX = joint?.x ?? (sourceX + targetX) / 2;
  const laneY = joint?.y ?? (sourceY + targetY) / 2;
  const [d, mx, my] = useHorizontalLane
    ? [
        `M${sourceX},${sourceY} L${laneX},${sourceY} L${laneX},${targetY} L${targetX},${targetY}`,
        laneX,
        (sourceY + targetY) / 2,
      ]
    : useVerticalLane
    ? [
        `M${sourceX},${sourceY} L${sourceX},${laneY} L${targetX},${laneY} L${targetX},${targetY}`,
        (sourceX + targetX) / 2,
        laneY,
      ]
    : joint
    ? [
        `M${sourceX},${sourceY} L${sourceX},${joint.y} L${joint.x},${joint.y} L${joint.x},${targetY} L${targetX},${targetY}`,
        joint.x,
        joint.y,
      ]
    : useDirectPath
    ? [
        `M${sourceX},${sourceY} L${targetX},${targetY}`,
        (sourceX + targetX) / 2,
        (sourceY + targetY) / 2,
      ]
    : getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 8,
      });
  const dragJoint = (event: ReactPointerEvent<SVGCircleElement>) => {
    event.stopPropagation();
    const control = event.currentTarget;
    if (!edgeData.onJointsChange) return;
    const toFlowPoint = (clientX: number, clientY: number): EdgeBend => {
      // The React Flow canvas pan/zoom transform lives below the root SVG.
      // Use the control's CTM so drag coordinates stay in diagram space.
      const matrix = control.getScreenCTM();
      if (!matrix) return { x: clientX, y: clientY };
      const svg = control.ownerSVGElement;
      if (!svg) return { x: clientX, y: clientY };
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const converted = point.matrixTransform(matrix.inverse());
      return Number.isFinite(converted.x) && Number.isFinite(converted.y)
        ? { x: converted.x, y: converted.y }
        : { x: clientX, y: clientY };
    };
    const move = (moveEvent: PointerEvent) => {
      const point = toFlowPoint(moveEvent.clientX, moveEvent.clientY);
      edgeData.onJointsChange?.([
        useHorizontalLane
          ? { x: point.x, y: (sourceY + targetY) / 2 }
          : useVerticalLane
          ? { x: (sourceX + targetX) / 2, y: point.y }
          : point,
      ]);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  };
  const jointControl = joint ?? { x: mx, y: my };
  const labelPosition = edgeData.labelPosition ?? { x: mx, y: my };
  const labelBackgroundEnabled = edgeData.labelBackground !== false;
  const labelBackgroundColor = typeof labelBgStyle?.fill === "string" ? labelBgStyle.fill : "#fff";
  const labelPaddingX = labelBgPadding?.[0] ?? 6;
  const labelPaddingY = labelBgPadding?.[1] ?? 4;
  const labelFontSize = typeof labelStyle?.fontSize === "number" ? labelStyle.fontSize : 12;
  const labelMaskWidth = Math.max(34, String(label ?? "").length * labelFontSize * 0.59 + labelPaddingX * 2 + 10);
  const labelMaskHeight = Math.max(22, labelFontSize * 1.2 + labelPaddingY * 2);
  const [labelGap, setLabelGap] = useState<{ before: number; gap: number; after: number } | null>(null);
  useLayoutEffect(() => {
    if (!label || !pathMeasureRef.current) {
      setLabelGap(null);
      return;
    }
    const path = pathMeasureRef.current;
    const totalLength = path.getTotalLength();
    if (!totalLength) return;
    let nearestLength = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index <= 128; index += 1) {
      const length = totalLength * index / 128;
      const point = path.getPointAtLength(length);
      const distance = Math.hypot(point.x - labelPosition.x, point.y - labelPosition.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestLength = length;
      }
    }
    const tangentStep = Math.min(4, totalLength / 64);
    const pointBefore = path.getPointAtLength(Math.max(0, nearestLength - tangentStep));
    const pointAfter = path.getPointAtLength(Math.min(totalLength, nearestLength + tangentStep));
    const isVertical = Math.abs(pointAfter.y - pointBefore.y) > Math.abs(pointAfter.x - pointBefore.x);
    const gapLength = Math.min(totalLength * 0.9, (isVertical ? labelMaskHeight : labelMaskWidth) + 10);
    const gapStart = Math.max(0, Math.min(totalLength - gapLength, nearestLength - gapLength / 2));
    const next = {
      before: gapStart / totalLength * 1000,
      gap: gapLength / totalLength * 1000,
      after: Math.max(0, (totalLength - gapStart - gapLength) / totalLength * 1000),
    };
    setLabelGap((current) => current
      && Math.abs(current.before - next.before) < 0.1
      && Math.abs(current.gap - next.gap) < 0.1
      ? current
      : next);
  }, [d, label, labelMaskHeight, labelMaskWidth, labelPosition.x, labelPosition.y]);
  const edgePathStyle = labelGap ? {
    ...style,
    strokeDasharray: `${labelGap.before} ${labelGap.gap} ${labelGap.after} 1000`,
  } : style;
  const renderCardinalityMarker = (
    key: string,
    x: number,
    y: number,
    position: Position,
    cardinality: ErdCardinality,
  ) => {
    const rotation = position === Position.Left ? 180 : position === Position.Top ? -90 : position === Position.Bottom ? 90 : 0;
    const hasCircle = cardinality === "zero-or-one" || cardinality === "zero-or-many";
    const hasBar = cardinality === "one" || cardinality === "zero-or-one" || cardinality === "one-or-many";
    const hasCrowFoot = cardinality === "many" || cardinality === "one-or-many" || cardinality === "zero-or-many";
    // Local x=0 is the table edge and positive x points out along the
    // relationship. Keep the fork arms nearest the table so the crow's foot
    // always opens toward its entity after the group is rotated for each side.
    const barX = hasCrowFoot ? 24 : 8;
    const circleX = hasCrowFoot ? 24 : 19;
    const crowVertexX = 17;
    const crowArmX = 6;
    return (
      <g
        key={key}
        className="erd-cardinality-marker"
        transform={`translate(${x} ${y}) rotate(${rotation})`}
        style={{
          stroke: typeof style?.stroke === "string" ? style.stroke : "#64748b",
          strokeWidth: typeof style?.strokeWidth === "number" ? style.strokeWidth : 1.7,
        }}
        aria-hidden="true"
      >
        {hasCircle ? <circle cx={circleX} cy="0" r="5.5" /> : null}
        {hasBar ? <line x1={barX} y1="-7" x2={barX} y2="7" /> : null}
        {hasCrowFoot ? (
          <>
            <line x1={crowVertexX} y1="0" x2={crowArmX} y2="-8" />
            <line x1={crowVertexX} y1="0" x2={crowArmX} y2="8" />
          </>
        ) : null}
      </g>
    );
  };
  const dragLabel = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!edgeData.onLabelPositionChange) return;
    const move = (moveEvent: PointerEvent) => {
      const path = pathMeasureRef.current;
      const svg = path?.ownerSVGElement;
      const matrix = svg?.getScreenCTM();
      if (!path || !svg || !matrix) return;
      const pointer = svg.createSVGPoint();
      pointer.x = moveEvent.clientX;
      pointer.y = moveEvent.clientY;
      const flowPoint = pointer.matrixTransform(matrix.inverse());
      const totalLength = path.getTotalLength();
      let bestLength = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      const samples = 72;
      for (let index = 0; index <= samples; index += 1) {
        const length = totalLength * index / samples;
        const point = path.getPointAtLength(length);
        const distance = Math.hypot(point.x - flowPoint.x, point.y - flowPoint.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestLength = length;
        }
      }
      let range = totalLength / samples;
      for (let pass = 0; pass < 6; pass += 1) {
        const candidates = [
          Math.max(0, bestLength - range),
          bestLength,
          Math.min(totalLength, bestLength + range),
        ];
        for (const length of candidates) {
          const point = path.getPointAtLength(length);
          const distance = Math.hypot(point.x - flowPoint.x, point.y - flowPoint.y);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestLength = length;
          }
        }
        range /= 2;
      }
      const closest = path.getPointAtLength(bestLength);
      edgeData.onLabelPositionChange?.({ x: closest.x, y: closest.y });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  };
  return (
    <>
      <BaseEdge
      id={id}
      path={d}
      style={{ ...style, strokeOpacity: 0 }}
        interactionWidth={24}
      />
      <path
        className="react-flow__edge-path edge-visible-path"
        d={d}
        fill="none"
        markerEnd={markerEnd}
        pathLength={1000}
        style={{
          ...edgePathStyle,
          fill: "none",
          stroke: style?.stroke ?? "#64748b",
          strokeWidth: style?.strokeWidth ?? 1.7,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />
      <path ref={pathMeasureRef} d={d} className="edge-label-measure-path" aria-hidden="true" />
      {edgeData.sourceCardinality && edgeData.sourceCardinality !== "default"
        ? renderCardinalityMarker("source-cardinality", sourceX, sourceY, sourcePosition, edgeData.sourceCardinality)
        : null}
      {edgeData.targetCardinality && edgeData.targetCardinality !== "default"
        ? renderCardinalityMarker("target-cardinality", targetX, targetY, targetPosition, edgeData.targetCardinality)
        : null}
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="edge-label-portal nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelPosition.x}px, ${labelPosition.y}px)`,
            }}
          >
            <div
              className="edge-label-draggable nodrag nopan"
              onPointerDown={dragLabel}
              onDoubleClick={(event) => { event.stopPropagation(); edgeData.onLabelPositionChange?.(); }}
              title="Drag to reposition · Double-click to reset"
              style={{
                color: typeof labelStyle?.fill === "string" ? labelStyle.fill : "#334155",
                fontSize: labelStyle?.fontSize,
                fontWeight: labelStyle?.fontWeight,
                background: labelBackgroundEnabled ? labelBackgroundColor : "var(--edge-label-cutout, #f6f8fb)",
                opacity: 1,
                borderRadius: labelBgBorderRadius,
                padding: `${labelPaddingY}px ${labelPaddingX}px`,
                boxShadow: "none",
              }}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      ) : null}
      {edgeData._flowDuration ? (
        <path
          d={d}
          className="connector-water-pulse"
          pathLength={1000}
          style={{ animationDuration: `${edgeData._flowDuration}ms`, ...(labelGap ? { strokeDasharray: `${labelGap.before} ${labelGap.gap} ${labelGap.after} 1000` } : {}) }}
          aria-hidden="true"
        />
      ) : null}
      {edgeData.lineStyle === "flow-dot" ? (
        <circle className="connector-flow-dot" r={3.5} aria-hidden="true">
          <animateMotion key={d} dur="2.35s" repeatCount="indefinite" path={d} />
        </circle>
      ) : null}
      {selected ? (
        <circle
          className="edge-bend-control"
          cx={jointControl.x}
          cy={jointControl.y}
          r={7}
          onPointerDown={dragJoint}
          onContextMenu={(event) => {
            event.preventDefault();
            edgeData.onJointsChange?.([]);
          }}
        />
      ) : null}
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
  serviceLogo?: string,
  serviceSymbol?: ArchitectureNodeData["serviceSymbol"],
  componentCategory?: ComponentCategory,
): ArchitectureNode => ({
  id,
  type: "architecture",
  position: { x, y },
  data: { label, description, shape, icon, tone, serviceLogo, serviceSymbol, componentCategory },
});

const commentNode = (comment: DiagramComment): ArchitectureNode => ({
  id: `comment-marker-${comment.id}`,
  type: "architecture",
  position: comment.position,
  data: { label: comment.text, description: "", shape: "comment", icon: "input", tone: "violet", commentId: comment.id },
  style: { width: 34, height: 34, zIndex: 20 },
});

const getLegendFrame = (allNodes: ArchitectureNode[], nodeIds: string[]) => {
  const members = allNodes.filter(
    (node) =>
      node.data.shape !== "legend" &&
      node.data.shape !== "legend-key" &&
      node.data.shape !== "comment" &&
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
  type: "flowing",
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

const userFlowNodes: ArchitectureNode[] = [
  n("uf-start", 80, 110, "Start", "Learner opens LemmaAI", "terminal", "play", "emerald"),
  n("uf-login", 80, 250, "Sign up / Log in", "Identity and learner profile", "service", "user", "cyan"),
  n("uf-practice", 80, 390, "Choose practice or scan problem", "Select a learning activity", "service", "input", "cyan"),
  n("uf-prompt", 590, 390, "Show Problem + Lemma prompt", "Adaptive learning prompt", "service", "bot", "violet"),
  n("uf-submit", 590, 540, "System checks submitted answer", "Evaluate learner response", "service", "brain", "cyan"),
  n("uf-response", 220, 650, "Student Response", "Correct, confused, or asks for help", "decision", "decision", "amber"),
  n("uf-hint", 350, 800, "Show Visual Hint", "Guide the learner with a hint", "service", "sparkles", "violet"),
  n("uf-outcome", 700, 890, "Answer outcome", "Correct or wrong", "decision", "decision", "amber"),
  n("uf-correct", 260, 1040, "Correct: reward + progress update", "Celebrate and record progress", "service", "check", "emerald"),
  n("uf-wrong", 820, 1040, "Wrong: hint/support + retry", "Explain and offer another try", "service", "input", "rose"),
  n("uf-continue", 590, 1210, "Continue next problem or finish practice", "Keep learning or end the session", "service", "route", "cyan"),
  n("uf-dashboard", 1190, 500, "Dashboard", "Parent tracking and learner progress", "service", "dashboard", "violet"),
  n("uf-review", 1190, 1030, "Review progress, weak skill, and engagement", "Parent / teacher insight", "service", "dashboard", "violet"),
  n("uf-end", 590, 1370, "End", "Practice session complete", "terminal", "check", "emerald"),
];

const userFlowEdges: Edge[] = [
  edge("uf-1", "uf-start", "uf-login"), edge("uf-2", "uf-login", "uf-practice"), edge("uf-3", "uf-practice", "uf-prompt"),
  edge("uf-4", "uf-prompt", "uf-submit"), edge("uf-5", "uf-submit", "uf-response"), edge("uf-6", "uf-response", "uf-hint", "Confused / help"),
  edge("uf-7", "uf-response", "uf-outcome", "Submitted answer"), edge("uf-8", "uf-hint", "uf-prompt", "Try again", true),
  edge("uf-9", "uf-outcome", "uf-correct", "Correct"), edge("uf-10", "uf-outcome", "uf-wrong", "Wrong"),
  edge("uf-11", "uf-correct", "uf-continue"), edge("uf-12", "uf-wrong", "uf-continue", "Retry"),
  edge("uf-13", "uf-continue", "uf-prompt", "Next problem", true), edge("uf-14", "uf-continue", "uf-end", "Finish"),
  edge("uf-15", "uf-prompt", "uf-dashboard", "Progress data"), edge("uf-16", "uf-dashboard", "uf-review"),
];

const shapeOptions: { value: NodeShape; label: string }[] = [
  { value: "service", label: "Service" },
  { value: "circle", label: "Circle" },
  { value: "pentagon", label: "Pentagon" },
  { value: "callout", label: "Callout" },
  { value: "arrow", label: "Arrow" },
  { value: "hexagon", label: "Hexagon" },
  { value: "triangle", label: "Triangle" },
  { value: "star", label: "Star" },
  { value: "parallelogram", label: "Parallelogram" },
  { value: "document", label: "Document" },
  { value: "header-card", label: "Header Card" },
  { value: "side-panel", label: "Side Panel" },
  { value: "left-panel", label: "Left Panel" },
  { value: "decision", label: "Diamond" },
  { value: "database", label: "Database" },
  { value: "cloud", label: "Cloud" },
  { value: "terminal", label: "Start / End" },
  { value: "predefined-process", label: "Predefined Process" },
];

const shapeDrawerSections: { id: string; label: string; shapes: NodeShape[] }[] = [
  { id: "basic", label: "Shapes", shapes: ["service", "header-card", "side-panel", "left-panel", "circle", "pentagon", "callout", "arrow", "hexagon", "triangle", "star", "parallelogram", "document"] },
  { id: "flowchart", label: "Flowchart", shapes: ["service", "terminal", "predefined-process", "decision", "cloud"] },
  { id: "erd", label: "ERD", shapes: ["database"] },
];

const shapesByCategory: Record<Exclude<ComponentCategory, "service">, NodeShape[]> = {
  shape: shapeDrawerSections.find((section) => section.id === "basic")!.shapes,
  flowchart: shapeDrawerSections.find((section) => section.id === "flowchart")!.shapes,
  erd: shapeDrawerSections.find((section) => section.id === "erd")!.shapes,
};

const componentCategoryFor = (data: ArchitectureNodeData): ComponentCategory => {
  if (data.componentCategory) return data.componentCategory;
  if (data.serviceLogo || data.serviceSymbol) return "service";
  if (data.shape === "database") return "erd";
  if (["decision", "cloud", "terminal", "predefined-process"].includes(data.shape)) return "flowchart";
  return "shape";
};

const defaultIconForShape = (shape: NodeShape): NodeIcon =>
  shape === "decision" ? "decision" : shape === "database" ? "database" : shape === "cloud" ? "memory" : shape === "terminal" ? "play" : "server";

const servicePresets: { label: string; logo?: string; kind?: NonNullable<ArchitectureNodeData["serviceSymbol"]>; icon: NodeIcon; tone: NodeTone }[] = [
  { label: "Supabase", logo: "https://cdn.simpleicons.org/supabase/3FCF8E", icon: "database", tone: "emerald" },
  { label: "Vercel", logo: "https://cdn.simpleicons.org/vercel/000000", icon: "app", tone: "slate" },
  { label: "n8n", logo: "https://cdn.simpleicons.org/n8n/EA4B71", icon: "workflow", tone: "rose" },
  { label: "Mobile", kind: "mobile", icon: "app", tone: "cyan" },
  { label: "Pinecone", logo: "/pinecone.svg", kind: "vector", icon: "storage", tone: "violet" },
  { label: "User", kind: "user", icon: "session", tone: "slate" },
  { label: "Computer", kind: "computer", icon: "app", tone: "cyan" },
  { label: "Server", kind: "server", icon: "server", tone: "slate" },
  { label: "Security", kind: "security", icon: "alert", tone: "rose" },
  { label: "Cloud", kind: "cloud", icon: "memory", tone: "cyan" },
  { label: "Domain / DNS", kind: "domain", icon: "network", tone: "violet" },
  { label: "Authentication", kind: "auth", icon: "session", tone: "emerald" },
  { label: "Protection", kind: "protection", icon: "alert", tone: "slate" },
  { label: "AI / Model", kind: "ai", icon: "brain", tone: "violet" },
];

function ShapeOutlinePreview({ shape, className }: { shape: NodeShape; className?: string }) {
  const svgProps = { className, viewBox: "0 0 32 26", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinejoin: "round" as const };
  if (shape === "circle") return <svg {...svgProps}><circle cx="16" cy="13" r="10" /></svg>;
  if (shape === "pentagon") return <svg {...svgProps}><path d="M16 2 29 11l-5 13H8L3 11Z" /></svg>;
  if (shape === "callout") return <svg {...svgProps}><path d="M3 3h26v15H14l-5 5 1-5H3Z" /></svg>;
  if (shape === "arrow") return <svg {...svgProps}><path d="M3 9h15V4l11 9-11 9v-5H3Z" /></svg>;
  if (shape === "hexagon") return <svg {...svgProps}><path d="m9 2 14 0 7 11-7 11H9L2 13Z" /></svg>;
  if (shape === "triangle") return <svg {...svgProps}><path d="M16 2 30 24H2Z" /></svg>;
  if (shape === "star") return <svg {...svgProps}><path d="m16 2 3.7 7.5 8.3 1.2-6 5.8 1.4 8.2-7.4-3.9-7.4 3.9 1.4-8.2-6-5.8 8.3-1.2Z" /></svg>;
  if (shape === "parallelogram") return <svg {...svgProps}><path d="M8 3h21l-5 20H3Z" /></svg>;
  if (shape === "document") return <svg {...svgProps}><path d="M3 3h26v17l-5-3-5 5-5-5-5 3-6-3Z" /></svg>;
  if (shape === "header-card") return <svg {...svgProps}><rect x="3" y="3" width="26" height="21" rx="1" /><path d="M3 9h26" /></svg>;
  if (shape === "side-panel") return <svg {...svgProps}><rect x="2" y="4" width="28" height="18" rx="1" /><path d="M8 4v18M24 4v18" /></svg>;
  if (shape === "left-panel") return <svg {...svgProps}><rect x="2" y="4" width="28" height="18" rx="1" /><path d="M8 4v18" /></svg>;
  if (shape === "decision") return <svg {...svgProps}><path d="m16 1 15 12-15 12L1 13Z" /></svg>;
  if (shape === "terminal") return <svg {...svgProps}><rect x="2" y="5" width="28" height="16" rx="8" /></svg>;
  if (shape === "predefined-process") return <svg {...svgProps}><rect x="2" y="4" width="28" height="18" rx="2" /><path d="M7 4v18M25 4v18" /></svg>;
  if (shape === "database") return <svg {...svgProps}><ellipse cx="16" cy="5" rx="11" ry="3" /><path d="M5 5v16c0 1.7 4.9 3 11 3s11-1.3 11-3V5" /><path d="M5 13c0 1.7 4.9 3 11 3s11-1.3 11-3" /></svg>;
  if (shape === "cloud") return <svg {...svgProps}><path d="M7 22h17a6 6 0 0 0 .7-12A8 8 0 0 0 9.5 8 6 6 0 0 0 7 22Z" /></svg>;
  return <svg {...svgProps}><rect x="3" y="4" width="26" height="18" rx="2" /></svg>;
}

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
  componentCategory: "shape",
  hideIcon: true,
});

const createLegendDraft = (): LegendDraft => ({
  label: "User",
  color: "#0ea5c6",
  opacity: 0.12,
  nodeIds: [],
});

const ACTIVE_WORKSPACE_KEY = "collieai-active-workspace-v1";
const ACTIVE_WORKFLOW_NAME_KEY = "collieai-active-workflow-name-v1";
const PAGE_INDEX_KEY = "collieai-architecture-pages-v1";
const LEGACY_STORAGE_KEY = "collieai-architecture-v1";
const WORKSPACE_META_KEY = "collieai-workspace-home-v1";
const EXTRA_WORKSPACES_KEY = "collieai-extra-workspaces-v1";
const defaultPages: DiagramPage[] = [{ id: "main", name: "Main architecture" }];

// Every workspace keeps its own pages, diagrams, history and animation data
// in localStorage.  The original "collie" workspace keeps its legacy keys so
// existing diagrams continue to load; all other workspaces use namespaced
// keys so a page id such as "main" never collides between workspaces.
const pageIndexKey = (workspaceId: string) =>
  workspaceId === "collie" ? PAGE_INDEX_KEY : `collieai-architecture-pages-${workspaceId}-v1`;
const pageStorageKey = (workspaceId: string, pageId: string) =>
  workspaceId === "collie"
    ? `collieai-architecture-page-${pageId}`
    : `collieai-architecture-page-${workspaceId}-${pageId}`;
const historyStorageKey = (workspaceId: string, pageId: string) =>
  workspaceId === "collie"
    ? `collieai-architecture-history-${pageId}`
    : `collieai-architecture-history-${workspaceId}-${pageId}`;
const animationStorageKey = (workspaceId: string, pageId: string) =>
  workspaceId === "collie"
    ? `collieai-animation-${pageId}`
    : `collieai-animation-${workspaceId}-${pageId}`;
const commentsStorageKey = (workspaceId: string, pageId: string) =>
  workspaceId === "collie"
    ? `collieai-comments-${pageId}`
    : `collieai-comments-${workspaceId}-${pageId}`;
const annotationsStorageKey = (workspaceId: string, pageId: string) =>
  workspaceId === "collie"
    ? `collieai-annotations-${pageId}`
    : `collieai-annotations-${workspaceId}-${pageId}`;
const MAX_HISTORY_ENTRIES = 20;
const MAX_DAILY_HISTORY_ENTRIES = 30;
const MAX_HISTORY_BYTES = 700_000;

const activeWorkspaceId = () =>
  typeof window !== "undefined"
    ? (window.localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? "collie")
    : "collie";

const workspaceApiUrl = () =>
  typeof window !== "undefined"
    ? `${window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "https://collieai-system-architecture.yestinguarin.chatgpt.site/api/workspace" : "/api/workspace"}?id=${encodeURIComponent(activeWorkspaceId())}`
    : "/api/workspace?id=collie";

const diagramSignature = (nodes: ArchitectureNode[], edges: Edge[]) =>
  JSON.stringify({ nodes: nodes.filter((node) => node.data.shape !== "comment"), edges }, (key, value) =>
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

// Preserve the latest editing trail plus one snapshot per older day. A busy
// day can no longer push yesterday's work out of the version history.
const retainHistory = (entries: DiagramHistoryEntry[]) => {
  const recent = entries.slice(0, MAX_HISTORY_ENTRIES);
  const coveredDays = new Set(recent.map((entry) => new Date(entry.timestamp).toDateString()));
  const dailySnapshots: DiagramHistoryEntry[] = [];

  for (const entry of entries.slice(MAX_HISTORY_ENTRIES)) {
    const day = new Date(entry.timestamp).toDateString();
    if (coveredDays.has(day)) continue;
    coveredDays.add(day);
    dailySnapshots.push(entry);
    if (dailySnapshots.length === MAX_DAILY_HISTORY_ENTRIES) break;
  }

  const retained = [...recent, ...dailySnapshots];
  const withinBudget: DiagramHistoryEntry[] = [];
  let bytes = 2;
  for (const entry of retained) {
    const entryBytes = JSON.stringify(entry).length + 1;
    if (withinBudget.length > 0 && bytes + entryBytes > MAX_HISTORY_BYTES) break;
    withinBudget.push(entry);
    bytes += entryBytes;
  }
  return withinBudget;
};

const removeAnimationEdgeClasses = (className?: string) =>
  (className ?? "")
    .split(/\s+/)
    .filter((name) => name && name !== "anim-edge-active" && name !== "anim-edge-completed")
    .join(" ");

function FlowWorkspace({ onGoHome }: { onGoHome: () => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<ArchitectureNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [canvasMode, setCanvasMode] = useState<"select" | "move">("select");
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [drawPresentationOpen, setDrawPresentationOpen] = useState(false);
  const [presentationInteraction, setPresentationInteraction] = useState<"draw" | "comment" | "move" | "select">("draw");
  const [drawToolboxOpen, setDrawToolboxOpen] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>("pen");
  const [annotationStrokes, setAnnotationStrokes] = useState<AnnotationStroke[]>([]);
  const [annotationConfig, setAnnotationConfig] = useState<Record<"pen" | "highlighter", AnnotationConfig>>({
    pen: { color: "#111827", thickness: 4, opacity: 1 },
    highlighter: { color: "#fde68a", thickness: 20, opacity: .42 },
  });
  const [eraserThickness, setEraserThickness] = useState(28);
  const [stopPresentationConfirm, setStopPresentationConfirm] = useState(false);
  const architectureShellRef = useRef<HTMLElement | null>(null);
  const activeAnnotationStrokeRef = useRef<string | null>(null);
  const skipAnnotationSaveRef = useRef(false);
  const [openShapeSections, setOpenShapeSections] = useState<Record<string, boolean>>({ services: false, basic: true, flowchart: true, erd: true, icons: false });
  const [legendShapeFilter, setLegendShapeFilter] = useState<"all" | NodeShape>("all");
  const selectionClipboardRef = useRef<{ nodes: ArchitectureNode[]; edges: Edge[] } | null>(null);
  const undoHistoryRef = useRef<CanvasSnapshot[]>([]);
  const redoHistoryRef = useRef<CanvasSnapshot[]>([]);
  const latestCanvasSnapshotRef = useRef<CanvasSnapshot | null>(null);
  const latestCanvasSignatureRef = useRef("");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [legendCreatorOpen, setLegendCreatorOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [textPlacementMode, setTextPlacementMode] = useState(false);
  const [textDraft, setTextDraft] = useState<ArchitectureNodeData>({ label: "Text", description: "", shape: "text", icon: "sparkles", tone: "slate" });
  const [comments, setComments] = useState<DiagramComment[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentPlacementMode, setCommentPlacementMode] = useState(false);
  const [commentComposer, setCommentComposer] = useState<{ position: { x: number; y: number }; screenX: number; screenY: number } | null>(null);
  const [commentThread, setCommentThread] = useState<{ id: string; position: { x: number; y: number } } | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [commentActionsOpen, setCommentActionsOpen] = useState(false);
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
  const [docsInspectZoom, setDocsInspectZoom] = useState(1);
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
  const [workflowTitle, setWorkflowTitle] = useState("Workflow");
  const [pagesOpen, setPagesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<DiagramHistoryEntry[]>([]);
  const [autoSaveState, setAutoSaveState] = useState<"saved" | "saving">("saved");
  const [trashOpen, setTrashOpen] = useState(false);
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [nodeDraft, setNodeDraft] = useState<ArchitectureNodeData>(createNodeDraft);
  const [selectedCreatorOption, setSelectedCreatorOption] = useState<string | null>(null);
  const [applyTitleSizeToAll, setApplyTitleSizeToAll] = useState(false);
  const [applyDescriptionSizeToAll, setApplyDescriptionSizeToAll] = useState(false);
  const [legendDraft, setLegendDraft] = useState<LegendDraft>(createLegendDraft);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const historyReadyRef = useRef(false);
  const lastHistorySignatureRef = useRef("");
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
  const commentPopupFrameRef = useRef<number | null>(null);
  const commentThreadPopupRef = useRef<HTMLElement | null>(null);
  const commentComposerPopupRef = useRef<HTMLElement | null>(null);
  // In custom-flow mode, consecutive node clicks are treated as a route.  This
  // keeps the authoring interaction focused on the boxes while playback uses
  // the real connector between them.
  const customFlowStartNodeRef = useRef<string | null>(null);
  const textSizeMeasureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { fitView, screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  // The active workspace is fixed for the lifetime of this FlowWorkspace
  // mount (the home screen sets it right before opening the workspace),
  // so capture it once and reuse it for every namespaced storage key.
  const workspaceId = useRef<string>(activeWorkspaceId());
  // Set once the initial cloud snapshot for this workspace has been applied.
  // Until then, local-to-cloud sync is suspended so stale local data cannot
  // be pushed back to the cloud and re-corrupt the workspace.
  const cloudHydratedRef = useRef(false);
  const commentMarkers = (items: DiagramComment[]) => items.map(commentNode);
  const erdLayoutSignature = nodes
    .filter((node) => node.data.shape === "database")
    .map((node) => `${node.id}:${node.data.erdExpanded ? 1 : 0}:${normalizeErdColumns(node.data.erdColumns).map((column) => `${column.id}=${column.name}`).join(",")}`)
    .join("|");

  useEffect(() => {
    const erdNodeIds = nodes.filter((node) => node.data.shape === "database").map((node) => node.id);
    if (!erdNodeIds.length) return;
    const frame = requestAnimationFrame(() => updateNodeInternals(erdNodeIds));
    return () => cancelAnimationFrame(frame);
  }, [erdLayoutSignature, updateNodeInternals]);

  useEffect(() => {
    skipAnnotationSaveRef.current = true;
    try {
      const stored = JSON.parse(window.localStorage.getItem(annotationsStorageKey(workspaceId.current, activePageId)) ?? "[]");
      setAnnotationStrokes(Array.isArray(stored) ? stored : []);
    } catch {
      setAnnotationStrokes([]);
    }
  }, [activePageId]);

  useEffect(() => {
    if (skipAnnotationSaveRef.current) {
      skipAnnotationSaveRef.current = false;
      return;
    }
    setLocalStorageItem(
      annotationsStorageKey(workspaceId.current, activePageId),
      JSON.stringify(annotationStrokes),
    );
  }, [activePageId, annotationStrokes]);

  const createCanvasSnapshot = useCallback((): CanvasSnapshot => {
    // Selection is UI state, not a diagram edit. Removing it also prevents a
    // marquee selection from creating an undo step.
    const snapshot = {
      nodes: nodes.map(({ selected: _selected, ...node }) => ({ ...node })),
      edges: edges.map(({ selected: _selected, ...edgeItem }) => ({ ...edgeItem })),
    };
    return JSON.parse(JSON.stringify(snapshot)) as CanvasSnapshot;
  }, [edges, nodes]);

  useEffect(() => {
    const snapshot = createCanvasSnapshot();
    const signature = JSON.stringify(snapshot);
    if (!latestCanvasSnapshotRef.current) {
      latestCanvasSnapshotRef.current = snapshot;
      latestCanvasSignatureRef.current = signature;
      return;
    }
    if (signature === latestCanvasSignatureRef.current) return;

    // Coalesce rapid pointer updates (such as dragging a node) into one undo
    // entry while preserving every meaningful diagram edit.
    const timer = window.setTimeout(() => {
      if (signature === latestCanvasSignatureRef.current) return;
      undoHistoryRef.current = [...undoHistoryRef.current.slice(-49), latestCanvasSnapshotRef.current!];
      redoHistoryRef.current = [];
      latestCanvasSnapshotRef.current = snapshot;
      latestCanvasSignatureRef.current = signature;
    }, 300);
    return () => window.clearTimeout(timer);
  }, [createCanvasSnapshot]);

  // Keep copying inside the canvas so users can duplicate a marquee-selected
  // group without writing diagram data to the operating system clipboard.
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const element = target instanceof HTMLElement ? target : null;
      return Boolean(element?.closest("input, textarea, [contenteditable='true']"));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (animationMode === "presentation" || isEditableTarget(event.target)) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;

      const key = event.key.toLowerCase();
      const wantsRedo = (key === "z" && event.shiftKey) || key === "y";
      if (key === "z" || wantsRedo) {
        const history = wantsRedo ? redoHistoryRef.current : undoHistoryRef.current;
        const target = history.pop();
        const current = latestCanvasSnapshotRef.current;
        if (!target || !current) return;
        if (wantsRedo) undoHistoryRef.current.push(current);
        else redoHistoryRef.current.push(current);
        latestCanvasSnapshotRef.current = target;
        latestCanvasSignatureRef.current = JSON.stringify(target);
        setNodes(target.nodes);
        setEdges(target.edges);
        setSelectedId(null);
        setSelectedEdgeId(null);
        event.preventDefault();
        return;
      }

      if (key === "c") {
        const marqueeSelectedNodes = nodes.filter((node) => node.selected);
        const clickedNode = selectedId ? nodes.find((node) => node.id === selectedId) : null;
        const selectedNodes = marqueeSelectedNodes.length
          ? marqueeSelectedNodes
          : clickedNode ? [clickedNode] : [];
        if (!selectedNodes.length) return;
        const selectedIds = new Set(selectedNodes.map((node) => node.id));
        selectionClipboardRef.current = {
          nodes: selectedNodes.map((node) => {
            const { onLabelChange, onEditingChange, onTextStyleChange, onTextEditingChange, ...data } = node.data;
            return { ...node, data: { ...data }, selected: false };
          }),
          edges: edges.filter((edgeItem) => selectedIds.has(edgeItem.source) && selectedIds.has(edgeItem.target))
            .map((edgeItem) => ({ ...edgeItem, selected: false })),
        };
        event.preventDefault();
        return;
      }

      if (key !== "v" || !selectionClipboardRef.current) return;
      const copied = selectionClipboardRef.current;
      const idMap = new Map(copied.nodes.map((node) => [node.id, `${node.id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`]));
      const pastedNodes = copied.nodes.map((node) => ({
        ...node,
        id: idMap.get(node.id)!,
        position: { x: node.position.x + 48, y: node.position.y + 48 },
        selected: true,
        data: {
          ...node.data,
          legendNodeIds: node.data.legendNodeIds?.map((id) => idMap.get(id) ?? id),
        },
      }));
      const pastedEdges = copied.edges.map((edgeItem) => ({
        ...edgeItem,
        id: `${edgeItem.id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        source: idMap.get(edgeItem.source)!,
        target: idMap.get(edgeItem.target)!,
        selected: true,
      }));
      setNodes((current) => synchronizeLegendKey([...current.map((node) => ({ ...node, selected: false })), ...pastedNodes]));
      setEdges((current) => [...current.map((edgeItem) => ({ ...edgeItem, selected: false })), ...pastedEdges]);
      setSelectedId(pastedNodes[0]?.id ?? null);
      setSelectedEdgeId(null);
      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [animationMode, edges, nodes, selectedId, setEdges, setNodes]);

  useEffect(() => {
    setWorkflowTitle(window.localStorage.getItem(ACTIVE_WORKFLOW_NAME_KEY) || "Workflow");
  }, []);

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
    const wsId = workspaceId.current;
    const restore = (pages: DiagramPage[], trashed: DiagramPage[], activeId: string) => {
      setPages(pages);
      setTrashedPages(trashed);
      setActivePageId(activeId);
    };
    try {
      const savedIndex = window.localStorage.getItem(pageIndexKey(wsId));
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
      const storedComments = window.localStorage.getItem(commentsStorageKey(wsId, restoredActive));
      const restoredComments = storedComments ? (JSON.parse(storedComments) as DiagramComment[]) : [];
      setComments(restoredComments);
      const pageData =
        window.localStorage.getItem(pageStorageKey(wsId, restoredActive)) ??
        (restoredActive === "main" && wsId === "collie"
          ? window.localStorage.getItem(LEGACY_STORAGE_KEY)
          : null);

      restore(restoredPages, parsedIndex?.trashedPages ?? [], restoredActive);
      const storedHistory = window.localStorage.getItem(historyStorageKey(wsId, restoredActive));
      const restoredHistory = storedHistory
        ? (JSON.parse(storedHistory) as DiagramHistoryEntry[])
        : [];
      setHistoryEntries(restoredHistory);
      lastHistorySignatureRef.current = restoredHistory[0]
        ? diagramSignature(restoredHistory[0].nodes, restoredHistory[0].edges)
        : "";
      const storedAnimation = window.localStorage.getItem(animationStorageKey(wsId, restoredActive));
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
        setNodes(synchronizeLegendKey([...(parsed.nodes ?? []), ...commentMarkers(restoredComments)]));
        setEdges(parsed.edges ?? []);
      } else if (wsId !== "collie" || restoredActive !== "main") {
        // A workspace other than the original collie one starts (and stays)
        // empty until the user adds content.  Only the default collie "main"
        // page falls back to the bundled demo diagram when nothing is saved.
        setNodes([]);
        setEdges([]);
      }
      // Always reconcile with the cloud snapshot for this workspace.  This
      // repairs stale local data (such as a page name leaked from another
      // workspace before storage was namespaced) and keeps every workspace
      // consistent with its own cloud copy.
      void fetch(workspaceApiUrl())
        .then((response) => response.json())
        .then((body) => {
          const cloud = body.data as {
            pages?: DiagramPage[];
            trashedPages?: DiagramPage[];
            activePageId?: string;
            diagrams?: Record<string, { nodes?: ArchitectureNode[]; edges?: Edge[] }>;
          } | null;
          if (!cloud?.pages?.length) {
            // No cloud snapshot for this workspace yet.
            if (pageData || savedIndex) {
              // It already has local data (e.g. before its first cloud sync),
              // so keep it instead of resetting to a blank page.
              return;
            }
            if (wsId === "collie") {
              // Brand-new default workspace: keep the bundled starter diagram.
              return;
            }
            restore(defaultPages, [], defaultPages[0].id);
            setNodes([]);
            setEdges([]);
            return;
          }
          const cloudActive = cloud.pages.find((page) => page.id === cloud.activePageId)?.id ?? cloud.pages[0].id;
          const cloudDiagram = cloud.diagrams?.[cloudActive];
          if (!cloudDiagram) return;
          setLocalStorageItem(pageIndexKey(wsId), JSON.stringify({ pages: cloud.pages, trashedPages: cloud.trashedPages ?? [], activePageId: cloudActive }));
          Object.entries(cloud.diagrams ?? {}).forEach(([pageId, diagram]) => {
            setLocalStorageItem(pageStorageKey(wsId, pageId), JSON.stringify(diagram));
          });
          restore(cloud.pages, cloud.trashedPages ?? [], cloudActive);
          setNodes(synchronizeLegendKey([...(cloudDiagram.nodes ?? []), ...commentMarkers(restoredComments)]));
          setEdges(cloudDiagram.edges ?? []);
        })
        .catch(() => undefined)
        .finally(() => {
          cloudHydratedRef.current = true;
        });
    } catch {
      window.localStorage.removeItem(pageIndexKey(wsId));
      cloudHydratedRef.current = true;
    }
    window.setTimeout(() => {
      historyReadyRef.current = true;
    }, 0);
  }, [setEdges, setNodes]);

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null;
  const selectedComponentCategory = selectedNode ? componentCategoryFor(selectedNode.data) : null;
  const selectedTextTarget = selectedNode?.data.editingTextTarget;
  const selectedTextStyle = selectedTextTarget === "description"
    ? (selectedNode?.data.descriptionTextStyle ?? {})
    : selectedTextTarget === "header"
      ? (selectedNode?.data.headerTextStyle ?? {})
      : (selectedNode?.data.titleTextStyle ?? {});
  const activeCommentThread = commentThread
    ? comments.find((comment) => comment.id === commentThread.id) ?? null
    : null;
  const commentComposerScreen = commentComposer ? flowToScreenPosition(commentComposer.position) : null;
  const commentThreadScreen = commentThread ? flowToScreenPosition(commentThread.position) : null;
  const commentPopupPosition = (screen: { x: number; y: number } | null, _width: number, height: number) => {
    if (!screen) return null;
    const gap = 16;
    return {
      left: screen.x + gap,
      top: Math.max(8, Math.min(screen.y - 18, window.innerHeight - height)),
    };
  };
  const commentThreadPopupPosition = commentPopupPosition(commentThreadScreen, 420, 450);
  const commentComposerPopupPosition = commentPopupPosition(commentComposerScreen, 340, 230);
  const updateOpenCommentPopupPositions = () => {
    if (commentThread && commentThreadPopupRef.current) {
      const position = commentPopupPosition(flowToScreenPosition(commentThread.position), 420, 450);
      if (position) Object.assign(commentThreadPopupRef.current.style, position);
    }
    if (commentComposer && commentComposerPopupRef.current) {
      const position = commentPopupPosition(flowToScreenPosition(commentComposer.position), 340, 230);
      if (position) Object.assign(commentComposerPopupRef.current.style, position);
    }
  };
  const scheduleOpenCommentPopupPositionUpdate = () => {
    if ((!commentThread && !commentComposer) || commentPopupFrameRef.current !== null) return;
    commentPopupFrameRef.current = requestAnimationFrame(() => {
      commentPopupFrameRef.current = null;
      updateOpenCommentPopupPositions();
    });
  };
  const selectedLegend = selectedNode?.data.shape === "legend" ? selectedNode : null;
  const selectedLegendKey = selectedNode?.data.shape === "legend-key" ? selectedNode : null;
  const selectedEdge = edges.find((edgeItem) => edgeItem.id === selectedEdgeId) ?? null;
  const selectedEdgeSourceNode = selectedEdge ? nodes.find((node) => node.id === selectedEdge.source) : null;
  const selectedEdgeTargetNode = selectedEdge ? nodes.find((node) => node.id === selectedEdge.target) : null;
  const selectedEdgeIsErd = selectedEdgeSourceNode?.data.shape === "database" && selectedEdgeTargetNode?.data.shape === "database";
  const selectedEdgeLineStyle: ConnectorLineStyle =
    ((selectedEdge?.data as { lineStyle?: ConnectorLineStyle } | undefined)?.lineStyle) ??
    (selectedEdge?.animated ? "dashed" : "solid");
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
    (node) => node.data.shape !== "legend" && node.data.shape !== "legend-key" && node.data.shape !== "comment",
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

  const updateSelectedTextStyle = (patch: Partial<ComponentTextStyle>) => {
    if (!selectedTextTarget) return;
    updateSelected(selectedTextTarget === "title"
      ? { titleTextStyle: { ...selectedTextStyle, ...patch } }
      : selectedTextTarget === "header"
        ? { headerTextStyle: { ...selectedTextStyle, ...patch } }
        : { descriptionTextStyle: { ...selectedTextStyle, ...patch } });
  };

  const updateTextSize = (key: "titleSize" | "descriptionSize" | "headerSize", value: number, applyToAll: boolean) => {
    if (!selectedId) return;
    const affectedNodeIds: string[] = [];
    setNodes((current) =>
      current.map((node) => {
        const isComponent = node.data.shape !== "legend" && node.data.shape !== "legend-key";
        if (!isComponent || (!applyToAll && node.id !== selectedId)) return node;
        affectedNodeIds.push(node.id);
        const nextData = { ...node.data, [key]: value };
        if (!node.data.autoGrowWithText) return { ...node, data: nextData };
        const base = defaultShapeSize(node.data.shape);
        const textScale = Math.max(
          1,
          (nextData.titleSize ?? 13) / 13,
          (nextData.descriptionSize ?? 10) / 10,
          (nextData.headerSize ?? 11) / 11,
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

  const updateAutoGrowWithText = (enabled: boolean) => {
    if (!selectedId) return;
    setNodes((current) => current.map((node) => {
      if (node.id !== selectedId) return node;
      const nextData = { ...node.data, autoGrowWithText: enabled };
      if (!enabled) return { ...node, data: nextData };
      const base = defaultShapeSize(node.data.shape);
      const textScale = Math.max(1, (nextData.titleSize ?? 13) / 13, (nextData.descriptionSize ?? 10) / 10, (nextData.headerSize ?? 11) / 11);
      const shapeScale = 1 + (textScale - 1) * 0.55;
      const width = Math.ceil(base.width * shapeScale);
      const height = Math.ceil(base.height * shapeScale);
      return { ...node, data: nextData, width, height, style: { ...node.style, width, height } };
    }));
    window.setTimeout(() => updateNodeInternals(selectedId), 0);
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      const isErdRelationship = nodes.find((node) => node.id === connection.source)?.data.shape === "database"
        && nodes.find((node) => node.id === connection.target)?.data.shape === "database";
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            // Use the responsive connector path for user-created links. It
            // stays directly straight for nearby ports and only routes when
            // there is enough distance to need a corner.
            type: "flowing",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
            style: { stroke: "#64748b", strokeWidth: 1.7 },
            labelStyle: { fill: "#334155", fontWeight: 700, fontSize: 12 },
            labelBgStyle: { fill: "#ffffff", fillOpacity: 1, stroke: "#ffffff", strokeWidth: 4 },
            labelBgPadding: [6, 4],
            labelBgBorderRadius: 5,
            data: isErdRelationship
              ? { sourceCardinality: "one" satisfies ErdCardinality, targetCardinality: "many" satisfies ErdCardinality }
              : undefined,
          },
          current,
        ),
      );
    },
    [nodes, setEdges],
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.sourceHandle) return true;
      return !edges.some(
        (edgeItem) =>
          (edgeItem.source === connection.source && edgeItem.sourceHandle === connection.sourceHandle)
          || (edgeItem.target === connection.source && edgeItem.targetHandle === connection.sourceHandle)
          || (Boolean(connection.target && connection.targetHandle)
            && ((edgeItem.source === connection.target && edgeItem.sourceHandle === connection.targetHandle)
              || (edgeItem.target === connection.target && edgeItem.targetHandle === connection.targetHandle))),
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

  const updateEdgeJoints = useCallback(
    (edgeId: string, joints: EdgeBend[]) => {
      const validJoints = joints
        .filter((joint) => Number.isFinite(joint.x) && Number.isFinite(joint.y))
        .slice(0, 1);
      setEdges((current) =>
        current.map((edgeItem) =>
          edgeItem.id === edgeId
            ? { ...edgeItem, data: { ...edgeItem.data, joints: validJoints } }
            : edgeItem,
        ),
      );
    },
    [setEdges],
  );

  const updateEdgeLabelPosition = useCallback(
    (edgeId: string, position?: EdgeBend) => {
      setEdges((current) =>
        current.map((edgeItem) => {
          if (edgeItem.id !== edgeId) return edgeItem;
          if (position) return { ...edgeItem, data: { ...edgeItem.data, labelPosition: position } };
          const { labelPosition: _labelPosition, ...remainingData } = edgeItem.data ?? {};
          return { ...edgeItem, data: remainingData };
        }),
      );
    },
    [setEdges],
  );

  const resetSelectedEdgeBend = () => {
    if (!selectedEdgeId) return;
    setEdges((current) =>
      current.map((edgeItem) => {
        if (edgeItem.id !== selectedEdgeId) return edgeItem;
        const { bend: _bend, joints: _joints, ...data } = edgeItem.data ?? {};
        return { ...edgeItem, data };
      }),
    );
  };

  const setEdgeStyle = (lineStyle: ConnectorLineStyle) => {
    if (!selectedEdge) return;
    updateSelectedEdge({
      animated: lineStyle === "dashed",
      data: { ...selectedEdge.data, lineStyle },
      style: {
        ...selectedEdge.style,
        strokeDasharray: lineStyle === "dashed" ? "7 6" : undefined,
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
    setLocalStorageItem(
      pageIndexKey(workspaceId.current),
      JSON.stringify({
        pages: nextPages,
        trashedPages: nextTrashedPages,
        activePageId: nextActivePageId,
      }),
    );
  };

  const persistCurrentPage = () => {
    const cleanNodes = nodes.filter((n) => n.data.shape !== "comment").map((n) => {
      const { _animState, ...cleanData } = n.data;
      return { ...n, data: cleanData };
    });
    const wsId = workspaceId.current;
    setLocalStorageItem(pageStorageKey(wsId, activePageId), JSON.stringify({ nodes: cleanNodes, edges }));
    if (activePageId === "main" && wsId === "collie") {
      setLocalStorageItem(LEGACY_STORAGE_KEY, JSON.stringify({ nodes: cleanNodes, edges }));
    }
  };

  const syncWorkspaceToCloud = (nextPages: DiagramPage[], nextTrashedPages: DiagramPage[], nextActivePageId: string) => {
    const wsId = workspaceId.current;
    const allPages = [...nextPages, ...nextTrashedPages];
    const diagrams = Object.fromEntries(
      allPages.map((page) => {
        const stored = window.localStorage.getItem(pageStorageKey(wsId, page.id));
        return [page.id, stored ? JSON.parse(stored) : { nodes: [], edges: [] }];
      }),
    );
    let workspace = { name: "Collie", favorite: false };
    try {
      if (wsId !== "collie") {
        const extras = JSON.parse(window.localStorage.getItem(EXTRA_WORKSPACES_KEY) ?? "[]") as { id?: string; name?: string; favorite?: boolean }[];
        const match = extras.find((item) => item.id === wsId);
        if (match?.name) workspace = { name: match.name, favorite: Boolean(match.favorite) };
      } else {
        workspace = JSON.parse(window.localStorage.getItem(WORKSPACE_META_KEY) ?? JSON.stringify(workspace));
      }
    } catch { /* defaults are safe */ }
    void fetch(workspaceApiUrl(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace, pages: nextPages, trashedPages: nextTrashedPages, activePageId: nextActivePageId, diagrams }),
    }).catch(() => undefined);
  };

  const persistAnimationData = () => {
    setLocalStorageItem(
      animationStorageKey(workspaceId.current, activePageId),
      JSON.stringify({ sequences: animationSequences, activeSequenceId, branchChoices: animationBranchChoices }),
    );
  };

  const loadHistory = (pageId: string) => {
    try {
      const stored = window.localStorage.getItem(historyStorageKey(workspaceId.current, pageId));
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
    const wsId = workspaceId.current;
    const storedComments = window.localStorage.getItem(commentsStorageKey(wsId, pageId));
    const nextComments = storedComments ? (JSON.parse(storedComments) as DiagramComment[]) : [];
    setComments(nextComments);
    const stored =
      window.localStorage.getItem(pageStorageKey(wsId, pageId)) ??
      (pageId === "main" && wsId === "collie" ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null);
    const emptyForNonCollie = () => wsId !== "collie" && pageId === "main";
    if (!stored) {
      if (emptyForNonCollie()) {
        setNodes(commentMarkers(nextComments));
        setEdges([]);
      } else {
        setNodes([...(pageId === "main" ? initialNodes : pageId === "user-flow" ? userFlowNodes : []), ...commentMarkers(nextComments)]);
        setEdges(pageId === "main" ? initialEdges : pageId === "user-flow" ? userFlowEdges : []);
      }
      return;
    }
    try {
      const parsed = JSON.parse(stored) as { nodes?: ArchitectureNode[]; edges?: Edge[] };
      setNodes(synchronizeLegendKey([...(parsed.nodes ?? []), ...commentMarkers(nextComments)]));
      setEdges(parsed.edges ?? []);
    } catch {
      if (emptyForNonCollie()) {
        setNodes(commentMarkers(nextComments));
        setEdges([]);
      } else {
        setNodes([...(pageId === "main" ? initialNodes : pageId === "user-flow" ? userFlowNodes : []), ...commentMarkers(nextComments)]);
        setEdges(pageId === "main" ? initialEdges : pageId === "user-flow" ? userFlowEdges : []);
      }
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
    setLocalStorageItem(pageStorageKey(workspaceId.current, page.id), JSON.stringify({ nodes: [], edges: [] }));
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
      setLocalStorageItem(
        pageStorageKey(workspaceId.current, replacement.id),
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
    window.localStorage.removeItem(pageStorageKey(workspaceId.current, page.id));
    window.localStorage.removeItem(historyStorageKey(workspaceId.current, page.id));
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
    customFlowStartNodeRef.current = null;
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

    const steps: AnimationStep[] = [];
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
        delayAfter: 0,
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
    setAnimationPlaying(true);
    const edgeIds = step.elementIds.filter((id) => edges.some((e) => e.id === id));
    // The pulse reaches the destination before it circles that component.
    // This makes each connection feel like one route instead of independently
    // reloading at every line.
    const destinationNodeIds = Array.from(new Set([
      ...step.elementIds.filter((id) => nodes.some((node) => node.id === id)),
      ...edges.filter((edge) => edgeIds.includes(edge.id)).map((edge) => edge.target),
    ]));
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

    const advance = () => {
      const nextStep = activeSequence.steps[stepIndex + 1];
      const nextStepHasConnector = nextStep?.elementIds.some((id) => edges.some((edge) => edge.id === id));
      const delay = edgeIds.length > 0 && nextStepHasConnector
        ? 0
        : (step.delayAfter || 0) / speed;
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
    };

    const circleDestination = () => {
      if (!destinationNodeIds.length) {
        setAnimActiveIds(new Set());
        advance();
        return;
      }
      setAnimActiveIds(new Set(destinationNodeIds));
      const circleDuration = Math.min(450, Math.max(260, effectiveDuration * 0.32));
      animationTimerRef.current = setTimeout(() => {
        setAnimCompletedIds((prev) => {
          const next = new Set(prev);
          destinationNodeIds.forEach((id) => next.add(id));
          return next;
        });
        setAnimActiveIds(new Set());
        advance();
      }, circleDuration);
    };

    const finishConnector = () => {
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
                  type: "flowing",
                  data: { ...e.data, _flowDuration: undefined },
                  animated: false,
                  style: { ...e.style, stroke: "#94a3b8", strokeWidth: 1.7, strokeDasharray: undefined },
                }
              : e,
          ),
        );
      }
      circleDestination();
    };

    animationTimerRef.current = setTimeout(finishConnector, edgeIds.length ? effectiveDuration : 0);
  }, [activeSequence, edges, nodes, setEdges, clearAnimationEffects]);

  const startPlayback = useCallback(() => {
    if (!activeSequence || activeSequence.steps.length === 0) return;
    setAnimationMode("presentation");
    setCurrentStepIndex(-1);
    setAnimActiveIds(new Set());
    setAnimCompletedIds(new Set());
    setAnimationPlaying(true);
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
    // Restart the current route segment so a paused SVG/CSS animation cannot
    // resume out of sync with its destination-circling effect.
    playStep(currentStepIndex);
  }, [animationPaused, currentStepIndex, playStep]);

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
        type: "flowing",
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

  const startDrawPresentation = async () => {
    if (animationMode === "presentation") stopPlayback();
    setSelectedId(null);
    setSelectedEdgeId(null);
    setInspectorOpen(false);
    setPagesOpen(false);
    setHistoryOpen(false);
    setCreatorOpen(false);
    setLegendCreatorOpen(false);
    setTextOpen(false);
    setAnimationOpen(false);
    setDrawToolboxOpen(false);
    setPresentationInteraction("draw");
    setCommentPlacementMode(false);
    setDrawPresentationOpen(true);
    try {
      await architectureShellRef.current?.requestFullscreen?.();
    } catch {
      // The CSS presentation layout still provides a focused canvas when the
      // browser or embedding host does not grant the fullscreen request.
    }
    window.setTimeout(() => fitView({ padding: .08, duration: 350 }), 80);
  };

  const finishDrawPresentation = async (keepAnnotations: boolean) => {
    if (!keepAnnotations) setAnnotationStrokes([]);
    activeAnnotationStrokeRef.current = null;
    setStopPresentationConfirm(false);
    setDrawToolboxOpen(false);
    setCommentPlacementMode(false);
    setDrawPresentationOpen(false);
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* The browser may already be exiting fullscreen. */ }
    }
    window.setTimeout(() => fitView({ padding: .08, duration: 300 }), 80);
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      if (drawPresentationOpen && !document.fullscreenElement && !stopPresentationConfirm) {
        setDrawPresentationOpen(false);
        setDrawToolboxOpen(false);
        setCommentPlacementMode(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [drawPresentationOpen, stopPresentationConfirm]);

  const annotationPoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / Math.max(1, rect.width) * 1000,
      y: (event.clientY - rect.top) / Math.max(1, rect.height) * 1000,
    };
  };

  const eraseAnnotationAt = (point: { x: number; y: number }) => {
    const threshold = Math.max(8, eraserThickness * 1.8);
    setAnnotationStrokes((current) => current.filter((stroke) => {
      for (let index = 1; index < stroke.points.length; index += 1) {
        const a = stroke.points[index - 1];
        const b = stroke.points[index];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy;
        const amount = lengthSquared ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared)) : 0;
        if (Math.hypot(point.x - (a.x + dx * amount), point.y - (a.y + dy * amount)) <= threshold) return false;
      }
      return true;
    }));
  };

  const startAnnotationStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawPresentationOpen || presentationInteraction !== "draw") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = annotationPoint(event);
    if (annotationTool === "eraser") {
      eraseAnnotationAt(point);
      activeAnnotationStrokeRef.current = "eraser";
      return;
    }
    const id = `annotation-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const config = annotationConfig[annotationTool];
    activeAnnotationStrokeRef.current = id;
    setAnnotationStrokes((current) => [...current, {
      id,
      tool: annotationTool,
      points: [point],
      color: config.color,
      thickness: config.thickness,
      opacity: config.opacity,
    }]);
  };

  const continueAnnotationStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    const activeId = activeAnnotationStrokeRef.current;
    if (!activeId) return;
    const point = annotationPoint(event);
    if (activeId === "eraser") {
      eraseAnnotationAt(point);
      return;
    }
    setAnnotationStrokes((current) => current.map((stroke) =>
      stroke.id === activeId ? { ...stroke, points: [...stroke.points, point] } : stroke,
    ));
  };

  const stopAnnotationStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    activeAnnotationStrokeRef.current = null;
  };

  const tryAddElementToSequence = useCallback((elementId: string) => {
    if (!activeSequence || animationMode !== "editing") return;
    const lastStep = activeSequence.steps[activeSequence.steps.length - 1];
    if (lastStep && lastStep.elementIds.length < 2 && !lastStep.elementIds.includes(elementId)) {
      updateStep(lastStep.id, { elementIds: [...lastStep.elementIds, elementId] });
    } else {
      addStep([elementId]);
    }
  }, [activeSequence, animationMode]);

  const addCustomFlowNode = useCallback((nodeId: string) => {
    if (!activeSequence || animationMode !== "editing") return;
    const previousNodeId = customFlowStartNodeRef.current;
    if (!previousNodeId) {
      customFlowStartNodeRef.current = nodeId;
      setSelectedId(nodeId);
      setSelectedEdgeId(null);
      return;
    }

    const connector = edges.find(
      (edge) => edge.source === previousNodeId && edge.target === nodeId,
    );
    customFlowStartNodeRef.current = nodeId;
    if (connector) addStep([connector.id]);
  }, [activeSequence, animationMode, edges]);

  const saveDiagram = () => {
    persistCurrentPage();
    persistPageIndex(pages, activePageId, trashedPages);
    if (cloudHydratedRef.current) {
      syncWorkspaceToCloud(pages, trashedPages, activePageId);
    }
    persistAnimationData();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  };

  useEffect(() => {
    if (!historyReadyRef.current) return;
    // Selection, panning and viewport changes are not diagram edits.  Do not
    // flash the save state or write a version unless the actual diagram differs.
    const signature = diagramSignature(nodes, edges);
    if (signature === lastHistorySignatureRef.current) return;

    setAutoSaveState("saving");
    const autoSaveTimer = window.setTimeout(() => {
      const cleanDiagram = JSON.parse(signature) as {
        nodes: ArchitectureNode[];
        edges: Edge[];
      };
      setLocalStorageItem(
        pageStorageKey(workspaceId.current, activePageId),
        JSON.stringify(cleanDiagram),
      );
      if (activePageId === "main" && workspaceId.current === "collie") {
        setLocalStorageItem(LEGACY_STORAGE_KEY, JSON.stringify(cleanDiagram));
      }
      setLocalStorageItem(
        pageIndexKey(workspaceId.current),
        JSON.stringify({ pages, trashedPages, activePageId }),
      );
      if (cloudHydratedRef.current) {
        syncWorkspaceToCloud(pages, trashedPages, activePageId);
      }

      if (signature !== lastHistorySignatureRef.current) {
        const entry: DiagramHistoryEntry = {
          id: `history-${Date.now()}`,
          timestamp: new Date().toISOString(),
          summary: describeDiagramChange(historyEntries[0], cleanDiagram.nodes, cleanDiagram.edges),
          nodes: cleanDiagram.nodes,
          edges: cleanDiagram.edges,
        };
        const nextHistory = retainHistory([entry, ...historyEntries]);
        setHistoryEntries(nextHistory);
        setLocalStorageItem(historyStorageKey(workspaceId.current, activePageId), JSON.stringify(nextHistory));
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
    const nextHistory = retainHistory([restoredEntry, recoveryEntry, ...historyEntries]);
    historyReadyRef.current = false;
    setNodes(synchronizeLegendKey(entry.nodes));
    setEdges(entry.edges);
    setHistoryEntries(nextHistory);
    lastHistorySignatureRef.current = diagramSignature(entry.nodes, entry.edges);
    setLocalStorageItem(
      pageStorageKey(workspaceId.current, activePageId),
      JSON.stringify({ nodes: entry.nodes, edges: entry.edges }),
    );
    setLocalStorageItem(historyStorageKey(workspaceId.current, activePageId), JSON.stringify(nextHistory));
    if (activePageId === "main") {
      setLocalStorageItem(
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
    viewport.classList.add("png-export-snapshot");

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
        // Keep the cloned canvas at its original logical size. Resolution is
        // added by pixelRatio; scaling its CSS box caused narrow cards to clip
        // the last characters of titles on larger pages.
        pixelRatio: renderScale,
        width: cropWidth,
        height: cropHeight,
        style: {
          width: `${cropWidth}px`,
          height: `${cropHeight}px`,
          transformOrigin: "top left",
          transform: `translate(${padding - bounds.x}px, ${padding - bounds.y}px)`,
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
      viewport.classList.remove("png-export-snapshot");
      setExporting(false);
      window.setTimeout(() => setExportNotice(null), 5200);
    }
  };

  const setDocsViewportStyles = (viewport: HTMLElement, mode: DocsExportMode) => {
    // The simplified document export has no typography mode. Keep the live
    // canvas typography and connector labels untouched; only visibility
    // classes are applied when the user explicitly hides text.
    viewport.classList.add("docs-export-snapshot");
    viewport.style.setProperty("--edge-label-cutout", mode === "readable" ? "#ffffff" : "#f6f8fb");
    if (!docsShowTitles) viewport.classList.add("docs-hide-titles");
    if (!docsShowDescriptions) viewport.classList.add("docs-hide-descriptions");
  };

  const prepareExportEdgeLabelStyles = (viewport: HTMLElement, scale: number) => {
    viewport.querySelectorAll<SVGTextElement>(".react-flow__edge-text").forEach((label) => {
      // React Flow owns this inline size. Preserve it before pinning the
      // export value; removing it afterwards makes labels fall back to the
      // browser's smaller SVG default until React happens to rerender them.
      if (!("exportOriginalFontSize" in label.dataset)) {
        label.dataset.exportOriginalFontSize = label.style.fontSize;
      }
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
      "docs-export-snapshot",
      "docs-hide-titles",
      "docs-hide-descriptions",
    );
    viewport.style.removeProperty("--docs-title-scale");
    viewport.style.removeProperty("--docs-description-scale");
    viewport.style.removeProperty("--edge-label-cutout");
    viewport.querySelectorAll<SVGTextElement>(".react-flow__edge-text").forEach((label) => {
      if ("exportOriginalFontSize" in label.dataset) {
        label.style.fontSize = label.dataset.exportOriginalFontSize ?? "";
        delete label.dataset.exportOriginalFontSize;
      }
      delete label.dataset.exportBaseFontSize;
    });
  };

  const prepareExportSafeSvgPaint = (viewport: HTMLElement) => {
    // html-to-image renders the cloned DOM inside a new SVG document. Some
    // browsers lose the React Flow stylesheet's `fill: none` during that
    // conversion and implicitly close open polylines with a black fill. Pin
    // connector paint inline so preview and downloaded PNGs stay line-only.
    viewport.querySelectorAll<SVGPathElement>(
      ".edge-visible-path, .edge-label-measure-path, .connector-water-pulse, .react-flow__edge-interaction",
    ).forEach((path) => {
      path.setAttribute("fill", "none");
      path.style.setProperty("fill", "none", "important");
      path.style.setProperty("stroke-linecap", "round");
      path.style.setProperty("stroke-linejoin", "round");
    });
    viewport.querySelectorAll<SVGPathElement>(".edge-visible-path").forEach((path) => {
      const computed = getComputedStyle(path);
      const stroke = computed.stroke && computed.stroke !== "none" ? computed.stroke : "#64748b";
      const strokeWidth = Number.parseFloat(computed.strokeWidth);
      path.setAttribute("stroke", stroke);
      path.setAttribute("stroke-width", String(Number.isFinite(strokeWidth) ? strokeWidth : 1.7));
      path.style.setProperty("stroke", stroke);
      path.style.setProperty("stroke-width", `${Number.isFinite(strokeWidth) ? strokeWidth : 1.7}px`);
    });
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
    const originX = bounds.x - cropPadding;
    const originY = bounds.y - cropPadding;
    if (mode === "full-design") {
      const page = {
        width: Math.max(1, Math.round(cropWidth * outputScale)),
        height: Math.max(1, Math.round(cropHeight * outputScale)),
        name: "original-layout",
      };
      const renderScale = outputScale * manualZoom;
      const contentWidth = cropWidth * renderScale;
      const contentHeight = cropHeight * renderScale;
      return {
        page,
        renderScale,
        translateX: (page.width - contentWidth) / 2 - originX * renderScale,
        translateY: (page.height - contentHeight) / 2 - originY * renderScale,
      };
    }
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

  const startDocsPreviewDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!docsPreviewReady) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    docsPreviewDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: docsPreviewPan.x,
      panY: docsPreviewPan.y,
    };
  };

  const moveDocsPreviewDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = docsPreviewDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setDocsPreviewPan({
      x: drag.panX + event.clientX - drag.startX,
      y: drag.panY + event.clientY - drag.startY,
    });
  };

  const stopDocsPreviewDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (docsPreviewDrag.current?.pointerId !== event.pointerId) return;
    docsPreviewDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const zoomDocsPreview = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!docsPreviewReady) return;
    event.preventDefault();
    changeDocsInspectZoom(event.deltaY < 0 ? 0.2 : -0.2);
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
    // Edge labels are SVG text and do not participate in the node text layout.
    // Pin their computed size before the snapshot so text visibility toggles
    // cannot make connector labels inherit a smaller export scale.
    prepareExportEdgeLabelStyles(viewport, docsEdgeLabelScale);

    try {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      prepareExportSafeSvgPaint(viewport);
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
        prepareExportEdgeLabelStyles(viewport, docsEdgeLabelScale);
        try {
          await document.fonts.ready;
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          if (cancelled || renderId !== docsPreviewRenderIdRef.current) return;

          const { page, renderScale, translateX, translateY } = getDocsLayout(
            docsExportMode,
            1,
          );
          prepareExportSafeSvgPaint(viewport);
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

  const openDocsExport = () => {
    // Each document-export session starts from the live diagram exactly as it
    // is now. Export-only changes are temporary and begin only after the user
    // changes an option in this dialog.
    setDocsExportMode("full-design");
    setDocsShowTitles(true);
    setDocsShowDescriptions(true);
    setDocsTitleScale(1);
    setDocsDescriptionScale(1);
    setDocsEdgeLabelScale(1);
    setDocsExportZoom(1);
    setDocsPreviewPan({ x: 0, y: 0 });
    // Start fitted so the preview shows the same complete arrangement as the
    // live canvas. The user can zoom in only when they choose to inspect it.
    setDocsInspectZoom(1);
    setDocsPreviewReady(false);
    setDocsPreviewRefreshTick((tick) => tick + 1);
    setDocsExportOpen(true);
  };

  const resetDiagram = () => {
    const wsId = workspaceId.current;
    const showDemo = wsId === "collie" && activePageId === "main";
    window.localStorage.removeItem(pageStorageKey(wsId, activePageId));
    if (showDemo) window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    setNodes(showDemo ? initialNodes : []);
    setEdges(showDemo ? initialEdges : []);
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
        nodeDraft.serviceLogo,
        nodeDraft.serviceSymbol,
        nodeDraft.componentCategory,
      ),
    ]);
    setSelectedId(id);
    setSelectedEdgeId(null);
    setInspectorOpen(false);
    setCreatorOpen(false);
    setNodeDraft(createNodeDraft());
    setSelectedCreatorOption(null);
    setInspectorOpen(true);
  };

  const addTextNode = (canvasPoint?: { x: number; y: number }, startEditing = false) => {
    if (!textDraft.label.trim() && !startEditing) return;
    const id = `text-${Date.now()}`;
    const placement = canvasPoint ?? screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    setNodes((current) => [
      ...current,
      {
        ...n(id, placement.x - 90, placement.y - 16, textDraft.label.trim(), "", "text", "sparkles", "slate"),
        data: {
          ...textDraft,
          label: textDraft.label.trim(),
          editing: startEditing,
          onLabelChange: (label) => setNodes((items) => items.map((node) =>
            node.id === id ? { ...node, data: { ...node.data, label } } : node,
          )),
          onEditingChange: (editing) => setNodes((items) => items.map((node) =>
            node.id === id ? { ...node, data: { ...node.data, editing } } : node,
          )),
        },
        style: { width: 200, height: 40 },
      },
    ]);
    setSelectedId(id);
    setSelectedEdgeId(null);
    setTextOpen(false);
    setTextPlacementMode(false);
    setTextDraft({ label: "Text", description: "", shape: "text", icon: "sparkles", tone: "slate" });
  };

  const startTextPlacement = () => {
    setCreatorOpen(false);
    setLegendCreatorOpen(false);
    setAnimationOpen(false);
    setTextOpen(false);
    setTextDraft((draft) => ({ ...draft, label: draft.label === "Text" ? "" : draft.label }));
    setTextPlacementMode(true);
  };

  const persistComments = (nextComments: DiagramComment[]) => {
    setLocalStorageItem(
      commentsStorageKey(workspaceId.current, activePageId),
      JSON.stringify(nextComments),
    );
  };

  const syncCommentMarkers = (nextComments: DiagramComment[]) => {
    setNodes((current) => [
      ...current.filter((node) => node.data.shape !== "comment"),
      ...commentMarkers(nextComments),
    ]);
  };

  const addComment = () => {
    if (!commentComposer || !commentDraft.trim()) return;
    const comment: DiagramComment = {
      id: `comment-${Date.now()}`,
      author: "Yestin Guarin",
      text: commentDraft.trim(),
      createdAt: new Date().toISOString(),
      position: commentComposer.position,
      replies: [],
    };
    const nextComments = [...comments, comment];
    setComments(nextComments);
    persistComments(nextComments);
    syncCommentMarkers(nextComments);
    setSelectedCommentId(comment.id);
    setCommentsOpen(true);
    setCommentComposer(null);
    setCommentDraft("");
  };

  const addCommentReply = (commentId: string) => {
    if (!replyDraft.trim()) return;
    const reply: DiagramCommentReply = {
      id: `reply-${Date.now()}`,
      author: "Yestin Guarin",
      text: replyDraft.trim(),
      createdAt: new Date().toISOString(),
    };
    const nextComments = comments.map((comment) =>
      comment.id === commentId ? { ...comment, replies: [...comment.replies, reply] } : comment,
    );
    setComments(nextComments);
    persistComments(nextComments);
    setReplyDraft("");
  };

  const updateComment = (commentId: string, update: Partial<DiagramComment>) => {
    const nextComments = comments.map((comment) =>
      comment.id === commentId ? { ...comment, ...update } : comment,
    );
    setComments(nextComments);
    persistComments(nextComments);
  };

  const deleteComment = (commentId: string) => {
    const nextComments = comments.filter((comment) => comment.id !== commentId);
    setComments(nextComments);
    persistComments(nextComments);
    syncCommentMarkers(nextComments);
    setCommentActionsOpen(false);
    setCommentThread(null);
    setSelectedCommentId((current) => current === commentId ? null : current);
  };

  const updateDraggedCommentPosition = (node: ArchitectureNode, persist = false) => {
    const commentId = node.data.commentId;
    if (node.data.shape !== "comment" || !commentId) return;

    const position = { x: node.position.x, y: node.position.y };
    setCommentThread((current) =>
      current?.id === commentId
        ? { ...current, position: { x: position.x + 34, y: position.y + 34 } }
        : current,
    );
    if (!persist) return;

    setComments((current) => {
      const next = current.map((comment) =>
        comment.id === commentId ? { ...comment, position } : comment,
      );
      persistComments(next);
      return next;
    });
  };

  const findAlignmentGuides = useCallback((draggedNode: ArchitectureNode) => {
    if (["comment", "legend", "legend-key"].includes(draggedNode.data.shape)) return [];

    const snapDistance = 6;
    const draggedSize = nodeSize(draggedNode);
    const draggedX = [
      draggedNode.position.x,
      draggedNode.position.x + draggedSize.width / 2,
      draggedNode.position.x + draggedSize.width,
    ];
    const draggedY = [
      draggedNode.position.y,
      draggedNode.position.y + draggedSize.height / 2,
      draggedNode.position.y + draggedSize.height,
    ];
    let closestX: { distance: number; position: number; node: ArchitectureNode } | null = null;
    let closestY: { distance: number; position: number; node: ArchitectureNode } | null = null;

    for (const candidate of nodes) {
      if (
        candidate.id === draggedNode.id ||
        candidate.selected ||
        ["comment", "legend", "legend-key"].includes(candidate.data.shape)
      ) continue;

      const candidateSize = nodeSize(candidate);
      const candidateX = [
        candidate.position.x,
        candidate.position.x + candidateSize.width / 2,
        candidate.position.x + candidateSize.width,
      ];
      const candidateY = [
        candidate.position.y,
        candidate.position.y + candidateSize.height / 2,
        candidate.position.y + candidateSize.height,
      ];

      for (const source of draggedX) {
        for (const target of candidateX) {
          const distance = Math.abs(source - target);
          if (distance <= snapDistance && (!closestX || distance < closestX.distance)) {
            closestX = { distance, position: target, node: candidate };
          }
        }
      }
      for (const source of draggedY) {
        for (const target of candidateY) {
          const distance = Math.abs(source - target);
          if (distance <= snapDistance && (!closestY || distance < closestY.distance)) {
            closestY = { distance, position: target, node: candidate };
          }
        }
      }
    }

    const guides: AlignmentGuide[] = [];
    if (closestX) {
      const targetSize = nodeSize(closestX.node);
      guides.push({
        axis: "x",
        position: closestX.position,
        start: Math.min(draggedNode.position.y, closestX.node.position.y) - 24,
        end: Math.max(
          draggedNode.position.y + draggedSize.height,
          closestX.node.position.y + targetSize.height,
        ) + 24,
      });
    }
    if (closestY) {
      const targetSize = nodeSize(closestY.node);
      guides.push({
        axis: "y",
        position: closestY.position,
        start: Math.min(draggedNode.position.x, closestY.node.position.x) - 24,
        end: Math.max(
          draggedNode.position.x + draggedSize.width,
          closestY.node.position.x + targetSize.width,
        ) + 24,
      });
    }
    return guides;
  }, [nodes]);

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

  // Keep untouched nodes and edges referentially stable while dragging. This
  // lets React Flow skip repainting the rest of the diagram on each pointer frame.
  const renderedNodes = useMemo(() => {
    const hasAnimationState = animActiveIds.size > 0 || animCompletedIds.size > 0;
    return nodes.map((node) => {
      if (node.data.shape === "database") {
        const columnCount = node.data.erdExpanded
          ? normalizeErdColumns(node.data.erdColumns).filter((column) => column.name.trim()).length
          : 0;
        const height = 52 + columnCount * 28;
        const state = hasAnimationState
          ? (animActiveIds.has(node.id) ? "active" : animCompletedIds.has(node.id) ? "completed" : "inactive")
          : node.data._animState;
        return {
          ...node,
          width: 270,
          height,
          style: { ...node.style, width: 270, height },
          data: {
            ...node.data,
            _animState: state,
            onErdExpandedChange: (expanded: boolean) => setNodes((items) => items.map((item) =>
              item.id === node.id ? { ...item, data: { ...item.data, erdExpanded: expanded } } : item,
            )),
          },
        };
      }
      if (node.data.shape === "text") {
        return {
          ...node,
          data: {
            ...node.data,
            onLabelChange: (label: string) => setNodes((items) => items.map((item) => item.id === node.id ? { ...item, data: { ...item.data, label } } : item)),
            onEditingChange: (editing: boolean) => setNodes((items) => items.map((item) => item.id === node.id ? { ...item, data: { ...item.data, editing } } : item)),
            onTextStyleChange: (patch: Partial<ArchitectureNodeData>) => setNodes((items) => items.map((item) => item.id === node.id ? { ...item, data: { ...item.data, ...patch } } : item)),
          },
        };
      }
      const nodeWithTextEditor = {
        ...node,
        data: {
          ...node.data,
          onTextEditingChange: (target: ComponentTextTarget) => {
            setSelectedId(node.id);
            setSelectedEdgeId(null);
            setInspectorOpen(true);
            setNodes((items) => items.map((item) => item.id === node.id
              ? { ...item, data: { ...item.data, editingTextTarget: target } }
              : item,
            ));
          },
        },
      };
      if (!hasAnimationState) return nodeWithTextEditor;
      const state = animActiveIds.has(node.id) ? "active" : animCompletedIds.has(node.id) ? "completed" : "inactive";
      return { ...nodeWithTextEditor, data: { ...nodeWithTextEditor.data, _animState: state } };
    });
  }, [animActiveIds, animCompletedIds, nodes, setNodes, setSelectedEdgeId, setSelectedId]);

  const renderedEdges = useMemo(() => edges.map((edgeItem) => {
    const isErdRelationship = nodes.find((node) => node.id === edgeItem.source)?.data.shape === "database"
      && nodes.find((node) => node.id === edgeItem.target)?.data.shape === "database";
    const edgeData = edgeItem.data as { sourceCardinality?: ErdCardinality; targetCardinality?: ErdCardinality } | undefined;
    const targetCardinality = isErdRelationship ? (edgeData?.targetCardinality ?? "many") : "default";
    return {
      ...edgeItem,
      markerEnd: isErdRelationship && targetCardinality !== "default" ? undefined : edgeItem.markerEnd,
      selected: edgeItem.selected || edgeItem.id === selectedEdgeId,
      data: {
        ...edgeItem.data,
        ...(isErdRelationship ? {
          sourceCardinality: edgeData?.sourceCardinality ?? "one",
          targetCardinality,
        } : {}),
        onJointsChange: (joints: EdgeBend[]) => updateEdgeJoints(edgeItem.id, joints),
        onLabelPositionChange: (position?: EdgeBend) => updateEdgeLabelPosition(edgeItem.id, position),
      },
    };
  }), [edges, nodes, selectedEdgeId, updateEdgeJoints, updateEdgeLabelPosition]);
  const activeAnnotationConfig = annotationTool === "eraser" ? null : annotationConfig[annotationTool];

  return (
    <main ref={architectureShellRef} className={`architecture-shell ${drawPresentationOpen ? "draw-presentation-mode" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <button className="brand-mark" onClick={onGoHome} title="Back to home" aria-label="Back to home"><Network size={19} /></button>
          <div>
            <strong>{workflowTitle}</strong>
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
          <button className="button secondary export-button" onClick={openDocsExport} disabled={exporting} title="Export a readable one-page document PNG">
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
          <span>PAGE {String(pages.findIndex((page) => page.id === activePageId) + 1).padStart(2, "0")}</span>
          <strong>{pages.find((page) => page.id === activePageId)?.name || "Untitled architecture"}</strong>
        </div>
        <div className="tool-navbar-actions">
          <button className="button secondary present-button" onClick={() => void startDrawPresentation()} title="Present fullscreen with drawing tools">
            <Play size={15} /> <span className="button-label">Present</span>
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
        <div className="canvas-mode-tools" role="toolbar" aria-label="Canvas interaction mode">
          <button
            className={canvasMode === "select" ? "is-active" : ""}
            type="button"
            onClick={() => setCanvasMode("select")}
            aria-pressed={canvasMode === "select"}
            title="Select mode — drag on the canvas to select multiple components"
          >
            <MousePointer2 size={17} />
            <span>Select mode</span>
          </button>
          <button
            className={canvasMode === "move" ? "is-active" : ""}
            type="button"
            onClick={() => setCanvasMode("move")}
            aria-pressed={canvasMode === "move"}
            title="Move mode — drag to pan the canvas"
          >
            <Hand size={17} />
            <span>Move mode</span>
          </button>
        </div>
        <ReactFlow
          nodes={renderedNodes}
          edges={renderedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={animationMode === "presentation" ? () => {} : onNodesChange}
          onNodeDrag={(_, node) => {
            updateDraggedCommentPosition(node);
            setAlignmentGuides(findAlignmentGuides(node));
          }}
          onNodeDragStop={(_, node) => {
            updateDraggedCommentPosition(node, true);
            setAlignmentGuides([]);
          }}
          onMove={scheduleOpenCommentPopupPositionUpdate}
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
          nodesDraggable={animationMode !== "presentation" && (!drawPresentationOpen ? canvasMode === "select" : presentationInteraction === "select")}
          nodesFocusable={animationMode !== "presentation" && (!drawPresentationOpen || presentationInteraction === "select")}
          elementsSelectable={animationMode !== "presentation" && (!drawPresentationOpen || presentationInteraction === "select")}
          panOnDrag={!drawPresentationOpen ? canvasMode === "move" : presentationInteraction === "move"}
          selectionOnDrag={!drawPresentationOpen ? canvasMode === "select" : presentationInteraction === "select"}
          selectionMode={SelectionMode.Partial}
          onNodeClick={(_, node) => {
            if (animationMode === "presentation") return;
            if (node.data.shape === "comment" && node.data.commentId) {
              setSelectedCommentId(node.data.commentId);
              setCommentThread({ id: node.data.commentId, position: { x: node.position.x + 34, y: node.position.y + 34 } });
              setSelectedId(null);
              setSelectedEdgeId(null);
              return;
            }
            if (animationOpen && activeSequence) {
              addCustomFlowNode(node.id);
              return;
            }
            setSelectedId(node.id);
            setSelectedEdgeId(null);
            setInspectorOpen(node.data.shape !== "text");
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
          onPaneClick={(event) => {
            if (animationMode === "presentation") return;
            if (commentPlacementMode) {
              setCommentComposer({
                position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
                screenX: event.clientX,
                screenY: event.clientY,
              });
              setCommentPlacementMode(false);
              setSelectedId(null);
              setSelectedEdgeId(null);
              return;
            }
            if (textPlacementMode) {
              addTextNode(screenToFlowPosition({ x: event.clientX, y: event.clientY }), true);
              return;
            }
            setSelectedId(null);
            setSelectedEdgeId(null);
          }}
          onNodeDoubleClick={(_, node) => {
            if (node.data.shape !== "text" || animationMode === "presentation") return;
            setNodes((items) => items.map((item) =>
              item.id === node.id ? { ...item, data: { ...item.data, editing: true } } : item,
            ));
          }}
           className={`${commentPlacementMode ? "comment-placement-active" : textPlacementMode ? "text-placement-active" : ""} ${drawPresentationOpen ? `presentation-${presentationInteraction}-mode` : canvasMode === "move" ? "canvas-move-mode" : "canvas-select-mode"}`}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.18}
          maxZoom={1.5}
          elevateNodesOnSelect={false}
          deleteKeyCode={animationMode === "presentation" ? [] : ["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#cbd5e1" />
          <ViewportPortal>
            {alignmentGuides.map((guide) => (
              <div
                aria-hidden="true"
                className={`alignment-guide alignment-guide-${guide.axis === "x" ? "vertical" : "horizontal"}`}
                key={guide.axis}
                style={guide.axis === "x"
                  ? { left: guide.position, top: guide.start, height: guide.end - guide.start }
                  : { left: guide.start, top: guide.position, width: guide.end - guide.start }}
              />
            ))}
          </ViewportPortal>
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            nodeColor={(node) => {
              const data = node.data as ArchitectureNodeData;
              if (data.shape === "legend") return data.legendColor ?? "#0ea5c6";
              if (data.shape === "legend-key") return "#334155";
              if (data.legendColor) return data.legendColor;
              const tone = data.tone;
              const toneColors: Record<NodeTone, string> = {
                cyan: "#21b6d7", violet: "#8b5cf6", amber: "#f59e0b",
                emerald: "#22a56f", slate: "#64748b", rose: "#e35d7c", black: "#111827",
              };
              return toneColors[tone];
            }}
            maskColor="rgba(241,245,249,.72)"
          />
          <Controls showInteractive={false} />
          <Panel position="bottom-center" className="legend">
            <span><i className="legend-swatch cyan" /> Application & services</span>
            <span><i className="legend-swatch violet" /> Intelligence</span>
            <span><i className="legend-swatch amber" /> Decisions</span>
            <span><i className="legend-swatch emerald" /> Outcomes</span>
          </Panel>
        </ReactFlow>
        {(drawPresentationOpen || annotationStrokes.length > 0) ? (
          <svg
            className={`presentation-annotation-layer ${drawPresentationOpen && presentationInteraction === "draw" ? "is-drawing" : ""}`}
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            onPointerDown={startAnnotationStroke}
            onPointerMove={continueAnnotationStroke}
            onPointerUp={stopAnnotationStroke}
            onPointerCancel={stopAnnotationStroke}
          >
            {annotationStrokes.map((stroke) => (
              <polyline
                key={stroke.id}
                points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.thickness}
                strokeOpacity={stroke.opacity}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                style={stroke.tool === "highlighter" ? { mixBlendMode: "multiply" } : undefined}
              />
            ))}
          </svg>
        ) : null}
        {drawPresentationOpen ? (
          <>
            <nav className="presentation-mode-toolbar" aria-label="Presentation tools">
              <button className={presentationInteraction === "draw" ? "active" : ""} onClick={() => { setCommentPlacementMode(false); setPresentationInteraction("draw"); setDrawToolboxOpen((open) => presentationInteraction === "draw" ? !open : true); }} title="Draw"><Pencil size={19} /><span>Draw</span></button>
              <button className={presentationInteraction === "comment" ? "active" : ""} onClick={() => { setPresentationInteraction("comment"); setDrawToolboxOpen(false); setCommentPlacementMode(true); }} title="Comment"><MessageCircle size={19} /><span>Comment</span></button>
              <button className={presentationInteraction === "move" ? "active" : ""} onClick={() => { setPresentationInteraction("move"); setDrawToolboxOpen(false); setCommentPlacementMode(false); }} title="Move"><Hand size={19} /><span>Move</span></button>
              <button className={presentationInteraction === "select" ? "active" : ""} onClick={() => { setPresentationInteraction("select"); setDrawToolboxOpen(false); setCommentPlacementMode(false); }} title="Select"><MousePointer2 size={19} /><span>Select</span></button>
            </nav>
            {drawToolboxOpen && presentationInteraction === "draw" ? (
              <aside className="annotation-toolbox" aria-label="Drawing tools">
                <div className="annotation-tool-list">
                  <button className={annotationTool === "pen" ? "active" : ""} onClick={() => setAnnotationTool("pen")} title="Pen"><Pencil size={19} /></button>
                  <button className={annotationTool === "highlighter" ? "active" : ""} onClick={() => setAnnotationTool("highlighter")} title="Highlighter"><Highlighter size={19} /></button>
                  <button className={annotationTool === "eraser" ? "active" : ""} onClick={() => setAnnotationTool("eraser")} title="Eraser"><Eraser size={19} /></button>
                </div>
                <div className="annotation-settings">
                  <header><strong>{annotationTool === "pen" ? "Pen" : annotationTool === "highlighter" ? "Highlighter" : "Eraser"}</strong><button onClick={() => setDrawToolboxOpen(false)} aria-label="Close drawing tools"><X size={16} /></button></header>
                  <label>
                    <span>Thickness <b>{annotationTool === "eraser" ? eraserThickness : activeAnnotationConfig?.thickness}</b></span>
                    <input type="range" min={annotationTool === "pen" ? 1 : 6} max={annotationTool === "eraser" ? 60 : 40} value={annotationTool === "eraser" ? eraserThickness : activeAnnotationConfig?.thickness} onChange={(event) => {
                      const value = Number(event.target.value);
                      if (annotationTool === "eraser") setEraserThickness(value);
                      else setAnnotationConfig((current) => ({ ...current, [annotationTool]: { ...current[annotationTool], thickness: value } }));
                    }} />
                  </label>
                  {activeAnnotationConfig ? (
                    <>
                      <label>
                        <span>Opacity <b>{Math.round(activeAnnotationConfig.opacity * 100)}%</b></span>
                        <input type="range" min="10" max="100" value={Math.round(activeAnnotationConfig.opacity * 100)} onChange={(event) => setAnnotationConfig((current) => ({ ...current, [annotationTool]: { ...current[annotationTool], opacity: Number(event.target.value) / 100 } }))} />
                      </label>
                      <fieldset><legend>{annotationTool === "highlighter" ? "Highlight color" : "Color"}</legend><div className="annotation-color-grid">{ANNOTATION_COLORS.map((color) => <button key={color} className={activeAnnotationConfig.color === color ? "active" : ""} style={{ background: color }} onClick={() => setAnnotationConfig((current) => ({ ...current, [annotationTool]: { ...current[annotationTool], color } }))} aria-label={`Use ${color}`} />)}</div></fieldset>
                      <label className="annotation-custom-color"><span>Custom color</span><input type="color" value={activeAnnotationConfig.color} onChange={(event) => setAnnotationConfig((current) => ({ ...current, [annotationTool]: { ...current[annotationTool], color: event.target.value } }))} /></label>
                    </>
                  ) : <p className="eraser-help">Drag across any annotation to erase the complete stroke.</p>}
                </div>
              </aside>
            ) : null}
            <div className="presentation-stop-controls"><button onClick={() => setStopPresentationConfirm(true)}><Square size={14} /> Stop</button></div>
          </>
        ) : null}
        {stopPresentationConfirm ? (
          <div className="annotation-stop-backdrop">
            <section className="annotation-stop-dialog" role="dialog" aria-modal="true" aria-labelledby="annotation-stop-title">
              <CircleHelp size={20} />
              <div><strong id="annotation-stop-title">Keep your presentation annotations?</strong><p>Choose Yes to keep the drawing on the canvas, or No to discard everything drawn during this presentation.</p></div>
              <footer><button onClick={() => void finishDrawPresentation(false)}>No, discard</button><button className="keep" onClick={() => void finishDrawPresentation(true)}>Yes, keep</button></footer>
            </section>
          </div>
        ) : null}
      </section>

      <aside className={`tools-panel ${(creatorOpen || legendCreatorOpen || textOpen || animationOpen) ? "is-open" : ""}`} aria-label="Diagram tools">
        <div className="tools-panel-tabs">
          <button
            className={`tools-panel-tab canvas-mode-toggle ${canvasMode === "select" ? "active" : ""}`}
            type="button"
            onClick={() => setCanvasMode((mode) => mode === "select" ? "move" : "select")}
            aria-pressed={canvasMode === "select"}
            aria-label={canvasMode === "select" ? "Select mode. Click to switch to move mode" : "Move mode. Click to switch to select mode"}
            title={canvasMode === "select" ? "Select mode: click to switch to Move mode" : "Move mode: click to switch to Select mode"}
          >
            {canvasMode === "select" ? <MousePointer2 size={18} /> : <Hand size={18} />}
            <span>{canvasMode === "select" ? "Select mode" : "Move mode"}</span>
          </button>
          <button
            className={`tools-panel-tab ${creatorOpen ? "active" : ""}`}
            onClick={() => {
              if (creatorOpen) {
                setCreatorOpen(false);
              } else {
                // Every creator session starts without a palette selection. The
                // draft has a default service shape, but that default is not a
                // user choice and must not make any repeated shape tile active.
                setNodeDraft(createNodeDraft());
                setSelectedCreatorOption(null);
                setCreatorOpen(true);
                setLegendCreatorOpen(false);
                setTextOpen(false);
                setTextPlacementMode(false);
                setAnimationOpen(false);
                if (animationMode === "presentation") stopPlayback();
              }
            }}
          >
            <Plus size={18} /> <span>Add node</span>
          </button>
          <button
            className={`tools-panel-tab ${legendCreatorOpen ? "active" : ""}`}
            onClick={() => {
              if (legendCreatorOpen) {
                setLegendCreatorOpen(false);
              } else {
                setLegendCreatorOpen(true);
                setCreatorOpen(false);
                setTextOpen(false);
                setTextPlacementMode(false);
                setAnimationOpen(false);
                if (animationMode === "presentation") stopPlayback();
              }
            }}
          >
            <LayoutDashboard size={18} /> <span>Add legend</span>
          </button>
          <button
            className={`tools-panel-tab ${textOpen || textPlacementMode ? "active" : ""}`}
            title="Place text on the canvas"
            onClick={() => {
              if (textPlacementMode) setTextPlacementMode(false);
              else startTextPlacement();
            }}
            aria-pressed={textPlacementMode}
          >
            <Type size={18} /> <span>Text</span>
          </button>
          <button
            className={`tools-panel-tab ${commentPlacementMode || commentsOpen ? "active" : ""}`}
            title="Add or view comments"
            onClick={() => {
              if (commentPlacementMode || commentsOpen) {
                setCommentPlacementMode(false);
                setCommentsOpen(false);
                setCommentComposer(null);
                setCommentThread(null);
              } else {
                setCommentPlacementMode(true);
                setCommentsOpen(true);
                setCommentComposer(null);
                setCommentThread(null);
                setCreatorOpen(false);
                setLegendCreatorOpen(false);
                setTextOpen(false);
                setTextPlacementMode(false);
                setAnimationOpen(false);
              }
            }}
          >
            <MessageCircle size={18} /> <span>Comments</span>
          </button>
          <button
            className={`tools-panel-tab ${animationOpen ? "active" : ""}`}
            onClick={() => {
              if (animationOpen) {
                setAnimationOpen(false);
                if (animationMode === "presentation") stopPlayback();
              } else {
                setAnimationOpen(true);
                setCreatorOpen(false);
                setLegendCreatorOpen(false);
                setTextOpen(false);
                setTextPlacementMode(false);
              }
            }}
          >
            <List size={18} /> <span>Flow Animation</span>
          </button>
        </div>
        {(creatorOpen || legendCreatorOpen || textOpen || animationOpen) ? (
          <div className="tools-panel-body">
            {creatorOpen && (
              <form
                className="node-creator-form"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-node-title"
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
                  <section className="service-presets creator-drawer">
                    <button className="shape-drawer-heading" type="button" onClick={() => setOpenShapeSections((current) => ({ ...current, services: !current.services }))} aria-expanded={openShapeSections.services}>
                      <span>Services</span><ChevronDown size={15} />
                    </button>
                    {openShapeSections.services ? <div className="service-preset-grid">
                      {servicePresets.map((service) => {
                        const optionId = `service:${service.label}`;
                        const previousServiceLabel = selectedCreatorOption?.startsWith("service:")
                          ? selectedCreatorOption.slice("service:".length)
                          : null;
                        return <button
                          type="button"
                          key={service.label}
                          title={service.label}
                          aria-label={`Use ${service.label} service preset`}
                          aria-pressed={selectedCreatorOption === optionId}
                          className={selectedCreatorOption === optionId ? "active" : ""}
                          onClick={() => {
                            setSelectedCreatorOption(optionId);
                            setNodeDraft((current) => ({
                              ...current,
                              label: current.label === "New Service" || current.label === previousServiceLabel ? service.label : current.label,
                              shape: "service",
                              icon: service.icon,
                              tone: service.tone,
                              serviceLogo: service.logo,
                              serviceSymbol: service.kind,
                              componentCategory: "service",
                              hideIcon: false,
                              legendColor: undefined,
                            }));
                          }}
                        >
                          {service.logo ? (
                            <img className="service-preset-logo" src={service.logo} alt="" />
                          ) : service.kind === "mobile" ? (
                            <Smartphone className="service-preset-symbol" size={20} aria-hidden="true" />
                          ) : service.kind === "user" ? (
                            <UserRound className="service-preset-symbol" size={20} aria-hidden="true" />
                          ) : service.kind === "computer" ? (
                            <Monitor className="service-preset-symbol" size={20} aria-hidden="true" />
                          ) : service.kind === "server" ? (
                            <Server className="service-preset-symbol" size={20} aria-hidden="true" />
                          ) : service.kind === "security" ? (
                            <LockKeyhole className="service-preset-symbol" size={20} aria-hidden="true" />
                          ) : service.kind === "cloud" ? (
                            <Cloud className="service-preset-symbol" size={20} aria-hidden="true" />
                          ) : service.kind === "domain" ? (
                            <Globe2 className="service-preset-symbol" size={20} aria-hidden="true" />
                          ) : service.kind === "auth" ? (
                            <UserRoundCheck className="service-preset-symbol" size={20} aria-hidden="true" />
                          ) : service.kind === "protection" ? (
                            <ShieldCheck className="service-preset-symbol" size={20} aria-hidden="true" />
                          ) : service.kind === "ai" ? (
                            <BrainCircuit className="service-preset-symbol" size={20} aria-hidden="true" />
                          ) : (
                            <Database className="service-preset-symbol" size={20} aria-hidden="true" />
                          )}
                        </button>;
                      })}
                    </div> : null}
                  </section>
                  <div className="shape-picker-fieldset">
                    <div className="shape-drawer">
                      {shapeDrawerSections.map((section) => {
                        const isOpen = openShapeSections[section.id];
                        return (
                          <section className="shape-drawer-section" key={section.id}>
                            <button
                              className="shape-drawer-heading"
                              type="button"
                              onClick={() => setOpenShapeSections((current) => ({ ...current, [section.id]: !current[section.id] }))}
                              aria-expanded={isOpen}
                            >
                              <span>{section.label}</span>
                              <ChevronDown size={15} />
                            </button>
                            {isOpen ? (
                              <div className="shape-drawer-grid">
                                {section.shapes.map((shape) => {
                                  const option = shapeOptions.find((item) => item.value === shape)!;
                                  return (
                                    <button
                                      type="button"
                                      key={shape}
                                      title={option.label}
                                      aria-label={option.label}
                                      className={`shape-drawer-option ${selectedCreatorOption === `shape:${section.id}:${shape}` ? "active" : ""}`}
                                      aria-pressed={selectedCreatorOption === `shape:${section.id}:${shape}`}
                                      onClick={() => {
                                        setSelectedCreatorOption(`shape:${section.id}:${shape}`);
                                        setNodeDraft((current) => ({
                                          ...current,
                                          label: shape === "database" && current.label === "New Service" ? "New Table" : current.label,
                                          description: shape === "database" ? "" : current.description,
                                          shape,
                                          icon: defaultIconForShape(shape),
                                          serviceLogo: undefined,
                                          serviceSymbol: undefined,
                                          componentCategory: section.id === "erd" ? "erd" : section.id === "flowchart" ? "flowchart" : "shape",
                                          hideIcon: section.id !== "flowchart",
                                        }));
                                      }}
                                    >
                                      <ShapeOutlinePreview shape={shape} className="shape-outline-preview" />
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </section>
                        );
                      })}
                    </div>
                  </div>
                  {nodeDraft.componentCategory === "flowchart" ? <section className="icon-picker-drawer creator-drawer">
                    <button className="shape-drawer-heading" type="button" onClick={() => setOpenShapeSections((current) => ({ ...current, icons: !current.icons }))} aria-expanded={openShapeSections.icons}>
                      <span>Icon</span><small>{nodeDraft.hideIcon ? "None" : iconOptions.find((option) => option.value === nodeDraft.icon)?.label}</small><ChevronDown size={15} />
                    </button>
                    {openShapeSections.icons ? <div className="option-grid icon-grid">
                      <button type="button" className={nodeDraft.hideIcon ? "active icon-none-option" : "icon-none-option"} title="No icon" aria-label="No icon" onClick={() => setNodeDraft({ ...nodeDraft, hideIcon: true })}><X size={18} /></button>
                      {iconOptions.map((option) => {
                        const Icon = iconMap[option.value];
                        return (
                          <button
                            type="button"
                            key={option.value}
                            title={option.label}
                            className={!nodeDraft.hideIcon && nodeDraft.icon === option.value ? "active" : ""}
                            onClick={() => setNodeDraft({ ...nodeDraft, icon: option.value, hideIcon: false })}
                          >
                            <Icon size={18} />
                          </button>
                        );
                      })}
                    </div> : null}
                  </section> : null}
                  <fieldset>
                    <legend>Color</legend>
                    <div className="tone-row">
                      {(["cyan", "violet", "amber", "emerald", "slate", "rose", "black"] as NodeTone[]).map(
                        (tone) => (
                          <button
                            type="button"
                            key={tone}
                            className={`tone-button ${tone} ${!nodeDraft.legendColor && nodeDraft.tone === tone ? "active" : ""}`}
                            aria-label={`${tone} color`}
                            onClick={() => setNodeDraft({ ...nodeDraft, tone, legendColor: undefined })}
                          />
                        ),
                      )}
                      <label className={`tone-custom-button ${nodeDraft.legendColor ? "active" : ""}`} title="Custom color">
                        <input type="color" value={nodeDraft.legendColor ?? "#0ea5c6"} onChange={(event) => setNodeDraft({ ...nodeDraft, legendColor: event.target.value })} />
                        <Plus size={14} />
                      </label>
                    </div>
                  </fieldset>
                </div>
                <footer className="node-creator-footer">
                  <button className="create-node-submit" type="submit" disabled={!nodeDraft.label.trim()}>
                    <Plus size={16} />
                    Add to current view
                  </button>
                </footer>
              </form>
            )}
            {legendCreatorOpen && (
              <form
                className="legend-creator-form"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-legend-title"
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
                    <div className="legend-member-filter" role="group" aria-label="Filter components by shape">
                      <span>Filter by shape</span>
                      <div className="legend-shape-filter-options">
                        <button type="button" className={legendShapeFilter === "all" ? "active" : ""} onClick={() => setLegendShapeFilter("all")}>All</button>
                        {Array.from(new Set(componentNodes.map((node) => node.data.shape))).map((shape) => (
                          <button type="button" key={shape} title={shape.replace("-", " ")} aria-label={shape.replace("-", " ")} className={legendShapeFilter === shape ? "active" : ""} onClick={() => setLegendShapeFilter(shape)}>
                            <ShapeOutlinePreview shape={shape} className="legend-shape-filter-icon" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="legend-member-list legend-member-create-list">
                      {componentNodes.filter((node) => legendShapeFilter === "all" || node.data.shape === legendShapeFilter).length ? (
                        componentNodes.filter((node) => legendShapeFilter === "all" || node.data.shape === legendShapeFilter).map((node) => {
                          const checked = legendDraft.nodeIds.includes(node.id);
                          const ShapeIcon = iconMap[node.data.icon] ?? Server;
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
                              <span className="legend-member-preview" data-shape={node.data.shape} style={{ "--preview-color": node.data.legendColor ?? (node.data.tone === "violet" ? "#8b5cf6" : node.data.tone === "amber" ? "#f59e0b" : node.data.tone === "emerald" ? "#10b981" : "#0ea5c6") } as CSSProperties}>
                                <ShapeIcon size={15} aria-hidden="true" />
                              </span>
                              <span className="legend-member-name">
                                <strong>{node.data.label}</strong>
                                <small>{node.data.shape.replace("-", " ")}</small>
                              </span>
                            </label>
                          );
                        })
                      ) : (
                        <p className="legend-empty-state">No components match this shape filter.</p>
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
            )}
            {textOpen && (
              <form
                className="creator-body"
                onSubmit={(event) => { event.preventDefault(); addTextNode(); }}
              >
                <div className="inspector-head">
                  <div><span>ANNOTATION</span><strong>Add text to canvas</strong></div>
                  <button type="button" aria-label="Close text creator" onClick={() => setTextOpen(false)}><X size={18} /></button>
                </div>
                <label>
                  <span>Text content</span>
                  <textarea
                    autoFocus
                    rows={3}
                    value={textDraft.label}
                    placeholder="Type your annotation…"
                    onChange={(event) => setTextDraft({ ...textDraft, label: event.target.value })}
                  />
                </label>
                <label>
                  <span>Font size (px)</span>
                  <input
                    type="range"
                    min="10"
                    max="48"
                    step="1"
                    value={textDraft.titleSize ?? 16}
                    onChange={(event) => setTextDraft({ ...textDraft, titleSize: Number(event.target.value) })}
                  />
                </label>
                <fieldset>
                  <legend>Text color</legend>
                  <div className="legend-color-control">
                    <div>
                      <input
                        type="color"
                        value={textDraft.legendColor ?? "#334155"}
                        onChange={(event) => setTextDraft({ ...textDraft, legendColor: event.target.value })}
                      />
                      <output>{textDraft.legendColor ?? "#334155"}</output>
                    </div>
                  </div>
                </fieldset>
                <div className="tone-row">
                  {(["cyan", "violet", "amber", "emerald", "slate", "rose"] as NodeTone[]).map(
                    (tone) => (
                      <button type="button" key={tone} className={`tone-swatch tone-${tone} ${textDraft.tone === tone ? "active" : ""}`} title={tone} onClick={() => setTextDraft({ ...textDraft, tone })} aria-label={`Color ${tone}`} />
                    )
                  )}
                </div>
                <button className="create-node-submit" type="submit" disabled={!textDraft.label.trim()}>
                  <Type size={16} /> Add text to canvas
                </button>
              </form>
            )}
            {animationOpen && (
              <>
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
              </>
            )}
          </div>
        ) : null}
      </aside>

      {activeCommentThread && commentThread && commentThreadPopupPosition ? (
        <section
          ref={commentThreadPopupRef}
          className="comment-thread-popup"
          style={commentThreadPopupPosition}
        >
          <header>
            <button type="button" aria-label="Back" onClick={() => setCommentThread(null)}>‹</button>
            <div className="comment-thread-actions">
              <button
                type="button"
                className={activeCommentThread.resolved ? "is-resolved" : ""}
                aria-label={activeCommentThread.resolved ? "Mark comment as unread" : "Mark comment as read"}
                title={activeCommentThread.resolved ? "Mark as unread" : "Mark as read"}
                onClick={() => updateComment(activeCommentThread.id, { resolved: !activeCommentThread.resolved })}
              ><Check size={16} /></button>
              <div className="comment-actions-menu">
                <button type="button" aria-label="Comment actions" aria-expanded={commentActionsOpen} onClick={() => setCommentActionsOpen((open) => !open)}>•••</button>
                {commentActionsOpen ? (
                  <div className="comment-actions-popover" role="menu">
                    <button type="button" role="menuitem" onClick={() => { updateComment(activeCommentThread.id, { resolved: false }); setCommentActionsOpen(false); }}>Mark as unread</button>
                    <button type="button" role="menuitem" className="danger" onClick={() => deleteComment(activeCommentThread.id)}>Delete comment</button>
                  </div>
                ) : null}
              </div>
              <button type="button" aria-label="Close comment" onClick={() => setCommentThread(null)}><X size={16} /></button>
            </div>
          </header>
          <div className="comment-thread-body">
            <div className="comment-item-head"><span className="comment-avatar">YG</span><strong>{activeCommentThread.author}</strong><time>{new Date(activeCommentThread.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></div>
            <p>{activeCommentThread.text}</p>
            {activeCommentThread.replies.map((reply) => (
              <div className="comment-thread-reply" key={reply.id}><span className="comment-avatar">YG</span><div><strong>{reply.author}</strong><p>{reply.text}</p></div></div>
            ))}
            <form className="comment-reply comment-thread-reply-form" onSubmit={(event) => { event.preventDefault(); addCommentReply(activeCommentThread.id); }}>
              <input value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} placeholder="Reply here" aria-label="Reply" />
              <button type="submit" disabled={!replyDraft.trim()} aria-label="Send reply"><Send size={14} /></button>
            </form>
          </div>
        </section>
      ) : commentComposer && commentComposerPopupPosition ? (
        <form
          ref={commentComposerPopupRef}
          className="comment-composer"
          style={commentComposerPopupPosition}
          onSubmit={(event) => { event.preventDefault(); addComment(); }}
        >
          <div className="comment-composer-avatar">YG</div>
          <textarea
            autoFocus
            rows={3}
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            placeholder="Add a comment. Use @ to mention"
            aria-label="Comment text"
          />
          <div className="comment-composer-actions">
            <span>@</span><span>☺</span>
            <button type="submit" disabled={!commentDraft.trim()} aria-label="Send comment"><Send size={16} /></button>
          </div>
        </form>
      ) : null}

      {commentsOpen ? (
        <aside className="comments-panel" aria-label="Comments">
          <div className="comments-panel-head">
            <strong>Comments</strong>
            <button type="button" onClick={() => setCommentsOpen(false)} aria-label="Close comments"><X size={17} /></button>
          </div>
          <div className="comments-list">
            {!comments.length ? (
              <div className="comments-empty"><MessageCircle size={24} /><strong>No comments yet</strong><span>Choose the comment tool, then click anywhere on the canvas.</span></div>
            ) : comments.map((comment) => (
              <article
                key={comment.id}
                className={`comment-item ${selectedCommentId === comment.id ? "is-selected" : ""}`}
                onClick={() => {
                  setSelectedCommentId(comment.id);
                  setCommentThread({ id: comment.id, position: { x: comment.position.x + 34, y: comment.position.y + 34 } });
                }}
              >
                <div className="comment-item-head"><span className="comment-avatar">YG</span><strong>{comment.author}</strong><time>{new Date(comment.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></div>
                <p>{comment.text}</p>
                <span className="comment-replies">{comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}</span>
              </article>
            ))}
          </div>
        </aside>
      ) : null}

      <aside className={`inspector ${inspectorOpen && (selectedNode || selectedEdge) && selectedNode?.data.shape !== "text" ? "is-open" : ""}`}>
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
          <div className="inspector-body component-inspector-body">
            <div className="editor-section-heading section-content-heading"><span>01</span><div><strong>Content</strong><small>Name and supporting text</small></div></div>
            <label className="component-title-control">
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
            <label className="component-description-control">
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
          <div className={`inspector-body ${selectedTextTarget ? "text-editing-only" : ""}`}>
            {selectedTextTarget ? <>
              <div className="editor-section-heading section-type-heading"><span>01</span><div><strong>Text</strong><small>Editing this {selectedTextTarget}</small></div></div>
              <div className="text-target-tabs" role="tablist" aria-label="Text to edit">
                <button type="button" role="tab" aria-selected={selectedTextTarget === "title"} className={selectedTextTarget === "title" ? "active" : ""} onClick={() => updateSelected({ editingTextTarget: "title" })}>Title</button>
                {selectedNode.data.shape !== "database" ? <button type="button" role="tab" aria-selected={selectedTextTarget === "description"} className={selectedTextTarget === "description" ? "active" : ""} onClick={() => updateSelected({ editingTextTarget: "description" })}>Description</button> : null}
                {selectedNode.data.shape === "header-card" ? <button type="button" role="tab" aria-selected={selectedTextTarget === "header"} className={selectedTextTarget === "header" ? "active" : ""} onClick={() => updateSelected({ editingTextTarget: "header" })}>Header</button> : null}
              </div>
              <fieldset className="component-text-controls inspector-control-card">
                <legend>{selectedTextTarget === "title" ? "Title" : "Description"} text</legend>
                <div className="text-visibility-controls" aria-label="Visible text areas">
                  <label className="description-toggle inspector-apply-toggle"><span><strong>Show title</strong><small>Reserve space for the node title.</small></span><input type="checkbox" checked={selectedNode.data.showTitle !== false} onChange={(event) => updateSelected({ showTitle: event.target.checked })} /><i aria-hidden="true" /></label>
                  <label className="description-toggle inspector-apply-toggle"><span><strong>Show description</strong><small>Reserve space for supporting text.</small></span><input type="checkbox" checked={selectedNode.data.showDescription !== false} onChange={(event) => updateSelected({ showDescription: event.target.checked })} /><i aria-hidden="true" /></label>
                </div>
                {selectedTextTarget === "title" ? <label><span>Text</span><input autoFocus value={selectedNode.data.label} onChange={(event) => updateSelected({ label: event.target.value })} /></label> : selectedTextTarget === "header" ? <label><span>Text</span><input autoFocus value={selectedNode.data.headerText ?? "Header"} onChange={(event) => updateSelected({ headerText: event.target.value })} /></label> : <label><span>Text</span><textarea rows={3} value={selectedNode.data.description ?? ""} onChange={(event) => updateSelected({ description: event.target.value })} /></label>}
                <label><span>Font</span><select value={selectedTextStyle.fontFamily ?? ""} onChange={(event) => updateSelectedTextStyle({ fontFamily: event.target.value || undefined })}><option value="">System</option><option value="Inter, Arial, sans-serif">Inter</option><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="'Times New Roman', Times, serif">Times New Roman</option><option value="'Courier New', monospace">Courier New</option></select></label>
                {selectedTextTarget === "header" ? <div className="header-editor-colors">
                  <label><span>Header background</span><input type="color" value={selectedNode.data.headerColor ?? "#f59e0b"} onChange={(event) => updateSelected({ headerColor: event.target.value })} /></label>
                  <label><span>Header text</span><input type="color" value={selectedTextStyle.color ?? "#ffffff"} onChange={(event) => updateSelectedTextStyle({ color: event.target.value })} /></label>
                </div> : null}
                <label className="line-label-size"><span>Font size</span><div><input type="range" min={selectedTextTarget === "title" ? "8" : "7"} max={selectedTextTarget === "title" ? "42" : "32"} value={selectedTextTarget === "title" ? (selectedNode.data.titleSize ?? 13) : selectedTextTarget === "header" ? (selectedNode.data.headerSize ?? 11) : (selectedNode.data.descriptionSize ?? 10)} onChange={(event) => updateTextSize(selectedTextTarget === "title" ? "titleSize" : selectedTextTarget === "header" ? "headerSize" : "descriptionSize", Number(event.target.value), false)} /><output>{selectedTextTarget === "title" ? (selectedNode.data.titleSize ?? 13) : selectedTextTarget === "header" ? (selectedNode.data.headerSize ?? 11) : (selectedNode.data.descriptionSize ?? 10)}px</output></div></label>
                <label className="description-toggle inspector-apply-toggle"><span><strong>Grow box with text</strong><small>Increase the node size as its text gets larger.</small></span><input type="checkbox" checked={Boolean(selectedNode.data.autoGrowWithText)} onChange={(event) => updateAutoGrowWithText(event.target.checked)} /><i aria-hidden="true" /></label>
                <div className="text-style-actions" role="group" aria-label="Text style">
                  <button type="button" title="Bold" className={selectedTextStyle.fontWeight === 700 ? "active" : ""} onClick={() => updateSelectedTextStyle({ fontWeight: selectedTextStyle.fontWeight === 700 ? 400 : 700 })}><strong>B</strong></button>
                  <button type="button" title="Italic" className={selectedTextStyle.fontStyle === "italic" ? "active" : ""} onClick={() => updateSelectedTextStyle({ fontStyle: selectedTextStyle.fontStyle === "italic" ? "normal" : "italic" })}><em>I</em></button>
                  <button type="button" title="Underline" className={selectedTextStyle.textDecoration === "underline" ? "active" : ""} onClick={() => updateSelectedTextStyle({ textDecoration: selectedTextStyle.textDecoration === "underline" ? "none" : "underline" })}><u>U</u></button>
                  {(["left", "center", "right", "justify"] as const).map((alignment) => {
                    const AlignmentIcon = alignment === "left" ? AlignLeft : alignment === "center" ? AlignCenter : alignment === "right" ? AlignRight : AlignJustify;
                    return <button type="button" key={alignment} title={`Align ${alignment}`} aria-label={`Align ${alignment}`} className={(selectedTextStyle.textAlign ?? "left") === alignment ? "active" : ""} onClick={() => updateSelectedTextStyle({ textAlign: alignment })}><AlignmentIcon size={17} /></button>;
                  })}
                  {selectedTextTarget !== "header" ? <label className="text-color-picker" title="Text color" style={{ "--text-color": selectedTextStyle.color ?? (selectedTextTarget === "title" ? "#152337" : "#667589") } as CSSProperties}><span>A</span><input type="color" value={selectedTextStyle.color ?? (selectedTextTarget === "title" ? "#152337" : "#667589")} onChange={(event) => updateSelectedTextStyle({ color: event.target.value })} /></label> : null}
                </div>
              </fieldset>
              <button type="button" className="close-text-editor" onClick={() => updateSelected({ editingTextTarget: undefined })}>Done editing text</button>
            </> : <div className="inspector-tip"><Type size={16} /> Double-click a component to edit its title, or double-click its description to customize that text.</div>}
            <div className="editor-section-heading section-structure-heading"><span>04</span><div><strong>Structure</strong><small>{selectedComponentCategory === "erd" ? "Table columns and details" : selectedComponentCategory === "service" ? "Service selection" : selectedComponentCategory === "flowchart" ? "Flowchart symbol and icon" : "Shape selection"}</small></div></div>
            {selectedComponentCategory === "erd" ? (
              <fieldset className="component-erd-controls inspector-control-card">
                <legend>ERD table</legend>
                <div className="erd-columns-control">
                  <span>Columns</span>
                  <div className="erd-column-editor-list">
                    {normalizeErdColumns(selectedNode.data.erdColumns).map((column, index, columns) => (
                      <label key={column.id}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <input
                          value={column.name}
                          placeholder="column_name or id (PK)"
                          onChange={(event) => updateSelected({
                            erdColumns: columns.map((item) => item.id === column.id ? { ...item, name: event.target.value } : item),
                          })}
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="add-erd-column"
                    disabled={normalizeErdColumns(selectedNode.data.erdColumns).some((column) => !column.name.trim())}
                    onClick={() => updateSelected({
                      erdColumns: [
                        ...normalizeErdColumns(selectedNode.data.erdColumns),
                        { id: `erd-column-${Date.now()}`, name: "" },
                      ],
                    })}
                  >
                    <Plus size={14} /> Add column
                  </button>
                  <small>Add and name one column at a time. Connector points appear after a column has a name.</small>
                </div>
                <label className="description-toggle inspector-apply-toggle">
                  <span>
                    <strong>Show column details</strong>
                    <small>Expand this table on the canvas.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedNode.data.erdExpanded && normalizeErdColumns(selectedNode.data.erdColumns).some((column) => column.name.trim()))}
                    disabled={!normalizeErdColumns(selectedNode.data.erdColumns).some((column) => column.name.trim())}
                    onChange={(event) => updateSelected({ erdExpanded: event.target.checked })}
                  />
                  <i aria-hidden="true" />
                </label>
              </fieldset>
            ) : selectedComponentCategory === "service" ? (
              <fieldset className="component-service-controls inspector-control-card">
                <legend>Service</legend>
                <div className="service-preset-grid">
                  {servicePresets.map((service) => {
                    const isActive = service.logo
                      ? selectedNode.data.serviceLogo === service.logo
                      : selectedNode.data.serviceSymbol === service.kind;
                    return (
                      <button
                        type="button"
                        key={service.label}
                        title={service.label}
                        aria-label={`Use ${service.label} service preset`}
                        aria-pressed={isActive}
                        className={isActive ? "active" : ""}
                        onClick={() => updateSelected({
                          label: service.label,
                          shape: "service",
                          icon: service.icon,
                          tone: service.tone,
                          serviceLogo: service.logo,
                          serviceSymbol: service.kind,
                          componentCategory: "service",
                          hideIcon: false,
                          legendColor: undefined,
                        })}
                      >
                        {service.logo ? (
                          <img className="service-preset-logo" src={service.logo} alt="" />
                        ) : service.kind === "mobile" ? (
                          <Smartphone className="service-preset-symbol" size={20} aria-hidden="true" />
                        ) : service.kind === "user" ? (
                          <UserRound className="service-preset-symbol" size={20} aria-hidden="true" />
                        ) : service.kind === "computer" ? (
                          <Monitor className="service-preset-symbol" size={20} aria-hidden="true" />
                        ) : service.kind === "server" ? (
                          <Server className="service-preset-symbol" size={20} aria-hidden="true" />
                        ) : service.kind === "security" ? (
                          <LockKeyhole className="service-preset-symbol" size={20} aria-hidden="true" />
                        ) : service.kind === "cloud" ? (
                          <Cloud className="service-preset-symbol" size={20} aria-hidden="true" />
                        ) : service.kind === "domain" ? (
                          <Globe2 className="service-preset-symbol" size={20} aria-hidden="true" />
                        ) : service.kind === "auth" ? (
                          <UserRoundCheck className="service-preset-symbol" size={20} aria-hidden="true" />
                        ) : service.kind === "protection" ? (
                          <ShieldCheck className="service-preset-symbol" size={20} aria-hidden="true" />
                        ) : service.kind === "ai" ? (
                          <BrainCircuit className="service-preset-symbol" size={20} aria-hidden="true" />
                        ) : (
                          <Database className="service-preset-symbol" size={20} aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <>
                <fieldset className="component-shape-controls inspector-control-card">
                  <legend>Shape</legend>
                  <div className="option-grid shape-grid">
                    {shapeOptions.filter((option) => shapesByCategory[selectedComponentCategory === "flowchart" ? "flowchart" : "shape"].includes(option.value)).map((option) => (
                      <button
                        key={option.value}
                        title={option.label}
                        aria-label={option.label}
                        className={selectedNode.data.shape === option.value ? "active" : ""}
                        onClick={() => updateSelected({
                          shape: option.value,
                          icon: defaultIconForShape(option.value),
                          serviceLogo: undefined,
                          serviceSymbol: undefined,
                          componentCategory: selectedComponentCategory === "flowchart" ? "flowchart" : "shape",
                          hideIcon: selectedComponentCategory !== "flowchart",
                        })}
                      >
                        <ShapeOutlinePreview shape={option.value} className="shape-outline-preview" />
                      </button>
                    ))}
                  </div>
                </fieldset>
                {selectedComponentCategory === "flowchart" ? <fieldset className="component-icon-controls inspector-control-card">
                  <legend>Icon</legend>
                  <div className="option-grid icon-grid">
                    <button
                      title="No icon"
                      aria-label="No icon"
                      className={selectedNode.data.hideIcon ? "active icon-none-option" : "icon-none-option"}
                      onClick={() => updateSelected({ hideIcon: true })}
                    >
                      <X size={18} />
                    </button>
                    {iconOptions.map((option) => {
                      const Icon = iconMap[option.value];
                      return (
                        <button
                          key={option.value}
                          title={option.label}
                          aria-label={option.label}
                          className={!selectedNode.data.hideIcon && selectedNode.data.icon === option.value ? "active" : ""}
                          onClick={() => updateSelected({ icon: option.value, hideIcon: false })}
                        >
                          <Icon size={18} />
                        </button>
                      );
                    })}
                  </div>
                </fieldset> : null}
              </>
            )}
            {selectedNode.data.shape === "side-panel" || selectedNode.data.shape === "left-panel" ? <fieldset className="component-segment-controls inspector-control-card">
              <legend>Side areas</legend>
              <div className="appearance-color-row">
                <label><span>{selectedNode.data.shape === "left-panel" ? "Side" : "Left"}</span><input type="color" value={selectedNode.data.leftPanelColor ?? "#dbeafe"} onChange={(event) => updateSelected({ leftPanelColor: event.target.value })} /></label>
                {selectedNode.data.shape === "side-panel" ? <label><span>Right</span><input type="color" value={selectedNode.data.rightPanelColor ?? "#dbeafe"} onChange={(event) => updateSelected({ rightPanelColor: event.target.value })} /></label> : null}
              </div>
              {selectedNode.data.shape === "left-panel" ? <label className="inspector-select-label"><span>Side location</span><select value={selectedNode.data.panelSide ?? "left"} onChange={(event) => updateSelected({ panelSide: event.target.value as "left" | "right" })}><option value="left">Left</option><option value="right">Right</option></select></label> : null}
              <small>The side area is color-only. Title and description stay in the larger panel.</small>
            </fieldset> : null}
            <div className="editor-section-heading section-appearance-heading"><span>03</span><div><strong>Appearance</strong><small>Accent, fill, and outline</small></div></div>
            <fieldset className="component-accent-controls inspector-control-card">
              <legend>Accent and icon color</legend>
              <div className="tone-row">
                {(["cyan", "violet", "amber", "emerald", "slate", "rose", "black"] as NodeTone[]).map(
                  (tone) => (
                    <button
                      key={tone}
                      className={`tone-button ${tone} ${
                        !selectedNode.data.legendColor && selectedNode.data.tone === tone ? "active" : ""
                      }`}
                      aria-label={`${tone} color`}
                      onClick={() => updateSelected({ tone, legendColor: undefined })}
                    />
                  ),
                )}
                <label className={`tone-custom-button ${selectedNode.data.legendColor ? "active" : ""}`} title="Custom color">
                  <input
                    type="color"
                    value={selectedNode.data.legendColor ?? "#0ea5c6"}
                    onChange={(event) => updateSelected({ legendColor: event.target.value })}
                  />
                  <Plus size={14} />
                </label>
              </div>
            </fieldset>
            <fieldset className="component-appearance-controls inspector-control-card">
              <legend>Surface</legend>
              <div className="appearance-color-row">
                <label>
                  <span>Fill</span>
                  <input
                    type="color"
                    value={selectedNode.data.fillColor ?? "#ffffff"}
                    onChange={(event) => updateSelected({ fillColor: event.target.value })}
                  />
                </label>
                <label>
                  <span>Outline</span>
                  <input
                    type="color"
                    value={selectedNode.data.outlineColor ?? selectedNode.data.legendColor ?? "#0ea5c6"}
                    onChange={(event) => updateSelected({ outlineColor: event.target.value })}
                  />
                </label>
              </div>
              <label className="fill-opacity-control">
                <span>Fill opacity</span>
                <div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={selectedNode.data.fillOpacity ?? 100}
                    onChange={(event) => updateSelected({ fillOpacity: Number(event.target.value) })}
                  />
                  <output>{selectedNode.data.fillOpacity ?? 100}%</output>
                </div>
              </label>
              <div className="outline-style-options" role="group" aria-label="Outline style">
                {(["solid", "dashed", "small-dashed"] as const).map((style) => (
                  <button
                    key={style}
                    className={(selectedNode.data.outlineStyle ?? "solid") === style ? "active" : ""}
                    onClick={() => updateSelected({ outlineStyle: style })}
                  >
                    <i className={`outline-sample ${style}`} aria-hidden="true" />
                    <span>{style === "small-dashed" ? "Small dash" : style[0].toUpperCase() + style.slice(1)}</span>
                  </button>
                ))}
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
            <fieldset className="line-label-background inspector-control-card">
              <legend>Label background</legend>
              <label className="description-toggle inspector-apply-toggle">
                <span><strong>Show background</strong><small>Add a color behind this label.</small></span>
                <input
                  type="checkbox"
                  checked={((selectedEdge.data as { labelBackground?: boolean } | undefined)?.labelBackground ?? true)}
                  onChange={(event) => updateSelectedEdge({ data: { ...selectedEdge.data, labelBackground: event.target.checked } })}
                />
                <i aria-hidden="true" />
              </label>
              <label className="line-label-background-color">
                <span>Background color</span>
                <input
                  type="color"
                  disabled={((selectedEdge.data as { labelBackground?: boolean } | undefined)?.labelBackground ?? true) === false}
                  value={typeof selectedEdge.labelBgStyle?.fill === "string" ? selectedEdge.labelBgStyle.fill : "#ffffff"}
                  onChange={(event) => updateSelectedEdge({ labelBgStyle: { ...selectedEdge.labelBgStyle, fill: event.target.value, fillOpacity: 1 } })}
                />
              </label>
            </fieldset>
            {selectedEdgeIsErd ? (
              <fieldset className="erd-relationship-controls inspector-control-card">
                <legend>ERD relationship</legend>
                <div className="erd-cardinality-grid">
                  <label>
                    <span>{selectedEdgeSourceNode?.data.label ?? "Source"} end</span>
                    <select
                      value={((selectedEdge.data as { sourceCardinality?: ErdCardinality } | undefined)?.sourceCardinality) ?? "one"}
                      onChange={(event) => updateSelectedEdge({
                        data: { ...selectedEdge.data, sourceCardinality: event.target.value as ErdCardinality },
                      })}
                    >
                      <option value="default">Default</option>
                      <option value="one">One (1)</option>
                      <option value="zero-or-one">Zero or one (0..1)</option>
                      <option value="many">Many (*)</option>
                      <option value="one-or-many">One or many (1..*)</option>
                      <option value="zero-or-many">Zero or many (0..*)</option>
                    </select>
                  </label>
                  <label>
                    <span>{selectedEdgeTargetNode?.data.label ?? "Target"} end</span>
                    <select
                      value={((selectedEdge.data as { targetCardinality?: ErdCardinality } | undefined)?.targetCardinality) ?? "many"}
                      onChange={(event) => updateSelectedEdge({
                        data: { ...selectedEdge.data, targetCardinality: event.target.value as ErdCardinality },
                      })}
                    >
                      <option value="default">Default arrow</option>
                      <option value="one">One (1)</option>
                      <option value="zero-or-one">Zero or one (0..1)</option>
                      <option value="many">Many (*)</option>
                      <option value="one-or-many">One or many (1..*)</option>
                      <option value="zero-or-many">Zero or many (0..*)</option>
                    </select>
                  </label>
                </div>
                <small>Each selector controls the notation shown at that end of the relationship.</small>
              </fieldset>
            ) : null}
            <fieldset>
              <legend>Line style</legend>
              <div className="line-style-grid">
                <button
                  className={selectedEdgeLineStyle === "solid" ? "active" : ""}
                  onClick={() => setEdgeStyle("solid")}
                >
                  <i className="line-sample solid" />
                  Solid
                </button>
                <button
                  className={selectedEdgeLineStyle === "dashed" ? "active" : ""}
                  onClick={() => setEdgeStyle("dashed")}
                >
                  <i className="line-sample dashed" />
                  Dashed + moving
                </button>
                <button
                  className={selectedEdgeLineStyle === "flow-dot" ? "active" : ""}
                  onClick={() => setEdgeStyle("flow-dot")}
                >
                  <i className="line-sample flow-dot" />
                  Solid + moving dot
                </button>
              </div>
            </fieldset>
            <div className="connection-summary">
              <span>{nodes.find((node) => node.id === selectedEdge.source)?.data.label}</span>
              <i>→</i>
              <span>{nodes.find((node) => node.id === selectedEdge.target)?.data.label}</span>
            </div>
            <button className="reset-connection-route" onClick={resetSelectedEdgeBend}>
              <Route size={16} /> Reset line route
            </button>
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
              <div className="docs-preview-workspace">
                <section className="docs-preview-panel" aria-label="Document export preview">
                  <div className="docs-preview-head">
                    <div>
                      <span>LIVE PREVIEW</span>
                      <strong>Original visual design</strong>
                    </div>
                    <div className="docs-preview-toolbar">
                      <small>Export {Math.round(docsExportZoom * 100)}%</small>
                      <button type="button" aria-label="Zoom preview out" onClick={() => changeDocsInspectZoom(-0.2)} disabled={!docsPreviewReady}>
                        <ZoomOut size={13} />
                      </button>
                      <output aria-label="Preview zoom">{Math.round(docsInspectZoom * 100)}%</output>
                      <button type="button" aria-label="Zoom preview in" onClick={() => changeDocsInspectZoom(0.2)} disabled={!docsPreviewReady}>
                        <ZoomIn size={13} />
                      </button>
                      <button type="button" className="fit-preview" onClick={fitDocsPreview} disabled={!docsPreviewReady}>
                        <Maximize2 size={12} /> Fit
                      </button>
                    </div>
                  </div>
                  <div
                    className={`docs-preview-stage ${docsPreviewReady ? "is-draggable" : ""}`}
                    onPointerDown={startDocsPreviewDrag}
                    onPointerMove={moveDocsPreviewDrag}
                    onPointerUp={stopDocsPreviewDrag}
                    onPointerCancel={stopDocsPreviewDrag}
                    onLostPointerCapture={() => { docsPreviewDrag.current = null; }}
                    onWheel={zoomDocsPreview}
                  >
                    <div
                      className={`docs-preview-image-shell ${docsPreviewReady ? "" : "is-empty"}`}
                      style={{ transform: `translate(${docsPreviewPan.x}px, ${docsPreviewPan.y}px) scale(${docsInspectZoom})` }}
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
                </section>
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
  const [screen, setScreen] = useState<"home" | "workspace">("home");

  if (screen === "home") {
    return <DashboardHome onOpenWorkspace={() => setScreen("workspace")} />;
  }

  return (
    <ReactFlowProvider>
      <FlowWorkspace onGoHome={() => setScreen("home")} />
    </ReactFlowProvider>
  );
}
