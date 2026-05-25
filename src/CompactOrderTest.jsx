import React, { useMemo, useState } from "react";
import { productsA } from "./productsA";
import { productsB } from "./productsB";

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
  "박류",
];

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString()}원`;
}

export default function CompactOrderTest() {
  const [customerType, setCustomerType] = useState("A");
  const [searchTerm, setSearchTerm] = useState("");
  const [quantities, setQuantities] = useState({});
  const [memo, setMemo] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const products = customerType === "A" ? productsA : productsB;

  const updateQty = (id, nextValue) => {
    const safeValue = Math.max(0, Number(nextValue) || 0);
    setQuantities((prev) => ({
      ...prev,
      [id]: safeValue,
    }));
  };

  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const quantity = Number(quantities[product.id] || 0);

      if (showSelectedOnly && quantity <= 0) return false;

      if (!keyword) return true;

      return (
        String(product.name || "").toLowerCase().includes(keyword) ||
        String(product.category || "").toLowerCase().includes(keyword)
      );
    });
  }, [products, quantities, searchTerm, showSelectedOnly]);

  const productsByCategory = useMemo(() => {
    const groups = {};

    filteredProducts.forEach((product) => {
      const category = product.category || "미분류";
      if (!groups[category]) groups[category] = [];
      groups[category].push(product);
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
    return products
      .map((product) => {
        const quantity = Number(quantities[product.id] || 0);
        return {
          ...product,
          quantity,
          amount: quantity * Number(product.price || 0),
        };
      })
      .filter((item) => item.quantity > 0);
  }, [products, quantities]);

  const totalQuantity = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [orderItems]);

  const totalAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [orderItems]);

  const resetOrder = () => {
    setQuantities({});
    setMemo("");
    setSearchTerm("");
    setShowSelectedOnly(false);
  };

  const handleTestSubmit = () => {
    if (orderItems.length === 0) {
      alert("최소 1개 품목 이상 수량을 입력해주세요.");
      return;
    }

    console.log("테스트 주문 데이터", {
      customerType,
      items: orderItems,
      totalQuantity,
      totalAmount,
      memo,
    });

    alert(`테스트 주문 확인\n총 ${totalQuantity}개 / ${formatCurrency(totalAmount)}\n\n콘솔에서 주문 데이터를 확인할 수 있습니다.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto max-w-5xl space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-black leading-tight">주문 UI 테스트</h1>
              <p className="text-[11px] text-slate-500">한 줄 2품목 발주표 방식</p>
            </div>

            <select
              value={customerType}
              onChange={(e) => {
                setCustomerType(e.target.value);
                setQuantities({});
              }}
              className="h-8 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold"
            >
              <option value="A">단가 A</option>
              <option value="B">단가 B</option>
            </select>
          </div>

          <div className="flex gap-2">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="품목명 검색"
              className="h-9 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-900"
            />
            <button
              type="button"
              onClick={() => setShowSelectedOnly((prev) => !prev)}
              className={`h-9 shrink-0 rounded-xl px-3 text-xs font-black ${
                showSelectedOnly
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              선택만
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-2 py-3">
        {visibleCategories.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            표시할 품목이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleCategories.map((category) => {
              const categoryProducts = productsByCategory[category] || [];

              return (
                <section key={category} className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h2 className="text-sm font-black">{category}</h2>
                    <span className="text-[11px] font-bold text-slate-400">{categoryProducts.length}개</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
  {categoryProducts.map((product) => {
    const quantity = Number(quantities[product.id] || 0);
    const selected = quantity > 0;

    return (
      <div
        key={product.id}
        className={`flex h-9 items-center gap-1 rounded-lg border px-1 text-[9px] ${
          selected
            ? "border-slate-900 bg-slate-100"
            : "border-slate-200 bg-white"
        }`}
      >
        <div
  className="min-w-0 flex-1 font-black text-slate-900 whitespace-nowrap overflow-hidden"
  title={product.name}
>
  {product.name.length > 10
    ? `${product.name.slice(0, 10)}…`
    : product.name}
</div>

        <div className="shrink-0 text-[8px] font-bold text-slate-500">
          {(Number(product.price || 0) / 10000).toFixed(1)}
        </div>

        <div className="flex h-5 w-[42px] shrink-0 items-center overflow-hidden rounded border border-slate-300 bg-white">
          <button
            type="button"
            onClick={() => updateQty(product.id, quantity - 1)}
            className="h-5 w-3 text-[8px] font-black disabled:text-slate-300"
            disabled={quantity <= 0}
          >
            -
          </button>

          <input
            value={quantity}
            onChange={(e) => updateQty(product.id, e.target.value)}
            inputMode="numeric"
            className="h-5 w-4 border-x border-slate-200 text-center text-[9px] font-black outline-none"
          />

          <button
            type="button"
            onClick={() => updateQty(product.id, quantity + 1)}
            className="h-5 w-3 text-[8px] font-black"
          >
            +
          </button>
        </div>
      </div>
    );
  })}
</div>

                </section>
              );
            })}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="text-xs font-black text-slate-700">메모</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="요청사항을 입력하세요."
            className="mt-2 h-20 w-full resize-none rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-slate-900"
          />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-3 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-500">선택 {orderItems.length}품목</div>
            <div className="truncate text-sm font-black text-slate-900">
              총 {totalQuantity.toLocaleString()}개 / {formatCurrency(totalAmount)}
            </div>
          </div>

          <button
            type="button"
            onClick={resetOrder}
            className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700"
          >
            초기화
          </button>

          <button
            type="button"
            onClick={handleTestSubmit}
            className="h-11 rounded-2xl bg-slate-900 px-5 text-sm font-black text-white disabled:bg-slate-300"
            disabled={orderItems.length === 0}
          >
            주문 테스트
          </button>
        </div>
      </div>
    </div>
  );
}
