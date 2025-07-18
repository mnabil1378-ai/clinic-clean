const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const bookingsFile = path.join(__dirname, "data", "bookings.txt");
const notesDir = path.join(__dirname, "notes");
if (!fs.existsSync(notesDir)) {
  fs.mkdirSync(notesDir);
}

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "clinic_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// إنشاء مجلد data إذا لم يكن موجودًا
if (!fs.existsSync(path.join(__dirname, "data"))) {
  fs.mkdirSync(path.join(__dirname, "data"));
}

// إنشاء ملف bookings.txt إذا لم يكن موجودًا
if (!fs.existsSync(bookingsFile)) {
  fs.writeFileSync(bookingsFile, "");
}

// حفظ حجز جديد مع التحقق من التكرار
app.post("/submit-booking", (req, res) => {
  const { name, phone, date, time } = req.body;
  const price = "150 جنيه";
  const note = "";

  const booking = { name, phone, date, time, price, note };
  const line = JSON.stringify(booking) + "\n";

  fs.readFile(bookingsFile, "utf8", (err, data) => {
    if (err) return res.status(500).json({ success: false, message: "خطأ في قراءة الملف" });

    const existingBookings = data.trim().split("\n").filter(Boolean).map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(b => b);

    const isDuplicate = existingBookings.some(b => b.phone === phone && b.date === date);
    if (isDuplicate) {
      return res.json({ success: false, message: "❌ الحجز مكرر بالفعل" });
    }

    fs.appendFile(bookingsFile, line, (err) => {
      if (err) return res.status(500).json({ success: false, message: "حدث خطأ في الحفظ" });

      return res.json({ success: true, message: "✅ تم حفظ الحجز بنجاح" });
    });
  });
});
app.post("/add-note", (req, res) => {
  const { phone, note } = req.body;
  const filePath = path.join(notesDir, `${phone}.txt`);
  const line = `[${new Date().toLocaleString()}] ${note}\n`;

  fs.appendFile(filePath, line, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "خطأ في حفظ الملاحظة" });
    }
    res.json({ success: true, message: "✅ تم حفظ الملاحظة" });
  });
});

// حذف حجز
app.post("/delete-booking", (req, res) => {
  const { phone, date } = req.body;

  fs.readFile(bookingsFile, "utf8", (err, data) => {
    if (err) return res.json({ success: false, error: "خطأ في قراءة الملف" });

    const lines = data.trim().split("\n");
    const filtered = lines.filter((line) => {
      try {
        const booking = JSON.parse(line);
        return !(booking.phone === phone && booking.date === date);
      } catch {
        return true;
      }
    });

    fs.writeFile(bookingsFile, filtered.join("\n") + "\n", (err) => {
      if (err) return res.json({ success: false, error: "خطأ في الحذف" });
      res.json({ success: true });
    });
  });
});

// إظهار كل الحجوزات
app.get("/patient-visits/all", (req, res) => {
  fs.readFile(bookingsFile, "utf8", (err, data) => {
    if (err) return res.status(500).send("خطأ في القراءة");

    const lines = data.trim().split("\n");
    const bookings = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(b => b);

    res.json(bookings);
  });
});
app.post("/update-booking", (req, res) => {
  const { old, updated } = req.body;

  fs.readFile(bookingsFile, "utf8", (err, data) => {
    if (err) return res.status(500).json({ success: false, message: "❌ خطأ في قراءة الملف" });

    const lines = data.trim().split("\n").filter(Boolean);
    const bookings = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(b => b);

    const updatedList = bookings.map(b => {
      return (b.phone === old.phone && b.date === old.date) ? {
        ...updated,
        price: b.price || "150 جنيه",
        note: b.note || ""
      } : b;
    });

    const newData = updatedList.map(b => JSON.stringify(b)).join("\n") + "\n";

    fs.writeFile(bookingsFile, newData, (err) => {
      if (err) return res.status(500).json({ success: false, message: "❌ خطأ في حفظ التعديل" });
      res.json({ success: true, message: "✅ تم تعديل الحجز بنجاح" });
    });
  });
});
app.get("/get-notes/:phone", (req, res) => {
  const phone = req.params.phone;
  const filePath = path.join(notesDir, `${phone}.txt`);

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      // لو الملف مش موجود أو فاضي، نرجّع ملاحظات فارغة
      return res.json({ success: true, notes: [] });
    }

    // فصل الملاحظات إلى سطور
    const notesArray = data.trim().split("\n");
    res.json({ success: true, notes: notesArray });
  });
});
app.post("/update-note", (req, res) => {
  const { phone, date, note } = req.body;

  fs.readFile(bookingsFile, "utf8", (err, data) => {
    if (err) return res.status(500).json({ success: false });

    const lines = data.trim().split("\n");
    const updated = lines.map((line) => {
      try {
        const booking = JSON.parse(line);
        if (booking.phone === phone && booking.date === date) {
          booking.note = note;
        }
        return JSON.stringify(booking);
      } catch {
        return line;
      }
    });

    fs.writeFile(bookingsFile, updated.join("\n") + "\n", (err) => {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
    });
  });
});
// مسار لحساب إجمالي الإيرادات
app.get("/total-revenue", (req, res) => {
  fs.readFile(bookingsFile, "utf8", (err, data) => {
    if (err) return res.status(500).json({ success: false, message: "خطأ في قراءة الملف" });

    const lines = data.trim().split("\n");
    let total = 0;

    lines.forEach(line => {
      try {
        const booking = JSON.parse(line);
        const price = parseInt(booking.price.replace(/[^\d]/g, ""));
        total += isNaN(price) ? 0 : price;
      } catch { }
    });

    res.json({ success: true, total });
  });
});
app.get("/stats/revenue", (req, res) => {
  fs.readFile(bookingsFile, "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "خطأ في قراءة الملف" });

    const lines = data.trim().split("\n");
    const validBookings = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(b => b);

    const totalRevenue = validBookings.length * 150; // 150 جنيه لكل حجز
    res.json({ revenue: totalRevenue });
  });
});

app.listen(PORT, () => {
  console.log(`✅ السيرفر يعمل على http://localhost:${PORT}`);
});
