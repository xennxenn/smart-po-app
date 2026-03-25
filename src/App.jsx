import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Package, Users, Database, Plus, Trash2, 
  Save, FileText, ArrowLeft, Check, AlertCircle, Edit, List,
  Printer, Upload, Search, X, AlertTriangle
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, serverTimestamp, getDoc
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBiy0aiyLr_HBi5E-enFhG4VVvGb2QPT2c",
  authDomain: "smart-po-app.firebaseapp.com",
  projectId: "smart-po-app",
  storageBucket: "smart-po-app.firebasestorage.app",
  messagingSenderId: "341070222786",
  appId: "1:341070222786:web:3081e8cb4195f07406b25b",
  measurementId: "G-3LPJ1XY5C5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App Data State
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [equipmentSets, setEquipmentSets] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pos');
  const [editingPoId, setEditingPoId] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
        setLoadingAuth(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const basePath = `users/${user.uid}`;

    const unsubSuppliers = onSnapshot(collection(db, `${basePath}/suppliers`), (snap) => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("Firestore error (suppliers):", err));

    const unsubItems = onSnapshot(collection(db, `${basePath}/items`), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("Firestore error (items):", err));

    const unsubSets = onSnapshot(collection(db, `${basePath}/equipmentSets`), (snap) => {
      setEquipmentSets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("Firestore error (sets):", err));

    const unsubPOs = onSnapshot(collection(db, `${basePath}/purchaseOrders`), (snap) => {
      setPurchaseOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error("Firestore error (pos):", err));

    return () => {
      unsubSuppliers(); unsubItems(); unsubSets(); unsubPOs();
    };
  }, [user]);

  const getItemPrice = (itemId) => items.find(i => i.id === itemId)?.price || 0;
  
  const getSetPrice = (setId) => {
    const eqSet = equipmentSets.find(s => s.id === setId);
    if (!eqSet) return 0;
    return eqSet.items.reduce((total, setItem) => {
      return total + (getItemPrice(setItem.itemId) * setItem.quantity);
    }, 0);
  };

  const seedDatabase = async () => {
    if (!user) return;
    const basePath = `users/${user.uid}`;
    try {
      const s1Id = 'SUP001';
      await setDoc(doc(db, `${basePath}/suppliers`, s1Id), { brandName: 'IT Solutions', companyName: 'IT Solutions Co.,Ltd.', address: 'Bangkok', branch: 'HQ', taxId: '1234567890123' });
      const i1Id = 'ITM001';
      await setDoc(doc(db, `${basePath}/items`, i1Id), { supplierId: s1Id, barcode: '885001', nameEn: 'Wireless Mouse', nameTh: 'เมาส์ไร้สาย', price: 590 });
      const i2Id = 'ITM002'; // สินค้าชื่อซ้ำแต่บาร์โค้ดเดิมเพื่อทดสอบ
      await setDoc(doc(db, `${basePath}/items`, i2Id), { supplierId: s1Id, barcode: '885001', nameEn: 'Wireless Mouse (Premium)', nameTh: 'เมาส์ไร้สาย (รุ่นพรีเมียม)', price: 990 });
      alert("สร้างข้อมูลตัวอย่างสำเร็จ!");
    } catch (e) {
      alert("เกิดข้อผิดพลาด: โปรดเช็ค Firestore Rules");
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">กำลังเชื่อมต่อฐานข้อมูล Cloud...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่สามารถเข้าสู่ระบบได้</h2>
        <p className="text-slate-600 max-w-md">โปรดเปิดใช้งาน 'Anonymous Login' ใน Firebase Console</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans print:bg-white text-slate-900">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 shadow-sm print:hidden">
        <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-200">
            <ShoppingCart size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">PO Manager</h1>
        </div>
        <nav className="p-4 space-y-1">
          <SidebarButton icon={FileText} label="ใบสั่งซื้อ (POs)" active={activeTab === 'pos' || activeTab === 'po-editor'} onClick={() => setActiveTab('pos')} />
          <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ข้อมูลพื้นฐาน</div>
          <SidebarButton icon={Package} label="ชุดอุปกรณ์" active={activeTab === 'sets'} onClick={() => setActiveTab('sets')} />
          <SidebarButton icon={Database} label="รายการสินค้า" active={activeTab === 'items'} onClick={() => setActiveTab('items')} />
          <SidebarButton icon={Users} label="ซัพพลายเออร์" active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} />
        </nav>
        <div className="p-4 mt-auto border-t border-slate-100">
          <button onClick={seedDatabase} className="w-full py-2.5 px-4 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all">
            + สร้างข้อมูลตัวอย่าง
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto print:overflow-visible">
        {activeTab === 'pos' && (
          <POList 
            purchaseOrders={purchaseOrders} 
            onCreateNew={() => { setEditingPoId(null); setActiveTab('po-editor'); }}
            onEdit={(id) => { setEditingPoId(id); setActiveTab('po-editor'); }}
            db={db} basePath={`users/${user.uid}`}
          />
        )}
        {activeTab === 'po-editor' && (
          <POEditor 
            poId={editingPoId}
            onBack={() => setActiveTab('pos')}
            items={items}
            equipmentSets={equipmentSets}
            suppliers={suppliers}
            getSetPrice={getSetPrice}
            db={db} basePath={`users/${user.uid}`}
          />
        )}
        {activeTab === 'suppliers' && <SupplierMaster suppliers={suppliers} db={db} basePath={`users/${user.uid}`} />}
        {activeTab === 'items' && <ItemMaster items={items} suppliers={suppliers} db={db} basePath={`users/${user.uid}`} />}
        {activeTab === 'sets' && <EquipmentSetMaster sets={equipmentSets} items={items} getSetPrice={getSetPrice} db={db} basePath={`users/${user.uid}`} />}
      </main>
    </div>
  );
}

