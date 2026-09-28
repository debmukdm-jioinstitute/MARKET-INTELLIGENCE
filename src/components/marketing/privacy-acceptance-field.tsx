import Link from "next/link";
import type { RefObject } from "react";

const checkboxClass =
  "mt-0.5 size-4 shrink-0 rounded border-border text-primary focus:ring-2 focus:ring-primary/20";

export function PrivacyAcceptanceField({
  checked,
  onChange,
  id = "accept-privacy",
  inputRef,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-muted-foreground">
      <input
        ref={inputRef}
        id={id}
        name="acceptPrivacy"
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={checkboxClass}
      />
      <span>
        I acknowledge the{" "}
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Terms of Service
        </Link>
        . This is required to create an account and does not opt you in to marketing email.
      </span>
    </label>
  );
}
