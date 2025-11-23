import React, { useState, useEffect, useRef } from 'react';
import { Lead } from '../types';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Lead[];
  defaultSignature: string;
  onSaveSignature: (signature: string) => void;
  onSend: (subject: string, message: string) => Promise<void>;
}

export const EmailModal: React.FC<EmailModalProps> = ({ 
  isOpen, 
  onClose, 
  recipients, 
  defaultSignature,
  onSaveSignature,
  onSend 
}) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [includeSignature, setIncludeSignature] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  
  const isBulk = recipients.length > 1;
  const primaryRecipient = recipients[0];

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (isBulk) {
        setSubject(`Inquiry from [Your Company]`);
      } else if (primaryRecipient) {
        setSubject(`Inquiry for ${primaryRecipient.name}`);
      }
      // Load the default signature
      setSignature(defaultSignature || 'Best regards,\n[Your Name]');
      
      // Clear editor
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        setMessage('');
      }
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, recipients, defaultSignature, isBulk, primaryRecipient]);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
        setMessage(editorRef.current.innerHTML);
        editorRef.current.focus();
    }
  };

  const handleToolbarClick = (e: React.MouseEvent, command: string) => {
    e.preventDefault(); // Prevent focus loss
    execCommand(command);
  };

  const insertPlaceholder = (e: React.MouseEvent) => {
    e.preventDefault();
    execCommand('insertText', '{name}');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    // Save signature preference if changed from default
    if (signature !== defaultSignature) {
        onSaveSignature(signature);
    }
    
    let finalHtml = message;
    // Fallback if message state missed an update
    if (!finalHtml && editorRef.current) finalHtml = editorRef.current.innerHTML;
    
    // Append signature if enabled
    if (includeSignature && signature) {
        // Simple newline to BR conversion for the signature
        const sigHtml = signature.replace(/\n/g, '<br/>');
        finalHtml = `${finalHtml}<br/><br/>${sigHtml}`;
    }

    try {
      await onSend(subject, finalHtml);
      // Reset fields after successful send
      setSubject('');
      setMessage('');
      if (editorRef.current) editorRef.current.innerHTML = '';
    } finally {
      setIsSending(false);
    }
  };

  if (!isVisible && !isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      <div 
        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 flex flex-col max-h-[90vh] ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
              <i className="fa-solid fa-envelope-open-text"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {isBulk ? 'Bulk Email Campaign' : 'Compose Email'}
              </h3>
              <p className="text-xs text-slate-500">
                To: <span className="font-medium text-slate-700">
                    {isBulk 
                      ? `${recipients.length} Selected Recipients` 
                      : `${primaryRecipient?.name} <${primaryRecipient?.email}>`
                    }
                </span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {/* Subject Field */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject Line</label>
                <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all font-medium"
                placeholder="Enter subject..."
                required
                />
            </div>

            {/* Rich Text Editor */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Message Body</label>
                    {isBulk && (
                         <span className="text-xs text-brand-600 font-medium bg-brand-50 px-2 py-0.5 rounded-md">
                            Tip: Use <code className="font-bold">{'{name}'}</code> to personalize
                         </span>
                    )}
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-200 focus-within:border-brand-500 transition-all bg-white">
                    {/* Toolbar */}
                    <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1 items-center flex-wrap">
                        <ToolbarButton icon="bold" command="bold" onClick={handleToolbarClick} />
                        <ToolbarButton icon="italic" command="italic" onClick={handleToolbarClick} />
                        <ToolbarButton icon="underline" command="underline" onClick={handleToolbarClick} />
                        <div className="w-px h-6 bg-slate-300 mx-1"></div>
                        <ToolbarButton icon="list-ul" command="insertUnorderedList" onClick={handleToolbarClick} />
                        <ToolbarButton icon="list-ol" command="insertOrderedList" onClick={handleToolbarClick} />
                        
                        {isBulk && (
                            <>
                                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                                <button 
                                    onClick={insertPlaceholder}
                                    className="px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-700 transition-colors"
                                    type="button"
                                    title="Insert Name Placeholder"
                                >
                                    + {'{name}'}
                                </button>
                            </>
                        )}
                    </div>
                    {/* Editor Area */}
                    <div 
                        ref={editorRef}
                        contentEditable
                        onInput={(e) => setMessage(e.currentTarget.innerHTML)}
                        className="min-h-[200px] p-4 outline-none text-slate-800 text-sm leading-relaxed"
                        suppressContentEditableWarning={true}
                    ></div>
                </div>
            </div>

            {/* Signature Section */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                    <input 
                        type="checkbox" 
                        id="includeSig" 
                        checked={includeSignature} 
                        onChange={(e) => setIncludeSignature(e.target.checked)}
                        className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                    />
                    <label htmlFor="includeSig" className="text-sm font-medium text-slate-700 cursor-pointer select-none">Include Signature</label>
                </div>
                
                {includeSignature && (
                    <textarea
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        className="w-full mt-2 px-3 py-2 bg-white border border-slate-200 rounded-md text-xs text-slate-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-y min-h-[60px]"
                        placeholder="Enter your email signature..."
                    ></textarea>
                )}
            </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl flex-shrink-0">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isSending}
              className="px-6 py-2.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-lg shadow-brand-600/20 hover:shadow-brand-600/30 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-95"
            >
              {isSending ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  <span>{isBulk ? 'Sending Bulk...' : 'Sending...'}</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i>
                  <span>{isBulk ? `Send to ${recipients.length} Leads` : 'Send Email'}</span>
                </>
              )}
            </button>
        </div>
      </div>
    </div>
  );
};

const ToolbarButton = ({ icon, command, onClick }: { icon: string, command: string, onClick: (e: React.MouseEvent, cmd: string) => void }) => (
    <button 
        onMouseDown={(e) => onClick(e, command)}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 text-slate-600 transition-colors"
        type="button"
        title={command}
    >
        <i className={`fa-solid fa-${icon}`}></i>
    </button>
);