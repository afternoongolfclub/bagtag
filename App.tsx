
import React, { useState, useEffect } from 'react';
import { Club, ClubStatus, ClubType } from './types.ts';
import ClubCard from './components/ClubCard.tsx';
import AddClubModal from './components/AddClubModal.tsx';
import LoginModal from './components/LoginModal.tsx';
import { generatePDF } from './services/pdfService.ts';
import { useAuth } from './contexts/AuthContext.tsx';
import { db } from './lib/firebase.ts';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { Plus, Download, Search, LayoutGrid, Archive, LogIn, LogOut, User as UserIcon, ShieldAlert, ShieldCheck } from 'lucide-react';

const WIFE_MODE_CLUBS: Club[] = [
  {
    id: 'wm-1',
    type: ClubType.DRIVER,
    brand: 'TaylorMade',
    model: 'M4',
    loft: '10.5',
    shaftMakeModel: 'Stock Fujikura',
    shaftStiffness: 'Regular',
    price: 149.99,
    purchaseDate: '2018-06-15',
    dateAdded: Date.now(),
    status: ClubStatus.BAG,
  },
  {
    id: 'wm-2',
    type: ClubType.IRON,
    brand: 'Ping',
    model: 'G400',
    setComposition: ['4', '5', '6', '7', '8', '9', 'PW'],
    shaftMakeModel: 'AWT 2.0',
    shaftStiffness: 'Regular',
    price: 399.00,
    purchaseDate: '2019-03-20',
    dateAdded: Date.now(),
    status: ClubStatus.BAG,
  }
];

