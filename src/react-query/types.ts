import { OpraRunner } from "../core/types";

export type ApiQueryProps<TApi, T, E> = {
  queryKey: unknown[];

  connection?: (
    fn: (api: TApi) => Promise<unknown>,
    deps: string[]
  ) => { call: () => Promise<unknown> };

  run: (p: TApi) => OpraRunner | Promise<unknown>;
  enabled?: boolean;

  /**
   * Set retry logic for the query
   * @default false
   */
  retry?: boolean | number;

  /**
   * Time in milliseconds for data to be considered fresh.
   * @default Infinity
   */
  staleTime?: number;

  /**
   * Refetch on window focus
   * @default false
   */
  refetchOnWindowFocus?: boolean;

  /**
   * Refetch on component mount
   * @default false
   */
  refetchOnMount?: boolean;
};

export type ApiMutationProps<TApi, T, V, E> = {
  /**
   * Run function for the mutation. Data will be fetched when triggered.
   */
  run: (api: TApi, variables: V) => OpraRunner | Promise<unknown>;

  connection?: (
    fn: (api: TApi) => Promise<unknown>,
    deps: string[]
  ) => { call: () => Promise<unknown> };

  /** @default false */
  retry?: boolean | number;
};

export type ApiPaginatedQueryProps<TApi, T, E> = Omit<
  ApiQueryProps<TApi, T, E>,
  "run"
> & {
  pagination: { skip: number; limit: number };
  run: (
    api: TApi,
    pagingParams: { skip?: number; limit: number; count: boolean }
  ) => OpraRunner | Promise<unknown>;
};

export type ApiInfiniteQueryProps<TApi, T, E> = Omit<
  ApiQueryProps<TApi, T, E>,
  "run"
> & {
  run: (api: TApi, params: { skip?: number; limit: number }) => unknown;
  limit?: number;
  cache?: boolean;
  maxPages?: number | undefined;
};
