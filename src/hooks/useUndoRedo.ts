import { useState, useCallback, useRef } from 'react';

interface UseUndoRedoReturn<T> {
  value: T;
  setValue: (newValue: T, skipHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (newValue: T) => void;
}

export function useUndoRedo<T>(initialValue: T, maxHistory: number = 50): UseUndoRedoReturn<T> {
  const [history, setHistory] = useState<T[]>([initialValue]);
  const [index, setIndex] = useState(0);

  // We need a ref to track if the last action was an undo/redo to avoid overwriting history properly
  // actually standard implementation is straightforward.

  const value = history[index];

  const setValue = useCallback((newValue: T, skipHistory: boolean = false) => {
    if (skipHistory) {
        // Update current entry without adding to history
        setHistory(prev => {
            const copy = [...prev];
            copy[index] = newValue;
            return copy;
        });
        return;
    }

    if (newValue === history[index]) return;

    setHistory(prev => {
      const newHistory = prev.slice(0, index + 1);
      newHistory.push(newValue);
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        setIndex(i => i - 1); // adjustments handled by next setIndex? No, if we shift, index decreases by 1
        return newHistory;
      }
      return newHistory;
    });
    setIndex(prev => {
        const next = prev + 1;
        // Correction if we shifted
        if (history.length >= maxHistory && index >= maxHistory - 1) {
            return maxHistory - 1;
        }
        return next;
    });
  }, [history, index, maxHistory]);

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(i => i - 1);
    }
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex(i => i + 1);
    }
  }, [index, history.length]);

  const reset = useCallback((newValue: T) => {
    setHistory([newValue]);
    setIndex(0);
  }, []);

  return {
    value,
    setValue,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
    reset
  };
}
