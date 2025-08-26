import { Editor } from "@tiptap/react";
import {
  ContextProviderDescription,
  ContextSubmenuItem,
  ContextSubmenuItemWithProvider,
} from "core";
import { MutableRefObject } from "react";
import { IIdeMessenger } from "../../../../context/IdeMessenger";
import { AppDispatch } from "../../../../redux/store";
import { ComboBoxItem, ComboBoxItemType, ComboBoxSubAction } from "../../types";
import { SlashCommand } from "../extensions";

// Interface for the lump context integration
export interface LumpContextState {
  isOpen: boolean;
  query: string;
  inSubmenu?: string;
}

// Function to create suggestion configuration for drawer-based suggestions
function getSuggestion(
  items: (props: { query: string }) => Promise<ComboBoxItem[]>,
  enterSubmenu: (editor: Editor, providerId: string) => void = () => {},
  onClose: () => void = () => {},
  onOpen: () => void = () => {},
  useDrawer: boolean = false,
  openLumpContext?: (query: string) => void,
  openLumpSlashCommands?: (query: string) => void,
) {
  let currentRef: any;

  return {
    items,
    allowSpaces: true,
    render: () => {
      const onExit = () => {
        onClose();
      };

      return {
        onStart: (props: any) => {
          if (!props.clientRect) {
            console.log("no client rect");
            return;
          }

          // Use drawer for normal suggestions, lump context for @ mentions
          if (useDrawer) {
            // This will be handled by the SuggestionDrawer system
            // Store reference for key handling
            currentRef = {
              enterSubmenu,
              onClose: onExit,
            };

            onOpen();
          } else {
            // Open the lump context or slash commands section
            if (openLumpContext) {
              // This is for @ mentions - open context section
              openLumpContext("");
            } else if (openLumpSlashCommands) {
              // This is for / commands - open slash commands section  
              openLumpSlashCommands("");
            }

            // Store reference for key handling
            currentRef = {
              enterSubmenu,
              onClose: onExit,
            };

            onOpen();
          }
        },

        onUpdate(props: any) {
          if (useDrawer) {
            // For drawer-based suggestions, this is handled by the drawer component
            return;
          } else {
            // Extract the current query from the editor using the range
            const { range, query: extractedQuery } = props;
            const query = extractedQuery || "";
            
            // Update the appropriate lump section with the current query
            if (openLumpContext) {
              openLumpContext(query);
            } else if (openLumpSlashCommands) {
              openLumpSlashCommands(query);
            }
          }
        },

        onKeyDown(props: any) {
          if (props.event.key === "Escape") {
            onExit();
            return true;
          }

          // Let other keys pass through
          return false;
        },

        onExit,

        // Expose the current reference for external key handling
        getCurrentRef: () => currentRef,
      };
    },
  };
}

function getSubActionsForSubmenuItem(
  item: ContextSubmenuItem & { providerTitle: string },
  ideMessenger: IIdeMessenger,
): ComboBoxSubAction[] | undefined {
  if (item.providerTitle === "docs") {
    return [
      {
        label: "Open in new tab",
        icon: "trash",
        action: () => {
          ideMessenger.post("context/removeDocs", { startUrl: item.id });
        },
      },
    ];
  }

  return undefined;
}

export function getContextProviderDropdownOptions(
  availableContextProvidersRef: MutableRefObject<ContextProviderDescription[]>,
  getSubmenuContextItemsRef: MutableRefObject<
    (
      providerTitle: string | undefined,
      query: string,
    ) => ContextSubmenuItemWithProvider[]
  >,
  enterSubmenu: (editor: Editor, providerId: string) => void,
  onClose: () => void,
  onOpen: () => void,
  inSubmenu: MutableRefObject<string | undefined>,
  ideMessenger: IIdeMessenger,
  openLumpContext?: (query: string) => void,
) {
  const items = async ({ query }: { query: string }) => {
    if (inSubmenu.current) {
      const results = getSubmenuContextItemsRef.current(
        inSubmenu.current,
        query,
      );
      return results.map((result) => {
        return {
          ...result,
          label: result.title,
          type: inSubmenu.current as ComboBoxItemType,
          query: result.id,
          subActions: getSubActionsForSubmenuItem(result, ideMessenger),
        };
      });
    }

    const contextProviderMatches: ComboBoxItem[] =
      availableContextProvidersRef.current
        ?.filter(
          (provider) =>
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
          type: "contextProvider" as ComboBoxItemType,
          contextProvider: provider,
        }))
        .sort((c, _) => (c.id === "file" ? -1 : 1)) || [];

    if (contextProviderMatches.length) {
      contextProviderMatches.push({
        title: "Add more context providers",
        type: "action",
        action: () => {
          ideMessenger.post(
            "openUrl",
            "https://docs.continue.dev/customization/context-providers#built-in-context-providers",
          );
        },
        description: "",
      });
      return contextProviderMatches;
    }

    // No provider matches -> search all providers
    const results = getSubmenuContextItemsRef.current(undefined, query);
    return results.map((result) => {
      return {
        ...result,
        label: result.title,
        type: result.providerTitle as ComboBoxItemType,
        query: result.id,
        icon: result.icon,
      };
    });
  };

  return getSuggestion(items, enterSubmenu, onClose, onOpen, false, openLumpContext, undefined);
}

export function getSlashCommandDropdownOptions(
  availableSlashCommandsRef: MutableRefObject<ComboBoxItem[]>,
  onClose: () => void,
  onOpen: () => void,
  ideMessenger: IIdeMessenger,
  _dispatch: AppDispatch,
  _inputId: string,
  openLumpSlashCommands?: (query: string) => void,
) {
  const items = async ({ query }: { query: string }) => {
    const options = [...availableSlashCommandsRef.current];

    const filteredCommands =
      query.length > 0
        ? options.filter((slashCommand) => {
            const sc = slashCommand.title.toLowerCase();
            const iv = query.toLowerCase();
            return sc.startsWith(iv) || slashCommand.description?.toLowerCase().includes(iv);
          })
        : options;

    const commandItems = (filteredCommands || []).map((provider) => ({
      name: provider.title,
      description: provider.description,
      id: provider.title,
      title: provider.title,
      label: provider.title,
      type: (provider.type ?? SlashCommand.name) as ComboBoxItemType,
      content: provider.content,
      action: provider.action,
    }));

    if (query.length === 0 && commandItems.length === 0) {
      commandItems.push({
        title: "Explore prompts",
        type: "action",
        action: () =>
          ideMessenger.post(
            "openUrl",
            "https://hub.continue.dev/explore/prompts",
          ),
        description: "Browse community prompts on Continue Hub",
        name: "",
        id: "",
        label: "",
        content: "",
      });
    }

    return commandItems;
  };
  // Use lump section for slash commands, not drawer
  return getSuggestion(items, undefined, onClose, onOpen, false, undefined, openLumpSlashCommands);
}
