import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DirectionProvider } from '@base-ui-components/react/direction-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent, TabsIndicator } from './Tabs';

describe('Tabs', () => {
  it('shows the default tab\'s content and switches on click', async () => {
    render(
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview content</TabsContent>
        <TabsContent value="rules">Rules content</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('Overview content')).toBeInTheDocument();
    expect(screen.queryByText('Rules content')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Rules'));
    expect(screen.getByText('Rules content')).toBeInTheDocument();
    expect(screen.queryByText('Overview content')).not.toBeInTheDocument();
  });

  it('switches tabs via ArrowRight/ArrowLeft when a tab has focus', async () => {
    render(
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">Overview content</TabsContent>
        <TabsContent value="rules">Rules content</TabsContent>
      </Tabs>,
    );
    screen.getByText('Overview').focus();
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(screen.getByText('Rules content')).toBeInTheDocument();
  });

  // TabsIndicator consumes Base UI's --active-tab-left/-top/-width/-height, which are
  // getBoundingClientRect-derived *physical* measurements, already RTL-correct because
  // the browser computes them after RTL layout has run. Pairing that already-physical
  // value with a *logical* CSS property (inset-inline-start) would double-apply the
  // direction flip and misplace the indicator under dir="rtl" — so, unlike every other
  // positioned ds component (Switch, Sheet, Input, Textarea, Button), physical left/top
  // here is correct and logical inset-inline-start would be the bug. This test asserts
  // that directly, instead of the usual "no physical classes" negative assertion.
  it('positions the indicator using physical left/top (not logical inset-inline-start), to correctly consume Base UI\'s physical measurement', () => {
    const { container } = render(
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsIndicator />
        </TabsList>
        <TabsContent value="overview">Overview content</TabsContent>
        <TabsContent value="rules">Rules content</TabsContent>
      </Tabs>,
    );
    const indicator = container.querySelector('[role="presentation"]');
    expect(indicator).not.toBeNull();
    const className = (indicator as HTMLElement).className;
    expect(className).not.toMatch(/inset-inline-start/);
    expect(className).not.toMatch(/inset-inline-end/);
    expect(className).toMatch(/\[left:var\(--active-tab-left\)\]/);
    expect(className).toMatch(/\[top:var\(--active-tab-top\)\]/);
  });

  it('tracks the active tab\'s measured position when switching tabs under dir="rtl"', async () => {
    // jsdom performs no real CSS layout, so every element's getBoundingClientRect()
    // returns all zeros by default. Mock it so distinct tabs report distinct physical
    // rects (as a real browser would after RTL layout), letting us verify the indicator
    // (which Base UI drives from these physical measurements) actually re-measures and
    // tracks the newly active tab when switching under dir="rtl".
    const rectFor = (left: number, width: number): DOMRect => ({
      left,
      top: 0,
      right: left + width,
      bottom: 30,
      width,
      height: 30,
      x: left,
      y: 0,
      toJSON() {
        return this;
      },
    });
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function mockRect(this: HTMLElement) {
      if (this.textContent === 'Overview') return rectFor(20, 80);
      if (this.textContent === 'Rules') return rectFor(120, 70);
      return rectFor(0, 300);
    });

    try {
      const { container } = render(
        <DirectionProvider direction="rtl">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsIndicator />
            </TabsList>
            <TabsContent value="overview">Overview content</TabsContent>
            <TabsContent value="rules">Rules content</TabsContent>
          </Tabs>
        </DirectionProvider>,
      );
      const indicator = container.querySelector('[role="presentation"]') as HTMLElement;
      expect(indicator).not.toBeNull();
      expect(indicator.style.getPropertyValue('--active-tab-left')).toBe('20px');
      expect(indicator.style.getPropertyValue('--active-tab-width')).toBe('80px');

      await userEvent.click(screen.getByText('Rules'));

      expect(indicator.style.getPropertyValue('--active-tab-left')).toBe('120px');
      expect(indicator.style.getPropertyValue('--active-tab-width')).toBe('70px');
    } finally {
      spy.mockRestore();
    }
  });
});
