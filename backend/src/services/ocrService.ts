import Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs';

export const extractItemsFromReceipt = async (imagePath: string): Promise<Array<{title: string, amount: number}>> => {
  try {
    if (!fs.existsSync(imagePath)) {
      console.error('File not found for OCR:', imagePath);
      return [];
    }

    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'eng',
      { logger: m => console.log(m) }
    );

    console.log('Extracted text:', text);

    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const items: Array<{title: string, amount: number}> = [];
    
    // Regex to match a line that has some text and ends with a price
    const lineItemRegex = /^(.*?)(?:[$₹Rs€£]?\s*(\d+[\.,]\d{2}))$/i;

    for (const line of lines) {
      const match = lineItemRegex.exec(line.trim());
      if (match) {
        const title = match[1].replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const amount = parseFloat(match[2].replace(',', '.'));
        
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('total') || lowerTitle.includes('subtotal') || lowerTitle.includes('tax') || lowerTitle.includes('cash') || lowerTitle.includes('change')) {
          continue;
        }
        
        if (title.length > 2 && !isNaN(amount)) {
          items.push({ title, amount });
        }
      }
    }

    if (items.length > 0) {
      return items;
    }

    // Fallback: Just find the largest amount
    const amountRegex = /(?:total|amount|sum)?\s*[$₹Rs€£]*\s*(\d+[\.,]\d{2})/gi;
    let match;
    let amounts: number[] = [];
    
    while ((match = amountRegex.exec(text)) !== null) {
      const val = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(val)) amounts.push(val);
    }

    if (amounts.length > 0) {
      return [{ title: 'Receipt Scan', amount: Math.max(...amounts) }];
    }

    return [];
  } catch (error) {
    console.error('OCR Error:', error);
    return [];
  }
};
