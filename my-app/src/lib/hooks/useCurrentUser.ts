'use client';

import useSWR from 'swr';

/** Shape returned by GET /api/auth/me. */
export interface UserData {
    userId: string;
    email: string;
    username: string;
    accountType: string;
    permissions: Record<string, unknown> | null;
    permissionsUpdatedAt: string | null;
    createdAt: string;
    updatedAt: string;
    externalAccount: {
        username: string;
        email: string;
        accountType: string;
        permissions: {
            QC?: boolean;
            Upload?: boolean;
            ViewAssignments?: boolean;
        };
    } | null;
    isExternalVerified: boolean;
}

export const AUTH_ME_KEY = '/api/auth/me';

/** Thrown by the fetcher on a non-2xx response so SWR surfaces it as `error`. */
export class AuthError extends Error {
    status: number;
    constructor(status: number) {
        super(`auth request failed: ${status}`);
        this.name = 'AuthError';
        this.status = status;
    }
}

const fetcher = async (url: string): Promise<UserData> => {
    const res = await fetch(url);
    if (!res.ok) throw new AuthError(res.status);
    return res.json();
};

/**
 * Shared current-user hook. All consumers call this with the same SWR key, so
 * the simultaneous mounts on a page collapse into a single `/api/auth/me`
 * request and a single cached result.
 *
 * - `dedupingInterval` collapses the near-simultaneous mounts (and reuses the
 *   cache across navigation within the window).
 * - `revalidateOnFocus` is off: the route's external sync is expensive, so we
 *   don't want a tab-focus to trigger a refetch.
 * - `shouldRetryOnError` is off: a 401 means "not authenticated"; gatekeepers
 *   redirect on `error` rather than retry-looping.
 */
export function useCurrentUser() {
    const { data, error, isLoading, mutate } = useSWR<UserData>(AUTH_ME_KEY, fetcher, {
        dedupingInterval: 60_000,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
    });

    return { user: data ?? null, isLoading, error: error as AuthError | undefined, mutate };
}
