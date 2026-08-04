import React, { useState } from "react";

import { Add, ArrowRight, Download, Edit, Information, Star, TrashCan } from "@carbon/icons-react";

import {
  Accordion,
  AccordionItem,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  ButtonGroup,
  carbonTokens,
  CarbonDropdown,
  CarbonTabs,
  CarbonToggle,
  Checkbox,
  CheckboxGroup,
  ChipGroup,
  ClickableTile,
  ComboBox,
  ContentSwitcher,
  DatePicker,
  DatePickerInput,
  DefinitionTooltip,
  DismissibleTag,
  IconButton,
  InlineLoading,
  InlineNotification,
  Link,
  Loading,
  Modal,
  MultiSelect,
  NumberInput,
  Pagination,
  PasswordInput,
  ProgressBar,
  RadioButton,
  RadioButtonGroup,
  Search,
  Select,
  SelectItem,
  SkeletonPlaceholder,
  SkeletonText,
  Slider,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Tag,
  TextArea,
  TextInput,
  TimePicker,
  Tile,
  Toggle,
  Toggletip,
  ToggletipButton,
  ToggletipContent,
  ToastNotification,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import { SearchVariant } from "@ally-ui-mono/ui-shared/types";

/**
 * Public design-system gallery (route: /designsystem).
 *
 * A no-login, standalone showcase of every component in Ally's centralised
 * design system — the locked Carbon "White" serif language exposed through
 * `@ally-ui-mono/ui-shared` (the single source of truth every app imports
 * from). It renders live examples grouped by category so anyone with the link
 * can browse the primitives and shared feature components in one place.
 *
 * The page deliberately depends on nothing authenticated: no API/RTK hooks, no
 * Redux, no route guards — just presentational components and local state.
 */

// The in-page anchor navigation. `id`s match each <Section>.
const NAV_SECTIONS: { id: string; label: string }[] = [
  { id: "tokens", label: "Tokens" },
  { id: "typography", label: "Typography" },
  { id: "buttons", label: "Buttons" },
  { id: "inputs", label: "Inputs" },
  { id: "selection", label: "Selection" },
  { id: "datetime", label: "Date & time" },
  { id: "feedback", label: "Feedback" },
  { id: "overlays", label: "Overlays" },
  { id: "data", label: "Data display" },
  { id: "shared", label: "Ally components" },
];

/** A titled, anchorable block that groups related component examples. */
const Section: React.FC<{
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ id, title, description, children }) => (
  <section id={id} className="scroll-mt-24 border-t border-gray-200 py-12">
    <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
    {description && <p className="mt-1 max-w-2xl text-sm text-gray-500">{description}</p>}
    <div className="mt-6 flex flex-col gap-8">{children}</div>
  </section>
);

/** A labelled example within a section — a small caption over the live demo. */
const Example: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
    <div className="flex flex-wrap items-start gap-4">{children}</div>
  </div>
);

/** A single colour token swatch. */
const Swatch: React.FC<{ name: string; value: string }> = ({ name, value }) => (
  <div className="w-36">
    <div
      className="h-16 w-full rounded border border-gray-200"
      style={{ backgroundColor: value }}
    />
    <p className="mt-2 text-sm font-medium text-gray-900">{name}</p>
    <p className="font-mono text-xs uppercase text-gray-500">{value}</p>
  </div>
);

/** Modal opens from a trigger button — needs local open state. */
const ModalDemo: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal
        open={open}
        modalHeading="Publish simulation"
        modalLabel="Design system"
        primaryButtonText="Publish"
        secondaryButtonText="Cancel"
        onRequestClose={() => setOpen(false)}
        onRequestSubmit={() => setOpen(false)}
      >
        <p>
          Modals are used for focused, interruptive tasks that require a decision. This one is wired
          to local state purely for the demo.
        </p>
      </Modal>
    </>
  );
};

/** ContentSwitcher tracks the selected index. */
const ContentSwitcherDemo: React.FC = () => {
  const [index, setIndex] = useState(0);
  return (
    <div className="w-full max-w-md">
      <ContentSwitcher selectedIndex={index} onChange={({ index: i }) => setIndex(i ?? 0)}>
        <Switch name="all" text="All" />
        <Switch name="published" text="Published" />
        <Switch name="draft" text="Draft" />
      </ContentSwitcher>
      <p className="mt-2 text-sm text-gray-500">Selected index: {index}</p>
    </div>
  );
};

