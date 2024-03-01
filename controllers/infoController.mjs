import Info from "../models/info.mjs";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { fileURLToPath } from 'url';
import path from "path";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadPath = path.join(__dirname, '../uploads');

// Cấu hình Multer để lưu ảnh QR code vào thư mục uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function(req, file, cb) {
        cb(null, `qrcode_${req.body.phone}.png`); // Lưu ảnh QR code với tên là số điện thoại của người dùng
    }
});

const uploadQRCode = multer({ storage: storage }).single('dummyField'); // dummyField là tên field trong form nếu bạn gửi tệp lên

// Hàm thêm thông tin và gửi email mời thanh toán
const addInfo = async (req, res) => {
    try {
        const info = new Info(req.body);
        await info.save();

        // Xác định giá tương ứng với loại ticket
        let ticketPrice = 0;
        switch (info.ticket) {
            case "VIP":
                ticketPrice = 4500000;
                break;
            case "Diamond":
                ticketPrice = 5000000;
                break;
            case "Pretium":
                ticketPrice = 6000000;
                break;
            default:
                ticketPrice = 0;
                break;
        }

        // Gửi email mời thanh toán kèm thông tin giá
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: req.body.email,
            subject: "Đăng Ký Thành Công",
            html: `<p>Xin chào ${req.body.name},</p> </br>
                   <p>Cảm ơn bạn đã đăng ký. Vui lòng thanh toán ${ticketPrice.toLocaleString()} VNĐ để hoàn tất quá trình đăng ký.</p>`,
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully.");

        res.status(200).send({ message: "Email đăng ký thành công đã được gửi." });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: "Server error", error });
    }
};

const sendGiftEmail = async (email, ticketType) => {
    try {
        let giftMessage = "";

        // Xây dựng nội dung email quà tặng dựa trên loại ticket
        switch (ticketType) {
            case "VIP":
                giftMessage = "Chúc mừng! Bạn đã nhận được ưu đãi đặc biệt từ chúng tôi với loại vé VIP.";
                break;
            case "Diamond":
                giftMessage = "Chúc mừng! Bạn đã nhận được ưu đãi đặc biệt từ chúng tôi với loại vé Diamond.";
                break;
            case "Pretium":
                giftMessage = "Chúc mừng! Bạn đã nhận được ưu đãi đặc biệt từ chúng tôi với loại vé Pretium.";
                break;
            default:
                giftMessage = "Chúc mừng! Bạn đã nhận được một quà tặng từ chúng tôi.";
                break;
        }

        // Gửi email quà tặng
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Quà tặng đặc biệt từ chúng tôi",
            html: `<p>Xin chào,</p>
                   <p>${giftMessage}</p>`,
        };

        await transporter.sendMail(mailOptions);
        console.log("Email quà tặng đã được gửi.");
    } catch (error) {
        console.error("Error sending gift email:", error);
        throw error;
    }
};

// Hàm xác nhận thanh toán và gửi ảnh QR code
const confirmPayment = async (req, res) => {
    try {
        const info = await Info.findById(req.params.infoId);
        if (!info) {
            return res.status(404).send({ message: "Không tìm thấy thông tin." });
        }

        // Tạo dữ liệu QR code từ thông tin của người dùng
        const qrText = `Tên: ${info.name}\nEmail: ${info.email}\nSố điện thoại: ${info.phone}\nMệnh giá: ${info.ticket}`;

        // Tạo QR code và lưu vào thư mục uploads
        const qrCodePath = path.join(uploadPath, `qrcode_${info.phone}.png`);
        await QRCode.toFile(qrCodePath, qrText);

        // Cập nhật trạng thái thanh toán
        info.checked = true;
        await info.save();

        // Gửi email xác nhận thanh toán
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: info.email,
            subject: "Xác Nhận Thanh Toán",
            html: `<p>Xin chào ${info.name},</p>
                   <p>Thanh toán của bạn đã được xác nhận. Vui lòng kiểm tra đính kèm để xem thông tin chi tiết.</p>`,
            attachments: [{
                filename: `qrcode_${info.phone}.png`,
                path: qrCodePath
            }]
        };

        await transporter.sendMail(mailOptions);
        console.log("Email xác nhận thanh toán đã được gửi.");

        // Gửi email quà tặng sau 30 giây
        setTimeout(async () => {
            try {
                await sendGiftEmail(info.email, info.ticket);

                // Sau khi gửi quà tặng, tính toán countdown và gửi email countdown
                const currentDate = new Date();
                const eventDate = new Date("2024-03-10T08:00:00Z");
                const timeDiff = eventDate - currentDate;
                const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                const hoursLeft = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                const countdownMailOptions = {
                    from: process.env.EMAIL,
                    to: info.email,
                    subject: "Countdown đến sự kiện",
                    html: `<p>Xin chào ${info.name},</p>
                           <p>Còn ${daysLeft} ngày ${hoursLeft} giờ nữa là đến sự kiện. Hãy chuẩn bị sẵn sàng!</p>`
                };

                await transporter.sendMail(countdownMailOptions);
                console.log("Email countdown đã được gửi.");
            } catch (error) {
                console.error("Error sending gift email or countdown email:", error);
            }
        }, 30000); // 30 giây

        res.status(200).send({ message: "Email xác nhận thanh toán đã được gửi." });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: "Server error", error });
    }
};

