# @opra/react-toolkit

A highly scalable, generic, and UI-agnostic React toolkit for consuming OPRA generated schemas. It natively supports both **TanStack React Query** and **Redux Toolkit (RTK)** through a unified, fully-typed hook factory pattern.

## Installation

Install the core toolkit along with your preferred state management library:

```bash
# Core toolkit
npm install @opra-frontend/react-service-toolkit

# For React Query users
npm install @tanstack/react-query

# For Redux Toolkit users
npm install @reduxjs/toolkit react-redux
```

## Initial Setup: Generating Your Schema

In your project, generate your API schema using the OPRA CLI. This creates a fully typed schema definition file.

```json
// package.json scripts
"scripts": {
  "import-api": "npx oprimp your-api-url/$schema src/api"
}
```

This will create an `api` type based on your OPRA backend.

## 1. Setting up the Provider

The library is entirely UI-agnostic. You manage your own authentication error handling, toasts, and UI layouts by passing global callbacks to the `OpraToolkitProvider`.

```tsx
// src/api/instance.ts
import { OpraHttpClient } from '@opra/client';
import { OpraTest } from './OpraTest';

export const baseInstance = new OpraHttpClient('your-api-url', {
  interceptors: [
    {
      intercept: (request, next) => {
        const token = localStorage.getItem('token');
        if (token) {
          request.headers = request.headers || new Headers();
          if (request.headers instanceof Headers) {
            request.headers.set('Authorization', `Bearer ${token}`);
          } else if (Array.isArray(request.headers)) {
            (request.headers as string[][]).push(['Authorization', `Bearer ${token}`]);
          } else {
            (request.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
          }
        }
        return next.handle(request);
      }
    }
  ]
});

export const api = new OpraTest(baseInstance);

// Export type for creating hooks
export type ApiType = typeof api;
```

```tsx
// src/App.tsx
import { OpraToolkitProvider } from "@opra-frontend/react-service-toolkit/core";
import { api } from "./api/instance"; // Your OPRA HttpClient setup
import { toast } from "react-hot-toast";

function App() {
  return (
    <OpraToolkitProvider 
      config={{
        apiInstance: api,
        onAuthError: () => {
          // e.g. Redirect to login on 401/403
          window.location.href = "/login";
        },
        onError: (err: any) => {
          // Global error toast handler
          toast.error(err.message || "An error occurred");
        }
      }}
    >
      <MyReactApp />
    </OpraToolkitProvider>
  );
}
```

## 2. Generating Typed Hooks

Instead of passing the API type parameter every time you fetch data, you generate custom hooks bound to your specific schema. 

### A) Using React Query

Create a file to export your specific hooks:

```typescript
// src/hooks/useOpra.ts
import { createOpraHooks } from "@opra/react-toolkit/react-query";
import type { api } from "../api"; // The generated OPRA schema

export const {
  useApiQuery,
  useApiMutation,
  useApiPaginatedQuery,
  useApiInfiniteQuery
} = createOpraHooks<api>();
```

**Usage:**

```tsx
import { useApiQuery } from "../hooks/useOpra";

export function UserProfile() {
  const [state, refetch] = useApiQuery({
    queryKey: ["user", "profile"],
    run: (api) => api.$users.getProfile({ projection: ["id", "name", "email"] })
  });

  if (state.isLoading) return <Spinner />;
  
  return <div>{state.result?.name}</div>;
}
```

### B) Using Redux Toolkit (RTK)

Similarly, if your team prefers Redux, you can generate RTK hooks. These hooks dispatch Redux actions (e.g. `pending`, `fulfilled`, `rejected`) so they show up in Redux DevTools, while returning familiar local states identical to React Query.

```typescript
// src/hooks/useOpraRtk.ts
import { createOpraRtkHooks } from "@opra/react-toolkit/rtk";
import type { api } from "../api";

export const {
  useRtkApiQuery,
  useRtkApiMutation,
  useRtkApiPaginatedQuery
} = createOpraRtkHooks<api>();
```

**Usage:**

```tsx
import { useRtkApiQuery } from "../hooks/useOpraRtk";

export function PatientList() {
  const [state, execute, totalMatches] = useRtkApiPaginatedQuery({
    actionName: "patients/fetchList", // Unique name for Redux Thunk tracking
    queryKey: ["patients", "list"],
    pagination: { skip: 0, limit: 10 },
    run: (api, pagingParams) => api.$patients.findMany({ ...pagingParams, projection: ["id"] })
  });

  return <div>Total: {totalMatches}</div>;
}
```

## Features
- **UI Agnostic**: No `antd`, `react-i18next` or arbitrary UI components forcing architectural constraints.
- **Hook Factory Pattern**: The `createOpraHooks<T>()` and `createOpraRtkHooks<T>()` guarantee robust type-inference for nested API endpoints without repeating types.
- **Production Ready**: Built with `tsup` yielding optimal ESM and CJS modules.