import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves signed URLs for cover images stored in the private `covers` bucket.
 * Pass the storage paths (`cover_path` on works) and receive a map path→url.
 */
export function useCoverUrls(paths: Array<string | null | undefined>) {
  const clean = Array.from(new Set(paths.filter((p): p is string => !!p))).sort();
  const key = clean.join("|");
  return useQuery({
    queryKey: ["cover-urls", key],
    enabled: clean.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const map: Record<string, string> = {};
      if (!clean.length) return map;
      const { data, error } = await supabase.storage
        .from("covers")
        .createSignedUrls(clean, 60 * 60);
      if (error) throw error;
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      }
      return map;
    },
  });
}

export function useCoverUrl(path: string | null | undefined) {
  const { data } = useCoverUrls([path ?? null]);
  return path ? data?.[path] : undefined;
}