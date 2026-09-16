import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getLiveResults } from "@/lib/results";
import LiveView from "./LiveView";

export default async function LiveResultsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireAdmin();
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const klass = await prisma.class.findUnique({ where: { code } });
  if (!klass) notFound();

  const initial = await getLiveResults(klass.id);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const pollLink = `${baseUrl}/c/${klass.code}`;
  const qrDataUrl = await QRCode.toDataURL(pollLink, { margin: 1, width: 240 });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <Link href={`/admin/classes/${klass.code}`} className="text-sm text-neutral-500">
        &larr; {klass.code}
      </Link>
      <LiveView code={klass.code} initial={initial} qrDataUrl={qrDataUrl} pollLink={pollLink} />
    </main>
  );
}
