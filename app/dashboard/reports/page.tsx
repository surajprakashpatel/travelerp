"use client";

import { useState, useEffect } from "react";
import { db } from "@/libs/firebase";
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
import { TrendingUp, AlertCircle, Wallet, Download, Calendar } from "lucide-react";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);
  
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
      // Fetch all bills ordered by date
      const q = query(collection(db, "bills"), orderBy("billDate", "desc"));
      const querySnapshot = await getDocs(q);
      
      const fetchedBills = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Timestamp to readable date
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

    // 1. Calculate Totals
    data.forEach(bill => {
      totalRev += bill.grandTotal || 0;
      totalDue += bill.balanceDue || 0;
      
      if (bill.balanceDue > 0) dueCount++;
      else paidCount++;
    });

    setStats({
      totalRevenue: totalRev,
      totalDue: totalDue,
      paidBills: paidCount,
      pendingBills: dueCount
    });

    // 2. Prepare Bar Chart Data (Last 5 transactions for simplicity, or grouped by date)
    // Here we strictly show the last 7 bills for visual clarity
    const chartData = data.slice(0, 10).reverse().map(bill => ({
      name: bill.clientName.split(" ")[0], // First name only
      amount: bill.grandTotal
    }));
    setRevenueData(chartData);

    // 3. Prepare Pie Chart Data
    setStatusData([
      { name: 'Paid', value: paidCount, color: '#22c55e' }, // Green
      { name: 'Due', value: dueCount, color: '#ef4444' },   // Red
    ]);
  };

  const exportToCSV = () => {
    const headers = ["Bill ID,Client,Trip ID,Date,Total Amount,Due Amount\n"];
    const rows = bills.map(b => 
      `${b.id},${b.clientName},${b.tripId},${b.dateStr},${b.grandTotal},${b.balanceDue}`
    );
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "finance_report.csv");
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
          <p className="text-sm text-gray-500">Overview of earnings and outstanding payments.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

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
              <p className="text-sm font-medium text-gray-500">Outstanding Due</p>
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
              <p className="text-sm font-medium text-gray-500">Bills Generated</p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">{bills.length}</h3>
            </div>
            <div className="p-3 bg-green-50 rounded-full text-green-600">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bar Chart: Recent Revenue */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Transactions</h3>
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

        {/* Pie Chart: Payment Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">Payment Status Overview</h3>
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

      {/* Recent Bills Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-800">Recent Bills</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Trip ID</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Due</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bills.slice(0, 5).map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">{bill.dateStr}</td>
                  <td className="px-6 py-3 font-medium text-gray-900">{bill.clientName}</td>
                  <td className="px-6 py-3">{bill.tripId}</td>
                  <td className="px-6 py-3">₹{bill.grandTotal.toFixed(2)}</td>
                  <td className="px-6 py-3 text-red-600 font-medium">
                    {bill.balanceDue > 0 ? `₹${bill.balanceDue.toFixed(2)}` : "-"}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bill.balanceDue > 0 
                      ? "bg-red-100 text-red-700" 
                      : "bg-green-100 text-green-700"
                    }`}>
                      {bill.balanceDue > 0 ? "Pending" : "Paid"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 text-center">
           <p className="text-xs text-gray-400">Showing last 5 transactions</p>
        </div>
      </div>
    </div>
  );
}