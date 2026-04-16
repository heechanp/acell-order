import React, { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { productsA } from "./productsA";
import { productsB } from "./productsB";

// 배포 전 설정값
// Vercel/로컬에서 실제 사용할 때 아래 두 값을 실제 값으로 바꿔주세요.
const SUPABASE_URL = "https://srbpphccmhbnugcqwcrn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_OzQ8qeUqYKQWSfZpUz8xEA_kriALOja";



const categoryOrder = [
  "고추류",
  "상추·엽채류",
  "호박류",
  "가지류",
  "토마토류",
  "오이류",
  "콩류",
  "옥수수류",
  "부추·파·양파류",
  "배추·양배추류",
  "허브·쌈채소",
  "참외·수박·멜론",
  "박류"
];

function isSupabaseConfigured() {
  return (
    SUPABASE_URL &&
    SUPABASE_PUBLISHABLE_KEY &&
    !SUPABASE_URL.includes("YOUR_SUPABASE_URL") &&
    !SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE_PUBLISHABLE_KEY")
  );
}

async function saveOrderToSupabase(payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: await response.text() };
    }

    const error = new Error(errorBody?.message || "주문 저장 실패");
    error.code = errorBody?.code;
    error.details = errorBody?.details;
    error.hint = errorBody?.hint;
    throw error;
  }

  return response.json();
}

async function fetchCustomers() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/customers?select=id,name,price_type,is_active&is_active=eq.true&order=id.asc`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: await response.text() };
    }

    const error = new Error(errorBody?.message || "거래처 목록 조회 실패");
    throw error;
  }

  return response.json();
}

async function fetchOrders() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?select=id,customer_id,customer_name,items,total_amount,memo,created_at&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: await response.text() };
    }

    const error = new Error(errorBody?.message || "주문 목록 조회 실패");
    throw error;
  }

  return response.json();
}

async function fetchPayments() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/payments?select=id,customer_id,amount,memo,created_at&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: await response.text() };
    }

    const error = new Error(errorBody?.message || "입금 목록 조회 실패");
    throw error;
  }

  return response.json();
}


async function savePaymentToSupabase(payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: await response.text() };
    }

    const error = new Error(errorBody?.message || "입금 저장 실패");
    throw error;
  }

  return response.json();
}

async function deletePaymentFromSupabase(paymentId) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/payments?id=eq.${paymentId}`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        Prefer: "return=representation"
      }
    }
  );

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: await response.text() };
    }

    const error = new Error(errorBody?.message || "입금 삭제 실패");
    throw error;
  }

  return response;
}

export default function SeedlingOrderWebApp() {

  const [receiptOrderPage, setReceiptOrderPage] = useState(1);
const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);

  const [orderViewCustomerId, setOrderViewCustomerId] = useState("");
const [orderPage, setOrderPage] = useState(1);
const [selectedOrder, setSelectedOrder] = useState(null);


const [paymentCustomerId, setPaymentCustomerId] = useState("");
const [paymentAmount, setPaymentAmount] = useState("");
const [paymentMemo, setPaymentMemo] = useState("");
const [isSavingPayment, setIsSavingPayment] = useState(false);

const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [developerPassword, setDeveloperPassword] = useState("");
const [isDeveloperUnlocked, setIsDeveloperUnlocked] = useState(false);

const [paymentPage, setPaymentPage] = useState(1);
const [selectedPayment, setSelectedPayment] = useState(null);

const [developerCustomerId, setDeveloperCustomerId] = useState("");

  const selectedCustomer = customers.find(
    (c) => String(c.id) === String(selectedCustomerId)
  );

  const DEV_CUSTOMER_NAME = "개발자 모드";
const DEV_PASSWORD = "2908";
const isDeveloperMode = selectedCustomer?.name === DEV_CUSTOMER_NAME;

  const customerType = selectedCustomer?.price_type || "A";
  const products = customerType === "A" ? productsA : productsB;

  

  useEffect(() => {
    async function loadCustomers() {
      try {
        if (!isSupabaseConfigured()) return;
        const data = await fetchCustomers();
        setCustomers(data);
      } catch (error) {
        console.error(error);
        alert("거래처 목록을 불러오지 못했습니다.");
      }
    }

    loadCustomers();
  }, []);

  useEffect(() => {
  setDeveloperPassword("");
  setIsDeveloperUnlocked(false);
}, [selectedCustomerId]);

  useEffect(() => {
  loadSummaryData();
}, []);

  const loadSummaryData = async () => {
  try {
    if (!isSupabaseConfigured()) return;

    const [ordersData, paymentsData] = await Promise.all([
      fetchOrders(),
      fetchPayments()
    ]);

    setOrders(ordersData);
    setPayments(paymentsData);
  } catch (error) {
    console.error(error);
    alert("주문/입금 데이터를 불러오지 못했습니다.");
  }
};

  const [openCategories, setOpenCategories] = useState({
    "고추류": false,
    "상추·엽채류": false,
    "호박류": false,
    "가지류": false,
    "토마토류": false,
    "오이류": false,
    "콩류": false,
    "옥수수류": false,
    "부추·파·양파류": false,
    "배추·양배추류": false,
    "허브·쌈채소": false,
    "참외·수박·멜론": false,
    "박류": false
  });



  const [quantities, setQuantities] = useState(
    products.reduce((acc, product) => {
      acc[product.id] = 0;
      return acc;
    }, {})
  );



  const [memo, setMemo] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const receiptRef = useRef(null);
  const [orders, setOrders] = useState([]);
