import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { initDB, query, get, run } from "./db.js";

type Env = { Bindings: { DB: D1Database } };

const app = new OpenAPIHono<Env>();

app.use("*", async (c, next) => {
  initDB(c.env.DB);
  await next();
});

// ── DB Row Types ──────────────────────────────────────────────────

interface PageRow {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  cover: string | null;
  position: number;
  is_favorite: number;
  created_at: string;
  updated_at: string;
}

interface BlockRow {
  id: string;
  page_id: string;
  type: string;
  content: string;
  metadata: string;
  position: number;
  created_at: string;
  updated_at: string;
}

// ── Schemas ───────────────────────────────────────────────────────

const ErrorSchema = z.object({ error: z.string() }).openapi("Error");
const OkSchema = z.object({ ok: z.boolean() }).openapi("Ok");

const PageSchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  title: z.string(),
  icon: z.string().nullable(),
  cover: z.string().nullable(),
  position: z.number().int(),
  is_favorite: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
}).openapi("Page");

const BlockSchema = z.object({
  id: z.string(),
  page_id: z.string(),
  type: z.string(),
  content: z.string(),
  metadata: z.string(),
  position: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
}).openapi("Block");

const IdParam = z.object({ id: z.string().openapi({ description: "Resource ID" }) });

// ── Pages: List ───────────────────────────────────────────────────

const listPages = createRoute({
  method: "get",
  path: "/api/pages",
  tags: ["Pages"],
  summary: "Get all pages (tree structure)",
  responses: {
    200: {
      description: "All pages",
      content: { "application/json": { schema: z.object({ pages: z.array(PageSchema) }) } },
    },
  },
});

app.openapi(listPages, async (c) => {
  const pages = await query<PageRow>("SELECT * FROM pages ORDER BY position ASC");
  return c.json({ pages }, 200);
});

// ── Pages: Get one with blocks ────────────────────────────────────

