import { useSearchParams } from "react-router-dom";

/**
 * Tiny helper: read & write a single `?key=value` search-param without
 * disturbing the other params in the URL.
 */
export function useSearchParam(key: string): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? "";
  const setValue = (next: string) => {
    const updated = new URLSearchParams(params);
    if (next) updated.set(key, next);
    else updated.delete(key);
    setParams(updated, { replace: true });
  };
  return [value, setValue];
}
