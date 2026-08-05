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

type HomeView = "recent" | "favorites";
type StoredNode = { id: string; position?: { x: number; y: number }; data?: { label?: string } };
type WorkspaceMeta = { name: string; favorite: boolean };
type ExtraWorkspace = { id: string; name: string; favorite: boolean };

const WORKSPACE_KEY = "collieai-workspace-home-v1";
const PAGE_KEY = "collieai-architecture-page-main";
const PAGE_INDEX_KEY = "collieai-architecture-pages-v1";
const defaultWorkspace: WorkspaceMeta = { name: "Collie", favorite: false };

function ActualDiagramPreview({ nodes }: { nodes: StoredNode[] }) {
  if (!nodes.length) {
    return (
      <div className="home-diagram-preview empty-preview">
        <Network size={25} />
        <span>Open the workspace to load its diagram preview</span>
      </div>
    );
  }

  const minX = Math.min(...nodes.map((node) => node.position?.x ?? 0));
  const maxX = Math.max(...nodes.map((node) => node.position?.x ?? 0));
  const minY = Math.min(...nodes.map((node) => node.position?.y ?? 0));
  const maxY = Math.max(...nodes.map((node) => node.position?.y ?? 0));
  const rangeX = Math.max(1, maxX - minX);
  const rangeY = Math.max(1, maxY - minY);
  const shownNodes = nodes.slice(0, 18);

  return (
    <div className="home-diagram-preview live-preview" aria-label="Live preview of the current architecture diagram">
      <span className="preview-watermark">LIVE CANVAS</span>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {shownNodes.slice(1).map((node, index) => {
          const previous = shownNodes[index];
          const x1 = 9 + (((previous.position?.x ?? 0) - minX) / rangeX) * 82;
          const y1 = 11 + (((previous.position?.y ?? 0) - minY) / rangeY) * 76;
          const x2 = 9 + (((node.position?.x ?? 0) - minX) / rangeX) * 82;
          const y2 = 11 + (((node.position?.y ?? 0) - minY) / rangeY) * 76;
          return <line key={`${previous.id}-${node.id}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </svg>
      {shownNodes.map((node, index) => {
        const left = 5 + (((node.position?.x ?? 0) - minX) / rangeX) * 76;
        const top = 8 + (((node.position?.y ?? 0) - minY) / rangeY) * 72;
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

  useEffect(() => {
    const loadWorkspace = async () => {
      const savedWorkspace = window.localStorage.getItem(WORKSPACE_KEY);
      let localWorkspace = defaultWorkspace;
      let localNodes: StoredNode[] = [];
      let localDiagramName = "Main architecture";
      if (savedWorkspace) {
      try {
        const parsed = JSON.parse(savedWorkspace) as WorkspaceMeta;
        if (parsed.name?.trim()) {
            localWorkspace = parsed;
        }
      } catch { /* Use the default workspace when legacy storage cannot be read. */ }
      }
      try {
        const storedPage = JSON.parse(window.localStorage.getItem(PAGE_KEY) ?? "{}");
        localNodes = Array.isArray(storedPage.nodes) ? storedPage.nodes : [];
        const index = JSON.parse(window.localStorage.getItem(PAGE_INDEX_KEY) ?? "{}");
        const mainPage = Array.isArray(index.pages) ? index.pages.find((page: { id?: string }) => page.id === "main") : null;
        if (mainPage?.name) localDiagramName = mainPage.name;
      } catch { /* The empty-state preview explains what to do next. */ }
      let cloudData: { workspace?: WorkspaceMeta; diagrams?: Record<string, { nodes?: StoredNode[] }>; pages?: { id?: string; name?: string }[] } | null = null;
      try {
        const response = await fetch("/api/workspace");
        const body = await response.json();
        cloudData = body.data;
      } catch { /* Keep the local workspace available while offline. */ }
      const cloudMain = cloudData?.diagrams?.main;
      const cloudMainPage = cloudData?.pages?.find((page) => page.id === "main");
      const nextWorkspace = cloudData?.workspace?.name ? cloudData.workspace : localWorkspace;
      setWorkspace(nextWorkspace);
      setCollieMeta(nextWorkspace);
      setDraftName(nextWorkspace.name);
      setNodes(Array.isArray(cloudMain?.nodes) ? cloudMain.nodes : localNodes);
      setDiagramName(cloudMainPage?.name || localDiagramName);
      setWorkspaceReady(true);
    };
    void loadWorkspace();
    try {
      const savedExtras = JSON.parse(window.localStorage.getItem("collieai-extra-workspaces-v1") ?? "[]") as Array<ExtraWorkspace | string>;
      const normalized = savedExtras.map((item, index) => {
        const base = typeof item === "string" ? { id: `legacy-workspace-${index}`, name: item } : item;
        return { ...base, favorite: Boolean((base as ExtraWorkspace).favorite) };
      }).filter((item) => item.id && item.name);
      setExtraWorkspaces(normalized);
      window.localStorage.setItem("collieai-extra-workspaces-v1", JSON.stringify(normalized));
    } catch { /* no extra workspaces yet */ }
  }, []);

  useEffect(() => {
    if (!workspaceReady) return;
    window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(collieMeta));
    void fetch(`/api/workspace?id=collie`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace: collieMeta }) });
  }, [collieMeta, workspaceReady]);

  useEffect(() => {
    if (workspaceReady && selectedWorkspaceId !== "collie") {
      void fetch(`/api/workspace?id=${selectedWorkspaceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace }) });
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
    window.localStorage.setItem("collieai-active-workspace-v1", workspace.id);
    await fetch(`/api/workspace?id=${workspace.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace: { name: workspace.name, favorite: false }, pages: [{ id: "main", name: "Main architecture" }], trashedPages: [], activePageId: "main", diagrams: { main: { nodes: [], edges: [] } } }) });
    onOpenWorkspace();
  };

  const selectWorkspace = async (id: string, fallbackName: string, fallbackFavorite = false) => {
    window.localStorage.setItem("collieai-active-workspace-v1", id);
    setSelectedWorkspaceId(id);
    setRenamingId(null);
    if (id === "collie") {
      setWorkspace(collieMeta);
      setDraftName(collieMeta.name);
    } else {
      setWorkspace({ name: fallbackName, favorite: fallbackFavorite });
    }
    setNodes([]);
    setDiagramName("Main architecture");
    try {
      const response = await fetch(`/api/workspace?id=${id}`);
      const cloud = (await response.json()).data as { workspace?: WorkspaceMeta; diagrams?: Record<string, { nodes?: StoredNode[] }>; pages?: { id?: string; name?: string }[] } | null;
      const main = cloud?.diagrams?.main;
      if (id === "collie") {
        const next = cloud?.workspace?.name ? cloud.workspace : collieMeta;
        setCollieMeta(next);
        setWorkspace(next);
        setDraftName(next.name);
      } else {
        setWorkspace({ name: fallbackName, favorite: fallbackFavorite });
      }
      setNodes(Array.isArray(main?.nodes) ? main.nodes : []);
      setDiagramName(cloud?.pages?.find((page) => page.id === "main")?.name || "Main architecture");
    } catch { /* The empty workspace remains usable offline. */ }
  };

  const matchesSearch = !query.trim() || diagramName.toLowerCase().includes(query.trim().toLowerCase());
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
      void fetch(`/api/workspace?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace: { name: nextName, favorite: existing?.favorite ?? false } }) });
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
      void fetch(`/api/workspace?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace: { name: current.name, favorite } }) });
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
                <small>{row.isMain ? `1 workspace · ${nodes.length} components` : "New workspace"}</small>
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
        <section className="workspace-hero"><div><span className="eyebrow"><Network size={14} /> {workspace.name.toUpperCase()} WORKSPACE</span><h2>Your architecture,<br />all in one place.</h2><p>This workspace contains your live CollieAI diagram. Its preview below follows the components currently saved in the canvas.</p><button onClick={onOpenWorkspace}>Open {workspace.name} <ArrowRight size={16} /></button></div><div className="hero-map" aria-hidden="true"><span className="hero-orbit orbit-one" /><span className="hero-orbit orbit-two" /><span className="hero-core"><Network size={31} /></span><span className="hero-dot dot-one" /><span className="hero-dot dot-two" /><span className="hero-dot dot-three" /></div></section>
        <section className="project-library solo-library">
          <div className="library-toolbar"><div className="library-tabs" role="tablist"><button className={view === "recent" ? "active" : ""} onClick={() => setView("recent")}>Recently viewed</button><button className={view === "favorites" ? "active" : ""} onClick={() => setView("favorites")}>Favorites</button></div><div className="display-toggle"><button className={display === "grid" ? "active" : ""} onClick={() => setDisplay("grid")} aria-label="Grid view"><Grid2X2 size={15} /></button><button className={display === "list" ? "active" : ""} onClick={() => setDisplay("list")} aria-label="List view"><List size={16} /></button></div></div>
          {visibleWorkspaces.length && matchesSearch ? <div className={`project-grid single-project ${display === "list" ? "is-list" : ""}`}>{visibleWorkspaces.map((item) => {
            const isSelected = item.id === selectedWorkspaceId;
            const itemNodes = isSelected ? nodes : [];
            return <article className="project-card" key={item.id}><button className="project-open" onClick={() => { if (isSelected) onOpenWorkspace(); else void selectWorkspace(item.id, item.name, item.favorite); }} aria-label={`Open ${item.name} workspace`}><ActualDiagramPreview nodes={itemNodes} /></button><div className="project-card-body"><span className="project-kind tone-cyan"><Folder size={13} /> LIVE DIAGRAM</span><div className="project-title-row"><button onClick={() => { if (isSelected) onOpenWorkspace(); else void selectWorkspace(item.id, item.name, item.favorite); }}>{isSelected ? diagramName : item.name}</button><button className="favorite-button is-favorite" onClick={() => toggleFavorite(item.id)} aria-label="Remove workspace from favorites"><Star size={16} fill="currentColor" /></button></div><p>{isSelected ? "Preview generated from the components in this workspace." : "Select this workspace to view its live diagram."}</p><footer><span>{item.name} workspace</span><span>{isSelected ? `${nodes.length} components` : "Favorite workspace"}</span></footer></div></article>;
          })}</div> : <div className="empty-library"><Layers3 size={22} /><strong>{query ? "No matching diagrams" : view === "favorites" ? "No favorite workspaces" : "This workspace is empty"}</strong><p>{query ? "Try a different search." : view === "favorites" ? "Star a workspace to keep it here." : "Open this workspace to create its first diagram."}</p></div>}
        </section>
      </section>
    </main>
  );
}
