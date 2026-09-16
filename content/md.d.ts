/* The docs under content/docs/ are imported as raw strings by app/lib/docs.ts.
   The webpack rule that makes that work lives in next.config.mjs — this only
   tells TypeScript what the import evaluates to. */
declare module "*.md" {
  const content: string;
  export default content;
}
