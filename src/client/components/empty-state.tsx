import { useDocsContext } from "../context";
import { FileText, Plus } from "lucide-preact";

export function EmptyState() {
  const { createPage, navigate } = useDocsContext();

  const handleCreate = async () => {
    const page = await createPage();
    navigate(`/page/${page.id}`);
  };

  return (
    <div class="empty-state">
      <FileText size={48} strokeWidth={1} />
      <h2>No page selected</h2>
      <p>Select a page from the sidebar or create a new one to get started.</p>
      <button class="btn btn-primary" onClick={handleCreate}>
        <Plus size={16} />
        New Page
      </button>
    </div>
  );
}
