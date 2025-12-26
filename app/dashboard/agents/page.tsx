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
  Briefcase, 
  Phone, 
  MapPin, 
  MessageCircle, 
  MoreVertical,
  Building2
} from "lucide-react";
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
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    agencyName: "",
    mobile: "",
    officeCity: "",
  });

  const fetchAgents = async () => {
    try {
      if (!user?.uid) return;
      setLoading(true);
      const agentsRef = collection(db, "agencies", user.uid, "agents");
      const querySnapshot = await getDocs(agentsRef);
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
  }, [user?.uid]);

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
      if (!user?.uid) return;
      const agentsRef = collection(db, "agencies", user.uid, "agents");
      
      if (isEditing && currentId) {
        await updateDoc(doc(agentsRef, currentId), { ...formData });
        toast.success("Agent updated");
      } else {
        await addDoc(agentsRef, {
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
      if (!user?.uid) return;
      await deleteDoc(doc(db, "agencies", user.uid, "agents", id));
      toast.success("Agent deleted");
      fetchAgents();
    } catch (error) {
      toast.error("Error deleting agent");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24">
      {/* Header Section */}
      <div className="flex justify-between items-center px-1">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Agents</h1>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{filteredAgents.length} Partners</p>
        </div>
        <button 
          onClick={openAddModal} 
          className="hidden md:flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-100 font-bold"
        >
          <Plus className="h-5 w-5" /> Add Agent
        </button>
      </div>

      {/* Modern Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          placeholder="Search Agency, Name or City..."
          className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Main Content Area */}
      <div className="mt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-4">
             <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
             <p className="text-gray-400 font-bold text-sm">Loading database...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-[32px] border border-dashed border-gray-200">
            <Building2 className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-bold">No agents found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table (Hidden on Mobile) */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest">
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
                    <tr key={agent.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{agent.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                            <Briefcase className="h-4 w-4 text-gray-400" />
                            {agent.agencyName || "Independent"}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-600">{agent.mobile}</td>
                      <td className="px-6 py-4 text-gray-500">{agent.officeCity}</td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <button onClick={() => openEditModal(agent)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(agent.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Hidden on Desktop) */}
            <div className="md:hidden space-y-4">
              {filteredAgents.map((agent) => (
                <div key={agent.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <Briefcase className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 leading-tight">{agent.agencyName || "Independent Agent"}</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{agent.name}</p>
                        </div>
                    </div>
                    <button onClick={() => openEditModal(agent)} className="p-2 bg-gray-50 rounded-full text-gray-400">
                        <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                        <MapPin className="h-3.5 w-3.5" /> {agent.officeCity || "No City"}
                    </div>
                    <div className="text-xs font-bold text-gray-400">ID: {agent.id.slice(-5).toUpperCase()}</div>
                  </div>

                  {/* Mobile Quick Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <a 
                      href={`tel:${agent.mobile}`}
                      className="flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-2xl text-sm font-bold active:scale-95 transition-transform"
                    >
                      <Phone className="h-4 w-4 fill-white" /> Call Agent
                    </a>
                    <a 
                      href={`https://wa.me/${agent.mobile}`}
                      className="flex items-center justify-center gap-2 py-3.5 bg-[#25D366] text-white rounded-2xl text-sm font-bold active:scale-95 transition-transform"
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

      {/* Add/Edit Modal (Bottom Sheet on Mobile) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Mobile Indicator */}
            <div className="md:hidden w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2"></div>
            
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-50">
              <h2 className="text-2xl font-black text-gray-900">{isEditing ? "Edit Agent" : "New Agent"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Full Name</label>
                  <input 
                    name="name" 
                    required 
                    placeholder="John Doe"
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-5 py-4 focus:ring-2 focus:ring-blue-600 transition-all font-bold" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Agency / Company Name</label>
                  <input 
                    name="agencyName" 
                    placeholder="Travel Solutions Ltd"
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-5 py-4 focus:ring-2 focus:ring-blue-600 transition-all font-bold" 
                    value={formData.agencyName} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">WhatsApp / Mobile Number</label>
                  <input 
                    name="mobile" 
                    type="tel"
                    inputMode="tel"
                    required 
                    placeholder="+91 00000 00000"
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-5 py-4 focus:ring-2 focus:ring-blue-600 transition-all font-bold" 
                    value={formData.mobile} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest">Office City</label>
                  <input 
                    name="officeCity" 
                    placeholder="e.g. Mumbai"
                    className="w-full bg-gray-50 border-0 rounded-2xl text-gray-900 px-5 py-4 focus:ring-2 focus:ring-blue-600 transition-all font-bold" 
                    value={formData.officeCity} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" className="w-full py-4.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black shadow-xl shadow-blue-100 transition-all active:scale-95">
                  {isEditing ? "Update Partner" : "Register Agent"}
                </button>
                {isEditing && (
                    <button 
                        type="button"
                        onClick={() => handleDelete(currentId!)}
                        className="w-full py-3 text-red-500 font-bold text-sm"
                    >
                        Delete Agent Record
                    </button>
                )}
              </div>
              <div className="h-6 md:hidden"></div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button (Mobile Only) */}
      <button 
        onClick={openAddModal}
        className="md:hidden fixed bottom-24 right-6 h-16 w-16 bg-blue-600 rounded-full shadow-2xl flex items-center justify-center text-white z-40 active:scale-90 transition-transform"
      >
        <Plus className="h-10 w-10" />
      </button>
    </div>
  );
}