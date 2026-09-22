export interface BaseReceiptItem {
  qty: number;
  unitPrice: number;
  subtotal: number;
  isReturned?: boolean;
}

/**
 * Menyesuaikan harga satuan (unitPrice) dan subtotal item pada struk/faktur
 * sehingga biaya tambahan (additionalFee) langsung masuk ke harga jual dan tidak terlihat terpisah.
 */
export function adjustReceiptItems<T extends BaseReceiptItem>(
  items: T[],
  additionalFee: number = 0
): { adjustedItems: T[]; adjustedSubtotal: number } {
  const safeFee = Math.max(0, Math.round(Number(additionalFee) || 0));

  const originalSubtotal = items.reduce(
    (sum, it) => sum + (Number(it.subtotal) || 0),
    0
  );

  if (safeFee === 0 || !items || items.length === 0) {
    return { adjustedItems: items, adjustedSubtotal: originalSubtotal };
  }

  // Jika hanya ada 1 barang dalam transaksi (kasus terbesar penjualan HP)
  if (items.length === 1) {
    const item = items[0];
    const qty = Math.max(1, Number(item.qty) || 1);
    const newSubtotal = (Number(item.subtotal) || 0) + safeFee;
    const newUnitPrice = qty === 1 ? newSubtotal : Math.round(newSubtotal / qty);

    return {
      adjustedItems: [
        {
          ...item,
          unitPrice: newUnitPrice,
          subtotal: newSubtotal,
        },
      ],
      adjustedSubtotal: newSubtotal,
    };
  }

  // Jika ada lebih dari 1 barang, utamakan barang yang tidak direfund
  const activeIndices = items
    .map((it, idx) => (!it.isReturned ? idx : -1))
    .filter((idx) => idx !== -1);

  const targetIndices =
    activeIndices.length > 0 ? activeIndices : items.map((_, idx) => idx);

  const targetSubtotal = targetIndices.reduce(
    (sum, idx) => sum + (Number(items[idx].subtotal) || 0),
    0
  );

  let allocatedTotal = 0;
  const itemFeeMap = new Map<number, number>();

  targetIndices.forEach((targetIdx, i) => {
    if (i === targetIndices.length - 1) {
      // Barang terakhir mendapatkan sisa pembulatan agar total fee 100% pas
      const remaining = safeFee - allocatedTotal;
      itemFeeMap.set(targetIdx, remaining);
      allocatedTotal += remaining;
    } else {
      const itemSub = Number(items[targetIdx].subtotal) || 0;
      const ratio =
        targetSubtotal > 0
          ? itemSub / targetSubtotal
          : 1 / targetIndices.length;
      const feePortion = Math.round(ratio * safeFee);
      itemFeeMap.set(targetIdx, feePortion);
      allocatedTotal += feePortion;
    }
  });

  const adjustedItems = items.map((item, idx) => {
    const fee = itemFeeMap.get(idx) || 0;
    if (fee === 0) return item;

    const newSubtotal = (Number(item.subtotal) || 0) + fee;
    const qty = Math.max(1, Number(item.qty) || 1);
    const newUnitPrice = qty === 1 ? newSubtotal : Math.round(newSubtotal / qty);

    return {
      ...item,
      unitPrice: newUnitPrice,
      subtotal: newSubtotal,
    };
  });

  return {
    adjustedItems,
    adjustedSubtotal: originalSubtotal + safeFee,
  };
}

/**
 * Menyesuaikan item keranjang kasir POS untuk struk transaksi.
 */
export function adjustPosReceiptItems<
  T extends { product: { sellingPrice: number; [key: string]: any }; qty: number }
>(
  items: T[],
  additionalFee: number = 0
): {
  adjustedItems: Array<
    T & {
      unitPrice: number;
      subtotal: number;
    }
  >;
  adjustedSubtotal: number;
} {
  const safeFee = Math.max(0, Math.round(Number(additionalFee) || 0));

  const normalizedItems = items.map((item) => {
    const unitPrice = Number(item.product.sellingPrice) || 0;
    const qty = Math.max(1, Number(item.qty) || 1);
    const subtotal = unitPrice * qty;
    return {
      ...item,
      unitPrice,
      subtotal,
    };
  });

  const originalSubtotal = normalizedItems.reduce(
    (sum, it) => sum + it.subtotal,
    0
  );

  if (safeFee === 0 || !items || items.length === 0) {
    return {
      adjustedItems: normalizedItems,
      adjustedSubtotal: originalSubtotal,
    };
  }

  // Jika hanya ada 1 item
  if (normalizedItems.length === 1) {
    const item = normalizedItems[0];
    const qty = Math.max(1, Number(item.qty) || 1);
    const newSubtotal = item.subtotal + safeFee;
    const newUnitPrice = qty === 1 ? newSubtotal : Math.round(newSubtotal / qty);

    return {
      adjustedItems: [
        {
          ...item,
          unitPrice: newUnitPrice,
          subtotal: newSubtotal,
          product: {
            ...item.product,
            sellingPrice: newUnitPrice,
          },
        },
      ],
      adjustedSubtotal: newSubtotal,
    };
  }

  // Jika lebih dari 1 item, alokasikan proporsional
  let allocatedTotal = 0;
  const adjustedItems = normalizedItems.map((item, idx) => {
    let itemFee = 0;
    if (idx === normalizedItems.length - 1) {
      itemFee = safeFee - allocatedTotal;
      allocatedTotal += itemFee;
    } else {
      const ratio =
        originalSubtotal > 0
          ? item.subtotal / originalSubtotal
          : 1 / normalizedItems.length;
      itemFee = Math.round(ratio * safeFee);
      allocatedTotal += itemFee;
    }

    const newSubtotal = item.subtotal + itemFee;
    const qty = Math.max(1, Number(item.qty) || 1);
    const newUnitPrice = qty === 1 ? newSubtotal : Math.round(newSubtotal / qty);

    return {
      ...item,
      unitPrice: newUnitPrice,
      subtotal: newSubtotal,
      product: {
        ...item.product,
        sellingPrice: newUnitPrice,
      },
    };
  });

  return {
    adjustedItems,
    adjustedSubtotal: originalSubtotal + safeFee,
  };
}
