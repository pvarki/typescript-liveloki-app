import Select, { components, GroupBase, OptionProps, Props as SelectProps } from "react-select";

import { CodeDescription } from "../data/admiralty-code.ts";
import * as reactSelect from "../helpers/react-select.ts";
import { singleCharacterFallbackFilter } from "../helpers/react-select.ts";

export type AdmiraltyOption = { description: string; label: string; value: string };

export function toAdmiraltyOption([reliability, { title, description }]: [
  string,
  CodeDescription,
]): AdmiraltyOption {
  return {
    value: reliability,
    label: `${reliability} – ${title}`,
    description,
  };
}

export const AdmiraltyOption = (props: OptionProps<AdmiraltyOption, false>) => (
  <components.Option {...props}>
    <div className="py-1">
      <strong>{props.data.label}</strong>
      <p className="text-sm opacity-70">{props.data.description}</p>
    </div>
  </components.Option>
);

interface AdmiraltySelectProps
  extends Omit<SelectProps<AdmiraltyOption, false, GroupBase<AdmiraltyOption>>, "onChange" | "value"> {
  onChange: (value: string | null) => void;
  value: string | null;
  options: AdmiraltyOption[];
}

export function AdmiraltySelect({ onChange, value, ...props }: AdmiraltySelectProps) {
  return (
    <Select<AdmiraltyOption, false>
      {...reactSelect.commonProps}
      isSearchable
      isClearable
      filterOption={singleCharacterFallbackFilter}
      components={{ Option: AdmiraltyOption }}
      onChange={(option) => onChange(option?.value ?? null)}
      value={props.options.find((s) => s.value === value)}
      {...props}
    />
  );
}
