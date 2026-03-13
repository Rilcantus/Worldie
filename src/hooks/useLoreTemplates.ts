import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listProjectLoreTemplates, saveProjectLoreTemplates } from "../lib/data";
import {
  type LoreTemplate,
  type TraitDefinition,
} from "../lib/loreTemplates";
import { getDefaultLoreTypeId, type LoreType } from "../lib/loreTypes";

function removeTemplateById(templates: LoreTemplate[], templateId: string) {
  const next: LoreTemplate[] = [];
  let removed = false;

  for (const template of templates) {
    if (template.id === templateId) {
      removed = true;
      continue;
    }
    next.push(template);
  }

  return removed ? next : templates;
}

function removeTraitDefinitionWithOrder(traits: TraitDefinition[], traitId: string) {
  const next: TraitDefinition[] = [];
  let removed = false;

  for (const trait of traits) {
    if (trait.id === traitId) {
      removed = true;
      continue;
    }
    next.push({ ...trait, order: next.length });
  }

  return removed ? next : traits;
}

export function useLoreTemplates(activeProjectId: string | null, loreTypes: LoreType[]) {
  const [templates, setTemplates] = useState<LoreTemplate[]>([]);
  const templatesById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates],
  );
  const templatesByLoreTypeId = useMemo(() => {
    const grouped = new Map<string, LoreTemplate[]>();
    for (const template of templates) {
      const current = grouped.get(template.loreTypeId);
      if (current) {
        current.push(template);
      } else {
        grouped.set(template.loreTypeId, [template]);
      }
    }
    return grouped;
  }, [templates]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const loadRequestId = useRef(0);
  const defaultLoreTypeId = useMemo(() => getDefaultLoreTypeId(loreTypes) ?? "", [loreTypes]);

  useEffect(() => {
    if (!activeProjectId || loreTypes.length === 0) {
      loadRequestId.current += 1;
      setTemplates((current) => (current.length === 0 ? current : []));
      setHasLoaded((current) => (current ? false : current));
      return;
    }
    setHasLoaded((current) => (current ? false : current));
    const requestId = ++loadRequestId.current;
    void listProjectLoreTemplates(activeProjectId, loreTypes)
      .then((loaded) => {
        if (requestId !== loadRequestId.current) return;
        setTemplates(loaded);
        setHasLoaded((current) => (current ? current : true));
      })
      .catch(() => {
        if (requestId !== loadRequestId.current) return;
        setTemplates((current) => (current.length === 0 ? current : []));
        setHasLoaded((current) => (current ? false : current));
      });
  }, [activeProjectId, loreTypes]);

  useEffect(() => {
    if (!activeProjectId || !hasLoaded) return;
    void saveProjectLoreTemplates(activeProjectId, templates).catch(() => undefined);
  }, [activeProjectId, hasLoaded, templates]);

  useEffect(() => {
    if (selectedTemplateId && templatesById.has(selectedTemplateId)) {
      return;
    }
    const nextSelectedTemplateId = templates[0]?.id ?? null;
    setSelectedTemplateId((current) => (current === nextSelectedTemplateId ? current : nextSelectedTemplateId));
  }, [selectedTemplateId, templates, templatesById]);

  const selectedTemplate = useMemo(
    () => (selectedTemplateId ? templatesById.get(selectedTemplateId) ?? null : null),
    [selectedTemplateId, templatesById],
  );

  const createTemplate = useCallback((loreTypeId = defaultLoreTypeId) => {
    if (!loreTypeId) return null;
    const nextTemplate: LoreTemplate = {
      id: crypto.randomUUID(),
      name: "New Template",
      loreTypeId,
      traitDefinitions: [],
    };
    setTemplates((prev) => [nextTemplate, ...prev]);
    setSelectedTemplateId(nextTemplate.id);
    return nextTemplate;
  }, [defaultLoreTypeId]);

  const updateTemplate = useCallback((templateId: string, updates: Partial<Omit<LoreTemplate, "id">>) => {
    setTemplates((prev) =>
      prev.map((template) => (template.id === templateId ? { ...template, ...updates } : template)),
    );
  }, []);

  const deleteTemplate = useCallback((templateId: string) => {
    setTemplates((prev) => removeTemplateById(prev, templateId));
  }, []);

  const addTraitDefinition = useCallback((templateId: string) => {
    setTemplates((prev) =>
      prev.map((template) => {
        if (template.id !== templateId) return template;
        const nextTrait: TraitDefinition = {
          id: crypto.randomUUID(),
          label: `Trait ${template.traitDefinitions.length + 1}`,
          placeholder: "",
          order: template.traitDefinitions.length,
        };
        return {
          ...template,
          traitDefinitions: [...template.traitDefinitions, nextTrait],
        };
      }),
    );
  }, []);

  const updateTraitDefinition = useCallback((
    templateId: string,
    traitId: string,
    updates: Partial<Omit<TraitDefinition, "id">>,
  ) => {
    setTemplates((prev) =>
      prev.map((template) =>
        template.id === templateId
          ? {
              ...template,
              traitDefinitions: template.traitDefinitions.map((trait) =>
                trait.id === traitId ? { ...trait, ...updates } : trait,
              ),
            }
          : template,
      ),
    );
  }, []);

  const deleteTraitDefinition = useCallback((templateId: string, traitId: string) => {
    setTemplates((prev) =>
      prev.map((template) =>
        template.id === templateId
          ? {
              ...template,
              traitDefinitions: removeTraitDefinitionWithOrder(template.traitDefinitions, traitId),
            }
          : template,
      ),
    );
  }, []);

  const moveTraitDefinition = useCallback((templateId: string, traitId: string, direction: -1 | 1) => {
    setTemplates((prev) =>
      prev.map((template) => {
        if (template.id !== templateId) return template;
        const traits = [...template.traitDefinitions].sort((left, right) => left.order - right.order);
        const index = traits.findIndex((trait) => trait.id === traitId);
        if (index === -1) return template;
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= traits.length) return template;
        const [moved] = traits.splice(index, 1);
        traits.splice(targetIndex, 0, moved);
        return {
          ...template,
          traitDefinitions: traits.map((trait, order) => ({ ...trait, order })),
        };
      }),
    );
  }, []);

  const templatesForLoreType = useCallback(
    (loreTypeId: string) => templatesByLoreTypeId.get(loreTypeId) ?? [],
    [templatesByLoreTypeId],
  );

  const reassignLoreTypeInTemplates = useCallback((fromLoreTypeId: string, toLoreTypeId: string) => {
    setTemplates((prev) =>
      prev.map((template) =>
        template.loreTypeId === fromLoreTypeId ? { ...template, loreTypeId: toLoreTypeId } : template,
      ),
    );
  }, []);

  return useMemo(
    () => ({
      templates,
      selectedTemplateId,
      selectedTemplate,
      setSelectedTemplateId,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      addTraitDefinition,
      updateTraitDefinition,
      deleteTraitDefinition,
      moveTraitDefinition,
      templatesForLoreType,
      reassignLoreTypeInTemplates,
    }),
    [
      templates,
      selectedTemplateId,
      selectedTemplate,
      createTemplate,
      updateTemplate,
      deleteTemplate,
      addTraitDefinition,
      updateTraitDefinition,
      deleteTraitDefinition,
      moveTraitDefinition,
      templatesForLoreType,
      reassignLoreTypeInTemplates,
    ],
  );
}
