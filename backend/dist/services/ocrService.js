"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractItemsFromReceipt = void 0;
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const fs_1 = __importDefault(require("fs"));
const extractItemsFromReceipt = (imagePath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!fs_1.default.existsSync(imagePath)) {
            console.error('File not found for OCR:', imagePath);
            return [];
        }
        const { data: { text } } = yield tesseract_js_1.default.recognize(imagePath, 'eng', { logger: m => console.log(m) });
        console.log('Extracted text:', text);
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const items = [];
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
        let amounts = [];
        while ((match = amountRegex.exec(text)) !== null) {
            const val = parseFloat(match[1].replace(',', '.'));
            if (!isNaN(val))
                amounts.push(val);
        }
        if (amounts.length > 0) {
            return [{ title: 'Receipt Scan', amount: Math.max(...amounts) }];
        }
        return [];
    }
    catch (error) {
        console.error('OCR Error:', error);
        return [];
    }
});
exports.extractItemsFromReceipt = extractItemsFromReceipt;
