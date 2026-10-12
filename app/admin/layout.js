"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_ROLE } from "@/lib/config";
import Container from "@/components/layout/Container";
import Skeleton from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import Sidebar from "@/components/admin/Sidebar";
import { LogOutIcon, StoreIcon } from "@/components/admin/Icons";

// Admin shell + client-side role guard (defense in depth — proxy.js fences
// /admin/* server-side first). All admin pages are client components: auth
// lives in localStorage, which server components cannot read.
function AdminGuard({ children }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "loading") return;
    if (auth.status === "guest") {
      router.replace("/login?next=%2Fadmin");
      return;
    }
    if (auth.user?.userType !== ADMIN_ROLE) router.replace("/");
  }, [auth.status, auth.user, router]);

  if (auth.status === "loading") {
    return (
      <Container className="py-8">
        <Skeleton className="h-7 w-48" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Container>
    );
  }
  if (auth.status !== "user" || auth.user?.userType !== ADMIN_ROLE) {
    // Redirect issued above — render nothing (no flash of admin UI).
    return null;
  }
  return children;
}

function Topbar() {
  const auth = useAuth();
  const router = useRouter();
  const logout = () => {
    auth.logout();
    router.replace("/login");
  };
  return (
    <div className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <Link href="/admin" className="text-lg font-bold tracking-tight text-text">
        Masar <span className="text-text-subdued">· Admin</span>
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-text-subdued sm:block">
          {auth.user?.username || auth.user?.email || ""}
        </span>
        {/* New tab so the admin never loses their dashboard place. */}
        <Button
          variant="secondary"
          size="sm"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          title="View store"
          aria-label="View store (opens in a new tab)"
        >
          <StoreIcon className="h-4 w-4" />
          <span className="hidden sm:inline">View store</span>
        </Button>
        <Button variant="plain" onClick={logout} aria-label="Log out">
          <span className="inline-flex items-center gap-2">
            <LogOutIcon className="h-4 w-4" />
            Log out
          </span>
        </Button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  // Buyer Navbar / Footer / CartDrawer never render on /admin/* (each
  // returns null for that prefix) — this shell is the whole chrome here.
  return (
    <Suspense>
      <AdminGuard>
        <div className="flex min-h-[calc(100vh-3.5rem)]">
          <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:block">
            <div className="sticky top-0">
              <Sidebar />
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <Topbar />
            <Container className="py-8">{children}</Container>
          </div>
        </div>
      </AdminGuard>
    </Suspense>
  );
}
