import { type api } from "@api"; // Kendi jenerik API tipin
import { OpraRunner } from "../core/types";
// Not: OpraRunner, ApiModel gibi ortak tipleri "core" altından import ettiğini varsayıyoruz.

/**
 * RTK (Redux Toolkit) için Standart GET İstekleri Tipi
 */
export type RtkApiQueryProps<_T, _E> = {
    /**
     * Redux Store'da (Slice içinde) bu isteğin sonucunun hangi anahtar altında tutulacağını belirler.
     * TanStack'teki mantığın aynısıdır; hook veya thunk içinde serialize edilip state key'ine dönüştürülür.
     * Örn: ["hasta", id, "detay"] -> "hasta_123_detay"
     */
    queryKey: unknown[];

    /**
     * Redux Thunk için benzersiz eylem adı (Action Type).
     * Redux DevTools üzerinde izlenebilirliği sağlamak için RTK mimarisinde kritiktir.
     * Örn: 'hastaKayit/fetchDetay'
     */
    actionName: string;

    connection?: (
        fn: (api: api) => Promise<unknown>,
        deps: string[]
    ) => { call: () => Promise<unknown> };

    run: (p: api) => OpraRunner | Promise<unknown>;

    /**
     * RTK'nın standart Thunk yapısında TanStack gibi otomatik bir `staleTime` yoktur.
     * Eğer false ise ve veri Redux state'inde zaten varsa istek atılmaz.
     * Eğer true ise mevcut state'i ezip (override) yeni istek atar.
     * @default false
     */
    forceRefetch?: boolean;
};

/**
 * RTK (Redux Toolkit) için Mutasyon (POST, PUT, DELETE) İstekleri Tipi
 */
export type RtkApiMutationProps<_T, V, _E> = {
    /**
     * Mutasyonlar genellikle Redux state'inde kalıcı bir cache yaratmaz,
     * ancak loading/error state'lerini izlemek için actionName zorunludur.
     * Örn: 'hastaKayit/updateStatus'
     */
    actionName: string;

    /** * DİKKAT: Mutasyonlarda veriler render anında değil, dispatch anında gelir.
     */
    run: (api: api, variables: V) => OpraRunner | Promise<unknown>;

    connection?: (
        fn: (api: api) => Promise<unknown>,
        deps: string[]
    ) => { call: () => Promise<unknown> };
};

/**
 * RTK (Redux Toolkit) için Sayfalamalı (Paginated) GET İstekleri Tipi
 */
export type RtkApiPaginatedQueryProps<T, E> = Omit<RtkApiQueryProps<T, E>, "run"> & {
    pagination: { skip: number; limit: number };

    run: (
        api: api,
        pagingParams: { skip?: number; limit: number; count: boolean }
    ) => OpraRunner | Promise<unknown>;
};