import React from 'react';
import { Lead } from '../types';
import { MapPinIcon, PhoneIcon, GlobeIcon, MailIcon } from './Icons';

interface LeadCardProps {
  lead: Lead;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEmailClick?: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, isSelected, onToggleSelect, onEmailClick }) => {
  return (
    <div 
      className={`
        relative bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-5 flex flex-col h-full animate-fade-in-up
        ${isSelected ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50/10' : 'border-slate-200'}
      `}
    >
      <div className="absolute top-4 right-4 z-10">
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => onToggleSelect(lead.id)}
          className="w-5 h-5 text-brand-600 border-slate-300 rounded focus:ring-brand-500 cursor-pointer accent-brand-600 transition-transform hover:scale-110"
        />
      </div>

      <div className="flex justify-between items-start mb-3 pr-8">
        <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{lead.name}</h3>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-medium">
                {lead.category}
            </span>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-600 flex-grow">
        {lead.address && (
            <div className="flex items-start gap-2">
                <MapPinIcon className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                <span>{lead.address}</span>
            </div>
        )}
        {lead.phone && (
            <div className="flex items-center gap-2">
                <PhoneIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <a href={`tel:${lead.phone}`} className="hover:text-brand-600 hover:underline">{lead.phone}</a>
            </div>
        )}
        {lead.email && (
            <div className="flex items-center justify-between group/item">
                <div className="flex items-center gap-2 min-w-0">
                    <MailIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <a href={`mailto:${lead.email}`} className="hover:text-brand-600 hover:underline truncate">{lead.email}</a>
                </div>
                {onEmailClick && (
                    <button 
                        onClick={() => onEmailClick(lead)}
                        className="flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded transition-colors ml-2 flex-shrink-0"
                        title="Compose Email"
                    >
                        <i className="fa-solid fa-paper-plane"></i>
                        <span className="hidden sm:inline">Email</span>
                    </button>
                )}
            </div>
        )}
        {lead.website && (
            <div className="flex items-center gap-2">
                <GlobeIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline truncate">
                    Visit Website
                </a>
            </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Social Profiles</p>
        <div className="flex flex-wrap gap-2">
            {lead.socials && lead.socials.length > 0 ? (
                lead.socials.map((social, idx) => (
                    <a 
                        key={idx}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`
                            inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:text-white transition-colors
                            ${social.platform.toLowerCase().includes('facebook') ? 'hover:bg-[#1877F2]' : ''}
                            ${social.platform.toLowerCase().includes('instagram') ? 'hover:bg-[#E4405F]' : ''}
                            ${social.platform.toLowerCase().includes('linkedin') ? 'hover:bg-[#0A66C2]' : ''}
                            ${social.platform.toLowerCase().includes('twitter') ? 'hover:bg-[#1DA1F2]' : ''}
                            ${!['facebook', 'instagram', 'linkedin', 'twitter'].some(p => social.platform.toLowerCase().includes(p)) ? 'hover:bg-slate-700' : ''}
                        `}
                        title={social.platform}
                    >
                        <i className={`fab fa-${social.platform.toLowerCase() === 'twitter' ? 'x-twitter' : social.platform.toLowerCase()} text-sm`}></i>
                    </a>
                ))
            ) : (
                <span className="text-xs text-slate-400 italic">No profiles found</span>
            )}
        </div>
      </div>
    </div>
  );
};