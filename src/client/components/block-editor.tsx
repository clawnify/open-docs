import { useState, useCallback, useRef } from "preact/hooks";
import { useDocsContext } from "../context";
import type { Block, BlockType } from "../types";
import { SlashMenu } from "./slash-menu";
import { GripVertical, Plus, Trash2 } from "lucide-preact";

function generateId() {
  return Math.random().toString(36).substring(2, 12);
}

function makeBlock(pageId: string, type: BlockType, content = "", position = 0): Block {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    page_id: pageId,
    type,
    content,
    metadata: "{}",
    position,
    created_at: now,
    updated_at: now,
  };
}

export function BlockEditor() {
  const { activePage, blocks, updateBlocks } = useDocsContext();
  const [slashMenu, setSlashMenu] = useState<{ blockIndex: number; filter: string; position: { top: number; left: number } } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const blockRefs = useRef<Map<string, HTMLElement>>(new Map());

  if (!activePage) return null;

  const focusBlock = (id: string, cursorEnd = false) => {
    requestAnimationFrame(() => {
      const el = blockRefs.current.get(id);
      if (!el) return;
      const editable = el.querySelector("[contenteditable]") as HTMLElement;
      if (editable) {
        editable.focus();
        if (cursorEnd) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(editable);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    });
  };

  const addBlock = useCallback((afterIndex: number, type: BlockType = "paragraph", content = "") => {
    const newBlock = makeBlock(activePage!.id, type, content, afterIndex + 1);
    const updated = [...blocks];
    updated.splice(afterIndex + 1, 0, newBlock);
    updated.forEach((b, i) => (b.position = i));
    updateBlocks(updated);
    focusBlock(newBlock.id);
    return newBlock;
  }, [activePage, blocks, updateBlocks]);

  const deleteBlock = useCallback((index: number) => {
    if (blocks.length <= 1) return;
    const updated = blocks.filter((_, i) => i !== index);
    updated.forEach((b, i) => (b.position = i));
    updateBlocks(updated);
    const focusIdx = Math.max(0, index - 1);
    focusBlock(updated[focusIdx].id, true);
  }, [blocks, updateBlocks]);

  const updateBlockContent = useCallback((index: number, content: string) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], content };
    updateBlocks(updated);
  }, [blocks, updateBlocks]);

  const updateBlockType = useCallback((index: number, type: BlockType) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], type };
    updateBlocks(updated);
  }, [blocks, updateBlocks]);

  const handleKeyDown = useCallback((e: KeyboardEvent, index: number) => {
    const block = blocks[index];
    const target = e.target as HTMLElement;

    if (e.key === "Enter" && !e.shiftKey) {
      if (slashMenu) return; // Let slash menu handle enter
      e.preventDefault();
      addBlock(index);
      return;
    }

    if (e.key === "Backspace" && target.textContent === "") {
      e.preventDefault();
      if (block.type !== "paragraph") {
        updateBlockType(index, "paragraph");
      } else {
        deleteBlock(index);
      }
      return;
    }

    if (e.key === "ArrowUp" && index > 0) {
      const sel = window.getSelection();
      if (sel && sel.anchorOffset === 0) {
        e.preventDefault();
        focusBlock(blocks[index - 1].id, true);
      }
    }

    if (e.key === "ArrowDown" && index < blocks.length - 1) {
      const sel = window.getSelection();
      const len = target.textContent?.length || 0;
      if (sel && sel.anchorOffset >= len) {
        e.preventDefault();
        focusBlock(blocks[index + 1].id);
      }
    }

    // Bold: Ctrl+B
    if (e.key === "b" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      document.execCommand("bold");
    }
    // Italic: Ctrl+I
    if (e.key === "i" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      document.execCommand("italic");
    }
    // Code: Ctrl+E
    if (e.key === "e" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const code = document.createElement("code");
        range.surroundContents(code);
      }
    }
  }, [blocks, slashMenu, addBlock, deleteBlock, updateBlockType]);

  const handleInput = useCallback((e: Event, index: number) => {
    const target = e.target as HTMLElement;
    const content = target.innerHTML;
    updateBlockContent(index, content);

    // Check for slash command
    const text = target.textContent || "";
    if (text.startsWith("/")) {
      const rect = target.getBoundingClientRect();
      setSlashMenu({
        blockIndex: index,
        filter: text.substring(1),
        position: { top: rect.bottom + 4, left: rect.left },
      });
    } else if (slashMenu && slashMenu.blockIndex === index) {
      setSlashMenu(null);
    }
  }, [slashMenu, updateBlockContent]);

  const handleSlashSelect = useCallback((type: BlockType) => {
    if (!slashMenu) return;
    const index = slashMenu.blockIndex;
    const updated = [...blocks];
    updated[index] = { ...updated[index], type, content: "" };
    updateBlocks(updated);
    setSlashMenu(null);
    focusBlock(updated[index].id);
  }, [slashMenu, blocks, updateBlocks]);

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...blocks];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    updated.forEach((b, i) => (b.position = i));
    updateBlocks(updated);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleAddClick = (index: number) => {
    addBlock(index);
  };

  return (
    <div class="block-editor">
      {blocks.map((block, index) => (
        <BlockItem
          key={block.id}
          block={block}
          index={index}
          isDragging={dragIndex === index}
          isDragOver={dragOverIndex === index}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onDelete={() => deleteBlock(index)}
          onAdd={() => handleAddClick(index)}
          registerRef={(el) => {
            if (el) blockRefs.current.set(block.id, el);
            else blockRefs.current.delete(block.id);
          }}
          blockCount={blocks.length}
        />
      ))}

      {blocks.length === 0 && (
        <div class="block-placeholder" onClick={() => addBlock(-1)}>
          Click to add a block, or type / for commands
        </div>
      )}

      {slashMenu && (
        <SlashMenu
          position={slashMenu.position}
          filter={slashMenu.filter}
          onSelect={handleSlashSelect}
          onClose={() => setSlashMenu(null)}
        />
      )}
    </div>
  );
}

