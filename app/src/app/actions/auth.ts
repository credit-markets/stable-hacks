"use server";

import { COOKIE_NAMES, getDeleteCookieOptions } from "@/lib/cookies";
import { cookies } from "next/headers";

export async function clearAuthCookies(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const deleteOptions = getDeleteCookieOptions();

    // Clear the auth cookie
    cookieStore.set(COOKIE_NAMES.DYNAMIC_AUTH, "", deleteOptions);
  } catch (error) {
    // Cookie deletion should never block logout
    // Log the error but don't throw - allow logout to proceed
    console.warn("Cookie deletion failed during logout:", error);
    // Cookies will be expired server-side or handled by next login
  }
}
