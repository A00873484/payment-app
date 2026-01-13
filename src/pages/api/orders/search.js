import { SheetsManager } from "@/lib/sheets";
import { sheet_master } from "../../../lib/const";

export default async function handler(req, res) {
  console.log("Received search request:", req.method, req.query);

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = req.query.query?.trim().toLowerCase();

  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  try {
    const { dataRows, colIndex } =
      await SheetsManager.getSheetsData("Master!A:Z");

    const matches = dataRows.filter(row => {
      const wechatId =
        row[colIndex[sheet_master.WECHAT_ID]]?.trim().toLowerCase() || "";

      // partial, case-insensitive wechatId match
      return wechatId.includes(query);
    });

    return res.status(200).json({ results: matches.map((row) => ({
        ORDER_ID: row[colIndex[sheet_master.ORDER_ID]],
        WECHAT_ID: row[colIndex[sheet_master.WECHAT_ID]],
        PHONE_END: row[colIndex[sheet_master.PHONE]]?.slice(-2),
        PAID_STATUS: row[colIndex[sheet_master.PAID_STATUS]],
        PACKING_STATUS: row[colIndex[sheet_master.PACKING_STATUS]],
        SHIPPING_STATUS: row[colIndex[sheet_master.SHIPPING_STATUS]],
        PRODUCTS: row[colIndex[sheet_master.PRODUCT_NAME]],
      })) });

  } catch (err) {
    console.error("Search API Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
