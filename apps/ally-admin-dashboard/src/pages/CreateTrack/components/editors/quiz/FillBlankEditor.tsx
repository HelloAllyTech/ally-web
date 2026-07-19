import { FC, useRef, useState } from "react";

import { useFormContext, useWatch } from "react-hook-form";

import { TextArea } from "@ally-ui-mono/ui-shared";
import { Plus, Trash } from "@assets";
import { ToggleSwitch } from "@components";
import { FillBlankDef, TrackFormValues } from "@types";

import { nextBlankTokenId, parseBlankTokens } from "../../../trackFormUtils";

interface FillBlankEditorProps {
  questionPath: `sections.${number}.items.${number}.quiz.questions.${number}`;
}

export const FillBlankEditor: FC<FillBlankEditorProps> = ({ questionPath }) => {
  const { control, setValue } = useFormContext<TrackFormValues>();
  const templateRef = useRef<HTMLTextAreaElement>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  const templateName = `${questionPath}.template` as `sections.0.items.0.quiz.questions.0.template`;
  const blanksName = `${questionPath}.blanks` as `sections.0.items.0.quiz.questions.0.blanks`;

  const template = (useWatch({ control, name: templateName }) ?? "") as string;
  const blanks = (useWatch({ control, name: blanksName }) ?? []) as FillBlankDef[];

  const tokens = parseBlankTokens(template);

  const setTemplate = (next: string) => setValue(templateName, next, { shouldDirty: true });
  const setBlanks = (next: FillBlankDef[]) => setValue(blanksName, next, { shouldDirty: true });

  const getBlank = (token: string): FillBlankDef =>
    blanks.find(blank => blank.id === token) ?? { id: token, acceptedAnswers: [] };

  const upsertBlank = (token: string, patch: Partial<FillBlankDef>) => {
    const existing = getBlank(token);
    const merged = { ...existing, ...patch };
    const others = blanks.filter(blank => blank.id !== token);
    setBlanks([...others, merged]);
  };

  const insertBlank = () => {
    const tokenId = nextBlankTokenId(template);
    const textarea = templateRef.current;
    const insertion = `{{${tokenId}}}`;
    if (textarea) {
      const start = textarea.selectionStart ?? template.length;
      const end = textarea.selectionEnd ?? template.length;
      setTemplate(template.slice(0, start) + insertion + template.slice(end));
    } else {
      setTemplate(`${template}${insertion}`);
    }
  };

  const addAnswer = (token: string) => {
    const draft = (answerDrafts[token] ?? "").trim();
    if (!draft) return;
    const existing = getBlank(token);
    if (existing.acceptedAnswers.includes(draft)) return;
    upsertBlank(token, { acceptedAnswers: [...existing.acceptedAnswers, draft] });
    setAnswerDrafts(prev => ({ ...prev, [token]: "" }));
  };

  const removeAnswer = (token: string, answer: string) => {
    const existing = getBlank(token);
    upsertBlank(token, {
      acceptedAnswers: existing.acceptedAnswers.filter(item => item !== answer),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-typography-800">Template</label>
          <button
            type="button"
            onClick={insertBlank}
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
          >
            <Plus className="w-4 h-4" />
            Insert blank
          </button>
        </div>
        <TextArea
          id="fill-blank-template"
          labelText="Template"
          hideLabel
          ref={templateRef}
          value={template}
          onChange={event => setTemplate(event.target.value)}
          rows={3}
          placeholder="The capital of France is {{b1}}."
          className="w-full font-mono"
        />
        <span className="text-xs text-typography-500">
          Use “Insert blank” to add a {"{{token}}"} placeholder for each answer.
        </span>
      </div>

      {tokens.length > 0 && (
        <div className="flex flex-col gap-3">
          {tokens.map(token => {
            const blank = getBlank(token);
            return (
              <div
                key={token}
                className="border border-border-light rounded-md p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-typography-700">{`{{${token}}}`}</span>
                  <label className="flex items-center gap-2 text-xs text-typography-600">
                    Case sensitive
                    <ToggleSwitch
                      enabled={blank.caseSensitive ?? false}
                      onChange={value => upsertBlank(token, { caseSensitive: value })}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {blank.acceptedAnswers.map(answer => (
                    <span
                      key={answer}
                      className="inline-flex items-center gap-1 bg-secondary-50 border border-border-light rounded-full px-2 py-0.5 text-xs text-typography-800"
                    >
                      {answer}
                      <button
                        type="button"
                        onClick={() => removeAnswer(token, answer)}
                        className="text-destructive-500 hover:text-destructive-600"
                        aria-label="Remove answer"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={answerDrafts[token] ?? ""}
                    onChange={event =>
                      setAnswerDrafts(prev => ({ ...prev, [token]: event.target.value }))
                    }
                    onKeyDown={event => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addAnswer(token);
                      }
                    }}
                    placeholder="Add an accepted answer"
                    className="flex-1 border border-border-light rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary-400"
                  />
                  <button
                    type="button"
                    onClick={() => addAnswer(token)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
