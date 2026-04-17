import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatCurrency(value) {
  return `${Number(value).toLocaleString()}원`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { customerName, submittedAt, orderItems, totalAmount, totalQuantity, memo } = req.body;

    const itemsHtml = (orderItems || [])
      .map(
        (item) => `
          <tr>
            <td style="padding:8px;border:1px solid #ddd;">${item.name}</td>
<td style="padding:8px;border:1px solid #ddd;">${formatCurrency(item.unit_price)}</td>
            <td style="padding:8px;border:1px solid #ddd;">${item.quantity}${item.unit}</td>
            <td style="padding:8px;border:1px solid #ddd;">${formatCurrency(item.amount)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 16px;">새 주문이 접수되었습니다</h2>
        <p><strong>거래처:</strong> ${customerName}</p>
        <p><strong>주문일시:</strong> ${submittedAt}</p>

        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr>
              <th style="padding:8px;border:1px solid #ddd;background:#f8fafc;">품목</th>
              <th style="padding:8px;border:1px solid #ddd;background:#f8fafc;">단가</th>
              <th style="padding:8px;border:1px solid #ddd;background:#f8fafc;">수량</th>
              <th style="padding:8px;border:1px solid #ddd;background:#f8fafc;">금액</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <p style="margin-top:20px;font-size:16px;">
  <strong>총 판수: ${Number(totalQuantity || 0).toLocaleString()}판</strong>
</p>

<p style="margin-top:8px;font-size:18px;">
  <strong>총 주문금액: ${formatCurrency(totalAmount)}</strong>
</p>

        ${
          memo
            ? `<p style="margin-top:12px;"><strong>요청사항:</strong> ${memo}</p>`
            : ""
        }
      </div>
    `;

    const response = await resend.emails.send({
      from: process.env.ORDER_FROM_EMAIL,
      to: [process.env.NOTIFY_EMAIL],
      subject: `[새 주문] ${customerName} / ${submittedAt}`,
      html,
    });

    if (response.error) {
      return res.status(500).json(response);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Email send failed" });
  }
}