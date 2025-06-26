import { useState, useCallback, useRef, useEffect } from "react";

interface EmailVersion {
  id: string;
  content: string;
  timestamp: Date;
  source: "user" | "ai";
  description?: string;
}

interface UseEmailVersionsReturn {
  currentContent: string;
  versions: EmailVersion[];
  currentVersionIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  addVersion: (
    content: string,
    source: "user" | "ai",
    description?: string
  ) => void;
  undo: () => void;
  redo: () => void;
  goToVersion: (index: number) => void;
}

export function useEmailVersions(
  initialContent: string,
  key?: string
): UseEmailVersionsReturn {
  const [versions, setVersions] = useState<EmailVersion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const versionIdCounter = useRef(1);
  const prevKey = useRef<string | undefined>(key);
  const isInitialized = useRef(false);

  // Reset versions when key changes (switching campaigns)
  // But not when content changes for the same key (saving)
  useEffect(() => {
    if (prevKey.current !== key || !isInitialized.current) {
      setVersions([
        {
          id: `v-${Date.now()}`,
          content: initialContent,
          timestamp: new Date(),
          source: "user",
          description: "Initial version",
        },
      ]);
      setCurrentIndex(0);
      prevKey.current = key;
      isInitialized.current = true;
    }
  }, [key, initialContent]);

  const currentContent = versions[currentIndex]?.content || initialContent;
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < versions.length - 1;

  const addVersion = useCallback(
    (content: string, source: "user" | "ai", description?: string) => {
      const newVersion: EmailVersion = {
        id: `v-${Date.now()}-${versionIdCounter.current++}`,
        content,
        timestamp: new Date(),
        source,
        description,
      };

      setVersions((prev) => {
        // If we're not at the latest version, remove all versions after current
        const newVersions = prev.slice(0, currentIndex + 1);
        return [...newVersions, newVersion];
      });
      setCurrentIndex((prev) => prev + 1);
    },
    [currentIndex]
  );

  const undo = useCallback(() => {
    if (canUndo) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [canRedo]);

  const goToVersion = useCallback(
    (index: number) => {
      if (index >= 0 && index < versions.length) {
        setCurrentIndex(index);
      }
    },
    [versions.length]
  );

  return {
    currentContent,
    versions,
    currentVersionIndex: currentIndex,
    canUndo,
    canRedo,
    addVersion,
    undo,
    redo,
    goToVersion,
  };
}
