"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/libs/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Car, 
  PersonStanding, 
  MapPin, 
  CalendarCheck, 
  Receipt, 
  BarChart3, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import toast from "react-hot-toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Menu State

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Close sidebar automatically when route changes (mobile UX)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      router.push("/");
    } catch (error) {
      toast.error("Error logging out");
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Clients", href: "/dashboard/clients", icon: Users },
    { name: "Agents", href: "/dashboard/agents", icon: Briefcase },
    { name: "Vehicles", href: "/dashboard/vehicles", icon: Car },
    { name: "Drivers", href: "/dashboard/drivers", icon:  PersonStanding},
    { name: "Create Trip", href: "/dashboard/trips/create", icon: MapPin },
    { name: "Bookings", href: "/dashboard/bookings", icon: CalendarCheck },
    { name: "Billing", href: "/dashboard/billing", icon: Receipt },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Helper component for Nav Links to avoid repetition
  const NavLinks = () => (
    <ul className="space-y-1 px-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
              {item.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      
      {/* --- Desktop Sidebar (Hidden on Mobile) --- */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <span className="text-xl font-bold text-blue-700">Chalbo ERP</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* --- Mobile Sidebar Overlay --- */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
          
          {/* Slide-in Menu */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl flex flex-col transform transition-transform">
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
              <span className="text-xl font-bold text-blue-700">Chalbo ERP</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
              <NavLinks />
            </nav>
            <div className="p-4 border-t border-gray-100">
              <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">
                <LogOut className="h-5 w-5" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 bg-white border-b border-gray-200 md:hidden flex items-center justify-between px-4 flex-shrink-0">
          <span className="font-bold text-blue-700 text-lg">Chalbo ERP</span>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-md">
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Page Scroll Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}