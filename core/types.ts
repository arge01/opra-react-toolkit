export interface ApiModel<T, E = object | string> {
    result?: T;
    isLoading: boolean;
    isFetching: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: E | null;
    pending: boolean;
}

export interface OpraResponse<T, E = object | string> {
    ok: boolean;
    hasBody: boolean;
    status: number;
    body: {
        payload?: T;
        totalMatches?: number;
        errors?: E;
    };
    statusText?: string;
}

export interface ErrorType {
    message?: string;
    issues?: {
        message: string;
    }[];
}

export interface QueryResult<T> {
    result: T;
    totalMatches: number;
}

export interface OpraRunner {
    getResponse: () => Promise<unknown>;
}