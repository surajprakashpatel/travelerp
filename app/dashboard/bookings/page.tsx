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
   MapPin, 
  CalendarClock, 
  Car, 
  User, 
  CheckCircle2, 
  MoreVertical,
  Phone,
  ArrowRight,
  StickyNote,
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
  status: "Pending" | "Assigned" | "Completed" | "Cancelled" | "Billed";
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedDriverMobile?: string;
  assignedVehicleId?: string;
  assignedVehicleNumber?: string;
  assignedVehicleModel?: string;
  assignedAgentId?: string;
   notes?: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
const [activeTab, setActiveTab] = useState<"Pending" | "Assigned" | "Completed" | "Cancelled" | "Billed">("Pending");

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
      if (!user?.uid) return; 
      // Find selected objects to store names (snapshot)
      const drv = drivers.find(d => d.id === assignData.driverId);
      const veh = vehicles.find(v => v.id === assignData.vehicleId);
      
      await updateDoc(doc(db, "agencies", user.uid, "bookings", selectedBooking.id), {
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

  const cancelBooking = async (booking: Booking) => {
  if (!user?.uid) return;
  if (!confirm("Are you sure you want to cancel this booking?")) return;
  try {
    await updateDoc(doc(db, "agencies", user.uid, "bookings", booking.id), { 
      status: "Cancelled" 
    });
    toast.success("Booking Cancelled");
    fetchBookings();
  } catch (error) {
    toast.error("Cancellation failed");
  }
};
  // --- 3. Action Logic ---
  const markAsCompleted = async (booking: Booking) => {
    if (!user?.uid) return;
    if (!confirm("Are you sure this trip is finished? It will move to Billing.")) return;
    try {
      await updateDoc(doc(db, "agencies", user.uid, "bookings", booking.id), { status: "Completed" });
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
  const filteredBookings = bookings.filter(b => b.status === activeTab)


  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      {/* --- Mobile Header --- */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-black text-gray-900">Bookings</h1>
        <div className="md:hidden bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
          {filteredBookings.length} Trips
        </div>
      </div>

      {/* --- Tabs (Segmented Control Style) --- */}
      <div className="sticky top-14 z-30 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4 py-2 overflow-x-auto no-scrollbar">
        <div className="flex bg-gray-200/50 p-1 rounded-xl min-w-max">
          {["Pending", "Assigned", "Completed", "Cancelled", "Billed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === tab
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* --- List Area --- */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400 font-medium">No {activeTab.toLowerCase()} bookings</p>
          </div>
        ) : (
          filteredBookings.map((booking: any) => (
            <div 
                key={booking.id} 
                className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden active:scale-[0.99] transition-transform"
            >
              {/* Card Top: Client & Trip ID */}
              <div className="px-4 py-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {booking.clientName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-none">{booking.clientName}</h3>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">#{booking.tripId}</span>
                  </div>
                </div>
                <button className="p-1 text-gray-400"><MoreVertical className="h-4 w-4" /></button>
              </div>
              
              <div className="p-4">
                {/* Date & Time Row */}
                <div className="flex items-center gap-4 mb-4 text-gray-600">
                    <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2 py-1 rounded-md">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold">{booking.date}</span>
                    </div>
                    <div className="text-xs font-medium text-gray-400">@ {booking.time}</div>
                </div>

                {/* Route Visualizer */}
                <div className="flex gap-3 mb-4">
                  <div className="flex flex-col items-center py-1">
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-white"></div>
                    <div className="w-0.5 flex-1 bg-dashed border-l border-gray-200 my-1"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    <p className="text-sm font-medium text-gray-800 line-clamp-1">{booking.pickup}</p>
                    <p className="text-sm font-medium text-gray-800 line-clamp-1">{booking.drop}</p>
                  </div>
                </div>

                {/* Notes if present */}
                {booking.notes && (
                  <div className="mb-4 p-3 bg-amber-50 rounded-xl flex items-start gap-2 border border-amber-100/50">
                    <StickyNote className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 leading-relaxed"><span className="font-bold">Note:</span> {booking.notes}</p>
                  </div>
                )}

                {/* Assignment Details (Only if assigned) */}
                {booking.status !== "Pending" && booking.status !== "Cancelled" && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-xl space-y-2 border border-blue-100">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-blue-700 font-bold">
                            <Car className="h-3.5 w-3.5" /> {booking.assignedVehicleNumber}
                        </div>
                        <div className="flex items-center gap-2 text-blue-700 font-bold">
                            <User className="h-3.5 w-3.5" /> {booking.assignedDriverName}
                        </div>
                    </div>
                  </div>
                )}

                {/* --- Action Buttons --- */}
                <div className="flex items-center gap-2 mt-2">
                  {booking.status === "Pending" && (
                    <>
                      <button 
                        onClick={() => openAssignModal(booking)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-blue-100"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Assign Trip
                      </button>
                      <button 
                        onClick={() => cancelBooking(booking)}
                        className="px-4 py-3 bg-white text-red-500 border border-red-100 rounded-xl hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {booking.status === "Assigned" && (
                    <>
                      <button 
                        onClick={() => shareOnWhatsApp(booking)}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl text-sm font-bold"
                      >
                        <MessageCircle className="h-5 w-5" /> WhatsApp Driver
                      </button>
                      <button 
                        onClick={() => markAsCompleted(booking)}
                        className="px-4 py-3 bg-gray-900 text-white rounded-xl"
                        title="Complete Trip"
                      >
                        <FileCheck className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  {["Completed", "Cancelled", "Billed"].includes(booking.status) && (
                    <div className={`w-full text-center py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border ${
                        booking.status === 'Completed' ? 'bg-green-50 text-green-600 border-green-100' :
                        booking.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                        'bg-purple-50 text-purple-600 border-purple-100'
                    }`}>
                        {booking.status}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- Assignment Modal (Desktop) / Bottom Sheet (Mobile) --- */}
      {isAssignModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-[32px] md:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Grabber for Mobile UI */}
            <div className="md:hidden w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1"></div>
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
              <div>
                <h2 className="text-lg text-gray-900 font-black">Assign Cab</h2>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-tighter">#{selectedBooking.tripId} • {selectedBooking.clientName}</p>
              </div>
              <button 
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 bg-gray-100 rounded-full text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="group">
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Select Driver</label>
                    <select 
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-4 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all font-medium appearance-none"
                    value={assignData.driverId}
                    onChange={(e) => setAssignData({...assignData, driverId: e.target.value})}
                    required
                    >
                    <option value="">-- Choose Driver --</option>
                    {drivers.map((d:any) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.mobile})</option>
                    ))}
                    </select>
                </div>

                <div className="group">
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Select Vehicle</label>
                    <select 
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-4 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all font-medium appearance-none"
                    value={assignData.vehicleId}
                    onChange={(e) => setAssignData({...assignData, vehicleId: e.target.value})}
                    required
                    >
                    <option value="">-- Choose Vehicle --</option>
                    {vehicles.map((v:any) => (
                        <option key={v.id} value={v.id}>{v.model} - {v.number}</option>
                    ))}
                    </select>
                </div>

                <div className="group">
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Affiliated Agent</label>
                    <select 
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-4 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all font-medium appearance-none"
                    value={assignData.agentId}
                    onChange={(e) => setAssignData({...assignData, agentId: e.target.value})}
                    >
                    <option value="">-- Direct Booking --</option>
                    {agents.map((a:any) => (
                        <option key={a.id} value={a.id}>{a.name} ({a.agencyName})</option>
                    ))}
                    </select>
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 mt-2">
                Confirm & Assign
              </button>
              <div className="h-6 md:hidden"></div> {/* Extra space for mobile home bar */}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}