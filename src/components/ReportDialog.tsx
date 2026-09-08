import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { REPORT_REASONS, logEvent } from "@/lib/aisha";

export function ReportDialog({
  open,
  onOpenChange,
  conversationId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId?: string | null;
}) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You are signed out.");
      const { error } = await supabase.from("reports").insert({
        reporter_id: auth.user.id,
        conversation_id: conversationId ?? null,
        reason,
        description: description || null,
      });
      if (error) throw error;
      await logEvent("report_created");
      toast.success("Thank you. Your report has been sent to the Hello Aisha team.");
      setDescription("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't send that report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>
            Our team reviews every report. If you are in immediate danger, contact local emergency
            services.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={setReason} className="space-y-1">
          {REPORT_REASONS.map((r) => (
            <div key={r} className="flex min-h-11 items-center gap-3">
              <RadioGroupItem value={r} id={`reason-${r}`} />
              <Label htmlFor={`reason-${r}`} className="text-sm font-normal">
                {r}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Anything you'd like to add (optional)"
          className="min-h-24 rounded-xl"
        />

        <DialogFooter>
          <Button className="min-h-12 w-full rounded-full" onClick={submit} disabled={busy}>
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
