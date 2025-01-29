import { createFilter, InputActionMeta, StylesConfig, Theme } from "react-select";

export const theme = (theme: Theme) => ({
  ...theme,
  borderRadius: 2,
  spacing: {
    ...theme.spacing,
    baseUnit: 2,
  },
  colors: {
    ...theme.colors,
    primary: "#3f51b5",
    primary75: "#5566c5",
    primary50: "#394494",
    primary25: "#394494",
    danger: "#FFBDAD",
    dangerLight: "#DE350B",
    neutral0: "hsl(0, 0%, 0%)",
    neutral5: "hsl(0, 0%, 5%)",
    neutral10: "hsl(0, 0%, 10%)",
    neutral20: "hsl(0, 0%, 40%)",
    neutral30: "hsl(0, 0%, 30%)",
    neutral40: "hsl(0, 0%, 40%)",
    neutral50: "hsl(0, 0%, 50%)",
    neutral60: "hsl(0, 0%, 60%)",
    neutral70: "hsl(0, 0%, 70%)",
    neutral80: "hsl(0, 0%, 80%)",
    neutral90: "hsl(0, 0%, 90%)",
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const styles: StylesConfig<any, any> = {
  option: (styles, { isDisabled }) => {
    return {
      ...styles,
      cursor: isDisabled ? "not-allowed" : "default",
    };
  },
};

export const commonProps = {
  theme,
  styles,
  className: "ll-react-select-container",
  classNamePrefix: "ll-react-select",
} as const;

// H/T https://stackoverflow.com/a/78131035/51685
export function makeCreateElementOnCommaHandler(onAdd: (value: string) => void) {
  return (value: string, { action }: InputActionMeta) => {
    if (action === "input-change" && value.endsWith(",")) {
      const valueToAdd = value.slice(0, -1).trim();
      if (valueToAdd) onAdd(valueToAdd);
      return "";
    }
  };
}

interface FilterOptionOption<Option> {
  readonly label: string;
  readonly value: string;
  readonly data: Option;
}

const fallbackFilter = createFilter({ ignoreCase: true, ignoreAccents: true, matchFrom: "any" });

/**
 * If the input is a single character, match only the first character of the option.
 */
export function singleCharacterFallbackFilter<T>(option: FilterOptionOption<T>, rawInput: string) {
  if (rawInput.length === 1) {
    return option.value.toLowerCase() === rawInput.toLowerCase();
  }
  return fallbackFilter(option, rawInput);
}
