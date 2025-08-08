import { jsPDF } from "jspdf";

export const generateBonusPdf = (bonusTitle: string) => {
    const doc = new jsPDF();
    const page_width = doc.internal.pageSize.getWidth();

    // Set fonts and colors
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1A0F3C');
    
    // Header
    doc.setFontSize(28);
    doc.text("Vid Script Hub", page_width / 2, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor('#DAFF00');
    doc.text("EXCLUSIVE BONUS", page_width / 2, 28, { align: 'center' });
    doc.setDrawColor('#DAFF00');
    doc.setLineWidth(0.5);
    doc.line(20, 32, page_width - 20, 32);

    // Title (with wrapping)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1A0F3C');
    doc.setFontSize(20);
    const splitTitle = doc.splitTextToSize(bonusTitle, page_width - 40);
    doc.text(splitTitle, 20, 45);

    const titleHeight = splitTitle.length * 10; // Approximate height of title block
    const bodyY = 45 + titleHeight;

    // Body Text
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#333333');
    doc.setFontSize(12);
    const bodyText = `Thank you for your purchase! This is a placeholder for your bonus content. The real, value-packed PDF will be available here in your members area, containing expert insights and actionable strategies.`;
    const splitBody = doc.splitTextToSize(bodyText, page_width - 40);
    doc.text(splitBody, 20, bodyY);
    
    // Highlighted Box
    const boxY = bodyY + 30;
    doc.setFillColor('#f9f9f9');
    doc.setDrawColor('#DAFF00');
    doc.setLineWidth(1.5);
    doc.rect(20, boxY, page_width - 40, 45, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1A0F3C');
    doc.setFontSize(14);
    doc.text("In this guide, you will learn:", 25, boxY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor('#333333');
    doc.text("• Secret #1: Uncovering hidden opportunities in your niche.", 25, boxY + 20);
    doc.text("• Secret #2: The simple trick to double your engagement.", 25, boxY + 27);
    doc.text("• Secret #3: How to monetize your new audience effectively.", 25, boxY + 34);

    // Footer
    const footerY = boxY + 60;
    doc.setFontSize(10);
    doc.setTextColor('#777777');
    doc.text("Enjoy your bonus!", page_width / 2, footerY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text("- The Vid Script Hub Team", page_width / 2, footerY + 5, { align: 'center' });


    const filename = `${bonusTitle.replace(/ /g, '_')}_Bonus.pdf`;
    doc.save(filename);
};