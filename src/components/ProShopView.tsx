import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Tag, 
  CreditCard, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Receipt, 
  Printer, 
  X, 
  Filter, 
  Edit3, 
  Trash2, 
  ArrowRight, 
  Clock, 
  User, 
  Boxes,
  PlusCircle,
  ExternalLink,
  Phone,
  MessageCircle,
  Image as ImageIcon,
  Upload,
  Star,
  ChevronLeft,
  ChevronRight,
  Eye,
  Camera
} from 'lucide-react';
import { Member, PaymentRecord, GymSettings, MerchItem, MerchCategory, MerchSaleRecord } from '../types';
import { formatCurrency } from '../utils/currencyUtils';
import { loadMerchProducts, saveMerchProducts, loadMerchSales, saveMerchSales } from '../utils/storage';

interface ProShopViewProps {
  theme?: 'dark' | 'light';
  settings: GymSettings;
  members: Member[];
  payments: PaymentRecord[];
  sales?: MerchSaleRecord[];
  onUpdateSales?: (sales: MerchSaleRecord[]) => void;
  onAddPayment: (payment: PaymentRecord) => void;
  onNavigateTab?: (tab: any) => void;
}

const CATEGORY_LABELS: Record<MerchCategory, { label: string; icon: string }> = {
  gis: { label: 'GIs & Kimonos', icon: '🥋' },
  rashguards: { label: 'Rashguards & No-Gi', icon: '👕' },
  gear: { label: 'Fighting Gear', icon: '🥊' },
  belts: { label: 'Belts & Tape', icon: '🎗️' },
  apparel: { label: 'Academy Apparel', icon: '🧥' },
  accessories: { label: 'Accessories', icon: '🎒' },
};

