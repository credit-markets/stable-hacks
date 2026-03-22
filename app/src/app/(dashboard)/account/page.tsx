import { PROJECT_INFO } from "@/utils/projectInfo";
import { AccountContent } from "./components/AccountContent";

export const metadata = {
  title: `Account | ${PROJECT_INFO.name}`,
  description: `Manage your ${PROJECT_INFO.name} account settings and authorized wallets.`,
};

export default function AccountPage() {
  return <AccountContent />;
}
