// src/core/OpraProvider.tsx
import React, { createContext, useContext } from "react";

export interface OpraContextType<TApi> {
    /** OpraHttpClient ile sarmalanmış, projeye özel üretilen API Sınıfı (Örn: WebHISApi) */
    apiInstance: TApi;
    /** 401, 403 veya 500 gibi hatalarda projenin kendi UI/Router mantığını işleteceği callback */
    onAuthError?: (error: unknown) => void;
}

// Başlangıçta null olduğu için tipi TApi | null olarak ayarlıyoruz
const OpraContext = createContext<OpraContextType<unknown> | null>(null);

export const OpraToolkitProvider = <TApi,>({
    children,
    config,
}: {
    children: React.ReactNode;
    config: OpraContextType<TApi>;
}) => {
    // Context değerini as unknown ile güvenli bir şekilde aktarıyoruz (Provider tipiyle uyuşması için)
    return (
        <OpraContext.Provider value= { config as unknown as OpraContextType<unknown>} >
        { children }
        </OpraContext.Provider>
  );
};

// Hook'u kullanan kişi kendi API tipini verecek: useOpraConfig<WebHISApi>()
export const useOpraConfig = <TApi,>(): OpraContextType<TApi> => {
    const context = useContext(OpraContext);
    if (!context) {
        throw new Error("useOpraConfig must be used within an OpraToolkitProvider");
    }
    return context as OpraContextType<TApi>;
};