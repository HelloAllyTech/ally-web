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
    autosaving: "Saving…",
    draftAutosaved: "Draft autosaved",
    autosaveFailed: "Couldn’t save — click Save to retry",
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
    additionalFields: "Additional fields",
    configureSimulationSettings: "Configure scribe fields",
    customFields: "Custom fields",
    customFieldsEnabled: "Enable custom fields",
    characterLibraryEnabled: "Enable Character Library",
    characterLibraryEnabledHint:
      "Lets this organisation's admins build their own characters, including with the interview agent. They see only characters their own organisation creates, and cannot edit or delete one once saved.",
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
  characterInterview: {
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
      providerHelp:
        "Set in the environment, not here. This only shows whether each value is present.",
      messagesSection: "Messages",
      disclaimerLabel: "First-contact disclaimer",
      disclaimerHelp: "Shown once, added on top of the answer to their first question.",
      crisisLabel: "Crisis reply",
      declineLabel: "When the corpus has no answer",
      fallbackLabel: "When something goes wrong",
      unsupportedMediaLabel: "When a photo or voice note arrives",
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
        error: "Error",
      },
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
    description:
      "Reads the last seven days of product telemetry, then files what looks broken as a bug below and what looks like a missed opportunity into Analytics \u2192 Suggestions. Nothing is fixed or filed to the roadmap without your decision.",
    scanNow: "Scan now",
    scanning: "Scanning telemetry\u2026",
    scanTooltip: "Takes about two minutes: seven detector queries, then one triage pass.",
    neverScanned: "No scan has run yet. Scans run automatically once a day.",
    scanRunning: "A scan is running now.",
    lastScanSummary: "Last scan {when}: {findings} bugs, {suggestions} suggestions filed.",
    lastScanFailed: "Last scan {when} failed. Open the scan log for the reason.",
    // Zero is a real answer, so the copy has to read correctly at zero: "0 bugs
    // and 0 suggestions filed" is a successful quiet week, not a failure.
    scanDone: "Scan complete: {findings} bugs and {suggestions} suggestions filed.",
    scanDetail: "{signals} signals crossed a threshold; {skipped} were already known.",
    detectorsFailed: "These detectors could not run: {detectors}.",
    scanConflict: "A scan is already running. Wait for it to finish before starting another.",
    scanUnavailable:
      "Product telemetry is unreachable, so there was nothing to scan. Nothing was filed.",
    scanFailed: "The scan could not be completed. Nothing was filed.",
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
    agentTeam: "Ally platform · ally-be, ally-web, ally-ai, ally-ai-learn, ally-mobile",
    agentHours: "Nightly sweep, plus whenever you ask",
    // The "whenever you ask" half of agentHours, which until now was not true:
    // nothing could ask.
    sweepLabel: "Sweep a repo",
    sweepButton: "Start a sweep",
    sweepButtonBusy: "Starting…",
    sweepDeepLabel: "Read the whole repo",
    sweepDeepTooltip:
      "By default a sweep only reads what changed in the last day. Reading everything finds more, costs considerably more, and is worth doing occasionally rather than nightly.",
    sweepTooltip:
      "Bug Hunter sweeps every repo overnight. Use this when you would rather not wait — for instance just after a release, or when someone has reported something you want chased down now.",
    sweepConfirmTitle: "Start a sweep of {repo}?",
    sweepConfirmBody:
      "Bug Hunter will run that repo's tests, review recent changes, read production errors and check reported bugs. In Works-solo mode it may also open pull requests. It never deploys anything.",
    sweepConfirm: "Start it",
    sweepStarted: "Bug Hunter is sweeping {repo}.",
    sweepFailed: "Could not start the sweep.",
    // Pressing it while off duty is not an error — the backend records the
    // skipped run — so say what happened rather than showing a failure.
    sweepSkipped: "Bug Hunter is off duty, so nothing was swept.",
    // The sweep controls fold behind this. See SweepPanel.tsx for why these
    // fold and the working-style switcher does not.
    sweepPanelShow: "Sweep a repo now",
    sweepPanelHide: "Hide sweep controls",
    agentIntro:
      "I read the Ally repos every night, reproduce what I find with a failing test, fix it and open the PR. When a call isn't mine to make, I stop and ask you.",
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
    // ── Lifecycle buckets (the chip row above the bugs table) ────────────────
    // Seventeen statuses collapsed into the seven groups an admin scans for,
    // named by whose move it is next. These replace both the four-tile workload
    // strip on the card and the flat seventeen-item status <Select>; see
    // lifecycleBucket.ts for why the groups are cut this way.
    //
    // "In progress" and "In review" keep the workload tiles' exact wording on
    // purpose — the numbers moved, the vocabulary shouldn't.
    bucketGroupLabel: "Filter bugs by what needs to happen next",
    bucketAll: "Everything",
    bucketNeedsYou: "Needs your call",
    // Not "Failed": the bucket holds a failed fix and a failed release, and the
    // shared fact is that a job went red, which is also how the status line
    // says it ("{count} of my jobs went red").
    bucketProblem: "Went red",
    // NEW, APPROVED and BLOCKED — recorded, accepted, nobody blocked, not
    // started. "Queued" would collide with the QUEUED status pill ("Starting…").
    bucketQueued: "On the list",
    bucketInFlight: "In progress",
    bucketInReview: "In review",
    // Matches the RELEASED status pill's own label rather than inventing a
    // second word for production.
    bucketShipped: "Live",
    bucketClosed: "Closed",

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
    modeOff: "Off duty",
    modeManual: "Checks with you",
    modeAi: "Works solo",
    modeTooltip:
      "Off duty blocks every trigger, nightly and on-demand alike — there is no separate pause. Checks with you (Manual mode) and Works solo (AI mode) both keep it finding bugs on schedule; only Checks with you holds the fix stage for your approval on each bug, in the table below. Changing this mid-run lets the current run finish under the old setting.",
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
    lastChangedBy: "Working style last set by user #{userId}",
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
      'I discover and verify bugs the same way in both, on the same schedule. On Works solo (AI mode) a bug I\'ve verified goes straight to the fix stage. On Checks with you (Manual mode) it waits at "Pending approval" in my table until you approve it — I fix nothing without a click from you first.',
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
      "In my messages at the top of this page — that's the only place I speak. I post there when I need an answer from you, when something has gone wrong, and when a fix reaches production. The count beside them is what's unread; it turns orange when I'm actually blocked waiting on you. A bug at \"Needs input\" has an open question — open it to read and answer. A quiet, successful night gets no message at all, on purpose.",
    faqReposTitle: "Which repos do you touch?",
    faqReposBody: "ally-be, ally-web, ally-ai, ally-ai-learn and ally-mobile.",
    faqCostTitle: "What does a night of your work cost?",
    faqCostBody:
      "Every sweep's estimated token cost is in my shift log below, from the same LLM usage data the platform's cost analytics use.",
    faqOffTitle: "How do I stop you?",
    faqOffBody:
      "Set my working style to Off duty above. That blocks every trigger immediately — nightly and on-demand alike.",
    // ── Findings table (the comprehensive bug table) ──────────────────────────
    findingsTitle: "Bugs I'm tracking",
    // No longer "newest first": the table sorts by three columns now, so stating
    // one order as a property of the list would be wrong the moment anyone
    // clicks a header. Newest-first is still the default.
    findingsSubtitle:
      "Everything I know about, from any source. Search it, or filter by what needs doing.",
    findingColumnTitle: "Bug",
    findingColumnRepo: "Repo",
    findingColumnSeverity: "Severity",
    findingColumnStatus: "Status",
    // Sorting by status walks the lifecycle rather than the alphabet, which is
    // worth saying: "sort by status" reads as an arbitrary ordering until you
    // know that clicking it brings your own unfinished work to the top.
    findingColumnStatusTooltip:
      "Where a bug is in my pipeline. Sorting by it groups the list the way the chips above do — whatever is waiting on you first, then my own work in the order I do it, then what's finished.",
    // `findingColumnStage` itself already lives with the stage labels below.
    findingColumnStageTooltip:
      "The coarse roadmap ladder — New, Prioritised, In development, Released — so a bug reads the same way as an idea on the roadmap board. I derive it from the status on its left unless somebody pinned it by hand.",
    findingColumnPr: "PR",
    findingSourceTestFailure: "Failing test",
    findingSourceLintError: "Lint error",
    findingSourceCodeReview: "Code review",
    findingSourceProductionLog: "Production log",
    findingSourceReportedBug: "Reported by team",
    findingSourceAnalyticsSuggestion: "Analytics suggestion",
    findingSourceUxSignal: "UX signal",
    findingSeverityLow: "Low",
    findingSeverityMedium: "Medium",
    findingSeverityHigh: "High",
    findingSeverityNone: "—",
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
    findingColumnStage: "Stage",
    findingStagePinnedTooltip:
      "Stage set by hand by {name} on {date}. It no longer follows the fix pipeline.",
    findingStageAutoTooltip:
      "Stage follows the fix pipeline automatically — it's {stage} because this bug is {status}.",
    findingStagePinned: "pinned",
    stageSectionTitle: "Stage",
    stageAutoLabel: "Following the pipeline",
    stageEditLabel: "Set stage by hand",
    stageEditHint:
      "Use this when the bug was fixed outside Bug Hunter — a hand-written PR, a config change, a fix that came along with other work. Once set by hand, the stage stops following the pipeline.",
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
    reporterContextScreen: "Screen",
    reporterContextDevice: "Device",
    reporterContextOs: "OS",
    reporterContextAppVersion: "App version",
    reporterContextClientTimestamp: "Reported at (their clock)",
    reporterTenant: "Tenant",
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
    // a triager's daily surface; "Performance" is the monthly governance one —
    // see BugHunter.tsx on why those are two readers and not one long page.
    sectionWork: "Work",
    sectionPerformance: "Performance",
    sectionAbout: "About",
    filtersButton: "Filters",
    filtersPanelLabel: "Filter bugs",
    filterSectionStatus: "Status",
    filterSectionRepo: "Repo",
    filterSectionSeverity: "Severity",
    filterSectionSource: "Source",
    filterSectionStage: "Roadmap stage",
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
    noMatchSubtitle: "Clear them, or pick a different group above.",
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
    drawerDescriptionEdit: "Rewrite this for me",
    drawerDescriptionEditTooltip:
      "This description is the entire brief I work from — I'm told the bug in these words and nothing else, and I use them to work out which codebase it's even in. If it's vague, say what breaks, when, and what should happen instead. Rewriting doesn't approve anything or start anything; it just means I'll be better briefed when you do.",
    drawerDescriptionEditLabel: "The bug, as you want me to understand it",
    drawerDescriptionEditPlaceholder:
      "What breaks, when it breaks, and what should happen instead…",
    drawerDescriptionEditSave: "Save description",
    drawerDescriptionEditCancel: "Cancel",
    drawerDescriptionEditFailed: "Couldn't save that description. Try again.",
    drawerDescriptionEditTooLong:
      "That's longer than I can take as a brief ({length} of {max} characters). Paste raw output into a comment on the PR instead — this field is what I read before I start.",
    drawerDescriptionEditedBy: "Rewritten by user #{userId}",
    drawerDescriptionShowOriginal: "See what I originally found",
    drawerDescriptionHideOriginal: "Hide what I originally found",
    drawerDescriptionOriginalTitle: "Originally",
    drawerDescriptionSettleFirst:
      "Save or cancel your rewrite first — right now I'd still be working from the description above it.",
    drawerEvidenceTitle: "Evidence",
    drawerTimelineTitle: "My work log",
    drawerTimelineEmpty: "I haven't touched this one yet.",
    drawerLoadFailed: "Couldn't load this bug's details.",
    drawerReportedBugNotice: "Your team reported this. I haven't triaged it yet.",
    drawerGuardedPathNotice:
      "This touches a guarded path — migrations, auth or payments — so I'll never merge it myself, however small the fix turns out to be.",
    drawerApprove: "Approve — go fix it",
    drawerReject: "Reject",
    drawerApproveConfirmTitle: "Approve this bug for me to fix?",
    drawerApproveConfirmBody:
      'I\'ll pick it up in the fix stage of my next sweep for this repo. If you want it done now, use "Put me on it" instead.',
    drawerRejectConfirmTitle: "Reject this bug?",
    drawerRejectConfirmBody: "I'll never pick it up. This can't be undone.",
    drawerDecisionFailed: "Couldn't record that decision. Try again.",
    drawerEscalationQuestionTitle: "I need your answer",
    drawerAnswerLabel: "Your answer",
    drawerAnswerPlaceholder: "Answer my question…",
    drawerAnswerSubmit: "Send answer",
    drawerAnswerFailed: "Couldn't send that answer. Try again.",
    drawerAnsweredBy: "Answered by user #{userId}",
    drawerDecidedBy: "Decided by user #{userId}",
    // ── Messages (Bug Hunter's only channel) ─────────────────────────────────
    inboxTitle: "Messages from Bug Hunter",
    inboxWaitingOnYou: "{count} waiting on you",
    inboxNothingBlocked: "Nothing blocked — just updates",
    inboxAllClear: "Nothing new",
    inboxMarkAllRead: "Mark all read",
    inboxEmpty: "Nothing yet. I post here when I need an answer, hit a problem, or ship something.",
    notificationLevelActionNeeded: "Needs you",
    notificationLevelProblem: "Problem",
    notificationLevelInfo: "Update",
    // ── Multi-repo plan ──────────────────────────────────────────────────────
    planTitle: "This fix spans {count} repos",
    planSubtitle:
      "I work through them in this order and release them in the same order — each one waits for the one before it.",
    planStepLabel: "Step {n}",
    // ── Fix session (on-demand) ──────────────────────────────────────────────
    drawerStartFixSession: "Put me on it",
    drawerRetryFixSession: "Ask me to try again",
    drawerFixSessionTooltip:
      "Puts me on this one bug now, instead of waiting for tonight's sweep. I write a failing test that reproduces it, fix it, check the whole suite is still green, and open a PR — merging it myself only if nothing guarded is involved. I don't deploy: releasing is a separate button once the fix is merged.",
    drawerFixSessionConfirmTitle: "Put Bug Hunter on this bug?",
    drawerFixSessionConfirmBody:
      "I'll work on this in {repo} on my own: a regression test first, then the smallest fix that makes it pass, then the full suite. If everything is green I open a PR and merge it — unless the fix touches migrations, auth or payments, which always stay a PR for you to review. I won't deploy anything in this step.",
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
    drawerStopFixSessionTooltip:
      "Cancels the running GitHub Actions job right away instead of waiting out its 60-minute cap — real compute and token savings, not just a status change. Use this when a session is clearly stuck or looping. You can put me on this bug again afterward, the same as after a failed attempt.",
    drawerStopFixSessionConfirmTitle: "Stop this fix session?",
    drawerStopFixSessionConfirmBody:
      "I'll cancel the GitHub Actions run in progress right away. Whatever I've done so far is lost — nothing partial gets merged. You can put me back on this bug afterward, the same as after a failed attempt.",
    // Deliberately not "Stop fix session" again — the button that opened this
    // dialog says that, and two identical labels on screen at once make it
    // ambiguous which one you're confirming.
    drawerStopFixSessionConfirm: "Stop it",
    drawerStopFixSessionFailed: "Couldn't stop the fix session.",
    drawerCancelledBy: "Stopped by user #{userId}",
    // ── Release to production ────────────────────────────────────────────────
    drawerRelease: "Release to production",
    drawerReleaseRetry: "Retry release",
    drawerReleaseTooltip:
      "Cuts the next patch version and runs that service's production release pipeline — for the backend that includes a database migration and an ECS rollout. This is the step where the fix actually reaches users.",
    drawerReleaseConfirmTitle: "Release this fix to production?",
    drawerReleaseConfirmBody:
      "This deploys {target} to production at the next patch version, running its full release pipeline — tests, build, database migration where applicable, and rollout. It affects live users. The fix is already merged to master either way; releasing is what puts it in front of people.",
    drawerReleaseConfirm: "Release",
    drawerReleaseFailed: "Couldn't start the release.",
    drawerReleasingNotice:
      "I'm running release {tag} now. This page updates as it goes — a backend release takes around 15 minutes.",
    drawerReleasedNotice: "This is live in production as {tag}.",
    drawerReleaseFailedNotice:
      "Release {tag} went red. The fix is still merged to master — it just isn't deployed. Check the run, then ask me to retry.",
    drawerFixSessionFailedNotice: "The fix session failed. Start a new session to retry.",
    drawerReleaseBlocked: "Why I can't release this from here",
    drawerReleasedBy: "Released by user #{userId}",
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
    statusRunning: "Running",
    statusCompleted: "Completed",
    statusFailed: "Failed",
    statusSkippedDisabled: "Skipped (off duty)",
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
    // ── Live clock (freshness readout next to the status pill) ──────────────
    updatedJustNow: "Updated just now",
    updatedSecondsAgo: "Updated {count}s ago",
    updatedMinutesAgo: "Updated {count}m ago",
    updatedHoursAgo: "Updated {count}h ago",
    // The same clock in `elapsed` mode: a bare duration, because the caller's
    // own words say what it is a duration of. No "just now" case — a counter
    // climbing from 0s is the signal.
    elapsedSeconds: "{count}s",
    elapsedMinutes: "{count}m",
    elapsedHours: "{count}h",
    // Both modes hover to the exact moment, to the second. The relative form
    // answers "is this still moving?"; only a real timestamp answers "which
    // sweep was this?", and an incident review needs the second one.
    clockUpdatedExactTitle: "Last updated {timestamp}",
    clockElapsedExactTitle: "Started {timestamp}",
    // ── Live work board ("on it right now") ─────────────────────────────────
    // The tab's only present-tense section, and the only one that reports the
    // agent's own work in progress rather than a record of it. Voice rules
    // apply as everywhere else — first person, plain, and every line ends with
    // what happens next — with one extra constraint specific to this section:
    // nothing here may be written to sound busier than the data is. The board
    // is absent entirely when nothing is in flight, so no string below ever has
    // to cover an idle agent.
    liveWorkTitle: "On it right now",
    liveWorkSubtitle:
      "These are moving on their own — nothing here needs you. Open one to follow along.",
    liveWorkSweeping: "I'm sweeping {repo}.",
    liveWorkSweepElapsedLabel: "Sweeping for {duration}",
    liveWorkStageElapsedLabel: "{duration} on this step",
    liveWorkNoRepo: "No codebase matched to this one yet",
    // What each in-flight status means, as the thing it is doing.
    liveWorkQueued: "I've queued a fix session — it starts as soon as a runner frees up.",
    liveWorkFixing:
      "I'm writing the fix now: a failing test that reproduces it first, then the change, then the whole suite.",
    liveWorkCoordinating:
      "This one spans repos, so I'm working through them in order — one has to land before the next starts.",
    liveWorkReleasing: "The release is running. I'll report how it went here in a few minutes.",
    liveWorkGeneric: "I'm working on this one now.",
    // Where a bug just got to. Shown for a few seconds after it stops being in
    // flight, which is the only moment on the tab where finishing is visible as
    // it happens rather than as a row that quietly changed colour.
    liveWorkLandedPrOpened: "Fix written and pushed — the PR is open for review.",
    liveWorkLandedMerged: "Merged to master. Putting it in front of users is your call.",
    liveWorkLandedReleased: "Released to production. Users have this fix now.",
    liveWorkLandedReleaseFailed:
      "It's merged, but the release went red. The details are on the bug.",
    liveWorkLandedNeedsInput:
      "I've stopped on this one — my question for you is in the queue above.",
    liveWorkLandedPendingApproval: "Waiting on your call before I start fixing it.",
    liveWorkLandedFailed: "That attempt went red. Whether I try again is your call.",
    liveWorkLandedCancelled: "You stopped this session. The bug is still open.",
    liveWorkLandedClosed: "Off the board — I won't pick this one up.",
    liveWorkLandedRequeued: "Back in the queue. I'll pick it up on my next pass.",
    liveWorkShowAll: "Show {count} more",
    liveWorkShowFewer: "Show fewer",
    // ── Scorecard (the governor's view: cost, throughput, reliability) ─────
    // Every other surface on this tab answers "what should I do next?". This one
    // answers "should this thing still be merging its own code?" — a different
    // question, asked by a different reader, and the one the tab could not answer
    // at all. See pages/BugHunter/agentScorecard.ts for why each window states
    // whether it is complete, and why nothing here restates a bucket count.
    scorecardTitle: "How I'm doing",
    scorecardSubtitle: "What I've cost, what I've turned up, and how often my shifts finish clean.",
    scorecardSpendLabel: "Spent",
    scorecardSpendTooltip:
      "What my shifts have cost in model usage over the window you've picked. I use the figure the Claude Code CLI reports, which prices prompt-cache reads properly; older shifts fall back to a cache-blind estimate that runs high.",
    scorecardSpendWindow7: "7 days",
    scorecardSpendWindow30: "30 days",
    scorecardSpendWindowAll: "All",
    // Not "$41" when the real answer is "$41 plus however much the shifts I'm
    // not holding cost". A floor stated as a floor is useful; a floor printed
    // as a total is the one reading that could talk someone out of looking.
    scorecardSpendFloor:
      "At least this. I'm holding my {runs} most recent shifts and this window starts before the oldest of them, so older spend in it isn't counted.",
    scorecardFoundLabel: "Bugs I turned up",
    scorecardFoundTooltip:
      "Every bug my shifts reported, counted from the shifts themselves rather than from the table above — so it includes ones already rejected, shipped or aged out of the hundred I'm holding.",
    scorecardAutoMergeLabel: "Merged without asking",
    scorecardAutoMergeTooltip:
      "How much of what I found I fixed and merged on my own — lint or type-only changes, or a single-file fix backed by a new regression test. The rest came to you as a pull request. If this climbs, I'm being trusted with more; if it falls, I'm finding harder things.",
    scorecardCleanLabel: "Shifts that finished clean",
    scorecardCleanTooltip:
      "Shifts that completed against shifts that went red. Running and off-duty shifts aren't counted either way. A falling number here usually means something in the harness is broken rather than something in the code.",
    scorecardTokensLabel: "Tokens",
    scorecardTokensValue: "{input} in / {output} out",
    scorecardTokensPartial:
      "{count} of these shifts predate token tracking, so the counts above are a floor.",
    scorecardSeriesTitle: "Last 14 days",
    scorecardSeriesCost: "Cost",
    scorecardSeriesFound: "Bugs found",
    scorecardSeriesEmpty: "I haven't worked a shift in the last 14 days.",
    scorecardSeriesDay: "{date} — {cost}, {found} bugs across {runs} shifts",
    scorecardSeriesDayQuiet: "{date} — nothing",
    scorecardWindowNotice:
      "From my {count} most recent shifts. I don't hold my whole history on this page.",
    scorecardEmptyTitle: "Nothing to report yet",
    scorecardEmptySubtitle:
      "Once I've worked a shift, what it cost and what it turned up shows up here.",
    scorecardLoadFailed: "Couldn't load the scorecard.",
    // ── Age / staleness column ─────────────────────────────────────
    findingColumnAge: "Age",
    findingColumnAgeTooltip:
      "How long a bug has been on my list. I only colour it for bugs still waiting on a decision — something that shipped last month isn't stale, it's finished.",
    findingAgeStaleTooltip: "Waiting on a decision for over a week.",
    findingAgeAncientTooltip: "Waiting on a decision for over a month.",
    // ── "Updated" column, and the run scope it exists to explain ────
    // Not "Last triaged". `updatedAt` moves for anything at all — my own sweep
    // re-reading the bug, a status change, an admin rewriting the description —
    // and a column promising it was me who last looked would be wrong roughly
    // whenever a human touched the row.
    findingColumnUpdated: "Updated",
    // Only shows once something in view has actually moved since it was found,
    // so this tooltip is never explaining a column of repeated Age values.
    findingColumnUpdatedTooltip:
      "When anything last happened to a bug — I re-read it on a sweep, its status moved, or someone rewrote it. Age is how long it's been on my list; this is whether it's been touched lately. On a bug your team reported weeks ago and I only looked at last night, those two are very far apart.",
    runScopeBanner: "Showing only the bugs my {repo} sweep at {timestamp} touched.",
    runScopeBannerLoading: "Showing only the bugs one sweep touched.",
    // The point of the sentence. "Found 10" meant ten rows touched, and most of
    // what a nightly sweep touches is bugs your team filed weeks ago — so the
    // ten were never going to be at the top of a table sorted by age, and the
    // only reading left was that they had gone missing.
    runScopeBannerHint:
      "Counts and filters below describe this sweep only. Some of these bugs are older than the sweep — I re-read what your team reported, so a bug filed weeks ago still counts as found on the night I looked at it.",
    runScopeClear: "Show all bugs",
    runScopeCellLabel: "Show the {count} bugs this {repo} sweep touched",
    // ── Row selection and quick actions ─────────────────────────────
    rowSelectLabel: "Select bug: {title}",
    selectAllLabel: "Select every bug on this page",
    selectAllTooltip:
      "Selects the bugs on this page only — not the whole filtered list, and not the bugs I'm not currently holding.",
    quickActionsColumn: "Decide",
    quickApprove: "Approve",
    quickReject: "Reject",
    quickFix: "Put me on it",
    quickActionFailed: "Couldn't record that. Try again.",
    // Deliberately not "Approve"/"Reject" again. The row button that opened the
    // dialog says those, and two identical labels on screen at once make it
    // ambiguous which one you are confirming — the same rule the fix-session
    // dialog follows with "Start now".
    quickApproveConfirm: "Approve it",
    quickRejectConfirm: "Reject it",
    quickActionNotApplicable: "That doesn't apply to this bug from where it is.",
    densityLabel: "Row height",
    densityComfortable: "Comfortable",
    densityCompact: "Compact",
    // ── Bulk triage ─────────────────────────────────────────────
    bulkBarLabel: "Bulk decisions",
    bulkSelectedOne: "1 bug selected",
    bulkSelected: "{count} bugs selected",
    bulkApprove: "Approve {count}",
    bulkReject: "Reject {count}",
    bulkClear: "Clear",
    // Approve and reject have different doors — approve needs "pending your
    // approval", reject also takes "new" — so each states its own scope rather
    // than sharing one sentence with the verb swapped in.
    bulkApproveScope: "{eligible} of {selected} can be approved from where they are.",
    bulkRejectScope: "{eligible} of {selected} can be rejected from where they are.",
    bulkApproveNone: "Approving only applies to bugs pending your approval. None of these are.",
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
    bulkProgress: "Working through {done} of {total}…",
    bulkApproveDoneOne: "Approved 1 bug.",
    bulkApproveDone: "Approved {count} bugs.",
    bulkRejectDoneOne: "Rejected 1 bug.",
    bulkRejectDone: "Rejected {count} bugs.",
    // Partial failure is the ordinary case, not the exception: a selection made
    // fifteen seconds ago can hold a bug whose status has since moved. Both
    // halves get said, and the failures get named rather than counted.
    bulkPartial: "{done} done. {failed} didn't go through: {titles}.",
    bulkPartialMore: "{done} done. {failed} didn't go through: {titles}, and {rest} more.",
    bulkAllFailed: "None of those went through, so nothing changed.",
    // ── Keyboard ───────────────────────────────────────────────
    shortcutsButton: "Keyboard",
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
    drawerCopyLinkTooltip:
      "Copies a link that opens this exact bug for whoever you send it to — the address bar carries the open bug and your filters, so a bookmark of this page is a bookmark of this view.",
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
    chat: {
      heading: "Scoping",
      placeholder: "Answer, or tell me something I haven't asked about…",
      send: "Send",
      stop: "Stop",
      streamFailed: "That turn didn't finish. Try again.",
      droppedFrames: (count: number) =>
        count === 1
          ? "One update was lost in transit — the chat may be missing a line."
          : `${count} updates were lost in transit — the chat may be missing some lines.`,
      thinking: "Thinking",
      emptyTitle: "Tell me what you want to build",
      emptyBody:
        "A sentence is enough to start. I'll read the codebase and ask about what I can't work out on my own.",
    },

    // Question cards — shared by the interview and mid-build pauses
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
      sections: {
        summary: "Summary",
        problem: "Problem",
        usersAndContext: "Users & context",
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
      },
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

    // The build screen
    build: {
      todoHeading: "Checklist",
      todoProgress: (done: number, total: number) => `${done} of ${total}`,
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
      feedStarting: "Waiting for the first update…",
      feedEmpty: "Nothing recorded for this run.",
      runLabel: (sequence: number, mode: string) =>
        mode === "resume"
          ? `Run ${sequence} (resumed)`
          : mode === "fix"
            ? `Run ${sequence} (fix)`
            : `Run ${sequence}`,
      // Run history rail — reading an older run's transcript without losing
      // the live one is the whole point, so the rail says which run is which
      // rather than leaving that to a bare sequence number.
      runHistoryHeading: "Runs",
      runHistoryEmpty: "No runs yet.",
      runDurationLive: "Running…",
      runDurationUnknown: "—",
      runModeLabels: {
        build: "Build",
        resume: "Resume",
        fix: "Fix",
      } as Record<string, string>,
      runLiveBadge: "Live",
      runStatusLabels: {
        QUEUED: "Queued",
        RUNNING: "Running",
        SUCCEEDED: "Succeeded",
        FAILED: "Failed",
        CANCELLED: "Stopped",
        TIMED_OUT: "Timed out",
        WAITING_FOR_INPUT: "Waiting on you",
      } as Record<string, string>,
      watchOnGithub: "Watch on GitHub",
      pullRequestsHeading: "Pull requests",
      noPullRequests: "No pull requests opened yet.",
      prMerged: "Merged",
      prOpen: "Open",
      reportsHeading: "Reports",
      noReports: "Nothing written up yet.",
      // A pause is a normal turn in the conversation, not a fault — the copy
      // says so, because an alarming label here would make every question
      // read as something going wrong.
      waitingHeading: "I need a decision",
      waitingBody:
        "The build is holding here until you answer. Nothing is lost — I'll pick up exactly where I stopped.",
      answerFailed: "Couldn't record that answer.",
      resumed: "Thanks — picking it back up.",
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
    cancelFailed: "Couldn't stop the build.",
    costLabel: "Spend",
    repoLabel: "Repos",
    noReposYet: "Not decided yet",
    retryBuild: "Retry build",
    sessionGone: "This session is gone — start a new one.",

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
      reposHint:
        "Builder only touches the repos you choose here — pick every repo this PRD's technical plan calls out.",
      reposPlaceholder: "Choose repos…",
      reposRequired: "Choose at least one repo before starting.",
      budgetLabel: "Budget (USD)",
      budgetHint:
        "Builder stops itself once this build's spend reaches this figure. Leave the platform default unless you have a reason to change it.",
      modelOverridesHeading: "Model overrides",
      modelOverridesHint:
        "Leave any of these blank to use the platform default for that tier. Only set one if you specifically need a different model for this build.",
      plannerModelLabel: "Planner model",
      coderModelLabel: "Coder model",
      verifierModelLabel: "Verifier model",
      modelPlaceholder: "Platform default",
      saveReposFailed: "Couldn't save the chosen repos.",
      submit: "Start build",
      retrySubmit: "Retry build",
    },

    /**
     * Mid-build budget. The wording follows the graceful-failure model in
     * Stacks' "Graceful Failure: Transparent Acknowledgment and Fallbacks" and
     * "Preserve State During Agent Failure in Multistep Tasks": say what
     * happened, say what is at stake, and put the action that fixes it in the
     * same place — the run is holding its work, not throwing it away.
     */
    budget: {
      heldTitle: "Paused — this build has spent its budget",
      heldBody: (spent: string, ceiling: string, remaining: string) =>
        `It has spent ${spent} of its ${ceiling} ceiling and is holding everything it has written so far. ${remaining} to raise the budget and carry on from where it stopped — after that it gives up and this run's work is lost.`,
      heldBodyExpiring:
        "The window to raise it has closed, so this run is stopping. Raising the budget now lets you retry, but the work in progress is gone.",
      overTitle: "Spend is past the ceiling",
      overBody: (spent: string, ceiling: string) =>
        `${spent} of ${ceiling} spent. This build will pause at the end of the current phase and wait for a raise.`,
      raise: "Raise budget",
      // Countdown, deliberately coarse: a to-the-second timer on a twenty
      // minute window reads as more urgent than it is.
      minutesLeft: (minutes: number) =>
        minutes <= 1 ? "Less than a minute left" : `About ${minutes} minutes left`,
      dialog: {
        title: "Raise budget",
        heldIntro:
          "The build is holding its work at a phase boundary. Raise the ceiling and it picks up from there — no retry, nothing re-run.",
        intro: "Raise this session's spend ceiling.",
        spentLabel: "Spent so far",
        currentLabel: "Current ceiling",
        currentNone: "No ceiling",
        newLabel: "New ceiling (USD)",
        newHint:
          "Has to be above what the session has already spent, or the build would stop again immediately. Set 0 to remove the ceiling entirely.",
        submit: "Raise budget",
        submitHeld: "Raise and continue",
        raised: "Budget raised.",
        released: "Budget raised — the build is carrying on from where it stopped.",
        failed: "Couldn't raise the budget.",
      },
      // Feed rows for the budget_hold event.
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
      empty: "Nothing yet.",
      kinds: {
        question_pending: "Needs an answer",
        build_completed: "Build finished",
        build_failed: "Build failed",
        prs_opened: "PRs opened",
        budget_reached: "Budget reached",
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
      enabledLabel: "Builder enabled",
      enabledHelp:
        "Off means no build will dispatch, whatever a session's own readiness says. The Builder tab stays visible; nothing behind it will run.",
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
    scoreboard: {
      title: "Builder scoreboard",
      subtitle: "Cost, review friction, and how often a build actually ships — over time.",
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
};
