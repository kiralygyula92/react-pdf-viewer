import { PdfViewer, type PdfViewerLabels } from '@kiralygyula92/react-pdf-viewer';

// Defined once at module scope: labels are merged per object identity.
const hungarian: Partial<PdfViewerLabels> = {
  viewer: 'PDF-megjelenítő',
  toolbar: 'PDF-vezérlők',
  zoomIn: 'Nagyítás',
  zoomOut: 'Kicsinyítés',
  previousPage: 'Előző oldal',
  nextPage: 'Következő oldal',
  enterFullscreen: 'Teljes képernyő',
  exitFullscreen: 'Kilépés a teljes képernyőből',
  rotate: 'Forgatás',
  download: 'Letöltés',
  print: 'Nyomtatás',
  moreActions: 'További műveletek',
  pageAriaLabel: (page, total, { formatNumber }) =>
    `${formatNumber(page)}. oldal, összesen ${formatNumber(total)}`,
};

export default function Demo() {
  return <PdfViewer source="/samples/multipage.pdf" locale="hu-HU" labels={hungarian} />;
}
