import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Renders a chat photo or video from the private media bucket via a signed link. */
export function ChatMedia({
  path,
  kind,
}: {
  path: string;
  kind: "image" | "video";
}) {
  const signed = useQuery({
    queryKey: ["chat-media", path],
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("chat-media")
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  if (signed.isLoading) {
    return <div className="h-40 w-52 animate-pulse rounded-2xl bg-muted" aria-label="Loading media" />;
  }
  if (signed.isError || !signed.data) {
    return <p className="text-xs text-muted-foreground">This attachment isn't available.</p>;
  }

  return kind === "image" ? (
    <img
      src={signed.data}
      alt="Shared photo"
      loading="lazy"
      className="max-h-72 w-full rounded-2xl object-cover"
    />
  ) : (
    <video src={signed.data} controls playsInline className="max-h-72 w-full rounded-2xl" />
  );
}
