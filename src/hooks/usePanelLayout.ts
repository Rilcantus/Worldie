import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampPanelWidths,
  getPanelBounds,
  resolveResizedPanelWidth,
  type ResizeTarget,
} from "./panelLayoutState";

const getViewportWidth = () => (typeof window === "undefined" ? 1440 : window.innerWidth);

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
      if (dragState.current.target === "sidebar") {
        setSidebarWidth(resolveResizedPanelWidth(
          "sidebar",
          dragState.current.startWidth,
          dragState.current.startX,
          event.clientX,
          getViewportWidth(),
        ));
      }
      if (dragState.current.target === "doclist") {
        setDocListWidth(resolveResizedPanelWidth(
          "doclist",
          dragState.current.startWidth,
          dragState.current.startX,
          event.clientX,
          getViewportWidth(),
        ));
      }
      if (dragState.current.target === "right") {
        setRightPanelWidth(resolveResizedPanelWidth(
          "right",
          dragState.current.startWidth,
          dragState.current.startX,
          event.clientX,
          getViewportWidth(),
        ));
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
      const nextWidths = clampPanelWidths(
        {
          sidebarWidth,
          docListWidth,
          rightPanelWidth,
        },
        getViewportWidth(),
      );
      setSidebarWidth((current) => {
        const next = nextWidths.sidebarWidth;
        return next === current ? current : next;
      });
      setDocListWidth((current) => {
        const next = nextWidths.docListWidth;
        return next === current ? current : next;
      });
      setRightPanelWidth((current) => {
        const next = nextWidths.rightPanelWidth;
        return next === current ? current : next;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [docListWidth, rightPanelWidth, sidebarWidth]);

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

  const startResize = useCallback((target: ResizeTarget, clientX: number) => {
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
  }, [docListWidth, rightPanelWidth, sidebarWidth]);

  return useMemo(
    () => ({
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
    }),
    [
      sidebarWidth,
      docListWidth,
      rightPanelWidth,
      isSidebarCollapsed,
      isDocListCollapsed,
      isRightPanelCollapsed,
      startResize,
    ],
  );
}
