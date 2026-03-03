
import { ClubType } from '../types.ts';

interface BagMapRow {
  clubId: string;
  label: string;
  type: ClubType;
  loft: string;
  carry: number | undefined;
  total: number | undefined;
  ballSpeed: number | undefined;
  clubSpeed: number | undefined;
  spinRate: number | undefined;
  launchAngle: number | undefined;
  ironLabel?: string;
}

interface GapInfo {
  from: string;
  to: string;
  gap: number;
}

interface SummaryStats {
  longestCarry: number;
  shortestCarry: number;
  coverageRange: number;
  largestGap: number;
  problemGaps: GapInfo[];
}

export const generateBagMapPDF = (
  rows: BagMapRow[],
  gaps: GapInfo[],
  stats: SummaryStats
) => {
  const globalJSPDF = (window as any).jspdf;

  if (!globalJSPDF) {
    alert('The PDF generator is still loading. Please try again in a moment.');
    return;
  }

  const { jsPDF } = globalJSPDF;
  const doc = new jsPDF({ orientation: 'landscape' });

  // Header
  doc.setFontSize(22);
  doc.setTextColor(22, 101, 52);
  doc.text('BagTag - Bag Map Report', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);

  // Summary line
  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(
    `Coverage: ${stats.shortestCarry}y - ${stats.longestCarry}y  |  Range: ${stats.coverageRange}y  |  Largest Gap: ${stats.largestGap}y`,
    14,
    36
  );

  // Sort rows by carry distance descending for the PDF
  const sortedRows = [...rows].filter(r => r.carry != null && r.carry > 0).sort((a, b) => (b.carry || 0) - (a.carry || 0));

  // Build table data with gap rows interspersed
  const tableHead = [['Club', 'Type', 'Carry (y)', 'Total (y)', 'Gap', 'Ball Spd (mph)', 'Club Spd (mph)', 'Spin (rpm)', 'Launch (°)']];
  const tableBody: any[][] = [];

  for (let i = 0; i < sortedRows.length; i++) {
    const row = sortedRows[i];
    const gap = gaps.find(g => g.from === row.label);
    tableBody.push([
      row.label,
      row.type,
      row.carry != null ? `${row.carry}` : '—',
      row.total != null ? `${row.total}` : '—',
      gap ? `${gap.gap}y` : (i === sortedRows.length - 1 ? '—' : '—'),
      row.ballSpeed != null ? `${row.ballSpeed}` : '—',
      row.clubSpeed != null ? `${row.clubSpeed}` : '—',
      row.spinRate != null ? `${row.spinRate}` : '—',
      row.launchAngle != null ? `${row.launchAngle}` : '—',
    ]);
  }

  // Also add rows with no carry data at the bottom
  const noCarryRows = rows.filter(r => r.carry == null || r.carry === 0);
  for (const row of noCarryRows) {
    tableBody.push([
      row.label,
      row.type,
      '—',
      '—',
      '—',
      row.ballSpeed != null ? `${row.ballSpeed}` : '—',
      row.clubSpeed != null ? `${row.clubSpeed}` : '—',
      row.spinRate != null ? `${row.spinRate}` : '—',
      row.launchAngle != null ? `${row.launchAngle}` : '—',
    ]);
  }

  (doc as any).autoTable({
    head: tableHead,
    body: tableBody,
    startY: 42,
    headStyles: { fillColor: [22, 101, 52], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 28 },
      4: { fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      // Color-code gap column
      if (data.column.index === 4 && data.section === 'body') {
        const val = parseInt(data.cell.raw);
        if (!isNaN(val)) {
          if (val > 20) {
            data.cell.styles.textColor = [185, 28, 28]; // red
            data.cell.styles.fillColor = [254, 242, 242];
          } else if (val < 5) {
            data.cell.styles.textColor = [185, 28, 28]; // red overlap
            data.cell.styles.fillColor = [254, 242, 242];
          } else if (val > 15) {
            data.cell.styles.textColor = [161, 98, 7]; // yellow
            data.cell.styles.fillColor = [254, 252, 232];
          } else {
            data.cell.styles.textColor = [22, 101, 52]; // green
            data.cell.styles.fillColor = [240, 253, 244];
          }
        }
      }
    },
  });

  // Problem gaps section
  const finalY = (doc as any).lastAutoTable.finalY;
  if (stats.problemGaps.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(185, 28, 28);
    doc.text('Flagged Gaps:', 14, finalY + 12);

    doc.setFontSize(9);
    doc.setTextColor(80);
    stats.problemGaps.forEach((g, i) => {
      const label = g.gap > 20 ? 'COVERAGE GAP' : 'OVERLAP';
      doc.text(`${label}: ${g.gap}y between ${g.from} and ${g.to}`, 20, finalY + 20 + i * 6);
    });
  }

  doc.save(`BagTag_BagMap_${new Date().toISOString().split('T')[0]}.pdf`);
};
