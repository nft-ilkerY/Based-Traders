import type { NextApiRequest, NextApiResponse } from 'next'
import { globalPriceEngine } from '../../../server/priceEngine'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const price = globalPriceEngine.getCurrentPrice()
    const history = globalPriceEngine.getPriceHistory(120)

    res.status(200).json({
      price,
      history,
      timestamp: Date.now()
    })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