/** Slider is controlled. */
const SliderDemo: React.FC = () => {
  const [value, setValue] = useState(60);
  return (
    <Slider
      id="ds-slider"
      labelText="Difficulty"
      min={0}
      max={100}
      step={1}
      value={value}
      onChange={({ value: v }) => setValue(v)}
    />
  );
};

/** NumberInput is controlled. */
const NumberInputDemo: React.FC = () => {
  const [value, setValue] = useState<number>(3);
  return (
    <NumberInput
      id="ds-number"
      label="Max attempts"
      min={0}
      max={10}
      value={value}
      onChange={(_e, { value: v }) => setValue(Number(v))}
      className="w-56"
    />
  );
};

/** Toast is dismissible — mount/unmount on demand. */
const ToastDemo: React.FC = () => {
  const [show, setShow] = useState(true);
  return (
    <div className="flex flex-col items-start gap-3">
      <Button kind="tertiary" size="sm" onClick={() => setShow(true)}>
        Trigger toast
      </Button>
      {show && (
        <ToastNotification
          kind="success"
          title="Saved"
          subtitle="Your changes were saved successfully."
          caption="Just now"
          onClose={() => {
            setShow(false);
            return true;
          }}
        />
      )}
    </div>
  );
};

/** Feature-level segmented Tabs demo (from ui-shared/lib). */
const FeatureTabsDemo: React.FC = () => {
  const [activeId, setActiveId] = useState("overview");
  return (
    <Tabs
      items={[
        { id: "overview", label: "Overview", count: 12 },
        { id: "activity", label: "Activity", count: 4 },
        { id: "reports", label: "Reports", count: 0 },
      ]}
      activeId={activeId}
      onChange={setActiveId}
    />
  );
};

/** Feature-level segmented Toggle demo (from ui-shared/lib). */
const FeatureToggleDemo: React.FC = () => {
  const [value, setValue] = useState("weekly");
  return (
    <div>
      <Toggle
        label="Cadence"
        items={[
          { label: "Daily", value: "daily" },
          { label: "Weekly", value: "weekly" },
          { label: "Monthly", value: "monthly" },
        ]}
        initialValue="weekly"
        onChange={setValue}
      />
      <p className="mt-2 text-sm text-gray-500">Selected: {value}</p>
    </div>
  );
};

/** Feature-level Pagination demo (from ui-shared/lib). */
const PaginationDemo: React.FC = () => {
  const [page, setPage] = useState(3);
  return <Pagination page={page} totalPages={12} onPageChange={setPage} />;
};

