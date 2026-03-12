import { useEffect, useRef, useState } from "react";

type ResizeTarget = "sidebar" | "doclist" | "right";

const getViewportWidth = () => (typeof window === "undefined" ? 1440 : window.innerWidth);

const getPanelBounds = (viewportWidth: number) => {
  if (viewportWidth >= 1720) {
    return {
      sidebar: { min: 220, max: 320, initial: 248 },
      doclist: { min: 240, max: 340, initial: 272 },
      right: { min: 220, max: 320, initial: 252 },
      collapseRightByDefault: false,
    };
  }

  if (viewportWidth >= 1440) {
    return {
      sidebar: { min: 210, max: 280, initial: 232 },
      doclist: { min: 228, max: 300, initial: 252 },
      right: { min: 210, max: 280, initial: 228 },
      collapseRightByDefault: false,
    };
  }

  return {
    sidebar: { min: 200, max: 240, initial: 216 },
    doclist: { min: 220, max: 260, initial: 236 },
    right: { min: 200, max: 236, initial: 216 },
    collapseRightByDefault: true,
  };
};

export function usePanelLayout() {
  const initialBounds = getPanelBounds(getViewportWidth());
  const [sidebarWidth, setSidebarWidth] = useState(initialBounds.sidebar.initial);
  const [docListWidth, setDocListWidth] = useState(initialBounds.doclist.initial);
  const [rightPanelWidth, setRightPanelWidth] = useState(initialBounds.right.initial);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDocListCollapsed, setIsDocListCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(initialBounds.collapseRightByDefault);

  const dragState = useRef<{
    target: ResizeTarget | null;
    startX: number;
    startWidth: number;
  }>({
    target: null,
    startX: 0,
    startWidth: 0,
  });

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!dragState.current.target) return;
      const delta = event.clientX - dragState.current.startX;
      const bounds = getPanelBounds(getViewportWidth());
      if (dragState.current.target === "sidebar") {
        setSidebarWidth(
          Math.min(bounds.sidebar.max, Math.max(bounds.sidebar.min, dragState.current.startWidth + delta)),
        );
      }
      if (dragState.current.target === "doclist") {
        setDocListWidth(
          Math.min(bounds.doclist.max, Math.max(bounds.doclist.min, dragState.current.startWidth + delta)),
        );
      }
      if (dragState.current.target === "right") {
        setRightPanelWidth(
          Math.min(bounds.right.max, Math.max(bounds.right.min, dragState.current.startWidth - delta)),
        );
      }
    };
    const handleUp = () => {
      dragState.current.target = null;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const bounds = getPanelBounds(getViewportWidth());
      setSidebarWidth((current) => Math.min(bounds.sidebar.max, Math.max(bounds.sidebar.min, current)));
      setDocListWidth((current) => Math.min(bounds.doclist.max, Math.max(bounds.doclist.min, current)));
      setRightPanelWidth((current) => Math.min(bounds.right.max, Math.max(bounds.right.min, current)));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!event.ctrlKey) return;
      if (event.key === "1") {
        event.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
      if (event.key === "2") {
        event.preventDefault();
        setIsDocListCollapsed((prev) => !prev);
      }
      if (event.key === "3") {
        event.preventDefault();
        setIsRightPanelCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const startResize = (target: ResizeTarget, clientX: number) => {
    dragState.current = {
      target,
      startX: clientX,
      startWidth:
        target === "sidebar"
          ? sidebarWidth
          : target === "doclist"
            ? docListWidth
            : rightPanelWidth,
    };
  };

  return {
    sidebarWidth,
    docListWidth,
    rightPanelWidth,
    isSidebarCollapsed,
    isDocListCollapsed,
    isRightPanelCollapsed,
    setIsSidebarCollapsed,
    setIsDocListCollapsed,
    setIsRightPanelCollapsed,
    startResize,
  };
}
