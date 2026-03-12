import type { Ref } from "react";

type SlashCommandOption = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
};

type EditorSlashMenuProps = {
  slashMenuRef: Ref<HTMLDivElement>;
  slashMenuPosition: { top: number; left: number };
  filteredSlashCommands: SlashCommandOption[];
  selectedSlashIndex: number;
  onApplySlashCommand: (commandId: string) => void;
};

export function EditorSlashMenu({
  slashMenuRef,
  slashMenuPosition,
  filteredSlashCommands,
  selectedSlashIndex,
  onApplySlashCommand,
}: EditorSlashMenuProps) {
  return (
    <div
      ref={slashMenuRef}
      className="editor-slash-menu-floating"
      style={{ top: slashMenuPosition.top, left: slashMenuPosition.left }}
      role="listbox"
      aria-label="Slash commands"
    >
      {filteredSlashCommands.length === 0 ? (
        <div className="editor-slash-empty">No matching commands.</div>
      ) : (
        <div className="editor-slash-list">
          {filteredSlashCommands.map((command, index) => (
            <button
              key={command.id}
              className={`editor-slash-item ${index === selectedSlashIndex ? "active" : ""}`}
              type="button"
              role="option"
              aria-selected={index === selectedSlashIndex}
              onMouseDown={(event) => {
                event.preventDefault();
                onApplySlashCommand(command.id);
              }}
            >
              <span className="editor-slash-item-title">{command.label}</span>
              <span className="editor-slash-item-description">{command.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
