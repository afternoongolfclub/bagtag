
import React, { useState, useEffect } from 'react';
import { Club, ClubStatus, ClubDisposition, LaunchMonitorData } from '../types.ts';
import { Trash2, FileText, Calendar, DollarSign, Image as ImageIcon, ChevronDown, ChevronUp, Archive, ShoppingBag, ArrowUpRight, Layers, BarChart2, Save, Edit2, RefreshCw, ExternalLink, Banknote, Pencil, Info, Tag, Repeat, Undo2 } from 'lucide-react';
import { getTradeInEstimate } from '../services/geminiService.ts';

interface ClubCardProps {
  club: Club;
  onDelete: (id: string) => void;
  onUpdate?: (club: Club) => void;
  onEdit: (club: Club) => void;
  onToggleStatus: (id: string) => void;
  readOnly?: boolean;
}

const ClubCard: React.FC<ClubCardProps> = ({ club, onDelete, onUpdate, onEdit, onToggleStatus, readOnly = false }) => {
  const [showLaunchData, setShowLaunchData] = useState(false);
  const [isEditingLaunch, setIsEditingLaunch] = useState(false);
  const [loadingTradeIn, setLoadingTradeIn] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDisposeForm, setShowDisposeForm] = useState(false);
  const [disposeType, setDisposeType] = useState<ClubDisposition>(club.disposition || ClubDisposition.SOLD);
  const [soldPrice, setSoldPrice] = useState(club.soldPrice != null ? club.soldPrice.toString() : '');
  const [soldDate, setSoldDate] = useState(club.soldDate || new Date().toISOString().slice(0, 10));
  const [tradedFor, setTradedFor] = useState(club.tradedFor || '');
  
  const [launchData, setLaunchData] = useState<LaunchMonitorData>(club.launchData || {});

  const isLocker = club.status === ClubStatus.LOCKER;
  const isGone = !!club.disposition;
  const isTraded = club.disposition === ClubDisposition.TRADED;

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (confirmDelete) {
      timeout = setTimeout(() => {
        setConfirmDelete(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [confirmDelete]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const renderSetComposition = () => {
    if (!club.setComposition || club.setComposition.length === 0) return null;
    
    const isStandardRun = club.setComposition.length > 2;
    const first = club.setComposition[0];
    const last = club.setComposition[club.setComposition.length - 1];
    const displayText = isStandardRun ? `${first}-${last}` : club.setComposition.join(', ');

    return (
       <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md mt-2 w-fit">
        <Layers size={12} />
        SET: {displayText}
        <span className="text-emerald-500/70 font-medium ml-1">
          ({club.setComposition.length} items)
        </span>
      </div>
    );
  };

  const handleSaveLaunchData = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdate) {
      onUpdate({ ...club, launchData });
      setIsEditingLaunch(false);
    }
  };

  const handleCheckTradeIn = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate || readOnly) return;
    
    setLoadingTradeIn(true);
    try {
      const estimate = await getTradeInEstimate(club.brand, club.model, club.type, club.setComposition);
      onUpdate({
        ...club,
        tradeInLow: estimate.low,
        tradeInHigh: estimate.high,
        lastTradeInCheck: Date.now()
      });
    } catch (error) {
      console.error("Failed to check trade in", error);
    } finally {
      setLoadingTradeIn(false);
    }
  };

  const handleSaveDisposition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdate) return;
    const parsedPrice = parseFloat(soldPrice);
    onUpdate({
      ...club,
      disposition: disposeType,
      soldPrice: isNaN(parsedPrice) ? undefined : parsedPrice,
      soldDate: soldDate || undefined,
      tradedFor: disposeType === ClubDisposition.TRADED ? (tradedFor.trim() || undefined) : undefined,
    });
    setShowDisposeForm(false);
  };

  const handleUndoDisposition = () => {
    if (!onUpdate) return;
    onUpdate({ ...club, disposition: undefined, soldPrice: undefined, soldDate: undefined, tradedFor: undefined });
    setShowDisposeForm(false);
  };

  const hasLaunchData = club.launchData && Object.keys(club.launchData).length > 0;

  return (
    <div className={`relative bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-md ${isGone ? 'border-red-200' : isLocker ? 'border-slate-200 opacity-95' : 'border-slate-200'}`}>
      {/* SOLD / TRADED stamp across the whole card */}
      {isGone && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className={`-rotate-[25deg] border-[6px] rounded-xl px-6 py-1 font-black tracking-[0.2em] bg-white/70 shadow-lg ${isTraded ? 'text-5xl border-amber-500 text-amber-500' : 'text-6xl border-red-600 text-red-600'}`}>
            {isTraded ? 'TRADED' : 'SOLD'}
          </div>
        </div>
      )}

      {/* Header Image Section */}
      <div className="relative h-44 shrink-0 bg-slate-50 group">
        {club.photoUrl ? (
          <img src={club.photoUrl} alt={club.model} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <ImageIcon size={40} strokeWidth={1} />
            <span className="text-[9px] uppercase font-bold tracking-widest mt-2">No Photo</span>
          </div>
        )}
        
        {/* Type Badge */}
        <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm border ${isLocker ? 'bg-slate-700 text-white border-slate-600' : 'bg-emerald-600 text-white border-emerald-500'}`}>
          {club.type}
        </div>

        {/* Quick Actions Overlay */}
        {!readOnly && (
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <button onClick={(e) => { e.stopPropagation(); onToggleStatus(club.id); }} className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-slate-600 hover:text-emerald-600 transition-colors" title="Move Location">
              {isLocker ? <ShoppingBag size={16} /> : <Archive size={16} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowDisposeForm(!showDisposeForm); }} className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-slate-600 hover:text-red-600 transition-colors" title="Mark Sold / Traded">
              <Tag size={16} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(club); }} className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-slate-600 hover:text-blue-600 transition-colors" title="Edit Item">
              <Pencil size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Main Stats Area */}
      <div className="p-4 flex-grow flex flex-col space-y-4">
        <div>
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-grow">
              <h3 className="text-lg font-bold text-slate-900 leading-tight truncate">{club.brand}</h3>
              <p className="text-slate-500 font-semibold text-xs tracking-tight truncate uppercase">{club.model}</p>
            </div>
            {club.loft && (
              <div className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200 font-bold text-xs shrink-0 ml-2">
                {club.loft}°
              </div>
            )}
          </div>
          {renderSetComposition()}
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Price & Date Row */}
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
            <DollarSign size={14} className="text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Value</p>
              <p className="text-xs font-bold text-slate-700 truncate">{club.price ? `$${club.price.toLocaleString()}` : '—'}</p>
            </div>
          </div>
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
            <Calendar size={14} className="text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Bought</p>
              <p className="text-xs font-bold text-slate-700 truncate">{formatDate(club.purchaseDate)}</p>
            </div>
          </div>

          {/* Shaft Info spans both columns if available */}
          {(club.shaftMakeModel || club.shaftStiffness) && (
            <div className="col-span-2 p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
              <ArrowUpRight size={14} className="text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Shaft Configuration</p>
                <p className="text-xs font-bold text-slate-700 truncate">
                  {club.shaftMakeModel || 'Default'} <span className="text-slate-400 mx-1">|</span> {club.shaftStiffness || 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sold / Traded Summary */}
        {isGone && !showDisposeForm && (
          <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${isTraded ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <div className="min-w-0">
              <p className={`text-[9px] font-bold uppercase leading-none mb-0.5 ${isTraded ? 'text-amber-600' : 'text-red-500'}`}>
                {isTraded ? 'Traded' : 'Sold'}{club.soldDate ? ` · ${formatDate(club.soldDate)}` : ''}
              </p>
              <p className="text-xs font-bold text-slate-800 truncate">
                {club.soldPrice != null ? `$${club.soldPrice.toLocaleString()}` : '—'}
                {isTraded && club.tradedFor && <span className="text-slate-500 font-semibold"> for {club.tradedFor}</span>}
              </p>
            </div>
            {!readOnly && (
              <button onClick={() => setShowDisposeForm(true)} className="relative z-30 p-1.5 text-slate-500 hover:text-slate-800 rounded-lg shrink-0" title="Edit sale / trade">
                <Edit2 size={14} />
              </button>
            )}
          </div>
        )}

        {/* Sold / Traded Form */}
        {!readOnly && showDisposeForm && (
          <form onSubmit={handleSaveDisposition} className="relative z-30 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex bg-white p-1 rounded-lg border border-slate-200">
              <button type="button" onClick={() => setDisposeType(ClubDisposition.SOLD)} className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold rounded uppercase transition-all ${disposeType === ClubDisposition.SOLD ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400'}`}>
                <Tag size={12} /> Sold
              </button>
              <button type="button" onClick={() => setDisposeType(ClubDisposition.TRADED)} className={`flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold rounded uppercase transition-all ${disposeType === ClubDisposition.TRADED ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400'}`}>
                <Repeat size={12} /> Traded
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[9px] font-bold text-slate-400 uppercase">{disposeType === ClubDisposition.TRADED ? 'Trade Credit ($)' : 'Sold For ($)'}</span>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none bg-white" />
              </label>
              <label className="block">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Date</span>
                <input type="date" value={soldDate} onChange={(e) => setSoldDate(e.target.value)} className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none bg-white" />
              </label>
              {disposeType === ClubDisposition.TRADED && (
                <label className="block col-span-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Traded For</span>
                  <input type="text" placeholder="e.g. Titleist GT2 driver" value={tradedFor} onChange={(e) => setTradedFor(e.target.value)} className="w-full text-xs p-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none bg-white" />
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" className={`flex-1 text-white py-2 rounded-lg text-[10px] font-bold uppercase shadow-sm ${disposeType === ClubDisposition.TRADED ? 'bg-amber-500' : 'bg-red-600'}`}>
                <Save size={12} className="inline mr-1" /> Mark {disposeType}
              </button>
              {isGone && (
                <button type="button" onClick={handleUndoDisposition} className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase text-slate-500 border border-slate-200 bg-white hover:text-slate-800" title="Back in collection">
                  <Undo2 size={12} className="inline mr-1" /> Undo
                </button>
              )}
              <button type="button" onClick={() => setShowDisposeForm(false)} className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Trade-In Value Button */}
        {!readOnly && !isGone && (
          <div className="pt-2">
            {club.tradeInLow != null && club.tradeInLow > 0 ? (
              <div className="bg-slate-900 text-white p-2.5 rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase leading-none mb-0.5">Trade-In Range · PGA Value Guide</p>
                  <p className="text-xs font-bold text-emerald-400">${club.tradeInLow} - ${club.tradeInHigh}</p>
                </div>
                <button onClick={handleCheckTradeIn} disabled={loadingTradeIn} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0">
                  <RefreshCw size={14} className={loadingTradeIn ? 'animate-spin' : ''} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleCheckTradeIn} 
                disabled={loadingTradeIn}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-slate-300 text-[10px] font-bold text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all uppercase"
              >
                {loadingTradeIn ? <RefreshCw size={12} className="animate-spin" /> : <Banknote size={12} />}
                {loadingTradeIn ? "Fetching Values..." : "Get Trade-In Value (PGA Guide)"}
              </button>
            )}
          </div>
        )}

        {/* Card Footer */}
        {!readOnly && (
          <div className="pt-2 flex items-center justify-between">
            {club.receiptUrl ? (
              <a href={club.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-[10px] font-bold uppercase">
                <FileText size={14} /> View Receipt
              </a>
            ) : <div />}
            <button 
              onClick={(e) => { e.stopPropagation(); confirmDelete ? onDelete(club.id) : setConfirmDelete(true); }}
              className={`flex items-center gap-1.5 py-1 px-3 rounded-lg text-[10px] font-bold uppercase transition-all ${confirmDelete ? 'bg-red-600 text-white' : 'text-slate-300 hover:text-red-500'}`}
            >
              <Trash2 size={14} />
              {confirmDelete ? "Confirm Delete" : "Delete"}
            </button>
          </div>
        )}
      </div>

      {/* Launch Data Dropdown */}
      <div className="border-t border-slate-100">
        <button 
          onClick={() => setShowLaunchData(!showLaunchData)} 
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
            <BarChart2 size={14} className={hasLaunchData ? "text-emerald-500" : "text-slate-300"} />
            Performance
          </div>
          {showLaunchData ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showLaunchData && (
          <div className="bg-slate-50 p-4 border-t border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
               <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Averages</h4>
               {!readOnly && (
                 <button onClick={() => setIsEditingLaunch(!isEditingLaunch)} className="text-[10px] text-emerald-600 font-bold uppercase hover:underline">
                   {isEditingLaunch ? "Cancel" : "Update"}
                 </button>
               )}
            </div>

            {isEditingLaunch ? (
               <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Carry" value={launchData.carryDistance || ''} onChange={(e) => setLaunchData({...launchData, carryDistance: parseFloat(e.target.value)})} className="text-xs p-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none" />
                  <input type="number" placeholder="Total" value={launchData.totalDistance || ''} onChange={(e) => setLaunchData({...launchData, totalDistance: parseFloat(e.target.value)})} className="text-xs p-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none" />
                  <button onClick={handleSaveLaunchData} className="col-span-2 bg-emerald-600 text-white py-2 rounded-lg text-[10px] font-bold uppercase shadow-sm"><Save size={12} className="inline mr-1" /> Save Performance</button>
               </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {hasLaunchData ? (
                  <>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Carry</p>
                      <p className="text-sm font-bold text-slate-800">{club.launchData?.carryDistance}y</p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Total</p>
                      <p className="text-sm font-bold text-slate-800">{club.launchData?.totalDistance}y</p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 py-2 text-center text-slate-400 text-[10px] font-medium flex items-center justify-center gap-1 italic">
                    <Info size={12} /> No launch data recorded
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubCard;
