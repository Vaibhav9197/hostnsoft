// Shared sessionStorage keys for the connector login handoff - see
// app/connector/login/page.tsx (writes these before handing off to the
// widget) and app/components/connector/ConnectorTokenPickup.tsx (reads them
// on whatever page MSG91's own redirect mode actually lands on). Kept in
// their own module rather than exported from page.tsx, since Next's app
// router only allows a fixed set of named exports from a page file.
export const CONNECTOR_PENDING_REDIRECT_KEY = "embarko_connector_pending_redirect_uri";
export const CONNECTOR_PENDING_STATE_KEY = "embarko_connector_pending_state";
