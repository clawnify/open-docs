# Open Docs

An open-source Notion alternative with nested pages, block-based editing, and slash commands. Built with **Preact + Hono + SQLite**. Deploys to Cloudflare Workers via [Clawnify](https://clawnify.com).

## Features

- **Block-based editor** — headings, paragraphs, bulleted/numbered lists, to-dos, toggles, code blocks, quotes, callouts, and dividers
- **Slash commands** — type `/` to insert any block type with a searchable dropdown menu
- **Nested pages** — unlimited page hierarchy with a collapsible sidebar tree
- **Inline formatting** — bold (`Ctrl+B`), italic (`Ctrl+I`), and inline code (`Ctrl+E`)
- **Drag-and-drop** — reorder blocks by dragging the grip handle
- **Auto-save** — changes saved automatically with debounced writes (800ms)
- **Page icons** — emoji icon picker for every page
- **Favorites** — star pages for quick access at the top of the sidebar
- **Search** — filter pages instantly from the sidebar search bar
- **URL-based routing** — bookmarkable `/page/:id` URLs with browser back/forward support

## Quickstart

```bash
git clone https://github.com/clawnify/open-docs.git
cd open-docs
pnpm install
```

Start the dev server:

```bash
pnpm dev
```

Open `http://localhost:5179` in your browser. The database schema and welcome page are created automatically on startup.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Preact, TypeScript, Vite |
| **Backend** | Hono (OpenAPI + Zod validation) |
| **Database** | SQLite (better-sqlite3, WAL mode) |
| **Icons** | Lucide |

### Prerequisites

- Node.js 20+
- pnpm

## Architecture

```
src/
  server/
    index.ts    — Hono API with OpenAPI/Zod route definitions
    db.ts       — SQLite database adapter (WAL, foreign keys)
    dev.ts      — Dev + production server entry point
    schema.sql  — Database schema (pages, blocks) + seed data
  client/
    app.tsx           — Root component with router
    context.tsx       — Preact context for docs state
    hooks/
      use-router.ts   — pushState URL routing (/page/:id)
      use-docs.ts     — Pages + blocks state management with auto-save
    components/
      sidebar.tsx       — Page tree with search, favorites, nested expand/collapse
      page-view.tsx     — Page header with title editing + icon picker
      block-editor.tsx  — Block-based content editor with drag-and-drop
      slash-menu.tsx    — Slash command dropdown menu
      empty-state.tsx   — Empty state when no page is selected
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pages` | List all pages |
| POST | `/api/pages` | Create a new page |
| GET | `/api/pages/:id` | Get a page with its blocks |
| PATCH | `/api/pages/:id` | Update page title, icon, parent, or favorite status |
| DELETE | `/api/pages/:id` | Delete a page and all children |
| PUT | `/api/pages/:id/blocks` | Bulk save all blocks for a page |
| POST | `/api/pages/:id/blocks` | Add a single block to a page |
| PATCH | `/api/blocks/:id` | Update a block's type, content, or metadata |
| DELETE | `/api/blocks/:id` | Delete a block |

### Block Types

| Type | Description |
|------|-------------|
| `paragraph` | Plain text |
| `heading_1` | Large heading |
| `heading_2` | Medium heading |
| `heading_3` | Small heading |
| `bulleted_list` | Bulleted list item |
| `numbered_list` | Numbered list item |
| `todo` | Checkbox item |
| `toggle` | Collapsible content |
| `code` | Code block (monospace) |
| `quote` | Block quote |
| `callout` | Highlighted callout with icon |
| `divider` | Horizontal divider |

## Deploy

```bash
npx clawnify deploy
```

## License

MIT