const [payments, setPayments] = useState([]);
const [isDraftRestored, setIsDraftRestored] = useState(false);

  useEffect(() => {
  if (!selectedCustomer) return;
  if (!isDraftRestored) return;

  const savedDraft = localStorage.getItem("seedling-order-draft");

  if (savedDraft) {
    try {
      const parsed = JSON.parse(savedDraft);
      if (String(parsed.selectedCustomerId) === String(selectedCustomerId)) {
        return;
      }
    } catch {}
  }

  setQuantities(
    products.reduce((acc, product) => {
      acc[product.id] = 0;
      return acc;
    }, {})
  );
}, [selectedCustomerId, products, selectedCustomer, isDraftRestored]);


useEffect(() => {
  const savedDraft = localStorage.getItem("seedling-order-draft");
  if (!savedDraft) return;

  try {
    const parsed = JSON.parse(savedDraft);

    if (parsed.selectedCustomerId) {
      setSelectedCustomerId(parsed.selectedCustomerId);
    }

    if (parsed.memo) {
      setMemo(parsed.memo);
    }

    if (parsed.searchTerm) {
      setSearchTerm(parsed.searchTerm);
    }

    if (parsed.quantities) {
      setQuantities(parsed.quantities);
    }
  } catch (error) {
    console.error("임시저장 불러오기 실패:", error);
  }
  setIsDraftRestored(true);

}, []);
useEffect(() => {
  const draft = {
    selectedCustomerId,
    memo,
    searchTerm,
    quantities,
  };

  localStorage.setItem("seedling-order-draft", JSON.stringify(draft));
}, [selectedCustomerId, memo, searchTerm, quantities]);

useEffect(() => {
  if (submitted) {
    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }
}, [submitted]);

  const updateQty = (id, nextValue) => {
    const safeValue = Math.max(0, Number(nextValue) || 0);
    setQuantities((prev) => ({ ...prev, [id]: safeValue }));
  };

  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return products;

    return products.filter((product) =>
      product.name.toLowerCase().includes(keyword) ||
      product.category.toLowerCase().includes(keyword)
    );
  }, [searchTerm, products]);


const filteredOrdersForView = useMemo(() => {
  if (!developerCustomerId) return [];

  return orders
    .filter((order) => String(order.customer_id) === String(developerCustomerId))
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}, [orders, developerCustomerId]);


const ORDERS_PER_PAGE = 5;

const totalOrderPages = Math.max(
  1,
  Math.ceil(filteredOrdersForView.length / ORDERS_PER_PAGE)
);

const pagedOrders = useMemo(() => {
  const startIndex = (orderPage - 1) * ORDERS_PER_PAGE;
  return filteredOrdersForView.slice(startIndex, startIndex + ORDERS_PER_PAGE);
}, [filteredOrdersForView, orderPage]);


useEffect(() => {
  setOrderPage(1);
  setSelectedOrder(null);
  setPaymentPage(1);
  setSelectedPayment(null);
}, [developerCustomerId]);


  const productsByCategory = useMemo(() => {
    const groups = {};
    filteredProducts.forEach((product) => {
      if (!groups[product.category]) {
        groups[product.category] = [];
      }
      groups[product.category].push(product);
    });
    return groups;
  }, [filteredProducts]);

  const visibleCategories = useMemo(() => {
    const categories = Object.keys(productsByCategory);
    return categoryOrder.filter((category) => categories.includes(category));
  }, [productsByCategory]);

  const orderItems = useMemo(() => {
    return products
      .map((product) => {
        const quantity = quantities[product.id] || 0;
        return {
          ...product,
          quantity,
          amount: quantity * product.price
        };
      })
      .filter((item) => item.quantity > 0);
  }, [quantities, products]);

  const totalAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.amount, 0);
  }, [orderItems]);

  const selectedCustomerSummary = useMemo(() => {
  if (!selectedCustomer) {
    return {
      totalOrdered: 0,
      totalPaid: 0,
      balance: 0
    };
  }


  

  const totalOrdered = orders
    .filter((order) => order.customer_id === selectedCustomer.id)
    .reduce((sum, order) => sum + (order.total_amount || 0), 0);

  const totalPaid = payments
    .filter((payment) => payment.customer_id === selectedCustomer.id)
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);

  return {
    totalOrdered,
    totalPaid,
    balance: totalOrdered - totalPaid
  };
}, [selectedCustomer, orders, payments]);


