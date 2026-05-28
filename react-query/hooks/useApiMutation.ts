/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useBridge } from "@lib/hooks/bridge";
import type {
  ApiMutationProps,
  ErrorType,
  ApiModel as Model,
} from "@lib/service/tanstack/types";
import type { ServiceApiError } from "@lib/service/types";
import { useMutation } from "@tanstack/react-query";
import type { WebHISApi } from "@webhis-api";
import { message } from "antd";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

interface OpraRunner {
  getResponse: () => Promise<unknown>;
}
/**
 * POST/PUT/DELETE işlemleri -> useMutation (Cachelenmez, aksiyondur)
 * TanStack `useMutation` tabanlı API hook.
 
 @example
 const [state, execute] = useApiMutation<LoginResult, LoginFormFields>({
  run: (api, vars) => api.$auth.signin(vars),
 });
 * // Butona basıldığında:
 * await execute({ username: "admin", password: "123" });
 */
export function useApiMutation<T, V = void, E = object | string>(
  props: ApiMutationProps<T, V, E>
): [Model<T, E>, (variables: V) => Promise<T>] {
  const { t } = useTranslation();

  const varsRef = useRef<V>();

  const resolveCall = useCallback(
    async (api: WebHISApi): Promise<unknown> => {
      const runner = props.run(api, varsRef.current as V);

      if (runner && typeof runner === "object" && "getResponse" in runner) {
        return await (runner as OpraRunner).getResponse();
      }
      return await (runner as Promise<unknown>);
    },
    [props.run]
  );

  const localBridge = useBridge<unknown>(
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

      const res = response as {
        ok?: boolean;
        statusText?: string;
        body?: {
          errors?: E;
          payload?: unknown;
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

      return (res.body?.payload ?? res.body) as T;
    },
    retry: props.retry ?? false,

    onError: (err) => {
      void message.open({
        content:
          (err as ServiceApiError)?.issues?.[0]?.message ||
          (err as ServiceApiError)?.message ||
          (err as ServiceApiError[])?.[0]?.message ||
          t("alert.error"),
        type: "error",
        duration: 5,
      });
    },
  });

  const execute = useCallback(
    async (variables: V): Promise<T> => await mutation.mutateAsync(variables),
    [mutation]
  );

  const state: Model<T, E> = {
    result: mutation.data,
    isLoading: mutation.isPending,
    isSuccess: false,
    isFetching: false, // mutation'da background refetch olmaz
    isError: mutation.isError,
    error: mutation.error ?? null,
    pending: mutation.isPending,
  };

  return [state, execute];
}
