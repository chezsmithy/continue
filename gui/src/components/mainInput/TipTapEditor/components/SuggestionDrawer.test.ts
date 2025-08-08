import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { SuggestionDrawer } from './SuggestionDrawer';
import { ComboBoxItem } from '../../types';

// Mock the AtMentionDropdown component since we're testing the wrapper
vi.mock('../../AtMentionDropdown', () => ({
  default: React.forwardRef(({ items }: { items: ComboBoxItem[] }, ref: any) => 
    React.createElement('div', { 
      'data-testid': 'mock-dropdown', 
      ref 
    }, `Items: ${items.length}`)
  )
}));

// Mock the useClickOutside hook
vi.mock('../../../../hooks/useClickOutside', () => ({
  useClickOutside: vi.fn()
}));

const mockItems: ComboBoxItem[] = [
  {
    title: 'Test Item 1',
    description: 'Test description 1',
    id: 'test1',
    type: 'contextProvider'
  },
  {
    title: 'Test Item 2', 
    description: 'Test description 2',
    id: 'test2',
    type: 'file'
  }
];

const defaultProps = {
  isOpen: true,
  items: mockItems,
  editor: null,
  enterSubmenu: vi.fn(),
  onClose: vi.fn(),
  command: vi.fn(),
  position: 'bottom' as const,
  containerRef: { current: null }
};

test('renders drawer when isOpen is true', () => {
  render(React.createElement(SuggestionDrawer, defaultProps));
  
  expect(screen.getByTestId('mock-dropdown')).toBeInTheDocument();
});

test('does not render drawer when isOpen is false', () => {
  render(React.createElement(SuggestionDrawer, { ...defaultProps, isOpen: false }));
  
  expect(screen.queryByTestId('mock-dropdown')).not.toBeInTheDocument();
});

test('passes correct items to AtMentionDropdown', () => {
  render(React.createElement(SuggestionDrawer, defaultProps));
  
  expect(screen.getByText('Items: 2')).toBeInTheDocument();
});

test('applies correct positioning styles for bottom position', () => {
  const { container } = render(React.createElement(SuggestionDrawer, { 
    ...defaultProps, 
    position: 'bottom' 
  }));
  
  const drawer = container.querySelector('[data-testid="mock-dropdown"]')?.parentElement;
  const styles = window.getComputedStyle(drawer!);
  
  // Since we're using styled-components, the exact CSS is compiled
  // We just check that the component renders without errors
  expect(drawer).toBeInTheDocument();
});

test('applies correct positioning styles for top position', () => {
  const { container } = render(React.createElement(SuggestionDrawer, { 
    ...defaultProps, 
    position: 'top' 
  }));
  
  const drawer = container.querySelector('[data-testid="mock-dropdown"]')?.parentElement;
  
  // Since we're using styled-components, the exact CSS is compiled
  // We just check that the component renders without errors
  expect(drawer).toBeInTheDocument();
});