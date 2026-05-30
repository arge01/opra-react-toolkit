export type OpraQueryFn<TApi, TArgs = unknown> = (
  api: TApi,
  args: TArgs
) => unknown;

export interface OpraServiceOptions<TApi> {
  reducerPath: string;
  tagTypes?: string[];

  getAll?: OpraQueryFn<TApi>;
  get?: OpraQueryFn<TApi>;
  post?: OpraQueryFn<TApi>;
  put?: OpraQueryFn<TApi>;
  patch?: OpraQueryFn<TApi>;
  delete?: OpraQueryFn<TApi>;
}
