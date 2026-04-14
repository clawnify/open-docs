import { useState, useRef, useCallback } from "preact/hooks";
import { useDocsContext } from "../context";
import { BlockEditor } from "./block-editor";
import { SmilePlus, Save, Check } from "lucide-preact";

const PAGE_ICONS = ["📄", "📝", "📋", "📌", "📎", "📁", "📂", "📊", "📈", "🎯", "🚀", "💡", "🔥", "⭐", "🎨", "🔧", "📚", "🏠", "💼", "🎬", "🌍", "❤️", "✅", "🔒", "🎵", "👋", "🐛", "🧪"];

export function PageView() {
  const { activePage, updatePage, saving } = useDocsContext();
  const [editingTitle, setEditingTitle] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleTitleBlur = useCallback(() => {
    setEditingTitle(false);
    if (activePage && titleRef.current) {
      const newTitle = titleRef.current.value.trim() || "Untitled";
      if (newTitle !== activePage.title) {
        updatePage(activePage.id, { title: newTitle });
      }
    }
  }, [activePage, updatePage]);

  const handleTitleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  const handleIconSelect = useCallback((icon: string) => {
    if (activePage) {
      updatePage(activePage.id, { icon } as Partial<typeof activePage>);
    }
    setShowIconPicker(false);
  }, [activePage, updatePage]);

  if (!activePage) return null;

  return (
    <div class="page-view">
      <div class="page-header">
        <div class="page-header-top">
          <div class="page-icon-wrapper" onClick={() => setShowIconPicker(!showIconPicker)}>
            <span class="page-header-icon">{activePage.icon || "📄"}</span>
            <div class="page-icon-hover">
              <SmilePlus size={12} />
            </div>
          </div>

          {showIconPicker && (
            <div class="icon-picker">
              {PAGE_ICONS.map((icon) => (
                <button
                  key={icon}
                  class="icon-picker-item"
                  onClick={() => handleIconSelect(icon)}
                >
                  {icon}
                </button>
              ))}
              <button
                class="icon-picker-item icon-picker-remove"
                onClick={() => handleIconSelect("")}
              >
                ✕
              </button>
            </div>
          )}

          <div class="page-save-status">
            {saving ? (
              <span class="save-indicator saving"><Save size={14} /> Saving...</span>
            ) : (
              <span class="save-indicator saved"><Check size={14} /> Saved</span>
            )}
          </div>
        </div>

        {editingTitle ? (
          <input
            ref={titleRef}
            class="page-title-input"
            defaultValue={activePage.title}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            autoFocus
          />
        ) : (
          <h1
            class="page-title-display"
            onClick={() => setEditingTitle(true)}
          >
            {activePage.title || "Untitled"}
          </h1>
        )}
      </div>

      <BlockEditor />
    </div>
  );
}
