"use client";

import { useState, useEffect } from "react";
import { db } from "@/libs/firebase";
import {useAuth} from "@/context/AuthContext";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import {  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Pencil, 
  Trash2, 
  X, 
  MessageCircle, 
  MoreVertical,
  User } from "lucide-react";
import toast from "react-hot-toast";

// Define the Client interface
interface Client {
  id: string;
  name: string;
  mobile: string;
  address: string;
  email: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
  });

  // --- 1. Fetch Data ---
  const fetchClients = async () => {
    try {
      if(!user?.uid) {  return; }
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "agencies", user.uid, "clients"));
      const clientList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Client[];
      
      setClients(clientList);
      setFilteredClients(clientList);
    } catch (error) {
      toast.error("Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // --- 2. Search Logic ---
  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(lowerSearch) ||
        client.mobile.includes(lowerSearch)
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  // --- 3. Form Handling ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData({ name: "", mobile: "", email: "", address: "" });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setFormData({
      name: client.name,
      mobile: client.mobile,
      email: client.email || "",
      address: client.address || "",
    });
    setCurrentId(client.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) {
      toast.error("Name and Mobile are required");
      return;
    }

    try {
      if (!user?.uid) {
        return;
      }
      if (isEditing && currentId) {
        // Update existing
        const clientRef = doc(db, "agencies", user.uid, "clients", currentId);
        await updateDoc(clientRef, { ...formData });
        toast.success("Client updated successfully");
      } else {
        // Add new
         const clientsRef = collection(db, "agencies", user.uid, "clients");
        await addDoc(clientsRef, { ...formData });
        toast.success("Client added successfully");
      }
      setIsModalOpen(false);
      fetchClients(); // Refresh list
    } catch (error) {
      console.error(error);
      toast.error("Error saving client");
    }
  };

  // --- 4. Delete Logic ---
  const handleDelete = async (id: string) => {
    if (!user?.uid) { return; }
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      await deleteDoc(doc(db, "agencies", user.uid, "clients", id));
      toast.success("Client deleted");
      fetchClients();
    } catch (error) {
      toast.error("Error deleting client");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24">
      {/* --- Header & Search Section --- */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Clients</h1>
          <button
            onClick={openAddModal}
            className="hidden md:flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-100"
          >
            <Plus className="h-4 w-4" /> Add Client
          </button>
        </div>

        {/* Search Bar - App Style */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search by name or phone..."
            className="block w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- Client List Area --- */}
      <div className="mt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
             <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
             <p className="text-gray-500 text-sm font-medium">Fetching clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <User className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No clients found matching your search.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on Mobile) */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[11px] tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredClients.map((client: any) => (
                    <tr key={client.id} className="hover:bg-blue-50/30 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                {client.name.charAt(0)}
                            </div>
                            <span className="font-bold text-gray-900">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-gray-700 font-medium">
                            <Phone className="h-3 w-3 text-gray-400" /> {client.mobile}
                          </div>
                          {client.email && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                <Mail className="h-3 w-3" /> {client.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate">
                        {client.address ? (
                          <div className="flex items-center gap-2 text-gray-500">
                            <MapPin className="h-3 w-3 text-gray-400" /> {client.address}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEditModal(client)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(client.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Hidden on Desktop) */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {filteredClients.map((client: any) => (
                <div key={client.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-100">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900">{client.name}</h3>
                        <p className="text-xs text-gray-400 font-medium">Client ID: {client.id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => openEditModal(client)} className="p-2 bg-gray-50 text-gray-400 rounded-full"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(client.id)} className="p-2 bg-red-50 text-red-400 rounded-full"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>

                  <div className="space-y-3 mb-5 px-1">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                            <Phone className="h-4 w-4 text-gray-400" />
                        </div>
                        <span className="font-bold">{client.mobile}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <span className="font-medium truncate">{client.email}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-gray-400" />
                        </div>
                        <span className="text-xs text-gray-500 leading-snug flex-1">{client.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Mobile Quick Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <a 
                      href={`tel:${client.mobile}`} 
                      className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-100 active:scale-95 transition-transform"
                    >
                      <Phone className="h-4 w-4 fill-white" /> Call Now
                    </a>
                    <a 
                      href={`https://wa.me/${client.mobile}`} 
                      className="flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-sm font-bold shadow-md shadow-green-100 active:scale-95 transition-transform"
                    >
                      <MessageCircle className="h-4 w-4 fill-white" /> WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* --- Add/Edit Modal (Bottom Sheet on Mobile) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-[32px] md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="md:hidden w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2"></div>
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
              <h2 className="text-xl font-black text-gray-900">
                {isEditing ? "Update Profile" : "New Client"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Enter client name"
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-4 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">WhatsApp Number</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    name="mobile"
                    required
                    placeholder="+91 00000 00000"
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-4 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    value={formData.mobile}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Email Address (Optional)</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="client@email.com"
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-4 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Address</label>
                  <textarea
                    name="address"
                    placeholder="Physical address..."
                    rows={3}
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-4 py-3.5 focus:ring-2 focus:ring-blue-500 transition-all font-medium resize-none"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all"
                >
                  {isEditing ? "Save Changes" : "Create Client"}
                </button>
              </div>
              <div className="h-4 md:hidden"></div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button */}
      <button 
        onClick={openAddModal}
        className="md:hidden fixed bottom-24 right-6 h-14 w-14 bg-blue-600 rounded-full shadow-xl flex items-center justify-center text-white z-40 active:scale-90 transition-transform"
      >
        <Plus className="h-8 w-8" />
      </button>
    </div>
  );
}