import { ListAppForm } from "./ListAppForm";

/* Invite links look like /app/showcase/submit?page=<slug>. Read server-side
   so the form needs no Suspense boundary for useSearchParams. */
export default async function ListAppPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const params = await searchParams;
  const page = Array.isArray(params.page) ? params.page[0] : params.page;
  return <ListAppForm initialPage={page ?? ""} />;
}
