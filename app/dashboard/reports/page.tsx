"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/libs/firebase";
import { useAuth } from "@/context/AuthContext";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy,
  arrayUnion,
  serverTimestamp 
} from "firebase/firestore";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { 
  TrendingUp, AlertCircle, Wallet, Download, Users, Briefcase, 
  Map as MapIcon, Search, LayoutDashboard, IndianRupee, Save, X, 
  Car, User, ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";

interface Bill {
  id: string;
  tripId: string;
  bookingId?: string;  
  clientName: string;
  agentName?: string;
  grandTotal: number;
  balanceDue: number;
  advance: number;
  vehicleNumber?: string; 
  driverName?: string; 
  dateStr: string;
  payments?: Array<{
    amount: number;
    date: string;
    note: string;
    timestamp: number;
  }>;
}

export default function ReportsPage() {
  // --- KEEPING YOUR ORIGINAL LOGIC UNTOUCHED ---
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "client" | "agent" | "trip" | "vehicle" | "driver">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalDue: 0,
    paidBills: 0,
    pendingBills: 0,
    totalPaid: 0,
  });

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);

  const fetchReportData = async () => {
    try {
      if (!user?.uid) return;
      setLoading(true);
      const billsQuery = query(collection(db, "agencies", user.uid, "bills"), orderBy("billDate", "desc"));
      const billsSnapshot = await getDocs(billsQuery);
      const bookingsQuery = collection(db, "agencies", user.uid, "bookings");
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsMap = new Map();
      bookingsSnapshot.docs.forEach(doc => { bookingsMap.set(doc.id, doc.data()); });
      
      const fetchedBills: Bill[] = billsSnapshot.docs.map(doc => {
        const data = doc.data();
        const dateObj = data.billDate && typeof data.billDate.toDate === 'function' ? data.billDate.toDate() : new Date();
        const bookingId = data.bookingId;
        const bookingData = bookingId ? bookingsMap.get(bookingId) : null;

        return {
          id: doc.id,
          tripId: data.tripId || "N/A",
          bookingId: bookingId || null,
          clientName: data.clientName || "Unknown",
          agentName: data.agentName || "Direct Booking",
          vehicleNumber: bookingData?.assignedVehicleNumber || "N/A",
          driverName: bookingData?.assignedDriverName || "N/A",
          grandTotal: data.grandTotal || 0,
          balanceDue: data.balanceDue || 0,
          advance: data.advance || 0,
          dateStr: dateObj.toLocaleDateString(),
          payments: data.payments || []
        };
      });
      setBills(fetchedBills);
      processStats(fetchedBills);
    } catch (error) {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user?.uid) fetchReportData(); }, [user]);

  const processStats = (data: Bill[]) => {
    let totalRev = 0, totalDue = 0, totalPaid = 0, paidCount = 0, dueCount = 0;
    data.forEach(bill => {
      totalRev += bill.grandTotal || 0;
      totalDue += bill.balanceDue || 0;
      totalPaid += (bill.grandTotal - bill.balanceDue) || 0;
      if (bill.balanceDue > 0) dueCount++; else paidCount++;
    });
    setStats({ totalRevenue: totalRev, totalDue, totalPaid, paidBills: paidCount, pendingBills: dueCount });
    const chartData = data.slice(0, 10).reverse().map(bill => ({ name: bill.clientName.split(" ")[0], amount: bill.grandTotal }));
    setRevenueData(chartData);
    setStatusData([ { name: 'Paid', value: paidCount, color: '#22c55e' }, { name: 'Due', value: dueCount, color: '#ef4444' } ]);
  };

  const openPaymentModal = (bill: Bill) => { setSelectedBill(bill); setPaymentAmount(""); setPaymentNote(""); setIsPaymentModalOpen(true); };

  const handlePaymentSubmit = async () => {
    if (!selectedBill || !user?.uid) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0 || amount > selectedBill.balanceDue) { toast.error("Invalid payment amount"); return; }
    setSubmittingPayment(true);
    try {
      const newBalance = selectedBill.balanceDue - amount;
      const newStatus = newBalance <= 0 ? "Paid" : "Due";
      const billRef = doc(db, "agencies", user.uid, "bills", selectedBill.id);
      await updateDoc(billRef, {
        balanceDue: newBalance,
        status: newStatus,
        payments: arrayUnion({ amount, date: new Date().toLocaleDateString(), note: paymentNote, timestamp: Date.now() }),
        lastPaymentDate: serverTimestamp()
      });
      toast.success(`Payment recorded!`);
      await fetchReportData();
      setIsPaymentModalOpen(false);
    } catch (error) { toast.error("Failed to record payment"); } finally { setSubmittingPayment(false); }
  };

  const groupedData = useMemo(() => {
    if (activeTab === 'overview' || activeTab === 'trip') return [];
    let field: keyof Bill;
    if (activeTab === 'client') field = 'clientName';
    else if (activeTab === 'agent') field = 'agentName';
    else if (activeTab === 'vehicle') field = 'vehicleNumber'; 
    else if (activeTab === 'driver') field = 'driverName';     
    else field = 'clientName';
    const groups: Record<string, any> = {};
    bills.forEach(bill => {
      const key = bill[field] || (activeTab === 'agent' ? 'Direct Booking' : 'N/A');
      if (!groups[key]) { groups[key] = { name: key, count: 0, total: 0, due: 0, paid: 0 }; }
      groups[key].count += 1;
      groups[key].total += bill.grandTotal || 0;
      groups[key].due += bill.balanceDue || 0;
      groups[key].paid += (bill.grandTotal - bill.balanceDue) || 0;
    });
    return Object.values(groups).filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [bills, activeTab, searchTerm]);

  const filteredTrips = useMemo(() => {
    return bills.filter(b => b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || b.tripId.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [bills, searchTerm]);

  const exportToCSV = () => {
    const headers = "Bill ID,Client,Trip ID,Date,Total Amount,Paid,Due Amount,Status\n";
    const rows = bills.map(b => `${b.id},${b.clientName},${b.tripId},${b.dateStr},${b.grandTotal},${b.grandTotal - b.balanceDue},${b.balanceDue},${b.balanceDue > 0 ? 'Due' : 'Paid'}`);
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows.join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `report_${activeTab}.csv`);
    link.click();
  };

  // --- UPDATED UI LOGIC STARTS HERE ---

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-24 px-1">
      {/* Mobile-Friendly Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Financial Reports</h1>
          <p className="text-sm font-medium text-gray-500">Overview of your revenue and dues</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white w-full md:w-auto px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-100 active:scale-95 transition-transform"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Responsive Pill Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 py-2 sticky top-14 bg-gray-50/80 backdrop-blur-md z-30 -mx-4 px-4">
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "trip", label: "Trips", icon: MapIcon },
          { id: "client", label: "Clients", icon: Users },
          { id: "agent", label: "Agents", icon: Briefcase },
          { id: "vehicle", label: "Fleet", icon: Car },
          { id: "driver", label: "Drivers", icon: User },
          
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setSearchTerm(""); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              activeTab === tab.id
                ? "bg-gray-900 text-white border-gray-900 shadow-md"
                : "bg-white text-gray-500 border-gray-100"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Rendering */}
      <div className="min-h-[400px]">
        
        {/* OVERVIEW SECTION */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid: 2 columns on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <StatCard label="Revenue" value={stats.totalRevenue} color="text-blue-600" bg="bg-blue-50" icon={TrendingUp} />
              <StatCard label="Collected" value={stats.totalPaid} color="text-green-600" bg="bg-green-50" icon={Wallet} />
              <StatCard label="Outstanding" value={stats.totalDue} color="text-red-600" bg="bg-red-50" icon={AlertCircle} />
              <StatCard label="Total Bills" value={bills.length} color="text-purple-600" bg="bg-purple-50" icon={IndianRupee} isCurrency={false} />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-6 text-sm uppercase tracking-wider">Revenue Trend</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 600}} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[10, 10, 10, 10]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-2 text-sm uppercase tracking-wider text-center">Payment Status</h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div> Paid
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div> Due
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GROUPED LISTS (CLIENT/AGENT/ETC) */}
        {(activeTab === "client" || activeTab === "agent" || activeTab === "vehicle" || activeTab === "driver") && (
          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="text" placeholder={`Search ${activeTab}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedData.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-black text-gray-900 text-lg leading-tight">{item.name}</h4>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{item.count} Trips</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Billed</p>
                      <p className="font-black text-gray-900">₹{item.total.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Outstanding</p>
                      <p className={`font-black ${item.due > 0 ? "text-red-600" : "text-green-600"}`}>₹{item.due.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRIP TRANSACTION LOG */}
        {activeTab === "trip" && (
          <div className="space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="text" placeholder="Search trip or client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>

            <div className="space-y-3">
              {filteredTrips.map((bill) => (
                <div key={bill.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm active:scale-[0.99] transition-transform">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">#{bill.tripId}</span>
                      <h4 className="font-black text-gray-900 text-lg mt-1">{bill.clientName}</h4>
                      <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{bill.dateStr}</p>
                    </div>
                    <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${bill.balanceDue > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                      {bill.balanceDue > 0 ? "Outstanding" : "Settled"}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end pt-4 border-t border-gray-50">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Amount Due</p>
                      <p className={`text-xl font-black ${bill.balanceDue > 0 ? "text-red-600" : "text-gray-900"}`}>₹{bill.balanceDue.toLocaleString()}</p>
                    </div>
                    {bill.balanceDue > 0 && (
                      <button 
                        onClick={() => openPaymentModal(bill)}
                        className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl text-xs font-black active:scale-95 transition-all shadow-lg"
                      >
                        <IndianRupee className="h-4 w-4" /> Add Payment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PAYMENT BOTTOM SHEET (MOBILE MODAL) */}
      {isPaymentModalOpen && selectedBill && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[40px] md:rounded-[32px] overflow-hidden animate-in slide-in-from-bottom duration-300 shadow-2xl">
            <div className="md:hidden w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2"></div>
            
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-50">
              <div>
                <h2 className="text-xl font-black text-gray-900">Record Payment</h2>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Trip #{selectedBill.tripId}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 flex justify-between items-center">
                <span className="text-sm font-black text-red-900 uppercase tracking-widest">Total Due</span>
                <span className="text-3xl font-black text-red-600 tracking-tighter">₹{selectedBill.balanceDue.toLocaleString()}</span>
              </div>

              <div className="space-y-4">
                <div className="group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Amount</label>
                  <div className="relative mt-1">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-900 text-lg">₹</span>
                    <input 
                      type="number" className="w-full bg-gray-50 text-gray-700 border-0 rounded-2xl py-5 pl-10 pr-6 font-black text-xl focus:ring-2 focus:ring-blue-600"
                      placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notes</label>
                  <input 
                    type="text" className="w-full bg-gray-50 border-0 text-gray-700 rounded-2xl py-5 px-6 font-bold focus:ring-2 focus:ring-blue-600"
                    placeholder="Cash / UPI / Ref #" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)}
                  />
                </div>
              </div>

              <button 
                disabled={submittingPayment} onClick={handlePaymentSubmit}
                className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {submittingPayment ? <div className="h-6 w-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <>Save Payment <Save className="h-5 w-5" /></>}
              </button>
              <div className="h-4 md:hidden"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Sub-Component for Metric Cards
function StatCard({ label, value, color, bg, icon: Icon, isCurrency = true }: any) {
  return (
    <div className="bg-white p-4 rounded-3xl border border-gray-50 shadow-sm flex flex-col gap-2">
      <div className={`w-10 h-10 ${bg} ${color} rounded-2xl flex items-center justify-center`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <h3 className={`text-sm font-black text-gray-900 truncate`}>
          {isCurrency ? `₹${value.toLocaleString()}` : value}
        </h3>
      </div>
    </div>
  );
}