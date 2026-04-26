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

async function fetchOrderById(orderId) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}&select=id,order_number,customer_id,customer_name,items,total_amount,memo,created_at,is_edited,edited_at,edited_by,edit_reason,original_items,original_total_amount,original_memo,is_cancelled,cancelled_at,cancelled_by,cancel_reason,is_payment_confirmed,payment_confirmed_at,payment_confirmed_by,payment_confirm_note`,
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

    const error = new Error(errorBody?.message || "주문 상세 조회 실패");
    throw error;
  }

  const data = await response.json();
  return data?.[0] || null;
}

async function updateOrderInSupabase(orderId, payload) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`,
    {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.message || "주문 수정 실패");
    throw error;
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("주문이 수정되지 않았습니다. RLS UPDATE 정책을 확인해주세요.");
  }

  return data;
}

async function deleteOrderFromSupabase(orderId) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        Prefer: "return=representation",
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

    throw new Error(errorBody?.message || "주문 삭제 실패");
  }

  return response;
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

async function fetchProductStatuses() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/product_status?select=product_id,status,updated_at`,
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

    console.error("상품 상태 조회 실패 응답:", errorBody);

    const error = new Error(errorBody?.message || "상품 상태 조회 실패");
    throw error;
  }

  return response.json();
}


async function saveProductStatusToSupabase({ productId, status }) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/product_status?on_conflict=product_id`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        product_id: productId,
        status,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: await response.text() };
    }

    console.error("상품 상태 저장 실패 응답:", errorBody);

    const error = new Error(errorBody?.message || "상품 상태 저장 실패");
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
    `${SUPABASE_URL}/rest/v1/orders?select=id,order_number,customer_id,customer_name,items,total_amount,memo,created_at,is_edited,edited_at,edited_by,edit_reason,original_items,original_total_amount,original_memo,is_cancelled,cancelled_at,cancelled_by,cancel_reason,is_payment_confirmed,payment_confirmed_at,payment_confirmed_by,payment_confirm_note`,
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


