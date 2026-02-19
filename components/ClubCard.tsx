
import React, { useState, useEffect } from 'react';
import { Club, ClubStatus, LaunchMonitorData } from '../types.ts';
import { Trash2, FileText, Calendar, DollarSign, Image as ImageIcon, ChevronDown, ChevronUp, Archive, ShoppingBag, ArrowUpRight, Layers, BarChart2, Save, Edit2, RefreshCw, ExternalLink, Banknote, Pencil, Info } from 'lucide-react';
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
  
  const [launchData, setLaunchData] = useState<LaunchMonitorData>(club.launchData || {});

  const isLocker = club.status === ClubStatus.LOCKER;

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

  const hasLaunchData = club.launchData && Object.keys(club.launchData).length > 0;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-md ${isLocker ? 'border-slate-200 opacity-95' : 'border-slate-200'}`}>
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

        {/* Trade-In Value Button */}
        {!readOnly && (
          <div className="pt-2">
            {club.tradeInLow ? (
              <div className="bg-slate-900 text-white p-2.5 rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase leading-none mb-0.5">Trade-In Range</p>
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
                {loadingTradeIn ? "Fetching Values..." : "Get Trade-In Estimates"}
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
