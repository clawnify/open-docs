CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  parent_id TEXT REFERENCES pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  icon TEXT DEFAULT NULL,
  cover TEXT DEFAULT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'paragraph',
  content TEXT NOT NULL DEFAULT '',
  metadata TEXT DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blocks_page ON blocks(page_id, position);
CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id, position);

-- Seed: a welcome page with some blocks
INSERT OR IGNORE INTO pages (id, title, icon) VALUES ('welcome', 'Welcome to Open Docs', '👋');

INSERT OR IGNORE INTO blocks (id, page_id, type, content, position) VALUES
  ('b1', 'welcome', 'heading_1', 'Welcome to Open Docs', 0),
  ('b2', 'welcome', 'paragraph', 'A powerful, open-source document workspace inspired by Notion. Create nested pages, write with blocks, and organize your knowledge.', 1),
  ('b3', 'welcome', 'heading_2', 'Getting Started', 2),
  ('b4', 'welcome', 'bulleted_list', 'Click the + button in the sidebar to create a new page', 3),
  ('b5', 'welcome', 'bulleted_list', 'Type / to open the slash command menu and insert different block types', 4),
  ('b6', 'welcome', 'bulleted_list', 'Nest pages by dragging them under other pages in the sidebar', 5),
  ('b7', 'welcome', 'callout', 'Tip: Use keyboard shortcuts like Ctrl+B for bold, Ctrl+I for italic, and Ctrl+E for inline code.', 6),
  ('b8', 'welcome', 'heading_2', 'Block Types', 7),
  ('b9', 'welcome', 'paragraph', 'Open Docs supports many block types:', 8),
  ('b10', 'welcome', 'bulleted_list', 'Headings (H1, H2, H3)', 9),
  ('b11', 'welcome', 'bulleted_list', 'Paragraphs with rich text', 10),
  ('b12', 'welcome', 'bulleted_list', 'Bulleted and numbered lists', 11),
  ('b13', 'welcome', 'bulleted_list', 'To-do checkboxes', 12),
  ('b14', 'welcome', 'bulleted_list', 'Toggle blocks', 13),
  ('b15', 'welcome', 'bulleted_list', 'Code blocks', 14),
  ('b16', 'welcome', 'bulleted_list', 'Quotes and callouts', 15),
  ('b17', 'welcome', 'bulleted_list', 'Dividers', 16),
  ('b18', 'welcome', 'divider', '', 17),
  ('b19', 'welcome', 'quote', 'The best way to predict the future is to create it.', 18);
