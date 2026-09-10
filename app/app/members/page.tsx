"use client";

import { Page } from "../../components/console/kit";
import { UserManagementWidget } from "../../components/console/UserManagementWidget";

// Members is entirely MSG91's user-management widget now — it owns the list,
// invites, roles and removal against the same proxy that handles login, so the
// console no longer keeps its own copy of any of that. It brings its own
// "Team members" heading too, which is why this page adds none.
export default function MembersPage() {
  return (
    <Page>
      <UserManagementWidget />
    </Page>
  );
}