function generateOrderNumber() {
  const now = new Date();

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `ORD-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function fetchPaymentsFromApi({ customerId, password }) {
  const query = customerId
    ? `?customerId=${encodeURIComponent(customerId)}`
    : "";

  const response = await fetch(`/api/payments/list${query}`, {
    method: "GET",
    headers: {
      "x-developer-password": password,
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || "입금 목록 조회 실패");
  }

  return data;
}

async function fetchPaymentSummary(customerId) {
  const query = customerId
    ? `?customerId=${encodeURIComponent(customerId)}`
    : "";

  const response = await fetch(`/api/payments/summary${query}`, {
    method: "GET",
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || "입금 합계 조회 실패");
  }

  return Number(data?.totalPaid || 0);
}

async function savePaymentToApi(payload, password) {
  const response = await fetch("/api/payments/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-developer-password": password,
    },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || "입금 저장 실패");
  }

  return data;
}

async function deletePaymentFromApi(paymentId, password) {
  const response = await fetch("/api/payments/delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-developer-password": password,
    },
    body: JSON.stringify({ paymentId }),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || "입금 삭제 실패");
  }

  return data;
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

const [productStatus, setProductStatus] = useState({});

const [isCancellingOrder, setIsCancellingOrder] = useState(false);
const [cancelReason, setCancelReason] = useState("");


const [isEditingOrder, setIsEditingOrder] = useState(false);

const [editItemSearchTerm, setEditItemSearchTerm] = useState("");

const [editingOrderItems, setEditingOrderItems] = useState([]);
const [editingOrderMemo, setEditingOrderMemo] = useState("");
const [editingReason, setEditingReason] = useState("");
const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
const [showOriginalOrder, setShowOriginalOrder] = useState(false);

const [manualCustomerName, setManualCustomerName] = useState("");

const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

const [showOverallCustomerBreakdown, setShowOverallCustomerBreakdown] = useState(false);

const [showOverallProductSummary, setShowOverallProductSummary] = useState(false);
const [openOverallProductCategories, setOpenOverallProductCategories] = useState({});



const [overallProductSearchTerm, setOverallProductSearchTerm] = useState("");

const [isOverallProductRankingView, setIsOverallProductRankingView] = useState(false);

const [showCustomerProductSummary, setShowCustomerProductSummary] = useState(false);
const [customerProductSearchTerm, setCustomerProductSearchTerm] = useState("");
const [openCustomerProductCategories, setOpenCustomerProductCategories] = useState({});
const [isCustomerProductRankingView, setIsCustomerProductRankingView] = useState(false);

const [receiptTotalPaid, setReceiptTotalPaid] = useState(0);
const [receiptTotalOrdered, setReceiptTotalOrdered] = useState(0);

const toggleCustomerProductCategory = (category) => {
  setOpenCustomerProductCategories((prev) => ({
    ...prev,
    [category]: !prev[category],
  }));
};

const toggleOverallProductCategory = (category) => {
  setOpenOverallProductCategories((prev) => ({
    ...prev,
    [category]: !prev[category],
  }));
};

const toggleProductStatus = async (productId) => {
  const key = String(productId);
  const currentStatus = productStatus[key] ?? "active";
  const nextStatus = currentStatus === "inactive" ? "active" : "inactive";

  try {
    await saveProductStatusToSupabase({
      productId,
      status: nextStatus,
    });

    setProductStatus((prev) => ({
      ...prev,
      [key]: nextStatus,
    }));

    if (nextStatus === "inactive") {
      setQuantities((prev) => ({
        ...prev,
        [productId]: 0,
      }));
    }
  } catch (error) {
    console.error(error);
    alert("상품 상태 저장에 실패했습니다.");
  }
};


const editingOrderSummary = useMemo(() => {
  const baseItems = isEditingOrder ? editingOrderItems : (selectedOrder?.items || []);

  const totalQty = baseItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalAmt = baseItems.reduce((sum, item) => {
    const amount = isEditingOrder
      ? Number(item.unit_price || 0) * Number(item.quantity || 0)
      : Number(item.amount || 0);

    return sum + amount;
  }, 0);

  return {
    totalQty,
    totalAmt,
  };
}, [isEditingOrder, editingOrderItems, selectedOrder]);

  const selectedCustomer = customers.find(
    (c) => String(c.id) === String(selectedCustomerId)
  );
const sortedCustomers = [...customers].sort((a, b) => {
  if (a.name === "비회원주문") return -1;
  if (b.name === "비회원주문") return 1;

  if (a.name === "개발자 모드") return 1;
  if (b.name === "개발자 모드") return -1;

  return 0;
});
  const DEV_CUSTOMER_NAME = "개발자 모드";

const isDeveloperMode = selectedCustomer?.name === DEV_CUSTOMER_NAME;

  const customerType = selectedCustomer?.price_type || "A";
  const products = customerType === "A" ? productsA : productsB;


const productsWithStatus = products.map((product) => ({
  ...product,
  status: productStatus[String(product.id)] ?? product.status ?? "active",
}));
  


const developerSelectedCustomer = customers.find(
  (c) => String(c.id) === String(developerCustomerId)
);

const editCustomerType = developerSelectedCustomer?.price_type || "A";

const editProducts = editCustomerType === "A" ? productsA : productsB;

const editProductsWithStatus = editProducts.map((product) => ({
  ...product,
  status: productStatus[String(product.id)] ?? product.status ?? "active",
}));

const editableProducts = useMemo(() => {
  return editProductsWithStatus.filter((product) => product.status !== "inactive");
}, [editProductsWithStatus]);


const filteredEditableProducts = useMemo(() => {
  const keyword = editItemSearchTerm.trim().toLowerCase();
  if (!keyword) return editableProducts;

  return editableProducts.filter((product) =>
    product.name.toLowerCase().includes(keyword) ||
    product.category.toLowerCase().includes(keyword)
  );
}, [editItemSearchTerm, editableProducts]);


const addItemToEditingOrder = (product) => {
  setEditingOrderItems((prev) => {
    const existingIndex = prev.findIndex(
      (item) => item.name === product.name && item.unit_price === product.price
    );

    if (existingIndex >= 0) {
      return prev.map((item, index) => {
        if (index !== existingIndex) return item;

        const nextQty = Number(item.quantity || 0) + 1;
        return {
          ...item,
          quantity: nextQty,
          amount: Number(item.unit_price || 0) * nextQty,
        };
      });
    }

    return [
      ...prev,
      {
        category: product.category,
        name: product.name,
        quantity: 1,
        unit: product.unit,
        unit_price: product.price,
        amount: product.price,
      },
    ];
  });

  setEditItemSearchTerm("");
};


useEffect(() => {
  async function loadProductStatuses() {
    try {
      const data = await fetchProductStatuses();
      console.log("불러온 상품 상태:", data);

      const mapped = {};
      data.forEach((row) => {
        mapped[String(row.product_id)] = row.status;
      });

      setProductStatus(mapped);
    } catch (error) {
      console.error(error);
      alert("상품 상태를 불러오지 못했습니다.");
    }
  }

  loadProductStatuses();
}, []);

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
      isDeveloperUnlocked && developerPassword
        ? fetchPaymentsFromApi({ password: developerPassword })
        : Promise.resolve([]),
    ]);

    setOrders(ordersData);
    setPayments(paymentsData);
  } catch (error) {
    console.error(error);
    alert("주문/입금 데이터를 불러오지 못했습니다.");
  }
};

useEffect(() => {
  if (!selectedOrder) {
    setIsEditingOrder(false);
    setEditingOrderItems([]);
    setEditingOrderMemo("");
    setEditingReason("");
    setShowOriginalOrder(false);
    return;
  }

  setEditingOrderItems(selectedOrder.items || []);
  setEditingOrderMemo(selectedOrder.memo || "");
  setEditingReason("");
  setShowOriginalOrder(false);

  setIsCancellingOrder(false);
setCancelReason("");

}, [selectedOrder]);


const updateEditingItemQuantity = (index, nextQuantity) => {
  const safeQty = Math.max(0, Number(nextQuantity) || 0);

  setEditingOrderItems((prev) =>
    prev.map((item, i) => {
      if (i !== index) return item;

      const unitPrice = Number(item.unit_price || 0);
      return {
        ...item,
        quantity: safeQty,
        amount: unitPrice * safeQty,
      };
    })
  );
};

const removeEditingItem = (index) => {
  setEditingOrderItems((prev) => prev.filter((_, i) => i !== index));
};

const startEditSelectedOrder = async () => {
  if (!selectedOrder) return;

  try {
    const latestOrder = await fetchOrderById(selectedOrder.id);
    if (!latestOrder) {
      alert("주문 정보를 찾을 수 없습니다.");
      return;
    }

    setSelectedOrder(latestOrder);
    setEditingOrderItems(latestOrder.items || []);
    setEditingOrderMemo(latestOrder.memo || "");
    setEditingReason("");
    setIsEditingOrder(true);
  } catch (error) {
    console.error(error);
    alert("주문 정보를 불러오지 못했습니다.");
  }
};

const cancelEditSelectedOrder = () => {
  if (!selectedOrder) return;

  setEditingOrderItems(selectedOrder.items || []);
  setEditingOrderMemo(selectedOrder.memo || "");
  setEditingReason("");
  setIsEditingOrder(false);
};

const handleUpdateSelectedOrder = async () => {
  if (!selectedOrder) return;

  const cleanedItems = (editingOrderItems || [])
    .map((item) => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const unitPrice = Math.max(0, Number(item.unit_price) || 0);

      return {
        ...item,
        quantity,
        unit_price: unitPrice,
        amount: quantity * unitPrice,
      };
    })
    .filter((item) => item.quantity > 0);

  if (cleanedItems.length === 0) {
    alert("최소 1개 품목 이상 남아 있어야 합니다.");
    return;
  }

  if (!editingReason.trim()) {
    alert("수정 사유를 입력해주세요.");
    return;
  }

  const nextTotalAmount = cleanedItems.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const ok = window.confirm("이 주문 내역을 수정할까요? 원본은 백업됩니다.");
  if (!ok) return;

  try {
    setIsUpdatingOrder(true);

    const latestOrder = await fetchOrderById(selectedOrder.id);
    if (!latestOrder) {
      alert("주문 정보를 찾을 수 없습니다.");
      return;
    }

    const patchPayload = {
      items: cleanedItems,
      total_amount: nextTotalAmount,
      memo: editingOrderMemo || null,
      is_edited: true,
      edited_at: new Date().toISOString(),
      edited_by: "developer",
      edit_reason: editingReason.trim(),
    };

    if (!latestOrder.is_edited) {
      patchPayload.original_items = latestOrder.items || [];
      patchPayload.original_total_amount = latestOrder.total_amount || 0;
      patchPayload.original_memo = latestOrder.memo || null;
    }

    await updateOrderInSupabase(selectedOrder.id, patchPayload);
    await loadSummaryData();

    const refreshedOrder = await fetchOrderById(selectedOrder.id);
    setSelectedOrder(refreshedOrder);

   try {
  const mailRes = await fetch("/api/send-order-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "updated",
      customerName: refreshedOrder.customer_name,
      submittedAt: formatDateTime(refreshedOrder.created_at),
      orderNumber: refreshedOrder.order_number,
      orderItems: refreshedOrder.items,
      totalAmount: refreshedOrder.total_amount,
      totalQuantity: (refreshedOrder.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ),
      memo: refreshedOrder.memo,
      editReason: refreshedOrder.edit_reason,
      editedAt: formatDateTime(refreshedOrder.edited_at),
    }),
  });

  // 🔥 여기 추가 (핵심)
  if (!mailRes.ok) {
    const errorText = await mailRes.text();
    console.error("메일 발송 실패:", errorText);
  }

} catch (mailError) {
  console.error("수정 메일 발송 실패:", mailError);
}

    setIsEditingOrder(false);
    setEditingReason("");

    alert("주문 내역이 수정되었습니다.");
  } catch (error) {
    console.error(error);
    alert("주문 수정에 실패했습니다.");
  } finally {
    setIsUpdatingOrder(false);
  }
};


const handleCancelSelectedOrder = async () => {
  if (!selectedOrder) return;

  if (selectedOrder.is_cancelled) {
    alert("이미 취소된 주문입니다.");
    return;
  }

  if (!cancelReason.trim()) {
    alert("취소 사유를 입력해주세요.");
    return;
  }

  const ok = window.confirm("이 주문을 취소하시겠습니까?");
  if (!ok) return;

  try {
    setIsSubmittingCancel(true);

    await updateOrderInSupabase(selectedOrder.id, {
      is_cancelled: true,
      cancelled_at: new Date().toISOString(),
      cancelled_by: "developer",
      cancel_reason: cancelReason.trim(),
    });

    await loadSummaryData();

    const refreshed = await fetchOrderById(selectedOrder.id);
    setSelectedOrder(refreshed);

    try {
  const mailRes = await fetch("/api/send-order-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "cancelled",
      customerName: refreshed.customer_name,
      submittedAt: formatDateTime(refreshed.created_at),
      orderNumber: refreshed.order_number,
      orderItems: refreshed.items,
      totalAmount: refreshed.total_amount,
      totalQuantity: (refreshed.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ),
      memo: refreshed.memo,
      cancelReason: refreshed.cancel_reason,
      cancelledAt: formatDateTime(refreshed.cancelled_at),
    }),
  });

  // 🔥 핵심
  if (!mailRes.ok) {
    const errorText = await mailRes.text();
    console.error("취소 메일 발송 실패:", errorText);
  }

} catch (mailError) {
  console.error("취소 메일 네트워크 에러:", mailError);
}

    setCancelReason("");

    alert("주문이 취소되었습니다.");
  } catch (error) {
    console.error(error);
    alert("주문 취소에 실패했습니다.");
  } finally {
  setIsSubmittingCancel(false);
  }
};


const handleDeleteSelectedOrder = async () => {
  if (!selectedOrder) return;

  if (!selectedOrder.is_cancelled) {
    alert("취소된 주문만 삭제할 수 있습니다.");
    return;
  }

  const ok = window.confirm(
    "이 주문을 완전히 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다."
  );
  if (!ok) return;

  try {
    await deleteOrderFromSupabase(selectedOrder.id);

    await loadSummaryData();

    setSelectedOrder(null);

    alert("주문이 완전히 삭제되었습니다.");
  } catch (error) {
    console.error(error);
    alert("주문 삭제에 실패했습니다.");
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

const [customItemName, setCustomItemName] = useState("");
const [customItemAmount, setCustomItemAmount] = useState("");
const [guestItemAmounts, setGuestItemAmounts] = useState({});
const isGuestOrder = selectedCustomer?.name === "비회원주문";

const isManualCustomerOrder = selectedCustomerId === "manual";


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
  if (!keyword) return productsWithStatus;

  return productsWithStatus.filter((product) =>
    product.name.toLowerCase().includes(keyword) ||
    product.category.toLowerCase().includes(keyword)
  );
}, [searchTerm, productsWithStatus]);


const filteredOrdersForView = useMemo(() => {
  if (!developerCustomerId) return [];

  return orders
    .filter((order) => {
      if (developerCustomerId === "manual") {
        return order.customer_id == null;
      }

      return String(order.customer_id) === String(developerCustomerId);
    })
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

    setShowCustomerProductSummary(false);
  setCustomerProductSearchTerm("");
  setOpenCustomerProductCategories({});
  setIsCustomerProductRankingView(false);

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

  const ordered = categoryOrder.filter((category) => categories.includes(category));
  const unordered = categories.filter((category) => !categoryOrder.includes(category));

  return [...ordered, ...unordered];
}, [productsByCategory]);

  const orderItems = useMemo(() => {
  return productsWithStatus
    .map((product) => {
        const quantity = quantities[product.id] || 0;
        return {
          ...product,
          quantity,
          amount: quantity * product.price
        };
      })
      .filter((item) => item.quantity > 0);
}, [quantities, productsWithStatus]);


  const totalAmount = useMemo(() => {
  if (isGuestOrder) {
    const guestProductsTotal = orderItems.reduce((sum, item) => {
      const guestUnitPrice = Number(guestItemAmounts[item.id] || 0);
      return sum + guestUnitPrice * Number(item.quantity || 0);
    }, 0);

    return guestProductsTotal + Number(customItemAmount || 0);
  }

  return orderItems.reduce((sum, item) => sum + item.amount, 0);
}, [orderItems, isGuestOrder, guestItemAmounts, customItemAmount]);

  const selectedCustomerSummary = useMemo(() => {
  if (isManualCustomerOrder) {
    const totalOrdered = orders
      .filter((order) => order.customer_id == null && !order.is_cancelled)
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    const totalPaid = payments
      .filter((payment) => payment.customer_id == null)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      totalOrdered,
      totalPaid,
      balance: totalOrdered - totalPaid,
    };
  }

  if (!selectedCustomer) {
    return {
      totalOrdered: 0,
      totalPaid: 0,
      balance: 0,
    };
  }

  const totalOrdered = orders
    .filter(
      (order) =>
        String(order.customer_id) === String(selectedCustomer.id) &&
        !order.is_cancelled
    )
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  const totalPaid = payments
    .filter(
      (payment) =>
        String(payment.customer_id) === String(selectedCustomer.id)
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  return {
    totalOrdered,
    totalPaid,
    balance: totalOrdered - totalPaid,
  };
}, [isManualCustomerOrder, selectedCustomer, orders, payments]);


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
    .filter((order) => {
      if (developerTargetCustomerId === "manual") {
        return order.customer_id == null && !order.is_cancelled;
      }

      return (
        String(order.customer_id) === String(developerTargetCustomerId) &&
        !order.is_cancelled
      );
    })
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  const totalPaid = payments
  .filter((payment) => {
    if (developerTargetCustomerId === "manual") {
      return payment.customer_id == null;
    }
    return String(payment.customer_id) === String(developerTargetCustomerId);
  })
  .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  return {
    totalOrdered,
    totalPaid,
    balance: totalOrdered - totalPaid,
  };
}, [developerTargetCustomerId, orders, payments]);



const developerModeCustomerIds = useMemo(() => {
  return customers
    .filter((c) => c.name === DEV_CUSTOMER_NAME)
    .map((c) => String(c.id));
}, [customers]);

const overallCustomerSummary = useMemo(() => {
  const totalOrdered = orders
    .filter((order) => {
      if (order.is_cancelled) return false;

      if (order.customer_name === DEV_CUSTOMER_NAME) return false;

      if (
        order.customer_id != null &&
        developerModeCustomerIds.includes(String(order.customer_id))
      ) {
        return false;
      }

      return true;
    })
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  const totalPaid = payments
    .filter((payment) => {
      if (
        payment.customer_id != null &&
        developerModeCustomerIds.includes(String(payment.customer_id))
      ) {
        return false;
      }

      return true;
    })
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  return {
    totalOrdered,
    totalPaid,
    balance: totalOrdered - totalPaid,
  };
}, [orders, payments, developerModeCustomerIds]);


const overallProductSummary = useMemo(() => {
  const productMap = new Map();

  orders.forEach((order) => {
    if (order.is_cancelled) return;
    if (order.customer_name === DEV_CUSTOMER_NAME) return;

    if (
      order.customer_id != null &&
      developerModeCustomerIds.includes(String(order.customer_id))
    ) {
      return;
    }

    (order.items || []).forEach((item) => {
      const itemName = String(item.name || "").trim();
      const itemCategory = String(item.category || "").trim() || "미분류";

      if (!itemName) return;
      if (itemName === "기타" || itemCategory === "기타") return;

      const key = itemName;

      if (!productMap.has(key)) {
        productMap.set(key, {
          key,
          name: itemName,
          category: itemCategory,
          totalQuantity: 0,
          totalAmount: 0,
          orderCount: 0,
        });
      }

      const current = productMap.get(key);
      current.totalQuantity += Number(item.quantity || 0);
      current.totalAmount += Number(item.amount || 0);
      current.orderCount += 1;
    });
  });

  const groupedMap = new Map();

  Array.from(productMap.values()).forEach((item) => {
    const category = item.category || "미분류";

    if (!groupedMap.has(category)) {
      groupedMap.set(category, []);
    }

    groupedMap.get(category).push(item);
  });

  return Array.from(groupedMap.entries())
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => b.totalAmount - a.totalAmount),
    }))
    .sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);

      if (aIndex === -1 && bIndex === -1) {
        return a.category.localeCompare(b.category, "ko");
      }
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
}, [orders, developerModeCustomerIds]);




const filteredOverallProductSummary = useMemo(() => {
  const keyword = overallProductSearchTerm.trim().toLowerCase();

  if (!keyword) return overallProductSummary;

  return overallProductSummary
    .map((group) => {
      const filteredItems = group.items.filter((item) =>
        item.name.toLowerCase().includes(keyword)
      );

      return {
        ...group,
        items: filteredItems,
      };
    })
    .filter((group) => group.items.length > 0);
}, [overallProductSummary, overallProductSearchTerm]);


const overallProductRanking = useMemo(() => {
  const keyword = overallProductSearchTerm.trim().toLowerCase();
  const productMap = new Map();

  orders.forEach((order) => {
    if (order.is_cancelled) return;
    if (order.customer_name === DEV_CUSTOMER_NAME) return;

    if (
      order.customer_id != null &&
      developerModeCustomerIds.includes(String(order.customer_id))
    ) {
      return;
    }

    (order.items || []).forEach((item) => {
      const itemName = String(item.name || "").trim();
      const itemCategory = String(item.category || "").trim() || "미분류";

      if (!itemName) return;
      if (itemName === "기타" || itemCategory === "기타") return;

      if (keyword && !itemName.toLowerCase().includes(keyword)) return;

      const key = itemName;

      if (!productMap.has(key)) {
        productMap.set(key, {
          key,
          name: itemName,
          category: itemCategory,
          totalQuantity: 0,
          totalAmount: 0,
          orderCount: 0,
        });
      }

      const current = productMap.get(key);
      current.totalQuantity += Number(item.quantity || 0);
      current.totalAmount += Number(item.amount || 0);
      current.orderCount += 1;
    });
  });

  return Array.from(productMap.values()).sort((a, b) => {
    if (b.totalQuantity !== a.totalQuantity) {
      return b.totalQuantity - a.totalQuantity;
    }

    return b.totalAmount - a.totalAmount;
  });
}, [orders, developerModeCustomerIds, overallProductSearchTerm]);



const customerProductSummary = useMemo(() => {
  const productMap = new Map();

  filteredOrdersForView.forEach((order) => {
    if (order.is_cancelled) return;

    (order.items || []).forEach((item) => {
      const itemName = String(item.name || "").trim();
      const itemCategory = String(item.category || "").trim() || "미분류";

      if (!itemName) return;
      if (itemName === "기타" || itemCategory === "기타") return;

      const key = itemName;

      if (!productMap.has(key)) {
        productMap.set(key, {
          key,
          name: itemName,
          category: itemCategory,
          totalQuantity: 0,
          totalAmount: 0,
          orderCount: 0,
        });
      }

      const current = productMap.get(key);
      current.totalQuantity += Number(item.quantity || 0);
      current.totalAmount += Number(item.amount || 0);
      current.orderCount += 1;
    });
  });

  const groupedMap = new Map();

  Array.from(productMap.values()).forEach((item) => {
    const category = item.category || "미분류";

    if (!groupedMap.has(category)) {
      groupedMap.set(category, []);
    }

    groupedMap.get(category).push(item);
  });

  return Array.from(groupedMap.entries())
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => b.totalQuantity - a.totalQuantity),
    }))
    .sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);

      if (aIndex === -1 && bIndex === -1) {
        return a.category.localeCompare(b.category, "ko");
      }
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
}, [filteredOrdersForView]);


const filteredCustomerProductSummary = useMemo(() => {
  const keyword = customerProductSearchTerm.trim().toLowerCase();

  if (!keyword) return customerProductSummary;

  return customerProductSummary
    .map((group) => {
      const filteredItems = group.items.filter((item) =>
        item.name.toLowerCase().includes(keyword)
      );

      return {
        ...group,
        items: filteredItems,
      };
    })
    .filter((group) => group.items.length > 0);
}, [customerProductSummary, customerProductSearchTerm]);



const customerProductRanking = useMemo(() => {
  const keyword = customerProductSearchTerm.trim().toLowerCase();
  const productMap = new Map();

  filteredOrdersForView.forEach((order) => {
    if (order.is_cancelled) return;

    (order.items || []).forEach((item) => {
      const itemName = String(item.name || "").trim();
      const itemCategory = String(item.category || "").trim() || "미분류";

      if (!itemName) return;
      if (itemName === "기타" || itemCategory === "기타") return;
      if (keyword && !itemName.toLowerCase().includes(keyword)) return;

      const key = itemName;

      if (!productMap.has(key)) {
        productMap.set(key, {
          key,
          name: itemName,
          category: itemCategory,
          totalQuantity: 0,
          totalAmount: 0,
          orderCount: 0,
        });
      }

      const current = productMap.get(key);
      current.totalQuantity += Number(item.quantity || 0);
      current.totalAmount += Number(item.amount || 0);
      current.orderCount += 1;
    });
  });

  return Array.from(productMap.values()).sort((a, b) => {
    if (b.totalQuantity !== a.totalQuantity) {
      return b.totalQuantity - a.totalQuantity;
    }

    return b.totalAmount - a.totalAmount;
  });
}, [filteredOrdersForView, customerProductSearchTerm]);



useEffect(() => {
  const keyword = customerProductSearchTerm.trim();

  if (!keyword) {
    setOpenCustomerProductCategories({});
    return;
  }

  const nextOpenState = {};
  filteredCustomerProductSummary.forEach((group) => {
    nextOpenState[group.category] = true;
  });

  setOpenCustomerProductCategories(nextOpenState);
}, [customerProductSearchTerm, filteredCustomerProductSummary]);


useEffect(() => {
  const keyword = overallProductSearchTerm.trim();

  if (!keyword) {
    setOpenOverallProductCategories({});
    return;
  }

  const nextOpenState = {};
  filteredOverallProductSummary.forEach((group) => {
    nextOpenState[group.category] = true;
  });

  setOpenOverallProductCategories(nextOpenState);
}, [overallProductSearchTerm, filteredOverallProductSummary]);

const overallCustomerBreakdown = useMemo(() => {
  const summaryMap = new Map();

  const devCustomerIds = new Set(
    customers
      .filter((c) => c.name === DEV_CUSTOMER_NAME)
      .map((c) => String(c.id))
  );

  const getGroupKey = (orderOrPayment) => {
  if (orderOrPayment.customer_id == null) {
    return "manual:거래처 수동 주문";
  }

  return `customer:${orderOrPayment.customer_id}`;
};

const getGroupLabel = (orderOrPayment) => {
  if (orderOrPayment.customer_id == null) {
    return "거래처 수동 주문";
  }

  const matched = customers.find(
    (c) => String(c.id) === String(orderOrPayment.customer_id)
  );
  return matched?.name || `거래처 #${orderOrPayment.customer_id}`;
};

  orders.forEach((order) => {
    if (order.is_cancelled) return;
    if (order.customer_name === DEV_CUSTOMER_NAME) return;
    if (order.customer_id != null && devCustomerIds.has(String(order.customer_id))) return;

    const key = getGroupKey(order);
    const label = getGroupLabel(order);

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        key,
        name: label,
        totalOrdered: 0,
        totalPaid: 0,
        balance: 0,
      });
    }

    summaryMap.get(key).totalOrdered += Number(order.total_amount || 0);
  });

  payments.forEach((payment) => {
    if (payment.customer_id != null && devCustomerIds.has(String(payment.customer_id))) return;

    const key =
      payment.customer_id == null
        ? "manual:거래처 수동 주문"
        : `customer:${payment.customer_id}`;

    const label =
      payment.customer_id == null
        ? "거래처 수동 주문"
        : customers.find((c) => String(c.id) === String(payment.customer_id))?.name ||
          `거래처 #${payment.customer_id}`;

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        key,
        name: label,
        totalOrdered: 0,
        totalPaid: 0,
        balance: 0,
      });
    }

    summaryMap.get(key).totalPaid += Number(payment.amount || 0);
  });

  return Array.from(summaryMap.values())
    .map((item) => ({
      ...item,
      balance: item.totalOrdered - item.totalPaid,
    }))
    .sort((a, b) => b.balance - a.balance);
}, [orders, payments, customers]);

