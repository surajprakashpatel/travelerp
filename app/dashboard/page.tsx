"use client";

import { useEffect, useState } from "react";
import { db } from "@/libs/firebase";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { Users, CalendarClock, Car, TrendingUp, ArrowRight } from "lucide-react";
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>

      {/* --- Stats Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Clients" 
          value={stats.totalClients} 
          icon={Users} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Pending Bookings" 
          value={stats.pendingBookings} 
          icon={CalendarClock} 
          color="bg-orange-500" 
        />
        <StatCard 
          title="Active Trips" 
          value={stats.activeTrips} 
          icon={Car} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Total Vehicles" 
          value={stats.totalVehicles} 
          icon={TrendingUp} 
          color="bg-purple-500" 
        />
      </div>

      {/* --- Recent Activity Section --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Pending Requests</h2>
          <Link href="/dashboard/bookings" className="text-sm text-blue-600 hover:underline flex items-center">
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <p className="text-gray-500 text-sm">No pending bookings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-medium">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Trip ID</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 rounded-tr-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{booking.tripId}</td>
                    <td className="px-4 py-3">{booking.clientName}</td>
                    <td className="px-4 py-3 truncate max-w-[200px]">
                      {booking.pickup} → {booking.drop}
                    </td>
                    <td className="px-4 py-3">{booking.date}</td>
                    <td className="px-4 py-3">
                      <Link 
                        href={`/dashboard/bookings`}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 bg-blue-50 px-2 py-1 rounded"
                      >
                        Assign
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple Helper Component for Cards
function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
        <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
  );
}