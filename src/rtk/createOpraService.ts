/* eslint-disable @typescript-eslint/ban-ts-comment */
import { createApi } from "@reduxjs/toolkit/query/react";
import { opraBaseQuery } from "./opraBaseQuery";
import type { OpraServiceOptions } from "./types";
import type { RtkDraftItem, RtkDraftList } from "../core/types";

type BaseApiWithUtil = {
  util: {
    updateQueryData: (
      endpointName: string,
      args: unknown,
      updateRecipe: (draft: RtkDraftList) => void
    ) => unknown;
  };
};

export function createOpraService<TApi>(
  apiInstance: TApi,
  options: OpraServiceOptions<TApi>
) {
  const typeKey = options.tagTypes?.[0] || options.reducerPath;

  const api = createApi({
    reducerPath: options.reducerPath,
    baseQuery: opraBaseQuery(apiInstance),
    tagTypes: [typeKey],
    endpoints: () => ({}),
  });

  const injectedApi = api.injectEndpoints({
    // @ts-expect-error RTK Query dynamic endpoints definition
    endpoints: (builder) => {
      const endpoints: Record<string, unknown> = {};

      // --- GET ALL (Listing) ---
      if (options.getAll) {
        endpoints.getAll = builder.query({
          query: (args) => ({
            run: (apiInstanceRef: TApi) =>
              options.getAll!(apiInstanceRef, args),
          }),
          providesTags: [typeKey],
        });
      }

      // --- GET (Single Item) ---
      if (options.get) {
        endpoints.get = builder.query({
          query: (args) => ({
            run: (apiInstanceRef: TApi) => options.get!(apiInstanceRef, args),
          }),
          providesTags: [typeKey],
        });
      }

      // --- POST (Creation - No Refetch) ---
      if (options.post) {
        endpoints.post = builder.mutation({
          query: ({ body }) => ({
            run: (apiInstanceRef: TApi) => options.post!(apiInstanceRef, body),
          }),

          async onQueryStarted({ listArgs }, { dispatch, queryFulfilled }) {
            try {
              const { data: createdItem } = await queryFulfilled;

              dispatch(
                // @ts-expect-error RTK Query dynamic endpoint dispatch
                endpoints.getAll.initiate(listArgs, {
                  subscribe: false,
                  forceRefetch: false,
                })
              );
              dispatch(
                (api as unknown as BaseApiWithUtil).util.updateQueryData(
                  "getAll",
                  listArgs,
                  (draft: RtkDraftList) => {
                    const targetList = Array.isArray(draft)
                      ? draft
                      : draft.payload;
                    if (targetList) {
                      const item = createdItem as RtkDraftItem;
                      targetList.push((item?.payload as RtkDraftItem) ?? item);
                    }
                  }
                ) as never
              );
            } catch {
              // Ignore empty block
            }
          },
        });
      }

      // --- PUT / PATCH (Update - No Refetch) ---
      if (options.put || options.patch) {
        const methodKey = options.put ? "put" : "patch";
        const methodFn = options.put || options.patch;

        endpoints[methodKey] = builder.mutation({
          query: ({ id, body }) => ({
            run: (apiInstanceRef: TApi) =>
              methodFn!(apiInstanceRef, { id, body }),
          }),

          async onQueryStarted({ id, listArgs }, { dispatch, queryFulfilled }) {
            try {
              const { data: updatedItem } = await queryFulfilled;

              dispatch(
                (api as unknown as BaseApiWithUtil).util.updateQueryData(
                  "getAll",
                  listArgs,
                  (draft: RtkDraftList) => {
                    const targetList = Array.isArray(draft)
                      ? draft
                      : draft.payload;
                    if (targetList) {
                      const item = updatedItem as RtkDraftItem;
                      const index = targetList.findIndex(
                        (i: RtkDraftItem) => i.id === id
                      );
                      if (index !== -1) {
                        targetList[index] = (item?.payload as RtkDraftItem) ?? item;
                      }
                    }
                  }
                ) as never
              );
            } catch {
              // Ignore empty block
            }
          },
        });
      }

      // --- DELETE (Remove - No Refetch) ---
      if (options.delete) {
        endpoints.delete = builder.mutation({
          query: ({ id }) => ({
            run: (apiInstanceRef: TApi) =>
              options.delete!(apiInstanceRef, { id }),
          }),

          async onQueryStarted({ id, listArgs }, { dispatch, queryFulfilled }) {
            try {
              await queryFulfilled;

              dispatch(
                (api as unknown as BaseApiWithUtil).util.updateQueryData(
                  "getAll",
                  listArgs,
                  (draft: RtkDraftList) => {
                    if (Array.isArray(draft)) {
                      return draft.filter((item: RtkDraftItem) => item.id !== id);
                    } else if (draft.payload) {
                      draft.payload = draft.payload.filter(
                        (item: RtkDraftItem) => item.id !== id
                      );
                    }
                  }
                ) as never
              );
            } catch {
              // Ignore empty block
            }
          },
        });
      }

      return endpoints;
    },
  });

  return injectedApi;
}
