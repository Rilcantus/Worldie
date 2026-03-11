import { useEffect, useMemo, useState } from "react";
import { listProjectLoreTemplates, saveProjectLoreTemplates } from "../lib/data";
import {
  type LoreTemplate,
  type TraitDefinition,
} from "../lib/loreTemplates";
import { getDefaultLoreTypeId, type LoreType } from "../lib/loreTypes";

export function useLoreTemplates(activeProjectId: string | null, loreTypes: LoreType[]) {
  const [templates, setTemplates] = useState<LoreTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!activeProjectId || loreTypes.length === 0) {
      setTemplates([]);
      setHasLoaded(false);
      return;
    }
    setHasLoaded(false);
    void listProjectLoreTemplates(activeProjectId, loreTypes)
      .then((loaded) => {
        setTemplates(loaded);
        setHasLoaded(true);
      })
      .catch(() => {
        setTemplates([]);
        setHasLoaded(false);
      });
  }, [activeProjectId, loreTypes]);

  useEffect(() => {
    if (!activeProjectId || !hasLoaded) return;
    void saveProjectLoreTemplates(activeProjectId, templates).catch(() => undefined);
  }, [activeProjectId, hasLoaded, templates]);

  useEffect(() => {
    if (selectedTemplateId && templates.some((template) => template.id === selectedTemplateId)) {
      return;
    }
    setSelectedTemplateId(templates[0]?.id ?? null);
  }, [selectedTemplateId, templates]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  );

  const createTemplate = (loreTypeId = getDefaultLoreTypeId(loreTypes) ?? "") => {
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
  };

  const updateTemplate = (templateId: string, updates: Partial<Omit<LoreTemplate, "id">>) => {
    setTemplates((prev) =>
      prev.map((template) => (template.id === templateId ? { ...template, ...updates } : template)),
    );
  };

  const deleteTemplate = (templateId: string) => {
    setTemplates((prev) => prev.filter((template) => template.id !== templateId));
  };

  const addTraitDefinition = (templateId: string) => {
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
  };

  const updateTraitDefinition = (
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
  };

  const deleteTraitDefinition = (templateId: string, traitId: string) => {
    setTemplates((prev) =>
      prev.map((template) =>
        template.id === templateId
          ? {
              ...template,
              traitDefinitions: template.traitDefinitions
                .filter((trait) => trait.id !== traitId)
                .map((trait, index) => ({ ...trait, order: index })),
            }
          : template,
      ),
    );
  };

  const moveTraitDefinition = (templateId: string, traitId: string, direction: -1 | 1) => {
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
  };

  const templatesForLoreType = (loreTypeId: string) =>
    templates.filter((template) => template.loreTypeId === loreTypeId);

  const reassignLoreTypeInTemplates = (fromLoreTypeId: string, toLoreTypeId: string) => {
    setTemplates((prev) =>
      prev.map((template) =>
        template.loreTypeId === fromLoreTypeId ? { ...template, loreTypeId: toLoreTypeId } : template,
      ),
    );
  };

  return {
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
  };
}
