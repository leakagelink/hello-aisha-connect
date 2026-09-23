import { supabase } from "@/integrations/supabase/client";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

/**
 * Uploads a chat attachment into the private media bucket.
 * Storage policies reject the upload unless the sender is in the conversation
 * and is allowed to share that media kind (admin, or an active unlock).
 */
export async function uploadChatMedia(
  conversationId: string,
  userId: string,
  kind: "image" | "video",
  file: File,
): Promise<{ path: string; mime: string }> {
  const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > limit) {
    throw new Error(
      kind === "image" ? "Please choose a photo under 8 MB." : "Please choose a video under 40 MB.",
    );
  }
  const ext = (file.name.split(".").pop() ?? (kind === "image" ? "jpg" : "mp4"))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);
  const path = `${conversationId}/${kind}/${userId}-${crypto.randomUUID()}.${ext || "bin"}`;

  const { error } = await supabase.storage.from("chat-media").upload(path, file, {
    contentType: file.type || (kind === "image" ? "image/jpeg" : "video/mp4"),
    upsert: false,
  });
  if (error) {
    throw new Error(
      error.message.toLowerCase().includes("row-level security")
        ? "This attachment isn't unlocked on your account."
        : "We couldn't upload that file. Please try again.",
    );
  }
  return { path, mime: file.type || (kind === "image" ? "image/jpeg" : "video/mp4") };
}
