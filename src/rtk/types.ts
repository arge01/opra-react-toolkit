import { OpraRunner } from "../core/types";

/**
 * RTK (Redux Toolkit) Standart GET Request Type
 */
export type RtkApiQueryProps<TApi, _T, _E> = {
  /**
   * Defines the cache key under which this request will be stored in the Redux Store (Slice).
   * E.g.: ["patient", id, "detail"] -> "patient_123_detail"
   */
  queryKey: unknown[];

  /**
   * Unique Action Type for the Redux Thunk.
   * Crucial for tracking in Redux DevTools.
   * E.g.: 'patientRecord/fetchDetail'
   */
  actionName: string;

  connection?: (
    fn: (api: TApi) => Promise<unknown>,
    deps: string[]
  ) => { call: () => Promise<unknown> };

  run: (p: TApi) => OpraRunner | Promise<unknown>;

  /**
   * RTK standard thunks don't have automatic staleTime like TanStack.
   * If false, and data already exists in Redux state, no request is sent.
   * If true, forces a new request overriding existing state.
   * @default false
   */
  forceRefetch?: boolean;
};

/**
 * RTK (Redux Toolkit) Mutation (POST, PUT, DELETE) Request Type
 */
export type RtkApiMutationProps<TApi, _T, V, _E> = {
  /**
   * Mutations generally don't create permanent cache in Redux state,
   * but actionName is required to track loading/error states.
   * E.g.: 'patientRecord/updateStatus'
   */
  actionName: string;

  /**
   * Note: For mutations, data is fetched at dispatch time, not render time.
   */
  run: (api: TApi, variables: V) => OpraRunner | Promise<unknown>;

  connection?: (
    fn: (api: TApi) => Promise<unknown>,
    deps: string[]
  ) => { call: () => Promise<unknown> };
};

/**
 * RTK (Redux Toolkit) Paginated GET Request Type
 */
export type RtkApiPaginatedQueryProps<TApi, T, E> = Omit<
  RtkApiQueryProps<TApi, T, E>,
  "run"
> & {
  pagination: { skip: number; limit: number };

  run: (
    api: TApi,
    pagingParams: { skip?: number; limit: number; count: boolean }
  ) => OpraRunner | Promise<unknown>;
};
