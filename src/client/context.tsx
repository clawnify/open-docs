import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Page, Block } from "./types";

export interface DocsContextValue {
  pages: Page[];
  activePage: Page | null;
  blocks: Block[];
  loading: boolean;
  saving: boolean;
  navigate: (to: string) => void;
  fetchPages: () => Promise<Page[]>;
  loadPage: (id: string) => Promise<{ page: Page; blocks: Block[] }>;
  createPage: (parentId?: string | null) => Promise<Page>;
  updatePage: (id: string, updates: Partial<Page>) => Promise<Page>;
  deletePage: (id: string) => Promise<void>;
  updateBlocks: (blocks: Block[]) => void;
  setBlocks: (blocks: Block[]) => void;
}

export const DocsContext = createContext<DocsContextValue>(null!);

export function useDocsContext() {
  return useContext(DocsContext);
}
