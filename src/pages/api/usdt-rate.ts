import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
    try {
        // Use Binance API as primary source (free, high rate limits)
        const response = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=USDTBRL");

        if (!response.ok) {
            throw new Error(`Binance API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.price) {
            const baseRate = parseFloat(data.price);
            const rateWithMarkup = baseRate * 1.0098;
            res.status(200).json({ rate: rateWithMarkup });
        } else {
            throw new Error("Invalid response from Binance API");
        }
    } catch (error) {
        console.error("Error fetching USDT rate:", error);
        res.status(500).json({ rate: null });
    }
}