function SidebarButton({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
      <Icon size={18} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

// --- View: PO List ---
function POList({ purchaseOrders, onCreateNew, onEdit, db, basePath }) {
  const handleDelete = async (id) => {
    if(confirm('ต้องการลบใบสั่งซื้อนี้ใช่หรือไม่?')) await deleteDoc(doc(db, `${basePath}/purchaseOrders`, id));
  };
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">ใบสั่งซื้อทั้งหมด</h2>
          <p className="text-slate-500 text-sm">รายการประวัติการสั่งซื้อของคุณ</p>
        </div>
        <button onClick={onCreateNew} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center shadow-lg active:scale-95"><Plus size={20} className="mr-2" /> สร้างใบสั่งซื้อใหม่</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {purchaseOrders.length === 0 ? <div className="p-16 text-center text-slate-400 font-medium">ไม่พบข้อมูลใบสั่งซื้อ</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                <tr><th className="p-5">เลขที่อ้างอิง</th><th className="p-5">วันที่</th><th className="p-5 text-center">ชุดที่สั่ง</th><th className="p-5 text-right">ยอดรวม</th><th className="p-5 text-center">จัดการ</th></tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {purchaseOrders.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50/50">
                    <td className="p-5 font-bold text-indigo-600 cursor-pointer" onClick={() => onEdit(po.id)}>{po.title || po.id}</td>
                    <td className="p-5 text-slate-500">{po.createdAt?.toDate ? po.createdAt.toDate().toLocaleDateString('th-TH') : '-'}</td>
                    <td className="p-5 text-center"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">{po.sets?.length || 0}</span></td>
                    <td className="p-5 text-right font-bold text-slate-900 font-mono">฿{(po.totalAmount || 0).toLocaleString()}</td>
                    <td className="p-5 text-center flex justify-center space-x-2">
                      <button onClick={() => onEdit(po.id)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit size={16}/></button>
                      <button onClick={() => handleDelete(po.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- View: PO Editor ---
function POEditor({ poId, onBack, items, equipmentSets, suppliers, getSetPrice, db, basePath }) {
  const [title, setTitle] = useState('');
  const [selectedSets, setSelectedSets] = useState([]);
  const [currentSetId, setCurrentSetId] = useState('');
  const [currentQty, setCurrentQty] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (poId) {
      getDoc(doc(db, `${basePath}/purchaseOrders`, poId)).then(snap => {
        if (snap.exists()) {
          setTitle(snap.data().title || '');
          setSelectedSets(snap.data().sets || []);
        }
      });
    } else {
      setTitle(`PO-${Date.now().toString().slice(-6)}`);
    }
  }, [poId]);

  const handleSave = async () => {
    if (!title.trim() || selectedSets.length === 0) return;
    setSaving(true);
    const total = selectedSets.reduce((sum, s) => sum + (getSetPrice(s.setId) * s.quantity), 0);
    await setDoc(doc(db, `${basePath}/purchaseOrders`, poId || `PO-${Date.now()}`), { title, sets: selectedSets, totalAmount: total, createdAt: serverTimestamp() }, { merge: true });
    onBack();
  };

  const report2Rows = useMemo(() => {
    const map = {};
    selectedSets.forEach(sel => {
      const s = equipmentSets.find(e => e.id === sel.setId);
      s?.items.forEach(itm => {
        if (!map[itm.itemId]) map[itm.itemId] = 0;
        map[itm.itemId] += (itm.quantity * sel.quantity);
      });
    });
    return Object.entries(map).map(([id, qty]) => {
      const item = items.find(i => i.id === id);
      const sup = suppliers.find(su => su.id === item?.supplierId);
      return { ...item, supplierName: sup?.brandName || 'Unknown', qty, total: (item?.price || 0) * qty };
    }).sort((a,b) => a.supplierName.localeCompare(b.supplierName));
  }, [selectedSets, equipmentSets, items, suppliers]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 print:p-0">
      <div className="flex justify-between items-center print:hidden bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="font-bold text-lg border-b border-transparent focus:border-indigo-500 outline-none px-2 py-1"/>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 rounded-xl font-bold flex items-center shadow-sm hover:bg-slate-200 transition-colors"><Printer size={18} className="mr-2"/> พิมพ์ PDF</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all">{saving ? '...' : 'บันทึก'}</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-sm print:hidden">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Plus size={18} className="mr-2 text-indigo-500"/> เลือกชุดอุปกรณ์ที่สั่งซื้อ</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <select value={currentSetId} onChange={e => setCurrentSetId(e.target.value)} className="flex-1 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">-- เลือกชุดอุปกรณ์ --</option>
            {equipmentSets.map(s => <option key={s.id} value={s.id}>{s.name} (฿{getSetPrice(s.id).toLocaleString()})</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" min="1" value={currentQty} onChange={e => setCurrentQty(parseInt(e.target.value)||1)} className="w-24 border rounded-xl p-3 outline-none"/>
            <button onClick={() => { if(currentSetId) { setSelectedSets([...selectedSets, {setId: currentSetId, quantity: currentQty}]); setCurrentSetId(''); } }} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95">เพิ่ม</button>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* Report 1 */}
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 p-4 border-b font-bold text-slate-800">รายงาน 1: รายการชุดอุปกรณ์ที่สั่งซื้อ</div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <tr><th className="p-4">ชื่อชุดอุปกรณ์</th><th className="p-4 text-center">จำนวน</th><th className="p-4 text-right">ต่อชุด</th><th className="p-4 text-right">ราคารวม</th><th className="p-4 print:hidden text-center">จัดการ</th></tr>
            </thead>
            <tbody className="divide-y text-[13px]">
              {selectedSets.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-700">{equipmentSets.find(e => e.id === s.setId)?.name}</td>
                  <td className="p-4 text-center font-bold text-indigo-600">{s.quantity}</td>
                  <td className="p-4 text-right font-mono">฿{getSetPrice(s.setId).toLocaleString()}</td>
                  <td className="p-4 text-right font-bold text-slate-900 font-mono">฿{(getSetPrice(s.setId) * s.quantity).toLocaleString()}</td>
                  <td className="p-4 text-center print:hidden"><button onClick={() => setSelectedSets(selectedSets.filter((_, idx) => idx !== i))} className="text-red-400 p-1 hover:bg-red-50 rounded transition-colors"><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/50 font-bold"><td colSpan="3" className="p-4 text-right">ยอดรวมรายงาน 1</td><td className="p-4 text-right text-indigo-700 font-mono">฿{selectedSets.reduce((sum, s) => sum + (getSetPrice(s.setId) * s.quantity), 0).toLocaleString()}</td><td></td></tr>
            </tfoot>
          </table>
        </div>

        {/* Report 2 */}
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 p-4 border-b font-bold text-slate-800">รายงาน 2: สรุปรายการสินค้าย่อยทั้งหมด</div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <tr><th className="p-4">ซัพพลายเออร์</th><th className="p-4">ชื่อสินค้า</th><th className="p-4 text-right font-mono">ราคาหน่วย</th><th className="p-4 text-center">รวมจำนวน</th><th className="p-4 text-right font-mono">ราคารวม</th></tr>
            </thead>
            <tbody className="divide-y text-[13px]">
              {report2Rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">{r.supplierName}</span></td>
                  <td className="p-4"><div className="font-bold">{r.nameTh}</div><div className="text-[11px] text-slate-400">{r.barcode}</div></td>
                  <td className="p-4 text-right font-mono text-slate-500">฿{r.price?.toLocaleString()}</td>
                  <td className="p-4 text-center font-bold text-indigo-600">{r.qty}</td>
                  <td className="p-4 text-right font-bold text-slate-900 font-mono">฿{r.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/50 font-bold"><td colSpan="4" className="p-4 text-right">ยอดรวมรายงาน 2</td><td className="p-4 text-right text-indigo-700 font-mono">฿{report2Rows.reduce((sum, r) => sum + r.total, 0).toLocaleString()}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- View: Equipment Set Master (Updated with Import Feature) ---
function EquipmentSetMaster({ sets, items, getSetPrice, db, basePath }) {
  const [name, setName] = useState('');
  const [setItems, setSetItems] = useState([]);
  const [curItem, setCurItem] = useState('');
  const [curQty, setCurQty] = useState(1);
  const [editingId, setEditingId] = useState(null);
  
  // States for Import Feature
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPending, setImportPending] = useState([]); // { barcode, qty, matches }
  const [importResults, setImportResults] = useState({}); // { index: itemId }

  const handleSave = async () => {
    if (!name.trim() || setItems.length === 0) return;
    const id = editingId || `SET-${Date.now()}`;
    await setDoc(doc(db, `${basePath}/equipmentSets`, id), { name, items: setItems });
    setName(''); setSetItems([]); setEditingId(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rows = evt.target.result.split('\n').filter(r => r.trim());
      const newAutoAdded = [];
      const newPending = [];

      rows.forEach(row => {
        // รองรับทั้ง Tab, ลูกน้ำ (,), และการเคาะ Spacebar (สำหรับหน้าชุดอุปกรณ์)
        const cleanRow = row.replace(/\r/g, '').trim();
        let cols = cleanRow.split('\t');
        if (cols.length < 2) cols = cleanRow.split(',');
        if (cols.length < 2) cols = cleanRow.split(/\s+/);

        if (cols.length >= 2) {
          const barcode = cols[0].trim();
          const qty = parseInt(cols[1]) || 1;
          const matches = items.filter(i => i.barcode === barcode);

          if (matches.length === 1) {
            newAutoAdded.push({ itemId: matches[0].id, quantity: qty });
          } else if (matches.length > 1) {
            newPending.push({ barcode, qty, options: matches });
          }
        }
      });

      if (newPending.length > 0) {
        setImportPending(newPending);
        // เก็บรายการที่ไม่ซ้ำไว้รอรวมทีเดียว
        setSetItems(prev => [...prev, ...newAutoAdded]);
        setShowImportModal(true);
      } else {
        setSetItems(prev => [...prev, ...newAutoAdded]);
        alert(`นำเข้าสำเร็จ! เพิ่ม ${newAutoAdded.length} รายการ`);
      }
    };
    reader.readAsText(file);
    e.target.value = null; // Reset input
  };

  const confirmPendingImport = () => {
    const resolved = Object.entries(importResults).map(([idx, itemId]) => ({
      itemId,
      quantity: importPending[idx].qty
    }));
    setSetItems(prev => [...prev, ...resolved]);
    setShowImportModal(false);
    setImportPending([]);
    setImportResults({});
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">จัดการชุดอุปกรณ์</h2>
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-sm text-slate-700">ข้อมูลชุดอุปกรณ์</h4>
          <label className="cursor-pointer bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center">
            <Upload size={14} className="mr-2"/> นำเข้าจากไฟล์ (คั่นด้วย Tab)
            <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.csv"/>
          </label>
        </div>
        
        <input value={name} onChange={e => setName(e.target.value)} placeholder="ระบุชื่อชุดอุปกรณ์ (เช่น ชุดพนักงานใหม่)" className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-slate-50 border-slate-200"/>
        
        <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <select value={curItem} onChange={e => setCurItem(e.target.value)} className="flex-1 border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-white">
            <option value="">-- เลือกสินค้ารายตัว --</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.barcode} | {i.nameTh}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" min="1" value={curQty} onChange={e => setCurQty(parseInt(e.target.value)||1)} className="w-20 border rounded-lg p-2.5 outline-none"/>
            <button onClick={() => { if(curItem) { setSetItems([...setItems, {itemId: curItem, quantity: curQty}]); setCurItem(''); } }} className="bg-slate-800 text-white px-6 rounded-lg font-bold hover:bg-slate-700">เพิ่ม</button>
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {setItems.length === 0 && <p className="text-center py-8 text-slate-400 text-sm border border-dashed rounded-xl">ยังไม่มีสินค้าในชุดนี้</p>}
          {setItems.map((si, i) => (
            <div key={i} className="flex justify-between items-center bg-indigo-50/30 px-4 py-2 rounded-xl border border-indigo-100 group">
              <span className="text-sm font-medium text-slate-700">{items.find(it => it.id === si.itemId)?.nameTh}</span>
              <div className="flex items-center space-x-3">
                <span className="font-bold text-indigo-600">x{si.quantity}</span>
                <button onClick={() => setSetItems(setItems.filter((_, idx) => idx !== i))} className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">บันทึกชุดอุปกรณ์</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sets.map(s => (
          <div key={s.id} className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col group transition-all hover:shadow-md border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-slate-800">{s.name}</h3>
              <div className="flex space-x-1">
                <button onClick={() => { setEditingId(s.id); setName(s.name); setSetItems(s.items); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit size={16}/></button>
                <button onClick={async () => { if(confirm('ต้องการลบชุดอุปกรณ์นี้?')) await deleteDoc(doc(db, `${basePath}/equipmentSets`, s.id)); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
              </div>
            </div>
            <ul className="text-[12px] text-slate-500 flex-1 space-y-1">{s.items.map((it, idx) => <li key={idx} className="flex justify-between"><span>• {items.find(x => x.id === it.itemId)?.nameTh}</span><span>x{it.quantity}</span></li>)}</ul>
            <div className="pt-4 mt-4 border-t flex justify-between font-bold text-sm text-indigo-700"><span>ราคาต่อชุด</span><span>฿{getSetPrice(s.id).toLocaleString()}</span></div>
          </div>
        ))}
      </div>

      {/* --- Import Conflict Modal --- */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center text-amber-600">
                <AlertTriangle className="mr-2" size={24}/>
                <h3 className="text-lg font-bold">พบบาร์โค้ดซ้ำ (โปรดเลือกรายการ)</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <p className="text-sm text-slate-500">บาร์โค้ดต่อไปนี้มีสินค้าหลายชื่อในระบบ โปรดเลือกชื่อสินค้าที่คุณต้องการใช้งานสำหรับแต่ละรายการในไฟล์:</p>
              {importPending.map((pending, idx) => (
                <div key={idx} className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex justify-between font-bold text-sm">
                    <span className="text-slate-400">Barcode: {pending.barcode}</span>
                    <span className="text-indigo-600">จำนวนที่นำเข้า: {pending.qty}</span>
                  </div>
                  <div className="space-y-2">
                    {pending.options.map((opt) => (
                      <label key={opt.id} className={`flex items-center p-3 rounded-xl border-2 transition-all cursor-pointer ${importResults[idx] === opt.id ? 'border-indigo-500 bg-indigo-50' : 'border-white bg-white hover:border-slate-200'}`}>
                        <input type="radio" name={`pending-${idx}`} checked={importResults[idx] === opt.id} onChange={() => setImportResults({...importResults, [idx]: opt.id})} className="hidden" />
                        <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${importResults[idx] === opt.id ? 'border-indigo-500' : 'border-slate-300'}`}>
                          {importResults[idx] === opt.id && <div className="w-2 h-2 bg-indigo-500 rounded-full" />}
                        </div>
                        <div className="text-sm">
                          <div className="font-bold text-slate-800">{opt.nameTh}</div>
                          {opt.nameEn && <div className="text-[11px] text-slate-500">{opt.nameEn}</div>}
                          <div className="text-xs text-slate-400 mt-0.5">ราคา: ฿{opt.price?.toLocaleString()}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t bg-slate-50 rounded-b-3xl">
              <button 
                onClick={confirmPendingImport} 
                disabled={Object.keys(importResults).length < importPending.length}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl font-bold disabled:opacity-50 shadow-lg shadow-indigo-100"
              >
                ยืนยันการเลือกและนำเข้าทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- View: Item Master ---
function ItemMaster({ items, suppliers, db, basePath }) {
  const [form, setForm] = useState({ barcode: '', nameEn: '', nameTh: '', price: '' });
  const [selectedSupId, setSelectedSupId] = useState('');
  const filteredItems = items.filter(i => i.supplierId === selectedSupId);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedSupId) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const rows = evt.target.result.split('\n').filter(r => r.trim());
      for (let row of rows) {
        const cleanRow = row.replace(/\r/g, '').trim();
        let cols = cleanRow.split('\t');
        if (cols.length < 2) cols = cleanRow.split(',');
        
        if (cols.length >= 2) {
          // ปรับให้ระบบฉลาดขึ้น รองรับทั้งแบบมีและไม่มีชื่อภาษาอังกฤษ
          let nameEn = '';
          let price = 0;
          
          if (cols.length === 3) {
            // ถ้ามี 3 คอลัมน์ (Barcode, NameTh, Price)
            price = parseFloat(cols[2]) || 0;
          } else if (cols.length >= 4) {
            // ถ้ามี 4 คอลัมน์ (Barcode, NameTh, NameEn, Price)
            nameEn = cols[2].trim();
            price = parseFloat(cols[3]) || 0;
          }

          await setDoc(doc(db, `${basePath}/items`, `ITM-${Date.now()}-${Math.random()}`), { 
            supplierId: selectedSupId, barcode: cols[0].trim(), nameTh: cols[1].trim(), nameEn: nameEn, price: price 
          });
        }
      }
      alert("นำเข้าสินค้าสำเร็จ!");
    };
    reader.readAsText(file);
    e.target.value = null; // รีเซ็ตไฟล์เพื่อให้กดอัปโหลดไฟล์เดิมซ้ำได้ถ้าต้องการ
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">รายการสินค้า (Master Data)</h2>
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 border-slate-100">
        <select value={selectedSupId} onChange={e => setSelectedSupId(e.target.value)} className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-white text-slate-700">
          <option value="">-- เลือกซัพพลายเออร์เพื่อจัดการสินค้า --</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.brandName || s.companyName}</option>)}
        </select>
        
        {selectedSupId && (
          <div className="pt-4 border-t space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-700">เพิ่มสินค้าใหม่</h4>
              <label className="cursor-pointer bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center">
                <Upload size={14} className="mr-2"/> นำเข้าสินค้า (คั่นด้วย Tab)
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.csv"/>
              </label>
            </div>
            <form onSubmit={async (e) => { e.preventDefault(); await setDoc(doc(db, `${basePath}/items`, `ITM-${Date.now()}`), { ...form, supplierId: selectedSupId, price: parseFloat(form.price)||0 }); setForm({barcode:'', nameEn:'', nameTh:'', price:''}); }} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input required placeholder="บาร์โค้ด" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-slate-50"/>
              <input required placeholder="ชื่อไทย" value={form.nameTh} onChange={e => setForm({...form, nameTh: e.target.value})} className="border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-slate-50"/>
              <input placeholder="ชื่ออังกฤษ (ถ้ามี)" value={form.nameEn} onChange={e => setForm({...form, nameEn: e.target.value})} className="border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-slate-50"/>
              <div className="flex gap-2">
                <input required type="number" placeholder="ราคา" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="flex-1 border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-slate-50"/>
                <button type="submit" className="bg-slate-800 text-white px-4 rounded-lg"><Plus size={18}/></button>
              </div>
            </form>
            <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 font-bold text-slate-500 border-b">
                  <tr><th className="p-3">บาร์โค้ด</th><th className="p-3">สินค้า</th><th className="p-3 text-right">ราคา</th><th className="p-3 text-center">จัดการ</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-500">{item.barcode}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-700">{item.nameTh}</div>
                        {item.nameEn && <div className="text-[11px] text-slate-400 mt-0.5">{item.nameEn}</div>}
                      </td>
                      <td className="p-3 text-right font-bold text-indigo-600 font-mono">฿{item.price?.toLocaleString()}</td>
                      <td className="p-3 text-center"><button onClick={async () => { if(confirm('ต้องการลบสินค้านี้?')) await deleteDoc(doc(db, `${basePath}/items`, item.id)); }} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- View: Supplier Master ---
function SupplierMaster({ suppliers, db, basePath }) {
  const [form, setForm] = useState({ brandName: '', companyName: '', address: '', branch: '', taxId: '' });
  const handleSave = async (e) => {
    e.preventDefault();
    if(!form.brandName.trim() && !form.companyName.trim()) return;
    await setDoc(doc(db, `${basePath}/suppliers`, `SUP-${Date.now()}`), { ...form });
    setForm({ brandName: '', companyName: '', address: '', branch: '', taxId: '' });
  };
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">จัดการซัพพลายเออร์</h2>
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 border-slate-100">
        <input placeholder="ชื่อแบรนด์ (Brand)" value={form.brandName} onChange={e => setForm({...form, brandName: e.target.value})} className="border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"/>
        <input placeholder="ชื่อจดทะเบียนบริษัท" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} className="border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"/>
        <input placeholder="ที่อยู่บริษัท" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="md:col-span-2 border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"/>
        <input placeholder="สาขา" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} className="border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"/>
        <input placeholder="เลขประจำตัวผู้เสียภาษี" value={form.taxId} onChange={e => setForm({...form, taxId: e.target.value})} className="border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"/>
        <button type="submit" className="md:col-span-2 bg-slate-900 text-white py-3.5 rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-100">บันทึกซัพพลายเออร์</button>
      </form>
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden border-slate-100">
        <div className="p-4 bg-slate-50 border-b font-bold text-xs text-slate-400 uppercase tracking-widest">รายชื่อซัพพลายเออร์</div>
        {suppliers.map(s => (
          <div key={s.id} className="flex justify-between items-center p-5 border-b last:border-0 hover:bg-slate-50 transition-colors">
            <div>
              <div className="font-bold text-slate-800">{s.brandName || s.companyName}</div>
              <div className="text-xs text-slate-400 font-medium">{s.companyName} {s.taxId && `| TAX: ${s.taxId}`}</div>
            </div>
            <button onClick={async () => { if(confirm('ต้องการลบซัพพลายเออร์?')) await deleteDoc(doc(db, `${basePath}/suppliers`, s.id)); }} className="text-red-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}