import Chat from "@/components/Chat";
import { getProfile } from "@/lib/content";

export default function Home() {
  const profile = getProfile();

  return (
    <main className="min-h-screen px-5 sm:px-8">
      <Chat
        name={profile.name}
        title={profile.title}
        location={profile.location}
        github={profile.github}
        email={profile.email}
      />
    </main>
  );
}