const RECEIPT_ORDERS_PER_PAGE = 5;

const recentOrdersForCustomer = useMemo(() => {
  if (isManualCustomerOrder) {
    return orders
      .filter((order) => order.customer_id == null)
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  if (!selectedCustomer) return [];

  return orders
    .filter((order) => String(order.customer_id) === String(selectedCustomer.id))
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}, [orders, selectedCustomer, isManualCustomerOrder]);

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
    .filter((payment) => {
      if (developerCustomerId === "manual") {
        return payment.customer_id == null;
      }
      return String(payment.customer_id) === String(developerCustomerId);
    })
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

const paidOrderIdSet = useMemo(() => {
  const set = new Set();

  payments.forEach((payment) => {
    if (payment.order_id != null) {
      set.add(String(payment.order_id));
    }
  });

  return set;
}, [payments]);

useEffect(() => {
  setPaymentPage(1);
  setSelectedPayment(null);
}, [paymentCustomerId]);


const isSelectedOrderPaymentDone = useMemo(() => {
  if (!selectedOrder) return false;

  const paidByReceipt = paidOrderIdSet.has(String(selectedOrder.id));
  const manuallyConfirmed = !!selectedOrder.is_payment_confirmed;

  return paidByReceipt || manuallyConfirmed;
}, [selectedOrder, paidOrderIdSet]);

const getCustomerNameById = (customerId) => {
  if (customerId == null) return "거래처 수동 주문";
  return customers.find((c) => c.id === customerId)?.name || `거래처 #${customerId}`;
};

  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const unlockDeveloperMode = async () => {
  try {
    const res = await fetch("/api/developer-auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: developerPassword }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data?.message || "비밀번호가 올바르지 않습니다.");
      return;
    }

    setIsDeveloperUnlocked(true);
  } catch (error) {
    console.error(error);
    alert("개발자 인증 중 오류가 발생했습니다.");
  }
};
useEffect(() => {
  if (!isDeveloperUnlocked || !developerPassword) return;
  loadSummaryData();
}, [isDeveloperUnlocked, developerPassword]);

const createPaymentRecord = async ({
  customerId,
  amount,
  memo = null,
  orderId = null,
  orderNumber = null,
  paymentType = "manual",
}) => {
  if (!isDeveloperUnlocked || !developerPassword) {
    throw new Error("개발자 인증이 필요합니다.");
  }

  const saved = await savePaymentToApi(
    {
      customer_id: customerId === "manual" ? null : Number(customerId),
      amount: Number(amount),
      memo,
      order_id: orderId,
      order_number: orderNumber,
      payment_type: paymentType,
    },
    developerPassword
  );

  await loadSummaryData();
  return saved;
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

    await createPaymentRecord({
      customerId: developerCustomerId,
      amount,
      memo: paymentMemo || null,
      paymentType: "manual",
    });

    setPaymentAmount("");
    setPaymentMemo("");

    alert("입금이 저장되었습니다.");
  } catch (error) {
    console.error(error);
    alert("입금 저장에 실패했습니다.");
  } finally {
    setIsSavingPayment(false);
  }
};

