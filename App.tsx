
import React, { useState, useEffect, useCallback } from 'react';
import { searchLeads } from './services/geminiService';
import { authService } from './services/authService';
import { Lead, GroundingSource, SearchHistoryItem, User } from './types';
import { LeadCard } from './components/LeadCard';
import { EmailModal } from './components/EmailModal';
import { AuthPage } from './components/AuthPage';
import { SearchIcon, DownloadIcon, MapPinIcon } from './components/Icons';

export default function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // App State
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [leadCount, setLeadCount] = useState(10);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);
  
  // Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [modalRecipients, setModalRecipients] = useState<Lead[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [emailSignature, setEmailSignature] = useState('');

  // Check Auth on Mount
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      // Initialize signature with user name if not set
      if (!localStorage.getItem('leadGenSignature')) {
        setEmailSignature(`Best regards,\n${currentUser.name}`);
      }
    }
    setIsAuthChecking(false);
  }, []);

  // Load history and signature from local storage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('leadGenHistory');
      if (savedHistory) {
        setRecentSearches(JSON.parse(savedHistory));
      }
      
      const savedSig = localStorage.getItem('leadGenSignature');
      if (savedSig) {
        setEmailSignature(savedSig);
      }
    } catch (e) {
      console.error("Failed to parse local storage data", e);
    }
  }, []);

  // Auto dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setLeads([]);
    setHasSearched(false);
  };

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
    setSelectedLeadIds(new Set()); // Reset selection
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

    // Filter leads if there's a selection, otherwise export all
    const leadsToExport = selectedLeadIds.size > 0 
        ? leads.filter(l => selectedLeadIds.has(l.id))
        : leads;

    const headers = ['Name', 'Category', 'Phone', 'Email', 'Address', 'Website', 'Socials'];
    const csvContent = [
      headers.join(','),
      ...leadsToExport.map(lead => {
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
  }, [leads, industry, location, selectedLeadIds]);

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        alert("Reverse geocoding requires an additional API. Please type 'Near Me' or your City in the location box for the best AI results.");
        setLocation("Near Me");
      }, (err) => {
        console.error("Geolocation error", err);
        alert("Could not access location. Please type it manually.");
      });
    }
  };

  // Selection Logic
  const toggleLeadSelection = (id: string) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map(l => l.id)));
    }
  };

  const openEmailModal = (lead?: Lead) => {
    if (lead) {
      setModalRecipients([lead]);
    } else {
      // Bulk mode
      const selected = leads.filter(l => selectedLeadIds.has(l.id));
      setModalRecipients(selected);
    }
    setIsEmailModalOpen(true);
  };

  const handleSaveSignature = (newSig: string) => {
    setEmailSignature(newSig);
    localStorage.setItem('leadGenSignature', newSig);
  };

  const handleSendEmail = async (subject: string, message: string) => {
    // Process multiple recipients
    console.log(`Sending to ${modalRecipients.length} recipients...`);
    
    // Simulate loop for individual sending
    for (const recipient of modalRecipients) {
        // Simple template replacement
        const personalizedMessage = message.replace(/{name}/gi, recipient.name);
        
        console.log("Sending Email:", {
            to: recipient.email,
            subject,
            htmlBody: personalizedMessage
        });
        
        // Small artificial delay to simulate processing
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsEmailModalOpen(false);
    setToast({
      message: modalRecipients.length > 1 
        ? `Bulk email sent successfully to ${modalRecipients.length} leads!` 
        : `Email sent successfully to ${modalRecipients[0].name}!`,
      type: 'success'
    });
    
    // Clear selection after successful bulk send
    if (modalRecipients.length > 1) {
        setSelectedLeadIds(new Set());
    }
  };

  // Render Logic
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-brand-400 font-medium animate-pulse">Initializing Secure Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-midnight text-slate-200 font-sans relative pb-20">
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
        recipients={modalRecipients}
        defaultSignature={emailSignature}
        onSaveSignature={handleSaveSignature}
        onSend={handleSendEmail}
      />

      {/* Bulk Action Bar - Sticky Bottom */}
      {selectedLeadIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-700 p-4 shadow-xl animate-fade-in-up">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-white font-medium">{selectedLeadIds.size} Leads Selected</span>
                    <button onClick={() => setSelectedLeadIds(new Set())} className="text-slate-400 text-sm hover:text-white underline">Cancel</button>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => openEmailModal()} 
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-brand-900/40"
                    >
                        <i className="fa-solid fa-paper-plane"></i>
                        Email Selected
                    </button>
                     <button 
                        onClick={handleExport} 
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 border border-slate-600"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-midnight/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-900/20">
              <i className="fa-solid fa-bolt"></i>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">LeadGen<span className="text-brand-400">AI</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            {leads.length > 0 && selectedLeadIds.size === 0 && (
              <button 
                onClick={handleExport}
                className="hidden sm:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md"
              >
                <DownloadIcon className="w-4 h-4" />
                Export All
              </button>
            )}

            {/* User Profile / Logout */}
            <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block"></div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-200">{user.name}</span>
                <span className="text-xs text-slate-500">{user.email}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors border border-slate-700"
                title="Logout"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Find your next client instantly.</h2>
            <p className="text-lg text-slate-400">AI-powered research to gather names, contacts, and social profiles for any industry.</p>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-xl shadow-black/20 border border-slate-800/50">
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
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-70 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-brand-900/30 hover:shadow-brand-900/50 flex items-center justify-center gap-2 min-w-[120px]"
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
              <div className="mt-3 px-2 pb-1 border-t border-slate-100 pt-3">
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
            <div className="inline-block p-4 rounded-full bg-brand-900/30 mb-4 relative">
                <div className="absolute inset-0 rounded-full border-2 border-brand-500/30 animate-ping opacity-75"></div>
                <i className="fa-solid fa-robot text-3xl text-brand-400 relative z-10"></i>
            </div>
            <h3 className="text-xl font-semibold text-white">AI Researcher is working...</h3>
            <p className="text-slate-400 mt-2">Scanning search results for ~{leadCount} {industry} in {location}.</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="max-w-2xl mx-auto bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
            <div className="text-red-400 text-4xl mb-4"><i className="fa-solid fa-circle-exclamation"></i></div>
            <h3 className="text-lg font-bold text-red-200 mb-2">Search Failed</h3>
            <p className="text-red-300">{error}</p>
            {error.includes("API Key") && (
                <p className="mt-4 text-sm text-slate-400 bg-slate-800 p-2 rounded border border-slate-700 inline-block">
                    Developer Note: Ensure <code>process.env.API_KEY</code> is set.
                </p>
            )}
          </div>
        )}

        {!isLoading && !error && hasSearched && leads.length === 0 && (
          <div className="text-center py-20">
            <div className="text-slate-700 text-5xl mb-4"><i className="fa-regular fa-folder-open"></i></div>
            <h3 className="text-lg font-medium text-slate-300">No leads found</h3>
            <p className="text-slate-500 mt-1">Try broadening your location or changing the industry keyword.</p>
          </div>
        )}

        {!isLoading && leads.length > 0 && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-white">
                    Found {leads.length} Leads
                    <span className="ml-2 text-sm font-normal text-slate-300 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                      {industry} • {location}
                    </span>
                  </h2>
                  
                  {/* Select All Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400 hover:text-white transition-colors select-none">
                      <input 
                        type="checkbox" 
                        checked={selectedLeadIds.size === leads.length && leads.length > 0}
                        ref={(el) => {
                            if (el) el.indeterminate = selectedLeadIds.size > 0 && selectedLeadIds.size < leads.length;
                        }}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-brand-600 rounded border-slate-600 bg-slate-800 focus:ring-brand-500 cursor-pointer"
                      />
                      Select All
                  </label>
              </div>
              
              {/* Mobile export button (only when no selection) */}
              {selectedLeadIds.size === 0 && (
                  <button 
                    onClick={handleExport}
                    className="sm:hidden flex items-center justify-center w-10 h-10 bg-slate-800 text-white rounded-full shadow-md border border-slate-700"
                  >
                    <DownloadIcon className="w-5 h-5" />
                  </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {leads.map((lead) => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead} 
                  isSelected={selectedLeadIds.has(lead.id)}
                  onToggleSelect={toggleLeadSelection}
                  onEmailClick={() => openEmailModal(lead)}
                />
              ))}
            </div>

            {/* Sources / Grounding Attribution */}
            {sources.length > 0 && (
              <div className="mt-12 pt-8 border-t border-slate-800">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Information Sources</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {sources.map((source, idx) => (
                    <li key={idx}>
                      <a 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors text-xs text-slate-400 hover:text-slate-200 truncate"
                      >
                        <i className="fa-brands fa-google text-slate-500"></i>
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
