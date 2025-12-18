"use client";

import { useState } from "react";
import { auth, db } from "@/libs/firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

export default function CreateAgencyPage() {
  const [formData, setFormData] = useState({
    agencyName: "",
    ownerName: "",
    email: "",
    password: "", // You set a temporary password for them
    mobile: ""
  });
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create Auth User (This logs them in automatically)
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      const uid = userCredential.user.uid;

      // 2. Create the Agency Document using UID as the Key
      await setDoc(doc(db, "agencies", uid), {
        agencyName: formData.agencyName,
        ownerName: formData.ownerName,
        email: formData.email,
        mobile: formData.mobile,
        plan: "Standard", // Default plan
        createdAt: serverTimestamp(),
      });

      toast.success(`Agency Created Successfully!`);
      toast.success(`UID: ${uid}`);

      // 3. Important: Sign out the new user immediately 
      // so you (the admin) don't get stuck in their account
      await signOut(auth);
      
      // 4. Reset Form
      setFormData({ agencyName: "", ownerName: "", email: "", password: "", mobile: "" });
      alert("Success! The new agency account is ready. Please log back in as Admin if needed.");
      
      // Optional: Redirect to login or stay here
      // window.location.href = "/"; 

    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg border border-gray-200">
        <h1 className="text-2xl font-bold text-blue-800 mb-2">Create New Agency Account</h1>
        <p className="text-gray-500 mb-6 text-sm">Sell the ERP: Generate credentials for a new client.</p>
        
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Agency / Travels Name</label>
            <input name="agencyName" value={formData.agencyName} onChange={handleChange} required 
              className="w-full border p-2 rounded-lg mt-1" placeholder="e.g. Royal Travels" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner Name</label>
            <input name="ownerName" value={formData.ownerName} onChange={handleChange} required 
              className="w-full border p-2 rounded-lg mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700">Mobile</label>
               <input name="mobile" value={formData.mobile} onChange={handleChange} required 
                 className="w-full border p-2 rounded-lg mt-1" />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700">Plan</label>
               <select className="w-full border p-2 rounded-lg mt-1 bg-white">
                 <option>Standard</option>
                 <option>Premium</option>
               </select>
             </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg space-y-3 border border-blue-100">
            <h3 className="font-semibold text-blue-800 text-sm">Login Credentials</h3>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Email (Login ID)</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required 
                className="w-full border p-2 rounded bg-white mt-1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Password</label>
              <input type="text" name="password" value={formData.password} onChange={handleChange} required 
                className="w-full border p-2 rounded bg-white mt-1" placeholder="Create a temporary password" />
            </div>
          </div>

          <button disabled={loading} className="w-full bg-blue-700 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition">
            {loading ? "Creating..." : "Generate Account"}
          </button>
        </form>
      </div>
    </div>
  );
}