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
  Car, 
  Hash, 
  User, 
  Settings2, 
  ShieldCheck,
  Building2
} from "lucide-react";
import toast from "react-hot-toast";

interface Vehicle {
  id: string;
  number: string;
  model: string;
  type: string;
  owner: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    number: "",
    model: "",
    type: "Sedan",
    owner: "",
  });

  const fetchVehicles = async () => {
    try {
      if (!user) return;
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "agencies", user.uid, "vehicles"));
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Vehicle[];
      setVehicles(list);
      setFilteredVehicles(list);
    } catch (error) {
      toast.error("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, [user]);

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = vehicles.filter(
      (v) =>
        v.number.toLowerCase().includes(lowerSearch) ||
        v.model.toLowerCase().includes(lowerSearch) ||
        v.owner.toLowerCase().includes(lowerSearch)
    );
    setFilteredVehicles(filtered);
  }, [searchTerm, vehicles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.name === "number" ? e.target.value.toUpperCase() : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const openAddModal = () => {
    setFormData({ number: "", model: "", type: "Sedan", owner: "" });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setFormData({
      number: vehicle.number,
      model: vehicle.model,
      type: vehicle.type,
      owner: vehicle.owner || "",
    });
    setCurrentId(vehicle.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.number || !formData.model) return toast.error("Required fields missing");

    try {
      if (!user) return;
      const vehiclePath = collection(db, "agencies", user.uid, "vehicles");
      if (isEditing && currentId) {
        await updateDoc(doc(db, "agencies", user.uid, "vehicles", currentId), { ...formData });
        toast.success("Vehicle updated");
      } else {
        await addDoc(vehiclePath, { ...formData, createdAt: serverTimestamp() });
        toast.success("Vehicle added");
      }
      setIsModalOpen(false);
      fetchVehicles();
    } catch (error) { toast.error("Error saving vehicle"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vehicle?")) return;
    try {
      if (!user) return;
      await deleteDoc(doc(db, "agencies", user.uid, "vehicles", id));
      toast.success("Vehicle deleted");
      fetchVehicles();
    } catch (error) { toast.error("Error deleting vehicle"); }
  };

  const getTypeStyle = (type: string) => {
    switch(type) {
      case 'SUV': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Sedan': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Tempo': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Bus': return 'bg-orange-50 text-orange-700 border-orange-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24">
      {/* --- Mobile Header --- */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Fleet</h1>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{filteredVehicles.length} Registered</p>
        </div>
        <button onClick={openAddModal} className="hidden md:flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-100">
          <Plus className="h-5 w-5" /> Add Vehicle
        </button>
      </div>

      {/* --- Search --- */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search plate, model or owner..."
          className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-gray-900 focus:ring-4 focus:ring-blue-500/10 font-medium shadow-sm transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* --- Content Area --- */}
      <div className="mt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
             <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
             <p className="text-gray-400 font-bold text-sm">Inspecting fleet...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Registration</th>
                    <th className="px-6 py-4">Details</th>
                    <th className="px-6 py-4">Ownership</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-blue-50/20">
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center border-2 border-gray-800 rounded px-2 py-1 bg-white font-mono font-bold text-gray-900 shadow-sm">
                           {vehicle.number.toUpperCase()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{vehicle.model}</span>
                            <span className={`text-[10px] w-fit font-black px-2 py-0.5 rounded-full border mt-1 ${getTypeStyle(vehicle.type)}`}>
                                {vehicle.type}
                            </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                           {vehicle.owner || "Own Fleet"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <button onClick={() => openEditModal(vehicle)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(vehicle.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* --- Mobile Cards --- */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {filteredVehicles.map((vehicle) => (
                <div key={vehicle.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-3">
                        {/* Plate Look */}
                        <div className="inline-flex flex-col border-2 border-gray-900 rounded-lg overflow-hidden bg-white shadow-sm">
                            <div className="bg-blue-600 h-1.5 w-full"></div>
                            <div className="px-3 py-1 font-mono font-black text-lg text-gray-900 tracking-tight">
                                {vehicle.number.toUpperCase()}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 text-lg leading-tight">{vehicle.model}</h3>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${getTypeStyle(vehicle.type)}`}>
                                {vehicle.type}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => openEditModal(vehicle)} className="p-3 bg-gray-50 rounded-2xl text-blue-600 active:bg-blue-100">
                            <Settings2 className="h-5 w-5" />
                        </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                         <div className={`p-1.5 rounded-lg ${vehicle.owner ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {vehicle.owner ? <Building2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                         </div>
                         <span className="text-xs font-bold text-gray-500">{vehicle.owner || "Own Fleet Asset"}</span>
                    </div>
                    <button onClick={() => handleDelete(vehicle.id)} className="text-red-400 p-2">
                        <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* --- Modal / Bottom Sheet --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-[40px] md:rounded-[32px] shadow-2xl w-full max-w-md animate-in slide-in-from-bottom duration-300">
            <div className="md:hidden w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2"></div>
            
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-50">
              <h2 className="text-2xl font-black text-gray-900">{isEditing ? "Edit Vehicle" : "Add to Fleet"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Plate Number (Registration)</label>
                  <input 
                    name="number" 
                    placeholder="DL 01 AB 1234"
                    required 
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-5 py-4 focus:ring-2 focus:ring-blue-600 font-mono font-bold text-lg uppercase" 
                    value={formData.number} 
                    onChange={handleInputChange} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Model Name</label>
                    <input 
                      name="model" 
                      placeholder="e.g. Innova"
                      required 
                      className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-5 py-4 focus:ring-2 focus:ring-blue-600 font-bold" 
                      value={formData.model} 
                      onChange={handleInputChange} 
                    />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Segment</label>
                    <select 
                      name="type" 
                      className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-5 py-4 focus:ring-2 focus:ring-blue-600 font-bold appearance-none bg-white" 
                      value={formData.type} 
                      onChange={handleInputChange}
                    >
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="Tempo">Tempo</option>
                      <option value="Bus">Bus</option>
                    </select>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Ownership / Provider</label>
                  <input 
                    name="owner" 
                    placeholder="Empty for Own Fleet"
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-5 py-4 focus:ring-2 focus:ring-blue-600 font-bold" 
                    value={formData.owner} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black shadow-xl shadow-blue-100 transition-all active:scale-95">
                {isEditing ? "Update Vehicle" : "Register Vehicle"}
              </button>
              <div className="h-6 md:hidden"></div>
            </form>
          </div>
        </div>
      )}

      {/* --- Mobile FAB --- */}
      <button 
        onClick={openAddModal}
        className="md:hidden fixed bottom-24 right-6 h-16 w-16 bg-blue-600 rounded-full shadow-2xl flex items-center justify-center text-white z-40 active:scale-90 transition-transform"
      >
        <Plus className="h-10 w-10" />
      </button>
    </div>
  );
}