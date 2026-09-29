import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import pg from "pg";

test("versioned migrations map old test statuses, preserve history and enforce one open order",async()=>{
  const client = new pg.Client({connectionString:process.env.DATABASE_URL});
  const schema = `workflow_${randomUUID().replaceAll("-","")}`;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    // Apply actual versioned migrations in an isolated schema, then seed pre-contract fixtures.
    const { readdir } = await import("node:fs/promises");
    const directories = (await readdir(new URL("../../prisma/migrations/",import.meta.url),{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name).sort();
    const contract = "20260928100000_contract_repair_workflow";
    for (const name of directories.filter(name=>name < contract)) {
      const sql = await readFile(new URL(`../../prisma/migrations/${name}/migration.sql`,import.meta.url),"utf8");
      // Relocate an old explicit public qualifier into this test schema; versioned files stay untouched.
      await client.query(sql.replaceAll('"public".', `"${schema}".`));
    }
    const customerId = randomUUID();
    await client.query(`INSERT INTO customers (id,name,phone,"createdAt","updatedAt") VALUES ($1,'Prueba migración',$2,now(),now())`,[customerId,customerId]);
    const statuses = ["RECEIVED","DIAGNOSING","WAITING_APPROVAL","IN_REPAIR","READY_FOR_PICKUP","AWAITING_PICKUP_UNREPAIRED","DELIVERED","CANCELLED"];
    const ids: string[] = [], machines: string[] = [];
    for (const status of statuses) {
      const machineId = randomUUID(), id = randomUUID();ids.push(id);machines.push(machineId);
      await client.query(`INSERT INTO machines (id,"customerId",brand,type,"createdAt","updatedAt") VALUES ($1,$2,'Singer','Recta',now(),now())`,[machineId,customerId]);
      await client.query(`INSERT INTO repair_orders (id,"machineId","reportedIssue",status,"receivedAt","createdAt","updatedAt") VALUES ($1,$2,'Prueba',$3,now(),now(),now())`,[id,machineId,status]);
      await client.query(`INSERT INTO repair_status_history (id,"repairOrderId","toStatus","changedAt") VALUES ($1,$2,$3,now())`,[randomUUID(),id,status]);
    }
    await client.query(await readFile(new URL(`../../prisma/migrations/${contract}/migration.sql`,import.meta.url),"utf8"));
    const expected = ["RECEIVED","RECEIVED","WAITING_APPROVAL","IN_REPAIR","READY_FOR_PICKUP","READY_FOR_PICKUP","DELIVERED","DELIVERED"];
    for (let index=0;index<ids.length;index++) {
      const result = (await client.query('SELECT status,resolution,"deliveredAt" FROM repair_orders WHERE id=$1',[ids[index]])).rows[0];
      assert.equal(result.status,expected[index]);
      assert.equal(result.resolution,index<4 ? null : [5,7].includes(index) ? "QUOTE_REJECTED" : "REPAIRED");
      assert.equal(Boolean(result.deliveredAt),index>=6);
      assert.equal((await client.query('SELECT "toStatus" FROM repair_status_history WHERE "repairOrderId"=$1',[ids[index]])).rows[0].toStatus,statuses[index]);
    }
    const values = await client.query('SELECT unnest(enum_range(NULL::"RepairStatus"))::text AS status');
    assert.deepEqual(values.rows.map(row=>row.status),["RECEIVED","WAITING_APPROVAL","IN_REPAIR","READY_FOR_PICKUP","DELIVERED"]);
    const insert = `INSERT INTO repair_orders (id,"machineId","reportedIssue","receivedAt","createdAt","updatedAt") VALUES ($1,$2,'Reingreso',now(),now(),now())`;
    await assert.rejects(client.query(insert,[randomUUID(),machines[0]]),{code:"23505"});
    await client.query(insert,[randomUUID(),machines[7]]);
    await assert.rejects(client.query(insert,[randomUUID(),machines[7]]),{code:"23505"});
  } finally {
    await client.query("ROLLBACK");
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});
