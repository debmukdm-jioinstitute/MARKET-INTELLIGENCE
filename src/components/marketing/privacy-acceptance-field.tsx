import Link from "next/link";

const checkboxClass =
  "mt-0.5 size-4 shrink-0 rounded border-border text-primary focus:ring-2 focus:ring-primary/20";

export function PrivacyAcceptanceField({
  checked,
  onChange,
  id = "accept-privacy",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-muted-foreground">
      <input
        id={id}
        name="acceptPrivacy"
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={checkboxClass}
      />
      <span>
        I have read and agree to the{" "}
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  );
}
