const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

// ✅ استلام بيانات الحجز
app.post('/submit-booking', (req, res) => {
  const { name, phone, date, time } = req.body;

  const bookingDetails = `
==========================
✅ تم استلام حجز جديد:
👶 الاسم: ${name}
📞 رقم الهاتف: ${phone}
📅 تاريخ الحجز: ${date}
⏰ الوقت: ${time}
💰 قيمة الكشف: 150 جنيه
==========================\n`;

  fs.appendFile('bookings.txt', bookingDetails, err => {
    if (err) return res.status(500).send("❌ خطأ أثناء حفظ الحجز");
    res.send("✅ تم استلام بيانات الحجز بنجاح!");
  });
});

// ✅ عرض سجل زيارات مريض بناء على رقم الهاتف
app.get('/patient-visits/:phone', (req, res) => {
  const phone = req.params.phone;

  fs.readFile('bookings.txt', 'utf8', (err, data) => {
    if (err) return res.status(500).send('❌ خطأ أثناء قراءة الملف');

    const entries = data
      .split('==========================')
      .map(entry => entry.trim())
      .filter(entry => entry.includes(`📞 رقم الهاتف: ${phone}`));

    res.json(entries);
  });
});

// ✅ عرض كل الحجوزات للإدارة (تصفية الحجوزات فقط)
app.get('/patient-visits/all', (req, res) => {
  fs.readFile('bookings.txt', 'utf8', (err, data) => {
    if (err) return res.status(500).send('❌ خطأ أثناء قراءة الملف');

    const entries = data
      .split('==========================')
      .map(entry => entry.trim())
      .filter(entry =>
        entry.includes("👶 الاسم:") &&
        entry.includes("📞 رقم الهاتف:") &&
        entry.includes("📅 تاريخ الحجز:") &&
        entry.includes("⏰ الوقت:") &&
        entry.includes("💰 قيمة الكشف")
      );

    res.json(entries);
  });
});

// ✅ حفظ ملاحظة الطبيب
app.post('/save-note', (req, res) => {
  const { phone, date, note } = req.body;

  fs.readFile('bookings.txt', 'utf8', (err, data) => {
    if (err) return res.status(500).send('❌ خطأ أثناء قراءة الملف');

    const sections = data.split('==========================');
    const updatedSections = sections.map(section => {
      if (
        section.includes(`📞 رقم الهاتف: ${phone}`) &&
        section.includes(`📅 تاريخ الحجز: ${date}`)
      ) {
        section = section.replace(/📝 ملاحظة الطبيب:.*(\n)?/, '');
        return section.trim() + `\n📝 ملاحظة الطبيب: ${note}\n`;
      }
      return section;
    });

    const finalData = updatedSections
      .map(entry => '==========================\n' + entry.trim() + '\n==========================')
      .join('\n');

    fs.writeFile('bookings.txt', finalData, err => {
      if (err) return res.status(500).send('❌ خطأ أثناء حفظ الملاحظة');
      res.send('✅ تم حفظ الملاحظة بنجاح!');
    });
  });
});

// ✅ تعديل بيانات حجز
app.post('/edit-booking', (req, res) => {
  const { oldPhone, oldDate, newName, newPhone, newDate, newTime } = req.body;

  fs.readFile('bookings.txt', 'utf8', (err, data) => {
    if (err) return res.status(500).send('❌ خطأ أثناء قراءة الملف');

    const entries = data.split('==========================');
    const updatedEntries = entries.map(entry => {
      if (entry.includes(`📞 رقم الهاتف: ${oldPhone}`) && entry.includes(`📅 تاريخ الحجز: ${oldDate}`)) {
        return `
✅ تم استلام حجز جديد:
👶 الاسم: ${newName}
📞 رقم الهاتف: ${newPhone}
📅 تاريخ الحجز: ${newDate}
⏰ الوقت: ${newTime}
💰 قيمة الكشف: 150 جنيه
`;
      }
      return entry;
    });

    const finalData = updatedEntries
      .map(e => '==========================\n' + e.trim() + '\n==========================')
      .join('\n');

    fs.writeFile('bookings.txt', finalData, err => {
      if (err) return res.status(500).send('❌ خطأ أثناء التعديل');
      res.send('✅ تم تعديل الحجز بنجاح!');
    });
  });
});

// ✅ حذف حجز
app.post('/delete-booking', (req, res) => {
  const { phone, date } = req.body;

  fs.readFile('bookings.txt', 'utf8', (err, data) => {
    if (err) return res.status(500).send('❌ خطأ أثناء قراءة الملف');

    const entries = data.split('==========================');
    const filteredEntries = entries.filter(entry => {
      return !(entry.includes(`📞 رقم الهاتف: ${phone}`) && entry.includes(`📅 تاريخ الحجز: ${date}`));
    });

    const finalData = filteredEntries
      .map(e => '==========================\n' + e.trim() + '\n==========================')
      .join('\n');

    fs.writeFile('bookings.txt', finalData, err => {
      if (err) return res.status(500).send('❌ خطأ أثناء الحذف');
      res.send('✅ تم حذف الحجز بنجاح!');
    });
  });
});

// ✅ تشغيل السيرفر
app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});
