// src/core/useBridge.ts
import { useCallback, useRef } from "react";
import { useOpraConfig } from "./OpraProvider";

// Opra'nın genel hata yapısını veya response yapısını modelleyen yardımcı tipler
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
    const { apiInstance, onAuthError } = useOpraConfig<TApi>();

    const fnRef = useRef(fn);
    fnRef.current = fn;

    const execute = useCallback(async (): Promise<TResult> => {
        try {
            // 1. İsteği çalıştır.
            const result = await fnRef.current(apiInstance);

            // 2. Güvenli Tip Dönüşümü (Type Assertion olmadan kontrol)
            const opraResult = result as OpraLikeResponse<TResult>;
            const status = opraResult?.status ?? opraResult?.body?.status;

            if (status === 401 || status === 403) {
                if (onAuthError) onAuthError(result);
                throw new Error("Unauthorized: Session Expired");
            }

            return result;
        } catch (e: unknown) {
            // Catch bloğunda gelen hatayı 'unknown' olarak yakalayıp güvenli kontrol yapıyoruz
            const error = e as OpraLikeError;

            if (error && typeof error === 'object' && ('status' in error)) {
                if (error.status === 401 || error.status === 403) {
                    if (onAuthError) onAuthError(error);
                }
            }
            throw e; // Orijinal hatayı fırlatmaya devam et
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiInstance, onAuthError, ...deps]);

    return { call: execute };
}