const getPage = createRoute({
  method: "get",
  path: "/api/pages/{id}",
  tags: ["Pages"],
  summary: "Get a page with its blocks",
  request: { params: IdParam },
  responses: {
    200: {
      description: "Page with blocks",
      content: {
        "application/json": {
          schema: z.object({ page: PageSchema, blocks: z.array(BlockSchema) }),
        },
      },
    },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(getPage, async (c) => {
  const { id } = c.req.valid("param");
  const page = await get<PageRow>("SELECT * FROM pages WHERE id = ?", [id]);
  if (!page) return c.json({ error: "Page not found" }, 404);
  const blocks = await query<BlockRow>("SELECT * FROM blocks WHERE page_id = ? ORDER BY position ASC", [id]);
  return c.json({ page, blocks }, 200);
});

// ── Pages: Create ─────────────────────────────────────────────────

const createPage = createRoute({
  method: "post",
  path: "/api/pages",
  tags: ["Pages"],
  summary: "Create a new page",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            title: z.string().optional(),
            parent_id: z.string().nullable().optional(),
            icon: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Created page", content: { "application/json": { schema: PageSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(createPage, async (c) => {
  try {
    const body = c.req.valid("json");
    const title = body.title || "Untitled";
    const parentId = body.parent_id || null;
    const icon = body.icon || null;

    const maxPos = await get<{ max_pos: number }>(
      "SELECT COALESCE(MAX(position), -1) as max_pos FROM pages WHERE parent_id IS ?",
      [parentId]
    );
    const nextPos = (maxPos?.max_pos ?? -1) + 1;

    const result = await run(
      "INSERT INTO pages (title, parent_id, icon, position) VALUES (?, ?, ?, ?)",
      [title, parentId, icon, nextPos]
    );
    const inserted = await get<PageRow>("SELECT * FROM pages WHERE rowid = ?", [result.lastInsertRowid]);

    if (inserted) {
      await run(
        "INSERT INTO blocks (page_id, type, content, position) VALUES (?, 'paragraph', '', 0)",
        [inserted.id]
      );
    }

    return c.json(inserted!, 201);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Pages: Update ─────────────────────────────────────────────────

const updatePage = createRoute({
  method: "patch",
  path: "/api/pages/{id}",
  tags: ["Pages"],
  summary: "Update a page",
  request: {
    params: IdParam,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            title: z.string().optional(),
            icon: z.string().nullable().optional(),
            cover: z.string().nullable().optional(),
            parent_id: z.string().nullable().optional(),
            position: z.number().int().optional(),
            is_favorite: z.number().int().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Updated page", content: { "application/json": { schema: PageSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(updatePage, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const existing = await get<PageRow>("SELECT * FROM pages WHERE id = ?", [id]);
    if (!existing) return c.json({ error: "Page not found" }, 404);

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.title !== undefined) { fields.push("title = ?"); values.push(body.title); }
    if (body.icon !== undefined) { fields.push("icon = ?"); values.push(body.icon); }
    if (body.cover !== undefined) { fields.push("cover = ?"); values.push(body.cover); }
    if (body.parent_id !== undefined) { fields.push("parent_id = ?"); values.push(body.parent_id); }
    if (body.position !== undefined) { fields.push("position = ?"); values.push(body.position); }
    if (body.is_favorite !== undefined) { fields.push("is_favorite = ?"); values.push(body.is_favorite); }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      await run(`UPDATE pages SET ${fields.join(", ")} WHERE id = ?`, values);
    }

    const updated = await get<PageRow>("SELECT * FROM pages WHERE id = ?", [id]);
    return c.json(updated!, 200);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Pages: Delete ─────────────────────────────────────────────────

const deletePage = createRoute({
  method: "delete",
  path: "/api/pages/{id}",
  tags: ["Pages"],
  summary: "Delete a page and all its children",
  request: { params: IdParam },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: OkSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(deletePage, async (c) => {
  const { id } = c.req.valid("param");
  const result = await run("DELETE FROM pages WHERE id = ?", [id]);
  if (result.changes === 0) return c.json({ error: "Page not found" }, 404);
  return c.json({ ok: true }, 200);
});

// ── Blocks: Update all blocks for a page (bulk save) ──────────────

const saveBlocks = createRoute({
  method: "put",
  path: "/api/pages/{id}/blocks",
  tags: ["Blocks"],
  summary: "Replace all blocks for a page",
  request: {
    params: IdParam,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            blocks: z.array(z.object({
              id: z.string().optional(),
              type: z.string(),
              content: z.string(),
              metadata: z.string().optional(),
            })),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Saved blocks",
      content: { "application/json": { schema: z.object({ blocks: z.array(BlockSchema) }) } },
    },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(saveBlocks, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const page = await get<PageRow>("SELECT id FROM pages WHERE id = ?", [id]);
    if (!page) return c.json({ error: "Page not found" }, 404);

    const { blocks } = c.req.valid("json");

    await run("DELETE FROM blocks WHERE page_id = ?", [id]);
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      await run(
        "INSERT INTO blocks (id, page_id, type, content, metadata, position) VALUES (?, ?, ?, ?, ?, ?)",
        [b.id || null, id, b.type, b.content, b.metadata || "{}", i]
      );
    }

    const saved = await query<BlockRow>("SELECT * FROM blocks WHERE page_id = ? ORDER BY position ASC", [id]);
    return c.json({ blocks: saved }, 200);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Blocks: Create a single block ─────────────────────────────────

const createBlock = createRoute({
  method: "post",
  path: "/api/pages/{id}/blocks",
  tags: ["Blocks"],
  summary: "Add a block to a page",
  request: {
    params: IdParam,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            type: z.string(),
            content: z.string().optional(),
            metadata: z.string().optional(),
            position: z.number().int().optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: "Created block", content: { "application/json": { schema: BlockSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(createBlock, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const page = await get<PageRow>("SELECT id FROM pages WHERE id = ?", [id]);
    if (!page) return c.json({ error: "Page not found" }, 404);

    const body = c.req.valid("json");
    const maxPos = await get<{ max_pos: number }>(
      "SELECT COALESCE(MAX(position), -1) as max_pos FROM blocks WHERE page_id = ?", [id]
    );
    const position = body.position ?? ((maxPos?.max_pos ?? -1) + 1);

    await run("UPDATE blocks SET position = position + 1 WHERE page_id = ? AND position >= ?", [id, position]);

    const result = await run(
      "INSERT INTO blocks (page_id, type, content, metadata, position) VALUES (?, ?, ?, ?, ?)",
      [id, body.type, body.content || "", body.metadata || "{}", position]
    );

    const inserted = await get<BlockRow>("SELECT * FROM blocks WHERE rowid = ?", [result.lastInsertRowid]);
    return c.json(inserted!, 201);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Blocks: Update single block ───────────────────────────────────

const updateBlock = createRoute({
  method: "patch",
  path: "/api/blocks/{id}",
  tags: ["Blocks"],
  summary: "Update a block",
  request: {
    params: IdParam,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            type: z.string().optional(),
            content: z.string().optional(),
            metadata: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "Updated block", content: { "application/json": { schema: BlockSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(updateBlock, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const existing = await get<BlockRow>("SELECT * FROM blocks WHERE id = ?", [id]);
    if (!existing) return c.json({ error: "Block not found" }, 404);

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.type !== undefined) { fields.push("type = ?"); values.push(body.type); }
    if (body.content !== undefined) { fields.push("content = ?"); values.push(body.content); }
    if (body.metadata !== undefined) { fields.push("metadata = ?"); values.push(body.metadata); }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      await run(`UPDATE blocks SET ${fields.join(", ")} WHERE id = ?`, values);
    }

    const updated = await get<BlockRow>("SELECT * FROM blocks WHERE id = ?", [id]);
    return c.json(updated!, 200);
  } catch (err: unknown) {
    return c.json({ error: (err as Error).message }, 500);
  }
});

// ── Blocks: Delete ────────────────────────────────────────────────

const deleteBlock = createRoute({
  method: "delete",
  path: "/api/blocks/{id}",
  tags: ["Blocks"],
  summary: "Delete a block",
  request: { params: IdParam },
  responses: {
    200: { description: "Success", content: { "application/json": { schema: OkSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(deleteBlock, async (c) => {
  const { id } = c.req.valid("param");
  const result = await run("DELETE FROM blocks WHERE id = ?", [id]);
  if (result.changes === 0) return c.json({ error: "Block not found" }, 404);
  return c.json({ ok: true }, 200);
});

// ── OpenAPI Doc ───────────────────────────────────────────────────

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "Open Docs API",
    version: "1.0.0",
    description: "A Notion-style document workspace with nested pages and block-based editing.",
  },
});

export default app;
