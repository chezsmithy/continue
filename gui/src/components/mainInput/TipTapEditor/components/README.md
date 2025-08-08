# Continue Context Integration

## Context Integration Approaches

We now have two complementary approaches for context selection:

### 1. SuggestionDrawer (TipTap Integration)

The `SuggestionDrawer` component replaces the previous tippy.js-based floating dropdown menu with a pure React drawer solution that flows out from the top or bottom of the TipTap editor when typing `@` or `/`.

### 2. Context Section (Lump Toolbar Integration)

A new `@` Context toolbar button in the LumpToolbar that opens a dedicated context selection section within the Lump area.

### SuggestionDrawer Features

- **Pure React Solution**: No longer depends on tippy.js for positioning and rendering
- **Intelligent Positioning**: Automatically positions at top or bottom based on available viewport space
- **Exact Width Match**: Matches exactly the width of the input area ("Lump")
- **Keyboard Navigation**: Supports all the same keyboard interactions as the previous tippy implementation
- **Click Outside to Dismiss**: Closes when clicking outside the drawer
- **Escape Key**: Dismisses the drawer when escape key is pressed
- **Mouse Interaction**: Supports clicking on items in the drawer
- **Top Overlap**: When positioned at the top, overlaps with content above

### Context Section Features

- **Integrated UI**: Uses the same design patterns as other Lump sections (MCP, Tools, etc.)
- **Searchable**: Includes search functionality for finding context providers
- **Submenu Support**: Handles context providers with submenus (like file browser, docs)
- **Direct Editor Integration**: Directly inserts selected context into the TipTap editor
- **Discoverable**: Users can find context selection through the toolbar button
- **Consistent UX**: Follows the same interaction patterns as other sections

### Usage

The drawer is automatically integrated into the TipTap editor and is triggered by the same mechanisms that previously triggered the tippy dropdown:

- Typing `@` to open context provider suggestions
- Typing `/` to open slash command suggestions

### Technical Details

#### Architecture

1. **State Management**: The drawer state is managed in the `TipTapEditor` component using React state
2. **Positioning Logic**: Automatic positioning logic determines whether to show drawer at top or bottom based on available viewport space
3. **Event Handling**: Keyboard events are handled through React event listeners and refs
4. **Content**: Uses the existing `AtMentionDropdown` component for the actual suggestion content

#### Key Files Modified

- `TipTapEditor.tsx`: Added drawer state management and positioning logic
- `getSuggestion.ts`: Modified to work with React state instead of tippy.js instances
- `editorConfig.ts`: Updated to pass drawer state update function to suggestion handlers
- `SuggestionDrawer.tsx`: New component implementing the drawer UI
- `useClickOutside.ts`: New hook for handling click outside events

#### Migration from Tippy.js

The solution maintains complete backward compatibility in terms of functionality while replacing the underlying implementation:

- All existing keyboard shortcuts and navigation continue to work
- The same content (AtMentionDropdown) is displayed
- All existing suggestion types (context providers, slash commands) are supported
- Submenu functionality is preserved

#### Styling

The drawer uses styled-components with the same theming system as the rest of the application:
- Inherits VSCode theme colors
- Smooth transitions for open/close animations
- Proper z-index layering
- Responsive positioning
- **Exact Width Match**: Uses `left: 0; right: 0;` positioning to match exactly the width of the InputBoxDiv

### Performance

The new implementation offers several performance benefits:
- Eliminates tippy.js bundle size
- Reduced DOM manipulation overhead
- More predictable React rendering lifecycle
- Better memory management with automatic cleanup