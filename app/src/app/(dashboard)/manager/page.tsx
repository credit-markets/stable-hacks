import { PROJECT_INFO } from "@/utils/projectInfo";
import { ManagerContent } from "./components/ManagerContent";

export const metadata = {
  title: `Manager | ${PROJECT_INFO.name}`,
  description: `Manage your pools on ${PROJECT_INFO.name}.`,
};

export default function ManagerPage() {
  return <ManagerContent />;
}
