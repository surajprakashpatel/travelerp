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
  X,
  Plus,
  UserCircle
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Primary Navigation (Bottom Bar on Mobile)
  const primaryNav = [
    { name: "Home", href: "/dashboard", icon: LayoutDashboard },
    { name: "Bookings", href: "/dashboard/bookings", icon: CalendarCheck },
    { name: "Clients", href: "/dashboard/clients", icon: Users },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  ];

  // Secondary Navigation (Drawer/Sidebar Only)
  const secondaryNav = [
    { name: "Agents", href: "/dashboard/agents", icon: Briefcase },
    { name: "Vehicles", href: "/dashboard/vehicles", icon: Car },
    { name: "Drivers", href: "/dashboard/drivers", icon: PersonStanding },
    { name: "Billing", href: "/dashboard/billing", icon: Receipt },
  ];

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-gray-100 border-t-blue-600 animate-spin"></div>
        </div>
      </div>
    );
  }

  const NavItem = ({ item, mobile = false }: { item: any; mobile?: boolean }) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    
    return (
      <Link
        href={item.href}
        className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
          isActive
            ? "text-blue-600 md:bg-blue-50"
            : "text-gray-500 md:hover:bg-gray-50 md:hover:text-gray-900"
        }`}
      >
        <Icon className={`${mobile ? "h-6 w-6" : "h-5 w-5"} ${isActive ? "text-blue-600" : "text-gray-400"}`} />
        <span className={`${mobile ? "text-[10px] font-medium" : "text-sm font-medium"}`}>{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* --- Desktop Sidebar (Unchanged for Desktop UX) --- */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">Tour Stack</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 space-y-1">
          <div className="px-4 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Main Menu</div>
          {[...primaryNav, ...secondaryNav].map((item) => (
            <div key={item.href} className="px-3">
                <NavItem item={item} />
            </div>
          ))}
          <div className="px-3 pt-2">
            <Link href="/dashboard/trips/create" className="flex items-center gap-3 px-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                <Plus className="h-5 w-5" /> Create Trip
            </Link>
          </div>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* --- Mobile Sidebar Drawer (Secondary Links) --- */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="fixed inset-y-0 right-0 w-72 bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
              <span className="font-bold text-gray-900">More Options</span>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4">
              <div className="px-4 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Administration</div>
              {secondaryNav.map((item) => (
                <div key={item.href} className="px-3 py-1">
                    <NavItem item={item} />
                </div>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-100 mb-20"> {/* Margin for bottom nav */}
              <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 bg-red-50 rounded-xl">
                <LogOut className="h-5 w-5" /> Logout from Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Mobile Header */}
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-gray-200 md:hidden flex items-center justify-between px-4 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
            </div>
            <span className="font-bold text-gray-900 tracking-tight">Chalbo ERP</span>
          </div>
          <button className="p-1 text-gray-500">
             <UserCircle className="h-6 w-6" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8 pb-32 md:pb-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>

        {/* --- MOBILE ONLY UI ELEMENTS --- */}

        {/* Floating Action Button (Mobile) */}
        <Link 
            href="/dashboard/trips/create"
            className="md:hidden fixed bottom-24 right-6 h-14 w-14 bg-blue-600 rounded-full shadow-lg shadow-blue-200 flex items-center justify-center text-white active:scale-90 transition-transform z-40"
        >
            <Plus className="h-8 w-8" />
        </Link>

        {/* Bottom Navigation Bar (Mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-center z-50 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
          {primaryNav.map((item) => (
            <NavItem key={item.href} item={item} mobile={true} />
          ))}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 text-gray-500"
          >
            <Menu className="h-6 w-6 text-gray-400" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </nav>

      </div>
    </div>
  );
}