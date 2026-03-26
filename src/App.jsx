import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Package, Users, Database, Plus, Trash2, 
  Save, FileText, ArrowLeft, Check, AlertCircle, Edit, List,
  Printer, Upload, Search, X, AlertTriangle, ArrowUpCircle
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

// --- Custom Modal Component ---
function CustomModal({ isOpen, type, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 transform transition-all">
        <div className="flex items-center space-x-3 mb-4">
          {type === 'alert' ? <AlertCircle className="text-amber-500" size={28}/> : <AlertTriangle className="text-red-500" size={28}/>}
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        </div>
        <div className="text-slate-600 text-sm mb-6 whitespace-pre-line leading-relaxed">{message}</div>
        <div className="flex justify-end gap-3">
          {type === 'confirm' && (
            <button onClick={onCancel} className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">ยกเลิก</button>
          )}
          <button onClick={onConfirm} className={`px-5 py-2.5 text-white rounded-xl font-bold transition-colors shadow-lg ${type === 'alert' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}>
            {type === 'alert' ? 'ตกลง' : 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null, onCancel: null });

  const showConfirm = (title, message, onConfirmCallback) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        if(onConfirmCallback) onConfirmCallback();
        setModal(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showAlert = (title, message) => {
    setModal({
      isOpen: true,
      type: 'alert',
      title,
      message,
      onConfirm: () => setModal(prev => ({ ...prev, isOpen: false }))
    });
  };

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

  const getItemPrice = (itemId) => items.find(i => i.id === itemId)?.pricePerUnit || 0;
  
  const getSetPrice = (setId) => {
    const eqSet = equipmentSets.find(s => s.id === setId);
    if (!eqSet) return 0;
    return eqSet.items.reduce((total, setItem) => {
      const item = items.find(i => i.id === setItem.itemId);
      const price = item?.pricePerUnit || 0;
      const discount = item?.discountPercent || 0;
      const netPrice = price * (1 - discount / 100);
      return total + (netPrice * setItem.quantity);
    }, 0);
  };

  const seedDatabase = async () => {
    if (!user) return;
    const basePath = `users/${user.uid}`;
    try {
      const s1Id = 'SUP001';
      await setDoc(doc(db, `${basePath}/suppliers`, s1Id), { brandName: 'IT Solutions', companyName: 'IT Solutions Co.,Ltd.', address: 'Bangkok', branch: 'HQ', taxId: '1234567890123' });
      const i1Id = 'ITM001';
      await setDoc(doc(db, `${basePath}/items`, i1Id), { supplierId: s1Id, code: '885001', category: 'IT', itemName: 'Wireless Mouse (เมาส์ไร้สาย)', pricePerUnit: 590, unit: 'อัน', discountPercent: 0, moq: 5, moqType: 'minimum' });
      const i2Id = 'ITM002';
      await setDoc(doc(db, `${basePath}/items`, i2Id), { supplierId: s1Id, code: '885002', category: 'IT', itemName: 'Wireless Mouse (Premium)', pricePerUnit: 990, unit: 'อัน', discountPercent: 5, moq: 2, moqType: 'multiple' });
      const set1Id = 'SET001';
      await setDoc(doc(db, `${basePath}/equipmentSets`, set1Id), { supplierId: s1Id, name: 'ชุดเริ่มต้น IT', items: [{ itemId: i1Id, quantity: 1 }] });
      showAlert("สำเร็จ", "สร้างข้อมูลตัวอย่างสำเร็จ!");
    } catch (e) {
      showAlert("เกิดข้อผิดพลาด", "โปรดเช็ค Firestore Rules");
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
    <>
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
              db={db} basePath={`users/${user.uid}`} showConfirm={showConfirm}
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
              db={db} basePath={`users/${user.uid}`} showAlert={showAlert}
            />
          )}
          {activeTab === 'suppliers' && <SupplierMaster suppliers={suppliers} db={db} basePath={`users/${user.uid}`} showConfirm={showConfirm} />}
          {activeTab === 'items' && <ItemMaster items={items} suppliers={suppliers} db={db} basePath={`users/${user.uid}`} showConfirm={showConfirm} showAlert={showAlert} />}
          {activeTab === 'sets' && <EquipmentSetMaster sets={equipmentSets} items={items} getSetPrice={getSetPrice} db={db} basePath={`users/${user.uid}`} showConfirm={showConfirm} showAlert={showAlert} suppliers={suppliers} />}
        </main>
      </div>
      <CustomModal {...modal} />
    </>
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
function POList({ purchaseOrders, onCreateNew, onEdit, db, basePath, showConfirm }) {
  const handleDelete = async (id) => {
    showConfirm('ยืนยันการลบ', 'ต้องการลบใบสั่งซื้อนี้ใช่หรือไม่?', async () => {
      await deleteDoc(doc(db, `${basePath}/purchaseOrders`, id));
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">ใบสั่งซื้อทั้งหมด</h2>
          <p className="text-slate-500 text-sm">รายการประวัติการสั่งซื้อของคุณ</p>
        </div>
        <button onClick={onCreateNew} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center shadow-lg active:scale-95">
          <Plus size={20} className="mr-2" /> สร้างใบสั่งซื้อใหม่
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {purchaseOrders.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-medium">ไม่พบข้อมูลใบสั่งซื้อ</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                <tr>
                  <th className="p-5">เลขที่อ้างอิง</th>
                  <th className="p-5">วันที่</th>
                  <th className="p-5 text-center">จำนวนรายการ</th>
                  <th className="p-5 text-right">ยอดรวม</th>
                  <th className="p-5 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {purchaseOrders.map(po => {
                  const lineCount = po.orderLines ? po.orderLines.length : (po.sets?.length || 0);
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/50">
                      <td className="p-5 font-bold text-indigo-600 cursor-pointer" onClick={() => onEdit(po.id)}>{po.title || po.id}</td>
                      <td className="p-5 text-slate-500">{po.createdAt?.toDate ? po.createdAt.toDate().toLocaleDateString('th-TH') : '-'}</td>
                      <td className="p-5 text-center"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">{lineCount} รายการ</span></td>
                      <td className="p-5 text-right font-bold text-slate-900 font-mono">฿{(po.totalAmount || 0).toLocaleString()}</td>
                      <td className="p-5 text-center flex justify-center space-x-2">
                        <button onClick={() => onEdit(po.id)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit size={16}/></button>
                        <button onClick={(e) => { e.preventDefault(); handleDelete(po.id); }} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- View: PO Editor ---
function POEditor({ poId, onBack, items, equipmentSets, suppliers, getSetPrice, db, basePath, showAlert }) {
  const [title, setTitle] = useState('');
  const [orderLines, setOrderLines] = useState([]); // [{ type: 'set'|'item', refId, quantity }]
  
  const [lineType, setLineType] = useState('item'); // Added state for selecting type
  const [searchLineTerm, setSearchLineTerm] = useState('');
  const [currentLineSelection, setCurrentLineSelection] = useState('');
  const [currentQty, setCurrentQty] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (poId) {
      getDoc(doc(db, `${basePath}/purchaseOrders`, poId)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setTitle(data.title || '');
          // รองรับระบบเก่าที่เคยใช้ .sets
          const loadedLines = data.orderLines || (data.sets || []).map(s => ({ type: 'set', refId: s.setId, quantity: s.quantity }));
          setOrderLines(loadedLines);
        }
      });
    } else {
      setTitle(`PO-${Date.now().toString().slice(-6)}`);
    }
  }, [poId, db, basePath]);

  // ตัวเลือกสำหรับเพิ่มในบิล
  const filteredSets = equipmentSets.filter(s => s.name.toLowerCase().includes(searchLineTerm.toLowerCase()));
  const filteredItems = items.filter(i => 
    i.code?.toLowerCase().includes(searchLineTerm.toLowerCase()) || 
    i.itemName?.toLowerCase().includes(searchLineTerm.toLowerCase())
  );

  const report2Rows = useMemo(() => {
    const map = {};
    orderLines.forEach(line => {
      if (line.type === 'set') {
        const s = equipmentSets.find(e => e.id === line.refId);
        s?.items.forEach(itm => {
          if (!map[itm.itemId]) map[itm.itemId] = 0;
          map[itm.itemId] += (itm.quantity * line.quantity);
        });
      } else if (line.type === 'item') {
        if (!map[line.refId]) map[line.refId] = 0;
        map[line.refId] += line.quantity;
      }
    });

    return Object.entries(map).map(([id, qty]) => {
      const item = items.find(i => i.id === id);
      const sup = suppliers.find(su => su.id === item?.supplierId);
      const price = item?.pricePerUnit || 0;
      const discount = item?.discountPercent || 0;
      const netPrice = price * (1 - discount / 100);
      const moq = item?.moq || 0;
      const moqType = item?.moqType || 'minimum';
      
      let missingQty = 0;
      if (moq > 0) {
        if (moqType === 'multiple' && qty % moq !== 0) {
          missingQty = moq - (qty % moq);
        } else if (moqType === 'minimum' && qty < moq) {
          missingQty = moq - qty;
        }
      }

      return { 
        ...item, 
        supplierName: sup?.brandName || 'Unknown', 
        qty, 
        netPrice, 
        total: netPrice * qty,
        missingQty 
      };
    }).sort((a,b) => a.supplierName.localeCompare(b.supplierName));
  }, [orderLines, equipmentSets, items, suppliers]);

  const handleSave = async () => {
    if (!title.trim() || orderLines.length === 0) return;
    
    // --- ตรวจสอบเงื่อนไข MOQ ทั้ง 2 รูปแบบ ---
    const failedMoq = report2Rows.filter(r => r.missingQty > 0);
    if (failedMoq.length > 0) {
      const msgs = failedMoq.map(r => {
        if (r.moqType === 'multiple') return `- ${r.itemName} (สั่ง ${r.qty} / ต้องสั่งทีละ ${r.moq})`;
        return `- ${r.itemName} (สั่ง ${r.qty} / ขั้นต่ำ ${r.moq})`;
      }).join('\n');
      showAlert('แจ้งเตือน (MOQ)', `กรุณาปรับยอดสั่งซื้อให้ตรงตามขั้นต่ำ (MOQ) ก่อนบันทึก:\n\n${msgs}\n\n*เคล็ดลับ: คุณสามารถกดปุ่ม "ปรับยอดอัตโนมัติ" ในรายงาน 2 ด้านล่างได้เลยครับ`);
      return;
    }

    setSaving(true);
    const total = orderLines.reduce((sum, line) => {
      if (line.type === 'set') return sum + (getSetPrice(line.refId) * line.quantity);
      if (line.type === 'item') {
        const item = items.find(i => i.id === line.refId);
        const netPrice = (item?.pricePerUnit || 0) * (1 - (item?.discountPercent || 0) / 100);
        return sum + (netPrice * line.quantity);
      }
      return sum;
    }, 0);

    await setDoc(doc(db, `${basePath}/purchaseOrders`, poId || `PO-${Date.now()}`), { 
      title, orderLines, totalAmount: total, createdAt: serverTimestamp() 
    }, { merge: true });
    
    onBack();
  };

  const handleAddLine = () => {
    if(!currentLineSelection) return;
    const [type, id] = currentLineSelection.split('|');
    setOrderLines([...orderLines, { type, refId: id, quantity: currentQty }]);
    setCurrentLineSelection('');
  };

  const adjustMOQ = (itemId, missingQty) => {
    setOrderLines([...orderLines, { type: 'item', refId: itemId, quantity: missingQty }]);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 print:p-0">
      <div className="flex justify-between items-center print:hidden bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="font-bold text-lg border-b border-transparent focus:border-indigo-500 outline-none px-2 py-1 w-64"/>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 rounded-xl font-bold flex items-center shadow-sm hover:bg-slate-200 transition-colors"><Printer size={18} className="mr-2"/> พิมพ์ PDF</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all">{saving ? '...' : 'บันทึก'}</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-sm print:hidden">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Plus size={18} className="mr-2 text-indigo-500"/> เลือกรายการเข้าบิล (ผสมได้ทั้งชุดอุปกรณ์และรายชิ้น)</h3>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
            <select 
              value={lineType} 
              onChange={e => { setLineType(e.target.value); setCurrentLineSelection(''); setSearchLineTerm(''); }} 
              className="md:w-1/4 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-indigo-700"
            >
              <option value="item">🏷️ เลือกจากสินค้ารายตัว</option>
              <option value="set">📦 เลือกจากชุดอุปกรณ์</option>
            </select>
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3.5 text-slate-400"/>
              <input 
                type="text" 
                placeholder={lineType === 'set' ? "ค้นหาชื่อชุดอุปกรณ์..." : "ค้นหารหัส หรือ ชื่อสินค้า..."} 
                value={searchLineTerm} 
                onChange={e => setSearchLineTerm(e.target.value)} 
                className="w-full pl-10 pr-3 py-3 border rounded-xl text-sm outline-none focus:border-indigo-500 bg-slate-50"
              />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <select value={currentLineSelection} onChange={e => setCurrentLineSelection(e.target.value)} className="flex-1 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">-- {lineType === 'set' ? 'คลิกเพื่อเลือกชุดอุปกรณ์' : 'คลิกเพื่อเลือกสินค้ารายตัว'} --</option>
              {lineType === 'set' && filteredSets.map(s => (
                <option key={`set-${s.id}`} value={`set|${s.id}`}>{s.name} (฿{getSetPrice(s.id).toLocaleString()})</option>
              ))}
              {lineType === 'item' && filteredItems.map(i => {
                 const netPrice = (i.pricePerUnit || 0) * (1 - (i.discountPercent || 0) / 100);
                 return <option key={`item-${i.id}`} value={`item|${i.id}`}>[{i.code}] {i.itemName} (฿{netPrice.toLocaleString()})</option>
              })}
            </select>
            <div className="flex gap-2">
              <input type="number" min="1" value={currentQty} onChange={e => setCurrentQty(parseInt(e.target.value)||1)} className="w-20 border rounded-xl p-3 outline-none text-center" title="จำนวน"/>
              <button onClick={handleAddLine} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap">เพิ่มลงบิล</button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* Report 1 */}
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 p-4 border-b font-bold text-slate-800">รายงาน 1: รายการในบิลสั่งซื้อ (ชุดอุปกรณ์ และ สินค้ารายตัว)</div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <tr><th className="p-4">ประเภท</th><th className="p-4">รายการ</th><th className="p-4 text-center">จำนวน</th><th className="p-4 text-right">ราคาหน่วย</th><th className="p-4 text-right">ราคารวม</th><th className="p-4 print:hidden text-center">จัดการ</th></tr>
            </thead>
            <tbody className="divide-y text-[13px]">
              {orderLines.map((line, i) => {
                let name = '';
                let price = 0;
                let isSet = line.type === 'set';
                
                if (isSet) {
                  const s = equipmentSets.find(e => e.id === line.refId);
                  name = s?.name || 'Unknown Set';
                  price = getSetPrice(line.refId);
                } else {
                  const itm = items.find(e => e.id === line.refId);
                  name = itm ? `[${itm.code}] ${itm.itemName}` : 'Unknown Item';
                  price = (itm?.pricePerUnit || 0) * (1 - (itm?.discountPercent || 0)/100);
                }

                return (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${isSet ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {isSet ? 'ชุดอุปกรณ์' : 'สินค้ารายชิ้น'}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-700">{name}</td>
                    <td className="p-4 text-center font-bold text-indigo-600">{line.quantity}</td>
                    <td className="p-4 text-right font-mono">฿{price.toLocaleString()}</td>
                    <td className="p-4 text-right font-bold text-slate-900 font-mono">฿{(price * line.quantity).toLocaleString()}</td>
                    <td className="p-4 text-center print:hidden"><button type="button" onClick={(e) => { e.preventDefault(); setOrderLines(orderLines.filter((_, idx) => idx !== i)); }} className="text-red-400 p-1 hover:bg-red-50 rounded transition-colors"><Trash2 size={14}/></button></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/50 font-bold">
                <td colSpan="4" className="p-4 text-right">ยอดรวมรายงาน 1</td>
                <td className="p-4 text-right text-indigo-700 font-mono">
                  ฿{orderLines.reduce((sum, line) => {
                    let p = 0;
                    if (line.type === 'set') p = getSetPrice(line.refId);
                    else {
                      const itm = items.find(e => e.id === line.refId);
                      p = (itm?.pricePerUnit || 0) * (1 - (itm?.discountPercent || 0)/100);
                    }
                    return sum + (p * line.quantity);
                  }, 0).toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Report 2 */}
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 p-4 border-b font-bold text-slate-800">รายงาน 2: สรุปรายการสินค้าย่อยทั้งหมด</div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="p-4">ซัพพลายเออร์</th>
                <th className="p-4">ชื่อสินค้า</th>
                <th className="p-4 text-right font-mono">ราคา (สุทธิ)</th>
                <th className="p-4 text-center">MOQ (เงื่อนไข)</th>
                <th className="p-4 text-center">รวมจำนวน</th>
                <th className="p-4 text-right font-mono">ราคารวม</th>
              </tr>
            </thead>
            <tbody className="divide-y text-[13px]">
              {report2Rows.map((r, i) => {
                const isMoqFailed = r.missingQty > 0;
                const moqWarningTitle = r.moqType === 'multiple' ? `ต้องสั่งทีละ ${r.moq} ${r.unit}` : `ต้องสั่งขั้นต่ำ ${r.moq} ${r.unit}`;
                const moqDisplay = r.moqType === 'multiple' ? `ทุกๆ ${r.moq}` : `ขั้นต่ำ ${r.moq}`;

                return (
                  <tr key={i} className={`${isMoqFailed ? 'bg-red-50/50' : 'hover:bg-slate-50/50'}`}>
                    <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">{r.supplierName}</span></td>
                    <td className="p-4">
                      <div className="font-bold flex items-center">
                        {r.itemName}
                        {isMoqFailed && <AlertTriangle size={14} className="text-red-500 ml-2" title={moqWarningTitle} />}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{r.code} | {r.category}</div>
                    </td>
                    <td className="p-4 text-right font-mono text-slate-500">
                      {r.discountPercent > 0 && <div className="text-[10px] text-red-400 line-through">฿{r.pricePerUnit?.toLocaleString()}</div>}
                      <div className="text-slate-700">฿{r.netPrice?.toLocaleString()}</div>
                    </td>
                    <td className="p-4 text-center">
                      {r.moq > 0 ? <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[11px] font-bold whitespace-nowrap">{moqDisplay}</span> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="p-4 text-center">
                      <div className={`font-bold ${isMoqFailed ? 'text-red-600' : 'text-indigo-600'}`}>{r.qty} {r.unit}</div>
                      {isMoqFailed && (
                        <button onClick={() => adjustMOQ(r.id, r.missingQty)} className="mt-2 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded flex items-center justify-center mx-auto hover:bg-green-200 transition-colors print:hidden shadow-sm">
                          <ArrowUpCircle size={12} className="mr-1"/> ปรับยอดอัตโนมัติ (+{r.missingQty})
                        </button>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900 font-mono">฿{r.total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50/50 font-bold"><td colSpan="5" className="p-4 text-right">ยอดรวมรายงาน 2</td><td className="p-4 text-right text-indigo-700 font-mono">฿{report2Rows.reduce((sum, r) => sum + r.total, 0).toLocaleString()}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- View: Equipment Set Master ---
function EquipmentSetMaster({ sets, items, getSetPrice, db, basePath, showConfirm, showAlert, suppliers }) {
  const [name, setName] = useState('');
  const [setItems, setSetItems] = useState([]);
  const [curItem, setCurItem] = useState('');
  const [curQty, setCurQty] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [selectedSupId, setSelectedSupId] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPending, setImportPending] = useState([]); 
  const [importResults, setImportResults] = useState({}); 

  const filteredSets = sets.filter(s => s.supplierId === selectedSupId);
  const itemsForSelectedSupplier = items.filter(i => i.supplierId === selectedSupId);

  const { totalFullPrice, totalNetPrice } = useMemo(() => {
    return setItems.reduce((acc, si) => {
      const item = items.find(it => it.id === si.itemId);
      if (item) {
        const price = item.pricePerUnit || 0;
        const discount = item.discountPercent || 0;
        acc.totalFullPrice += price * si.quantity;
        acc.totalNetPrice += price * (1 - discount / 100) * si.quantity;
      }
      return acc;
    }, { totalFullPrice: 0, totalNetPrice: 0 });
  }, [setItems, items]);

  const handleSave = async () => {
    if (!name.trim() || setItems.length === 0 || !selectedSupId) return;
    const id = editingId || `SET-${Date.now()}`;
    await setDoc(doc(db, `${basePath}/equipmentSets`, id), { name, items: setItems, supplierId: selectedSupId });
    setName(''); setSetItems([]); setEditingId(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedSupId) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rows = evt.target.result.split('\n').filter(r => r.trim());
      const newAutoAdded = [];
      const newPending = [];

      rows.forEach(row => {
        const cleanRow = row.replace(/\r/g, '').trim();
        let cols = cleanRow.split('\t');
        if (cols.length < 2) cols = cleanRow.split(',');
        if (cols.length < 2) cols = cleanRow.split(/\s+/);

        if (cols.length >= 2) {
          const code = cols[0].trim();
          const qty = parseInt(cols[1]) || 1;
          const matches = itemsForSelectedSupplier.filter(i => i.code === code);

          if (matches.length === 1) {
            newAutoAdded.push({ itemId: matches[0].id, quantity: qty });
          } else if (matches.length > 1) {
            newPending.push({ code, qty, options: matches });
          }
        }
      });

      if (newPending.length > 0) {
        setImportPending(newPending);
        setSetItems(prev => [...prev, ...newAutoAdded]);
        setShowImportModal(true);
      } else {
        setSetItems(prev => [...prev, ...newAutoAdded]);
        showAlert('สำเร็จ', `นำเข้าสำเร็จ! เพิ่ม ${newAutoAdded.length} รายการ`);
      }
    };
    reader.readAsText(file);
    e.target.value = null; 
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

  const filteredItemsForSet = itemsForSelectedSupplier.filter(i => 
    i.code?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.itemName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">จัดการชุดอุปกรณ์</h2>
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6 border-slate-100">
        
        <select value={selectedSupId} onChange={e => {setSelectedSupId(e.target.value); setEditingId(null); setName(''); setSetItems([]);}} className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-white text-slate-700">
          <option value="">-- เลือกซัพพลายเออร์เพื่อจัดการชุดอุปกรณ์ --</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.brandName || s.companyName}</option>)}
        </select>

        {selectedSupId && (
          <div className="pt-4 border-t space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-700">{editingId ? 'แก้ไขข้อมูลชุดอุปกรณ์' : 'สร้างชุดอุปกรณ์ใหม่'}</h4>
              <label className="cursor-pointer bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center">
                <Upload size={14} className="mr-2"/> นำเข้าจากไฟล์ (คั่นด้วย Tab)
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.csv"/>
              </label>
            </div>
            
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ระบุชื่อชุดอุปกรณ์ (เช่น ชุดพนักงานใหม่)" className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-slate-50 border-slate-200"/>
            
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                <input 
                  type="text" 
                  placeholder="ค้นหาสินค้า (พิมพ์ Code หรือ ชื่อสินค้า...)" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm outline-none focus:border-indigo-500 bg-slate-50"
                />
              </div>
              
              <div className="flex flex-col md:flex-row gap-3">
                <select value={curItem} onChange={e => setCurItem(e.target.value)} className="flex-1 border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-white text-slate-700">
                  <option value="">-- เลือกสินค้ารายตัว --</option>
                  {filteredItemsForSet.map(i => {
                    const netPrice = (i.pricePerUnit || 0) * (1 - (i.discountPercent || 0) / 100);
                    return (
                      <option key={i.id} value={i.id}>
                        [{i.code}] {i.itemName} ({i.category}) - ฿{netPrice.toLocaleString()}
                      </option>
                    )
                  })}
                </select>
                <div className="flex gap-2">
                  <input type="number" min="1" value={curQty} onChange={e => setCurQty(parseInt(e.target.value)||1)} className="w-20 border rounded-lg p-2.5 outline-none"/>
                  <button onClick={() => { if(curItem) { setSetItems([...setItems, {itemId: curItem, quantity: curQty}]); setCurItem(''); } }} className="bg-slate-800 text-white px-6 rounded-lg font-bold hover:bg-slate-700">เพิ่ม</button>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {setItems.length === 0 && <p className="text-center py-8 text-slate-400 text-sm border border-dashed rounded-xl">ยังไม่มีสินค้าในชุดนี้</p>}
              {setItems.map((si, i) => {
                const itemData = items.find(it => it.id === si.itemId);
                const netPrice = (itemData?.pricePerUnit || 0) * (1 - (itemData?.discountPercent || 0) / 100);
                const rowTotal = netPrice * si.quantity;
                return (
                  <div key={i} className="flex justify-between items-center bg-indigo-50/30 px-4 py-2 rounded-xl border border-indigo-100 group">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">
                        <span className="text-indigo-600 font-mono text-xs mr-2">[{itemData?.code}]</span> 
                        {itemData?.itemName}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">@ ฿{netPrice.toLocaleString()} / {itemData?.unit}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className="block font-bold text-indigo-600">x{si.quantity}</span>
                        <span className="block text-[11px] font-mono text-slate-600 font-bold">฿{rowTotal.toLocaleString()}</span>
                      </div>
                      <button type="button" onClick={(e) => { e.preventDefault(); setSetItems(setItems.filter((_, idx) => idx !== i)); }} className="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </div>
                )
              })}
            </div>

            {setItems.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2 space-y-2">
                <div className="flex justify-between text-sm text-slate-500 font-medium">
                  <span>ยอดรวมราคาเต็ม:</span>
                  <span className={`font-mono ${totalFullPrice > totalNetPrice ? 'line-through text-red-400' : 'text-slate-600'}`}>
                    ฿{totalFullPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-800 border-t border-slate-200 pt-2">
                  <span>ยอดรวมสุทธิ (หลังหักส่วนลด):</span>
                  <span className="font-mono text-indigo-600">
                    ฿{totalNetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                {editingId ? 'บันทึกการแก้ไขชุดอุปกรณ์' : 'บันทึกชุดอุปกรณ์ใหม่'}
              </button>
              {editingId && (
                 <button onClick={() => { setEditingId(null); setName(''); setSetItems([]); }} className="px-6 bg-white border border-slate-300 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all">ยกเลิกแก้ไข</button>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedSupId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSets.map(s => (
            <div key={s.id} className="bg-white p-5 rounded-2xl border shadow-sm flex flex-col group transition-all hover:shadow-md border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-slate-800">{s.name}</h3>
                <div className="flex space-x-1">
                  <button type="button" onClick={() => { setEditingId(s.id); setName(s.name); setSetItems(s.items); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit size={16}/></button>
                  <button type="button" onClick={(e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    showConfirm('ยืนยันการลบ', 'ต้องการลบชุดอุปกรณ์นี้ใช่หรือไม่?', async () => {
                      try { 
                        await deleteDoc(doc(db, `${basePath}/equipmentSets`, s.id)); 
                        if (editingId === s.id) { 
                          setEditingId(null); 
                          setName(''); 
                          setSetItems([]); 
                        } 
                      } catch(err) { 
                        showAlert('ข้อผิดพลาด', 'ไม่สามารถลบได้: ' + err.message); 
                      } 
                    });
                  }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
              <ul className="text-[12px] text-slate-500 flex-1 space-y-2">
                {s.items.map((it, idx) => {
                  const itemData = items.find(x => x.id === it.itemId);
                  const netPrice = (itemData?.pricePerUnit || 0) * (1 - (itemData?.discountPercent || 0) / 100);
                  const rowTotal = netPrice * it.quantity;
                  return (
                    <li key={idx} className="flex justify-between items-start border-b border-slate-50 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex flex-col truncate pr-2">
                        <span className="truncate font-medium text-slate-700">• [{itemData?.code}] {itemData?.itemName}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 ml-2">@ ฿{netPrice.toLocaleString()} / {itemData?.unit}</span>
                      </div>
                      <div className="flex flex-col items-end whitespace-nowrap">
                        <span className="font-medium text-slate-700">x{it.quantity}</span>
                        <span className="font-bold text-indigo-600 text-[10px] font-mono mt-0.5">฿{rowTotal.toLocaleString()}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="pt-4 mt-4 border-t flex justify-between font-bold text-sm text-indigo-700"><span>ราคาต่อชุด</span><span>฿{getSetPrice(s.id).toLocaleString()}</span></div>
            </div>
          ))}
          {filteredSets.length === 0 && <div className="col-span-1 md:col-span-2 text-center p-8 text-slate-400 bg-white border border-dashed rounded-2xl">ซัพพลายเออร์นี้ยังไม่มีการจัดชุดอุปกรณ์</div>}
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center text-amber-600">
                <AlertTriangle className="mr-2" size={24}/>
                <h3 className="text-lg font-bold">พบ Code ซ้ำ (โปรดเลือกรายการ)</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <p className="text-sm text-slate-500">Code ต่อไปนี้มีสินค้าหลายชื่อในระบบ โปรดเลือกชื่อสินค้าที่คุณต้องการใช้งานสำหรับแต่ละรายการในไฟล์:</p>
              {importPending.map((pending, idx) => (
                <div key={idx} className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex justify-between font-bold text-sm">
                    <span className="text-slate-400">Code: {pending.code}</span>
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
                          <div className="font-bold text-slate-800">{opt.itemName} <span className="text-[10px] text-slate-400">({opt.category})</span></div>
                          <div className="text-xs text-slate-500 mt-0.5">ราคา: ฿{opt.pricePerUnit?.toLocaleString()} / {opt.unit}</div>
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
function ItemMaster({ items, suppliers, db, basePath, showConfirm, showAlert }) {
  const [form, setForm] = useState({ code: '', category: '', itemName: '', pricePerUnit: '', unit: '', discountPercent: '', moq: '', moqType: 'minimum' });
  const [selectedSupId, setSelectedSupId] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(i => {
    const matchSup = i.supplierId === selectedSupId;
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || 
                        i.code?.toLowerCase().includes(searchLower) || 
                        i.itemName?.toLowerCase().includes(searchLower);
    return matchSup && matchSearch;
  });

  const handleEditItem = (item) => {
    setEditingItemId(item.id);
    setForm({
      code: item.code || '',
      category: item.category || '',
      itemName: item.itemName || '',
      pricePerUnit: item.pricePerUnit || '',
      unit: item.unit || '',
      discountPercent: item.discountPercent || '',
      moq: item.moq || '',
      moqType: item.moqType || 'minimum'
    });
    window.scrollTo({top:0, behavior:'smooth'});
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setForm({ code: '', category: '', itemName: '', pricePerUnit: '', unit: '', discountPercent: '', moq: '', moqType: 'minimum' });
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const data = { 
      ...form, 
      supplierId: selectedSupId, 
      pricePerUnit: parseFloat(form.pricePerUnit) || 0,
      discountPercent: parseFloat(form.discountPercent) || 0,
      moq: parseInt(form.moq) || 0,
      moqType: form.moqType || 'minimum'
    };

    if (editingItemId) {
      await setDoc(doc(db, `${basePath}/items`, editingItemId), data, { merge: true });
    } else {
      await setDoc(doc(db, `${basePath}/items`, `ITM-${Date.now()}`), data);
    }
    
    cancelEdit();
  };

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
        
        if (cols.length >= 4) {
          let unit = '';
          let discountPercent = 0;
          let moq = 0;
          let moqType = 'minimum';
          
          if (cols.length >= 5) unit = cols[4].trim();
          if (cols.length >= 6) discountPercent = parseFloat(cols[5]) || 0;
          if (cols.length >= 7) moq = parseInt(cols[6]) || 0;
          if (cols.length >= 8) {
            const mt = cols[7].trim().toLowerCase();
            if (mt === 'multiple' || mt === 'ทุกๆ' || mt === 'ทวีคูณ') moqType = 'multiple';
          }

          await setDoc(doc(db, `${basePath}/items`, `ITM-${Date.now()}-${Math.random()}`), { 
            supplierId: selectedSupId, 
            code: cols[0].trim(), 
            category: cols[1].trim(), 
            itemName: cols[2].trim(), 
            pricePerUnit: parseFloat(cols[3]) || 0, 
            unit: unit,
            discountPercent: discountPercent, 
            moq: moq,
            moqType: moqType
          });
        }
      }
      showAlert("สำเร็จ", "นำเข้าสินค้าสำเร็จ!");
    };
    reader.readAsText(file);
    e.target.value = null; 
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">รายการสินค้า (Master Data)</h2>
      <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6 border-slate-100">
        <select value={selectedSupId} onChange={e => {setSelectedSupId(e.target.value); cancelEdit();}} className="w-full border rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 font-bold bg-white text-slate-700">
          <option value="">-- เลือกซัพพลายเออร์เพื่อจัดการสินค้า --</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.brandName || s.companyName}</option>)}
        </select>
        
        {selectedSupId && (
          <div className="pt-4 border-t space-y-6 animate-in fade-in">
            <div className={`p-4 rounded-xl border ${editingItemId ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
              <div className="flex justify-between items-center mb-4">
                <h4 className={`font-bold text-sm ${editingItemId ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {editingItemId ? 'กำลังแก้ไขสินค้า...' : 'เพิ่มสินค้าใหม่'}
                </h4>
                {!editingItemId && (
                  <label className="cursor-pointer bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center">
                    <Upload size={14} className="mr-2"/> นำเข้าสินค้า (Tab)
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.csv"/>
                  </label>
                )}
              </div>
              
              <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-2"><input required placeholder="Code *" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-white shadow-sm"/></div>
                <div className="md:col-span-3"><input required placeholder="Category *" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-white shadow-sm"/></div>
                <div className="md:col-span-7"><input required placeholder="Item Name *" value={form.itemName} onChange={e => setForm({...form, itemName: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-white shadow-sm"/></div>
                
                <div className="md:col-span-3"><input required type="number" placeholder="Price/Unit *" value={form.pricePerUnit} onChange={e => setForm({...form, pricePerUnit: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-white shadow-sm"/></div>
                <div className="md:col-span-3"><input placeholder="Unit (หน่วย)" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-white shadow-sm"/></div>
                <div className="md:col-span-2"><input type="number" placeholder="% Discount" value={form.discountPercent} onChange={e => setForm({...form, discountPercent: e.target.value})} className="w-full border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-white shadow-sm"/></div>
                <div className="md:col-span-2 flex gap-1">
                  <input type="number" placeholder="MOQ" value={form.moq} onChange={e => setForm({...form, moq: e.target.value})} className="w-1/2 border rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 bg-white shadow-sm" title="ขั้นต่ำ"/>
                  <select value={form.moqType} onChange={e => setForm({...form, moqType: e.target.value})} className="w-1/2 border rounded-lg p-2.5 text-[10px] outline-none focus:border-indigo-500 bg-white shadow-sm" title="รูปแบบขั้นต่ำ">
                    <option value="minimum">&ge; ขั้นต่ำ</option>
                    <option value="multiple">x ทุกๆ</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" className={`flex-1 text-white rounded-lg font-bold shadow-sm ${editingItemId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-700'}`}>
                    {editingItemId ? 'บันทึก' : <div className="flex justify-center"><Plus size={18}/></div>}
                  </button>
                  {editingItemId && <button type="button" onClick={cancelEdit} className="flex-1 bg-white border border-slate-300 text-slate-600 rounded-lg font-bold hover:bg-slate-50"><X size={18} className="mx-auto"/></button>}
                </div>
              </form>
            </div>

            <div className="flex justify-between items-end mb-2 mt-4">
              <h4 className="font-bold text-sm text-slate-700 hidden md:block">รายชื่อสินค้าทั้งหมด</h4>
              <div className="relative w-full md:w-1/3">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                <input 
                  type="text" 
                  placeholder="ค้นหา Code หรือ ชื่อสินค้า..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:border-indigo-500 bg-white shadow-sm"
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-3">รหัส / หมวดหมู่</th>
                    <th className="p-3">ชื่อสินค้า (Item Name)</th>
                    <th className="p-3 text-center">หน่วย</th>
                    <th className="p-3 text-center">ขั้นต่ำ (MOQ)</th>
                    <th className="p-3 text-right">ราคา/ส่วนลด</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map(item => {
                    const netPrice = (item.pricePerUnit || 0) * (1 - (item.discountPercent || 0) / 100);
                    const moqDisplay = item.moqType === 'multiple' ? `ทุกๆ ${item.moq}` : `ขั้นต่ำ ${item.moq}`;
                    return (
                      <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="font-mono text-slate-600 font-bold">{item.code}</div>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded inline-block mt-1">{item.category}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{item.itemName}</div>
                        </td>
                        <td className="p-3 text-center text-slate-600">{item.unit || '-'}</td>
                        <td className="p-3 text-center">
                          {item.moq > 0 ? <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[11px] font-bold">{moqDisplay}</span> : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {item.discountPercent > 0 && <span className="text-red-400 line-through text-[10px] mr-2">฿{item.pricePerUnit?.toLocaleString()}</span>}
                          <span className="font-bold text-indigo-600">฿{netPrice.toLocaleString()}</span>
                          {item.discountPercent > 0 && <div className="text-[10px] text-green-600 mt-0.5">ลด {item.discountPercent}%</div>}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center space-x-1">
                            <button onClick={() => handleEditItem(item)} className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-colors"><Edit size={16}/></button>
                            <button onClick={(e) => { e.preventDefault(); showConfirm('ยืนยันการลบ', 'ต้องการลบสินค้านี้ใช่หรือไม่?', async () => { await deleteDoc(doc(db, `${basePath}/items`, item.id)); }); }} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
function SupplierMaster({ suppliers, db, basePath, showConfirm }) {
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
            <button onClick={(e) => { e.preventDefault(); showConfirm('ยืนยันการลบ', 'ต้องการลบซัพพลายเออร์ใช่หรือไม่?', async () => { await deleteDoc(doc(db, `${basePath}/suppliers`, s.id)); }); }} className="text-red-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={18}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}