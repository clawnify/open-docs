import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { api } from "../api";
import type { Page, Block } from "../types";

export function useDocs() {
  const [pages, setPages] = useState<Page[]>([]);
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const fetchPages = useCallback(async () => {
    const data = await api<{ pages: Page[] }>("GET", "/api/pages");
    setPages(data.pages);
    return data.pages;
  }, []);

  const loadPage = useCallback(async (id: string) => {
    const data = await api<{ page: Page; blocks: Block[] }>("GET", `/api/pages/${id}`);
    setActivePage(data.page);
    setBlocks(data.blocks);
    return data;
  }, []);

  useEffect(() => {
    fetchPages().finally(() => setLoading(false));
  }, [fetchPages]);

  const createPage = useCallback(async (parentId?: string | null) => {
    const page = await api<Page>("POST", "/api/pages", {
      title: "Untitled",
      parent_id: parentId || null,
    });
    await fetchPages();
    return page;
  }, [fetchPages]);

  const updatePage = useCallback(async (id: string, updates: Partial<Page>) => {
    const updated = await api<Page>("PATCH", `/api/pages/${id}`, updates);
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    if (activePage?.id === id) setActivePage((prev) => prev ? { ...prev, ...updated } : prev);
    return updated;
  }, [activePage]);

  const deletePage = useCallback(async (id: string) => {
    await api<{ ok: boolean }>("DELETE", `/api/pages/${id}`);
    await fetchPages();
    if (activePage?.id === id) {
      setActivePage(null);
      setBlocks([]);
    }
  }, [activePage, fetchPages]);

  const saveBlocks = useCallback(async (pageId: string, blocksToSave: Block[]) => {
    setSaving(true);
    try {
      const data = await api<{ blocks: Block[] }>("PUT", `/api/pages/${pageId}/blocks`, {
        blocks: blocksToSave.map((b) => ({
          id: b.id,
          type: b.type,
          content: b.content,
          metadata: b.metadata,
        })),
      });
      setBlocks(data.blocks);
    } finally {
      setSaving(false);
    }
  }, []);

  const debouncedSave = useCallback((pageId: string, blocksToSave: Block[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveBlocks(pageId, blocksToSave), 800);
  }, [saveBlocks]);

  const updateBlocks = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks);
    if (activePage) {
      debouncedSave(activePage.id, newBlocks);
    }
  }, [activePage, debouncedSave]);

  return {
    pages,
    activePage,
    blocks,
    loading,
    saving,
    fetchPages,
    loadPage,
    createPage,
    updatePage,
    deletePage,
    updateBlocks,
    setBlocks,
  };
}
