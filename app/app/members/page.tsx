"use client";

import { Page, PageHeader } from "../../components/console/kit";
import { UserManagementWidget } from "../../components/console/UserManagementWidget";

// Members is entirely MSG91's user-management widget now — it owns the list,
// invites, roles and removal against the same proxy that handles login, so the
// console no longer keeps its own copy of any of that.
export default function MembersPage() {
  return (
    <Page>
      <PageHeader title="Members" subtitle="People in this company." />
      <UserManagementWidget />
    </Page>
  );
}
