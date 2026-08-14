import { useState } from "react";
import { forgotPasswordSchema } from "../../schemas/auth";
import { Field } from "../ui/Field";
import { ErrorState } from "../ui/ErrorState";

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>;
  isSubmitting: boolean;
  isDisabled?: boolean;
}

export const ForgotPasswordForm = ({
  onSubmit,
  isSubmitting,
  isDisabled = false,
}: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Ungültige Eingabe.");
      return;
    }

    try {
      await onSubmit(result.data.email);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Anfrage fehlgeschlagen.",
      );
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Field label="E-Mail" htmlFor="forgot-password-email">
        <input
          id="forgot-password-email"
          className="field"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="max@schule.at"
        />
      </Field>
      {error ? <ErrorState message={error} /> : null}
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={isSubmitting || isDisabled}
      >
        {isDisabled ? "Konfiguration fehlt" : isSubmitting ? "Wird gesendet..." : "Link anfordern"}
      </button>
    </form>
  );
};
