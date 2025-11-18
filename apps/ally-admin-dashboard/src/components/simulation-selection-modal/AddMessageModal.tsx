import { FC } from "react";

import { useForm } from "react-hook-form";

import { addMessageModalFields, en } from "@constants";
import { MessageFields } from "@types";

import { Button } from "../button";
import { ButtonVariant } from "../types";

interface AddMessageModalProps {
  handlePrimaryAction?: (data: any) => void;
  handleCancel?: () => void;
  initialValues?: {
    messageTitle?: string;
    feedback?: string;
  };
}

export const AddMessageModal: FC<AddMessageModalProps> = ({
  handlePrimaryAction,
  handleCancel,
  initialValues,
}) => {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      messageTitle: initialValues?.messageTitle || "",
      feedback: initialValues?.feedback || "",
    },
  });

  const renderFields = (field: MessageFields) => {
    return (
      <div className="flex flex-col gap-2" key={field.id}>
        <label
          htmlFor={field.id}
          className="text-base text-typography-900 cursor-pointer font-primary"
        >
          {field.label}
        </label>
        {field.multiline ? (
          <textarea
            id={field.id}
            {...register(field.id)}
            placeholder={field.placeholder}
            className="border rounded-md px-2 py-2 font-primary outline-none placeholder:text-typography-600 text-base"
            rows={5}
          />
        ) : (
          <input
            id={field.id}
            {...register(field.id)}
            placeholder={field.placeholder}
            className={
              "border rounded-md px-2 py-2 outline-none text-base font-primary placeholder:text-typography-600"
            }
          />
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-xl min-w-[500px] max-w-[90vw] p-3 min-h-[376px] flex flex-col gap-4 border">
      <div className="text-typography-900 w-full text-base font-primary font-bold">
        {en.simulation.addMessage}
      </div>
      {addMessageModalFields.map(field => renderFields(field))}
      <div className="flex gap-3 py-2 justify-end">
        <Button variant={ButtonVariant.SECONDARY} className="w-1/3" onClick={handleCancel}>
          {en.userManagement.cancel}
        </Button>
        <Button
          variant={ButtonVariant.PRIMARY}
          className={"bg-primary-500 hover:bg-primary-700 w-1/3"}
          onClick={handleSubmit(handlePrimaryAction)}
        >
          {en.simulation.add}
        </Button>
      </div>
    </div>
  );
};
