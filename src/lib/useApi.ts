// useApi.ts — Hooks React para o cliente API
import { useState, useEffect, useCallback, useRef } from "react";

export function useQuery<T>(
  fetcher: () => Promise<T>,
  defaultValue: T,
  deps: any[] = []
) {
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mounted.current) {
        setData(result ?? defaultValue);
      }
    } catch (e: any) {
      if (mounted.current) {
        setError(e.message);
        setData(defaultValue);
      }
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    refetch();
    return () => { mounted.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch]);

  return { data, isLoading, error, refetch };
}

export function useMutation<TInput, TOutput>(
  mutator: (input: TInput) => Promise<TOutput>
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (input: TInput): Promise<TOutput> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await mutator(input);
      return result;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { mutate, mutateAsync: mutate, isLoading, error };
}
