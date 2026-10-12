import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "../components/ds";
import { formatDate, POSTS, type BlogPost } from "../lib/blog";

/* "Pushpendra Agrawal" -> "PA", "The Embarko team" -> "E": a leading "The"
   and lowercase words are dropped, so a team byline reads as its name. */
function initials(name: string): string {
  const words = name.split(/\s+/).filter((w, i) => !(i === 0 && /^the$/i.test(w)) && /^\p{Lu}/u.test(w));
  return (words.length ? words : [name]).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/** The posts to suggest after `current`: the newest others, at most `limit`. */
function nextPosts(current: string, limit: number): BlogPost[] {
  return POSTS.filter((p) => p.slug !== current).slice(0, limit);
}

/**
 * The block under every post that hands the reader on to another one, so a
 * post never ends in a dead end. Renders nothing when there is no other post.
 */
export function ContinueReading({ current, limit = 2 }: { current: string; limit?: number }) {
  const posts = nextPosts(current, limit);
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="continue-h" className="mx-auto max-w-7xl px-6">
      <div className="border-t border-border pt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="continue-h" className="text-2xl font-semibold tracking-tight text-muted-foreground sm:text-3xl">
            Continue reading…
          </h2>
          <Link
            href="/blog"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            View all guides
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {posts.map((post) => (
            <Card as="li" lift key={post.slug} className="!p-0">
              <Link href={`/blog/${post.slug}`} className="flex h-full flex-col overflow-hidden rounded-[inherit]">
                {post.cover && (
                  <img
                    src={post.cover}
                    alt=""
                    width={1200}
                    height={630}
                    loading="lazy"
                    className="aspect-[1200/630] w-full border-b border-border object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <h3 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">{post.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.description}</p>
                  <div className="mt-auto flex items-center gap-3 pt-6 text-sm text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-background text-[11px] font-semibold text-foreground"
                    >
                      {initials(post.author)}
                    </span>
                    <span className="text-foreground">{post.author}</span>
                    <span aria-hidden="true" className="h-4 w-px rotate-12 bg-border" />
                    <time dateTime={post.datePublished}>{formatDate(post.datePublished)}</time>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </ul>
      </div>
    </section>
  );
}
