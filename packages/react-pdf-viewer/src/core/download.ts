/** Wraps PDF bytes in a Blob (copying, so a shared or transferred buffer is never exposed). */
export function toPdfBlob(data: Uint8Array): Blob {
  return new Blob([new Uint8Array(data)], { type: 'application/pdf' });
}

/** Saves bytes as a file through a temporary object URL and a hidden `<a download>`. */
export function saveBytes(data: Uint8Array, fileName: string): void {
  const url = URL.createObjectURL(toPdfBlob(data));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
