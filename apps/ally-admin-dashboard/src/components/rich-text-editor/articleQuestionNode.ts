import { mergeAttributes, Node } from "@tiptap/core";

export const ARTICLE_QUESTION_NODE = "articleQuestion";
export const ARTICLE_QUESTION_MARKER_ATTR = "data-ally-question";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    articleQuestion: {
      /** Drop a question placeholder at the cursor. */
      insertArticleQuestion: (questionId: string) => ReturnType;
    };
  }
}

/**
 * The placeholder an inline article question is anchored to.
 *
 * The node carries only the question's id — the prompt, the options and above
 * all the answer key live in `content.questions`, never in the body HTML. So
 * this is an atom: there is nothing inside it to edit, and everything the
 * author types about the question is typed in the fields below the editor.
 * What the author manipulates here is *placement*, which is the one thing the
 * body is the right home for.
 *
 * Serialises to `<div data-ally-question="<id>"></div>`, which is what the
 * server validates against and what the learner's player splits the article
 * on.
 */
export const ArticleQuestionNode = Node.create({
  name: ARTICLE_QUESTION_NODE,
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      questionId: {
        default: null,
        parseHTML: element => element.getAttribute(ARTICLE_QUESTION_MARKER_ATTR),
        renderHTML: attributes =>
          attributes.questionId ? { [ARTICLE_QUESTION_MARKER_ATTR]: attributes.questionId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: `div[${ARTICLE_QUESTION_MARKER_ATTR}]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes)];
  },

  addCommands() {
    return {
      insertArticleQuestion:
        questionId =>
        ({ commands }) =>
          commands.insertContent({
            type: ARTICLE_QUESTION_NODE,
            attrs: { questionId },
          }),
    };
  },

  /**
   * A bare `<div>` is invisible in the editor, which would leave the author
   * unable to see where their question sits. The node view draws a labelled
   * chip in its place — numbered by document position, so it matches the
   * numbering of the question fields below, which are ordered the same way.
   */
  addNodeView() {
    return ({ editor, getPos }) => {
      const dom = document.createElement("div");
      dom.contentEditable = "false";
      dom.className =
        "my-2 flex items-center gap-2 rounded-md border border-dashed border-primary-300 " +
        "bg-primary-50 px-3 py-2 text-sm text-primary-700 select-none cursor-grab";

      const label = document.createElement("span");
      label.className = "font-medium";

      const hint = document.createElement("span");
      hint.className = "text-typography-500";
      hint.textContent = "— edit it in the fields below";

      dom.append(label, hint);

      const renderLabel = () => {
        const pos = typeof getPos === "function" ? getPos() : null;
        let index = 0;
        if (pos != null) {
          editor.state.doc.descendants((node, nodePos) => {
            if (node.type.name === ARTICLE_QUESTION_NODE && nodePos < pos) index += 1;
            return true;
          });
        }
        label.textContent = `Question ${index + 1}`;
      };
      renderLabel();

      /**
       * The number depends on what is *before* this chip, so it has to be
       * recomputed on every transaction, not only when this node is
       * re-rendered: deleting an earlier question leaves this node view
       * untouched, and ProseMirror would never call `update` — the chip would
       * go on claiming a number that now belongs to nobody.
       */
      const onTransaction = () => renderLabel();
      editor.on("transaction", onTransaction);

      return {
        dom,
        update: () => {
          renderLabel();
          return true;
        },
        destroy: () => {
          editor.off("transaction", onTransaction);
        },
      };
    };
  },
});
