"use client";

import { getSmoothStepPath, Position } from "@xyflow/react";
import {
  ArrowRight,
  Check,
  Clock3,
  Folder,
  Grid2X2,
  Home,
  Layers3,
  List,
  Network,
  Pencil,
  Plus,
  Search,
  Settings2,
  Star,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import lemmaLogo from "./assets/Lemma_MainLogo-transparent.png";

const HISTORY_PREFIX = "collieai-architecture-history-";
const LEGACY_DIAGRAM_KEY = "collieai-architecture-v1";
const MAIN_DIAGRAM_KEY = "collieai-architecture-page-main";
const EMERGENCY_HISTORY_ENTRIES = 3;

const isQuotaExceeded = (error: unknown) =>
  error instanceof DOMException &&
  (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");

const historyKeys = (storage: Storage) => {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(HISTORY_PREFIX)) keys.push(key);
  }
  return keys;
};

// History contains full diagram snapshots and is the only disposable data in
// local storage. Keep a small recovery trail when the browser quota is full;
// current diagrams, page indexes, comments and animations are never removed.
const compactHistory = (storage: Storage) => {
  for (const key of historyKeys(storage)) {
    try {
      const value = storage.getItem(key);
      const entries = value ? JSON.parse(value) : [];
      if (Array.isArray(entries) && entries.length > EMERGENCY_HISTORY_ENTRIES) {
        storage.setItem(key, JSON.stringify(entries.slice(0, EMERGENCY_HISTORY_ENTRIES)));
      }
    } catch {
      storage.removeItem(key);
    }
  }

  if (storage.getItem(MAIN_DIAGRAM_KEY)) storage.removeItem(LEGACY_DIAGRAM_KEY);
};

export const setLocalStorageItem = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
    return;
  } catch (error) {
    if (!isQuotaExceeded(error)) throw error;
  }

  compactHistory(window.localStorage);
  try {
    window.localStorage.setItem(key, value);
    return;
  } catch (error) {
    if (!isQuotaExceeded(error)) throw error;
  }

  // If compact snapshots are still too large, sacrifice history only. Cloud
  // and current local diagrams remain intact and the requested write retries.
  for (const historyKey of historyKeys(window.localStorage)) {
    window.localStorage.removeItem(historyKey);
  }
  window.localStorage.setItem(key, value);
};

type HomeView = "recent" | "favorites";
type StoredNode = {
  id: string;
  position?: { x: number; y: number };
  style?: { width?: number | string; height?: number | string };
  measured?: { width?: number; height?: number };
  data?: {
    label?: string;
    shape?: string;
    tone?: string;
    icon?: string;
    serviceLogo?: string;
    serviceSymbol?: string;
  };
};
type StoredEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
  style?: { stroke?: string; strokeDasharray?: string };
  data?: { bend?: { x: number; y: number }; joints?: { x: number; y: number }[]; lineStyle?: string };
};
type WorkspaceMeta = { name: string; favorite: boolean };
type ExtraWorkspace = { id: string; name: string; favorite: boolean };
type WorkflowMeta = { id: string; name: string; favorite?: boolean };

const WORKSPACE_KEY = "collieai-workspace-home-v1";
const PAGE_KEY = "collieai-architecture-page-main";
const PAGE_INDEX_KEY = "collieai-architecture-pages-v1";
const ACTIVE_WORKSPACE_KEY = "collieai-active-workspace-v1";
const ACTIVE_WORKSPACE_OWNER_KEY = "collieai-active-workspace-owner-v1";
const ACTIVE_WORKFLOW_KEY = "collieai-active-workflow-v1";
const ACTIVE_WORKFLOW_NAME_KEY = "collieai-active-workflow-name-v1";
const defaultWorkspace: WorkspaceMeta = { name: "Collie", favorite: false };
const defaultWorkflows: WorkflowMeta[] = [{ id: "main", name: "Workflow 1", favorite: false }];
const workflowIndexKey = (workspaceId: string) => `collieai-workflows-${workspaceId}-v1`;
const workflowWorkspaceId = (workspaceId: string, workflowId: string) =>
  workflowId === "main" ? workspaceId : `${workspaceId}-workflow-${workflowId}`;
const workspaceApiUrl = (workspaceId: string) => {
  const query = `?id=${encodeURIComponent(workspaceId)}`;
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return `https://collieai-system-architecture.yestinguarin.chatgpt.site/api/workspace${query}`;
  }
  return `/api/workspace${query}`;
};

