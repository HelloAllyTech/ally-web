import {
  FC,
  Fragment,
  KeyboardEvent,
  ClipboardEvent,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { DEFAULT_COPY, SjtCopy, describePath, hasTokenDrift, readCopy } from "./sjtCopy";

interface SjtCopyContextValue {
  copy: SjtCopy;
  /** True only under /SJT1/edit: every `<T>` becomes a live text field. */
  editing: boolean;
  isChanged: (path: string) => boolean;
  setField: (path: string, value: string) => void;
}

const SjtCopyContext = createContext<SjtCopyContextValue>({
  copy: DEFAULT_COPY,
  editing: false,
  isChanged: () => false,
  setField: () => undefined,
});

export interface SjtCopyProviderProps {
  copy: SjtCopy;
  editing?: boolean;
  isChanged?: (path: string) => boolean;
  setField?: (path: string, value: string) => void;
  children: ReactNode;
}

export const SjtCopyProvider: FC<SjtCopyProviderProps> = ({
  copy,
  editing = false,
  isChanged,
  setField,
  children,
}) => {
  const value = useMemo<SjtCopyContextValue>(
    () => ({
      copy,
      editing,
      isChanged: isChanged ?? (() => false),
      setField: setField ?? (() => undefined),
    }),
    [copy, editing, isChanged, setField],
  );

  return <SjtCopyContext.Provider value={value}>{children}</SjtCopyContext.Provider>;
};

/** True while the page is being reworded at /SJT1/edit. */
export const useEditing = (): boolean => useContext(SjtCopyContext).editing;

/** The copy in force — defaults, or this browser's edits over them. */
export const useCopy = (): SjtCopy => useContext(SjtCopyContext).copy;

/** One line as a plain string, for a title or an aria-label. */
export const useCopyText = (path: string): string => readCopy(useCopy(), path);

/**
 * Fills `{token}` placeholders with rendered values, so a line that carries
 * emphasis or a number keeps it while still being one editable sentence.
 *
 * A token with no value renders as itself — an edit that drops a placeholder
 * loses the number rather than the sentence, and the editor flags the field.
 */
export const fillNodes = (template: string, vars?: Record<string, ReactNode>): ReactNode => {
  if (!vars) return template;

  return template.split(/(\{[a-zA-Z]+\})/g).map((part, index) => {
    const token = /^\{([a-zA-Z]+)\}$/.exec(part);
    const value = token ? vars[token[1]] : undefined;
    if (value === undefined) return part;
    return <Fragment key={`${part}-${index}`}>{value}</Fragment>;
  });
};

/** Whitespace as the page can render it: no non-breaking spaces smuggled in
 * by a paste, no runs, no leading or trailing padding. */
const tidy = (value: string) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

interface EditableProps {
  path: string;
  value: string;
  changed: boolean;
  onCommit: (path: string, value: string) => void;
}

/**
 * One line of the page, editable where it sits.
 *
 * Deliberately uncontrolled: React never rewrites the node while it has focus,
 * because the DOM text is only touched when it differs from the value coming
 * in (a reset, or an edit made in another tab). Committing on blur rather than
 * on every keystroke is what keeps the caret still — and there is nothing to
 * preview, since the text being typed *is* the rendered page.
 */
const Editable: FC<EditableProps> = ({ path, value, changed, onCommit }) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (node && node.textContent !== value) node.textContent = value;
  }, [value]);

  const revert = () => {
    if (ref.current) ref.current.textContent = value;
  };

  const commit = () => {
    const next = tidy(ref.current?.textContent ?? "");
    // Emptying a field would silently delete a line of the page. Treat it as a
    // slip and put the previous wording back; deleting copy is not an edit the
    // page supports.
    if (!next) {
      revert();
      return;
    }
    if (next !== value) onCommit(path, next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      revert();
      event.currentTarget.blur();
    }
    // Newlines have nowhere to go in a page of single-paragraph fields, so
    // Enter means "done" instead of inserting one.
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLSpanElement>) => {
    // Pasting from a document would otherwise bring its markup with it.
    const text = event.clipboardData?.getData("text/plain");
    if (text === undefined) return;
    event.preventDefault();
    try {
      document.execCommand("insertText", false, tidy(text));
    } catch {
      // execCommand is deprecated; if it goes, the paste is simply ignored.
    }
  };

  const drift = hasTokenDrift(path, value);

  return (
    <span
      ref={ref}
      className={`sjt-ed-t${changed ? " changed" : ""}${drift ? " drift" : ""}`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={describePath(path)}
      aria-multiline="false"
      title={
        drift
          ? `${describePath(path)} — a {placeholder} this line needs is missing`
          : describePath(path)
      }
      data-path={path}
      spellCheck
      onBlur={commit}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
    />
  );
};

export interface SjtButtonProps {
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  children: ReactNode;
}

/**
 * A control that stops being a control while its own label is being edited.
 *
 * `contentEditable` inside a `<button>` doesn't reliably take a caret — the
 * button swallows the mousedown — and a click that both edits a word and
 * advances the page would be unusable anyway. Under /SJT1/edit the same
 * classes are rendered on an inert element, so the control still looks exactly
 * like itself while its label is text.
 */
export const SjtButton: FC<SjtButtonProps> = ({
  className = "",
  onClick,
  disabled,
  pressed,
  expanded,
  children,
}) => {
  const { editing } = useContext(SjtCopyContext);

  if (editing) return <span className={`${className} sjt-ed-static`}>{children}</span>;

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-expanded={expanded}
    >
      {children}
    </button>
  );
};

export interface TProps {
  /** Dotted path into the copy model, e.g. "intro.lede". */
  path: string;
  /** Values for the line's `{tokens}`. */
  vars?: Record<string, ReactNode>;
  /**
   * Render filled-in even under /SJT1/edit, rather than as a field.
   *
   * For the handful of lines that are mostly placeholder — "{pct}% · {count}
   * {items}" — editing in place would replace a number the reviewer needs to
   * see with the braces that produce it, three times over in one small label.
   * Those are offered once, with a worked example, in the editor's own panel;
   * see SjtEdit. Everything a reader would call a sentence stays editable
   * where it sits.
   */
  readOnly?: boolean;
}

/**
 * A line of the page's text. Renders as plain text on /SJT1 and as an
 * editable field on /SJT1/edit — one component, so the two routes cannot drift
 * apart, and nothing is editable in one place and hardcoded in another.
 */
export const T: FC<TProps> = ({ path, vars, readOnly }) => {
  const { copy, editing, isChanged, setField } = useContext(SjtCopyContext);
  const value = readCopy(copy, path);

  if (!editing || readOnly) return <>{fillNodes(value, vars)}</>;

  return <Editable path={path} value={value} changed={isChanged(path)} onCommit={setField} />;
};
