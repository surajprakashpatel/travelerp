"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/libs/firebase"; 
import toast from "react-hot-toast";
import { Lock, Mail, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login Error:", error);
      toast.error("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white md:bg-gray-50 font-sans">
      {/* --- Top Decorative Section (Mobile Flair) --- */}
      <div className="h-64 bg-gradient-to-br from-blue-700 to-blue-500 flex flex-col items-center justify-center text-white px-6 md:hidden rounded-b-[40px] shadow-lg">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-4 border border-white/30">
          <span className="text-4xl font-black">T</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight">Fleet Stack</h1>
        <p className="text-blue-100 font-medium opacity-90">Manage your fleet on the go</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-4 -mt-10 md:mt-0 " >
        <div className="w-full max-w-md bg-white md:rounded-[32px] md:shadow-xl md:border md:border-gray-100 p-4 md:p-10 rounded-2xl">
          
          {/* Desktop Logo Header */}
          <div className="hidden md:block text-center mb-10">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Fleet <span className="text-blue-600">Stack</span>
            </h1>
            <p className="text-gray-400 font-bold text-sm mt-1 uppercase tracking-widest">Administrator Login</p>
          </div>

          <div className="md:hidden mb-8 ">
            <h2 className="text-2xl font-black text-gray-900">Sign In</h2>
            <p className="text-gray-500 font-medium">Please enter your credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div className="group">
              <label className="block text-[11px] font-black uppercase text-gray-400 mb-1.5 ml-1 tracking-widest group-focus-within:text-blue-600 transition-colors">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="email"
                  inputMode="email"
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50 md:bg-white border border-gray-100 rounded-2xl text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-gray-300"
                  placeholder="admin@fleetstack.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="group">
              <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="text-[11px] font-black uppercase text-gray-400 tracking-widest group-focus-within:text-blue-600 transition-colors">
                  Password
                </label>
                <button type="button" className="text-[11px] font-bold text-blue-600 hover:underline">Forgot?</button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-12 pr-12 py-4 bg-gray-50 md:bg-white border border-gray-100 rounded-2xl text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium placeholder:text-gray-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full group relative flex items-center justify-center py-4 px-4 rounded-2xl text-white font-black text-lg transition-all active:scale-95 shadow-lg shadow-blue-100 ${
                loading 
                ? "bg-blue-400 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200"
              }`}
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  Sign In 
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
              &copy; {new Date().getFullYear()} Fleet Stack
            </p>
            <div className="flex justify-center gap-4 mt-4">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-200"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-200"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}