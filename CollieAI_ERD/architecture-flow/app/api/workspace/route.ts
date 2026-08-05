import { env } from "cloudflare:workers";

const workspaceId = "collie";

const responseHeaders = (request: Request) => {
  const origin = request.headers.get("origin");
  return origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, PUT, PATCH, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }
    : {};
};

async function initializeWorkspaceTable() {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS workspace_snapshots (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL)",
  ).run();
}

export async function GET(request: Request) {
  await initializeWorkspaceTable();
  const row = await env.DB
    .prepare("SELECT payload, updated_at FROM workspace_snapshots WHERE id = ?")
    .bind(workspaceId)
    .first<{ payload: string; updated_at: number }>();

  return Response.json(row ? { data: JSON.parse(row.payload), updatedAt: row.updated_at } : { data: null }, { headers: responseHeaders(request) });
}

export async function PUT(request: Request) {
  const data = await request.json();
  await initializeWorkspaceTable();
  const updatedAt = Date.now();
  await env.DB
    .prepare(
      "INSERT INTO workspace_snapshots (id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
    )
    .bind(workspaceId, JSON.stringify(data), updatedAt)
    .run();

  return Response.json({ ok: true, updatedAt }, { headers: responseHeaders(request) });
}

export async function PATCH(request: Request) {
  await initializeWorkspaceTable();
  const update = await request.json();
  const existing = await env.DB
    .prepare("SELECT payload FROM workspace_snapshots WHERE id = ?")
    .bind(workspaceId)
    .first<{ payload: string }>();
  const payload = { ...(existing ? JSON.parse(existing.payload) : {}), ...update };
  const updatedAt = Date.now();
  await env.DB
    .prepare(
      "INSERT INTO workspace_snapshots (id, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
    )
    .bind(workspaceId, JSON.stringify(payload), updatedAt)
    .run();
  return Response.json({ ok: true, updatedAt }, { headers: responseHeaders(request) });
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: responseHeaders(request) });
}
