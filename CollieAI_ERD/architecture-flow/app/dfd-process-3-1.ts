const node = (
  id: string,
  x: number,
  y: number,
  label: string,
  description: string,
  options: Record<string, unknown> = {},
) => ({
  id,
  type: "architecture",
  position: { x, y },
  data: {
    label,
    description,
    shape: "header-card",
    icon: "workflow",
    tone: "cyan",
    componentCategory: "flowchart",
    hideIcon: true,
    titleSize: 18,
    descriptionSize: 13,
    headerSize: 15,
    headerColor: "#0ea5c6",
    headerTextStyle: { color: "#ffffff", fontWeight: 700, textAlign: "center" },
    titleTextStyle: { fontWeight: 700, textAlign: "center" },
    descriptionTextStyle: { color: "#475569", textAlign: "center" },
    ...options,
  },
  style: { width: 290, height: 170 },
});

const flow = (
  id: string,
  source: string,
  target: string,
  label: string,
  sourceHandle = "right-0",
  targetHandle = "left-0",
  dashed = false,
) => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
  type: "flowing",
  label,
  animated: dashed,
  markerEnd: { type: "arrowclosed", color: "#64748b" },
  style: { stroke: "#64748b", strokeWidth: 1.8, strokeDasharray: dashed ? "7 6" : undefined },
  labelStyle: { fill: "#334155", fontWeight: 700, fontSize: 12 },
  labelBgStyle: { fill: "#ffffff", fillOpacity: 0.96, stroke: "#ffffff", strokeWidth: 5 },
  labelBgPadding: [6, 4],
  labelBgBorderRadius: 5,
});

const processIds = ["p31", "p32", "p33", "p34", "p35", "p36"];

export const DFD_PROCESS_3_1_PAGE_ID = "level-1-process-3-1";
export const DFD_PROCESS_3_1_PAGE_NAME = "Level 1 | 3.1";

