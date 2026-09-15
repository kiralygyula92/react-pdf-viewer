import { useEffect, useRef, useState } from 'react';
import { isPdfFile } from './SourcePicker';

/** Accepts a PDF dropped anywhere on the page. Returns whether a file is being dragged. */
export function useFileDrop(onFile: (file: File) => void): boolean {
  const [dragging, setDragging] = useState(false);
  const onFileRef = useRef(onFile);
  useEffect(() => {
    onFileRef.current = onFile;
  });

  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;
    const handleEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setDragging(true);
    };
    const handleLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const handleOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const handleDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const file = [...(event.dataTransfer?.files ?? [])].find(isPdfFile);
      if (file) onFileRef.current(file);
    };
    window.addEventListener('dragenter', handleEnter);
    window.addEventListener('dragleave', handleLeave);
    window.addEventListener('dragover', handleOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleEnter);
      window.removeEventListener('dragleave', handleLeave);
      window.removeEventListener('dragover', handleOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  return dragging;
}
