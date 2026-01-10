'use client';

import { useState, useCallback, useRef } from 'react';
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

function base64ToBlob(base64: string, mimeType: string = 'application/zip'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export function useDownload(): UseDownloadResult {
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPaidContent, setHasPaidContent] = useState(false);
  const [publicationName, setPublicationName] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setProgress(null);
  }, []);

  const startDownload = useCallback(async (url: string) => {
    reset();
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to start download');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as DownloadProgress;
              setProgress(data);

              // Handle completion
              if (data.status === 'complete') {
                if (data.zipData) {
                  const blob = base64ToBlob(data.zipData);
                  setZipBlob(blob);
                }
                if (data.filename) {
                  setFilename(data.filename);
                }
                if (data.publicationName) {
                  setPublicationName(data.publicationName);
                }
                if (data.hasPaidContent) {
                  setHasPaidContent(true);
                }
              }

              // Handle error
              if (data.status === 'error' && data.error) {
                setError(data.error);
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setProgress({
        currentPost: '',
        processedPosts: 0,
        totalPosts: 0,
        percentage: 0,
        status: 'error',
        error: errorMessage,
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
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
