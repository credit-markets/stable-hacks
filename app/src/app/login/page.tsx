import { Auth } from "@/components/Auth";
import AuthLayout from "@/components/AuthLayout";
import { PROJECT_INFO } from "@/utils/projectInfo";

export const metadata = {
  title: `Login | ${PROJECT_INFO.name}`,
  description: `Log in to your ${PROJECT_INFO.name} account.`,
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <Auth mode="login" />
    </AuthLayout>
  );
}
