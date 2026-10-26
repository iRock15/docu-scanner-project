import { createContext, useContext, useState } from "react";
import { deletePageFile } from "../utils/copyToStorage"; // adjust the path

const ScanContext = createContext(null);

export function ScanProvider({ children }) {
  const [pages, setPages] = useState([]);
  const [exportStatus, setExportStatus] = useState("idle"); // idle | exporting | done | error
  const [pdfUri, setPdfUri] = useState(null);
  const [exportError, setExportError] = useState(null);

  // --- pages ---
  const addPages = (newPages) => setPages((prev) => [...prev, ...newPages]);

  const removePage = (id) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    setPages((prev) => prev.filter((p) => p.id !== id)); // UI updates first
    deletePageFile(page); // then the file
  };

  const deleteAllPages = () => {
    pages.forEach(deletePageFile);
    setPages([]);
  };

  // --- export ---
  const startExport = () => {
    setExportStatus("exporting");
    setExportError(null);
  };

  const finishExport = (uri) => {
    deleteAllPages(); // PDF is saved, so the page images are no longer needed
    setPdfUri(uri);
    setExportStatus("done");
  };

  const failExport = (error) => {
    // pages stay on disk so the user can retry
    setExportError(error);
    setExportStatus("error");
  };

  const resetExport = () => {
    setExportStatus("idle");
    setPdfUri(null);
    setExportError(null);
  };

  // Start Over
  const clearAll = () => {
    deleteAllPages();
    resetExport();
  };

  return (
    <ScanContext.Provider
      value={{
        pages,
        exportStatus,
        pdfUri,
        exportError,
        addPages,
        removePage,
        startExport,
        finishExport,
        failExport,
        clearAll,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const context = useContext(ScanContext);
  if (!context) throw new Error("useScan must be used inside ScanProvider");
  return context;
}
