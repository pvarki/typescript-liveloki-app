import type { StylesConfig, Theme } from "react-select";
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
export const styles: StylesConfig<any, true> = {
  option: (styles, { isDisabled }) => {
    return {
      ...styles,
      cursor: isDisabled ? "not-allowed" : "default",
    };
  },
};

export const props = {
  theme,
  styles,
  className: "ll-react-select-container",
  classNamePrefix: "ll-react-select",
} as const;
