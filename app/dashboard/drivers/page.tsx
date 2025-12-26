"use client";

import { useState, useEffect } from "react";
import { db } from "@/libs/firebase";
import { useAuth } from "@/context/AuthContext";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  User, 
  FileText, 
  Phone, 
  MapPin, 
  MessageCircle,
  MoreVertical,
  ShieldCheck
} from "lucide-react";
import toast from "react-hot-toast";

interface Driver {
  id: string;
  name: string;
  mobile: string;
  licenseNumber: string;
  address: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    licenseNumber: "",
    address: "",
  });

  const fetchDrivers = async () => {
    try {
      if (!user?.uid) return;
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "agencies", user.uid, "drivers"));
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Driver[];
      setDrivers(list);
      setFilteredDrivers(list);
    } catch (error) {
      toast.error("Failed to fetch drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [user]);

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(lowerSearch) ||
        d.mobile.includes(lowerSearch) ||
        d.licenseNumber.toLowerCase().includes(lowerSearch)
    );
    setFilteredDrivers(filtered);
  }, [searchTerm, drivers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.name === "licenseNumber" ? e.target.value.toUpperCase() : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const openAddModal = () => {
    setFormData({ name: "", mobile: "", licenseNumber: "", address: "" });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (driver: Driver) => {
    setFormData({
      name: driver.name,
      mobile: driver.mobile,
      licenseNumber: driver.licenseNumber,
      address: driver.address,
    });
    setCurrentId(driver.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) return toast.error("Required fields missing");

    try {
      if (!user?.uid) return;
      const driversRef = collection(db, "agencies", user.uid, "drivers");
      if (isEditing && currentId) {
        await updateDoc(doc(db, "agencies", user.uid, "drivers", currentId), { ...formData });
        toast.success("Driver profile updated");
      } else {
        await addDoc(driversRef, { ...formData, createdAt: serverTimestamp() });
        toast.success("New driver added");
      }
      setIsModalOpen(false);
      fetchDrivers();
    } catch (error) { toast.error("Error saving driver"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this driver from the database?")) return;
    try {
      if (!user?.uid) return;
      await deleteDoc(doc(db, "agencies", user.uid, "drivers", id));
      toast.success("Driver deleted");
      fetchDrivers();
    } catch (error) { toast.error("Error deleting driver"); }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24">
      {/* --- Header --- */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Drivers</h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">{filteredDrivers.length} On Duty</p>
        </div>
        <button onClick={openAddModal} className="hidden md:flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-100">
          <Plus className="h-5 w-5" /> Add Driver
        </button>
      </div>

      {/* --- Search Bar --- */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search name, mobile or license..."
          className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-gray-900 focus:ring-4 focus:ring-blue-500/10 font-medium shadow-sm transition-all placeholder:text-gray-300"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* --- List Area --- */}
      <div className="mt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
             <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
             <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Checking roster...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Driver</th>
                    <th className="px-6 py-4">License Information</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-blue-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                {driver.name.charAt(0)}
                            </div>
                            <span className="font-bold text-gray-900">{driver.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-mono text-xs font-bold text-gray-500 bg-gray-50 w-fit px-3 py-1.5 rounded-lg border border-gray-100">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                            {driver.licenseNumber || "NO LICENSE"}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{driver.mobile}</td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <button onClick={() => openEditModal(driver)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(driver.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --- Mobile Driver Cards --- */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {filteredDrivers.map((driver) => (
                <div key={driver.id} className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-100 active:scale-[0.98] transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-100">
                            {driver.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 text-lg leading-tight">{driver.name}</h3>
                            <div className="flex items-center gap-1.5 mt-1">
                                <FileText className="h-3 w-3 text-gray-400" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {driver.licenseNumber || "License Missing"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => openEditModal(driver)} className="p-2 bg-gray-50 rounded-full text-gray-400">
                        <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>

                  {driver.address && (
                    <div className="flex items-start gap-3 px-1 mb-6">
                        <MapPin className="h-4 w-4 text-gray-300 mt-0.5" />
                        <p className="text-xs font-bold text-gray-400 leading-relaxed line-clamp-1">{driver.address}</p>
                    </div>
                  )}

                  {/* Quick Actions Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <a 
                      href={`tel:${driver.mobile}`}
                      className="flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl text-sm font-black active:scale-95 transition-transform"
                    >
                      <Phone className="h-4 w-4 fill-white" /> Call Driver
                    </a>
                    <a 
                      href={`https://wa.me/${driver.mobile}`}
                      className="flex items-center justify-center gap-2 py-4 bg-[#25D366] text-white rounded-2xl text-sm font-black active:scale-95 transition-transform"
                    >
                      <MessageCircle className="h-5 w-5 fill-white" /> WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* --- Modal / Bottom Sheet --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-[40px] md:rounded-[32px] shadow-2xl w-full max-w-md animate-in slide-in-from-bottom duration-300">
            <div className="md:hidden w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2"></div>
            
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-50">
              <h2 className="text-2xl font-black text-gray-900">{isEditing ? "Edit Driver" : "Add Driver"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 transition-colors active:bg-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Full Name</label>
                  <input 
                    name="name" 
                    required 
                    placeholder="Enter full name"
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-5 py-4 focus:ring-2 focus:ring-blue-600 font-bold transition-all" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Phone Number</label>
                  <input 
                    name="mobile" 
                    type="tel"
                    inputMode="tel"
                    required 
                    placeholder="+91 00000 00000"
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-5 py-4 focus:ring-2 focus:ring-blue-600 font-bold transition-all" 
                    value={formData.mobile} 
                    onChange={handleInputChange} 
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Driving License Number</label>
                  <input 
                    name="licenseNumber" 
                    placeholder="e.g. DL-042021000..."
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-5 py-4 focus:ring-2 focus:ring-blue-600 font-mono font-bold uppercase transition-all" 
                    value={formData.licenseNumber} 
                    onChange={handleInputChange} 
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Home Address</label>
                  <textarea 
                    name="address" 
                    rows={2}
                    placeholder="Physical address for records"
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-5 py-4 focus:ring-2 focus:ring-blue-600 font-bold resize-none transition-all" 
                    value={formData.address} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black shadow-xl shadow-blue-100 transition-all active:scale-95">
                  {isEditing ? "Update Profile" : "Register Driver"}
                </button>
                {isEditing && (
                    <button 
                        type="button"
                        onClick={() => handleDelete(currentId!)}
                        className="w-full py-2 text-red-500 font-bold text-xs uppercase tracking-widest opacity-60 hover:opacity-100"
                    >
                        Delete Record
                    </button>
                )}
              </div>
              <div className="h-6 md:hidden"></div>
            </form>
          </div>
        </div>
      )}

      {/* --- Mobile FAB --- */}
      <button 
        onClick={openAddModal}
        className="md:hidden fixed bottom-24 right-6 h-16 w-16 bg-blue-600 rounded-full shadow-2xl flex items-center justify-center text-white z-[60] active:scale-90 transition-transform"
      >
        <Plus className="h-10 w-10" />
      </button>
    </div>
  );
}