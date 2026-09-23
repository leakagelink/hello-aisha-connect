import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

const EMOJIS = [
  "🙂","😊","😄","😉","🤗","🥰","😌","🙃",
  "😔","😢","😭","😟","😩","😴","😅","😇",
  "❤️","💜","💛","✨","🌸","🌙","☀️","🍵",
  "👍","🙏","👋","💪","🤝","🎉","🌈","⭐",
];

export function EmojiPicker({
  onSelect,
  disabled,
}: {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Send an emoji"
          disabled={disabled}
          className="size-11 shrink-0 rounded-full text-muted-foreground"
        >
          <Smile className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 rounded-2xl p-2">
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Send ${emoji}`}
              onClick={() => onSelect(emoji)}
              className="rounded-lg p-1 text-xl transition hover:bg-secondary"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
