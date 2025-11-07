import { useState } from "react";

import { useWatch } from "react-hook-form";

import { Close } from "@assets";
import { en } from "@constants";

export const Tags = ({ formMethods }) => {
  const { control, setValue } = formMethods;
  const [inputValue, setInputValue] = useState("");

  const tags = useWatch({
    control,
    name: "tags",
    defaultValue: [],
  });

  const addTag = () => {
    const newTag = inputValue.trim();
    if (newTag && !tags.includes(newTag)) {
      setValue("tags", [...tags, newTag], { shouldValidate: true });
    }
    setInputValue("");
  };

  const removeTag = tagToRemove => {
    setValue(
      "tags",
      tags.filter(tag => tag !== tagToRemove),
      { shouldValidate: true },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="tags" className="text-text-500 cursor-pointer">
        {en.simulation.tags}
      </label>

      <div className="flex flex-wrap gap-2">
        {tags?.map((tag, index) => (
          <div
            key={index}
            className="flex items-center px-2 bg-white border border-border-light rounded-full text-text"
          >
            <span>{tag}</span>
            <button type="button" className="cursor-pointer ml-2" onClick={() => removeTag(tag)}>
              <Close />
            </button>
          </div>
        ))}

        <div className="flex items-center border border-border-light rounded-full px-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTag()}
            placeholder="Add tag"
            className="w-[80px] focus:outline-none"
          />
          <button type="button" onClick={addTag} className="ml-2 text-primary text-sm">
            +
          </button>
        </div>
      </div>
    </div>
  );
};
