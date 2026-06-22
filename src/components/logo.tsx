import Image from "next/image";

export function Logo({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo-edra-color.png"
      alt="Joyería Edra"
      width={300}
      height={200}
      priority={priority}
      className={`w-auto object-contain ${className}`}
    />
  );
}