export default function App() {
  const { user, firebaseUser, logout, isLoading: authLoading } = useAuth();
  
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ClubStatus>(ClubStatus.BAG);
  const [isWifeMode, setIsWifeMode] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    fetchClubs();
  }, [user, authLoading]);

  const fetchClubs = async () => {
    if (!firebaseUser) {
      setClubs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users', firebaseUser.uid, 'clubs'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const mappedClubs: Club[] = snapshot.docs.map(docSnap => {
        const item = docSnap.data();
        return {
          id: docSnap.id,
          type: item.type as ClubType,
          brand: item.brand,
          model: item.model,
          loft: item.loft,
          setComposition: item.setComposition,
          shaftMakeModel: item.shaftMakeModel,
          shaftStiffness: item.shaftStiffness,
          photoUrl: item.photoUrl,
          receiptUrl: item.receiptUrl,
          purchaseDate: item.purchaseDate,
          price: item.price,
          notes: item.notes,
          launchData: item.launchData,
          dateAdded: item.createdAt?.toMillis?.() ?? Date.now(),
          status: item.status as ClubStatus,
          tradeInLow: item.tradeInLow,
          tradeInHigh: item.tradeInHigh,
          lastTradeInCheck: item.lastTradeInCheck,
        };
      });
      setClubs(mappedClubs);
    } catch (err) {
      console.error("Fetch clubs error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClub = async (club: Club) => {
    if (!firebaseUser) return;

    const payload = {
      type: club.type,
      brand: club.brand,
      model: club.model,
      loft: club.loft ?? null,
      setComposition: club.setComposition ?? null,
      shaftMakeModel: club.shaftMakeModel ?? null,
      shaftStiffness: club.shaftStiffness ?? null,
      photoUrl: club.photoUrl ?? null,
      receiptUrl: club.receiptUrl ?? null,
      purchaseDate: club.purchaseDate ?? null,
      price: club.price ?? null,
      notes: club.notes ?? null,
      launchData: club.launchData ?? null,
      status: club.status,
      tradeInLow: club.tradeInLow ?? null,
      tradeInHigh: club.tradeInHigh ?? null,
      lastTradeInCheck: club.lastTradeInCheck ?? null,
    };

    const clubsCol = collection(db, 'users', firebaseUser.uid, 'clubs');

    if (editingClub || club.id) {
      await updateDoc(doc(clubsCol, club.id), payload);
    } else {
      await addDoc(clubsCol, { ...payload, createdAt: serverTimestamp() });
    }
    fetchClubs();
  };

  const removeClub = async (id: string) => {
    if (isWifeMode || !firebaseUser) return;
    await deleteDoc(doc(db, 'users', firebaseUser.uid, 'clubs', id));
    setClubs(prev => prev.filter(c => c.id !== id));
  };

  const toggleClubStatus = async (id: string) => {
    if (isWifeMode || !firebaseUser) return;
    const club = clubs.find(c => c.id === id);
    if (!club) return;
    const newStatus = club.status === ClubStatus.BAG ? ClubStatus.LOCKER : ClubStatus.BAG;
    await updateDoc(doc(db, 'users', firebaseUser.uid, 'clubs', id), { status: newStatus });
    fetchClubs();
  };

  const openAddModal = () => {
    setEditingClub(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (club: Club) => {
    setEditingClub(club);
    setIsAddModalOpen(true);
  };

  const activeData = isWifeMode ? WIFE_MODE_CLUBS : clubs;
  const filteredClubs = activeData.filter(c => {
    const matchesSearch = 
      c.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && c.status === activeTab;
  });

  const getRealItemCount = (items: Club[]) => items.reduce((total, item) => total + (item.setComposition?.length || 1), 0);
  const bagItems = activeData.filter(c => c.status === ClubStatus.BAG);
  const lockerItems = activeData.filter(c => c.status === ClubStatus.LOCKER);
  const bagCount = getRealItemCount(bagItems);
  const lockerCount = getRealItemCount(lockerItems);
  const totalClubsCount = getRealItemCount(activeData);
  const totalValue = activeData.reduce((sum, c) => sum + (c.price || 0), 0);

  if (authLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-500 ${isWifeMode ? 'bg-stone-50' : 'bg-slate-50'}`}>
      <header className={`border-b sticky top-0 z-30 shadow-sm transition-colors duration-500 ${isWifeMode ? 'bg-stone-100 border-stone-200' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg transition-colors duration-500 ${isWifeMode ? 'bg-stone-600 text-stone-100' : 'bg-emerald-600 text-white'}`}><LayoutGrid size={24} /></div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">BagTag</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
             <button 
              onClick={() => setIsWifeMode(!isWifeMode)} 
              title={isWifeMode ? "Disable Stealth Mode" : "Enable Stealth Mode"}
              className={`p-2 rounded-lg border transition-all ${isWifeMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-100'}`}
             >
              {isWifeMode ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
             </button>
             {!isWifeMode && <button onClick={() => generatePDF(clubs)} className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600 px-3 py-2 rounded-lg"><Download size={18} /><span>Export PDF</span></button>}
            {!isWifeMode && user && <button onClick={openAddModal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 text-sm sm:text-base"><Plus size={18} /><span>Add Club</span></button>}
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end"><span className="text-sm font-semibold text-slate-800">{user.name}</span><span className="text-[10px] text-slate-500 uppercase">Pro Member</span></div>
                <button onClick={logout} className="p-2 text-slate-400 hover:text-red-600 rounded-full"><LogOut size={20} /></button>
              </div>
            ) : (
              <button onClick={() => setIsLoginModalOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-emerald-600 px-2 py-2"><LogIn size={18} /><span>Log In</span></button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user && !isWifeMode && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3"><div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><UserIcon size={20} /></div><div><h3 className="text-sm font-bold text-indigo-900">Cloud Sync Disabled</h3><p className="text-sm text-indigo-700">Sign in to sync your bag to Firebase.</p></div></div>
            <button onClick={() => setIsLoginModalOpen(true)} className="text-sm font-semibold text-white bg-indigo-600 px-4 py-2 rounded-lg">Create Account</button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className={`p-4 rounded-xl border shadow-sm ${isWifeMode ? 'bg-stone-100 border-stone-200' : 'bg-white border-slate-200'}`}><p className="text-xs text-slate-500 uppercase font-semibold">Total Clubs</p><p className="text-2xl font-bold text-slate-800">{totalClubsCount}</p></div>
          <div className={`p-4 rounded-xl border shadow-sm ${isWifeMode ? 'bg-stone-100 border-stone-200' : 'bg-white border-slate-200'}`}><p className="text-xs text-slate-500 uppercase font-semibold">Total Value</p><p className={`text-2xl font-bold ${isWifeMode ? 'text-stone-600' : 'text-emerald-600'}`}>${totalValue.toFixed(2)}</p></div>
        </div>

        <div className={`flex space-x-1 rounded-xl p-1 mb-6 max-w-md ${isWifeMode ? 'bg-stone-200' : 'bg-slate-200'}`}>
          <button onClick={() => setActiveTab(ClubStatus.BAG)} className={`w-full rounded-lg py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === ClubStatus.BAG ? 'shadow bg-white text-emerald-700' : 'text-slate-600'}`}><LayoutGrid size={16} />My Bag<span className="ml-2 rounded-full py-0.5 px-2 text-xs bg-emerald-100">{bagCount}</span></button>
          <button onClick={() => setActiveTab(ClubStatus.LOCKER)} className={`w-full rounded-lg py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === ClubStatus.LOCKER ? 'shadow bg-white text-emerald-700' : 'text-slate-600'}`}><Archive size={16} />Locker Room<span className="ml-2 rounded-full py-0.5 px-2 text-xs bg-slate-300">{lockerCount}</span></button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder={`Search...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm" />
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
        ) : filteredClubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {filteredClubs.map(club => (
              <div key={club.id} className="h-full"><ClubCard club={club} onDelete={removeClub} onUpdate={handleSaveClub} onEdit={openEditModal} onToggleStatus={toggleClubStatus} readOnly={isWifeMode}/></div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">{activeTab === ClubStatus.BAG ? <LayoutGrid size={32} className="text-slate-400" /> : <Archive size={32} className="text-slate-400" />}</div>
            <h3 className="text-lg font-medium text-slate-900">{activeTab === ClubStatus.BAG ? "Your bag is empty" : "Locker room is empty"}</h3>
            <p className="text-slate-500 mt-1 max-w-sm mx-auto">Build your digital bag with Firebase cloud sync.</p>
          </div>
        )}
      </main>

      {isAddModalOpen && !isWifeMode && <AddClubModal onClose={() => setIsAddModalOpen(false)} onSave={handleSaveClub} initialData={editingClub || undefined}/>}
      {isLoginModalOpen && <LoginModal onClose={() => setIsLoginModalOpen(false)} />}
    </div>
  );
}
