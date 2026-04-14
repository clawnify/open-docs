import { useState, useMemo } from "preact/hooks";
import { useDocsContext } from "../context";
import type { Page, PageTreeNode } from "../types";
import { ChevronRight, Plus, Trash2, MoreHorizontal, Star, FileText, Search } from "lucide-preact";

function buildTree(pages: Page[], expandedIds: Set<string>): PageTreeNode[] {
  const map = new Map<string | null, Page[]>();
  for (const p of pages) {
    const parentKey = p.parent_id;
    if (!map.has(parentKey)) map.set(parentKey, []);
    map.get(parentKey)!.push(p);
  }

  function build(parentId: string | null): PageTreeNode[] {
    const children = map.get(parentId) || [];
    return children
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        ...p,
        expanded: expandedIds.has(p.id),
        children: build(p.id),
      }));
  }

  return build(null);
}

export function Sidebar() {
  const { pages, activePage, navigate, createPage, deletePage, updatePage } = useDocsContext();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const tree = useMemo(() => buildTree(pages, expandedIds), [pages, expandedIds]);

  const favorites = useMemo(() => pages.filter((p) => p.is_favorite), [pages]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const term = search.toLowerCase();
    const matches = pages.filter((p) => p.title.toLowerCase().includes(term));
    return matches.map((p) => ({ ...p, expanded: false, children: [] as PageTreeNode[] }));
  }, [search, tree, pages]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async (parentId?: string | null) => {
    const page = await createPage(parentId);
    if (parentId) {
      setExpandedIds((prev) => new Set(prev).add(parentId));
    }
    navigate(`/page/${page.id}`);
  };

  const handleDelete = async (id: string) => {
    setMenuOpenId(null);
    await deletePage(id);
  };

  const toggleFavorite = async (page: Page) => {
    setMenuOpenId(null);
    await updatePage(page.id, { is_favorite: page.is_favorite ? 0 : 1 } as Partial<Page>);
  };

  return (
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <FileText size={18} />
          <span>Open Docs</span>
        </div>
      </div>

      <div class="sidebar-search">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search pages..."
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
      </div>

      {favorites.length > 0 && !search && (
        <div class="sidebar-section">
          <div class="sidebar-section-header">
            <span>Favorites</span>
          </div>
          {favorites.map((p) => (
            <PageItem
              key={p.id}
              node={{ ...p, expanded: false, children: [] }}
              depth={0}
              activeId={activePage?.id || null}
              navigate={navigate}
              toggleExpand={toggleExpand}
              menuOpenId={menuOpenId}
              setMenuOpenId={setMenuOpenId}
              onDelete={handleDelete}
              onCreate={handleCreate}
              onToggleFavorite={toggleFavorite}
              isFavoriteSection
            />
          ))}
        </div>
      )}

      <div class="sidebar-section">
        <div class="sidebar-section-header">
          <span>Pages</span>
          <button class="sidebar-add-btn" onClick={() => handleCreate()} title="New page">
            <Plus size={14} />
          </button>
        </div>
        {filteredTree.map((node) => (
          <PageItem
            key={node.id}
            node={node}
            depth={0}
            activeId={activePage?.id || null}
            navigate={navigate}
            toggleExpand={toggleExpand}
            menuOpenId={menuOpenId}
            setMenuOpenId={setMenuOpenId}
            onDelete={handleDelete}
            onCreate={handleCreate}
            onToggleFavorite={toggleFavorite}
          />
        ))}
        {filteredTree.length === 0 && (
          <div class="sidebar-empty">
            {search ? "No pages found" : "No pages yet"}
          </div>
        )}
      </div>
    </aside>
  );
}

interface PageItemProps {
  node: PageTreeNode;
  depth: number;
  activeId: string | null;
  navigate: (to: string) => void;
  toggleExpand: (id: string) => void;
  menuOpenId: string | null;
  setMenuOpenId: (id: string | null) => void;
  onDelete: (id: string) => void;
  onCreate: (parentId?: string | null) => void;
  onToggleFavorite: (page: Page) => void;
  isFavoriteSection?: boolean;
}

function PageItem({
  node, depth, activeId, navigate, toggleExpand,
  menuOpenId, setMenuOpenId, onDelete, onCreate, onToggleFavorite,
  isFavoriteSection,
}: PageItemProps) {
  const isActive = node.id === activeId;
  const hasChildren = node.children.length > 0;
  const isMenuOpen = menuOpenId === node.id + (isFavoriteSection ? "-fav" : "");
  const menuKey = node.id + (isFavoriteSection ? "-fav" : "");

  return (
    <div>
      <div
        class={`page-item ${isActive ? "active" : ""}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {!isFavoriteSection && (
          <button
            class={`page-expand-btn ${hasChildren ? "visible" : ""} ${node.expanded ? "expanded" : ""}`}
            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
          >
            <ChevronRight size={12} />
          </button>
        )}

        <div class="page-item-content" onClick={() => navigate(`/page/${node.id}`)}>
          <span class="page-icon">{node.icon || "📄"}</span>
          <span class="page-title">{node.title || "Untitled"}</span>
        </div>

        <div class="page-item-actions">
          <button
            class="page-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpenId(isMenuOpen ? null : menuKey);
            }}
          >
            <MoreHorizontal size={14} />
          </button>
          {!isFavoriteSection && (
            <button
              class="page-action-btn"
              onClick={(e) => { e.stopPropagation(); onCreate(node.id); }}
              title="Add sub-page"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {isMenuOpen && (
          <div class="page-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onToggleFavorite(node)}>
              <Star size={14} />
              {node.is_favorite ? "Remove from favorites" : "Add to favorites"}
            </button>
            <button class="danger" onClick={() => onDelete(node.id)}>
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        )}
      </div>

      {!isFavoriteSection && node.expanded && node.children.map((child) => (
        <PageItem
          key={child.id}
          node={child}
          depth={depth + 1}
          activeId={activeId}
          navigate={navigate}
          toggleExpand={toggleExpand}
          menuOpenId={menuOpenId}
          setMenuOpenId={setMenuOpenId}
          onDelete={onDelete}
          onCreate={onCreate}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
