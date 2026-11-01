import { useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
  Input,
  Kbd,
  Popover,
  PopoverPopup,
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPopup,
  SheetTitle,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipProvider,
} from 'src/components/ds';

/**
 * One labeled `<section>` per Foundation-phase primitive, modeled directly on
 * Policy Guardrail's own `src/app/design/page.tsx` (the visual target this whole
 * plan has been approximating), with the Switch/Select/Sheet/Sidebar examples this
 * phase adds that Policy Guardrail's page doesn't show.
 */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
        {title}
      </h2>
      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-6">
        {children}
      </div>
    </section>
  );
}

export function DesignInspector() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);

  return (
    <TooltipProvider>
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Design Inspector</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            One example of every ds primitive, for visual review against the HUMAIN
            design system reference.
          </p>
        </div>

        <Section title="Buttons (HUMAIN)">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button appearance="outline">Outline</Button>
            <Button appearance="ghost">Ghost</Button>
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </Section>

        <Section title="Inputs (HUMAIN)">
          <div className="grid max-w-md gap-3">
            <div>
              <label htmlFor="ds-inspector-input-default" className="text-xs font-medium text-[var(--muted-foreground)]">
                Default
              </label>
              <Input id="ds-inspector-input-default" placeholder="Enter value" />
            </div>
            <div>
              <label htmlFor="ds-inspector-input-disabled" className="text-xs font-medium text-[var(--muted-foreground)]">
                Disabled
              </label>
              <Input id="ds-inspector-input-disabled" placeholder="Disabled" disabled />
            </div>
            <div>
              <label htmlFor="ds-inspector-textarea" className="text-xs font-medium text-[var(--muted-foreground)]">
                Textarea
              </label>
              <Textarea id="ds-inspector-textarea" placeholder="Enter a longer value" rows={3} />
            </div>
          </div>
        </Section>

        <Section title="Switch (HUMAIN)">
          <div className="flex items-center gap-3">
            <Switch checked={switchOn} onCheckedChange={setSwitchOn} aria-label="Toggle example" />
            <span className="text-sm">{switchOn ? 'On' : 'Off'}</span>
          </div>
        </Section>

        <Section title="Select (HUMAIN)">
          <Select>
            <SelectTrigger className="max-w-xs" aria-label="Example select">
              <SelectValue placeholder="Pick an option" />
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="one">Option one</SelectItem>
              <SelectItem value="two">Option two</SelectItem>
              <SelectItem value="three">Option three</SelectItem>
            </SelectPopup>
          </Select>
        </Section>

        <Section title="Dialog (HUMAIN)">
          <Dialog>
            <DialogTrigger>
              <Button>Open modal</Button>
            </DialogTrigger>
            <DialogPopup>
              <DialogHeader>
                <DialogTitle>Deploy policy</DialogTitle>
                <DialogDescription>Confirm deployment to the selected surfaces.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button appearance="outline">Cancel</Button>
                <Button>Confirm</Button>
              </DialogFooter>
            </DialogPopup>
          </Dialog>
        </Section>

        <Section title="Sheet (HUMAIN)">
          <Button appearance="outline" onClick={() => setSheetOpen(true)}>Open drawer</Button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetPopup>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Narrow the results shown in the table.</SheetDescription>
              </SheetHeader>
              <SheetFooter>
                <Button appearance="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button onClick={() => setSheetOpen(false)}>Apply</Button>
              </SheetFooter>
            </SheetPopup>
          </Sheet>
        </Section>

        <Section title="Popover (HUMAIN)">
          <Popover trigger={<Button appearance="outline">Open overlay</Button>}>
            <PopoverPopup>
              <p className="text-sm">Popover body content.</p>
            </PopoverPopup>
          </Popover>
        </Section>

        <Section title="Tooltip (HUMAIN)">
          <Tooltip trigger={<Button appearance="ghost">Hover me</Button>} content="Tooltip body" />
        </Section>

        <Section title="Tabs (HUMAIN)">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">Overview content</TabsContent>
            <TabsContent value="rules">Rules content</TabsContent>
            <TabsContent value="history">History content</TabsContent>
          </Tabs>
        </Section>

        <Section title="Card (HUMAIN)">
          <Card className="max-w-md p-6">
            <h3 className="font-semibold">Container title</h3>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              A bordered surface for grouping related content.
            </p>
          </Card>
        </Section>

        <Section title="Badges (HUMAIN)">
          <div className="flex flex-wrap gap-3">
            <Badge variant="solid" color="primary">solid primary</Badge>
            <Badge variant="soft" color="success">soft success</Badge>
            <Badge variant="outline" color="warning">outline warning</Badge>
            <Badge variant="dot" color="destructive">dot destructive</Badge>
            <Badge variant="solid" color="info">solid info</Badge>
            <Badge variant="solid" color="secondary">solid secondary</Badge>
          </div>
        </Section>

        <Section title="Kbd (HUMAIN)">
          <div className="flex items-center gap-1 text-sm">
            <Kbd>⌘</Kbd>
            <span>+</span>
            <Kbd>K</Kbd>
          </div>
        </Section>

        <Section title="Sidebar (HUMAIN)">
          <div className="h-80 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
            <SidebarProvider>
              <Sidebar>
                <SidebarHeader>
                  <span className="text-sm font-semibold">Workspace</span>
                </SidebarHeader>
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton isActive>Overview</SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton>Settings</SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </Sidebar>
            </SidebarProvider>
          </div>
        </Section>
      </div>
    </TooltipProvider>
  );
}
