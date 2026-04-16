import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Database, Settings, Activity, UserCircle, X, MapPin, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const apiUsageData = [
  { time: '00:00', requests: 120 }, { time: '04:00', requests: 80 }, { time: '08:00', requests: 450 }, 
  { time: '12:00', requests: 980 }, { time: '16:00', requests: 1200 }, { time: '20:00', requests: 850 }, { time: '23:59', requests: 340 }
];

export default function App() {
  // 🔒 SECURITY STATE
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('adminToken'));
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // DASHBOARD STATE
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dbClients, setDbClients] = useState([]);
  const [isClientLoading, setIsClientLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPlan, setNewPlan] = useState('Free');
  const [isCreating, setIsCreating] = useState(false);
  const [villages, setVillages] = useState([]);
  const [currentVillagePage, setCurrentVillagePage] = useState(1);
  const [totalVillagePages, setTotalVillagePages] = useState(1);
  const [isVillageLoading, setIsVillageLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  // FETCH DATA ONLY IF LOGGED IN
  useEffect(() => {
    if (!isLoggedIn) return;

    fetch('https://villageapi-backend.onrender.com/api/admin/clients')
      .then(res => res.json()).then(data => { setDbClients(data); setIsClientLoading(false); })
      .catch(err => { console.error(err); setIsClientLoading(false); });

    fetch('https://villageapi-backend.onrender.com/api/admin/analytics')
      .then(res => res.json()).then(data => setAnalytics(data))
      .catch(err => console.error("Analytics fetch failed:", err));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || activeTab !== 'villages') return;
    
    setIsVillageLoading(true);
    fetch(`https://villageapi-backend.onrender.com/api/admin/villages?page=${currentVillagePage}&limit=15`)
      .then(res => res.ok ? res.json() : { data: [], pagination: {} })
      .then(data => {
        setVillages(data.data || []); 
        setTotalVillagePages(data.pagination?.totalPages || 1);
        setIsVillageLoading(false);
      })
      .catch(() => { setVillages([]); setIsVillageLoading(false); });
  }, [activeTab, currentVillagePage, isLoggedIn]);

  // 🔒 LOGIN HANDLER
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const response = await fetch('https://villageapi-backend.onrender.com/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        setIsLoggedIn(true);
      } else {
        setLoginError(data.error || "Invalid login credentials.");
      }
    } catch (err) {
      setLoginError("Could not connect to the server.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 🔒 LOGOUT HANDLER
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
    setActiveTab('dashboard');
  };

  // CREATE CLIENT HANDLER
  const handleCreateKey = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const response = await fetch('https://villageapi-backend.onrender.com/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, planType: newPlan })
      });
      if (response.ok) {
        const newlyCreatedClient = await response.json();
        setDbClients([...dbClients, newlyCreatedClient]);
        setIsModalOpen(false); setNewEmail(''); setNewPlan('Free');
      } else {
        alert("Failed to create user. Email might already exist in NeonDB.");
      }
    } catch (error) { console.error(error); } finally { setIsCreating(false); }
  };

  // ✅ NEW: APPROVE PENDING CLIENT HANDLER
  const handleApproveClient = async (clientId) => {
    try {
      const response = await fetch(`https://villageapi-backend.onrender.com/api/admin/clients/${clientId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.success) {
        // Refresh the client list so the UI updates instantly
        const refreshRes = await fetch('https://villageapi-backend.onrender.com/api/admin/clients');
        const refreshData = await refreshRes.json();
        setDbClients(refreshData);
      } else {
        alert("Failed to approve client.");
      }
    } catch (err) {
      console.error("Failed to approve client", err);
      alert("Connection error. Could not approve client.");
    }
  };

  const getNavClass = (tabName) => activeTab === tabName
      ? "flex items-center px-4 py-3 text-blue-600 bg-blue-50 rounded-lg font-medium cursor-pointer"
      : "flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition-colors cursor-pointer";


  // 🛑 THE LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center text-blue-600"><Lock className="h-12 w-12" /></div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">VillageAPI Admin</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Secure Backend Access</p>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
            <form className="space-y-6" onSubmit={handleLogin}>
              {loginError && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center">{loginError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <div className="mt-1"><input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1"><input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" /></div>
              </div>
              <div><button type="submit" disabled={isLoggingIn} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">{isLoggingIn ? 'Authenticating...' : 'Sign in'}</button></div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ✅ THE DASHBOARD CONTENT
  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-transform hover:-translate-y-1"><h3 className="text-sm font-medium text-gray-500 mb-1">Total Villages in DB</h3><p className="text-3xl font-bold text-gray-900">{analytics ? analytics.totalVillages.toLocaleString() : '...'}</p></div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-transform hover:-translate-y-1"><h3 className="text-sm font-medium text-gray-500 mb-1">Active B2B Clients</h3><p className="text-3xl font-bold text-gray-900">{analytics ? analytics.activeClients : '...'}</p></div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-transform hover:-translate-y-1"><h3 className="text-sm font-medium text-gray-500 mb-1">API Requests (Today)</h3><p className="text-3xl font-bold text-blue-600">1,204</p></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><h3 className="text-lg font-semibold text-gray-800 mb-6">API Requests (Last 24 Hours)</h3><ResponsiveContainer width="100%" height={300}><LineChart data={apiUsageData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" /><XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} /><Tooltip cursor={{stroke: '#E5E7EB', strokeWidth: 2}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/><Line type="monotone" dataKey="requests" stroke="#2563EB" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} /></LineChart></ResponsiveContainer></div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><h3 className="text-lg font-semibold text-gray-800 mb-6">Top States by Village Count (Live)</h3><ResponsiveContainer width="100%" height={300}><BarChart data={analytics ? analytics.topStatesData : []}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} /><Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/><Bar dataKey="villages" fill="#3B82F6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </div>
        </>
      );
    }

    if (activeTab === 'clients') {
      return (
        <div className="relative">
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-gray-900">Generate API Key</h3><button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button></div>
                <form onSubmit={handleCreateKey} className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Client Email Address</label><input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="developer@startup.com" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label><select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"><option value="Free">Free (5,000 req/day)</option><option value="Premium">Premium (50,000 req/day)</option><option value="Pro">Pro (300,000 req/day)</option><option value="Unlimited">Unlimited</option></select></div>
                  <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">Cancel</button><button type="submit" disabled={isCreating} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">{isCreating ? 'Generating...' : 'Create Key'}</button></div>
                </form>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50"><h2 className="text-lg font-semibold text-gray-800">Registered B2B Clients</h2><button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">+ Generate New API Key</button></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-white border-b border-gray-200 text-gray-500 uppercase tracking-wider text-xs"><tr><th className="px-6 py-4 font-medium">Client Email</th><th className="px-6 py-4 font-medium">Plan Type</th><th className="px-6 py-4 font-medium">API Key</th><th className="px-6 py-4 font-medium">Status</th><th className="px-6 py-4 font-medium text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {isClientLoading ? (<tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">Fetching live data from NeonDB...</td></tr>) : (dbClients || []).length === 0 ? (<tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">No clients found in the database.</td></tr>) : (dbClients || []).map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{client.email}</td>
                      <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${client.plan === 'Unlimited' ? 'bg-purple-100 text-purple-700' : client.plan === 'Pro' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{client.plan}</span></td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-400 bg-gray-50 rounded px-2">{client.key}</td>
                      <td className="px-6 py-4">
                        {/* ✅ UPDATED: Visual styling correctly displays PENDING_APPROVAL in yellow */}
                        <span className={`px-2 py-1 flex items-center w-max rounded-full text-xs font-medium ${client.status === 'Active' ? 'text-green-700 bg-green-50' : client.status === 'PENDING_APPROVAL' ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50'}`}>
                          <span className={`h-2 w-2 rounded-full mr-2 ${client.status === 'Active' ? 'bg-green-500' : client.status === 'PENDING_APPROVAL' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {/* ✅ NEW: Approve button shows up dynamically */}
                        {client.status === 'PENDING_APPROVAL' || client.status === 'Inactive' ? (
                          <button 
                            onClick={() => handleApproveClient(client.id)}
                            className="text-green-600 hover:text-green-800 font-bold text-sm mr-4 transition-colors"
                          >
                            Approve
                          </button>
                        ) : null}
                        <button className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors">Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'villages') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50"><h2 className="text-lg font-semibold text-gray-800">Village Master Database</h2><span className="text-sm text-gray-500 bg-gray-200 px-3 py-1 rounded-full font-medium">Live Connection</span></div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-white border-b border-gray-200 text-gray-500 uppercase tracking-wider text-xs sticky top-0"><tr><th className="px-6 py-4 font-medium">Code</th><th className="px-6 py-4 font-medium">Village Name</th><th className="px-6 py-4 font-medium">Sub-District</th><th className="px-6 py-4 font-medium">District</th><th className="px-6 py-4 font-medium">State</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {isVillageLoading ? (<tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">Loading master records from NeonDB...</td></tr>) : (villages || []).length === 0 ? (<tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">No villages found.</td></tr>) : (villages || []).map((village, idx) => (
                  <tr key={idx} className="hover:bg-blue-50 transition-colors"><td className="px-6 py-3 font-mono text-xs text-gray-400">{village.code}</td><td className="px-6 py-3 font-medium text-gray-900">{village.name}</td><td className="px-6 py-3">{village.subDistrict}</td><td className="px-6 py-3">{village.district}</td><td className="px-6 py-3"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200">{village.state}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-sm text-gray-600">Showing Page <span className="font-semibold text-gray-900">{currentVillagePage}</span> of <span className="font-semibold text-gray-900">{totalVillagePages}</span></span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentVillagePage(prev => Math.max(prev - 1, 1))} disabled={currentVillagePage === 1 || isVillageLoading} className="flex items-center px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"><ChevronLeft className="h-4 w-4 mr-1" /> Prev</button>
              <button onClick={() => setCurrentVillagePage(prev => Math.min(prev + 1, totalVillagePages))} disabled={currentVillagePage === totalVillagePages || isVillageLoading} className="flex items-center px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">Next <ChevronRight className="h-4 w-4 ml-1" /></button>
            </div>
          </div>
        </div>
      );
    }

    // 🟢 RESTORED: THE TERMINAL LOGS
    if (activeTab === 'logs') {
      return (
        <div className="bg-gray-900 rounded-xl shadow-inner border border-gray-800 p-6 h-[600px] overflow-y-auto font-mono text-sm">
          <div className="flex items-center space-x-2 mb-4">
            <div className="h-3 w-3 rounded-full bg-red-500"></div><div className="h-3 w-3 rounded-full bg-yellow-500"></div><div className="h-3 w-3 rounded-full bg-green-500"></div><span className="text-gray-500 ml-4">server-traffic.log</span>
          </div>
          <div className="space-y-2 text-green-400">
            <p>[2026-04-09 13:01:12] GET /api/villages - 200 OK - Key: ak_live_7890...</p>
            <p>[2026-04-09 13:01:14] GET /api/villages?state=UP - 200 OK - Key: ak_live_7890...</p>
            <p className="text-red-400">[2026-04-09 13:01:15] GET /api/villages - 401 UNAUTHORIZED - Key: demo_public...</p>
            <p className="text-yellow-400">[2026-04-09 13:01:16] GET /api/villages - 429 TOO MANY REQUESTS - Key: ak_live_1234...</p>
            <p>[2026-04-09 13:01:18] GET /api/villages?district=Kochi - 200 OK - Key: ak_live_7890...</p>
            <p className="animate-pulse text-gray-500 mt-4">_ waiting for new requests...</p>
          </div>
        </div>
      );
    }

    // 🟢 RESTORED: THE SETTINGS FORM
    if (activeTab === 'settings') {
      return (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-2xl">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Global API Settings</h2>
          <div className="space-y-6">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Global Rate Limit (Requests per minute)</label><input type="number" defaultValue="100" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Mode</label><select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"><option>Off - API is Live</option><option>On - Return 503 Service Unavailable</option></select></div>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Save Configuration</button>
          </div>
        </div>
      );
    }
    
    // PROFILE
    if (activeTab === 'profile') {
      return (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-md text-center">
          <UserCircle className="h-24 w-24 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Admin User</h2>
          <p className="text-gray-500 mb-6">admin@bluestock.in</p>
          <span className="bg-purple-100 text-purple-700 px-4 py-1 rounded-full text-sm font-semibold">Super Administrator</span>
          <div className="mt-8 pt-6 border-t border-gray-100"><button onClick={handleLogout} className="text-red-600 font-medium hover:text-red-800 transition-colors">Secure Log Out</button></div>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200"><Database className="h-6 w-6 text-blue-600 mr-2" /><span className="text-xl font-bold text-gray-800">VillageAPI</span></div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <div onClick={() => setActiveTab('dashboard')} className={getNavClass('dashboard')}><LayoutDashboard className="h-5 w-5 mr-3" />Dashboard</div>
          <div onClick={() => setActiveTab('clients')} className={getNavClass('clients')}><Users className="h-5 w-5 mr-3" />B2B Clients</div>
          <div onClick={() => setActiveTab('villages')} className={getNavClass('villages')}><MapPin className="h-5 w-5 mr-3" />Village Database</div>
          <div onClick={() => setActiveTab('logs')} className={getNavClass('logs')}><Activity className="h-5 w-5 mr-3" />API Logs</div>
        </nav>
        <div className="p-4 border-t border-gray-200"><div onClick={() => setActiveTab('settings')} className={`flex items-center text-sm cursor-pointer transition-colors ${activeTab === 'settings' ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-blue-600'}`}><Settings className="h-4 w-4 mr-2" />Admin Settings</div></div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h1 className="text-2xl font-semibold text-gray-800 capitalize">{activeTab === 'villages' ? 'Master Data Browser' : activeTab === 'dashboard' ? 'Overview' : activeTab}</h1>
          <div onClick={() => setActiveTab('profile')} className="flex items-center gap-4 cursor-pointer group"><span className="text-sm text-gray-500 group-hover:text-blue-600 transition-colors">Logged in as admin@bluestock.in</span><div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold shadow-sm transition-colors ${activeTab === 'profile' ? 'bg-blue-800 text-white' : 'bg-blue-600 text-white group-hover:bg-blue-700'}`}>A</div></div>
        </header>
        <main className="flex-1 overflow-hidden p-8 h-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}