import { redirect } from "next/navigation";
import { verifyAdmin } from "@/lib/admin-auth";

// Server-side gate: any signed-in user could otherwise hit /admin and see the
// dashboard shell while the API rejects them. Bounce non-admins back to /home.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminId = await verifyAdmin();
  if (!adminId) redirect("/home");
  return <>{children}</>;
}
