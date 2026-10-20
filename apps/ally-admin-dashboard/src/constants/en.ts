/** How "How it plays" names each kind of course item, singular then plural. Keyed by TrackItemType. */
const LANDING_ITEM_NOUNS: Record<string, [string, string]> = {
  ROLEPLAY: ["roleplay", "roleplays"],
  CASE: ["case", "cases"],
  QUIZ: ["quiz", "quizzes"],
  ARTICLE: ["article", "articles"],
  VIDEO: ["video", "videos"],
  JOURNAL: ["journal", "journals"],
  ANNOTATED_ARTIFACT: ["annotation", "annotations"],
  GAME: ["game", "games"],
};

export const en = {
  common: {
    apply: "Apply",
    search: "Search",
    showing: "Showing",
    of: "of",
    previous: "Previous",
    next: "Next",
    updating: "updating…",
    searchMenu: "Search menu...",
    noMenuResults: "No matching tabs",
    clearSearch: "Clear search",
    filter: "Filter",
    removeFilter: "Remove filter",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    searchOrCreate: "Search or create",
    loading: "Loading...",
    loadMore: "Load more",
    noMoreData: "No more data",
    update: "Update",
    create: "Create",
    goBack: "Go Back",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    noOptionsAvailable: "No options available",
    noResultsFound: "No results found",
    noCharactersFoundMatchingYourSearch: "No characters found matching your search",
    select: "Select",
    uploading: "Uploading...",
    saving: "Saving...",
    enabled: "Enabled",
    disabled: "Disabled",
    edit: "Edit",
    view: "View",
    moreActions: "More actions",
    or: "OR",
    retry: "Retry",
    characters: "characters",
    character: "character",
    successfullyDeleted: "Successfully deleted",
    thisActionCannotBeUndone: "This action cannot be undone.",
    areYouSureYouWantToDelete: "Are you sure you want to delete",
    maxActiveUsers: {
      title: "We're at capacity right now",
      description:
        "We're currently handling the maximum number of active users. Please wait a moment and try again access usually frees up shortly.",
      retry: "Retry",
      manualRetry: "You can retry in {seconds}s",
      autoRetry: "We'll automatically retry in {seconds}s",
    },
  },
  errors: {
    failedToCreateTooltip: "Failed to create tooltip",
    failedToUpdateTooltip: "Failed to update tooltip",
    maxRowsBehavioursInstruction: "You can only add up to 10 rows of behaviours instruction.",
    overviewMandatoryFieldsNotFilled:
      "Please fill all mandatory fields in the Overview step to proceed.",
    failedCompetencyCreation: "Failed to create competency",
    failedCompetencyUpdate: "Failed to rename competency",
    failedCompetencyDeletion: "Failed to delete competency",
    failedToDeleteBadges: "Failed to delete badges",
    failedToDeleteCharacter: "Failed to delete character(s)",
    failedToGoogleSignIn: "Failed to sign in with Google. Please try again.",
    failedCreateOrganization: "Failed to create organization",
    fileMustBeJPEGOrPNG: "File must be JPEG or PNG.",
    fileMustBeVideo: "File must be a video.",
    fileUploadFailed: "Failed to upload file. Please try again.",
    videoUploadFailed: "Failed to upload video. Please try again.",
    fileMetadataLoadFailed: "Failed to load video metadata",
    imageMustHave169AspectRatio: "Image must have a 16:9 aspect ratio.",
    imageMustHave1AspectRatio: "Please upload an image with the correct aspect ratio",
    fileDeleteFailed: "Failed to delete file. Please try again.",
    titleIsRequired: "Title should be filled to save as draft",
    failedSimulationChange: "Failed to save simulation changes!",
    failedPathwayChange: "Failed to save Tracks changes!",
    failedSaveDraft: "Failed to save draft. Please try again.",
    failedSimulationCreation: "Failed to create simulation. Please try again.",
    pathUpdateFailed: "Failed to update track access.",
    caseUpdateFailed: "Failed to update case access.",
    courseUpdateFailed: "Failed to update course access.",
    failedUpdateAccess: "Failed to update access.",
    failedUpdateBadgeAccess: "Failed to update badge access.",
    OrganizationNotFound: "Organization not found",
    minimumScoreError: "Minimum score must be a positive integer",
    failedToCreateEvent: "Failed to create event",
    failedToProceed: "Fill atleast title field to proceed to Event Configuration!",
    failedToSaveEvents: "Failed to save events. Please try again.",
    failedToBulkAddEvents: (count: number) =>
      `Failed to save ${count} event${count !== 1 ? "s" : ""}. None of them were added — please try again.`,
    failedToDeleteEvent: "Failed to delete event. Please try again.",
    errorUpdatingEvent: "Error updating event",
    userIdNotFound: "User id not found",
    failedToRemoveUser: "Failed to remove user",
    failedToUploadImage: "Failed to upload image",
    failedToLoadImage: "Failed to load image",
    failedToLoadVoices: "Failed to load voices",
    failedToDeleteVoice: "Failed to delete voice",
    failedToSaveVoice: "Failed to save voice",
    failedToCancelReportGeneration: "Failed to cancel report generation",
    failedToRegenerate: "Failed to regenerate",
    failedToEnhance: "Failed to improve",
    failedToCreateFillerTag:
      "Could not create filler tag. It may already exist or the request failed.",
    linguisticStyleSamplesRequired:
      "Linguistic style samples are required. Please provide at least one sample for each selected language.",
    linguisticStyleSamplesMissingFor: (languages: string) =>
      `Linguistic style samples are required. Missing samples for: ${languages}.`,
    invalidStateInstructionIds: "State instructions include an invalid state id.",
  },
  /**
   * What the shell says while it is still finding out what you may see, and when it could not
   * find out at all.
   *
   * Separate from `accessDenied` on purpose. Both states withhold the page — that part is a
   * security decision and does not change — but only one of them is about the reader's
   * account. Telling someone whose entitlements failed to load that the page "isn't turned on
   * for your role" sends them to an admin to fix something that is not broken.
   */
  accessCheck: {
    checking: "Checking your access…",
    failedTitle: "Couldn't check your access",
    failedMessage:
      "We couldn't load your permissions, so this page is held back until we can. This is not a problem with your account.",
    failedNextStep: "Retry, or reload the page. If it keeps failing, the API may be down.",
    retry: "Try again",
  },
  accessDenied: {
    title: "This page is not accessible",
    message:
      "You don't have permission to access this page. Please contact your administrator if you believe this is an error.",
    reasonMissingPermission: "Your account doesn't have the permission this page requires.",
    reasonMissingRoleOrToggle: "This page isn't turned on for your role yet.",
    reasonNotAllowlisted: "This page is in a limited rollout your account isn't part of yet.",
    nextStepContactAdmin: "Ask an Ally admin to grant access if you believe this is a mistake.",
  },
  /**
   * What a crashed page or panel says. Two deliberate choices here. The tone
   * apologises and always offers a way forward rather than stating a fault —
   * whoever hits this has work they were part-way through. And the technical
   * detail is shown rather than hidden: every reader of this console is Ally
   * staff or a tenant admin, and that one line is what makes a report
   * actionable instead of "the admin panel broke".
   */
  errorBoundary: {
    pageTitle: "Sorry — this page stopped working",
    pageMessage:
      "Something went wrong while showing this page, so we stopped before anything got worse. Your work elsewhere in the console is unaffected. Try again, and if it keeps happening send the detail below to the Ally engineering team.",
    panelTitle: "Sorry — this panel stopped working",
    panelMessage:
      "Something went wrong while showing this section. The rest of the page still works, so you can close it and carry on.",
    tryAgain: "Try again",
    reloadPage: "Reload the page",
    detailLabel: "Technical detail",
  },
  error: {
    apiRequestFailed: "API request failed",
    noRefreshDataReceived: "No refresh data received",
    tokenRefreshFailed: "Token refresh failed",
    userFetchFailed: "User fetch failed",
    permissionsFetchFailed: "Permissions fetch failed",
    authenticationFailed: "Authentication failed",
    forbidden: "You don't have permission to do that.",
  },
  auth: {
    hey: "Hey",
    welcomeTo: "Welcome to",
    ally: "ally",
    email: "Email",
    password: "Password",
    login: "Login",
    signup: "Signup",
    forgotPassword: "Forgot Password",
    rememberMe: "Remember Me",
    generatingOTP: "Generating OTP...",
    termsAndConditions: "Terms & Conditions",
    privacyPolicy: "Privacy Policy",
    didNotReceiveTheCode: "Didn't receive the code?",
    signingIn: "Signing in...",
    logout: "Logout",
    enterEmailToContinue: "Enter your email address to continue",
    enterEmailPlaceholder: "Enter your email address",
    next: "Next",
    byTappingNext: "By proceeding, i agree to Ally's",
    andAcknowledge: "and acknowledge",
    verifyYourEmail: "Verify your email address",
    enterSecurityCode: "Enter the security code sent to",
    codeWillExpire: "This code will expire in",
    minutes: "minutes",
    needNewCode: "Need a new code?",
    resend: "Resend",
    verify: "Verify",
    helloAllyUrl: "helloally.ai",
    failedToGenerateOTP: "Failed to generate OTP. Please try again.",
    failedToVerifyOTP: "Failed to verify OTP. Please try again.",
    invalidEmailError: "Please enter a valid email address",
    profileSettings: "Profile settings",
    uploadImage: "Upload image",
    profileImage: "Profile image",
    verifyingMagicLink: "Verifying your magic link...",
    pleaseWait: "Please wait while we verify your link",
    magicLinkExpired: "Invalid or Expired Link",
    redirectingToLogin: "Redirecting to login page...",
    redirectingToDashboard: "Redirecting to dashboard...",
  },
  simulation: {
    untitledRoleplay: "Untitled Roleplay",
    previewMode: {
      voice: "Voice call",
      text: "Text chat",
    },
    autosaving: "Saving…",
    draftAutosaved: "Draft autosaved",
    autosaveFailed: "Couldn’t save — click Save to retry",
    // A published roleplay is never saved in the background (a draft save
    // takes it offline for learners), so its edits wait for Publish.
    liveUnpublishedChanges: "Unpublished changes — Publish to apply them",
    liveVersionSwitchBlocked:
      "This roleplay is live — publish your changes before switching versions, or reload to discard them.",
    takeOfflineTitle: "Take this roleplay",
    takeOfflineTitleItalic: "offline?",
    takeOfflineDescription:
      "Saving it as a draft takes it offline for learners until you publish it again. To keep it live, use Publish instead.",
    saveAsDraft: "Save as draft",
    keepEditing: "Keep editing",
    versions: {
      title: "Versions",
      switchVersion: "Switch version",
      newVersion: "+ New version",
      loading: "Loading…",
      empty: "No versions yet. Create one to start iterating.",
      editing: "editing",
      openTooltip: "Open this version in the editor",
      branch: "Branch",
      rename: "Rename",
      delete: "Delete",
      create: "Create",
      save: "Save",
      cancel: "Cancel",
      namePlaceholder: "e.g. warmer opener",
      newBlankTitle: "New blank version",
      branchingFrom(label: string) {
        return `Branching from ${label}`;
      },
      deleteTitle: "Delete",
      deleteDescription: "This draft version will be removed. This can't be undone.",
      published: "Version published",
      readOnly: "read-only",
      readOnlyEdit: "This version is read-only. Branch it to make changes.",
      statusLabel: {
        DRAFT: "Draft",
        PUBLISHED: "Published",
        ARCHIVED: "Archived",
      } as Record<string, string>,
      created(label: string) {
        return `Created ${label}`;
      },
      renamed(label: string) {
        return `Renamed to ${label}`;
      },
      deleted(label: string) {
        return `Deleted ${label}`;
      },
      editingToast(label: string) {
        return `Editing ${label}`;
      },
      createError: "Couldn't create a new version",
      renameError: "Couldn't rename this version",
      deleteError: "Couldn't delete this version",
      autoBadge: "Auto",
    },
    createCharacter: "Create character",
    editCharacter: "Edit character",
    characterCreatedSuccessfully: "Character created successfully",
    characterDeletedSuccessfully: "Character deleted successfully",
    failedToDeleteCharacter: "Failed to delete character",
    cases: "Cases",
    addSimulationToCase: "Add simulations to case",
    filterByGender: "Filter by gender",
    failedToCreateCharacter: "Failed to create character",
    failedToUpdateCharacter: "Failed to update character",
    characterUpdatedSuccessfully: "Character updated successfully!",
    characters: "Characters",
    createNewCharacter: "Create new character",
    createWithInterviewAgent: "Create with interview agent",
    // Shown in the platform admin's "Organisation" column for a character with
    // no owning tenant — the curated library Ally itself maintains.
    allyOwnedCharacter: "Ally (global)",
    languageStyle: "Language style",
    enterLanguageStyle: "Describe the character's dialect, register, or code-mixing style",
    dialectSamples: "Dialect samples",
    dialectSamplePlaceholder: "Enter a sample line in the character's voice",
    addDialectSample: "Add dialect sample",
    dialectSampleLimit: "You can only have 20 dialect samples. Remove one to add another.",
    knowledgeSources: "Knowledge sources",
    knowledgeSourceTitlePlaceholder: "Title",
    knowledgeSourceTextPlaceholder: "What should this character know?",
    addKnowledgeSource: "Add knowledge source",
    knowledgeSourceLimit: "You can only have 50 knowledge sources. Remove one to add another.",
    duplicatePathwayDescription:
      "Are you sure you want to duplicate this Tracks? This will create a new Tracks with the same configurations.",
    duplicateSimulationDescription:
      "Are you sure you want to duplicate this simulation? This will create a new simulation with the same configurations",
    pathwayDuplicatedSuccessfully: "Tracks duplicated successfully",
    caseDuplicatedSuccessfully: "Case duplicated successfully",
    simulationDuplicatedSuccessfully: "Simulation duplicated successfully",
    failedDuplicatePathway: "Failed to duplicate Tracks",
    failedDuplicateCase: "Failed to duplicate case",
    failedDuplicateSimulation: "Failed to duplicate simulation",
    simulationDeletedSuccessfully: "Simulation deleted successfully",
    failedDeleteSimulation: "Failed to delete simulation",
    failedChangeSimulationStatus: "Failed to change simulation status",
    simulationStatusUpdatedSuccessfully: "Simulation status updated to ",
    failedChangePathwayStatus: "Failed to change Tracks status",
    pathwayStatusUpdatedSuccessfully: "Tracks status updated to ",
    failedChangeCaseStatus: "Failed to change case status",
    caseStatusUpdatedSuccessfully: "Case status updated to ",
    pathwayDeletedSuccessfully: "Tracks deleted successfully",
    caseDeletedSuccessfully: "Case deleted successfully",
    failedDeletePathway: "Failed to delete Tracks",
    failedDeleteCase: "Failed to delete case",
    deletePathway: "Delete Tracks",
    deletePathwayDescription:
      "I understand that deleting this simulation Tracks is permanent and that I will lose all access to users and simulation Tracks analytics.",
    pathway: "Tracks",
    paths: "Tracks",
    createPathway: "Create Tracks",
    videoMaxSizeLabel: "15MB",
    imageMaxSizeLabel: "2MB",
    file: "File",
    addEvent: "Add event",
    // The event picker lists the whole active-event catalogue, so a failed
    // catalogue fetch used to look exactly like "there is nothing to pick" —
    // every search answered "No options found" until the page was reloaded.
    // Say which of the two it is, and offer the reload in place.
    eventCatalogLoadFailed: "Couldn’t load the event list",
    reloadEvents: "Reload the event list and re-sort rows by score",
    advancedEventsLatencyWarning: (count: number) =>
      `Heads up: ${count} advanced events are selected for this simulation. Selecting more than 10 can increase response latency during a session.`,
    bulkAddEvents: "Bulk add events",
    bulkAddEventsTitle: "Bulk add events",
    selectTags: "Select tags",
    noTagsAvailable: "No tags available",
    noTagsSelected: "No tags selected",
    filteredEventsCount: (count: number) => `${count} event${count !== 1 ? "s" : ""} will be added`,
    addSelectedEvents: "Add selected events",
    noEventsMatchTags: "No events match selected tags",
    bulkAddSuccess: (count: number) => `${count} event${count !== 1 ? "s" : ""} added successfully`,
    addSelectedEventsCount: (count: number) => `Add ${count} events`,
    unarchive: "Unarchive",
    atLeastOneLanguageMustHaveVoiceSelected: "At least one language must have a voice selected",
    unarchiveDescription:
      "Are you sure you want to unarchive this simulation? This will make it visible to active simulations.",
    voice: "Voice",
    selectVoice: "Select voice",
    removeVoiceDisableLanguage: "Remove voice (disable language)",
    voicesAutoSelected:
      "Voices were selected automatically from the persona's gender and age. Change any of them, or remove a voice to drop that language.",
    noVoiceMatchingPersonaGender:
      "No voice of the persona's gender exists for {languages} — that language is voiced against it.",
    simulationEvents: "Simulation Events",
    createNewEvent: "Create new event",
    createNewBadge: "Create New Badge",
    selectBadgeType: "Select the type of badge you want to create",
    selectEventType: "Select the type of event you want to create.",
    createEvent: "Create event",
    createBadge: "Create badge",
    editEvent: "Edit event",
    viewEvent: "View event",
    eventReadOnly:
      "This event is read-only. You can view its configuration but cannot make changes.",
    voices: "Voices",
    scenarioVoices: "Voices",
    searchVoices: "Search voices...",
    addVoice: "Add Voice",
    createVoice: "Create new voice",
    editVoice: "Edit Voice",
    voiceName: "Voice Name",
    name: "Name",
    icon: "Icon",
    category: "Category",
    orgVisibility: "Org. Visibility",
    enterVoiceName: "Enter voice name",
    provider: "Provider",
    enterProvider: "Enter provider",
    language: "Language",
    enterLanguage: "Enter language",
    model: "Model",
    enterModel: "Enter model",
    voiceCreatedSuccessfully: "Voice created successfully",
    voiceUpdatedSuccessfully: "Voice updated successfully",
    noVoicesFound: "No voices found",
    createFirstVoice: "Create your first scenario voice to get started",
    configurationCannotBeEmpty: "Configuration cannot be empty",
    configurationMustBeJsonObject:
      "Configuration must be a JSON object enclosed in curly braces {}",
    configurationMustNotBeArray: "Configuration must be a JSON object, not an array or primitive",
    invalidJsonSyntax: "Invalid JSON syntax",
    nameAndProviderRequired: "Name and provider are required",
    invalidConfigurationJson: "Invalid configuration JSON",
    nameProviderConfigRequired: "Name, provider, and valid configuration are required",
    deleteVoices: "Delete Voices",
    deleteVoicesConfirmation:
      "Are you sure you want to delete selected voices? This action cannot be undone.",
    languages: "Languages",
    scenarioLanguages: "Languages",
    searchLanguages: "Search languages...",
    addLanguage: "Add Language",
    createLanguage: "Create new language",
    editLanguage: "Edit Language",
    languageName: "Language Name",
    enterLanguageName: "Enter language name",
    languageCode: "Language Code",
    enterLanguageCode: "Enter language code",
    translationCode: "Translation Code",
    llmProviderConfig: "LLM Provider Config",
    sttProviderConfig: "STT Provider Config",
    enterTranslationCode: "Enter translation code",
    languageCreatedSuccessfully: "Language created successfully",
    languageUpdatedSuccessfully: "Language updated successfully",
    languageRequired: "Language name, code and translation code are required",
    fixConfigurationErrorsBeforeSaving: "Please fix configuration errors before saving",
    unsavedChangesWarning: "You have unsaved changes. Are you sure you want to close?",
    update: "Update",
    prompts: "System Skills",
    scenarioPrompts: "System Skills",
    searchPrompts: "Search prompts...",
    addPrompt: "Add Prompt",
    createPrompt: "Create new prompt",
    editPrompt: "Edit Prompt",
    promptName: "Prompt Name",
    enterPromptName: "Enter prompt name",
    promptCode: "Prompt Code",
    enterPromptCode: "Enter prompt code",
    promptDescription: "Description",
    enterPromptDescription: "Enter description",
    promptText: "Prompt",
    enterPrompt: "Enter prompt text",
    promptCreatedSuccessfully: "Prompt created successfully",
    promptUpdatedSuccessfully: "Prompt updated successfully",
    failedToUpdatePrompt: "Failed to update prompt",
    noPromptsFound: "No prompts found",
    createFirstPrompt: "Create your first prompt to get started",
    promptRequired: "Prompt name, description, prompt code and prompt text are required",
    useDashboardOverride: "Use dashboard version (when OFF, prompt is read from codebase folder)",
    useDashboardOverrideLabel: "Use dashboard version",
    availableVariables: "Available variables",
    usedBlocks: "Used Blocks",
    blocksHelpTitle: "What are blocks?",
    blocksHelpText:
      "Blocks are reusable prompt fragments referenced by this prompt. They are mainly used for optional or shared sections so the main prompt stays easier to read and maintain.",
    revertPromptSuccess: "Prompt restored to default successfully",
    revertPromptFailed: "Failed to restore prompt to default",
    restoreDefault: "Restore default",
    revertToDefaultConfirm:
      "Are you sure you want to restore this prompt to its codebase default? Your dashboard edits will be replaced.",
    deletePrompts: "Delete Prompts",
    deletePromptsConfirmation:
      "Are you sure you want to delete selected prompts? This action cannot be undone.",
    newSimulation: "New simulation",
    newTrack: "New track",
    createYourFirst: "Create your first",
    createYourFirstPathway: "Create your first Tracks",
    simulation: "Simulation",
    unpublish: "Unpublish",
    duplicate: "Duplicate",
    deleteEvent: "Delete event",
    unpublishDescription:
      "Are you sure you want to unpublish this simulation? This will be moved to draft state.",
    newSimulationDescription:
      "Build interactive scenarios for training, education, and practice with our intuitive creation tools.",
    newPathwayDescription: "Search and select simulations to include in this track.",
    createSimulation: "Create simulation",
    createNewSimulation: "Create new simulation",
    publish: "Publish",
    publishing: "Publishing...",
    basicInformation: "Basic Information",
    demographics: "Demographics & Background",
    narrativeContext: "Narrative Context",
    advancedSettings: "Advanced Settings",
    back: "Back",
    next: "Next",
    createdBy: "Created By",
    lastModified: "Last Modified",
    usage: "Usage",
    save: "Save",
    preview: "Preview",
    status: "Status",
    scenario: "Scenario",
    cancel: "Cancel",
    saveAndExit: "Save & Exit",
    discardChanges: "Discard Changes",
    starting: "Starting...",
    close: "Close",
    changes: "changes",
    unsaved: "Unsaved",
    discardDescription: "You have unsaved changes. What would you like to do?",
    archive: "Archive",
    archiveDescription:
      "Are you sure you want to archive this simulation? This will hide it from active simulations but you can restore it later.",
    delete: "Delete",
    deleteDescription: "Permanently delete this",
    deleteConfirmationText:
      "I understand that deleting this simulation is permanent and that I will lose all access to users and simulation analytics",
    deleteForever: "Delete forever",
    title: "Title",
    titlePlaceholder: "Enter title",
    coverImage: "Cover image",
    coverVideo: "Cover video",
    dragDrop: "Drag & drop or",
    choose: "choose",
    upload: "Upload",
    uploadFromImageLibrary: "browse image library.",
    generateWithAi: "Generate with AI",
    generatingImage: "Generating image...",
    imageGeneratedSuccessfully: "Image generated",
    imageGenerationFailed: "Failed to generate image",
    pngUploadGuidelinesOld: "a JPEG or PNG file with a",
    pngUploadGuidelines: "a JPEG or PNG file with a 16:9 aspect ratio under 2MB, or ",
    mp4UploadGuidelines: "a MP4 or MOV file with a",
    videoUploadGuidelines:
      "resolution of 16:9 aspect ratio,under 15MB, and a duration of up to 15 seconds.",
    resolutionOld: "resolution of 1920x1080 and under 2MB.",
    description: "Description",
    descriptionPlaceholder: "Enter description",
    tags: "Tags",
    learningGoal: "Learning Goal",
    agentGoal: "Agent Goal",
    currentThoughts: "Current Thoughts",
    learningGoalPlaceholder: "What is the primary learning goal?",
    agentGoalPlaceholder: "Describe the agent’s goal for this session.",
    keyLifeEvents: "Key life events",
    keyLifeEventsPlaceholder: "Describe the key life events",
    familyBackground: "Family background and relation",
    familyBackgroundPlaceholder: "Describe family background and relation",
    simulationstudio: "Simulation Studio",
    rolePlays: "Roleplays",
    editSimulation: "Edit Simulation",
    viewSimulation: "View Simulation",
    viewDetails: "View Details",
    partnerOrg: "Partner Org",
    readOnlyViewNote: "Read-only view — this simulation stays published.",
    publishTooltipMessage: "Publish becomes available after required details are filled and saved.",
    previewTooltipMessage: "Preview becomes available after required details are filled and saved.",
    generateReportTooltipMessage:
      "Complete all required fields and save your changes to generate a report.",
    generateReportTooltipMessageUnsavedChanges: "Save your changes to generate a report.",
    simulationPreview: "Simulation Preview",
    events: "Events",
    apply: "Apply",
    noResultFound: "No results found",
    adjustFilter: "Adjust your filters and try again.",
    edit: "Edit",
    editDescription:
      "Are you sure you want to edit this simulation? This will be moved to draft state.",
    startSession: "Start Session",
    autoTermination: "Auto termination",
    triggerEvent: "Trigger event",
    triggerMessage: "Termination dialogue",
    terminationMessagePlaceholder:
      "Enter the message the agent will say before ending the session...",
    triggerEventPlaceholder: "Select an event",
    createPath: "Create Track",
    editPath: "Edit Track",
    addSimulationToPath: "Add simulations to track",
    addSelected: "Add selected",
    addSimulation: "Add Simulation",
    noSimulationsAddedYet: "No simulations added yet",
    minScore: "Minimum score",
    minScoreTooltip: "Minimum score required to complete this simulation",
    addMessage: "Add Message",
    add: "Add",
    editMessage: "Edit Message",
    message: "Message",
    saveSimulation: "Simulation changes saved successfully!",
    noSimulationFound: "No simulations found",
    editPathwayDescription:
      "Are you sure you want to edit this Tracks? This will be moved to draft state.",
    eventCreatedSuccessfully: "Event created successfully",
    eventsDeletedSuccessfully: "Events deleted successfully",
    viewOnly: "View Only",
    viewOnlyTooltip: "The simulation track is currently being used.",
    viewOnlyTooltipCase: "The simulation case is currently being used.",
    create: "Create:",
    customFieldLimit: "You can only have 3 custom fields. Remove one to add another.",
    newField: "New custom field",
    triggerCondition: "Trigger conditions",
    maxTimeError(minTime: string, maxTime: string) {
      return `Maximum time must be in HH:MM:SS format between ${minTime} and ${maxTime}.`;
    },
    newRow: "New row",
    statesInstruction: "States Instruction & Dialogues",
    behavioursInstruction: "Behaviour Instructions",
    scoringRubric: "Scoring Rubric",
    ImageLibrary: "Image Library",
    imageLibrary: "Image Library",
    selectImage: "Select image",
    noImagesAvailable: "No images available",
    imageLibraryEmpty: "The image library is currently empty",
    reportGenerationInProgress: "report generation is in progress",
    reportGenerationCancelled: "report generation is cancelled",
    reportGenerationComplete: "report generation complete",
    noReportGeneration: "No report generation",
    uploadCancelConfirmation: "Your upload is not complete. Would you like to cancel the upload?",
    continueUpload: "Continue Upload",
    cancelUpload: "Cancel Upload",
    regenerate: "Regenerate",
    generate: "Generate",
    generating: "Generating...",
    regeneratedSuccessfully: "generated successfully",
    enhance: {
      trigger: "Improve",
      enhancing: "Improving...",
      modelLabel: "Model",
      customPlaceholder: "Describe how to improve, or leave blank to auto-improve…",
      customSubmit: "Apply",
      enhancedSuccessfully: "improved successfully",
    },
    generatedFillersAllCount: (n: number) => `Generated filler words for ${n} language(s)`,
    bulkGenerateNoSamples:
      "No linguistic style samples were saved. The model may have returned empty results—try again or edit manually.",
    bulkGenerateNoFillers:
      "No filler words were saved. The model may have returned empty results—try again or edit manually.",
    generatedOpeningDialoguesAllCount: (n: number) =>
      `Generated opening dialogues for ${n} language(s)`,
    bulkGenerateNoOpeningDialogues:
      "No opening dialogues were saved. The model may have returned empty results—try again or edit manually.",
    allowedFillersSectionTitle: "Allowed filler words",
    guardrails: "Guardrails",
    deleteCharacter: "Delete character",
    addStateName: "Add State Name",
    agentBuilder: {
      tabTitle: "Agent Builder Copilot",
    },
  },
  notification: {
    beforeYouGetStarted: "Before you get started",
    botDelayMessage:
      "At times, the bot may be unresponsive, or have unusual lag times. We are always working to improve the experience!",
    startSession: "Start Session",
  },
  superAdmins: {
    title: "Ally admins",
    subtitle:
      "Manage the platform's super admins — add new ones, and promote to or demote from the elevated super duper admin tier.",
    promote: "Promote",
    addSuperAdmin: "Add super admin",
    demote: "Demote",
    remove: "Remove",
    name: "Name",
    email: "Email",
    status: "Status",
    tier: "Tier",
    tierSuperAdmin: "Super admin",
    tierSuperDuperAdmin: "Super duper admin",
    addedOn: "Added on",
    addedOnTooltip:
      "When this person was granted platform admin access — not when their Ally account was created. Grants made before the single-role rollout are dated from their original super-admin grant, which for a few of the earliest admins is accurate to the day it was applied rather than the day it was decided.",
    searchPlaceholder: "Search by name or email",
    noAdminsFound: "No super admins found",
    noAdminsSubtitle: "Add a super admin to get started",
    noEligibleUsers: "No eligible users",
    noEligibleUsersSubtitle:
      "Every active user is already in the super-admin tier, or none match your search.",
    addConfirmTitle: "Add super admin?",
    addConfirmDescription: (name: string) =>
      `**${name}** will become a super admin with platform-wide administrative access. Their existing roles are kept.`,
    promoteConfirmTitle: "Promote to super duper admin?",
    promoteConfirmDescription: (name: string) =>
      `**${name}** will move from super admin to the elevated super duper admin tier, including access to this page.`,
    demoteConfirmTitle: "Demote super duper admin?",
    demoteConfirmDescription: (name: string) =>
      `**${name}** will be demoted back to super admin and lose access to super-duper-admin-only areas.`,
    removeConfirmTitle: "Remove super admin?",
    removeConfirmDescription: (name: string) =>
      `**${name}** will lose the super admin role and its platform-wide access. Their other roles are kept.`,
    addSuccess: "User added as super admin",
    addError: "Failed to add super admin",
    promoteSuccess: "User promoted to super duper admin",
    promoteError: "Failed to promote user",
    demoteSuccess: "User demoted to super admin",
    demoteError: "Failed to demote user",
    removeSuccess: "Super admin role removed",
    removeError: "Failed to remove super admin",
    loading: "Loading super admins...",
    cancel: "Cancel",
    confirm: "Confirm",
    you: "You",

    // Platform Admins list (Admin User Management) — replaces the promote/demote
    // tier list above with a single PLATFORM_ADMIN role plus per-user toggles.
    platformAdminsSubtitle:
      "Manage the platform's admins — add new ones, remove them, and configure exactly which features each one can access.",
    addPlatformAdmin: "Add platform admin",
    noPlatformAdminsFound: "No platform admins found",
    noPlatformAdminsSubtitle: "Add a platform admin to get started",
    addPlatformAdminConfirmTitle: "Add platform admin?",
    addPlatformAdminConfirmDescription: (name: string) =>
      `**${name}** will become a platform admin. Every feature toggle starts disabled — grant access from their detail page.`,
    addPlatformAdminSuccess: "User added as platform admin",
    addPlatformAdminError: "Failed to add platform admin",
    removePlatformAdminConfirmTitle: "Remove platform admin?",
    removePlatformAdminConfirmDescription: (name: string) =>
      `**${name}** will lose the platform admin role and every feature-toggle grant that came with it.`,
    removePlatformAdminSuccess: "Platform admin removed",
    removePlatformAdminError: "Failed to remove platform admin",

    // Platform admin detail view — the per-user toggle matrix + tenant allowlist.
    backToPlatformAdmins: "Back to platform admins",
    toggleDetailSubtitle: (name: string) =>
      `Feature access for ${name}. Each toggle takes effect immediately.`,
    toggleUpdateError: "Failed to update access",
    tenantAllowlistTitle: "Tenant allowlist",
    tenantAllowlistSubtitle:
      "Restrict this admin to specific organizations. No organizations listed means unrestricted — they see every tenant.",
    loadingToggles: "Loading feature access...",
  },
  userManagement: {
    organizationCreated: "Organization created successfully",
    organizationUpdated: "Organization updated successfully",
    failedUpdateOrganization: "Failed to update organization",
    addOrganization: "Add organization",
    users: "Users",
    organizations: "Organizations",
    userManagement: "User Management",
    createUserBadge: "Create new badge",
    userBadges: "User Badges",
    noBadgesFound: "No badges found",
    noBadgesSubtitle: "Create your first badge to get started",
    noSearchResults: "No badges match your search",
    noFilterResults: "No badges match your filters",
    organization: "Organization",
    description: "Description",
    createdOn: "Created on",
    noOfUsers: "No of users",
    user: "User",
    telephonyId: "Telephony ID",
    role: "Role",
    credits: "Credits",
    addedOn: "Added on",
    status: "Status",
    active: "Active",
    suspended: "Suspended",
    addUser: "Add user",
    bulkAddUsers: "Bulk add",
    bulkAddUsersTitle: "Bulk Add Users",
    bulkAddUsersSuccess: (count: number) =>
      `${count} ${count === 1 ? "user" : "users"} added successfully`,
    bulkAddUsersFailed: "Failed to add users",
    bulkAddUsersEmptyError: "Enter at least one email address",
    bulkAddUsersHint:
      "Users are created without a name — they'll be asked to complete their profile on first login.",
    search: "Search",
    addFilter: "Filter",
    view: "View",
    noOrganization: "No organization found",
    noOrganizationSubtitle:
      "There are no organizations found with selected filters or search query",
    noOrganizationActionLabel: "Add New Organization",
    noUsers: "There are no users found",
    noUsersSubtitle: "There are no users found with selected filters or search query",
    noUsersActionLabel: "Add New User",
    cancel: "Cancel",
    editDetails: "Edit Details",
    changeRole: "Change User Role",
    removeRole: (role: string) => `Remove ${role}`,
    impersonateUser: "Impersonate User",
    suspendUserConfirmation: (name: string) =>
      `Are you sure you want to suspend "**${name}**"? They won't be able to log in until reactivated.`,
    removeUserConfirmation: (name: string) =>
      `Are you sure you want to remove "${name}"? This action cannot be undone.`,
    impersonateUserConfirmation: (name: string) =>
      `Are you sure you want to impersonate "${name}"? This will open a new window where you will be logged in as this user. Make sure to log out and close the window when you're done impersonating.`,
    suspendUser: "Suspend User",
    removeUser: "Remove User",
    manageCredit: "Manage Simulation Credits",
    deleteOrganization: "Delete Organization",
    deleteOrganizationConfirmation: (name: string) =>
      `Are you sure you want to remove "${name}"? This action cannot be undone.`,
    select: "Select",
    editOrganization: "Edit Organization",
    confirm: "Confirm",
    impersonate: "Impersonate",
    selectOrg: "Select Organization",
    grantAccess: "Grant Access",
    grantAccessConfirmation: (name: string) =>
      `Are you sure you want to grant access to "**${name}**"? They will be able to log in and use the system.`,
    consumedCredits: "Consumed credits",
    newCreditLimit: "New credit limit",
    oneCreditInMin: "1 credit = 1 min",
    creditsUsage: "Credits usage",
    currentRoles: "Current roles:",
    textAreaUpperLimit: "Maximum 500 characters allowed",
    maxCharError: (count: number) => `Maximum ${count} characters allowed`,
    changeRoleErrorMessage: "At least one role must be selected",
    changeRoleUnknownRole: "One of this user's roles is no longer available — reload and try again",
    // Plain text: this renders in the modal body, not the markdown-aware
    // confirmation popup.
    allyAdminRole: "Ally admin",
    platformRolesKept: (roles: string) =>
      `${roles} is kept — change that in the Ally admins tab, where each admin's access is set. Roles picked here are added alongside it.`,
    appRoleTenantHint:
      "Consumer-app roles only show content assigned to this account's organization.",
    creditRequiredError: "Credit details are required",
    creditNotNegativeError: "Credits cannot be negative",
    creditLimitError: "Maximum credit limit is 10,000",
    code: "Code",
    simulations: "Simulations",
    path: "Tracks",
    cases: "Cases",
    courses: "Courses",
    groups: "Groups",
    // Per-row group targeting on the content tabs. "Everyone" is the honest
    // name for an item with no restriction rows — never "None" or "0 groups",
    // which would read as nobody can see it.
    cohortRestrictionEveryone: "Everyone",
    cohortRestrictionOneGroup: "1 group",
    cohortRestrictionCount: (count: number) => `${count} groups`,
    cohortRestrictionAria: (title: string) => `Change who can see ${title}`,
    cohortRestrictionTitle: (title: string) => `Who can see \u201C${title}\u201D?`,
    cohortRestrictionHint:
      "Leave every group unchecked to keep this available to everyone in this organization.",
    cohortRestrictionUnassignedHint: "(people not in any group)",
    cohortRestrictionReachAll: (total: number) =>
      `Visible to everyone \u2014 all ${total} people in this organization.`,
    cohortRestrictionReach: (reach: number, total: number) =>
      `Visible to ${reach} of ${total} people.`,
    cohortRestrictionGraceNote:
      "People who have already started this keep access until they finish. New starts are limited to the groups above.",
    cohortRestrictionCleared: (title: string) => `\u201C${title}\u201D is now visible to everyone`,
    cohortRestrictionSaved: (title: string, count: number) =>
      `\u201C${title}\u201D is now limited to ${count} ${count === 1 ? "group" : "groups"}`,
    cohortRestrictionFailed: "Failed to update access",
    peopleCount: (count: number) => `${count} ${count === 1 ? "person" : "people"}`,
    badges: "Badges",
    access: "Access",
    global: "Global",
    globalCourseHint: "Published to every organization from the course settings.",
    all: "All",
    enabled: "Enabled",
    disabled: "Disabled",
    filterByAccess: "Filter by access",
    toggleAccess: (title: string) => `Toggle access for ${title}`,
    userRemoved: "User removed successfully",
    logo: "Logo",
    logoDescription: " PNG or JPG files only (240x240 preferred)",
    uploadLogo: "Upload logo",
    changeLogo: "Change logo",
    uploadImage: "Upload image",
    changeImage: "Change image",
    scribeSettings: "Scribe settings",
    simulationSettings: "Simulation analytics",
    textHelpline: "Text helpline",
    additionalFields: "Additional fields",
    configureSimulationSettings: "Configure scribe fields",
    customFields: "Custom fields",
    customFieldsEnabled: "Enable custom fields",
    characterLibraryEnabled: "Enable Character Library",
    characterLibraryEnabledHint:
      "Lets this organisation's admins build their own characters, including with the interview agent. They see only characters their own organisation creates, and cannot edit or delete one once saved.",
    progressDashboardEnabled: "Enable Learner Progress",
    progressDashboardEnabledHint:
      "Shows learners in this organisation their XP, level, and badges on a personal Progress screen, plus a level widget elsewhere in the app. Off by default for every new organisation.",
    textChatRoleplayEnabled: "Enable text chat roleplays",
    textChatRoleplayEnabledHint:
      "Lets learners in this organisation practise a roleplay by typing instead of speaking, as on a text helpline. Only roleplays that offer text chat (set per roleplay in Simulation Studio) show the option, and voice stays available. Off by default for every organisation.",
    engagementReminderEnabled: "Enable engagement reminders",
    engagementReminderEnabledHint:
      "Sends an automated in-app + push nudge to learners in this organisation who've been inactive for a threshold number of days, on a cooldown so the same learner isn't reminded repeatedly. Off by default for every new organisation.",
    scribeNoteCreationEnabled: "Enable manual note creation",
    voiceNoteEnabled: "Enable voice note (mic dictation)",
    customFieldTypes: "Custom field types",
    singleSelectFieldType: "Single select",
    multiSelectFieldType: "Multi select",
    dateFieldType: "Date",
    textFieldType: "Text",
    numberFieldType: "Number",
    booleanFieldType: "Yes / No",
    failedToUpdateScribeSettings: "Failed to update scribe settings",
    clearAll: "Clear all",
    selectAll: "Select all",
    selectedCount: (selectedCount: number, totalCount: number) =>
      `${selectedCount} of ${totalCount} selected`,
    saving: "Saving...",
    scribeSettingsNotEnabled: "Scribe settings is not enabled",
    adminFor: "Admin for:",
    addOrganizationLabel: "+ Add Organization",
    noAssignedOrganizations: "No organizations assigned yet",
    assignOrganizationSuccess: "Organization(s) assigned successfully",
    assignOrganizationError: "Failed to assign organization(s)",
    removeOrganizationSuccess: "Organization removed successfully",
    removeOrganizationError: "Failed to remove organization",
    remove: "Remove",
    selectOrganizations: "Select organizations to assign",
    noOrganizationsToAdd: "All organizations already assigned",
  },
  eventConfiguration: {
    selectEvent: "Select an event",
    searchEvents: "Search events...",
    occurred: "Occurred",
    if: "if",
    has: "has",
    more: "+more",
    addBase: "Add Branch",
  },
  knowledgeSource: {
    label: "Knowledge Sources",
    tabs: "Tabs",
    search: "Search",
    title: "Title",
    content: "Content",
    untitled: "Untitled",
    addNewTab: "Add document",
    remove: "Remove",
    deleteContent: "Delete content",
    selectTabToViewContent: "Select a tab to view content",
    noKnowledgeSourcesAdded: "No knowledge sources added yet",
    createKnowledgeSource: "Create Knowledge Source",
    enterTitle: "Enter title",
    enterContent: "Enter content",
    titleAndContentRequired: "Please enter a title and content",
    unlocksAt: "Unlocks at",
    unlocksAtAlways: "Always (from the start)",
    lockedHint:
      "Until then the character only sees this title, as something it isn't ready to talk about. Name the topic, not the fact.",
    lockedBadge: "Locked",
    opensUpHere: "Memories that open up here:",
    locksMovedOnStateRemoval: (count: number, stateName: string) =>
      `${count} ${count === 1 ? "memory now unlocks" : "memories now unlock"} at "${stateName}"`,
    locksClearedOnLastStateRemoval: (count: number) =>
      `${count} locked ${count === 1 ? "memory is" : "memories are"} now always available — there are no states left to unlock at`,
  },
  badge: {
    badgeAddedToTenant: "Badge added to tenant successfully",
    badgeRemovedFromTenant: "Badge removed from tenant successfully",
    deleteBadgesConfirmation: "Delete these",
    deleteBadgesConfirmationDescription:
      "This will permanently delete the badges and remove them from all organizations and users who have already earned them. This action cannot be undone.",
    createBadge: "Create Badge",
    editBadge: "Edit Badge",
    newBadgeName: "New Badge",
    name: "Name",
    enterName: "Add name",
    description: "Description",
    enterDescription: "Add description",
    category: "Category",
    role: "Role",
    status: "Status",
    selectStatus: "Select status",
    visibility: "Default org-level visibility",
    selectVisibility: "Select visibility",
    roles: "Roles",
    addRole: "Add role",
    icon: "Icon",
    uploadIcon: "Upload Icon",
    changeIcon: "Change Icon",
    iconUploadHint: "PNG or JPG files only (240x240 preferred)",
    iconMustBeImageFile: "Icon must be a PNG or JPG file",
    iconFileTooLarge: "Icon file must be less than 2MB",
    iconMustBeSquare: "Please upload an icon with 1:1 aspect ratio",
    iconUploadFailed: "Failed to upload icon",
    uploading: "Uploading...",
    cannotChangeAfterPublishing: "Cannot be changed after publishing",
    nameRequired: "Badge name is required",
    badgeAlreadyPublished: "Badge is already published",
    badgeIconDeletedSuccessfully: "Badge icon deleted successfully",
    noChangesToSave: "No changes to save",
    unsavedChanges: "Unsaved Changes",
    unsavedChangesDescription: "You have unsaved changes. Are you sure you want to close?",
    closeAnyway: "Close Anyway",
    keepEditing: "Keep Editing",
    badgeCreatedSuccessfully: "Badge created successfully",
    badgeUpdatedSuccessfully: "Badge updated successfully",
    badgeSavedAsDraft: "Badge saved as draft",
    badgePublishedSuccessfully: "Badge published successfully",
    badgeCreationFailed: "Failed to create badge",
    badgeUpdateFailed: "Failed to update badge",
    deleteBadge: "Delete",
    deleteBadgeConfirmation: "Delete this",
    deleteBadgeConfirmationTitleItalic: " Badge?",
    deleteBadgesConfirmationTitleItalic: " Badges?",
    deleteBadgeConfirmationDescription:
      "This will permanently delete the badge and remove it from all organizations and users who have already earned it. This action cannot be undone.",
    badgeDeletedSuccessfully: "Badge deleted successfully",
    badgesDeletedSuccessfully: "Badges deleted successfully",
    saveAsDraft: "Save as draft",
    publish: "Publish",
    badgeDeletionFailed: "Failed to delete badge",
    publishBadgeConfirmation: "Publish this",
    publishBadgeConfirmationTitleItalic: " Badge?",
    publishBadgeConfirmationDescription:
      "Are you sure you want to publish this badge? Once published, this badge will be awarded to users who meet the defined criteria. ",
  },
  /**
   * Corpus retrieval quality (Analytics -> Retrieval quality).
   *
   * Copy written for a curator or an engineer deciding what to DO: whether to upload material,
   * lower a threshold, or change how retrieval ranks. Every label names the action or the
   * evidence, never the mechanism.
   */
  ragQuality: {
    tab: "Retrieval quality",
    failed: "Couldn't load retrieval quality",
    consumer: "Asked by",
    allConsumers: "Everything",
    interviewAgent: "Interview agent",
    whatsappBot: "WhatsApp bot",
    queryWithheld: "Question withheld — asked by a health worker",
    adminPreview: "Admin preview",
    corpus: "Corpus",
    allCorpora: "Both",
    characterLibrary: "Character library",
    whatsappQa: "WhatsApp Q&A",
    referenceDocuments: "Reference documents",
    roadmapOpportunities: "Roadmap duplicates",
    referenceSearch: "Document search",
    roadmapMatcher: "Roadmap matching",
    notJudged:
      "This surface is logged but not judged: its passage text lives in the AI service rather than in this database, so there are no relevance labels. The score distribution and the volume are real; the floor table below will be empty.",
    retrievalsJudged: "Retrievals judged",
    passagesLabelled: "Passages labelled",
    answered: "Answered the question",
    nothingUseful: "Found nothing useful",
    superficial: "Superficial matches",
    superficialHelp:
      "A superficial match scored well on shared wording while answering something else. That is a fact about the embedding, not about the corpus — it argues for changing how retrieval ranks rather than for uploading more material.",
    smallSample:
      "Too few judged retrievals for a percentage to mean anything yet, so only counts are shown. The judge labels new retrievals every 30 minutes.",
    mixedJudges:
      "This window contains judgments from more than one judge model or rubric version. Figures are scoped to the pinned pair; the rest are excluded rather than mixed in.",
    floorTitle: "What each similarity floor would cost",
    floorHelp:
      "The floor decides which passages reach the agent at all. This is what each candidate would have kept and discarded over the judged passages in this window.",
    floorCaveat:
      "Every passage here already cleared the floor in force when it was retrieved, so this measures precision and estimates what a HIGHER floor would have lost. What a lower floor would have found is not recorded — re-run the query in the corpus panel's retrieval preview to see that.",
    floor: "Floor",
    kept: "Kept",
    relevant: "Relevant",
    tangential: "Tangential",
    irrelevant: "Irrelevant",
    precision: "Relevant share",
    relevantLost: "Relevant lost",
    currentFloor: "in use",
    consumerTitle: "Who asked, and what they got",
    retrievals: "Retrievals",
    judged: "Judged",
    returnedNothing: "Returned nothing",
    gapsTitle: "What the corpus was missing",
    gapsHelp:
      "Retrievals the judge called partial or useless, with what it says it needed. This is the only place a corpus gap gets a name — an empty result on its own cannot tell you whether the material is absent or the floor was too tight.",
    noGaps: "Every judged retrieval in this window answered its question.",
    nothingJudged:
      "Nothing judged in this window yet. The judge runs every 30 minutes over retrievals that have happened.",
    returned: "returned",
    atFloor: "at floor",
    missingPrefix: "Judge wanted:",
  },

  characterCorpus: {
    trigger: "Reference corpus",
    title: "Reference corpus",
    subtitle:
      "Craft guidance on building believable people, plus lived-experience and observational material. This is what the interview agent reaches for so its questions are specific and its drafts are real rather than plausible \u2014 clinical guidelines and protocols belong in the WhatsApp bot's corpus, not here.",
    empty: "Nothing here yet",
    emptyBody:
      "Add a case account, a first-person piece, notes on how people in a particular situation actually talk, or distilled craft principles for writing characters — anything the agent should know that an admin shouldn't have to type.",
    add: "Add material",
    topics: "Grounds",
    topicsHelp:
      "Which parts of a character this helps with. A hint that ranks it higher for those, never a restriction — leave it blank if you're not sure.",
    topicsNone: "No hint",
    saveTopics: "Save",
    topicsSaved: "Saved",
    topicsFailed: "Couldn't save that",
    preview: "Try a search",
    previewHelp:
      "Ask what the agent would ask, and see what comes back with its match score. Scores below the floor are never returned.",
    previewPlaceholder: "e.g. how does early-stage dementia change how someone speaks?",
    previewRun: "Search",
    previewEmpty:
      "Nothing matched at this floor — the agent would be told so, and would not invent a source.",
    // Three states, three sentences. "Nothing matched" is only the truthful one when there is
    // something to match against; the other two name what to do instead of implying a
    // threshold problem.
    previewNothingIndexed:
      "No passages are indexed yet, so a search cannot match anything. Add material, or wait for indexing to finish.",
    previewIndexFailed:
      "Indexing failed, so there are no passages to search. Check the failed document above and re-upload it.",
    previewEmptyTryFloor:
      "Nothing matched at the default floor. Similarity search is brittle across phrasing, so try a lower floor before concluding the corpus is missing this — the agent also retries at a different angle.",
    floor: "Match floor",
    archive: "Archive",
    unarchive: "Restore",
    archived: "Archived",
    archiveFailed: "Couldn't archive that",
    archiveHelp:
      "Archiving deletes the passages so the agent stops using this, and keeps the document here so any citation already recorded still resolves. It is reversible.",
    previewFailed: "The search failed",
    score: "match",
    indexed: "Indexed",
    inProgress: "In progress",
    failed: "Failed",
    passages: "Passages",
  },

  characterInterview: {
    title: "Character interview",
    subtitle: "Answer a few questions and the agent will draft a rich, consistent character.",
    // The interview's wording where it differs from the shared `agentChat` copy; Send, Stop,
    // Confirm and "None of these" are the shared words.
    chat: {
      placeholder: "Type your answer, or add anything else…",
      interrupted: "(interrupted)",
      thinking: "Thinking…",
    },
    question: {
      submitAnswer: "Submit answer",
      freeTextPlaceholder: "Type your answer…",
      addCustom: "Add your own",
      addCustomPlaceholder: "Add your own…",
      selectPlaceholder: "Select…",
      minSelectionsHint: (n: number) => `Select at least ${n}`,
    },
    startFailed: "Couldn't start the interview",
    resumeFailed: "Couldn't resume the interview",
    streamFailed: "The interview stream failed — please try again",
    // Says what happened to the answer, not just to wait: the turn was never
    // received, so it has to be sent again once the one in flight lands.
    turnInProgress:
      "The previous answer is still being worked on, so this one wasn't sent. Give it a moment and answer again.",
    emptyTitle: "Starting the interview…",
    emptySubtitle: "The agent will ask its first question in a moment.",
    toolLookingUpVoices: "Looking up available voices…",
    toolBuildingProfile: "Putting the character profile together…",
    exitConfirmTitle: "Leave the interview?",
    exitConfirmDescription: "Your progress in this conversation will be lost.",
    exitConfirmLeave: "Leave",
    exitConfirmStay: "Stay",
    draftReadyToast: "Character draft ready — review it before saving",
    startOver: "Start over",
    reviewCharacter: "Review character",
  },
  tooltip: {
    scenarioTooltips: "Tooltips",
    createTooltip: "Create Tooltip",
    editTooltip: "Edit Tooltip",
    searchTooltips: "Search tooltips...",
    tipText: "Tip Text",
    status: "Status",
    locationRequired: "Location and tip text are required",
    tipTextTooLong: "Tip text must be 200 characters or less",
    unsavedChangesWarning: "You have unsaved changes. Are you sure you want to close?",
    tooltipCreated: "Tooltip created successfully",
    tooltipUpdated: "Tooltip updated successfully",
    locationAlreadyExists: "A tooltip for this location already exists",
  },
  settings: {
    title: "Settings",
    // Every tab here is platform-wide, not per-tenant — the page-level line says
    // so once, so no individual tab has to repeat the warning.
    subtitle: "Platform-wide configuration. Changes apply to every organisation.",
    tabs: {
      legal: "Legal",
      comfortAudio: "Comfort Audio",
      turnDetection: "Turn Detection",
      aiModels: "AI Models",
      roadmap: "Roadmap",
    },
    roadmapDescription:
      "The cards on the public product roadmap at app.helloally.ai/blog/roadmap. A change is live as soon as you save it — hide a card to keep it off the page while you prepare it. The headline, the two categories and the five stages are fixed in code.",
    roadmap: {
      addCard: "Add card",
      viewPublicPage: "View public page",
      loadFailed: "Couldn't load the roadmap. Refresh to try again.",
      emptyStage: "No cards",
      addToStage: "Add a card to {category}, {stage}",
      hidden: "Hidden",
      live: "Live",
      show: "Show",
      hide: "Hide",
      showLabel: "Show “{title}” on the public page",
      hideLabel: "Hide “{title}” from the public page",
      moveUp: "Move “{title}” up",
      moveDown: "Move “{title}” down",
      edit: "Edit “{title}”",
      delete: "Delete “{title}”",
      addPanelTitle: "Add roadmap card",
      editPanelTitle: "Edit roadmap card",
      titleLabel: "Title",
      descriptionLabel: "Description",
      descriptionHelp: "Two or three short lines, shown under the title.",
      noteLabel: "Note",
      noteHelp:
        "Optional. One short line under the description, such as “Current priority” or “Pilot in 3 months”.",
      categoryLabel: "Category",
      stageLabel: "Stage",
      placementHelp:
        "A card moved to another category or stage goes to the bottom of it. Use the arrows on the list to reorder.",
      visibleLabel: "Show on the public page",
      visibleHelp: "Off keeps the card here, but nobody outside the team sees it.",
      titleRequired: "Add a title.",
      descriptionRequired: "Add a description.",
      savedLive: "Saved. It's live on the public roadmap.",
      savedHidden: "Saved. It's hidden from the public roadmap.",
      saveFailed: "Couldn't save the card. Try again.",
      deleteTitle: "Delete this card?",
      deleteDescription:
        "“{title}” comes off the public roadmap straight away. This can't be undone — to take it down for now, hide it instead.",
      deleteHiddenDescription:
        "“{title}” is hidden, so the public roadmap won't change, but the card is gone for good.",
      deleteConfirm: "Delete card",
      deleted: "Card deleted.",
      deleteFailed: "Couldn't delete the card. Try again.",
      moveFailed: "Couldn't move the card. Try again.",
      visibilityFailed: "Couldn't change whether the card is shown. Try again.",
      categories: { prepare: "Prepare", perform: "Perform" },
      stages: { idea: "Idea", lab: "Lab", beta: "Beta", released: "Released", stable: "Stable" },
    },
    aiModelsDescription:
      "Which models Bug Hunter and Builder run on. Each section reads and writes its own feature's backend — this tab only brings the two together.",
    aiModels: {
      bugHunterHeading: "Bug Hunter",
      bugHunterLoadFailed: "Couldn't load Bug Hunter's model settings.",
      bugHunterSaveFailed: "Couldn't save Bug Hunter's model settings.",
      bugHunterEngineLabel: "Engine",
      bugHunterEngineHelp:
        "Which CLI the sweep and fix session run on. Claude Code is battle-tested and supports escalation. Gemini CLI is wired in but has no equivalent to the escalation subagent, so a Gemini run skips escalation entirely — switching engine clears the default model, since a model id from one engine means nothing to the other.",
      defaultModelLabel: "Default model",
      defaultModelHelp:
        "Runs the sweep and fix session end to end. Takes effect on the next run, not this one.",
      escalationModelLabel: "Escalation model",
      escalationModelHelp:
        "Handed to the escalation subagent for one finding that resists a straightforward fix — a root cause spanning several files, a guarded-path change, or a retry after a non-obvious failure. Not used anywhere else.",
      escalationModelDisabledHelp:
        "Gemini CLI has no equivalent to the escalation subagent this depends on, so a Gemini-engine run skips escalation rather than pretending to honor this field.",
      escalationModelDisabledOption: "Not available on Gemini",
      builderHeading: "Builder",
      builderLoadFailed: "Couldn't load Builder's model settings.",
      builderSaveFailed: "Couldn't save Builder's model settings.",
      saved: "Saved.",
      save: "Save",
      decisionOwnersHeading: "Who decides each move",
      decisionOwnersHelp:
        "Bug Hunter's orchestrator makes eight kinds of decision (OPP-0783). Each has an owner, the rule or the model, and the other answers as a shadow so the replay can compare them. Hand a point to the other owner here when the replay on Analytics → Bug Agent says it should flip. The Verifier vendor and the merge gate are fixed in code.",
      decisionOwnersLoadFailed: "Couldn't load who owns each decision.",
      decisionOwnersSaveFailed: "Couldn't change the owner.",
      decisionOwnerDefault: "Default ({owner})",
      decisionOwnerRule: "The rule",
      decisionOwnerModel: "The model",
      decisionOwnerFixed: "Fixed in code",
      decisionOwnerSaved: "{point} now decided by {owner}.",
    },
    legalDescription:
      "Edit the content shown on the public Terms of Service and Privacy Policy pages.",
    termsTitle: "Terms of Service",
    privacyTitle: "Privacy Policy",
    legalPlaceholder: (title: string) => `Write the ${title} content...`,
    termsSaved: "Terms of Service updated",
    termsSaveFailed: "Failed to update Terms of Service",
    privacySaved: "Privacy Policy updated",
    privacySaveFailed: "Failed to update Privacy Policy",
    turnDetectionTitle: "Turn Detection Timing",
    turnDetectionDescription:
      "How long a Studio v1 roleplay agent waits before replying. Applies to every roleplay session platform-wide — there is no per-simulation override.",
    turnDetectionMinLabel: "Minimum reply delay (seconds)",
    turnDetectionMinHelp:
      "How fast the agent may reply once it’s confident the learner has finished. Lower = snappier, more risk of cutting the learner off.",
    turnDetectionMaxLabel: "Maximum reply delay (seconds)",
    turnDetectionMaxHelp:
      "How long the agent waits for a learner who seems mid-thought before replying anyway. Higher = fewer interruptions, more perceived dead air.",
    turnDetectionPairError: "Maximum delay must be greater than the minimum delay.",
    turnDetectionSaved: "Turn detection timing updated",
    turnDetectionSaveFailed: "Failed to update turn detection timing",
    save: "Save",
    saving: "Saving...",
  },
  comfortAudio: {
    title: "Comfort Audio",
    description:
      "Upload ambient audio tracks that scenario authors can play as comfort audio under a roleplay so the line never sounds dead between turns.",
    uploadNamePlaceholder: "Track name",
    chooseFile: "Choose audio file",
    upload: "Upload",
    uploading: "Uploading...",
    nameRequired: "Enter a name for the track",
    fileRequired: "Choose an audio file to upload",
    invalidFileType: "File must be an MP3, WAV, or M4A audio file",
    fileTooLarge: "Audio file must be under 20 MB",
    uploadSuccess: "Comfort audio track uploaded",
    uploadFailed: "Failed to upload comfort audio track",
    deleteSuccess: "Comfort audio track deleted",
    deleteFailed: "Failed to delete comfort audio track",
    empty: "No comfort audio tracks uploaded yet",
    listError: "Failed to load comfort audio tracks",
    // Manage existing tracks (Settings)
    rename: "Rename",
    renamePlaceholder: "Track name",
    save: "Save",
    cancel: "Cancel",
    renameSuccess: "Comfort audio track renamed",
    renameFailed: "Failed to rename comfort audio track",
    archive: "Archive",
    unarchive: "Unarchive",
    archivedBadge: "Archived",
    archivedHelp:
      "Archived tracks can't be selected for new roleplays but keep playing for roleplays already using them.",
    archiveSuccess: "Comfort audio track archived",
    archiveFailed: "Failed to archive comfort audio track",
    unarchiveSuccess: "Comfort audio track unarchived",
    unarchiveFailed: "Failed to unarchive comfort audio track",
    archivedOptionSuffix: " (archived)",
    // Basic Settings picker
    trackLabel: "Comfort Audio Track",
    trackPlaceholder: "Select a track (default room tone if unset)",
    volumeLabel: "Comfort Audio Volume",
    volumeHelp: "How loud the comfort audio plays under the conversation (0 = silent, 1 = full).",
    preview: "Preview",
    stop: "Stop",
    loadingTracks: "Loading tracks...",
    noTracks: "No tracks available — a superadmin can upload them in Settings.",
  },
  whatsappBot: {
    navLabel: "WhatsApp Bot",
    title: "WhatsApp Q&A Bot",
    subtitle:
      "Answers mental healthcare workers' questions from the knowledge corpus, with sources.",
    tabs: {
      corpus: "Knowledge Corpus",
      templates: "Keyword Replies",
      settings: "Settings",
      testConsole: "Test Console",
      conversations: "Conversations",
      unanswered: "Unanswered",
      usage: "Usage",
    },
    templates: {
      heading: "Keyword Replies",
      subtitle:
        "Fixed replies that fire before the bot searches the corpus. They are evaluated in the order shown, and the first match wins.",
      create: "Add reply",
      edit: "Edit reply",
      columnName: "Reply",
      columnKind: "Kind",
      columnPatterns: "Triggers",
      columnOrder: "Order",
      kind: {
        crisis: "Crisis",
        command: "Command",
        consent: "Consent",
        faq: "FAQ",
      },
      matchType: {
        exact: "Whole message",
        contains: "Contains",
        any_of: "Any word",
        regex: "Regex",
      },
      matchTypeHelp:
        'Any word matches whole words only — the safe default for short risk words, because a substring match on "rapist" would fire on "therapist".',
      requiredBadge: "REQUIRED",
      requiredHelp:
        "This is a required safety reply. You can change its wording, but it cannot be switched off or removed.",
      cannotDeactivate: "Required safety replies cannot be switched off.",
      crisisWarning:
        "A crisis reply is sent as-is and stops everything else — the bot will not search the corpus or call a model for a matching message.",
      nameLabel: "Name",
      kindLabel: "Kind",
      matchTypeLabel: "Match",
      patternsLabel: "Triggers",
      patternsPlaceholder: "Type a word or phrase and press Enter",
      patternsHelp: "Case and punctuation are ignored.",
      regexPlaceholder: "^phq\\s?9",
      replyLabel: "Reply",
      replyPlaceholder: "What the worker receives",
      replyHelp: "Use {helpline_numbers} to insert the numbers from Settings.",
      priorityLabel: "Order",
      priorityHelp: "Lower runs first. Crisis 0-99, consent 100-199, commands 200-299, FAQs 300+.",
      activeLabel: "Active",
      terminalLabel: "Stop after this reply",
      terminalHelp: "Nothing else runs, including the corpus search.",
      moveUp: "Move earlier",
      moveDown: "Move later",
      empty: "No keyword replies yet",
      emptySubtitle: "Add one, or rely on the corpus for everything.",
      created: "Reply added",
      updated: "Reply updated",
      archived: "Reply removed",
      saveFailed: "Could not save the reply",
      validationName: "A name is required",
      validationPatterns: "Add at least one trigger",
      validationReply: "A reply is required",
      tester: "Test a message",
      testerPlaceholder: "Type a message a worker might send",
      testerRun: "Check",
      testerNoMatch: "No keyword reply matches — this would go to the corpus.",
      testerMatched: "Matches",
      testerReply: "Would reply",
      testerNormalised: "Compared as",
      testerStops: "Stops here — the corpus is not searched.",
      testerReachesCorpus: "Then searches the corpus.",
    },
    settings: {
      heading: "Settings",
      subtitle: "Everything here takes effect on the next message. No deploy needed.",
      save: "Save settings",
      saved: "Settings saved",
      saveFailed: "Could not save settings",
      enabledLabel: "Bot enabled",
      enabledHelp:
        "When off, incoming messages are still recorded but nobody gets a reply — so you can see what people asked during an outage.",
      providerSection: "Connection",
      providerHealthy: "Configured",
      providerMissing: "Not set",
      verifyToken: "Verify token",
      appSecret: "App secret",
      phoneNumberId: "Phone number ID",
      accessToken: "Access token",
      inboundQueue: "Inbound queue",
      inboundDlq: "Inbound dead-letter queue",
      businessAccountId: "WhatsApp Business Account ID",
      kbIngestQueue: "Document upload queue",
      providerHelp:
        "Set in the environment, not here. This only shows whether each value is present.",
      webhookUrlLabel: "Webhook URL",
      webhookUrlHelp:
        "Paste this into Meta: your app → WhatsApp → Configuration → Callback URL. Use the verify token from the environment.",
      copy: "Copy",
      copied: "Copied",
      copyFailed: "Could not copy — select the text and copy it by hand",
      configSubheading: "Environment values",
      checkHeading: "Live check with Meta",
      checkHelp:
        "Asks Meta whether the token and phone number actually work. Nothing is changed or sent.",
      checkButton: "Check connection",
      checking: "Checking…",
      checkFailed: "Could not reach the server to run the check",
      checkOk: "Meta accepted the credentials",
      checkNotOk: "Meta did not accept the connection",
      numberLabel: "Number",
      verifiedNameLabel: "Display name",
      nameStatusLabel: "Display name review",
      qualityLabel: "Quality rating",
      registrationLabel: "Registered for the API",
      registrationDone: "Yes",
      registrationNeeded: "No — register it below",
      registrationUnknown: "Unknown",
      numberStatusLabel: "Number status",
      subscriptionLabel: "Receives messages (webhook subscription)",
      subscriptionUnchecked: "Not checked — set the WhatsApp Business Account ID to check",
      subscriptionNone: "Not subscribed — Meta will not deliver any messages",
      subscriptionYes: "Subscribed",
      subscribeButton: "Subscribe to messages",
      subscribing: "Subscribing…",
      subscribed: "Subscribed — Meta will now deliver messages",
      subscribeFailed: "Meta refused the subscription",
      registerHeading: "Register the number",
      registerHelp:
        "Meta needs this once before a number can send. Choose a 6-digit PIN — it becomes the number's two-step verification PIN, so write it down somewhere safe.",
      pinLabel: "6-digit PIN",
      pinInvalid: "The PIN must be exactly six digits",
      registerButton: "Register number",
      registering: "Registering…",
      registered: "Number registered",
      registerFailed: "Meta refused the registration",
      readinessHeading: "Before switching the bot on",
      readinessHelp:
        "Each of these leaves the bot running but unable to help anyone, so check them first.",
      readinessHelpline: "Helpline number set (used in every crisis reply)",
      readinessMappedNumbers: "Phone numbers mapped to organisations",
      readinessMappedHelp:
        "Numbers not mapped to an organisation are refused. Map them under User Management → WhatsApp Numbers.",
      readinessDocuments: "Documents ready in the corpus",
      readinessDocumentsHelp: "With no ready documents, every question is declined.",
      readinessYes: "Yes",
      readinessNo: "Not yet",
      messagesSection: "Messages",
      disclaimerLabel: "First-contact disclaimer",
      disclaimerHelp: "Shown once, added on top of the answer to their first question.",
      crisisLabel: "Crisis reply",
      declineLabel: "When the corpus has no answer",
      fallbackLabel: "When something goes wrong",
      unsupportedMediaLabel: "When a photo or voice note arrives",
      unrecognisedNumberLabel: "When the number is not on any Ally profile",
      unrecognisedNumberHelp:
        "Documents are targeted at organisations, so the bot cannot answer a number it does not recognise. Say how to fix it — the number goes on the person's Ally profile.",
      rateLimitLabel: "When someone sends too many messages",
      helplineNumbersLabel: "Helpline numbers",
      helplineNumbersHelp: "Inserted wherever a reply uses {helpline_numbers}.",
      limitsSection: "Rate limits",
      perMinute: "Per minute",
      perHour: "Per hour",
      perDay: "Per day",
      limitsHelp: "Per phone number. Set 0 to disable a window.",
      retrievalSection: "Retrieval",
      topK: "Passages retrieved",
      minSimilarity: "Retrieval floor",
      minSimilarityHelp: "How similar a passage must be to be considered at all.",
      declineSimilarity: "Answer threshold",
      declineSimilarityHelp:
        "Below this the bot says it does not have an answer, without calling a model. Deliberately higher than the floor: a relevant passage against a rephrased question scores around 0.40-0.60, so one shared number would decline far too often.",
      maxPassages: "Passages used in an answer",
      translateQuery: "Translate before searching",
      translateQueryHelp:
        "Non-English questions are restated in English before the corpus is searched. Leave this on — without it, Hindi and Tamil questions retrieve badly and the answer is built on the wrong passages.",
      replySection: "Reply length",
      maxAnswerChars: "Answer characters",
      maxReplyChars: "Whole message limit",
      maxReplyCharsHelp: "1600 is the safe limit across WhatsApp providers.",
      maxCitations: "Sources shown",
      conversationIdle: "Conversation timeout (minutes)",
      conversationIdleHelp: "Silence for this long starts a new thread.",
      retentionDays: "Keep message content for (days)",
      retentionDaysHelp:
        "After this, message text and phone numbers are blanked. Counts are kept, so the usage figures do not change. Set 0 to keep everything indefinitely.",
      retentionOffWarning:
        "Retention is off. Workers' questions and phone numbers will be kept indefinitely.",
      crisisClassifier: "Also check every message with the crisis classifier",
      crisisClassifierHelp:
        "Keyword rules catch messages that say it outright. This catches the ones that do not — \u201cI can\u2019t keep doing this\u201d has no keyword in it. Runs alongside the answer, so it adds no waiting; it costs one small model call per question.",
      crisisClassifierOffWarning:
        "Only the keyword rules are active. Indirectly worded messages about a crisis will be answered as ordinary questions.",
      promptsNote:
        "The bot's prompt and its answering model are edited in Manage Prompts — look for the two prompts starting ally_ai_knowledge.",
    },
    conversations: {
      heading: "Conversations",
      subtitle:
        "What workers asked and what the bot replied. Phone numbers are hidden — reveal one only when you need to act on it.",
      searchPlaceholder: "Search message text",
      columnContact: "Contact",
      columnLast: "Last message",
      columnMessages: "Messages",
      columnLanguage: "Language",
      declinedOnly: "Only threads with an unanswered question",
      reveal: "Reveal number",
      revealed: "Number revealed — this was logged",
      revealFailed: "Could not reveal the number",
      block: "Block",
      unblock: "Unblock",
      blocked: "Blocked",
      blockedBadge: "BLOCKED",
      blockConfirmTitle: "Block this number?",
      blockConfirmDescription:
        "Messages from this number will be dropped without a reply. They are not told they have been blocked.",
      empty: "No conversations yet",
      emptySubtitle:
        "Once the bot is enabled and someone messages the number, threads appear here.",
      emptyFiltered: "No conversations match those filters",
      emptyFilteredSubtitle: "Try a wider date range or clear the filters.",
      loadError: "Could not load conversations.",
      threadHeading: "Thread",
      numberEnding: "Phone number ending",
      dateFrom: "From",
      dateTo: "To",
      languageFilter: "Language",
      anyLanguage: "Any language",
      outcomeFilter: "Outcome",
      anyOutcome: "Any outcome",
      clearFilters: "Clear filters",
      worker: "Worker",
      bot: "Bot",
      handledBy: {
        template: "Keyword reply",
        crisis: "Crisis reply",
        consent: "Consent",
        rag: "Answered from corpus",
        declined: "No answer in corpus",
        clarified: "Asked for clarification",
        rate_limited: "Rate limited",
        unsupported_media: "Unreadable message",
        unidentified: "Number not recognised",
        error: "Error",
      },
      organisation: "Organisation",
      organisationUnknown: "Not recognised",
      organisationUnknownHelp:
        "This number is not on any Ally profile, so the bot could not tell which organisation's documents to answer from. Adding it to the person's profile fixes it for their next message.",
      sources: "Sources",
      retrieval: "Retrieval",
      modelUsed: "Model",
      viewPassage: "View passage",
      passageHeading: "Quoted passage",
      passageFailed: "That passage could not be loaded — the document may have been deleted.",
      close: "Close",
    },
    unanswered: {
      heading: "Unanswered Questions",
      subtitle:
        "Questions the corpus could not answer. Each one is a gap worth filling — or a question worth declining on purpose.",
      columnQuestion: "Question",
      columnReason: "Why",
      columnScore: "Best match",
      columnAsked: "Asked",
      reason: {
        no_hits: "Nothing found",
        below_threshold: "Below the threshold",
        model_declined: "Passages were not enough",
        error: "Something failed",
      },
      reasonHelp:
        '"Below the threshold" in bulk means the answer threshold is too high. "Passages were not enough" in bulk means retrieval is finding the wrong passages.',
      status: {
        open: "Open",
        triaged: "Triaged",
        answered: "Answered",
        dismissed: "Dismissed",
      },
      markTriaged: "Mark triaged",
      markAnswered: "Mark answered",
      dismiss: "Dismiss",
      updated: "Updated",
      updateFailed: "Could not update",
      empty: "Nothing unanswered",
      emptySubtitle: "Either the corpus is covering what people ask, or the bot has not run yet.",
      loadError: "Could not load the queue.",
      statusFilter: "Status",
      anyReason: "Any reason",
      clearFilters: "Clear filters",
      viewThread: "See the conversation this came from",
      answerHeading: "Answer this question",
      answerIntro:
        "Write the answer as a corpus document. The next worker to ask something like this gets it back with a citation.",
      answerQuestionLabel: "The question",
      answerTitleLabel: "Document title",
      answerTitlePlaceholder: "What this material covers",
      answerTextLabel: "Answer text",
      answerTextPlaceholder:
        "Write the guidance itself, not a reply to this one worker — it will be retrieved for other questions too.",
      answerTitleRequired: "Give the document a title",
      answerTextRequired: "Write the answer before saving",
      answerSaved: "Document created — it will be searchable once indexing finishes",
      answerFailed: "Could not create the document",
      answerSave: "Create document",
    },
    usage: {
      heading: "Usage",
      subtitle: "How the bot is being used, and whether it is answering.",
      rangeLabel: "Period",
      range30: "30 days",
      range90: "90 days",
      range7: "7 days",
      declineRateHelp:
        'Share of questions that reached the corpus and got no answer. Greetings and keyword replies are excluded, so a quiet week of "hi" does not read as a corpus failure.',
      latencyHelp: "How long a worker waits for a reply.",
      inboundHelp: "Messages received, including greetings and commands.",
      contactsHelp: "Distinct phone numbers that messaged in this period.",
      loadError: "Could not load usage figures.",
      inbound: "Questions received",
      uniqueContacts: "People",
      answered: "Answered",
      declined: "No answer",
      declineRate: "Decline rate",
      crisis: "Crisis replies",
      unidentified: "Number not recognised",
      errors: "Errors",
      latency: "Reply time (p50 / p95)",
      outcomesHeading: "Outcomes",
      outcomesHelp:
        "Every reply the bot sent, by what handled it. A rising orange band is the corpus falling behind the questions being asked.",
      languagesHeading: "By language",
      languagesHelp:
        "A decline rate much higher for one language than for English means retrieval is failing for it before an answer is written — check that translate-before-searching is on.",
      languageColumn: "Language",
      languageTotal: "Questions",
      languageDeclineRate: "Decline rate",
      insufficientSample: "too few",
      coverageHeading: "Corpus coverage",
      coverageHelp:
        "Documents never cited are either badly chunked, badly titled for retrieval, or about something nobody asks.",
      coverageDocument: "Document",
      coverageCitations: "Citations",
      neverCited: "never cited",
      passages: "passages",
      archivedBadge: "archived",
      coverageTruncated:
        "This list covers the first {shown} of {total} documents. Documents beyond that are not shown, so the never-cited list below is incomplete.",
      empty: "No activity in this period",
    },
    testConsole: {
      heading: "Test Console",
      subtitle:
        "Ask a question and see exactly what a worker would receive. Nothing is sent and nothing is recorded.",
      questionLabel: "Question",
      questionPlaceholder: "Ask something the corpus should cover",
      ask: "Ask",
      asking: "Asking…",
      failed: "The question could not be answered — check that ally-ai is reachable.",
      replyHeading: "What the worker would receive",
      intentAnswer: "Answered",
      intentDecline: "No answer in the corpus",
      intentClarify: "Asked for clarification",
      charCount: "characters",
      overLimit: "Over the message limit",
      sourcesHeading: "Sources",
      retrievalHeading: "Retrieval",
      hitCount: "Passages found",
      topSimilarity: "Best match",
      passagesUsed: "Passages used",
      language: "Language",
      translatedQuery: "Searched as",
      notTranslated: "Searched as written",
      unsupportedWarning:
        "The model answered without citing a passage. That happens legitimately when it combines several, but a lot of these means the grounding instruction is slipping.",
      modelHeading: "Model",
      latency: "Took",
      declineReason: "Reason",
      empty: "Ask a question to see the reply, its sources and the retrieval scores.",
    },
    phoneMappings: {
      tabLabel: "WhatsApp Numbers",
      heading: "WhatsApp Numbers",
      subtitle:
        "Which organisation a phone number belongs to. The bot answers a worker only from their own organisation's documents, so a number it cannot place gets no answer at all.",
      searchPlaceholder: "Search a number or a name",
      add: "Add number",
      edit: "Edit number",
      bulkAdd: "Upload numbers",
      columnPhone: "Number",
      columnOrganisation: "Organisation",
      columnLabel: "Who",
      columnAdded: "Added",
      remove: "Remove",
      removeConfirmTitle: "Remove this number?",
      removeConfirmDescription:
        "The bot will stop recognising it, unless the number is also on someone's Ally profile. You can add it again at any time.",
      removed: "Number removed",
      created: "Number added",
      updated: "Number updated",
      saveFailed: "Could not save that number",
      phoneLabel: "Phone number",
      phonePlaceholder: "+91 98765 43210",
      phoneHelp:
        "Any format. Matched on the last 10 digits, so spaces, dashes and the country code make no difference.",
      organisationLabel: "Organisation",
      organisationHelp: "Whose documents this number can be answered from.",
      whoLabel: "Who is this?",
      whoPlaceholder: "e.g. Priya, night shift, Ward 4",
      whoHelp:
        "Optional, and the only thing that makes this list readable later. Whoever removes a number in six months will not be whoever added it.",
      validationPhone: "A phone number is required",
      validationOrganisation: "Pick an organisation",
      conflictWarning: (organisation: string) =>
        `This number is on an Ally profile in ${organisation}. This mapping wins — the bot will use the organisation set here.`,
      empty: "No numbers mapped yet",
      emptySubtitle:
        "Add the numbers your workers message from, so the bot knows whose documents to answer from.",
      emptyFiltered: "No numbers match that search",
      emptyFilteredSubtitle: "Try a different number or name.",
      listError: "Could not load the numbers.",
      listErrorSubtitle: "Refresh to try again.",
      bulkHeading: "Upload numbers",
      bulkSubtitle:
        "One number per line. Add an organisation and a name after it, separated by commas, if the list spans more than one organisation.",
      bulkExample: "Example:\n919876543210, Acme Health, Priya\n919876500000",
      bulkPasteLabel: "Numbers",
      bulkPastePlaceholder: "919876543210, Acme Health, Priya",
      bulkChooseFile: "Choose a CSV file",
      bulkFileHint:
        "A .csv or .txt file fills the box below, so you can check it before uploading.",
      bulkDefaultOrganisationLabel: "Organisation for lines that do not name one",
      bulkOverwriteLabel: "Move numbers that already belong to another organisation",
      bulkOverwriteHelp:
        "Off by default. Numbers already mapped elsewhere are listed as conflicts and left alone, so a file cannot quietly move workers between organisations.",
      bulkSubmit: (count: number) => `Upload ${count} number${count === 1 ? "" : "s"}`,
      bulkParsingProblems: (count: number) =>
        `${count} line${count === 1 ? "" : "s"} could not be read and will not be uploaded:`,
      bulkNothingToUpload: "Nothing to upload yet — paste some numbers above.",
      bulkFailed: "The upload failed. Nothing was saved.",
      bulkSummary: "Upload finished",
      bulkOutcome: {
        created: "Added",
        updated: "Moved",
        unchanged: "Already there",
        conflict: "Belongs to another organisation",
        invalid: "Could not be used",
        duplicate: "Repeated in this file",
      },
      bulkResultsHeading: "Lines that need attention",
      bulkAllGood: "Every line was accepted.",
      bulkRetryWithOverwrite: "Upload again, moving the conflicts",
      bulkClose: "Done",
    },
    corpus: {
      heading: "Knowledge Corpus",
      subtitle:
        "Documents the bot answers from. Each is split into passages so an answer can cite a page.",
      searchPlaceholder: "Search titles and document text",
      create: "Add document",
      edit: "Edit document",
      refresh: "Refresh",
      includeArchived: "Show archived",
      columnTitle: "Document",
      columnStatus: "Status",
      columnChunks: "Passages",
      columnOrganisations: "Organisations",
      columnUpdated: "Updated",
      sourceType: {
        paste: "Text",
        pdf: "PDF",
        docx: "Word",
        epub: "EPUB",
        url: "URL",
      },
      status: {
        pending: "Queued",
        extracting: "Reading",
        chunking: "Splitting",
        indexing: "Indexing",
        indexed: "Indexed",
        failed: "Failed",
      },
      retry: "Retry",
      retryQueued: "Queued for another attempt",
      archive: "Archive",
      unarchive: "Unarchive",
      archivedBadge: "ARCHIVED",
      archiveConfirmTitle: "Archive this document?",
      archiveConfirmDescription:
        "The bot will stop using it immediately. Its passages are kept, so answers already sent keep their sources. You can unarchive it later.",
      archiveSuccess: "Document archived",
      unarchiveSuccess: "Document unarchived — re-indexing",
      titleLabel: "Title",
      titlePlaceholder: "e.g. WHO mhGAP Intervention Guide",
      sourceTypeLabel: "Source",
      sourceTypeLocked: "The source cannot be changed after a document is created.",
      textLabel: "Text",
      textPlaceholder: "Paste the document text here",
      textTooLong: "This text is too long. Split it into separate documents.",
      uploadLabel: "File",
      uploadHelp: "Up to 25 MB.",
      uploadChoose: "Choose file",
      uploadReplace: "Replace file",
      uploading: "Uploading…",
      invalidFileType: "That file type does not match the selected source.",
      fileTooLarge: "That file is larger than 25 MB.",
      uploadFailed: "The upload failed. Please try again.",
      urlLabel: "URL",
      urlPlaceholder: "https://…",
      invalidUrl: "Enter a valid http or https URL.",
      tagsLabel: "Tags",
      tagsPlaceholder: "Add a tag and press Enter",
      languageLabel: "Language",
      languageHelp: "Leave blank to detect it automatically.",
      audienceLabel: "Available to",
      audienceHelp:
        "Who can get answers from this document. Workers only ever see documents their own organisation has.",
      audienceAll: "All organisations",
      audienceSpecific: "Specific organisations",
      audienceAllBadge: "All",
      audiencePickLabel: "Organisations",
      audiencePickPlaceholder: "Search organisations",
      audienceNoneWarning: "No organisations selected — nobody can get answers from this document.",
      audienceNoneCell: "Nobody",
      audienceMore: "+{count} more",
      audienceSaved: "Organisations updated",
      audienceIndexFailed:
        "The organisations were saved, but the search index could not be updated. Use Retry on the document.",
      filterButton: "Filter",
      filterOrganisationLabel: "Organisation",
      filterOrganisationChip: "Shows what this organisation can see",
      previewAsLabel: "Answer as",
      previewAsWholeCorpus: "Whole corpus (ignores targeting)",
      previewAsHelp:
        "Pick an organisation to see what its workers would actually get. The whole corpus is not what anyone receives.",
      previewAudienceWholeCorpus:
        "Answered from the whole corpus, ignoring organisation targeting.",
      previewAudienceScoped: "Answered as a worker from this organisation would be.",
      created: "Document added — indexing has been queued",
      updated: "Document updated",
      contentUnchanged: "The text is unchanged, so nothing was re-indexed",
      saveFailed: "Could not save the document",
      validationTitle: "A title is required",
      validationBody: "Add some text, a file, or a URL",
      empty: "No documents yet",
      emptySubtitle: "Add the reference material the bot should answer from.",
      emptyFiltered: "No documents match those filters",
      emptyFilteredSubtitle: "Try a different search term or clear the filters.",
      listError: "Could not load the corpus.",
      listErrorSubtitle: "Use Refresh to try again.",
      indexedOf: "of",
      failureReasonLabel: "Why it failed",
      statsIndexed: "Indexed",
      statsFailed: "Failed",
      statsInProgress: "In progress",
      statsPassages: "Passages",
    },
  },
  aiLab: {
    title: "AI Lab",
    tabs: {
      skills: "Skills",
      variables: "Variables",
      values: "Values",
      runs: "Runs",
      evaluators: "Evaluators",
      questionSets: "Question Sets",
    },
    // Skills
    skills: {
      heading: "Skills",
      subtitle:
        "Reusable system-prompt templates. Reference variables as {{name}} to be filled in at run time.",
      searchPlaceholder: "Search skills...",
      create: "New Skill",
      edit: "Edit Skill",
      namePlaceholder: "Skill name",
      nameLabel: "Name",
      descriptionLabel: "Description",
      descriptionPlaceholder: "What does this skill do?",
      contentLabel: "System Prompt",
      contentPlaceholder: "You are a helpful assistant. Use {{variable}} placeholders…",
      modelLabel: "Model",
      modelHelp: "The AI model this skill runs on.",
      temperatureLabel: "Temperature",
      temperatureHelp:
        "0–2. Leave blank for the provider default. Ignored by models that don't support it.",
      temperaturePlaceholder: "e.g. 0.7",
      maxTokensLabel: "Max output tokens",
      maxTokensHelp: "Cap on the response length. Leave blank for the AI Lab default.",
      maxTokensPlaceholder: "e.g. 2048",
      systemPromptLabel: "System prompt (optional)",
      systemPromptHelp: "Sent as a separate system message alongside the resolved prompt below.",
      systemPromptPlaceholder: "You are a strict JSON generator…",
      invalidTemperature: "Temperature must be between 0 and 2",
      invalidMaxTokens: "Max tokens must be a positive whole number",
      empty: "No skills yet",
      emptySubtitle: "Create a system-prompt template to reuse across runs.",
      loadFailed: "Couldn't load skills.",
      created: "Skill created",
      updated: "Skill updated",
      deleted: "Skill deleted",
      saveFailed: "Failed to save skill",
      deleteFailed: "Failed to delete skill",
      deleteTitle: "Delete skill?",
      deleteDescription: "This permanently removes the skill. This cannot be undone.",
      validation: "Name and system prompt are required",
    },
    // Variables
    variables: {
      heading: "Variables",
      subtitle:
        "Unique placeholder names used in skill templates as {{name}} and replaced with a value at run time.",
      searchPlaceholder: "Search variables...",
      create: "New Variable",
      edit: "Edit Variable",
      nameLabel: "Name",
      namePlaceholder: "e.g. customer_tone",
      nameHelp: "Letters, digits, underscore, dot or dash. No spaces.",
      descriptionLabel: "Description",
      descriptionPlaceholder: "What does this variable represent?",
      empty: "No variables yet",
      emptySubtitle: "Define placeholder names you can drop into skill prompts.",
      loadFailed: "Couldn't load variables.",
      created: "Variable created",
      updated: "Variable updated",
      deleted: "Variable deleted",
      saveFailed: "Failed to save variable",
      deleteFailed: "Failed to delete variable",
      deleteTitle: "Delete variable?",
      deleteDescription:
        "This permanently removes the variable and all of its values. This cannot be undone.",
      duplicate: "A variable with this name already exists",
      validation: "A valid name is required",
    },
    // Values
    values: {
      heading: "Values",
      subtitle: "Candidate values bound to variables, substituted into templates at run time.",
      searchPlaceholder: "Search values...",
      create: "New Value",
      edit: "Edit Value",
      variableLabel: "Variable",
      variablePlaceholder: "Select a variable",
      labelLabel: "Label",
      labelPlaceholder: "Optional friendly label",
      valueLabel: "Value",
      valuePlaceholder: "The substitution value",
      columnVariable: "Variable",
      columnLabel: "Label",
      columnValue: "Value",
      empty: "No values yet",
      emptySubtitle: "Add values for your variables so runs have something to substitute.",
      loadFailed: "Couldn't load values.",
      noVariables: "Create a variable first — values are bound to a variable.",
      created: "Value created",
      updated: "Value updated",
      deleted: "Value deleted",
      saveFailed: "Failed to save value",
      deleteFailed: "Failed to delete value",
      deleteTitle: "Delete value?",
      deleteDescription: "This permanently removes the value. This cannot be undone.",
      validation: "A variable and a value are required",
    },
    // Runs
    runs: {
      heading: "Runs",
      subtitle:
        "Execute skills with variable values substituted in. Each skill in a run is logged as its own row.",
      create: "Create New Run",
      searchPlaceholder: "Search runs...",
      empty: "No runs yet",
      emptySubtitle: "Create a run to execute one or more skills and see their output here.",
      loadFailed: "Couldn't load runs.",
      // Drawer
      drawerTitle: "Create New Run",
      selectSkills: "Select skills",
      selectSkillsHelp: "Pick one or more skills to run.",
      noSkills: "Create a skill first — runs execute skills.",
      variablesHeading: "Variable values",
      variablesHelp:
        "Choose one or more values for each variable — every combination is run (a matrix).",
      noVariablesNeeded: "The selected skills use no variables.",
      missingValues: "Some variables have no values yet — add values in the Values tab.",
      matrixSummary: "{runs} run(s) will be created.",
      tooManyRuns: "That's {runs} runs — reduce selections to {max} or fewer.",
      run: "Run",
      running: "Running…",
      runningProgress: "Running {done} of {total}…",
      validationSkills: "Select at least one skill",
      validationValues: "Select a value for every variable",
      runsComplete: "Run complete",
      runsFailed: "Run failed",
      runsPartial: "{failed} of {total} runs failed",
      failuresTitle: "Some runs didn't complete",
      failuresHelp:
        "The skills below failed to run (a network or request error). Close to review the log, or dismiss to try again.",
      dismissFailures: "Back to form",
      close: "Close",
      // Table columns
      columnSkill: "Skill",
      columnVariables: "Variables",
      columnModel: "Model",
      columnStatus: "Status",
      columnOutput: "Output",
      columnCreated: "Created",
      // Detail viewer
      detailTitle: "Run detail",
      detailSkill: "Skill",
      detailModel: "Model",
      detailStatus: "Status",
      detailVariables: "Variables",
      detailPrompt: "Resolved prompt",
      detailOutput: "Output",
      detailError: "Error",
      detailTokens: "Tokens",
      detailCost: "Est. cost",
      deleted: "Run deleted",
      deleteFailed: "Failed to delete run",
      deleteTitle: "Delete run?",
      deleteDescription: "This permanently removes the run from the log. This cannot be undone.",
      paginationRange: "Showing {start}–{end} of {total}",
      prev: "Previous",
      next: "Next",
      // Bulk selection
      selectedCount: (count: number) => `${count} selected`,
      clearSelection: "Clear selection",
      bulkPublishAction: "Add Questions & Publish",
      bulkAssignAction: "Manage Evaluators",
    },
    // Bulk: add questions/question sets and publish several runs at once
    bulkPublish: {
      drawerTitle: "Publish Selected Runs",
      subtitle: (count: number) =>
        `Attach the same evaluation questions to ${count} selected run${count === 1 ? "" : "s"}. At least one question is required. Questions cannot be changed after publishing.`,
      publishButton: "Publish All",
      publishing: "Publishing…",
      validation: "Add at least one question and fill in every question text",
      allSucceeded: (count: number) =>
        `${count} run${count === 1 ? "" : "s"} published for evaluation`,
      partialFailure: (failed: number, total: number) =>
        `${failed} of ${total} runs failed to publish — the rest were published`,
      allFailed: "Failed to publish the selected runs",
    },
    // Bulk: add/remove human evaluators across several published runs at once
    bulkAssign: {
      drawerTitle: "Manage Evaluators",
      subtitle: (count: number) =>
        `Add or remove human evaluators across ${count} selected published run${count === 1 ? "" : "s"}.`,
      noEvaluators: "No evaluators yet — create them in the Evaluators tab first.",
      assignedAll: "Assigned to all selected",
      assignedSome: (assigned: number, total: number) => `Assigned to ${assigned} of ${total}`,
      assignedNone: "Not assigned to any selected run",
      apply: "Apply Changes",
      applying: "Applying…",
      noChanges: "Change at least one evaluator's assignment before applying",
      added: (count: number) => `${count} assignment${count === 1 ? "" : "s"} added`,
      removed: (count: number) => `${count} assignment${count === 1 ? "" : "s"} removed`,
      skippedSubmitted: (count: number) => `${count} skipped (already submitted)`,
      applyFailed: "Some changes failed to apply",
      loadFailed: "Failed to load current assignments",
    },
    // Automated (LLM-as-judge) evaluation
    autoEval: {
      action: "Auto-evaluate",
      drawerTitle: "Automated Evaluation",
      subtitle:
        "Score this run's output against a rubric using an LLM judge. Fast, cheap, repeatable — complements human evaluation.",
      criteriaLabel: "Criteria / rubric",
      criteriaPlaceholder:
        "e.g. The response must be valid JSON, cite a source, and stay under 100 words.",
      modelLabel: "Judge model",
      run: "Run evaluation",
      running: "Evaluating…",
      empty: "No automated evaluations yet.",
      priorHeading: "Previous evaluations",
      scoreLabel: "Score",
      failed: "Evaluation failed",
      success: "Evaluation complete",
      validation: "Enter the criteria to score against",
    },
    // Publish for human evaluation
    publish: {
      action: "Publish",
      drawerTitle: "Publish for Human Evaluation",
      subtitle:
        "Attach the evaluation questions human evaluators will answer for this record. At least one question is required. Questions cannot be changed after publishing.",
      addQuestion: "Add Question",
      questionLabel: "Question",
      questionPlaceholder: "e.g. How helpful is this response?",
      typeLabel: "Type",
      typeRating: "Rating scale",
      typeYesNo: "Yes / No",
      typeText: "Open-ended text",
      typeDescription: "Description (no response needed)",
      scaleLabel: "Scale",
      scaleOption: (max: number) => `1 to ${max}`,
      remove: "Remove",
      publishButton: "Publish",
      validation: "Add at least one question and fill in every question text",
      published: "Run published for evaluation",
      publishFailed: "Failed to publish run",
      publishedBadge: "Published",
    },
    // Assign evaluators
    assign: {
      action: "Assign evaluators",
      drawerTitle: "Assign Evaluators",
      subtitle:
        "Pick the human evaluators who should review this record. Submitted evaluations cannot be unassigned.",
      noEvaluators: "No evaluators yet — create them in the Evaluators tab first.",
      submittedLock: "Submitted",
      save: "Save assignments",
      saved: "Assignments updated",
      saveFailed: "Failed to update assignments",
      responses: (submitted: number, assigned: number) => `${submitted}/${assigned} responses`,
    },
    // Aggregated results
    results: {
      action: "View results",
      drawerTitle: "Evaluation Results",
      assigned: "Assigned",
      submitted: "Submitted",
      recordAverage: "Record score",
      recordAverageHelp:
        "Scale-agnostic average across all rating answers for this record (0-100%)",
      noRatingsYet: "No ratings yet",
      responsesLabel: "responses",
      yes: "Yes",
      no: "No",
      noTextAnswers: "No written answers yet",
      descriptionNote: "Descriptive text — no responses collected",
      evaluatorsHeading: "Evaluators",
      pending: "Pending",
      loadFailed: "Failed to load results",
      exportCsv: "Export CSV",
      exportJson: "Export JSON",
      agreement: "Agreement",
      agreementHelp:
        "Share of evaluators on the most common answer — high means raters agree, low means they're split.",
    },
    // Compare runs in a batch
    compare: {
      action: "Compare batch",
      drawerTitle: "Compare Runs",
      subtitle: "Runs from the same batch, side by side.",
      empty: "No other runs in this batch.",
      columnOutput: "Output",
      columnTokens: "Tokens",
      columnCost: "Est. cost",
    },
    // Evaluators tab
    evaluators: {
      heading: "Evaluators",
      subtitle:
        "Human evaluators sign in at /evaluate with their email and an auto-generated password you share with them offline.",
      searchPlaceholder: "Search evaluators...",
      create: "New Evaluator",
      emailLabel: "Email",
      emailPlaceholder: "evaluator@example.com",
      empty: "No evaluators yet",
      emptySubtitle: "Create evaluator accounts to assign published records for human review.",
      loadFailed: "Couldn't load evaluators.",
      created: "Evaluator created",
      createFailed: "Failed to create evaluator",
      duplicate: "An evaluator with this email already exists",
      deleted: "Evaluator deleted",
      deleteFailed: "Failed to delete evaluator",
      deleteTitle: "Delete evaluator?",
      deleteDescription:
        "This permanently removes the evaluator, their assignments and their submitted answers. This cannot be undone.",
      regenerate: "Regenerate password",
      regenerated: "Password regenerated",
      regenerateFailed: "Failed to regenerate password",
      regenerateTitle: "Regenerate password?",
      regenerateDescription:
        "The current password stops working immediately and any active session is signed out. You'll get a new password to share.",
      passwordTitle: "Evaluator password",
      passwordNote:
        "Copy this password now and share it offline — it is shown only once and cannot be retrieved later.",
      copyPassword: "Copy password",
      copied: "Copied to clipboard",
      copyFailed: "Couldn't copy — select and copy the password manually",
      columnEmail: "Email",
      columnAssigned: "Assigned",
      columnSubmitted: "Submitted",
      columnLastLogin: "Last login",
      columnCreated: "Created",
      never: "Never",
      portalLinkLabel: "Evaluator portal:",
      validation: "Enter a valid email address",
    },
    // Question Sets — reusable, named lists of human-eval questions
    questionSets: {
      heading: "Question Sets",
      subtitle:
        "Reusable, named lists of human-evaluation questions. Publish a set to apply it when publishing runs for evaluation. Questions cannot be changed after publishing.",
      searchPlaceholder: "Search question sets...",
      create: "New Question Set",
      edit: "Edit Question Set",
      view: "View Question Set",
      nameLabel: "Name",
      namePlaceholder: "e.g. Onboarding tone check",
      descriptionLabel: "Description",
      descriptionPlaceholder: "What is this set used to evaluate?",
      columnName: "Name",
      columnQuestions: "Questions",
      columnStatus: "Status",
      columnCreated: "Created",
      statusDraft: "Draft",
      statusPublished: "Published",
      questionCount: (count: number) => `${count} question${count === 1 ? "" : "s"}`,
      empty: "No question sets yet",
      emptySubtitle: "Create a reusable list of questions to apply when publishing runs.",
      loadFailed: "Couldn't load question sets.",
      saveDraft: "Save Draft",
      publishButton: "Publish",
      publishHelp: "Publishing locks the question list — it can no longer be edited.",
      publishConfirmTitle: "Publish this question set?",
      publishConfirmDescription:
        "Its questions will be locked and can no longer be edited. You can still archive the set later to retire it. This cannot be undone.",
      created: "Question set created",
      updated: "Question set updated",
      published: "Question set published",
      saveFailed: "Failed to save question set",
      publishFailed: "Failed to publish question set",
      validation: "Name and at least one question (with text) are required to publish",
      draftValidation: "A name is required",
      archive: "Archive",
      unarchive: "Unarchive",
      archivedBadge: "Archived",
      archivedHelp:
        "Archived sets can't be applied to new runs but stay intact for runs that already imported their questions.",
      archiveSuccess: "Question set archived",
      archiveFailed: "Failed to archive question set",
      unarchiveSuccess: "Question set unarchived",
      unarchiveFailed: "Failed to unarchive question set",
      deleted: "Question set deleted",
      deleteFailed: "Failed to delete question set",
      deleteTitle: "Delete question set?",
      deleteDescription: "This permanently removes the draft. This cannot be undone.",
      lockedNote: "This question set is published and can no longer be edited.",
      // Reused inside the question builder (same copy as ad-hoc publish questions)
      addQuestion: "Add Question",
      questionLabel: "Question",
      questionPlaceholder: "e.g. How helpful is this response?",
      typeLabel: "Type",
      typeRating: "Rating scale",
      typeYesNo: "Yes / No",
      typeText: "Open-ended text",
      typeDescription: "Description (no response needed)",
      scaleLabel: "Scale",
      remove: "Remove",
      moveUp: "Move up",
      moveDown: "Move down",
      // Import into the run-publish drawer
      importLabel: "Import from a question set",
      importPlaceholder: "Choose a published question set…",
      importAction: "Import",
      importedNote: "Imported — you can still edit or remove these below.",
      noSets: "No published question sets yet.",
    },
    unsavedChangesWarning: "You have unsaved changes. Are you sure you want to close?",
    listError: "Failed to load AI Lab data",
  },
  // The /evaluate micro-app (human evaluators; separate from the admin session)
  analyticsAgent: {
    tabLabel: "Analytics Agent",
    heading: "Ask a question about the platform",
    // The empty state teaches rather than decorates: this is the one screen where
    // a reader has no idea what the thing can do until they have watched it work.
    emptyTitle: "Ask in plain English",
    emptySubtitle:
      "The agent writes a read-only SQL query against the analytics tables, runs it, and explains the result. It shows you the query it ran, so you can check the number.",
    inputPlaceholder: "e.g. How many simulations were completed per week in the last 90 days?",
    send: "Ask",
    sending: "Working…",
    // Named for what it does. "Clear" would read as deleting data.
    reset: "Reset chat",
    resetConfirmTitle: "Reset this chat?",
    resetConfirmBody:
      "The conversation is only held in this browser tab, so resetting it cannot be undone. Nothing stored is affected.",
    // Distinct from the trigger button's label: two controls named "Reset chat"
    // on the same screen are one ambiguous target for a screen reader, and the
    // dialog's job is to state what confirming does.
    resetConfirm: "Reset and start over",
    cancel: "Cancel",
    // Progress narrative, not a bare spinner: two model calls and a query take
    // real seconds, and a reader who cannot tell "working" from "stuck" reloads.
    pendingPlanning: "Working out which tables answer this…",
    pendingSlow: "Still working — a broad question can take up to a minute.",
    requestFailed: "The agent could not be reached. Check your connection and ask again.",
    showQuery: "Show the SQL",
    hideQuery: "Hide the SQL",
    ranIn: "ran in",
    rowsReturned: "rows",
    truncatedNotice:
      "Showing the first {count} rows — the full result is larger, so any total in the answer is a lower bound.",
    skippedRowsNotice:
      "{count} row(s) are not on the chart because the measure was missing or not a number. They are in the table.",
    caveatsTitle: "Worth knowing",
    followUpsTitle: "Ask next",
    clarifyTitle: "Needs a bit more detail",
    refusedTitle: "Can't answer that from this data",
    rejectedTitle: "Query refused",
    failedTitle: "Query didn't run",
    provenance: "Planned by {planner} · written by {answer} · prompt {version}",
    provenancePlannerOnly: "Planned by {planner} · prompt {version}",
    scopeTitle: "What can I ask about?",
    scopeIntro:
      "The agent reads aggregate analytics only. It can query these tables, capped at {rowLimit} rows per question:",
    scopeDeniedIntro:
      "It can never read credentials, personal contact details, or session and message content — including inside a count.",
    scopeLoadFailed: "Couldn't load the list of readable tables.",
    tableColumns: "columns",
    emptyResult: "The query ran and matched no rows.",
    // Sample questions in the empty state. Deliberately concrete and answerable
    // from the readable tables — a suggestion that gets refused teaches the wrong
    // lesson on a reader's first try.
    samples: [
      "How many simulations were completed each week over the last 90 days?",
      "Which 10 organisations ran the most simulations this month?",
      "What is the median simulation length, and how many sessions is that over?",
      "How has AI spend per model changed month over month this year?",
      "How many learners practised at all in the last 30 days, by organisation?",
    ],
  },
  analyticsSuggestions: {
    tabLabel: "Suggestions",
    heading: "Product suggestions from the platform's own data",
    // The empty state teaches: nothing on this screen explains itself until a
    // reader has seen one run, and the two facts they need first are what it
    // reads and that they stay in control of what gets filed.
    emptyTitle: "Nothing generated yet",
    emptySubtitle:
      "Generate reads a period's analytics — adoption, practice, quality, tracks, Scribe and cost — and drafts product suggestions from it. Each one arrives as a card you accept onto the roadmap or reject. Nothing is filed without you.",
    emptyFilteredTitle: "Nothing here",
    emptyFilteredSubtitle: "No suggestions have this status yet. Try another filter.",
    generate: "Generate",
    // ── Generate dialog ──────────────────────────────────────────────────────
    generateTitle: "Generate suggestions",
    generateIntro:
      "Pick the period to read. Everything the model sees comes from this window, except a few platform-history figures which are labelled as such.",
    periodLabel: "Period",
    period30d: "Last 30 days",
    period90d: "Last 90 days",
    period12m: "Last 12 months",
    periodAll: "All time",
    periodCustom: "Custom range",
    customFrom: "From",
    customTo: "To",
    customIncomplete: "Pick both a start and an end date.",
    customOrder: "The end date must be on or after the start date.",
    customTooLong: "A custom range is limited to {max} days. This one is {days}.",
    generateSubmit: "Generate suggestions",
    cancel: "Cancel",
    // A bounded progress narrative, not a spinner: this reads fifteen analytics
    // sections and then drafts, so a reader who cannot tell "working" from
    // "stuck" will reload and start a second run.
    pendingReading: "Reading the platform's analytics for this period…",
    pendingSlow: "Still working — a full read and draft can take up to two minutes.",
    generateFailed: "The run did not finish and nothing was saved. Check the period and try again.",
    generated: "{count} suggestion(s) added.",
    // Zero is a real answer here, so it gets its own copy rather than reading as
    // a failure.
    nothingProposed:
      "The run finished and proposed nothing — the data for this period did not support a suggestion worth filing. Try a wider window.",
    sectionsUnavailable:
      "{count} analytics section(s) could not be read for this period, so the suggestions do not account for them:",
    // ── Cards ────────────────────────────────────────────────────────────────
    statusFilterLabel: "Show",
    statusPending: "Awaiting a decision",
    statusAccepted: "Accepted",
    statusRejected: "Rejected",
    statusAll: "Everything",
    batchHeading: "{window} · generated {date}",
    // Provenance on every card: a suggestion without the window and model it came
    // from is a claim nobody can check.
    provenance: "{window} · {model}",
    noGoalMatched: "No goal matched",
    sourceUxSignal: "From UX telemetry",
    rationaleLabel: "Why now",
    evidenceLabel: "From the data",
    accept: "Accept",
    reject: "Reject",
    viewOnRoadmap: "View on roadmap",
    // An accepted suggestion whose opportunity was later deleted.
    opportunityGone: "The roadmap item for this was deleted.",
    rejectedBecause: "Rejected: {reason}",
    rejectedNoReason: "Rejected, with no reason recorded.",
    loadFailed: "Couldn't load the suggestions.",
    retry: "Try again",
    // ── Accept dialog ────────────────────────────────────────────────────────
    acceptTitle: "File this on the roadmap",
    acceptIntro:
      "This is a draft. Edit it into the opportunity you actually want on the board — what you file is what the team reads.",
    descriptionLabel: "Opportunity",
    descriptionPlaceholder: "The problem, who hits it, and why it matters",
    typeLabel: "Type",
    typeIdea: "Idea",
    typeBug: "Bug",
    goalLabel: "Product goal",
    goalPlaceholder: "Pick a goal",
    goalMissing: "Pick a product goal.",
    descriptionMissing: "Write the opportunity before filing it.",
    duplicatesTitle: "Similar items already on the roadmap",
    acceptSubmit: "File it",
    accepted: "Filed on the roadmap.",
    acceptFailed: "Could not file this suggestion.",
    // ── Reject dialog ────────────────────────────────────────────────────────
    rejectTitle: "Reject this suggestion",
    reasonLabel: "Why not? (optional)",
    reasonPlaceholder: "e.g. Already covered by the tracks work",
    reasonHelper:
      "A reason is fed into later runs as a standing decision, so this idea is not proposed again. Without one, only this exact suggestion is suppressed.",
    // Distinct from the card's "Reject" trigger: two controls with the same name
    // on one screen are one ambiguous target for a screen reader, and the dialog's
    // job is to say what confirming does.
    rejectSubmit: "Reject suggestion",
    rejected: "Rejected.",
    rejectFailed: "Could not reject this suggestion.",
  },
  uxSignals: {
    title: "UX Signals",
    scanNow: "Scan now",
    scanning: "Scanning telemetry\u2026",
    scanTooltip:
      "Takes about two minutes: seven detector queries, then one triage pass. It runs in the background, so you can leave this page.",
    neverScanned: "No scan has run yet. Scans run automatically once a day.",
    // The scan outlives the request that started it, so the running line has to
    // say the page is watching \u2014 otherwise the only honest reading of a
    // two-minute wait with no feedback is that something is stuck.
    scanRunning: "A scan is running now. This page updates when it finishes.",
    // A RUNNING row past the backend\u2019s staleness cutoff: the scan died with
    // whatever process was running it. Saying so beats a spinner that never ends.
    scanStalled:
      "The scan that started {when} never reported back \u2014 it was interrupted. Anything it had already filed is in the table below. You can start another.",
    lastScanSummary: "Last scan {when}: {findings} bugs, {suggestions} suggestions filed.",
    lastScanFailed: "Last scan {when} failed: {reason}",
    // Zero is a real answer, so the copy has to read correctly at zero: "0 bugs
    // and 0 suggestions filed" is a successful quiet week, not a failure.
    scanDone: "Scan complete: {findings} bugs and {suggestions} suggestions filed.",
    scanDetail: "{signals} signals crossed a threshold; {skipped} were already known.",
    detectorsFailed: "These detectors could not run: {detectors}.",
    scanConflict: "A scan is already running. Wait for it to finish before starting another.",
    scanUnavailable: "Product telemetry access isn\u2019t configured, so there is nothing to scan.",
    // The catch-all, and the one place the app genuinely does not know what
    // happened: the request to start a scan got no usable answer, which does not
    // tell us whether the scan was claimed. Its predecessor asserted "Nothing was
    // filed" here and was wrong in production \u2014 a scan that filed seven
    // findings reported itself as a failure. Say what is known, then the next step.
    scanFailed:
      "Couldn\u2019t confirm the scan started. Reload to see whether one is running before trying again.",
    scanFailedReason: "The scan failed: {reason}",
    scanUnknownReason: "no reason was recorded",
  },
  bugHunter: {
    tabLabel: "Bug Hunter",
    // ── The character ────────────────────────────────────────────────────────
    // Bug Hunter is presented as a colleague — a test engineer you check in on
    // — rather than as a pipeline you configure. Everything it says is first
    // person, plain, and ends with what happens next. The full voice rules,
    // and why they exist, are in pages/BugHunter/agentPersona.ts.
    //
    // One line to hold: the character speaks about *the work*; the app speaks
    // about *itself*. "I couldn't reproduce that bug" is Bug Hunter. "Couldn't
    // load the bugs table" is this console failing, and stays in app voice —
    // having the character apologise for a failed fetch would be a lie about
    // where the fault is.
    agentName: "Bug Hunter",
    agentRole: "Software test engineer",
    agentHours: "Nightly sweep, plus whenever you ask",
    agentStatusOffDuty: "Off duty",
    agentStatusOffDutyDetail:
      "I'm not picking anything up. Nightly sweeps and fix sessions are both paused until you put me back on.",
    agentStatusWaiting: "Waiting on you",
    agentStatusWaitingDetailOne:
      "One bug is waiting on your call. I'll carry on as soon as you decide.",
    agentStatusWaitingDetail:
      "{count} bugs are waiting on your call. I'll carry on as soon as you decide.",
    agentStatusProblem: "Hit a problem",
    agentStatusProblemDetailOne:
      "One of my jobs went red. Open it and I'll show you what happened.",
    agentStatusProblemDetail:
      "{count} of my jobs went red. Open them and I'll show you what happened.",
    agentStatusWorking: "Working",
    agentStatusWorkingSweeping: "I'm sweeping {repo} right now.",
    agentStatusWorkingDetailOne: "I'm working on one fix right now.",
    agentStatusWorkingDetail: "I'm working on {count} fixes right now.",
    agentStatusOnShift: "On shift",
    agentStatusOnShiftDetail: "Nothing on my desk. My next sweep runs tonight.",
    agentStatusOnShiftDetailManual:
      "Nothing on my desk. My next sweep runs tonight — I'll check with you before I fix anything.",
    // ── Tabs over the bugs table (2026-10-13) ───────────────────────────────
    // Five tabs replaced seven chips and "Everything": one question each, in
    // the order a reader asks them. Plain words, named by what is in them —
    // see lifecycleBucket.ts for which statuses each holds.
    tabsLabel: "Bugs by what happens next",
    tabNeedsYou: "Needs you",
    tabFailed: "Failed",
    tabInProgress: "In progress",
    tabBacklog: "Backlog",
    tabDone: "Done",
    // An empty tab says what lands in it, so it reads as "nothing yet" rather
    // than as something broken. App voice: this is the page describing itself.
    tabEmptyNeedsYouTitle: "Nothing needs you right now",
    tabEmptyNeedsYouSubtitle: "Bugs waiting for your approval or an answer land here.",
    tabEmptyFailedTitle: "Nothing has failed",
    tabEmptyFailedSubtitle:
      "Fix sessions and releases that go red land here, for you to try again or close.",
    tabEmptyInProgressTitle: "Nothing in progress",
    tabEmptyInProgressSubtitle:
      "Bugs being fixed or released, and fixes with a pull request open for review, land here.",
    tabEmptyBacklogTitle: "The backlog is empty",
    tabEmptyBacklogSubtitle: "New bugs that nobody has started yet land here.",
    tabEmptyDoneTitle: "Nothing done yet",
    tabEmptyDoneSubtitle: "Merged, live and closed bugs land here.",

    // ── What I need from you (the decision queue) ────────────────────────────
    // First person, and it ends with what happens next — the voice rules in
    // agentPersona.ts. "What I need from you" rather than "Waiting on you"
    // because the status pill already says the latter, and the same phrase
    // twice on one screen reads as one thing said twice.
    queueTitle: "What I need from you",
    // Broken into its two kinds rather than one total, because the card above it
    // says "3 bugs are waiting on your call" (agentPersona counts only
    // PENDING_APPROVAL and NEEDS_INPUT) while this queue also holds the red
    // jobs. One total here read as a contradiction with the header sentence
    // twelve pixels above it — "3" and "5" describing the same page. Split, the
    // two numbers reconcile and each keeps the vocabulary of the chip it matches.
    //
    // Numerals rather than "one", so a single-item line does not have to start a
    // sentence with a lowercase word.
    queuePartWaiting: "{count} waiting on your call",
    queuePartProblem: "{count} went red",
    queueTailOne: "Decide it and I'll carry on.",
    queueTail: "Decide them and I'll carry on.",
    queueOpen: "Open",
    queueAnswer: "Answer",
    // Not "Retry": what to do about a red job is a decision that needs the work
    // log, and the drawer is where that is. See NeedsYouCard.tsx.
    queueSeeWhatHappened: "See what happened",
    queueShowAll: "Show {count} more",
    queueShowFewer: "Show fewer",

    // ── Working style: how much rope, not on/off ─────────────────────────────
    modeLabel: "Working style",
    // Plain control labels (2026-10-13). The API and the logs say off, manual
    // and ai; About names both vocabularies so they join up. The confirm
    // dialogs below still speak in Bug Hunter's own voice.
    modeOff: "Off",
    modeManual: "Manual",
    modeAi: "Autonomous",
    modeOffConfirmTitle: "Send Bug Hunter off duty?",
    modeManualConfirmTitle: "Ask Bug Hunter to check with you first?",
    modeAiConfirmTitle: "Let Bug Hunter work solo?",
    modeOffConfirmBody:
      "I'll stop picking anything up — nightly sweeps and fix sessions both — until you put me back on. Nothing already in my table changes, and anything mid-run finishes first.",
    modeManualConfirmBody:
      "I'll keep finding bugs on my usual schedule, but I won't fix anything until you approve it in my table below. This is Manual mode.",
    modeAiConfirmBody:
      "Anything I've verified goes straight to the fix stage without waiting for you — my original, fully automatic behaviour. I still never merge a migration, auth or payment change myself. This is AI mode.",
    modeConfirm: "Confirm",
    cancel: "Cancel",
    updateFailed: "Couldn't update the setting. Try again.",
    // Links to the shared Model Settings hub (see `en.modelSettings`) rather
    // than a Bug-Hunter-only page — Builder's model tiers live there too.
    settingsLink: "Model settings",
    // ── The one-line header (2026-10-13) ─────────────────────────────────────
    // State, then what it is doing, then when it last swept — each fragment in
    // sentence case so any of them can drop out. App voice: the header reports
    // on Bug Hunter rather than speaking as it.
    headerFixingNow: "Fixing {count} now",
    headerSweepingNow: "Sweeping {repo} now",
    headerLastSweep: "Last sweep {when}",
    headerNoSweepYet: "No sweep yet",
    headerAgo: "{span} ago",
    headerJustNow: "just now",
    headerMenuLabel: "More actions",
    menuScanUxSignals: "Scan UX signals now",
    menuMapFeatures: "Map features now",
    helpButtonLabel: "About Bug Hunter",
    // ── About me (was the FAQ) ───────────────────────────────────────────────
    // Questions in the second person, answers in the first: this reads as
    // asking a colleague how they work, not as product documentation. Both
    // mode names are stated verbatim, because logs, docs and the API still use
    // them and a reader has to be able to join the two vocabularies up.
    faqTitle: "About me",
    faqWhatTitle: "What do you do?",
    faqWhatBody:
      "Every night — and whenever you ask — I go through the Ally repos looking for bugs: failing or flaky tests, an LLM code-review pass over recent changes, production error signals, and the bugs your team has already reported on the product roadmap. Everything I find, and everything your team reports, lands in my bugs table below with its current status.",
    faqModesTitle: "What's the difference between the two working styles?",
    faqModesBody:
      'I discover and verify bugs the same way in both, on the same schedule. On Autonomous (AI mode) a bug I\'ve verified goes straight to the fix stage. On Manual it waits at "Pending approval" under Needs you until you approve it — I fix nothing without a click from you first.',
    faqTrivialTitle: "What do you fix on your own, and what do you just propose?",
    faqTrivialBody:
      "I merge my own fix only in a narrow, pre-approved set of cases: a lint or type-only change, or a single-file fix backed by a new regression test that fails before it and passes after. I never touch migrations, auth and permission code, payment paths or other security-sensitive services on my own, however small the diff looks — those always come to you as a PR.",
    faqFixNowTitle: "Can I get one specific bug fixed right now?",
    faqFixNowBody:
      "Yes — open the bug and press \"Put me on it\". I'll work on that one immediately instead of waiting for tonight's sweep: I write a test that reproduces it, fix it, check the whole suite is still green, and open a PR — merging it myself only if nothing guarded is involved. If nobody has matched the bug to a codebase yet, I'll ask you which repo to open. I have to be on duty first.",
    faqMultiRepoTitle: "What if a bug needs changes in more than one repo?",
    faqMultiRepoBody:
      'I handle it. I only have one repo checked out per session, so when I find that a complete fix needs work elsewhere too, I stop without committing anything and hand back a plan — one step per repo, in the order they have to ship. Then I work through it myself, one session at a time, each waiting for the one before it to merge. Once they\'re all merged you get one "Release to production" button, and I deploy them in that same order, waiting for each to go green before I start the next. If a step gets stuck I stop the whole plan there rather than building on something that never landed.',
    faqReleaseTitle: "How does a fix of yours reach users?",
    faqReleaseBody:
      "Once it's merged, a \"Release to production\" button appears on the bug. Pressing it cuts the next patch version and runs that service's normal production release pipeline — the same one you'd trigger by hand, database migration and all. I never take that step myself: I can carry a fix as far as master, but putting it in front of real users stays your decision, and we record who made it.",
    faqReviewTitle: "Where do I review what you've found?",
    faqReviewBody:
      "In my bugs table below — click any row to open it, approve or reject it, or answer a question I've asked. There's no separate review screen.",
    faqEscalationTitle: "Where do you tell me you're stuck?",
    faqEscalationBody:
      'Under Needs you, the first tab of my bugs table. A bug that needs your approval waits there, and so does one where I\'ve asked you a question — it reads "Needs input", and its Answer button opens it so you can reply. Anything of mine that went red is under Failed. The count beside Bug Hunter in the sidebar is my unread notifications. A quiet, successful night gets no message at all, on purpose.',
    faqReposTitle: "Which repos do you touch?",
    faqReposBody: "ally-be, ally-web, ally-ai, ally-ai-learn and ally-mobile.",
    faqCostTitle: "What does a night of your work cost?",
    faqCostBody:
      "Every sweep's estimated token cost is in my shift log on Analytics → Bug Agent, from the same LLM usage data the platform's cost analytics use. What my fix sessions on one bug have cost is on that bug.",
    faqOffTitle: "How do I stop you?",
    faqOffBody:
      "Set my working style to Off at the top of the page. That blocks every trigger immediately — nightly and on-demand alike.",
    // ── Findings table (the comprehensive bug table) ──────────────────────────
    findingColumnTitle: "Bug",
    findingColumnStatus: "Status",
    // Sorting by status walks the lifecycle rather than the alphabet, which is
    // worth saying: "sort by status" reads as an arbitrary ordering until you
    // know that clicking it brings your own unfinished work to the top.
    findingColumnStatusTooltip:
      "Where a bug is in my pipeline. Sorting by it walks the lifecycle rather than the alphabet — within Done, say, the merged fixes, then the live ones, then the closed.",
    // The severity dot before a title: its accessible name and hover title.
    severityDotLabel: "{severity} severity",
    findingSourceTestFailure: "Failing test",
    findingSourceLintError: "Lint error",
    findingSourceCodeReview: "Code review",
    findingSourceProductionLog: "Production log",
    findingSourceReportedBug: "Reported by team",
    findingSourceAnalyticsSuggestion: "Analytics suggestion",
    findingSourceUxSignal: "UX signal",
    findingSourceLocaleParity: "Locale parity",
    findingSeverityLow: "Low",
    findingSeverityMedium: "Medium",
    findingSeverityHigh: "High",
    findingStatusNew: "New",
    findingStatusPendingApproval: "Pending approval",
    findingStatusApproved: "Approved",
    findingStatusQueued: "Starting…",
    findingStatusBlocked: "Waiting its turn",
    findingStatusCoordinating: "Fixing across repos",
    findingStatusFixing: "Fixing",
    findingStatusNeedsInput: "Needs input",
    findingStatusPrOpened: "PR open",
    findingStatusMerged: "Merged",
    findingStatusReleasing: "Releasing…",
    findingStatusReleased: "Live",
    findingStatusReleaseFailed: "Release failed",
    findingStatusDismissed: "Dismissed",
    findingStatusRejected: "Rejected",
    findingStatusFailed: "Failed",
    findingStatusCancelled: "Cancelled",
    // The coarse roadmap ladder, shown beside the pipeline status because bugs
    // are no longer listed on the roadmap board — this is the vocabulary the
    // team already reads, and Bug Hunter is now the only place a bug appears.
    findingStageNew: "New",
    findingStagePrioritised: "Prioritised",
    findingStageUnderDevelopment: "In development",
    findingStageReleased: "Released",
    findingStageArchived: "Archived",
    findingStagePinnedTooltip:
      "Stage set by hand by {name} on {date}. It no longer follows the fix pipeline.",
    stageSectionTitle: "Stage",
    stageAutoLabel: "Following the pipeline",
    stageEditLabel: "Set stage by hand",
    stageEditHint:
      "For a bug fixed outside Bug Hunter; a stage set by hand stops following the pipeline.",
    stageSelectLabel: "Stage",
    stageSave: "Set stage",
    stageBackToAuto: "Back to automatic",
    stageCancel: "Cancel",
    stageSaved: "Stage updated.",
    stageSaveFailed: "Couldn't update the stage.",
    // The reporter block: only ever present on a bug a person filed, and the
    // only thing now distinguishing one from an agent-found lint error.
    reporterSectionTitle: "Reported by",
    reporterConsumer: "Consumer",
    reporterStaff: "Staff",
    reporterUnknown: "Unknown reporter",
    reporterConsumerTooltip: "Filed through the in-app \u201cReport a problem\u201d form.",
    reporterStaffTooltip: "Filed by somebody internal.",
    reporterContextTitle: "Captured with the report",
    reporterContextEmpty: "Their client captured no extra context.",
    reporterContextSurface: "Where they saw it",
    reporterContextExpected: "Expected",
    reporterContextSteps: "Steps",
    reporterContextHappenedAt: "When it happened",
    reporterContextFrequency: "How often",
    reporterContextImpact: "Impact",
    reporterContextIdentifiers: "Identifiers",
    reporterContextLanguage: "Language",
    reporterContextScreen: "Screen",
    reporterContextDevice: "Device",
    reporterContextOs: "OS",
    reporterContextAppVersion: "App version",
    reporterContextClientTimestamp: "Reported at (their clock)",
    findingsEmptyTitle: "No bugs yet",
    findingsEmptySubtitle:
      "Once I'm on duty, anything I find — or your team reports — shows up here.",
    findingsLoadFailed: "Couldn't load the bugs table.",
    viewPr: "View PR",
    searchLabel: "Search bugs",
    // Names every field it actually looks in. It searched title, file and repo
    // and said so; it now also reads the description and the reporter's name,
    // and a placeholder that under-promises is why nobody tried "Priya" in it.
    searchPlaceholder: "Search title, description, file, repo or reporter…",
    clearFilters: "Clear filters",
    // ── The filter panel ──────────────────────────────────────────────────────
    // One button holding eight facets, rather than eight controls on a row that
    // already wrapped. See FindingsFilterBar for the argument, and for why the
    // active values stay visible as pills while the panel itself is shut.
    // ── Page sections ─────────────────────────────────────────────────────────
    // Named for the question each answers, not for what they contain. "Work" is
    // the triager's daily surface; the monthly governance numbers moved to
    // Analytics → Bug Agent (OPP-0749) — see BugHunter.tsx.
    sectionWork: "Work",
    sectionNotebook: "Notebook",
    filtersButton: "Filters",
    filtersPanelLabel: "Filter bugs",
    filterSectionRepo: "Repo",
    filterSectionSeverity: "Severity",
    filterSectionSource: "Source",
    filterSectionAge: "Age",
    filterSectionClear: "Clear",
    filterAgeAll: "Any age",
    filterAgeDay: "Found today",
    // The two "over" bands use the same week/month boundaries as the amber and
    // red tints in the Age column, so what the filter returns is exactly what
    // the column had already coloured. Worded as the reader reads the tint.
    filterAgeWeek: "Under a week old",
    filterAgeStale: "Over a week old",
    filterAgeAncient: "Over a month old",
    filterDuplicatesOnly: "Duplicates only",
    filterPillRemove: "Remove the {label} filter",
    // Distinct from findingsEmptyTitle on purpose: "Once I'm on duty, anything
    // I find shows up here" is the wrong thing to tell someone who has just
    // typed a typo into the search box.
    noMatchTitle: "Nothing here matches those filters",
    noMatchSubtitle: "Clear them, or try another tab.",
    // "Showing 1 of 1 bugs" is both ungrammatical and redundant, so a single
    // match gets its own line rather than a template with a plural stuck on it.
    resultSummaryOne: "Showing 1 bug",
    resultSummary: "Showing {shown} of {matched} bugs",
    // Replaces the workload strip's footnote, which apologised for a
    // denominator ("a picture of this week, not an all-time total") next to
    // numbers that could not be filtered. Said here instead, where the filters
    // are, and only when the window is actually smaller than the table.
    windowNotice:
      "These filters search my {loaded} most recent bugs, of {total} I've tracked in total.",
    // Named for the fetch it triggers, not vaguely "Show more" — clicking it
    // asks the server for the next `{count}` bugs rather than revealing rows
    // already sitting in memory, so the number said is a promise about a
    // network request.
    loadMoreAction: "Load {count} more",
    loadMorePending: "Loading…",
    rowOpenLabel: "Open bug: {title}",
    duplicateTag: "×{count}",
    duplicateTooltip:
      "{count} bugs in this list share a title, repo and status. I keep them as separate records rather than merging them, so a decision on one never silently applies to the others.",
    pagePrev: "Previous",
    pageNext: "Next",
    pageStatus: "Page {page} of {pages}",
    pageSizeLabel: "Rows",
    // Two halves of one sentence: the prompt states the situation, the button
    // states what clicking it will do — and both name the number, because
    // "select all" over a filtered list that spans five pages is exactly the
    // control people press without knowing how much it grabbed.
    selectAllMatchingPrompt: "Your selection covers this page only.",
    selectAllMatchingAction: "Select all {count} matching bugs",
    // A poll failed while rows were already on screen. Deliberately not the
    // same words as findingsLoadFailed: nothing is missing from the page, the
    // rows are just from a minute ago.
    findingsStaleNotice: "Showing the last bugs I loaded — my latest check didn't get through.",
    // ── Finding drawer ────────────────────────────────────────────────────────
    drawerDescriptionTitle: "Description",
    // ── Editing the brief ─────────────────────────────────────────────────────
    // Written from Bug Hunter's side of the exchange, like the rest of this
    // tab: what the admin is changing is what I will be told to fix, and
    // saying so is the whole justification for the control existing.
    drawerDescriptionEdit: "Rewrite the description",
    drawerDescriptionEditHelp: "I work from these words and nothing else.",
    drawerDescriptionEditLabel: "The bug, as you want me to understand it",
    drawerDescriptionEditPlaceholder:
      "What breaks, when it breaks, and what should happen instead…",
    drawerDescriptionEditSave: "Save description",
    drawerDescriptionEditCancel: "Cancel",
    drawerDescriptionEditFailed: "Couldn't save that description. Try again.",
    drawerDescriptionEditTooLong:
      "That's longer than I can take as a brief ({length} of {max} characters). Paste raw output into a comment on the PR instead — this field is what I read before I start.",
    drawerDescriptionEditedBy: "Rewritten by {name}",
    drawerDescriptionShowOriginal: "See what I originally found",
    drawerDescriptionHideOriginal: "Hide what I originally found",
    drawerDescriptionOriginalTitle: "Originally",
    drawerDescriptionSettleFirst:
      "Save or cancel your rewrite first — right now I'd still be working from the old description.",
    drawerEvidenceTitle: "Evidence",
    drawerTimelineTitle: "My work log",
    drawerTimelineEmpty: "I haven't touched this one yet.",
    drawerLoadFailed: "Couldn't load this bug's details.",
    drawerLoading: "Loading this bug…",
    // ── The header: one meta line, and a menu for everything that isn't the decision ──
    drawerMoreActions: "More actions",
    drawerFoundAgo: "found {age} ago",
    drawerFoundJustNow: "found just now",
    drawerLastRunOn: "Last run on {model}",
    // ── The decision block's one status sentence, per lifecycle state ─────────
    // One sentence that says where the bug is and what happens next, in place
    // of the badge, banner and spinner that used to each say part of it.
    drawerStatusNew: "I haven't looked at this one yet.",
    drawerStatusPendingApproval: "Waiting for your call before I fix it.",
    drawerStatusApproved: "Approved. I'll fix it on my next sweep, or put me on it now.",
    drawerStatusFixing: "I'm working on the fix now.",
    drawerStatusCoordinating: "I'm working through a fix that spans several repos, one at a time.",
    drawerStatusBlocked: "Waiting for an earlier step of this fix to land first.",
    drawerStatusAnswerReceived: "Thanks. I'll carry on with your answer.",
    drawerStatusPrOpened: "My fix is in a pull request, waiting for your merge.",
    drawerStatusMerged: "The fix is merged. Users get it once it's released.",
    drawerStatusCancelled: "You stopped my fix session. Nothing from it was merged.",
    drawerStatusDismissed: "I dropped this one.",
    drawerStatusRejected: "You turned this down.",
    // ── Collapsed sections ───────────────────────────────────────────────────
    drawerSectionConfidence: "How sure I am",
    drawerSectionPlan: "How I planned the fix",
    // ── Who did what, merged into the work log ───────────────────────────────
    drawerAuditApproved: "approved it",
    drawerAuditDeclined: "turned it down",
    drawerAuditReleased: "released it to production",
    drawerAuditStopped: "stopped the fix session",
    drawerAuditAnswered: "answered: {answer}",
    drawerAuditSomeone: "An admin",
    drawerReportedBugNotice: "Your team reported this. I haven't triaged it yet.",
    drawerGuardedPathNotice:
      "This touches a guarded path — migrations, auth or payments — so I'll never merge it myself, however small the fix turns out to be.",
    drawerApprove: "Approve — go fix it",
    drawerReject: "Reject",
    drawerApproveConfirmTitle: "Approve this bug for me to fix?",
    drawerApproveConfirmBody:
      'I\'ll pick it up in the fix stage of my next sweep for this repo. If you want it done now, use "Put me on it" instead.',
    drawerApproveConfirmBodyNoRush:
      "I'll pick it up in the fix stage of my next sweep for this repo. Once it's approved you can also put me on it straight away.",
    drawerRejectConfirmTitle: "Reject this bug?",
    drawerRejectConfirmBody: "I'll never pick it up. This can't be undone.",
    // ── declining a bug: the reason, and what it is for ────────────────────
    // Written in Bug Hunter's own first-person voice, like the rest of this
    // block (see agentPersona.ts): the reader is answering a colleague who
    // wants to know whether it got this one wrong, not filling in a database
    // field.
    declineReasonLabel: "Why are you turning it down?",
    declineReasonHelp:
      "I read these back before my next sweep, so I stop re-filing the ones I got wrong. It's also how the scorecard works out how often I'm right.",
    declineNotABug: "It isn't a bug",
    declineNotABugHint: "I misread the code. Tell me and I won't file it again.",
    declineWontFix: "Real, but not worth fixing",
    declineWontFixHint:
      "I got this right — it just isn't worth the change. I may raise it again if it starts mattering.",
    declineDuplicate: "Already tracked elsewhere",
    declineDuplicateHint: "Same bug as something you already have.",
    declineWrongRepo: "Real, but in a different codebase",
    declineWrongRepoHint: "I pointed at the wrong repo. File it where it belongs.",
    declineTooRisky: "Too risky to fix this way",
    declineTooRiskyHint: "The fix would cost more than the bug. Somebody should do this by hand.",
    declineOther: "Something else",
    declineOtherHint: "Add a note so this is worth reading later.",
    declineNoteLabel: "Anything to add? (optional)",
    declineNotePlaceholder: "What did you check, and what settled it?",
    declineNoteTooLong: "That's longer than I can store — {max} characters at most.",
    declineReasonRequired: "Pick a reason first.",
    bulkDeclineOneReason: "The same reason goes on all {count}.",
    drawerDeclinedAs: "Turned down: {reason}",
    drawerRediscovered:
      "I have found this again {count} time(s) since. I am not re-filing it while your decision stands.",

    // ── the decision log, scoreboard and replay (OPP-0776) ────────────────
    decisions: {
      title: "How I decided",
      runTitle: "How I planned this run",
      empty: "No decisions recorded yet.",
      pointD1: "which senses",
      pointD2: "which model",
      pointD3: "verify, hold or drop",
      pointD4: "which Verifier",
      pointD5: "fix now or hold",
      pointD6: "approach and model",
      pointD7: "retry, escalate or ask",
      pointD8: "merge",
      ownerRule: "the rule",
      ownerModel: "the model",
      byOwner: "by {owner}",
      shadowWouldHave: "{owner} would have: {pick}",
      shadowAgreed: "both agreed",
      veto: "veto ({by}): {reason}",
      approach: "Approach: {approach}",
      outcomeBetter: "turned out well",
      outcomeWorse: "turned out badly",
      outcomeSame: "same either way",
    },
    scoreboard: {
      title: "Scoreboard — which sense and model is winning where",
      subtitle:
        "The last {days} days on {repo}: what each sense filed and how much of it was accepted, which model it ran on, and how each model does as a fixer. The Finder's D1, D2 and D6 read these cells.",
      repoLabel: "Repo",
      bySense: "By sense",
      byModel: "By finder model",
      fixers: "As a fixer",
      colSense: "Sense",
      colModel: "Model",
      colFiled: "Filed",
      colAccepted: "Accepted",
      colDeclined: "Declined",
      colPending: "Pending",
      colAcceptance: "Acceptance",
      colSessions: "Sessions",
      colMerged: "Merged",
      colFailed: "Failed",
      colVerdicts: "Verifier pass / fail",
      acceptanceTooltip:
        "Accepted over ruled-on (accepted + declined as finder error). Pending findings are left out. Fewer than 5 ruled on reads as a dash: too thin to call.",
      empty: "Nothing filed on this repo in the window.",
      fixersEmpty: "No fix sessions on this repo in the window.",
      colHeld: "Held / came back",
      colHeldTooltip:
        "Released and re-checked in production with the symptom gone (link six of the chain) / fixes that came back: refused at the wrong layer, reverted, regressed or found back in production. This is the number I learn from, not merged.",
      wrongFixesTitle: "Where my fixes broke",
      wrongFixesCaption:
        "Every fix that turned out wrong in the window, by the link of the case chain that broke. A link that keeps breaking is a failure class before anyone names it.",
      wrongFixesEmpty: "No fix has turned out wrong in this window.",
      wrongFixesLinks: {
        observed: "observed",
        reproduced: "reproduced",
        located: "located",
        changed: "changed in that mechanism",
        resolved: "resolved for the reporter",
        held: "held after release",
      },
      wrongFixesSource: {
        verifier: "Verifier refused",
        regression: "came back in a sweep",
        revert: "reverted by a person",
        held_check: "back after release",
      },
      thin: "—",
      replayTitle: "Decision replay — should the other owner take a point?",
      replaySubtitle:
        "Per decision point: how often the owner and its shadow disagreed, and who turned out right, judged by what happened to the case. A point flips to the other owner once the shadow has won {threshold} disagreements and more than the owner. The flip itself is a setting on Settings → AI models.",
      colPoint: "Point",
      colOwner: "Owner now",
      colDecisions: "Decisions",
      colAgreed: "Agreed",
      colDisagreed: "Disagreed",
      colOwnerWins: "Owner right",
      colShadowWins: "Shadow right",
      colVetoes: "Vetoes",
      colVerdict: "Verdict",
      verdictFlip: "flip",
      verdictKeep: "keep",
      verdictNotEnough: "not enough cases",
      verdictFixed: "fixed",
      replayEmpty: "No decisions in the window yet.",
    },

    // ── "Today, by repo" — Analytics → Bug Agent, beside the shift log ──────
    today: {
      title: "Today, by repo",
      // Every column counts since midnight except open PRs, which is the live
      // number; the subtitle says so rather than letting the one exception
      // pass for a day's count.
      subtitle: "{date}, since midnight India time. Open PRs is the live count.",
      colRepo: "Repo",
      colSweeps: "Sweeps",
      colFound: "Found",
      colVerified: "Verifier on findings",
      colSessions: "Fix sessions",
      colFixVerdicts: "Verifier on fixes",
      colPrsOpen: "Open PRs now",
      colPrsOpenTooltip:
        "Fix pull requests open right now, whatever day they were opened. Every other column counts since midnight.",
      colMerged: "Merged",
      colReleased: "Released",
      colSpend: "Spend",
      total: "Total",
      sweepsDone: "done",
      sweepsFailed: "failed",
      sweepsRunning: "running",
      sweepsSkipped: "skipped",
      verifiedWord: "confirmed",
      refutedWord: "refuted",
      passedWord: "passed",
      failedWord: "failed",
      sessionsAuto: "by me",
      sessionsByYou: "by you",
      sessionsRunning: "running",
      sessionsFailed: "failed",
    },

    // ── the independent verifier's view of a finding (OPP-0780) ───────────
    drawerIndependentPending: "My independent verifier is still reading this",
    drawerIndependentConfirmed: "Confirmed by my independent verifier",
    drawerIndependentRefuted: "Refuted by my independent verifier",
    drawerIndependentUnsure: "My independent verifier could not settle this; it is yours to decide",
    drawerFaultLocated: "Fault located in {layer}",
    drawerFaultLocatedRepo: "Fault located in {layer} ({repo})",
    drawerFaultEvidence: "What I saw in production",
    drawerFaultRepair: "The repair a person makes",
    drawerFaultDataNote:
      'This is not a code bug, so I will not start a fix session on it. Once the repair is made, reject it with "Something else" and a note, or re-open the report if it persists.',
    drawerLocateFirstNote:
      "This is a human report I haven't located yet. Pressing Locate sends my verifier to reproduce it against production first and say whether the fault is in code, data or configuration; a code fault then goes to a fix session on its own.",
    drawerLocateFirstForceLabel: "Skip locating, start the fix session now",
    drawerLocateFirstForceHelp:
      "Only if you already know the fault is in this repo's code. A fix that starts from the symptom alone is how the wrong layer gets fixed.",
    drawerLocateFirstStart: "Locate the fault",
    drawerIndependentTooltip:
      "A separate run on a different model tries to reproduce this and refute it.",

    // ── the Verifier's verdict on a fix (OPP-0779) ────────────────────────
    drawerVerdictPass: "My Verifier passed this fix",
    drawerVerdictFail: "My Verifier refused this fix",
    drawerVerdictTooltip: "A separate run on a different model checks my PR before it's merged.",
    drawerVerdictBy: "Read on {engine}",
    drawerVerdictCheckSkipped: "skipped: {reason}",

    // ── the case file's budget (OPP-0775) ─────────────────────────────────
    drawerBudgetLabel: "What I've spent on this bug",
    drawerBudgetTooltip: "I stop starting sessions on my own once any cap is spent.",
    drawerBudgetSummary:
      "{sessions} of {sessionsCap} sessions · {attempts} of {attemptsCap} attempts · ${usd} of ${usdCap}",
    drawerBudgetExhausted: "Budget spent ({kind}). I won't start another session on my own.",
    drawerBudgetOverridden: "You started a session past the budget on {date}.",
    drawerFixSessionForceLabel: "Start anyway, past the budget",
    drawerFixSessionForceHelp:
      "Read what the last session left behind first. I'll note that you overrode the budget.",

    // ── why a reported bug was missed (OPP-0774) ───────────────────────────
    // Written by the miss classifier a moment after a person files a bug. The
    // reader is whoever decides what Bug Hunter should learn to look at next,
    // so the sense is named as a thing to build or fix, not as an enum.
    drawerMissTitle: "Why I didn't find this first",
    drawerMissTooltip: "Which sense would have caught it, so I learn to look there next.",
    drawerMissWouldNeed: "What would have caught it: {sense}",
    drawerMissSeeMatched: "See what I had already found",
    missNoSense: "I have no sense that could have seen this",
    missSenseMissed: "A sense I have should have caught this and didn't",
    missDetectedDeclined: "I had found this, and it was turned down",
    missDetectedNotFixed: "I had found this, and it wasn't fixed or released in time",
    missNotAMiss: "Not a miss on my part",
    missSenseProductionLog: "my production-log reader",
    missSenseBrowserErrors: "my browser-error reader",
    missSenseUxSignal: "my UX-signal scan",
    missSenseCodeReview: "my nightly diff review",
    missSenseTests: "the test and lint run",
    missSenseUserJourney: "walking the real screens in a browser or on a device",
    missSenseDataIntegrity: "a nightly check over production data",
    missSenseVoiceQa: "listening to live roleplay audio",
    missSenseApiContract: "exercising the API with seeded data",
    missSenseVisual: "a design-consistency pass over screens",
    missSenseLocaleParity: "comparing locale files and rendered text against English",
    missSenseMobileCrash: "a crash signal from the mobile app",
    missSenseStaticContent: "a check for placeholder text in shipped HTML and meta tags",
    missSenseLlmOutputEval: "judging generated text against its brief",

    // ── the post-mortem a failed fix session leaves behind ─────────────────
    // Read by two audiences: the admin deciding whether to press "Ask me to
    // try again", and (through the dossier) the session that retries. The
    // labels name what each line is FOR, not the field it came from.
    drawerPostmortemTitle: "Why my last fix session failed",
    drawerPostmortemTooltip: "The next session reads this before it starts.",
    drawerPostmortemShowAll: "Show the full post-mortem",
    drawerPostmortemHideAll: "Hide the full post-mortem",
    drawerPostmortemRecorded: "From my session of {date}",
    drawerPostmortemAttempts: "{count} attempt(s) · {check}",
    drawerPostmortemLastFailure: "Last failure",
    drawerPostmortemRootCause: "What I think is really wrong",
    drawerPostmortemWhyFailed: "Why my fixes didn't hold",
    drawerPostmortemTryNext: "What a retry should do differently",
    drawerPostmortemGotcha: "A trap in this repo I hit (now in my notebook)",

    // ── the study a fix session writes before it changes any code ─────────
    // Shown so a reviewer reads the reasoning behind a diff, not only the
    // diff: where I said the value lives decides whether the fix is the
    // right shape at all.
    drawerStudyTitle: "How I understood it before fixing",
    drawerStudyTooltip: "What I read and planned before changing any code.",
    drawerStudyRecorded: "From my session of {date}",
    drawerStudyFeature: "The feature",
    drawerStudyHowItWorks: "How it works today",
    drawerStudyValueLivesIn: "Where the value lives",
    drawerStudyValueHomes: {
      database: "a database table an admin edits",
      locale_file: "the locale JSON files",
      config: "configuration",
      code: "code",
      other_repo: "another codebase",
      mixed: "more than one place",
    },
    drawerStudySibling: "The working example I compared against",
    drawerStudyRootCause: "Root cause",
    drawerStudyApproach: "The fix I planned",
    drawerStudyFiles: "Files I planned to change",
    drawerStudyLeaveAlone: "Left alone on purpose",
    drawerStudyOtherRepos: "Other codebases a complete fix needs",
    drawerStudyConsumers: "Who else reads this value",
    drawerStudyConsumersNone: "Nobody else found",
    drawerStudyConsumersSearch: "How it searched",
    drawerStudyRisks: "Risks",
    drawerStudyTestPlan: "The regression test",
    drawerStudyPreviousWrong: "What my earlier study got wrong",
    drawerStudyReviewNone: "Reviewed by {model}: no concerns.",
    drawerStudyReviewConcerns: "Reviewed by {model} — concerns I had to answer:",
    drawerStudyReviewUnknownModel: "a second model",

    // ── confidence and regressions ─────────────────────────────────────────
    drawerConfidenceLabel: "How sure my checkers were",
    drawerConfidenceTooltip: "The lower of two independent verifiers' scores.",
    drawerConfidenceUnscored: "Not scored",
    drawerConfidenceUnscoredTooltip:
      "Proven outright by a failing test or a real error, or found before I scored findings.",
    findingLowConfidenceChip: "Low confidence",
    findingLowConfidenceTooltip:
      "Both checkers accepted it but at least one wasn't sure. I hold these for you rather than fixing them myself.",
    findingRegressedChip: "Came back",
    findingRegressedTooltip:
      "I fixed and shipped this, and it is happening again. Worth checking whether the root cause was the one I found.",
    findingRegressionOfChip: "Fix didn't hold",
    drawerRegressionOfLink: "See the fix that didn't hold",
    drawerRegressedByLink: "See where it came back",

    // ── merging a green PR from here ───────────────────────────────────────
    drawerMerge: "Merge it",
    drawerMergeConfirmTitle: "Merge this fix to master?",
    drawerMergeConfirmBody:
      "I'll merge the PR as you. This does NOT deploy it — releasing to production is still a separate press.",
    drawerMergeConfirm: "Merge",
    drawerMergeChainIncomplete:
      "The case chain is not complete: {links}. I merge only a fix I can trace from the symptom to the change. If you have read the chain and still want it, tick the box.",
    drawerMergeForceLabel: "Merge anyway — I've read the chain",
    drawerMergeForceHelp:
      "Recorded with the merge. This is how #792 landed with the wrong layer fixed; please read first.",
    drawerChainTitle: "The chain",
    drawerChainTooltip: "I merge only when the first five links hold.",
    drawerChainLinks: {
      observed: "Observed",
      reproduced: "Reproduced",
      located: "Located",
      changed: "Changed in that mechanism",
      resolved: "Resolved for the reporter",
      held: "Held after release",
    },
    drawerChainStatus: {
      present: "present",
      weak: "weak",
      missing: "missing",
      broken: "broken",
    },
    drawerMergeFailed: "Couldn't merge that PR.",
    queueAwaitingMerge: "Green and waiting for your merge",
    drawerDecisionFailed: "Couldn't record that decision. Try again.",
    drawerEscalationQuestionTitle: "I need your answer",
    drawerAnswerLabel: "Your answer",
    drawerAnswerPlaceholder: "Answer my question…",
    drawerAnswerSubmit: "Send answer",
    drawerAnswerFailed: "Couldn't send that answer. Try again.",
    // ── The notebook ─────────────────────────────────────────────────────────
    notebookTitle: "My notebook",
    notebookIntro:
      "What I write down at the end of a run so the next one starts smarter — where bugs hide, what turned out not to be one, how a hard fix was made to work. You can add to it too. I read the strongest entries for a repo before every sweep and search the rest as I work.",
    notebookRepoLabel: "Repo",
    notebookRepoAll: "Platform-wide only",
    notebookEmpty:
      "Nothing written for this scope yet. It fills in as sweeps finish, or start it off below.",
    notebookLoading: "Reading the notebook…",
    notebookError: "Couldn't read the notebook right now.",
    notebookSeen: "seen {count}×",
    notebookPinned: "Pinned",
    notebookByMe: "written by me",
    notebookByHuman: "added by an admin",
    notebookPlatformWide: "every repo",
    notebookRetire: "Retire",
    notebookRetireConfirmTitle: "Retire this entry?",
    notebookRetireConfirmBody:
      "It stops being read before sweeps and stops turning up in searches. Nothing is deleted, and an admin can write it again.",
    notebookRetireConfirm: "Retire it",
    notebookRetired: "Retired.",
    notebookRetireFailed: "Couldn't retire that entry.",
    notebookAddTitle: "Add an entry",
    notebookAddHint:
      "One lesson, written for someone who wasn't there: name the repo, the file or command, and the symptom. Under {max} characters.",
    notebookAddLabel: "What should the next sweep know?",
    notebookAddPlaceholder:
      "e.g. ally-web: the admin dashboard suite needs NX_DAEMON=false or unrelated tests fail with a socket error — rerun before filing it as a bug.",
    notebookAddTooLong: "{length} of {max} characters — trim it to the one lesson.",
    notebookAddRepoLabel: "Applies to",
    notebookAddRepoAll: "Every repo",
    notebookAddTagsLabel: "Tags (optional, comma-separated)",
    notebookAddTagsPlaceholder: "flaky-test, false-positive, fix-gotcha",
    notebookAddPinLabel: "Pin it",
    notebookAddPinTooltip:
      "A pinned entry is a person's decision: the hourly curator never edits or retires it.",
    notebookAddButton: "Add to notebook",
    notebookAddButtonBusy: "Adding…",
    notebookAdded: "Added. I'll read it before the next sweep.",
    notebookAddFailed: "Couldn't add that entry.",
    notebookReadOnly: "You can read the notebook; adding and retiring needs the Bug Hunter toggle.",
    // ── What the agent retired on its own (OPP-0752) ─────────────────────────
    notebookRetiredByMeTitle: "Retired by me recently ({count})",
    notebookRetiredByMeIntro:
      "Entries I took out of my own notebook in the last 30 days, each with the rule that fired. Put one back if I got it wrong.",
    notebookRetiredBecause: "Retired {when} because: {reason}",
    notebookRestore: "Put it back",
    notebookRestored: "Back in the notebook. I'll read it before the next sweep.",
    notebookRestoreFailed: "Couldn't restore that entry.",
    // ── Multi-repo plan ──────────────────────────────────────────────────────
    planTitle: "This fix spans {count} repos",
    planSubtitle:
      "I work through them in this order and release them in the same order — each one waits for the one before it.",
    planStepLabel: "Step {n}",
    // ── Fix session (on-demand) ──────────────────────────────────────────────
    drawerStartFixSession: "Put me on it",
    drawerRetryFixSession: "Ask me to try again",
    drawerFixSessionConfirmTitle: "Put Bug Hunter on this bug?",
    drawerFixSessionConfirmBody:
      "I'll work on this in {repo} on my own: a regression test first, then the smallest fix that makes it pass, then the full suite. If everything is green I open a PR and merge it — unless the fix touches migrations, auth or payments, which always stay a PR for you to review. I won't deploy anything in this step.",
    drawerFixSessionRepoLabel: "Which codebase?",
    drawerFixSessionRepoAuto: "Let me work it out",
    drawerFixSessionRepoHelp:
      "Pick one if you know it. If I couldn't tell from the description, this is how you answer.",
    drawerFixSessionConfirmBodyUnknownRepo:
      "Nobody has matched this bug to a codebase yet — I'll figure out which repo it needs, then work on it there on my own: a regression test first, then the smallest fix that makes it pass, then the full suite. If everything is green I open a PR and merge it — unless the fix touches migrations, auth or payments, which always stay a PR for you to review. I won't deploy anything in this step.",
    // Deliberately not "Put me on it" again — the button that opened this
    // dialog says that, and two identical labels on screen at once make it
    // ambiguous which one you're confirming.
    drawerFixSessionStart: "Start now",
    drawerFixSessionFailed: "Couldn't start the fix session.",
    drawerFixSessionQueued:
      "I'm waiting for a runner to pick this up. It usually starts within a minute or two.",
    drawerWatchSession: "Watch me work",
    // ── Stop fix session (manual kill switch) ────────────────────────────────
    drawerStopFixSession: "Stop fix session",
    drawerStopFixSessionConfirmTitle: "Stop this fix session?",
    drawerStopFixSessionConfirmBody:
      "I'll cancel the GitHub Actions run in progress right away. Whatever I've done so far is lost — nothing partial gets merged. You can put me back on this bug afterward, the same as after a failed attempt.",
    // Deliberately not "Stop fix session" again — the button that opened this
    // dialog says that, and two identical labels on screen at once make it
    // ambiguous which one you're confirming.
    drawerStopFixSessionConfirm: "Stop it",
    drawerStopFixSessionFailed: "Couldn't stop the fix session.",
    // ── Release to production ────────────────────────────────────────────────
    drawerRelease: "Release to production",
    drawerReleaseRetry: "Retry release",
    drawerReleaseConfirmTitle: "Release this fix to production?",
    drawerReleaseConfirmBody:
      "This deploys {target} to production at the next patch version, running its full release pipeline — tests, build, database migration where applicable, and rollout. It affects live users. The fix is already merged to master either way; releasing is what puts it in front of people.",
    drawerReleaseConfirm: "Release",
    drawerReleaseFailed: "Couldn't start the release.",
    drawerReleasingNotice:
      "I'm running release {tag} now. This page updates as it goes — a backend release takes around 15 minutes.",
    drawerReleasedNotice: "This is live in production as {tag}.",
    // No tag: the release was cut from GitHub by a person, not from this tab,
    // and the run does not say which version it shipped — so the banner says
    // how it went live rather than printing "as —".
    drawerReleasedOutOfBandNotice:
      "This is live in production. It went out in a release somebody ran from GitHub after the fix merged — I didn't start that release.",
    drawerReleaseFailedNotice:
      "Release {tag} went red. The fix is still merged to master — it just isn't deployed. Check the run, then ask me to retry.",
    drawerFixSessionFailedNotice: "The fix session failed. Start a new session to retry.",
    drawerReleaseBlocked: "Why I can't release this from here",
    drawerReleaseTargetFallback: "this service",
    drawerViewReleaseRun: "View release run",
    // ── Shift log (was run history) ──────────────────────────────────────────
    historyTitle: "My shift log",
    historySubtitle: "Every sweep I've run, newest first. Open one to see what I did.",
    columnRepo: "Repo",
    columnTrigger: "Trigger",
    columnStatus: "Status",
    columnFound: "Found",
    columnAutoMerged: "Auto-merged",
    columnPrPending: "PR pending review",
    columnDismissed: "Dismissed",
    columnCost: "Est. cost",
    columnTokens: "Tokens",
    columnStarted: "Started",
    // Rewritten because the old wording ("Bugs I identified on that sweep") read
    // as "new bugs", and on a normal night most of this number is bugs your team
    // filed earlier that I re-read — rows that already existed and kept their
    // original date. That mismatch is what made a sweep of ten look like a sweep
    // that lost ten. Now the number says what it counts, and clicks through to
    // the rows so nobody has to take my word for it.
    columnFoundTooltip:
      "Bugs I looked at on that sweep, across all four sources — tests, code review, logs and bugs your team reported. Not all of them are new: re-reading a bug your team filed weeks ago counts here too, and that bug keeps its original date in my table. Click the number to see exactly which bugs this was.",
    columnAutoMergedTooltip:
      "Trivial fixes I merged myself: lint or type-only, or backed by a new red-then-green regression test.",
    columnPrPendingTooltip:
      "Everything else I found — opened as a pull request and waiting on your review. Each one is in my bugs table above.",
    columnCostTooltip:
      "USD reported by the Claude Code CLI for that run, including prompt-cache pricing — falls back to a cache-blind token estimate for older runs. Not a live figure while the sweep is still going.",
    columnTokensTooltip:
      "Raw input/output tokens behind the estimated cost. Shown as — for runs from before this was tracked.",
    triggerScheduled: "Nightly",
    triggerManual: "On demand",
    triggerFixSession: "Fix session",
    triggerVerifyFix: "Verifier (fixes)",
    triggerVerifyFindings: "Verifier (findings)",
    triggerPrReview: "PR review",
    triggerFeatureMap: "Feature map",
    featureMapTitle: "How features work",
    featureMapIntro:
      "One card per feature: where its values are stored, who writes them, which endpoint carries them and which screen shows them, across repos. A read-only run writes these every week, and every study reads the matching cards before it opens a file. Each card names the commit it describes.",
    featureMapRepoLabel: "Repo",
    featureMapRepoAll: "All repos",
    featureMapRefresh: "Map now",
    featureMapRefreshTooltip:
      "Starts the weekly read-only map run now. It reads the code, refreshes cards whose files changed and adds missing ones. It never edits a repo, but it does spend model tokens.",
    featureMapRefreshConfirmTitle: "Start a feature-map run now?",
    featureMapRefreshConfirmBody:
      "I'll read {scope} and refresh the cards whose files changed since they were written. Nothing in the repo changes. A run costs about as much as a quiet nightly sweep.",
    featureMapRefreshConfirm: "Start mapping",
    featureMapRefreshStarted:
      "Mapping started: {count} run(s). Cards appear here as each run finishes.",
    featureMapRefreshNone: "Nothing started. Bug Hunter is off, or GitHub refused the run.",
    featureMapRefreshFailed: "Couldn't start the map run.",
    featureMapLoading: "Loading feature cards…",
    featureMapError: "Couldn't load the feature map.",
    featureMapEmpty: "No cards yet. The weekly map run writes them; start one now with Map now.",
    featureMapEntryPoints: "Starts in",
    featureMapEndpoints: "Endpoints",
    featureMapDataHomes: "Values live in",
    featureMapWrittenBy: "Written by",
    featureMapRelated: "Other repos",
    featureMapGotchas: "Gotchas",
    featureMapMappedAt: "Mapped at {sha} on {when}",
    featureMapReadOnly: "You can read the feature map. Starting a map run needs triage access.",
    featureMapSource: {
      database: "From the database",
      locale_file: "From translation files",
      config: "From config",
      code: "From code",
      external: "From a third-party service",
    } as Record<string, string>,
    featureMapSourceTooltip:
      "Where the value this card is about comes from. Content from the database is fixed at its writer or its data, never on the screen; labels are fixed in the translation files.",
    featureMapWrong: "Wrong card",
    featureMapWrongTitle: "Remove this card as wrong",
    featureMapWrongIntro:
      "The card is deleted. Your reason goes into my notebook, and the next map run reads it so it doesn't write the same card again.",
    featureMapWrongReasonLabel: "What's wrong with it",
    featureMapWrongReasonPlaceholder:
      "e.g. Describes UI label bundles, but simulation titles come translated from ally-be's database.",
    featureMapWrongSubmit: "Remove card",
    featureMapWrongDone: "Card removed. The next map run will read your reason.",
    featureMapWrongFailed: "Couldn't remove the card.",
    statusRunning: "Running",
    statusCompleted: "Completed",
    statusFailed: "Failed",
    statusSkippedDisabled: "Skipped (off duty)",
    statusSkippedQuiet: "Skipped (quiet night)",
    emptyTitle: "No shifts yet",
    emptySubtitle: "Put me on duty above and my first sweep will show up here.",
    loadFailed: "Couldn't load the shift log.",
    retry: "Try again",
    // ── Run detail (expanded row) ────────────────────────────────────────────
    detailEventsTitle: "What I did",
    detailLoadFailed: "Couldn't load this sweep's timeline.",
    // ── Pipeline rail (scan → verify → fix → review → merged → ship) ────────
    pipelineRailLabel: "Pipeline stage",
    pipelineStageScan: "Scan",
    pipelineStageVerify: "Verify",
    pipelineStageFix: "Fix",
    pipelineStageReview: "Review",
    pipelineStageMerged: "Merged",
    pipelineStageShip: "Ship",
    // The dense rail has no visible stage names, so its group name carries
    // them — see the `dense` prop in PipelineRail.tsx.
    pipelineRailDenseLabel: "Pipeline stage: {stage}, step {step} of {total}",
    // ── Age / staleness column ─────────────────────────────────────
    findingColumnAge: "Age",
    findingColumnAgeTooltip:
      "How long a bug has been on my list. I only colour it for bugs still waiting on a decision — something that shipped last month isn't stale, it's finished.",
    findingAgeStaleTooltip: "Waiting on a decision for over a week.",
    findingAgeAncientTooltip: "Waiting on a decision for over a month.",
    drawerPrReview: "Found reviewing pull request #{number}",
    drawerPrReviewCommented: "· my comment is on the PR",
    // ── The run scope ───────────────────────────────────────────────
    runScopeBanner: "Showing only the bugs my {repo} sweep at {timestamp} touched.",
    runScopeBannerLoading: "Showing only the bugs one sweep touched.",
    // The point of the sentence. "Found 10" meant ten rows touched, and most of
    // what a nightly sweep touches is bugs your team filed weeks ago — so the
    // ten were never going to be at the top of a table sorted by age, and the
    // only reading left was that they had gone missing.
    runScopeBannerHint:
      "Counts, tabs and filters below describe this sweep only. Some of these bugs are older than the sweep — I re-read what your team reported, so a bug filed weeks ago still counts as found on the night I looked at it.",
    runScopeClear: "Show all bugs",
    runScopeCellLabel: "Show the {count} bugs this {repo} sweep touched",
    // ── Row selection and the row's one next step ───────────────────
    rowSelectLabel: "Select bug: {title}",
    selectAllLabel: "Select every bug on this page",
    selectAllTooltip:
      "Selects the bugs on this page only — not the whole filtered list, and not the bugs I'm not currently holding.",
    // Screen-reader only: most rows have no button, so a visible heading would
    // promise a column of buttons that isn't there.
    quickActionsColumn: "Next step",
    // At most one per row, and only on rows that need a human (triage.ts
    // `nextStep`). Reject and "Put me on it" are in the drawer and the bulk bar.
    nextStepApprove: "Approve",
    nextStepAnswer: "Answer",
    nextStepRetry: "Try again",
    nextStepMerge: "Merge",
    nextStepRelease: "Release",
    quickActionFailed: "Couldn't record that. Try again.",
    // Deliberately not "Approve"/"Reject" again. The button or key that opened
    // the dialog says those, and two identical labels on screen at once make it
    // ambiguous which one you are confirming — the same rule the fix-session
    // dialog follows with "Start now".
    quickApproveConfirm: "Approve it",
    quickRejectConfirm: "Reject it",
    quickActionNotApplicable: "That doesn't apply to this bug from where it is.",
    // ── Bulk triage ─────────────────────────────────────────────
    bulkBarLabel: "Bulk decisions",
    bulkSelectedOne: "1 bug selected",
    bulkSelected: "{count} bugs selected",
    bulkApprove: "Approve {count}",
    bulkReject: "Reject {count}",
    bulkFix: "Put me on {count}",
    bulkClear: "Clear",
    // Approve and reject have different doors — approve needs "pending your
    // approval", reject also takes "new" — so each states its own scope rather
    // than sharing one sentence with the verb swapped in.
    bulkApproveScope: "{eligible} of {selected} can be approved from where they are.",
    bulkRejectScope: "{eligible} of {selected} can be rejected from where they are.",
    bulkFixScope: "{eligible} of {selected} can get a fix session from where they are.",
    bulkApproveNone: "Approving only applies to bugs pending your approval. None of these are.",
    bulkFixNone:
      "A fix session needs a bug that is still open and matched to a codebase. None of these are — open one to pick its repo.",
    bulkRejectNone:
      "Rejecting only applies to bugs that are new or pending your approval. None of these are.",
    bulkApproveConfirmTitle: "Approve {count} bugs for me to fix?",
    bulkApproveConfirmBody:
      "I'll pick them up in the fix stage of my next sweep for their repos. Anything that has moved on since you selected it is skipped, and I'll tell you which.",
    bulkApproveConfirm: "Approve them",
    bulkRejectConfirmTitle: "Reject {count} bugs?",
    bulkRejectConfirmBody:
      "I'll never pick them up, and this can't be undone. Anything that has moved on since you selected it is skipped, and I'll tell you which.",
    bulkRejectConfirm: "Reject them",
    bulkFixConfirmTitle: "Put me on {count} bugs?",
    bulkFixConfirmBody:
      "I'll start a fix session on each of them now rather than waiting for tonight's sweep — each one a full session with its own cost. Anything that has moved on since you selected it is skipped, and I'll tell you which.",
    bulkFixConfirm: "Start them",
    bulkProgress: "Working through {done} of {total}…",
    bulkApproveDoneOne: "Approved 1 bug.",
    bulkApproveDone: "Approved {count} bugs.",
    bulkRejectDoneOne: "Rejected 1 bug.",
    bulkRejectDone: "Rejected {count} bugs.",
    bulkFixDoneOne: "Started 1 fix session.",
    bulkFixDone: "Started {count} fix sessions.",
    // Partial failure is the ordinary case, not the exception: a selection made
    // fifteen seconds ago can hold a bug whose status has since moved. Both
    // halves get said, and the failures get named rather than counted.
    bulkPartial: "{done} done. {failed} didn't go through: {titles}.",
    bulkPartialMore: "{done} done. {failed} didn't go through: {titles}, and {rest} more.",
    bulkAllFailed: "None of those went through, so nothing changed.",
    shortcutsTitle: "Keyboard shortcuts",
    shortcutsIntro:
      "For working the list without reaching for the mouse. These apply whenever the bugs table is on screen and you aren't typing into a field.",
    shortcutsClose: "Close",
    shortcutsGroupMove: "Moving around",
    shortcutsGroupAct: "Acting on the bug you're on",
    shortcutsGroupSelect: "Selecting",
    shortcutMoveDown: "Next bug",
    shortcutMoveUp: "Previous bug",
    shortcutOpen: "Open it",
    shortcutEscape: "Close the drawer, or clear the selection",
    shortcutApprove: "Approve it",
    shortcutReject: "Reject it",
    shortcutFix: "Put me on it",
    shortcutToggleSelect: "Add it to the selection",
    shortcutSelectPage: "Select every bug on this page",
    shortcutSearch: "Jump to the search box",
    shortcutHelp: "Show this list",
    // ── Deep link ────────────────────────────────────────────
    drawerCopyLink: "Copy link",
    drawerCopyLinkDone: "Link copied.",
    drawerCopyLinkFailed: "Couldn't copy the link.",
  },

  builder: {
    tabLabel: "Builder",
    // ── Voice ────────────────────────────────────────────────────────────
    // Builder speaks in the first person about the work, present tense, and
    // says what happens next. The same split as Bug Hunter holds: the agent
    // speaks about the build ("I couldn't reach the repo"), the app speaks
    // about itself ("Couldn't load your sessions"). Having the agent
    // apologise for a failed fetch would misplace the fault.
    agentName: "Builder",
    agentRole: "Product engineer",

    // Mission control
    heroTitle: "What do you want to build?",
    heroSubtitle:
      "Describe it in a sentence. I'll ask what I need to know, write the PRD with you, then build it.",
    heroPlaceholder: "A weekly digest email summarising what shipped…",
    heroSubmit: "Start",
    newSession: "New build",
    needsYouHeading: "Needs you",
    activeHeading: "In progress",
    recentHeading: "Recent",
    emptyTitle: "No builds yet",
    emptyBody:
      "Start one above. The first few questions take about a minute, and you can leave and come back to it.",
    loadFailed: "Couldn't load your Builder sessions.",
    createFailed: "Couldn't start a new build.",
    searchPlaceholder: "Search builds…",
    filterButton: "Filter",
    filterStatusLabel: "Status",
    settingsLink: "Settings",
    // Links to the shared Model Settings hub (see `en.modelSettings`) —
    // distinct from `settingsLink` above, which is Builder's own full
    // settings page (kill switch, budget, repo maps) and still has its own
    // model-tier fields too.
    modelSettingsLink: "Model settings",
    pipelineLink: "Pipeline",
    scoreboardLink: "Scoreboard",
    knowledgeLink: "Knowledge",
    noMatchingSessions: "Nothing matches this filter.",

    // Session states, as a person would say them
    status: {
      INTERVIEWING: "Scoping",
      PRD_READY: "Ready to build",
      BUILDING: "Building",
      WAITING_FOR_INPUT: "Waiting on you",
      COMPLETED: "Done",
      FAILED: "Failed",
      CANCELLED: "Stopped",
    } as Record<string, string>,

    // Interview
    steer: {
      // Issue builds: opencode reads pull request comments.
      issueTitle: "Redirect opencode",
      issueHint: "To steer opencode, comment /oc followed by your instruction on the pull request.",
      issueHintChain: "To steer opencode, comment /oc on a pull request.",
      issueHintNoPr:
        "To steer opencode, comment /oc followed by your instruction on its pull request once it opens one.",
      issueOpenPr: (repo: string, prNumber: number) => `Open ${repo} #${prNumber}`,
    },
    // The feed rows, question cards and composer use the shared `agentChat` copy.
    chat: {
      heading: "Scoping",
      streamFailed: "That turn didn't finish. Try again.",
      droppedFrames: (count: number) =>
        count === 1
          ? "One update was lost in transit — the chat may be missing a line."
          : `${count} updates were lost in transit — the chat may be missing some lines.`,
      emptyTitle: "Tell me what you want to build",
      emptyBody:
        "A sentence is enough to start. I'll read the codebase and ask about what I can't work out on my own.",
    },

    // The living PRD
    prd: {
      heading: "PRD",
      versionLabel: (version: number) => `v${version}`,
      edit: "Edit",
      save: "Save",
      cancel: "Cancel",
      preview: "Preview",
      write: "Write",
      emptySection: "Nothing here yet.",
      saveFailed: "Couldn't save that edit.",
      lockedWhileBuilding:
        "The PRD is locked while a build is running — it's what the build is working from. Stop the build to edit it.",
      lockedCompleted:
        "This session is complete and its pull requests are open — the PRD stays as it was built. Start a new session for further changes.",
      sections: {
        summary: "Summary",
        problem: "Problem",
        usersAndContext: "Users & context",
        existingBehaviour: "What already exists",
        whereChangesBelong: "Where the change belongs",
        goals: "Goals",
        nonGoals: "Non-goals",
        requirements: "Requirements",
        assumptions: "Assumptions",
        technicalPlan: "Technical plan",
        testPlanMd: "Test plan",
        e2ePlanMd: "End-to-end checks",
        openQuestions: "Open questions",
      } as Record<string, string>,
      acceptanceCriteria: "Acceptance criteria",
      assumptionUnconfirmed: "Unconfirmed",
      assumptionConfirmed: "Confirmed",
      unnamedRepo: "Repo not chosen",
      noRequirements: "No requirements captured yet.",
      noAssumptions: "Nothing assumed so far.",
      noOpenQuestions: "Nothing outstanding.",
      export: {
        // "Download" rather than "Export": the file lands in the browser's
        // downloads folder, and nothing is sent anywhere.
        menuLabel: "Download this PRD",
        pdf: "Download as PDF",
        markdown: "Download as Markdown (.md)",
        // Says what the download is and, just as importantly, that it is a
        // snapshot — the agent keeps writing after you take one.
        hint: "Downloads the PRD as it stands right now — a snapshot, not a live copy. PDF to share or print; Markdown to paste into a ticket or a repo.",
        failed: "Couldn't build that file.",
        // Sub-title inside the exported file itself.
        metaLine: ({ version, repos, date }: { version: number; repos: string; date: string }) =>
          `PRD v${version} · ${repos} · exported ${date}`,
        dataModel: "Data model",
        api: "API",
        pageLabel: (page: number, total: number) => `Page ${page} of ${total}`,
        // The PDF's cover block — label/value rows under the logo.
        details: {
          prdName: "PRD name",
          date: "Date",
          builtBy: "Built by",
          version: "Version",
          repos: "Repos",
        },
        // When the creator's account is gone or the server didn't say.
        unknownAuthor: "Unknown admin",
        // PDF only: the interview that produced the PRD, kept as the record of
        // who decided what. The build never reads it — it works from the PRD.
        transcript: {
          heading: "Interview transcript",
          intro:
            "The full Builder conversation that produced this PRD — every question asked and how it was answered. Included for the record; the build works from the PRD above, not from this transcript.",
          empty: "No conversation recorded yet.",
          builder: "Builder",
          question: (n: number) => `Builder · Question ${n}`,
          whyAsked: (rationale: string) => `Why it was asked: ${rationale}`,
          options: "Options offered",
          recommended: "recommended",
          chosen: "chosen",
          answerBy: (name: string) => `${name} · Answer`,
          notAnswered: "Not answered.",
          failedTurn: (message: string) => `This turn failed: ${message}`,
          interrupted: "Stopped before it finished.",
        },
      },
    },

    // The technical design — drafted from the PRD by a read-only agent, then
    // approved before a build may start.
    design: {
      heading: "Technical design",
      statusNone: "Not drafted",
      statusDrafting: "Drafting",
      statusReview: "Ready for review",
      statusApproved: "Approved",
      statusFailed: "Failed",
      stale: "Out of date",
      staleHint:
        "The PRD changed after this design was drafted, so it no longer describes what will be built. Redraft it before building.",
      none: "No design yet. Builder reads the code and writes down which files change, which contracts move and which tests prove each requirement — before any code is written.",
      // An async job: say how long it takes and that nobody needs to wait on it.
      drafting:
        "The designer is reading the code — this takes a few minutes. You can leave this page; it carries on without you.",
      watchRun: "Watch on GitHub",
      failed: "The design run failed:",
      failedUnknown: "No reason was recorded.",
      approvedBy: (at: string) => `Approved ${at}`,
      draftedAt: (at: string) => `Drafted ${at}`,
      prdNotReady: "Finish the PRD first — the design is drafted from it.",
      draft: "Draft technical design",
      redraft: "Redraft",
      draftHint:
        "Starts a read-only agent that explores the selected repos and writes a design for this PRD; a second agent then critiques it. It changes no code and takes a few minutes.",
      redraftHint:
        "Replaces this design with a fresh draft from the current PRD. An approved design has to be approved again.",
      approve: "Approve design",
      approveHint:
        "Approving holds the build to this design: it may only change the files in Scope, and it must write the tests in the test map. Redraft if either is wrong.",
      draftFailed: "Couldn't start the design run.",
      approveFailed: "Couldn't approve the design.",
      blockersTitle: "Not ready to approve",
      sections: {
        design: "Design",
        contracts: "Changed contracts",
        compatibility: "Compatibility",
        scope: "Scope",
        tests: "Tests",
        openDecisions: "Open decisions",
        reviewer: "Reviewer",
      },
      contractName: "Contract",
      contractChange: "Change",
      contractReaders: "Read by",
      testRequirement: "Requirement",
      testFile: "File",
      testAsserts: "Asserts",
      openDecisionsHint: "Each of these blocks approval until it is settled in the PRD.",
      noContracts: "No shared contract changes.",
      noScope: "No files named.",
      noTests: "No tests mapped.",
      noOpenDecisions: "Nothing left to decide.",
      reviewPass: "No concerns",
      reviewConcerns: "Concerns",
      reviewDefects: "Defects",
      reviewSuggestions: "Suggestions — could widen the scope; not defects",
      noReview: "Not reviewed yet.",
    },

    // Readiness
    readiness: {
      heading: "Build readiness",
      ready: "Ready to build",
      notReady: (count: number) => (count === 1 ? "1 thing left" : `${count} things left`),
      // Shown when the document is written through but something is still
      // unsettled — the score and the verdict genuinely disagree here, and
      // saying so is clearer than hiding one of them.
      writtenButBlocked: "Written through, but not settled yet",
      startBuild: "Start build",
      startBuildEarly: "Start anyway",
      startBuildBlockedTitle: "Some things are still open",
      startBuildBlockedBody:
        "I can start, but I'll have to guess at these — and a guess found at review time costs a whole build:",
      startBuildDisabledHint: "Finish scoping first.",
    },

    // Build stages, as a person would name them
    stages: {
      SETUP: "Getting oriented",
      PLANNING: "Planning",
      CODING: "Writing code",
      TESTING: "Testing",
      GATE: "Running the checks",
      VERIFYING: "Independent review",
      REMEDIATING: "Fixing what the checks found",
      FINALISING: "Shipping",
      E2E_VERIFY: "End-to-end",
      OPENING_PRS: "Opening PRs",
      REPORTING: "Writing up",
      DONE: "Done",
    } as Record<string, string>,
    // The same stages, as an issue build lives through them — opencode does
    // the work and the repo's own CI does the checking.
    issueStages: {
      SETUP: "Raising the issue",
      PLANNING: "opencode working",
      CODING: "opencode working",
      TESTING: "CI running",
      GATE: "CI running",
      VERIFYING: "CI running",
      REMEDIATING: "Asked opencode to fix",
      FINALISING: "CI passed",
      OPENING_PRS: "Pull request opened",
      DONE: "Done",
    } as Record<string, string>,

    // The build screen
    build: {
      planHeading: "Plan",
      verificationHeading: "Independent review",
      verificationRoundHeading: (round: number) => `Independent review · round ${round}`,
      verificationPassed: "No blocking objections",
      verificationFailed: "Blocking objections",
      // A failing review used to end the run. It no longer does, and a red
      // card that does not say so reads as a dead build.
      verificationRemediating: "Builder is fixing these and will be reviewed again.",
      // "Checked" rather than "reported": the gate is the one thing in this
      // feed the agent did not write about itself.
      gateVerified: "Checked by Builder, not self-reported",
      gatePassed: "Passed",
      gateFailed: "Failed",
      gateNewFailures: (count: number) =>
        count === 1 ? "1 failure this change caused" : `${count} failures this change caused`,
      gatePreExisting: (count: number) =>
        count === 1
          ? "1 failure was already there before this change"
          : `${count} failures were already there before this change`,
      gateOutput: "Command output",
      // Tool-call detail: arguments and the paired result, shown once expanded.
      toolArgumentsHeading: "Arguments",
      toolResultHeading: "Result",
      noToolResult: "No result recorded for this call.",
      // Gap between two events, shown inline so a long silence (a slow test
      // suite, a big diff) reads as time passing rather than as nothing
      // having happened.
      eventGap: (label: string) => `${label} later`,
      diffNoChange: "No visible change.",
      diffAdditions: (count: number) => (count === 1 ? "1 addition" : `${count} additions`),
      diffDeletions: (count: number) => (count === 1 ? "1 deletion" : `${count} deletions`),
      reportHeading: "Report",
      testOutput: "Test results",
      e2eEvidence: "End-to-end evidence",
      e2eSkipped: (reason: string) => `Skipped the end-to-end check — ${reason}`,
      jumpToLive: "Jump to live",
      feedStarting: "The runner is starting. The first update usually arrives within a minute.",
      feedIssue:
        "Builder checks the issue and pull request every 5 minutes — follow opencode live in the Actions log.",
      feedIssueNoLog:
        "Builder checks the issue and pull request every 5 minutes. The Actions log link appears once opencode starts.",
      feedIssueLogLink: "Open the Actions log",
      feedLoading: "Loading this run's activity…",
      feedWorking: (count: number) =>
        `Working — ${count} ${count === 1 ? "step" : "steps"} so far, none with anything to show yet.`,
      feedEmpty: "Nothing recorded for this run.",
      runLabel: (sequence: number, mode: string) =>
        mode === "resume"
          ? `Run ${sequence} (resumed)`
          : mode === "fix"
            ? `Run ${sequence} (fix)`
            : mode === "review"
              ? `Run ${sequence} (review)`
              : mode === "design"
                ? `Run ${sequence} (design)`
                : `Run ${sequence}`,
      issueRunLabel: (sequence: number, repo: string | null, issueNumber: number) =>
        repo
          ? `Run ${sequence} · ${repo} · issue #${issueNumber}`
          : `Run ${sequence} · issue #${issueNumber}`,
      costNotTracked: "Cost not tracked",
      // Run history rail — reading an older run's transcript without losing
      // the live one is the whole point, so the rail says which run is which
      // rather than leaving that to a bare sequence number.
      runHistoryHeading: "Runs",
      runHistoryAllHeading: "All runs",
      runHistoryEmpty: "No runs yet.",
      runDurationLive: "Running…",
      runDurationUnknown: "—",
      runModeLabels: {
        build: "Build",
        resume: "Resume",
        fix: "Fix",
        review: "Review",
        design: "Design",
      } as Record<string, string>,
      runLiveBadge: "Live",
      runStatusLabels: {
        QUEUED: "Queued",
        // QUEUED on our side, but GitHub has accepted the run: it stays QUEUED
        // until its first event arrives, which can take a minute.
        STARTING: "Starting",
        RUNNING: "Running",
        SUCCEEDED: "Succeeded",
        FAILED: "Failed",
        CANCELLED: "Stopped",
        TIMED_OUT: "Timed out",
        WAITING_FOR_INPUT: "Waiting on you",
      } as Record<string, string>,
      watchOnGithub: "Watch on GitHub",
      // Issue builds link out to three places, each named for what it is.
      issueLink: (repo: string | null, issueNumber: number) =>
        repo ? `Issue ${repo}#${issueNumber}` : `Issue #${issueNumber}`,
      actionsLogLink: "Actions log",
      prLink: (prNumber: number) => `PR #${prNumber}`,
      // Where an issue build has got to.
      issueRail: {
        label: "Issue build progress",
        issue: "Issue raised",
        working: "opencode working",
        pr: "Pull request opened",
        ciWaiting: "Waiting for CI",
        ciPending: "CI running",
        ciFailed: "CI failed",
        ciFixing: "Asked opencode to fix",
        ciNeutral: "CI",
        passed: "CI passed",
        fixRequests: (count: number, limit: number) => `fix requested ${count} of ${limit}`,
      },
      // The repo's own CI, on an issue build's pull request.
      ciResultVerified: "Checked by the repo's CI",
      ciResultFailedChecks: (count: number) =>
        count === 1 ? "1 check failed" : `${count} checks failed`,
      ciStatus: {
        success: "CI passed",
        failure: "CI failed",
        pending: "CI running",
        none: "No CI yet",
      } as Record<string, string>,
      prIssueWorking: "opencode is still working on CI",
      prIssueReady: "Ready for review — approve it on GitHub, then merge",
      prIssueOpenOnGithub: "Open on GitHub",
      pullRequestsHeading: "Pull requests",
      // Named for what it wants from you, not for what it is. A heading that
      // says "Pull requests" describes a data type; one that says a review is
      // waiting describes a job.
      prAwaitingOne: "A pull request is waiting for you",
      prAwaitingMany: (count: number) => `${count} pull requests are waiting for you`,
      prClosed: "Closed",
      noPullRequests: "No pull requests opened yet.",
      prMerged: "Merged",
      prOpen: "Open",
      prMerge: "Merge",
      prMerging: "Merging…",
      prMergeFailed: "Could not merge",
      // How much of a pull request's automation budget is left, while it runs.
      // Joined with " · ": "Round 2 of 2 · 1h 10m left · $3.41 of $10.00".
      automationRound: (round: number, max: number) => `Round ${round} of ${max}`,
      automationTimeLeft: (left: string) => `${left} left`,
      automationSpend: (spent: string, limit: string | null) =>
        limit ? `${spent} of ${limit}` : `${spent} spent`,
      // Once Builder has stopped working it (merged, or handed to a person).
      automationSpentTotal: (spent: string) => `Spent ${spent} on review and fixes`,
      timeLeftUnderMinute: "under a minute",
      timeLeftNone: "no time",
      // Deployed, but the check after the release failed.
      releaseUnhealthy: "Released — health check failing",
      releaseUnhealthyBody: "Builder stopped automatic merges and releases. Check the service.",
      // A pull request Builder's review-and-fix loop handed to a person.
      needsYou: {
        tag: "Needs you",
        openFindingsHeading: "Still open",
        showMore: (count: number) => `Show ${count} more`,
        showFewer: "Show fewer",
        resume: "Resume automation",
        resuming: "Resuming…",
        resumeHint:
          "Builder goes back to reviewing this pull request and asking opencode for fixes, with a fresh set of rounds.",
        resumed: "Builder is working on this pull request again.",
        resumeFailed: "Couldn't resume automation on this pull request.",
      },
      prMerged_toast: "Merged.",
      // Failure copy lives in the feed, not in a banner. See FailureRow in
      // BuildActivityFeed for why.
      failureHeading: "The build stopped here",
      failureDetail: "Details",
      reportsHeading: "Reports",
      startFailed: "Couldn't start the build.",
      tabActivity: "Activity",
      tabPrd: "PRD",
      tabReports: "Reports",
    },

    // Session actions
    cancelSession: "Stop this build",
    cancelSessionConfirm: "Stop it?",
    cancelSessionConfirmBody:
      "The current run stops immediately. Nothing already written is lost, but this pass won't finish — you'll need to start again.",
    cancelSessionConfirmBodyIssue: (repo: string | null) =>
      `Builder stops following this build, cancels opencode's run in ${repo ?? "the repo"} and closes the issue. Any pull request already opened stays open for you to close.`,
    cancelFailed: "Couldn't stop the build.",
    // A finished link in a repo chain, with more repos still to build.
    continueChain: (repo: string) => `Continue (next: ${repo})`,
    continueChainFailed: "Couldn't continue the build.",
    // The repo chain on the session page.
    repoChain: {
      heading: "Repos, built in order",
      showActivity: (repo: string) => `Show ${repo}'s activity`,
      showingActivity: "Showing",
      activityLink: "Activity",
      status: {
        PENDING: "Waiting",
        BUILDING: "Building",
        WAITING_FOR_INPUT: "Waiting on you",
        COMPLETED: "Built",
        FAILED: "Failed",
        SKIPPED: "Skipped",
      } as Record<string, string>,
      // The header's summary of the whole chain.
      summaryBuilt: (built: number, total: number) =>
        total === 1 ? `${built} of 1 repo built` : `${built} of ${total} repos built`,
      summaryBuilding: (repo: string, position: number, total: number) =>
        `Building ${repo} (${position} of ${total})`,
      summaryStopped: (repo: string) => `Stopped at ${repo}`,
      summaryNeedsYou: (repo: string) => `Needs you: ${repo}`,
      prNumber: (prNumber: number) => `#${prNumber}`,
      ciPassed: "CI ✓",
      ciFailed: "CI ✗",
      ciRunning: "CI running",
      ciPassedLabel: "CI passed",
      ciFailedLabel: "CI failed",
      // What the row wants next, in a few words.
      nextReview: "Waiting for your review",
      nextReviewedClean: "Reviewed clean — ready to merge",
      // Builder is still working the pull request, so it is not ready to merge.
      workState: {
        reviewing: "Builder is reviewing this",
        fixing: "opencode is fixing what the review found",
        sending: "Sending the review's findings to opencode",
      } as Record<string, string>,
      mergeBusyHint: "Builder is still working on this pull request",
      nextMergeAfter: (repo: string) => `Merge after ${repo}`,
      nextCiFailed: "Fix CI on the pull request",
      nextCiRunning: "Waiting for CI",
      nextStartsAfter: (repo: string) => `Starts after ${repo}`,
      nextWaiting: "Waiting to start",
      mergeFirst: "Merge first",
      reviewOnGithub: "Review on GitHub",
      mergeApprovalHint:
        "GitHub needs an approving review on the pull request before it can merge.",
      actionsLog: "Actions log",
      activityHeading: (repo: string) => `Activity: ${repo}`,
      activityMeta: (count: number) => (count === 1 ? "1 update" : `${count} updates`),
    },
    costLabel: "Spend",
    repoLabel: "Repos",
    noReposYet: "Not decided yet",
    retryBuild: "Retry build",
    sessionGone: "This session is gone — start a new one.",
    showArchivedLabel: "Show archived",
    showMineOnlyLabel: "Only sessions I started",
    startedBy: (name: string) => `Started by ${name}`,
    archiveAction: "Archive",
    unarchiveAction: "Unarchive",
    archiveSuccess: "Build archived.",
    archiveFailed: "Couldn't archive that build.",
    unarchiveSuccess: "Build restored.",
    unarchiveFailed: "Couldn't restore that build.",
    archivedEmptyTitle: "No archived builds yet",
    archivedEmptyBody:
      "Builds you archive from the default view show up here, and can be restored any time.",

    // Start-build dialog — also used for a retry from FAILED, since the
    // backend accepts start-build from either state with the same payload.
    startBuildDialog: {
      title: "Start build",
      retryTitle: "Retry build",
      // Shown above the form on a retry, with the session's own error text —
      // the point isn't to explain the failure, just to say what is being
      // retried past before asking for the same decisions again.
      retryIntro: "The last attempt failed:",
      reposLabel: "Repos to change",
      reposHintIssue:
        "Each repo the approved design changes is built one after another, in the order ally-be → ally-ai → ally-ai-learn → ally-web → ally-mobile, with one pull request per repo. The next repo starts once the previous one's CI passes.",
      issueModelNote:
        "The model is set per repo on GitHub with the BUILDER_MODEL variable (default Gemini 3 Flash). Cost isn't tracked for opencode builds.",
      reposPlaceholder: "Choose repos…",
      reposRequired: "Choose at least one repo before starting.",
      saveReposFailed: "Couldn't save the chosen repos.",
      submit: "Start build",
      retrySubmit: "Retry build",
      designNotApprovedTitle: "Approve the technical design first",
      designNotApprovedBody:
        "A build is held to an approved design's scope and test map. Read the design, then approve it — or draft one if there is none yet.",
      reviewDesign: "Review the design",
      designStaleTitle: "The design is out of date",
      designStaleBody:
        "The PRD changed after the technical design was approved. Redraft and approve it again before building.",
    },

    // The session's spend ceiling.
    budget: {
      overTitle: "Spend is past the ceiling",
      overBody: (spent: string, ceiling: string) =>
        `${spent} of ${ceiling} spent. Raise the ceiling to run anything more on this session.`,
      raise: "Raise budget",
      dialog: {
        title: "Raise budget",
        intro: "Raise this session's spend ceiling.",
        spentLabel: "Spent so far",
        currentLabel: "Current ceiling",
        currentNone: "No ceiling",
        newLabel: "New ceiling (USD)",
        newHint:
          "Has to be above what the session has already spent, or the build would stop again immediately. Set 0 to remove the ceiling entirely.",
        submit: "Raise budget",
        raised: "Budget raised.",
        failed: "Couldn't raise the budget.",
      },
      // Feed rows for the budget_hold event — legacy runner builds' history.
      feed: {
        held: (spent: string, ceiling: string) =>
          `Paused: spent ${spent} of the ${ceiling} ceiling, holding this run's work while it waits for a raise.`,
        raised: (ceiling: string) => `Budget raised to ${ceiling} — carrying on.`,
        headroom: (ceiling: string) => `Budget raised to ${ceiling}.`,
        expired: "Nobody raised the budget in time, so this run stopped.",
      },
    },

    // Notifications
    notifications: {
      title: "Notifications",
      unreadLabel: (count: number) => (count === 1 ? "1 unread" : `${count} unread`),
      markAllRead: "Mark all read",
      empty: "No notifications",
      error: "Failed to load notifications.",
      kinds: {
        question_pending: "Needs an answer",
        build_completed: "Build finished",
        build_failed: "Build failed",
        prs_opened: "PRs opened",
        budget_reached: "Budget reached",
        pr_needs_human: "Needs you",
      } as Record<string, string>,
    },

    // Platform settings (SUPER_DUPER_ADMIN)
    settings: {
      title: "Builder settings",
      subtitle: "Platform-wide controls — these apply to every build, not one session.",
      backToBuilder: "Back to Builder",
      loadFailed: "Couldn't load Builder's settings.",
      saveFailed: "Couldn't save Builder's settings.",
      saved: "Saved.",
      save: "Save",
      // The kill switch sits alone, first, for the same reason WhatsApp's does:
      // it's the control someone reaches for in an incident and shouldn't be
      // buried under thresholds.
      // One control for how much Builder does on its own; the switches it sets
      // stay under Advanced. Each step up says what it risks in one line.
      autonomy: {
        heading: "How much Builder does on its own",
        levels: {
          off: {
            name: "Off",
            description: "Builder builds; nothing happens on pull requests automatically.",
            risk: "",
          },
          assist: {
            name: "Assist",
            description:
              "Reviews pull requests, asks opencode to fix what it finds, and approves clean ones. You merge and release.",
            risk: "Its approval counts as the review GitHub asks for, so read the pull request before you merge it.",
          },
          auto_merge: {
            name: "Auto-merge",
            description: "Also merges clean pull requests, in build order. You release.",
            risk: "Code lands on master without a person reading it; anything the review missed goes out with your next release.",
          },
          auto: {
            name: "Auto",
            description:
              "Also releases, and checks the service is healthy after each release; stops and alerts you if not.",
            risk: "Changes reach real users with no person in between. A failed health check stops it, but only after that release is out.",
          },
        } as Record<string, { name: string; description: string; risk: string }>,
        recommended: "Recommended now",
        custom: "Custom (set below)",
        customHint: "The switches under Advanced don't match one of the levels above.",
        advanced: "Advanced",
        confirmAutoTitle: "Let Builder release on its own?",
        confirmAutoBody:
          "Builder will merge and release clean pull requests to production without asking, then check the service is healthy. If a check fails it stops merging and releasing and alerts you — after that release is already out.",
        confirmAutoAction: "Switch to Auto",
        cancel: "Cancel",
        trackRecord: (
          window: number,
          clean: number,
          merged: number,
          escalated: number,
          unhealthy: number,
        ) =>
          `Last ${window} reviewed pull ${window === 1 ? "request" : "requests"}: ${clean} approved clean, ${merged} merged as reviewed, ${escalated} needed a person, ${unhealthy} unhealthy ${unhealthy === 1 ? "release" : "releases"}.`,
        trackRecordEmpty: "No reviewed pull requests yet.",
        maxPrSpendLabel: "Most Builder may spend per pull request on review and fixes ($)",
        maxPrSpendHint: "When a pull request reaches it, Builder stops and hands it to you.",
        maxPrSpendPlaceholder: "No limit",
        suggestion: (name: string) => `Builder's recent record is good enough to try ${name}.`,
        switchTo: (name: string) => `Switch to ${name}`,
        switched: (name: string) => `Builder is now on ${name}.`,
      },
      enabledLabel: "Builder enabled",
      enabledHelp:
        "Off means no build will dispatch, whatever a session's own readiness says. The Builder tab stays visible; nothing behind it will run.",
      autoReviewLabel: "Review its own pull requests",
      autoReviewHelp:
        "On, Builder reads the finished diff of its own open pull requests the way the first person to open one would, and files what it finds. The safer half of autonomy: a review writes findings and touches no branch, so it is worth running on its own with the switch below off — the findings land for you to read and nothing pushes. Only runs once checks are green, at most twice per pull request.",
      autoApproveLabel: "Approve a pull request it found nothing wrong with",
      autoApproveHelp:
        "On, a review that read the full diff and reported no findings submits an approving review, with every required check green. This is the step that otherwise waits on a person: master needs an approval and Builder's bot cannot give one, so a green, reviewed, finding-free pull request sits until someone clicks Approve. It never forces — the approval is an ordinary review, every other required check still applies, it says on the pull request that a machine approved it, and you can dismiss it like any other.",
      autoMergeLabel: "Merge a pull request it reviewed clean",
      autoMergeHelp:
        "On, Builder merges its own pull request once its review read the full diff and found nothing, every required check is green, nothing is outstanding, and GitHub itself says nothing stands in the way. This is the last click it was waiting on, and the only step here you cannot undo from this page — so it checks all of that afresh at merge time rather than trusting what was true when the review ran, and it never forces. If anything has moved it declines and offers you the merge button instead, so the work stops in front of a person rather than stopping quietly. With the switch below on, this ships to production.",
      autoReleaseLabel: "Release it to production once it merges",
      autoReleaseHelp:
        "On, a merged pull request dispatches its own production release and Builder watches it through to a verdict. The only switch here that changes what real users are running. It refuses rather than guesses: a change it cannot attribute to exactly the apps being released — anything touching shared code under libs/, or a diff too large to read in full — is left for you with a note saying why. If a release fails you are told loudly, because merged-but-not-deployed reads as done and nobody looks again.",
      autoFixLabel: "Answer pull-request feedback automatically",
      autoFixHelp:
        "On, Builder reads failing checks and review comments on its own open pull requests and pushes commits to address them. Separate from the switch above on purpose: agreeing Builder may write code is not the same as agreeing it may keep pushing to a pull request you are in the middle of reviewing.",
      maxFixRunsPerPrLabel: "Fix runs per pull request",
      maxFixRunsPerPrHelp:
        "A fix that cannot fix it will not fix it on the fourth attempt either, and the failure mode without a ceiling is a loop that pushes commits until someone notices the bill.",
      maxConcurrentBuildsLabel: "Max concurrent builds",
      maxConcurrentBuildsHelp:
        "Each running build holds a GitHub runner for up to two hours — this is a capacity and spend ceiling, not a correctness one.",
      defaultBudgetLabel: "Default budget (USD)",
      defaultBudgetHelp: "Applied to a new session's spend ceiling unless a build overrides it.",
      modelsHeading: "Model tiers",
      modelsHelp:
        "Per-tier defaults for new runs. Leave a field blank to fall through to the platform default — a per-build override still wins over these.",
      plannerModelLabel: "Planner model",
      coderModelLabel: "Coder model",
      verifierModelLabel: "Verifier model",
      modelPlaceholder: "Platform default",
      repoMapsHeading: "Repo maps",
      repoMapsHelp:
        "What Builder's own map of each repo was generated from — read-only here. A stale map is still usable; it just means recent commits aren't reflected in what the agent reads about the repo before it starts.",
      repoMapNeverGenerated: "Never generated",
      repoMapGeneratedAt: (age: string, sha: string) => `map from ${age} @ ${sha}`,
    },

    // Scoreboard — how builds are actually going, not just what one build did.
    pipeline: {
      title: "Builder pipeline",
      subtitle: "Where a run spends its time and money, phase by phase.",
      backToBuilder: "Back to Builder",
      loadFailed: "Couldn't load the pipeline view.",
      retry: "Retry",
      empty: "No finished runs in this window yet.",
      windowFieldLabel: "Window",
      windowLabel: (days: number) => `Last ${days} days`,
      unmeasuredNote:
        "A dash means not measured — runs from before the runner reported timings carry cost but no clock.",
      time: {
        heading: "Where the time goes",
        columnPhase: "Phase",
        columnModel: "Model",
        columnInvocations: "Runs",
        columnMedianWall: "Median",
        columnP95Wall: "p95",
        columnTurns: "Median turns",
        columnSplit: "Model vs tools",
        splitLabel: (apiPercent: number, toolPercent: number) =>
          `${apiPercent}% waiting on the model, ${toolPercent}% running its tools`,
      },
      money: {
        heading: "Where the money goes",
        columnPhase: "Phase",
        columnModel: "Model",
        columnInvocations: "Runs",
        columnTotal: "Total",
        columnMedian: "Median per run",
      },
      gate: {
        heading: "Test gate",
        subheading:
          "Lint and typecheck failing means work that was never run; tests failing means a wider blast radius than the plan saw.",
        columnRepo: "Repo",
        columnKind: "Check",
        columnResults: "Results",
        columnPassed: "Passed",
        columnPassRate: "Pass rate",
      },
      outcomes: {
        heading: "How runs end",
        columnStatus: "Status",
        columnMode: "Mode",
        columnRuns: "Runs",
        // opencode builds run in the target repo's Actions and report no
        // runner minutes, so this median only covers Builder's own runner.
        columnMedianMinutes: "Median runner minutes (Builder runner only)",
      },
    },

    scoreboard: {
      title: "Builder scoreboard",
      subtitle:
        "Cost, review friction, and how often a build actually ships — over time. Cost isn't tracked for opencode builds.",
      backToBuilder: "Back to Builder",
      loadFailed: "Couldn't load the scoreboard.",
      retry: "Retry",
      empty: "No builds in this window yet.",
      windowFieldLabel: "Window",
      windowLabel: (days: number) => `Last ${days} days`,
      kpi: {
        builds: "Builds",
        mergeRate: "Merge rate",
        totalCost: "Total spend",
        medianCost: "Median cost per build",
      },
      trend: {
        buildsHeading: "Builds started, weekly",
        mergeRateHeading: "Merge rate, weekly",
        costHeading: "Median cost per build, weekly",
        fixRunsHeading: "Median fix runs, weekly",
        timeToMergeHeading: "Median time to merge, weekly",
      },
      failureTags: {
        heading: "Where the losses come from",
        subheading:
          "Every failure tag across the window, biggest cause first. A tag counts once per build it was recorded against.",
      },
      table: {
        heading: "Every build in this window",
        columnTitle: "Build",
        columnRepos: "Repos",
        columnOutcome: "Outcome",
        columnCreated: "Started",
        columnDuration: "Duration",
        columnCost: "Cost",
        columnRuns: "Runs",
        columnFixRuns: "Fix runs",
        columnReviewComments: "Review comments",
        columnCiFailures: "CI failures",
        columnTimeToMerge: "Time to merge",
        columnFailureTags: "Failure tags",
        durationUnknown: "—",
        noFailureTags: "—",
      },
      outcome: {
        merged: "Merged",
        open: "Open",
        failed: "Failed",
        cancelled: "Stopped",
      } as Record<string, string>,
    },

    // Knowledge — what the automatic curator has distilled from past builds,
    // and the runs worth reading in full because they were unusually clean
    // or unusually expensive.
    knowledge: {
      navLink: "Knowledge",
      title: "Builder knowledge",
      subtitle: "What Builder has learned from past builds, and the runs worth learning from.",
      backToBuilder: "Back to Builder",
      tabLessons: "Lessons",
      tabExemplars: "Exemplars",

      lessons: {
        loadFailed: "Couldn't load Builder's lessons.",
        empty: "Nothing here yet — lessons appear once a few builds have run.",
        filterStatusLabel: "Status",
        filterStatusAll: "All statuses",
        filterCategoryLabel: "Category",
        filterCategoryPlaceholder: "Any category…",
        filterRepoLabel: "Repo",
        filterRepoPlaceholder: "Any repo…",
        statusLabels: {
          candidate: "Candidate",
          active: "Active",
          merged: "Merged",
          retired: "Retired",
        } as Record<string, string>,
        columnLesson: "Lesson",
        columnCategory: "Category",
        columnStatus: "Status",
        columnSources: "Sources",
        columnApplied: "Applied",
        columnContradicted: "Contradicted",
        columnRepos: "Repos",
        columnPinned: "Pinned",
        edit: "Edit",
        save: "Save",
        cancel: "Cancel",
        saveFailed: "Couldn't save that lesson.",
        pin: "Pin",
        unpin: "Unpin",
        // The curator runs on its own schedule and edits or retires lessons
        // without asking — pinning is the one way to take a lesson out of its
        // reach on purpose, and the copy says so rather than just naming the
        // toggle. (Stacks: "Automated Pipelines as Amplifiers, Not
        // Replacements" — automation proposes, a person can override it.)
        pinHint:
          "A pinned lesson is one the automatic curator may never edit or retire. Pin the ones you've checked and want kept exactly as written.",
        pinFailed: "Couldn't pin that lesson.",
        unpinFailed: "Couldn't unpin that lesson.",
        retire: "Retire",
        retireConfirmTitle: "Retire this lesson?",
        retireConfirmBody:
          "A retired lesson stops being read into new builds. Nothing is deleted — set its status back to bring it back.",
        retireFailed: "Couldn't retire that lesson.",
        consolidateNow: "Consolidate now",
        consolidateHint:
          "Runs the curator immediately instead of waiting for its next scheduled pass — it reviews candidate lessons and merges duplicates, and never edits or retires a pinned one.",
        consolidateStarted: "Consolidation started — check back in a moment for the result.",
        consolidateFailed: "Couldn't start consolidation.",
      },

      exemplars: {
        caption: "Builds worth learning from — the cleanest runs, and the costliest ones.",
        loadFailed: "Couldn't load Builder's exemplars.",
        empty: "No exemplars recorded yet.",
        noFailureTags: "No failure tags recorded.",
      },
    },
  },
  // The shared agent chat (`components/agent-chat/`) — feed rows, question cards and the composer
  // that Builder, Course Copilot and the character interview all render. A feature whose wording
  // differs passes its own through the components' `strings` prop (see `characterInterview`).
  agentChat: {
    chat: {
      placeholder: "Answer, or tell me something I haven't asked about…",
      send: "Send",
      stop: "Stop",
      thinking: "Thinking",
      interrupted: "Stopped.",
      retry: "Retry",
      reviewHeading: "Review notes",
      findingFix: "Fix",
      findingConsider: "Consider",
      applyFinding: "Apply",
      // The item id lets the agent act on the right item without guessing.
      applyFindingMessage: (note: string, itemId?: string) =>
        `Apply this review finding${itemId ? ` (item ${itemId})` : ""}: ${note}`,
      suggestedActionsLabel: "Suggested next steps",
    },
    question: {
      recommended: "Recommended",
      noneOfThese: "None of these",
      addCustom: "Something else",
      addCustomPlaceholder: "Your own answer…",
      add: "Add",
      freeTextPlaceholder: "Your answer…",
      submitAnswer: "Answer",
      selectPlaceholder: "Choose…",
      confirmSelection: "Confirm",
      selectedCountLabel: (count: number) => (count === 1 ? "1 selected" : `${count} selected`),
      minSelectionsHint: (min: number) => `pick at least ${min}`,
      answeredLabel: "Answered",
    },
  },
  // Course builder -> Landing page: the story-led layout of the course's public share page.
  // Every limit quoted here mirrors LANDING_LIMITS (types/tracks.ts), which mirrors ally-be.
  courseLanding: {
    railLabel: "Landing page",
    title: "Landing page",
    explainer:
      "What visitors see at the course's share link. The story layout turns on once the Hero has a hook; without one, the page shows the standard outline.",
    readiness: (ready: number, total: number) =>
      `${ready} of ${total} ${total === 1 ? "block" : "blocks"} ready`,
    blockListLabel: "Landing page blocks",

    draftWithCopilot: "Draft with Copilot",
    drafting: "Drafting…",
    draftHint:
      "Writes a first version of the empty fields from your saved course. Anything you've written stays as it is.",
    // The copilot reads the SAVED course, so the draft waits for a save (same reason as Ask Copilot).
    draftUnsaved:
      "Save your changes first — the copilot works on the saved version of this course.",
    draftFilled: (count: number) =>
      count === 1
        ? "Copilot filled 1 empty field. Review it, then save."
        : `Copilot filled ${count} empty fields. Review them, then save.`,
    draftNothing: "Nothing to fill — every field already has text.",
    draftFailed: "Couldn't draft the landing page. Try again.",

    openPage: "Open page",
    openPageHint: "Opens the public page in a new tab. It shows the last saved version.",
    openPageUnsaved: "Save the course to get its link.",
    openPageNeedsPublicView: "Turn on Public view in Track settings to open the page.",
    openPagePendingPublicView: "Save your changes to turn the link on.",
    openPageNeedsPublish: "The link starts working once you publish the course.",

    status: {
      SET: "Set",
      AUTO: "Auto",
      NEEDS_INPUT: "Needs input",
      OFF: "Off",
    } as Record<string, string>,
    toggleLabel: (block: string) => `Show ${block}`,
    offNote: "This block is off, so the page leaves it out. Switch it on in the list to show it.",
    contentNotesLockHint:
      "Shown automatically when any roleplay in the course has a trigger warning.",
    charactersLeft: (used: number, max: number) => `${used}/${max}`,

    blocks: {
      hero: "Hero",
      firstMove: "First move",
      arc: "Story arc",
      outcomes: "Outcomes",
      howItPlays: "How it plays",
      cast: "Cast",
      xp: "XP line",
      contentNotes: "Content notes",
    } as Record<string, string>,

    // What the public page does when a block is empty or off.
    fallback: {
      hero: "Without a hook, the page shows the standard outline.",
      firstMove: "Off or fewer than two replies: the hero's button goes straight to login.",
      arc: "No teaser: the chapter shows its section description.",
      outcomes: "Empty: the block is hidden.",
      howItPlays: "Off: the block is hidden.",
      cast: "No guide: only the caller shows.",
      xp: "Off: no XP line.",
      contentNotes: "No warnings and no note: the block is hidden.",
    } as Record<string, string>,

    hero: {
      hook: {
        label: "Hook",
        placeholder: "She says she's fine. Is she?",
        hint: "The headline of the page. One line that makes someone want to take the case.",
      },
      question: {
        label: "The question",
        placeholder: "What would you say next?",
        hint: "Shown in italics under the hook.",
      },
      courseLine: {
        label: "Course line",
        placeholder: "Learn to hold a hard first conversation.",
        hint: "Shown after the course title.",
      },
      buttonLabel: {
        label: "Button label",
        placeholder: "Take the case",
        hint: "The main button. Leave it empty to use the default.",
      },
      personaHeading: "Persona",
      personaHint: "The person in the case. Shown on a card beside the hero.",
      personaName: { label: "Name", placeholder: "Meera, 19" },
      personaDescriptor: {
        label: "Descriptor",
        placeholder: "First-year student, calls at 2 a.m.",
      },
      personaImage: {
        label: "Image",
        upload: "+ Upload image",
        uploading: "Uploading…",
        replace: "Replace",
        remove: "Remove",
        notAnImage: "Choose an image file.",
        alt: "Persona",
      },
      characterPicker: {
        open: "Fill from Character Library",
        close: "Close",
        searchPlaceholder: "Search characters",
        searchLabel: "Search the Character Library",
        loading: "Loading characters…",
        empty: "No characters found.",
        hint: "Copies the name (with age), image and link to the character into the persona.",
      },
    },

    firstMove: {
      helper:
        "Shown before login. No score. Write a fresh moment — a graded quiz question here would publish its answer.",
      sceneLine: {
        label: "Scene line",
        placeholder: "2:07 a.m. The helpline rings.",
        hint: "Sets the scene in one short line.",
      },
      personaLine: {
        label: "Persona's line",
        placeholder: "I just need someone to talk to. It's nothing, really.",
        hint: "What the persona says. Shown as a pull-quote.",
      },
      prompt: {
        label: "Prompt",
        placeholder: "What do you say?",
        hint: "The question the visitor answers by choosing a reply.",
      },
      repliesHeading: "Replies",
      repliesHint: (min: number, max: number) => `Add ${min} to ${max} replies.`,
      replyHeading: (position: number) => `Reply ${position}`,
      replyText: { label: "Reply text", placeholder: "That sounds heavy. I'm here." },
      replyLabel: {
        label: "What it shows",
        placeholder: "Reassures first",
        tooltip:
          "A short name for what this reply shows about the person who chose it. The visitor sees it after they pick the reply.",
      },
      replyWhy: {
        label: "Why",
        placeholder: "Naming the feeling keeps the caller talking before you problem-solve.",
        hint: "A sentence on why this reply works or doesn't. Shown after the pick.",
      },
      addReply: "Add reply",
      remove: "Remove",
      removeReply: (position: number) => `Remove reply ${position}`,
      maxReplies: (max: number) => `A first move has at most ${max} replies.`,
    },

    arc: {
      helper: "Teasers never give away a roleplay's hidden events or a quiz answer.",
      empty: "This course has no sections yet. Add one to shape its story arc.",
      chapterHeading: (position: number) => `Chapter ${position}`,
      unsaved: "Save the course to add a teaser for this chapter.",
      beat: {
        label: "Beat",
        none: "No beat",
        tooltip:
          "Where this chapter sits in the story. Beats shape the curve drawn above the chapter list.",
        options: {
          SETUP: "Setup",
          CONFLICT: "Conflict",
          CHALLENGE: "Challenge",
          CLIMAX: "Climax",
          RESOLUTION: "Resolution",
        } as Record<string, string>,
      },
      teaser: {
        label: "Teaser",
        placeholder: "Something she says doesn't add up.",
      },
      hardCall: {
        label: "Hard call",
        tooltip:
          "The one chapter the course builds toward. The curve peaks here and the row is emphasised on the page. Pick one per course.",
        clear: "Clear hard call",
      },
    },

    outcomes: {
      helper: "Start with a verb. Write what they'll do, not what they'll know.",
      itemLabel: (position: number) => `Outcome ${position}`,
      placeholders: [
        "Name what a caller is feeling before offering advice",
        "Ask about safety in plain words",
        "Close a call so the caller knows what happens next",
      ],
    },

    howItPlays: {
      countsHeading: "In this course",
      countsEmpty: "No activities yet.",
      itemCount: (type: string, count: number) => {
        const [singular, plural] = LANDING_ITEM_NOUNS[type] ?? [type, type];
        return `${count} ${count === 1 ? singular : plural}`;
      },
      durationLabel: "Estimated duration",
      durationValue: (minutes: number) => `About ${minutes} min`,
      durationUnset: "Not set",
      durationPointer: "Edit this in Track settings.",
      sittingLength: {
        label: "Sitting length",
        none: "Not shown",
        tooltip:
          "How long one sitting should take, shown as a chip on the page. It is separate from the estimated duration for the whole course.",
        options: {
          SHORT: "Short (5 to 10 min)",
          MEDIUM: "Medium (10 to 15 min)",
          LONG: "Long (15 to 20 min)",
        } as Record<string, string>,
      },
      promisesHeading: "Always shown",
      promises: {
        retry: "Retry any roleplay as often as you like",
        debrief: "Every roleplay ends in a debrief on what you did",
        keep: "Nothing you earn is ever taken away",
      },
      promisesNote: "The first two appear only when the course has a roleplay.",
    },

    cast: {
      callerName: "Caller",
      callerNameFromHero: "The caller's name comes from the Hero persona.",
      callerNameUnset: "Not set. Add a name to the persona in the Hero block.",
      callerLine: {
        label: "Caller line",
        placeholder: "Calls at night, rarely says what's wrong.",
        hint: "A line about the caller, shown beside their name.",
      },
      guideHeading: "Guide",
      guideName: { label: "Guide name", placeholder: "Dr. Rao" },
      guideRole: { label: "Guide role", placeholder: "Clinical supervisor" },
      guideLine: {
        label: "Guide line",
        placeholder: "Debriefs every call with you.",
      },
    },

    xp: {
      explainer:
        'Shows "Up to N XP for the activities", worked out from the XP rules. There is nothing to write here.',
      offHint: "Switch it off in the block list to hide the line.",
    },

    contentNotes: {
      explainer:
        "Warnings are collected from the course's roleplays and listed with the chapters they appear in. This block can't be switched off while a warning exists.",
      extraNote: {
        label: "Extra note",
        placeholder: "Roleplays are fictional. You can stop any of them at any time.",
        hint: "Shown after the warnings. Optional.",
      },
    },
  },
  // Course Copilot — the chat-first course authoring agent. The right-hand work pane's copy lives
  // under `courseCopilotPane` (end of this file); everything the shell and the session list say
  // lives here, and the chat feed's own copy under `agentChat`.
  //
  // Voice follows Builder: the copilot speaks about the course in the first person, the app speaks
  // about itself ("Couldn't load your sessions"). Copy marked "decided" was fixed in the product
  // plan and is repeated verbatim — change the plan first.
  courseCopilot: {
    tabLabel: "Course Copilot",
    title: "Course Copilot",
    newCourse: "New course",
    // Decided: the Simulation Studio create option and the CreateTrack header button.
    createOption: "Course with Copilot",
    askCopilot: "Ask Copilot",
    askCopilotHint: "Open this course in Course Copilot and revise it by chatting.",
    // Shown instead when the form has unsaved changes: the copilot reads and edits the SAVED
    // course, so leaving now would drop them (or have the copilot edit a stale version).
    askCopilotUnsaved:
      "Save your changes first — the copilot works on the saved version of this course.",

    // Session states, as a trainer would say them
    status: {
      INTERVIEWING: "Interview",
      AWAITING_BLUEPRINT: "Blueprint ready",
      BUILDING: "Building",
      BUILD_FAILED: "Build failed",
      EDITING: "Editing",
      ARCHIVED: "Archived",
    } as Record<string, string>,
    mode: {
      CREATE: "New course",
      EDIT: "Editing a course",
    } as Record<string, string>,

    // Sessions list
    list: {
      subtitle: "Pick up where you left off, or start a new course.",
      // Decided.
      empty:
        "No copilot sessions yet. Start one from Simulation Studio → New → Course with Copilot.",
      loadFailed: "Couldn't load your Course Copilot sessions.",
      updatedLabel: "Last updated",
      noCourseYet: "Not built yet",
      open: "Open",
      archive: "Archive",
      archiveConfirmTitle: "Archive this session?",
      // Said plainly because "archive" next to a course invites the fear that the course goes too.
      archiveConfirmBody:
        "The conversation is closed. The course itself is never deleted — anything already built stays in your Courses.",
      archiveConfirm: "Archive",
      archiveCancel: "Keep it",
      archiveSuccess: "Session archived.",
      archiveFailed: "Couldn't archive that session.",
      createFailed: "Couldn't start a new Course Copilot session.",
    },

    // /course-copilot/new
    start: {
      starting: "Starting your session…",
      failed: "Couldn't start a Course Copilot session.",
      // The server's own message wins (it says which limit was hit); this is the fallback for a 409.
      capReached: "You already have two active sessions. Archive one to start another.",
      backToList: "Back to my sessions",
    },

    // One session
    session: {
      backLabel: "Back to Course Copilot sessions",
      untitled: "Untitled course",
      loadFailed: "Couldn't load this Course Copilot session.",
      openInEditor: "Open in editor",
      // Decided.
      openInEditorBuilding:
        "Wait for the build to finish — the copilot overwrites edits made during the build.",
      openInEditorNoCourse: "The course is created when you approve the blueprint.",
      archive: "Archive",
      archiveBuilding:
        "Stop the build first. Archiving closes the conversation, and the build is still running.",
      budgetTooltip:
        "What this session has spent generating content, against its budget ceiling. Writing the course is the expensive part; chatting is not.",
      budgetOf: (spent: string, ceiling: string) => `${spent} of ${ceiling}`,
      budgetUncapped: (spent: string) => `${spent} · no ceiling`,
      // The work pane's name below `lg`, where it opens as a sheet — what is in it depends on the state.
      pane: {
        INTERVIEWING: "Brief",
        AWAITING_BLUEPRINT: "Blueprint",
        BUILDING: "Build",
        BUILD_FAILED: "Build",
        EDITING: "Course",
        ARCHIVED: "Course",
      } as Record<string, string>,
      emptyFeed: "Nothing has been said in this session yet.",
      archivedNotice:
        "This session is archived, so the conversation is read-only. The course itself is untouched.",
      sessionGone:
        "This session no longer exists on the server. Go back to your sessions and start a new one.",
      approveFailed: "Couldn't approve the blueprint.",
      approveStale:
        "The blueprint changed since you opened it. Review the latest version and approve again.",
      saveFailed: "Couldn't save the blueprint.",
      saveStale: "The blueprint changed while you were editing it. Reloaded the latest version.",
      retryFailed: "Couldn't retry the build.",
      cancelFailed: "Couldn't stop the build.",
      raiseFailed: "Couldn't raise the ceiling.",
      archiveFailed: "Couldn't archive that session.",
      // Placeholder says what this state accepts, so the composer teaches the capability
      // (Stacks: "Communicate Agent Capabilities via Visual Affordances").
      composerPlaceholder: {
        INTERVIEWING: "Answer, or tell me something I haven't asked about…",
        AWAITING_BLUEPRINT: "Ask for a change — “drop the game, make section 3 two roleplays”…",
        BUILDING: "Ask a question while it builds…",
        BUILD_FAILED: "Ask what went wrong, or retry from the build panel…",
        EDITING: "What should I change?",
        ARCHIVED: "This session is archived.",
      } as Record<string, string>,
    },

    // State-driven chips under the composer. Decided; each one sends its `message` as the next turn.
    /** The Publish chip's message — the page hides that chip once the course is live. */
    publishChipMessage: "Publish the course.",
    suggestedActions: {
      INTERVIEWING: [
        {
          label: "Just build it with sensible defaults",
          message:
            "Just build it — fill anything still open with sensible defaults and show me the blueprint.",
        },
      ],
      AWAITING_BLUEPRINT: [
        {
          label: "Make it shorter",
          message: "Make the course shorter — cut it to about two-thirds of the current length.",
        },
        {
          label: "Explain the sequence",
          message: "Walk me through why the sections are in this order.",
        },
      ],
      EDITING: [
        {
          label: "Review the course",
          message: "Review the course and tell me what you'd improve first.",
        },
        { label: "Publish", message: "Publish the course." }, // keep in sync with publishChipMessage
        {
          label: "Preview outline",
          message: "Give me a one-paragraph summary of the course outline.",
        },
      ],
    } as Record<string, { label: string; message: string }[]>,

    // Chat feed — the stream hook's and page's copy. What the feed rows, cards and composer say is
    // shared with Builder and lives under `agentChat`.
    chat: {
      retry: "Retry",
      // Generic copy for a stream that died with no server message — a dropped connection.
      streamFailed: "That turn didn't finish. Try again.",
      // Decided.
      turnInProgress: "A reply is still being written for this session. Wait for it to finish.",
      droppedFrames: (count: number) =>
        count === 1
          ? "One update was lost in transit — the chat may be missing a line."
          : `${count} updates were lost in transit — the chat may be missing some lines.`,
      suggestedActionsLabel: "Suggested next steps",
    },
  },
  evaluate: {
    title: "Ally Evaluation",
    loginHeading: "Evaluator Sign In",
    loginSubtitle: "Use the email and password shared with you by the Ally team.",
    emailLabel: "Email",
    passwordLabel: "Password",
    signIn: "Sign In",
    signingIn: "Signing in...",
    loginFailed: "Invalid email or password",
    signOut: "Sign out",
    recordsHeading: "Your assigned records",
    recordsSubtitle: "Open a record to review it and answer the evaluation questions.",
    noRecords: "Nothing assigned to you yet",
    noRecordsSubtitle: "When the Ally team assigns records to you, they will appear here.",
    statusPending: "Pending",
    statusSubmitted: "Submitted",
    questionsCount: (count: number) => `${count} question${count === 1 ? "" : "s"}`,
    assignedOn: "Assigned",
    back: "Back to records",
    recordHeading: "Record",
    recordIdLabel: "Record ID",
    outputHeading: "Output",
    variablesHeading: "Variables",
    questionsHeading: "Evaluation questions",
    textPlaceholder: "Write your answer...",
    descriptionHint: "For your reference — no response needed",
    yes: "Yes",
    no: "No",
    submit: "Submit evaluation",
    submitting: "Submitting...",
    submitConfirmTitle: "Submit evaluation?",
    submitConfirmDescription:
      "Answers cannot be changed after submitting. Make sure you're happy with them.",
    submitConfirm: "Submit",
    cancel: "Cancel",
    submitted: "Evaluation submitted — thank you!",
    submitFailed: "Failed to submit evaluation",
    answerAll: "Please answer every question",
    submittedOn: "Submitted",
    readOnlyNote: "This evaluation was submitted and can no longer be edited.",
    loadFailed: "Failed to load",
  },

  /**
   * Copy for the internal-monologue panel (Studio preview + session detail).
   * Sentences rather than labels: the reader is following a mind, and a
   * labelled grid makes them assemble the narrative themselves.
   */
  internalMonologue: {
    title: "Internal monologue",
    subtitle: "What the client is thinking, turn by turn",
    waiting: "Waiting for the first turn…",
    emptyStored: "No monologue was recorded for this session.",
    turn: "Turn",
    score: "score",
    sentToActor: "Sent to the actor this turn",
    hide: "Hide",
    show: "Internal monologue",
    counsellor: "Counsellor",
    client: "Client",
    staleTurn: "This turn ran on the previous turn's memory — the update timed out.",
    moved: (from: string, to: string) => `Moved from ${from} to ${to}.`,
    heldFor: (stance: string, turns: number) => `Still at ${stance}, for ${turns} turns now.`,
    nowAt: (stance: string) => `Now at ${stance}.`,
    credited: (events: string) => `Credited to the counsellor: ${events}.`,
    feels: (affect: string) => `Feels ${affect}.`,
    privately: (appraisal: string) => `Privately, she reads him as: "${appraisal}"`,
    speaking: (register: string) => `Speaking ${register}.`,
    justSaid: (facts: string) => `Just told him: ${facts}.`,
    notSaying: (topics: string) => `Still not talking about: ${topics}.`,
    leftHanging: (topics: string) => `Left hanging: ${topics}.`,
    finished: (topics: string) => `Finished with: ${topics}.`,
    onMind: (facts: string) => `On her mind from her own life: ${facts}.`,
    willLookFor: (cues: string) => `Listening next for: ${cues}.`,
  },
  previewMonologueRuns: {
    trigger: "Past runs",
    title: "Preview runs",
    subtitle: "Reopen a preview and read what the client was thinking.",
    close: "Close",
    empty:
      "No preview of this simulation has been recorded yet. Run a preview and its monologue will appear here.",
    loading: "Loading runs…",
    failed: "Could not load preview runs.",
    pickRun: "Pick a run on the left to read it.",
    noTurns: "This run ended before the client formed any thoughts.",
    inProgress: "Still running",
    stillRunning: "This preview is still running — open the live panel to watch it.",
    turns: (count: number) => `${count} ${count === 1 ? "turn" : "turns"}`,
    ranBy: (name: string) => `by ${name}`,
    draftVersion: "draft version",
  },
  componentLibrary: {
    title: "Component Library",
    searchPlaceholder: "Search templates...",
    createTemplate: "Create template",
    createTemplatePanelTitle: "Create template",
    editTemplatePanelTitle: "Edit template",
    templateNameLabel: "Template name",
    templateNamePlaceholder: "Name this template",
    saveAsTemplateDescription:
      "This name is only for the template — it's separate from the item's own title, and editing one will never change the other.",
    allTypes: "All types",
    emptyState: "No templates yet. Save one from a course, or create one here.",
    template: "template",
    templates: "templates",
    templateCreatedSuccessfully: "Template created successfully",
    templateUpdatedSuccessfully: "Template updated successfully",
    templateDeletedSuccessfully: "Template deleted successfully",
    failedToSaveTemplate: "Failed to save template",
    failedToDeleteTemplate: "Failed to delete template(s)",
    deleteTemplate: "Delete template",
    deleteTemplateConfirmation: "Are you sure you want to delete this template?",
  },
  productUpdates: {
    title: "Product updates",
    description:
      "What the changelog automation wrote from recent merges. Updates are public by default and go on the public changelog as soon as they're live; switch one to Internal to keep it off. Anything you edit here is never rewritten automatically.",
    status: {
      schedule: "Schedule",
      scheduleOn: "On",
      scheduleOff: "Off",
      lastRun: "Last run",
      neverRun: "Never run",
      runFailed: "Failed",
      runDegraded: "Finished with problems",
      runOk: "OK",
      running: "Running…",
      inProgress: "Merges still being processed",
      publicUpdates: "Public",
      waitingUpdates: "Waiting on release",
      runNow: "Run now",
      loadFailed: "Could not load the automation status.",
    },
    toasts: {
      runStarted: "Run started",
      runNotStarted: "Run not started",
      runFailed: "Could not start a run.",
      saved: "Saved. Edited fields won't be rewritten automatically.",
      saveFailed: "Could not save this update.",
      audienceSaved: (audience: string) =>
        `Audience set to ${audience}. The automation won't change it back.`,
      audienceFailed: "Could not change the audience. Try again.",
    },
    filters: {
      search: "Search",
      searchPlaceholder: "Title or summary",
      status: "Status",
      audience: "Audience",
      surface: "Surface",
      allStatuses: "All",
      allAudiences: "All",
      allSurfaces: "All",
      showHidden: "Show hidden",
      clear: "Clear filters",
    },
    columns: {
      title: "Title",
      audience: "Audience",
      surfaces: "Surfaces",
      live: "Live",
      merges: "Merges",
    },
    table: {
      edited: "Edited",
      editedTitle: "Edited by a person — locked from automatic rewrites",
      waiting: "Waiting",
      loading: "Loading…",
      loadFailed: "Failed to load product updates.",
      showing: (from: number, to: number, total: number) => `Showing ${from}–${to} of ${total}`,
      updating: " · updating…",
      previous: "Previous",
      next: "Next",
    },
    empty: {
      none: "No product updates yet. They appear after the automation's next run.",
      filtered: "No updates match these filters.",
    },
    statusOptions: {
      live: "Live",
      merged: "Waiting on release",
    },
    audienceLabels: {
      public: "Public",
      internal: "Internal (team only)",
    },
    audienceTag: {
      public: "Public",
      internal: "Internal",
      waiting: "Waiting on release",
      hidden: "Hidden from the changelog",
    },
    audienceToggle: {
      label: (title: string) => `Audience for “${title}”`,
    },
    kindLabels: {
      new: "New",
      improved: "Improved",
      fixed: "Fixed",
    },
    surfaceLabels: {
      web_app: "Web app",
      mobile_app: "Mobile app",
      admin_console: "Admin console",
      whatsapp: "WhatsApp",
    },
    areas: [
      "Roleplays",
      "Courses and tracks",
      "Debriefs and feedback",
      "Progress and XP",
      "Scribe",
      "Characters",
      "Authoring",
      "People and organisations",
      "Statistics",
      "WhatsApp assistant",
      "Sign-in and accounts",
      "Languages",
      "Reliability",
      "Accessibility",
      "Staff tools",
    ],
    limits: { title: 90, summary: 320, teamNotes: 2000 },
    panel: {
      title: "Product update",
      titleLabel: "Title",
      summaryLabel: "Public summary",
      teamNotesLabel: "Team notes",
      teamNotesHelp: "Markdown bullets. Only the team digest shows these.",
      kindLabel: "Kind",
      audienceLabel: "Audience",
      audienceHelp:
        "Public updates appear on app.helloally.ai/blog/changelog once live. Internal ones only reach the team digest.",
      surfacesLabel: "Surfaces",
      surfacesRequired: "Pick at least one surface.",
      areaLabel: "Area",
      hiddenLabel: "Hide from the public changelog",
      hiddenHelp:
        "A hidden update never appears on the public changelog, even if its audience is Public. You can unhide it later.",
      titleRequired: "A title is required.",
      summaryRequired: "A public summary is required.",
      tooLong: (label: string, max: number) => `${label} must be ${max} characters or fewer.`,
      counter: (used: number, max: number) => `${used}/${max}`,
      unsavedChangesWarning: "You have unsaved changes. Are you sure you want to close?",
      fromAutomation: "From the automation",
      confidence: "Confidence",
      lowConfidence: "Low confidence — check the wording",
      reason: "Automation's reason",
      model: "Model",
      firstMerged: "First merged",
      lastMerged: "Last merged",
      liveOn: "Live",
      publishedOn: "Published",
      notYet: "Not yet",
      none: "—",
      merges: "Merges",
      loadingMerges: "Loading merges…",
      mergesFailed: "Could not load the merges.",
      noMerges: "No merges recorded.",
      push: "push",
      liveOnDate: (date: string) => `✓ live on ${date}`,
      waitingOn: (deployables: string) => `waiting on ${deployables}`,
      waitingGeneric: "waiting on release",
      editedFields: "Edited by a person",
    },
  },

  // Org detail > Text helpline tab: the anonymous text helpline's per-organisation settings.
  // Written for a platform admin configuring a helpline for an organisation. Functions are for
  // interpolated strings.
  textHelpline: {
    // The help marker's accessible name: "About Maximum wait (minutes)".
    moreInfoAbout: (subject: string) => `About ${subject}`,
    loading: "Loading text helpline settings…",
    loadFailed: "Could not load the text helpline settings.",
    retry: "Retry",

    enableLabel: "Enable text helpline",
    enableHint:
      "Turns on the anonymous text helpline for this organisation: its public link starts accepting talkers, and people in the Listener and Helpline supervisor groups see the Helpline tab. Turning it off stops new chats; chats already open finish normally.",
    enableFailed: "Could not change whether the text helpline is enabled.",

    publicLinkLabel: "Public link",
    publicLinkNote: "The link only works while the text helpline is enabled.",
    copyLink: "Copy link",
    linkCopied: "Link copied",
    linkCopyFailed: "Could not copy the link. Select it and copy it by hand.",
    openLink: "Open",

    save: "Save",
    saving: "Saving…",
    discard: "Discard changes",
    unsavedChanges: "You have unsaved changes.",
    saved: "Text helpline settings saved",
    saveFailed: "Could not save the text helpline settings.",
    fixErrors: (count: number) =>
      count === 1 ? "Fix 1 problem before saving." : `Fix ${count} problems before saving.`,

    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    languageNames: {
      en: "English",
      hi: "Hindi",
      mr: "Marathi",
      ta: "Tamil",
      kn: "Kannada",
    } as Record<string, string>,

    availability: {
      title: "Availability",
      alwaysOpen: "Open whenever a listener is Available",
      setHours: "Set opening hours",
      modeLabel: "When the helpline is open",
      modeHint:
        "Opening hours limit when talkers can start a chat. Outside them the page tells talkers the helpline is closed and shows emergency resources. Inside them it is still only open while a listener is Available, unless queueing is allowed below.",
      timezone: "Timezone",
      timezoneHint: "Opening and closing times are read in this timezone.",
      open: "Open",
      opensAt: (day: string) => `${day} opening time`,
      closesAt: (day: string) => `${day} closing time`,
      extraWindows: (count: number) =>
        count === 1
          ? "1 more opening window on this day is kept as saved."
          : `${count} more opening windows on this day are kept as saved.`,
      allowQueue: "Queue talkers when no listener is Available",
      allowQueueHint:
        "Lets talkers wait and see they are in line even when nobody is on shift. Without it, the page tells talkers nobody is available.",
      maxWaitMinutes: "Maximum wait (minutes)",
      maxWaitMinutesHint:
        "A waiting talker's chat ends after this long, and they are shown emergency resources.",
      idleEndMinutes: "End idle chats after (minutes)",
      idleEndMinutesHint: "An active chat ends after the talker has been disconnected this long.",
      maxWaitingTalkers: "Maximum talkers waiting",
      maxWaitingTalkersHint:
        "Above this number the page tells new talkers the helpline is very busy.",
      orgMaxConcurrent: "Maximum concurrent chats per listener",
      orgMaxConcurrentHint:
        "The organisation-wide cap. Each listener can choose a lower number for themselves.",
    },

    languages: {
      title: "Languages offered",
      hint: "Talkers pick from these languages; listeners see the language on each chat.",
    },

    talkerText: {
      title: "Talker-facing text",
      description: "Shown to people using the public link. Write each text in its own language.",
      emergencyResources: (language: string) => `Emergency resources (${language})`,
      emergencyResourcesHint:
        "Shown on the talker's consent and waiting screens, and sent automatically into the chat once if the talker may be at high risk. Keep phone numbers current.",
      closingMessage: (language: string) => `Closing message (${language})`,
      closingMessageHint: "Shown to the talker when a chat ends. Optional.",
      ageNotice: "Age notice",
      ageNoticeHint:
        "Shown on the consent screen before a talker starts, for example a minimum age or a note about guardians. Optional.",
    },

    safety: {
      title: "Safety",
      escalationChecklist: "Escalation checklist",
      escalationChecklistHint:
        "Listeners see this checklist, in this order, when a risk flag is raised.",
      checklistEmpty: "No steps. Listeners will not see a checklist when a risk flag is raised.",
      checklistStep: (position: number) => `Checklist step ${position}`,
      addStep: "Add step",
      moveUp: "Move up",
      moveDown: "Move down",
      remove: "Remove",
      stepAction: (action: string, position: number) => `${action} step ${position}`,
      riskHighConfidence: "Risk confidence threshold for HIGH",
      riskHighConfidenceHint:
        "How sure the AI classifier must be before a flag is HIGH. HIGH alerts supervisors and sends emergency resources to the talker. Lower catches more real risk but raises more false alarms; higher means fewer false alarms but more missed risk. Keyword matches are always flagged regardless.",
      supervisorAlerts: "Supervisor alerts",
      supervisorAlertsHint:
        "Alerts name the chat, the risk level and the source. They never include what anyone wrote.",
      alertInApp: "In-app",
      alertPush: "Push",
      slackWebhookUrl: "Slack webhook URL",
      slackWebhookUrlPlaceholder: "https://hooks.slack.com/services/…",
      listenerSupportContact: "Listener support contact",
      listenerSupportContactHint:
        "Shown to a listener after a high-risk chat ends, for example a supervisor's number or a wellbeing service. Optional.",
    },

    copilot: {
      title: "Copilot",
      suggestions: "Suggested replies",
      suggestionsHint:
        "Drafts replies a listener can use or edit. Nothing reaches the talker unless the listener sends it.",
      nudges: "Coaching nudges",
      nudgesHint:
        "Short private prompts to the listener, for example to reflect a feeling back. Talkers never see them.",
      riskClassifier: "AI risk classifier",
      riskClassifierHint:
        "Uses AI to judge how risky a conversation is. Keyword screening stays on either way.",
      rollingSummary: "Update the rolling summary every (talker turns)",
      rollingSummaryHint:
        "The rolling summary is the running recap of the chat shown to the listener. Lower numbers keep it fresher but make more AI calls.",
    },

    retention: {
      title: "Retention",
      days: "Delete chat content after (days)",
      daysHint:
        "After this many days, message text, summaries, feedback comments and notes are erased. Counts and timings are kept.",
      foreverWarning:
        "Chats will be kept forever. Only choose this if your organisation has a policy that requires it.",
    },

    summaryFields: {
      title: "Summary fields",
      hint: "The fields the AI drafts at the end of a chat, which the listener reviews.",
      empty: "No summary fields yet.",
      add: "Add field",
      key: "Key",
      label: "Label",
      description: "Description",
      remove: "Remove",
      removeField: (position: number) => `Remove summary field ${position}`,
      keyFor: (position: number) => `Summary field ${position} key`,
      labelFor: (position: number) => `Summary field ${position} label`,
      descriptionFor: (position: number) => `Summary field ${position} description`,
    },

    errors: {
      wholeNumberBetween: (min: number, max: number) =>
        `Enter a whole number from ${min} to ${max}.`,
      wholeNumberAtLeast: (min: number) => `Enter a whole number, ${min} or more.`,
      numberBetween: (min: string, max: string) => `Enter a number from ${min} to ${max}.`,
      languagesRequired: "Offer at least one language.",
      emergencyResourcesRequired: (language: string) =>
        `Add emergency resources for ${language}, or stop offering it.`,
      hoursNeedOneDay:
        "Choose at least one open day, or switch to opening whenever a listener is Available.",
      timezoneRequired: "Choose a timezone.",
      timesRequired: (day: string) => `${day}: set both an opening and a closing time.`,
      closeAfterOpen: (day: string) => `${day}: the closing time must be after the opening time.`,
      checklistStepEmpty: (position: number) =>
        `Checklist step ${position} is empty. Fill it in or remove it.`,
      slackWebhookUrl: "Use a Slack incoming-webhook URL starting with https://hooks.slack.com/",
      summaryKeyRequired: "Key is required.",
      summaryKeyFormat: "Use lowercase letters, numbers and underscores, starting with a letter.",
      summaryKeyDuplicate: "Keys must be unique.",
      summaryLabelRequired: "Label is required.",
    },
  },
  skillExperiments: {
    tabs: { skills: "Skills", experiments: "Auto-improve" },
    intro:
      "Auto-improve keeps testing revised versions of a skill on live traffic, judged against your rubric, and pauses when the best version reaches your target.",
    notConnectedNote:
      "Only skills that report their outputs can be auto-improved. Ask engineering to connect another skill.",
    loading: "Loading skills…",
    loadError: "Couldn't load auto-improve. Your skills are unaffected.",
    empty: "No skills are connected to auto-improve yet.",
    columns: {
      skill: "Skill",
      runsIn: "Runs in",
      status: "Status",
      best: "Best version",
      target: "Target",
      lastActivity: "Last activity",
    },
    runtime: { "ally-be": "Backend", "ally-ai": "AI service" } as Record<string, string>,
    never: "—",
    status: {
      off: "Off",
      baseline: "Collecting baseline",
      testing: "Testing",
      paused: "Paused — needs review",
    } as Record<string, string>,
    pausedReason: {
      target_reached: "The best version reached your target score. It now serves all traffic.",
      baseline_meets_target:
        "The original already meets your target score, so there was nothing to improve.",
      max_variants: "This run used its variant budget. The best version serves all traffic.",
      no_progress:
        "Several challengers in a row failed to beat the best version. It serves all traffic.",
      designer_failed:
        "The designer couldn't write a draft that kept the runtime placeholders intact. The best version serves all traffic.",
    } as Record<string, string>,
    drawer: {
      title: (name: string) => `Auto-improve: ${name}`,
      loadError: "Couldn't load this experiment.",
      offBody: "Auto-improve is off. The skill serves its own text.",
      baselineBody: (judged: number, needed: number) =>
        `Collecting a baseline: ${judged} of ${needed} outputs of the original judged. The first variant is drafted after that.`,
      testingBody: (challenger: string, percent: number, champion: string) =>
        `Testing ${challenger} on ${percent}% of traffic against ${champion}.`,
      draftingBody: (champion: string) =>
        `${champion} serves all traffic while the designer drafts the next variant.`,
      waiting: (count: number) => `${count} outputs waiting for the judge`,
      spend: (cost: string, calls: number) =>
        `Judge and designer spend: ${cost} over ${calls} calls`,
      spendUnpriced: "some calls used a model without pricing",
      lastError: "The last loop run hit an error and will retry:",
      outputsNote: (description: string) => `An output of this skill is: ${description}`,
      turnOn: "Turn on auto-improve",
      turnOnDisabled: "Save a rubric with at least one criterion first.",
      turnOnUnsaved: "Save your rubric changes first — the judge uses the saved rubric.",
      turnOff: "Turn off",
      resume: "Resume",
      apply: (label: string) => `Apply ${label} to the skill`,
      applyDisabled: "The original is still the best version — there's nothing to apply.",
      confirmTurnOnTitle: "Turn on auto-improve?",
      confirmTurnOnBody:
        "Outputs of this skill will be stored and judged, and once there's a baseline, AI-drafted versions will serve part of its live traffic. Runtime placeholders are locked, and a draft that breaks the output format is pulled automatically.",
      confirmTurnOffTitle: "Turn off auto-improve?",
      confirmTurnOffBody:
        "The skill goes back to its own text immediately. The variants and scores stay here for reference; turning it on again starts a new run.",
      confirmApplyTitle: (label: string) => `Apply ${label}?`,
      confirmApplyBody:
        "Its text becomes the skill's new version in System Skills (the current text stays in the version history) and auto-improve turns off.",
      cancel: "Cancel",
      actionFailed: "That didn't work. Refresh and try again.",
      applied: (label: string) => `${label} is now the skill's text.`,
      saved: "Saved.",
    },
    rubric: {
      heading: "Evaluation rubric",
      help: "The judge scores every output 1–5 on each criterion; the overall score is the weighted average on a 0–100 scale. Describe what a 5 looks like.",
      lockedWhileLive:
        "Turn auto-improve off to change the rubric — scores under a different rubric can't be compared with the ones collected so far.",
      name: "Criterion",
      description: "What a 5 looks like",
      weight: "Weight",
      weightHelp: "How much this criterion counts, 1 (a little) to 5 (a lot).",
      add: "Add criterion",
      remove: (name: string) => `Remove ${name || "criterion"}`,
      save: "Save rubric",
      max: (count: number) => `Up to ${count} criteria.`,
      errors: {
        nameRequired: "Every criterion needs a name.",
        descriptionRequired: "Every criterion needs a description.",
        duplicate: "Two criteria have the same name.",
        empty: "Add at least one criterion.",
      },
    },
    settings: {
      heading: "Settings",
      save: "Save settings",
      targetScore: "Target score (0–100)",
      targetScoreHelp: "The loop pauses once the best version's average judged score reaches this.",
      minSamples: "Outputs judged per version",
      minSamplesHelp:
        "How many outputs each version needs before it's compared. More is slower but surer.",
      traffic: "Challenger traffic (%)",
      trafficHelp:
        "The share of the skill's live traffic a new draft gets while it's tested. The rest gets the current best version.",
      maxVariants: "Variant budget per run",
      maxVariantsHelp: "Drafts the loop may test before pausing for your review.",
      maxLosses: "Losses in a row before pausing",
      maxLossesHelp:
        "If this many drafts in a row fail to beat the best version, the loop pauses rather than keep spending.",
      minImprovement: "Minimum improvement (points)",
      minImprovementHelp:
        "A draft must beat the best version by at least this many points — and by more than chance — to replace it.",
      judgeModel: "Judge model",
      judgeModelHelp:
        "The model that scores outputs. Locked while a run is live, because scores from two judges can't be compared.",
      designerModel: "Designer model",
      designerModelHelp: "The model that drafts revised versions of the skill.",
      defaultModel: "Default",
      invalid: (label: string, min: number, max: number) =>
        `${label}: enter a number from ${min} to ${max}.`,
    },
    placeholders: {
      heading: "Locked runtime placeholders",
      help: "Code fills these in when the skill runs. Every draft must keep each one exactly as written; a draft that drops, renames or adds one is rejected and never served.",
      none: "This skill has no runtime placeholders.",
    },
    variants: {
      heading: "Versions",
      earlierRuns: (count: number) => `Earlier runs (${count})`,
      run: (run: number) => `Run ${run}`,
      none: "No versions yet. Turn auto-improve on to start a run.",
      status: {
        champion: "Best version",
        challenger: "Testing",
        retired: "Retired",
        rejected: "Rejected — never served",
      } as Record<string, string>,
      judged: (count: number) => `${count} judged`,
      score: "Score",
      noScore: "Not scored yet",
      changeSummary: "What changed",
      hypothesis: "Why it should score higher",
      outcome: "Outcome",
      text: "Text",
      showText: "Show text",
      hideText: "Hide text",
      showOutputs: "Show judged outputs",
      hideOutputs: "Hide judged outputs",
      perCriterion: "Average per criterion (1–5)",
    },
    outputs: {
      loading: "Loading outputs…",
      empty: "No judged outputs for this version yet.",
      error: "Couldn't load outputs.",
      failedCall: "The skill call failed",
      brokeFormat: "Broke the output format",
      judgeFailed: "The judge couldn't score this one",
      input: "Input",
      output: "Output",
      more: "Load more",
    },
    timeline: {
      heading: "Timeline",
      empty: "Nothing has happened yet.",
      byLoop: "Auto-improve",
      byAdmin: "Admin",
    },
    sidePanel: {
      running: (status: string) => `Auto-improve: ${status}.`,
      editWarning:
        "Saving a change to this skill's text restarts the experiment from your new text.",
      open: "Open experiment",
    },
  },
  // Course Copilot work pane — the right-hand side of /course-copilot/:id (Brief, Blueprint,
  // Build, Course). The shell, session list and chat copy live under `courseCopilot` above.
  //
  // Copy marked "decided" is fixed in the product contract and repeated verbatim: change
  // `plans/course-copilot-build/contract.md` first. Everything else follows Builder's voice.
  courseCopilotPane: {
    paneLabel: "Course workspace",
    tabs: {
      brief: "Brief",
      blueprint: "Blueprint",
      build: "Build",
      course: "Course",
      unavailable: "Nothing to show here yet.",
      updated: "Updated",
    },

    // Completion-rule phrases, shared by the blueprint rows and the course cards.
    completion: {
      minScore: (score: number) => `Min score ${score}`,
      passScore: (score: number) => `Pass mark ${score}`,
      watchPct: (pct: number) => `Watch ${pct}%`,
      minRead: (duration: string) => `Read for ${duration}`,
      minDuration: (duration: string) => `At least ${duration}`,
    },

    // Brief — read-only, fills in as the interview goes.
    brief: {
      heading: "Course brief",
      // Decided.
      empty: "The brief fills in as you answer.",
      ready: "Ready for a blueprint",
      stillNeeded: "Still needed:",
      sections: {
        seed: "Where this started",
        audience: "Audience",
        outcomes: "Outcomes",
        competencies: "Competencies",
        behaviours: "Behaviours",
        assessment: "Assessment",
        shape: "Shape",
        practice: "Practice ladder",
        look: "Look",
        videos: "Videos",
        notes: "Notes",
      },
      audience: {
        who: "Who",
        priorExperience: "Prior experience",
        applicationContext: "Where they'll use it",
        groupNote: "Group",
      },
      outcomes: {
        terminal: "By the end, learners can",
        enabling: "Building blocks",
      },
      behaviours: {
        helpful: "Helpful",
        unhelpful: "Unhelpful",
      },
      assessment: {
        how: "Evidence",
        threshold: "Threshold",
        note: "Note",
        passMark: (score: number) => `${score} to pass`,
        kind: {
          roleplay: "Capstone roleplay",
          quiz: "Graded quiz",
          annotated_artifact: "Annotated transcript",
          journal: "Reflective journal",
        } as Record<string, string>,
      },
      shape: {
        duration: "Duration",
        sections: "Sections",
        weight: "Balance",
        componentsLabel: "Components",
        tone: "Tone",
        readingLevel: "Reading level",
        languages: "Languages",
        languageCount: (count: number) => (count === 1 ? "1 language" : `${count} languages`),
        weights: {
          "practice-heavy": "Practice-heavy",
          balanced: "Balanced",
          "reading-heavy": "Reading-heavy",
        } as Record<string, string>,
        components: {
          article: "Articles",
          video: "Videos",
          journal: "Journals",
          annotated_artifact: "Annotated transcripts",
          game: "Game breaks",
          quiz: "Quizzes",
        } as Record<string, string>,
      },
      practice: {
        slot: (number: number) => `Practice ${number}`,
        library: "From library",
        new: "New roleplay",
        minScore: (score: number) => `Min score ${score}`,
        savesCharacter: "The client is saved to the Character Library",
      },
      look: {
        coverLabel: "Cover",
        articleImagesLabel: "Article images",
        cover: {
          generate: "Generate one",
          library: "Pick from the cover library",
          "upload-later": "Upload later",
        } as Record<string, string>,
        articleImages: {
          none: "None",
          "cover-only": "Cover only",
          "one-per-article": "One per article",
        } as Record<string, string>,
      },
      videos: {
        sources: {
          youtube: "YouTube",
          vimeo: "Vimeo",
          loom: "Loom",
          s3: "Uploaded",
        } as Record<string, string>,
      },
    },

    // Blueprint — the editable tree.
    blueprint: {
      untitledCourse: "Untitled course",
      courseTitleLabel: "Course title",
      untitledSection: (number: number) => `Section ${number}`,
      sectionNumber: (number: number) => `Section ${number}`,
      sectionTitleLabel: "Section title",
      sectionSummary: (count: number, duration: string) =>
        `${count === 1 ? "1 item" : `${count} items`} · ${duration}`,
      untitledItem: "Untitled item",
      itemTitleLabel: "Item title",
      minutes: (minutes: number) => `${minutes} min`,
      newItemTitle: (typeLabel: string) => `New ${typeLabel.toLowerCase()}`,
      newSectionTitle: "New section",
      // Decided: "Needs a video link" is the label for a source of kind needs-input.
      source: {
        new: "New",
        library: "From library",
        needsInput: "Needs a video link",
      },
      dragItem: "Drag to reorder this item",
      dragSection: "Drag to reorder this section",
      moveUp: "Move up",
      moveDown: "Move down",
      moveToPreviousSection: "Move to the end of the previous section",
      moveToNextSection: "Move to the start of the next section",
      removeItem: "Remove this item",
      removeItemNamed: (name: string) => `Remove ${name}`,
      removeSection: "Remove this section",
      removeSectionNamed: (name: string) => `Remove section ${name}`,
      changeType: (name: string) => `Change type of ${name}`,
      changeTypeHint:
        "Changing the type clears what the copilot planned for this item, and it is written fresh from the title and purpose.",
      typeLocked:
        "Roleplays and cases come from the library or a persona brief. Ask the copilot in chat to change one.",
      videoLinkLabel: "Video link",
      videoLinkPlaceholder: "Paste a YouTube, Vimeo or Loom link",
      videoLinkInvalid: "Use a YouTube, Vimeo or Loom link, or a link to an uploaded video.",
      sectionEmptyHint: "No items yet. Add one below.",
      sectionEmptyReadOnly: "No items in this section.",
      addItem: "Add item",
      addItemPickerLabel: "Choose a type for the new item",
      addItemPickerHint:
        "Roleplays and cases are added by asking the copilot. A video needs a link, which you paste after adding it.",
      itemLimitReached: (limit: number) => `A course can have at most ${limit} items.`,
      addSection: "Add section",
      sectionLimitReached: (limit: number) => `A course can have at most ${limit} sections.`,
      noSectionsHint: "No sections yet. Add one to start the course.",
      editHint:
        "Edit here or ask the copilot in chat. Drag a handle (or focus it and press space, then the arrow keys) to reorder; the up and down arrows also move an item into the next or previous section.",
      busyNotice:
        "The copilot is working on this blueprint, so editing is paused until it finishes.",
      draftNotice:
        "The copilot is still preparing this blueprint. You can edit it once it is ready for your review.",
      approvedNotice:
        "This is the blueprint you approved. To change the course now, ask the copilot or use the editor.",
      replacedNotice:
        "The copilot updated the blueprint, so the change you were making was replaced. Make it again if you still want it.",
      saving: "Saving…",
      saved: "Saved",
      saveFailed: "Couldn't save your changes.",
      retrySave: "Try again",
      removeSectionConfirmTitle: "Remove this section?",
      removeSectionConfirmBody: (name: string, count: number) =>
        `"${name}" and its ${count === 1 ? "1 item" : `${count} items`} will be removed from the blueprint.`,
      removeSectionConfirm: "Remove section",
      removeSectionKeep: "Keep it",
      problems: {
        noSections: "Add at least one section.",
        untitledSection: (number: number) => `Section ${number}`,
        sectionNeedsTitle: (number: number) => `Give section ${number} a title.`,
        sectionEmpty: (name: string) => `"${name}" has no items.`,
        itemNeedsTitle: (sectionName: string) => `An item in "${sectionName}" needs a title.`,
        videoNeedsLink: (name: string) => `"${name}" needs a video link.`,
      },
      footer: {
        duration: "Duration",
        target: (duration: string) => `of ${duration} asked for`,
        items: "Items",
        newRoleplays: "New roleplays",
        images: "Images",
        estimatedCost: "Estimated cost",
        estimateUpdating: "updating…",
        estimateHint:
          "A rough estimate of what the AI will cost to write everything in this blueprint. The real figure can differ, and the build pauses if it reaches the budget ceiling.",
        remainingBudget: "Budget left",
        noCap: "No ceiling",
        overBudget: (estimate: string, remaining: string) =>
          `The estimate (${estimate}) is more than the budget left (${remaining}). Raise the budget, or trim the course.`,
        overBudgetShort: "Raise the budget or trim the course first.",
        raiseBudget: "Raise budget",
        problemsHeading: "Fix these before building",
        fixProblems: "Fix the problems above first.",
        // Decided.
        approve: "Approve & build",
        approveHint:
          "Starts writing the course: the copilot creates a draft course and writes every item in this blueprint. Nothing is published.",
        busy: "The copilot is still replying.",
        saving: "Saving your changes…",
        saveFailed: "Your last change didn't save.",
      },
    },

    // Raise-the-ceiling dialog — before approval (over budget) and mid-build (held).
    budget: {
      dialog: {
        title: "Raise budget",
        intro: "Raise this session's spend ceiling.",
        heldIntro:
          "The build is holding at the ceiling. Raise it and the waiting items carry on from where they stopped. Nothing already written is re-run.",
        spentLabel: "Spent so far",
        currentLabel: "Current ceiling",
        currentNone: "No ceiling",
        estimateLabel: "Estimate",
        newLabel: "New ceiling (USD)",
        newHint:
          "Has to be above what has already been spent, or the build would stop again at once. Set 0 to remove the ceiling.",
        invalid: (spent: string) =>
          `Enter more than the ${spent} already spent, or 0 for no ceiling.`,
        cancel: "Cancel",
        submit: "Raise budget",
        submitHeld: "Raise and continue",
      },
    },

    // Build — jobs, progress, cost.
    build: {
      // Decided.
      heading: "Building your course",
      headingFinished: "Build summary",
      progress: (done: number, total: number) => `${done} of ${total} done`,
      progressLabel: "Build progress",
      notStarted: "Not started yet",
      elapsed: (duration: string) => `${duration} elapsed`,
      failedCount: (count: number) => `${count} failed`,
      skippedCount: (count: number) => `${count} skipped`,
      pausedCount: (count: number) => `${count} paused`,
      spendLabel: "Spent",
      spentOfCeiling: (spent: string, ceiling: string) => `${spent} of ${ceiling}`,
      spentNoCeiling: (spent: string) => `${spent} · no ceiling`,
      noJobs: "No build jobs yet.",
      groupCourse: "Course",
      attempts: (count: number) => `attempt ${count}`,
      retry: "Retry",
      retryAll: "Retry all failed",
      retrySkipped: "Retry skipped",
      cancel: "Cancel build",
      openRoleplay: "Open roleplay",
      outlineHeading: "Course so far",
      // Decided job-status wording.
      status: {
        queued: "Waiting",
        running: "Writing…",
        done: "Done",
        failed: "Failed",
        skipped: "Skipped",
        held: "Paused",
      } as Record<string, string>,
      kinds: {
        course_meta: "Course details",
        article: "Article",
        quiz: "Quiz",
        journal: "Journal",
        annotated_artifact: "Annotation",
        game: "Game",
        video: "Video",
        roleplay_new: "New roleplay",
        roleplay_ref: "Library roleplay",
        case_new: "New case",
        case_ref: "Library case",
        cover_image: "Cover image",
        article_image: "Article image",
        course_review: "Course review",
      } as Record<string, string>,
      // Decided.
      failedBanner: {
        body: "The build stopped responding. Retry picks up where it left off — nothing already written is lost.",
        retry: "Retry",
      },
      // Decided.
      heldBanner: {
        body: (spent: string, ceiling: string) =>
          `Paused at the budget ceiling — ${spent} of ${ceiling} spent. Raise the ceiling to continue, or stop here and keep what's built.`,
        raise: "Raise budget",
      },
      // Decided.
      cancelConfirm: {
        title: "Stop the build?",
        body: "Items already written stay in the course; waiting items are skipped.",
        confirm: "Stop the build",
        keep: "Keep building",
      },
    },

    // Course — the built outline, publish checklist and change log.
    course: {
      empty: "The course outline will appear here once it has been written.",
      emptyCompact: "The outline fills in as items are written.",
      noCover: "No cover yet",
      untitledCourse: "Untitled course",
      untitledSection: (number: number) => `Section ${number}`,
      duration: (duration: string) => `About ${duration}`,
      noSections: "This course has no sections yet.",
      sectionEmpty: "No items in this section.",
      status: {
        DRAFT: "Draft",
        ACTIVE: "Published",
        ARCHIVED: "Archived",
      } as Record<string, string>,
      // Decided.
      structureLocked: "Structure locked — learners are enrolled",
      structureLockedHint:
        "Learners are enrolled, so sections and items can't be added, removed or reordered. Editing what's inside an item still works.",
      openEditor: "Open in editor",
      // Decided.
      openEditorBuildingHint:
        "Wait for the build to finish — the copilot overwrites edits made during the build.",
      readiness: {
        heading: "Publish readiness",
        // Decided.
        ready: "Ready to publish",
        needs: (labels: string[]) => `Needs: ${labels.join(", ")}`,
        askCopilot: "Ask the copilot",
        askCopilotMessage: (label: string, detail: string) =>
          `Please fix this before we publish: ${label}${detail}`,
      },
      changeLog: {
        heading: "What the copilot changed",
        showMore: (count: number) => `Show ${count} more`,
        showLess: "Show fewer",
      },
      preview: {
        generated: "Generated",
        moreImages: (count: number) => (count === 1 ? "+1 more image" : `+${count} more images`),
        words: (count: number) => `${count} words`,
        checks: (count: number) => (count === 1 ? "1 check" : `${count} checks`),
        resources: (count: number) => (count === 1 ? "1 resource" : `${count} resources`),
        questions: (count: number) => (count === 1 ? "1 question" : `${count} questions`),
        passMark: (score: number) => `Pass mark ${score}`,
        questionTypes: {
          mcq_single: "Multiple choice",
          mcq_multi: "Select all",
          true_false: "True or false",
          open_ended: "Open-ended",
          likert: "Rating scale",
        } as Record<string, string>,
        morePrompts: (count: number) => (count === 1 ? "+1 more prompt" : `+${count} more prompts`),
        lines: (count: number) => (count === 1 ? "1 line" : `${count} lines`),
        targets: (count: number) => (count === 1 ? "1 target" : `${count} targets`),
        roleplayNotLinked: "No roleplay linked yet",
        openRoleplay: "Open roleplay",
        caseNotLinked: "No case linked yet",
        roleplays: (count: number) => (count === 1 ? "1 roleplay" : `${count} roleplays`),
        gameNames: {
          TREX_RUNNER: "T-Rex Runner",
          TIC_TAC_TOE: "Tic-Tac-Toe",
          MEMORY_MATCH: "Memory Match",
          CUB_N_PUP: "Cub n Pup",
          SNAKE: "Snake",
          SPROUT: "Sprout",
        } as Record<string, string>,
        videoSources: {
          youtube: "YouTube",
          vimeo: "Vimeo",
          loom: "Loom",
          s3: "Uploaded",
        } as Record<string, string>,
      },
    },
  },
};
