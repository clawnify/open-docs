import { useState, useEffect, useRef } from "preact/hooks";
import { BLOCK_TYPES, type BlockType } from "../types";

interface SlashMenuProps {
  position: { top: number; left: number };
  filter: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export function SlashMenu({ position, filter, onSelect, onClose }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = BLOCK_TYPES.filter((bt) => {
    const term = filter.toLowerCase();
    return bt.label.toLowerCase().includes(term) || bt.type.includes(term);
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].type);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [filtered, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = menuRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (filtered.length === 0) {
    return (
      <div class="slash-menu" style={{ top: position.top, left: position.left }} ref={menuRef}>
        <div class="slash-menu-empty">No results</div>
      </div>
    );
  }

  return (
    <div class="slash-menu" style={{ top: position.top, left: position.left }} ref={menuRef}>
      <div class="slash-menu-header">Block types</div>
      {filtered.map((bt, i) => (
        <button
          key={bt.type}
          class={`slash-menu-item ${i === selectedIndex ? "selected" : ""}`}
          onClick={() => onSelect(bt.type)}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span class="slash-menu-icon">{bt.icon}</span>
          <div class="slash-menu-text">
            <span class="slash-menu-label">{bt.label}</span>
            <span class="slash-menu-desc">{bt.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