const handleRegisterSelectedOrderPayment = async () => {
  if (!selectedOrder) {
    alert("주문 명세서를 먼저 선택해주세요.");
    return;
  }

  if (!developerCustomerId) {
    alert("거래처를 먼저 선택해주세요.");
    return;
  }

  if (selectedOrder.is_cancelled) {
    alert("취소된 주문은 입금 등록할 수 없습니다.");
    return;
  }

  if (developerCustomerId === "manual") {
    if (selectedOrder.customer_id != null) {
      alert("현재 선택한 거래처와 주문 거래처가 다릅니다.");
      return;
    }
  } else {
    if (String(selectedOrder.customer_id) !== String(developerCustomerId)) {
      alert("현재 선택한 거래처와 주문 거래처가 다릅니다.");
      return;
    }
  }

  const alreadyPaid = payments.some(
    (payment) =>
      payment.order_id != null &&
      String(payment.order_id) === String(selectedOrder.id)
  );

  if (alreadyPaid) {
    alert("이미 이 명세서로 등록된 입금 내역이 있습니다.");
    return;
  }

  const amount = Number(selectedOrder.total_amount || 0);
  if (!amount || amount <= 0) {
    alert("주문 금액이 올바르지 않습니다.");
    return;
  }

  const ok = window.confirm(
    `${selectedOrder.order_number || "선택한 명세서"} 금액 ${formatCurrency(amount)}을 입금 등록할까요?`
  );
  if (!ok) return;

  try {
    setIsSavingPayment(true);

    const saved = await createPaymentRecord({
      customerId: developerCustomerId,
      amount,
      memo: `명세서 입금${selectedOrder.order_number ? ` (${selectedOrder.order_number})` : ""}`,
      orderId: selectedOrder.id,
      orderNumber: selectedOrder.order_number || null,
      paymentType: "receipt",
    });

    if (Array.isArray(saved) && saved.length > 0) {
      setSelectedPayment(saved[0]);
    }

    alert("명세서 기준 입금이 등록되었습니다.");
  } catch (error) {
    console.error(error);
    alert("명세서 입금 등록에 실패했습니다.");
  } finally {
    setIsSavingPayment(false);
  }
};


