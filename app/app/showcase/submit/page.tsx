import { ListAppForm } from "./ListAppForm";

/* Three ways in: from the Showcase page or an app's row there ("List it" →
   ?app=<id>), from an app's Overview (?app=<id>&from=app, which
   sends the person back there afterwards), and from an event page's invite
   link (?page=<slug>). Read server-side so the form needs no Suspense
   boundary for useSearchParams. */
export default async function ListAppPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; app?: string | string[]; from?: string | string[]; where?: string | string[] }>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  return (
    <ListAppForm
      initialPage={one(params.page)}
      initialApp={one(params.app)}
      fromApp={one(params.from) === "app"}
      startOnEvent={one(params.where) === "event"}
    />
  );
}
