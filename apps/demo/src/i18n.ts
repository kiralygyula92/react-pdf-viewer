import type { PdfViewerLabels } from '@kiralygyula92/react-pdf-viewer';

/** Hungarian labels, proving that every string is replaceable. */
export const hungarianLabels: Partial<PdfViewerLabels> = {
  viewer: 'PDF-megjelenítő',
  toolbar: 'PDF-vezérlők',
  document: 'Dokumentum',
  zoomOut: 'Kicsinyítés',
  zoomIn: 'Nagyítás',
  resetZoom: 'Nagyítás visszaállítása',
  previousPage: 'Előző oldal',
  nextPage: 'Következő oldal',
  pageAriaLabel: (page, total, { formatNumber }) =>
    `${formatNumber(page)}. oldal, összesen ${formatNumber(total)}`,
  pageInput: 'Oldalszám',
  enterFullscreen: 'Teljes képernyő',
  exitFullscreen: 'Kilépés a teljes képernyőből',
  rotate: 'PDF elforgatása',
  download: 'PDF letöltése',
  print: 'PDF nyomtatása',
  moreActions: 'További műveletek',
  loading: 'PDF betöltése…',
  retry: 'Újra',
  empty: 'Nincs dokumentum',
  printProgress: (done, total, { formatNumber }) =>
    `Nyomtatás előkészítése… ${formatNumber(done)} / ${formatNumber(total)}`,
  cancel: 'Mégse',
  passwordPrompt: 'A dokumentum jelszóval védett',
  passwordLabel: 'Jelszó',
  passwordSubmit: 'Megnyitás',
  passwordIncorrect: 'Hibás jelszó. Próbálja újra.',
  thumbnails: 'Oldalak',
  search: 'Keresés a dokumentumban',
  searchResults: (current, total, { formatNumber }) =>
    `${formatNumber(current)} / ${formatNumber(total)}`,
  searchPrevious: 'Előző találat',
  searchNext: 'Következő találat',
  searchNoResults: 'Nincs találat',
};
