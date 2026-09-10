import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-[#3f6b35] rounded-xl border border-emerald-200">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Messages & Dispatch Chat</h1>
            <p className="text-sm text-slate-500 mt-0.5">Real-time technician & office staff communication.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
