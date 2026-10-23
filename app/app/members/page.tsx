"use client";

import { Page } from "../../components/console/kit";
import { Members } from "../../components/console/TeamRoles";

// Who is in the workspace and what each person can do — one list, all of it
// hostnsoft-api (see TeamRoles). Everyone may look; only Owners and Admins
// (members.manage) get the controls.
export default function MembersPage() {
  return (
    <Page>
      <Members />
    </Page>
  );
}
