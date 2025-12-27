"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/libs/firebase";
import { useAuth } from "@/context/AuthContext";
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { MapPin, Calendar, User, Clock, CheckCircle, ArrowLeft, Search, Check, Info, MoreHorizontal } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function CreateTripPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form State (Same as original)
  const [formData, setFormData] = useState({
    clientId: "",
    tripType: "One Way",
    pickupLocation: "",
    dropLocation: "",
    startDate: "",
    startTime: "",
    notes: "",
  });

  const [timeUI, setTimeUI] = useState({
    hour: "12",
    minute: "00",
    period: "AM",
  });

  // --- LOGIC REMAINS EXACTLY THE SAME ---

  useEffect(() => {
    const fetchClients = async () => {
      try {
        if (!user) return;
        const q = query(collection(db, "agencies", user.uid, "clients"), orderBy("name"));
        const snapshot = await getDocs(q);
        const clientList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClients(clientList);
      } catch (error) {
        toast.error("Error loading clients list");
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const update24HourTime = (hour: string, minute: string, period: string) => {
    let h = parseInt(hour);
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    const formattedTime = `${h.toString().padStart(2, "0")}:${minute}`;
    setFormData(prev => ({ ...prev, startTime: formattedTime }));
  };

  const handleTimeUIChange = (name: string, value: string) => {
    const newTime = { ...timeUI, [name]: value };
    setTimeUI(newTime);
    update24HourTime(newTime.hour, newTime.minute, newTime.period);
  };

  useEffect(() => {
    update24HourTime(timeUI.hour, timeUI.minute, timeUI.period);
  }, []);

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.mobile.includes(searchTerm)
  );

  const selectedClient = clients.find(c => c.id === formData.clientId);

  const handleSelectClient = (client: any) => {
    setFormData(prev => ({ ...prev, clientId: client.id }));
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (!formData.clientId) {
      toast.error("Please select a client");
      setSubmitting(false);
      return;
    }
    try {
      if (!user) return;
      const selectedClient = clients.find(c => c.id === formData.clientId);
      const clientName = selectedClient ? selectedClient.name : "Unknown";
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const tripId = `TRIP-${randomId}`;

      await addDoc(collection(db, "agencies", user.uid, "bookings"), {
        tripId: tripId,
        clientId: formData.clientId,
        clientName: clientName,
        clientPhone: selectedClient?.mobile || "",
        pickup: formData.pickupLocation,
        drop: formData.dropLocation,
        date: formData.startDate,
        time: formData.startTime,
        tripType: formData.tripType,
        notes: formData.notes,
        status: "Pending",
        createdAt: serverTimestamp(),
        assignedDriverId: null,
        assignedVehicleId: null,
        assignedAgentId: null,
      });

      toast.success(`Trip Created! ID: ${tripId}`);
      router.push("/dashboard/bookings");
    } catch (error) {
      toast.error("Failed to create trip");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4 px-1">
  
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">New Trip</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Create New Trip</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-1">
        
        {/* Card 1: Client & Type */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Customer Details</h2>
          </div>
          
          <div className="space-y-4">
            {/* Searchable Client Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Search Client</label>
              <div 
                className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-blue-600 transition-all"
                onClick={() => setIsOpen(!isOpen)}
              >
                <span className={`font-bold ${selectedClient ? "text-slate-900" : "text-slate-400"}`}>
                  {selectedClient ? `${selectedClient.name} (${selectedClient.mobile})` : "Name or Phone..."}
                </span>
                <Search className="h-5 w-5 text-slate-400" />
              </div>

              {isOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-3 border-b border-slate-50">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Type to search..."
                      className="w-full px-4 py-3 text-sm font-bold bg-slate-50 border-0 rounded-xl focus:ring-0 outline-none text-slate-900"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {loadingClients ? (
                      <div className="p-4 text-center text-xs font-bold text-slate-400">LOADING...</div>
                    ) : filteredClients.length > 0 ? (
                      filteredClients.map((client) => (
                        <div
                          key={client.id}
                          className={`px-5 py-4 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0 ${formData.clientId === client.id ? "bg-blue-50" : ""}`}
                          onClick={() => handleSelectClient(client)}
                        >
                          <div>
                            <div className="text-sm font-black text-slate-900">{client.name}</div>
                            <div className="text-xs font-bold text-slate-400">{client.mobile}</div>
                          </div>
                          {formData.clientId === client.id && <Check className="h-5 w-5 text-blue-600" />}
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs font-bold text-slate-400">NO CLIENTS FOUND</div>
                    )}
                  </div>
                  <Link href="/dashboard/clients" className="block text-center py-4 bg-slate-50 text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest border-t border-slate-100">
                    + Register New Client
                  </Link>
                </div>
              )}
            </div>

            {/* Trip Type - Modern Selection Chips */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Service Type</label>
              <div className="flex flex-wrap gap-2">
                {["One Way", "Round Trip", "Rental (8hr/80km)", "Outstation"].map((type) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, tripType: type }))}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border ${
                            formData.tripType === type 
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg" 
                            : "bg-white text-slate-500 border-slate-200"
                        }`}
                    >
                        {type}
                    </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Route Visualizer */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Route Info</h2>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center py-8">
                <div className="w-3 h-3 rounded-full border-2 border-blue-600 bg-white" />
                <div className="w-0.5 flex-1 bg-dashed border-l-2 border-slate-200 my-1" />
                <div className="w-3 h-3 rounded-full bg-blue-600" />
            </div>
            <div className="flex-1 space-y-4">
                <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Pickup Point</label>
                    <input
                        type="text" name="pickupLocation" value={formData.pickupLocation} onChange={handleChange}
                        placeholder="Airport, Home, Office..." required
                        className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-blue-600"
                    />
                </div>
                <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Drop Point</label>
                    <input
                        type="text" name="dropLocation" value={formData.dropLocation} onChange={handleChange}
                        placeholder="Destination address..." required
                        className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-blue-600"
                    />
                </div>
            </div>
          </div>
        </div>

        {/* Card 3: Date & Time */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Schedule</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Trip Date</label>
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="date" name="startDate" value={formData.startDate} onChange={handleChange} required
                  className="w-full bg-slate-50 border-0 rounded-2xl pl-14 pr-5 py-4 font-black text-slate-900 focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Pickup Time</label>
                <div className="grid grid-cols-3 gap-2">
                    <select
                        value={timeUI.hour}
                        onChange={(e) => handleTimeUIChange("hour", e.target.value)}
                        className="bg-slate-50 border-0 rounded-2xl px-2 py-4 font-black text-slate-900 focus:ring-2 focus:ring-blue-600 appearance-none text-center"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                            <option key={h} value={h.toString().padStart(2, "0")}>{h.toString().padStart(2, "0")}</option>
                        ))}
                    </select>

                    <select
                        value={timeUI.minute}
                        onChange={(e) => handleTimeUIChange("minute", e.target.value)}
                        className="bg-slate-50 border-0 rounded-2xl px-2 py-4 font-black text-slate-900 focus:ring-2 focus:ring-blue-600 appearance-none text-center"
                    >
                        {["00", "15", "30", "45"].map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>

                    <select
                        value={timeUI.period}
                        onChange={(e) => handleTimeUIChange("period", e.target.value)}
                        className="bg-slate-50 border-0 rounded-2xl px-2 py-4 font-black text-slate-900 focus:ring-2 focus:ring-blue-600 appearance-none text-center"
                    >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                    </select>
                </div>
            </div>
          </div>
        </div>

        {/* Section 4: Notes */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Special Instructions</label>
          <textarea
            name="notes" rows={3} value={formData.notes} onChange={handleChange}
            placeholder="e.g. Flight UK-812, Extra luggage, Child seat required..."
            className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 resize-none"
          ></textarea>
        </div>

        {/* App-Style Footer Action Bar */}
        <div className="fixed bottom-0 pb-20 left-0 right-0 md:static bg-white border-t border-slate-100 p-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] md:shadow-none md:bg-transparent md:border-0 md:p-0">
          <div className="flex gap-3 max-w-2xl mx-auto">
             <Link href="/dashboard" className="flex-1 py-4 text-center font-black text-slate-500 bg-slate-50 rounded-2xl active:scale-95 transition-all">Cancel</Link>
             <button
                type="submit" disabled={submitting}
                className={`flex-[2] flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all ${submitting ? "opacity-70" : ""}`}
              >
                {submitting ? "Processing..." : (<><CheckCircle className="h-5 w-5" /> Confirm Trip</>)}
              </button>
          </div>
        </div>

      </form>
    </div>
  );
}