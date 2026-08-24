"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  /** Absolute URL — built server-side by shareLink() so the invite code is on it. */
  url: string;
  title: string;
  /** The sentence that rides along in a WhatsApp/Signal share sheet. */
  text?: string;
  /** Omit for an icon-only button. */
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "sm" | "default" | "lg" | "icon" | "icon-lg";
  className?: string;
};

/**
 * One button, two worlds: on a phone this opens the native share sheet (where
 * the link is unfurled into a preview card by whatever app receives it), on a
 * desktop it copies the link. Both paths hand over the same URL, so the OG
 * image does the selling either way.
 */
export function ShareButton({
  url,
  title,
  text,
  label,
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Link gekopieerd");
    } catch {
      toast.error("Kopiëren lukte niet — kopieer de link uit de adresbalk.");
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // Dismissing the sheet is not a failure — only fall back to copying
        // when the share itself was refused (desktop browsers that expose
        // navigator.share without a target to share to).
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await copy();
  }

  return (
    <Button
      type="button"
      variant={variant}
      // Icon-only needs a target you can actually hit with a thumb.
      size={label ? size : size.startsWith("icon") ? size : "icon-lg"}
      onClick={share}
      aria-label={label ? undefined : `${title} delen`}
      className={cn(className)}
    >
      {copied ? <Check className="text-profit" /> : <Share2 />}
      {label}
    </Button>
  );
}
