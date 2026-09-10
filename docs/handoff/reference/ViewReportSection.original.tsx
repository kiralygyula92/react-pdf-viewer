import { useState, useCallback, useMemo, memo } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
} from '@mui/material';
import CustomPdfViewer from '../../../../components/common/CustomPdfViewer';
import type { ViewReportSectionProps } from '../../../../types/uiInterfaces';
import { generateDocumentName } from '../../../../utils/dateFormatting';

/**
 * ViewReportSection component
 * 
 * Displays a PDF viewer for water test reports with support for fullscreen mode.
 * Manages PDF viewer state (page, scale, rotation) and handles fullscreen toggling.
 * 
 * The component renders the PDF viewer either in a fullscreen dialog or in a regular
 * container box, depending on the fullscreen state.
 * 
 * Performance optimizations:
 * - All callbacks are memoized with useCallback to prevent unnecessary re-renders
 * - PDF viewer props object is memoized and only recreates when dependencies change
 * - Component is memoized with custom comparison to prevent re-renders when pdfUrl hasn't changed
 * - State setters are stable references and don't cause re-renders
 * 
 * @param pdfUrl - Optional URL to the PDF report to display
 */
function ViewReportSection({ pdfUrl, generatedAtDateUTC }: ViewReportSectionProps) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);

  // Memoize pdfUrl fallback to ensure stable reference
  // Handles edge cases: undefined -> '', empty string -> ''
  const stablePdfUrl = useMemo(() => pdfUrl || '', [pdfUrl]);
  
  // Generate document name from date using helper function
  const documentName = useMemo(() => generateDocumentName(generatedAtDateUTC), [generatedAtDateUTC]);

  // Memoize error handler to prevent unnecessary re-renders of CustomPdfViewer
  // Empty dependency array since handler doesn't depend on any props or state
  const handleError = useCallback((error: string) => {
    console.error('PDF Error:', error);
  }, []);

  // Memoize fullscreen close handler
  // Empty dependency array since setIsFullscreen is a stable setState function
  const handleCloseFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  // Memoize state change handlers to provide stable references
  // These are passed to CustomPdfViewer and need to be stable to prevent re-renders
  const handleFullscreenChange = useCallback((value: boolean) => {
    setIsFullscreen(value);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale);
  }, []);

  const handleRotationChange = useCallback((newRotation: number) => {
    setRotation(newRotation);
  }, []);

  // Extract PDF viewer props to avoid duplication and ensure stable references
  // Only recreates object when actual dependencies change (not on every render)
  // State setters (setIsFullscreen, etc.) are stable, but we use wrapped callbacks for clarity
  const pdfViewerProps = useMemo(
    () => ({
      pdfUrl: stablePdfUrl,
      documentName,
      onError: handleError,
      isFullscreen,
      onFullscreenChange: handleFullscreenChange,
      currentPage,
      onPageChange: handlePageChange,
      scale,
      onScaleChange: handleScaleChange,
      rotation,
      onRotationChange: handleRotationChange,
    }),
    [
      stablePdfUrl,
      documentName,
      handleError,
      isFullscreen,
      handleFullscreenChange,
      currentPage,
      handlePageChange,
      scale,
      handleScaleChange,
      rotation,
      handleRotationChange,
    ]
  );

  if (isFullscreen) {
    return (
      <Dialog
        open={isFullscreen}
        onClose={handleCloseFullscreen}
        fullScreen
        sx={{
          '& .MuiDialog-paper': {
            margin: 0,
            maxHeight: '100vh',
            maxWidth: '100vw',
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <CustomPdfViewer {...pdfViewerProps} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        maxHeight: '100%',
      }}
    >
      <CustomPdfViewer {...pdfViewerProps} />
    </Box>
  );
}

/**
 * Custom comparison function for memo to optimize re-render prevention
 * Only re-renders when pdfUrl prop actually changes (by value, not reference)
 */
const arePropsEqual = (prevProps: ViewReportSectionProps, nextProps: ViewReportSectionProps): boolean => {
  // Handle undefined/null cases
  const prevUrl = prevProps.pdfUrl || '';
  const nextUrl = nextProps.pdfUrl || '';
  
  // Only re-render if pdfUrl actually changed
  return prevUrl === nextUrl;
};

// Memoize component with custom comparison to prevent unnecessary re-renders
// Custom comparison ensures re-render only when pdfUrl actually changes (by value)
// This is more efficient than default shallow comparison when parent passes new object references
export default memo(ViewReportSection, arePropsEqual);