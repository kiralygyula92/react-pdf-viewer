import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Toolbar,
  useTheme,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  RotateRight as RotateIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Fullscreen as FullscreenIcon,
} from '@mui/icons-material';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAuthStore } from '../../stores';
import type { CustomPdfViewerProps, PDFDocument } from '../../types/uiInterfaces';
import {
  PDF_JS_LOAD_TIMEOUT,
  PDF_JS_CHECK_INTERVAL,
  PDF_JS_CHECK_TIMEOUT,
  MIN_SCALE,
  MAX_SCALE,
  DEFAULT_SCALE,
  SCALE_STEP,
  ROTATION_STEP,
  PDF_JS_CDN_URLS,
  PDF_JS_WORKER_URLS,
  CMAP_URL,
} from '../../constants';

function CustomPdfViewer({ 
  pdfUrl, 
  documentName,
  onError, 
  isFullscreen = false, 
  onFullscreenChange,
  currentPage: externalCurrentPage,
  onPageChange,
  scale: externalScale,
  onScaleChange,
  rotation: externalRotation,
  onRotationChange
}: CustomPdfViewerProps) {
  const isMobile = useIsMobile();
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  
  // Use external state if provided, otherwise use internal state
  const currentPage = externalCurrentPage ?? 1;
  const scale = externalScale ?? 1.0;
  const rotation = externalRotation ?? 0;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfJsReady, setPdfJsReady] = useState(false);
  const pdfJsLoadingRef = useRef(false);
  const pdfLoadingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPageSetRef = useRef(false);

  // Load PDF.js library dynamically on component mount
  useEffect(() => {
    // Skip if already loaded or loading
    if (window.pdfjsLib) {
      setPdfJsReady(true);
      return;
    }

    if (pdfJsLoadingRef.current) {
      return;
    }

    pdfJsLoadingRef.current = true;

    // Set timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setError('PDF.js library failed to load within timeout period');
    }, PDF_JS_LOAD_TIMEOUT);

    const loadPdfJs = async (): Promise<void> => {
      if (window.pdfjsLib) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="pdf.min.js"]');
      if (existingScript) {
        return new Promise<void>((resolve, reject) => {
          existingScript.addEventListener('load', () => {
            if (window.pdfjsLib && timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            resolve();
          });
          existingScript.addEventListener('error', () => {
            reject(new Error('Failed to load PDF.js'));
          });
        });
      }

      // Try loading from multiple CDNs for better reliability
      const tryLoadScript = (index: number): Promise<void> => {
        return new Promise((resolve, reject) => {
          if (index >= PDF_JS_CDN_URLS.length) {
            reject(new Error('All PDF.js CDNs failed to load'));
            return;
          }

          const script = document.createElement('script');
          script.src = PDF_JS_CDN_URLS[index];
          script.async = true;
          document.head.appendChild(script);

          script.onload = () => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            // Configure PDF.js worker
            if (window.pdfjsLib) {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_URLS[index];
              setPdfJsReady(true);
            }
            resolve();
          };

          script.onerror = () => {
            document.head.removeChild(script);
            tryLoadScript(index + 1).then(resolve).catch(reject);
          };
        });
      };

      return tryLoadScript(0);
    };

    loadPdfJs().catch((err) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF.js library';
      setError(errorMessage);
      setIsLoading(false);
    });

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Load PDF document only when URL changes (not on page/scale/rotation changes)
  useEffect(() => {
    const loadPdf = async (): Promise<void> => {
      if (!pdfUrl) {
        setPdfDoc(null);
        setIsLoading(false);
        return;
      }

      // Wait for PDF.js to be available
      if (!pdfJsReady || !window.pdfjsLib) {
        return;
      }

      // Skip if already loading
      if (pdfLoadingRef.current) {
        return;
      }

      pdfLoadingRef.current = true;

      try {
        setIsLoading(true);
        setError(null);

        // Wait for PDF.js to be fully available
        const waitForPdfJs = (): Promise<void> => {
          return new Promise((resolve, reject) => {
            if (window.pdfjsLib) {
              resolve();
              return;
            }

            const checkInterval = setInterval(() => {
              if (window.pdfjsLib) {
                clearInterval(checkInterval);
                resolve();
              }
            }, PDF_JS_CHECK_INTERVAL);

            // Timeout after specified duration
            setTimeout(() => {
              clearInterval(checkInterval);
              reject(new Error('PDF.js library failed to load'));
            }, PDF_JS_CHECK_TIMEOUT);
          });
        };

        await waitForPdfJs();

        // Fetch PDF as blob/ArrayBuffer to bypass CORS restrictions
        // This works because we fetch the PDF ourselves and pass the data to PDF.js
        // instead of letting PDF.js fetch it directly (which is subject to CORS)
        let response: Response;
        try {
          response = await fetch(pdfUrl);
          
          // Handle 401 Unauthorized - purge store and redirect to sign in
          // Check status immediately after fetch, before any other processing
          const status = response.status;
          if (status === 401) {
            pdfLoadingRef.current = false;
            setIsLoading(false);
            useAuthStore.getState().purgeStoreData();
            window.location.replace('/auth/sign-in');
            return;
          }

          if (!response.ok) {
            // Also check for 401 in non-ok responses (redundant but safe)
            if (status === 401) {
              pdfLoadingRef.current = false;
              setIsLoading(false);
              useAuthStore.getState().purgeStoreData();
              window.location.replace('/auth/sign-in');
              return;
            }

            // Try to extract error message from response
            let errorMessage = `Failed to fetch PDF: ${response.status} ${response.statusText}`;
            try {
              // Clone response before reading to avoid consuming the body
              const clonedResponse = response.clone();
              const errorData = await clonedResponse.json();
              if (errorData?.detail) {
                errorMessage = errorData.detail;
              } else if (errorData?.title) {
                errorMessage = errorData.title;
              } else if (typeof errorData === 'string') {
                errorMessage = errorData;
              }
            } catch {
              // If JSON parsing fails, use the default error message
            }
            throw new Error(errorMessage);
          }
        } catch (fetchError) {
          // Check if error has a response property with status 401 (for network libraries that wrap fetch)
          if (fetchError && typeof fetchError === 'object' && 'response' in fetchError) {
            const errorWithResponse = fetchError as { response?: { status?: number } };
            if (errorWithResponse.response?.status === 401) {
              pdfLoadingRef.current = false;
              setIsLoading(false);
              useAuthStore.getState().purgeStoreData();
              window.location.replace('/auth/sign-in');
              return;
            }
          }
          
          // Re-throw if it's already an Error with message
          if (fetchError instanceof Error) {
            throw fetchError;
          }
          // Otherwise, create a new error with a default message
          throw new Error('Failed to fetch PDF document');
        }

        const arrayBuffer = await response.arrayBuffer();

        // Load PDF from ArrayBuffer instead of URL to avoid CORS issues
        const loadingTask = window.pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: CMAP_URL,
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        
        // Set initial page to external current page or 1 (only on initial load, if not already set)
        if (!initialPageSetRef.current && onPageChange) {
          const initialPage = externalCurrentPage ?? 1;
          onPageChange(initialPage);
          initialPageSetRef.current = true;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF document';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
        setPdfDoc(null);
      } finally {
        setIsLoading(false);
        pdfLoadingRef.current = false;
      }
    };

    loadPdf();

    // Cleanup: reset loading ref and initial page flag when URL changes
    return () => {
      pdfLoadingRef.current = false;
      initialPageSetRef.current = false;
    };
    // Only reload PDF when URL or PDF.js readiness changes, not on page/scale/rotation changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl, pdfJsReady]);

  // Render current page - only re-renders when page/scale/rotation changes, not when PDF loads
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) {
      return;
    }

    try {
      // Validate page number
      const pageNum = Math.max(1, Math.min(currentPage, pdfDoc.numPages));
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale, rotation });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        return;
      }

      // Set canvas size to match the viewport (which already includes scale)
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to render PDF page';
      setError(errorMessage);
    }
  }, [pdfDoc, currentPage, scale, rotation]);

  // Re-render when page, scale, or rotation changes (only if PDF is loaded)
  // Optimized: Only render when pdfDoc exists and not loading, or when renderPage changes
  // isLoading is included to trigger render when loading completes, but renderPage is memoized
  // so it won't change unless page/scale/rotation actually change
  useEffect(() => {
    if (pdfDoc && !isLoading) {
      renderPage();
    }
  }, [renderPage, pdfDoc, isLoading]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(scale + SCALE_STEP, MAX_SCALE);
    onScaleChange?.(newScale);
  }, [scale, onScaleChange]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(scale - SCALE_STEP, MIN_SCALE);
    onScaleChange?.(newScale);
  }, [scale, onScaleChange]);

  // Page navigation
  const handlePreviousPage = useCallback(() => {
    if (pdfDoc && currentPage > 1) {
      const newPage = currentPage - 1;
      onPageChange?.(newPage);
    }
  }, [pdfDoc, currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (pdfDoc && currentPage < pdfDoc.numPages) {
      const newPage = currentPage + 1;
      onPageChange?.(newPage);
    }
  }, [pdfDoc, currentPage, onPageChange]);

  // Rotation control
  const handleRotate = useCallback(() => {
    const newRotation = (rotation + ROTATION_STEP) % 360;
    onRotationChange?.(newRotation);
  }, [rotation, onRotationChange]);

  // Fullscreen toggle
  const handleFullscreen = useCallback(() => {
    onFullscreenChange?.(!isFullscreen);
  }, [isFullscreen, onFullscreenChange]);

  const handleDownload = useCallback(async () => {
    // Use provided document name or fallback to default
    const fileName = documentName || 'treatment-report.pdf';

    try {
      // Try to fetch the PDF and create a blob for download
      const response = await fetch(pdfUrl);
      
      // Handle 401 Unauthorized - purge store and redirect to sign in
      const status = response.status;
      if (status === 401) {
        useAuthStore.getState().purgeStoreData();
        window.location.replace('/auth/sign-in');
        return;
      }

      if (!response.ok) {
        // Try to extract error message from response
        let errorMessage = 'Failed to fetch PDF';
        try {
          const errorData = await response.json();
          if (errorData?.detail) {
            errorMessage = errorData.detail;
          } else if (errorData?.title) {
            errorMessage = errorData.title;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } catch {
          // If JSON parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Use requestAnimationFrame to ensure the link is properly attached before clicking
      requestAnimationFrame(() => {
        link.click();
        // Clean up after a short delay to ensure download starts
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
      });
    } catch (error) {
      // Fallback to direct link if fetch fails
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      link.target = '_blank';
      link.style.display = 'none';
      document.body.appendChild(link);
      
      requestAnimationFrame(() => {
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      });
    }
  }, [pdfUrl, documentName]);

  const handlePrint = useCallback(() => {
    window.open(pdfUrl, '_blank');
  }, [pdfUrl]);

  // Calculate zoom percentage for display
  const zoomPercentage = useMemo(() => Math.round(scale * 100), [scale]);

  // Memoize page number display text
  const pageNumberText = useMemo(() => {
    return pdfDoc ? `${currentPage} / ${pdfDoc.numPages}` : '0 / 0';
  }, [pdfDoc, currentPage]);


  // Control bar component with memoization
  const ControlBar = useMemo(() => {
    const toolbarBgColor = 
      (theme.palette as { customColors?: { grey1100?: string } })?.customColors?.grey1100 || 
      theme.palette.grey[800];

    return (
      <Toolbar
        sx={{
          backgroundColor: toolbarBgColor,
          color: theme.palette.common.white,
          borderRadius: '8px',
          minHeight: '48px',
          px: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 5,
          '& .MuiToolbar-root': {
            minHeight: '48px',
          },
        }}
      >
        {/* Zoom controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={handleZoomOut}
            size="small"
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
            sx={{
              color: theme.palette.common.white,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:disabled': {
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <ZoomOutIcon />
          </IconButton>
          
          <Typography
            variant="body2"
            sx={{
              minWidth: '40px',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {zoomPercentage}%
          </Typography>
          
          <IconButton
            onClick={handleZoomIn}
            size="small"
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
            sx={{
              color: theme.palette.common.white,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:disabled': {
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <ZoomInIcon />
          </IconButton>
        </Box>

        {/* Page navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={handlePreviousPage}
            size="small"
            disabled={!pdfDoc || currentPage <= 1}
            aria-label="Previous page"
            sx={{
              color: theme.palette.common.white,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:disabled': {
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <NavigateBeforeIcon />
          </IconButton>
          
          <Typography
            variant="body2"
            sx={{
              minWidth: isMobile ? '40px' : '80px',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {pageNumberText}
          </Typography>
          
          <IconButton
            onClick={handleNextPage}
            size="small"
            disabled={!pdfDoc || currentPage >= pdfDoc.numPages}
            aria-label="Next page"
            sx={{
              color: theme.palette.common.white,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:disabled': {
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <NavigateNextIcon />
          </IconButton>
        </Box>

        {/* Additional controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={handleFullscreen}
            size="small"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            sx={{
              color: theme.palette.common.white,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:disabled': {
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <FullscreenIcon />
          </IconButton>
          
          {(!isMobile || (isMobile && isFullscreen)) && (
            <IconButton
              onClick={handleRotate}
              size="small"
              aria-label="Rotate PDF"
              sx={{
                color: theme.palette.common.white,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&:disabled': {
                  color: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              <RotateIcon />
            </IconButton>
          )}
          
          <IconButton
            onClick={handleDownload}
            size="small"
            aria-label="Download PDF"
            sx={{
              color: theme.palette.common.white,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:disabled': {
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <DownloadIcon />
          </IconButton>
          
          {(!isMobile || (isMobile && isFullscreen)) && (
            <IconButton
              onClick={handlePrint}
              size="small"
              aria-label="Print PDF"
              sx={{
                color: theme.palette.common.white,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&:disabled': {
                  color: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              <PrintIcon />
            </IconButton>
          )}
        </Box>
      </Toolbar>
    );
  }, [
    theme,
    scale,
    zoomPercentage,
    handleZoomIn,
    handleZoomOut,
    pdfDoc,
    currentPage,
    handlePreviousPage,
    handleNextPage,
    isMobile,
    isFullscreen,
    handleFullscreen,
    handleRotate,
    handleDownload,
    handlePrint,
  ]);

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '400px',
          p: 4,
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: isFullscreen ? '100vh' : 'auto',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '100%',
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: (scale <= DEFAULT_SCALE || (scale > DEFAULT_SCALE && !isMobile && isFullscreen)) ? 'center' : 'flex-start',
          alignItems: 'flex-start',
          backgroundColor: 'transparent',
          overflow: 'auto',
          p: isMobile ? (isFullscreen ? 4 : 2) : (isFullscreen ? 4 : 0),
          position: 'relative',
          mb: 8,
          maxWidth: isFullscreen ? '100%' : (isMobile ? '100%' : '650px'),
          minHeight: isMobile ? '400px' : '712px',
          maxHeight: isFullscreen ? '100%' : (isMobile ? '100%' : '800px'),
          width: '100%',
        }}
      >
        {isLoading ? (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              zIndex: 1,
            }}
          >
            <CircularProgress size={40} />
            <Typography variant="body1" color="text.secondary">
              Loading PDF...
            </Typography>
          </Box>
        ) : (
          <canvas
            ref={canvasRef}
            style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              display: 'block',
              maxWidth: scale === DEFAULT_SCALE ? '100%' : 'none',
              maxHeight: scale === DEFAULT_SCALE ? 'fit-content' : 'none',
              width: (isMobile && scale === DEFAULT_SCALE && !isFullscreen) ? '100%' : 'auto',
            }}
          />
        )}
      </Box>
      
      <Box sx={{ maxWidth: isFullscreen ? '100%' : '482px' }}>
        {ControlBar}
      </Box>
    </Box>
  );
}

// Memoize component to prevent re-renders when parent re-renders with same props
export default memo(CustomPdfViewer);
