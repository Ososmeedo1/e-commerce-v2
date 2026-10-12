import "./globals.css";
import { Suspense } from "react";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import { AuthProvider } from "../components/auth/AuthProvider";
import { CartProvider } from "../components/cart/CartProvider";
import { AuthGateProvider } from "../components/auth/AuthGate";
import { ToastProvider } from "../components/ui/Toaster";
import Toaster from "../components/ui/Toaster";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

// Runs synchronously in <head> BEFORE first paint: reads the persisted
// preference (or OS setting) and sets class="dark" on <html> so the correct
// theme paints immediately — no flash of the wrong theme on reload.
const NO_FLASH_SCRIPT =
  '(function(){try{var s=localStorage.getItem("masar_theme");var d=s==="dark"||(s!=="light"&&s!=="dark"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();';

export const metadata = {
  title: {
    template: "%s · Masar",
    default: "Masar",
  },
  description: "Masar is an e-commerce storefront for electronics, home goods, food, and clothing.",
  openGraph: {
    title: "Masar",
    description:
      "Masar is an e-commerce storefront for electronics, home goods, food, and clothing.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  // Provider order is intentional — do not reorder: Theme > Toast > Auth > Cart > AuthGate.
  // Auth wraps Cart so cart mutations can read the token; AuthGate wraps page-level
  // consumers; Theme/Toast are independent and sit outermost.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-text focus:shadow-md"
        >
          Skip to content
        </a>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
                <AuthGateProvider>
                {/* Navbar reads usePathname(): it must suspend on routes whose
                    path is unknown at prerender (e.g. /products/[id]). The
                    fallback is a static lookalike, replaced on hydration. */}
                <Suspense
                  fallback={
                    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur">
                      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                        <span className="text-lg font-bold tracking-tight text-text">
                          Masar
                        </span>
                      </div>
                    </header>
                  }
                >
                  <Navbar />
                </Suspense>
                <main id="main" tabIndex={-1} className="flex-1">
                  {children}
                </main>
                {/* Footer reads usePathname() for the /admin skip (see
                    Footer.jsx) — same Suspense requirement as Navbar above. */}
                <Suspense
                  fallback={
                    <div aria-hidden="true" className="border-t border-border bg-surface">
                      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" />
                    </div>
                  }
                >
                  <Footer />
                </Suspense>
                <Toaster />
              </AuthGateProvider>
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