export const dfdProcess31Diagram = {
  nodes: [
    {
      id: "title",
      type: "architecture",
      position: { x: 420, y: -160 },
      data: {
        label: "PROCESS 3.0 · GUIDED AI MATH TUTORING",
        description: "Level 1 decomposition · DFD 4.4.2",
        shape: "text",
        icon: "workflow",
        tone: "slate",
        titleSize: 30,
        fontWeight: 700,
      },
      style: { width: 900, height: 80 },
    },
    {
      id: "process-boundary",
      type: "architecture",
      position: { x: 275, y: 30 },
      data: {
        label: "PROCESS 3.0 BOUNDARY",
        description: "",
        shape: "legend",
        icon: "workflow",
        tone: "slate",
        legendColor: "#0ea5c6",
        legendOpacity: 0.07,
        legendNodeIds: processIds,
      },
      style: { width: 1140, height: 700, zIndex: -1 },
      deletable: false,
    },
    node("p31", 350, 125, "Load Problem, Skill and Session Context", "Collect the active problem, learner state and tutoring strategy.", { headerText: "3.1" }),
    node("p32", 775, 125, "Evaluate Learner Response and Step State", "Interpret the normalized response and current solution step.", { headerText: "3.2" }),
    node("p33", 1100, 380, "Construct Strict Pedagogical Prompt", "Build a constrained prompt from the learner and strategy context.", { headerText: "3.3" }),
    node("p34", 775, 535, "Generate Guided Hint or Question", "Produce a guided response without revealing the final answer.", { headerText: "3.4" }),
    node("p35", 350, 535, "Apply Topic and Pedagogical Guardrails", "Classify safety and topic fit before the response is returned.", { headerText: "3.5" }),
    node("p36", 350, 330, "Finalize Tutoring and Attempt Outcomes", "Prepare learner-facing guidance and persist attempt outcomes.", { headerText: "3.6", headerColor: "#10b981", tone: "emerald" }),
    node("process-2", -180, 155, "Multimodal Interaction", "Interfacing Level 0 process", {
      shape: "predefined-process", headerText: "2.0", headerColor: "#64748b", tone: "slate", showDescription: true,
    }),
    node("process-4", -180, 515, "Adaptive Assistance", "Interfacing Level 0 process", {
      shape: "predefined-process", headerText: "4.0", headerColor: "#64748b", tone: "slate", showDescription: true,
    }),
    node("ai-services", 1510, 365, "External AI Services", "Guided LLM · safety and topic classification", {
      shape: "cloud", headerText: "EXTERNAL", headerColor: "#8b5cf6", tone: "violet", titleSize: 19,
    }),
    node("d2", 405, 820, "Math Content & Skill Catalog", "Problem, skill and difficulty content", {
      shape: "data-store", headerText: "D2", headerColor: "#f59e0b", tone: "amber", fillColor: "#fff7ed", outlineColor: "#f59e0b",
    }),
    node("d4", 965, 820, "Attempts & Step Data", "Attempt outcome · wrong-answer count · help signal", {
      shape: "data-store", headerText: "D4", headerColor: "#f59e0b", tone: "amber", fillColor: "#fff7ed", outlineColor: "#f59e0b",
    }),
    {
      id: "note",
      type: "architecture",
      position: { x: 280, y: 1060 },
      data: {
        label: "Only numbered subprocesses are inside the Process 3.0 boundary. Grey components are sibling Level 0 processes; stores and external services remain outside the boundary.",
        description: "",
        shape: "callout",
        icon: "alert",
        tone: "slate",
        componentCategory: "shape",
        hideIcon: true,
        titleSize: 14,
        fillColor: "#f8fafc",
        outlineColor: "#cbd5e1",
      },
      style: { width: 1125, height: 90 },
    },
  ],
  edges: [
    flow("f1", "process-2", "p31", "Normalized learner input · current session state"),
    flow("f2", "p31", "p32", "Problem, learner and strategy context"),
    flow("f3", "p32", "p33", "Response evaluation and step state", "right-0", "top-0"),
    flow("f4", "p33", "p34", "Pedagogically constrained prompt", "bottom-0", "right-0"),
    flow("f5", "p34", "p35", "Draft guided response", "left-0", "right-0"),
    flow("f6", "p35", "p36", "Approved guided response", "top-0", "bottom-0"),
    flow("f7", "p36", "process-2", "Guided response · media/output instructions", "left-0", "right-0"),
    flow("f8", "process-4", "p31", "Difficulty decision · hint / Show Me strategy", "right-0", "left-0"),
    flow("f9", "p36", "process-4", "Guided AI response", "left-0", "right-0"),
    flow("f10", "d2", "p31", "Problem, skill and difficulty content", "top-0", "bottom-0"),
    flow("f11", "p32", "d4", "Attempt outcome · wrong-answer count · help signal", "bottom-0", "top-0"),
    flow("f12", "d4", "p31", "Attempt and step outcomes", "left-0", "bottom-0"),
    flow("f13", "p33", "ai-services", "Tutoring prompt · pedagogical context"),
    flow("f14", "p35", "ai-services", "Guardrail · classification request", "right-0", "left-0", true),
    flow("f15", "ai-services", "p34", "Guided response", "left-0", "right-0", true),
    flow("f16", "ai-services", "p35", "Safety · topic classification", "left-0", "right-0", true),
  ],
};

export const ensureDfdProcess31Page = (snapshot: Record<string, unknown>) => {
  const pages = Array.isArray(snapshot.pages) ? [...snapshot.pages] as Array<{ id?: string; name?: string }> : [];
  const diagrams = snapshot.diagrams && typeof snapshot.diagrams === "object"
    ? { ...(snapshot.diagrams as Record<string, unknown>) }
    : {};
  const existing = pages.find((page) => page.id === DFD_PROCESS_3_1_PAGE_ID || page.name === DFD_PROCESS_3_1_PAGE_NAME);
  if (existing) return { snapshot, changed: false };

  pages.push({ id: DFD_PROCESS_3_1_PAGE_ID, name: DFD_PROCESS_3_1_PAGE_NAME });
  diagrams[DFD_PROCESS_3_1_PAGE_ID] = dfdProcess31Diagram;
  return {
    snapshot: { ...snapshot, pages, diagrams },
    changed: true,
  };
};
