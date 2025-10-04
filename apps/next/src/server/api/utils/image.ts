import sharp from "sharp";

/**
 * Convert any supported image buffer to PNG.
 * @param inputBuffer - Buffer of input image
 * @returns Buffer of PNG image
 */
export async function convertToPng(
  inputBuffer: Buffer | ArrayBuffer,
): Promise<Buffer> {
  try {
    const image = sharp(inputBuffer);

    const metadata = await image.metadata();

    if (metadata.format === "png") {
      // already PNG → return original buffer
      return Buffer.isBuffer(inputBuffer)
        ? inputBuffer
        : Buffer.from(inputBuffer);
    }

    return image
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
  } catch (err) {
    throw new Error(
      `Failed to convert image to PNG: ${(err as Error).message}`,
    );
  }
}
