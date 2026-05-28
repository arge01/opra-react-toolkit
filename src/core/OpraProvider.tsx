import React, { createContext, useContext } from "react";

export interface OpraContextType<TApi> {
  /** The generated API instance tailored for the specific project */
  apiInstance: TApi;
  /** Global callback for authentication errors (e.g., 401, 403) */
  onAuthError?: (error: unknown) => void;
  /** Global callback for handling general errors (e.g., to display toast messages) */
  onError?: (error: unknown) => void;
}

const OpraContext = createContext<OpraContextType<unknown> | null>(null);

export const OpraToolkitProvider = <TApi,>({
  children,
  config,
}: {
  children: React.ReactNode;
  config: OpraContextType<TApi>;
}) => {
  return (
    <OpraContext.Provider value={config as unknown as OpraContextType<unknown>}>
      {children}
    </OpraContext.Provider>
  );
};

export const useOpraConfig = <TApi,>(): OpraContextType<TApi> => {
  const context = useContext(OpraContext);
  if (!context) {
    throw new Error("useOpraConfig must be used within an OpraToolkitProvider");
  }
  return context as OpraContextType<TApi>;
};
