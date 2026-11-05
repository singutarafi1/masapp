import {
  db,
  doc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  increment,
  arrayUnion,
  writeBatch,
  logActivity,
} from './firebase';
import { ProductItem, RepairItem, TransactionItem, DebtItem } from '../types';

// Helper for ISO timestamp history
function createHistoryLog(msg: string, by: string) {
  return {
    msg,
    by,
    time: new Date().toISOString(),
  };
}

// Format date for sold item records (DD/MM/YYYY hh:mm)
function formatSellDate(date: Date) {
  return (
    date.toLocaleDateString('en-GB') +
    ' ' +
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
}

// ----------------------------------------------------
// 1. INVENTORY / STOCK LOGIC
// ----------------------------------------------------

export async function addOrUpdateStockProduct(
  id: string | null,
  data: {
    name: string;
    category: string;
    amount: number;
    costPrice: number;
    price: number;
  },
  actorName: string
) {
  if (id) {
    const ref = doc(db, 'products', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('ပစ္စည်းရှာမတွေ့ပါ');
    const old = snap.data();

    const changes: string[] = [];
    if (old.name !== data.name) changes.push(`အမည်: ${old.name} -> ${data.name}`);
    if (old.amount !== data.amount) changes.push(`အရေအတွက်: ${old.amount} -> ${data.amount}`);
    if (old.price !== data.price) changes.push(`ရောင်းဈေး: ${old.price} -> ${data.price}`);
    if (old.costPrice !== data.costPrice) changes.push(`အရင်း: ${old.costPrice} -> ${data.costPrice}`);

    const newStatus = data.amount > 0 ? 'ပစ္စည်းရှိ' : 'လက်ကျန်ပြတ်';
    const historyMsg = changes.length > 0 ? `ပြင်ဆင်မှု: ${changes.join(' | ')}` : 'အချက်အလက် ပြင်ဆင်ခဲ့သည်';

    await updateDoc(ref, {
      ...data,
      status: newStatus,
      updatedAt: serverTimestamp(),
      history: arrayUnion(createHistoryLog(historyMsg, actorName)),
    });

    const addedQty = data.amount - Number(old.amount || 0);
    if (addedQty > 0 && data.costPrice > 0) {
      await addDoc(collection(db, 'transactions'), {
        productId: id,
        type: 'ထွက်ငွေ',
        group: 'StockPurchase',
        name: `ကုန်ပစ္စည်း ဖြည့်တင်း: ${data.name} (${addedQty} ခု)`,
        amount: addedQty * data.costPrice,
        date: new Date(),
        exactDate: serverTimestamp(),
        history: [createHistoryLog('ကုန်ပစ္စည်း ဖြည့်တင်းမှုမှ ထွက်ငွေ (auto)', actorName)],
      });
    }

    await logActivity(actorName, 'Edit Stock', `${data.name} ပြင်ဆင်သည်`);
  } else {
    const status = data.amount > 0 ? 'ပစ္စည်းရှိ' : 'လက်ကျန်ပြတ်';
    const newRef = await addDoc(collection(db, 'products'), {
      ...data,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      history: [createHistoryLog('ပစ္စည်းအသစ် စာရင်းသွင်းသည်', actorName)],
    });

    if (data.amount > 0 && data.costPrice > 0) {
      await addDoc(collection(db, 'transactions'), {
        productId: newRef.id,
        type: 'ထွက်ငွေ',
        group: 'StockPurchase',
        name: `ကုန်ပစ္စည်း ဝယ်ယူမှု: ${data.name} (${data.amount} ခု)`,
        amount: data.amount * data.costPrice,
        date: new Date(),
        exactDate: serverTimestamp(),
        history: [createHistoryLog('ကုန်ပစ္စည်း ဝယ်ယူမှုမှ ထွက်ငွေ (auto)', actorName)],
      });
    }

    await logActivity(actorName, 'Add Stock', `${data.name} သွင်းသည်`);
  }
}

export async function sellProductItem(
  product: ProductItem,
  qtyToSell: number,
  payMode: 'cash' | 'credit',
  creditInfo: { customer: string; phone?: string; note?: string } | null,
  actorName: string
) {
  if (qtyToSell <= 0 || qtyToSell > product.amount) {
    throw new Error(`လက်ကျန် (${product.amount}) ထက်ပိုပြီး မရောင်းနိုင်ပါ`);
  }

  const isCredit = payMode === 'credit';
  const remainQty = product.amount - qtyToSell;
  const historyLog = createHistoryLog(
    isCredit
      ? `${qtyToSell} ခု အကြွေးရောင်းချလိုက်သည် (${creditInfo?.customer})`
      : `${qtyToSell} ခု ရောင်းချလိုက်သည်`,
    actorName
  );

  // Update stock quantity
  await updateDoc(doc(db, 'products', product.id), {
    amount: increment(-qtyToSell),
    status: remainQty > 0 ? 'ပစ္စည်းရှိ' : 'လက်ကျန်ပြတ်',
    updatedAt: serverTimestamp(),
    history: arrayUnion(historyLog),
  });

  // Credit Sale Branch
  if (isCredit && creditInfo) {
    const now = new Date();
    await addDoc(collection(db, 'debts'), {
      customer: creditInfo.customer,
      phone: creditInfo.phone || '',
      note: creditInfo.note || '',
      productId: product.id,
      productName: product.name,
      category: product.category || 'အထွေထွေ',
      qty: qtyToSell,
      unitPrice: product.price,
      unitCost: product.costPrice,
      total: product.price * qtyToSell,
      cost: product.costPrice * qtyToSell,
      paid: 0,
      status: 'ကျန်ရှိ',
      payments: [],
      date: now,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: actorName,
      history: [createHistoryLog(`အကြွေးရောင်းချသည် (${creditInfo.customer}) - ${product.name} × ${qtyToSell}`, actorName)],
    });

    await logActivity(actorName, 'Credit Sell', `${product.name} × ${qtyToSell} ကို ${creditInfo.customer} အား အကြွေးရောင်းသည်`);
    return;
  }

  // Cash Sale Branch
  const curDate = new Date();
  const fDate = formatSellDate(curDate);
  const searchDate = curDate.toLocaleDateString('en-GB');
  const soldName = product.name + ' (ရောင်းပြီး)';

  // Find if already sold today without debt
  const soldQ = query(
    collection(db, 'products'),
    where('name', '==', soldName),
    where('status', '==', 'ရောင်းပြီး')
  );
  const soldSnap = await getDocs(soldQ);
  const existingSoldDoc = soldSnap.docs.find((d) => {
    const data = d.data();
    return data.sellDate && data.sellDate.startsWith(searchDate) && !data.debtId;
  });

  let soldDocId: string;
  if (existingSoldDoc) {
    const dData = existingSoldDoc.data();
    await updateDoc(doc(db, 'products', existingSoldDoc.id), {
      amount: dData.amount + qtyToSell,
      price: dData.price + product.price * qtyToSell,
      costPrice: dData.costPrice + product.costPrice * qtyToSell,
      updatedAt: serverTimestamp(),
      history: arrayUnion(createHistoryLog(`${qtyToSell} ခု ထပ်မံရောင်းချခဲ့သည်`, actorName)),
    });
    soldDocId = existingSoldDoc.id;
  } else {
    const newSoldRef = await addDoc(collection(db, 'products'), {
      name: soldName,
      category: product.category,
      status: 'ရောင်းပြီး',
      amount: qtyToSell,
      costPrice: product.costPrice * qtyToSell,
      price: product.price * qtyToSell,
      sellDate: fDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      history: [createHistoryLog('အရောင်းမှတ်တမ်း အသစ်တည်ဆောက်သည်', actorName)],
    });
    soldDocId = newSoldRef.id;
  }

  // Add Income Transaction
  await addDoc(collection(db, 'transactions'), {
    productId: soldDocId,
    type: 'ဝင်ငွေ',
    group: 'Sales',
    name: `ရောင်းရငွေ: ${product.name}`,
    amount: product.price * qtyToSell,
    date: curDate,
    exactDate: serverTimestamp(),
    history: [createHistoryLog('ပစ္စည်းရောင်းချမှုမှ ဝင်ငွေ', actorName)],
  });

  await logActivity(actorName, 'Sell', `${product.name} × ${qtyToSell} ရောင်းချသည်`);
}

// Delete inventory item or roll back sold items
export async function deleteOrRollbackProduct(
  targetItem: ProductItem,
  allProducts: ProductItem[],
  actorName: string
) {
  if (targetItem.debtId) {
    throw new Error('အကြွေးမှ ပြန်ရငွေစာရင်းဖြစ်သည် — အကြွေးစာရင်းမှသာ ပြင်ဆင်ပါ');
  }

  const isSoldItem = targetItem.status === 'ရောင်းပြီး';

  if (isSoldItem) {
    const originalName = targetItem.name.replace(' (ရောင်းပြီး)', '').trim();
    const stockItem = allProducts.find(
      (x) => x.name.trim() === originalName && x.status !== 'ရောင်းပြီး'
    );
    const unitCost = targetItem.amount > 0 ? targetItem.costPrice / targetItem.amount : targetItem.costPrice;
    const unitPrice = targetItem.amount > 0 ? targetItem.price / targetItem.amount : targetItem.price;
    const histLog = createHistoryLog('မှားရောင်းမိ၍ ၁ ခု ပြန်လည်ဖြည့်တင်းသည်', actorName);

    // Restore stock item
    if (stockItem) {
      await updateDoc(doc(db, 'products', stockItem.id), {
        amount: increment(1),
        status: 'ပစ္စည်းရှိ',
        updatedAt: serverTimestamp(),
        history: arrayUnion(histLog),
      });
    } else {
      await addDoc(collection(db, 'products'), {
        name: originalName,
        category: targetItem.category,
        amount: 1,
        costPrice: unitCost,
        price: unitPrice,
        status: 'ပစ္စည်းရှိ',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        history: [histLog],
      });
    }

    // Roll back transaction
    const finQ = query(collection(db, 'transactions'), where('productId', '==', targetItem.id));
    const finSnap = await getDocs(finQ);
    if (!finSnap.empty) {
      const txDocs = finSnap.docs.sort((a, b) => {
        const ta = a.data().exactDate?.toDate?.() || new Date(a.data().exactDate || 0);
        const tb = b.data().exactDate?.toDate?.() || new Date(b.data().exactDate || 0);
        return tb.getTime() - ta.getTime();
      });
      const latestTx = txDocs[0];
      const txAmt = Number(latestTx.data().amount || 0);
      if (txAmt > unitPrice + 0.01) {
        await updateDoc(doc(db, 'transactions', latestTx.id), {
          amount: txAmt - unitPrice,
          history: arrayUnion(createHistoryLog(`မှားရောင်းမိ၍ ${unitPrice} Ks ပြန်နှုတ်သည်`, actorName)),
        });
      } else {
        await deleteDoc(doc(db, 'transactions', latestTx.id));
      }
    }

    // Decrement or delete the sold product record
    if (targetItem.amount > 1) {
      await updateDoc(doc(db, 'products', targetItem.id), {
        amount: targetItem.amount - 1,
        price: targetItem.price - unitPrice,
        costPrice: targetItem.costPrice - unitCost,
        updatedAt: serverTimestamp(),
        history: arrayUnion(createHistoryLog('မှားရောင်းမိ၍ ၁ ခုစာ ပြန်လည်နှုတ်ပယ်သည်', actorName)),
      });
    } else {
      await deleteDoc(doc(db, 'products', targetItem.id));
    }
  } else {
    await deleteDoc(doc(db, 'products', targetItem.id));
  }

  await logActivity(actorName, isSoldItem ? 'Rollback Sold' : 'Delete Product', targetItem.name);
}

// ----------------------------------------------------
// 2. REPAIR WORKFLOW & BIDIRECTIONAL SYNC
// ----------------------------------------------------

export async function saveRepairData(
  id: string | null,
  data: {
    vrno: number | string;
    date: string;
    name: string;
    phone?: string;
    location?: string;
    model: string;
    issue: string;
    remark?: string;
    status: string;
    cost?: number;
    income?: number;
  },
  actorName: string
) {
  const cost = Number(data.cost) || 0;
  const income = Number(data.income) || 0;

  if (id) {
    const repRef = doc(db, 'repairs', id);
    const snap = await getDoc(repRef);
    if (!snap.exists()) throw new Error('မှတ်တမ်းရှာမတွေ့ပါ');
    const old = snap.data();

    const changes: string[] = [];
    if (old.status !== data.status) changes.push(`Status: ${old.status} -> ${data.status}`);
    if ((old.income || 0) !== income) changes.push(`ရငွေ: ${old.income || 0} -> ${income}`);
    if ((old.cost || 0) !== cost) changes.push(`အရင်း: ${old.cost || 0} -> ${cost}`);
    if (old.issue !== data.issue) changes.push('ပြစ်ချက် ပြင်ဆင်သည်');

    const updatePayload: any = {
      ...data,
      cost,
      income,
      updatedAt: serverTimestamp(),
      history: arrayUnion(
        createHistoryLog(changes.length ? `ပြင်ဆင်မှု: ${changes.join(' | ')}` : 'အချက်အလက်များ ပြင်ဆင်ခဲ့သည်', actorName)
      ),
    };

    if (data.status.includes('ထုတ်ယူပြီး')) {
      if (!old.collectedAt) updatePayload.collectedAt = serverTimestamp();
    } else if (old.collectedAt) {
      updatePayload.collectedAt = null;
    }

    await updateDoc(repRef, updatePayload);

    // Sync with Transactions
    const transQ = query(
      collection(db, 'transactions'),
      where('repairId', '==', id),
      where('type', '==', 'ဝင်ငွေ')
    );
    const transSnap = await getDocs(transQ);
    const incTx = transSnap.empty ? null : transSnap.docs[0];
    const curDate = new Date();
    const finName = `VR:${data.vrno} ပြင်ခ (${data.name} - ${data.model})`;

    if (data.status.includes('ထုတ်ယူပြီး')) {
      if (income > 0) {
        if (incTx) {
          await updateDoc(doc(db, 'transactions', incTx.id), {
            amount: income,
            name: finName,
            updatedAt: serverTimestamp(),
            history: arrayUnion(createHistoryLog(`VR:${data.vrno} (Repair မှ Update လုပ်သည်)`, actorName)),
          });
        } else {
          await addDoc(collection(db, 'transactions'), {
            repairId: id,
            type: 'ဝင်ငွေ',
            group: 'Service',
            name: finName,
            amount: income,
            date: curDate,
            exactDate: serverTimestamp(),
            history: [createHistoryLog(`VR:${data.vrno} (Repair မှ Update လုပ်သည်)`, actorName)],
          });
        }
      } else if (incTx) {
        await deleteDoc(doc(db, 'transactions', incTx.id));
      }
    } else {
      if (incTx) {
        await deleteDoc(doc(db, 'transactions', incTx.id));
      }
    }

    await logActivity(actorName, 'Edit Repair', `VR:${data.vrno} ${data.name}`);
  } else {
    // New Repair record
    await addDoc(collection(db, 'repairs'), {
      ...data,
      cost: 0,
      income: 0,
      status: 'စစ်ဆေးပြုပြင်နေဆဲ',
      timestamp: serverTimestamp(),
      history: [createHistoryLog('ဖုန်းအသစ် လက်ခံရရှိသည်', actorName)],
    });

    await logActivity(actorName, 'New Repair', `VR:${data.vrno} ${data.name}`);
  }
}

export async function voidRepairRecord(repairId: string, actorName: string) {
  // Batch delete all linked transactions
  const transQ = query(collection(db, 'transactions'), where('repairId', '==', repairId));
  const transSnap = await getDocs(transQ);
  const batch = writeBatch(db);
  transSnap.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  await updateDoc(doc(db, 'repairs', repairId), {
    status: 'ပယ်ဖျက် (Void)',
    updatedAt: serverTimestamp(),
    history: arrayUnion(createHistoryLog('စာရင်းကို အပြီးတိုင် ပယ်ဖျက် (Void) လုပ်လိုက်သည်', actorName)),
  });

  await logActivity(actorName, 'Void Repair', `Repair ${repairId} Voided`);
}

export async function deleteRepairPermanently(repairId: string, vrno: string | number, actorName: string) {
  // Delete all linked transactions
  const transQ = query(collection(db, 'transactions'), where('repairId', '==', repairId));
  const transSnap = await getDocs(transQ);
  const batch = writeBatch(db);
  transSnap.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  // Delete repair doc
  await deleteDoc(doc(db, 'repairs', repairId));
  await logActivity(actorName, 'Permanent Delete Repair', `VR:${vrno}`);
}

// ----------------------------------------------------
// 3. DEBT WORKFLOW & COMPLETE RECOVERY
// ----------------------------------------------------

export async function addDebtPayment(
  debtId: string,
  amount: number,
  note: string,
  actorName: string
) {
  const ref = doc(db, 'debts', debtId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('အကြွေးစာရင်း ရှာမတွေ့ပါ');
  const d = snap.data();
  if (d.status === 'void') throw new Error('Void လုပ်ထားသော စာရင်းဖြစ်သည်');

  const total = Number(d.total || 0);
  const paid = Number(d.paid || 0);
  const remain = total - paid;
  const payAmt = Math.round(Number(amount));

  if (payAmt <= 0 || payAmt > remain) {
    throw new Error(`ပမာဏ မှန်ကန်စွာထည့်ပါ (ကျန်ငွေ ${remain.toLocaleString()} Ks)`);
  }

  const isFinal = payAmt === remain;
  const totalCost = Number(d.cost || 0);
  const now = new Date();
  const baseName = d.productName || 'ပစ္စည်း';

  let soldRefId: string | null = null;
  if (isFinal) {
    const soldRef = await addDoc(collection(db, 'products'), {
      name: baseName + ' (ရောင်းပြီး)',
      category: d.category || 'အထွေထွေ',
      status: 'ရောင်းပြီး',
      amount: Number(d.qty || 1),
      price: total,
      costPrice: totalCost,
      sellDate: formatSellDate(now),
      debtId: debtId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      history: [createHistoryLog(`အကြွေးပြေကျေ၍ ရောင်းပြီးမှတ်တမ်းသွင်းသည် (${d.customer})`, actorName)],
    });
    soldRefId = soldRef.id;
  }

  const txData: any = {
    debtId: debtId,
    type: 'ဝင်ငွေ',
    group: 'Sales',
    name: `အကြွေးရှင်း: ${d.customer} - ${baseName}`,
    amount: payAmt,
    date: now,
    exactDate: serverTimestamp(),
    history: [createHistoryLog('အကြွေးပြန်ရငွေမှ ဝင်ငွေ (auto)', actorName)],
  };
  if (soldRefId) txData.productId = soldRefId;

  const txRef = await addDoc(collection(db, 'transactions'), txData);
  const payments = (d.payments || []).concat([
    {
      amount: payAmt,
      date: now.toISOString(),
      by: actorName,
      note: note || '',
      txId: txRef.id,
      soldId: soldRefId || undefined,
    },
  ]);

  await updateDoc(ref, {
    payments,
    paid: paid + payAmt,
    status: isFinal ? 'ရှင်းပြီး' : 'ကျန်ရှိ',
    updatedAt: serverTimestamp(),
    history: arrayUnion(
      createHistoryLog(`ငွေပေးချေ ${payAmt.toLocaleString()} Ks${note ? ` (${note})` : ''}`, actorName)
    ),
  });

  await logActivity(actorName, 'Debt Payment', `${d.customer} ${payAmt.toLocaleString()} Ks`);
  return { isFinal, remaining: remain - payAmt };
}

export async function removeLastDebtPayment(debtId: string, actorName: string) {
  const ref = doc(db, 'debts', debtId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('အကြွေးစာရင်း ရှာမတွေ့ပါ');
  const d = snap.data();
  const pays = [...(d.payments || [])];
  if (!pays.length) throw new Error('ပေးချေမှတ်တမ်း မရှိပါ');

  const lastPay = pays.pop();
  if (lastPay?.txId) {
    await deleteDoc(doc(db, 'transactions', lastPay.txId)).catch(() => {});
  }
  if (lastPay?.soldId) {
    await deleteDoc(doc(db, 'products', lastPay.soldId)).catch(() => {});
  }

  await updateDoc(ref, {
    payments: pays,
    paid: Math.max(0, Number(d.paid || 0) - Number(lastPay?.amount || 0)),
    status: 'ကျန်ရှိ',
    updatedAt: serverTimestamp(),
    history: arrayUnion(
      createHistoryLog(`နောက်ဆုံးပေးချေမှု ${Number(lastPay?.amount).toLocaleString()} Ks ကို ပြန်ဖျက်သည်`, actorName)
    ),
  });

  await logActivity(actorName, 'Revert Debt Payment', `${d.customer}`);
}

export async function voidDebtRecord(debtId: string, actorName: string) {
  const ref = doc(db, 'debts', debtId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('အကြွေးစာရင်း ရှာမတွေ့ပါ');
  const d = snap.data();
  if (d.status === 'void') return;

  // Delete all transaction records and sold records
  for (const p of d.payments || []) {
    if (p.txId) await deleteDoc(doc(db, 'transactions', p.txId)).catch(() => {});
    if (p.soldId) await deleteDoc(doc(db, 'products', p.soldId)).catch(() => {});
  }

  // Restore product stock
  const qty = Number(d.qty || 1);
  let restored = false;
  if (d.productId) {
    const ps = await getDoc(doc(db, 'products', d.productId));
    if (ps.exists() && ps.data().status !== 'ရောင်းပြီး') {
      await updateDoc(ps.ref, {
        amount: increment(qty),
        status: 'ပစ္စည်းရှိ',
        updatedAt: serverTimestamp(),
        history: arrayUnion(createHistoryLog(`အကြွေးစာရင်း Void ၍ ${qty} ခု ပြန်ထည့်သည်`, actorName)),
      });
      restored = true;
    }
  }

  if (!restored) {
    await addDoc(collection(db, 'products'), {
      name: d.productName,
      category: d.category || 'အထွေထွေ',
      amount: qty,
      costPrice: Number(d.unitCost || 0),
      price: Number(d.unitPrice || 0),
      status: 'ပစ္စည်းရှိ',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      history: [createHistoryLog(`အကြွေးစာရင်း Void ၍ ${qty} ခု ပြန်ထည့်သည်`, actorName)],
    });
  }

  await updateDoc(ref, {
    status: 'void',
    payments: [],
    paid: 0,
    voidedAt: serverTimestamp(),
    voidedBy: actorName,
    updatedAt: serverTimestamp(),
    history: arrayUnion(createHistoryLog('Void လုပ်သည် (Stock ပြန်ထည့်၊ ဝင်ငွေပြန်နှုတ်)', actorName)),
  });

  await logActivity(actorName, 'Void Debt', `${d.customer} - ${d.productName}`);
}

// ----------------------------------------------------
// 4. ADMIN MASTER TRANSACTION DISPATCHER (BIDIRECTIONAL)
// ----------------------------------------------------

export async function adminMasterDeleteTransaction(tx: TransactionItem, actorName: string) {
  // Case A: Transfer Pair (Handover or OwnerFund)
  if (tx.transferId) {
    const qTr = query(collection(db, 'transactions'), where('transferId', '==', tx.transferId));
    const sTr = await getDocs(qTr);
    const batch = writeBatch(db);
    sTr.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await logActivity(actorName, 'Delete Transfer Pair', tx.name);
    return;
  }

  // Case B: Repair income transaction
  if (tx.repairId) {
    // If deleted directly from Finance, reset repair income to 0
    await updateDoc(doc(db, 'repairs', tx.repairId), {
      income: 0,
      updatedAt: serverTimestamp(),
      history: arrayUnion(createHistoryLog(`Finance မှ ${tx.amount} Ks ဝင်ငွေ ဖျက်သိမ်းသဖြင့် ရငွေ 0 ပြန်ဖြစ်သွားသည်`, actorName)),
    });
  }

  // Case C: Stock sales transaction
  if (tx.productId && tx.group === 'Sales') {
    const pRef = doc(db, 'products', tx.productId);
    const pSnap = await getDoc(pRef);
    if (pSnap.exists() && pSnap.data().status === 'ရောင်းပြီး') {
      const pData = pSnap.data();
      // Restore stock
      const originalName = pData.name.replace(' (ရောင်းပြီး)', '').trim();
      const allQ = query(collection(db, 'products'), where('name', '==', originalName));
      const allSnap = await getDocs(allQ);
      const stockDoc = allSnap.docs.find((d) => d.data().status !== 'ရောင်းပြီး');
      if (stockDoc) {
        await updateDoc(stockDoc.ref, {
          amount: increment(1),
          status: 'ပစ္စည်းရှိ',
          updatedAt: serverTimestamp(),
          history: arrayUnion(createHistoryLog('Finance မှ အရောင်းဖျက်သိမ်းသဖြင့် စတော့ ၁ ခု ပြန်တိုးသည်', actorName)),
        });
      }
      if (pData.amount > 1) {
        await updateDoc(pRef, {
          amount: increment(-1),
          price: increment(-tx.amount),
        });
      } else {
        await deleteDoc(pRef);
      }
    }
  }

  // Delete transaction itself
  await deleteDoc(doc(db, 'transactions', tx.id));
  await logActivity(actorName, 'Delete Transaction', `${tx.type} ${tx.amount} Ks (${tx.name})`);
}

export async function adminMasterEditTransaction(
  txId: string,
  updatedData: {
    name: string;
    amount: number;
    type: 'ဝင်ငွေ' | 'ထွက်ငွေ';
    group: string;
    date: Date;
  },
  actorName: string
) {
  const ref = doc(db, 'transactions', txId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('ငွေစာရင်း ရှာမတွေ့ပါ');
  const old = snap.data();

  const changes: string[] = [];
  if (old.amount !== updatedData.amount) changes.push(`ပမာဏ: ${old.amount} -> ${updatedData.amount}`);
  if (old.name !== updatedData.name) changes.push(`အမည်: ${old.name} -> ${updatedData.name}`);
  if (old.type !== updatedData.type) changes.push(`အမျိုးအစား: ${old.type} -> ${updatedData.type}`);
  if (old.group !== updatedData.group) changes.push(`Group: ${old.group} -> ${updatedData.group}`);

  await updateDoc(ref, {
    ...updatedData,
    updatedAt: serverTimestamp(),
    history: arrayUnion(
      createHistoryLog(changes.length ? `Admin ပြင်ဆင်မှု: ${changes.join(' | ')}` : 'အချက်အလက် ပြင်ဆင်ခဲ့သည်', actorName)
    ),
  });

  // Sync to Repair if linked
  if (old.repairId && updatedData.amount !== old.amount) {
    await updateDoc(doc(db, 'repairs', old.repairId), {
      income: updatedData.amount,
      updatedAt: serverTimestamp(),
      history: arrayUnion(createHistoryLog(`Finance မှ ရငွေ ${updatedData.amount} Ks သို့ ပြင်ဆင်သည်`, actorName)),
    });
  }

  await logActivity(actorName, 'Edit Transaction', `${updatedData.name} (${updatedData.amount} Ks)`);
}

// ----------------------------------------------------
// 5. DAILY SETTLEMENT & TRANSFER PAIRS
// ----------------------------------------------------

export async function createTransferPair(
  kind: 'handover' | 'ownerfund',
  amount: number,
  note: string,
  dateObj: Date,
  extra: { type: 'ဝင်ငွေ' | 'ထွက်ငွေ'; name: string; amount: number; msg: string } | null,
  actorName: string
) {
  const cleanAmt = Math.round(Number(amount));
  if (cleanAmt <= 0) throw new Error('ပမာဏ မှန်ကန်စွာ ထည့်ပါ');

  const isH = kind === 'handover';
  const iso = new Date().toISOString();
  const when = dateObj || new Date();
  const tid = 'tr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const label = isH ? 'ဆိုင်မှ အပ်ငွေ' : 'ဆိုင်အတွက်ထုတ်ငွေ';
  const tail = note ? ' - ' + note : '';

  const base = {
    amount: cleanAmt,
    date: when,
    exactDate: serverTimestamp(),
    transferId: tid,
    transferPair: kind,
  };

  const batch = writeBatch(db);

  // Shop drawer transaction
  batch.set(doc(collection(db, 'transactions')), {
    ...base,
    type: isH ? 'ထွက်ငွေ' : 'ဝင်ငွေ',
    group: isH ? 'Handover' : 'OwnerFund',
    name: label + tail,
    history: [createHistoryLog(isH ? 'ဆိုင်ဘက်မှ ငွေအပ်သည် (Admin ထံသို့)' : 'Admin ပိုက်ဆံအိတ်မှ ဆိုင်သို့ ထည့်သည်', actorName)],
  });

  // Admin Personal transaction
  batch.set(doc(collection(db, 'transactions')), {
    ...base,
    type: isH ? 'ဝင်ငွေ' : 'ထွက်ငွေ',
    group: 'Personal',
    subGroup: label,
    name: label + tail + ` (${actorName})`,
    history: [createHistoryLog(isH ? 'ဆိုင်မှ ငွေလက်ခံသည်' : 'ဆိုင်အတွက် ငွေထုတ်ပေးသည်', actorName)],
  });

  // Extra shortage or overage if any
  if (extra && extra.amount > 0) {
    batch.set(doc(collection(db, 'transactions')), {
      type: extra.type,
      group: 'CashDiff',
      name: extra.name,
      amount: extra.amount,
      date: when,
      exactDate: serverTimestamp(),
      history: [createHistoryLog(extra.msg || 'Daily Settlement ကွာခြားငွေ (auto)', actorName)],
    });
  }

  await batch.commit();
  await logActivity(actorName, isH ? 'Daily Settlement Handover' : 'Owner Fund Injection', `${cleanAmt} Ks`);
  return tid;
}

// ----------------------------------------------------
// 6. ADMIN PRO SUITE: PERSONAL WALLET & CATEGORIES
// ----------------------------------------------------

export async function addPersonalTransaction(data: {
  type: 'ဝင်ငွေ' | 'ထွက်ငွေ';
  amount: number;
  subGroup: string;
  name: string;
  date: Date;
  actorName: string;
}) {
  const cleanAmt = Math.round(Number(data.amount));
  if (cleanAmt <= 0) throw new Error('ငွေပမာဏ မှန်ကန်စွာ ထည့်ပါ');

  await addDoc(collection(db, 'transactions'), {
    type: data.type,
    group: 'Personal',
    subGroup: data.subGroup || 'အထွေထွေ',
    name: data.name || (data.type === 'ဝင်ငွေ' ? 'ပုဂ္ဂိုလ်ရေး ဝင်ငွေ' : 'ပုဂ္ဂိုလ်ရေး သုံးစွဲငွေ'),
    amount: cleanAmt,
    date: data.date || new Date(),
    exactDate: serverTimestamp(),
    history: [createHistoryLog(`ကိုယ်ပိုင် ငွေစာရင်းသွင်း: ${data.subGroup}`, data.actorName)],
  });

  await logActivity(data.actorName, `Personal ${data.type}`, `${data.subGroup} - ${cleanAmt} Ks`);
}

export async function getCategorySettings(): Promise<Record<string, string[]>> {
  try {
    const snap = await getDoc(doc(db, 'app_settings', 'categories'));
    if (snap.exists()) {
      return snap.data() as Record<string, string[]>;
    }
  } catch (e) {
    console.warn('Failed to load categories, using defaults', e);
  }
  return {
    personal: ['အစားအသောက်', 'အဝတ်အထည်', 'ကျန်းမာရေး', 'အလှူအတန်း', 'လစာ', 'အခြား'],
    service: ['ဆော့ဝဲလ်', 'ဟာ့ဒ်ဝဲလ်', 'လော့ခ်ဖြုတ်', 'စခရင်လဲလှယ်', 'အခြားဝန်ဆောင်မှု'],
    stockPurchase: ['ဖုန်းအပိုပစ္စည်း', 'ဆက်စပ်ပစ္စည်း', 'Tools', 'အခြား'],
    office: ['လျှပ်စစ်မီတာခ', 'ဆိုင်လခ', 'အင်တာနက်ဖိုး', 'အထွေထွေ'],
    sales: ['ဖုန်းအရောင်း', 'ဆက်စပ်ပစ္စည်းအရောင်း', 'အပိုပစ္စည်းအရောင်း'],
    capital: ['ရင်းနှီးငွေ', 'အစုရှယ်ယာ'],
    home: ['အိမ်သုံးစရိတ်', 'မိဘကန်တော့ငွေ']
  };
}

export async function saveCategorySettings(categories: Record<string, string[]>, actorName: string) {
  await updateDoc(doc(db, 'app_settings', 'categories'), {
    ...categories,
    updatedAt: serverTimestamp(),
  }).catch(async (err) => {
    // If doc doesn't exist, use setDoc via writeBatch or add
    const batch = writeBatch(db);
    batch.set(doc(db, 'app_settings', 'categories'), {
      ...categories,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  });

  await logActivity(actorName, 'Update Categories', 'Settings updated');
}

export async function archiveDeleteByDateRange(
  targetCollection: 'transactions' | 'repairs' | 'products' | 'activity_logs',
  startDate: Date,
  endDate: Date,
  actorName: string
): Promise<number> {
  const colRef = collection(db, targetCollection);
  const snap = await getDocs(colRef);
  let deletedCount = 0;

  const batch = writeBatch(db);
  const startTs = startDate.getTime();
  const endTs = endDate.getTime();

  snap.forEach((docItem) => {
    const data = docItem.data();
    let itemDate = data.date || data.timestamp || data.createdAt;
    let ts = 0;
    if (itemDate && typeof itemDate.toDate === 'function') {
      ts = itemDate.toDate().getTime();
    } else if (itemDate instanceof Date) {
      ts = itemDate.getTime();
    } else if (typeof itemDate === 'string') {
      ts = new Date(itemDate).getTime();
    }

    if (ts >= startTs && ts <= endTs) {
      batch.delete(docItem.ref);
      deletedCount++;
    }
  });

  if (deletedCount > 0) {
    await batch.commit();
    await logActivity(actorName, `Archive Clean [${targetCollection}]`, `${deletedCount} records deleted`);
  }

  return deletedCount;
}
