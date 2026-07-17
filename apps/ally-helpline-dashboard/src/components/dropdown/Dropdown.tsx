import { FC } from "react";

import { ComboBox } from "@ally-ui-mono/ui-shared";

import { DropdownOption, DropdownProps } from "./types";

const Dropdown: FC<DropdownProps> = ({
  value,
  options,
  onChange,
  minWidth = 200,
  placeholder,
  readOnly = false,
}) => {
  const selectedOption = options.find(o => String(o.value) === value) ?? null;

  return (
    <div style={{ minWidth }}>
      <ComboBox
        id="dropdown-combobox"
        items={options}
        selectedItem={selectedOption}
        itemToString={(item: DropdownOption | null) => (item ? item.label : "")}
        onChange={({ selectedItem }: { selectedItem: DropdownOption | null }) =>
          onChange(selectedItem ? String(selectedItem.value) : "")
        }
        placeholder={placeholder}
        readOnly={readOnly}
        size="md"
      />
    </div>
  );
};

export default Dropdown;
