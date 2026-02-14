import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, AlignmentType, HeadingLevel, WidthType } from "docx";
import { saveAs } from "file-saver";
import { Segment, Journal } from "../types";

export const exportToDocx = async (segments: Segment[], journal: Journal) => {
  // 安全检查：防止 segments 为空导致崩溃
  if (!segments || segments.length === 0) {
    console.error("没有可导出的段落数据");
    return;
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: segments.flatMap((seg) => { // 使用 flatMap 替代 map + flat
        // 1. 处理标题
        if (seg.type === 'title') {
          return new Paragraph({
            children: [new TextRun({ text: seg.content, bold: true, size: 32 })],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 },
          });
        }

        // 2. 处理表格 (三线表逻辑修复)
        if (seg.type === 'table' && seg.data && seg.data.length > 0) {
          const tableRows = seg.data.map((row, rowIndex) => {
            const isFirstRow = rowIndex === 0;
            const isLastRow = rowIndex === seg.data!.length - 1;

            return new TableRow({
              children: row.map((cell) => new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ text: cell || '', size: 21 })], 
                  alignment: AlignmentType.CENTER 
                })],
                borders: {
                  // 三线表：仅顶线、栏目线（首行下）、底线
                  top: isFirstRow ? { style: BorderStyle.SINGLE, size: 12 } : { style: BorderStyle.NONE },
                  bottom: (isFirstRow || isLastRow) ? { style: BorderStyle.SINGLE, size: 12 } : { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                }
              })),
            });
          });

          const tableElements = [];
          if (seg.caption) {
            tableElements.push(new Paragraph({
              children: [new TextRun({ text: seg.caption, bold: true })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 },
            }));
          }
          tableElements.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }));
          if (seg.source) {
            tableElements.push(new Paragraph({
              children: [new TextRun({ text: `来源：${seg.source}`, size: 18 })],
              alignment: AlignmentType.LEFT,
              spacing: { before: 200 },
            }));
          }
          return tableElements;
        }

        // 3. 处理正文 (增加默认值防止报错)
        return new Paragraph({
          children: [new TextRun({ 
            text: seg.content || '', 
            // 确保 font 是字符串，如果是 undefined 则不传
            font: typeof journal.rules.font === 'string' ? journal.rules.font : "宋体" 
          })],
          indent: { firstLine: 480 }, 
          spacing: { line: 360, before: 120, after: 120 },
        });
      }),
    }],
  });

  // 触发下载逻辑，增加错误捕获
  try {
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${journal.journal}_排版稿_${new Date().toLocaleDateString()}.docx`);
    console.log("Word 导出成功");
  } catch (error) {
    console.error("DOCX 生成失败:", error);
    alert("生成 Word 文档时出错，请检查控制台。");
  }
};