import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaceSnapshots = sqliteTable("workspace_snapshots", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
