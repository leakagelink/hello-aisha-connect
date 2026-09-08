import avatar from "@/assets/aisha-avatar.jpg";
import logo from "@/assets/hello-aisha-logo.png";
import { cn } from "@/lib/utils";

export function AishaAvatar({ className }: { className?: string }) {
  return (
    <img
      src={avatar}
      alt="Aisha"
      width={512}
      height={512}
      loading="lazy"
      className={cn("rounded-full object-cover shadow-soft", className)}
    />
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="Hello Aisha"
      width={512}
      height={512}
      className={cn("object-contain", className)}
    />
  );
}
