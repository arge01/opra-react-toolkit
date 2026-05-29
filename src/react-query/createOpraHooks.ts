import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useBridge, useOpraConfig } from "../core";
import type {
  Model,
  OpraRunner,
  QueryResult,
  ExtractModel,
  StrictApi,
  OpraResponse,
} from "../core/types";
import type {
  ApiQueryProps,
  ApiMutationProps,
  ApiPaginatedQueryProps,
  ApiInfiniteQueryProps,
} from "./types";

export function createOpraHooks<TApi>() {
  function useApiQuery<T, E = object | string>(
    props: Omit<ApiQueryProps<TApi, T, E>, "run"> & {
      run: (api: StrictApi<TApi, ExtractModel<T>>) => unknown;
    }
  ): [Model<T, E>, () => void, number] {
    const { onError } = useOpraConfig<TApi>();

    const resolveCall = useCallback(
      async (api: TApi): Promise<unknown> => {
        const runner = props.run(api as StrictApi<TApi, ExtractModel<T>>);
        if (runner && typeof runner === "object" && "getResponse" in runner) {
          return await (runner as OpraRunner).getResponse();
        }
        return await (runner as Promise<unknown>);
      },
      [props.run]
    );

    const stringDeps = useMemo(
      () => props.queryKey.filter((k): k is string => typeof k === "string"),
      [props.queryKey]
    );

    const localBridge = useBridge<TApi, unknown>(
      async (api) => await resolveCall(api),
      stringDeps
    );

    const { call } = props.connection
      ? props.connection(async (api) => await resolveCall(api), stringDeps)
      : localBridge;

    const query = useQuery<QueryResult<T>, E>({
      queryKey: props.queryKey,
      queryFn: async () => {
        const response = await call();
        const res = response as OpraResponse<E>;

        if (!res?.ok) {
          throw (
            res?.body?.errors ?? res?.body ?? res?.statusText ?? "Unknown Error"
          );
        }

        return {
          result: (res.body?.payload ?? res.body) as T,
          totalMatches: Number(
            (res.body as { totalMatches?: number })?.totalMatches ?? 0
          ),
        };
      },
      enabled: props.enabled ?? true,
      retry: props.retry ?? false,
      staleTime: props.staleTime ?? Infinity,
      refetchOnWindowFocus: props.refetchOnWindowFocus,
      refetchOnMount: props.refetchOnMount,
    });

    useEffect(() => {
      if (query.isError && query.error && onError) {
        onError(query.error);
      }
    }, [query.isError, query.error, onError]);

    const state: Model<T, E> = useMemo(
      () => ({
        result: query.data?.result,
        isLoading: query.isLoading,
        isSuccess: query.isSuccess,
        isFetching: query.isFetching,
        isError: query.isError,
        error: query.error,
        pending: query.isPending,
      }),
      [query]
    );

    return [state, query.refetch as () => void, query.data?.totalMatches ?? 0];
  }

  function useApiPaginatedQuery<T, E = object | string>(
    props: Omit<ApiPaginatedQueryProps<TApi, T, E>, "run"> & {
      run: (
        api: StrictApi<TApi, ExtractModel<T>>,
        params: { skip?: number; limit?: number; count?: boolean }
      ) => unknown;
    }
  ): [Model<T, E>, () => void, number] {
    const queryClient = useQueryClient();
    const { onError } = useOpraConfig<TApi>();

    const countCacheKey = useMemo(
      () => ["TOTAL_MATCHES_CACHE", ...props.queryKey],
      [props.queryKey]
    );

    const cachedTotalMatches = queryClient.getQueryData<number>(countCacheKey);
    const needsCount = cachedTotalMatches === undefined;

    const resolveCall = useCallback(
      async (api: TApi): Promise<unknown> => {
        const pagingParams = props.pagination.skip
          ? {
              skip: props.pagination.skip,
              limit: props.pagination.limit,
              count: needsCount,
            }
          : { limit: props.pagination.limit, count: needsCount };

        const runner = props.run(
          api as StrictApi<TApi, ExtractModel<T>>,
          pagingParams
        );
        if (runner && typeof runner === "object" && "getResponse" in runner) {
          return await (runner as OpraRunner).getResponse();
        }
        return await (runner as Promise<unknown>);
      },
      [props.run, props.pagination.skip, props.pagination.limit, needsCount]
    );

    const latestCallRef = useRef(resolveCall);
    useLayoutEffect(() => {
      latestCallRef.current = resolveCall;
    }, [resolveCall]);

    const stringDeps = useMemo(
      () => props.queryKey.filter((k): k is string => typeof k === "string"),
      [props.queryKey]
    );

    const localBridge = useBridge<TApi, unknown>(
      async (api) => await latestCallRef.current(api),
      stringDeps
    );

    const { call } = props.connection
      ? props.connection(
          async (api) => await latestCallRef.current(api),
          stringDeps
        )
      : localBridge;

    const query = useQuery<QueryResult<T>, E>({
      queryKey: [
        ...props.queryKey,
        props.pagination.skip,
        props.pagination.limit,
      ],
      queryFn: async () => {
        const response = await call();
        const res = response as OpraResponse<E>;

        if (!res?.ok) {
          throw (
            res?.body?.errors ?? res?.body ?? res?.statusText ?? "Unknown Error"
          );
        }

        const apiTotalMatches = Number(
          (res.body as { totalMatches?: number })?.totalMatches
        );
        if (needsCount && !isNaN(apiTotalMatches)) {
          queryClient.setQueryData(countCacheKey, apiTotalMatches);
        }

        return {
          result: (res.body?.payload ?? res.body) as T,
          totalMatches: needsCount
            ? isNaN(apiTotalMatches)
              ? 0
              : apiTotalMatches
            : (cachedTotalMatches ?? 0),
        };
      },
      enabled: props.enabled ?? true,
      retry: props.retry ?? false,
      staleTime: props.staleTime ?? Infinity,
      refetchOnWindowFocus: props.refetchOnWindowFocus,
      refetchOnMount: props.refetchOnMount,
    });

    useEffect(() => {
      if (query.isError && query.error && onError) {
        onError(query.error);
      }
    }, [query.isError, query.error, onError]);

    const state: Model<T, E> = useMemo(
      () => ({
        result: query.data?.result,
        isLoading: query.isLoading,
        isSuccess: query.isSuccess,
        isFetching: query.isFetching,
        isError: query.isError,
        error: query.error,
        pending: query.isPending,
      }),
      [query]
    );

    return [
      state,
      query.refetch as () => void,
      query.data?.totalMatches ?? cachedTotalMatches ?? 0,
    ];
  }

  function useApiMutation<T, V = void, E = object | string>(
    props: ApiMutationProps<TApi, T, V, E>
  ): [Model<T, E>, (variables: V) => Promise<T>] {
    const { onError } = useOpraConfig<TApi>();
    const varsRef = useRef<V | undefined>(undefined);

    const resolveCall = useCallback(
      async (api: TApi): Promise<unknown> => {
        const runner = props.run(api, varsRef.current as V);
        if (runner && typeof runner === "object" && "getResponse" in runner) {
          return await (runner as OpraRunner).getResponse();
        }
        return await (runner as Promise<unknown>);
      },
      [props.run]
    );

    const localBridge = useBridge<TApi, unknown>(
      async (api) => await resolveCall(api),
      []
    );

    const { call } = props.connection
      ? props.connection(async (api) => await resolveCall(api), [])
      : localBridge;

    const mutation = useMutation<T, E, V>({
      mutationFn: async (variables: V) => {
        varsRef.current = variables;
        const response = await call();
        const res = response as OpraResponse<E>;

        if (!res?.ok) {
          throw (
            res?.body?.errors ?? res?.body ?? res?.statusText ?? "Unknown Error"
          );
        }
        return (res.body?.payload ?? res.body) as T;
      },
      retry: props.retry ?? false,
      onError: (err: unknown) => {
        if (onError) onError(err);
      },
    });

    const execute = useCallback(
      async (variables: V): Promise<T> => await mutation.mutateAsync(variables),
      [mutation]
    );

    const state: Model<T, E> = {
      result: mutation.data,
      isLoading: mutation.isPending,
      isSuccess: mutation.isSuccess,
      isFetching: false,
      isError: mutation.isError,
      error: mutation.error ?? null,
      pending: mutation.isPending,
    };

    return [state, execute];
  }

  function useApiInfiniteQuery<T, E = object | string>(
    props: Omit<ApiInfiniteQueryProps<TApi, T, E>, "run"> & {
      run: (
        api: StrictApi<TApi, ExtractModel<T>>,
        params: { skip?: number; limit: number }
      ) => unknown;
    }
  ) {
    const limit = props.limit ?? 10;
    const { onError } = useOpraConfig<TApi>();
    const [sessionKey] = useState(() => Date.now().toString());

    const cacheKeySegment = props.cache
      ? (props.staleTime ?? "infinite-cache")
      : sessionKey;
    const staleTime = props.cache ? (props.staleTime ?? Infinity) : 0;
    const currentSkipRef = useRef<number>(0);

    const resolveCall = useCallback(
      async (api: TApi): Promise<unknown> => {
        const pagingParams = currentSkipRef.current
          ? { skip: currentSkipRef.current, limit }
          : { limit };
        const runner = props.run(
          api as StrictApi<TApi, ExtractModel<T>>,
          pagingParams
        );
        if (runner && typeof runner === "object" && "getResponse" in runner) {
          return await (runner as OpraRunner).getResponse();
        }
        return await (runner as Promise<unknown>);
      },
      [props.run, limit]
    );

    const latestCallRef = useRef(resolveCall);
    useLayoutEffect(() => {
      latestCallRef.current = resolveCall;
    }, [resolveCall]);

    const stringDeps = useMemo(
      () => props.queryKey.filter((k): k is string => typeof k === "string"),
      [props.queryKey]
    );

    const localBridge = useBridge<TApi, unknown>(
      async (api) => await latestCallRef.current(api),
      stringDeps
    );

    const { call } = props.connection
      ? props.connection(
          async (api: TApi) => await latestCallRef.current(api),
          stringDeps
        )
      : localBridge;

    const query = useInfiniteQuery<QueryResult<T[]>, E>({
      queryKey: [...props.queryKey, limit, cacheKeySegment],
      initialPageParam: 0,
      queryFn: async ({ pageParam = 0 }) => {
        currentSkipRef.current = pageParam as number;
        const response = await call();
        const res = response as OpraResponse<E>;

        if (!res?.ok) {
          throw (
            res?.body?.errors ?? res?.body ?? res?.statusText ?? "Unknown Error"
          );
        }

        return {
          result: (res.body?.payload ?? res.body ?? []) as T[],
          totalMatches: Number(
            (res.body as { totalMatches?: number })?.totalMatches ?? 0
          ),
        };
      },
      getNextPageParam: (lastPage, allPages) => {
        if (!lastPage.result || lastPage.result.length < limit) {
          return null;
        }
        return allPages.length * limit;
      },
      enabled: props.enabled ?? true,
      staleTime,
      maxPages: props.maxPages ?? undefined,
    });

    useEffect(() => {
      if (query.isError && query.error && onError) {
        onError(query.error);
      }
    }, [query.isError, query.error, onError]);

    const flatData = useMemo(
      () =>
        query.data?.pages.flatMap((page: QueryResult<T[]>) => page.result) ||
        [],
      [query.data]
    );

    return {
      data: flatData,
      fetchNextPage: query.fetchNextPage,
      hasNextPage: query.hasNextPage,
      isFetchingNextPage: query.isFetchingNextPage,
      isLoading: query.isLoading,
      isError: query.isError,
      isFetching: query.isFetching,
      totalMatches: query.data?.pages?.[0]?.totalMatches ?? 0,
      refetch: query.refetch,
    };
  }

  return {
    useApiQuery,
    useApiPaginatedQuery,
    useApiMutation,
    useApiInfiniteQuery,
  };
}
