import { PdfViewer } from '@kiralygyula92/react-pdf-viewer';

export default function Demo() {
  return (
    <PdfViewer
      source="/samples/archived-report.pdf"
      getHttpErrorMessage={
        async (response) =>
          response.status === 404
            ? 'This report has been archived. Ask your administrator to restore it.'
            : undefined // use the default message for other statuses
      }
    />
  );
}
