import React, { useState, useEffect, useRef } from 'react';
import { UserAuth } from '../types';
import {
  Sparkles,
  Send,
  X,
  RotateCcw,
  User,
  Minimize2,
  Maximize2,
  Loader2
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface GeminiChatbotProps {
  currentUser?: UserAuth | null;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  currentUser,
  isOpenExternal,
  onCloseExternal
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeRolePersona, setActiveRolePersona] = useState<string>(
    currentUser?.role || 'CLIENT'
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync external open request
  useEffect(() => {
    if (isOpenExternal !== undefined) {
      setIsOpen(isOpenExternal);
      if (isOpenExternal) {
        setIsMinimized(false);
      }
    }
  }, [isOpenExternal]);

  // Initial welcome message based on role persona
  const getInitialMessage = (role: string, userName?: string): ChatMessage => ({
    id: `msg-welcome-${role}`,
    role: 'model',
    content:
      role === 'MANAGER'
        ? `Hello Manager ${userName || ''}! I am your AI Credit Risk Copilot for the Bank Manager Portal.\n\nI can assist you with:\n• Loan sanction approvals & manual override policy criteria\n• RBI Fair Lending Code compliance\n• SHAP risk explanation analysis\n• Non-Performing Asset (NPA) risk mitigation.\n\nHow can I support your credit decisions today?`
        : role === 'OFFICER'
        ? `Hello Officer ${userName || ''}! I am your AI Underwriting Assistant for the Loan Officer Portal.\n\nI can help you review:\n• Debt-to-Income (DTI) & Loan-to-Value (LTV) benchmarks\n• KYC (Aadhaar/PAN) & financial document verification\n• RBI credit appraisal guidelines\n• 4-stage field verification audit checklists.\n\nWhat case would you like to review?`
        : `Hello ${userName || 'there'}! I am your AI Loan Advisor for the Client Portal.\n\nI can help you with:\n• Understanding loan options & eligibility criteria\n• Estimating EMIs & repayment affordability\n• Tips to improve your CIBIL credit score\n• Required documents for fast-track loan sanction.\n\nAsk me any loan or credit question!`,
    timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    getInitialMessage(currentUser?.role || 'CLIENT', currentUser?.name)
  ]);

  // Sync role persona when user logs in or switches portal role
  useEffect(() => {
    const nextRole = currentUser?.role || 'CLIENT';
    setActiveRolePersona(nextRole);
    setMessages([getInitialMessage(nextRole, currentUser?.name)]);
  }, [currentUser?.role, currentUser?.name]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized]);

  const handleClose = () => {
    setIsOpen(false);
    if (onCloseExternal) {
      onCloseExternal();
    }
  };

  const handleResetChat = () => {
    setMessages([getInitialMessage(activeRolePersona, currentUser?.name)]);
    setInputMessage('');
  };

  // Quick suggested prompts
  const suggestedPrompts =
    activeRolePersona === 'MANAGER'
      ? [
          'What factors justify a human override on credit score?',
          'Explain RBI guidelines on adverse action notices',
          'How does high DTI affect NPA default probability?',
          'Summarize collateral valuation norms for business loans'
        ]
      : activeRolePersona === 'OFFICER'
      ? [
          'What is the threshold for acceptable DTI ratio?',
          'Checklist for verifying business GST returns',
          'How to cross-verify PAN and Aadhaar records?',
          'What triggers a mandatory underwriter manual review?'
        ]
      : [
          'How can I improve my CIBIL score quickly?',
          'What documents do I need for a business loan?',
          'Calculate EMI for ₹5,00,000 at 9.5% for 36 months',
          'What happens after I submit my loan application?'
        ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessageId = `msg-${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMessageId,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const apiPayload = {
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content
        })),
        userRole: activeRolePersona
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const replyText =
        data.reply || 'I processed your request, but received an empty response. Please ask again.';

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-model-${Date.now()}`,
          role: 'model',
          content: replyText,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error('Chatbot error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'model',
          content:
            'I experienced a connection issue while contacting the AI assistant service. Please try again in a moment.',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const buttonThemeClass =
    activeRolePersona === 'MANAGER'
      ? 'from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white border-emerald-300 shadow-emerald-900/30'
      : activeRolePersona === 'OFFICER'
      ? 'from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white border-sky-300 shadow-sky-900/30'
      : 'from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white border-amber-300 shadow-amber-900/30';

  const headerThemeClass =
    activeRolePersona === 'MANAGER'
      ? 'from-emerald-950 via-teal-900 to-slate-900 border-emerald-400/30'
      : activeRolePersona === 'OFFICER'
      ? 'from-sky-950 via-blue-900 to-slate-900 border-sky-400/30'
      : 'from-indigo-950 via-purple-900 to-amber-950 border-amber-400/30';

  return (
    <div className="print-hide">
      {/* Floating Toggle Button (Bottom-Right) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className={`fixed bottom-6 right-6 z-[9990] flex items-center space-x-2.5 bg-gradient-to-r ${buttonThemeClass} font-black px-4 py-3 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer group border-2`}
          title="Open AI Portal Chatbot"
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-left">
            <span className="block text-xs font-black leading-tight text-white">
              {activeRolePersona === 'MANAGER'
                ? 'Manager AI Chatbot'
                : activeRolePersona === 'OFFICER'
                ? 'Officer AI Chatbot'
                : 'Client AI Chatbot'}
            </span>
            <span className="block text-[10px] text-white/85 font-bold">
              Ask Loan & Credit Questions
            </span>
          </div>
        </button>
      )}

      {/* Main Chatbot Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-[9995] w-[95vw] sm:w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-shadow duration-200 ${
            isMinimized ? 'h-[64px]' : 'h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div
            className={`p-4 bg-gradient-to-r ${headerThemeClass} text-white flex items-center justify-between border-b shrink-0 select-none`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 flex items-center justify-center text-slate-950 shadow-md">
                <Sparkles className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-sm text-white tracking-wide">AI-LoanGuard Chatbot</h3>
                </div>
                <div className="text-[11px] text-amber-200/90 font-medium">
                  Portal: {activeRolePersona === 'MANAGER' ? 'Bank Manager' : activeRolePersona === 'OFFICER' ? 'Loan Officer' : 'Client / Borrower'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 text-slate-300 hover:text-amber-300 rounded-lg transition-colors cursor-pointer"
                title="Reset Conversation & Position"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 text-slate-300 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                title="Close Chatbot"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Body & Messages Thread */}
          {!isMinimized && (
            <>
              {/* Scrollable Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                        msg.role === 'user'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-900 text-amber-300 border border-slate-700'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </div>

                    {/* Speech Bubble */}
                    <div
                      className={`max-w-[82%] rounded-2xl p-3 shadow-xs space-y-1 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
                      }`}
                    >
                      <div className="whitespace-pre-line leading-relaxed text-[12px]">
                        {msg.content}
                      </div>
                      <div
                        className={`text-[9px] font-mono text-right tabular-nums ${
                          msg.role === 'user' ? 'text-amber-200/80' : 'text-slate-400'
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading Typing Indicator */}
                {isLoading && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center shrink-0 border border-slate-700">
                      <Sparkles className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 shadow-xs flex items-center space-x-1.5 text-slate-500">
                      <span className="text-[11px] font-semibold text-slate-600">AI Assistant is thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Quick Prompts */}
              <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto text-[10px] shrink-0 no-scrollbar">
                {suggestedPrompts.slice(0, 3).map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    disabled={isLoading}
                    className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-950 text-slate-700 border border-slate-200 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-end space-x-2"
                >
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      placeholder="Ask about loans, CIBIL, DTI, overrides... (Enter to send)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden resize-none max-h-24 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    className="p-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                    title="Send Message"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
