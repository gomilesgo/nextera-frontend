import type { Metadata } from "next";
import { ProfileView } from "@/components/portal/ProfileView";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  await requireCustomer();
  return <ProfileView />;
}
