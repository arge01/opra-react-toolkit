import { useQueryClient as useQC } from "@tanstack/react-query";

/**
 * const invalidate = useApiInvalidate();
 * invalidate("key"); or invalidate(["key", filterParams]);
 */
export function useApiInvalidate() {
  const queryClient = useQC();

  const invalidate = async (key: string | unknown[]) => {
    const queryKey = Array.isArray(key) ? key : [key];

    await queryClient.invalidateQueries({ queryKey });
  };

  return invalidate;
}
