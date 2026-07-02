'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { io, Socket } from 'socket.io-client';
import { 
  MessageSquare, 
  Send, 
  Award, 
  Loader2, 
  Users, 
  Flame,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  created_at: string;
  pointsEarned?: number;
  finalPoints?: number;
}

export default function ChatRoom() {
  const { user, refreshUser, updatePoints } = useUser();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [connecting, setConnecting] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPointsToast, setShowPointsToast] = useState(false);
  const [toastPointsValue, setToastPointsValue] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Load chat history and configure WebSocket client
  useEffect(() => {
    if (!user) return;

    const loadHistory = async () => {
      try {
        const res = await fetch('/api/chat');
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    loadHistory().then(() => {
      // Connect to Socket.io Server (same port/origin)
      const socket = io();
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnecting(false);
        socket.emit('join', user.username);
        console.log('[WebSocket Client] Connected to chat room.');
      });

      socket.on('message', (message: ChatMessage) => {
        setMessages((prev) => [...prev, message]);
        
        // Trigger sound effect if enabled
        if (soundEnabled && typeof window !== 'undefined') {
          try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            
            if (message.pointsEarned && message.pointsEarned > 0 && message.username === user.username) {
              // High pitch alert for points
              osc.frequency.setValueAtTime(880, context.currentTime);
              gain.gain.setValueAtTime(0.1, context.currentTime);
              osc.start();
              osc.stop(context.currentTime + 0.15);
            } else {
              // Standard message bubble pop
              osc.frequency.setValueAtTime(440, context.currentTime);
              gain.gain.setValueAtTime(0.02, context.currentTime);
              osc.start();
              osc.stop(context.currentTime + 0.05);
            }
          } catch (e) {}
        }

        // Check if points are earned by current user
        if (message.pointsEarned && message.pointsEarned > 0 && message.username === user.username) {
          setToastPointsValue(message.pointsEarned);
          setShowPointsToast(true);
          setTimeout(() => setShowPointsToast(false), 3000);
          
          if (message.finalPoints !== undefined) {
            updatePoints(message.finalPoints);
          } else {
            refreshUser();
          }
        }
      });

      socket.on('disconnect', () => {
        console.log('[WebSocket Client] Disconnected.');
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  // Auto scroll to latest bubble
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current) return;

    const payload = {
      username: user?.username || 'Anonymous',
      text: inputText.trim(),
    };

    socketRef.current.emit('message', payload);
    setInputText('');
  };

  if (connecting || !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-brand-violet animate-spin" />
        <span className="text-slate-400 text-sm font-medium">Connecting to community network...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Floating Points Toast Notification */}
      {showPointsToast && (
        <div className="fixed top-8 right-8 z-50 p-4 rounded-xl bg-brand-cyan border border-brand-cyan-light text-brand-dark-950 font-bold flex items-center gap-2 animate-bounce shadow-[0_0_25px_rgba(6,182,212,0.6)]">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span>+{toastPointsValue} Appreciation Points Earned!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-display flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-brand-violet" />
            WebSocket Chat Room
          </h1>
          <p className="text-sm text-slate-400 mt-1">Chat in real-time. Say thanks or show appreciation to earn loyalty points!</p>
        </div>

        {/* Room configuration controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-brand-cyan">
            <Users className="w-4 h-4" /> Community Active
          </div>
        </div>
      </div>

      {/* Chat Workspace */}
      <div className="glass-panel rounded-2xl border border-slate-800 flex flex-col h-[550px] overflow-hidden shadow-2xl relative">
        
        {/* Alerts panel */}
        <div className="p-3 bg-brand-dark-900/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Award className="w-4 h-4 text-brand-cyan" /> Try: "thank you", "grateful", "appreciate", "great support"
          </span>
          <span className="font-semibold text-brand-cyan">1 keyword = 1 Pts</span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/20">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-2">
              <MessageSquare className="w-12 h-12 text-slate-700" />
              <h3 className="font-bold text-slate-400">No Messages Yet</h3>
              <p className="text-xs text-slate-500 max-w-xs">Be the first to say hello and kickstart the discussion!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSelf = msg.username === user.username;
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col max-w-[80%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'} animate-fade-in`}
                >
                  <span className="text-[10px] text-slate-500 font-semibold mb-1 pl-1 pr-1">
                    {msg.username}
                  </span>
                  
                  <div className={`px-4 py-3 rounded-2xl text-sm relative group ${
                    isSelf 
                      ? 'bg-brand-cyan text-brand-dark-950 font-medium rounded-tr-none' 
                      : 'bg-brand-dark-800 text-slate-200 border border-slate-700/50 rounded-tl-none'
                  }`}>
                    <p className="leading-relaxed break-words">{msg.message}</p>
                    
                    {/* Points visual alert trigger */}
                    {msg.pointsEarned && msg.pointsEarned > 0 && (
                      <span className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black animate-bounce shadow-lg flex items-center gap-0.5 ${
                        isSelf
                          ? 'bg-brand-violet-light text-slate-950'
                          : 'bg-brand-cyan-light text-brand-dark-950'
                      }`}>
                        +{msg.pointsEarned} Pts <Award className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  
                  <span className="text-[9px] text-slate-500 mt-1 font-mono">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 bg-brand-dark-900 border-t border-slate-800 flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-violet text-sm transition-colors"
            required
            maxLength={300}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-5 rounded-xl bg-brand-violet text-slate-950 hover:bg-brand-violet-light hover:text-slate-950 font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.15)] text-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
