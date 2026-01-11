"use client";

import { useState, useEffect } from "react";

/**
 * A hook that syncs state with localStorage.
 *
 * @param key The localStorage key
 * @param defaultValue The initial value if no value is found in localStorage
 * @returns [state, setState] pair
 */
export function usePersistence<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  // Pass a function to useState so it's only executed once during initialization
  const [state, setState] = useState<T>(defaultValue);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue !== null) {
        setState(JSON.parse(storedValue));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  // Update localStorage when state changes
  const setPersistedState = (value: T) => {
    setState(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing localStorage key "${key}":`, error);
    }
  };

  return [state, setPersistedState];
}
