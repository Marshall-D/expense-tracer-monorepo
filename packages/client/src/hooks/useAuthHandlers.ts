// packages/client/src/hooks/useAuthHandlers.ts

/**
 * useAuthHandlers
 *
 * - Validates input fields locally (using lib/validators/auth) before calling server.
 *
 * Behaviour:
 *  - on validation failure: set inline formError, show toast (long), focus relevant field
 *  - on server failure: set inline formError, show toast, focus first field
 *
 */

import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "./useLogin";
import { useRegister } from "./useRegister";
import { ROUTES } from "@/utils";
import { validateEmail, validatePassword, validateName, t } from "@/lib";

type LoginFormShape = {
  email: string;
  password: string;
};

type RegisterFormShape = {
  name: string;
  email: string;
  password: string;
};

export function useLoginHandler() {
  const navigate = useNavigate();
  const mutation = useLogin();
  const { mutateAsync } = mutation;
  const isLoading = mutation.status === "pending";
  const [formError, setFormError] = useState<string | null>(null);

  // safe DOM focus helper — defensive for SSR and non-existent ids
  const focusField = useCallback((id: string) => {
    try {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select?.();
      }
    } catch {}
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setFormError(null);

      const form = new FormData(e.currentTarget);
      const email = String(form.get("email") || "").trim();
      const password = String(form.get("password") || "");

      // client-side validation
      const emailV = validateEmail(email);
      if (!emailV.ok) {
        setFormError(emailV.error);
        t.error(emailV.error, { duration: 8000 });
        focusField("email");
        return;
      }

      const passV = validatePassword(password);
      if (!passV.ok) {
        setFormError(passV.error);
        t.error(passV.error, { duration: 8000 });
        focusField("password");
        return;
      }

      try {
        await mutateAsync({ email, password } as LoginFormShape);
        navigate(ROUTES.DASHBOARD);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Login failed";
        setFormError(msg);
        t.error(msg, { duration: 8000 });
        focusField("email");
      }
    },
    [mutateAsync, navigate, focusField]
  );

  return {
    handleSubmit,
    isLoading,
    formError,
    focusField,
  };
}

export function useRegisterHandler() {
  const navigate = useNavigate();
  const mutation = useRegister();
  const { mutateAsync } = mutation;
  const isLoading = mutation.status === "pending";
  const [formError, setFormError] = useState<string | null>(null);

  const focusField = useCallback((id: string) => {
    try {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select?.();
      }
    } catch {}
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setFormError(null);

      const form = new FormData(e.currentTarget);
      const name = String(form.get("name") || "").trim();
      const email = String(form.get("email") || "").trim();
      const password = String(form.get("password") || "");

      // client validation
      const nameV = validateName(name);
      if (!nameV.ok) {
        setFormError(nameV.error);
        t.error(nameV.error, { duration: 8000 });
        focusField("name");
        return;
      }

      const emailV = validateEmail(email);
      if (!emailV.ok) {
        setFormError(emailV.error);
        t.error(emailV.error, { duration: 8000 });
        focusField("email");
        return;
      }

      const passV = validatePassword(password);
      if (!passV.ok) {
        setFormError(passV.error);
        t.error(passV.error, { duration: 8000 });
        focusField("password");
        return;
      }

      try {
        await mutateAsync({ name, email, password } as RegisterFormShape);
        navigate(ROUTES.DASHBOARD);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message || err?.message || "Registration failed";
        setFormError(msg);
        t.error(msg, { duration: 8000 });
        focusField("email");
      }
    },
    [mutateAsync, navigate, focusField]
  );

  return {
    handleSubmit,
    isLoading,
    formError,
    focusField,
  };
}
