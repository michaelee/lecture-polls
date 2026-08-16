const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Wrong password.",
  config: "ADMIN_PASSWORD isn't set on the server yet.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-xl font-semibold">Admin login</h1>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
          </p>
        )}

        <form action="/api/admin/login" method="POST" className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
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
