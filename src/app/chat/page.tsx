import type { Metadata } from "next";
import Chat from "@/components/Chat";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage() {
  return <Chat />;
}
