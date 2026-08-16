const ERROR_MESSAGES: Record<string, string> = {
  missing: "Enter both your username and campus ID.",
  invalid: "That username/campus ID combination doesn't match our roster.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold">Student login</h1>
        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          Use your email username (e.g. jdoe123) and campus ID (e.g. A12345678).
        </p>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
          </p>
        )}

        <form action="/api/auth/login" method="POST" className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next ?? "/"} />
          <label className="flex flex-col gap-1 text-sm">
            Username
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              required
              placeholder="jdoe123"
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Campus ID
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="A12345678"
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-neutral-900 px-4 py-2 text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Log in
          </button>
        </form>
      </div>
    </main>
  );
}
