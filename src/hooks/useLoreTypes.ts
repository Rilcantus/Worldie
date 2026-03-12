import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listProjectLoreTypes, saveProjectLoreTypes } from "../lib/data";
import {
  getDefaultLoreTypeId,
  slugifyLoreTypeName,
  sortLoreTypes,
  type LoreType,
} from "../lib/loreTypes";

export function useLoreTypes(activeProjectId: string | null) {
  const [loreTypes, setLoreTypes] = useState<LoreType[]>([]);
  const sortedLoreTypes = useMemo(() => sortLoreTypes(loreTypes), [loreTypes]);
  const loreTypesById = useMemo(
    () => new Map(sortedLoreTypes.map((loreType) => [loreType.id, loreType])),
    [sortedLoreTypes],
  );
  const [selectedLoreTypeId, setSelectedLoreTypeId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const loadRequestId = useRef(0);

  useEffect(() => {
    if (!activeProjectId) {
      loadRequestId.current += 1;
      setLoreTypes((current) => (current.length === 0 ? current : []));
      setHasLoaded((current) => (current ? false : current));
      return;
    }
    setHasLoaded((current) => (current ? false : current));
    const requestId = ++loadRequestId.current;
    void listProjectLoreTypes(activeProjectId)
      .then((loaded) => {
        if (requestId !== loadRequestId.current) return;
        setLoreTypes(loaded);
        setHasLoaded((current) => (current ? current : true));
      })
      .catch(() => {
        if (requestId !== loadRequestId.current) return;
        setLoreTypes((current) => (current.length === 0 ? current : []));
        setHasLoaded((current) => (current ? false : current));
      });
  }, [activeProjectId]);

  useEffect(() => {
    if (!activeProjectId || !hasLoaded) return;
    void saveProjectLoreTypes(activeProjectId, loreTypes).catch(() => undefined);
  }, [activeProjectId, hasLoaded, loreTypes]);

  useEffect(() => {
    if (selectedLoreTypeId && loreTypesById.has(selectedLoreTypeId)) return;
    const nextSelectedLoreTypeId = getDefaultLoreTypeId(sortedLoreTypes);
    setSelectedLoreTypeId((current) => (current === nextSelectedLoreTypeId ? current : nextSelectedLoreTypeId));
  }, [selectedLoreTypeId, sortedLoreTypes, loreTypesById]);

  const selectedLoreType = useMemo(
    () => (selectedLoreTypeId ? loreTypesById.get(selectedLoreTypeId) ?? null : null),
    [selectedLoreTypeId, loreTypesById],
  );

  const createLoreType = useCallback(() => {
    const nextType: LoreType = {
      id: crypto.randomUUID(),
      name: "New Lore Type",
      slug: slugifyLoreTypeName("New Lore Type"),
      order: loreTypes.length,
      isSystem: false,
    };
    setLoreTypes((prev) => sortLoreTypes([...prev, nextType]).map((type, index) => ({ ...type, order: index })));
    setSelectedLoreTypeId(nextType.id);
    return nextType;
  }, [loreTypes.length]);

  const updateLoreType = useCallback((loreTypeId: string, updates: Partial<Omit<LoreType, "id" | "isSystem">>) => {
    setLoreTypes((prev) =>
      prev.map((type) => {
        if (type.id !== loreTypeId) return type;
        const name = updates.name ?? type.name;
        return {
          ...type,
          ...updates,
          name,
          slug: updates.slug ? slugifyLoreTypeName(updates.slug) : slugifyLoreTypeName(name),
        };
      }),
    );
  }, []);

  const deleteLoreType = useCallback((loreTypeId: string) => {
    setLoreTypes((prev) =>
      sortLoreTypes(prev.filter((type) => type.id !== loreTypeId)).map((type, index) => ({ ...type, order: index })),
    );
  }, []);

  const moveLoreType = useCallback((loreTypeId: string, direction: -1 | 1) => {
    setLoreTypes((prev) => {
      const ordered = sortLoreTypes(prev);
      const index = ordered.findIndex((type) => type.id === loreTypeId);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= ordered.length) return prev;
      const next = [...ordered];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((type, order) => ({ ...type, order }));
    });
  }, []);

  return useMemo(
    () => ({
      loreTypes: sortedLoreTypes,
      selectedLoreTypeId,
      selectedLoreType,
      setSelectedLoreTypeId,
      createLoreType,
      updateLoreType,
      deleteLoreType,
      moveLoreType,
    }),
    [
      sortedLoreTypes,
      selectedLoreTypeId,
      selectedLoreType,
      createLoreType,
      updateLoreType,
      deleteLoreType,
      moveLoreType,
    ],
  );
}
