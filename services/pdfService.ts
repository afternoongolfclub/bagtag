
import { Club, ClubStatus } from "../types.ts";

export const generatePDF = (clubs: Club[]) => {
  const globalJSPDF = (window as any).jspdf;
  
  if (!globalJSPDF) {
    alert("The PDF generator is still loading. Please try again in a moment.");
    return;
  }

  const { jsPDF } = globalJSPDF;
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(22, 101, 52); // Emerald 700
  doc.text("BagTag Inventory Report", 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);

  const tableColumn = ["Type", "Brand", "Model", "Specs", "Purchase Date", "Price"];

  const generateTable = (title: string, data: Club[], startY: number): number => {
    if (data.length === 0) return startY;
    
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text(title, 14, startY);

    const tableRows = data.map(club => [
      club.type,
      club.brand,
      club.model,
      `${club.loft ? club.loft + '° ' : ''}${club.shaftStiffness ? club.shaftStiffness : ''}`,
      club.purchaseDate || "—",
      club.price ? `$${club.price.toFixed(2)}` : "—",
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: startY + 5,
      headStyles: { fillColor: [22, 101, 52], fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    
    return (doc as any).lastAutoTable.finalY + 15;
  };

  const bagClubs = clubs.filter(c => c.status === ClubStatus.BAG);
  const lockerClubs = clubs.filter(c => c.status === ClubStatus.LOCKER);

  let currentY = 40;
  if (bagClubs.length > 0) currentY = generateTable("Current Bag", bagClubs, currentY);
  if (lockerClubs.length > 0) currentY = generateTable("Locker Room (Backup/Retired)", lockerClubs, currentY);

  doc.save(`BagTag_Inventory_${new Date().toISOString().split('T')[0]}.pdf`);
};
