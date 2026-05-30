import type { ExtractApi, ExtractModel, StrictApi } from "../core/types";

export type UseApiServiceProps<T, A> = {
  actions: Omit<A, "run"> & {
    run: (api: StrictApi<ExtractApi<A>, ExtractModel<T>>) => unknown;
  };
};

export type ServiceState<T> = {
  isLoading: boolean;
  isSuccess: boolean;
  result: T | undefined;
  error: unknown | undefined;
  status: number | undefined;
};
