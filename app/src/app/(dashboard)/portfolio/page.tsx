import { PROJECT_INFO } from "@/utils/projectInfo";
import { PortfolioContent } from "./components/PortfolioContent";

export const metadata = {
  title: `Portfolio | ${PROJECT_INFO.name}`,
  description: `View and manage your ${PROJECT_INFO.name} portfolio.`,
};

export default function PortfolioPage() {
  return <PortfolioContent />;
}
