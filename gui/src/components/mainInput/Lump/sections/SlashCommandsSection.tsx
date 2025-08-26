import { useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector } from "../../../../redux/hooks";
import AtMentionDropdown from "../../../mainInput/AtMentionDropdown";
import { ComboBoxItem, ComboBoxItemType } from "../../../mainInput/types";
import { useMainEditor } from "../../TipTapEditor/MainEditorProvider";

export function SlashCommandsSection() {
  const mainEditorContext = useMainEditor();
  const { mainEditor } = mainEditorContext;
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<any>(null);
  
  // Get available slash commands from Redux
  const availableSlashCommands = useAppSelector(
    (state) => state.config.config.slashCommands ?? [],
  );

  // Track previous query to detect changes
  const prevQueryRef = useRef("");

  // Listen for query updates
  useEffect(() => {
    const handleQueryUpdate = (event: CustomEvent) => {
      const { query: newQuery } = event.detail;
      setQuery(newQuery || "");
      prevQueryRef.current = newQuery || "";
    };

    const handleKeyboardEvent = (event: CustomEvent) => {
      const { keyEvent } = event.detail;
      
      // Handle Escape key to close slash commands section
      if (keyEvent.key === 'Escape') {
        handleClose();
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        return;
      }
      
      if (dropdownRef.current?.onKeyDown) {
        const handled = dropdownRef.current.onKeyDown({ event: keyEvent });
        if (handled) {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
        }
      }
    };

    window.addEventListener('lump-slash-commands-query', handleQueryUpdate as EventListener);
    window.addEventListener('lump-slash-commands-keyboard', handleKeyboardEvent as EventListener);
    return () => {
      window.removeEventListener('lump-slash-commands-query', handleQueryUpdate as EventListener);
      window.removeEventListener('lump-slash-commands-keyboard', handleKeyboardEvent as EventListener);
    };
  }, []);

  // Create items in the same format as the suggestion system
  const items = useMemo(() => {
    // Filter slash commands based on query
    const filteredCommands = query.trim()
      ? availableSlashCommands.filter((command) =>
          command.name.toLowerCase().includes(query.toLowerCase()) ||
          (command.description && command.description.toLowerCase().includes(query.toLowerCase()))
        )
      : availableSlashCommands;

    const commandItems: ComboBoxItem[] = filteredCommands.map((command) => ({
      name: command.name,
      description: command.description || "",
      id: command.name,
      title: command.name,
      label: command.name,
      type: "slashCommand" as ComboBoxItemType,
      content: command.prompt || "",
    }));

    return commandItems;
  }, [availableSlashCommands, query]);

  const handleCommand = (item: any) => {
    // Reset editor text before inserting the command (removes the "/" character)
    if (mainEditor && mainEditorContext?.resetEditorAfterSlash) {
      mainEditorContext.resetEditorAfterSlash(mainEditor);
    }

    // Insert the slash command into the editor
    if (mainEditor) {
      // Use the insertPrompt command to create a proper prompt block
      mainEditor.commands.insertPrompt({
        title: item.title,
        description: item.description,
        content: item.content,
      });
      
      mainEditor.commands.focus();
    }

    // Reset state and close slash commands section
    setQuery("");
    window.dispatchEvent(new CustomEvent('lump-slash-commands-close'));
  };

  const handleClose = () => {
    setQuery("");
    window.dispatchEvent(new CustomEvent('lump-slash-commands-close'));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="max-h-[170px] overflow-hidden">
        <AtMentionDropdown
          ref={dropdownRef}
          items={items}
          command={handleCommand}
          editor={mainEditor!}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}