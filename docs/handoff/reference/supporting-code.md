# Supporting Code (from the original host app)

These are the host-app definitions that `CustomPdfViewer.original.tsx` and `ViewReportSection.original.tsx` import. They are reproduced here so the originals can be read in full context. **Do not port the host coupling** (see 02 KI-18).

---

## Props and PDF.js types (`src/types/uiInterfaces.ts`)

```ts
export interface CustomPdfViewerProps {
  pdfUrl: string;
  documentName?: string;
  onError?: (error: string) => void;
  isFullscreen?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  rotation?: number;
  onRotationChange?: (rotation: number) => void;
}

// Minimal hand-written PDF.js typings (replace with real pdfjs-dist types in the new package)
export interface PDFDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPage>;
}

export interface PDFPage {
  getViewport: (params: { scale: number; rotation?: number }) => PDFViewport;
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: PDFViewport }) => { promise: Promise<void> };
}

export interface PDFViewport {
  width: number;
  height: number;
  transform: number[];
}

export interface ViewReportSectionProps {
  pdfUrl?: string;
  generatedAtDateUTC?: Date | string;
}

// Global augmentation used by the original (do NOT reproduce)
declare global {
  interface Window {
    pdfjsLib: any;
  }
}
```

## Constants (`src/constants.ts`) {#constants}

```ts
// PDF viewer constants
export const PDF_JS_VERSION = '3.11.174';
export const PDF_JS_LOAD_TIMEOUT = 15000; // 15 seconds
export const PDF_JS_CHECK_INTERVAL = 100; // 100ms
export const PDF_JS_CHECK_TIMEOUT = 10000; // 10 seconds
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 5.0;
export const DEFAULT_SCALE = 1.0;
export const SCALE_STEP = 0.05;
export const ROTATION_STEP = 90;

// CDN URLs for PDF.js library
export const PDF_JS_CDN_URLS = [
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.min.js`,
  `https://unpkg.com/pdfjs-dist@${PDF_JS_VERSION}/build/pdf.min.js`,
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/build/pdf.min.js`,
];

export const PDF_JS_WORKER_URLS = [
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`,
  `https://unpkg.com/pdfjs-dist@${PDF_JS_VERSION}/build/pdf.worker.min.js`,
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/build/pdf.worker.min.js`,
];

export const CMAP_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/cmaps/`;

// Layout grid used by the page hosting the viewer
export const GRID_SIZE_MAIN = { xs: 12, md: 8.5 } as const;   // viewer column
export const GRID_SIZE_SIDEBAR = { xs: 12, md: 3.5 } as const; // email-report sidebar
```

## `useIsMobile` (`src/hooks/useIsMobile.tsx`)

```ts
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export const useIsMobile = () => {
  const theme = useTheme();
  const isMobileScreen = useMediaQuery(theme.breakpoints.down('md'));
  return isMobileScreen;
};
```

## Theme values that affect the viewer

| Token | Value | Used by |
|-------|-------|---------|
| Breakpoints | `xs 0, sm 600, md 960, lg 1280, xl 1440` (custom; MUI's default md is 900) | `useIsMobile` → `down('md')` = `max-width: 959.95px` |
| `palette.customColors.grey1100` | `#54646E` | Toolbar background |
| `palette.grey[800]` | `#424242` (MUI default) | Toolbar background fallback |
| `palette.common.white` | `#FFFFFF` | Toolbar icons and text |
| Spacing unit | MUI default 8px, assumed (not overridden in the viewer code) | All `p`/`m`/`gap` multipliers |

## Download file name (`generateDocumentName` in `src/utils/dateFormatting.ts`)

The consumer builds `documentName` as **`treatment-report-YYYY-MM-DD.pdf`** from the report's `generatedAtDateUTC`, using `toISOString().split('T')[0]`, which is the UTC date. If no date is given, it uses the current date. This is host-specific. In the new package the consumer passes `fileName`.

## Where the viewer is mounted (`src/pages/lab/sections/PoolReportSection.tsx`)

```tsx
<Grid container spacing={GRID_SPACING_DEFAULT}>
  <Grid container size={GRID_SIZE_MAIN} spacing={GRID_SPACING_DEFAULT}>
    <ViewReportSection
      pdfUrl={stableTreatmentReportFileUrl}              // treatmentReport?.fileUrl || ''
      generatedAtDateUTC={stableTreatmentReportGeneratedAtDateUTC}
    />
  </Grid>
  <Grid size={GRID_SIZE_SIDEBAR}>
    <SendReportEmailSection reportId={…} treatmentPlanId={…} />
  </Grid>
</Grid>
```

The PDF URL comes from a server-generated report (`treatmentReport.fileUrl`). The auth-protected endpoint is why the original has its 401 → sign-in handling.
