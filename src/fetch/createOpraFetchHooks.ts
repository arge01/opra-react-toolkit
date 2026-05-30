import { useState, useCallback, useEffect, useMemo } from "react";
import { useOpraConfig } from "../core/OpraProvider";
import type { OpraRunner } from "../core/types";
import type { ServiceState } from "./types";

interface ParsedResponse {
  ok?: boolean;
  status?: number;
  statusText?: string;
  body?:
    | {
        totalMatches?: number;
        payload?: unknown;
        errors?: unknown;
      }
    | unknown;
}

export function createOpraFetchHooks<TApi>() {
  /**
   * Basic GET hook (no external dependencies).
   * Supports manual triggering or auto-fetch on mount.
   */
  function useApiQuery<T>(props: {
    run: (api: TApi) => unknown;
    enabled?: boolean;
  }): [ServiceState<T>, (force?: boolean) => void, number] {
    const { apiInstance, onError } = useOpraConfig();
    const enabled = props.enabled !== false;

    const [trigger, setTriggerState] = useState<boolean>(enabled);
    const [totalMatches, setTotalMatches] = useState<number>(0);
    const [state, setState] = useState<ServiceState<T>>({
      isLoading: enabled,
      isSuccess: false,
      result: undefined,
      error: undefined,
      status: undefined,
    });

    const setTrigger = useCallback((force = true) => {
      setTriggerState(force);
    }, []);

    useEffect(() => {
      let isMounted = true;

      if (trigger) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            isLoading: true,
            isSuccess: false,
            error: undefined,
          }));
        }

        const execute = async () => {
          try {
            const runner = props.run(apiInstance as TApi);
            let response;
            if (
              runner &&
              typeof runner === "object" &&
              "getResponse" in runner
            ) {
              response = await (runner as OpraRunner).getResponse();
            } else {
              response = await runner;
            }

            const res = response as ParsedResponse;

            if (res?.ok) {
              if (isMounted) {
                const bodyObj = res.body as Record<string, unknown> | undefined;
                setTotalMatches(Number(bodyObj?.totalMatches || 0));
                setState({
                  isLoading: false,
                  isSuccess: true,
                  result: (bodyObj?.payload ?? res.body) as T,
                  error: undefined,
                  status: res.status,
                });
              }
            } else {
              if (isMounted) {
                const bodyObj = res.body as Record<string, unknown> | undefined;
                const errorData =
                  bodyObj?.errors ?? res?.body ?? res?.statusText;
                setTotalMatches(0);
                setState({
                  isLoading: false,
                  isSuccess: false,
                  result: undefined,
                  error: errorData,
                  status: res?.status,
                });
                if (onError) onError(errorData);
              }
            }
          } catch (err) {
            if (isMounted) {
              setTotalMatches(0);
              setState({
                isLoading: false,
                isSuccess: false,
                result: undefined,
                error: err,
                status: 500,
              });
              if (onError) onError(err);
            }
          }
        };

        void execute();
        setTriggerState(false);
      }

      return () => {
        isMounted = false;
      };
    }, [trigger, apiInstance, onError, props]);

    return useMemo(
      () => [state, setTrigger, totalMatches],
      [state, setTrigger, totalMatches]
    );
  }

  /**
   * Basic POST/PUT/PATCH/DELETE hook.
   * Can be executed via Promise (.then / .catch).
   */
  function useApiMutation<TData = unknown, TVariables = void>(props?: {
    run?: (api: TApi, vars: TVariables) => unknown;
  }) {
    const { apiInstance, onError } = useOpraConfig();

    const [state, setState] = useState<{
      isLoading: boolean;
      isSuccess: boolean;
      error: unknown;
      data: TData | undefined;
    }>({
      isLoading: false,
      isSuccess: false,
      error: undefined,
      data: undefined,
    });

    const execute = useCallback(
      async (
        vars: TVariables,
        overrideRun?: (api: TApi, v: TVariables) => unknown
      ): Promise<TData> => {
        setState((prev) => ({ ...prev, isLoading: true, error: undefined }));

        try {
          const runFn = overrideRun || props?.run;
          if (!runFn) {
            throw new Error("No run function provided to mutation");
          }

          const runner = runFn(apiInstance as TApi, vars);
          let response;
          if (runner && typeof runner === "object" && "getResponse" in runner) {
            response = await (runner as OpraRunner).getResponse();
          } else {
            response = await runner;
          }

          const res = response as ParsedResponse;

          if (res?.ok) {
            const bodyObj = res.body as Record<string, unknown> | undefined;
            const data = (bodyObj?.payload ?? res.body) as TData;
            setState({
              isLoading: false,
              isSuccess: true,
              data,
              error: undefined,
            });
            return data;
          } else {
            const bodyObj = res.body as Record<string, unknown> | undefined;
            const errorData = bodyObj?.errors ?? res?.body ?? res?.statusText;
            setState({
              isLoading: false,
              isSuccess: false,
              data: undefined,
              error: errorData,
            });
            if (onError) onError(errorData);
            throw errorData;
          }
        } catch (err) {
          setState({
            isLoading: false,
            isSuccess: false,
            data: undefined,
            error: err,
          });
          if (onError) onError(err);
          throw err;
        }
      },
      [apiInstance, onError, props]
    );

    return [state, execute] as const;
  }

  /**
   * Basic GET hook that must be triggered manually via useEffect or event handlers.
   * Equivalent to useApiQuery with enabled: false by default.
   */
  function useTriggerApiQuery<T>(props: {
    run: (api: TApi) => unknown;
  }): [ServiceState<T>, (force?: boolean) => void, number] {
    return useApiQuery<T>({ ...props, enabled: false });
  }

  return {
    useApiQuery,
    useTriggerApiQuery,
    useApiMutation,
  };
}
