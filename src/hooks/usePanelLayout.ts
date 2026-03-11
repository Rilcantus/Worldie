import { useEffect, useRef, useState } from "react";

type ResizeTarget = "sidebar" | "doclist" | "right";

export function usePanelLayout() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [docListWidth, setDocListWidth] = useState(260);
  const [rightPanelWidth, setRightPanelWidth] = useState(240);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDocListCollapsed, setIsDocListCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

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
      if (dragState.current.target === "sidebar") {
        setSidebarWidth(Math.min(360, Math.max(200, dragState.current.startWidth + delta)));
      }
      if (dragState.current.target === "doclist") {
        setDocListWidth(Math.min(340, Math.max(220, dragState.current.startWidth + delta)));
      }
      if (dragState.current.target === "right") {
        setRightPanelWidth(Math.min(360, Math.max(200, dragState.current.startWidth - delta)));
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
