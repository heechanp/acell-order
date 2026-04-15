import React, { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { products } from "./products";

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

export default function SeedlingOrderWebApp() {
  const [customerName, setCustomerName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
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
  }, [searchTerm]);

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
  }, [quantities]);

  const totalAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.amount, 0);
  }, [orderItems]);
  const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmit = async () => {
    if (!customerName.trim()) {
  alert("거래처 이름을 입력해주세요.");
  return;
}

    if (orderItems.length === 0) {
      alert("최소 1개 품목 이상 수량을 입력해주세요.");
      return;
    }

    setSaveError("");
    setIsSaving(true);

    const payload = {
      customer_name: customerName,
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
    customerName,
    submittedAt: formattedNow,
    orderItems,
    totalAmount,
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

  };

  const toggleCategory = (category) => {
    setOpenCategories((prev) => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const formatCurrency = (value) => `${value.toLocaleString()}원`;
  const downloadReceiptImage = async () => {
  if (!receiptRef.current) return;

  try {
    setIsDownloadingImage(true);

    const dataUrl = await toPng(receiptRef.current, {
      cacheBust: true,
      pixelRatio: 2,
    });

    const link = document.createElement("a");
    const safeCustomerName = (customerName || "주문명세서").replace(/[\\/:*?"<>|]/g, "_");
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
              거래처 <span className="font-semibold text-slate-900">{customerName}</span> 주문이 저장되었습니다.
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
            {memo ? (
              <div className="mt-4 rounded-xl bg-white p-3 border border-slate-200 text-sm text-slate-700">
                <div className="font-semibold mb-1">요청사항</div>
                <div>{memo}</div>
              </div>
            ) : null}
          </div>
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
      <div className="mx-auto w-full max-w-md pb-36">
        <div className="backdrop-blur bg-slate-100/90 border-b border-slate-200 px-4 pt-4 pb-3">
          <div className="rounded-3xl bg-white shadow-sm border border-slate-200 p-5">
            <div className="text-sm text-slate-500">아셀모종 주문서</div>
            <div className="mt-3">
  <label className="mb-2 block text-sm font-medium text-slate-600">
    거래처 이름
  </label>
  <input
    type="text"
    value={customerName}
    onChange={(e) => setCustomerName(e.target.value)}
    placeholder="예: 아셀상회, 아셀종묘 등"
    className="h-14 w-full rounded-2xl border border-slate-300 px-4 text-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
  />
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
            <div className="mb-3 flex items-center justify-between">
              <span className="text-base text-slate-600">총 주문금액</span>
              <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
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
export const __demoTests = {
  totalExample: products
    .filter((p) => [1, 30].includes(p.id))
    .map((p) => ({ ...p, quantity: p.id === 1 ? 2 : 1, amount: (p.id === 1 ? 2 : 1) * p.price })),
  categoryCount: categoryOrder.length,
  hasBeetInHerb: products.some((p) => p.category === "허브·쌈채소" && p.name === "비트"),
  hasSusemiInBak: products.some((p) => p.category === "박류" && p.name === "수세미"),
  detectsSupabaseConfigured: isSupabaseConfigured(),
  hasOrderTableEndpoint: `${SUPABASE_URL}/rest/v1/orders`.includes("/rest/v1/orders")
};
