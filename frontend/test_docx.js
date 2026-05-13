const { Document, Paragraph, TextRun, Packer } = require("docx");

const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: "Hello World",
            font: "Times New Roman",
            size: 24,
          })
        ],
        indent: { firstLine: 720 },
        spacing: { line: 480 }
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => console.log("Success")).catch(e => console.error("Error:", e));
