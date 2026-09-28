import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { prisma } from "../../src/lib/prisma.ts";
import { repairFixture } from "../helpers/repair-fixture.ts";
import { createInternalUser } from "../../src/modules/users/application/internal-auth.ts";
import { PrismaInternalAuthRepository } from "../../src/modules/users/infrastructure/prisma-internal-auth-repository.ts";
const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";
for (const role of ["ADMIN","STAFF"] as const) for (const decision of ["APPROVED","REJECTED"] as const) {
  test(`${role}: ${decision} quote through delivery and collection via authenticated API`,async()=>{
    const f = await repairFixture("RECEIVED",null,"DRAFT");
    const password = randomUUID();
    const user = await createInternalUser({username:`workflow-${randomUUID()}`,displayName:`Prueba ${role}`,password,role},new PrismaInternalAuthRepository());
    let cookie = "";
    const request = (path: string, method = "GET", body?: unknown, authenticated = true) => fetch(`${base}${path}`,{
      method, headers:{"Content-Type":"application/json",...(authenticated ? {Cookie:cookie} : {})},
      ...(body === undefined ? {} : {body:JSON.stringify(body)}),
    });
    const root = `/api/repairs/${f.repairId}`;
    const detail = async()=>{const response = await request(root);assert.equal(response.status,200);return response.json();};
    try {
      await prisma.repairQuote.delete({where:{id:f.quoteId}});
      const login = await request("/api/auth/login","POST",{username:user.username,password},false);
      assert.equal(login.status,200); cookie = login.headers.get("set-cookie")!.split(";",1)[0];
      for (const [path,method] of [[root,"GET"],[`${root}/actions`,"POST"],[`${root}/payments`,"POST"],[`${root}/quotes`,"POST"],[`${root}/status`,"PATCH"],[`${root}/diagnosis`,"POST"],["/api/repairs/outstanding","GET"]]) {
        assert.equal((await request(path,method,method === "GET" ? undefined : {},false)).status,401);
      }
      assert.equal((await request(`${root}/status`,"PATCH",{status:"DIAGNOSING"})).status,409);
      assert.equal((await request(`${root}/diagnosis`,"POST",{decision:"WAIVED"})).status,410);
      assert.equal((await request(`${root}/payments`,"POST",{amount:"1",method:"CASH"})).status,400);
      const quotes = await Promise.all([1,2].map(()=>request(`${root}/quotes`,"POST",{description:"Puesta a punto",totalAmount:"150000"})));
      assert.deepEqual(quotes.map(r=>r.status).sort(),[201,409]);
      const quote = await quotes.find(r=>r.status===201)!.json();
      let order = await detail();
      assert.equal(order.status,"WAITING_APPROVAL");assert.equal(order.resolution,null);
      assert.equal(order.quotes[0].status,"WAITING_APPROVAL");assert.equal(order.statusHistory.length,1);
      assert.equal(order.statusHistory[0].changedBy.id,user.id);
      const decisions = await Promise.all([1,2].map(()=>request(`/api/quotes/${quote.id}/decision`,"POST",{decision,channel:"WHATSAPP",note:"Respuesta del cliente"})));
      assert.deepEqual(decisions.map(r=>r.status).sort(),[200,409]);
      order = await detail();
      const recorded = order.quotes[0].decisions[0];
      assert.equal(recorded.recordedBy.id,user.id); assert.equal(recorded.channel,"WHATSAPP");
      assert.equal(recorded.note,"Respuesta del cliente");assert.ok(recorded.decidedAt);
      assert.equal(order.diagnosisCharge,null);
      if (decision === "APPROVED") {
        assert.equal(order.status,"IN_REPAIR");assert.equal(order.resolution,null);
        assert.equal((await request(`${root}/actions`,"POST",{action:"HAND_OVER_MACHINE",payment:{amount:"100",method:"CASH"}})).status,409);
        assert.equal((await request(`${root}/payments`,"POST",{amount:"30000",method:"TRANSFER"})).status,201);
        assert.equal((await request(`${root}/actions`,"POST",{action:"FINISH_REPAIR",payment:{amount:"1",method:"CASH"}})).status,400);
        assert.equal((await request(`${root}/actions`,"POST",{action:"FINISH_REPAIR"})).status,200);
        assert.equal((await detail()).resolution,"REPAIRED");
      } else {
        assert.equal(order.status,"READY_FOR_PICKUP");assert.equal(order.resolution,"QUOTE_REJECTED");
        assert.equal(order.billing.amountDue,"0.00");
      }
      assert.equal((await request(`${root}/actions`,"POST",{action:"HAND_OVER_MACHINE",payment:{amount:"-1",method:"CASH"}})).status,400);
      assert.equal((await request(`${root}/actions`,"POST",{action:"HAND_OVER_MACHINE",payment:{amount:decision === "APPROVED" ? "50000" : "0",method:"CASH"}})).status,200);
      order = await detail();
      const deliveredAt = order.deliveredAt, historyCount = order.statusHistory.length;
      assert.equal(order.status,"DELIVERED");assert.ok(deliveredAt);
      assert.equal(order.payments.length,decision === "APPROVED" ? 2 : 0);
      assert.equal((await request(`${root}/actions`,"POST",{action:"HAND_OVER_MACHINE"})).status,409);
      // A previous debt never prevents a new order; a second simultaneous open order does.
      const newOrder = {machineId:f.machineId,reportedIssue:"Nuevo ingreso con cuenta anterior"};
      assert.equal((await request("/api/repairs","POST",newOrder)).status,201);
      assert.equal((await request("/api/repairs","POST",newOrder)).status,409);
      if (decision === "APPROVED") {
        assert.equal(order.billing.outstandingBalance,"70000.00");
        let found = false;
        for (let page=1; !found; page++) {
          const pending = await (await request(`/api/repairs/outstanding?page=${page}`)).json();
          found = pending.items.some((item:{id:string})=>item.id===f.repairId);
          if (!pending.hasMore) break;
        }
        assert.ok(found);
        const concurrent = await Promise.all([1,2].map(()=>request(`${root}/payments`,"POST",{amount:"50000",method:"CASH"})));
        assert.deepEqual(concurrent.map(r=>r.status).sort(),[201,400]);
        assert.equal((await request(`${root}/payments`,"POST",{amount:"20000",method:"TRANSFER"})).status,201);
        order = await detail();
        assert.equal(order.billing.totalPaid,"150000.00"); assert.equal(order.billing.outstandingBalance,"0.00");
        assert.equal(order.resolution,"REPAIRED"); assert.equal(order.status,"DELIVERED");
        assert.equal(order.deliveredAt,deliveredAt); assert.equal(order.statusHistory.length,historyCount);
        assert.ok(order.payments.every((payment:{recordedBy:{id:string}})=>payment.recordedBy.id===user.id));
      }
      assert.equal((await request(`${root}/payments`,"POST",{amount:"1",method:"CASH"})).status,400);
      assert.equal((await request("/api/repairs/outstanding?page=-1")).status,400);
      for (const page of ["/reparaciones",`/reparaciones/${f.repairId}`,"/reparaciones/saldos","/dashboard"]) {
        assert.equal((await request(page)).status,200);
      }
    } finally {
      await f.cleanup();
      await prisma.internalSession.deleteMany({where:{userId:user.id}});
      await prisma.internalUser.delete({where:{id:user.id}});
    }
  });
}
after(()=>prisma.$disconnect());
