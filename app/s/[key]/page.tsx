import { redirect } from "next/navigation";

/** Shareable season entry: /s/{key} → tournament hub (also seeds ?season= via LiveProvider). */
export default async function SeasonSharePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const safe = encodeURIComponent(String(key || "").trim());
  redirect(`/tournament/${safe}`);
}