const handleConfirmSelectedOrderPaidWithoutPayment = async () => {
  if (!selectedOrder) {
    alert("주문 명세서를 먼저 선택해주세요.");
    return;
  }

  if (!developerCustomerId) {
    alert("거래처를 먼저 선택해주세요.");
    return;
  }

  if (selectedOrder.is_cancelled) {
    alert("취소된 주문은 입금완료 처리할 수 없습니다.");
    return;
  }

  if (developerCustomerId === "manual") {
    if (selectedOrder.customer_id != null) {
      alert("현재 선택한 거래처와 주문 거래처가 다릅니다.");
      return;
    }
  } else {
    if (String(selectedOrder.customer_id) !== String(developerCustomerId)) {
      alert("현재 선택한 거래처와 주문 거래처가 다릅니다.");
      return;
    }
  }

  if (selectedOrder.is_payment_confirmed) {
    alert("이미 입금완료 처리된 명세서입니다.");
    return;
  }

  const alreadyPaidByReceipt = payments.some(
    (payment) =>
      payment.order_id != null &&
      String(payment.order_id) === String(selectedOrder.id)
  );

  if (alreadyPaidByReceipt) {
    alert("이미 이 명세서로 실제 입금 등록이 되어 있습니다.");
    return;
  }

  const ok = window.confirm(
    `${selectedOrder.order_number || "선택한 명세서"}를 입금 없이 입금완료 처리할까요?`
  );
  if (!ok) return;

  try {
    setIsSavingPayment(true);

    await updateOrderInSupabase(selectedOrder.id, {
      is_payment_confirmed: true,
      payment_confirmed_at: new Date().toISOString(),
      payment_confirmed_by: "developer",
      payment_confirm_note: "수동 입금 반영 후 상태만 완료 처리",
    });

    await loadSummaryData();

    const refreshedOrder = await fetchOrderById(selectedOrder.id);
    setSelectedOrder(refreshedOrder);

    alert("입금 없이 입금완료 처리되었습니다.");
  } catch (error) {
    console.error(error);
    alert("입금완료 처리에 실패했습니다.");
  } finally {
    setIsSavingPayment(false);
  }
};

const handleUnconfirmSelectedOrderPaid = async () => {
  if (!selectedOrder) return;

  const ok = window.confirm("이 명세서의 입금완료 처리를 해제할까요?");
  if (!ok) return;

  try {
    setIsSavingPayment(true);

    await updateOrderInSupabase(selectedOrder.id, {
      is_payment_confirmed: false,
      payment_confirmed_at: null,
      payment_confirmed_by: null,
      payment_confirm_note: null,
    });

    await loadSummaryData();

    const refreshedOrder = await fetchOrderById(selectedOrder.id);
    setSelectedOrder(refreshedOrder);

    alert("입금완료 처리가 해제되었습니다.");
  } catch (error) {
    console.error(error);
    alert("입금완료 해제에 실패했습니다.");
  } finally {
    setIsSavingPayment(false);
  }
};


const handleDeletePayment = async (paymentId) => {
  const ok = window.confirm("이 입금 내역을 삭제할까요?");
  if (!ok) return;

  try {
    if (!isDeveloperUnlocked || !developerPassword) {
      alert("개발자 인증이 필요합니다.");
      return;
    }

    setDeletingPaymentId(paymentId);

    await deletePaymentFromApi(paymentId, developerPassword);
    await loadSummaryData();

    alert("입금 내역이 삭제되었습니다.");
  } catch (error) {
    console.error(error);
    alert(error.message || "입금 내역 삭제에 실패했습니다.");
  } finally {
    setDeletingPaymentId(null);
  }
};


