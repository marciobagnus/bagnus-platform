import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateRepairAccount, assertRepairPaymentAllowed } from '../../src/modules/payments/domain/repair-account.ts';

const repaired = (status = 'DELIVERED') => ({ status, resolution: status === 'IN_REPAIR' ? null : 'REPAIRED', quotes: [{ status: 'APPROVED', totalAmount: '150000.00' }], payments: [{ amount: '30000' }, { amount: '50000' }] });
test('same account before and after delivery, independent of operational state', () => {
  for (const status of ['IN_REPAIR', 'READY_FOR_PICKUP', 'DELIVERED']) {
    const account = calculateRepairAccount(repaired(status));
    assert.equal(account.totalPaid, '80000.00');
    assert.equal(account.outstandingBalance, '70000.00');
    assert.equal(account.financialStatus, 'PARTIALLY_PAID');
    assert.doesNotThrow(() => assertRepairPaymentAllowed(repaired(status), '70000'));
    assert.throws(() => assertRepairPaymentAllowed(repaired(status), '70000.01'), /supera/);
  }
});
test('rejection is free without a diagnosis decision and cannot receive payments', () => {
  const repair = { status: 'READY_FOR_PICKUP', resolution: 'QUOTE_REJECTED', quotes: [{ status: 'REJECTED', totalAmount: '150000' }], payments: [] };
  assert.equal(calculateRepairAccount(repair).amountDue, '0.00');
  assert.throws(() => assertRepairPaymentAllowed(repair, '1'), /supera/);
});
test('unknown total is distinct from zero and still exposes existing payments', () => {
  const account = calculateRepairAccount({ status: 'RECEIVED', resolution: null, quotes: [], payments: [{ amount: '100' }] });
  assert.equal(account.amountDue, null);
  assert.equal(account.totalPaid, '100.00');
  assert.equal(account.outstandingBalance, null);
  assert.equal(account.financialStatus, 'UNDETERMINED');
});
test('inconsistent resolution does not authorize collection', () => {
  assert.throws(() => assertRepairPaymentAllowed({ ...repaired(), resolution: null }, '1'), /determinado/);
  assert.throws(() => assertRepairPaymentAllowed(repaired('RECEIVED'), '1'), /determinado/);
});
