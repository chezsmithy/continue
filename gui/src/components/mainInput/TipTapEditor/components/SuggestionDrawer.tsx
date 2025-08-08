import { Editor } from "@tiptap/react";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import styled from "styled-components";
import { useClickOutside } from "../../../../hooks/useClickOutside";
import { defaultBorderRadius, vscQuickInputBackground } from "../../../index";
import AtMentionDropdown from "../../AtMentionDropdown";
import { ComboBoxItem } from "../../types";

interface SuggestionDrawerProps {
  isOpen: boolean;
  items: ComboBoxItem[];
  editor: Editor | null;
  clientRect?: DOMRect;
  enterSubmenu?: (editor: Editor, providerId: string) => void;
  onClose: () => void;
  command: (item: any) => void;
  position: "top" | "bottom";
  containerRef: React.RefObject<HTMLElement>;
}

const DrawerContainer = styled.div<{ 
  position: "top" | "bottom"; 
  isOpen: boolean;
  containerHeight: number;
}>`
  position: absolute;
  left: 0;
  right: 0;
  z-index: 50;
  background-color: ${vscQuickInputBackground};
  border-radius: ${defaultBorderRadius};
  box-shadow: 
    0 0 0 1px rgba(0, 0, 0, 0.05),
    0px 10px 20px rgba(0, 0, 0, 0.1);
  max-height: 330px;
  overflow: hidden;
  transition: all 0.15s ease-out;
  transform-origin: ${props => props.position === "top" ? "bottom" : "top"};
  
  ${props => props.position === "top" ? `
    bottom: 100%;
    margin-bottom: 5px;
  ` : `
    top: 100%;
    margin-top: 5px;
  `}
  
  ${props => props.isOpen ? `
    opacity: 1;
    transform: scaleY(1);
    pointer-events: auto;
  ` : `
    opacity: 0;
    transform: scaleY(0.8);
    pointer-events: none;
  `}
`;

export const SuggestionDrawer = forwardRef<any, SuggestionDrawerProps>(
  ({ isOpen, items, editor, enterSubmenu, onClose, command, position, containerRef }, ref) => {
    const drawerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<any>(null);
    const [containerHeight, setContainerHeight] = useState(0);

    // Handle click outside to close
    useClickOutside(drawerRef, onClose, isOpen);
    
    // Expose the dropdown ref for key handling
    useImperativeHandle(ref, () => ({
      onKeyDown: (props: { event: KeyboardEvent }) => {
        return dropdownRef.current?.onKeyDown?.(props);
      }
    }));

    // Handle escape key
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && isOpen) {
          onClose();
          e.preventDefault();
          e.stopPropagation();
        }
      };

      if (isOpen) {
        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
      }
    }, [isOpen, onClose]);

    // Update container height for positioning
    useEffect(() => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight;
        setContainerHeight(height);
      }
    }, [containerRef, isOpen]);

    if (!editor || !isOpen) {
      return null;
    }

    return (
      <DrawerContainer
        ref={drawerRef}
        position={position}
        isOpen={isOpen}
        containerHeight={containerHeight}
      >
        <AtMentionDropdown
          ref={dropdownRef}
          items={items}
          command={command}
          editor={editor}
          enterSubmenu={enterSubmenu}
          onClose={onClose}
        />
      </DrawerContainer>
    );
  }
);

SuggestionDrawer.displayName = "SuggestionDrawer";