interface BlockItemProps {
  block: Block;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onInput: (e: Event, index: number) => void;
  onKeyDown: (e: KeyboardEvent, index: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  onDelete: () => void;
  onAdd: () => void;
  registerRef: (el: HTMLElement | null) => void;
  blockCount: number;
}

function BlockItem({
  block, index, isDragging, isDragOver,
  onInput, onKeyDown, onDragStart, onDragOver, onDrop, onDragEnd,
  onDelete, onAdd, registerRef, blockCount,
}: BlockItemProps) {
  const [todoChecked, setTodoChecked] = useState(() => {
    try {
      return JSON.parse(block.metadata).checked || false;
    } catch { return false; }
  });

  const [toggleOpen, setToggleOpen] = useState(false);

  const handleTodoToggle = () => {
    setTodoChecked(!todoChecked);
  };

  if (block.type === "divider") {
    return (
      <div
        ref={registerRef}
        class={`block-wrapper ${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""}`}
        onDragOver={(e) => onDragOver(e as DragEvent, index)}
        onDrop={() => onDrop(index)}
      >
        <div class="block-controls">
          <button class="block-handle" draggable onDragStart={() => onDragStart(index)} onDragEnd={onDragEnd}>
            <GripVertical size={14} />
          </button>
          <button class="block-add-btn" onClick={onAdd}><Plus size={14} /></button>
        </div>
        <div class="block block-divider">
          <hr />
        </div>
        <button class="block-delete-btn" onClick={onDelete}><Trash2 size={12} /></button>
      </div>
    );
  }

  const blockClass = `block block-${block.type}`;
  const placeholder = block.type === "paragraph" ? "Type '/' for commands..." :
    block.type.startsWith("heading") ? `Heading ${block.type.slice(-1)}` :
    block.type === "code" ? "Code..." :
    block.type === "quote" ? "Quote..." :
    block.type === "callout" ? "Type a callout..." :
    block.type === "todo" ? "To-do..." :
    block.type === "toggle" ? "Toggle..." :
    "";

  return (
    <div
      ref={registerRef}
      class={`block-wrapper ${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""}`}
      onDragOver={(e) => onDragOver(e as DragEvent, index)}
      onDrop={() => onDrop(index)}
    >
      <div class="block-controls">
        <button class="block-handle" draggable onDragStart={() => onDragStart(index)} onDragEnd={onDragEnd}>
          <GripVertical size={14} />
        </button>
        <button class="block-add-btn" onClick={onAdd}><Plus size={14} /></button>
      </div>

      <div class={blockClass}>
        {block.type === "todo" && (
          <input
            type="checkbox"
            class="todo-checkbox"
            checked={todoChecked}
            onChange={handleTodoToggle}
          />
        )}

        {block.type === "toggle" && (
          <button class={`toggle-btn ${toggleOpen ? "open" : ""}`} onClick={() => setToggleOpen(!toggleOpen)}>
            ▸
          </button>
        )}

        {block.type === "callout" && (
          <span class="callout-icon">💡</span>
        )}

        {(block.type === "bulleted_list") && (
          <span class="list-marker">•</span>
        )}

        {(block.type === "numbered_list") && (
          <span class="list-marker">{index + 1}.</span>
        )}

        <div
          class={`block-content ${todoChecked && block.type === "todo" ? "checked" : ""}`}
          contentEditable
          data-placeholder={placeholder}
          dangerouslySetInnerHTML={{ __html: block.content }}
          onInput={(e) => onInput(e, index)}
          onKeyDown={(e) => onKeyDown(e as KeyboardEvent, index)}
        />
      </div>

      {blockCount > 1 && (
        <button class="block-delete-btn" onClick={onDelete}><Trash2 size={12} /></button>
      )}
    </div>
  );
}
