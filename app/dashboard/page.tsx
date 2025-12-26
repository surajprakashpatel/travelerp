"use client";

import { useEffect, useState } from "react";
import { db } from "@/libs/firebase";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { Users, CalendarClock, Car, TrendingUp, ArrowRight,
 
  MapPin, 
  Calendar,
  ChevronRight,
 } from "lucide-react";
import Link from "next/link";

export default function DashboardHome() {
  const { user } = useAuth(); 
  const [stats, setStats] = useState({
    totalClients: 0,
    pendingBookings: 0,
    activeTrips: 0,
    totalVehicles: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!user) return;
        // 1. Fetch Counts (In a real production app, use 'count()' aggregations for cost efficiency)
        const clientsSnap = await getDocs(collection(db, "agencies", user.uid, "clients"));
        const vehiclesSnap = await getDocs(collection(db, "agencies", user.uid, "vehicles"));
        
        // Fetch Bookings to filter status locally or via query
        const bookingsRef = collection(db, "agencies", user.uid, "bookings");
        
        // Query for Pending
        const pendingSnap = await getDocs(query(bookingsRef, where("status", "==", "Pending")));
        
        // Query for Assigned/Active
        const activeSnap = await getDocs(query(bookingsRef, where("status", "==", "Assigned")));

        setStats({
          totalClients: clientsSnap.size,
          totalVehicles: vehiclesSnap.size,
          pendingBookings: pendingSnap.size,
          activeTrips: activeSnap.size,
        });

        // 2. Fetch Recent Pending Bookings (Top 5)
        const recentQuery = query(
          bookingsRef, 
          where("status", "==", "Pending"),
          orderBy("createdAt", "desc"), // Ensure you have Firestore indexes enabled if this fails
          limit(5)
        );
        const recentSnap = await getDocs(recentQuery);
        setRecentBookings(recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-4">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex flex-col">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back! Here is what's happening today.</p>
      </div>

      {/* --- Stats Cards (2x2 Grid on Mobile, 4x1 on Desktop) --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard 
          title="Clients" 
          value={stats.totalClients} 
          icon={Users} 
          color="blue" 
        />
        <StatCard 
          title="Pending" 
          value={stats.pendingBookings} 
          icon={CalendarClock} 
          color="orange" 
        />
        <StatCard 
          title="Active" 
          value={stats.activeTrips} 
          icon={Car} 
          color="green" 
        />
        <StatCard 
          title="Vehicles" 
          value={stats.totalVehicles} 
          icon={TrendingUp} 
          color="purple" 
        />
      </div>

      {/* --- Recent Activity Section --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Pending Requests</h2>
            <p className="text-xs text-gray-500">Needs immediate assignment</p>
          </div>
          <Link href="/dashboard/bookings" className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No pending bookings found.</p>
          </div>
        ) : (
          <div>
            {/* --- Desktop Table View (Visible only on md+) --- */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Trip ID</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Route</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentBookings.map((booking: any) => (
                    <tr key={booking.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-blue-700">#{booking.tripId}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{booking.clientName}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[100px]">{booking.pickup}</span>
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                          <span className="truncate max-w-[100px]">{booking.drop}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{booking.date}</td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/dashboard/bookings`}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                        >
                          Assign
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --- Mobile Card View (Visible only on small screens) --- */}
            <div className="md:hidden divide-y divide-gray-100">
              {recentBookings.map((booking: any) => (
                <div key={booking.id} className="p-4 active:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        #{booking.tripId}
                      </span>
                      <h3 className="font-bold text-gray-900 mt-1">{booking.clientName}</h3>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-medium text-gray-500 flex items-center justify-end">
                         <Calendar className="h-3 w-3 mr-1" /> {booking.date}
                       </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl mb-4 text-sm">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <div className="w-0.5 h-4 bg-gray-300"></div>
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    </div>
                    <div className="flex flex-col gap-1 text-gray-700 font-medium">
                      <span className="truncate">{booking.pickup}</span>
                      <span className="truncate">{booking.drop}</span>
                    </div>
                  </div>

                  <Link 
                    href={`/dashboard/bookings`}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-blue-600 text-blue-600 font-bold rounded-xl text-sm active:bg-blue-600 active:text-white transition-all"
                  >
                    Assign Driver & Vehicle <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile-only shortcut section */}
      <div className="md:hidden grid grid-cols-2 gap-3">
         <button className="p-4 bg-white border border-gray-100 rounded-2xl text-center shadow-sm">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-gray-800">New Trip</span>
         </button>
         <button className="p-4 bg-white border border-gray-100 rounded-2xl text-center shadow-sm">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-xs font-bold text-gray-800">Add Client</span>
         </button>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    green: "bg-green-50 text-green-600 border-green-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  return (
    <div className={`p-4 rounded-2xl border ${colorMap[color]} flex flex-col gap-2 shadow-sm bg-white`}>
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${colorMap[color].split(' ')[0]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-2xl font-black text-gray-900 tracking-tight">{value}</span>
      </div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{title}</p>
    </div>
  );
}