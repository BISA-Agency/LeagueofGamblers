import Image from "next/image";
import { GeneratedAvatar } from "./generated-avatar";

export function UserAvatar({
  username,
  avatarUrl,
  size = 40,
  className,
}: {
  username: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`Avatar van ${username}`}
        width={size}
        height={size}
        className={`rounded-[10px] object-cover ${className ?? ""}`}
      />
    );
  }

  return <GeneratedAvatar username={username} size={size} className={className} />;
}
