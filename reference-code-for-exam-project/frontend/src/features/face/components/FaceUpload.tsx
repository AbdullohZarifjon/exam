export type UploadedFile = { file: File; name: string; objectUrl: string; imageBase64: string };

async function fileToSquareJpeg(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
    im.onerror = reject;
    im.src = url;
  });
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, sx, sy, side, side, 0, 0, 640, 640);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export async function processUploadedFiles(files: FileList | File[]): Promise<UploadedFile[]> {
  const out: UploadedFile[] = [];
  for (const file of Array.from(files)) {
    if (!file.type.startsWith("image/")) continue;
    const url = URL.createObjectURL(file);
    const imageBase64 = await fileToSquareJpeg(file);
    out.push({ file, name: file.name, objectUrl: url, imageBase64 });
  }
  return out;
}
