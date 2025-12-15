"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/libs/firebase";
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { MapPin, Calendar, User, Clock, CheckCircle, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function CreateTripPage() {
  const router = useRouter();
  
  // State for data
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    clientId: "",
    tripType: "One Way", // One Way, Round Trip, Rental
    pickupLocation: "",
    dropLocation: "",
    startDate: "",
    startTime: "",
    notes: "",
  });

  // 1. Fetch Clients for Dropdown
  useEffect(() => {
    const fetchClients = async () => {
      try {
        // Fetch clients sorted by name for easier searching
        const q = query(collection(db, "clients"), orderBy("name"));
        const snapshot = await getDocs(q);
        const clientList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClients(clientList);
      } catch (error) {
        toast.error("Error loading clients list");
        console.error(error);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  // 2. Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 3. Submit Trip
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!formData.clientId) {
      toast.error("Please select a client");
      setSubmitting(false);
      return;
    }

    try {
      // Find client name for easier display later
      const selectedClient = clients.find(c => c.id === formData.clientId);
      const clientName = selectedClient ? selectedClient.name : "Unknown";

      // Generate a readable Trip ID (e.g., TRIP-8921)
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const tripId = `TRIP-${randomId}`;

      await addDoc(collection(db, "bookings"), {
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
        status: "Pending", // Important: Starts as Pending
        createdAt: serverTimestamp(),
        // Fields for later steps (initially null)
        assignedDriverId: null,
        assignedVehicleId: null,
        assignedAgentId: null,
      });

      toast.success(`Trip Created! ID: ${tripId}`);
      router.push("/dashboard/bookings"); // Redirect to booking list
    } catch (error) {
      console.error(error);
      toast.error("Failed to create trip");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 bg-white rounded-full border shadow-sm hover:bg-gray-50">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Create New Trip</h1>
          <p className="text-gray-500 text-sm">Fill in the details to generate a new trip request.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Section 1: Client Details */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            Client Selection
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Client *</label>
              {loadingClients ? (
                <div className="text-sm text-gray-400">Loading clients...</div>
              ) : (
                <select
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  required
                  className="w-full border text-gray-900 border-gray-300 rounded-lg px-3 py-2.5 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">-- Choose a Client --</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.mobile})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Don't see the client? <Link href="/dashboard/clients" className="text-blue-600 hover:underline">Add new client here</Link>
              </p>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Trip Type</label>
              <select
                name="tripType"
                value={formData.tripType}
                onChange={handleChange}
                className="w-full border text-gray-900 border-gray-300 rounded-lg px-3 py-2.5 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="One Way">One Way</option>
                <option value="Round Trip">Round Trip</option>
                <option value="Rental (8hr/80km)">Rental (8hr/80km)</option>
                <option value="Rental (12hr/300km)">Rental (12hr/300km)</option>
                <option value="Outstation">Outstation</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Route & Time */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-blue-600" />
            Route & Timing
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location *</label>
              <input
                type="text"
                name="pickupLocation"
                value={formData.pickupLocation}
                onChange={handleChange}
                placeholder="e.g. Airport Terminal 1"
                required
                className="w-full border text-gray-900 border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Drop Location *</label>
              <input
                type="text"
                name="dropLocation"
                value={formData.dropLocation}
                onChange={handleChange}
                placeholder="e.g. Hotel Grand Central"
                required
                className="w-full border border-gray-300 text-gray-900 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="w-full border text-gray-900 border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Time *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                  className="w-full border text-gray-900 border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Notes */}
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes (Optional)</label>
          <textarea
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Flight number, special luggage request, etc."
            className="w-full border text-gray-900 border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
          <Link 
            href="/dashboard"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={`flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm ${
              submitting ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {submitting ? "Creating..." : (
              <>
                <CheckCircle className="h-4 w-4" />
                Create Trip
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}