/* eslint-disable @tanstack/query/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useBridge } from "@lib/hooks/bridge";
import type {
  ApiQueryProps,
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
import { useQuery } from "@tanstack/react-query";
import type { WebHISApi } from "@webhis-api";
import { message } from "antd";
import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

export type StrictApiQueryProps<T, E> = Omit<ApiQueryProps<T, E>, "run"> & {
  run: (api: StrictApi<WebHISApi, ExtractModel<T>>) => unknown;
};

/**
  * GET işlemleri -> useApiQuery (Cache içerir)
  @example
  const [state, refetch] = useApiQuery<Response>({
    queryKey: ["key", params],
    run: (p) => p.$opra.method({ 
      // BURADA PROJECTION ZORUNLU!
    }),
  });
  
  @returns
  * state.result //Response type
 */
export function useApiQuery<T, E = object | string>(
  props: StrictApiQueryProps<T, E>
): [Model<T, E>, () => void, number] {
  const { t } = useTranslation();

  const resolveCall = useCallback(
    async (api: WebHISApi): Promise<unknown> => {
      const runner = props.run(api as StrictApi<WebHISApi, ExtractModel<T>>);

      if (runner && typeof runner === "object" && "getResponse" in runner) {
        return await (runner as OpraRunner).getResponse();
      }
      return await (runner as Promise<unknown>);
    },
    [props.run]
  );

  const stringDeps = useMemo(
    () => props.queryKey.filter((k): k is string => typeof k === "string"),
    [JSON.stringify(props.queryKey)]
  );

  const localBridge = useBridge<unknown>(
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
        result: (res.body?.payload ?? res.body) as T,
        totalMatches: Number(res.body?.totalMatches ?? 0),
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

  return [state, query.refetch as () => void, query.data?.totalMatches ?? 0];
}
