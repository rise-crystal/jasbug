/**
 * Sistem QRIS Dinamis
 * Implementasi berdasarkan: https://github.com/versschaute/qris-dinamis
 * 
 * Fitur:
 * - Parse TLV (Tag-Length-Value) structure
 * - Convert QRIS statis ke dinamis
 * - Inject nominal pembayaran
 * - Recalculate CRC16-CCITT checksum
 * - Generate QR Code sebagai data URL
 */

import QRCode from 'qrcode';

/**
 * Calculate CRC16-CCITT checksum untuk QRIS/EMVCo QR codes.
 * Polynomial: 0x1021, Init: 0xFFFF
 */
function calculateCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Map tag IDs ke nama human-readable
 */
const TAG_NAMES: Record<string, string> = {
  '00': 'Payload Format Indicator',
  '01': 'Point of Initiation Method',
  '26': 'Merchant Account Information',
  '27': 'Merchant Account Information',
  '28': 'Merchant Account Information',
  '29': 'Merchant Account Information',
  '30': 'Merchant Account Information',
  '31': 'Merchant Account Information',
  '32': 'Merchant Account Information',
  '33': 'Merchant Account Information',
  '34': 'Merchant Account Information',
  '35': 'Merchant Account Information',
  '36': 'Merchant Account Information',
  '37': 'Merchant Account Information',
  '38': 'Merchant Account Information',
  '39': 'Merchant Account Information',
  '40': 'Merchant Account Information',
  '41': 'Merchant Account Information',
  '42': 'Merchant Account Information',
  '43': 'Merchant Account Information',
  '44': 'Merchant Account Information',
  '45': 'Merchant Account Information',
  '46': 'Merchant Account Information',
  '47': 'Merchant Account Information',
  '48': 'Merchant Account Information',
  '49': 'Merchant Account Information',
  '50': 'Merchant Account Information',
  '51': 'Merchant Account Information',
  '52': 'Merchant Category Code',
  '53': 'Transaction Currency',
  '54': 'Transaction Amount',
  '55': 'Tip or Convenience Indicator',
  '56': 'Value of Convenience Fee (Fixed)',
  '57': 'Value of Convenience Fee (%)',
  '58': 'Country Code',
  '59': 'Merchant Name',
  '60': 'Merchant City',
  '61': 'Postal Code',
  '62': 'Additional Data Field',
  '63': 'CRC',
};

/**
 * Tags yang berisi nested TLV sub-elements
 */
const NESTED_TAGS = new Set([
  ...Array.from({ length: 26 }, (_, i) => String(i + 26).padStart(2, '0')),
  '62',
]);

interface TLVElement {
  tag: string;
  name: string;
  length: number;
  value: string;
  children?: TLVElement[];
}

/**
 * Parse raw QRIS TLV string menjadi array TLV elements
 */
function parseTLV(data: string): TLVElement[] {
  const elements: TLVElement[] = [];
  let pos = 0;
  while (pos < data.length) {
    if (pos + 4 > data.length) break;
    const tag = data.substring(pos, pos + 2);
    const length = parseInt(data.substring(pos + 2, pos + 4), 10);
    if (isNaN(length) || pos + 4 + length > data.length) break;
    const value = data.substring(pos + 4, pos + 4 + length);
    const name = TAG_NAMES[tag] || `Unknown (${tag})`;
    const element: TLVElement = { tag, name, length, value };

    // Parse nested TLV jika ada
    if (NESTED_TAGS.has(tag)) {
      element.children = parseTLV(value);
    }

    elements.push(element);
    pos += 4 + length;
  }
  return elements;
}

export interface QRISInfo {
  version: string;
  method: 'static' | 'dynamic';
  merchantCategoryCode: string;
  currency: string;
  amount?: string;
  countryCode: string;
  merchantName: string;
  merchantCity: string;
  postalCode: string;
  crc: string;
  raw: TLVElement[];
}

/**
 * Parse QRIS string menjadi structured object
 */
function parseQRIS(qrisString: string): QRISInfo {
  const raw = parseTLV(qrisString);
  const findTag = (tag: string) => raw.find((t) => t.tag === tag);
  const methodValue = findTag('01')?.value;
  const method: 'static' | 'dynamic' = methodValue === '12' ? 'dynamic' : 'static';

  return {
    version: findTag('00')?.value || '01',
    method,
    merchantCategoryCode: findTag('52')?.value || '',
    currency: findTag('53')?.value || '360',
    amount: findTag('54')?.value,
    countryCode: findTag('58')?.value || 'ID',
    merchantName: findTag('59')?.value || '',
    merchantCity: findTag('60')?.value || '',
    postalCode: findTag('61')?.value || '',
    crc: findTag('63')?.value || '',
    raw,
  };
}

