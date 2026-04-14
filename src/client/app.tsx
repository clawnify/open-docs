import { useEffect } from "preact/hooks";
import { DocsContext } from "./context";
import { useRouter } from "./hooks/use-router";
import { useDocs } from "./hooks/use-docs";
import { Sidebar } from "./components/sidebar";
import { PageView } from "./components/page-view";
import { EmptyState } from "./components/empty-state";

export function App() {
  const { path, navigate, pageId } = useRouter();
  const docs = useDocs();

  // Load page when URL changes
  useEffect(() => {
    if (pageId && !docs.loading) {
      if (docs.activePage?.id !== pageId) {
        docs.loadPage(pageId);
      }
    }
  }, [pageId, docs.loading]);

  // If no page selected and pages exist, navigate to first page
  useEffect(() => {
    if (!pageId && !docs.loading && docs.pages.length > 0) {
      navigate(`/page/${docs.pages[0].id}`);
    }
  }, [pageId, docs.loading, docs.pages.length]);

  if (docs.loading) {
    return (
      <div class="loading-screen">
        <div class="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  const contextValue = { ...docs, navigate };

  return (
    <DocsContext.Provider value={contextValue}>
      <div class="app-layout">
        <Sidebar />
        <main class="main-content">
          {pageId && docs.activePage ? <PageView /> : <EmptyState />}
        </main>
      </div>
    </DocsContext.Provider>
  );
}
