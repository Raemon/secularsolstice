'use client';

import { useState, useEffect } from 'react';

const PDFViewer = ({fileUrl}:{fileUrl: string}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ReactPDF, setReactPDF] = useState<any>(null);

  useEffect(() => {
    // Dynamically import react-pdf only on the client side
    const loadReactPDF = async () => {
      try {
        const { Document, Page, pdfjs } = await import('react-pdf');
        // Configure PDF.js worker
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        setReactPDF({ Document, Page });
      } catch (err) {
        setError('Failed to load PDF viewer');
      }
    };
    loadReactPDF();
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (err: Error) => {
    setError(`Failed to load PDF: ${err.message}`);
  };

  if (!ReactPDF) {
    return <p className="text-gray-500 text-xs">Loading PDF viewer...</p>;
  }

  const { Document, Page } = ReactPDF;

  return (
    <div className="w-full">
      {error ? (
        <p className="text-red-600 text-xs">{error}</p>
      ) : (
        <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} className="flex flex-col items-center">
          {numPages && Array.from(new Array(numPages), (el, index) => (
            <Page key={`page_${index + 1}`} pageNumber={index + 1} renderTextLayer={false} renderAnnotationLayer={false} className="mb-2" width={800} />
          ))}
        </Document>
      )}
    </div>
  );
};

export default PDFViewer;

