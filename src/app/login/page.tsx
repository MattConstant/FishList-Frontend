"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { getDisplayErrorMessage } from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");   
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const u = username.trim();
    if (!u || !password) {
      setError(t("login.error.required"));
      return;
    }
    if (mode === "register" && password.length < 8) {
      setError(t("login.error.passwordMin"));
      return; 
    }
    setPending(true);
    try {
      if (mode === "login") {
        await login(u, password);
      } else {
        await register(u, password);
      }
      router.push("/profile");
    } catch (err) {
      setError(getDisplayErrorMessage(err, "Could not authenticate."));
    } finally {
      setPending(false);
    }
  }

  if (user) {
    return (
      <div
        className="relative flex flex-1 items-center justify-center px-6 py-16"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.6), rgba(15,23,42,0.6)), url('/Quetico_NorthernLights-scaled.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
          <p className="text-center text-zinc-600 dark:text-zinc-400">
            {t("login.signedInAs", { username: user.username })}
          </p>
          <Link
            href="/profile"
            className="mt-6 block text-center text-sm font-medium text-sky-700 underline-offset-4 hover:underline dark:text-sky-400"
          >
            {t("login.goProfile")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-1 items-center justify-center px-6 py-16"
      style={{
        backgroundImage:
          "linear-gradient(rgba(15,23,42,0.6), rgba(15,23,42,0.6)), url('/Quetico_NorthernLights-scaled.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {mode === "login" ? t("login.title.login") : t("login.title.register")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {t("login.desc")}
        </p>

        <div className="mt-6 flex rounded-xl border border-zinc-200 p-1 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={[
              "flex-1 rounded-lg py-2 text-sm font-medium transition",
              mode === "login"
                ? "bg-sky-600 text-white"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            ].join(" ")}
          >
            {t("login.mode.login")}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={[
              "flex-1 rounded-lg py-2 text-sm font-medium transition",
              mode === "register"
                ? "bg-sky-600 text-white"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            ].join(" ")}
          >
            {t("login.mode.register")}
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {t("login.username")}
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            placeholder="angler42"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {t("login.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
          {mode === "register" ? (
            <p className="mt-1 text-xs text-zinc-500">
              {t("login.passwordHint")}
            </p>
          ) : null}
        </div>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
        >
          {pending
            ? t("login.pending")
            : mode === "login"
              ? t("login.submit.login")
              : t("login.submit.register")}
        </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            href="/"
            className="font-medium text-sky-700 hover:underline dark:text-sky-400"
          >
            {t("login.backHome")}
          </Link>
        </p>
      </div>
    </div>
  );
}
