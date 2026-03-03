
import React, { useState, useMemo } from 'react';
import { Club, ClubType, ClubStatus, LaunchMonitorData, PerClubLaunchData } from '../types.ts';
import { X, Download, Save, Target, AlertTriangle, CheckCircle, MinusCircle } from 'lucide-react';
import { generateBagMapPDF } from '../services/bagMapPdfService.ts';

interface BagMappingProps {
  clubs: Club[];
  onUpdate: (club: Club) => void;
  onClose: () => void;
}

interface BagMapRow {
  clubId: string;
  label: string;       // e.g. "Driver" or "7 Iron"
  type: ClubType;
  loft: string;
  carry: number | undefined;
  total: number | undefined;
  ballSpeed: number | undefined;
  clubSpeed: number | undefined;
  spinRate: number | undefined;
  launchAngle: number | undefined;
  // reference back to source for saving
  sourceClub: Club;
  ironLabel?: string;  // set only for expanded iron rows
}

const CLUB_TYPE_ORDER: ClubType[] = [
  ClubType.DRIVER,
  ClubType.WOOD,
  ClubType.HYBRID,
  ClubType.IRON,
  ClubType.WEDGE,
  ClubType.PUTTER,
];

const IRON_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', 'PW', 'AW', 'GW', 'SW', 'LW'];

function getIronSortIndex(label: string): number {
  const idx = IRON_ORDER.indexOf(label);
  return idx >= 0 ? idx : 99;
}

function buildRows(clubs: Club[]): BagMapRow[] {
  const bagClubs = clubs.filter(c => c.status === ClubStatus.BAG && c.type !== ClubType.PUTTER && c.type !== ClubType.ACCESSORY && c.type !== ClubType.OTHER);
  const rows: BagMapRow[] = [];

  for (const club of bagClubs) {
    if (club.type === ClubType.IRON && club.setComposition && club.setComposition.length > 0) {
      // Expand iron set into individual rows
      for (const ironLabel of club.setComposition) {
        const perClub = club.launchData?.perClubData?.[ironLabel];
        rows.push({
          clubId: club.id,
          label: `${ironLabel} Iron`,
          type: ClubType.IRON,
          loft: '',
          carry: perClub?.carryDistance,
          total: perClub?.totalDistance,
          ballSpeed: perClub?.ballSpeed,
          clubSpeed: perClub?.clubSpeed,
          spinRate: perClub?.spinRate,
          launchAngle: perClub?.launchAngle,
          sourceClub: club,
          ironLabel,
        });
      }
    } else {
      rows.push({
        clubId: club.id,
        label: club.type === ClubType.WEDGE ? `${club.model}${club.loft ? ` (${club.loft}°)` : ''}` : `${club.brand} ${club.model}`,
        type: club.type,
        loft: club.loft || '',
        carry: club.launchData?.carryDistance,
        total: club.launchData?.totalDistance,
        ballSpeed: club.launchData?.ballSpeed,
        clubSpeed: club.launchData?.clubSpeed,
        spinRate: club.launchData?.spinRate,
        launchAngle: club.launchData?.launchAngle,
        sourceClub: club,
      });
    }
  }

  // Sort: by type order first, then by carry distance descending (longest first), irons by iron order
  rows.sort((a, b) => {
    const typeA = CLUB_TYPE_ORDER.indexOf(a.type);
    const typeB = CLUB_TYPE_ORDER.indexOf(b.type);
    if (typeA !== typeB) return typeA - typeB;
    // Within irons, sort by iron order
    if (a.type === ClubType.IRON && b.type === ClubType.IRON && a.ironLabel && b.ironLabel) {
      return getIronSortIndex(a.ironLabel) - getIronSortIndex(b.ironLabel);
    }
    // Otherwise sort by carry distance descending
    const carryA = a.carry || 0;
    const carryB = b.carry || 0;
    return carryB - carryA;
  });

  return rows;
}

function getGapColor(gap: number): { bg: string; text: string; icon: React.ReactNode } {
  if (gap < 5) return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: <MinusCircle size={14} className="text-red-500" /> };
  if (gap <= 15) return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle size={14} className="text-emerald-500" /> };
  if (gap <= 20) return { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', icon: <AlertTriangle size={14} className="text-yellow-500" /> };
  return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: <AlertTriangle size={14} className="text-red-500" /> };
}

