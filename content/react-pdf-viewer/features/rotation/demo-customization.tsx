import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/letter-3pages.pdf"
      defaultRotation={180}
      labels={{ rotate: 'Turn page' }}
      toolbar={{ actions: ['previousPage', 'pageIndicator', 'nextPage', 'rotate'] }}
    />
  );
}
