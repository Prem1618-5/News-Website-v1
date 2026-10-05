import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

const inputClass =
  "h-11 w-full rounded-lg border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-faint transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-bad aria-[invalid=true]:focus:ring-bad/20";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  revealable?: boolean;
  children?: ReactNode;
}

export const AuthField = forwardRef<HTMLInputElement, Props>(function AuthField(
  { id, label, optional, hint, error, revealable, children, type = "text", className, ...input },
  ref,
) {
  const [reveal, setReveal] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium">
        <span>{label}</span>
        {optional && <span className="text-[12px] font-normal text-faint">Optional</span>}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={revealable && reveal ? "text" : type}
          className={clsx(inputClass, revealable && "pr-11")}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...input}
        />
        {revealable && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            aria-controls={id}
            className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-wash hover:text-ink"
          >
            {reveal ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-bad">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {children}
      {hint && (
        <p id={hintId} className="mt-1.5 text-[12px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
});
