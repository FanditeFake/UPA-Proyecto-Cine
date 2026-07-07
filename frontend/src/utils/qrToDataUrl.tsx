import { createRoot } from "react-dom/client";
import { QRCodeCanvas } from "qrcode.react";

export function qrToDataUrl(value: string, size = 240): Promise<string> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(<QRCodeCanvas value={value} size={size} includeMargin level="M" fgColor="#14100e" />);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const canvas = container.querySelector("canvas");
        const dataUrl = canvas ? canvas.toDataURL("image/png") : "";
        root.unmount();
        document.body.removeChild(container);
        resolve(dataUrl);
      });
    });
  });
}
