import { useEffect, useState } from "react";
import { useAppStore } from "@/store";

export function useSidebarAutoCollapse() {
  const {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    sidebarUserPreference,
    setSidebarUserPreference,
  } = useAppStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle auto-collapsing based on 1400px breakpoint
  useEffect(() => {
    if (!mounted) return;

    const handleResize = () => {
      const width = window.innerWidth;
      const isLargeScreen = width >= 1400;

      if (isLargeScreen) {
        // On large screens, expand unless user explicitly wants it collapsed
        if (sidebarUserPreference === "collapsed") {
          setIsSidebarCollapsed(true);
        } else {
          setIsSidebarCollapsed(false);
        }
      } else {
        // On smaller screens (< 1400px), always auto-collapse
        // We don't change the preference here, just the active state
        setIsSidebarCollapsed(true);
      }
    };

    // Run on mount
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mounted, setIsSidebarCollapsed, sidebarUserPreference]);
}
