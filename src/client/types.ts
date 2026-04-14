export interface Page {
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

export type BlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list"
  | "numbered_list"
  | "todo"
  | "toggle"
  | "code"
  | "quote"
  | "callout"
  | "divider";

export interface Block {
  id: string;
  page_id: string;
  type: BlockType;
  content: string;
  metadata: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PageTreeNode extends Page {
  children: PageTreeNode[];
  expanded: boolean;
}

export interface BlockTypeOption {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
}

export const BLOCK_TYPES: BlockTypeOption[] = [
  { type: "paragraph", label: "Text", description: "Plain text block", icon: "T" },
  { type: "heading_1", label: "Heading 1", description: "Large heading", icon: "H1" },
  { type: "heading_2", label: "Heading 2", description: "Medium heading", icon: "H2" },
  { type: "heading_3", label: "Heading 3", description: "Small heading", icon: "H3" },
  { type: "bulleted_list", label: "Bulleted List", description: "Bulleted list item", icon: "•" },
  { type: "numbered_list", label: "Numbered List", description: "Numbered list item", icon: "1." },
  { type: "todo", label: "To-do", description: "Checkbox item", icon: "☐" },
  { type: "toggle", label: "Toggle", description: "Collapsible content", icon: "▸" },
  { type: "code", label: "Code", description: "Code block", icon: "</>" },
  { type: "quote", label: "Quote", description: "Block quote", icon: "❝" },
  { type: "callout", label: "Callout", description: "Highlighted callout", icon: "💡" },
  { type: "divider", label: "Divider", description: "Horizontal divider", icon: "—" },
];
