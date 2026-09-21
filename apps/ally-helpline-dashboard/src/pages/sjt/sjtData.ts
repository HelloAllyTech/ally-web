/* ============================================================
   "Everyday conversations" — a situational judgement self-check
   for teachers (primary + secondary), served publicly at /SJT1.

   Content is a verbatim port of the design prototype. The
   consensus rankings in `key` are illustrative and NOT validated:
   before any real use they need review by a panel (safeguarding
   lead, school counsellor, educational psychologist) and piloting
   for item difficulty and discrimination. The copy on the intro
   and results screens says so, and must keep saying so.
   ============================================================ */

/** The four areas of practice each scenario is written to probe. */
export type DomainCode = "VN" | "CA" | "BR" | "LM";

export type OptionId = "a" | "b" | "c" | "d";

export interface Domain {
  code: DomainCode;
  label: string;
  blurb: string;
}

export interface SjtOption {
  /** What the teacher says — shown on the question screen. */
  text: string;
  /** The reasoning, revealed only on the results screen. */
  why: string;
}

export interface SjtItem {
  id: number;
  phase: "Primary" | "Secondary";
  domain: DomainCode;
  setting: string;
  scenario: string;
  options: Record<OptionId, SjtOption>;
  /** Panel consensus, best first. */
  key: OptionId[];
}

export const DOMAINS: Record<DomainCode, Domain> = {
  VN: {
    code: "VN",
    label: "Validate & normalise",
    blurb: "Naming a feeling accurately, without minimising it or making it bigger than it is.",
  },
  CA: {
    code: "CA",
    label: "Build coping & autonomy",
    blurb:
      "Leaving the student more capable than before — scaffolding rather than rescuing or refusing.",
  },
  BR: {
    code: "BR",
    label: "Boundaries & referral",
    blurb:
      "Holding your professional limits: honest about confidentiality, quick to involve the right adult.",
  },
  LM: {
    code: "LM",
    label: "Language & modelling",
    blurb:
      "The words you allow in the room, and what your own behaviour teaches about coping and help-seeking.",
  },
};

