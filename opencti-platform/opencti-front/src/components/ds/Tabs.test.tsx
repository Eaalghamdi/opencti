import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';

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
});
