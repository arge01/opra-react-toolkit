import { type api } from "@api";

export type ApiQueryProps<_T, _E> = {
  queryKey: unknown[];

  connection?: (
    fn: (api: api) => Promise<unknown>,
    deps: string[]
  ) => { call: () => Promise<unknown> };

  run: (p: api) => OpraRunner | Promise<unknown>;
  enabled?: boolean;

  /**
   * WEBHIS sunucu yükünü azaltmak için varsayılan olarak KAPALIDIR (false).
   * Özel bir durum yoksa override etmeyin.
   * @default false
   */
  retry?: boolean | number;

  /**
   * Verinin ne kadar süre "Taze" (Fresh) kabul edileceğini milisaniye cinsinden belirler.
   * DİKKAT (LLM RULE): WEBHIS mimarisinde gereksiz network (ağ) trafiğini ve UI titremesini (flicker)
   * önlemek amacıyla bu değerin varsayılanı KESİNLİKLE `Infinity` dir.
   * Özel bir gereksinim yoksa bu değeri override etmeyin.
   * * @default Infinity
   * @type {number}
   */
  staleTime?: number;

  /**
   * Kullanıcı başka sekmeden uygulamaya döndüğünde verinin yenilenip yenilenmeyeceği.
   * @default false
   */
  refetchOnWindowFocus?: boolean;

  /**
   * Component ekrana her çizildiğinde (mount) verinin yenilenip yenilenmeyeceği.
   * @default false
   */
  refetchOnMount?: boolean;
};

export type ApiMutationProps<_T, V, _E> = {
  /** * DİKKAT: Mutasyonlarda veriler render anında değil, tetiklenme (execute) anında gelir.
   * Örn: run: (api, vars) => api.$auth.signin(vars)
   */
  run: (api: api, variables: V) => OpraRunner | Promise<unknown>;

  connection?: (
    fn: (api: api) => Promise<unknown>,
    deps: string[]
  ) => { call: () => Promise<unknown> };

  /** @default false */
  retry?: boolean | number;
};

export type ApiPaginatedQueryProps<T, E> = Omit<ApiQueryProps<T, E>, "run"> & {
  pagination: { skip: number; limit: number };
  run: (
    api: api,
    pagingParams: { skip?: number; limit: number; count: boolean }
  ) => OpraRunner | Promise<unknown>;
};
