import { FC } from "react";

import { useForm } from "react-hook-form";

import { TextArea } from "@ally-ui-mono/ui-shared";
import { PopupWrapper, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { addMessageModalFields, en } from "@constants";
import { MessageFields } from "@types";

interface AddMessageModalProps {
  isOpen: boolean;
  anchorElement?: HTMLElement | null;
  handlePrimaryAction?: (data: any) => void;
  handleCancel?: () => void;
  initialValues?: {
    messageTitle?: string;
    messageContent?: string;
  };
}

export const AddMessageModal: FC<AddMessageModalProps> = ({
  isOpen,
  anchorElement,
  handlePrimaryAction,
  handleCancel,
  initialValues,
}) => {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      messageTitle: initialValues?.messageTitle || "",
      messageContent: initialValues?.messageContent || "",
    },
  });

  const renderFields = (field: MessageFields) => (
    <div className="flex flex-col gap-2" key={field.id}>
      <label
        htmlFor={field.id}
        className="text-base text-typography-900 cursor-pointer font-primary"
      >
        {field.label}
      </label>

      {field.multiline ? (
        <TextArea
          id={field.id}
          labelText={field.label}
          hideLabel
          {...register(field.id)}
          placeholder={field.placeholder}
          className="font-primary"
          rows={5}
        />
      ) : (
        <input
          id={field.id}
          {...register(field.id)}
          placeholder={field.placeholder}
          className="border rounded-md px-2 py-2 outline-none text-base font-primary placeholder:text-typography-600"
        />
      )}
    </div>
  );

  return (
    <PopupWrapper
      isOpen={isOpen}
      onClose={handleCancel}
      anchorElement={anchorElement}
      className="min-w-[500px] max-w-[90vw]"
    >
      <div className="bg-white rounded-lg shadow-xl min-w-[500px] p-4 min-h-[376px] flex flex-col gap-4 border">
        <div className="text-typography-900 w-full text-base font-primary font-bold">
          {en.simulation.addMessage}
        </div>

        {addMessageModalFields.map(renderFields)}

        <div className="flex gap-3 py-2 justify-end">
          <Button variant={ButtonVariant.SECONDARY} className="w-1/3" onClick={handleCancel}>
            {en.userManagement.cancel}
          </Button>

          <Button
            variant={ButtonVariant.PRIMARY}
            className="bg-primary-500 hover:bg-primary-700 w-1/3"
            onClick={handleSubmit(handlePrimaryAction)}
          >
            {en.simulation.add}
          </Button>
        </div>
      </div>
    </PopupWrapper>
  );
};
