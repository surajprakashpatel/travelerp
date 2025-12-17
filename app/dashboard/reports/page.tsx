"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/libs/firebase"; // Ensure this matches your folder name (lib vs libs)
import { collection, getDocs, query, orderBy } from "firebase/firestore";
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
  Calendar, 
  Users, 
  Briefcase, 
  Map, 
  Search,
  LayoutDashboard
} from "lucide-react";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "client" | "agent" | "trip">("overview");
  const [searchTerm, setSearchTerm] = useState("");

  // Statistics State
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalDue: 0,
    paidBills: 0,
    pendingBills: 0,
  });

  // Chart Data State
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "bills"), orderBy("billDate", "desc"));
      const querySnapshot = await getDocs(q);
      
      const fetchedBills = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateStr: doc.data().billDate?.toDate().toLocaleDateString() || "N/A"
      }));

      setBills(fetchedBills);
      processStats(fetchedBills);

    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const processStats = (data: any[]) => {
    let totalRev = 0;
    let totalDue = 0;
    let paidCount = 0;
    let dueCount = 0;

    data.forEach(bill => {
      totalRev += bill.grandTotal || 0;
      totalDue += bill.balanceDue || 0;
      if (bill.balanceDue > 0) dueCount++; else paidCount++;
    });

    setStats({
      totalRevenue: totalRev,
      totalDue: totalDue,
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

  // --- Aggregation Logic for Client/Agent Tabs ---
  const groupedData = useMemo(() => {
    if (activeTab === 'overview' || activeTab === 'trip') return [];

    const field = activeTab === 'client' ? 'clientName' : 'agentName'; // Assuming agentName exists in bill
    const groups: Record<string, any> = {};

    bills.forEach(bill => {
      // Handle missing agent names or direct bookings
      const key = bill[field] || (activeTab === 'agent' ? 'Direct Booking' : 'Unknown');
      
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

    // Filter by search term
    return Object.values(groups).filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bills, activeTab, searchTerm]);

  // --- Filter Logic for Trip Tab ---
  const filteredTrips = useMemo(() => {
    return bills.filter(b => 
      b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.tripId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bills, searchTerm]);


  const exportToCSV = () => {
    const headers = ["Bill ID,Client,Trip ID,Date,Total Amount,Paid,Due Amount,Status\n"];
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
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Generating analytics...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financial Reports</h1>
          <p className="text-sm text-gray-500">Track revenue, client dues, and agent performance.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-blue-600 text-white border border-transparent px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
        >
          <Download className="h-4 w-4" /> Export Full Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {[
          { id: "overview", label: "Overview", icon: LayoutDashboard },
          { id: "client", label: "Client Report", icon: Users },
          { id: "agent", label: "Agent Report", icon: Briefcase },
          { id: "trip", label: "Trip Wise", icon: Map },
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
        
        {/* VIEW 1: OVERVIEW (Charts) */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
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
                  </div>
                  <div className="p-3 bg-green-50 rounded-full text-green-600">
                    <Wallet className="h-6 w-6" />
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
                    <div className="w-3 h-3 rounded-full bg-green-500"></div> Paid
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div> Due
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2 & 3: CLIENT / AGENT REPORT */}
        {(activeTab === "client" || activeTab === "agent") && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
            {/* Table Controls */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800">
                {activeTab === "client" ? "Client Performance" : "Agent Performance"}
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

            {/* Aggregated Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100 text-gray-700 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">{activeTab === "client" ? "Client Name" : "Agent Name"}</th>
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
                        <td className="px-6 py-3 text-right text-green-600">₹{item.paid.toLocaleString()}</td>
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

        {/* VIEW 4: TRIP WISE REPORT */}
        {activeTab === "trip" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
             <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800">Trip Transaction Log</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search Trip ID or Client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                    <th className="px-6 py-3 text-right">Paid</th>
                    <th className="px-6 py-3 text-right">Due</th>
                    <th className="px-6 py-3 text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTrips.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-400">No trips found.</td></tr>
                  ) : (
                    filteredTrips.map((bill) => (
                      <tr key={bill.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">{bill.dateStr}</td>
                        <td className="px-6 py-3 font-medium text-gray-800">{bill.tripId}</td>
                        <td className="px-6 py-3">{bill.clientName}</td>
                        <td className="px-6 py-3 text-right">₹{bill.grandTotal.toFixed(2)}</td>
                        <td className="px-6 py-3 text-right text-green-600">₹{(bill.grandTotal - bill.balanceDue).toFixed(2)}</td>
                        <td className="px-6 py-3 text-right text-red-600 font-medium">₹{bill.balanceDue.toFixed(2)}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            bill.balanceDue > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          }`}>
                            {bill.balanceDue > 0 ? "Due" : "Paid"}
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

      </div>
    </div>
  );
}