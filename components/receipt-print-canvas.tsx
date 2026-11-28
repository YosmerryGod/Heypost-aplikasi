// [ADDED] Satu sumber tata letak untuk cetak otomatis, cetak ulang, dan pratinjau struk.
import React, { forwardRef } from "react";
import Svg, { Image as SvgImage, Line as SvgLine, Text as SvgText } from "react-native-svg";

type Item = { productName: string; quantity: number; unitPrice: number; subtotal: number };
type Settings = { showLogo?: boolean; showStoreName?: boolean; showOutletName?: boolean; showAddress?: boolean; showWhatsapp?: boolean; showCashier?: boolean; showCustomer?: boolean; showHeyPostWatermark?: boolean; footerMessage?: string | null };
type Props = {
  invoiceNumber: string; createdAt: Date | string; cashierName: string; customerName?: string | null;
  orderType: string; paymentMethod: string; subtotal: number; discount: number; total: number; items: Item[];
  storeName?: string | null; outletName?: string | null; logoUrl?: string | null; address?: string | null;
  whatsapp?: string | null; settings?: Settings | null;
};
const money = (n: number) => "Rp" + Math.round(n).toLocaleString("id-ID");
const wrap = (value: string, max: number) => {
  const result: string[] = [];
  let line = "";
  for (const word of value.trim().split(/\\s+/).filter(Boolean)) {
    if (!line) line = word;
    else if ((line + " " + word).length <= max) line += " " + word;
    else { result.push(line); line = word; }
  }
  if (line) result.push(line);
  return result.length ? result : [""];
};
const ReceiptPrintCanvas = forwardRef<Svg, Props>((p, ref) => {
  const s = p.settings;
  const on = (key: keyof Settings) => s?.[key] !== false;
  const logo = on("showLogo") ? p.logoUrl : null;
  const footer = wrap(s?.footerMessage?.trim() || "Terima Kasih Sudah Pesan", 34);
  const info = [
    ["No. Transaksi", p.invoiceNumber], ["Tanggal", new Date(p.createdAt).toLocaleString("id-ID")],
    ...(on("showCashier") ? [["Kasir", p.cashierName]] : []),
    ...(on("showCustomer") ? [["Pelanggan", p.customerName || "Pelanggan toko"]] : []),
    ["Tipe pesanan", p.orderType], ["Pembayaran", p.paymentMethod],
  ];
  let y = 112;
  const infoNodes = info.map(([label, value]) => {
    const at = y;
    const lines = wrap(value, 22);
    y += Math.max(27, lines.length * 21) + 4;
    return <React.Fragment key={label}>
      <SvgText x="20" y={at} fontSize="16" fill="#444444">{label}</SvgText>
      {lines.map((line, i) => <SvgText key={i} x="364" y={at + i * 21} fontSize="16" fontWeight="bold" textAnchor="end" fill="#111111">{line}</SvgText>)}
    </React.Fragment>;
  });
  const infoEnd = y + 5;
  const heading = infoEnd + 34;
  y = heading + 35;
  const itemNodes = p.items.map((item, i) => {
    const at = y;
    const names = wrap(item.productName, 32);
    const detail = at + names.length * 21 + 1;
    y = detail + 29;
    return <React.Fragment key={item.productName + i}>
      {names.map((line, j) => <SvgText key={j} x="20" y={at + j * 21} fontSize="16" fontWeight="bold" fill="#111111">{line}</SvgText>)}
      <SvgText x="20" y={detail} fontSize="14" fill="#555555">{item.quantity} x {money(item.unitPrice)}</SvgText>
      <SvgText x="364" y={detail} fontSize="16" fontWeight="bold" textAnchor="end" fill="#111111">{money(item.subtotal)}</SvgText>
    </React.Fragment>;
  });
  const itemEnd = y + 2;
  const subtotalY = itemEnd + 31;
  const discountY = subtotalY + 29;
  const totalY = subtotalY + (p.discount > 0 ? 66 : 39);
  const totalEnd = totalY + 22;
  y = totalEnd + 29;
  const footerNodes: React.ReactNode[] = [];
  if (on("showAddress") && p.address) for (const line of wrap(p.address, 36)) { footerNodes.push(<SvgText key={"address" + footerNodes.length} x="192" y={y} fontSize="13" textAnchor="middle" fill="#333333">{line}</SvgText>); y += 19; }
  if (on("showWhatsapp") && p.whatsapp) { footerNodes.push(<SvgText key="whatsapp" x="192" y={y} fontSize="13" textAnchor="middle" fill="#333333">{p.whatsapp}</SvgText>); y += 22; }
  footer.forEach(line => { footerNodes.push(<SvgText key={"footer" + footerNodes.length} x="192" y={y} fontSize="15" fontWeight="bold" textAnchor="middle" fill="#111111">{line}</SvgText>); y += 21; });
  if (on("showHeyPostWatermark")) { footerNodes.push(<SvgText key="watermark" x="192" y={y + 8} fontSize="14" textAnchor="middle" fill="#777777">Powered by HeyPost</SvgText>); y += 28; }
  const height = y + 18;
  const headerX = logo ? 112 : 20;
  const storeLines = on("showStoreName") ? wrap(p.storeName || "Nama toko", 25) : [];
  const outletLines = on("showOutletName") ? wrap(p.outletName || "Nama outlet", 30) : [];
  return <Svg ref={ref} width={384} height={height} viewBox={"0 0 384 " + height}>
    {logo ? <SvgImage href={{ uri: logo }} x="18" y="8" width="82" height="82" preserveAspectRatio="xMidYMid meet" /> : null}
    {storeLines.map((line, i) => <SvgText key={i} x={headerX} y={39 + i * 21} fontSize="18" fontWeight="bold" fill="#111111">{line}</SvgText>)}
    {outletLines.map((line, i) => <SvgText key={i} x={headerX} y={66 + storeLines.length * 18 + i * 19} fontSize="15" fill="#333333">{line}</SvgText>)}
    <SvgLine x1="18" y1="105" x2="366" y2="105" stroke="#777777" strokeWidth="1" strokeDasharray="5 5" />
    {infoNodes}
    <SvgLine x1="18" y1={infoEnd} x2="366" y2={infoEnd} stroke="#777777" strokeWidth="1" strokeDasharray="5 5" />
    <SvgText x="192" y={heading} fontSize="19" fontWeight="bold" textAnchor="middle" fill="#111111">DETAIL PESANAN</SvgText>
    {itemNodes}
    <SvgLine x1="18" y1={itemEnd} x2="366" y2={itemEnd} stroke="#777777" strokeWidth="1" strokeDasharray="5 5" />
    <SvgText x="20" y={subtotalY} fontSize="16" fill="#444444">Subtotal</SvgText><SvgText x="364" y={subtotalY} fontSize="16" fontWeight="bold" textAnchor="end" fill="#111111">{money(p.subtotal)}</SvgText>
    {p.discount > 0 ? <><SvgText x="20" y={discountY} fontSize="15" fill="#444444">Diskon</SvgText><SvgText x="364" y={discountY} fontSize="15" fontWeight="bold" textAnchor="end" fill="#111111">-{money(p.discount)}</SvgText></> : null}
    <SvgText x="20" y={totalY} fontSize="20" fontWeight="bold" fill="#222222">TOTAL</SvgText><SvgText x="364" y={totalY} fontSize="22" fontWeight="bold" textAnchor="end" fill="#111111">{money(p.total)}</SvgText>
    <SvgLine x1="18" y1={totalEnd} x2="366" y2={totalEnd} stroke="#777777" strokeWidth="1" strokeDasharray="5 5" />
    {footerNodes}
  </Svg>;
});
ReceiptPrintCanvas.displayName = "ReceiptPrintCanvas";
export default ReceiptPrintCanvas;
