import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from './Sidebar';

function ToggleButton() {
  const { open, toggle } = useSidebar();
  return <button onClick={toggle}>{open ? 'Collapse' : 'Expand'}</button>;
}

describe('Sidebar', () => {
  it('renders menu items and reflects isActive styling', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem><SidebarMenuButton isActive>Policies</SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton>Ontology</SidebarMenuButton></SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );
    expect(screen.getByText('Policies')).toBeInTheDocument();
    expect(screen.getByText('Ontology')).toBeInTheDocument();
  });

  it('useSidebar toggle flips open state, shared across the subtree', async () => {
    render(
      <SidebarProvider defaultOpen>
        <ToggleButton />
      </SidebarProvider>,
    );
    expect(screen.getByText('Collapse')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Collapse'));
    expect(screen.getByText('Expand')).toBeInTheDocument();
  });

  it('useSidebar throws outside a SidebarProvider', () => {
    const Bad = () => {
      useSidebar();
      return null;
    };
    expect(() => render(<Bad />)).toThrow();
  });
});
