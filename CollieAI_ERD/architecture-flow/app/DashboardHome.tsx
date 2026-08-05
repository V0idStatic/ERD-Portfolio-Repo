"use client";

import {
  ArrowRight,
  Clock3,
  Folder,
  FolderPlus,
  Grid2X2,
  Heart,
  Home,
  Layers3,
  List,
  MoreHorizontal,
  Network,
  Plus,
  Search,
  Settings2,
  Star,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

type HomeView = "recent" | "favorites";

type ProjectCard = {
  id: string;
  title: string;
  description: string;
  edited: string;
  favorite: boolean;
  tone: "cyan" | "violet" | "amber";
  nodes: number;
};

const initialProjects: ProjectCard[] = [
  {
    id: "main",
    title: "CollieAI system architecture",
    description: "Complete adaptive learning platform flow",
    edited: "Edited just now",
    favorite: true,
    tone: "cyan",
    nodes: 18,
  },
  {
    id: "tutoring",
    title: "Adaptive tutoring loop",
    description: "Session, orchestration, and AI routing",
    edited: "Edited 2 days ago",
    favorite: false,
    tone: "violet",
    nodes: 11,
  },
  {
    id: "auth",
    title: "Authentication & storage",
    description: "Identity, permissions, and data services",
    edited: "Edited last week",
    favorite: true,
    tone: "amber",
    nodes: 8,
  },
];

function DiagramPreview({ tone }: { tone: ProjectCard["tone"] }) {
  return (
    <div className={`home-diagram-preview tone-${tone}`} aria-hidden="true">
      <span className="preview-node preview-node-a" />
      <span className="preview-node preview-node-b" />
      <span className="preview-node preview-node-c" />
      <span className="preview-node preview-node-d" />
      <i className="preview-line preview-line-a" />
      <i className="preview-line preview-line-b" />
      <i className="preview-line preview-line-c" />
    </div>
  );
}

export default function DashboardHome({ onOpenWorkspace }: { onOpenWorkspace: () => void }) {
  const [view, setView] = useState<HomeView>("recent");
  const [query, setQuery] = useState("");
  const [display, setDisplay] = useState<"grid" | "list">("grid");
  const [projects, setProjects] = useState(initialProjects);

  const visibleProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesView = view === "recent" || project.favorite;
      const matchesQuery =
        !normalized ||
        project.title.toLowerCase().includes(normalized) ||
        project.description.toLowerCase().includes(normalized);
      return matchesView && matchesQuery;
    });
  }, [projects, query, view]);

  const toggleFavorite = (id: string) => {
    setProjects((current) =>
      current.map((project) =>
        project.id === id ? { ...project, favorite: !project.favorite } : project,
      ),
    );
  };

  return (
    <main className="home-shell">
      <aside className="home-sidebar">
        <div className="home-brand">
          <span><Network size={19} /></span>
          <strong>LemmaAI</strong>
        </div>

        <button className="home-create" onClick={onOpenWorkspace}>
          <Plus size={17} /> New diagram
        </button>

        <nav className="home-navigation" aria-label="Home navigation">
          <button className="active"><Home size={17} /> Home</button>
          <button onClick={() => setView("recent")}><Clock3 size={17} /> Recent</button>
          <button onClick={() => setView("favorites")}><Star size={17} /> Favorites</button>
        </nav>

        <div className="workspace-heading">
          <span>WORKSPACES</span>
          <button aria-label="Create workspace"><Plus size={14} /></button>
        </div>
        <nav className="home-navigation workspace-list" aria-label="Workspaces">
          <button className="workspace-active">
            <span className="workspace-icon"><Layers3 size={15} /></span>
            <span><strong>My workspace</strong><small>3 diagrams</small></span>
          </button>
          <button>
            <span className="workspace-icon shared"><Users size={15} /></span>
            <span><strong>Shared with me</strong><small>Team projects</small></span>
          </button>
        </nav>

        <div className="home-profile">
          <span className="profile-avatar">YY</span>
          <span><strong>Yen Yen</strong><small>Personal workspace</small></span>
          <Settings2 size={16} />
        </div>
      </aside>

      <section className="home-main">
        <header className="home-topbar">
          <div>
            <p>MY WORKSPACE</p>
            <h1>Welcome back, Yen.</h1>
          </div>
          <label className="home-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search diagrams"
              aria-label="Search diagrams"
            />
          </label>
        </header>

        <section className="workspace-hero">
          <div>
            <span className="eyebrow"><Network size={14} /> ARCHITECTURE WORKSPACE</span>
            <h2>Map the system.<br />Make it understandable.</h2>
            <p>Build, connect, and present every layer of your product architecture in one focused canvas.</p>
            <button onClick={onOpenWorkspace}>Open workspace <ArrowRight size={16} /></button>
          </div>
          <div className="hero-map" aria-hidden="true">
            <span className="hero-orbit orbit-one" />
            <span className="hero-orbit orbit-two" />
            <span className="hero-core"><Network size={31} /></span>
            <span className="hero-dot dot-one" />
            <span className="hero-dot dot-two" />
            <span className="hero-dot dot-three" />
          </div>
        </section>

        <section className="quick-start">
          <div className="section-heading">
            <div><p>QUICK START</p><h2>Start with a clear canvas</h2></div>
          </div>
          <div className="quick-start-grid">
            <button className="new-diagram-card" onClick={onOpenWorkspace}>
              <span><Plus size={22} /></span>
              <strong>Blank architecture</strong>
              <small>Start from scratch</small>
            </button>
            <button className="template-card" onClick={onOpenWorkspace}>
              <span className="template-preview service-template"><i /><i /><i /></span>
              <strong>Service map</strong>
              <small>Frontend, API, and data layers</small>
            </button>
            <button className="template-card" onClick={onOpenWorkspace}>
              <span className="template-preview flow-template"><i /><i /><i /></span>
              <strong>AI workflow</strong>
              <small>Model routing and orchestration</small>
            </button>
            <button className="template-card browse-template">
              <span><FolderPlus size={20} /></span>
              <strong>Browse templates</strong>
              <small>Explore the full library</small>
            </button>
          </div>
        </section>

        <section className="project-library">
          <div className="library-toolbar">
            <div className="library-tabs" role="tablist">
              <button className={view === "recent" ? "active" : ""} onClick={() => setView("recent")}>
                Recently viewed
              </button>
              <button className={view === "favorites" ? "active" : ""} onClick={() => setView("favorites")}>
                Favorites
              </button>
            </div>
            <div className="display-toggle">
              <button className={display === "grid" ? "active" : ""} onClick={() => setDisplay("grid")} aria-label="Grid view"><Grid2X2 size={15} /></button>
              <button className={display === "list" ? "active" : ""} onClick={() => setDisplay("list")} aria-label="List view"><List size={16} /></button>
            </div>
          </div>

          {visibleProjects.length ? (
            <div className={`project-grid ${display === "list" ? "is-list" : ""}`}>
              {visibleProjects.map((project) => (
                <article className="project-card" key={project.id}>
                  <button className="project-open" onClick={onOpenWorkspace} aria-label={`Open ${project.title}`}>
                    <DiagramPreview tone={project.tone} />
                  </button>
                  <div className="project-card-body">
                    <span className={`project-kind tone-${project.tone}`}><Folder size={13} /> DIAGRAM</span>
                    <div className="project-title-row">
                      <button onClick={onOpenWorkspace}>{project.title}</button>
                      <button className={`favorite-button ${project.favorite ? "is-favorite" : ""}`} onClick={() => toggleFavorite(project.id)} aria-label={`${project.favorite ? "Remove" : "Add"} ${project.title} ${project.favorite ? "from" : "to"} favorites`}>
                        <Heart size={16} fill={project.favorite ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <p>{project.description}</p>
                    <footer><span>{project.edited}</span><span>{project.nodes} nodes</span><button aria-label="More options"><MoreHorizontal size={16} /></button></footer>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-library">
              <Star size={22} />
              <strong>{query ? "No matching diagrams" : "No favorites yet"}</strong>
              <p>{query ? "Try a different search." : "Use the heart on any diagram to keep it here."}</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
