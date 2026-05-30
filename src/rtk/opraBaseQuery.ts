import type { BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { OpraResponse, OpraRunner } from "../core/types";

export interface OpraQueryArgs<TApi> {
  run: (api: TApi) => unknown;
}

export function opraBaseQuery<TApi, E = unknown>(
  apiInstance: TApi
): BaseQueryFn<OpraQueryArgs<TApi>, unknown, E> {
  return async ({ run }) => {
    try {
      const runner = run(apiInstance);
      let response;

      if (runner && typeof runner === "object" && "getResponse" in runner) {
        response = await (runner as OpraRunner).getResponse();
      } else {
        response = await runner;
      }

      const res = response as OpraResponse<E>;

      if (!res?.ok) {
        return {
          error: (res?.body?.errors ??
            res?.body ??
            res?.statusText ??
            "Unknown Error") as E,
        };
      }

      return { data: res.body };
    } catch (error) {
      return { error: error as E };
    }
  };
}
