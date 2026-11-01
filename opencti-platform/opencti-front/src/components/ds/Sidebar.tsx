import { createContext, useContext, useMemo, useState } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from './lib/cn';

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export type SidebarProviderProps = {
  children: ReactNode;
  defaultOpen?: boolean;
};

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  const [open, setOpen] = useState(defaultOpen);

  const value = useMemo<SidebarContextValue>(() => ({
    open,
    setOpen,
    toggle: () => setOpen((prev) => !prev),
  }), [open]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export function Sidebar({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  const { open } = useSidebar();
  return (
    <nav
      className={cn(
        'bg-[var(--card)] border-e border-[var(--border)] flex flex-col h-full transition-[width] duration-200',
        open ? 'w-64' : 'w-16',
        className,
      )}
      {...rest}
    />
  );
}

export function SidebarHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center px-4 py-3', className)}
      {...rest}
    />
  );
}

export function SidebarContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex-1 overflow-y-auto', className)}
      {...rest}
    />
  );
}

export function SidebarGroup({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-2 py-2', className)}
      {...rest}
    />
  );
}

export function SidebarGroupContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('', className)}
      {...rest}
    />
  );
}

export function SidebarMenu({ className, ...rest }: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn('flex flex-col gap-1', className)}
      {...rest}
    />
  );
}

export function SidebarMenuItem({ className, ...rest }: HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      className={cn('', className)}
      {...rest}
    />
  );
}

export type SidebarMenuButtonProps = {
  isActive?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function SidebarMenuButton({ isActive = false, className, ...rest }: SidebarMenuButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-[var(--muted)] font-medium text-[var(--foreground)]'
          : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]',
        className,
      )}
      {...rest}
    />
  );
}
