import { requireAdmin, SignInRequired } from "../guard";
import MonitoringSettings from "./settings";

/* Monitoring settings: report times, Slack channels, alert thresholds and
   health checks. Gated like every other /admin page. */
export default async function AdminMonitoringPage() {
  if (!(await requireAdmin())) return <SignInRequired />;

  return <MonitoringSettings />;
}
