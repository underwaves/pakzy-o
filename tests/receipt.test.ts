import { describe, it, expect, vi } from 'vitest';
import {
  drawQokhimsReceiptToCanvas,
  drawQokhimsQrCardToCanvas,
} from '../src/utils/receiptCanvas';

function createMockCanvas() {
  const calls: string[] = [];
  const mockCtx = {
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    fillText: vi.fn((text: string, x: number, y: number) => {
      calls.push(`fillText:${text}:${x}:${y}`);
    }),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setLineDash: vi.fn(),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'left',
  };

  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn((type: string) => (type === '2d' ? mockCtx : null)),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  } as unknown as HTMLCanvasElement;

  return { mockCanvas, mockCtx, calls };
}

describe('Receipt Canvas Generator', () => {
  it('renders official receipt with PromptPay QR code by default', () => {
    const { mockCanvas, mockCtx, calls } = createMockCanvas();

    drawQokhimsReceiptToCanvas(mockCanvas, {
      siteName: 'qokhims',
      orderCode: 'QOK-261117-001',
      billDate: '17 พ.ย. 2569',
      billTime: '18:00',
      customerName: 'คุณบิม',
      customerContact: 'LINE: bim',
      items: [
        {
          product_title: 'ฟอนต์ PKZ Milky Star',
          quantity: 1,
          unit_price: 159,
          item_note: 'รับไฟล์ฟอนต์ครบชุด',
        },
      ],
      netTotal: 159,
      promptPayNumber: '0812345678',
      bankName: 'ธนาคารกสิกรไทย',
      bankAccountNumber: '123-4-56789-0',
      bankAccountName: 'qokhims',
      includeQr: true,
    });

    expect(mockCanvas.width).toBe(720);
    expect(mockCanvas.height).toBeGreaterThan(400);

    const fullTextLog = calls.join(' ');
    expect(fullTextLog).toContain('OFFICIAL ORDER RECEIPT');
    expect(fullTextLog).toContain('qokhims studio');
    expect(fullTextLog).toContain('คุณบิม');
    expect(fullTextLog).toContain('LINE: bim');
    expect(fullTextLog).toContain('ITEM DESCRIPTION');
    expect(fullTextLog).toContain('ฟอนต์ PKZ Milky Star');
    expect(fullTextLog).toContain('TOTAL');
    expect(fullTextLog).toContain('ขอบคุณค่ะ ♡');
    expect(fullTextLog).toContain('สแกน QR เพื่อชำระเงินผ่านพร้อมเพย์');
  });

  it('renders decorative barcode when includeQr is false', () => {
    const { mockCanvas, calls } = createMockCanvas();

    drawQokhimsReceiptToCanvas(mockCanvas, {
      siteName: 'qokhims',
      orderCode: 'QOK-261117-002',
      billDate: '17 พ.ย. 2569',
      customerName: 'คุณน้ำ',
      items: [
        {
          product_title: 'ออกแบบป้าย 1 รายการ',
          quantity: 1,
          unit_price: 109,
        },
      ],
      netTotal: 109,
      promptPayNumber: '0812345678',
      bankName: 'ธนาคารกสิกรไทย',
      bankAccountNumber: '123-4-56789-0',
      bankAccountName: 'qokhims',
      includeQr: false,
    });

    const fullTextLog = calls.join(' ');
    expect(fullTextLog).toContain('OFFICIAL ORDER RECEIPT');
    expect(fullTextLog).toContain('TOTAL');
    expect(fullTextLog).toContain('LINE Official: @280npxvj');
    expect(fullTextLog).not.toContain('สแกน QR เพื่อชำระเงินผ่านพร้อมเพย์');
  });

  it('renders separate PromptPay QR card correctly', () => {
    const { mockCanvas, calls } = createMockCanvas();

    drawQokhimsQrCardToCanvas(mockCanvas, {
      siteName: 'qokhims',
      orderCode: 'QOK-261117-003',
      netTotal: 318,
      promptPayNumber: '0812345678',
      bankName: 'ธนาคารกสิกรไทย',
      bankAccountNumber: '123-4-56789-0',
      bankAccountName: 'qokhims',
    });

    expect(mockCanvas.width).toBe(520);
    expect(mockCanvas.height).toBe(560);

    const fullTextLog = calls.join(' ');
    expect(fullTextLog).toContain('PROMPTPAY QR');
    expect(fullTextLog).toContain('สแกน QR เพื่อชำระเงิน');
    expect(fullTextLog).toContain('฿318');
  });
});