/**
 * Build QRIS string dari TLV elements (tanpa CRC)
 */
function buildTLVString(elements: TLVElement[]): string {
  return elements
    .map((el) => {
      const value = el.children ? buildTLVString(el.children) : el.value;
      const length = value.length.toString().padStart(2, '0');
      return `${el.tag}${length}${value}`;
    })
    .join('');
}

/**
 * Create TLV element helper
 */
function makeTLV(tag: string, value: string, name: string = ''): TLVElement {
  return { tag, name, length: value.length, value };
}

/**
 * Convert QRIS statis ke dinamis dengan inject amount
 * 
 * Steps:
 * 1. Parse TLV structure
 * 2. Change Point of Initiation dari "11" (statis) ke "12" (dinamis)
 * 3. Insert/replace Transaction Amount (tag 54)
 * 4. Recalculate CRC16 checksum
 */
export function convertQRIS(qrisString: string, amount: number): string {
  const elements = parseTLV(qrisString);

  // Build TLV array baru, inject amount
  const result: TLVElement[] = [];
  let amountInserted = false;

  // Tags yang di-manage khusus (akan di-insert ulang)
  const managedTags = new Set(['54', '55', '56', '57', '63']);

  for (const el of elements) {
    if (managedTags.has(el.tag)) continue;

    if (el.tag === '01') {
      // Change statis → dinamis (11 → 12)
      result.push(makeTLV('01', '12', 'Point of Initiation Method'));
      continue;
    }

    // Insert amount sebelum tag 58 (Country Code)
    if (el.tag === '58' && !amountInserted) {
      const amountStr = amount.toString();
      result.push(makeTLV('54', amountStr, 'Transaction Amount'));
      amountInserted = true;
    }

    result.push(el);
  }

  // Build string tanpa CRC, lalu append CRC
  const withoutCRC = buildTLVString(result);
  const crcInput = withoutCRC + '6304';
  const crc = calculateCRC16(crcInput);
  return crcInput + crc;
}

/**
 * Verifikasi CRC QRIS
 */
export function verifyCRC(qrisString: string): boolean {
  const parsed = parseTLV(qrisString);
  const crcTag = parsed.find((t) => t.tag === '63');
  if (!crcTag) return false;

  const qrisWithoutCRC = qrisString.substring(0, qrisString.lastIndexOf('63'));
  const calculatedCRC = calculateCRC16(qrisWithoutCRC + '6304');
  return calculatedCRC === crcTag.value;
}

/**
 * Class QRISDinamis - High-level API
 */
export class QRISDinamis {
  public qrisString: string;
  public parsed: QRISInfo;
  public isValid: boolean;

  constructor(qrisString: string) {
    this.qrisString = qrisString;
    this.parsed = parseQRIS(qrisString);
    this.isValid = verifyCRC(qrisString);
  }

  /**
   * Convert ke QRIS dinamis dengan nominal tertentu
   */
  setAmount(amount: number): QRISDinamis {
    const newQRIS = convertQRIS(this.qrisString, amount);
    return new QRISDinamis(newQRIS);
  }

  /**
   * Get info QRIS
   */
  getInfo(): Record<string, string> {
    return {
      'Version': this.parsed.version,
      'Type': this.parsed.method === 'static' ? 'Static (11)' : 'Dynamic (12)',
      'Merchant Category': this.parsed.merchantCategoryCode,
      'Currency': this.parsed.currency === '360' ? 'IDR' : this.parsed.currency,
      'Amount': this.parsed.amount ? `Rp ${parseInt(this.parsed.amount).toLocaleString('id-ID')}` : 'Not set',
      'Country': this.parsed.countryCode,
      'Merchant Name': this.parsed.merchantName,
      'Merchant City': this.parsed.merchantCity,
      'CRC Valid': this.isValid ? '✅ Valid' : '❌ Invalid',
    };
  }

  /**
   * Generate QR Code sebagai data URL (base64)
   */
  async generateQRCodeDataUrl(width: number = 300): Promise<string | null> {
    try {
      const dataUrl = await QRCode.toDataURL(this.qrisString, {
        width,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      return dataUrl;
    } catch (err) {
      console.error('❌ Gagal membuat QR Code:', (err as Error).message);
      return null;
    }
  }

  /**
   * Get QRIS string
   */
  toString(): string {
    return this.qrisString;
  }
}
