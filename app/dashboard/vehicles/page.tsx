"use client";

import { useState, useEffect } from "react";
import { db } from "@/libs/firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { Plus, Search, Pencil, Trash2, X, Car, Hash, User } from "lucide-react";
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
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    number: "",
    model: "",
    type: "Sedan", // Default
    owner: "",
  });

  // --- Fetch Data ---
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "vehicles"));
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

  useEffect(() => {
    fetchVehicles();
  }, []);

  // --- Search Logic ---
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

  // --- Form Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    if (!formData.number || !formData.model) {
      toast.error("Vehicle Number and Model are required");
      return;
    }

    try {
      if (isEditing && currentId) {
        await updateDoc(doc(db, "vehicles", currentId), { ...formData });
        toast.success("Vehicle updated");
      } else {
        await addDoc(collection(db, "vehicles"), {
          ...formData,
          createdAt: serverTimestamp(),
        });
        toast.success("Vehicle added");
      }
      setIsModalOpen(false);
      fetchVehicles();
    } catch (error) {
      toast.error("Error saving vehicle");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await deleteDoc(doc(db, "vehicles", id));
      toast.success("Vehicle deleted");
      fetchVehicles();
    } catch (error) {
      toast.error("Error deleting vehicle");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Vehicle Database</h1>
        <button onClick={openAddModal} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search Number, Model or Owner..."
          className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading vehicles...</div>
        ) : (
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="px-6 py-4">Vehicle Number</th>
                <th className="px-6 py-4">Model & Type</th>
                <th className="px-6 py-4">Owner / Agency</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-blue-500" />
                    {vehicle.number.toUpperCase()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-400" />
                      <span>{vehicle.model}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 border border-gray-200">
                        {vehicle.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <User className="h-3 w-3 text-gray-400" />
                       {vehicle.owner || "Own Fleet"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditModal(vehicle)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-2">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(vehicle.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg font-bold">{isEditing ? "Edit Vehicle" : "Add Vehicle"}</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle Number (Plate) *</label>
                <input 
                  name="number" 
                  placeholder="e.g. WB 02 AK 1234"
                  required 
                  className="w-full border rounded-lg px-3 py-2 uppercase" 
                  value={formData.number} 
                  onChange={handleInputChange} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Model *</label>
                  <input 
                    name="model" 
                    placeholder="e.g. Innova Crysta"
                    required 
                    className="w-full border rounded-lg px-3 py-2" 
                    value={formData.model} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select 
                    name="type" 
                    className="w-full border rounded-lg px-3 py-2 bg-white" 
                    value={formData.type} 
                    onChange={handleInputChange}
                  >
                    <option value="Sedan">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="Tempo">Tempo Traveller</option>
                    <option value="Bus">Bus</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Owner / Agency Name</label>
                <input 
                  name="owner" 
                  placeholder="Leave empty if Own Fleet"
                  className="w-full border rounded-lg px-3 py-2" 
                  value={formData.owner} 
                  onChange={handleInputChange} 
                />
              </div>

              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-2">
                {isEditing ? "Update Vehicle" : "Save Vehicle"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}