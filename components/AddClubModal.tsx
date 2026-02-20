
import React, { useState, useRef } from 'react';
import { Club, ClubType, ClubStatus, AIScanResult } from '../types.ts';
import { X, Camera, Loader2, Sparkles, Receipt, Database, LayoutGrid } from 'lucide-react';
import { analyzeClubImage, analyzeReceiptImage, fileToGenerativePart, searchClubDatabase } from '../services/geminiService.ts';
import { storage } from '../lib/firebase.ts';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface AddClubModalProps {
  onClose: () => void;
  onSave: (club: Club) => void;
  initialData?: Club;
}

const IRON_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', 'PW', 'AW', 'GW', 'SW', 'LW'];

const GOLF_BRANDS = [
  'Callaway', 'TaylorMade', 'Titleist', 'Ping', 'Cobra', 'Cleveland',
  'Mizuno', 'Wilson', 'Srixon', 'Bridgestone', 'PXG', 'Tour Edge',
  'Honma', 'Miura', 'Adams', 'Ben Hogan', 'Acushnet', 'MacGregor',
  'Tommy Armour', 'Lynx', 'Odyssey', 'Scotty Cameron', 'Bettinardi',
  'Yes! Golf', 'Evnroll', 'SeeMore', 'L.A.B. Golf', 'Vokey', 'Artisan',
  'Fourteen', 'Other'
];

