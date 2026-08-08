"use client";

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

type HomeView = "recent" | "favorites";
type StoredNode = { id: string; position?: { x: number; y: number }; data?: { label?: string } };
type WorkspaceMeta = { name: string; favorite: boolean };
type ExtraWorkspace = { id: string; name: string; favorite: boolean };
type WorkflowMeta = { id: string; name: string };

const WORKSPACE_KEY = "collieai-workspace-home-v1";
const PAGE_KEY = "collieai-architecture-page-main";
const PAGE_INDEX_KEY = "collieai-architecture-pages-v1";
const ACTIVE_WORKSPACE_KEY = "collieai-active-workspace-v1";
const ACTIVE_WORKSPACE_OWNER_KEY = "collieai-active-workspace-owner-v1";
const ACTIVE_WORKFLOW_KEY = "collieai-active-workflow-v1";
const ACTIVE_WORKFLOW_NAME_KEY = "collieai-active-workflow-name-v1";
const defaultWorkspace: WorkspaceMeta = { name: "Collie", favorite: false };
const defaultWorkflows: WorkflowMeta[] = [{ id: "main", name: "Workflow 1" }];
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

function ActualDiagramPreview({ nodes }: { nodes: StoredNode[] }) {
  if (!nodes.length) {
    return (
      <div className="home-diagram-preview empty-preview">
        <Network size={25} />
        <span>Open the workspace to load its diagram preview</span>
      </div>
    );
  }

  // A card is a quick look at the primary page, not a tiny full-canvas map.
  // Choose the cluster nearest the page's center rather than the first stored
  // nodes, which may be sparse legends or annotations.
  const sortedX = nodes.map((node) => node.position?.x ?? 0).sort((a, b) => a - b);
  const sortedY = nodes.map((node) => node.position?.y ?? 0).sort((a, b) => a - b);
  const centerX = sortedX[Math.floor(sortedX.length / 2)] ?? 0;
  const centerY = sortedY[Math.floor(sortedY.length / 2)] ?? 0;
  const shownNodes = [...nodes]
    .sort((a, b) => {
      const aDistance = Math.hypot((a.position?.x ?? 0) - centerX, (a.position?.y ?? 0) - centerY);
      const bDistance = Math.hypot((b.position?.x ?? 0) - centerX, (b.position?.y ?? 0) - centerY);
      return aDistance - bDistance;
    })
    .slice(0, 12);
  const anchorX = Math.min(...shownNodes.map((node) => node.position?.x ?? 0));
  const anchorY = Math.min(...shownNodes.map((node) => node.position?.y ?? 0));
  const previewPoint = (node: StoredNode) => ({
    x: Math.max(7, Math.min(91, 8 + ((node.position?.x ?? 0) - anchorX) * 0.075)),
    y: Math.max(10, Math.min(88, 12 + ((node.position?.y ?? 0) - anchorY) * 0.09)),
  });

  return (
    <div className="home-diagram-preview live-preview" aria-label="Live preview of the current architecture diagram">
      <span className="preview-watermark">LIVE CANVAS</span>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {shownNodes.slice(1).map((node, index) => {
          const previous = shownNodes[index];
          const previousPoint = previewPoint(previous);
          const point = previewPoint(node);
          const x1 = previousPoint.x;
          const y1 = previousPoint.y;
          const x2 = point.x;
          const y2 = point.y;
          return <line key={`${previous.id}-${node.id}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </svg>
      {shownNodes.map((node, index) => {
        const point = previewPoint(node);
        const left = point.x - 3;
        const top = point.y - 3;
        return (
          <span className={`live-preview-node node-${index % 4}`} style={{ left: `${left}%`, top: `${top}%` }} key={node.id}>
            {node.data?.label || "Component"}
          </span>
        );
      })}
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
  const [diagramName, setDiagramName] = useState("Main architecture");
  const [navigation, setNavigation] = useState<"home" | "recent" | "favorites">("home");
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [extraWorkspaces, setExtraWorkspaces] = useState<ExtraWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("collie");
  const [workflows, setWorkflows] = useState<WorkflowMeta[]>(defaultWorkflows);
  const [activeWorkflowId, setActiveWorkflowId] = useState("main");

  const readWorkflows = (workspaceId: string) => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(workflowIndexKey(workspaceId)) ?? "[]") as WorkflowMeta[];
      return stored.length ? stored : defaultWorkflows;
    } catch {
      return defaultWorkflows;
    }
  };

  const saveWorkflows = (workspaceId: string, next: WorkflowMeta[]) => {
    window.localStorage.setItem(workflowIndexKey(workspaceId), JSON.stringify(next));
    void fetch(workspaceApiUrl(workspaceId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflows: next }),
    });
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
      window.localStorage.setItem("collieai-extra-workspaces-v1", JSON.stringify(normalized));
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
      setNodes(localNodes);
      setDiagramName(localName || "Main architecture");
      try {
        const response = await fetch(workspaceApiUrl(targetId));
        const body = await response.json();
        const cloud = body.data as { workspace?: WorkspaceMeta; workflows?: WorkflowMeta[]; diagrams?: Record<string, { nodes?: StoredNode[] }>; pages?: { id?: string; name?: string }[] } | null;
        if (cloud?.workflows?.length) {
          setWorkflows(cloud.workflows);
          window.localStorage.setItem(workflowIndexKey(targetId), JSON.stringify(cloud.workflows));
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
        setNodes(cloudNodes.length ? cloudNodes : localNodes);
        setDiagramName(pageName || localName || "Main architecture");
      } catch { /* Keep the local preview while offline. */ }
      setWorkspaceReady(true);
    };
    void loadWorkspace();
  }, []);

  useEffect(() => {
    if (!workspaceReady) return;
    window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(collieMeta));
    void fetch(workspaceApiUrl("collie"), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace: collieMeta }) });
  }, [collieMeta, workspaceReady]);

  useEffect(() => {
    if (workspaceReady && selectedWorkspaceId !== "collie") {
      void fetch(workspaceApiUrl(selectedWorkspaceId), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace }) });
    }
  }, [workspace, workspaceReady, selectedWorkspaceId]);

  const createWorkspace = async () => {
    const name = window.prompt("Name your new workspace");
    if (!name?.trim()) return;
    const workspace = { id: `workspace-${Date.now()}`, name: name.trim(), favorite: false };
    setExtraWorkspaces((current) => {
      const next = [...current, workspace];
      window.localStorage.setItem("collieai-extra-workspaces-v1", JSON.stringify(next));
      return next;
    });
    window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace.id);
    window.localStorage.setItem(ACTIVE_WORKSPACE_OWNER_KEY, workspace.id);
    window.localStorage.setItem(ACTIVE_WORKFLOW_KEY, "main");
    window.localStorage.setItem(ACTIVE_WORKFLOW_NAME_KEY, defaultWorkflows[0].name);
    await fetch(workspaceApiUrl(workspace.id), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace: { name: workspace.name, favorite: false }, workflows: defaultWorkflows, pages: [{ id: "main", name: "Main architecture" }], trashedPages: [], activePageId: "main", diagrams: { main: { nodes: [], edges: [] } } }) });
    onOpenWorkspace();
  };

const selectWorkspace = async (id: string, fallbackName: string, fallbackFavorite = false) => {
    window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
    window.localStorage.setItem(ACTIVE_WORKSPACE_OWNER_KEY, id);
    window.localStorage.setItem(ACTIVE_WORKFLOW_KEY, "main");
    window.localStorage.setItem(ACTIVE_WORKFLOW_NAME_KEY, defaultWorkflows[0].name);
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
    setNodes(localNodes);
    setDiagramName(readLocalDiagramName(id) || "Main architecture");
    try {
      const response = await fetch(workspaceApiUrl(id));
      const cloud = (await response.json()).data as { workspace?: WorkspaceMeta; workflows?: WorkflowMeta[]; diagrams?: Record<string, { nodes?: StoredNode[] }>; pages?: { id?: string; name?: string }[] } | null;
      if (cloud?.workflows?.length) {
        setWorkflows(cloud.workflows);
        window.localStorage.setItem(workflowIndexKey(id), JSON.stringify(cloud.workflows));
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
      setNodes(cloudNodes.length ? cloudNodes : localNodes);
      setDiagramName(cloud?.pages?.find((page) => page.id === "main")?.name || readLocalDiagramName(id) || "Main architecture");
    } catch { /* The empty workspace remains usable offline. */ }
  };

  const createWorkflow = async () => {
    const name = window.prompt("Name your new workflow", `Workflow ${workflows.length + 1}`);
    if (!name?.trim()) return;
    const workflow: WorkflowMeta = { id: `workflow-${Date.now()}`, name: name.trim() };
    const next = [...workflows, workflow];
    saveWorkflows(selectedWorkspaceId, next);
    setWorkflows(next);
    setActiveWorkflowId(workflow.id);
    window.localStorage.setItem(ACTIVE_WORKSPACE_OWNER_KEY, selectedWorkspaceId);
    window.localStorage.setItem(ACTIVE_WORKFLOW_KEY, workflow.id);
    window.localStorage.setItem(ACTIVE_WORKFLOW_NAME_KEY, workflow.name);
    window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, workflowWorkspaceId(selectedWorkspaceId, workflow.id));
    await fetch(workspaceApiUrl(workflowWorkspaceId(selectedWorkspaceId, workflow.id)), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace: { name: `${workspace.name} · ${workflow.name}`, favorite: false },
        pages: [{ id: "main", name: "Main architecture" }],
        trashedPages: [],
        activePageId: "main",
        diagrams: { main: { nodes: [], edges: [] } },
      }),
    });
    onOpenWorkspace();
  };

  const openWorkflow = (workflow: WorkflowMeta) => {
    setActiveWorkflowId(workflow.id);
    window.localStorage.setItem(ACTIVE_WORKSPACE_OWNER_KEY, selectedWorkspaceId);
    window.localStorage.setItem(ACTIVE_WORKFLOW_KEY, workflow.id);
    window.localStorage.setItem(ACTIVE_WORKFLOW_NAME_KEY, workflow.name);
    window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, workflowWorkspaceId(selectedWorkspaceId, workflow.id));
    onOpenWorkspace();
  };

  const renameWorkflow = (workflow: WorkflowMeta) => {
    const name = window.prompt("Rename workflow", workflow.name);
    if (!name?.trim() || name.trim() === workflow.name) return;
    const next = workflows.map((item) => item.id === workflow.id ? { ...item, name: name.trim() } : item);
    setWorkflows(next);
    saveWorkflows(selectedWorkspaceId, next);
    if (workflow.id === activeWorkflowId) window.localStorage.setItem(ACTIVE_WORKFLOW_NAME_KEY, name.trim());
  };

  const matchesSearch = !query.trim() || workflows.some((workflow) => workflow.name.toLowerCase().includes(query.trim().toLowerCase()));
  const workflowNodes = (workflow: WorkflowMeta) => {
    if (!workspaceReady) return [];
    const storedNodes = readLocalDiagramNodes(workflowWorkspaceId(selectedWorkspaceId, workflow.id));
    return storedNodes.length || workflow.id !== activeWorkflowId ? storedNodes : nodes;
  };
  const workflowComponentCount = (workflow: WorkflowMeta) => workflowNodes(workflow).length;
  const workflowPageCount = (workflow: WorkflowMeta) =>
    workspaceReady ? readLocalPageCount(workflowWorkspaceId(selectedWorkspaceId, workflow.id)) : 0;
  const totalWorkflowComponents = workflows.reduce((total, workflow) => total + workflowComponentCount(workflow), 0);
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
        window.localStorage.setItem("collieai-extra-workspaces-v1", JSON.stringify(next));
        return next;
      });
      if (selectedWorkspaceId === id) setWorkspace((current) => ({ ...current, name: nextName }));
      void fetch(workspaceApiUrl(id), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace: { name: nextName, favorite: existing?.favorite ?? false } }) });
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
        window.localStorage.setItem("collieai-extra-workspaces-v1", JSON.stringify(next));
        return next;
      });
      if (selectedWorkspaceId === id) setWorkspace((cur) => ({ ...cur, favorite }));
      void fetch(workspaceApiUrl(id), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace: { name: current.name, favorite } }) });
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
        <div className="workspace-heading"><span>WORKSPACES</span><button onClick={createWorkspace} aria-label="Create workspace"><Plus size={14} /></button></div>
        {[{ id: "collie", name: collieMeta.name, favorite: collieMeta.favorite, rowClass: "workspace-single", isMain: true }, ...extraWorkspaces.map((item) => ({ id: item.id, name: item.name, favorite: item.favorite, rowClass: "extra-workspace", isMain: false }))].map((row) => {
          const isActive = selectedWorkspaceId === row.id;
          const isRenaming = renamingId === row.id;
          return (
            <div key={row.id} className={`${row.rowClass} ${isActive ? "is-active" : ""}`} onClick={() => void selectWorkspace(row.id, row.name, row.favorite)}>
              <span className="workspace-icon"><Layers3 size={15} /></span>
              <span className="workspace-name">
                {isRenaming ? (
                  <input value={draftName} onChange={(event) => setDraftName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveWorkspaceName(); if (event.key === "Escape") setRenamingId(null); }} autoFocus aria-label="Workspace name" />
                ) : <strong>{row.name}</strong>}
                <small>{row.isMain ? `${workflows.length} workflows · ${totalWorkflowComponents} components` : "New workspace"}</small>
              </span>
              {isRenaming ? <><button onClick={(event) => { event.stopPropagation(); saveWorkspaceName(); }} aria-label="Save workspace name"><Check size={14} /></button><button onClick={(event) => { event.stopPropagation(); setRenamingId(null); }} aria-label="Cancel renaming"><X size={14} /></button></> : <button onClick={(event) => { event.stopPropagation(); startRenaming(row.id, row.name); }} aria-label={`Rename ${row.name} workspace`}><Pencil size={14} /></button>}
              <button className={`workspace-star ${row.favorite ? "is-favorite" : ""}`} onClick={(event) => { event.stopPropagation(); toggleFavorite(row.id); }} aria-label={row.favorite ? "Remove workspace from favorites" : "Add workspace to favorites"}><Star size={15} fill={row.favorite ? "currentColor" : "none"} /></button>
            </div>
          );
        })}
        <button className="create-workspace-link" onClick={createWorkspace}><Plus size={15} /> Create workspace</button>
        <div className="home-profile"><span className="profile-avatar">YY</span><span><strong>Yen Yen</strong><small>Personal workspace</small></span><Settings2 size={16} /></div>
      </aside>

      <section className="home-main">
        <header className="home-topbar"><div><p>WORKSPACE</p><h1>{workspace.name}</h1></div><label className="home-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your diagrams" aria-label="Search diagrams" /></label></header>
        <section className="workspace-hero"><div><span className="eyebrow"><Network size={14} /> {workspace.name.toUpperCase()} WORKSPACE</span><h2>Your architecture,<br />all in one place.</h2><p>This workspace contains your live CollieAI diagram. Its preview below follows the components currently saved in the canvas.</p><button onClick={onOpenWorkspace}>Open {workspace.name} <ArrowRight size={16} /></button></div><div className="hero-map" aria-hidden="true"><span className="hero-orbit orbit-one" /><span className="hero-orbit orbit-two" /><span className="hero-core"><img src={lemmaLogo.src} alt="" /></span><span className="hero-dot dot-one" /><span className="hero-dot dot-two" /><span className="hero-dot dot-three" /></div></section>
        <section className="project-library solo-library">
          <div className="library-toolbar"><div className="library-tabs" role="tablist"><button className={view === "recent" ? "active" : ""} onClick={() => setView("recent")}>Recently viewed</button><button className={view === "favorites" ? "active" : ""} onClick={() => setView("favorites")}>Favorites</button></div><div className="display-toggle"><button className={display === "grid" ? "active" : ""} onClick={() => setDisplay("grid")} aria-label="Grid view"><Grid2X2 size={15} /></button><button className={display === "list" ? "active" : ""} onClick={() => setDisplay("list")} aria-label="List view"><List size={16} /></button></div></div>
          {display === "list" && workflows.length && matchesSearch ? <div className="workflow-list"><div className="workflow-list-head"><span>Name</span><span>Workspace</span><span>Last modified</span><span>Pages</span><span>Created by</span><span>Action</span></div>{workflows.filter((workflow) => !query.trim() || workflow.name.toLowerCase().includes(query.trim().toLowerCase())).map((workflow) => <article className="workflow-list-row" key={workflow.id}><button className="workflow-list-name" onClick={() => openWorkflow(workflow)}><span className="workflow-list-preview"><ActualDiagramPreview nodes={workflowNodes(workflow)} /></span><strong>{workflow.name}</strong></button><span>{workspace.name}</span><span>Recently edited</span><span>{workflowPageCount(workflow)} {workflowPageCount(workflow) === 1 ? "page" : "pages"}</span><span>Yen Yen</span><button className="workflow-list-action" onClick={() => renameWorkflow(workflow)} aria-label={`Rename ${workflow.name} workflow`}>•••</button></article>)}</div> : null}
          {display === "grid" && workflows.length && matchesSearch ? <div className="project-grid">{workflows.filter((workflow) => !query.trim() || workflow.name.toLowerCase().includes(query.trim().toLowerCase())).map((workflow) => {
            const isActive = workflow.id === activeWorkflowId;
            const itemNodes = workflowNodes(workflow);
            return <article className="project-card" key={workflow.id}><button className="project-open" onClick={() => openWorkflow(workflow)} aria-label={`Open ${workflow.name} workflow`}><ActualDiagramPreview nodes={itemNodes} /></button><div className="project-card-body"><span className="project-kind tone-cyan"><Folder size={13} /> WORKFLOW</span><div className="project-title-row"><button onClick={() => openWorkflow(workflow)}>{workflow.name}</button><button className="workflow-rename" onClick={() => renameWorkflow(workflow)} aria-label={`Rename ${workflow.name} workflow`}><Pencil size={14} /></button>{isActive ? <span className="workflow-active-label">Open</span> : null}</div><p>{workflow.id === "main" ? "This workflow contains the existing pages in your workspace." : "A separate empty workflow with its own pages and components."}</p><footer><span>{workflow.id === "main" ? (diagramName || "Main architecture") : "Empty workflow"}</span><span>{workflowPageCount(workflow)} {workflowPageCount(workflow) === 1 ? "page" : "pages"}</span><span>{workflowComponentCount(workflow)} components</span></footer></div></article>;
          })}<button className="workflow-create-tile" onClick={createWorkflow} aria-label="Create workflow"><span><Plus size={22} /></span><strong>New workflow</strong><small>Create an empty workflow</small></button></div> : <div className="empty-library"><Layers3 size={22} /><strong>{query ? "No matching workflows" : "This workspace is empty"}</strong><p>{query ? "Try a different search." : "Create a workflow to start a new diagram."}</p></div>}
          {false ? <div className={`project-grid single-project ${display === "list" ? "is-list" : ""}`}>{visibleWorkspaces.map((item) => {
            const isSelected = item.id === selectedWorkspaceId;
            const itemNodes = isSelected ? nodes : [];
            return <article className="project-card" key={item.id}><button className="project-open" onClick={() => { if (isSelected) onOpenWorkspace(); else void selectWorkspace(item.id, item.name, item.favorite); }} aria-label={`Open ${item.name} workspace`}><ActualDiagramPreview nodes={itemNodes} /></button><div className="project-card-body"><span className="project-kind tone-cyan"><Folder size={13} /> LIVE DIAGRAM</span><div className="project-title-row"><button onClick={() => { if (isSelected) onOpenWorkspace(); else void selectWorkspace(item.id, item.name, item.favorite); }}>{item.name}</button><button className="favorite-button is-favorite" onClick={() => toggleFavorite(item.id)} aria-label="Remove workspace from favorites"><Star size={16} fill="currentColor" /></button></div><p>{isSelected ? "Preview generated from the components in this workspace." : "Select this workspace to view its live diagram."}</p><footer><span>{isSelected ? (diagramName || `${item.name} · Main architecture`) : `${item.name} workspace`}</span><span>{isSelected ? `${nodes.length} components` : "Favorite workspace"}</span></footer></div></article>;
          })}</div> : null}
        </section>
      </section>
    </main>
  );
}
