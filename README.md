# @opra-frontend/react-service-toolkit

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

### A) Basic Fetch Hooks (No Dependency)

If you don't want to use any state-management library, the toolkit exports basic, fully typed React hooks using pure `useState` and `useEffect`. 

```typescript
// src/hooks/useOpraFetch.ts
import { createOpraFetchHooks } from "@opra-frontend/react-service-toolkit/fetch";
import type { api } from "../api";

export const {
  useApiQuery,
  useTriggerApiQuery,
  useApiMutation
} = createOpraFetchHooks<typeof api>();
```

**Usage:**

```tsx
import { useApiQuery, useTriggerApiQuery, useApiMutation } from "../hooks/useOpraFetch";

export function BasicComponent() {
  // Auto-fetches on component mount
  const [state, refetch, totalMatches] = useApiQuery({
    run: (api) => api.$users.getProfile({ projection: ["id", "name"] })
  });

  // Lazy execution, trigger manually
  const [lazyState, triggerFetch] = useTriggerApiQuery({
    run: (api) => api.$users.getProfile({ projection: ["id", "name"] })
  });

  const [mutationState, executePost] = useApiMutation();

  const handleSubmit = () => {
    executePost(
      { name: "John" }, 
      (api, vars) => api.$users.create(vars)
    ).then((res) => console.log("Created", res));
  };

  if (state.isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <p>{state.result?.name}</p>
      <button onClick={() => triggerFetch()}>Load Lazy Data</button>
      <button onClick={handleSubmit} disabled={mutationState.isLoading}>
        Update
      </button>
    </div>
  );
}
```

### B) Using React Query

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

### C) Using Redux Toolkit (RTK) Query

If your team uses Redux Toolkit, we provide a wrapper around RTK Query's `createApi` that allows optimistic/pessimistic cache modification *without refetching*. It automatically modifies the cache using `api.util.updateQueryData`.

```typescript
// src/services/patientService.ts
import { createOpraService } from "@opra-frontend/react-service-toolkit/rtk";
import { api } from "../api/instance"; 

export const patientService = createOpraService(api, {
  reducerPath: 'patientApi',
  tagTypes: ['Patient'],
  
  getAll: (apiInstance, params: { skip: number; limit: number }) => 
    apiInstance.$patients.findMany(params),

  post: (apiInstance, body: unknown) => 
    apiInstance.$patients.create(body),

  delete: (apiInstance, { id }: { id: string }) => 
    apiInstance.$patients.delete({ id }),
});

export const {
  useGetAllQuery,
  usePostMutation,
  useDeleteMutation
} = patientService;
```

**Register in your Store:**

```typescript
import { configureStore } from '@reduxjs/toolkit';
import { patientService } from '../services/patientService';

export const store = configureStore({
  reducer: {
    [patientService.reducerPath]: patientService.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(patientService.middleware),
});
```

**Usage (Mutations update the cache directly, NO refetching!):**

```tsx
import { 
  useGetAllQuery, 
  usePostMutation, 
  useDeleteMutation 
} from '../services/patientService';

export function PatientList() {
  const listParams = { skip: 0, limit: 10 };
  const { data, isLoading } = useGetAllQuery(listParams);

  const [createPatient] = usePostMutation();
  const [deletePatient] = useDeleteMutation();

  const handleAdd = async () => {
    // Note: passing listArgs explicitly tells the cache which query to update!
    await createPatient({ 
      body: { firstName: "New", lastName: "Patient" },
      listArgs: listParams 
    }).unwrap();
  };

  const handleDelete = async (id: string) => {
    await deletePatient({ 
      id, 
      listArgs: listParams 
    }).unwrap();
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {data?.payload?.map((patient: any) => (
        <li key={patient.id}>
          {patient.firstName} 
          <button onClick={() => handleDelete(patient.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

## Features
- **UI Agnostic**: No `ui library`, `react-i18next` or arbitrary UI components forcing architectural constraints.
- **Hook Factory Pattern**: The `createOpraHooks<T>()` and `createOpraRtkHooks<T>()` guarantee robust type-inference for nested API endpoints without repeating types.
- **Production Ready**: Built with `tsup` yielding optimal ESM and CJS modules.