const handleSubmit = async () => {
if (!selectedCustomer && !isManualCustomerOrder) {
  alert("거래처를 선택해주세요.");
  return;
}

if (isManualCustomerOrder && !manualCustomerName.trim()) {
  alert("거래처 이름을 입력해주세요.");
  return;
}
  const hasGuestCustomAmount = isGuestOrder && Number(customItemAmount || 0) > 0;
const hasNormalOrderItems = orderItems.length > 0;

if (!hasNormalOrderItems && !hasGuestCustomAmount) {
  alert("최소 1개 품목 이상 수량을 입력해주세요.");
  return;
}

  setSaveError("");

  

setReceiptOrderPage(1);
setSelectedReceiptOrder(null);

localStorage.removeItem("seedling-order-draft");
  setIsSaving(true);
  
const orderNumber = generateOrderNumber();

  const payload = {
      order_number: orderNumber,

  customer_id: isManualCustomerOrder ? null : selectedCustomer.id,
customer_name: isManualCustomerOrder
  ? manualCustomerName.trim()
  : selectedCustomer.name,

  items: [
  ...orderItems.map((item) => {
    const guestAmount = Number(guestItemAmounts[item.id] || 0);

    return {
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: isGuestOrder ? guestAmount : item.price,
      amount: isGuestOrder ? guestAmount * item.quantity : item.amount
    };
  }),
  ...(isGuestOrder && Number(customItemAmount || 0) > 0
  ? [{
      category: "기타",
      name: customItemName || "기타",
      quantity: 0,
      unit: "건",
      unit_price: Number(customItemAmount),
      amount: Number(customItemAmount)
    }]
  : [])
],
  total_amount: totalAmount,
  memo: memo || null
};

  try {
  if (isSupabaseConfigured()) {
    const savedOrders = await saveOrderToSupabase(payload);
    await loadSummaryData();
    
    let nextReceiptPaid = 0;

try {
  const summaryCustomerId = isManualCustomerOrder
    ? "manual"
    : String(selectedCustomer.id);

  nextReceiptPaid = await fetchPaymentSummary(summaryCustomerId);
} catch (error) {
  console.error("주문완료 화면 입금 합계 조회 실패:", error);
}

    if (Array.isArray(savedOrders) && savedOrders.length > 0) {
      setSelectedReceiptOrder(savedOrders[0]);
    } else {
      setSelectedReceiptOrder({
        ...payload,
        created_at: new Date().toISOString(),
      });
    }
    setReceiptTotalPaid(nextReceiptPaid);

  } else {
      setReceiptTotalPaid(0);

    console.log("[Demo mode] Supabase 미설정 상태입니다.", payload);

    setSelectedReceiptOrder({
      ...payload,
      created_at: new Date().toISOString(),
    });
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
      type: "created",
  customerName: isManualCustomerOrder
  ? manualCustomerName.trim()
  : selectedCustomer.name,
  submittedAt: formattedNow,
  orderNumber: payload.order_number,
  orderItems: payload.items,
  totalAmount: payload.total_amount,
  totalQuantity: payload.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  ),
  memo: payload.memo,
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
  setSubmittedAt("");

  setCustomItemName("");
  setCustomItemAmount("");
  setGuestItemAmounts({});

  setManualCustomerName("");

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
              거래처 <span className="font-semibold text-slate-900">
                {isManualCustomerOrder ? manualCustomerName : selectedCustomer?.name}
                </span> 주문이 저장되었습니다.
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

   <div className="mt-1 text-sm text-slate-400">
    주문번호: {selectedReceiptOrder?.order_number || "-"}
  </div>
  {submittedAt ? (

    <div className="mt-1 text-sm text-slate-400">주문일시: {submittedAt}</div>
  ) : null}
            <div className="mt-3 space-y-2">
              {orderItems.map((item) => {
  const guestAmount = Number(guestItemAmounts[item.id] || 0);

  return (
    <div key={item.id} className="flex items-start justify-between gap-4 text-base">
      <div className="text-slate-700">
        <div className="font-medium text-slate-900">{item.name}</div>
        <div className="mt-1 text-sm text-slate-500">
          {isGuestOrder
  ? `${formatCurrency(guestAmount)} × ${item.quantity}${item.unit}`
  : `${formatCurrency(item.price)} × ${item.quantity}${item.unit}`}
        </div>
      </div>

      <span className="font-semibold text-slate-900 whitespace-nowrap">
  {isGuestOrder
    ? formatCurrency(guestAmount * item.quantity)
    : formatCurrency(item.amount)}
</span>
    </div>
  );
})}

{isGuestOrder && customItemAmount ? (
  <div className="flex items-start justify-between gap-4 text-base">
    <div className="text-slate-700">
      <div className="font-medium text-slate-900">{customItemName || "기타"}</div>
      <div className="mt-1 text-sm text-slate-500">기타</div>
    </div>

    <span className="font-semibold text-slate-900 whitespace-nowrap">
      {formatCurrency(Number(customItemAmount))}
    </span>
  </div>
) : null}

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


            {memo ? (

              
              <div className="mt-4 rounded-xl bg-white p-3 border border-slate-200 text-sm text-slate-700">
                <div className="font-semibold mb-1">요청사항</div>
                <div>{memo}</div>
              </div>
            ) : null}
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
{formatCurrency(receiptTotalPaid)}
      </span>
    </div>

    <div className="flex items-center justify-between">
      <span className="text-base font-bold text-slate-900">현재 미수금</span>
      <span className="text-lg font-bold text-slate-900">
        {formatCurrency(selectedCustomerSummary.totalOrdered - receiptTotalPaid)}
      </span>
    </div>
  </div>
</div>

      <div className="mt-4 pt-4 border-t border-slate-200">
  <div className="text-sm font-semibold text-slate-700 mb-2">최근 주문 내역</div>

  {pagedReceiptOrders.length === 0 ? (
    <div className="text-sm text-slate-500">최근 주문 내역이 없습니다.</div>
  ) : (
    <>
      <div className="space-y-3">
        {pagedReceiptOrders.map((order) => {
          const totalQty = Array.isArray(order.items)
            ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
            : 0;

          return (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelectedReceiptOrder(order)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
  <div className="flex items-center gap-2 flex-wrap">
    <div className="text-sm font-semibold text-slate-900">
      {formatDateTime(order.created_at)}
    </div>

    {order.is_cancelled ? (
      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
        취소됨
      </span>
    ) : null}

    {(paidOrderIdSet.has(String(order.id)) || order.is_payment_confirmed) ? (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
        입금완료
      </span>
    ) : null}
  </div>

  <div className="mt-1 text-xs text-slate-500">
    총판수 {totalQty}판
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

{/* 🔴 여기 추가 */}
{selectedReceiptOrder?.is_cancelled ? (
  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
    <div className="font-semibold">취소된 주문입니다.</div>
    <div className="mt-1">
      취소일시: {formatDateTime(selectedReceiptOrder.cancelled_at)}
    </div>
    {selectedReceiptOrder.cancel_reason ? (
      <div className="mt-1">사유: {selectedReceiptOrder.cancel_reason}</div>
    ) : null}
  </div>
) : null}

{selectedReceiptOrder?.is_edited ? (
  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
    <div className="font-semibold">수정된 주문입니다.</div>
    <div className="mt-1">최종 수정일시: {formatDateTime(selectedReceiptOrder.edited_at)}</div>
    {selectedReceiptOrder.edit_reason ? (
      <div className="mt-1">수정 사유: {selectedReceiptOrder.edit_reason}</div>
    ) : null}
  </div>
) : null}

<div className="mt-2 text-sm text-slate-500">
  주문번호: {selectedReceiptOrder.order_number || "-"}
</div>

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

  {/* 1️⃣ 비회원 먼저 */}
  {sortedCustomers
    .filter((c) => c.name?.includes("비회원주문"))
    .map((c) => (
      <option key={c.id} value={c.id}>
        {c.name}
      </option>
    ))}

  {/* 2️⃣ 수동 주문 */}
  <option value="manual">거래처 수동주문</option>

  {/* 3️⃣ 나머지 */}
  {sortedCustomers
    .filter((c) => !c.name?.includes("비회원주문"))
    .map((c) => (
      <option key={c.id} value={c.id}>
        {c.name}
      </option>
    ))}
</select>
</div>

{isManualCustomerOrder ? (
  <div className="mt-3">
    <label className="mb-2 block text-sm font-medium text-slate-600">
      거래처 이름
    </label>
    <input
      type="text"
      value={manualCustomerName}
      onChange={(e) => setManualCustomerName(e.target.value)}
      placeholder="거래처 이름을 입력하세요"
      className="h-14 w-full rounded-2xl border border-slate-300 px-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
    />
  </div>
) : null}

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
  <option value="manual">거래처 수동 주문</option>
  {sortedCustomers.map((c) => (
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

    <div className="mt-2 text-sm text-slate-600">
  입금방식: {selectedPayment.payment_type === "receipt" ? "명세서 입금" : "수동 입금"}
</div>

{selectedPayment.order_number ? (
  <div className="mt-1 text-sm text-slate-600">
    연결 명세서: {selectedPayment.order_number}
  </div>
) : null}

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


{isDeveloperMode && isDeveloperUnlocked ? (
  <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 mt-4">
    <div className="text-lg font-bold text-slate-900">전체 거래처 정산 요약</div>
    <p className="mt-2 text-sm text-slate-600">
      개발자 모드를 제외한 전체 거래처의 누적 주문/입금 현황입니다.
    </p>

    <div className="mt-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-slate-600">누적 주문액</span>
        <span className="font-semibold text-slate-900">
          {formatCurrency(overallCustomerSummary.totalOrdered)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-slate-600">누적 입금액</span>
        <span className="font-semibold text-slate-900">
          {formatCurrency(overallCustomerSummary.totalPaid)}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-2">
        <span className="text-slate-900 font-bold">현재 미수금</span>
        <span className="text-lg font-bold text-slate-900">
          {formatCurrency(overallCustomerSummary.balance)}
        </span>
      </div>
    </div>

<button
  type="button"
  onClick={() => setShowOverallCustomerBreakdown((prev) => !prev)}
  className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
>
  {showOverallCustomerBreakdown ? "거래처별 상세 닫기" : "거래처별 상세 보기"}
</button>

{showOverallCustomerBreakdown ? (
  <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
    {overallCustomerBreakdown.length === 0 ? (
      <div className="text-sm text-slate-500">표시할 거래처 정산 내역이 없습니다.</div>
    ) : (
      overallCustomerBreakdown.map((item) => (
        <div
          key={item.key}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="text-sm font-bold text-slate-900">{item.name}</div>

          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">누적 주문액</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(item.totalOrdered)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">누적 입금액</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(item.totalPaid)}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-900">미수금</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(item.balance)}
              </span>
            </div>
          </div>
        </div>
      ))
    )}
  </div>
) : null}

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
              <div className="mt-1 text-xs text-slate-500">
  {payment.payment_type === "receipt"
    ? `명세서 입금${payment.order_number ? ` · ${payment.order_number}` : ""}`
    : "수동 입금"}
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
    <div className="text-lg font-bold text-slate-900">전체 거래처 품목 집계</div>
    <p className="mt-2 text-sm text-slate-600">
      개발자 모드를 제외한 전체 거래처 기준 품목별 총 판수와 총 판매금액입니다.
    </p>

    <button
      type="button"
      onClick={() => setShowOverallProductSummary((prev) => !prev)}
      className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
    >
      {showOverallProductSummary ? "품목별 집계 닫기" : "품목별 집계 보기"}
    </button>

    {showOverallProductSummary ? (
  <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
    <input
      type="text"
      value={overallProductSearchTerm}
      onChange={(e) => setOverallProductSearchTerm(e.target.value)}
      placeholder="품목명을 검색하세요"
      className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
    />

    <button
      type="button"
      onClick={() => setIsOverallProductRankingView((prev) => !prev)}
      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold border ${
        isOverallProductRankingView
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-900 border-slate-300"
      }`}
    >
      {isOverallProductRankingView ? "카테고리 보기로 돌아가기" : "전체 판매순 보기"}
    </button>

    {isOverallProductRankingView ? (
      overallProductRanking.length === 0 ? (
        <div className="text-sm text-slate-500">
          검색 결과가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {overallProductRanking.map((item, index) => (
            <div
              key={item.key}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-500">
                    {index + 1}위
                  </div>
                  <div className="mt-1 text-base font-bold text-slate-900">
                    {item.name}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {item.category}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    주문 반영 {item.orderCount}건
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs text-slate-500">총 판수</div>
                  <div className="text-base font-semibold text-slate-900">
                    {item.totalQuantity}판
                  </div>

                  <div className="mt-2 text-xs text-slate-500">총 금액</div>
                  <div className="text-base font-bold text-slate-900">
                    {formatCurrency(item.totalAmount)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    ) : filteredOverallProductSummary.length === 0 ? (
      <div className="text-sm text-slate-500">
        검색 결과가 없습니다.
      </div>
    ) : (
      filteredOverallProductSummary.map((group) => {
        const isOpen = !!openOverallProductCategories[group.category];

        return (
          <div
            key={group.category}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <button
              type="button"
              onClick={() => toggleOverallProductCategory(group.category)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div className="text-base font-bold text-slate-900">
                {group.category}
              </div>

              <div className="shrink-0 text-sm font-semibold text-slate-500">
                {isOpen ? "접기" : "펼치기"}
              </div>
            </button>

            {isOpen ? (
              <div className="mt-3 space-y-3">
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {item.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          주문 반영 {item.orderCount}건
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-xs text-slate-500">총 판수</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {item.totalQuantity}판
                        </div>

                        <div className="mt-1 text-xs text-slate-500">총 금액</div>
                        <div className="text-sm font-bold text-slate-900">
                          {formatCurrency(item.totalAmount)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })
    )}
  </div>
) : null}
  </div>
) : null}


{isDeveloperMode && isDeveloperUnlocked && developerCustomerId ? (
  <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 mt-4">
    <div className="text-lg font-bold text-slate-900">선택 거래처 품목 집계</div>
    <p className="mt-2 text-sm text-slate-600">
      현재 선택한 거래처 기준 품목별 총 판수와 총 판매금액입니다.
    </p>

    <button
      type="button"
      onClick={() => setShowCustomerProductSummary((prev) => !prev)}
      className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
    >
      {showCustomerProductSummary ? "거래처 품목 집계 닫기" : "거래처 품목 집계 보기"}
    </button>

    {showCustomerProductSummary ? (
      <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
        <input
          type="text"
          value={customerProductSearchTerm}
          onChange={(e) => setCustomerProductSearchTerm(e.target.value)}
          placeholder="품목명을 검색하세요"
          className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
        />

        <button
          type="button"
          onClick={() => setIsCustomerProductRankingView((prev) => !prev)}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold border ${
            isCustomerProductRankingView
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-900 border-slate-300"
          }`}
        >
          {isCustomerProductRankingView ? "카테고리 보기로 돌아가기" : "전체 판매순 보기"}
        </button>

        {isCustomerProductRankingView ? (
          customerProductRanking.length === 0 ? (
            <div className="text-sm text-slate-500">
              검색 결과가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {customerProductRanking.map((item, index) => (
                <div
                  key={item.key}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-500">
                        {index + 1}위
                      </div>
                      <div className="mt-1 text-base font-bold text-slate-900">
                        {item.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {item.category}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        주문 반영 {item.orderCount}건
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xs text-slate-500">총 판수</div>
                      <div className="text-base font-semibold text-slate-900">
                        {item.totalQuantity}판
                      </div>

                      <div className="mt-2 text-xs text-slate-500">총 금액</div>
                      <div className="text-base font-bold text-slate-900">
                        {formatCurrency(item.totalAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredCustomerProductSummary.length === 0 ? (
          <div className="text-sm text-slate-500">
            검색 결과가 없습니다.
          </div>
        ) : (
          filteredCustomerProductSummary.map((group) => {
            const isOpen = !!openCustomerProductCategories[group.category];

            return (
              <div
                key={group.category}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <button
                  type="button"
                  onClick={() => toggleCustomerProductCategory(group.category)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="text-base font-bold text-slate-900">
                    {group.category}
                  </div>

                  <div className="shrink-0 text-sm font-semibold text-slate-500">
                    {isOpen ? "접기" : "펼치기"}
                  </div>
                </button>

                {isOpen ? (
                  <div className="mt-3 space-y-3">
                    {group.items.map((item) => (
                      <div
                        key={item.key}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">
                              {item.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              주문 반영 {item.orderCount}건
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-xs text-slate-500">총 판수</div>
                            <div className="text-sm font-semibold text-slate-900">
                              {item.totalQuantity}판
                            </div>

                            <div className="mt-1 text-xs text-slate-500">총 금액</div>
                            <div className="text-sm font-bold text-slate-900">
                              {formatCurrency(item.totalAmount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    ) : null}
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
  const totalQty = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    : 0;

  return (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrder(order)}
                className={`w-full rounded-2xl border p-4 text-left shadow-sm transition
  ${
    order.is_cancelled
      ? "border-red-200 bg-red-50 opacity-60"
      : paidOrderIdSet.has(String(order.id))
      ? "border-emerald-200 bg-emerald-50"
      : "border-slate-200 bg-slate-50"
  }
`}
              >
                <div className="flex items-center justify-between gap-3">
                  
<div className="min-w-0">
  <div className="flex items-center gap-2 flex-wrap">
    <div className="text-sm font-semibold text-slate-900">
      {order.customer_name || getCustomerNameById(order.customer_id)}
    </div>

    {order.is_cancelled ? (
      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
        취소됨
      </span>
    ) : null}

    {(paidOrderIdSet.has(String(order.id)) || order.is_payment_confirmed) ? (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
        입금완료
      </span>
    ) : null}
  </div>

  <div className="mt-1 text-xs text-slate-500">
    주문번호: {order.order_number || "-"}
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
  총판수 {totalQty}판
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

{selectedOrder?.is_edited ? (
  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
    <div className="font-semibold">수정된 주문입니다.</div>
    <div className="mt-1">최종 수정일시: {formatDateTime(selectedOrder.edited_at)}</div>
    {selectedOrder.edit_reason ? (
      <div className="mt-1">수정 사유: {selectedOrder.edit_reason}</div>
    ) : null}
  </div>
) : null}



<div className="mt-2 text-sm text-slate-500">
  주문번호: {selectedOrder.order_number || "-"}
</div>

    <div className="mt-2 text-sm text-slate-500">
      주문일시: {formatDateTime(selectedOrder.created_at)}
    </div>

    {isSelectedOrderPaymentDone ? (
  <div className="mt-1 text-xs font-semibold text-emerald-600">
    ✔ 입금완료
  </div>
) : null}

    {payments.some(
  (payment) =>
    payment.order_id != null &&
    String(payment.order_id) === String(selectedOrder.id)
) ? (
  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
    이미 이 명세서로 실제 입금 등록된 내역이 있습니다.
  </div>
) : null}

{selectedOrder?.is_payment_confirmed ? (
  <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
    이 명세서는 입금 생성 없이 입금완료 처리되었습니다.
    {selectedOrder.payment_confirmed_at ? (
      <div className="mt-1">
        처리일시: {formatDateTime(selectedOrder.payment_confirmed_at)}
      </div>
    ) : null}
  </div>
) : null}

{!selectedOrder?.is_cancelled ? (
  <div className="mt-3 space-y-2">
    <button
      type="button"
      onClick={handleRegisterSelectedOrderPayment}
      disabled={isSavingPayment || isSelectedOrderPaymentDone}
      className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg active:scale-[0.99] transition disabled:opacity-60"
    >
      {isSavingPayment ? "처리 중..." : "이 명세서 금액으로 입금 등록"}
    </button>

    {!selectedOrder?.is_payment_confirmed && !paidOrderIdSet.has(String(selectedOrder.id)) ? (
      <button
        type="button"
        onClick={handleConfirmSelectedOrderPaidWithoutPayment}
        disabled={isSavingPayment}
        className="w-full rounded-2xl border border-blue-300 bg-blue-50 py-3 text-sm font-bold text-blue-700 active:scale-[0.99] transition disabled:opacity-60"
      >
        {isSavingPayment ? "처리 중..." : "입금 없이 입금완료 처리"}
      </button>
    ) : null}

    {selectedOrder?.is_payment_confirmed ? (
      <button
        type="button"
        onClick={handleUnconfirmSelectedOrderPaid}
        disabled={isSavingPayment}
        className="w-full rounded-2xl border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 active:scale-[0.99] transition disabled:opacity-60"
      >
        {isSavingPayment ? "처리 중..." : "입금완료 처리 해제"}
      </button>
    ) : null}
  </div>
) : null}

{!isEditingOrder && !selectedOrder?.is_cancelled ? (
  
  <div className="mt-3 flex gap-2">
    <button
      type="button"
      onClick={startEditSelectedOrder}
      className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
    >
      수정하기
    </button>

    <button
      type="button"
      onClick={() => setIsCancellingOrder(true)}
      className="flex-1 rounded-2xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600"
    >
      주문취소
    </button>
  </div>
) : null}

{selectedOrder?.is_cancelled ? (
  <div className="mt-3">
    <button
      type="button"
      onClick={handleDeleteSelectedOrder}
      className="w-full rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-600"
    >
      완전 삭제
    </button>
  </div>
) : null}

{isCancellingOrder ? (
  <div className="mt-4 space-y-3">
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-700">취소 사유</div>
      <textarea
        value={cancelReason}
        onChange={(e) => setCancelReason(e.target.value)}
        placeholder="예: 거래처 요청으로 주문 취소"
        className="min-h-[90px] w-full rounded-2xl border border-slate-300 p-4 text-base outline-none focus:ring-2 focus:ring-slate-300 resize-none"
      />
    </div>

    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => {
          setIsCancellingOrder(false);
          setCancelReason("");
        }}
        className="flex-1 rounded-2xl border border-slate-300 py-3 font-bold"
      >
        취소
      </button>

      <button
  type="button"
  onClick={handleCancelSelectedOrder}
  disabled={isSubmittingCancel}
  className="flex-1 rounded-2xl bg-red-600 text-white py-3 font-bold disabled:opacity-60"
>
  {isSubmittingCancel ? "취소 처리 중..." : "취소 확정"}
</button>
    </div>
  </div>
) : null}

    <div className="mt-4 space-y-3">
  {(isEditingOrder ? editingOrderItems : selectedOrder.items || []).map((item, index) => (
    <div
      key={`${selectedOrder.id}-${index}`}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
    >
      {!isEditingOrder ? (
        <div className="flex items-start justify-between gap-4 text-base">
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
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-slate-900">{item.name}</div>
              <div className="mt-1 text-sm text-slate-500">
                단가 {formatCurrency(item.unit_price || 0)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeEditingItem(index)}
              className="rounded-xl border border-red-200 bg-white px-3 py-1 text-xs font-bold text-red-600"
            >
              삭제
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateEditingItemQuantity(index, Number(item.quantity || 0) - 1)}
              className="h-12 w-12 rounded-2xl border border-slate-300 bg-white text-xl font-bold text-slate-800"
            >
              -
            </button>

            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={item.quantity}
              onChange={(e) => updateEditingItemQuantity(index, e.target.value)}
              className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-300 text-center text-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
            />

            <button
              type="button"
              onClick={() => updateEditingItemQuantity(index, Number(item.quantity || 0) + 1)}
              className="h-12 w-12 rounded-2xl border border-slate-300 bg-white text-xl font-bold text-slate-800"
            >
              +
            </button>
          </div>

          <div className="mt-2 text-right text-sm font-semibold text-slate-900">
            금액: {formatCurrency((Number(item.unit_price || 0) * Number(item.quantity || 0)))}
          </div>
        </>
      )}
    </div>
  ))}
</div>


<div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
  <div className="flex items-center justify-between">
    <span className="text-base text-slate-600">총 판수</span>
    <span className="text-base font-semibold text-slate-900">
      {editingOrderSummary.totalQty}판
    </span>
  </div>

  <div className="flex items-center justify-between">
    <span className="text-lg font-bold text-slate-900">총 주문금액</span>
    <span className="text-xl font-bold text-slate-900">
      {formatCurrency(editingOrderSummary.totalAmt)}
    </span>
  </div>
</div>

    {selectedOrder.memo ? (
      <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-200 text-sm text-slate-700">
        <div className="font-semibold mb-1">요청사항</div>
        <div>{selectedOrder.memo}</div>
      </div>
    ) : null}


{isEditingOrder ? (
  <div className="mt-4 space-y-3">

    <div>
  <div className="mb-2 text-sm font-semibold text-slate-700">품목 추가</div>

  <input
    type="text"
    value={editItemSearchTerm}
    onChange={(e) => setEditItemSearchTerm(e.target.value)}
    placeholder="추가할 품목 검색"
    className="h-12 w-full rounded-2xl border border-slate-300 px-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
  />

  {editItemSearchTerm.trim() ? (
    <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
      {filteredEditableProducts.length === 0 ? (
        <div className="p-4 text-sm text-slate-500">검색 결과가 없습니다.</div>
      ) : (
        filteredEditableProducts.slice(0, 50).map((product) => (
          <button
            key={`edit-add-${product.id}`}
            type="button"
            onClick={() => addItemToEditingOrder(product)}
            className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-b-0"
          >
            <div>
              <div className="font-medium text-slate-900">{product.name}</div>
              <div className="mt-1 text-sm text-slate-500">
                {formatCurrency(product.price)} / {product.unit}
              </div>
            </div>

            <div className="text-sm font-semibold text-slate-700">
              추가
            </div>
          </button>
        ))
      )}
    </div>
  ) : null}
</div>

    <div>
      <div className="mb-2 text-sm font-semibold text-slate-700">요청사항 수정</div>
      <textarea
        value={editingOrderMemo}
        onChange={(e) => setEditingOrderMemo(e.target.value)}
        placeholder="요청사항 입력"
        className="min-h-[90px] w-full rounded-2xl border border-slate-300 p-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 resize-none"
      />
    </div>

    <div>
      <div className="mb-2 text-sm font-semibold text-slate-700">수정 사유</div>
      <textarea
        value={editingReason}
        onChange={(e) => setEditingReason(e.target.value)}
        placeholder="예: 거래처 요청으로 수량 정정"
        className="min-h-[90px] w-full rounded-2xl border border-slate-300 p-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 resize-none"
      />
    </div>

    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={cancelEditSelectedOrder}
        className="flex-1 rounded-2xl border border-slate-300 bg-white py-3 text-base font-bold text-slate-900"
      >
        취소
      </button>

      <button
        type="button"
        onClick={handleUpdateSelectedOrder}
        disabled={isUpdatingOrder}
        className="flex-1 rounded-2xl bg-slate-900 py-3 text-base font-bold text-white disabled:opacity-60"
      >
        {isUpdatingOrder ? "저장 중..." : "수정 저장"}
      </button>
    </div>
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
  const isInactive = product.status === "inactive";

                      return (
                        <div
                          key={`${category}-${product.id}`}
                          className="mt-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
  <div>
    <div className="text-xl font-bold text-slate-900">{product.name}</div>
    <div className="mt-1 text-sm text-slate-500">
  {isGuestOrder ? product.unit : `${formatCurrency(product.price)} / ${product.unit}`}
</div>

    

    {isInactive ? (
      <div className="mt-2 text-xs font-medium text-amber-600">
        현재 준비중입니다. 조금만 기다려주세요 🙏
      </div>
    ) : null}

    {isDeveloperMode && isDeveloperUnlocked ? (
      <button
        type="button"
        onClick={() => toggleProductStatus(product.id)}
        className="mt-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
      >
        {isInactive ? "활성으로 변경" : "비활성으로 변경"}
      </button>
    ) : null}
  </div>

  <div className="text-right">
  <div className="text-xs text-slate-400">금액</div>

  {isGuestOrder ? (
    <input
      type="number"
      min="0"
      inputMode="numeric"
      value={guestItemAmounts[product.id] || ""}
      onChange={(e) =>
        setGuestItemAmounts((prev) => ({
          ...prev,
          [product.id]: e.target.value,
        }))
      }
      placeholder="금액 입력"
      className="mt-1 h-10 w-28 rounded-xl border border-slate-300 px-3 text-right text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
    />
  ) : (
    <div className="text-lg font-bold text-slate-900">
      {formatCurrency(amount)}
    </div>
  )}
</div>
</div>

                       <div className="mt-4 flex min-w-0 items-center gap-2">
  <button
    type="button"
    disabled={isInactive}
    onClick={() => updateQty(product.id, qty - 1)}
    className="h-14 w-14 rounded-2xl border border-slate-300 bg-white text-2xl font-bold text-slate-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
    aria-label={`${product.name} 수량 줄이기`}
  >
    -
  </button>

  <input
    type="number"
    min="0"
    inputMode="numeric"
    value={qty}
    disabled={isInactive}
    onChange={(e) => updateQty(product.id, e.target.value)}
    className="h-14 min-w-0 flex-1 rounded-2xl border border-slate-300 text-center text-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
  />

  <button
    type="button"
    disabled={isInactive}
    onClick={() => updateQty(product.id, qty + 1)}
    className="h-12 w-12 shrink-0 rounded-2xl border border-slate-300 bg-white text-2xl font-bold text-slate-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
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

{isGuestOrder ? (
  <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4">
    <div className="text-lg font-bold text-slate-900">기타 직접 입력</div>

    <input
      type="text"
      value={customItemName}
      onChange={(e) => setCustomItemName(e.target.value)}
      placeholder="예: 치마상추 15포기"
      className="mt-3 h-14 w-full rounded-2xl border border-slate-300 px-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
    />

    <input
      type="number"
      min="0"
      inputMode="numeric"
      value={customItemAmount}
      onChange={(e) => setCustomItemAmount(e.target.value)}
      placeholder="금액 직접 입력"
      className="mt-3 h-14 w-full rounded-2xl border border-slate-300 px-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
    />
  </div>
) : null}

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
      <div className="mb-3 max-h-50 overflow-y-auto custom-scrollbar rounded-2xl border border-slate-200 bg-slate-50 p-3">
        
        <div className="mb-2 text-sm font-semibold text-slate-700">선택한 품목
  <span className="ml-2 text-xs text-slate-400">(스크롤 가능)</span>


        </div>

    <div className="space-y-2">
  {orderItems.map((item) => {
    const guestAmount = Number(guestItemAmounts[item.id] || 0);

    return (
      <div
        key={item.id}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-slate-900">
              {item.name}
            </div>

            <div className="mt-0.5 text-xs text-slate-500">
              {isGuestOrder
                ? `${formatCurrency(guestAmount)} × ${item.quantity}${item.unit}`
                : `${formatCurrency(item.price)} × ${item.quantity}${item.unit}`}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <div className="min-w-[72px] text-right text-[15px] font-bold text-slate-900">
              {isGuestOrder
                ? formatCurrency(guestAmount * item.quantity)
                : formatCurrency(item.amount)}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateQty(item.id, Number(item.quantity || 0) - 1)}
                className="h-7 w-7 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-800"
              >
                -
              </button>

              <div className="min-w-[16px] text-center text-sm font-bold text-slate-900">
                {item.quantity}
              </div>

              <button
                type="button"
                onClick={() => updateQty(item.id, Number(item.quantity || 0) + 1)}
                className="h-7 w-7 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-800"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  })}

</div>

      </div>
    ) : (
      <div className="mb-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
        아직 선택한 품목이 없습니다.
      </div>
    )}

    <div className="mb-3 flex items-center justify-between">
  <span className="text-base text-slate-600">
    총 주문금액
    <span className="ml-1 text-sm text-slate-500">
      ({(orderItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0)}판)
    </span>
  </span>

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