export const DesignSystem: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Sticky header + anchor navigation */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-3">
              <span
                className="text-lg font-semibold"
                style={{ color: carbonTokens.primary }}
              >
                Ally Design System
              </span>
              <span className="text-sm text-gray-400">Carbon · White · IBM Plex Serif</span>
            </div>
            <span className="text-xs text-gray-400">@ally-ui-mono/ui-shared</span>
          </div>
          <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV_SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className="text-gray-500 hover:text-gray-900">
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {/* Intro */}
        <div className="py-12">
          <h1 className="text-4xl font-semibold text-gray-900">Component library</h1>
          <p className="mt-3 max-w-2xl text-gray-500">
            A live gallery of every component in Ally&apos;s centralised design system. Each app in
            the monorepo consumes these from a single shared package, so what you see here is exactly
            what ships across Admin, Helpline and Web.
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Design tokens                                                    */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="tokens"
          title="Design tokens"
          description="The locked palette, radius and type scale that anchor the whole system."
        >
          <Example label="Brand & status colours">
            <Swatch name="Primary" value={carbonTokens.primary} />
            <Swatch name="Danger" value={carbonTokens.danger} />
            <Swatch name="Success" value={carbonTokens.success} />
            <Swatch name="Warning" value={carbonTokens.warning} />
          </Example>
          <Example label="Foundations">
            <div className="rounded border border-gray-200 p-4 text-sm">
              <p className="text-gray-500">Corner radius</p>
              <p className="font-mono text-gray-900">{carbonTokens.radius}px</p>
            </div>
            <div className="rounded border border-gray-200 p-4 text-sm">
              <p className="text-gray-500">Serif family</p>
              <p className="text-gray-900" style={{ fontFamily: carbonTokens.fontFamilySerif }}>
                IBM Plex Serif
              </p>
            </div>
            <div className="rounded border border-gray-200 p-4 text-sm">
              <p className="text-gray-500">Mono family</p>
              <p className="text-gray-900" style={{ fontFamily: carbonTokens.fontFamilyMono }}>
                IBM Plex Mono
              </p>
            </div>
          </Example>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Typography                                                       */}
        {/* ---------------------------------------------------------------- */}
        <Section id="typography" title="Typography" description="The IBM Plex Serif type scale.">
          <div className="flex flex-col gap-2">
            <p className="text-4xl font-semibold">Display — the quick brown fox</p>
            <p className="text-3xl font-semibold">Heading 1 — the quick brown fox</p>
            <p className="text-2xl font-semibold">Heading 2 — the quick brown fox</p>
            <p className="text-xl font-medium">Heading 3 — the quick brown fox</p>
            <p className="text-base">Body — the quick brown fox jumps over the lazy dog.</p>
            <p className="text-sm text-gray-500">
              Caption — the quick brown fox jumps over the lazy dog.
            </p>
            <p className="font-mono text-sm">Mono — const answer = 42;</p>
          </div>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Buttons & actions                                                */}
        {/* ---------------------------------------------------------------- */}
        <Section id="buttons" title="Buttons & actions" description="Button kinds, sizes and icons.">
          <Example label="Kinds">
            <Button kind="primary">Primary</Button>
            <Button kind="secondary">Secondary</Button>
            <Button kind="tertiary">Tertiary</Button>
            <Button kind="ghost">Ghost</Button>
            <Button kind="danger">Danger</Button>
            <Button kind="primary" disabled>
              Disabled
            </Button>
          </Example>
          <Example label="Sizes">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra large</Button>
          </Example>
          <Example label="With icons">
            <Button renderIcon={Add}>Create</Button>
            <Button kind="secondary" renderIcon={Download}>
              Export
            </Button>
            <Button kind="ghost" renderIcon={ArrowRight}>
              Continue
            </Button>
          </Example>
          <Example label="Icon buttons">
            <IconButton label="Edit" kind="ghost">
              <Edit />
            </IconButton>
            <IconButton label="Delete" kind="ghost">
              <TrashCan />
            </IconButton>
            <IconButton label="Favourite" kind="ghost">
              <Star />
            </IconButton>
          </Example>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Text inputs                                                      */}
        {/* ---------------------------------------------------------------- */}
        <Section id="inputs" title="Text inputs" description="Single- and multi-line entry fields.">
          <Example label="Text & password">
            <div className="w-64">
              <TextInput id="ds-text" labelText="Full name" placeholder="Jane Cooper" />
            </div>
            <div className="w-64">
              <TextInput
                id="ds-text-invalid"
                labelText="Email"
                placeholder="jane@company.com"
                invalid
                invalidText="Enter a valid email address."
              />
            </div>
            <div className="w-64">
              <PasswordInput id="ds-password" labelText="Password" placeholder="••••••••" />
            </div>
          </Example>
          <Example label="Number & multi-line">
            <NumberInputDemo />
            <div className="w-80">
              <TextArea
                id="ds-textarea"
                labelText="Notes"
                placeholder="Add context for reviewers…"
                rows={4}
              />
            </div>
          </Example>
          <Example label="Search">
            <div className="w-80">
              <Search
                id="ds-search"
                labelText="Search"
                placeholder="Search simulations…"
                size="lg"
              />
            </div>
          </Example>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Selection controls                                               */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="selection"
          title="Selection controls"
          description="Choosing one or many values."
        >
          <Example label="Checkbox & radio">
            <CheckboxGroup legendText="Channels">
              <Checkbox id="ds-cb-1" labelText="Voice" defaultChecked />
              <Checkbox id="ds-cb-2" labelText="Chat" />
              <Checkbox id="ds-cb-3" labelText="Email" />
            </CheckboxGroup>
            <RadioButtonGroup
              legendText="Difficulty"
              name="ds-radio"
              defaultSelected="medium"
              orientation="vertical"
            >
              <RadioButton labelText="Easy" value="easy" id="ds-r-1" />
              <RadioButton labelText="Medium" value="medium" id="ds-r-2" />
              <RadioButton labelText="Hard" value="hard" id="ds-r-3" />
            </RadioButtonGroup>
          </Example>
          <Example label="Toggle">
            <CarbonToggle id="ds-toggle-1" labelText="Auto-publish" defaultToggled />
            <CarbonToggle id="ds-toggle-2" labelText="Record sessions" />
          </Example>
          <Example label="Dropdowns & select">
            <div className="w-72">
              <Select id="ds-select" labelText="Language" defaultValue="en">
                <SelectItem value="en" text="English" />
                <SelectItem value="hi" text="Hindi" />
                <SelectItem value="ta" text="Tamil" />
              </Select>
            </div>
            <div className="w-72">
              <CarbonDropdown
                id="ds-dropdown"
                titleText="Persona"
                label="Choose a persona"
                items={["Anxious caller", "Frustrated user", "First-time visitor"]}
              />
            </div>
          </Example>
          <Example label="Multi-select & combo box">
            <div className="w-72">
              <MultiSelect
                id="ds-multiselect"
                titleText="Tags"
                label="Select tags"
                items={[
                  { id: "empathy", text: "Empathy" },
                  { id: "safety", text: "Safety" },
                  { id: "listening", text: "Active listening" },
                ]}
                itemToString={item => item?.text ?? ""}
              />
            </div>
            <div className="w-72">
              <ComboBox
                id="ds-combobox"
                titleText="Assign reviewer"
                placeholder="Start typing…"
                items={["Aisha Khan", "Ben Carter", "Chen Wei", "Diego Ramos"]}
                onChange={() => undefined}
              />
            </div>
          </Example>
          <Example label="Slider">
            <div className="w-96">
              <SliderDemo />
            </div>
          </Example>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Date & time                                                      */}
        {/* ---------------------------------------------------------------- */}
        <Section id="datetime" title="Date & time" description="Date and time entry.">
          <Example label="Pickers">
            <DatePicker datePickerType="single">
              <DatePickerInput
                id="ds-datepicker"
                labelText="Start date"
                placeholder="mm/dd/yyyy"
              />
            </DatePicker>
            <div className="w-40">
              <TimePicker id="ds-timepicker" labelText="Start time" />
            </div>
          </Example>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Feedback & status                                                */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="feedback"
          title="Feedback & status"
          description="Notifications, loading and progress."
        >
          <Example label="Inline notifications">
            <div className="flex w-full flex-col gap-3">
              <InlineNotification kind="info" title="Info" subtitle="A neutral, informational message." />
              <InlineNotification kind="success" title="Success" subtitle="The action completed." />
              <InlineNotification kind="warning" title="Warning" subtitle="Something needs attention." />
              <InlineNotification kind="error" title="Error" subtitle="The action failed." />
            </div>
          </Example>
          <Example label="Toast">
            <ToastDemo />
          </Example>
          <Example label="Loading & progress">
            <Loading withOverlay={false} small />
            <InlineLoading description="Saving…" status="active" />
            <div className="w-80">
              <ProgressBar label="Uploading" helperText="60%" value={60} max={100} />
            </div>
          </Example>
          <Example label="Skeletons">
            <div className="w-80">
              <SkeletonText paragraph lineCount={3} />
            </div>
            <SkeletonPlaceholder />
          </Example>
          <Example label="Tags">
            <Tag type="blue">Blue</Tag>
            <Tag type="green">Green</Tag>
            <Tag type="red">Red</Tag>
            <Tag type="purple">Purple</Tag>
            <Tag type="gray">Gray</Tag>
            <DismissibleTag type="teal" text="Dismissible" onClose={() => undefined} />
          </Example>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Overlays                                                         */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="overlays"
          title="Overlays"
          description="Modals, tooltips and contextual information."
        >
          <Example label="Modal">
            <ModalDemo />
          </Example>
          <Example label="Tooltip & toggletip">
            <Tooltip label="Duplicate this simulation" align="bottom">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded border border-gray-200"
              >
                <Information />
              </button>
            </Tooltip>
            <Toggletip align="bottom">
              <ToggletipButton label="More information">
                <Information />
              </ToggletipButton>
              <ToggletipContent>
                <p className="text-sm">
                  Toggletips reveal extra detail on click and stay open until dismissed.
                </p>
              </ToggletipContent>
            </Toggletip>
            <p className="text-sm">
              Hover the{" "}
              <DefinitionTooltip definition="A short, inline explanation of a term." openOnHover>
                definition tooltip
              </DefinitionTooltip>{" "}
              in a sentence.
            </p>
          </Example>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Data display                                                     */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="data"
          title="Data display"
          description="Tables, tabs, tiles and navigation."
        >
          <Example label="Table">
            <div className="w-full">
              <TableContainer title="Simulations" description="A sample data table.">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Difficulty</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Crisis de-escalation</TableCell>
                      <TableCell>
                        <Tag type="green">Published</Tag>
                      </TableCell>
                      <TableCell>Hard</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>First contact intake</TableCell>
                      <TableCell>
                        <Tag type="gray">Draft</Tag>
                      </TableCell>
                      <TableCell>Easy</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Boundary setting</TableCell>
                      <TableCell>
                        <Tag type="blue">In review</Tag>
                      </TableCell>
                      <TableCell>Medium</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </Example>
          <Example label="Tabs">
            <div className="w-full max-w-2xl">
              <CarbonTabs>
                <TabList aria-label="Design system tabs">
                  <Tab>Overview</Tab>
                  <Tab>Transcript</Tab>
                  <Tab>Report</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>Overview panel content.</TabPanel>
                  <TabPanel>Transcript panel content.</TabPanel>
                  <TabPanel>Report panel content.</TabPanel>
                </TabPanels>
              </CarbonTabs>
            </div>
          </Example>
          <Example label="Accordion">
            <div className="w-full max-w-2xl">
              <Accordion>
                <AccordionItem title="What is a simulation?">
                  A scripted roleplay a learner practises against.
                </AccordionItem>
                <AccordionItem title="How is it scored?">
                  Against a rubric of competencies, graded by the judge.
                </AccordionItem>
                <AccordionItem title="Who can see reports?">
                  Reviewers and the learner who ran the session.
                </AccordionItem>
              </Accordion>
            </div>
          </Example>
          <Example label="Tiles">
            <Tile className="w-64">
              <h4 className="text-base font-semibold">Static tile</h4>
              <p className="mt-1 text-sm text-gray-500">A surface for grouping content.</p>
            </Tile>
            <ClickableTile className="w-64" href="#data">
              <h4 className="text-base font-semibold">Clickable tile</h4>
              <p className="mt-1 text-sm text-gray-500">Navigates on click.</p>
            </ClickableTile>
          </Example>
          <Example label="Content switcher">
            <ContentSwitcherDemo />
          </Example>
          <Example label="Links & breadcrumbs">
            <Link href="#data" renderIcon={ArrowRight}>
              View documentation
            </Link>
            <Breadcrumb noTrailingSlash>
              <BreadcrumbItem href="#data">Home</BreadcrumbItem>
              <BreadcrumbItem href="#data">Simulations</BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>Detail</BreadcrumbItem>
            </Breadcrumb>
          </Example>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Ally shared feature components                                   */}
        {/* ---------------------------------------------------------------- */}
        <Section
          id="shared"
          title="Ally components"
          description="Higher-level components composed on top of the primitives, shipped from ui-shared."
        >
          <Example label="Badge">
            <Badge text="Dark" variant={SearchVariant.DARK} />
            <Badge text="Light" variant={SearchVariant.LIGHT} />
            <Badge text="Outlined" variant="outlined" />
          </Example>
          <Example label="Chip group (with overflow)">
            <ChipGroup
              items={[
                { id: 1, name: "Empathy" },
                { id: 2, name: "Safety" },
                { id: 3, name: "Listening" },
                { id: 4, name: "Clarity" },
              ]}
              maxVisible={2}
            />
          </Example>
          <Example label="Button group">
            <ButtonGroup
              buttonList={[
                { text: "Edit", action: () => undefined, show: true, leftIcon: <Edit /> },
                { text: "Duplicate", action: () => undefined, show: true },
                {
                  text: "Delete",
                  action: () => undefined,
                  show: true,
                  leftIcon: <TrashCan />,
                },
              ]}
            />
          </Example>
          <Example label="Tabs (segmented)">
            <div className="w-full max-w-xl">
              <FeatureTabsDemo />
            </div>
          </Example>
          <Example label="Toggle (segmented)">
            <FeatureToggleDemo />
          </Example>
          <Example label="Pagination">
            <PaginationDemo />
          </Example>
        </Section>

        <footer className="border-t border-gray-200 py-10 text-sm text-gray-400">
          Ally Design System — rendered live from <span className="font-mono">@ally-ui-mono/ui-shared</span>.
        </footer>
      </main>
    </div>
  );
};

export default DesignSystem;
