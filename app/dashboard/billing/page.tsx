"use client";

import { useState, useEffect } from "react";
import { db } from "@/libs/firebase";
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
import { Receipt, Printer, Calculator, FileCheck, IndianRupee } from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- Types ---
interface Booking {
  id: string;
  tripId: string;
  clientName: string;
  pickup: string;
  drop: string;
  date: string;
  assignedVehicleModel: string;
  assignedVehicleNumber: string;
}

export default function BillingPage() {
  const [completedTrips, setCompletedTrips] = useState<Booking[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  // Billing Form State
  const [billData, setBillData] = useState({
    openingKm: 0,
    closingKm: 0,
    ratePerKm: 15, // Default rate
    minKm: 0, // Minimum daily KM logic (optional)
    extraHourCharge: 0,
    extraHours: 0,
    extraKm: 0,
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
    subTotal: 0,
    gstAmount: 0,
    grandTotal: 0,
    balanceDue: 0,
  });

  // --- 1. Fetch Completed Trips ---
  const fetchCompletedTrips = async () => {
    try {
      setLoading(true);
      // Only fetch trips that are 'Completed' (not yet 'Billed')
      const q = query(
        collection(db, "bookings"), 
        where("status", "==", "Completed"),
        orderBy("date", "desc")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
      setCompletedTrips(list);
    } catch (error) {
      console.error(error);
      toast.error("Error fetching completed trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedTrips();
  }, []);

  // --- 2. Live Calculations ---
  useEffect(() => {
    const totalKm = Math.max(0, billData.closingKm - billData.openingKm);
    const baseAmount = totalKm * billData.ratePerKm;
    
    // Simple logic: Base + Extra + Driver + Toll + Night + Extra Hours + Extra KM
    const subTotal = baseAmount + 
                     billData.extraHourCharge + 
                     billData.driverAllowance + 
                     billData.tollParking + 
                     billData.nightCharge + 
                     (billData.extraHours * billData.extraHourCharge) + 
                     (billData.extraKm * billData.ratePerKm);
    
    // GST (only if enabled)
    const gstAmount = billData.gstEnabled ? (subTotal * billData.gstPercent) / 100 : 0;
    
    const grandTotal = subTotal + gstAmount;
    const balanceDue = grandTotal - billData.advance;

    setCalculations({
      totalKm,
      baseAmount,
      subTotal,
      gstAmount,
      grandTotal,
      balanceDue,
    });
  }, [billData]);

  // --- 3. Handle Input ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setBillData(prev => ({ ...prev, [name]: checked }));
    } else {
      setBillData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    }
  };

  // --- 4. Generate PDF & Save Bill ---
  const handleGenerateBill = async () => {
    if (!selectedTrip) return;
    if (billData.closingKm <= billData.openingKm && billData.closingKm !== 0) {
      alert("Closing KM cannot be less than Opening KM");
      return;
    }

    try {
      // A. Save to Firestore 'bills' collection
      await addDoc(collection(db, "bills"), {
        bookingId: selectedTrip.id,
        tripId: selectedTrip.tripId,
        clientName: selectedTrip.clientName,
        ...billData,
        ...calculations,
        billDate: serverTimestamp(),
        status: calculations.balanceDue > 0 ? "Due" : "Paid"
      });

      // B. Update Booking Status to 'Billed'
      await updateDoc(doc(db, "bookings", selectedTrip.id), {
        status: "Billed"
      });

      // C. Generate PDF
      generatePDF();

      toast.success("Bill Saved & PDF Generated");
      
      // Reset
      setSelectedTrip(null);
      fetchCompletedTrips();

    } catch (error) {
      console.error(error);
      toast.error("Failed to save bill");
    }
  };

  const generatePDF = () => {
    if (!selectedTrip) return;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 100, 255);
    doc.text("Chalbo Travels", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("City Center, Kolkata, West Bengal", 14, 26);
    doc.text("Phone: +91 98765 43210", 14, 31);

    // Bill Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Invoice #: INV-${Math.floor(Math.random()*10000)}`, 140, 20);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 26);
    doc.text(`Trip ID: ${selectedTrip.tripId}`, 140, 32);

    // Line
    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);

    // Client Details
    doc.setFontSize(12);
    doc.text("Bill To:", 14, 48);
    doc.setFontSize(11);
    doc.text(`Client Name: ${selectedTrip.clientName}`, 14, 55);
    doc.text(`Vehicle: ${selectedTrip.assignedVehicleModel} (${selectedTrip.assignedVehicleNumber})`, 14, 62);
    doc.text(`Route: ${selectedTrip.pickup} to ${selectedTrip.drop}`, 14, 69);

    // Table
    autoTable(doc, {
      startY: 80,
      head: [['Description', 'Details', 'Amount (INR)']],
      body: [
        ['Total Kilometers', `${billData.closingKm} - ${billData.openingKm} = ${calculations.totalKm} km`, calculations.baseAmount.toFixed(2)],
        ['Driver Allowance', '-', billData.driverAllowance.toFixed(2)],
        ['Toll & Parking', '-', billData.tollParking.toFixed(2)],
        ['Extra Charges', '-', billData.extraHourCharge.toFixed(2)],
        ['Night Charge', '-', billData.nightCharge.toFixed(2)],
        ['Extra Hours', `${billData.extraHours} hrs`, (billData.extraHours * billData.extraHourCharge).toFixed(2)],
        ['Extra KM', `${billData.extraKm} km`, (billData.extraKm * billData.ratePerKm).toFixed(2)],
        ...(billData.gstEnabled ? [['GST', `${billData.gstPercent}%`, calculations.gstAmount.toFixed(2)]] : []),
      ],
      theme: 'striped',
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Sub Total:`, 140, finalY);
    doc.text(`${calculations.subTotal.toFixed(2)}`, 170, finalY, { align: 'right' });

    doc.text(`Grand Total:`, 140, finalY + 7);
    doc.setFontSize(14);
    doc.setTextColor(40, 100, 255);
    doc.text(`${calculations.grandTotal.toFixed(2)}`, 170, finalY + 7, { align: 'right' });

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Less Advance:`, 140, finalY + 14);
    doc.text(`- ${billData.advance.toFixed(2)}`, 170, finalY + 14, { align: 'right' });

    doc.setFontSize(14);
    doc.setTextColor(255, 0, 0); // Red color for due
    doc.text(`Balance Due:`, 140, finalY + 24);
    doc.text(`${calculations.balanceDue.toFixed(2)}`, 170, finalY + 24, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Thank you for choosing Chalbo Travels.", 14, 280);

    doc.save(`Invoice_${selectedTrip.tripId}.pdf`);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] gap-6">
      
      {/* Left Panel: Completed Trips List */}
      <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-green-600" />
            Pending Billing ({completedTrips.length})
          </h2>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {loading ? (
            <p className="text-center text-sm text-gray-400 mt-4">Loading...</p>
          ) : completedTrips.length === 0 ? (
            <p className="text-center text-sm text-gray-400 mt-4">No trips waiting for bill.</p>
          ) : (
            completedTrips.map(trip => (
              <div 
                key={trip.id}
                onClick={() => setSelectedTrip(trip)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedTrip?.id === trip.id 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold bg-white border px-1 rounded text-gray-600">{trip.tripId}</span>
                  <span className="text-xs text-gray-400">{trip.date}</span>
                </div>
                <h3 className="font-medium text-gray-800 text-sm">{trip.clientName}</h3>
                <p className="text-xs text-gray-500 truncate">{trip.assignedVehicleModel}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Billing Calculator */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
        {selectedTrip ? (
          <>
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Generate Invoice</h2>
                <p className="text-sm text-gray-800">Trip ID: {selectedTrip.tripId} | {selectedTrip.clientName}</p>
              </div>
              <Receipt className="h-8 w-8 text-blue-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              
              {/* Readings */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-sm text-gray-700">Odometer Readings</h3>
                <div>
                  <label className="text-xs text-gray-800">Opening KM</label>
                  <input type="number" name="openingKm" value={billData.openingKm} onChange={handleInputChange} className="w-full border text-gray-800 rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-800">Closing KM</label>
                  <input type="number" name="closingKm" value={billData.closingKm} onChange={handleInputChange} className="w-full border text-gray-800 rounded p-2 text-sm" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-gray-800 font-medium">Total KM:</span>
                  <span className="text-lg font-bold text-blue-600">{calculations.totalKm}</span>
                </div>
              </div>

              {/* Rates */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-sm text-gray-700">Rates & Charges</h3>
                <div>
                  <label className="text-xs  text-gray-500">Rate / KM (₹)</label>
                  <input type="number" name="ratePerKm" value={billData.ratePerKm} onChange={handleInputChange} className="w-full border text-gray-800 rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Driver Allowance</label>
                  <input type="number" name="driverAllowance" value={billData.driverAllowance} onChange={handleInputChange} className="w-full border text-gray-800 rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Toll / Parking</label>
                  <input type="number" name="tollParking" value={billData.tollParking} onChange={handleInputChange} className="w-full border text-gray-800 rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Extra Hour Charge (₹)</label>
                  <input type="number" name="extraHourCharge" value={billData.extraHourCharge} onChange={handleInputChange} className="w-full border text-gray-800 rounded p-2 text-sm" />
                </div>
              </div>

              {/* Additional Charges */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-sm text-gray-700">Additional Charges</h3>
                <div>
                  <label className="text-xs text-gray-500">Night Charge (₹)</label>
                  <input type="number" name="nightCharge" value={billData.nightCharge} onChange={handleInputChange} className="w-full border text-gray-800 rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Extra Hours</label>
                  <input type="number" name="extraHours" value={billData.extraHours} onChange={handleInputChange} className="w-full border text-gray-800 rounded p-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Extra KM</label>
                  <input type="number" name="extraKm" value={billData.extraKm} onChange={handleInputChange} className="w-full border text-gray-800 rounded p-2 text-sm" />
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="font-semibold text-sm text-blue-800 flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> Final Calculation
                </h3>
                
                <div className="space-y-2 text-gray-800 text-sm">
                  <div className="flex justify-between">
                    <span>Base Fare</span>
                    <span>₹{calculations.baseAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Extras</span>
                    <span>₹{(calculations.subTotal - calculations.baseAmount).toFixed(2)}</span>
                  </div>
                  
                  {/* GST Toggle */}
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="gstEnabled" 
                        checked={billData.gstEnabled} 
                        onChange={handleInputChange}
                        className="w-4 h-4"
                      />
                      <span>Enable GST</span>
                    </label>
                    {billData.gstEnabled && (
                      <input 
                        type="number" 
                        name="gstPercent" 
                        value={billData.gstPercent} 
                        onChange={handleInputChange}
                        className="w-16 border rounded p-1 text-xs text-center"
                        placeholder="%"
                      />
                    )}
                  </div>
                  
                  {billData.gstEnabled && (
                    <div className="flex justify-between">
                      <span>GST ({billData.gstPercent}%)</span>
                      <span>₹{calculations.gstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-blue-200">
                    <span>Grand Total</span>
                    <span>₹{calculations.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2">
                   <label className="text-xs text-gray-500">Advance Paid</label>
                   <input type="number" name="advance" value={billData.advance} onChange={handleInputChange} className="w-full border rounded text-gray-800 p-2 text-sm" />
                </div>

                <div className="flex justify-between font-bold text-red-600 pt-2 text-lg">
                   <span>Due Amount</span>
                   <span>₹{calculations.balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-auto flex justify-end">
              <button 
                onClick={handleGenerateBill}
                className="flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 shadow-lg transition-all"
              >
                <Printer className="h-5 w-5" />
                Save Bill & Download PDF
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Receipt className="h-16 w-16 mb-4 opacity-20" />
            <p>Select a trip from the left to generate a bill.</p>
          </div>
        )}
      </div>
    </div>
  );
}