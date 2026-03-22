import { getCachedPool } from "@/lib/server/cached-pool";
import { PROJECT_INFO } from "@/utils/projectInfo";
import { notFound } from "next/navigation";
import { PoolContent } from "./components/PoolContent";

export async function generateMetadata({
  params,
}: { params: Promise<{ address: string }> }) {
  const awaitedParams = await params;
  try {
    const data = await getCachedPool(awaitedParams.address);
    return {
      title: `${data.title || "Pool"} Details | ${PROJECT_INFO.name}`,
      description: `View and invest in ${PROJECT_INFO.name} investment pools`,
    };
  } catch {
    return {
      title: `Pool Details | ${PROJECT_INFO.name}`,
      description: `View and invest in ${PROJECT_INFO.name} investment pools`,
    };
  }
}

async function PoolPage({ params }: { params: Promise<{ address: string }> }) {
  const awaitedParams = await params;
  const data = await getCachedPool(awaitedParams.address);

  if (!data) {
    notFound();
  }

  return <PoolContent data={data} />;
}

export default PoolPage;
