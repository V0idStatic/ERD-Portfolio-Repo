"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  ConnectionMode,
  Controls,
  Edge,
  getNodesBounds,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  BellRing,
  Bot,
  BrainCircuit,
  Check,
  CircleHelp,
  Cloud,
  Database,
  Download,
  FolderOpen,
  FileText,
  GitBranch,
  GraduationCap,
  HardDrive,
  LayoutDashboard,
  LoaderCircle,
  Maximize2,
  MessageSquareText,
  Network,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  Route,
  Server,
  Sparkles,
  Trash2,
  UserRound,
  Workflow,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toBlob, toPng } from "html-to-image";
import type { ComponentType } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type NodeShape = "service" | "decision" | "database" | "cloud" | "terminal";
type DocsExportMode = "readable" | "full-design";
type DiagramPage = { id: string; name: string; deletedAt?: string };
type DeleteIntent = { page: DiagramPage; mode: "trash" | "permanent" };
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
  shape: NodeShape;
  icon: NodeIcon;
  tone: NodeTone;
};

type ArchitectureNode = Node<ArchitectureNodeData, "architecture">;

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
  return (
    <div
      className={`architecture-node shape-${data.shape} tone-${data.tone} ${
        selected ? "is-selected" : ""
      }`}
    >
      <Handle type="source" position={Position.Top} id="top" />
      {data.shape === "cloud" ? (
        <span className="cloud-art" aria-hidden="true" />
      ) : null}
      {data.shape === "decision" ? (
        <svg className="decision-art" viewBox="0 0 230 126" aria-hidden="true">
          <path fill="#ffffff" d="M115 2 L228 63 L115 124 L2 63 Z" />
        </svg>
      ) : null}
      <div className="node-inner">
        <span className="node-icon" aria-hidden="true">
          <Icon size={17} strokeWidth={2.2} />
        </span>
        <div className="node-copy">
          <strong>{data.label}</strong>
          {data.description ? <span>{data.description}</span> : null}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle className="side-handle" type="source" position={Position.Right} id="right" />
      <Handle className="side-handle" type="source" position={Position.Left} id="left" />
    </div>
  );
}

const nodeTypes = { architecture: ArchitectureNodeCard };

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
  sourceHandle: sourceHandle ?? "bottom",
  targetHandle: targetHandle ?? "top",
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
  edge("e4", "media", "storage", "Yes", false, "right", "left"),
  edge("e5", "media", "api", "No"),
  edge("e6", "storage", "api", "File reference", false, undefined, "left"),
  edge("e7", "api", "session"),
  edge("e8", "session", "classifier"),
  edge("e9", "classifier", "response"),
  edge("e10", "response", "answer-check", "Submitted answer", false, undefined, "left"),
  edge("e11", "response", "help-check", "Help or other input", false, "right", "left"),
  edge("e12", "answer-check", "correct", "Yes", false, undefined, "left"),
  edge("e13", "answer-check", "wrong", "No"),
  edge("e14", "help-check", "help", "Yes", false, undefined, "left"),
  edge("e15", "help-check", "redirect", "Off-topic", false, "right", "left"),
  edge("e16", "correct", "router"),
  edge("e17", "wrong", "router"),
  edge("e18", "help", "router"),
  edge("e19", "redirect", "router"),
  edge("e20", "router", "events-db"),
  edge("e21", "events-db", "n8n", "Analytics path", false, undefined, "left"),
  edge("e22", "n8n", "feature"),
  edge("e23", "feature", "ml"),
  edge("e24", "ml", "intervention"),
  edge("e25", "intervention", "plan", "Yes", false, undefined, "left"),
  edge("e26", "plan", "alert"),
  edge("e27", "intervention", "prediction-db", "No", false, "right", "left"),
  edge("e28", "prediction-db", "dashboard"),
  edge("e29", "events-db", "engine", "Tutoring path", false, "right", "left"),
  edge("e30", "engine", "adaptive-feature"),
  edge("e31", "adaptive-feature", "tutor"),
  edge("e32", "tutor", "memory", "Retrieve context", false, undefined, "right"),
  edge("e33", "tutor", "adaptive-ui"),
  edge("e34", "adaptive-ui", "continue"),
  edge("e35", "continue", "end", "No"),
  edge("e36", "continue", "input", "Yes · next turn", true, "right", "right"),
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

const PAGE_INDEX_KEY = "collieai-architecture-pages-v1";
const LEGACY_STORAGE_KEY = "collieai-architecture-v1";
const defaultPages: DiagramPage[] = [{ id: "main", name: "Main architecture" }];
const pageStorageKey = (pageId: string) => `collieai-architecture-page-${pageId}`;

