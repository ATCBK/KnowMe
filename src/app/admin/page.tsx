import type { Metadata } from "next";
import AdminConsole from "./AdminConsole";

export const metadata: Metadata = {
  title: "KnowMe Admin — 记忆库",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
