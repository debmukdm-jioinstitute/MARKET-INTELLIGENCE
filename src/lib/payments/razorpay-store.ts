import { ensureSchema, hasDatabase, sql } from "@/lib/db";

export async function recordRazorpayOrderCreated(input: {
  orderId: string;
  userEmail: string;
  planId: string;
  amountPaise: number;
}): Promise<void> {
  if (!hasDatabase()) return;
  await ensureSchema();
  await sql()`
    INSERT INTO razorpay_orders (id, user_email, plan_id, amount_paise, status)
    VALUES (${input.orderId}, ${input.userEmail}, ${input.planId}, ${input.amountPaise}, 'created')
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function markRazorpayOrderPaid(input: {
  orderId: string;
  paymentId: string;
}): Promise<void> {
  if (!hasDatabase()) return;
  await ensureSchema();
  await sql()`
    UPDATE razorpay_orders
    SET status = 'paid', payment_id = ${input.paymentId}, paid_at = now()
    WHERE id = ${input.orderId}
  `;
}
