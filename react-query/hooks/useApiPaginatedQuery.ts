/* eslint-disable @tanstack/query/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useBridge } from "@lib/hooks/bridge";
import type {
  ApiPaginatedQueryProps,
  ErrorType,
  ApiModel as Model,
  OpraRunner,
  QueryResult,
} from "@lib/service/tanstack/types";
import type {
  StrictApi,
  ExtractModel,
  ServiceApiError,
} from "@lib/service/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WebHISApi } from "@webhis-api";
import { message } from "antd";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";

export type StrictApiPaginatedQueryProps<T, E> = Omit<
  ApiPaginatedQueryProps<T, E>,
  "run"
> & {
  run: (
    api: StrictApi<WebHISApi, ExtractModel<T>>,
    params: { skip?: number; limit?: number; count?: boolean }
  ) => unknown;
};

/**
 * Sayfalamalı (Paginated) GET işlemleri -> useApiPaginatedQuery (Cache ve Akıllı Count içerir)
 
 * * @example
 * const [pagination, setPagination] = useState({ skip: 0, limit: 5 });
 * const [state, refetch, totalMatches] = useApiPaginatedQuery<Personel[]>({
   pagination,
   queryKey: [keys...],
   run: (p, params) => p.$personelCollection.findMany({
      ...params,
      sort,
      projection // ZORUNLU!
   }),
 });
 
 @return
 * state.result //Response type
 */
export function useApiPaginatedQuery<T, E = object | string>(
  props: StrictApiPaginatedQueryProps<T, E>
): [Model<T, E>, () => void, number] {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const countCacheKey = useMemo(
    () => ["TOTAL_MATCHES_CACHE", ...props.queryKey],
    [JSON.stringify(props.queryKey)]
  );

  const cachedTotalMatches = queryClient.getQueryData<number>(countCacheKey);
  const needsCount = cachedTotalMatches === undefined;

  const resolveCall = useCallback(
    async (api: WebHISApi): Promise<unknown> => {
      const pagingParams = props.pagination.skip
        ? {
            skip: props.pagination.skip,
            limit: props.pagination.limit,
            count: needsCount,
          }
        : {
            limit: props.pagination.limit,
            count: needsCount,
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
    [props.run, props.pagination.skip, props.pagination.limit, needsCount]
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

      const extractedResult = (res.body?.payload ?? res.body) as T;
      const apiTotalMatches = Number(res.body?.totalMatches);

      if (needsCount && !isNaN(apiTotalMatches)) {
        queryClient.setQueryData(countCacheKey, apiTotalMatches);
      }

      return {
        result: extractedResult,
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
    [
      query.data,
      query.isLoading,
      query.isFetching,
      query.isSuccess,
      query.isError,
      query.error,
      query.isPending,
    ]
  );

  return [
    state,
    query.refetch as () => void,
    query.data?.totalMatches ?? cachedTotalMatches ?? 0,
  ];
}
