import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

/*
 * This site calls configurePdfJs once at startup with a self-hosted worker and assets:
 *
 *   configurePdfJs({
 *     workerSrc,
 *     cMapUrl: '/pdfjs/cmaps/',
 *     standardFontDataUrl: '/pdfjs/standard_fonts/',
 *     wasmUrl: '/pdfjs/wasm/',
 *     iccUrl: '/pdfjs/iccs/',
 *   });
 *
 * This document uses the standard 14 fonts without embedding them, so it needs the font data.
 */
export default function Demo() {
  return <PdfViewer source="/samples/non-embedded-fonts.pdf" />;
}
