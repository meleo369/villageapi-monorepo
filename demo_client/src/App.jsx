import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, Search, Loader2 } from 'lucide-react';

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // The auto-filled form state
  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '',
    village: '', subDistrict: '', district: '', state: '', country: 'India'
  });

  // 🌍 THE MAGIC: Calling your new LIVE API!
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const searchAPI = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`https://villageapi-backend.onrender.com/api/v1/autocomplete?q=${query}`, {
          headers: {
            // Using the live key you just generated!
            'x-api-key': 'ak_live_7890abcdef12345678'
          }
        });
        const data = await response.json();
        if (data.success) {
          setResults(data.data);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error("API Error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce the search so we don't spam your server on every keystroke
    const timeoutId = setTimeout(() => { searchAPI(); }, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (location) => {
    setFormData({
      ...formData,
      village: location.hierarchy.village,
      subDistrict: location.hierarchy.subDistrict,
      district: location.hierarchy.district,
      state: location.hierarchy.state,
      country: location.hierarchy.country
    });
    setQuery(location.hierarchy.village);
    setShowDropdown(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      
      {/* Sales Pitch Header */}
      <div className="max-w-md w-full text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Powered by VillageAPI</h1>
        <p className="text-gray-500">Experience lightning-fast address autocomplete for Indian logistics.</p>
      </div>

      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 px-6 py-4 flex items-center">
          <MapPin className="text-white h-6 w-6 mr-2" />
          <h2 className="text-xl font-bold text-white">Shipping Details</h2>
        </div>

        <form className="p-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="+91" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5 mt-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              Delivery Address <span className="ml-2 bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold">SMART AUTOFILL</span>
            </h3>
            
            {/* THE AUTOCOMPLETE SEARCH BOX */}
            <div className="relative mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Search Village / Area (Type "Sikkim")</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full border-2 border-blue-200 rounded-md pl-10 pr-4 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors" 
                  placeholder="Start typing your village name..." 
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                {isSearching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-blue-500 animate-spin" />}
              </div>

              {/* DROPDOWN RESULTS */}
              {showDropdown && results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {results.map((result) => (
                    <div 
                      key={result.value} 
                      onClick={() => handleSelect(result)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                    >
                      <p className="text-sm font-bold text-gray-900">{result.label}</p>
                      <p className="text-xs text-gray-500">{result.fullAddress}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AUTO-FILLED FIELDS */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sub-District</label>
                <input readOnly value={formData.subDistrict} className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">District</label>
                <input readOnly value={formData.district} className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
                <input readOnly value={formData.state} className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
                <input readOnly value={formData.country} className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600" />
              </div>
            </div>

          </div>

          <button type="button" className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition-colors flex justify-center items-center">
            <CheckCircle className="h-5 w-5 mr-2" /> Complete Order
          </button>
        </form>
      </div>
    </div>
  );
}