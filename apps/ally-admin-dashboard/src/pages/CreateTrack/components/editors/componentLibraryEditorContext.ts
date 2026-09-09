import { createContext, useContext } from "react";

/**
 * True when `ItemEditorFrame` is being rendered inside the Component
 * Library's own template editor (`ComponentLibrarySidePanel`), where
 * "Save as template" would be nonsensical — the thing being edited already
 * IS a template. Defaults to false, so every normal CreateTrack item editor
 * is unaffected and needs no provider.
 *
 * A context rather than a prop threaded through the 5 type-specific editors
 * (JournalItemEditor, QuizItemEditor, ArticleItemEditor, VideoItemEditor,
 * AnnotationItemEditor): those are reused unmodified by the Component
 * Library page, so their prop surface can't grow a passthrough flag just for
 * this one caller.
 */
export const ComponentLibraryEditorContext = createContext(false);

export const useIsComponentLibraryEditor = (): boolean => useContext(ComponentLibraryEditorContext);
