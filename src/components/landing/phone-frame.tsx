import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Device bezel around a real app screenshot. Pure CSS — no mockup images to
 * download, and it scales with the container instead of a fixed pixel size.
 */
export function PhoneFrame({
  src,
  alt,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[280px] rounded-[2.2rem] border border-white/12 bg-neutral-900 p-2 shadow-2xl shadow-black/60",
        className
      )}
    >
      {/* Speaker slit — small detail, but the frame reads as a phone with it. */}
      <div className="absolute left-1/2 top-3.5 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black/70" />
      {/* Fixed aspect ratio: swapping the image (showcase tabs) must not
          shift the layout while the next one decodes. */}
      <div className="relative aspect-[390/844] overflow-hidden rounded-[1.7rem] bg-background">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          // The frame never renders wider than ~280px, so telling the
          // optimiser "70vw" made it ship a needlessly large candidate.
          sizes="(max-width: 640px) 250px, 300px"
          className="object-cover object-top"
        />
      </div>
    </div>
  );
}
