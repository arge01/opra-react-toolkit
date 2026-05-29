import { useCallback, useRef } from "react";
import { useOpraConfig } from "./OpraProvider";

type OpraLikeResponse<T> = T & {
  status?: number;
  body?: {
    status?: number;
  };
};

type OpraLikeError = {
  status?: number;
};

export function useBridge<TApi, TResult>(
  fn: (api: TApi) => Promise<TResult>,
  deps: unknown[] = []
) {
  const { apiInstance, onAuthError, onError } = useOpraConfig<TApi>();

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const execute = useCallback(async (): Promise<TResult> => {
    try {
      const result = await fnRef.current(apiInstance);

      const opraResult = result as OpraLikeResponse<TResult>;
      const status = opraResult?.status ?? opraResult?.body?.status;

      if (status === 401 || status === 403) {
        if (onAuthError) onAuthError(result);
        throw new Error("Unauthorized: Session Expired");
      }

      return result;
    } catch (e: unknown) {
      const error = e as OpraLikeError;

      if (error && typeof error === "object" && "status" in error) {
        if (error.status === 401 || error.status === 403) {
          if (onAuthError) onAuthError(error);
        } else {
          if (onError) onError(error);
        }
      } else {
        if (onError) onError(e);
      }
      throw e;
    }
  }, [apiInstance, onAuthError, onError, ...deps]);

  return { call: execute };
}
