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
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  AlertCircle, 
  Wallet, 
  Download, 
  Users, 
  Briefcase, 
  Map as MapIcon, 
  Search,
  LayoutDashboard,
  IndianRupee,
  Save,
  X,
  Car,     
  User 
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
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
const [activeTab, setActiveTab] = useState<"overview" | "client" | "agent" | "trip" | "vehicle" | "driver">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Statistics State
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalDue: 0,
    paidBills: 0,
    pendingBills: 0,
    totalPaid: 0,
  });

  // Chart Data State
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);

  // Fetch Bills from Firestore
  const fetchReportData = async () => {
  try {
    if (!user?.uid) return;
    setLoading(true);
    
    // Fetch bills
    const billsQuery = query(
      collection(db, "agencies", user.uid, "bills"), 
      orderBy("billDate", "desc")
    );
    const billsSnapshot = await getDocs(billsQuery);
    
    // Fetch all bookings
    const bookingsQuery = collection(db, "agencies", user.uid, "bookings");
    const bookingsSnapshot = await getDocs(bookingsQuery);
    
    // Create a map of bookingId -> booking data for quick lookup
    const bookingsMap = new Map();
    bookingsSnapshot.docs.forEach(doc => {
      bookingsMap.set(doc.id, doc.data());
    });
    
    // Map bills and enrich with booking data
    const fetchedBills: Bill[] = billsSnapshot.docs.map(doc => {
      const data = doc.data();
      const dateObj = data.billDate && typeof data.billDate.toDate === 'function' 
        ? data.billDate.toDate() 
        : new Date();

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
        status: data.status || "Due",
        dateStr: dateObj.toLocaleDateString(),
        payments: data.payments || []
      };
    });
    
    setBills(fetchedBills);
    processStats(fetchedBills);

  } catch (error) {
    console.error("Error fetching reports:", error);
    toast.error("Failed to load reports");
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    if (user?.uid) {
      fetchReportData();
    }
  }, [user]);

  const processStats = (data: Bill[]) => {
    let totalRev = 0;
    let totalDue = 0;
    let totalPaid = 0;
    let paidCount = 0;
    let dueCount = 0;

    data.forEach(bill => {
      totalRev += bill.grandTotal || 0;
      totalDue += bill.balanceDue || 0;
      totalPaid += (bill.grandTotal - bill.balanceDue) || 0;
      if (bill.balanceDue > 0) dueCount++; else paidCount++;
    });

    setStats({
      totalRevenue: totalRev,
      totalDue: totalDue,
      totalPaid: totalPaid,
      paidBills: paidCount,
      pendingBills: dueCount
    });

    // Chart Data
    const chartData = data.slice(0, 10).reverse().map(bill => ({
      name: bill.clientName.split(" ")[0], 
      amount: bill.grandTotal
    }));
    setRevenueData(chartData);

    setStatusData([
      { name: 'Paid', value: paidCount, color: '#22c55e' },
      { name: 'Due', value: dueCount, color: '#ef4444' },
    ]);
  };

  // Open Payment Modal
  const openPaymentModal = (bill: Bill) => {
    setSelectedBill(bill);
    setPaymentAmount("");
    setPaymentNote("");
    setIsPaymentModalOpen(true);
  };

 const handlePaymentSubmit = async () => {
  if (!selectedBill || !user?.uid) return;
  
  const amount = parseFloat(paymentAmount);
  if (!amount || amount <= 0 || amount > selectedBill.balanceDue) {
    toast.error("Invalid payment amount");
    return;
  }

  setSubmittingPayment(true);

  try {
    const newBalance = selectedBill.balanceDue - amount;
    // Determine if status should change
    const newStatus = newBalance <= 0 ? "Paid" : "Due";

    const newPayment = {
      amount,
      date: new Date().toLocaleDateString(),
      note: paymentNote,
      timestamp: Date.now()
    };

    const billRef = doc(db, "agencies", user.uid, "bills", selectedBill.id);
    
    await updateDoc(billRef, {
      balanceDue: newBalance,
      status: newStatus, // Sync status with the financial reality
      payments: arrayUnion(newPayment),
      lastPaymentDate: serverTimestamp()
    });

    toast.success(`Payment recorded! Status: ${newStatus}`);
    await fetchReportData();
    setIsPaymentModalOpen(false);
  } catch (error) {
    console.error(error);
    toast.error("Failed to record payment");
  } finally {
    setSubmittingPayment(false);
  }
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
    
    if (!groups[key]) {
      groups[key] = { 
        name: key, 
        count: 0, 
        total: 0, 
        due: 0, 
        paid: 0 
      };
    }
    
    groups[key].count += 1;
    groups[key].total += bill.grandTotal || 0;
    groups[key].due += bill.balanceDue || 0;
    groups[key].paid += (bill.grandTotal - bill.balanceDue) || 0;
  });

  return Object.values(groups).filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [bills, activeTab, searchTerm]);

  // Filter Logic for Trip Tab
  const filteredTrips = useMemo(() => {
    return bills.filter(b => 
      b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.tripId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bills, searchTerm]);

  const exportToCSV = () => {
    const headers = "Bill ID,Client,Trip ID,Date,Total Amount,Paid,Due Amount,Status\n";
    const rows = bills.map(b => 
      `${b.id},${b.clientName},${b.tripId},${b.dateStr},${b.grandTotal},${b.grandTotal - b.balanceDue},${b.balanceDue},${b.balanceDue > 0 ? 'Due' : 'Paid'}`
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chalbo_report_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading financial reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financial Reports</h1>
          <p className="text-sm text-gray-500">Track revenue, client dues, and payment history.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-blue-600 text-white border border-transparent px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
        >
          <Download className="h-4 w-4" /> Export Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "client", label: "Client Report", icon: Users },
          { id: "agent", label: "Agent Report", icon: Briefcase },
          { id: "vehicle", label: "Vehicle Report", icon: Car },      
          { id: "driver", label: "Driver Report", icon: User },    
          { id: "trip", label: "Trip Wise", icon: MapIcon},
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setSearchTerm(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 border border-gray-200 border-b-white -mb-px"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">₹{stats.totalRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Paid</p>
                    <h3 className="text-2xl font-bold text-green-600 mt-1">₹{stats.totalPaid.toLocaleString()}</h3>
                  </div>
                  <div className="p-3 bg-green-50 rounded-full text-green-600">
                    <Wallet className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Outstanding</p>
                    <h3 className="text-2xl font-bold text-red-600 mt-1">₹{stats.totalDue.toLocaleString()}</h3>
                  </div>
                  <div className="p-3 bg-red-50 rounded-full text-red-600">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Bills</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{bills.length}</h3>
                    <p className="text-xs text-gray-400 mt-1">{stats.paidBills} Paid • {stats.pendingBills} Due</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                    <IndianRupee className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4">Revenue Trend (Last 10 Trips)</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 12}} />
                      <YAxis tick={{fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }}
                        formatter={(value: any) => [`₹${value}`, 'Amount']}
                      />
                      <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-4">Payment Status</h3>
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div> Paid ({stats.paidBills})
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div> Due ({stats.pendingBills})
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      
        {(activeTab === "client" || activeTab === "agent" || activeTab === "vehicle" || activeTab === "driver") && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
            <h3 className="font-semibold text-gray-800">
  {activeTab === "client" ? "Client Performance" : 
   activeTab === "agent" ? "Agent Performance" :
   activeTab === "vehicle" ? "Vehicle Performance" :
   "Driver Performance"}
</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100 text-gray-700 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3"> {activeTab === "client" ? "Client Name" : 
   activeTab === "agent" ? "Agent Name" :
   activeTab === "vehicle" ? "Vehicle Number" :
   "Driver Name"}</th>
                    <th className="px-6 py-3 text-center">Total Trips</th>
                    <th className="px-6 py-3 text-right">Total Billed</th>
                    <th className="px-6 py-3 text-right">Total Paid</th>
                    <th className="px-6 py-3 text-right">Balance Due</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groupedData.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">No data found.</td></tr>
                  ) : (
                    groupedData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-3 text-center">{item.count}</td>
                        <td className="px-6 py-3 text-right font-medium">₹{item.total.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right text-green-600 font-medium">₹{item.paid.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right text-red-600 font-bold">₹{item.due.toLocaleString()}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.due > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          }`}>
                            {item.due > 0 ? "Outstanding" : "Settled"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TRIP WISE REPORT */}
        {activeTab === "trip" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800">Trip Transaction Log with Payment Tracking</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search Trip ID or Client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100 text-gray-700 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Trip ID</th>
                    <th className="px-6 py-3">Client</th>
                    <th className="px-6 py-3 text-right">Bill Amount</th>
                    <th className="px-6 py-3 text-right">Amount Paid</th>
                    <th className="px-6 py-3 text-right">Balance Due</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTrips.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-400">No trips found.</td></tr>
                  ) : (
                    filteredTrips.map((bill) => (
                      <tr key={bill.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-xs">{bill.dateStr}</td>
                        <td className="px-6 py-3 font-medium text-gray-800">{bill.tripId}</td>
                        <td className="px-6 py-3">{bill.clientName}</td>
                        <td className="px-6 py-3 text-right font-medium">₹{bill.grandTotal.toFixed(2)}</td>
                        <td className="px-6 py-3 text-right text-green-600 font-medium">
                          ₹{(bill.grandTotal - bill.balanceDue).toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-right text-red-600 font-bold">₹{bill.balanceDue.toFixed(2)}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            bill.balanceDue > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          }`}>
                            {bill.balanceDue > 0 ? "Due" : "Paid"}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          {bill.balanceDue > 0 ? (
                            <button 
                              onClick={() => openPaymentModal(bill)}
                              className="flex items-center gap-1 mx-auto text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition"
                              title="Record Payment"
                            >
                              <IndianRupee className="h-3 w-3" />
                              Add Payment
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">Fully Paid</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-blue-50">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-blue-600" />
                  Record Payment
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Trip: {selectedBill.tripId} • {selectedBill.clientName}</p>
              </div>
              <button 
                onClick={() => setIsPaymentModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600"
                disabled={submittingPayment}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Bill Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Bill Amount:</span>
                  <span className="font-semibold text-gray-900">₹{selectedBill.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Already Paid:</span>
                  <span className="font-semibold text-green-600">₹{(selectedBill.grandTotal - selectedBill.balanceDue).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600 font-medium">Balance Due:</span>
                  <span className="font-bold text-red-600 text-lg">₹{selectedBill.balanceDue.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment History */}
              {selectedBill.payments && selectedBill.payments.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase">Payment History</h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {selectedBill.payments.map((payment, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
                        <div>
                          <span className="font-medium text-gray-900">₹{payment.amount.toFixed(2)}</span>
                          {payment.note && <span className="text-gray-500 ml-2">• {payment.note}</span>}
                        </div>
                        <span className="text-gray-400">{payment.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedBill.balanceDue}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    disabled={submittingPayment}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Maximum: ₹{selectedBill.balanceDue.toFixed(2)}</p>
              </div>

              {/* Payment Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Note (Optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Cash, UPI, Cheque #12345"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  disabled={submittingPayment}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={submittingPayment}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submittingPayment}
                >
                  {submittingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}