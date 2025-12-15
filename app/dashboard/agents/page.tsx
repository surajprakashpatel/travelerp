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
import { Plus, Search, Pencil, Trash2, X, Briefcase, Phone, MapPin } from "lucide-react";
import toast from "react-hot-toast";

interface Agent {
  id: string;
  name: string;
  agencyName: string;
  mobile: string;
  officeCity: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    agencyName: "",
    mobile: "",
    officeCity: "",
  });

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "agents"));
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Agent[];
      setAgents(list);
      setFilteredAgents(list);
    } catch (error) {
      toast.error("Failed to fetch agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const filtered = agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(lowerSearch) ||
        agent.agencyName.toLowerCase().includes(lowerSearch) ||
        agent.officeCity.toLowerCase().includes(lowerSearch)
    );
    setFilteredAgents(filtered);
  }, [searchTerm, agents]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setFormData({ name: "", agencyName: "", mobile: "", officeCity: "" });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (agent: Agent) => {
    setFormData({
      name: agent.name,
      agencyName: agent.agencyName,
      mobile: agent.mobile,
      officeCity: agent.officeCity,
    });
    setCurrentId(agent.id);
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
      if (isEditing && currentId) {
        await updateDoc(doc(db, "agents", currentId), { ...formData });
        toast.success("Agent updated");
      } else {
        await addDoc(collection(db, "agents"), {
          ...formData,
          createdAt: serverTimestamp(),
        });
        toast.success("Agent added");
      }
      setIsModalOpen(false);
      fetchAgents();
    } catch (error) {
      toast.error("Error saving agent");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;
    try {
      await deleteDoc(doc(db, "agents", id));
      toast.success("Agent deleted");
      fetchAgents();
    } catch (error) {
      toast.error("Error deleting agent");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Agent Database</h1>
        <button onClick={openAddModal} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus className="h-4 w-4" /> Add Agent
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search Agency, Name or City..."
          className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading agents...</div>
        ) : (
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="px-6 py-4">Agent Name</th>
                <th className="px-6 py-4">Agency / Company</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{agent.name}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <Briefcase className="h-3 w-3 text-gray-400" />
                    {agent.agencyName || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-gray-400" />
                      {agent.mobile}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      {agent.officeCity}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEditModal(agent)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded mr-2">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(agent.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
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
              <h2 className="text-lg text-gray-900 font-bold">{isEditing ? "Edit Agent" : "Add Agent"}</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-900 font-medium mb-1">Agent Name *</label>
                <input name="name" required className="w-full border text-gray-900 rounded-lg px-3 py-2" value={formData.name} onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm text-gray-900 font-medium mb-1">Agency Name</label>
                <input name="agencyName" className="w-full border text-gray-900 rounded-lg px-3 py-2" value={formData.agencyName} onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm text-gray-900 font-medium mb-1">Mobile Number *</label>
                <input name="mobile" required className="w-full border text-gray-900 rounded-lg px-3 py-2" value={formData.mobile} onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm text-gray-900 font-medium mb-1">City</label>
                <input name="officeCity" className="w-full border text-gray-900 rounded-lg px-3 py-2" value={formData.officeCity} onChange={handleInputChange} />
              </div>
              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-2">
                {isEditing ? "Update Agent" : "Save Agent"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}