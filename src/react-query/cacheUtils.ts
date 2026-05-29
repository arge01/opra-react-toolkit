import {
  useQueryClient as useQC,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";

/**
 * 1. BASE CLIENT (Facade Pattern)
 * Exposes the TanStack Query client externally.
 */
export function useQueryClient(): QueryClient {
  return useQC();
}

/**
 * 2. GETTER: Hook to Read Local Data from Cache
 * Does not make a network request (enabled: false), only reads existing data from RAM.
 */
export function useLocalData<T>(key: unknown[]): T | undefined {
  const { data } = useQuery<T>({
    queryKey: key,
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: () => null as unknown as T,
  });

  return data;
}

/**
 * 3. SETTER: Hook to Write Local Data to Cache
 * Returns a function to execute the update (prevents infinite loops).
 */
export function useSetLocalData() {
  const queryClient = useQC();

  const setLocalData = <T>(key: unknown[], data: T) => {
    queryClient.setQueryData(key, data);
  };

  return setLocalData;
}
