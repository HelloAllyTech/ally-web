import { useCallback, useEffect, useRef, useState } from "react";

import { Controller } from "react-hook-form";
import { toast } from "sonner";

import { useCreateCompetencyMutation, useGetCompetenciesQuery } from "@api";
import { ArrowSolid } from "@assets";
import { en } from "@constants";
import { useClickOutside } from "@hooks";
import { Competency as CompetencyType } from "@types";

import { FormLabel } from "../form-label";

interface CompetencyProps {
  id: string;
  formMethods: any;
  isMandatory?: boolean;
  label?: string;
}

export const Competency: React.FC<CompetencyProps> = ({
  id,
  formMethods,
  isMandatory = false,
  label = "Competency",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: competenciesData, isLoading } = useGetCompetenciesQuery({ name: searchTerm });
  const [createCompetency] = useCreateCompetencyMutation();

  const handleClose = useCallback(() => setIsOpen(false), []);
  useClickOutside(dropdownRef, handleClose);

  const {
    control,
    getValues,
    formState: { errors },
  } = formMethods;

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  const handleSelect = (field: any, competency: CompetencyType) => {
    field.onChange(competency?.id);
    formMethods.setValue("competency", competency);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
  };

  const handleCreateCompetency = async (field: any) => {
    if (!searchTerm.trim()) return;

    try {
      const result = await createCompetency({ name: searchTerm.trim() }).unwrap();
      handleSelect(field, result);
    } catch {
      toast.error(en.errors.failedCompetencyCreation);
    }
  };

  const competencies = competenciesData?.data || [];
  const hasNoResults = !isLoading && competencies.length === 0 && searchTerm.trim() !== "";

  const renderDropdown = (field: { value: string }) => {
    return (
      <div className="absolute left-0 top-full mt-1 w-full bg-white border rounded-md shadow-lg max-h-[240px] overflow-auto z-10 custom-scrollbar">
        <div className="sticky top-0 p-2 bg-white">
          <input
            type="text"
            placeholder={en.common.searchOrCreate}
            value={searchTerm}
            onChange={handleTextChange}
            className="w-full rounded border border-border-light px-3 py-1 bg-white text-md cursor-pointer flex items-center justify-between focus-none"
          />
        </div>
        {isLoading ? (
          <div className="px-3 py-2 text-sm text-typography-800">Loading...</div>
        ) : hasNoResults ? (
          <div
            className="px-3 py-2 text-sm cursor-pointer text-primary hover:bg-background-secondary"
            onClick={() => handleCreateCompetency(field)}
          >
            Create "{searchTerm}"
          </div>
        ) : competencies.length === 0 ? (
          <div className="px-3 py-2 text-sm text-typography-800">
            {en.common.noOptionsAvailable}
          </div>
        ) : (
          competencies.map(competency => (
            <div
              key={competency.id}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                competency.id === field.value
                  ? "bg-primary-50 text-primary font-medium"
                  : "text-typography-900 hover:bg-background-secondary"
              }`}
              onClick={() => handleSelect(field, competency)}
            >
              <div className="flex items-center justify-between text-base">
                <span>{competency.name}</span>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <FormLabel isMandatory={isMandatory}>{label}</FormLabel>
      </div>
      <div ref={dropdownRef}>
        <div className="relative">
          <Controller
            name={id}
            control={control}
            defaultValue={getValues?.(id) ?? ""}
            rules={{ required: isMandatory ? `${label} is required` : false }}
            render={({ field }) => {
              const selected = formMethods.getValues("competency");
              return (
                <>
                  <div
                    className="w-full rounded border border-border-light px-3 py-1 bg-white text-base cursor-pointer flex items-center justify-between focus-within:ring-1 focus-within:ring-primary"
                    onClick={() => setIsOpen(prev => !prev)}
                  >
                    <span className={selected ? "text-typography-900" : "text-typography-600"}>
                      {selected ? selected.name : en.common.select}
                    </span>
                    <span
                      className={`text-typography-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    >
                      <ArrowSolid />
                    </span>
                  </div>

                  {isOpen && renderDropdown(field)}
                </>
              );
            }}
          />
        </div>
      </div>
      {errors && errors[id] && (
        <p className="text-destructive-500 text-sm mt-1">{errors[id]?.message}</p>
      )}
    </div>
  );
};
