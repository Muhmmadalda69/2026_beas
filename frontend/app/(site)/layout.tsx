import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCurrentUser } from "@/lib/user";

// Layout for all public-facing pages: shared navigation and footer chrome.
// The current player (if logged in) is resolved server-side and handed to the
// navbar so it can show the session state without a client round-trip.
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-full flex-col">
      <Navbar user={user ? { name: user.name } : null} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
