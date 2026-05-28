import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useBridge, useOpraConfig } from "../core";
import type { Model, OpraRunner, QueryResult, ExtractModel, StrictApi } from "../core/types";
import type { RtkApiQueryProps, RtkApiMutationProps, RtkApiPaginatedQueryProps } from "./types";

export function createOpraRtkHooks<TApi>() {
  function useRtkApiQuery<T, E = object | string>(
    props: Omit<RtkApiQueryProps<TApi, T, E>, "run"> & {
      run: (api: StrictApi<TApi, ExtractModel<T>>) => unknown;
    }
  ): [Model<T, E>, () => void, number] {
    const dispatch = useDispatch();
    const { onError } = useOpraConfig<TApi>();
    const [totalMatches, setTotalMatches] = useState(0);

    const [state, setState] = useState<Model<T, E>>({
      isLoading: false,
      isSuccess: false,
      isFetching: false,
      isError: false,
      pending: false,
    });

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

    const localBridge = useBridge<TApi, unknown>(async (api) => await resolveCall(api), stringDeps);
    const { call } = props.connection ? props.connection(async (api) => await resolveCall(api), stringDeps) : localBridge;

    const execute = useCallback(async () => {
      setState((prev) => ({ ...prev, isLoading: true, isFetching: true, pending: true, isError: false }));
      dispatch({ type: `${props.actionName}/pending`, meta: { queryKey: props.queryKey } });

      try {
        const response = await call();
        const res = response as any;

        if (!res?.ok) {
          throw res?.body?.errors ?? res?.body ?? res?.statusText ?? "Unknown Error";
        }

        const result = (res.body?.payload ?? res.body) as T;
        const matches = Number(res.body?.totalMatches ?? 0);
        
        setTotalMatches(matches);
        dispatch({ type: `${props.actionName}/fulfilled`, payload: result, meta: { queryKey: props.queryKey, totalMatches: matches } });
        
        setState({
          result,
          isLoading: false,
          isFetching: false,
          isSuccess: true,
          isError: false,
          pending: false,
        });
      } catch (error) {
        dispatch({ type: `${props.actionName}/rejected`, payload: error, error: true, meta: { queryKey: props.queryKey } });
        setState({
          error: error as E,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: true,
          pending: false,
        });
        if (onError) onError(error);
      }
    }, [call, dispatch, props.actionName, props.queryKey, onError]);

    useEffect(() => {
      // Basic fetch on mount logic. In a real RTK Query setup, this is more complex, 
      // but here we follow the simplified RTK API wrapper approach.
      execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, stringDeps);

    return [state, execute, totalMatches];
  }

  function useRtkApiMutation<T, V = void, E = object | string>(
    props: RtkApiMutationProps<TApi, T, V, E>
  ): [Model<T, E>, (variables: V) => Promise<T>] {
    const dispatch = useDispatch();
    const { onError } = useOpraConfig<TApi>();
    const varsRef = useRef<V | undefined>(undefined);

    const [state, setState] = useState<Model<T, E>>({
      isLoading: false,
      isSuccess: false,
      isFetching: false,
      isError: false,
      pending: false,
    });

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

    const localBridge = useBridge<TApi, unknown>(async (api) => await resolveCall(api), []);
    const { call } = props.connection ? props.connection(async (api) => await resolveCall(api), []) : localBridge;

    const execute = useCallback(
      async (variables: V): Promise<T> => {
        varsRef.current = variables;
        setState((prev) => ({ ...prev, isLoading: true, isFetching: true, pending: true, isError: false }));
        dispatch({ type: `${props.actionName}/pending`, meta: { variables } });

        try {
          const response = await call();
          const res = response as any;

          if (!res?.ok) {
            throw res?.body?.errors ?? res?.body ?? res?.statusText ?? "Unknown Error";
          }

          const result = (res.body?.payload ?? res.body) as T;
          dispatch({ type: `${props.actionName}/fulfilled`, payload: result, meta: { variables } });
          
          setState({
            result,
            isLoading: false,
            isFetching: false,
            isSuccess: true,
            isError: false,
            pending: false,
          });

          return result;
        } catch (error) {
          dispatch({ type: `${props.actionName}/rejected`, payload: error, error: true, meta: { variables } });
          setState({
            error: error as E,
            isLoading: false,
            isFetching: false,
            isSuccess: false,
            isError: true,
            pending: false,
          });
          if (onError) onError(error);
          throw error;
        }
      },
      [call, dispatch, props.actionName, onError]
    );

    return [state, execute];
  }

  function useRtkApiPaginatedQuery<T, E = object | string>(
    props: Omit<RtkApiPaginatedQueryProps<TApi, T, E>, "run"> & {
      run: (
        api: StrictApi<TApi, ExtractModel<T>>,
        params: { skip?: number; limit?: number; count?: boolean }
      ) => unknown;
    }
  ): [Model<T, E>, () => void, number] {
    const dispatch = useDispatch();
    const { onError } = useOpraConfig<TApi>();
    const [totalMatches, setTotalMatches] = useState(0);

    const [state, setState] = useState<Model<T, E>>({
      isLoading: false,
      isSuccess: false,
      isFetching: false,
      isError: false,
      pending: false,
    });

    const resolveCall = useCallback(
      async (api: TApi): Promise<unknown> => {
        const pagingParams = props.pagination.skip
          ? { skip: props.pagination.skip, limit: props.pagination.limit, count: true }
          : { limit: props.pagination.limit, count: true };

        const runner = props.run(api as StrictApi<TApi, ExtractModel<T>>, pagingParams);
        if (runner && typeof runner === "object" && "getResponse" in runner) {
          return await (runner as OpraRunner).getResponse();
        }
        return await (runner as Promise<unknown>);
      },
      [props.run, props.pagination.skip, props.pagination.limit]
    );

    const latestCallRef = useRef(resolveCall);
    useLayoutEffect(() => {
      latestCallRef.current = resolveCall;
    }, [resolveCall]);

    const stringDeps = useMemo(
      () => props.queryKey.filter((k): k is string => typeof k === "string"),
      [props.queryKey]
    );

    const localBridge = useBridge<TApi, unknown>(async (api) => await latestCallRef.current(api), stringDeps);
    const { call } = props.connection ? props.connection(async (api) => await latestCallRef.current(api), stringDeps) : localBridge;

    const execute = useCallback(async () => {
      setState((prev) => ({ ...prev, isLoading: true, isFetching: true, pending: true, isError: false }));
      const fullQueryKey = [...props.queryKey, props.pagination.skip, props.pagination.limit];
      dispatch({ type: `${props.actionName}/pending`, meta: { queryKey: fullQueryKey, pagination: props.pagination } });

      try {
        const response = await call();
        const res = response as any;

        if (!res?.ok) {
          throw res?.body?.errors ?? res?.body ?? res?.statusText ?? "Unknown Error";
        }

        const result = (res.body?.payload ?? res.body) as T;
        const matches = Number(res.body?.totalMatches ?? 0);
        
        if (!isNaN(matches)) {
            setTotalMatches(matches);
        }

        dispatch({ type: `${props.actionName}/fulfilled`, payload: result, meta: { queryKey: fullQueryKey, totalMatches: matches } });
        
        setState({
          result,
          isLoading: false,
          isFetching: false,
          isSuccess: true,
          isError: false,
          pending: false,
        });
      } catch (error) {
        dispatch({ type: `${props.actionName}/rejected`, payload: error, error: true, meta: { queryKey: [...props.queryKey, props.pagination.skip, props.pagination.limit] } });
        setState({
          error: error as E,
          isLoading: false,
          isFetching: false,
          isSuccess: false,
          isError: true,
          pending: false,
        });
        if (onError) onError(error);
      }
    }, [call, dispatch, props.actionName, props.queryKey, props.pagination, onError]);

    useEffect(() => {
      execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...stringDeps, props.pagination.skip, props.pagination.limit]);

    return [state, execute, totalMatches];
  }

  return {
    useRtkApiQuery,
    useRtkApiMutation,
    useRtkApiPaginatedQuery,
  };
}
