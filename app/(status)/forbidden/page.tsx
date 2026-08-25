import { StatusPage } from "@/components/common/StatusPage";

export default function ForbiddenPage() {
  return <StatusPage codeKey="forbidden_code" titleKey="forbidden_title" descKey="forbidden_desc" codeColor="text-red-500" />;
}
