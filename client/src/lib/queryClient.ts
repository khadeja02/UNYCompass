import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createServerApiUrl, createAIApiUrl } from "@/config/api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Check if token is expired or close to expiring
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;

    // Check if token expires within the next 5 minutes (300 seconds)
    return payload.exp < (currentTime + 300);
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true; // Assume expired if we can't parse it
  }
}

// RETRY_DELAYS for rate limiting and server errors
const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s

export async function apiRequest(
  method: string,
  endpoint: string, // Now expects endpoint, not full URL
  data?: unknown | undefined,
): Promise<Response> {
  // Get JWT token from localStorage
  const token = localStorage.getItem('token');

  // Check if token is expired before making request
  if (token && isTokenExpired(token)) {
    console.warn('🕒 Token is expired or expiring soon, clearing auth data');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('401: Token expired');
  }

  const headers: HeadersInit = {};

  // Add Content-Type for requests with data
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Determine which API to use based on endpoint
  const url = endpoint.includes('/chatbot/')
    ? createAIApiUrl(endpoint)    // Use AI backend for chatbot endpoints
    : createServerApiUrl(endpoint); // Use server backend for everything else

  console.log(`🔍 API Request: ${method} ${url}`, {
    hasToken: !!token,
    hasData: !!data
  });

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Keep this for any cookie-based endpoints
  });

  console.log(`📡 API Response: ${method} ${url} - ${res.status}`, {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText
  });

  // Handle auth errors by clearing auth data
  if (res.status === 401) {
    console.warn('🚨 401 Unauthorized - clearing auth data');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Trigger auth context update
    window.dispatchEvent(new Event('auth-logout'));

    // Check if this was a token expiry
    try {
      const errorData = await res.clone().json();
      if (errorData.code === 'TOKEN_EXPIRED') {
        console.log('🕒 Server confirmed token expiry');
      }
    } catch (e) {
      // Ignore JSON parsing errors
    }
  }

  // Handle 403 errors with better logging
  if (res.status === 403) {
    console.warn('🚨 403 Forbidden - possible token issue', {
      url,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 10) + '...' : 'none'
    });
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      // Get JWT token from localStorage
      const token = localStorage.getItem('token');

      // Check if token is expired before making request
      if (token && isTokenExpired(token)) {
        console.warn('🕒 Query token expired, clearing auth data');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-logout'));

        if (unauthorizedBehavior === "returnNull") {
          return null;
        } else {
          throw new Error('401: Token expired');
        }
      }

      const headers: HeadersInit = {};

      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Determine which API to use based on endpoint
      const endpoint = queryKey[0] as string;
      const url = endpoint.includes('/chatbot/')
        ? createAIApiUrl(endpoint)    // Use AI backend for chatbot endpoints
        : createServerApiUrl(endpoint); // Use server backend for everything else

      console.log(`🔍 Query Request: ${url}`, { hasToken: !!token });

      const res = await fetch(url, {
        headers,
        credentials: "include",
      });

      console.log(`📡 Query Response: ${url} - ${res.status}`, {
        ok: res.ok,
        status: res.status
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn('🚨 Query 401 - clearing auth and returning null');
        // Clear auth data on 401
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-logout'));
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => RETRY_DELAYS[attemptIndex] || 4000,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.message?.includes('401') || error?.message?.includes('403')) {
          return false;
        }
        // Retry once for other errors
        return failureCount < 1;
      },
      retryDelay: 1000,
    },
  },
});