// const confirmPayment = async (req, res) => {
//     try {
//         const info = await Info.findById(req.params.infoId);
//         if (!info) {
//             return res.status(404).send({ message: "Không tìm thấy thông tin." });
//         }

//         // Tạo dữ liệu QR code từ thông tin của người dùng
//         const qrText = `Tên: ${info.name}\nEmail: ${info.email}\nSố điện thoại: ${info.phone}\nMệnh giá: ${info.ticket}`;

//         // Tạo QR code và lưu vào thư mục uploads
//         const qrCodePath = path.join(uploadPath, `qrcode_${info.phone}.png`);
//         await QRCode.toFile(qrCodePath, qrText);

//         // Cập nhật trạng thái thanh toán
//         info.checked = true;
//         await info.save();

//         // Gửi email xác nhận thanh toán
//         const transporter = nodemailer.createTransport({
//             service: "gmail",
//             auth: {
//                 user: process.env.EMAIL,
//                 pass: process.env.EMAIL_PASSWORD,
//             },
//         });

//         const mailOptions = {
//             from: process.env.EMAIL,
//             to: info.email,
//             subject: "Xác Nhận Thanh Toán",
//             html: `<p>Xin chào ${info.name},</p>
//                    <p>Thanh toán của bạn đã được xác nhận. Vui lòng kiểm tra đính kèm để xem thông tin chi tiết.</p>`,
//             attachments: [{
//                 filename: `qrcode_${info.phone}.png`,
//                 path: qrCodePath
//             }]
//         };

//         await transporter.sendMail(mailOptions);
//         console.log("Email xác nhận thanh toán đã được gửi.");

//         // Gửi email quà tặng sau 30 giây
//         setTimeout(async () => {
//             try {
//                 await sendGiftEmail(info.email, info.ticket);

//                 // Tính toán các mốc thời gian
//                 const currentDate = new Date();
//                 const eventDate = new Date("2024-03-10T08:00:00Z");
//                 const timeDiff = eventDate - currentDate;
//                 const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
//                 const hoursLeft = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//                 const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

//                 // Kiểm tra và gửi email countdown
//                 if (daysLeft === 3 || daysLeft === 1 || (daysLeft === 0 && hoursLeft === 0 && minutesLeft === 30)) {
//                     const countdownMailOptions = {
//                         from: process.env.EMAIL,
//                         to: info.email,
//                         subject: "Countdown đến sự kiện",
//                         html: `<p>Xin chào ${info.name},</p>
//                                <p>Còn ${daysLeft} ngày ${hoursLeft} giờ ${minutesLeft} phút nữa là đến sự kiện. Hãy chuẩn bị sẵn sàng!</p>`
//                     };

//                     await transporter.sendMail(countdownMailOptions);
//                     console.log("Email countdown đã được gửi.");
//                 }
//             } catch (error) {
//                 console.error("Error sending gift email or countdown email:", error);
//             }
//         }, 30000); // 30 giây

//         res.status(200).send({ message: "Email xác nhận thanh toán đã được gửi." });
//     } catch (error) {
//         console.error("Server error:", error);
//         res.status(500).send({ message: "Server error", error });
//     }
// };


const getAllInfo = async (req, res) => {
    try {
        // Sử dụng phương thức find() của model để lấy tất cả thông tin từ cơ sở dữ liệu
        const allInfo = await Info.find();

        // Trả về kết quả cho client
        res.status(200).send(allInfo);
    } catch (error) {
        // Xử lý lỗi nếu có
        console.error("Server error:", error);
        res.status(500).send({ message: "Server error", error });
    }
};

export { addInfo, confirmPayment , getAllInfo };
