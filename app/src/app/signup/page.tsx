import { Auth } from "@/components/Auth";
import AuthLayout from "@/components/AuthLayout";
import { PROJECT_INFO } from "@/utils/projectInfo";

export const metadata = {
  title: `Sign Up | ${PROJECT_INFO.name}`,
  description: `Create your ${PROJECT_INFO.name} account.`,
};

export default function SignUpPage() {
  return (
    <AuthLayout>
      <Auth mode="signup" />
    </AuthLayout>
  );
}
