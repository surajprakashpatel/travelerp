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
  UserCircle,
  Settings
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false); // Mobile Popup State

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

  const isDashboardHome = pathname === "/dashboard";

  // Close menu automatically when route changes
  useEffect(() => {
    setIsMoreMenuOpen(false);
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

  const primaryNav = [
    { name: "Home", href: "/dashboard", icon: LayoutDashboard },
    { name: "Bookings", href: "/dashboard/bookings", icon: CalendarCheck },
    { name: "Clients", href: "/dashboard/clients", icon: Users },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  ];

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

  // NavItem for Sidebar/BottomNav
  const NavItem = ({ item, mobile = false }: { item: any; mobile?: boolean }) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    
    return (
      <Link
        href={item.href}
        className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
          isActive
            ? "text-blue-600 md:bg-blue-50"
            : "text-slate-500 md:hover:bg-gray-50 md:hover:text-gray-900"
        }`}
      >
        <Icon className={`${mobile ? "h-6 w-6" : "h-5 w-5"} ${isActive ? "text-blue-600" : "text-slate-400"}`} />
        <span className={`${mobile ? "text-[10px] font-bold" : "text-sm font-medium"}`}>{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* --- Desktop Sidebar --- */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <span className="text-xl font-black bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">Tour Stack</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 space-y-1">
          {[...primaryNav, ...secondaryNav].map((item) => (
            <div key={item.href} className="px-3">
                <NavItem item={item} />
            </div>
          ))}
          <div className="px-3 pt-2">
            <Link href="/dashboard/trips/create" className="flex items-center gap-3 px-3 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all">
                <Plus className="h-5 w-5" /> Create Trip
            </Link>
          </div>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Mobile Header */}
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 md:hidden flex items-center justify-between px-4 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">C</span>
            </div>
            <span className="font-black text-slate-900 tracking-tight">Tour Stack</span>
          </div>
          <button className="p-1 text-slate-500">
             <UserCircle className="h-6 w-6 text-slate-400" />
          </button>
        </header>

        {/* Scrollable Page Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8 pb-32 md:pb-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Global Create Button */}
        {isDashboardHome && (
          <Link 
              href="/dashboard/trips/create"
              className="md:hidden fixed bottom-24 right-6 h-14 w-14 bg-blue-600 rounded-full shadow-lg shadow-blue-200 flex items-center justify-center text-white active:scale-90 transition-transform z-40"
          >
              <Plus className="h-8 w-8" />
          </Link>
        )}

        {/* --- MOBILE POPUP "MORE" MENU --- */}
        {isMoreMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[60]">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
              onClick={() => setIsMoreMenuOpen(false)}
            ></div>
            
            {/* The Popup Card */}
            <div className="absolute bottom-20 right-4 w-64 bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
              <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <button onClick={() => setIsMoreMenuOpen(false)} className="text-slate-400"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-2">
                {secondaryNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${
                        isActive ? "bg-blue-50 text-blue-700" : "text-slate-700 active:bg-slate-50"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                      <span className="text-sm font-black">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="p-2 border-t border-slate-50 bg-rose-50/30">
                <button 
                  onClick={handleLogout} 
                  className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl text-rose-600 active:bg-rose-100 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm font-black text-rose-700">Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar (Mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-2 flex justify-around items-center z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {primaryNav.map((item) => (
            <NavItem key={item.href} item={item} mobile={true} />
          ))}
          <button 
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${isMoreMenuOpen ? 'text-blue-600' : 'text-slate-500'}`}
          >
            {isMoreMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6 text-slate-400" />}
            <span className="text-[10px] font-bold">More</span>
          </button>
        </nav>

      </div>
    </div>
  );
}