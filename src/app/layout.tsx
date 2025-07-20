
"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  LayoutGrid,
  ClipboardList,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/logo";
import { getLoggedInUser } from "@/lib/data";
import { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ScrollToTopButton from "@/components/scroll-to-top-button";

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUser = async () => {
      const loggedInUser = await getLoggedInUser();
      if (!loggedInUser) {
        router.push('/login');
      } else {
        setUser(loggedInUser);
      }
      setLoading(false);
    };
    fetchUser();
  }, [router]);

  const handleLogout = () => {
    try {
      localStorage.removeItem('loggedInUserId');
    } catch (error) {
       console.warn("localStorage is not available.");
    }
    router.push('/login');
  };

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { href: "/tasks", label: "Tasks", icon: ClipboardList },
    { href: "/team", label: "Team", icon: Users },
    { href: "/terms", label: "T&C", icon: ShieldCheck },
  ];

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-transparent">
       <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
       <div className="absolute top-0 z-[-2] h-screen w-screen bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(38,83,255,0.1),rgba(255,255,255,0))]"></div>
      
       <header className="flex flex-col border-b bg-transparent px-4 py-3 md:px-6">
        <div className="flex w-full items-center justify-between">
            <div className="flex-1"></div>
            <Link href="/dashboard" className="flex-1 text-center">
                <Logo />
            </Link>
             <div className="flex-1 flex justify-end">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10 border-2 border-primary/50">
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem className="flex flex-col items-start !p-3">
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        <nav className="mt-2 w-full text-sm font-medium">
            <div className="flex items-center justify-around">
              {menuItems.map(item => (
              <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                  "flex flex-row items-center gap-2 p-2 transition-colors hover:text-foreground",
                  pathname.startsWith(item.href) ? "text-foreground" : "text-muted-foreground"
                  )}
              >
                  <item.icon className="h-5 w-5" />
                  <span className="hidden md:inline">{item.label}</span>
              </Link>
              ))}
            </div>
        </nav>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>

       <footer className="mt-auto py-6 px-4 md:px-8 border-t bg-background/90 backdrop-blur-sm">
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Thoughtfully Designed. Precisely Engineered by NetworkingNexus.</p>
            <p>For Internal Use Only — © {new Date().getFullYear()} NetworkingNexus. All Rights Reserved.</p>
          </div>
       </footer>
      <ScrollToTopButton />
    </div>
  );
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <title>NetworkingNexus</title>
        <meta name="description" content="The internal project management and collaboration platform for the Networking Nexus student club." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
            :root {
                --font-inter: 'Inter', sans-serif;
            }
        ` }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {isLoginPage ? children : <AppLayout>{children}</AppLayout>}
        <Toaster />
      </body>
    </html>
  );
}
