export function AuthCard({
  title,
  subtitle,
  children,
  maxWidth = "max-w-md",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 py-10">
      <div className={`w-full ${maxWidth}`}>
        <div className="rounded-3xl bg-white p-8 shadow-[0_10px_40px_rgba(20,150,166,0.10)] sm:p-10">
          <h1 className="text-center text-2xl font-semibold text-edra-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-center text-sm text-edra-grey">{subtitle}</p>
          ) : null}

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