export const ProShopView: React.FC<ProShopViewProps> = ({
  theme = 'dark',
  settings,
  members,
  payments,
  sales: incomingSales,
  onUpdateSales,
  onAddPayment,
  onNavigateTab,
}) => {
  const isLight = theme === 'light';
  const currency = settings.currencySymbol || 'JOD';

  // Products State
  const [products, setProducts] = useState<MerchItem[]>(() => loadMerchProducts());
  // Sales History State
  const [localSales, setLocalSales] = useState<MerchSaleRecord[]>(() => loadMerchSales());
  const sales = incomingSales || localSales;

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'sales'>('inventory');

  // Modal States
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Selected Item for Actions
  const [selectedItemForSale, setSelectedItemForSale] = useState<MerchItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<MerchItem | null>(null);
  const [restockingItem, setRestockingItem] = useState<MerchItem | null>(null);
  const [activeReceiptSale, setActiveReceiptSale] = useState<MerchSaleRecord | null>(null);
  const [productToDelete, setProductToDelete] = useState<MerchItem | null>(null);

  // POS Sale Form State
  const [sellBuyerType, setSellBuyerType] = useState<'member' | 'walkin'>('member');
  const [sellMemberId, setSellMemberId] = useState('');
  const [sellBuyerName, setSellBuyerName] = useState('');
  const [sellBuyerPhone, setSellBuyerPhone] = useState('');
  const [sellSize, setSellSize] = useState('');
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellPaymentMethod, setSellPaymentMethod] = useState<'Cash' | 'Credit Card' | 'Cliq'>('Cash');
  const [sellNotes, setSellNotes] = useState('');
  const [sellSuccessMsg, setSellSuccessMsg] = useState<string | null>(null);
  const [activeReceiptWhatsappUrl, setActiveReceiptWhatsappUrl] = useState('');

  // Helper to format/clean phone for WhatsApp
  const cleanPhone = (phoneStr: string) => {
    let cleaned = phoneStr.replace(/[^\d]/g, '');
    if (cleaned.startsWith('07') && cleaned.length === 10) {
      cleaned = '962' + cleaned.substring(1);
    }
    return cleaned;
  };

  // Helper to construct WhatsApp message text for receipts
  const buildWhatsAppReceiptMessage = (sale: {
    buyerName: string;
    itemName: string;
    size: string;
    quantity: number;
    totalAmount: number;
    paymentMethod: string;
    receiptNumber?: string;
    id?: string;
    date: string;
    time: string;
  }) => {
    const gymTitle = settings.gymName || 'Ravens BJJ Academy';
    const totalFormatted = formatCurrency(sale.totalAmount, currency);
    const receiptCode = sale.receiptNumber || (sale.id ? sale.id.slice(-8).toUpperCase() : 'GEAR');

    return `🥋 *${gymTitle} — Pro Shop Receipt*

Hi ${sale.buyerName}! Thank you for your purchase from our Pro Shop!

📦 *Item:* ${sale.itemName}
📏 *Size:* ${sale.size}
🔢 *Quantity:* ${sale.quantity}
💰 *Total Paid:* ${totalFormatted} (${sale.paymentMethod})
🧾 *Receipt Ref:* #${receiptCode}
📅 *Date:* ${sale.date} at ${sale.time}

Thank you for supporting ${gymTitle}! See you on the mats! OSS! 🥋🔥`;
  };

  // Helper to generate full WhatsApp chat link
  const getWhatsAppUrlForSale = (sale: MerchSaleRecord) => {
    let phone = sale.buyerPhone || '';
    if (!phone && sale.memberId && sale.buyerType === 'member') {
      const mem = members.find((m) => m.id === sale.memberId);
      if (mem?.phone) phone = mem.phone;
    }
    const msg = buildWhatsAppReceiptMessage({
      buyerName: sale.buyerName,
      itemName: sale.itemName,
      size: sale.size,
      quantity: sale.quantity,
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      id: sale.id,
      date: sale.date,
      time: sale.time,
    });
    const cleaned = cleanPhone(phone);
    const encoded = encodeURIComponent(msg);
    return cleaned ? `https://wa.me/${cleaned}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  };

  // Handler for buyer type change (student vs walk-in guest)
  const handleBuyerTypeChange = (type: 'member' | 'walkin') => {
    setSellBuyerType(type);
    if (type === 'member') {
      const target = members.find((m) => m.id === sellMemberId) || members[0];
      if (target) {
        setSellMemberId(target.id);
        setSellBuyerName(target.fullName);
        setSellBuyerPhone(target.phone || '');
      }
    } else {
      setSellBuyerName('');
      setSellBuyerPhone('');
    }
  };

  // Handler for selecting student from dropdown
  const handleSelectMember = (memberId: string) => {
    setSellMemberId(memberId);
    const m = members.find((x) => x.id === memberId);
    if (m) {
      setSellBuyerName(m.fullName);
      setSellBuyerPhone(m.phone || '');
    }
  };

  // Restock Form State
  const [restockSize, setRestockSize] = useState('');
  const [restockAmount, setRestockAmount] = useState<number>(5);

  // Product Form State (New or Edit)
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState<MerchCategory>('gis');
  const [prodPrice, setProdPrice] = useState<number>(50);
  const [prodCostPrice, setProdCostPrice] = useState<number>(25);
  const [prodSku, setProdSku] = useState('');
  const [prodBrand, setProdBrand] = useState('Ravens Pro Gear');
  const [prodImageUrl, setProdImageUrl] = useState(''); // Primary display picture
  const [prodGalleryImages, setProdGalleryImages] = useState<string[]>([]); // Multiple pictures gallery
  const [newGalleryUrlInput, setNewGalleryUrlInput] = useState(''); // Adding gallery photo by URL
  const [prodSizesStr, setProdSizesStr] = useState('A1: 5, A2: 5, A3: 5');

  // Photo Gallery Lightbox Modal State
  const [lightboxProduct, setLightboxProduct] = useState<MerchItem | null>(null);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  // File Upload Handlers for Product Photography
  const handleUploadMainImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setProdImageUrl(dataUrl);
        setProdGalleryImages((prev) => (prev.includes(dataUrl) ? prev : [dataUrl, ...prev]));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUploadGalleryImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setProdGalleryImages((prev) => (prev.includes(dataUrl) ? prev : [...prev, dataUrl]));
          setProdImageUrl((curr) => curr || dataUrl);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddGalleryUrl = () => {
    const trimmed = newGalleryUrlInput.trim();
    if (!trimmed) return;
    setProdGalleryImages((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    if (!prodImageUrl) {
      setProdImageUrl(trimmed);
    }
    setNewGalleryUrlInput('');
  };

  const handleRemoveGalleryImage = (urlToRemove: string) => {
    setProdGalleryImages((prev) => prev.filter((img) => img !== urlToRemove));
    if (prodImageUrl === urlToRemove) {
      const remaining = prodGalleryImages.filter((img) => img !== urlToRemove);
      setProdImageUrl(remaining[0] || '');
    }
  };

  const handleSetMainDisplayPicture = (url: string) => {
    setProdImageUrl(url);
    setProdGalleryImages((prev) => [url, ...prev.filter((img) => img !== url)]);
  };

  // Filtered In-Stock Products (strictly stock > 0)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Must be in stock
      if (p.stock <= 0) return false;
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesSearch = 
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Metrics
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthSales = useMemo(() => {
    return sales.filter((s) => s.date.startsWith(currentMonthYear));
  }, [sales, currentMonthYear]);

  const totalThisMonthRevenue = useMemo(() => {
    return thisMonthSales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [thisMonthSales]);

  const totalItemsSoldThisMonth = useMemo(() => {
    return thisMonthSales.reduce((sum, s) => sum + s.quantity, 0);
  }, [thisMonthSales]);

  const totalInventoryStock = useMemo(() => {
    return products.reduce((sum, p) => sum + p.stock, 0);
  }, [products]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + p.price * p.stock, 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stock <= 3).length;
  }, [products]);

  // Open POS Modal for specific item
  const handleOpenSellItem = (item?: MerchItem) => {
    const target = item || products[0];
    setSelectedItemForSale(target || null);
    if (target && target.sizes.length > 0) {
      setSellSize(target.sizes[0].size);
    } else {
      setSellSize('One Size');
    }
    setSellQuantity(1);
    setSellBuyerType('member');
    const firstMember = members[0];
    setSellMemberId(firstMember?.id || '');
    setSellBuyerName(firstMember?.fullName || '');
    setSellBuyerPhone(firstMember?.phone || '');
    setSellPaymentMethod('Cash');
    setSellNotes('');
    setIsSellModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (item: MerchItem) => {
    setEditingProduct(item);
    setProdName(item.name);
    setProdCategory(item.category);
    setProdPrice(item.price);
    setProdCostPrice(item.costPrice || Math.round(item.price * 0.6));
    setProdSku(item.sku || '');
    setProdBrand(item.brand || 'Ravens Pro Gear');
    setProdImageUrl(item.imageUrl || '');
    const initialImages: string[] = [];
    if (item.imageUrl) initialImages.push(item.imageUrl);
    if (item.images && Array.isArray(item.images)) {
      item.images.forEach((img) => {
        if (img && !initialImages.includes(img)) initialImages.push(img);
      });
    }
    setProdGalleryImages(initialImages);
    setNewGalleryUrlInput('');
    setProdSizesStr(item.sizes.map((s) => `${s.size}: ${s.stock}`).join(', '));
    setIsProductModalOpen(true);
  };

  // Open New Product Modal
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCategory('gis');
    setProdPrice(60);
    setProdCostPrice(30);
    setProdSku('');
    setProdBrand('Ravens Pro Gear');
    setProdImageUrl('');
    setProdGalleryImages([]);
    setNewGalleryUrlInput('');
    setProdSizesStr('S: 5, M: 5, L: 5, XL: 5');
    setIsProductModalOpen(true);
  };

  // Open Restock Modal
  const handleOpenRestock = (item: MerchItem) => {
    setRestockingItem(item);
    if (item.sizes.length > 0) {
      setRestockSize(item.sizes[0].size);
    }
    setRestockAmount(5);
    setIsRestockModalOpen(true);
  };

  // Complete POS Sale
  const handleCompleteSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForSale) return;

    const availableSizeStock = selectedItemForSale.sizes.find((s) => s.size === sellSize)?.stock ?? selectedItemForSale.stock;
    if (availableSizeStock < sellQuantity) {
      alert(`Insufficient stock! Only ${availableSizeStock} units of size ${sellSize} available.`);
      return;
    }

    const buyer = sellBuyerType === 'member'
      ? members.find((m) => m.id === sellMemberId)?.fullName || sellBuyerName || 'Member'
      : sellBuyerName.trim() || 'Walk-in Guest';

    const phoneToSend = sellBuyerPhone.trim();
    if (sellBuyerType === 'walkin' && !phoneToSend) {
      alert('Please enter a WhatsApp phone number for the walk-in guest to receive their thank-you message.');
      return;
    }

    const totalAmount = selectedItemForSale.price * sellQuantity;
    const nowIso = new Date();
    const dateStr = nowIso.toISOString().split('T')[0];
    const timeStr = nowIso.toTimeString().slice(0, 5);

    // 1. Create Payment Record (Shows in Payments section and adds to collected this month)
    const paymentId = `pay_merch_${Date.now()}`;
    const receiptNum = `RCP-GEAR-${Math.floor(100000 + Math.random() * 900000)}`;
    const newPayment: PaymentRecord = {
      id: paymentId,
      memberId: sellBuyerType === 'member' ? sellMemberId : 'walkin_guest',
      memberName: buyer,
      amount: totalAmount,
      currency: currency,
      date: dateStr,
      time: timeStr,
      paymentMethod: sellPaymentMethod,
      membershipPackage: `Gear Sale: ${selectedItemForSale.name} (${sellSize})`,
      classesCredited: 0,
      receiptNumber: receiptNum,
      status: 'Completed',
      notes: `Pro Shop Gear Sale: ${selectedItemForSale.name} (Size: ${sellSize}, Qty: ${sellQuantity})${sellNotes ? ' - ' + sellNotes : ''}`,
    };

    // 2. Create Merch Sale Record
    const newSale: MerchSaleRecord = {
      id: `sale_${Date.now()}`,
      itemId: selectedItemForSale.id,
      itemName: selectedItemForSale.name,
      category: selectedItemForSale.category,
      size: sellSize,
      quantity: sellQuantity,
      unitPrice: selectedItemForSale.price,
      totalAmount,
      buyerType: sellBuyerType,
      memberId: sellBuyerType === 'member' ? sellMemberId : undefined,
      buyerName: buyer,
      buyerPhone: phoneToSend || undefined,
      date: dateStr,
      time: timeStr,
      paymentMethod: sellPaymentMethod,
      paymentId: paymentId,
      notes: sellNotes.trim() || undefined,
    };

    // 3. Deduct Stock from Product
    const updatedProducts = products.map((p) => {
      if (p.id !== selectedItemForSale.id) return p;
      const updatedSizes = p.sizes.map((s) => {
        if (s.size === sellSize) {
          return { ...s, stock: Math.max(0, s.stock - sellQuantity) };
        }
        return s;
      });
      const updatedTotalStock = updatedSizes.reduce((sum, s) => sum + s.stock, 0);
      return {
        ...p,
        sizes: updatedSizes,
        stock: updatedTotalStock,
      };
    });

    // 4. Save States
    setProducts(updatedProducts);
    saveMerchProducts(updatedProducts);

    const updatedSales = [newSale, ...sales];
    setLocalSales(updatedSales);
    saveMerchSales(updatedSales);
    if (onUpdateSales) {
      onUpdateSales(updatedSales);
    }

    // 5. Fire onAddPayment so Payments ledger and revenue counters update instantly!
    onAddPayment(newPayment);

    // 6. Build and Send WhatsApp Thanks Message
    const thanksText = buildWhatsAppReceiptMessage({
      buyerName: buyer,
      itemName: selectedItemForSale.name,
      size: sellSize,
      quantity: sellQuantity,
      totalAmount,
      paymentMethod: sellPaymentMethod,
      receiptNumber: receiptNum,
      id: newSale.id,
      date: dateStr,
      time: timeStr,
    });
    const cleanedDigits = cleanPhone(phoneToSend);
    const encoded = encodeURIComponent(thanksText);
    const whatsappUrl = cleanedDigits
      ? `https://wa.me/${cleanedDigits}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    setActiveReceiptWhatsappUrl(whatsappUrl);

    // Auto-launch WhatsApp in new window/tab
    if (typeof window !== 'undefined') {
      try {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.warn('Could not auto-open WhatsApp link:', err);
      }
    }

    // 7. Close POS Modal and open Receipt
    setIsSellModalOpen(false);
    setActiveReceiptSale(newSale);
    setIsReceiptModalOpen(true);
  };

  // Submit Restock
  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingItem) return;

    const updatedProducts = products.map((p) => {
      if (p.id !== restockingItem.id) return p;
      const updatedSizes = p.sizes.map((s) => {
        if (s.size === restockSize) {
          return { ...s, stock: s.stock + restockAmount };
        }
        return s;
      });
      const updatedTotalStock = updatedSizes.reduce((sum, s) => sum + s.stock, 0);
      return {
        ...p,
        sizes: updatedSizes,
        stock: updatedTotalStock,
      };
    });

    setProducts(updatedProducts);
    saveMerchProducts(updatedProducts);
    setIsRestockModalOpen(false);
    setRestockingItem(null);
  };

  // Submit New / Edit Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    // Parse sizes string: e.g. "A1: 5, A2: 8"
    const parsedSizes = prodSizesStr
      .split(',')
      .map((entry) => {
        const parts = entry.split(':');
        const sName = parts[0]?.trim() || 'Standard';
        const sCount = parseInt(parts[1]?.trim() || '5', 10);
        return { size: sName, stock: isNaN(sCount) ? 5 : sCount };
      })
      .filter((s) => s.size.length > 0);

    const finalSizes = parsedSizes.length > 0 ? parsedSizes : [{ size: 'One Size', stock: 10 }];
    const totalStock = finalSizes.reduce((sum, s) => sum + s.stock, 0);

    const finalMainImage = prodImageUrl.trim() || prodGalleryImages[0] || undefined;
    const finalGalleryImages = prodGalleryImages.length > 0
      ? Array.from(new Set([finalMainImage, ...prodGalleryImages].filter(Boolean) as string[]))
      : finalMainImage ? [finalMainImage] : undefined;

    if (editingProduct) {
      // Update existing
      const updated = products.map((p) => {
        if (p.id !== editingProduct.id) return p;
        return {
          ...p,
          name: prodName.trim(),
          category: prodCategory,
          price: Number(prodPrice),
          costPrice: Number(prodCostPrice),
          sku: prodSku.trim() || undefined,
          brand: prodBrand.trim() || 'Ravens Pro Gear',
          description: undefined,
          imageUrl: finalMainImage,
          images: finalGalleryImages,
          sizes: finalSizes,
          stock: totalStock,
        };
      });
      setProducts(updated);
      saveMerchProducts(updated);
    } else {
      // Create new
      const newProd: MerchItem = {
        id: `merch_${Date.now()}`,
        name: prodName.trim(),
        category: prodCategory,
        price: Number(prodPrice),
        costPrice: Number(prodCostPrice),
        sku: prodSku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        brand: prodBrand.trim() || 'Ravens Pro Gear',
        description: undefined,
        imageUrl: finalMainImage,
        images: finalGalleryImages,
        sizes: finalSizes,
        stock: totalStock,
      };
      const updated = [newProd, ...products];
      setProducts(updated);
      saveMerchProducts(updated);
    }

    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  // Delete Product Handlers (Bypasses browser window.confirm restriction)
  const handleRequestDeleteProduct = (item: MerchItem) => {
    setProductToDelete(item);
  };

  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    const updated = products.filter((p) => p.id !== productToDelete.id);
    setProducts(updated);
    saveMerchProducts(updated);
    setProductToDelete(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Streamlined Category Filter Pills, Search Bar, and Action Buttons */}
      <div className={`p-3.5 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
        isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-stone-900 border-stone-800'
      }`}>
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-red-600 text-white shadow-xs'
                : isLight ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300' : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            All Gear ({products.length})
          </button>

          {(Object.keys(CATEGORY_LABELS) as MerchCategory[]).map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            const info = CATEGORY_LABELS[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-red-600 text-white shadow-xs'
                    : isLight ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300' : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                }`}
              >
                <span>{info.icon}</span>
                <span>{info.label} ({count})</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Search + Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search gear by name, brand, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-red-500 font-medium ${
                isLight
                  ? 'bg-stone-50 border-stone-300 text-stone-900'
                  : 'bg-stone-950 border-stone-700 text-white'
              }`}
            />
          </div>

          <button
            type="button"
            onClick={() => handleOpenSellItem()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
            title="Sell Gear / POS Checkout"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Sell Gear</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewProduct}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isLight
                ? 'bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
            }`}
            title="Add new inventory gear product"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Item</span>
          </button>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((item) => {
              const catInfo = CATEGORY_LABELS[item.category] || { label: 'Gear', icon: '🥊' };
              const isLowStock = item.stock <= 3;
              const isOutOfStock = item.stock === 0;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between transition-all group ${
                    isLight
                      ? 'bg-white border-stone-200 hover:border-red-400 shadow-xs'
                      : 'bg-stone-900 border-stone-800 hover:border-stone-700 shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Category & Stock Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                        isLight ? 'bg-stone-100 text-stone-700' : 'bg-stone-800 text-stone-300'
                      }`}>
                        <span>{catInfo.icon}</span>
                        <span>{catInfo.label}</span>
                      </span>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isOutOfStock
                          ? 'bg-red-500/20 text-red-500 border border-red-500/40'
                          : isLowStock
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-pulse'
                          : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                      }`}>
                        {isOutOfStock ? 'Out of Stock' : isLowStock ? `Low: ${item.stock} Left` : `${item.stock} in Stock`}
                      </span>
                    </div>

                    {/* Image / Thumbnail */}
                    <div 
                      onClick={() => {
                        if (item.imageUrl || (item.images && item.images.length > 0)) {
                          setLightboxProduct(item);
                          setLightboxImageIndex(0);
                        }
                      }}
                      className="relative h-36 w-full rounded-xl overflow-hidden bg-stone-950 flex items-center justify-center border border-stone-800/80 cursor-pointer group/img"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-4xl">{catInfo.icon}</div>
                      )}
                      {item.isPopular && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider shadow-md">
                          Academy Favorite
                        </span>
                      )}
                      {/* Photo Gallery Badge */}
                      {((item.images && item.images.length > 0) || item.imageUrl) && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold inline-flex items-center gap-1 border border-white/10 shadow-sm">
                          <Camera className="w-3 h-3 text-stone-300" />
                          <span>{item.images && item.images.length > 0 ? item.images.length : 1} Photo{(item.images?.length || 1) !== 1 ? 's' : ''}</span>
                        </span>
                      )}
                    </div>

                    {/* Title & Price */}
                    <div>
                      <h3 className={`text-sm font-black tracking-tight leading-snug line-clamp-1 ${isLight ? 'text-stone-950' : 'text-white'}`}>
                        {item.name}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-base font-black text-emerald-500 font-mono-digits">
                          {formatCurrency(item.price, currency)}
                        </span>
                        {item.brand && (
                          <span className={`text-[10px] font-bold ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
                            {item.brand}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Size & Stock Badges */}
                    <div className="space-y-1 pt-1">
                      <span className={`text-[10px] uppercase font-bold tracking-wider block ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
                        Available Sizes:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.sizes.map((s, idx) => (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              s.stock > 0
                                ? isLight
                                  ? 'bg-stone-50 text-stone-800 border-stone-300'
                                  : 'bg-stone-950 text-stone-200 border-stone-800'
                                : 'bg-red-950/20 text-stone-500 border-dashed border-red-900/40 line-through'
                            }`}
                            title={`${s.stock} in stock`}
                          >
                            {s.size}: <strong>{s.stock}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className={`pt-3.5 mt-3.5 border-t flex items-center gap-2 ${isLight ? 'border-stone-200' : 'border-stone-800'}`}>
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => handleOpenSellItem(item)}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black inline-flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                        isOutOfStock
                          ? 'bg-stone-300 dark:bg-stone-800 text-stone-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 cursor-pointer'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Sell Item</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenRestock(item)}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-300'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                      }`}
                      title="Restock units"
                    >
                      + Stock
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditProduct(item)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        isLight
                          ? 'hover:bg-stone-100 text-stone-600 border-stone-300'
                          : 'hover:bg-stone-800 text-stone-400 border-stone-800'
                      }`}
                      title="Edit Item"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRequestDeleteProduct(item)}
                      className="p-2 rounded-xl border border-transparent hover:border-red-500/40 hover:bg-red-500/10 text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className={`p-10 rounded-2xl border text-center space-y-3 ${
              isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
            }`}>
              <div className="w-12 h-12 rounded-full bg-stone-800 text-stone-400 mx-auto flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h3 className={`text-base font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>
                No gear items found
              </h3>
              <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
                Try adjusting your search terms or category filter, or click "+ Add Item" to add new fighting gear.
              </p>
              <button
                type="button"
                onClick={handleOpenNewProduct}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add First Item</span>
              </button>
            </div>
          )}

      {/* MODAL 1: POS SELL GEAR CHECKOUT */}
      {isSellModalOpen && selectedItemForSale && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto ${
            isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-900 border-stone-800 text-white'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">POS Checkout: Sell Gear</h3>
                  <p className="text-xs text-stone-400">Complete sale & record revenue payment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSellModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSale} className="space-y-4">
              {/* Product Info Card */}
              <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                isLight ? 'bg-stone-50 border-stone-200' : 'bg-stone-950 border-stone-800'
              }`}>
                {selectedItemForSale.imageUrl && (
                  <img
                    src={selectedItemForSale.imageUrl}
                    alt={selectedItemForSale.name}
                    className="w-14 h-14 rounded-lg object-cover border border-stone-800 shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block">
                    {CATEGORY_LABELS[selectedItemForSale.category]?.label}
                  </span>
                  <h4 className="text-sm font-black truncate">{selectedItemForSale.name}</h4>
                  <div className="text-base font-black text-emerald-500 font-mono-digits mt-0.5">
                    {formatCurrency(selectedItemForSale.price, currency)}
                  </div>
                </div>
              </div>

              {/* Size & Quantity Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1">Select Size</label>
                  <select
                    value={sellSize}
                    onChange={(e) => setSellSize(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:border-emerald-500 ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                    }`}
                  >
                    {selectedItemForSale.sizes.map((s, idx) => (
                      <option key={idx} value={s.size} disabled={s.stock <= 0}>
                        {s.size} ({s.stock > 0 ? `${s.stock} in stock` : 'Out of stock'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedItemForSale.sizes.find((s) => s.size === sellSize)?.stock || 10}
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:border-emerald-500 ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Customer Selection */}
              <div>
                <label className="text-xs font-bold text-stone-400 block mb-1">Buyer / Customer</label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleBuyerTypeChange('member')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      sellBuyerType === 'member'
                        ? 'bg-red-600 text-white border-red-500'
                        : isLight ? 'bg-stone-100 text-stone-700 border-stone-300' : 'bg-stone-950 text-stone-400 border-stone-800'
                    }`}
                  >
                    Registered Student
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBuyerTypeChange('walkin')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      sellBuyerType === 'walkin'
                        ? 'bg-red-600 text-white border-red-500'
                        : isLight ? 'bg-stone-100 text-stone-700 border-stone-300' : 'bg-stone-950 text-stone-400 border-stone-800'
                    }`}
                  >
                    Walk-in Guest
                  </button>
                </div>

                {sellBuyerType === 'member' ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-bold text-stone-400 block mb-1">Select Student</label>
                      <select
                        value={sellMemberId}
                        onChange={(e) => handleSelectMember(e.target.value)}
                        className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:border-emerald-500 ${
                          isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                        }`}
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} ({m.beltRank} Belt)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-stone-400 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Student WhatsApp Mobile Number</span>
                        </label>
                        <span className="text-[10px] text-stone-400">Auto-filled from profile</span>
                      </div>
                      <input
                        type="tel"
                        placeholder="e.g. +962 79 123 4567 or 0791234567"
                        value={sellBuyerPhone}
                        onChange={(e) => setSellBuyerPhone(e.target.value)}
                        className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:border-emerald-500 ${
                          isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                        }`}
                      />
                      <p className="text-[10px] text-stone-500 mt-1">
                        A thank-you message and digital receipt will be automatically sent to this WhatsApp number.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-xs font-bold text-stone-400 block mb-1">
                        Guest Full Name <span className="text-emerald-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter guest customer full name..."
                        value={sellBuyerName}
                        onChange={(e) => setSellBuyerName(e.target.value)}
                        required
                        className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:border-emerald-500 ${
                          isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-stone-400 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Guest WhatsApp Phone Number <span className="text-emerald-500">*</span></span>
                        </label>
                        <span className="text-[10px] text-emerald-500 font-bold">Required for WhatsApp</span>
                      </div>
                      <input
                        type="tel"
                        placeholder="e.g. +962 79 123 4567 or 0791234567"
                        value={sellBuyerPhone}
                        onChange={(e) => setSellBuyerPhone(e.target.value)}
                        required
                        className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none focus:border-emerald-500 ${
                          isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                        }`}
                      />
                      <p className="text-[10px] text-stone-500 mt-1">
                        Enter mobile number with country code so the guest receives their thank-you message via WhatsApp.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-bold text-stone-400 block mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'Credit Card', 'Cliq'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSellPaymentMethod(method)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors ${
                        sellPaymentMethod === method
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                          : isLight ? 'bg-stone-100 text-stone-700 border-stone-300' : 'bg-stone-950 text-stone-400 border-stone-800'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-stone-400 block mb-1">Notes / Instructions (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Competition patch included, customized fit"
                  value={sellNotes}
                  onChange={(e) => setSellNotes(e.target.value)}
                  className={`w-full p-2 rounded-xl text-xs border focus:outline-none focus:border-emerald-500 ${
                    isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                />
              </div>

              {/* Total Summary */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/30 border-emerald-800/60'
              }`}>
                <div>
                  <span className="text-xs text-stone-400 font-bold block">Total Amount Due</span>
                  <span className="text-[11px] text-stone-500">
                    {sellQuantity}x @ {formatCurrency(selectedItemForSale.price, currency)}
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-500 font-mono-digits">
                  {formatCurrency(selectedItemForSale.price * sellQuantity, currency)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSellModalOpen(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                    isLight ? 'bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-800' : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-2 py-3 px-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-200 shrink-0" />
                  <span>Confirm Sell and Send a Thanks WhatsApp Message</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECEIPT MODAL */}
      {isReceiptModalOpen && activeReceiptSale && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white text-stone-900 p-6 shadow-2xl space-y-4 font-mono">
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-stone-300 space-y-1">
              <h3 className="text-base font-black uppercase tracking-tight">{settings.gymName || 'Ravens BJJ Academy'}</h3>
              <p className="text-[10px] text-stone-600 uppercase tracking-widest">Pro Shop & Fighting Gear</p>
              <div className="text-[10px] text-stone-500">Receipt Ref: #{activeReceiptSale.id.slice(-8).toUpperCase()}</div>
            </div>

            {/* Sale Details */}
            <div className="text-xs space-y-2 py-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Date & Time:</span>
                <span>{activeReceiptSale.date} {activeReceiptSale.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Customer:</span>
                <span className="font-bold">{activeReceiptSale.buyerName}</span>
              </div>
              {activeReceiptSale.buyerPhone && (
                <div className="flex justify-between">
                  <span className="text-stone-500">WhatsApp:</span>
                  <span className="font-bold text-emerald-600">{activeReceiptSale.buyerPhone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-500">Payment:</span>
                <span className="font-bold">{activeReceiptSale.paymentMethod}</span>
              </div>

              <div className="border-t border-dashed border-stone-300 pt-2 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>{activeReceiptSale.itemName}</span>
                </div>
                <div className="flex justify-between text-stone-600 text-[11px]">
                  <span>Size {activeReceiptSale.size} × {activeReceiptSale.quantity}</span>
                  <span>{formatCurrency(activeReceiptSale.totalAmount, currency)}</span>
                </div>
              </div>

              <div className="border-t-2 border-stone-900 pt-2 flex justify-between text-sm font-black">
                <span>TOTAL PAID:</span>
                <span>{formatCurrency(activeReceiptSale.totalAmount, currency)}</span>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="text-center pt-3 border-t border-dashed border-stone-300 text-[10px] text-stone-500 space-y-1">
              <p>Thank you for supporting {settings.gymName || 'our academy'}!</p>
              <p className="italic">OSS • See you on the mats!</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:bg-stone-800 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <a
                href={activeReceiptWhatsappUrl || getWhatsAppUrlForSale(activeReceiptSale)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Send / Open WhatsApp Thanks Message"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="py-2 px-3 rounded-xl text-xs font-bold bg-stone-200 text-stone-800 hover:bg-stone-300 cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESTOCK MODAL */}
      {isRestockModalOpen && restockingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-900 border-stone-800 text-white'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="text-sm font-black">Restock Inventory</h3>
              <button type="button" onClick={() => setIsRestockModalOpen(false)}>
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-3">
              <div className="text-xs">
                <span className="text-stone-400">Product:</span>
                <div className="font-bold text-sm mt-0.5">{restockingItem.name}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-400 block mb-1">Select Size</label>
                <select
                  value={restockSize}
                  onChange={(e) => setRestockSize(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                    isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                >
                  {restockingItem.sizes.map((s, idx) => (
                    <option key={idx} value={s.size}>
                      Size {s.size} (Current: {s.stock} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-400 block mb-1">Units to Add</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(parseInt(e.target.value) || 1)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                    isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-stone-800 text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD / EDIT PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto ${
            isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-900 border-stone-800 text-white'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="text-base font-black">
                {editingProduct ? 'Edit Gear Product' : 'Add New Gear Product'}
              </h3>
              <button type="button" onClick={() => setIsProductModalOpen(false)}>
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-stone-400 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ravens Stealth Gi, Competition Rashguard..."
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                    isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1">Category</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value as MerchCategory)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                    }`}
                  >
                    {(Object.keys(CATEGORY_LABELS) as MerchCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat].icon} {CATEGORY_LABELS[cat].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1">Selling Price ({currency})</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(parseFloat(e.target.value) || 0)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1">Wholesale Cost Price ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={prodCostPrice}
                    onChange={(e) => setProdCostPrice(parseFloat(e.target.value) || 0)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1">SKU / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. GI-RAV-01"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-400 block mb-1">
                  Sizes & Initial Stock (Format: Size: Stock, Size: Stock)
                </label>
                <input
                  type="text"
                  placeholder="e.g. A1: 4, A2: 6, A3: 5 or S: 3, M: 7, L: 5"
                  value={prodSizesStr}
                  onChange={(e) => setProdSizesStr(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                    isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                />
                <span className="text-[10px] text-stone-500 mt-0.5 block">
                  Example: "A1: 5, A2: 8, A3: 4" or "14oz: 10, 16oz: 8"
                </span>
              </div>

              {/* Photos & Multi-picture Gallery Upload */}
              <div className="space-y-3 pt-1 border-t border-stone-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-stone-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-red-500" />
                    <span>Product Photography (Display Picture & Gallery)</span>
                  </label>
                  <span className="text-[10px] text-stone-500">
                    {prodGalleryImages.length} photo{prodGalleryImages.length !== 1 ? 's' : ''} added
                  </span>
                </div>

                {/* Display Picture (Primary Cover Photo) */}
                <div className={`p-3 rounded-xl border space-y-2.5 ${
                  isLight ? 'bg-stone-50 border-stone-300' : 'bg-stone-950/80 border-stone-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-red-500" /> Primary Display Picture
                    </span>
                    {prodImageUrl && (
                      <button
                        type="button"
                        onClick={() => setProdImageUrl('')}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300"
                      >
                        Remove Cover
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-xl bg-stone-900 border border-stone-700 overflow-hidden flex items-center justify-center shrink-0 relative group">
                      {prodImageUrl ? (
                        <img src={prodImageUrl} alt="Display" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-stone-600" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <label className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer border border-stone-700 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Cover Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadMainImage}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="url"
                        placeholder="Or paste image URL (https://...)"
                        value={prodImageUrl}
                        onChange={(e) => {
                          setProdImageUrl(e.target.value);
                          if (e.target.value && !prodGalleryImages.includes(e.target.value)) {
                            setProdGalleryImages((prev) => [e.target.value, ...prev]);
                          }
                        }}
                        className={`w-full p-2 rounded-lg text-xs border ${
                          isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-900 border-stone-700 text-white'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Gallery: Multiple Additional Pictures */}
                <div className={`p-3 rounded-xl border space-y-2.5 ${
                  isLight ? 'bg-stone-50 border-stone-300' : 'bg-stone-950/80 border-stone-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                      Multiple Product Pictures (Angles / Details)
                    </span>
                    <label className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer border border-red-500/30 transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>+ Add Multiple Photos</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleUploadGalleryImages}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Add URL Row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="Paste picture URL and click add..."
                      value={newGalleryUrlInput}
                      onChange={(e) => setNewGalleryUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddGalleryUrl();
                        }
                      }}
                      className={`flex-1 p-2 rounded-lg text-xs border ${
                        isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-900 border-stone-700 text-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddGalleryUrl}
                      className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-bold shrink-0 border border-stone-700 cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Thumbnails Grid */}
                  {prodGalleryImages.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
                      {prodGalleryImages.map((imgUrl, idx) => {
                        const isMain = prodImageUrl === imgUrl;
                        return (
                          <div
                            key={idx}
                            className={`relative h-16 rounded-lg overflow-hidden border bg-stone-900 group ${
                              isMain ? 'ring-2 ring-red-500 border-red-500' : 'border-stone-700'
                            }`}
                          >
                            <img src={imgUrl} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                            {isMain && (
                              <span className="absolute top-0.5 left-0.5 bg-red-600 text-white p-0.5 rounded shadow-sm">
                                <Star className="w-2.5 h-2.5 fill-white" />
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-0.5">
                              {!isMain && (
                                <button
                                  type="button"
                                  onClick={() => handleSetMainDisplayPicture(imgUrl)}
                                  className="p-1 rounded bg-red-600 text-white hover:scale-110 transition-transform"
                                  title="Set as Display Picture"
                                >
                                  <Star className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryImage(imgUrl)}
                                className="p-1 rounded bg-red-600 text-white hover:scale-110 transition-transform"
                                title="Remove photo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-[11px] text-stone-500 italic border border-dashed border-stone-800 rounded-lg">
                      No additional gallery pictures uploaded yet. Click "+ Add Multiple Photos" or paste URLs above.
                    </div>
                  )}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-800">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProductModalOpen(false);
                      setProductToDelete(editingProduct);
                    }}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/60 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Product</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-stone-800 text-stone-300 hover:bg-stone-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md active:scale-95 cursor-pointer"
                  >
                    {editingProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 5: IN-APP DELETE ITEM CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-red-300 text-stone-900' : 'bg-stone-900 border-red-500/40 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Delete Item from Pro Shop?</h3>
                <p className={`text-xs ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
                  Confirm deletion from inventory catalog
                </p>
              </div>
            </div>

            {/* Item Details Card */}
            <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${
              isLight ? 'bg-stone-50 border-stone-200' : 'bg-stone-950/90 border-stone-800'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-sm">{productToDelete.name}</p>
                  <p className={`text-[11px] mt-0.5 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                    Category: <strong className={isLight ? 'text-stone-800' : 'text-stone-200'}>{CATEGORY_LABELS[productToDelete.category]?.label || productToDelete.category}</strong>
                  </p>
                  <p className={`text-[11px] ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                    Brand: <strong className={isLight ? 'text-stone-800' : 'text-stone-200'}>{productToDelete.brand || 'Ravens Pro Gear'}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-emerald-500 font-mono-digits">
                    {formatCurrency(productToDelete.price, currency)}
                  </div>
                  <span className={`text-[10px] font-bold ${
                    productToDelete.stock > 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {productToDelete.stock} in stock
                  </span>
                </div>
              </div>

              {/* Sizes summary */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-stone-200/60 dark:border-stone-800/60">
                <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>Sizes:</span>
                {productToDelete.sizes.map((s, idx) => (
                  <span key={idx} className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                    isLight ? 'bg-white border-stone-300 text-stone-700' : 'bg-stone-900 border-stone-700 text-stone-300'
                  }`}>
                    {s.size}: {s.stock}
                  </span>
                ))}
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
              Are you sure you want to permanently delete <strong className={isLight ? 'text-stone-900' : 'text-white'}>"{productToDelete.name}"</strong> from the store catalog? Past sales records and receipts for this item will remain saved in your financial ledger.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isLight ? 'bg-stone-100 hover:bg-stone-200 text-stone-700' : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm & Delete Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: PHOTO GALLERY LIGHTBOX MODAL */}
      {lightboxProduct && (
        <div className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Lightbox Header */}
          <div className="w-full max-w-4xl flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold text-lg">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">{lightboxProduct.name}</h3>
                <p className="text-xs text-stone-400">
                  {lightboxProduct.brand || 'Ravens Pro Gear'} • <span className="text-emerald-400 font-bold">{formatCurrency(lightboxProduct.price, currency)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const p = lightboxProduct;
                  setLightboxProduct(null);
                  handleOpenSellItem(p);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Sell This Item</span>
              </button>

              <button
                type="button"
                onClick={() => setLightboxProduct(null)}
                className="w-10 h-10 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Photo Display Area */}
          {(() => {
            const allImgs = Array.from(
              new Set([
                lightboxProduct.imageUrl,
                ...(lightboxProduct.images || []),
              ].filter(Boolean) as string[])
            );
            const currentImg = allImgs[lightboxImageIndex] || allImgs[0] || '';

            return (
              <div className="relative my-auto w-full max-w-3xl h-[62vh] flex items-center justify-center">
                {allImgs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLightboxImageIndex((prev) => (prev > 0 ? prev - 1 : allImgs.length - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all z-20 cursor-pointer shadow-2xl active:scale-90"
                    title="Previous Photo"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                <div className="w-full h-full rounded-2xl overflow-hidden border border-stone-800/80 bg-stone-950/80 flex items-center justify-center p-2 shadow-2xl relative">
                  {currentImg ? (
                    <img
                      src={currentImg}
                      alt={lightboxProduct.name}
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-stone-600 text-sm">No image available</div>
                  )}

                  <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/80 text-stone-300 text-xs font-bold border border-white/10 shadow-lg">
                    Photo {lightboxImageIndex + 1} of {allImgs.length || 1}
                  </span>
                </div>

                {allImgs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLightboxImageIndex((prev) => (prev < allImgs.length - 1 ? prev + 1 : 0))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20 transition-all z-20 cursor-pointer shadow-2xl active:scale-90"
                    title="Next Photo"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </div>
            );
          })()}

          {/* Bottom Thumbnail Strip */}
          {(() => {
            const allImgs = Array.from(
              new Set([
                lightboxProduct.imageUrl,
                ...(lightboxProduct.images || []),
              ].filter(Boolean) as string[])
            );

            if (allImgs.length <= 1) return <div className="h-4" />;

            return (
              <div className="flex items-center gap-2.5 overflow-x-auto p-2 max-w-2xl bg-stone-950/80 border border-stone-800 rounded-2xl">
                {allImgs.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxImageIndex(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border transition-all shrink-0 cursor-pointer ${
                      lightboxImageIndex === idx
                        ? 'ring-2 ring-red-500 border-red-500 scale-105 shadow-md'
                        : 'border-stone-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt="Thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
