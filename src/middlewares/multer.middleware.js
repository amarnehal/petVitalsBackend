import multer from "multer";
import path from "path";
import os from "os"; // Built-in Node module

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // os.tmpdir() returns '/tmp' on Linux/Vercel and the correct temp folder on Mac
    cb(null, os.tmpdir());
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${fileExtension}`);
  }
});
  
export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  } 
});
