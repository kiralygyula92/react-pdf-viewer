// Material Icons paths (Apache License 2.0, Google). See NOTICE.

function createIcon(path: string, displayName: string) {
  function Icon() {
    return (
      <svg className="rpv-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={path} />
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

const MAGNIFIER =
  'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z';

export const ZoomOutIcon = createIcon(`${MAGNIFIER}M7 9h5v1H7z`, 'ZoomOutIcon');
export const ZoomInIcon = createIcon(`${MAGNIFIER}m2.5-4h-2v2H9v-2H7V9h2V7h1v2h2v1z`, 'ZoomInIcon');
export const NavigateBeforeIcon = createIcon(
  'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  'NavigateBeforeIcon',
);
export const NavigateNextIcon = createIcon(
  'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  'NavigateNextIcon',
);
export const FullscreenIcon = createIcon(
  'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
  'FullscreenIcon',
);
export const FullscreenExitIcon = createIcon(
  'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z',
  'FullscreenExitIcon',
);
export const RotateRightIcon = createIcon(
  'M15.55 5.55 11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42 1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z',
  'RotateRightIcon',
);
export const DownloadIcon = createIcon('M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z', 'DownloadIcon');
export const PrintIcon = createIcon(
  'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
  'PrintIcon',
);
export const ErrorOutlineIcon = createIcon(
  'M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
  'ErrorOutlineIcon',
);
export const SearchIcon = createIcon(MAGNIFIER, 'SearchIcon');
export const ExpandLessIcon = createIcon(
  'm12 8-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z',
  'ExpandLessIcon',
);
export const ExpandMoreIcon = createIcon(
  'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z',
  'ExpandMoreIcon',
);
