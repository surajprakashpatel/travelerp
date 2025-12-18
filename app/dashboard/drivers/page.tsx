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
import { Plus, Search, Pencil, Trash2, X, Car, FileText } from "lucide-react";
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
  }, []);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    if (!formData.name || !formData.mobile) {
      toast.error("Name and Mobile are required");
      return;
    }

    try {
      if (!user?.uid) return;
      if (isEditing && currentId) {
        await updateDoc(doc(db, "drivers", currentId), { ...formData });
        toast.success("Driver updated");
      } else {
        await addDoc(collection(db, "agencies", user.uid, "drivers"), {
          ...formData,
          createdAt: serverTimestamp(),
        });
        toast.success("Driver added");
      }
      setIsModalOpen(false);
      fetchDrivers();
    } catch (error) {
      toast.error("Error saving driver");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;
    try {
      await deleteDoc(doc(db, "drivers", id));
      toast.success("Driver deleted");
      fetchDrivers();
    } catch (error) {
      toast.error("Error deleting driver");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Driver Management</h1>
        <button onClick={openAddModal} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus className="h-4 w-4" /> Add Driver
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search Name, Mobile or License..."
          className="block w-full pl-10 pr-4 py-2 border border-gray-300 text-gray-800 rounded-lg focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading drivers...</div>
        ) : (
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="px-6 py-4">Driver Name</th>
                <th className="px-6 py-4">Mobile</th>
                <th className="px-6 py-4">License No.</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDrivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-500" />
                    {driver.name}
                  </td>
                  <td className="px-6 py-4">{driver.mobile}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                     <FileText className="h-3 w-3 text-gray-400" />
                     {driver.licenseNumber || "N/A"}
                  </td>
                  <td className="px-6 py-4 truncate max-w-xs">{driver.address || "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditModal(driver)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-2">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(driver.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg  text-gray-800 font-bold">{isEditing ? "Edit Driver" : "Add Driver"}</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Full Name *</label>
                <input name="name" required className="w-full border text-gray-800 rounded-lg px-3 py-2" value={formData.name} onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Mobile Number *</label>
                <input name="mobile" required className="w-full border text-gray-800 rounded-lg px-3 py-2" value={formData.mobile} onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Driving License No.</label>
                <input name="licenseNumber" className="w-full border text-gray-800 rounded-lg px-3 py-2" value={formData.licenseNumber} onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">Address</label>
                <input name="address" className="w-full border text-gray-800 rounded-lg px-3 py-2" value={formData.address} onChange={handleInputChange} />
              </div>
              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-2">
                {isEditing ? "Update Driver" : "Save Driver"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}