const developerTargetCustomerId = developerCustomerId || "";

const developerCustomerSummary = useMemo(() => {
  if (!developerTargetCustomerId) {
    return {
      totalOrdered: 0,
      totalPaid: 0,
      balance: 0,
    };
  }

  const totalOrdered = orders
    .filter((order) => String(order.customer_id) === String(developerTargetCustomerId))
    .reduce((sum, order) => sum + (order.total_amount || 0), 0);

  const totalPaid = payments
    .filter((payment) => String(payment.customer_id) === String(developerTargetCustomerId))
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);

  return {
    totalOrdered,
    totalPaid,
    balance: totalOrdered - totalPaid,
  };
}, [developerTargetCustomerId, orders, payments]);

const RECEIPT_ORDERS_PER_PAGE = 5;

const recentOrdersForCustomer = useMemo(() => {
  if (!selectedCustomer) return [];

  return orders
    .filter((order) => String(order.customer_id) === String(selectedCustomer.id))
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}, [orders, selectedCustomer]);

const receiptTotalPages = Math.max(
  1,
  Math.ceil(recentOrdersForCustomer.length / RECEIPT_ORDERS_PER_PAGE)
);

const pagedReceiptOrders = useMemo(() => {
  const startIndex = (receiptOrderPage - 1) * RECEIPT_ORDERS_PER_PAGE;
  return recentOrdersForCustomer.slice(startIndex, startIndex + RECEIPT_ORDERS_PER_PAGE);
}, [recentOrdersForCustomer, receiptOrderPage]);



const recentPayments = useMemo(() => {
  if (!developerCustomerId) return [];

  return payments
    .filter((payment) => String(payment.customer_id) === String(developerCustomerId))
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
}, [payments, developerCustomerId]);

const PAYMENTS_PER_PAGE = 5;

const paymentTotalPages = Math.max(
  1,
  Math.ceil(recentPayments.length / PAYMENTS_PER_PAGE)
);

const pagedPayments = useMemo(() => {
  const startIndex = (paymentPage - 1) * PAYMENTS_PER_PAGE;
  return recentPayments.slice(startIndex, startIndex + PAYMENTS_PER_PAGE);
}, [recentPayments, paymentPage]);


useEffect(() => {
  setPaymentPage(1);
  setSelectedPayment(null);
}, [paymentCustomerId]);


const getCustomerNameById = (customerId) => {
  return customers.find((c) => c.id === customerId)?.name || `거래처 #${customerId}`;
};

  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const unlockDeveloperMode = () => {
  if (developerPassword === DEV_PASSWORD) {
    setIsDeveloperUnlocked(true);
  } else {
    alert("비밀번호가 올바르지 않습니다.");
  }
};

const handleSavePayment = async () => {
  if (!developerCustomerId) {
    alert("입금 거래처를 선택해주세요.");
    return;
  }

  const amount = Number(paymentAmount);
  if (!amount || amount <= 0) {
    alert("입금액을 올바르게 입력해주세요.");
    return;
  }

  try {
    setIsSavingPayment(true);

    await savePaymentToSupabase({
customer_id: Number(developerCustomerId),
      amount,
      memo: paymentMemo || null
    });

    setPaymentCustomerId("");
    setPaymentAmount("");
    setPaymentMemo("");
    await loadSummaryData();

    alert("입금이 저장되었습니다.");
  } catch (error) {
    console.error(error);
    alert("입금 저장에 실패했습니다.");
  } finally {
    setIsSavingPayment(false);
  }
};


const handleDeletePayment = async (paymentId) => {
  const ok = window.confirm("이 입금 내역을 삭제할까요?");
  if (!ok) return;

  try {
    setDeletingPaymentId(paymentId);

    await deletePaymentFromSupabase(paymentId);
    await loadSummaryData();

    alert("입금 내역이 삭제되었습니다.");
  } catch (error) {
    console.error(error);
    alert("입금 내역 삭제에 실패했습니다.");
  } finally {
    setDeletingPaymentId(null);
  }
};


