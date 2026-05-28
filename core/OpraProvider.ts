// src/core/OpraProvider.tsx
import React, { createContext, useContext } from "react";

export interface OpraContextType<TApi = any> {
    /** OpraHttpClient ile sarmalanmış, projeye özel üretilen API Sınıfı (Örn: WebHISApi) */
    apiInstance: TApi;
    /** 401, 403 veya 500 gibi hatalarda projenin kendi UI/Router mantığını işleteceği callback */
    onAuthError?: (error: any) => void;
}

const OpraContext = createContext<OpraContextType | null>(null);

export const OpraToolkitProvider = ({
    children,
    config,
}: {
    children: React.ReactNode;
    config: OpraContextType;
}) => {
    return <OpraContext.Provider value={ config }> { children } </OpraContext.Provider>;
};

export const useOpraConfig = <TApi,>() => {
    const context = useContext(OpraContext);
    if (!context) {
        throw new Error("useOpraConfig must be used within an OpraToolkitProvider");
    }
    return context as OpraContextType<TApi>;
};