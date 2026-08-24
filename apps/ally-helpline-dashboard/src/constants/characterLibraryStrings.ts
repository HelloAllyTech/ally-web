/**
 * Character Library / interview-agent copy.
 *
 * A plain strings object rather than i18next keys, matching the pattern the
 * ported interview-chat components (ChatComposer/ChatMessage/QuestionCard,
 * copied from ally-admin-dashboard) already expect via `en.characterInterview`
 * there. Only `nav.tabs.characterLibrary` needs to be a real i18next key,
 * since that one renders through NavSideBar's `t()` call like every other tab.
 */
export const characterLibraryStrings = {
  characters: "Characters",
  createNewCharacter: "Create new character",
  createManually: "Create manually",
  createWithInterviewAgent: "Create with interview agent",
  characterCreatedSuccessfully: "Character created successfully",
  failedToCreateCharacter: "Failed to create character",
  loading: "Loading...",
  loadMore: "Load more",
  noMoreData: "No more data",
  save: "Save",
  cancel: "Cancel",
  close: "Close",
  voice: "Voice",
  selectVoice: "Select voice",
  languageStyle: "Language style",
  enterLanguageStyle: "Describe the character's dialect, register, or code-mixing style",
  dialectSamples: "Dialect samples",
  dialectSamplePlaceholder: "Enter a sample line in the character's voice",
  addDialectSample: "Add dialect sample",
  dialectSampleLimit: "Maximum of 20 dialect samples — remove one to add another.",
  knowledgeSources: "Knowledge sources",
  knowledgeSourceTitlePlaceholder: "Title",
  knowledgeSourceTextPlaceholder: "What should this character know?",
  addKnowledgeSource: "Add knowledge source",
  knowledgeSourceLimit: "Maximum of 50 knowledge sources — remove one to add another.",
  emptyStateTitle: "No characters yet",
  emptyStateDescription:
    "Let the interview agent build your organisation's first character with you, or create one manually.",

  // Search
  searchLabel: "Search characters",
  searchPlaceholder: "Search characters",
  clearSearch: "Clear search",

  // A search that matched nothing is a different situation from a library
  // that was never populated — offering "create your first character" to
  // someone who just mistyped a name sends them down the wrong path.
  noResultsTitle: "No characters match your search",
  noResultsDescription: "Try a different name, or clear the search to see every character.",

  // Failure state: the table used to render the "no characters yet" empty
  // state on a failed fetch, telling admins their library was empty when we
  // simply hadn't managed to read it.
  errorTitle: "Couldn't load characters",
  errorDescription: "Something went wrong reaching the character library. Try again in a moment.",
  retry: "Try again",

  // Form validation + exit guard
  closeForm: "Close",
  requiredField: "Required",
  requiredFieldsMissing: "Fill in the required fields before saving",
  discardConfirmTitle: "Discard",
  discardConfirmTitleItalic: "this character?",
  discardConfirmDescription: "You have unsaved details on this form. Closing it now discards them.",
  discardConfirmLeave: "Discard",
  discardConfirmStay: "Keep editing",
} as const;

export const characterInterviewStrings = {
  title: "Character interview",
  subtitle: "Answer a few questions and the agent will draft a rich, consistent character.",
  placeholder: "Type your answer, or add anything else…",
  send: "Send",
  stop: "Stop",
  interrupted: "(interrupted)",
  thinking: "Thinking…",
  startFailed: "Couldn't start the interview",
  resumeFailed: "Couldn't resume the interview",
  streamFailed: "The interview stream failed — please try again",
  turnInProgress: "Please wait for the current answer to finish",
  emptyTitle: "Starting the interview…",
  emptySubtitle: "The agent will ask its first question in a moment.",
  toolLookingUpVoices: "Looking up available voices…",
  toolBuildingProfile: "Putting the character profile together…",
  submitAnswer: "Submit answer",
  freeTextPlaceholder: "Type your answer…",
  confirmSelection: "Confirm",
  noneOfThese: "None of these",
  addCustom: "Add your own",
  addCustomPlaceholder: "Add your own…",
  add: "Add",
  selectPlaceholder: "Select…",
  minSelectionsHint: (n: number) => `Select at least ${n}`,
  selectedCountLabel: (n: number) => `${n} selected`,
  exitConfirmTitle: "Leave the interview?",
  exitConfirmDescription: "Your progress in this conversation will be lost.",
  exitConfirmLeave: "Leave",
  exitConfirmStay: "Stay",
  draftReadyToast: "Character draft ready — review it before saving",
  startOver: "Start over",
  reviewCharacter: "Review character",
} as const;
