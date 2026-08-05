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
  Search,
  Settings2,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type HomeView = "recent" | "favorites";
type StoredNode = { id: string; position?: { x: number; y: number }; data?: { label?: string } };
type WorkspaceMeta = { name: string; favorite: boolean };

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
  const [draftName, setDraftName] = useState(defaultWorkspace.name);
  const [renaming, setRenaming] = useState(false);
  const [nodes, setNodes] = useState<StoredNode[]>([]);
  const [diagramName, setDiagramName] = useState("Main architecture");

  useEffect(() => {
    const savedWorkspace = window.localStorage.getItem(WORKSPACE_KEY);
    if (savedWorkspace) {
      try {
        const parsed = JSON.parse(savedWorkspace) as WorkspaceMeta;
        if (parsed.name?.trim()) {
          setWorkspace(parsed);
          setDraftName(parsed.name);
        }
      } catch { /* Use the default workspace when legacy storage cannot be read. */ }
    }
    try {
      const storedPage = JSON.parse(window.localStorage.getItem(PAGE_KEY) ?? "{}");
      setNodes(Array.isArray(storedPage.nodes) ? storedPage.nodes : []);
      const index = JSON.parse(window.localStorage.getItem(PAGE_INDEX_KEY) ?? "{}");
      const mainPage = Array.isArray(index.pages) ? index.pages.find((page: { id?: string }) => page.id === "main") : null;
      if (mainPage?.name) setDiagramName(mainPage.name);
    } catch { /* The empty-state preview explains what to do next. */ }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  }, [workspace]);

  const showsWorkspace = view === "recent" || workspace.favorite;
  const matchesSearch = !query.trim() || diagramName.toLowerCase().includes(query.trim().toLowerCase());
  const showDiagram = showsWorkspace && matchesSearch;

  const saveWorkspaceName = () => {
    const nextName = draftName.trim() || defaultWorkspace.name;
    setWorkspace((current) => ({ ...current, name: nextName }));
    setDraftName(nextName);
    setRenaming(false);
  };

  return (
    <main className="home-shell">
      <aside className="home-sidebar">
        <div className="home-brand"><span><Network size={19} /></span><strong>LemmaAI</strong></div>
        <button className="home-create" onClick={onOpenWorkspace}>Open workspace <ArrowRight size={16} /></button>
        <nav className="home-navigation" aria-label="Home navigation">
          <button className="active"><Home size={17} /> Home</button>
          <button onClick={() => setView("recent")}><Clock3 size={17} /> Recent</button>
          <button onClick={() => setView("favorites")}><Star size={17} /> Favorites</button>
        </nav>
        <div className="workspace-heading"><span>WORKSPACE</span></div>
        <div className="workspace-single">
          <span className="workspace-icon"><Layers3 size={15} /></span>
          <span className="workspace-name">
            {renaming ? (
              <input value={draftName} onChange={(event) => setDraftName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveWorkspaceName(); if (event.key === "Escape") { setDraftName(workspace.name); setRenaming(false); } }} autoFocus aria-label="Workspace name" />
            ) : <strong>{workspace.name}</strong>}
            <small>1 workspace · {nodes.length} components</small>
          </span>
          {renaming ? <><button onClick={saveWorkspaceName} aria-label="Save workspace name"><Check size={14} /></button><button onClick={() => { setDraftName(workspace.name); setRenaming(false); }} aria-label="Cancel renaming"><X size={14} /></button></> : <button onClick={() => setRenaming(true)} aria-label="Rename workspace"><Pencil size={14} /></button>}
          <button className={`workspace-star ${workspace.favorite ? "is-favorite" : ""}`} onClick={() => setWorkspace((current) => ({ ...current, favorite: !current.favorite }))} aria-label={workspace.favorite ? "Remove workspace from favorites" : "Add workspace to favorites"}><Star size={15} fill={workspace.favorite ? "currentColor" : "none"} /></button>
        </div>
        <div className="home-profile"><span className="profile-avatar">YY</span><span><strong>Yen Yen</strong><small>Personal workspace</small></span><Settings2 size={16} /></div>
      </aside>

      <section className="home-main">
        <header className="home-topbar"><div><p>WORKSPACE</p><h1>{workspace.name}</h1></div><label className="home-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your diagrams" aria-label="Search diagrams" /></label></header>
        <section className="workspace-hero"><div><span className="eyebrow"><Network size={14} /> {workspace.name.toUpperCase()} WORKSPACE</span><h2>Your architecture,<br />all in one place.</h2><p>This workspace contains your live CollieAI diagram. Its preview below follows the components currently saved in the canvas.</p><button onClick={onOpenWorkspace}>Open {workspace.name} <ArrowRight size={16} /></button></div><div className="hero-map" aria-hidden="true"><span className="hero-orbit orbit-one" /><span className="hero-orbit orbit-two" /><span className="hero-core"><Network size={31} /></span><span className="hero-dot dot-one" /><span className="hero-dot dot-two" /><span className="hero-dot dot-three" /></div></section>
        <section className="project-library solo-library">
          <div className="library-toolbar"><div className="library-tabs" role="tablist"><button className={view === "recent" ? "active" : ""} onClick={() => setView("recent")}>Recently viewed</button><button className={view === "favorites" ? "active" : ""} onClick={() => setView("favorites")}>Favorites</button></div><div className="display-toggle"><button className={display === "grid" ? "active" : ""} onClick={() => setDisplay("grid")} aria-label="Grid view"><Grid2X2 size={15} /></button><button className={display === "list" ? "active" : ""} onClick={() => setDisplay("list")} aria-label="List view"><List size={16} /></button></div></div>
          {showDiagram ? <div className={`project-grid single-project ${display === "list" ? "is-list" : ""}`}><article className="project-card"><button className="project-open" onClick={onOpenWorkspace} aria-label={`Open ${diagramName}`}><ActualDiagramPreview nodes={nodes} /></button><div className="project-card-body"><span className="project-kind tone-cyan"><Folder size={13} /> LIVE DIAGRAM</span><div className="project-title-row"><button onClick={onOpenWorkspace}>{diagramName}</button><button className={`favorite-button ${workspace.favorite ? "is-favorite" : ""}`} onClick={() => setWorkspace((current) => ({ ...current, favorite: !current.favorite }))} aria-label={workspace.favorite ? "Remove workspace from favorites" : "Add workspace to favorites"}><Star size={16} fill={workspace.favorite ? "currentColor" : "none"} /></button></div><p>Preview generated from the components in your saved canvas.</p><footer><span>Collie workspace</span><span>{nodes.length} components</span></footer></div></article></div> : <div className="empty-library"><Star size={22} /><strong>{query ? "No matching diagrams" : "This workspace is not a favorite yet"}</strong><p>{query ? "Try a different search." : "Click the star beside Collie to add it here."}</p></div>}
        </section>
      </section>
    </main>
  );
}
