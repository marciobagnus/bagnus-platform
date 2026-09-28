import assert from 'node:assert/strict';
import { test } from 'node:test';
import { changeRepairStatus } from '../../src/modules/repairs/domain/change-repair-status.ts';
const states = ['RECEIVED', 'WAITING_APPROVAL', 'IN_REPAIR', 'READY_FOR_PICKUP', 'DELIVERED'];
const edges = ['RECEIVED:WAITING_APPROVAL', 'WAITING_APPROVAL:IN_REPAIR', 'WAITING_APPROVAL:READY_FOR_PICKUP', 'IN_REPAIR:READY_FOR_PICKUP', 'READY_FOR_PICKUP:DELIVERED'];
test('five transitions, no self transitions, reversal or reopening', () => {
  for (const currentStatus of states) for (const newStatus of states) {
    const run = () => changeRepairStatus({currentStatus,newStatus,note:'  nota  ',now:new Date()});
    if (edges.includes(`${currentStatus}:${newStatus}`)) assert.equal(run().note, 'nota');
    else assert.throws(run, /No se permite/);
  }
});
test('unknown destination is rejected', () => {
  assert.throws(() => changeRepairStatus({currentStatus:'RECEIVED',newStatus:'INVALID',now:new Date()}), /estado de destino/);
});
