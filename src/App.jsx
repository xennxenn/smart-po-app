import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Package, Users, Database, Plus, Trash2, 
  Save, FileText, ArrowLeft, Check, AlertCircle, Edit, List,
  Printer, Upload, Search
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, serverTimestamp 
} from 'firebase/firestore';

// --- Firebase Initialization (ข้อมูลจริงจากโปรเจกต์คุณ) ---
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
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App State
  const [activeTab, setActiveTab] = useState('pos'); // 'pos', 'po-editor', 'items', 'sets', 'suppliers'
  const [editingPoId, setEditingPoId] = useState(null);

  // Data State
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [equipmentSets, setEquipmentSets] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    // ใช้ระบบ Login แบบไม่ระบุตัวตน (Anonymous) เพื่อให้ผู้ใช้เข้าใช้งานและมี UID ได้ทันที
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
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

    // เปลี่ยนไปเก็บที่ root ของ collections 'users' ในฐานข้อมูลของคุณโดยตรง
    const basePath = `users/${user.uid}`;

    const unsubSuppliers = onSnapshot(collection(db, `${basePath}/suppliers`), (snap) => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.brandName?.localeCompare(b.brandName || '') || 0));
    }, console.error);

    const unsubItems = onSnapshot(collection(db, `${basePath}/items`), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.nameTh.localeCompare(b.nameTh)));
    }, console.error);

    const unsubSets = onSnapshot(collection(db, `${basePath}/equipmentSets`), (snap) => {
      setEquipmentSets(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.name.localeCompare(b.name)));
    }, console.error);

    const unsubPOs = onSnapshot(collection(db, `${basePath}/purchaseOrders`), (snap) => {
      setPurchaseOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt));
    }, console.error);

    return () => {
      unsubSuppliers(); unsubItems(); unsubSets(); unsubPOs();
    };
  }, [user]);

  // --- Seed Data Helper ---
  const seedDatabase = async () => {
    if (!user) return;
    const basePath = `users/${user.uid}`;
    
    // 1. Add Suppliers
    const s1Id = 'SUP001';
    const s2Id = 'SUP002';
    await setDoc(doc(db, `${basePath}/suppliers`, s1Id), { brandName: 'IT Solutions', companyName: 'IT Solutions Co.,Ltd.', address: 'Bangkok', branch: 'HQ', taxId: '1234567890123' });
    await setDoc(doc(db, `${basePath}/suppliers`, s2Id), { brandName: 'Office Supply', companyName: 'Office Supply Plus', address: 'Bangkok', branch: 'HQ', taxId: '9876543210987' });

    // 2. Add Items
    const i1Id = 'ITM001';
    const i2Id = 'ITM002';
    const i3Id = 'ITM003';
    await setDoc(doc(db, `${basePath}/items`, i1Id), { supplierId: s1Id, barcode: '885001', nameEn: 'Wireless Mouse', nameTh: 'เมาส์ไร้สาย', price: 590 });
    await setDoc(doc(db, `${basePath}/items`, i2Id), { supplierId: s1Id, barcode: '885002', nameEn: 'Mechanical Keyboard', nameTh: 'คีย์บอร์ด', price: 1290 });
    await setDoc(doc(db, `${basePath}/items`, i3Id), { supplierId: s2Id, barcode: '885003', nameEn: 'A4 Paper (Ream)', nameTh: 'กระดาษ A4 (รีม)', price: 120 });

    // 3. Add Sets
    const set1Id = 'SET001';
    await setDoc(doc(db, `${basePath}/equipmentSets`, set1Id), { 
      name: 'ชุดอุปกรณ์พนักงานใหม่ (IT)', 
      items: [{ itemId: i1Id, quantity: 1 }, { itemId: i2Id, quantity: 1 }]
    });

    const set2Id = 'SET002';
    await setDoc(doc(db, `${basePath}/equipmentSets`, set2Id), { 
      name: 'ชุดปฏิบัติงานสำนักงาน', 
      items: [{ itemId: i1Id, quantity: 1 }, { itemId: i3Id, quantity: 5 }]
    });

    alert("สร้างข้อมูลตัวอย่างลงในฐานข้อมูลของคุณสำเร็จ!");
  };

  if (loadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-indigo-600">กำลังเชื่อมต่อกับ Firebase...</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500 font-medium text-center px-4">ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบว่าคุณได้เปิดใช้งาน 'Anonymous Login' ในเมนู Authentication ของ Firebase แล้วหรือยัง</div>;
  }

  // Helper to calculate prices
  const getItemPrice = (itemId) => items.find(i => i.id === itemId)?.price || 0;
  
  const getSetPrice = (setId) => {
    const eqSet = equipmentSets.find(s => s.id === setId);
    if (!eqSet) return 0;
    return eqSet.items.reduce((total, setItem) => {
      return total + (getItemPrice(setItem.itemId) * setItem.quantity);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans print:bg-white">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 shadow-sm print:hidden">
        <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <ShoppingCart size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">PO Manager</h1>
        </div>
        <nav className="p-4 space-y-2">
          <SidebarButton icon={FileText} label="ใบสั่งซื้อ (POs)" active={activeTab === 'pos' || activeTab === 'po-editor'} onClick={() => setActiveTab('pos')} />
          <div className="pt-4 pb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">ฐานข้อมูล (Master Data)</p>
          </div>
          <SidebarButton icon={Package} label="ชุดอุปกรณ์" active={activeTab === 'sets'} onClick={() => setActiveTab('sets')} />
          <SidebarButton icon={Database} label="รายการสินค้า" active={activeTab === 'items'} onClick={() => setActiveTab('items')} />
          <SidebarButton icon={Users} label="ซัพพลายเออร์" active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} />
        </nav>
        <div className="p-4 mt-auto border-t border-slate-100">
           <button 
             onClick={seedDatabase}
             className="w-full py-2 px-4 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
           >
             + สร้างข้อมูลตัวอย่าง
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto print:overflow-visible">
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
      </div>
    </div>
  );
}

