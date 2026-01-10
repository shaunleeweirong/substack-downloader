'use client';

import { useState, useCallback } from 'react';
import { DownloadProgress } from '@/lib/substack/types';

interface UseDownloadResult {
  progress: DownloadProgress | null;
  zipBlob: Blob | null;
  filename: string;
  error: string | null;
  isLoading: boolean;
  hasPaidContent: boolean;
  publicationName: string;
  startDownload: (url: string) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useDownload(): UseDownloadResult {
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPaidContent, setHasPaidContent] = useState(false);
  const [publicationName, setPublicationName] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const reset = useCallback(() => {
    setProgress(null);
    setZipBlob(null);
    setFilename('');
    setError(null);
    setIsLoading(false);
    setHasPaidContent(false);
    setPublicationName('');
  }, []);

  const cancel = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsLoading(false);
    setProgress(null);
  }, [abortController]);

  const startDownload = useCallback(async (url: string) => {
    reset();
    setIsLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Start the download request
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Download failed');
      }

      // Check for paid content header
      const paidContentHeader = response.headers.get('X-Has-Paid-Content');
      const pubNameHeader = response.headers.get('X-Publication-Name');
      const filenameHeader = response.headers.get('X-Filename');

      if (paidContentHeader === 'true') {
        setHasPaidContent(true);
      }

      if (pubNameHeader) {
        setPublicationName(pubNameHeader);
      }

      if (filenameHeader) {
        setFilename(filenameHeader);
      }

      // Read the response as a blob
      const blob = await response.blob();
      setZipBlob(blob);

      setProgress({
        currentPost: '',
        processedPosts: 0,
        totalPosts: 0,
        percentage: 100,
        status: 'complete',
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled
        return;
      }
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setProgress({
        currentPost: '',
        processedPosts: 0,
        totalPosts: 0,
        percentage: 0,
        status: 'error',
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  }, [reset]);

  return {
    progress,
    zipBlob,
    filename,
    error,
    isLoading,
    hasPaidContent,
    publicationName,
    startDownload,
    cancel,
    reset,
  };
}