export const ITEMS: SjtItem[] = [
  {
    id: 1,
    phase: "Secondary",
    domain: "VN",
    setting: "Year 9 · two minutes before an assessment",
    scenario:
      "A student you know to be capable mutters as you hand out papers: “I'm going to fail. I always mess this up. There's no point even trying.”",
    options: {
      a: {
        text: "“Don't be silly — you're one of the best in this class.”",
        why: "Warm, but it contradicts the student's own experience. Reassurance that argues with a feeling usually teaches students not to voice it.",
      },
      b: {
        text: "“Sounds like this one's really got to you. Which bit feels worst — the timing, or not knowing what's on it?”",
        why: "Names the feeling, then narrows it to something workable. This is the move that keeps the conversation open and takes 15 seconds.",
      },
      c: {
        text: "“Everyone gets nervous before a test. Just do your best.”",
        why: "Normalising is genuinely useful, but paired with “just do your best” it closes the door rather than opening it.",
      },
      d: {
        text: "“Well, if you'd revised properly you wouldn't be feeling like this.”",
        why: "Turns distress into a moral failing. Reliably stops students bringing you anything that matters.",
      },
    },
    key: ["b", "c", "a", "d"],
  },
  {
    id: 2,
    phase: "Primary",
    domain: "VN",
    setting: "Year 3 · Tuesday morning, still at the classroom door",
    scenario:
      "A child who has settled fine for weeks is crying at drop-off and won't let go of the door frame. Between sobs: “I want my mum.”",
    options: {
      a: {
        text: "“Come on now — big Year 3s don't cry at the door.”",
        why: "Shames the feeling and ties it to being grown up. Children learn to hide distress rather than manage it.",
      },
      b: {
        text: "“You're missing Mum, and that's a big feeling. Sit with me while we do the register, then you can tell me one thing you're doing at playtime.”",
        why: "Accepts the feeling, stays alongside the child, then moves gently towards the routine. Co-regulation before redirection.",
      },
      c: {
        text: "“If you're still crying in five minutes you'll miss golden time.”",
        why: "Adds a threat to an already flooded child. Escalates rather than settles, and links emotion to punishment.",
      },
      d: {
        text: "“Mum will be back at home time. Let's go and sit down.”",
        why: "True and calm, and sometimes enough — but it steps straight over the feeling to the practicality.",
      },
    },
    key: ["b", "d", "c", "a"],
  },
  {
    id: 3,
    phase: "Secondary",
    domain: "BR",
    setting: "Year 10 · end of lesson, room emptying",
    scenario:
      "A student hangs back. “Can I tell you something if you promise not to tell anyone? I've been feeling like nothing really matters lately.”",
    options: {
      a: {
        text: "“Of course. Whatever you say stays between us.”",
        why: "A promise you cannot keep. When you have to break it, the student learns that adults who offer help are not straight with them.",
      },
      b: {
        text: "“I'm really glad you told me. I can't promise to keep it to myself, because I want to make sure you get proper support — but I'll tell you exactly who I'd speak to and why. Can we sit down now?”",
        why: "Honest about limits, warm about the disclosure, and acts immediately. Transparency about who you'll tell is what preserves trust.",
      },
      c: {
        text: "“You should book in with the school counsellor — they're in on Thursdays.”",
        why: "The right destination, but handing over a signpost isn't the same as walking them there. Also leaves the disclosure unheld today.",
      },
      d: {
        text: "“Let's talk properly after school when I've finished this marking.”",
        why: "Delays a live disclosure by hours. The student has just used a lot of courage; the window may not reopen.",
      },
    },
    key: ["b", "c", "d", "a"],
  },
  {
    id: 4,
    phase: "Primary",
    domain: "CA",
    setting: "Year 5 · third breaktime this week",
    scenario:
      "A child comes to you again about a friendship fallout. “Can you tell them to let me play? They're being mean and it's not fair.”",
    options: {
      a: {
        text: "“Tell me what happened and I'll go and have a word with them.”",
        why: "Sometimes necessary. But as the default it makes you the mechanism for every conflict, and the child gains nothing they can reuse.",
      },
      b: {
        text: "“You've sorted out tricky things before. What's one thing you could try first? I'll find you at lunch to see how it went.”",
        why: "Hands back capability and keeps you in the loop. Slightly stronger if the child is given options rather than asked to invent one.",
      },
      c: {
        text: "“You're big enough to sort your own problems out now.”",
        why: "Autonomy without support is just refusal. The child hears “don't bring me this”.",
      },
      d: {
        text: "“Let's think of two things you could say. Try the first one — and if it doesn't work, come and get me and I'll come over with you.”",
        why: "Scaffolds the skill, rehearses the words, and guarantees a backstop. Independence with a safety net is what builds it.",
      },
    },
    key: ["d", "b", "a", "c"],
  },
  {
    id: 5,
    phase: "Secondary",
    domain: "LM",
    setting: "Corridor · between lessons",
    scenario:
      "You hear one student say to another, laughing: “Don't be so bipolar about it.” The second student laughs too.",
    options: {
      a: {
        text: "Let it go — it's just how they talk, and nobody was upset.",
        why: "Silence is a position. It tells the whole corridor which words are acceptable here, including to the student quietly living with a diagnosis.",
      },
      b: {
        text: "“Stop there. Bipolar is something people actually live with. Using it as a punchline makes it harder for anyone here to talk about their own head. Say it again without that.”",
        why: "Names the harm, explains it in ten seconds, and asks for a redo. Corrects the culture rather than just the individual.",
      },
      c: {
        text: "“That's unkind language — I'll see you at break for a detention.”",
        why: "Enforces a boundary but teaches nothing about why. Students learn to avoid saying it in front of you.",
      },
      d: {
        text: "“We don't use that word here.”",
        why: "Fast, clear, and better than nothing. Missing the one sentence of reasoning that would make it stick.",
      },
    },
    key: ["b", "d", "c", "a"],
  },
  {
    id: 6,
    phase: "Primary",
    domain: "LM",
    setting: "Year 4 · you've had a genuinely awful morning",
    scenario:
      "You're visibly flustered. A child asks, in front of everyone: “Miss, are you alright? You look cross.”",
    options: {
      a: {
        text: "“I'm fine, nothing's wrong.”",
        why: "The children can see it isn't true. Models that feelings should be denied — and that their own read on a room can't be trusted.",
      },
      b: {
        text: "“Good noticing. I'm a bit frazzled this morning, so I'm going to take three slow breaths and then we'll start. You can do them with me.”",
        why: "Names it plainly, keeps it age-appropriate, and shows a coping strategy in action. This is the single highest-value modelling moment in the day.",
      },
      c: {
        text: "“Honestly, it's been a nightmare — the car wouldn't start, then I got a horrible email, and my mum's unwell…”",
        why: "Over-disclosure. The class inherits a worry they can't do anything about, and some will try to look after you.",
      },
      d: {
        text: "“Never mind me. Books out, page 40.”",
        why: "Protects the boundary and gets on with the lesson. Neutral rather than harmful, but a teaching moment goes past.",
      },
    },
    key: ["b", "d", "a", "c"],
  },
  {
    id: 7,
    phase: "Secondary",
    domain: "CA",
    setting: "Year 11 · mock results week",
    scenario:
      "A high-achieving student tells you proudly that they were up until 3am revising, again, and that they'll “sleep after the exams”.",
    options: {
      a: {
        text: "“That's the kind of dedication I like to see.”",
        why: "Rewards the exact behaviour that will hurt their results and their health. Praise is a powerful reinforcer — aim it carefully.",
      },
      b: {
        text: "“That's real commitment. Here's the annoying bit though: sleep is when what you revised actually sticks. What would your plan look like if it had to finish by ten?”",
        why: "Keeps the relationship, reframes rest as part of the work, and hands them the redesign. Motivation stays intact.",
      },
      c: {
        text: "“You'll burn yourself out doing that. You need to stop.”",
        why: "Correct diagnosis, no route forward. A driven student will hear it as “care less” and ignore you.",
      },
      d: {
        text: "“That's your call, as long as the work's in on time.”",
        why: "Respects autonomy but abandons the duty of care. Silence here reads as approval.",
      },
    },
    key: ["b", "c", "d", "a"],
  },
  {
    id: 8,
    phase: "Primary",
    domain: "VN",
    setting: "Year 2 · while lining up for lunch",
    scenario:
      "A child mentions casually: “My mum's been in bed all week so my nan is doing our dinners now.”",
    options: {
      a: {
        text: "“That's really a matter for home, not for school.”",
        why: "Closes down a child who has just told you something significant, and loses information the pastoral team needs.",
      },
      b: {
        text: "“Thank you for telling me — that's a lot of change at home. How's it been for you? … And log it for the pastoral lead / DSL afterwards.”",
        why: "Follows the child's lead, keeps the focus on their experience rather than the adults', and gets the information to the person who can act.",
      },
      c: {
        text: "“Is your mum poorly? What's wrong with her? Has she seen a doctor?”",
        why: "Turns a child into an informant about an adult's health. Ask about the child's world, not the diagnosis.",
      },
      d: {
        text: "“Oh you poor thing, that must be so hard for you.”",
        why: "Kind, but pity casts the child as a victim and often ends the conversation. Curiosity travels further than sympathy.",
      },
    },
    key: ["b", "d", "c", "a"],
  },
  {
    id: 9,
    phase: "Secondary",
    domain: "CA",
    setting: "Year 8 · after a presentation went badly",
    scenario:
      "A student who froze in front of the class asks you, privately, to be excused from all speaking tasks for the rest of the year.",
    options: {
      a: {
        text: "“Alright — I'll take you off the list for the rest of the term.”",
        why: "Relief now, a bigger fear later. Avoidance is the thing that keeps anxiety in place, so blanket exemptions tend to shrink the student's world.",
      },
      b: {
        text: "“I don't want to drop it — I want to shrink it. Next one is to me and two people you pick. If you need a minute mid-way, use this signal and I'll move on.”",
        why: "Graded steps plus a visible exit route. The student keeps control and gets evidence that they can do it.",
      },
      c: {
        text: "“Everyone has to present. No exceptions — that's the assessment.”",
        why: "Rigid, and offers no adjustment at all. Most likely outcome is absence on the day.",
      },
      d: {
        text: "“Get your parents to email me and I'll see what I can do.”",
        why: "Neither refuses nor helps. The student is sent away to organise their own accommodation.",
      },
    },
    key: ["b", "a", "d", "c"],
  },
  {
    id: 10,
    phase: "Secondary",
    domain: "BR",
    setting: "Year 9 · a friend comes to you at the end of registration",
    scenario:
      "“I'm worried about my mate. She's gone really quiet, she's not eating lunch with us any more, and she said something weird last week. Please don't tell her I told you.”",
    options: {
      a: {
        text: "“I'm afraid I can't discuss another student with you.”",
        why: "Technically tidy, but it punishes the exact behaviour you want in a school. This student may not come again.",
      },
      b: {
        text: "“Thank you for looking out for her — that took something. Tell me what you've noticed. This isn't yours to carry, so I'll take it to our pastoral lead. What you can keep doing is just being her mate.”",
        why: "Thanks the reporter, gathers what's needed, moves it to the right adult, and gives the friend a job that's actually theirs.",
      },
      c: {
        text: "“Have you told her she should get some help?”",
        why: "Puts the intervention back on a 14-year-old. Fine as one part of a response, poor as the whole of it.",
      },
      d: {
        text: "“Leave it with me — I'll go and ask her about it now.”",
        why: "Well-intentioned, but confronting the student immediately (and visibly) exposes the friend and can feel like an ambush.",
      },
    },
    key: ["b", "c", "a", "d"],
  },
];

export const RANK_LABELS = ["Best", "2nd", "3rd", "Worst"] as const;

export const OPTION_IDS: OptionId[] = ["a", "b", "c", "d"];
