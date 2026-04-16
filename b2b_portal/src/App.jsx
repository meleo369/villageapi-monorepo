import React, { useState, useEffect } from 'react';
import { Key, Activity, BookOpen, LogOut, Copy, CheckCircle, AlertCircle, Building2, UserPlus, LogIn } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data for the B2B usage chart
const usageData = [
  { date: 'Apr 10', requests: 400 }, { date: 'Apr 11', requests: 850 }, { date: 'Apr 12', requests: 1200 },
  { date: 'Apr 13', requests: 900 }, { date: 'Apr 14', requests: 2100 }, { date: 'Apr 15', requests: 1800 },
  { date: 'Apr 16', requests: 2450 }
];

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState('login'); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dashboard States
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedKey, setCopiedKey] = useState(null);

  // 🛡️ REAL AUTHENTICATION HANDLERS
  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('https://villageapi-backend.onrender.com/api/b2b/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, businessName })
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMsg(data.message);
        setTimeout(() => {
          setSuccessMsg('');
          setCurrentView('login');
        }, 3000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('https://villageapi-backend.onrender.com/api/b2b/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem('b2bToken', data.token);
        setIsLoggedIn(true);
        setCurrentView('dashboard');
      } else {
        // 🛑 SECURITY FIX: This will now properly reject wrong passwords
        setError(data.error || 'Invalid email or password.');
      }
    } catch (err) {
      setError('Could not connect to the database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('b2bToken');
    setIsLoggedIn(false);
    setCurrentView('login');
    setEmail('');
    setPassword('');
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Login/Register View
  if (currentView === 'login' || currentView === 'register') {
    const isLogin = currentView === 'login';
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center text-blue-600"><Building2 className="h-12 w-12" /></div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">VillageAPI B2B Portal</h2>
          <p className="mt-2 text-center text-sm text-gray-600">{isLogin ? 'Sign in to manage your API keys' : 'Register your business for API access'}</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl border border-gray-100 sm:rounded-xl sm:px-10">
            <form className="space-y-6" onSubmit={isLogin ? handleLogin : handleRegister}>
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center"><AlertCircle className="h-4 w-4 mr-2" />{error}</div>}
              {successMsg && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm flex items-center"><CheckCircle className="h-4 w-4 mr-2" />{successMsg}</div>}

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Name</label>
                  <div className="mt-1"><input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" /></div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="mt-1"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" /></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1"><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" /></div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                {isLoading ? 'Processing...' : isLogin ? 'Sign In' : 'Register'}
              </button>
            </form>
            <div className="mt-6 border-t border-gray-200 pt-5 text-center">
              <button type="button" onClick={() => setCurrentView(isLogin ? 'register' : 'login')} className="text-sm text-blue-600 font-medium">
                {isLogin ? "Need an account? Register" : "Have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800"><Building2 className="h-6 w-6 text-blue-400 mr-2" /><span className="text-xl font-bold">Client Portal</span></div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <div onClick={() => setActiveTab('overview')} className={`flex items-center px-4 py-3 rounded-lg cursor-pointer ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><Activity className="h-5 w-5 mr-3" /> Overview</div>
          <div onClick={() => setActiveTab('keys')} className={`flex items-center px-4 py-3 rounded-lg cursor-pointer ${activeTab === 'keys' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><Key className="h-5 w-5 mr-3" /> API Credentials</div>
          {/* ✅ FIXED: Added onClick to Documentation */}
          <div onClick={() => setActiveTab('docs')} className={`flex items-center px-4 py-3 rounded-lg cursor-pointer ${activeTab === 'docs' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}><BookOpen className="h-5 w-5 mr-3" /> Documentation</div>
        </nav>
        <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-slate-400 hover:text-white rounded-lg transition-colors"><LogOut className="h-5 w-5 mr-3" /> Sign Out</button></div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-800 capitalize">{activeTab}</h1>
          <div className="flex items-center"><span className="text-sm text-gray-500 mr-4">{email}</span><div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">{email ? email.charAt(0).toUpperCase() : 'U'}</div></div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {activeTab === 'overview' && (
             <div className="max-w-6xl mx-auto space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                 <h3 className="text-sm font-medium text-gray-500 mb-1">Requests Today</h3>
                 <div className="flex items-end justify-between">
                   <p className="text-3xl font-bold text-gray-900">2,450</p>
                   <span className="text-sm text-green-600 font-medium">+12% from yesterday</span>
                 </div>
               </div>
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                 <h3 className="text-sm font-medium text-gray-500 mb-1">Daily Quota Usage</h3>
                 <div className="flex items-end justify-between mb-2">
                   <p className="text-3xl font-bold text-gray-900">4.9%</p>
                   <span className="text-sm text-gray-500">50,000 limit</span>
                 </div>
                 <div className="w-full bg-gray-200 rounded-full h-2">
                   <div className="bg-blue-600 h-2 rounded-full" style={{ width: '4.9%' }}></div>
                 </div>
               </div>
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                 <h3 className="text-sm font-medium text-gray-500 mb-1">Avg Response Time</h3>
                 <p className="text-3xl font-bold text-gray-900">42<span className="text-lg text-gray-500 ml-1">ms</span></p>
               </div>
             </div>

             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="text-lg font-semibold text-gray-800 mb-6">API Usage (Last 7 Days)</h3>
               <ResponsiveContainer width="100%" height={300}>
                 <LineChart data={usageData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                   <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dx={-10} />
                   <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                   <Line type="monotone" dataKey="requests" stroke="#2563EB" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </div>
          )}

          {activeTab === 'keys' && (
            <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center border-l-4 border-l-blue-500">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Production Key</h2>
                <p className="text-sm text-gray-500 mt-1">Keep this key secret. Never expose it in client-side browser code.</p>
              </div>
              <button className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Roll Key (Regenerate)
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Environment</th>
                    <th className="px-6 py-4 font-medium">API Key</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Production API</td>
                    <td className="px-6 py-4 font-mono text-sm">ak_live_7890abcdef12345678</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => copyToClipboard('ak_live_7890abcdef12345678', 1)}
                        className="text-gray-400 hover:text-blue-600 transition-colors inline-flex items-center"
                      >
                        {copiedKey === 1 ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">Testing / Sandbox</td>
                    <td className="px-6 py-4 font-mono text-sm">ak_test_1234qwerty09876543</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => copyToClipboard('ak_test_1234qwerty09876543', 2)}
                        className="text-gray-400 hover:text-blue-600 transition-colors inline-flex items-center"
                      >
                        {copiedKey === 2 ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          )}

          {activeTab === 'docs' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">API Documentation</h2>
                <p className="text-gray-500 mb-8">Welcome to the VillageAPI developer guide. Here you will find everything you need to integrate our lightning-fast location data into your application.</p>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">1. Authentication</h3>
                <p className="text-gray-600 mb-4 text-sm">All API requests must include your secret API key in the headers. You can generate a key from the API Credentials tab.</p>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400 mb-8 shadow-inner overflow-x-auto">
                  Headers: {"{"} <br/>
                  &nbsp;&nbsp;"x-api-key": "ak_live_your_secret_key_here" <br/>
                  {"}"}
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">2. Autocomplete Endpoint</h3>
                <p className="text-gray-600 mb-4 text-sm">Use this endpoint to power search bars and checkout forms. It requires a minimum of 2 characters in the query.</p>
                
                <div className="flex items-center mb-2">
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded mr-3">GET</span>
                  <code className="text-sm font-mono text-pink-600 bg-pink-50 px-2 py-1 rounded">/api/v1/autocomplete?q=Manibeli</code>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-blue-300 overflow-x-auto mb-6 shadow-inner">
                  <span className="text-gray-500">// Example cURL Request</span><br/>
                  curl -X GET "https://villageapi-backend.onrender.com/api/v1/autocomplete?q=Manibeli" \<br/>
                  &nbsp;&nbsp;-H "x-api-key: ak_live_7890abcdef12345678"
                </div>

                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-yellow-300 overflow-x-auto shadow-inner">
                  <span className="text-gray-500">// Example JSON Response</span><br/>
                  {"{"}<br/>
                  &nbsp;&nbsp;"success": true,<br/>
                  &nbsp;&nbsp;"data": [<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;{"{"}<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"value": "village_id_525002",<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"label": "Manibeli",<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"hierarchy": {"{"}<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"village": "Manibeli",<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"subDistrict": "Akkalkuwa",<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"district": "Nandurbar",<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"state": "Maharashtra"<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{"}"}<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;{"}"}<br/>
                  &nbsp;&nbsp;]<br/>
                  {"}"}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}