/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { useCallback, useRef } from "react";
import { useOpraConfig } from "../core/OpraProvider";

export function useBridge<TApi, TResult>(
    fn: (api: TApi) => Promise<TResult>,
    deps: unknown[] = []
) {
    const { apiInstance, onAuthError } = useOpraConfig<TApi>();

    const fnRef = useRef(fn);
    fnRef.current = fn;

    const execute = useCallback(async (): Promise<TResult> => {
        try {
            // 1. İsteği çalıştır. (Token ve Interceptor işi zaten apiInstance içinde ayarlı)
            const result = await fnRef.current(apiInstance);

            // Not: OpraResponse'da status kodu body içinde veya ana objede olabilir
            const status = (result as any)?.status || (result as any)?.body?.status;

            if (status === 401 || status === 403) {
                if (onAuthError) onAuthError(result);
                throw new Error("Unauthorized: Session Expired");
            }

            return result;
        } catch (error: any) {
            if (error?.status === 401 || error?.status === 403) {
                if (onAuthError) onAuthError(error);
            }
            throw error;
        }
    }, [apiInstance, onAuthError, ...deps]);

    return { call: execute };
}