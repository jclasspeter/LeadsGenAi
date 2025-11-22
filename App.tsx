import React, { useState, useEffect, useCallback } from 'react';
import { searchLeads } from './services/geminiService';
import { Lead, GroundingSource, SearchHistoryItem } from './types';
import { LeadCard } from './components/LeadCard';
import { EmailModal } from './components/EmailModal';
import { SearchIcon, DownloadIcon, MapPinIcon } from './components/Icons';

export default function App() {
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [leadCount, setLeadCount] = useState(10);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
  
  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Load history from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('leadGenHistory');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to parse search history", e);
    }
  }, []);

  // Auto dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const addToHistory = (ind: string, loc: string) => {
    const newItem: SearchHistoryItem = { industry: ind, location: loc, timestamp: Date.now() };
    
    setRecentSearches(prev => {
      // Remove duplicates based on case-insensitive industry and location
      const filtered = prev.filter(item => 
        !(item.industry.toLowerCase() === ind.toLowerCase() && item.location.toLowerCase() === loc.toLowerCase())
      );
      // Add new item to the top and keep only the last 5
      const updated = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem('leadGenHistory', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('leadGenHistory');
  };

  const handleHistoryClick = (item: SearchHistoryItem) => {
    setIndustry(item.industry);
    setLocation(item.location);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry || !location) return;

    setIsLoading(true);
    setError(null);
    setLeads([]);
    setSources([]);
    setHasSearched(true);

    // Save to history
    addToHistory(industry, location);

    try {
      const result = await searchLeads(industry, location, leadCount);
      setLeads(result.leads);
      setSources(result.sources);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching leads.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = useCallback(() => {
    if (leads.length === 0) return;

    const headers = ['Name', 'Category', 'Phone', 'Email', 'Address', 'Website', 'Socials'];
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => {
        const socialsStr = lead.socials.map(s => `${s.platform}: ${s.url}`).join('; ');
        return [
          `"${lead.name.replace(/"/g, '""')}"`,
          `"${lead.category}"`,
          `"${lead.phone || ''}"`,
          `"${lead.email || ''}"`,
          `"${lead.address?.replace(/"/g, '""') || ''}"`,
          `"${lead.website || ''}"`,
          `"${socialsStr}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${industry}_${location}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [leads, industry, location]);

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        // In a real app, we'd reverse geocode lat/long here.
        alert("Reverse geocoding requires an additional API. Please type 'Near Me' or your City in the location box for the best AI results.");
        setLocation("Near Me");
      }, (err) => {
        console.error("Geolocation error", err);
        alert("Could not access location. Please type it manually.");
      });
    }
  };

  const openEmailModal = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async (subject: string, message: string) => {
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsEmailModalOpen(false);
    setToast({
      message: `Email sent successfully to ${selectedLead?.name}!`,
      type: 'success'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-5 z-50 px-4 py-3 rounded-lg shadow-lg animate-fade-in-up flex items-center gap-3 text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {toast.message}
        </div>
      )}

      {/* Email Modal */}
      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        recipientName={selectedLead?.name || ''}
        recipientEmail={selectedLead?.email || ''}
        onSend={handleSendEmail}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-200">
              <i className="fa-solid fa-bolt"></i>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">LeadGen<span className="text-brand-600">AI</span></h1>
          </div>
          
          <div>
            {leads.length > 0 && (
              <button 
                onClick={handleExport}
                className="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md"
              >
                <DownloadIcon className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Find your next client instantly.</h2>
            <p className="text-lg text-slate-600">AI-powered research to gather names, contacts, and social profiles for any industry.</p>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                  <i className="fa-solid fa-briefcase"></i>
                </div>
                <input 
                  type="text" 
                  placeholder="Industry (e.g. Dentist, Roofer, Hotel)"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-transparent outline-none text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 transition-colors"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  required
                />
              </div>
              
              <div className="hidden md:block w-px bg-slate-200 my-2"></div>

              <div className="flex-1 relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                  <MapPinIcon className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  placeholder="Location (City, State)"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-transparent outline-none text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 transition-colors"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  onClick={useCurrentLocation}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-all"
                  title="Use Current Location"
                >
                  <i className="fa-solid fa-crosshairs"></i>
                </button>
              </div>

              <div className="hidden md:block w-px bg-slate-200 my-2"></div>

              <div className="w-full md:w-32 relative group">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                  <i className="fa-solid fa-users"></i>
                </div>
                <input 
                  type="number" 
                  min="1"
                  max="50"
                  placeholder="#"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-transparent outline-none text-slate-900 placeholder:text-slate-400 focus:bg-slate-50 transition-colors"
                  value={leadCount}
                  onChange={(e) => setLeadCount(parseInt(e.target.value) || 0)}
                  title="Number of leads"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading || !industry || !location}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-70 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-brand-200 hover:shadow-brand-300 flex items-center justify-center gap-2 min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  </>
                ) : (
                  <>
                    <SearchIcon className="w-5 h-5" />
                    <span>Find</span>
                  </>
                )}
              </button>
            </form>
            
            {/* Recent Searches UI */}
            {recentSearches.length > 0 && (
              <div className="mt-3 px-2 pb-1 border-t border-slate-50 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Searches</span>
                  <button onClick={clearHistory} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Clear</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleHistoryClick(item)}
                      className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-brand-200 hover:text-brand-600 text-slate-600 px-3 py-1.5 rounded-full text-xs font-medium transition-all group"
                    >
                      <i className="fa-solid fa-clock-rotate-left text-slate-400 group-hover:text-brand-400"></i>
                      <span>{item.industry} in {item.location}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {isLoading && (
          <div className="text-center py-20">
            <div className="inline-block p-4 rounded-full bg-brand-50 mb-4 relative">
                <div className="absolute inset-0 rounded-full border-2 border-brand-200 animate-ping opacity-75"></div>
                <i className="fa-solid fa-robot text-3xl text-brand-600 relative z-10"></i>
            </div>
            <h3 className="text-xl font-semibold text-slate-900">AI Researcher is working...</h3>
            <p className="text-slate-500 mt-2">Scanning search results for ~{leadCount} {industry} in {location}.</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-100 rounded-xl p-6 text-center">
            <div className="text-red-500 text-4xl mb-4"><i className="fa-solid fa-circle-exclamation"></i></div>
            <h3 className="text-lg font-bold text-red-800 mb-2">Search Failed</h3>
            <p className="text-red-600">{error}</p>
            {error.includes("API Key") && (
                <p className="mt-4 text-sm text-slate-500 bg-white p-2 rounded border border-slate-200 inline-block">
                    Developer Note: Ensure <code>process.env.API_KEY</code> is set.
                </p>
            )}
          </div>
        )}

        {!isLoading && !error && hasSearched && leads.length === 0 && (
          <div className="text-center py-20">
            <div className="text-slate-300 text-5xl mb-4"><i className="fa-regular fa-folder-open"></i></div>
            <h3 className="text-lg font-medium text-slate-900">No leads found</h3>
            <p className="text-slate-500 mt-1">Try broadening your location or changing the industry keyword.</p>
          </div>
        )}

        {!isLoading && leads.length > 0 && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                Found {leads.length} Leads
                <span className="ml-2 text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {industry} • {location}
                </span>
              </h2>
              {/* Mobile export button */}
              <button 
                onClick={handleExport}
                className="sm:hidden flex items-center justify-center w-10 h-10 bg-slate-900 text-white rounded-full shadow-md"
              >
                <DownloadIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {leads.map((lead) => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead} 
                  onEmailClick={openEmailModal}
                />
              ))}
            </div>

            {/* Sources / Grounding Attribution */}
            {sources.length > 0 && (
              <div className="mt-12 pt-8 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Information Sources</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {sources.map((source, idx) => (
                    <li key={idx}>
                      <a 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 transition-colors text-xs text-slate-600 truncate"
                      >
                        <i className="fa-brands fa-google text-slate-400"></i>
                        <span className="truncate">{source.title || source.uri}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}