// Remote sync must never make a locally created workspace unusable. Network,
// auth, or CORS failures stay local and do not become unhandled rejections.
const syncWorkspace = async (workspaceId: string, method: "PUT" | "PATCH", payload: unknown) => {
  try {
    const response = await fetch(workspaceApiUrl(workspaceId), {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Reads the main page's name for a workspace from its own localStorage
// namespace (the same keys the editor uses), so the home preview shows the
// correct page name even when the cloud snapshot is unreachable.
const readLocalDiagramName = (workspaceId: string) => {
  try {
    const indexKey =
      workspaceId === "collie"
        ? PAGE_INDEX_KEY
        : `collieai-architecture-pages-${workspaceId}-v1`;
    const index = JSON.parse(window.localStorage.getItem(indexKey) ?? "{}");
    const mainPage = Array.isArray(index.pages)
      ? index.pages.find((page: { id?: string }) => page.id === "main")
      : null;
    return mainPage?.name ?? "";
  } catch {
    return "";
  }
};

const readLocalDiagramNodes = (workspaceId: string): StoredNode[] => {
  try {
    const pageKey = workspaceId === "collie"
      ? PAGE_KEY
      : `collieai-architecture-page-${workspaceId}-main`;
    const diagram = JSON.parse(window.localStorage.getItem(pageKey) ?? "{}");
    return Array.isArray(diagram.nodes) ? diagram.nodes : [];
  } catch {
    return [];
  }
};

const readLocalDiagramEdges = (workspaceId: string): StoredEdge[] => {
  try {
    const pageKey = workspaceId === "collie"
      ? PAGE_KEY
      : `collieai-architecture-page-${workspaceId}-main`;
    const diagram = JSON.parse(window.localStorage.getItem(pageKey) ?? "{}");
    return Array.isArray(diagram.edges) ? diagram.edges : [];
  } catch {
    return [];
  }
};

const readLocalPageCount = (workspaceId: string) => {
  try {
    const indexKey = workspaceId === "collie"
      ? PAGE_INDEX_KEY
      : `collieai-architecture-pages-${workspaceId}-v1`;
    const index = JSON.parse(window.localStorage.getItem(indexKey) ?? "{}");
    return Array.isArray(index.pages) && index.pages.length ? index.pages.length : 1;
  } catch {
    return 1;
  }
};

const previewNodeSize = (node: StoredNode) => {
  const shape = node.data?.shape;
  const defaults = shape === "decision" ? [230, 126]
    : shape === "cloud" ? [290, 118]
      : shape === "terminal" ? [250, 62]
        : shape === "text" ? [200, 40]
          : shape === "circle" ? [160, 160]
            : [270, 78];
  const styleWidth = Number.parseFloat(String(node.style?.width ?? ""));
  const styleHeight = Number.parseFloat(String(node.style?.height ?? ""));
  const isPreset = Boolean(node.data?.serviceLogo || node.data?.serviceSymbol);
  return {
    width: node.measured?.width ?? (Number.isFinite(styleWidth) ? styleWidth : isPreset ? 112 : defaults[0]),
    height: node.measured?.height ?? (Number.isFinite(styleHeight) ? styleHeight : isPreset ? 142 : defaults[1]),
  };
};

const previewNodeRect = (node: StoredNode) => {
  const size = previewNodeSize(node);
  const x = node.position?.x ?? 0;
  const y = node.position?.y ?? 0;
  if (node.data?.shape === "service" && (node.data.serviceLogo || node.data.serviceSymbol)) {
    const tile = Math.min(size.width * .96, size.height - 32);
    return { x: x + (size.width - tile) / 2, y, width: tile, height: tile, outerWidth: size.width, outerHeight: size.height };
  }
  return { x, y, width: size.width, height: size.height, outerWidth: size.width, outerHeight: size.height };
};

const previewTone = (tone?: string) => tone === "violet" ? "#7c58d8"
  : tone === "amber" ? "#d88909"
    : tone === "emerald" ? "#149668"
      : tone === "slate" ? "#52657a"
        : tone === "rose" ? "#dc5675"
          : "#0ea5c6";

const previewHandlePoint = (node: StoredNode, handle: string | undefined, source: boolean) => {
  const rect = previewNodeRect(node);
  const side = handle?.split("-")[0] ?? (source ? "bottom" : "top");
  const suffix = handle?.match(/-(\d+)$/)?.[1];
  const index = suffix ? Number(suffix) : 2;
  const preset = Boolean(node.data?.serviceLogo || node.data?.serviceSymbol);
  const stops = preset ? [25, 50, 75] : [10, 30, 50, 70, 90];
  const percent = handle === side ? 50 : (stops[index] ?? 50);
  if (side === "top") return { x: rect.x + rect.width * percent / 100, y: rect.y };
  if (side === "bottom") return { x: rect.x + rect.width * percent / 100, y: rect.y + rect.height };
  if (side === "left") return { x: rect.x, y: rect.y + rect.height * percent / 100 };
  return { x: rect.x + rect.width, y: rect.y + rect.height * percent / 100 };
};

const previewHandleSide = (handle: string | undefined, fallback: Position) => {
  const side = handle?.split("-")[0];
  return side === "top" ? Position.Top
    : side === "right" ? Position.Right
      : side === "bottom" ? Position.Bottom
        : side === "left" ? Position.Left
          : fallback;
};

function ActualDiagramPreview({ nodes, edges = [] }: { nodes: StoredNode[]; edges?: StoredEdge[] }) {
  const visibleNodes = nodes.filter((node) => !["comment", "legend", "legend-key"].includes(node.data?.shape ?? ""));
  if (!visibleNodes.length) {
    return (
      <div className="home-diagram-preview empty-preview">
        <Network size={25} />
        <span>Open the workspace to load its diagram preview</span>
      </div>
    );
  }

  const nodeById = new Map(visibleNodes.map((node) => [node.id, node]));
  const minX = Math.min(...visibleNodes.map((node) => node.position?.x ?? 0));
  const minY = Math.min(...visibleNodes.map((node) => node.position?.y ?? 0));
  const maxX = Math.max(...visibleNodes.map((node) => (node.position?.x ?? 0) + previewNodeSize(node).width));
  const maxY = Math.max(...visibleNodes.map((node) => (node.position?.y ?? 0) + previewNodeSize(node).height));
  const padding = Math.max(38, Math.min(110, Math.max(maxX - minX, maxY - minY) * .12));
  const viewBox = `${minX - padding} ${minY - padding} ${Math.max(1, maxX - minX + padding * 2)} ${Math.max(1, maxY - minY + padding * 2)}`;

  return (
    <div className="home-diagram-preview live-preview" aria-label="Live preview of the current architecture diagram">
      <span className="preview-watermark">LIVE CANVAS</span>
      <svg className="actual-preview-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <marker id="actual-preview-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
        </defs>
        <g className="actual-preview-edges">
          {edges.map((edge) => {
            const source = nodeById.get(edge.source);
            const target = nodeById.get(edge.target);
            if (!source || !target) return null;
            const start = previewHandlePoint(source, edge.sourceHandle, true);
            const end = previewHandlePoint(target, edge.targetHandle, false);
            const joint = edge.data?.joints?.[0] ?? edge.data?.bend;
            const connectorLength = Math.hypot(end.x - start.x, end.y - start.y);
            const portsAreAligned = Math.abs(end.x - start.x) < 24 || Math.abs(end.y - start.y) < 24;
            const d = joint
              ? `M${start.x},${start.y} L${start.x},${joint.y} L${joint.x},${joint.y} L${joint.x},${end.y} L${end.x},${end.y}`
              : portsAreAligned || connectorLength < 100
                ? `M${start.x},${start.y} L${end.x},${end.y}`
                : getSmoothStepPath({
                    sourceX: start.x,
                    sourceY: start.y,
                    targetX: end.x,
                    targetY: end.y,
                    sourcePosition: previewHandleSide(edge.sourceHandle, Position.Bottom),
                    targetPosition: previewHandleSide(edge.targetHandle, Position.Top),
                    borderRadius: 8,
                  })[0];
            return (
              <g key={edge.id}>
                <path d={d} markerEnd="url(#actual-preview-arrow)" style={{ stroke: edge.style?.stroke ?? "#64748b", strokeDasharray: edge.style?.strokeDasharray, fill: "none" }} />
                {edge.data?.lineStyle === "flow-dot" ? <circle className="actual-preview-flow-dot" r="4"><animateMotion dur="2.35s" repeatCount="indefinite" path={d} /></circle> : null}
              </g>
            );
          })}
        </g>
        <g className="actual-preview-nodes">
          {visibleNodes.map((node) => {
            const rect = previewNodeRect(node);
            const color = previewTone(node.data?.tone);
            const isPreset = node.data?.shape === "service" && Boolean(node.data.serviceLogo || node.data.serviceSymbol);
            const cx = rect.x + rect.width / 2;
            const cy = rect.y + rect.height / 2;
            if (isPreset) return (
              <g key={node.id}>
                <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={Math.min(14, rect.width * .08)} fill={color} />
                {node.data?.serviceLogo ? (
                  <image className="actual-preview-logo" href={node.data.serviceLogo} x={cx - rect.width * .25} y={cy - rect.height * .25} width={rect.width * .5} height={rect.height * .5} />
                ) : node.data?.serviceSymbol === "server" ? (
                  <g className="actual-preview-white-icon">
                    <rect x={cx - rect.width * .25} y={cy - rect.height * .23} width={rect.width * .5} height={rect.height * .18} rx="5" />
                    <rect x={cx - rect.width * .25} y={cy + rect.height * .05} width={rect.width * .5} height={rect.height * .18} rx="5" />
                    <circle cx={cx - rect.width * .18} cy={cy - rect.height * .14} r={rect.width * .025} />
                    <circle cx={cx - rect.width * .18} cy={cy + rect.height * .14} r={rect.width * .025} />
                  </g>
                ) : (
                  <path className="actual-preview-lightning" d={`M${cx + rect.width * .04},${cy - rect.height * .28} L${cx - rect.width * .18},${cy + rect.height * .02} H${cx - rect.width * .02} V${cy + rect.height * .3} L${cx + rect.width * .22},${cy - rect.height * .04} H${cx + rect.width * .04} Z`} />
                )}
                <text className="actual-preview-preset-label" x={cx} y={rect.y + rect.height + Math.max(14, rect.height * .13)}>{node.data?.label || "Component"}</text>
              </g>
            );
            if (node.data?.shape === "decision") return <g key={node.id}><path d={`M${cx},${rect.y} L${rect.x + rect.width},${cy} L${cx},${rect.y + rect.height} L${rect.x},${cy} Z`} fill="#fff" stroke={color} /><text className="actual-preview-label" x={cx} y={cy}>{node.data?.label}</text></g>;
            if (node.data?.shape === "database") return <g key={node.id}><path d={`M${rect.x},${rect.y + rect.height * .16} V${rect.y + rect.height * .84} C${rect.x},${rect.y + rect.height},${rect.x + rect.width},${rect.y + rect.height},${rect.x + rect.width},${rect.y + rect.height * .84} V${rect.y + rect.height * .16}`} fill="#fff" stroke={color} /><ellipse cx={cx} cy={rect.y + rect.height * .16} rx={rect.width / 2} ry={rect.height * .16} fill="#fff" stroke={color} /><text className="actual-preview-label" x={cx} y={cy}>{node.data?.label}</text></g>;
            return <g key={node.id}><rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={node.data?.shape === "terminal" ? rect.height / 2 : 10} fill="#fff" stroke={color} /><text className="actual-preview-label" x={cx} y={cy}>{node.data?.label || "Component"}</text></g>;
          })}
        </g>
      </svg>
    </div>
  );
}

export default function DashboardHome({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  const [view, setView] = useState<HomeView>("recent");
  const [query, setQuery] = useState("");
  const [display, setDisplay] = useState<"grid" | "list">("grid");
  const [workspace, setWorkspace] = useState<WorkspaceMeta>(defaultWorkspace);
  const [collieMeta, setCollieMeta] = useState<WorkspaceMeta>(defaultWorkspace);
  const [draftName, setDraftName] = useState(defaultWorkspace.name);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<StoredNode[]>([]);
  const [edges, setEdges] = useState<StoredEdge[]>([]);
  const [diagramName, setDiagramName] = useState("Main architecture");
  const [navigation, setNavigation] = useState<"home" | "recent" | "favorites">("home");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [extraWorkspaces, setExtraWorkspaces] = useState<ExtraWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("collie");
  const [workflows, setWorkflows] = useState<WorkflowMeta[]>(defaultWorkflows);
  const [activeWorkflowId, setActiveWorkflowId] = useState("main");
  const [workflowDialog, setWorkflowDialog] = useState<{ mode: "create" | "rename"; workflowId?: string } | null>(null);
  const [workflowDraft, setWorkflowDraft] = useState("");
  const [workflowDialogError, setWorkflowDialogError] = useState("");
  const [workflowDialogSaving, setWorkflowDialogSaving] = useState(false);
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [workspaceDraft, setWorkspaceDraft] = useState("");
  const [workspaceDialogError, setWorkspaceDialogError] = useState("");
  const [workspaceDialogSaving, setWorkspaceDialogSaving] = useState(false);

  const readWorkflows = (workspaceId: string) => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(workflowIndexKey(workspaceId)) ?? "[]") as WorkflowMeta[];
      return stored.length ? stored.map((workflow) => ({ ...workflow, favorite: Boolean(workflow.favorite) })) : defaultWorkflows;
    } catch {
      return defaultWorkflows;
    }
  };

  const saveWorkflows = (workspaceId: string, next: WorkflowMeta[]) => {
    setLocalStorageItem(workflowIndexKey(workspaceId), JSON.stringify(next));
    void syncWorkspace(workspaceId, "PATCH", { workflows: next });
  };

useEffect(() => {
    let normalized: ExtraWorkspace[] = [];
    try {
      const savedExtras = JSON.parse(window.localStorage.getItem("collieai-extra-workspaces-v1") ?? "[]") as Array<ExtraWorkspace | string>;
      normalized = savedExtras.map((item, index) => {
        const base = typeof item === "string" ? { id: `legacy-workspace-${index}`, name: item } : item;
        return { ...base, favorite: Boolean((base as ExtraWorkspace).favorite) };
      }).filter((item) => item.id && item.name);
      setExtraWorkspaces(normalized);
      setLocalStorageItem("collieai-extra-workspaces-v1", JSON.stringify(normalized));
    } catch { /* no extra workspaces yet */ }

    const loadWorkspace = async () => {
      // Always load the collie workspace metadata so its sidebar row and any
      // collie selection use the correct name instead of the default.
      let localCollie = defaultWorkspace;
      try {
        const savedWorkspace = window.localStorage.getItem(WORKSPACE_KEY);
        if (savedWorkspace) {
          const parsed = JSON.parse(savedWorkspace) as WorkspaceMeta;
          if (parsed.name?.trim()) localCollie = parsed;
        }
      } catch { /* use the default workspace when legacy storage cannot be read. */ }
      setCollieMeta(localCollie);

      // Restore whichever workspace the user last had open, instead of always
      // falling back to the default "collie" workspace.
      const savedActiveId = window.localStorage.getItem(ACTIVE_WORKSPACE_OWNER_KEY) ?? window.localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? "collie";
      const activeIsCollie = savedActiveId === "collie";
      const activeExtra = activeIsCollie ? null : normalized.find((item) => item.id === savedActiveId) ?? null;
      const targetId = activeIsCollie || !activeExtra ? "collie" : savedActiveId;
      const activeWorkspace: WorkspaceMeta = activeIsCollie
        ? localCollie
        : activeExtra
          ? { name: activeExtra.name, favorite: activeExtra.favorite }
          : localCollie;

      setSelectedWorkspaceId(targetId);
      setWorkspace(activeWorkspace);
      setDraftName(activeWorkspace.name);
      const savedWorkflowId = window.localStorage.getItem(ACTIVE_WORKFLOW_KEY) ?? "main";
      const localWorkflows = readWorkflows(targetId);
      setWorkflows(localWorkflows);
      setActiveWorkflowId(localWorkflows.some((workflow) => workflow.id === savedWorkflowId) ? savedWorkflowId : "main");

      // Load the preview for that workspace: cloud snapshot first, then the
      // workspace's own namespaced localStorage as the offline fallback.
      const localName = readLocalDiagramName(targetId);
      const localNodes = readLocalDiagramNodes(targetId);
      const localEdges = readLocalDiagramEdges(targetId);
      setNodes(localNodes);
      setEdges(localEdges);
      setDiagramName(localName || "Main architecture");
      try {
        const response = await fetch(workspaceApiUrl(targetId));
        const body = await response.json();
        const cloud = body.data as { workspace?: WorkspaceMeta; workflows?: WorkflowMeta[]; diagrams?: Record<string, { nodes?: StoredNode[]; edges?: StoredEdge[] }>; pages?: { id?: string; name?: string }[] } | null;
        if (cloud?.workflows?.length) {
          setWorkflows(cloud.workflows);
          setLocalStorageItem(workflowIndexKey(targetId), JSON.stringify(cloud.workflows));
        }
        const main = cloud?.diagrams?.main;
        const pageName = cloud?.pages?.find((page) => page.id === "main")?.name;
        if (targetId === "collie" && cloud?.workspace?.name) {
          const next = cloud.workspace;
          setCollieMeta(next);
          setWorkspace(next);
          setDraftName(next.name);
        }
        const cloudNodes = Array.isArray(main?.nodes) ? main.nodes : [];
        const cloudEdges = Array.isArray(main?.edges) ? main.edges : [];
        setNodes(cloudNodes.length ? cloudNodes : localNodes);
        setEdges(cloudNodes.length ? cloudEdges : localEdges);
        setDiagramName(pageName || localName || "Main architecture");
      } catch { /* Keep the local preview while offline. */ }
      setWorkspaceReady(true);
    };
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!workspaceReady) return;
    setLocalStorageItem(WORKSPACE_KEY, JSON.stringify(collieMeta));
    void syncWorkspace("collie", "PATCH", { workspace: collieMeta });
  }, [collieMeta, workspaceReady]);

  useEffect(() => {
    if (workspaceReady && selectedWorkspaceId !== "collie") {
      void syncWorkspace(selectedWorkspaceId, "PATCH", { workspace });
    }
  }, [workspace, workspaceReady, selectedWorkspaceId]);

  const openCreateWorkspaceDialog = () => {
    setWorkspaceDraft("");
    setWorkspaceDialogError("");
    setWorkspaceDialogSaving(false);
    setWorkspaceDialogOpen(true);
  };

  const submitWorkspaceDialog = async () => {
    if (workspaceDialogSaving) return;
    const name = workspaceDraft.trim();
    if (!name) {
      setWorkspaceDialogError("Enter a workspace name.");
      return;
    }
    const duplicate = [collieMeta.name, ...extraWorkspaces.map((item) => item.name)]
      .some((existingName) => existingName.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      setWorkspaceDialogError("A workspace with this name already exists.");
      return;
    }
    setWorkspaceDialogSaving(true);
    const workspace = { id: `workspace-${Date.now()}`, name, favorite: false };
    setExtraWorkspaces((current) => {
      const next = [...current, workspace];
      setLocalStorageItem("collieai-extra-workspaces-v1", JSON.stringify(next));
      return next;
    });
    setLocalStorageItem(ACTIVE_WORKSPACE_KEY, workspace.id);
    setLocalStorageItem(ACTIVE_WORKSPACE_OWNER_KEY, workspace.id);
    setLocalStorageItem(ACTIVE_WORKFLOW_KEY, "main");
    setLocalStorageItem(ACTIVE_WORKFLOW_NAME_KEY, defaultWorkflows[0].name);
    await syncWorkspace(workspace.id, "PUT", { workspace: { name: workspace.name, favorite: false }, workflows: defaultWorkflows, pages: [{ id: "main", name: "Main architecture" }], trashedPages: [], activePageId: "main", diagrams: { main: { nodes: [], edges: [] } } });
    setWorkspaceDialogSaving(false);
    setWorkspaceDialogOpen(false);
    onOpenWorkspace();
  };

const selectWorkspace = async (id: string, fallbackName: string, fallbackFavorite = false) => {
    setLocalStorageItem(ACTIVE_WORKSPACE_KEY, id);
    setLocalStorageItem(ACTIVE_WORKSPACE_OWNER_KEY, id);
    setLocalStorageItem(ACTIVE_WORKFLOW_KEY, "main");
    setLocalStorageItem(ACTIVE_WORKFLOW_NAME_KEY, defaultWorkflows[0].name);
    setSelectedWorkspaceId(id);
    setActiveWorkflowId("main");
    setWorkflows(readWorkflows(id));
    setRenamingId(null);
    if (id === "collie") {
      setWorkspace(collieMeta);
      setDraftName(collieMeta.name);
    } else {
      setWorkspace({ name: fallbackName, favorite: fallbackFavorite });
    }
    const localNodes = readLocalDiagramNodes(id);
    const localEdges = readLocalDiagramEdges(id);
    setNodes(localNodes);
    setEdges(localEdges);
    setDiagramName(readLocalDiagramName(id) || "Main architecture");
    try {
      const response = await fetch(workspaceApiUrl(id));
      const cloud = (await response.json()).data as { workspace?: WorkspaceMeta; workflows?: WorkflowMeta[]; diagrams?: Record<string, { nodes?: StoredNode[]; edges?: StoredEdge[] }>; pages?: { id?: string; name?: string }[] } | null;
      if (cloud?.workflows?.length) {
        setWorkflows(cloud.workflows);
        setLocalStorageItem(workflowIndexKey(id), JSON.stringify(cloud.workflows));
      }
      const main = cloud?.diagrams?.main;
      if (id === "collie") {
        const next = cloud?.workspace?.name ? cloud.workspace : collieMeta;
        setCollieMeta(next);
        setWorkspace(next);
        setDraftName(next.name);
      } else {
        setWorkspace({ name: fallbackName, favorite: fallbackFavorite });
      }
      const cloudNodes = Array.isArray(main?.nodes) ? main.nodes : [];
      const cloudEdges = Array.isArray(main?.edges) ? main.edges : [];
      setNodes(cloudNodes.length ? cloudNodes : localNodes);
      setEdges(cloudNodes.length ? cloudEdges : localEdges);
      setDiagramName(cloud?.pages?.find((page) => page.id === "main")?.name || readLocalDiagramName(id) || "Main architecture");
    } catch { /* The empty workspace remains usable offline. */ }
  };

  const openCreateWorkflowDialog = () => {
    setWorkflowDraft(`Workflow ${workflows.length + 1}`);
    setWorkflowDialogError("");
    setWorkflowDialogSaving(false);
    setWorkflowDialog({ mode: "create" });
  };

  const openRenameWorkflowDialog = (workflow: WorkflowMeta) => {
    setWorkflowDraft(workflow.name);
    setWorkflowDialogError("");
    setWorkflowDialogSaving(false);
    setWorkflowDialog({ mode: "rename", workflowId: workflow.id });
  };

  const submitWorkflowDialog = async () => {
    if (!workflowDialog || workflowDialogSaving) return;
    const name = workflowDraft.trim();
    if (!name) {
      setWorkflowDialogError("Enter a workflow name.");
      return;
    }
    const duplicate = workflows.some((workflow) =>
      workflow.id !== workflowDialog.workflowId && workflow.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      setWorkflowDialogError("A workflow with this name already exists.");
      return;
    }

    if (workflowDialog.mode === "rename" && workflowDialog.workflowId) {
      const workflow = workflows.find((item) => item.id === workflowDialog.workflowId);
      if (!workflow || workflow.name === name) {
        setWorkflowDialog(null);
        return;
      }
      const next = workflows.map((item) => item.id === workflow.id ? { ...item, name } : item);
      setWorkflows(next);
      saveWorkflows(selectedWorkspaceId, next);
      if (workflow.id === activeWorkflowId) setLocalStorageItem(ACTIVE_WORKFLOW_NAME_KEY, name);
      setWorkflowDialog(null);
      return;
    }

    const workflow: WorkflowMeta = { id: `workflow-${Date.now()}`, name, favorite: false };
    setWorkflowDialogSaving(true);
    const next = [...workflows, workflow];
    saveWorkflows(selectedWorkspaceId, next);
    setWorkflows(next);
    setActiveWorkflowId(workflow.id);
    setLocalStorageItem(ACTIVE_WORKSPACE_OWNER_KEY, selectedWorkspaceId);
    setLocalStorageItem(ACTIVE_WORKFLOW_KEY, workflow.id);
    setLocalStorageItem(ACTIVE_WORKFLOW_NAME_KEY, workflow.name);
    setLocalStorageItem(ACTIVE_WORKSPACE_KEY, workflowWorkspaceId(selectedWorkspaceId, workflow.id));
    await syncWorkspace(workflowWorkspaceId(selectedWorkspaceId, workflow.id), "PUT", {
        workspace: { name: `${workspace.name} · ${workflow.name}`, favorite: false },
        pages: [{ id: "main", name: "Main architecture" }],
        trashedPages: [],
        activePageId: "main",
        diagrams: { main: { nodes: [], edges: [] } },
    });
    setWorkflowDialogSaving(false);
    setWorkflowDialog(null);
    onOpenWorkspace();
  };

  const openWorkflow = (workflow: WorkflowMeta) => {
    setActiveWorkflowId(workflow.id);
    setLocalStorageItem(ACTIVE_WORKSPACE_OWNER_KEY, selectedWorkspaceId);
    setLocalStorageItem(ACTIVE_WORKFLOW_KEY, workflow.id);
    setLocalStorageItem(ACTIVE_WORKFLOW_NAME_KEY, workflow.name);
    setLocalStorageItem(ACTIVE_WORKSPACE_KEY, workflowWorkspaceId(selectedWorkspaceId, workflow.id));
    onOpenWorkspace();
  };

  const toggleWorkflowFavorite = (workflowId: string) => {
    const next = workflows.map((workflow) => workflow.id === workflowId ? { ...workflow, favorite: !workflow.favorite } : workflow);
    setWorkflows(next);
    saveWorkflows(selectedWorkspaceId, next);
  };

  const visibleWorkflowItems = workflows.filter((workflow) =>
    (view !== "favorites" || workflow.favorite) &&
    (!query.trim() || workflow.name.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const matchesSearch = visibleWorkflowItems.length > 0;
  const workflowNodes = (workflow: WorkflowMeta) => {
    if (!workspaceReady) return [];
    const storedNodes = readLocalDiagramNodes(workflowWorkspaceId(selectedWorkspaceId, workflow.id));
    return storedNodes.length || workflow.id !== activeWorkflowId ? storedNodes : nodes;
  };
  const workflowEdges = (workflow: WorkflowMeta) => {
    if (!workspaceReady) return [];
    const workflowId = workflowWorkspaceId(selectedWorkspaceId, workflow.id);
    const storedNodes = readLocalDiagramNodes(workflowId);
    const storedEdges = readLocalDiagramEdges(workflowId);
    return storedNodes.length || workflow.id !== activeWorkflowId ? storedEdges : edges;
  };
  const workflowComponentCount = (workflow: WorkflowMeta) => workflowNodes(workflow).length;
  const workflowPageCount = (workflow: WorkflowMeta) =>
    workspaceReady ? readLocalPageCount(workflowWorkspaceId(selectedWorkspaceId, workflow.id)) : 0;
  const workspaceStats = (workspaceId: string) => {
    if (!workspaceReady) return { workflowCount: workspaceId === selectedWorkspaceId ? workflows.length : 1, componentCount: 0 };
    const workspaceWorkflows = workspaceId === selectedWorkspaceId ? workflows : readWorkflows(workspaceId);
    const componentCount = workspaceWorkflows.reduce((total, workflow) => {
      const storedNodes = readLocalDiagramNodes(workflowWorkspaceId(workspaceId, workflow.id));
      if (storedNodes.length) return total + storedNodes.length;
      if (workspaceId === selectedWorkspaceId && workflow.id === activeWorkflowId) return total + nodes.length;
      return total;
    }, 0);
    return { workflowCount: workspaceWorkflows.length, componentCount };
  };
  const favoriteWorkspaces = [
    { id: "collie", name: collieMeta.name, favorite: collieMeta.favorite },
    ...extraWorkspaces,
  ].filter((item) => item.favorite);
  const visibleWorkspaces = view === "favorites" ? favoriteWorkspaces : [{ id: selectedWorkspaceId, ...workspace }];

  const startRenaming = (id: string, name: string) => {
    setRenamingId(id);
    setDraftName(name);
  };

  const saveWorkspaceName = () => {
    const nextName = draftName.trim() || defaultWorkspace.name;
    const id = renamingId ?? "collie";
    if (id === "collie") {
      setCollieMeta((current) => ({ ...current, name: nextName }));
      if (selectedWorkspaceId === "collie") setWorkspace((current) => ({ ...current, name: nextName }));
    } else {
      const existing = extraWorkspaces.find((item) => item.id === id);
      setExtraWorkspaces((current) => {
        const next = current.map((item) => (item.id === id ? { ...item, name: nextName } : item));
        setLocalStorageItem("collieai-extra-workspaces-v1", JSON.stringify(next));
        return next;
      });
      if (selectedWorkspaceId === id) setWorkspace((current) => ({ ...current, name: nextName }));
      void syncWorkspace(id, "PATCH", { workspace: { name: nextName, favorite: existing?.favorite ?? false } });
    }
    setDraftName(nextName);
    setRenamingId(null);
  };

  const toggleFavorite = (id: string) => {
    if (id === "collie") {
      const favorite = !collieMeta.favorite;
      setCollieMeta((current) => ({ ...current, favorite }));
      if (selectedWorkspaceId === "collie") setWorkspace((current) => ({ ...current, favorite }));
    } else {
      const current = extraWorkspaces.find((item) => item.id === id);
      if (!current) return;
      const favorite = !current.favorite;
      setExtraWorkspaces((items) => {
        const next = items.map((item) => (item.id === id ? { ...item, favorite } : item));
        setLocalStorageItem("collieai-extra-workspaces-v1", JSON.stringify(next));
        return next;
      });
      if (selectedWorkspaceId === id) setWorkspace((cur) => ({ ...cur, favorite }));
      void syncWorkspace(id, "PATCH", { workspace: { name: current.name, favorite } });
    }
  };

  return (
    <main className="home-shell">
      <aside className="home-sidebar">
        <div className="home-brand"><span><Network size={19} /></span><strong>LemmaAI</strong></div>
        <button className="home-create" onClick={onOpenWorkspace}>Open workspace <ArrowRight size={16} /></button>
        <nav className="home-navigation" aria-label="Home navigation">
          <button className={navigation === "home" ? "active" : ""} onClick={() => { setNavigation("home"); setView("recent"); }}><Home size={17} /> Home</button>
          <button className={navigation === "recent" ? "active" : ""} onClick={() => { setNavigation("recent"); setView("recent"); }}><Clock3 size={17} /> Recent</button>
          <button className={navigation === "favorites" ? "active" : ""} onClick={() => { setNavigation("favorites"); setView("favorites"); }}><Star size={17} /> Favorites</button>
        </nav>
        <div className="workspace-heading"><span>WORKSPACES</span><button onClick={openCreateWorkspaceDialog} aria-label="Create workspace" title="Create workspace"><Plus size={14} /></button></div>
        {[{ id: "collie", name: collieMeta.name, favorite: collieMeta.favorite, rowClass: "workspace-single", isMain: true }, ...extraWorkspaces.map((item) => ({ id: item.id, name: item.name, favorite: item.favorite, rowClass: "extra-workspace", isMain: false }))].map((row) => {
          const isActive = selectedWorkspaceId === row.id;
          const isRenaming = renamingId === row.id;
          const stats = workspaceStats(row.id);
          return (
            <div key={row.id} className={`${row.rowClass} ${isActive ? "is-active" : ""}`} onClick={() => void selectWorkspace(row.id, row.name, row.favorite)}>
              <span className="workspace-icon"><Layers3 size={15} /></span>
              <span className="workspace-name">
                {isRenaming ? (
                  <input value={draftName} onChange={(event) => setDraftName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveWorkspaceName(); if (event.key === "Escape") setRenamingId(null); }} autoFocus aria-label="Workspace name" />
                ) : <strong>{row.name}</strong>}
                <small className="workspace-stats"><span><b>{stats.workflowCount}</b> {stats.workflowCount === 1 ? "workflow" : "workflows"}</span><i /><span><b>{stats.componentCount}</b> {stats.componentCount === 1 ? "component" : "components"}</span></small>
              </span>
              {isRenaming ? <><button onClick={(event) => { event.stopPropagation(); saveWorkspaceName(); }} aria-label="Save workspace name"><Check size={14} /></button><button onClick={(event) => { event.stopPropagation(); setRenamingId(null); }} aria-label="Cancel renaming"><X size={14} /></button></> : <button onClick={(event) => { event.stopPropagation(); startRenaming(row.id, row.name); }} aria-label={`Rename ${row.name} workspace`}><Pencil size={14} /></button>}
            </div>
          );
        })}
        <div className="home-profile"><span className="profile-avatar">YY</span><span><strong>Yen Yen</strong><small>Personal workspace</small></span><Settings2 size={16} /></div>
      </aside>

      <section className="home-main">
        <header className="home-topbar"><div><p>WORKSPACE</p><h1>{workspace.name}</h1></div><label className="home-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your diagrams" aria-label="Search diagrams" /></label></header>
        <section className="workspace-hero"><div><span className="eyebrow"><Network size={14} /> {workspace.name.toUpperCase()} WORKSPACE</span><h2>Your architecture,<br />all in one place.</h2><p>This workspace contains your live CollieAI diagram. Its preview below follows the components currently saved in the canvas.</p><button onClick={onOpenWorkspace}>Open {workspace.name} <ArrowRight size={16} /></button></div><div className="hero-map" aria-hidden="true"><span className="hero-orbit orbit-one" /><span className="hero-orbit orbit-two" /><span className="hero-core"><img src={lemmaLogo.src} alt="" /></span><span className="hero-dot dot-one" /><span className="hero-dot dot-two" /><span className="hero-dot dot-three" /></div></section>
        <section className="project-library solo-library">
          <div className="library-toolbar"><div className="library-tabs" role="tablist"><button className={view === "recent" ? "active" : ""} onClick={() => setView("recent")}>Recently viewed</button><button className={view === "favorites" ? "active" : ""} onClick={() => setView("favorites")}>Favorites</button></div><div className="display-toggle"><button className={display === "grid" ? "active" : ""} onClick={() => setDisplay("grid")} aria-label="Grid view"><Grid2X2 size={15} /></button><button className={display === "list" ? "active" : ""} onClick={() => setDisplay("list")} aria-label="List view"><List size={16} /></button></div></div>
          {display === "list" && workflows.length && matchesSearch ? <div className="workflow-list"><div className="workflow-list-head"><span>Name</span><span>Workspace</span><span>Last modified</span><span>Pages</span><span>Created by</span><span>Action</span></div>{visibleWorkflowItems.map((workflow) => <article className="workflow-list-row" key={workflow.id}><button className="workflow-list-name" onClick={() => openWorkflow(workflow)}><span className="workflow-list-preview"><ActualDiagramPreview nodes={workflowNodes(workflow)} edges={workflowEdges(workflow)} /></span><strong>{workflow.name}</strong></button><span>{workspace.name}</span><span>Recently edited</span><span className="workflow-list-metric"><b>{workflowPageCount(workflow)}</b> {workflowPageCount(workflow) === 1 ? "page" : "pages"}</span><span>Yen Yen</span><span className="workflow-list-actions"><button className={`workflow-list-favorite ${workflow.favorite ? "is-favorite" : ""}`} onClick={() => toggleWorkflowFavorite(workflow.id)} aria-label={workflow.favorite ? `Remove ${workflow.name} from favorites` : `Add ${workflow.name} to favorites`}><Star size={15} fill={workflow.favorite ? "currentColor" : "none"} /></button><button className="workflow-list-action" onClick={() => openRenameWorkflowDialog(workflow)} aria-label={`Rename ${workflow.name} workflow`}>•••</button></span></article>)}</div> : null}
          {display === "grid" && workflows.length && matchesSearch ? <div className="project-grid">{visibleWorkflowItems.map((workflow) => {
            const isActive = workflow.id === activeWorkflowId;
            const itemNodes = workflowNodes(workflow);
            const pageCount = workflowPageCount(workflow);
            const componentCount = workflowComponentCount(workflow);
            return <article className="project-card" key={workflow.id}><button className="project-open" onClick={() => openWorkflow(workflow)} aria-label={`Open ${workflow.name} workflow`}><ActualDiagramPreview nodes={itemNodes} edges={workflowEdges(workflow)} /></button><div className="project-card-body"><span className="project-kind tone-cyan"><Folder size={13} /> WORKFLOW</span><div className="project-title-row"><button onClick={() => openWorkflow(workflow)}>{workflow.name}</button><button className="workflow-rename" onClick={() => openRenameWorkflowDialog(workflow)} aria-label={`Rename ${workflow.name} workflow`}><Pencil size={14} /></button>{isActive ? <span className="workflow-active-label">Open</span> : null}<button className={`workflow-favorite ${workflow.favorite ? "is-favorite" : ""}`} onClick={() => toggleWorkflowFavorite(workflow.id)} aria-label={workflow.favorite ? `Remove ${workflow.name} from favorites` : `Add ${workflow.name} to favorites`}><Star size={16} fill={workflow.favorite ? "currentColor" : "none"} /></button></div><p>{workflow.id === "main" ? "This workflow contains the existing pages in your workspace." : "A separate empty workflow with its own pages and components."}</p><footer><span className="workflow-page-name">{workflow.id === "main" ? (diagramName || "Main architecture") : "Empty workflow"}</span><span className="workflow-card-metric"><b>{pageCount}</b> {pageCount === 1 ? "page" : "pages"}</span><span className="workflow-card-metric"><b>{componentCount}</b> {componentCount === 1 ? "component" : "components"}</span></footer></div></article>;
          })}{view === "recent" ? <button className="workflow-create-tile" onClick={openCreateWorkflowDialog} aria-label="Create workflow"><span><Plus size={22} /></span><strong>New workflow</strong><small>Create an empty workflow</small></button> : null}</div> : !matchesSearch ? <div className="empty-library"><Layers3 size={22} /><strong>{query ? "No matching workflows" : view === "favorites" ? "No favorite workflows yet" : "This workspace is empty"}</strong><p>{query ? "Try a different search." : view === "favorites" ? "Star a workflow to keep it here." : "Create a workflow to start a new diagram."}</p></div> : null}
          {false ? <div className={`project-grid single-project ${display === "list" ? "is-list" : ""}`}>{visibleWorkspaces.map((item) => {
            const isSelected = item.id === selectedWorkspaceId;
            const itemNodes = isSelected ? nodes : [];
            return <article className="project-card" key={item.id}><button className="project-open" onClick={() => { if (isSelected) onOpenWorkspace(); else void selectWorkspace(item.id, item.name, item.favorite); }} aria-label={`Open ${item.name} workspace`}><ActualDiagramPreview nodes={itemNodes} edges={isSelected ? edges : []} /></button><div className="project-card-body"><span className="project-kind tone-cyan"><Folder size={13} /> LIVE DIAGRAM</span><div className="project-title-row"><button onClick={() => { if (isSelected) onOpenWorkspace(); else void selectWorkspace(item.id, item.name, item.favorite); }}>{item.name}</button><button className="favorite-button is-favorite" onClick={() => toggleFavorite(item.id)} aria-label="Remove workspace from favorites"><Star size={16} fill="currentColor" /></button></div><p>{isSelected ? "Preview generated from the components in this workspace." : "Select this workspace to view its live diagram."}</p><footer><span>{isSelected ? (diagramName || `${item.name} · Main architecture`) : `${item.name} workspace`}</span><span>{isSelected ? `${nodes.length} components` : "Favorite workspace"}</span></footer></div></article>;
          })}</div> : null}
        </section>
      </section>
      {workspaceDialogOpen ? (
        <div className="workflow-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !workspaceDialogSaving) setWorkspaceDialogOpen(false); }}>
          <form
            className="workflow-dialog workspace-create-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-dialog-title"
            onSubmit={(event) => { event.preventDefault(); void submitWorkspaceDialog(); }}
          >
            <header>
              <span className="workflow-dialog-icon"><Network size={20} /></span>
              <span>
                <small>NEW WORKSPACE</small>
                <strong id="workspace-dialog-title">Create a workspace</strong>
              </span>
              <button type="button" disabled={workspaceDialogSaving} onClick={() => setWorkspaceDialogOpen(false)} aria-label="Close workspace dialog"><X size={18} /></button>
            </header>
            <div className="workflow-dialog-body">
              <p>Create a separate home for related workflows, architecture pages, and components.</p>
              <label>
                <span>Workspace name</span>
                <input
                  autoFocus
                  maxLength={60}
                  value={workspaceDraft}
                  onChange={(event) => { setWorkspaceDraft(event.target.value); setWorkspaceDialogError(""); }}
                  onKeyDown={(event) => { if (event.key === "Escape" && !workspaceDialogSaving) setWorkspaceDialogOpen(false); }}
                  placeholder="Example: Customer platform"
                  aria-invalid={Boolean(workspaceDialogError)}
                />
                <small>{workspaceDraft.length}/60</small>
              </label>
              {workspaceDialogError ? <div className="workflow-dialog-error">{workspaceDialogError}</div> : null}
            </div>
            <footer>
              <button className="workflow-dialog-cancel" type="button" disabled={workspaceDialogSaving} onClick={() => setWorkspaceDialogOpen(false)}>Cancel</button>
              <button className="workflow-dialog-submit" type="submit" disabled={!workspaceDraft.trim() || workspaceDialogSaving}>
                {workspaceDialogSaving ? "Creating…" : <><Plus size={16} /> Create workspace</>}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
      {workflowDialog ? (
        <div className="workflow-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setWorkflowDialog(null); }}>
          <form
            className="workflow-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workflow-dialog-title"
            onSubmit={(event) => { event.preventDefault(); void submitWorkflowDialog(); }}
          >
            <header>
              <span className="workflow-dialog-icon"><Layers3 size={20} /></span>
              <span>
                <small>{workflowDialog.mode === "create" ? "NEW WORKFLOW" : "WORKFLOW SETTINGS"}</small>
                <strong id="workflow-dialog-title">{workflowDialog.mode === "create" ? "Create a workflow" : "Rename workflow"}</strong>
              </span>
              <button type="button" onClick={() => setWorkflowDialog(null)} aria-label="Close workflow dialog"><X size={18} /></button>
            </header>
            <div className="workflow-dialog-body">
              <p>{workflowDialog.mode === "create" ? "Give this workflow a clear name. You’ll start with a fresh canvas and one architecture page." : "Choose a name that makes this workflow easy to find in your workspace."}</p>
              <label>
                <span>Workflow name</span>
                <input
                  autoFocus
                  maxLength={60}
                  value={workflowDraft}
                  onChange={(event) => { setWorkflowDraft(event.target.value); setWorkflowDialogError(""); }}
                  onKeyDown={(event) => { if (event.key === "Escape") setWorkflowDialog(null); }}
                  placeholder="Example: Production architecture"
                  aria-invalid={Boolean(workflowDialogError)}
                />
                <small>{workflowDraft.length}/60</small>
              </label>
              {workflowDialogError ? <div className="workflow-dialog-error">{workflowDialogError}</div> : null}
            </div>
            <footer>
              <button className="workflow-dialog-cancel" type="button" onClick={() => setWorkflowDialog(null)}>Cancel</button>
              <button className="workflow-dialog-submit" type="submit" disabled={!workflowDraft.trim() || workflowDialogSaving}>
                {workflowDialogSaving ? "Creating…" : workflowDialog.mode === "create" ? <><Plus size={16} /> Create workflow</> : <><Check size={16} /> Save changes</>}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </main>
  );
}
