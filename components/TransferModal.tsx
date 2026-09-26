import React, { useState } from 'react';
import { X, Send, Mail } from 'lucide-react';
import { Club } from '../types.ts';
import { findUserByEmail } from '../services/transferService.ts';

interface TransferModalProps {
  club: Club;
  currentUserEmail: string;
  onClose: () => void;
  onConfirm: (club: Club, recipient: { uid: string; email: string }) => Promise<void>;
}

const TransferModal: React.FC<TransferModalProps> = ({ club, currentUserEmail, onClose, onConfirm }) => {
  const [email, setEmail] = useState('');
  const [recipient, setRecipient] = useState<{ uid: string; name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (email.trim().toLowerCase() === currentUserEmail.toLowerCase()) {
      setError("That's your own account.");
      return;
    }
    setLoading(true);
    try {
      const found = await findUserByEmail(email);
      if (found) setRecipient({ ...found, email: email.trim().toLowerCase() });
      else setError('No BagTag account found for that email. They need to sign in to BagTag at least once first.');
    } catch {
      setError('Could not look up that user. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!recipient) return;
    setLoading(true);
    setError('');
    try {
      await onConfirm(club, recipient);
      onClose();
    } catch {
      setError('Could not send the club. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Move Club to Another User</h2>
            <p className="text-xs text-slate-500 font-semibold uppercase">{club.brand} {club.model}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {!recipient ? (
            <form onSubmit={handleLookup} className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Recipient's BagTag email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="friend@example.com" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
                {loading ? 'Looking up…' : 'Find User'}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                Send <span className="font-bold">{club.brand} {club.model}</span> to <span className="font-bold">{recipient.name}</span> ({recipient.email})?
              </p>
              <p className="text-xs text-slate-500">It leaves your bag once they accept. You can cancel until then.</p>
              <div className="flex gap-2">
                <button onClick={handleSend} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
                  <Send size={16} /> {loading ? 'Sending…' : 'Send Club'}
                </button>
                <button onClick={() => setRecipient(null)} disabled={loading} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 border border-slate-200">Back</button>
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default TransferModal;
