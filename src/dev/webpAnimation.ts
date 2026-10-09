const readFourCC = (bytes: Uint8Array, offset: number) => (
  String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  )
);

export function hasAnimatedWebpFeatureFlag(header: Uint8Array): boolean {
  return header.length >= 21
    && readFourCC(header, 0) === 'RIFF'
    && readFourCC(header, 8) === 'WEBP'
    && readFourCC(header, 12) === 'VP8X'
    && (header[20] & 0x02) !== 0;
}

export async function isAnimatedWebp(blob: Blob): Promise<boolean> {
  const header = new Uint8Array(await blob.slice(0, 21).arrayBuffer());
  return hasAnimatedWebpFeatureFlag(header);
}
