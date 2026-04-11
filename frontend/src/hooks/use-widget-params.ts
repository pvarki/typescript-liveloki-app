import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { readWidgetParam, updateWidgetSearchParams, type WidgetParamUpdates } from "./widget-params-model";

interface SetWidgetParamOptions {
  replace?: boolean;
}

export function useWidgetParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsRef = useRef(searchParams);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const values = useMemo(
    () => ({
      selectedItem: readWidgetParam(searchParams, "selectedItem"),
      time: readWidgetParam(searchParams, "time"),
      getParam: (key: string) => readWidgetParam(searchParams, key),
    }),
    [searchParams],
  );

  const setWidgetParams = useCallback(
    (updates: WidgetParamUpdates, options: SetWidgetParamOptions = {}) => {
      const next = updateWidgetSearchParams(searchParamsRef.current, updates);
      if (!next) return;
      setSearchParams(next, { replace: options.replace ?? true });
    },
    [setSearchParams],
  );

  const clearWidgetParam = useCallback(
    (key: string, options?: SetWidgetParamOptions) => {
      setWidgetParams({ [key]: null }, options);
    },
    [setWidgetParams],
  );

  const setSelectedItem = useCallback(
    (id: string | number | null, options?: SetWidgetParamOptions) =>
      setWidgetParams({ selectedItem: id }, options),
    [setWidgetParams],
  );

  const setTime = useCallback(
    (time: string | null, options?: SetWidgetParamOptions) => setWidgetParams({ time }, options),
    [setWidgetParams],
  );

  return {
    ...values,
    setWidgetParams,
    clearWidgetParam,
    setSelectedItem,
    setTime,
  };
}
