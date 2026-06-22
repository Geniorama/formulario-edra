import { Check } from "lucide-react";

export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="flex items-center">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? "bg-edra text-white"
                    : done
                      ? "bg-edra/15 text-edra"
                      : "bg-edra-grey/15 text-edra-grey"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={`hidden text-sm font-medium sm:block ${
                  active || done ? "text-edra-ink" : "text-edra-grey"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <span
                className={`mx-3 h-px flex-1 ${done ? "bg-edra" : "bg-edra-grey/20"}`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
