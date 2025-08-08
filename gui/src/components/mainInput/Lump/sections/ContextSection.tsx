import { useEffect, useMemo, useRef, useState } from "react";
import { useSubmenuContextProviders } from "../../../../context/SubmenuContextProviders";
import { useAppSelector } from "../../../../redux/hooks";
import AtMentionDropdown from "../../../mainInput/AtMentionDropdown";
import { ComboBoxItem } from "../../../mainInput/types";
import { useMainEditor } from "../../TipTapEditor/MainEditorProvider";

export function ContextSection() {
  const mainEditorContext = useMainEditor();
  const { mainEditor } = mainEditorContext;
  const { getSubmenuContextItems } = useSubmenuContextProviders();
  const availableContextProviders = useAppSelector(
    (state) => state.config.config.contextProviders || []
  );
  const [inSubmenu, setInSubmenu] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef<any>(null);
  
  // Track previous query to detect when we should auto-enter submenu
  const prevQueryRef = useRef("");

  // Listen for query updates from the editor
  useEffect(() => {
    const handleQueryUpdate = (event: CustomEvent) => {
      const { query: newQuery } = event.detail;
      const normalizedQuery = (newQuery || "").toLowerCase().trim();
      
      // Check if we should auto-enter a submenu based on exact or close matches
      if (!inSubmenu && normalizedQuery && normalizedQuery !== prevQueryRef.current.toLowerCase()) {
        const exactMatch = availableContextProviders.find(
          (provider) =>
            provider.type === "submenu" &&
            (provider.title.toLowerCase() === normalizedQuery ||
             provider.displayTitle.toLowerCase() === normalizedQuery)
        );
        
        if (exactMatch) {
          // Auto-enter submenu and reset query
          setInSubmenu(exactMatch.title);
          setQuery(""); // Reset the query to start fresh in submenu
          
          // Call the resetEditorAfterAt function to reset the editor text
          if (mainEditor && mainEditorContext?.resetEditorAfterAt) {
            mainEditorContext.resetEditorAfterAt(mainEditor);
          }
          
          prevQueryRef.current = "";
          return;
        }
      }
      
      setQuery(newQuery || "");
      prevQueryRef.current = newQuery || "";
    };

    const handleKeyboardEvent = (event: CustomEvent) => {
      const { keyEvent } = event.detail;
      
      // Handle Escape key to close context section
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

    window.addEventListener('lump-context-query', handleQueryUpdate as EventListener);
    window.addEventListener('lump-context-keyboard', handleKeyboardEvent as EventListener);
    return () => {
      window.removeEventListener('lump-context-query', handleQueryUpdate as EventListener);
      window.removeEventListener('lump-context-keyboard', handleKeyboardEvent as EventListener);
    };
  }, [availableContextProviders, inSubmenu, mainEditor]);

  // Create items in the same format as the suggestion system
  const items = useMemo(() => {
    if (inSubmenu) {
      const results = getSubmenuContextItems(inSubmenu, query);
      return results.map((result) => ({
        ...result,
        label: result.title,
        type: inSubmenu as any,
        query: result.id,
      }));
    }

    // Filter context providers based on query
    const contextProviderMatches: ComboBoxItem[] = availableContextProviders
      ?.filter(
        (provider) =>
          !query.trim() || 
          provider.title.toLowerCase().startsWith(query.toLowerCase()) ||
          provider.displayTitle.toLowerCase().startsWith(query.toLowerCase()),
      )
      .map((provider) => ({
        name: provider.displayTitle,
        description: provider.description,
        id: provider.title,
        title: provider.displayTitle,
        label: provider.displayTitle,
        renderInlineAs: provider.renderInlineAs,
        type: "contextProvider" as any,
        contextProvider: provider,
      }))
      .sort((c, _) => (c.id === "file" ? -1 : 1)) || [];

    if (contextProviderMatches.length) {
      return contextProviderMatches;
    }

    // No provider matches -> search all providers
    const results = getSubmenuContextItems(undefined, query);
    return results.map((result) => ({
      ...result,
      label: result.title,
      type: result.providerTitle as any,
      query: result.id,
      icon: result.icon,
    }));
  }, [availableContextProviders, getSubmenuContextItems, inSubmenu, query]);

  

  const enterSubmenu = (providerId: string) => {
    // Reset the editor text BEFORE changing state
    if (mainEditor && mainEditorContext?.resetEditorAfterAt) {
      mainEditorContext.resetEditorAfterAt(mainEditor);
    }
    
    setInSubmenu(providerId);
    setQuery(""); // Clear query when entering submenu
  };

  const handleCommand = (item: any) => {
    // Check if this is a submenu context provider
    if (
      item.type === "contextProvider" &&
      item.contextProvider?.type === "submenu"
    ) {
      if (item.id) {
        enterSubmenu(item.id);
      }
      return;
    }

    // Insert the context item into the editor using the same method as the original tippy
    if (mainEditor) {
      // Use the Mention extension's command to create proper mention nodes
      // This ensures the context system can properly resolve the references
      const currentPos = mainEditor.state.selection.anchor;
      const doc = mainEditor.state.doc;
      
      // Look backwards from cursor to find the @ symbol
      let atPosition = -1;
      for (let i = currentPos - 1; i >= 0; i--) {
        const char = doc.textBetween(i, i + 1);
        if (char === "@") {
          atPosition = i;
          break;
        }
        // Stop if we hit a space (means we've gone too far)
        if (char === " " || char === "\n") {
          break;
        }
      }
      
      if (atPosition !== -1) {
        // Create the range for replacement
        const range = { from: atPosition, to: currentPos };
        
        // Use the mention command to create a proper mention node
        // This matches exactly what the original suggestion system does
        const nodeAfter = mainEditor.view.state.selection.$to.nodeAfter;
        const overrideSpace = nodeAfter?.text?.startsWith(" ");
        
        if (overrideSpace) {
          range.to += 1;
        }
        
        mainEditor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: "mention",
              attrs: {
                id: item.id,
                label: item.label || item.title,
                query: item.query,
                itemType: item.itemType || item.type,
                renderInlineAs: item.renderInlineAs,
              },
            },
            {
              type: "text",
              text: " ",
            },
          ])
          .run();
        
        window.getSelection()?.collapseToEnd();
      } else {
        // If no @ found, just insert at current position
        mainEditor
          .chain()
          .focus()
          .insertContent([
            {
              type: "mention",
              attrs: {
                id: item.id,
                label: item.label || item.title,
                query: item.query,
                itemType: item.itemType || item.type,
                renderInlineAs: item.renderInlineAs,
              },
            },
            {
              type: "text",
              text: " ",
            },
          ])
          .run();
      }
      
      mainEditor.commands.focus();
    }

    // Reset state and close context section
    setInSubmenu(undefined);
    setQuery("");
    window.dispatchEvent(new CustomEvent('lump-context-close'));
  };

  const handleClose = () => {
    setInSubmenu(undefined);
    setQuery("");
    window.dispatchEvent(new CustomEvent('lump-context-close'));
  };

  return (
    <div className="flex flex-col gap-1">
      {inSubmenu && (
        <div className="flex items-center gap-2 pb-2">
          <button
            onClick={() => setInSubmenu(undefined)}
            className="flex items-center gap-1 text-xs text-description hover:text-foreground transition-colors cursor-pointer bg-transparent border-none p-0 outline-none"
          >
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to providers
          </button>
        </div>
      )}
      
      <div className="max-h-[170px] overflow-hidden">
        <AtMentionDropdown
          ref={dropdownRef}
          items={items}
          command={handleCommand}
          editor={mainEditor!}
          enterSubmenu={(editor, providerId) => enterSubmenu(providerId)}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}