const BagMapping: React.FC<BagMappingProps> = ({ clubs, onUpdate, onClose }) => {
  const initialRows = useMemo(() => buildRows(clubs), [clubs]);
  const [rows, setRows] = useState<BagMapRow[]>(initialRows);
  const [hasChanges, setHasChanges] = useState(false);

  const updateField = (index: number, field: keyof BagMapRow, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      const numVal = value === '' ? undefined : parseFloat(value);
      updated[index] = { ...updated[index], [field]: numVal };
      return updated;
    });
    setHasChanges(true);
  };

  const handleSaveAll = () => {
    // Group changes by club id
    const clubUpdates = new Map<string, Club>();

    for (const row of rows) {
      const club = row.sourceClub;
      const existing = clubUpdates.get(club.id) || { ...club };
      const launchData: LaunchMonitorData = { ...(existing.launchData || {}) };

      if (row.ironLabel) {
        // Per-iron data
        const perClubData = { ...(launchData.perClubData || {}) };
        perClubData[row.ironLabel] = {
          carryDistance: row.carry,
          totalDistance: row.total,
          ballSpeed: row.ballSpeed,
          clubSpeed: row.clubSpeed,
          spinRate: row.spinRate,
          launchAngle: row.launchAngle,
        };
        launchData.perClubData = perClubData;
      } else {
        launchData.carryDistance = row.carry;
        launchData.totalDistance = row.total;
        launchData.ballSpeed = row.ballSpeed;
        launchData.clubSpeed = row.clubSpeed;
        launchData.spinRate = row.spinRate;
        launchData.launchAngle = row.launchAngle;
      }

      existing.launchData = launchData;
      clubUpdates.set(club.id, existing);
    }

    for (const club of clubUpdates.values()) {
      onUpdate(club);
    }
    setHasChanges(false);
  };

  // Compute gaps (carry-based)
  const rowsWithCarry = rows.filter(r => r.carry != null && r.carry > 0);
  const sortedByCarry = [...rowsWithCarry].sort((a, b) => (b.carry || 0) - (a.carry || 0));

  const gaps: { from: string; to: string; gap: number }[] = [];
  for (let i = 0; i < sortedByCarry.length - 1; i++) {
    const gap = (sortedByCarry[i].carry || 0) - (sortedByCarry[i + 1].carry || 0);
    gaps.push({
      from: sortedByCarry[i].label,
      to: sortedByCarry[i + 1].label,
      gap: Math.round(gap),
    });
  }

  const largestGap = gaps.length > 0 ? Math.max(...gaps.map(g => g.gap)) : 0;
  const longestCarry = sortedByCarry.length > 0 ? sortedByCarry[0].carry || 0 : 0;
  const shortestCarry = sortedByCarry.length > 0 ? sortedByCarry[sortedByCarry.length - 1].carry || 0 : 0;
  const coverageRange = longestCarry - shortestCarry;
  const problemGaps = gaps.filter(g => g.gap > 20 || g.gap < 5);

  const handleDownloadPDF = () => {
    generateBagMapPDF(rows, gaps, { longestCarry, shortestCarry, coverageRange, largestGap, problemGaps });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><Target size={22} className="text-emerald-700" /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bag Mapping</h2>
              <p className="text-xs text-slate-500">Enter your distances and sim data. Gaps are calculated automatically.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
              <Download size={16} /> Download PDF
            </button>
            {hasChanges && (
              <button onClick={handleSaveAll} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                <Save size={16} /> Save All
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
        </div>

        {/* Summary Cards */}
        {sortedByCarry.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 border-b border-slate-100 bg-slate-50">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Longest Club</p>
              <p className="text-sm font-bold text-slate-800">{sortedByCarry[0]?.label}</p>
              <p className="text-xs text-emerald-600 font-semibold">{longestCarry}y carry</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Shortest Club</p>
              <p className="text-sm font-bold text-slate-800">{sortedByCarry[sortedByCarry.length - 1]?.label}</p>
              <p className="text-xs text-emerald-600 font-semibold">{shortestCarry}y carry</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Coverage Range</p>
              <p className="text-lg font-bold text-slate-800">{coverageRange}y</p>
            </div>
            <div className={`p-3 rounded-xl border shadow-sm ${largestGap > 20 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Largest Gap</p>
              <p className={`text-lg font-bold ${largestGap > 20 ? 'text-red-700' : 'text-slate-800'}`}>{largestGap}y</p>
              {largestGap > 20 && <p className="text-[10px] text-red-500 font-medium">Potential coverage gap</p>}
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Club</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-center px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Carry (y)</th>
                <th className="text-center px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total (y)</th>
                <th className="text-center px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ball Spd</th>
                <th className="text-center px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Club Spd</th>
                <th className="text-center px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Spin (rpm)</th>
                <th className="text-center px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Launch °</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                // Find gap row to show after this row
                const gapAfter = sortedByCarry.length > 1
                  ? gaps.find(g => g.from === row.label)
                  : null;

                return (
                  <React.Fragment key={`${row.clubId}-${row.ironLabel || 'main'}`}>
                    <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 text-sm">{row.label}</div>
                        {row.loft && <span className="text-[10px] text-slate-400">{row.loft}°</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          row.type === ClubType.DRIVER ? 'bg-purple-100 text-purple-700' :
                          row.type === ClubType.WOOD ? 'bg-blue-100 text-blue-700' :
                          row.type === ClubType.HYBRID ? 'bg-cyan-100 text-cyan-700' :
                          row.type === ClubType.IRON ? 'bg-emerald-100 text-emerald-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          value={row.carry ?? ''}
                          onChange={e => updateField(idx, 'carry', e.target.value)}
                          placeholder="—"
                          className="w-16 text-center text-sm font-semibold bg-transparent border border-slate-200 rounded-lg px-1 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          value={row.total ?? ''}
                          onChange={e => updateField(idx, 'total', e.target.value)}
                          placeholder="—"
                          className="w-16 text-center text-sm font-semibold bg-transparent border border-slate-200 rounded-lg px-1 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          value={row.ballSpeed ?? ''}
                          onChange={e => updateField(idx, 'ballSpeed', e.target.value)}
                          placeholder="—"
                          className="w-16 text-center text-xs bg-transparent border border-slate-200 rounded-lg px-1 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          value={row.clubSpeed ?? ''}
                          onChange={e => updateField(idx, 'clubSpeed', e.target.value)}
                          placeholder="—"
                          className="w-16 text-center text-xs bg-transparent border border-slate-200 rounded-lg px-1 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          value={row.spinRate ?? ''}
                          onChange={e => updateField(idx, 'spinRate', e.target.value)}
                          placeholder="—"
                          className="w-20 text-center text-xs bg-transparent border border-slate-200 rounded-lg px-1 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          value={row.launchAngle ?? ''}
                          onChange={e => updateField(idx, 'launchAngle', e.target.value)}
                          placeholder="—"
                          className="w-16 text-center text-xs bg-transparent border border-slate-200 rounded-lg px-1 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        />
                      </td>
                    </tr>

                    {/* Gap indicator row */}
                    {gapAfter && (
                      <tr>
                        <td colSpan={8} className="px-4 py-0">
                          <div className={`flex items-center gap-2 mx-8 my-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold ${getGapColor(gapAfter.gap).bg} ${getGapColor(gapAfter.gap).text}`}>
                            {getGapColor(gapAfter.gap).icon}
                            <span>{gapAfter.gap}y gap</span>
                            <span className="text-[10px] font-normal opacity-70">
                              {gapAfter.gap > 20 ? '— Consider adding a club here' : gapAfter.gap < 5 ? '— Possible overlap' : '— Good spacing'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Target size={40} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">No clubs in your bag</p>
            <p className="text-xs mt-1">Add clubs to your bag to start mapping distances.</p>
          </div>
        )}

        {/* Problem Gaps Summary */}
        {problemGaps.length > 0 && (
          <div className="p-5 border-t border-slate-200 bg-red-50/50">
            <h3 className="text-xs font-bold text-red-800 uppercase mb-2 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Flagged Gaps
            </h3>
            <div className="flex flex-wrap gap-2">
              {problemGaps.map((g, i) => (
                <div key={i} className="bg-white border border-red-200 rounded-lg px-3 py-1.5 text-xs">
                  <span className="font-semibold text-red-700">{g.gap}y</span>
                  <span className="text-slate-500 ml-1.5">{g.from} → {g.to}</span>
                  <span className="text-red-500 ml-1.5">{g.gap > 20 ? '(gap)' : '(overlap)'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <p className="text-[10px] text-slate-400">
            {rows.length} club{rows.length !== 1 ? 's' : ''} mapped · Gaps based on carry distance
          </p>
          <div className="flex gap-2">
            <button onClick={handleDownloadPDF} className="text-xs text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1">
              <Download size={14} /> PDF Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BagMapping;
