"use client";

import { Page } from "../../components/console/kit";
import { TeamRoles } from "../../components/console/TeamRoles";
import { UserManagementWidget } from "../../components/console/UserManagementWidget";
import { usePermissions } from "../../lib/permissions";

// Two halves. Who is in the workspace — the list, invites, removal — is
// MSG91's user-management widget, against the same proxy that handles login.
// What each of them can do here (Owner, Admin, Member, Billing, and a
// Member's access to each app) is ours: TeamRoles, backed by hostnsoft-api's roles. The widget
// brings its own "Team members" heading, which is why this page adds none.
//
// The widget is only shown to people who may manage members: it can add and
// remove people, and our roles can't reach inside it. Proxy enforces its own
// rules on those actions regardless; this just keeps the page from offering
// them to a Member.
export default function MembersPage() {
  const { can, settled } = usePermissions();
  return (
    <Page>
      <TeamRoles />
      {settled && can("members.manage") && <UserManagementWidget />}
    </Page>
  );
}
