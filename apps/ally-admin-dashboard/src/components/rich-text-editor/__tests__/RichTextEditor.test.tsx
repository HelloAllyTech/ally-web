import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// TipTap needs a real ProseMirror DOM, which jsdom only half-provides. Mock
// useEditor so the test can fire onUpdate at will — the point here is *when*
// the component reports a change, not how TipTap renders.
const capturedOptions: { current: any } = { current: null };
const editorHtml = { current: "" };

const fakeEditor = {
  getHTML: () => editorHtml.current,
  commands: { setContent: vi.fn() },
  setEditable: vi.fn(),
  storage: { characterCount: { characters: () => 0 } },
  isActive: () => false,
  can: () => ({ chain: () => ({ focus: () => ({ run: () => true }) }) }),
  chain: () => ({ focus: () => ({ run: () => true }) }),
};

vi.mock("@tiptap/react", () => ({
  useEditor: (options: any) => {
    capturedOptions.current = options;
    return fakeEditor;
  },
  EditorContent: () => <div data-testid="editor-content" />,
}));

vi.mock("@tiptap/starter-kit", () => ({ default: { configure: () => ({}) } }));
vi.mock("@tiptap/extension-underline", () => ({ default: {} }));
vi.mock("@tiptap/extension-image", () => ({ default: { configure: () => ({}) } }));
vi.mock("@tiptap/extension-placeholder", () => ({ default: { configure: () => ({}) } }));
vi.mock("@tiptap/extension-character-count", () => ({ default: { configure: () => ({}) } }));

vi.mock("../RichTextToolbar", () => ({ RichTextToolbar: () => <div /> }));

import { RichTextEditor } from "../RichTextEditor";

describe("RichTextEditor", () => {
  beforeEach(() => {
    capturedOptions.current = null;
    editorHtml.current = "";
    vi.clearAllMocks();
  });

  /**
   * Regression: TipTap fires onUpdate for its own initial content load, not
   * only for typing. The studio mounts this editor before the form has been
   * populated from the server, so echoing that empty document back as an edit
   * overwrote real descriptions with "<p></p>" and marked the field dirty —
   * which the background autosave then persisted, wiping the text and
   * demoting the published roleplay to draft.
   */
  it("does not report an empty document as a change when the value is empty", () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} />);

    editorHtml.current = "<p></p>";
    capturedOptions.current.onUpdate({ editor: fakeEditor });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not report a change when the content matches the value it was given", () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="<p>Existing text</p>" onChange={onChange} />);

    editorHtml.current = "<p>Existing text</p>";
    capturedOptions.current.onUpdate({ editor: fakeEditor });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("reports real edits", () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="<p>Existing text</p>" onChange={onChange} />);

    editorHtml.current = "<p>Existing text, now edited</p>";
    capturedOptions.current.onUpdate({ editor: fakeEditor });

    expect(onChange).toHaveBeenCalledWith("<p>Existing text, now edited</p>");
  });

  it("reports the user clearing a field", () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="<p>Existing text</p>" onChange={onChange} />);

    editorHtml.current = "<p></p>";
    capturedOptions.current.onUpdate({ editor: fakeEditor });

    expect(onChange).toHaveBeenCalledWith("<p></p>");
  });

  // onUpdate is created once by useEditor; without a ref it would compare
  // against the value from first render and re-report stale content forever.
  it("compares against the latest value, not the one from first render", () => {
    const onChange = vi.fn();
    const { rerender } = render(<RichTextEditor value="" onChange={onChange} />);

    rerender(<RichTextEditor value="<p>Loaded from server</p>" onChange={onChange} />);

    editorHtml.current = "<p>Loaded from server</p>";
    capturedOptions.current.onUpdate({ editor: fakeEditor });

    expect(onChange).not.toHaveBeenCalled();
  });
});
