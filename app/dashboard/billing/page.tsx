"use client";

import { useState, useEffect } from "react";
import { db } from "@/libs/firebase";
import { useAuth } from "@/context/AuthContext";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { 
  Receipt, 
  Printer, 
  Calculator, 
  ChevronLeft, 
  ArrowRight, 
  Clock, 
  Map,
  History,
  Download,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function BillingPage() {
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileStep, setMobileStep] = useState(0); // 0: List, 1: Form
  const { user } = useAuth();

  const [billData, setBillData] = useState({
    openingKm: 0,
    closingKm: 0,
    ratePerKm: 15,
    extraKm: 0,
    extraHours: 0,
    extraHourCharge: 0,
    nightCharge: 0,
    tollParking: 0,
    driverAllowance: 300,
    advance: 0,
    gstEnabled: true,
    gstPercent: 5,
  });

  const [calculations, setCalculations] = useState({
    totalKm: 0,
    baseAmount: 0,
    extraKmAmount: 0,
    extraHoursAmount: 0,
    subTotal: 0,
    gstAmount: 0,
    grandTotal: 0,
    balanceDue: 0,
  });

  const fetchCompletedTrips = async () => {
    try {
      if (!user?.uid) return;
      setLoading(true);
      const q = query(
        collection(db, "agencies", user.uid, "bookings"), 
        where("status", "==", "Completed"),
        orderBy("date", "desc")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCompletedTrips(list);
    } catch (error) {
      toast.error("Error fetching trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompletedTrips(); }, [user]);

  useEffect(() => {
    const totalKm = Math.max(0, billData.closingKm - billData.openingKm);
    const baseAmount = totalKm * billData.ratePerKm;
    const extraKmAmount = billData.extraKm * billData.ratePerKm;
    const extraHoursAmount = billData.extraHours * billData.extraHourCharge;
    
    const subTotal = baseAmount + 
                     extraKmAmount + 
                     extraHoursAmount + 
                     billData.driverAllowance + 
                     billData.tollParking + 
                     billData.nightCharge;

    const gstAmount = billData.gstEnabled ? (subTotal * billData.gstPercent) / 100 : 0;
    const grandTotal = subTotal + gstAmount;
    const balanceDue = grandTotal - billData.advance;

    setCalculations({ 
      totalKm, 
      baseAmount, 
      extraKmAmount, 
      extraHoursAmount, 
      subTotal, 
      gstAmount, 
      grandTotal, 
      balanceDue 
    });
  }, [billData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setBillData(prev => ({ ...prev, [name]: checked }));
    } else {
      setBillData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    }
  };

  const handleSelectTrip = (trip: any) => {
    setSelectedTrip(trip);
    setMobileStep(1);
  };

  const handleGenerateBill = async () => {
    if (!selectedTrip || !user?.uid) return;
    if (billData.closingKm < billData.openingKm) {
        toast.error("Closing KM cannot be less than Opening KM");
        return;
    }

    try {
      await addDoc(collection(db, "agencies", user.uid, "bills"), {
        bookingId: selectedTrip.id,
        tripId: selectedTrip.tripId,
        clientName: selectedTrip.clientName,
        ...billData,
        ...calculations,
        billDate: serverTimestamp(),
        status: calculations.balanceDue > 0 ? "Due" : "Paid"
      });

      await updateDoc(doc(db, "agencies", user.uid, "bookings", selectedTrip.id), {
        status: "Billed"
      });

      generatePDF();
      toast.success("Invoice Generated Successfully");
      setSelectedTrip(null);
      setMobileStep(0);
      fetchCompletedTrips();
    } catch (error) {
      toast.error("Billing failed");
    }
  };

  const generatePDF = () => {
    if (!selectedTrip) return;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.text("Chalbo Travels Invoice", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`Client: ${selectedTrip.clientName} | Trip ID: ${selectedTrip.tripId}`, 14, 30);
    
    autoTable(doc, {
      startY: 40,
      head: [['Description', 'Value', 'Total (INR)']],
      body: [
        ['Travel Distance', `${calculations.totalKm} KM @ ${billData.ratePerKm}/km`, calculations.baseAmount.toFixed(2)],
        ['Extra Distance', `${billData.extraKm} KM`, calculations.extraKmAmount.toFixed(2)],
        ['Overtime/Extra Hours', `${billData.extraHours} Hrs @ ${billData.extraHourCharge}/hr`, calculations.extraHoursAmount.toFixed(2)],
        ['Driver Allowance', '-', billData.driverAllowance.toFixed(2)],
        ['Tolls & Parking', '-', billData.tollParking.toFixed(2)],
        ['Night Charges', '-', billData.nightCharge.toFixed(2)],
        ...(billData.gstEnabled ? [['GST', `${billData.gstPercent}%`, calculations.gstAmount.toFixed(2)]] : []),
        ['GRAND TOTAL', '-', calculations.grandTotal.toFixed(2)],
        ['Advance Paid', '-', billData.advance.toFixed(2)],
        ['NET PAYABLE', '-', calculations.balanceDue.toFixed(2)],
      ],
      headStyles: { fillColor: [30, 64, 175] }
    });
    doc.save(`Bill_${selectedTrip.tripId}.pdf`);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 pb-20">
      
      {/* --- Step 0: Trip List --- */}
      <div className={`w-full md:w-80 flex-shrink-0 bg-white md:rounded-3xl border border-slate-200 flex flex-col overflow-hidden ${mobileStep === 1 ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-black text-slate-800 flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Completed
          </h2>
          <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
            {completedTrips.length}
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
             <div className="p-10 text-center text-slate-500 font-bold text-xs uppercase animate-pulse">Fetching...</div>
          ) : completedTrips.length === 0 ? (
            <div className="p-10 text-center text-slate-400 italic text-sm">No trips pending bill.</div>
          ) : (
            completedTrips.map(trip => (
              <div 
                key={trip.id}
                onClick={() => handleSelectTrip(trip)}
                className={`p-4 rounded-2xl border transition-all active:scale-95 cursor-pointer ${
                  selectedTrip?.id === trip.id ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white border-slate-100 shadow-sm"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${selectedTrip?.id === trip.id ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>#{trip.tripId}</span>
                  <span className={`text-[10px] font-bold ${selectedTrip?.id === trip.id ? 'text-blue-100' : 'text-slate-500'}`}>{trip.date}</span>
                </div>
                <h3 className="font-black text-sm truncate">{trip.clientName}</h3>
                <p className={`text-xs mt-1 ${selectedTrip?.id === trip.id ? 'text-blue-100' : 'text-slate-600 font-bold'}`}>{trip.assignedVehicleNumber}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- Step 1: Calculator --- */}
      <div className={`flex-1 flex flex-col ${mobileStep === 0 ? 'hidden md:flex' : 'flex'}`}>
        {selectedTrip ? (
          <div className="flex-1 flex flex-col bg-white md:rounded-[32px] border border-slate-200 overflow-hidden shadow-sm relative">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileStep(0)} className="md:hidden p-2 bg-slate-100 rounded-full">
                  <ChevronLeft className="h-5 w-5 text-slate-900" />
                </button>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Final Invoice</h2>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-tighter">#{selectedTrip.tripId} • {selectedTrip.clientName}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* Distance Section */}
              <div className="bg-slate-50 rounded-3xl p-5 space-y-4 border border-slate-100">
                <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                        <Map className="h-3.5 w-3.5" /> Mileage Details
                    </h3>
                    <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full">Total: {calculations.totalKm} KM</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-700 ml-1">Opening KM</label>
                    <input type="number" name="openingKm" inputMode="numeric" value={billData.openingKm} onChange={handleInputChange} className="w-full bg-white border-slate-200 rounded-2xl p-4 font-black text-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-700 ml-1">Closing KM</label>
                    <input type="number" name="closingKm" inputMode="numeric" value={billData.closingKm} onChange={handleInputChange} className="w-full bg-white border-slate-200 rounded-2xl p-4 font-black text-slate-900" />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-700">Extra KM (Beyond Limit)</label>
                    <input type="number" name="extraKm" value={billData.extraKm} onChange={handleInputChange} className="w-24 bg-white border-slate-200 rounded-xl p-2 text-right font-black text-blue-700" />
                </div>
              </div>

              {/* Overtime Section */}
              <div className="bg-orange-50/50 rounded-3xl p-5 space-y-4 border border-orange-100">
                <h3 className="text-[10px] font-black uppercase text-orange-600 tracking-widest flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Overtime & Extra Hours
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-orange-800 ml-1">Extra Hours</label>
                    <input type="number" name="extraHours" value={billData.extraHours} onChange={handleInputChange} className="w-full bg-white border-orange-200 rounded-2xl p-4 font-black text-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-orange-800 ml-1">Hourly Rate (₹)</label>
                    <input type="number" name="extraHourCharge" value={billData.extraHourCharge} onChange={handleInputChange} className="w-full bg-white border-orange-200 rounded-2xl p-4 font-black text-slate-900" />
                  </div>
                </div>
              </div>

              {/* Rates Section */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Base Rate / KM</label>
                    <input type="number" name="ratePerKm" value={billData.ratePerKm} onChange={handleInputChange} className="w-full bg-transparent text-xl font-black text-slate-900 border-0 p-0 focus:ring-0" />
                 </div>
                 <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100">
                    <label className="block text-[10px] font-black uppercase text-emerald-600 mb-2">Advance (₹)</label>
                    <input type="number" name="advance" value={billData.advance} onChange={handleInputChange} className="w-full bg-transparent text-xl font-black text-emerald-900 border-0 p-0 focus:ring-0" />
                 </div>
              </div>

              {/* Other Allowances */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Other Allowances</h3>
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <span className="text-xs font-black text-slate-700">DRIVER ALLOWANCE</span>
                        <input type="number" name="driverAllowance" value={billData.driverAllowance} onChange={handleInputChange} className="w-24 text-right font-black text-slate-900 focus:ring-0 border-0" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <span className="text-xs font-black text-slate-700">TOLL / PARKING</span>
                        <input type="number" name="tollParking" value={billData.tollParking} onChange={handleInputChange} className="w-24 text-right font-black text-slate-900 focus:ring-0 border-0" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <span className="text-xs font-black text-slate-700">NIGHT CHARGE</span>
                        <input type="number" name="nightCharge" value={billData.nightCharge} onChange={handleInputChange} className="w-24 text-right font-black text-slate-900 focus:ring-0 border-0" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <span className="text-xs font-black text-slate-700">GST ({billData.gstPercent}%)</span>
                        <input type="checkbox" name="gstEnabled" checked={billData.gstEnabled} onChange={handleInputChange} className="w-6 h-6 rounded-lg border-slate-300 text-blue-600" />
                    </div>
                </div>
              </div>
            </div>

            {/* Sticky Totals Bar */}
            <div className="p-6 bg-slate-900 flex items-center justify-between gap-4 md:static fixed bottom-20 md:bottom-0 left-0 right-0 z-20 shadow-2xl">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Due</p>
                    <p className="text-2xl font-black text-white tracking-tighter">₹{calculations.balanceDue.toFixed(0)}</p>
                </div>
                <button 
                  onClick={handleGenerateBill}
                  className="flex-1 max-w-[180px] flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                >
                  Confirm Bill <ArrowRight className="h-4 w-4" />
                </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 md:bg-white md:rounded-[32px] md:border-2 border-slate-100 border-dashed">
            <AlertCircle className="h-16 w-16 mb-4 opacity-20" />
            <p className="font-black text-xs tracking-widest uppercase">Select a completed trip to bill</p>
          </div>
        )}
      </div>
    </div>
  );
}