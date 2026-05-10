import LZString from 'lz-string';

/**
 * StatePacker: Handles compression and encoding of complex payloads
 * for transport via Telegram URL hashes.
 */
export class StatePacker {
  /**
   * Encodes a payload into a URL-safe Base64 string.
   * JSON -> LZ-String compress -> Base64 URL-safe encode
   */
  static encode(payload: object): string {
    const jsonString = JSON.stringify(payload);
    const compressed = LZString.compressToUTF16(jsonString);
    return Buffer.from(compressed, 'utf16le').toString('base64url');
  }

  /**
   * Decodes a URL-safe Base64 string back into the original object.
   */
  static decode(encoded: string): object {
    const compressed = Buffer.from(encoded, 'base64url').toString('utf16le');
    const jsonString = LZString.decompressFromUTF16(compressed);
    if (!jsonString) {
      throw new Error("Failed to decompress StatePacker payload");
    }
    return JSON.parse(jsonString);
  }
}