const handleSubmit = async () => {
  if (!selectedCustomer) {
    alert("거래처를 선택해주세요.");
    return;
  }

  if (orderItems.length === 0) {
    alert("최소 1개 품목 이상 수량을 입력해주세요.");
    return;
  }

  setSaveError("");

  

setReceiptOrderPage(1);
setSelectedReceiptOrder(null);

localStorage.removeItem("seedling-order-draft");
  setIsSaving(true);
  


  const payload = {
    customer_id: selectedCustomer.id,
    customer_name: selectedCustomer.name,
    items: orderItems.map((item) => ({
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.price,
      amount: item.amount
    })),
    total_amount: totalAmount,
    memo: memo || null
  };

  try {
    if (isSupabaseConfigured()) {
      await saveOrderToSupabase(payload);
        await loadSummaryData();

    } else {
      console.log("[Demo mode] Supabase 미설정 상태입니다.", payload);
    }

    const now = new Date();
    const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    setSubmittedAt(formattedNow);
    setSubmitted(true);

    await fetch("/api/send-order-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  customerName: selectedCustomer.name,
  submittedAt: formattedNow,
  orderItems,
  totalAmount,
  totalQuantity,
}),
    });

    setSubmittedAt(formattedNow);
    setSubmitted(true);
  } catch (error) {
    console.error(error);

    if (error?.code === "42501") {
      setSaveError(
        "주문 저장 권한이 없습니다. Supabase에서 orders 테이블의 RLS INSERT 정책을 추가해주세요."
      );
    } else {
      setSaveError("주문 저장에 실패했습니다. Supabase 설정 또는 정책을 확인해주세요.");
    }
  } finally {
    setIsSaving(false);
  }
};

  const resetOrder = () => {
    setQuantities(
      products.reduce((acc, product) => {
        acc[product.id] = 0;
        return acc;
      }, {})
    );
    setMemo("");
    setSubmitted(false);
    setSearchTerm("");
    setSaveError("");
    setSubmittedAt("");   // 👈 이거 추가
localStorage.removeItem("seedling-order-draft");
  };

  const toggleCategory = (category) => {
    setOpenCategories((prev) => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const formatCurrency = (value) => `${value.toLocaleString()}원`;

const formatDateTime = (value) => {
  if (!value) return "-";

  let normalized = String(value).trim();

  // "2026-04-16 01:23:45" 처럼 T/Z 없는 경우
  // UTC 기준값으로 간주해서 파싱되도록 보정
  if (
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(normalized) &&
    !normalized.includes("T")
  ) {
    normalized = normalized.replace(" ", "T") + "Z";
  }

  // "2026-04-16T01:23:45" 처럼 Z 없는 경우도 UTC로 간주
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(normalized) &&
    !normalized.endsWith("Z") &&
    !/[+-]\d{2}:\d{2}$/.test(normalized)
  ) {
    normalized = normalized + "Z";
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return value;

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value || "";

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
};
  const downloadReceiptImage = async () => {
  if (!receiptRef.current) return;

  try {
    setIsDownloadingImage(true);

    const dataUrl = await toPng(receiptRef.current, {
      cacheBust: true,
      pixelRatio: 2,
    });

    const link = document.createElement("a");
    const safeCustomerName = (selectedCustomer?.name || "주문명세서").replace(/[\\/:*?"<>|]/g, "_");
    const fileDate = submittedAt
      ? submittedAt.replace(/[ :]/g, "-")
      : new Date().toISOString().slice(0, 16).replace("T", "-");

    link.download = `${safeCustomerName}-${fileDate}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error(error);
    alert("이미지 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
  } finally {
    setIsDownloadingImage(false);
  }
};

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-xl border border-slate-200 p-6">
          <div className="text-center">
            <div className="text-4xl mb-3">✅</div>
            <h1 className="text-2xl font-bold text-slate-900">주문이 접수되었습니다</h1>
            <p className="mt-2 text-slate-600 leading-relaxed">
              거래처 <span className="font-semibold text-slate-900">{selectedCustomer?.name}</span> 주문이 저장되었습니다.
              <br />담당자가 확인 후 연락드릴게요.
            </p>
            
            {submittedAt ? (
            <p className="mt-3 text-sm text-slate-500">주문일시: {submittedAt}</p>
            ) : null}
            {!isSupabaseConfigured() ? (
              <p className="mt-3 text-sm text-amber-600">
                현재는 데모 모드입니다. 실제 저장을 위해 Supabase URL/Key를 입력해주세요.
              </p>
            ) : null}
          </div>

          <div ref={receiptRef} className="mt-6 rounded-2xl bg-slate-50 p-4 pb-8 border border-slate-200">
  <div className="text-sm text-slate-500">주문 내역</div>
  {submittedAt ? (
    <div className="mt-1 text-sm text-slate-400">주문일시: {submittedAt}</div>
  ) : null}
            <div className="mt-3 space-y-2">
              {orderItems.map((item) => (
  <div key={item.id} className="flex items-start justify-between gap-4 text-base">
    <div className="text-slate-700">
      <div className="font-medium text-slate-900">{item.name}</div>
      <div className="mt-1 text-sm text-slate-500">
        {formatCurrency(item.price)} × {item.quantity}{item.unit}
      </div>
    </div>
    <span className="font-semibold text-slate-900 whitespace-nowrap">
      {formatCurrency(item.amount)}
    </span>
  </div>
))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
  <div className="flex items-center justify-between">
    <span className="text-base text-slate-600">총 판수</span>
    <span className="text-base font-semibold text-slate-900">{totalQuantity}판</span>
  </div>

  <div className="flex items-center justify-between">
    <span className="text-lg font-bold text-slate-900">총 주문금액</span>
    <span className="text-xl font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
  </div>
</div>

<div className="mt-4 pt-4 border-t border-slate-200">
  <div className="text-sm font-semibold text-slate-700 mb-2">거래처 정산 현황</div>

  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-base text-slate-600">누적 주문액</span>
      <span className="text-base font-semibold text-slate-900">
        {formatCurrency(selectedCustomerSummary.totalOrdered)}
      </span>
    </div>

    <div className="flex items-center justify-between">
      <span className="text-base text-slate-600">누적 입금액</span>
      <span className="text-base font-semibold text-slate-900">
        {formatCurrency(selectedCustomerSummary.totalPaid)}
      </span>
    </div>

    <div className="flex items-center justify-between">
      <span className="text-base font-bold text-slate-900">현재 미수금</span>
      <span className="text-lg font-bold text-slate-900">
        {formatCurrency(selectedCustomerSummary.balance)}
      </span>
    </div>
  </div>
</div>
            {memo ? (
              <div className="mt-4 rounded-xl bg-white p-3 border border-slate-200 text-sm text-slate-700">
                <div className="font-semibold mb-1">요청사항</div>
                <div>{memo}</div>
              </div>
            ) : null}
          </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
  <div className="text-sm font-semibold text-slate-700 mb-2">최근 주문 내역</div>

  {pagedReceiptOrders.length === 0 ? (
    <div className="text-sm text-slate-500">최근 주문 내역이 없습니다.</div>
  ) : (
    <>
      <div className="space-y-3">
        {pagedReceiptOrders.map((order) => {
          const itemCount = Array.isArray(order.items) ? order.items.length : 0;

          return (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelectedReceiptOrder(order)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">
                    {formatDateTime(order.created_at)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    품목 {itemCount}개
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold text-slate-900">
                    {formatCurrency(order.total_amount || 0)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setReceiptOrderPage((prev) => Math.max(1, prev - 1))}
          disabled={receiptOrderPage === 1}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
        >
          이전
        </button>

        <span className="text-sm text-slate-600">
          {receiptOrderPage} / {receiptTotalPages}
        </span>

        <button
          type="button"
          onClick={() => setReceiptOrderPage((prev) => Math.min(receiptTotalPages, prev + 1))}
          disabled={receiptOrderPage === receiptTotalPages}
          className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
        >
          다음
        </button>
      </div>
    </>
  )}
</div>

{selectedReceiptOrder ? (
  <div className="mt-4 rounded-2xl bg-white p-4 border border-slate-200">
    <div className="text-lg font-bold text-slate-900">선택한 주문 명세서</div>
    <div className="mt-2 text-sm text-slate-500">
      주문일시: {formatDateTime(selectedReceiptOrder.created_at)}
    </div>

    <div className="mt-4 space-y-2">
      {(selectedReceiptOrder.items || []).map((item, index) => (
        <div
          key={`${selectedReceiptOrder.id}-${index}`}
          className="flex items-start justify-between gap-4 text-base"
        >
          <div className="text-slate-700">
            <div className="font-medium text-slate-900">{item.name}</div>
            <div className="mt-1 text-sm text-slate-500">
              {formatCurrency(item.unit_price || 0)} × {item.quantity}{item.unit}
            </div>
          </div>

          <span className="font-semibold text-slate-900 whitespace-nowrap">
            {formatCurrency(item.amount || 0)}
          </span>
        </div>
      ))}
    </div>

    <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
  <div className="flex items-center justify-between">
    <span className="text-base text-slate-600">총 판수</span>
    <span className="text-base font-semibold text-slate-900">
      {(selectedReceiptOrder.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)}판
    </span>
  </div>

  <div className="flex items-center justify-between">
    <span className="text-lg font-bold text-slate-900">총 주문금액</span>
    <span className="text-xl font-bold text-slate-900">
      {formatCurrency(selectedReceiptOrder.total_amount || 0)}
    </span>
  </div>
</div>

    {selectedReceiptOrder.memo ? (
      <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-200 text-sm text-slate-700">
        <div className="font-semibold mb-1">요청사항</div>
        <div>{selectedReceiptOrder.memo}</div>
      </div>
    ) : null}
  </div>
) : null}

<button
  onClick={downloadReceiptImage}
  disabled={isDownloadingImage}
  className="mt-6 w-full rounded-2xl border border-slate-300 bg-white text-slate-900 py-4 text-lg font-semibold shadow-sm active:scale-[0.99] transition disabled:opacity-60"
>
  {isDownloadingImage ? "이미지 만드는 중..." : "이미지 저장"}
</button>
          <button
            onClick={resetOrder}
            className="mt-6 w-full rounded-2xl bg-slate-900 text-white py-4 text-lg font-semibold shadow-lg active:scale-[0.99] transition"
          >
            새로 주문하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto w-full max-w-md pb-72">
        <div className="backdrop-blur bg-slate-100/90 border-b border-slate-200 px-4 pt-4 pb-3">
          <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-5">
          <div className="text-sm text-slate-500">아셀모종 주문서</div>
<div className="mt-1 text-xs text-slate-500">
  입금계좌: 3333-16-2231854 카카오뱅크 박희찬
</div>
         <div className="mt-3">
  
  <div className="mt-3">
  <label className="mb-2 block text-sm font-medium text-slate-600">
    거래처 선택
  </label>

  <select
    value={selectedCustomerId}
    onChange={(e) => setSelectedCustomerId(e.target.value)}
    className="h-14 w-full rounded-2xl border border-slate-300 px-4 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
  >
    <option value="">거래처를 선택하세요</option>
    {customers.map((c) => (
      <option key={c.id} value={c.id}>
        {c.name}
      </option>
    ))}
  </select>
</div>

{selectedCustomer && isDeveloperMode ? (
  <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
    <div className="text-lg font-bold text-slate-900">거래처 요약</div>


{isDeveloperMode && !isDeveloperUnlocked ? (
  <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
    <div className="text-lg font-bold text-slate-900">개발자 모드</div>
    <p className="mt-2 text-sm text-slate-600">
      개발자 모드를 사용하려면 비밀번호를 입력해주세요.
    </p>

    <input
      type="password"
      value={developerPassword}
      onChange={(e) => setDeveloperPassword(e.target.value)}
      placeholder="비밀번호 입력"
      className="mt-3 h-14 w-full rounded-2xl border border-slate-300 px-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
    />

    <button
      onClick={unlockDeveloperMode}
      className="mt-3 w-full rounded-2xl bg-slate-900 py-4 text-base font-bold text-white shadow-lg active:scale-[0.99] transition"
    >
      확인
    </button>
  </div>
) : null}


{isDeveloperMode && isDeveloperUnlocked ? (
  <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 mt-4">
    <div className="text-lg font-bold text-slate-900">조회할 거래처 선택</div>
    <p className="mt-2 text-sm text-slate-600">
      거래처를 먼저 선택하면 입금 등록, 주문 내역, 정산 요약이 모두 해당 거래처 기준으로 표시됩니다.
    </p>

    <select
      value={developerCustomerId}
      onChange={(e) => setDeveloperCustomerId(e.target.value)}
      className="mt-3 h-14 w-full rounded-2xl border border-slate-300 px-4 text-base font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
    >
      <option value="">거래처를 선택하세요</option>
      {customers
        .map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
    </select>
  </div>
) : null}

{isDeveloperMode && isDeveloperUnlocked ? (
  <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
    <div className="text-lg font-bold text-slate-900">입금 등록</div>
    <p className="mt-2 text-sm text-slate-600">
  위에서 선택한 거래처로 입금을 등록합니다.
</p>


{developerCustomerId ? (
      <>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          placeholder="입금액 입력"
          className="mt-3 h-14 w-full rounded-2xl border border-slate-300 px-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
        />

        <textarea
          value={paymentMemo}
          onChange={(e) => setPaymentMemo(e.target.value)}
          placeholder="메모 (선택)"
          className="mt-3 min-h-[90px] w-full rounded-2xl border border-slate-300 p-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 resize-none"
        />

        <button
          onClick={handleSavePayment}
          disabled={isSavingPayment}
          className="mt-3 w-full rounded-2xl bg-slate-900 py-4 text-base font-bold text-white shadow-lg active:scale-[0.99] transition disabled:opacity-60"
        >
          {isSavingPayment ? "입금 저장 중..." : "입금 등록"}
        </button>
      </>
    ) : null}
  </div>
) : null}

{isDeveloperMode && isDeveloperUnlocked ? (
  <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 mt-4">
    <div className="text-lg font-bold text-slate-900">최근 입금 내역</div>

{selectedPayment ? (
  <div className="mt-4 rounded-2xl bg-white p-4 border border-slate-200">
    <div className="text-lg font-bold text-slate-900">선택한 입금 상세</div>

    <div className="mt-2 text-sm text-slate-500">
      입금일시: {formatDateTime(selectedPayment.created_at)}
    </div>

    <div className="mt-3 text-base text-slate-900 font-semibold">
      입금액: {formatCurrency(selectedPayment.amount)}
    </div>

    {selectedPayment.memo ? (
      <div className="mt-3 text-sm text-slate-600">
        메모: {selectedPayment.memo}
      </div>
    ) : null}

    <button
      onClick={() => handleDeletePayment(selectedPayment.id)}
      className="mt-4 w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600"
    >
      삭제
    </button>
  </div>
) : null}

    {isDeveloperMode && isDeveloperUnlocked && developerTargetCustomerId ? (
  <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 mt-4">
    <div className="text-lg font-bold text-slate-900">거래처 정산 요약</div>
    <p className="mt-2 text-sm text-slate-600">
      선택한 거래처의 누적 주문/입금 현황입니다.
    </p>

    <div className="mt-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-slate-600">누적 주문액</span>
        <span className="font-semibold text-slate-900">
          {formatCurrency(developerCustomerSummary.totalOrdered)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-slate-600">누적 입금액</span>
        <span className="font-semibold text-slate-900">
          {formatCurrency(developerCustomerSummary.totalPaid)}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-2">
        <span className="text-slate-900 font-bold">현재 미수금</span>
        <span className="text-lg font-bold text-slate-900">
          {formatCurrency(developerCustomerSummary.balance)}
        </span>
      </div>
    </div>
  </div>
) : null}


    {recentPayments.length === 0 ? (
      <p className="mt-2 text-sm text-slate-500">아직 등록된 입금 내역이 없습니다.</p>
    ) : (
      <div className="mt-3 space-y-3">
        {pagedPayments.length === 0 ? (
  <p className="mt-2 text-sm text-slate-500">아직 등록된 입금 내역이 없습니다.</p>
) : (
  <>
    <div className="mt-3 space-y-3">
      {pagedPayments.map((payment) => (
        <button
          key={payment.id}
          type="button"
          onClick={() => setSelectedPayment(payment)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {formatDateTime(payment.created_at)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {getCustomerNameById(payment.customer_id)}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-sm font-bold text-slate-900">
                {formatCurrency(payment.amount)}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>

    <div className="mt-4 flex items-center justify-between">
      <button
        type="button"
        onClick={() => setPaymentPage((prev) => Math.max(1, prev - 1))}
        disabled={paymentPage === 1}
        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
      >
        이전
      </button>

      <span className="text-sm text-slate-600">
        {paymentPage} / {paymentTotalPages}
      </span>

      <button
        type="button"
        onClick={() => setPaymentPage((prev) => Math.min(paymentTotalPages, prev + 1))}
        disabled={paymentPage === paymentTotalPages}
        className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
      >
        다음
      </button>
    </div>
  </>
)}
      </div>
    )}
  </div>
) : null}


{isDeveloperMode && isDeveloperUnlocked ? (
  <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 mt-4">
    <div className="text-lg font-bold text-slate-900">주문 내역 조회</div>
    <p className="mt-2 text-sm text-slate-600">
  위에서 선택한 거래처의 주문 내역을 최신순으로 표시합니다.
    </p>

    
  </div>
) : null}

{isDeveloperMode && isDeveloperUnlocked ? (
  <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 mt-4">
    <div className="text-lg font-bold text-slate-900">주문 내역 목록</div>

{!developerCustomerId ? (
      <p className="mt-2 text-sm text-slate-500">
    위에서 거래처를 선택하면 주문 내역이 표시됩니다.
      </p>
    ) : pagedOrders.length === 0 ? (
      <p className="mt-2 text-sm text-slate-500">
        선택한 거래처의 주문 내역이 없습니다.
      </p>
    ) : (
      <>
        <div className="mt-3 space-y-3">
          {pagedOrders.map((order) => {
            const itemCount = Array.isArray(order.items) ? order.items.length : 0;

            return (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrder(order)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {order.customer_name || getCustomerNameById(order.customer_id)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDateTime(order.created_at)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-slate-900">
                      {formatCurrency(order.total_amount || 0)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      품목 {itemCount}개
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setOrderPage((prev) => Math.max(1, prev - 1))}
            disabled={orderPage === 1}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
          >
            이전
          </button>

          <span className="text-sm text-slate-600">
            {orderPage} / {totalOrderPages}
          </span>

          <button
            type="button"
            onClick={() => setOrderPage((prev) => Math.min(totalOrderPages, prev + 1))}
            disabled={orderPage === totalOrderPages}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
          >
            다음
          </button>
        </div>
      </>
    )}
  </div>
) : null}

{isDeveloperMode && isDeveloperUnlocked && selectedOrder ? (
  <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 mt-4">
    <div className="text-lg font-bold text-slate-900">선택한 주문 명세서</div>
    <div className="mt-2 text-sm text-slate-500">
      주문일시: {formatDateTime(selectedOrder.created_at)}
    </div>

    <div className="mt-4 space-y-2">
      {(selectedOrder.items || []).map((item, index) => (
        <div
          key={`${selectedOrder.id}-${index}`}
          className="flex items-start justify-between gap-4 text-base"
        >
          <div className="text-slate-700">
            <div className="font-medium text-slate-900">{item.name}</div>
            <div className="mt-1 text-sm text-slate-500">
              {formatCurrency(item.unit_price || 0)} × {item.quantity}{item.unit}
            </div>
          </div>
          <span className="font-semibold text-slate-900 whitespace-nowrap">
            {formatCurrency(item.amount || 0)}
          </span>
        </div>
      ))}
    </div>


<div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
  <div className="flex items-center justify-between">
    <span className="text-base text-slate-600">총 판수</span>
    <span className="text-base font-semibold text-slate-900">
      {(selectedOrder.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)}판
    </span>
  </div>

  <div className="flex items-center justify-between">
    <span className="text-lg font-bold text-slate-900">총 주문금액</span>
    <span className="text-xl font-bold text-slate-900">
      {formatCurrency(selectedOrder.total_amount || 0)}
    </span>
  </div>
</div>


    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-slate-900">총 주문금액</span>
        <span className="text-xl font-bold text-slate-900">
          {formatCurrency(selectedOrder.total_amount || 0)}
        </span>
      </div>
    </div>

    {selectedOrder.memo ? (
      <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-200 text-sm text-slate-700">
        <div className="font-semibold mb-1">요청사항</div>
        <div>{selectedOrder.memo}</div>
      </div>
    ) : null}
  </div>
) : null}


  </div>
) : null}

</div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              원하시는 품목을 검색하거나 카테고리를 펼쳐 수량을 입력해주세요.
            </p>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
            <div className="text-lg font-bold text-slate-900">품목 검색</div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="예: 청오이, 청양고추, 상추"
              className="mt-3 h-14 w-full rounded-2xl border border-slate-300 px-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {visibleCategories.map((category) => {
            const items = productsByCategory[category] || [];
            const isOpen = openCategories[category] || searchTerm.trim().length > 0;

            return (
              <div key={category} className="rounded-[32px] bg-white border border-slate-200 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-6 py-7 text-left"
                >
                  <div className="text-2xl font-bold text-slate-900">{category}</div>
                  <div className="text-3xl leading-none text-slate-900">{isOpen ? "−" : "+"}</div>
                </button>

                {isOpen ? (
                  <div className="border-t border-slate-100 px-4 pb-4 space-y-3 bg-white">
                    {items.map((product) => {
                      const qty = quantities[product.id] || 0;
                      const amount = qty * product.price;

                      return (
                        <div
                          key={`${category}-${product.id}`}
                          className="mt-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xl font-bold text-slate-900">{product.name}</div>
                              <div className="mt-1 text-sm text-slate-500">
                                {formatCurrency(product.price)} / {product.unit}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400">금액</div>
                              <div className="text-lg font-bold text-slate-900">{formatCurrency(amount)}</div>
                            </div>
                          </div>

                          <div className="mt-4 flex min-w-0 items-center gap-2">
                            <button
                              onClick={() => updateQty(product.id, qty - 1)}
                              className="h-14 w-14 rounded-2xl border border-slate-300 bg-white text-2xl font-bold text-slate-800 active:scale-[0.98]"
                              aria-label={`${product.name} 수량 줄이기`}
                            >
                              -
                            </button>

                            <input
  type="number"
  min="0"
  inputMode="numeric"
  value={qty}
  onChange={(e) => updateQty(product.id, e.target.value)}
  className="h-14 min-w-0 flex-1 rounded-2xl border border-slate-300 text-center text-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
/>

                            <button
                              onClick={() => updateQty(product.id, qty + 1)}
                              className="h-12 w-12 shrink-0 rounded-2xl border border-slate-300 bg-white text-2xl font-bold text-slate-800 active:scale-[0.98]"
                              aria-label={`${product.name} 수량 늘리기`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
            <div className="text-lg font-bold text-slate-900">요청사항</div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 내일 오전 배송 부탁드립니다"
              className="mt-3 min-h-[110px] w-full rounded-2xl border border-slate-300 p-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>

          {saveError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {saveError}
            </div>
          ) : null}
        </div>

        
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
  <div className="mx-auto max-w-md px-4 py-4">
    {orderItems.length > 0 ? (
      <div className="mb-3 max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 text-sm font-semibold text-slate-700">선택한 품목</div>

        <div className="space-y-2">
          {orderItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">{item.name}</div>
                <div className="mt-1 text-slate-500">
                  {formatCurrency(item.price)} × {item.quantity}{item.unit}
                </div>
              </div>

              <div className="shrink-0 font-bold text-slate-900">
                {formatCurrency(item.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="mb-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
        아직 선택한 품목이 없습니다.
      </div>
    )}

    <div className="mb-3 flex items-center justify-between">
      <span className="text-base text-slate-600">총 주문금액</span>
      <span className="text-2xl font-bold text-slate-900">
        {formatCurrency(totalAmount)}
      </span>
    </div>

    <button
      onClick={handleSubmit}
      disabled={isSaving}
      className="w-full rounded-2xl bg-slate-900 py-4 text-lg font-bold text-white shadow-lg active:scale-[0.99] transition disabled:opacity-60"
    >
      {isSaving ? "저장 중..." : "주문하기"}
    </button>
  </div>
</div>


      </div>
    </div>
  );
}

// 간단 확인용 테스트 데이터