// --- Sidebar Component ---
const SidebarButton = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
      active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    <Icon size={18} className={active ? 'text-indigo-600' : 'text-slate-400'} />
    <span>{label}</span>
  </button>
);

// --- 1. PO Editor View ---
function POEditor({ poId, onBack, items, equipmentSets, suppliers, getSetPrice, db, basePath }) {
  const [title, setTitle] = useState('');
  const [selectedSets, setSelectedSets] = useState([]); 
  const [saving, setSaving] = useState(false);

  const [currentSetId, setCurrentSetId] = useState('');
  const [currentQty, setCurrentQty] = useState(1);

  useEffect(() => {
    if (poId) {
      const loadPo = async () => {
        const poRef = doc(db, `${basePath}/purchaseOrders`, poId);
        import('firebase/firestore').then(({ getDoc }) => {
           getDoc(poRef).then(snap => {
             if (snap.exists()) {
               const data = snap.data();
               setTitle(data.title || '');
               setSelectedSets(data.sets || []);
             }
           });
        });
      };
      loadPo();
    } else {
      setTitle(`PO-${new Date().getTime().toString().slice(-6)}`);
      setSelectedSets([]);
    }
  }, [poId, db, basePath]);

  const handleAddSet = () => {
    if (!currentSetId || currentQty < 1) return;
    const existing = selectedSets.find(s => s.setId === currentSetId);
    if (existing) {
      setSelectedSets(selectedSets.map(s => s.setId === currentSetId ? { ...s, quantity: s.quantity + currentQty } : s));
    } else {
      setSelectedSets([...selectedSets, { setId: currentSetId, quantity: currentQty }]);
    }
    setCurrentSetId('');
    setCurrentQty(1);
  };

  const handleRemoveSet = (setId) => {
    setSelectedSets(selectedSets.filter(s => s.setId !== setId));
  };

  const report1Sets = useMemo(() => {
    let grandTotal = 0;
    const rows = selectedSets.map(sel => {
      const eqSet = equipmentSets.find(s => s.id === sel.setId);
      if (!eqSet) return null;
      const unitPrice = getSetPrice(sel.setId);
      const total = unitPrice * sel.quantity;
      grandTotal += total;
      return { ...eqSet, orderQty: sel.quantity, unitPrice, total };
    }).filter(Boolean);
    return { rows, grandTotal };
  }, [selectedSets, equipmentSets, getSetPrice]);

  const report2Items = useMemo(() => {
    const itemMap = {}; 
    
    selectedSets.forEach(sel => {
      const eqSet = equipmentSets.find(s => s.id === sel.setId);
      if (eqSet) {
        eqSet.items.forEach(setItm => {
          if (!itemMap[setItm.itemId]) itemMap[setItm.itemId] = 0;
          itemMap[setItm.itemId] += (setItm.quantity * sel.quantity);
        });
      }
    });

    let grandTotal = 0;
    const rows = Object.keys(itemMap).map(itemId => {
      const itemData = items.find(i => i.id === itemId);
      if (!itemData) return null;
      const supplierData = suppliers.find(s => s.id === itemData.supplierId);
      const totalQty = itemMap[itemId];
      const totalPrice = totalQty * itemData.price;
      grandTotal += totalPrice;
      return {
        ...itemData,
        supplierName: supplierData?.brandName || supplierData?.companyName || supplierData?.name || 'Unknown',
        totalQty,
        totalPrice
      };
    }).filter(Boolean);

    rows.sort((a, b) => {
      if (a.supplierName === b.supplierName) return a.nameTh.localeCompare(b.nameTh);
      return a.supplierName.localeCompare(b.supplierName);
    });

    return { rows, grandTotal };
  }, [selectedSets, equipmentSets, items, suppliers]);

  const handleSave = async () => {
    if (!title.trim() || selectedSets.length === 0) {
      alert("กรุณาระบุชื่อใบสั่งซื้อและเลือกชุดอุปกรณ์อย่างน้อย 1 รายการ");
      return;
    }
    setSaving(true);
    try {
      const poData = {
        title,
        sets: selectedSets,
        totalAmount: report1Sets.grandTotal,
        updatedAt: serverTimestamp(),
      };

      if (poId) {
        await setDoc(doc(db, `${basePath}/purchaseOrders`, poId), poData, { merge: true });
      } else {
        poData.createdAt = serverTimestamp();
        poData.id = `PO-${Date.now()}`; 
        await setDoc(doc(db, `${basePath}/purchaseOrders`, poData.id), poData);
      }
      onBack();
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    }
    setSaving(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 print:hidden">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{poId ? 'แก้ไขใบสั่งซื้อ' : 'สร้างใบสั่งซื้อใหม่'}</h2>
            <div className="flex items-center mt-1">
              <span className="text-sm text-slate-500 mr-2">เลขที่อ้างอิง:</span>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="text-sm border-b border-slate-300 focus:border-indigo-500 outline-none px-1 py-0.5 bg-transparent font-medium text-indigo-700"
                placeholder="ระบุชื่อ PO"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition"
          >
            <Printer size={18} />
            <span>พิมพ์ PDF</span>
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || selectedSets.length === 0}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <Save size={18} />
            <span>{saving ? 'กำลังบันทึก...' : 'บันทึกใบสั่งซื้อ'}</span>
          </button>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800">ใบสั่งซื้อ (Purchase Order)</h2>
        <p className="text-slate-600 mt-1">เลขที่อ้างอิง: {title}</p>
      </div>

      {/* Selector Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 print:hidden">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center"><Plus size={20} className="mr-2 text-indigo-500"/> เลือกชุดอุปกรณ์ที่ต้องการสั่ง</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">ชุดอุปกรณ์ (Equipment Set)</label>
            <select 
              value={currentSetId} 
              onChange={e => setCurrentSetId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">-- เลือกชุดอุปกรณ์ --</option>
              {equipmentSets.map(set => (
                <option key={set.id} value={set.id}>{set.name} (฿{getSetPrice(set.id).toLocaleString()}/ชุด)</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-32">
            <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนชุด</label>
            <input 
              type="number" 
              min="1" 
              value={currentQty} 
              onChange={e => setCurrentQty(parseInt(e.target.value) || 1)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button 
            onClick={handleAddSet}
            disabled={!currentSetId}
            className="w-full md:w-auto bg-slate-800 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-700 transition disabled:opacity-50"
          >
            เพิ่มเข้ารายการ
          </button>
        </div>
      </div>

      {/* Report 1: Sets Ordered */}
      {selectedSets.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center"><Package size={20} className="mr-2 text-indigo-500"/> รายงาน 1: รายการชุดอุปกรณ์ที่สั่งซื้อ</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-sm text-slate-500">
                  <th className="p-4 font-medium">ชื่อชุดอุปกรณ์</th>
                  <th className="p-4 font-medium text-center">จำนวนชุด</th>
                  <th className="p-4 font-medium text-right">ราคาต่อชุด</th>
                  <th className="p-4 font-medium text-right">ราคารวม</th>
                  <th className="p-4 font-medium text-center w-16 print:hidden">จัดการ</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {report1Sets.rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">{row.name}</td>
                    <td className="p-4 text-center font-semibold text-indigo-600">{row.orderQty}</td>
                    <td className="p-4 text-right">฿{row.unitPrice.toLocaleString()}</td>
                    <td className="p-4 text-right font-semibold text-slate-800">฿{row.total.toLocaleString()}</td>
                    <td className="p-4 text-center print:hidden">
                      <button onClick={() => handleRemoveSet(row.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50">
                  <td colSpan="3" className="p-4 text-right font-bold text-slate-800">รวมราคาทั้งสิ้น (Total Amount)</td>
                  <td className="p-4 text-right font-bold text-indigo-700 text-lg">฿{report1Sets.grandTotal.toLocaleString()}</td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Report 2: Consolidated Items */}
      {selectedSets.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center"><List size={20} className="mr-2 text-indigo-500"/> รายงาน 2: รายการสินค้าย่อยที่ต้องสั่งซื้อ (แยกตามซัพพลายเออร์)</h3>
            <p className="text-sm text-slate-500 mt-1 print:hidden">ระบบคำนวณแยกสินค้าย่อยจากทุกชุดอุปกรณ์มารวมกันให้อัตโนมัติ เพื่อให้ง่ายต่อการสั่งซื้อจริง</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-sm text-slate-500">
                  <th className="p-4 font-medium">ซัพพลายเออร์</th>
                  <th className="p-4 font-medium">บาร์โค้ด</th>
                  <th className="p-4 font-medium">ชื่อสินค้า (TH/EN)</th>
                  <th className="p-4 font-medium text-right">ราคาหน่วย</th>
                  <th className="p-4 font-medium text-center">จำนวนรวม</th>
                  <th className="p-4 font-medium text-right">ราคารวม</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {report2Items.rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                        {row.supplierName}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-500">{row.barcode}</td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{row.nameTh}</div>
                      <div className="text-xs text-slate-500">{row.nameEn}</div>
                    </td>
                    <td className="p-4 text-right">฿{row.price.toLocaleString()}</td>
                    <td className="p-4 text-center font-bold text-indigo-600">{row.totalQty}</td>
                    <td className="p-4 text-right font-semibold text-slate-800">฿{row.totalPrice.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50">
                  <td colSpan="5" className="p-4 text-right font-bold text-slate-800">รวมราคาทั้งสิ้น (Total Amount)</td>
                  <td className="p-4 text-right font-bold text-indigo-700 text-lg">฿{report2Items.grandTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      
      {selectedSets.length === 0 && (
        <div className="bg-white p-12 rounded-xl border border-slate-200 border-dashed text-center flex flex-col items-center justify-center print:hidden">
          <div className="bg-slate-100 p-4 rounded-full mb-4">
            <ShoppingCart size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-1">ยังไม่มีรายการสั่งซื้อ</h3>
          <p className="text-slate-500 text-sm">กรุณาเลือกชุดอุปกรณ์และระบุจำนวนด้านบน เพื่อเริ่มสร้างใบสั่งซื้อ</p>
        </div>
      )}
    </div>
  );
}

// --- 2. PO List View ---
function POList({ purchaseOrders, onCreateNew, onEdit, db, basePath }) {
  const handleDelete = async (id) => {
    if(confirm('ต้องการลบใบสั่งซื้อนี้ใช่หรือไม่?')) {
      await deleteDoc(doc(db, `${basePath}/purchaseOrders`, id));
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">ใบสั่งซื้อทั้งหมด</h2>
        <button 
          onClick={onCreateNew}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center"
        >
          <Plus size={18} className="mr-2" /> สร้างใบสั่งซื้อใหม่
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {purchaseOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">ไม่พบข้อมูลใบสั่งซื้อ กด "สร้างใบสั่งซื้อใหม่" เพื่อเริ่มต้น</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                <th className="p-4 font-medium">เลขที่อ้างอิง (Title)</th>
                <th className="p-4 font-medium">วันที่สร้าง</th>
                <th className="p-4 font-medium text-center">จำนวนรายการชุด</th>
                <th className="p-4 font-medium text-right">ยอดรวม</th>
                <th className="p-4 font-medium text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {purchaseOrders.map(po => (
                <tr key={po.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 font-medium text-indigo-600 cursor-pointer" onClick={() => onEdit(po.id)}>
                    {po.title || po.id}
                  </td>
                  <td className="p-4 text-slate-500">
                    {po.createdAt?.toDate ? po.createdAt.toDate().toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : 'N/A'}
                  </td>
                  <td className="p-4 text-center">{po.sets?.length || 0}</td>
                  <td className="p-4 text-right font-semibold">฿{(po.totalAmount || 0).toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => onEdit(po.id)} className="text-slate-400 hover:text-indigo-600 p-1 mx-1"><Edit size={16}/></button>
                    <button onClick={() => handleDelete(po.id)} className="text-slate-400 hover:text-red-600 p-1 mx-1"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// --- 3. Master Data Views ---

function EquipmentSetMaster({ sets, items, getSetPrice, db, basePath }) {
  const [name, setName] = useState('');
  const [setItems, setSetItems] = useState([]); // [{itemId, qty}]
  const [curItem, setCurItem] = useState('');
  const [curQty, setCurQty] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSetId, setEditingSetId] = useState(null); 

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(i => 
      i.barcode.toLowerCase().includes(lower) || 
      i.nameTh.toLowerCase().includes(lower) || 
      (i.nameEn && i.nameEn.toLowerCase().includes(lower))
    );
  }, [items, searchTerm]);

  const handleAddItemToSet = () => {
    if (!curItem || curQty < 1) return;
    const existing = setItems.find(i => i.itemId === curItem);
    if (existing) {
      setSetItems(setItems.map(i => i.itemId === curItem ? { ...i, quantity: i.quantity + curQty } : i));
    } else {
      setSetItems([...setItems, { itemId: curItem, quantity: curQty }]);
    }
    setCurItem(''); setCurQty(1);
  };

  const handleSave = async () => {
    if (!name.trim() || setItems.length === 0) return alert('กรุณากรอกชื่อและเพิ่มสินค้าอย่างน้อย 1 รายการ');
    
    if (editingSetId) {
      await setDoc(doc(db, `${basePath}/equipmentSets`, editingSetId), { name, items: setItems }, { merge: true });
    } else {
      const id = `SET-${Date.now()}`;
      await setDoc(doc(db, `${basePath}/equipmentSets`, id), { name, items: setItems });
    }
    handleCancelEdit();
  };

  const handleEdit = (set) => {
    setEditingSetId(set.id);
    setName(set.name);
    setSetItems(set.items);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingSetId(null);
    setName('');
    setSetItems([]);
    setCurItem('');
    setCurQty(1);
  };

  const handleDelete = async (id) => {
    if(confirm('ลบชุดอุปกรณ์นี้?')) await deleteDoc(doc(db, `${basePath}/equipmentSets`, id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">จัดการชุดอุปกรณ์ (Equipment Sets)</h2>
      
      <div className={`bg-white p-6 rounded-xl shadow-sm border ${editingSetId ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-slate-800">
            {editingSetId ? 'แก้ไขชุดอุปกรณ์' : 'สร้างชุดอุปกรณ์ใหม่'}
          </h3>
          {editingSetId && (
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-md font-medium">กำลังแก้ไขโหมด</span>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อชุดอุปกรณ์</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-indigo-500" placeholder="เช่น ชุดคอมพิวเตอร์พนักงานบัญชี" />
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 items-end mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div className="flex-1">
            <label className="block text-sm text-slate-600 mb-1">ค้นหาและเลือกสินค้า</label>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative md:w-1/3">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="ค้นหาด้วยบาร์โค้ด หรือชื่อ..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 outline-none text-sm"
                />
              </div>
              <select value={curItem} onChange={e => setCurItem(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 outline-none text-sm">
                <option value="">-- เลือกสินค้า --</option>
                {filteredItems.map(i => <option key={i.id} value={i.id}>{i.barcode} - {i.nameTh} {i.nameEn ? `(${i.nameEn})` : ''} (฿{i.price})</option>)}
              </select>
            </div>
          </div>
          <div className="w-24">
            <label className="block text-sm text-slate-600 mb-1">จำนวน</label>
            <input type="number" min="1" value={curQty} onChange={e => setCurQty(parseInt(e.target.value)||1)} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none text-sm" />
          </div>
          <button onClick={handleAddItemToSet} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition">เพิ่ม</button>
        </div>

        {setItems.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2">สินค้าในชุด:</h4>
            <ul className="space-y-2">
              {setItems.map((si, idx) => {
                const itemData = items.find(i => i.id === si.itemId);
                return (
                  <li key={idx} className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded text-sm">
                    <span>{itemData?.nameTh || 'Unknown'} {itemData?.nameEn && <span className="text-slate-400">({itemData.nameEn})</span>} <span className="text-slate-400 ml-1">[{itemData?.barcode}]</span></span>
                    <div className="flex items-center space-x-4">
                      <span className="font-semibold text-indigo-600">x{si.quantity}</span>
                      <button onClick={() => setSetItems(setItems.filter(i => i.itemId !== si.itemId))} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          {editingSetId && (
            <button onClick={handleCancelEdit} className="w-1/3 bg-slate-200 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-300 transition">
              ยกเลิก
            </button>
          )}
          <button onClick={handleSave} className={`${editingSetId ? 'w-2/3' : 'w-full'} bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition`}>
            {editingSetId ? 'บันทึกการแก้ไข' : 'บันทึกชุดอุปกรณ์'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sets.map(set => (
          <div key={set.id} className={`bg-white p-5 rounded-xl shadow-sm border flex flex-col ${editingSetId === set.id ? 'border-indigo-400' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-slate-800">{set.name}</h3>
              <div className="flex space-x-2">
                <button onClick={() => handleEdit(set)} className="text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-lg transition"><Edit size={16}/></button>
                <button onClick={() => handleDelete(set.id)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition"><Trash2 size={16}/></button>
              </div>
            </div>
            <div className="flex-1">
              <ul className="text-sm text-slate-600 space-y-1 mb-4">
                {set.items.map((si, idx) => {
                  const itemData = items.find(i => i.id === si.itemId);
                  return <li key={idx} className="flex justify-between border-b border-slate-50 pb-1"><span>- {itemData?.nameTh || 'Unknown'}</span> <span>x{si.quantity}</span></li>
                })}
              </ul>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-sm text-slate-500">ราคารวมต่อชุด</span>
              <span className="font-bold text-indigo-700">฿{getSetPrice(set.id).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemMaster({ items, suppliers, db, basePath }) {
  const [form, setForm] = useState({ barcode: '', nameEn: '', nameTh: '', price: '' });
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if(!selectedSupplierId || !form.barcode || !form.nameTh) return;
    const id = `ITM-${Date.now()}`;
    await setDoc(doc(db, `${basePath}/items`, id), { ...form, supplierId: selectedSupplierId, price: parseFloat(form.price) || 0 });
    setForm({ barcode: '', nameEn: '', nameTh: '', price: '' });
  };

  const handleDelete = async (id) => {
    if(confirm('ลบสินค้านี้?')) await deleteDoc(doc(db, `${basePath}/items`, id));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedSupplierId) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const rows = text.split('\n').map(r => r.trim()).filter(r => r);
      
      let count = 0;
      for (let i = 0; i < rows.length; i++) {
        if (i === 0 && rows[i].toLowerCase().includes('barcode')) continue;
        
        let cols = rows[i].split('\t');
        if (cols.length < 2 && rows[i].includes(',')) {
          cols = rows[i].split(',');
        }

        if (cols.length >= 4) {
          const [barcode, nameTh, nameEn, price] = cols;
          if (barcode && nameTh) {
            const id = `ITM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await setDoc(doc(db, `${basePath}/items`, id), {
              supplierId: selectedSupplierId,
              barcode: barcode.trim(),
              nameTh: nameTh.trim(),
              nameEn: nameEn.trim(),
              price: parseFloat(price) || 0
            });
            count++;
          }
        }
      }
      alert(`นำเข้าข้อมูลสำเร็จ ${count} รายการ`);
      e.target.value = null; 
    };
    reader.readAsText(file);
  };

  const filteredItems = items.filter(i => i.supplierId === selectedSupplierId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">จัดการรายการสินค้า (Items)</h2>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">เลือกซัพพลายเออร์เพื่อจัดการสินค้า</label>
        <select 
          value={selectedSupplierId} 
          onChange={e => setSelectedSupplierId(e.target.value)} 
          className="w-full md:w-1/2 border border-slate-300 rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
        >
          <option value="">-- กรุณาเลือกซัพพลายเออร์ --</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName || s.brandName || s.name}</option>)}
        </select>
      </div>

      {selectedSupplierId ? (
        <>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-slate-800">เพิ่มสินค้าใหม่</h3>
              <div className="relative">
                <input type="file" accept=".csv,.txt,.tsv" id="csvUpload" className="hidden" onChange={handleFileUpload} />
                <label htmlFor="csvUpload" className="cursor-pointer flex items-center space-x-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">
                  <Upload size={16} />
                  <span>นำเข้าไฟล์ / Excel</span>
                </label>
              </div>
            </div>
            <div className="text-xs text-slate-500 mb-4">* สามารถคัดลอกตารางจาก Excel มาบันทึกเป็นไฟล์ .txt หรือใช้ .csv ได้เลย (คอลัมน์: บาร์โค้ด, ชื่อไทย, ชื่ออังกฤษ, ราคา)</div>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">บาร์โค้ด</label>
                <input required type="text" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="w-full border rounded px-3 py-2 text-sm outline-none" placeholder="รหัส" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">ชื่อ (TH)</label>
                <input required type="text" value={form.nameTh} onChange={e => setForm({...form, nameTh: e.target.value})} className="w-full border rounded px-3 py-2 text-sm outline-none" placeholder="ภาษาไทย" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">ชื่อ (EN)</label>
                <input type="text" value={form.nameEn} onChange={e => setForm({...form, nameEn: e.target.value})} className="w-full border rounded px-3 py-2 text-sm outline-none" placeholder="English" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">ราคา</label>
                <div className="flex">
                  <input required type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full border rounded-l px-3 py-2 text-sm outline-none" placeholder="0.00" />
                  <button type="submit" className="bg-indigo-600 text-white px-4 rounded-r hover:bg-indigo-700 transition">เพิ่ม</button>
                </div>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3">บาร์โค้ด</th>
                  <th className="p-3">ชื่อสินค้า (TH/EN)</th>
                  <th className="p-3 text-right">ราคา</th>
                  <th className="p-3 text-center">ลบ</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr><td colSpan="4" className="p-6 text-center text-slate-500">ยังไม่มีสินค้าในซัพพลายเออร์นี้</td></tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-mono">{item.barcode}</td>
                      <td className="p-3"><b>{item.nameTh}</b> {item.nameEn && <span className="text-slate-400 text-xs block">{item.nameEn}</span>}</td>
                      <td className="p-3 text-right font-medium">฿{item.price.toLocaleString()}</td>
                      <td className="p-3 text-center"><button onClick={()=>handleDelete(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-slate-50 p-12 text-center text-slate-500 rounded-xl border border-slate-200 border-dashed">
          กรุณาเลือกซัพพลายเออร์ด้านบน เพื่อดูและจัดการรายการสินค้า
        </div>
      )}
    </div>
  );
}

function SupplierMaster({ suppliers, db, basePath }) {
  const [form, setForm] = useState({ brandName: '', companyName: '', address: '', branch: '', taxId: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    if(!form.brandName.trim() && !form.companyName.trim()) {
      alert('กรุณากรอกชื่อแบรนด์ หรือ ชื่อบริษัท อย่างน้อย 1 ช่อง');
      return;
    }
    const id = `SUP-${Date.now()}`;
    await setDoc(doc(db, `${basePath}/suppliers`, id), { ...form });
    setForm({ brandName: '', companyName: '', address: '', branch: '', taxId: '' });
  };

  const handleDelete = async (id) => {
    if(confirm('ลบซัพพลายเออร์นี้? อาจทำให้ข้อมูลสินค้าที่เชื่อมโยงอยู่มีปัญหาได้')) await deleteDoc(doc(db, `${basePath}/suppliers`, id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">จัดการซัพพลายเออร์ (Suppliers)</h2>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-medium text-slate-800 mb-4">เพิ่มซัพพลายเออร์ใหม่</h3>
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">ชื่อแบรนด์ (ชื่อเรียกสั้นๆ) *</label>
            <input type="text" value={form.brandName} onChange={e => setForm({...form, brandName: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="เช่น IT Solutions" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">ชื่อบริษัท (ชื่อจดทะเบียน)</label>
            <input type="text" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="เช่น บริษัท ไอที โซลูชั่นส์ จำกัด" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">ที่อยู่</label>
            <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="ที่อยู่บริษัท" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">สาขา</label>
            <input type="text" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="เช่น สำนักงานใหญ่, สาขา 0001" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">เลขประจำตัวผู้เสียภาษี</label>
            <input type="text" value={form.taxId} onChange={e => setForm({...form, taxId: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" placeholder="เลข 13 หลัก" />
          </div>
          <div className="md:col-span-2 mt-2 text-right">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">บันทึกซัพพลายเออร์</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4">ข้อมูลบริษัท</th>
              <th className="p-4">ที่อยู่ / สาขา</th>
              <th className="p-4">เลขเสียภาษี</th>
              <th className="p-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr><td colSpan="4" className="p-6 text-center text-slate-500">ไม่มีข้อมูลซัพพลายเออร์</td></tr>
            ) : (
              suppliers.map(sup => (
                <tr key={sup.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{sup.brandName || sup.companyName || sup.name}</div>
                    {sup.companyName && sup.brandName && <div className="text-xs text-slate-500">{sup.companyName}</div>}
                    {!sup.brandName && !sup.companyName && sup.name && <div className="text-xs text-slate-500">{sup.name}</div>}
                  </td>
                  <td className="p-4 text-slate-600">
                    <div>{sup.address || '-'}</div>
                    <div className="text-xs text-slate-400">สาขา: {sup.branch || '-'}</div>
                  </td>
                  <td className="p-4 font-mono text-slate-600">{sup.taxId || '-'}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDelete(sup.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}