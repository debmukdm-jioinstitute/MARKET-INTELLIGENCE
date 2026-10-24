import IndexDetail from "@/components/indices/index-detail";

export default async function IndexPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <IndexDetail slug={slug.toLowerCase().replace(/[^a-z0-9-]/g, "")} />;
}
