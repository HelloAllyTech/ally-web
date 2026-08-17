import { FC } from "react";

import { Accordion, AccordionItem } from "@ally-ui-mono/ui-shared";
import { AgentAvatar } from "@components/agent-avatar";
import { en } from "@constants";

/**
 * "About me" — the old FAQ, asked in the second person and answered in the
 * first, so reading it feels like asking a colleague how they work.
 *
 * Where this sits on the page depends on whether Bug Hunter has ever been put
 * on duty (see BugHunter.tsx): unread introductions belong at the top, and
 * eleven accordions between the working-style control and the actual work do
 * not.
 */
export const AboutAgent: FC = () => (
  <div className="max-w-3xl">
    <div className="flex items-center gap-2 mb-2">
      <AgentAvatar size="sm" label={en.bugHunter.agentName} />
      <h2 className="text-sm font-semibold text-typography-900">{en.bugHunter.faqTitle}</h2>
    </div>
    <Accordion size="sm">
      <AccordionItem title={en.bugHunter.faqWhatTitle}>
        <p className="text-sm text-typography-700">{en.bugHunter.faqWhatBody}</p>
      </AccordionItem>
      <AccordionItem title={en.bugHunter.faqModesTitle}>
        <p className="text-sm text-typography-700">{en.bugHunter.faqModesBody}</p>
      </AccordionItem>
      <AccordionItem title={en.bugHunter.faqTrivialTitle}>
        <p className="text-sm text-typography-700">{en.bugHunter.faqTrivialBody}</p>
      </AccordionItem>
      <AccordionItem title={en.bugHunter.faqFixNowTitle}>
        <p className="text-sm text-typography-700">{en.bugHunter.faqFixNowBody}</p>
      </AccordionItem>
      <AccordionItem title={en.bugHunter.faqMultiRepoTitle}>
        <p className="text-sm text-typography-700">{en.bugHunter.faqMultiRepoBody}</p>
      </AccordionItem>
      <AccordionItem title={en.bugHunter.faqReleaseTitle}>
        <p className="text-sm text-typography-700">{en.bugHunter.faqReleaseBody}</p>
      </AccordionItem>
      <AccordionItem title={en.bugHunter.faqReviewTitle}>
        <p className="text-sm text-typography-700">{en.bugHunter.faqReviewBody}</p>
      </AccordionItem>
      <AccordionItem title={en.bugHunter.faqEscalationTitle}>
        <p className="text-sm text-typography-700">{en.bugHunter.faqEscalationBody}</p>
      </AccordionItem>
      <AccordionItem title={en.bugHunter.faqReposTitle}>
        <p className="text-sm text-typography-700">{en.bugHunter.faqReposBody}</p>
      </AccordionItem>
      <AccordionItem title={en.bugHunter.faqCostTitle}>
        <p className="text-sm text-typography-700">{en.bugHunter.faqCostBody}</p>
      </AccordionItem>
      <AccordionItem title={en.bugHunter.faqOffTitle}>
        <p className="text-sm text-typography-700">{en.bugHunter.faqOffBody}</p>
      </AccordionItem>
    </Accordion>
  </div>
);
