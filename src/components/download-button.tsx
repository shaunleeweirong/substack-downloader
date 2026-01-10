'use client';

interface DownloadButtonProps {
  zipBlob: Blob | null;
  filename: string;
  fileSize?: number;
}

export function DownloadButton({ zipBlob, filename, fileSize }: DownloadButtonProps) {
  if (!zipBlob) return null;

  const handleDownload = () => {
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-3 px-6 py-3 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      <span>Download Archive</span>
      {fileSize && (
        <span className="text-green-200 text-sm">
          ({formatFileSize(fileSize)})
        </span>
      )}
    </button>
  );
}
