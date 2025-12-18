"use client";

import { useState, useEffect } from "react";
import { db } from "@/libs/firebase";
import {useAuth} from "@/context/AuthContext";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  where 
} from "firebase/firestore";
import { 
  CalendarClock, 
  CheckCircle2, 
  Car, 
  User, 
  MapPin, 
  Phone, 
  MessageCircle, 
  X,
  FileCheck
} from "lucide-react";
import toast from "react-hot-toast";

// Interface definitions
interface Booking {
  id: string;
  tripId: string;
  clientName: string;
  clientPhone: string;
  pickup: string;
  drop: string;
  date: string;
  time: string;
  status: "Pending" | "Assigned" | "Completed" | "Cancelled";
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverMobile?: string;
  assignedVehicleId?: string;
  assignedVehicleNumber?: string;
  assignedVehicleModel?: string;
  assignedAgentId?: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"Pending" | "Assigned" | "Completed">("Pending");

  // Assignment Modal Data
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Dropdown Data
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  
  // Form Selection
  const [assignData, setAssignData] = useState({
    driverId: "",
    vehicleId: "",
    agentId: "",
  });

  // --- 1. Fetch Bookings ---
  const fetchBookings = async () => {
    try {
      if (!user?.uid) return;
      setLoading(true);
      const q = query(collection(db, "agencies", user.uid, "bookings"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
      setBookings(list);
    } catch (error) {
      console.error(error);
      toast.error("Error loading bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // --- 2. Assignment Logic ---
  const openAssignModal = async (booking: Booking) => {
    setSelectedBooking(booking);
    setIsAssignModalOpen(true);
    
    // Load dropdown data only when needed
    if (drivers.length === 0) {
      if (!user?.uid) return;
      const dSnap = await getDocs(collection(db, "agencies", user.uid, "drivers"));
      setDrivers(dSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const vSnap = await getDocs(collection(db, "agencies", user.uid, "vehicles"));
      setVehicles(vSnap.docs.map(v => ({ id: v.id, ...v.data() })));
      
      const aSnap = await getDocs(collection(db, "agencies", user.uid, "agents"));
      setAgents(aSnap.docs.map(a => ({ id: a.id, ...a.data() })));
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (!assignData.driverId || !assignData.vehicleId) {
      toast.error("Driver and Vehicle are required");
      return;
    }

    try {
      // Find selected objects to store names (snapshot)
      const drv = drivers.find(d => d.id === assignData.driverId);
      const veh = vehicles.find(v => v.id === assignData.vehicleId);
      
      await updateDoc(doc(db, "bookings", selectedBooking.id), {
        status: "Assigned",
        assignedDriverId: drv.id,
        assignedDriverName: drv.name,
        assignedDriverMobile: drv.mobile,
        assignedVehicleId: veh.id,
        assignedVehicleNumber: veh.number,
        assignedVehicleModel: veh.model,
        assignedAgentId: assignData.agentId || null, // Agent is optional
      });

      toast.success("Driver & Vehicle Assigned!");
      setIsAssignModalOpen(false);
      fetchBookings(); // Refresh list
      setActiveTab("Assigned"); // Switch tab to show the result
    } catch (error) {
      toast.error("Assignment Failed");
    }
  };

  // --- 3. Action Logic ---
  const markAsCompleted = async (booking: Booking) => {
    if (!confirm("Are you sure this trip is finished? It will move to Billing.")) return;
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status: "Completed" });
      toast.success("Trip Completed");
      fetchBookings();
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const shareOnWhatsApp = (booking: Booking) => {
    const text = `*Trip Confirmation - Chalbo Travels*%0A%0A` +
      `🆔 Trip ID: ${booking.tripId}%0A` +
      `👤 Client: ${booking.clientName}%0A` +
      `📍 Pickup: ${booking.pickup}%0A` +
      `🏁 Drop: ${booking.drop}%0A` +
      `📅 Date: ${booking.date} at ${booking.time}%0A%0A` +
      `*Driver Details:*%0A` +
      `🚗 Car: ${booking.assignedVehicleModel} (${booking.assignedVehicleNumber})%0A` +
      `👨 Driver: ${booking.assignedDriverName}%0A` +
      `📞 Contact: ${booking.assignedDriverMobile}`;
      
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // --- Filter Logic ---
  const filteredBookings = bookings.filter(b => b.status === activeTab);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Booking Management</h1>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        {["Pending", "Assigned", "Completed"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-500">Loading bookings...</p>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No {activeTab} bookings found.</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              
              {/* Trip Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                    {booking.tripId}
                  </span>
                  <span className="text-sm font-semibold text-gray-800">{booking.clientName}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600 mt-2">
                  <div className="flex items-center gap-2">
                     <MapPin className="h-4 w-4 text-blue-500" /> 
                     {booking.pickup} <span className="text-gray-400">→</span> {booking.drop}
                  </div>
                  <div className="flex items-center gap-2">
                     <CalendarClock className="h-4 w-4 text-orange-500" />
                     {booking.date} @ {booking.time}
                  </div>
                  
                  {booking.status !== "Pending" && (
                    <div className="col-span-1 md:col-span-2 flex items-center gap-2 mt-2 pt-2 border-t border-gray-50 text-blue-700 bg-blue-50 p-2 rounded">
                      <Car className="h-4 w-4" />
                      <span>{booking.assignedVehicleModel} ({booking.assignedVehicleNumber})</span>
                      <span className="text-gray-300">|</span>
                      <User className="h-4 w-4" />
                      <span>{booking.assignedDriverName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                
                {/* Pending Actions */}
                {booking.status === "Pending" && (
                  <button 
                    onClick={() => openAssignModal(booking)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Assign Cab
                  </button>
                )}

                {/* Assigned Actions */}
                {booking.status === "Assigned" && (
                  <>
                    <button 
                      onClick={() => shareOnWhatsApp(booking)}
                      className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-600 shadow-sm"
                      title="Share via WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </button>
                    <button 
                      onClick={() => markAsCompleted(booking)}
                      className="flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-900 shadow-sm"
                    >
                      <FileCheck className="h-4 w-4" /> Complete
                    </button>
                  </>
                )}

                {/* Completed Actions */}
                {booking.status === "Completed" && (
                  <span className="text-sm font-medium text-green-600 flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                    <CheckCircle2 className="h-4 w-4" /> Ready for Bill
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- Assignment Modal --- */}
      {isAssignModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
              <div>
                <h2 className="text-lg font-bold">Assign Cab</h2>
                <p className="text-xs text-gray-500">Trip ID: {selectedBooking.tripId}</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              {/* Driver Select */}
              <div>
                <label className="block text-sm font-medium mb-1">Select Driver *</label>
                <select 
                  className="w-full border rounded-lg px-3 py-2 bg-white"
                  value={assignData.driverId}
                  onChange={(e) => setAssignData({...assignData, driverId: e.target.value})}
                  required
                >
                  <option value="">-- Choose Driver --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.mobile})</option>
                  ))}
                </select>
              </div>

              {/* Vehicle Select */}
              <div>
                <label className="block text-sm font-medium mb-1">Select Vehicle *</label>
                <select 
                  className="w-full border rounded-lg px-3 py-2 bg-white"
                  value={assignData.vehicleId}
                  onChange={(e) => setAssignData({...assignData, vehicleId: e.target.value})}
                  required
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.model} ({v.type}) - {v.number}</option>
                  ))}
                </select>
              </div>

              {/* Agent Select */}
              <div>
                <label className="block text-sm font-medium mb-1">Affiliated Agent (Optional)</label>
                <select 
                  className="w-full border rounded-lg px-3 py-2 bg-white"
                  value={assignData.agentId}
                  onChange={(e) => setAssignData({...assignData, agentId: e.target.value})}
                >
                  <option value="">-- None (Direct Booking) --</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name} - {a.agencyName}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-2 font-medium">
                Confirm Assignment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}