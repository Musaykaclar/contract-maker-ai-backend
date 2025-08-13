const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

Parse.Cloud.define("sendContractByEmail", async (req) => {
  const { threadId, content, signature, email } = req.params;

  if (!email || !content) {
    throw new Error("Eksik parametre");
  }

  const buffers = [];
  const doc = new PDFDocument();

  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", async () => {
    const pdfData = Buffer.concat(buffers);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "youremail@gmail.com",
        pass: "your-app-password"
      }
    });

    await transporter.sendMail({
      from: "aykaclarmusa@gmail.com",
      to: email,
      subject: "Sözleşme PDF",
      text: "Ekte sözleşmeniz yer almaktadır.",
      attachments: [{ filename: "sozlesme.pdf", content: pdfData }]
    });
  });

  doc.fontSize(12).text(content);

  if (signature) {
    const base64Data = signature.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    doc.addPage();
    doc.fontSize(14).text("İmza:", { align: "left" });
    doc.image(buffer, { fit: [200, 100], align: "left" });
  }

  doc.end();

  return { success: true };
});
