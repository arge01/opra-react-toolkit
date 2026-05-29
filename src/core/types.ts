export type ModelNames = string;

export type ServiceApiError = {
  issues?: Array<{ message: string }>;
  message?: string;
  status?: number;
  statusText?: string;
};

export interface OpraResponse<E = object | string> {
  ok?: boolean;
  statusText?: string;
  body?: {
    errors?: E;
    payload?: unknown;
  };
}

export interface Model<T, E = unknown> {
  pending: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isFetching?: boolean;
  isError?: boolean;
  result?: T;
  error?: E | null;
}

export interface ServiceType<M, A, P = unknown> {
  name: string;
  data: M;
  params?: P;
  call?: Response;
  actions?: A;
}

export interface Response<T = unknown> {
  call: () => Promise<T>;
  isLoading: boolean;
  error: ServiceApiError | unknown;
  data: T;
}

export interface OpraRunner {
  getResponse: () => Promise<unknown>;
}

export interface QueryResult<T> {
  result: T;
  totalMatches: number;
}

type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | unknown[];

export type IsObject<T> = T extends Primitive ? false : true;

export type Safe<T> = NonNullable<T>;

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type LeafPaths<T, Depth extends number = 3> = [Depth] extends [never]
  ? never
  : {
      [K in keyof Safe<T> & string]: IsObject<Safe<T>[K]> extends false
        ? K
        :
            | `${K}.${LeafPaths<Safe<T>[K], Prev[Depth]>}`
            | `+${K}.${LeafPaths<Safe<T>[K], Prev[Depth]>}`;
    }[keyof Safe<T> & string];

export type NonEmptyStrictProjection<T> = [
  LeafPaths<T, 5>,
  ...LeafPaths<T, 5>[],
];

export type ExtractModel<T> = T extends Array<infer U> ? U : T;

export type ExtractApi<A> = A extends { run: (api: infer Api) => unknown }
  ? Api
  : unknown;

export type InjectStrictProjectionArgs2<TMethod, TModel> = TMethod extends (
  arg1: infer A,
  params?: infer P,
  ...args: infer Rest
) => infer R
  ? P extends { projection?: string[] | unknown }
    ? (
        arg1: A,
        params: Omit<P, "projection"> & {
          projection: NonEmptyStrictProjection<TModel>;
        },
        ...args: Rest
      ) => R
    : TMethod
  : TMethod;

export type InjectStrictProjection<TMethod, TModel> = TMethod extends (
  p1: infer P1,
  ...rest1: infer Rest1
) => infer R
  ? "projection" extends keyof NonNullable<P1>
    ? (
        p1: Omit<NonNullable<P1>, "projection"> & {
          projection: NonEmptyStrictProjection<TModel>;
        },
        ...args: Rest1
      ) => R
    : TMethod extends (
          p1: infer _P1,
          p2: infer P2,
          ...rest2: infer Rest2
        ) => infer _R
      ? "projection" extends keyof NonNullable<P2>
        ? (
            p1: P1,
            p2: Omit<NonNullable<P2>, "projection"> & {
              projection: NonEmptyStrictProjection<TModel>;
            },
            ...args: Rest2
          ) => R
        : TMethod
      : TMethod
  : TMethod;

export type StrictController<TController, TModel> = {
  [K in keyof TController]: InjectStrictProjection<TController[K], TModel>;
};

export type StrictApi<TApi, TModel> = {
  [K in keyof TApi]: StrictController<TApi[K], TModel>;
};

export type ServiceOpraBody<T> = {
  totalMatches?: number;
  payload?: T;
  errors?: ServiceApiError;
};

export type ServiceOpraPayload<T> = {
  ok: boolean;
  hasBody: boolean;
  status: number;
  statusText?: string;
  body?: ServiceOpraBody<T> | T | unknown;
};
