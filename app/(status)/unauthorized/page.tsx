import { StatusPage } from "@/components/common/StatusPage";

export default function UnauthorizedPage() {
  return <StatusPage codeKey="unauthorized_code" titleKey="unauthorized_title" descKey="unauthorized_desc" codeColor="text-amber-500" />;
}