function FlowWorkspace() {
  const [nodes, setNodes, onNodesChange] = useNodesState<ArchitectureNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [docsExportOpen, setDocsExportOpen] = useState(false);
  const [docsExportMode, setDocsExportMode] = useState<DocsExportMode>("readable");
  const [docsShowDescriptions, setDocsShowDescriptions] = useState(true);
  const [docsTitleScale, setDocsTitleScale] = useState(1);
  const [docsDescriptionScale, setDocsDescriptionScale] = useState(1);
  const [docsExportZoom, setDocsExportZoom] = useState(1);
  const [docsPreviewUrl, setDocsPreviewUrl] = useState<string | null>(null);
  const [docsPreviewing, setDocsPreviewing] = useState(false);
  const [docsInspectZoom, setDocsInspectZoom] = useState(1.6);
  const [docsPreviewPan, setDocsPreviewPan] = useState({ x: 0, y: 0 });
  const docsPreviewUrlRef = useRef<string | null>(null);
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
  const [trashOpen, setTrashOpen] = useState(false);
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [nodeDraft, setNodeDraft] = useState<ArchitectureNodeData>(createNodeDraft);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const { fitView, screenToFlowPosition } = useReactFlow();

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
      if (pageData) {
        const parsed = JSON.parse(pageData) as { nodes?: ArchitectureNode[]; edges?: Edge[] };
        setNodes(parsed.nodes ?? []);
        setEdges(parsed.edges ?? []);
      } else if (restoredActive !== "main") {
        setNodes([]);
        setEdges([]);
      }
    } catch {
      window.localStorage.removeItem(PAGE_INDEX_KEY);
    }
  }, [setEdges, setNodes]);

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null;
  const selectedEdge = edges.find((edgeItem) => edgeItem.id === selectedEdgeId) ?? null;

  const updateSelected = useCallback(
    (patch: Partial<ArchitectureNodeData>) => {
      if (!selectedId) return;
      setNodes((current) =>
        current.map((node) =>
          node.id === selectedId ? { ...node, data: { ...node.data, ...patch } } : node,
        ),
      );
    },
    [selectedId, setNodes],
  );

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
    window.localStorage.setItem(pageStorageKey(activePageId), JSON.stringify({ nodes, edges }));
    if (activePageId === "main") {
      window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ nodes, edges }));
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
      setNodes(parsed.nodes ?? []);
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
    setActivePageId(pageId);
    loadPage(pageId);
    setSelectedId(null);
    setSelectedEdgeId(null);
    setInspectorOpen(false);
    setPagesOpen(false);
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

  const saveDiagram = () => {
    persistCurrentPage();
    persistPageIndex(pages, activePageId, trashedPages);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
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
    if (!docsShowDescriptions) viewport.classList.add("docs-primary-only");
    viewport.style.setProperty("--docs-title-scale", String(docsTitleScale));
    viewport.style.setProperty("--docs-description-scale", String(docsDescriptionScale));
  };

  const clearDocsViewportStyles = (viewport: HTMLElement) => {
    viewport.classList.remove(
      "document-export-mode",
      "docs-custom-export",
      "docs-primary-only",
    );
    viewport.style.removeProperty("--docs-title-scale");
    viewport.style.removeProperty("--docs-description-scale");
  };

  const prepareExportSafeSvgPaint = (viewport: HTMLElement) => {
    viewport.querySelectorAll<SVGPathElement>(".decision-art path").forEach((path) => {
      const node = path.closest<HTMLElement>(".architecture-node");
      const stroke = node
        ? getComputedStyle(node).getPropertyValue("--node-line").trim()
        : "#94a3b8";
      path.setAttribute("fill", "#ffffff");
      path.setAttribute("stroke", stroke || "#94a3b8");
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
    if (!docsExportOpen || nodes.length === 0) {
      if (docsPreviewUrlRef.current) {
        URL.revokeObjectURL(docsPreviewUrlRef.current);
        docsPreviewUrlRef.current = null;
      }
      setDocsPreviewUrl(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const viewport = document.querySelector<HTMLElement>(".react-flow__viewport");
      if (!viewport) return;

      setDocsPreviewing(true);
      setDocsViewportStyles(viewport, docsExportMode);
      try {
        await document.fonts.ready;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const { page, renderScale, translateX, translateY } = getDocsLayout(
          docsExportMode,
          0.18,
        );
        prepareExportSafeSvgPaint(viewport);
        const previewBlob = await toBlob(viewport, {
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
        if (!previewBlob) throw new Error("Preview image could not be created");
        const previewUrl = URL.createObjectURL(previewBlob);
        if (cancelled) {
          URL.revokeObjectURL(previewUrl);
          return;
        }
        if (docsPreviewUrlRef.current) URL.revokeObjectURL(docsPreviewUrlRef.current);
        docsPreviewUrlRef.current = previewUrl;
        setDocsPreviewUrl(previewUrl);
      } catch {
        if (!cancelled) setDocsPreviewUrl(null);
      } finally {
        clearDocsViewportStyles(viewport);
        if (!cancelled) setDocsPreviewing(false);
      }
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    docsExportMode,
    docsExportOpen,
    docsExportZoom,
    docsShowDescriptions,
    docsTitleScale,
    docsDescriptionScale,
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

  return (
    <main className="architecture-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Network size={19} /></span>
          <div>
            <strong>CollieAI</strong>
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
          <button className="button secondary" onClick={() => setCreatorOpen(true)}>
            <Plus size={15} /> <span className="button-label">Add node</span>
          </button>
          <button className="button secondary" onClick={resetDiagram} title="Restore original diagram">
            <RefreshCcw size={15} /> <span className="button-label">Reset</span>
          </button>
          <button
            className="button secondary export-button"
            onClick={() => setDocsExportOpen(true)}
            disabled={exporting}
            title="Export a readable one-page document PNG"
          >
            {exporting ? <LoaderCircle className="spin" size={15} /> : <FileText size={15} />}
            <span className="button-label">Docs PNG</span>
          </button>
          <button
            className="button secondary export-button"
            onClick={exportPng}
            disabled={exporting}
            title="Export a smart-cropped high-resolution PNG"
          >
            {exporting ? <LoaderCircle className="spin" size={15} /> : <Download size={15} />}
            <span className="button-label">{exporting ? "Rendering…" : "Export PNG"}</span>
          </button>
          <button className="button primary" onClick={saveDiagram}>
            <Check size={15} /> <span className="button-label">{saved ? "Saved" : "Save layout"}</span>
          </button>
        </div>
      </header>

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

      <section className="canvas-wrap" aria-label="CollieAI architecture canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          connectionMode={ConnectionMode.Loose}
          onNodeClick={(_, node) => {
            setSelectedId(node.id);
            setSelectedEdgeId(null);
            setInspectorOpen(true);
          }}
          onEdgeClick={(_, edgeItem) => {
            setSelectedEdgeId(edgeItem.id);
            setSelectedId(null);
            setInspectorOpen(true);
          }}
          onPaneClick={() => {
            setSelectedId(null);
            setSelectedEdgeId(null);
          }}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.18}
          maxZoom={1.5}
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#cbd5e1" />
          <MiniMap
            pannable
            zoomable
            nodeColor={(node) => {
              const tone = (node.data as ArchitectureNodeData).tone;
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

      <aside className={`inspector ${inspectorOpen && (selectedNode || selectedEdge) ? "is-open" : ""}`}>
        <div className="inspector-head">
          <div>
            <span>{selectedEdge ? "CONNECTION INSPECTOR" : "NODE INSPECTOR"}</span>
            <strong>{selectedEdge ? "Edit connection" : "Edit component"}</strong>
          </div>
          <button aria-label="Close inspector" onClick={() => setInspectorOpen(false)}>
            <X size={18} />
          </button>
        </div>
        {selectedNode ? (
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
              <legend>Shape</legend>
              <div className="option-grid shape-grid">
                {shapeOptions.map((option) => (
                  <button
                    key={option.value}
                    className={selectedNode.data.shape === option.value ? "active" : ""}
                    onClick={() => updateSelected({ shape: option.value })}
                  >
                    <i className={`shape-preview shape-${option.value}`} />
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
                      <i className={`shape-preview shape-${option.value}`} />
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
                        aria-label={option.label}
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
                    className={`docs-preview-stage ${docsPreviewUrl ? "is-draggable" : ""}`}
                    onPointerDown={(event) => {
                      if (!docsPreviewUrl) return;
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
                      if (!docsPreviewUrl) return;
                      event.preventDefault();
                      changeDocsInspectZoom(event.deltaY < 0 ? 0.2 : -0.2);
                    }}
                  >
                    {docsPreviewUrl ? (
                      <div
                        className="docs-preview-image-shell"
                        style={{
                          transform: `translate(${docsPreviewPan.x}px, ${docsPreviewPan.y}px) scale(${docsInspectZoom})`,
                        }}
                      >
                        <img
                          src={docsPreviewUrl}
                          alt="Preview of the document PNG export"
                          draggable={false}
                        />
                      </div>
                    ) : (
                      <div className="docs-preview-loading">
                        {docsPreviewing ? <LoaderCircle className="spin" size={18} /> : <FileText size={18} />}
                        <span>{docsPreviewing ? "Updating preview…" : "Preview unavailable"}</span>
                      </div>
                    )}
                    {docsPreviewing && docsPreviewUrl ? (
                      <span className="preview-refreshing">
                        <LoaderCircle className="spin" size={13} /> Updating
                      </span>
                    ) : null}
                    {docsPreviewUrl ? (
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
                      <strong>Show subtext</strong>
                      <small>
                        {docsShowDescriptions
                          ? "Primary names and descriptions"
                          : "Primary names only"}
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
