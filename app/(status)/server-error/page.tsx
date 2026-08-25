import { StatusPage } from "@/components/common/StatusPage";

export default function ServerErrorPage() {
  return <StatusPage codeKey="server_error_code" titleKey="server_error_title" descKey="server_error_desc" codeColor="text-red-600" />;
}
