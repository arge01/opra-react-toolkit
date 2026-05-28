import {
  useQueryClient as useQC,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";

/**
 * 1. BASE CLIENT (Facade Pattern)
 * Dışarıya TanStack Query client'ını açar.
 */
export function useWebHISQueryClient(): QueryClient {
  return useQC();
}

/**
 * 2. GETTER: Cache'den Local Data Okuma Hook'u
 * Ağ isteği atmaz (enabled: false), sadece RAM'deki mevcut veriyi okur.
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
 * 3. SETTER: Cache'e Local Data Yazma Hook'u
 * Direkt çalıştırmaz, çalıştırılacak bir fonksiyon döner (Infinite loop'u engeller).
 */
export function useSetLocalData() {
  const queryClient = useQC();

  const setLocalData = <T>(key: unknown[], data: T) => {
    queryClient.setQueryData(key, data);
  };

  return setLocalData;
}