const AddClubModal: React.FC<AddClubModalProps> = ({ onClose, onSave, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [type, setType] = useState<ClubType>(initialData?.type || ClubType.DRIVER);
  const [status, setStatus] = useState<ClubStatus>(initialData?.status || ClubStatus.BAG);
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [brandIsCustom, setBrandIsCustom] = useState(
    !!initialData?.brand && !GOLF_BRANDS.slice(0, -1).includes(initialData.brand)
  );
  const [model, setModel] = useState(initialData?.model || '');
  const [loft, setLoft] = useState(initialData?.loft || '');
  const [isSet, setIsSet] = useState<boolean>(!!initialData?.setComposition && initialData.setComposition.length > 0);
  const [composition, setComposition] = useState<string[]>(initialData?.setComposition || []);
  const [shaftMakeModel, setShaftMakeModel] = useState(initialData?.shaftMakeModel || '');
  const [shaftStiffness, setShaftStiffness] = useState(initialData?.shaftStiffness || '');
  const [price, setPrice] = useState(initialData?.price ? initialData.price.toString() : '');
  const [purchaseDate, setPurchaseDate] = useState(initialData?.purchaseDate || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(initialData?.photoUrl);
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(initialData?.receiptUrl);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  
  const isAccessory = type === ClubType.ACCESSORY;
  const isIron = type === ClubType.IRON;

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const toggleIronSelection = (iron: string) => {
    setComposition(prev => 
      prev.includes(iron) ? prev.filter(i => i !== iron) : [...prev, iron]
    );
  };

  const handleDatabaseSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setAiStatus('Searching...');
    try {
      const result: AIScanResult = await searchClubDatabase(searchQuery);
      if (result.brand) {
        setBrand(result.brand);
        setBrandIsCustom(!GOLF_BRANDS.slice(0, -1).includes(result.brand));
      }
      if (result.model) setModel(result.model);
      if (result.type) setType(result.type);
      if (result.loft) setLoft(result.loft);
      if (result.setComposition) { setComposition(result.setComposition); setIsSet(true); }
      setAiStatus('Result found!');
    } catch { setAiStatus('Not found.'); }
    finally { setLoading(false); }
  };

  const handleClubPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setAiStatus('Scanning Photo...');
    try {
      const url = await uploadFile(file, 'club-photos');
      setPhotoUrl(url);
      const base64Data = await fileToGenerativePart(file);
      const result: AIScanResult = await analyzeClubImage(base64Data, file.type);
      if (result.brand) {
        setBrand(result.brand);
        setBrandIsCustom(!GOLF_BRANDS.slice(0, -1).includes(result.brand));
      }
      if (result.model) setModel(result.model);
      if (result.type) setType(result.type);
      if (result.setComposition) { setComposition(result.setComposition); setIsSet(true); }
      setAiStatus('AI analysis complete!');
    } catch { setAiStatus('Upload failed.'); }
    finally { setLoading(false); }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setAiStatus('Scanning Receipt...');
    try {
      const url = await uploadFile(file, 'receipt-photos');
      setReceiptUrl(url);
      const base64Data = await fileToGenerativePart(file);
      const result: AIScanResult = await analyzeReceiptImage(base64Data, file.type);
      if (result.price) setPrice(result.price.toString());
      if (result.purchaseDate) setPurchaseDate(result.purchaseDate);
      setAiStatus('Receipt details found!');
    } catch { setAiStatus('Scan failed.'); }
    finally { setLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalComposition = (isIron && isSet) 
      ? composition.sort((a, b) => IRON_ORDER.indexOf(a) - IRON_ORDER.indexOf(b)) 
      : undefined;

    // Sanitize values: Empty strings should be null for the database
    onSave({
      id: initialData?.id || '',
      dateAdded: initialData?.dateAdded || Date.now(),
      type, brand, model,
      loft: (isAccessory || (isIron && isSet) || !loft) ? undefined : loft,
      setComposition: finalComposition && finalComposition.length > 0 ? finalComposition : undefined,
      shaftMakeModel: (isAccessory || !shaftMakeModel) ? undefined : shaftMakeModel,
      shaftStiffness: (isAccessory || !shaftStiffness) ? undefined : shaftStiffness,
      price: price ? parseFloat(price) : undefined,
      purchaseDate: purchaseDate || undefined,
      notes: notes || undefined,
      photoUrl, receiptUrl, status,
      launchData: initialData?.launchData,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">{initialData ? "Edit Equipment" : "Add Equipment"}</h2>
            <button onClick={onClose} className="text-slate-400 p-1 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
          </div>

          {aiStatus && (
            <div className={`mb-6 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border shadow-sm ${loading ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {aiStatus}
            </div>
          )}

          <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Database size={14} className="text-emerald-600"/> Quick Catalog Search
            </h3>
            <div className="flex gap-2">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleDatabaseSearch(e)} placeholder="e.g. TaylorMade Stealth 2" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
              <button type="button" onClick={handleDatabaseSearch} disabled={loading || !searchQuery.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">Find</button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer h-36 transition-all ${photoUrl ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'}`}>
                <input type="file" ref={fileInputRef} onChange={handleClubPhotoUpload} accept="image/*" className="hidden" />
                {photoUrl ? <img src={photoUrl} className="h-full w-full object-contain" alt="Preview" /> : <div className="text-center"><Camera size={24} className="text-slate-400 mb-1 mx-auto" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Club Photo</span></div>}
              </div>
              <div onClick={() => receiptInputRef.current?.click()} className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer h-36 transition-all ${receiptUrl ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}>
                <input type="file" ref={receiptInputRef} onChange={handleReceiptUpload} accept="image/*" className="hidden" />
                {receiptUrl ? <img src={receiptUrl} className="h-full w-full object-contain" alt="Preview" /> : <div className="text-center"><Receipt size={24} className="text-slate-400 mb-1 mx-auto" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Receipt / Invoice</span></div>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {Object.values(ClubType).map(t => (
                  <button key={t} type="button" onClick={() => { setType(t); if (t !== ClubType.IRON) setIsSet(false); }} className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all border ${type === t ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-500 border-slate-200'}`}>{t}</button>
                ))}
              </div>

              {isIron && (
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2"><LayoutGrid size={16} className="text-emerald-600" /><span className="text-xs font-bold text-emerald-900">Set Configuration</span></div>
                    <div className="flex bg-white p-1 rounded-lg border border-emerald-200">
                      <button type="button" onClick={() => setIsSet(false)} className={`px-3 py-1 text-[9px] font-bold rounded uppercase ${!isSet ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Single</button>
                      <button type="button" onClick={() => setIsSet(true)} className={`px-3 py-1 text-[9px] font-bold rounded uppercase ${isSet ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Set</button>
                    </div>
                  </div>
                  {isSet && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                        {IRON_ORDER.map(iron => (
                          <button key={iron} type="button" onClick={() => toggleIronSelection(iron)} className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${composition.includes(iron) ? 'bg-emerald-600 border-emerald-700 text-white' : 'bg-white border-emerald-100 text-emerald-600'}`}>{iron}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Brand</label>
                <select
                  value={brandIsCustom ? 'Other' : brand}
                  onChange={(e) => {
                    if (e.target.value === 'Other') {
                      setBrandIsCustom(true);
                      setBrand('');
                    } else {
                      setBrandIsCustom(false);
                      setBrand(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required={!brandIsCustom}
                >
                  <option value="">Select brand...</option>
                  {GOLF_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                {brandIsCustom && (
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-2"
                    placeholder="Enter brand name"
                    required
                    autoFocus
                  />
                )}
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Model</label>
                <input type="text" required value={model} onChange={(e) => setModel(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. T200" />
              </div>
              
              {!isAccessory && !(isIron && isSet) && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Loft (°)</label>
                  <input type="text" value={loft} onChange={(e) => setLoft(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. 56" />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Price ($)</label>
                <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="0.00" />
              </div>
              
              <div className={isAccessory ? 'col-span-2' : ''}>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Purchase Date</label>
                <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>

              {!isAccessory && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Shaft</label>
                    <input type="text" value={shaftMakeModel} onChange={(e) => setShaftMakeModel(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Model" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Flex</label>
                    <select value={shaftStiffness} onChange={(e) => setShaftStiffness(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="">Select</option>
                      <option value="X">X-Stiff</option>
                      <option value="S">Stiff</option>
                      <option value="R">Regular</option>
                      <option value="A">Senior</option>
                      <option value="L">Ladies</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
               <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button type="button" onClick={() => setStatus(ClubStatus.BAG)} className={`px-3 py-1 text-[9px] font-bold rounded uppercase transition-all ${status === ClubStatus.BAG ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'}`}>Bag</button>
                  <button type="button" onClick={() => setStatus(ClubStatus.LOCKER)} className={`px-3 py-1 text-[9px] font-bold rounded uppercase transition-all ${status === ClubStatus.LOCKER ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'}`}>Locker</button>
               </div>
               <div className="flex gap-3">
                <button type="button" onClick={onClose} className="text-sm font-bold text-slate-400 px-4">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all">Save Club</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddClubModal;
