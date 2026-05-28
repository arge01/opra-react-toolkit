/* eslint-disable @typescript-eslint/no-unnecessary-condition */

/* eslint-disable @tanstack/query/exhaustive-deps */
import { useBridge } from "@lib/hooks/bridge";
import type {
  ApiQueryProps,
  ErrorType,
  OpraRunner,
  QueryResult,
} from "@lib/service/tanstack/types";
import type {
  StrictApi,
  ExtractModel,
  ServiceApiError,
} from "@lib/service/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { WebHISApi } from "@webhis-api";
import { message } from "antd";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useEffect,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

type Props<T, E> = ApiQueryProps<T, E> & { maxPages?: number | undefined };

export type StrictApiInfiniteQueryProps<T, E> = Omit<Props<T, E>, "run"> & {
  run: (
    api: StrictApi<WebHISApi, ExtractModel<T>>,
    params: { skip?: number; limit: number }
  ) => unknown;
  limit?: number;
  cache?: boolean;
};

/**
 * Infinity scroll ile data çekme
 
 * * @example
 const {
     data:,
     fetchNextPage,
     hasNextPage,
     isFetchingNextPage,
     isLoading,
   } = useApiInfiniteQuery<Personel>({
     limit: 10,
     queryKey: [keys...],
 
     run: (api, params) =>
       api.$personelCollection.findMany({
         ...params,
         projection // ZORUNLU!
         filter,
         sort,
       }),
   });
 
 @return
 * if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
 */
export function useApiInfiniteQuery<T, E = object | string>(
  props: StrictApiInfiniteQueryProps<T, E>
) {
  const { t } = useTranslation();
  const limit = props.limit ?? 10;

  const [sessionKey] = useState(() => Date.now().toString());

  const cacheKeySegment = props.cache
    ? (props.staleTime ?? "infinite-cache")
    : sessionKey;

  const staleTime = props.cache ? (props.staleTime ?? Infinity) : 0;

  const currentSkipRef = useRef<number>(0);

  const resolveCall = useCallback(
    async (api: WebHISApi): Promise<unknown> => {
      const pagingParams = currentSkipRef.current
        ? {
            skip: currentSkipRef.current,
            limit,
          }
        : {
            limit,
          };

      const runner = props.run(
        api as StrictApi<WebHISApi, ExtractModel<T>>,
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
    [JSON.stringify(props.queryKey)]
  );

  const localBridge = useBridge<unknown>(
    async (api) => await latestCallRef.current(api),
    stringDeps
  );

  const { call } = props.connection
    ? props.connection(
        async (api: WebHISApi) => await latestCallRef.current(api),
        stringDeps
      )
    : localBridge;

  const query = useInfiniteQuery<QueryResult<T[]>, E>({
    queryKey: [...props.queryKey, limit, cacheKeySegment],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      currentSkipRef.current = pageParam as number;

      const response = await call();

      const res = response as {
        ok?: boolean;
        statusText?: string;
        body?: {
          errors?: E;
          payload?: unknown;
          totalMatches?: number;
        };
      };

      if (!res?.ok) {
        throw (
          res?.body?.errors ??
          (res?.body as unknown as E) ??
          (res?.statusText as unknown as E) ??
          ("Unknown Error" as unknown as E)
        );
      }

      return {
        result: (res.body?.payload ?? res.body ?? []) as T[],
        totalMatches: Number(res.body?.totalMatches ?? 0),
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
    if (query.isError && query.error) {
      const err = query.error as ErrorType;

      void message.open({
        content:
          (err as ServiceApiError)?.issues?.[0]?.message ||
          (err as ServiceApiError)?.message ||
          (err as ServiceApiError[])?.[0]?.message ||
          t("alert.error"),
        type: "error",
        duration: 5,
      });
    }
  }, [query.isError, query.error, t]);

  const flatData = useMemo(
    () => query.data?.pages.flatMap((page) => page.result) || [],
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
