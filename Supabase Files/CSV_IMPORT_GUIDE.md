# CSV Import Guide

## ✅ What's Been Added

### 1. **Working CSV Import Functionality**
- Click "Import CSV" button to upload a CSV file
- Automatically parses and imports contacts
- Shows success message with count of imported contacts
- Error handling for invalid files

### 2. **Fixed Example CSV Download**
- Now includes proper country codes (+91, +1, etc.)
- Shows both Indian and US phone number formats
- Ready-to-use example data

---

## 📋 CSV Format

### Required Format

Your CSV file should have these columns:

```csv
Name,Phone,Email
Rajesh Kumar,+919876543210,rajesh.kumar@example.com
Priya Sharma,+919876543211,priya.sharma@example.com
John Smith,+14155551234,john.smith@example.com
```

### Column Details

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| Name | ✅ Yes | Any text | Rajesh Kumar |
| Phone | ✅ Yes | **With country code** | +919876543210 |
| Email | ❌ No | Valid email | rajesh@example.com |

### Important: Phone Number Format

**✅ Correct Formats:**
- `+919876543210` (India)
- `+14155551234` (USA)
- `+447911123456` (UK)
- `+61412345678` (Australia)

**❌ Wrong Formats:**
- `9876543210` (missing country code)
- `1234567890` (missing country code)
- `91-9876543210` (no dashes)
- `+91 98765 43210` (no spaces)

---

## 🚀 How to Use

### Step 1: Download Example CSV
1. Go to **Contacts** page
2. Click **"Example CSV"** button
3. A file `contacts_example.csv` will download

### Step 2: Edit the CSV
1. Open the downloaded CSV in Excel/Google Sheets/Notepad
2. Replace example data with your contacts
3. **Make sure phone numbers include country codes!**
4. Save the file

### Step 3: Import Your CSV
1. Go to **Contacts** page
2. Click **"Import CSV"** button
3. Select your CSV file
4. Wait for "Successfully imported X contacts!" message
5. Your contacts appear in the table

---

## 📊 Example CSV Content

Here's what the downloaded example looks like:

```csv
Name,Phone,Email
Rajesh Kumar,+919876543210,rajesh.kumar@example.com
Priya Sharma,+919876543211,priya.sharma@example.com
Amit Patel,+919876543212,amit.patel@example.com
John Smith,+14155551234,john.smith@example.com
Sarah Johnson,+14155551235,sarah.johnson@example.com
```

### Creating Your Own CSV

You can create a CSV in:
- **Excel**: Save As → CSV (Comma delimited)
- **Google Sheets**: File → Download → CSV
- **Notepad**: Just type and save as `.csv`

---

## 🎯 Country Codes Reference

### Common Country Codes

| Country | Code | Example |
|---------|------|---------|
| 🇮🇳 India | +91 | +919876543210 |
| 🇺🇸 USA | +1 | +14155551234 |
| 🇬🇧 UK | +44 | +447911123456 |
| 🇨🇦 Canada | +1 | +14165551234 |
| 🇦🇺 Australia | +61 | +61412345678 |
| 🇦🇪 UAE | +971 | +971501234567 |
| 🇸🇬 Singapore | +65 | +6591234567 |
| 🇩🇪 Germany | +49 | +4915112345678 |
| 🇫🇷 France | +33 | +33612345678 |
| 🇯🇵 Japan | +81 | +819012345678 |

---

## 🔧 Features

### ✅ What Works

- ✅ **Upload CSV files** - Click button to select file
- ✅ **Auto-parsing** - Automatically reads and processes CSV
- ✅ **Multiple contacts** - Import hundreds at once
- ✅ **Success notification** - Shows count of imported contacts
- ✅ **Error handling** - Shows error if file is invalid
- ✅ **File type validation** - Only accepts .csv files
- ✅ **Empty field handling** - Email is optional

### 📝 Notes

- Duplicate detection is not implemented (will add duplicate contacts)
- Phone number format validation is not enforced (accepts any format)
- First row is treated as header and skipped
- Empty lines are automatically skipped

---

## ⚠️ Common Issues

### Issue: "Please upload a CSV file"
**Cause**: File doesn't end with `.csv`
**Solution**: Make sure your file has `.csv` extension

### Issue: "Error parsing CSV file"
**Cause**: Invalid CSV format (missing commas, quotes issues)
**Solution**: Check your CSV format, use example as template

### Issue: Contacts imported but phone numbers look wrong
**Cause**: Missing country codes in CSV
**Solution**: Add country codes (+91, +1, etc.) to all phone numbers

### Issue: Some contacts not imported
**Cause**: Rows missing Name or Phone
**Solution**: Both Name and Phone are required for each contact

---

## 💡 Pro Tips

### Tip 1: Use Example as Template
Always download the example CSV and use it as a template for your data

### Tip 2: Keep Backups
Before importing, keep a backup of your CSV file

### Tip 3: Test with Small File First
Try importing 5-10 contacts first to test the format

### Tip 4: Use Excel for Easy Editing
Excel makes it easy to manage large contact lists

### Tip 5: Standard Format
Keep all phone numbers in international format from the start

---

## 🎉 Example Workflow

### Real-World Example

1. **Download example**: Click "Example CSV"
2. **Open in Excel**: Double-click the downloaded file
3. **Replace data**:
   ```
   Name,Phone,Email
   Amit Sharma,+919876543210,amit@company.com
   Ravi Kumar,+919876543211,ravi@company.com
   Priya Singh,+919876543212,priya@company.com
   ```
4. **Save**: File → Save (keep CSV format)
5. **Import**: Click "Import CSV" in app
6. **Success**: "Successfully imported 3 contacts!"
7. **Verify**: See all contacts in the table

---

## 📝 CSV Format Details

### Valid CSV Examples

**Minimal (Name + Phone only):**
```csv
Name,Phone,Email
John Doe,+14155551234,
Jane Smith,+919876543210,
```

**Complete (All fields):**
```csv
Name,Phone,Email
John Doe,+14155551234,john@example.com
Jane Smith,+919876543210,jane@example.com
```

**With Quotes (if names/emails have commas):**
```csv
Name,Phone,Email
"Doe, John",+14155551234,john@example.com
"Smith, Jane",+919876543210,jane@example.com
```

---

## 🚀 What's Next

Future enhancements planned:
- Duplicate detection
- Phone number validation
- Preview before import
- Import progress bar
- Undo import functionality
- Export contacts to CSV

---

## ✨ Summary

- ✅ CSV import is **fully functional**
- ✅ Example CSV includes **proper country codes**
- ✅ Supports **India (+91)** and **US (+1)** formats
- ✅ **Easy to use** - just click and upload
- ✅ **Error handling** - shows helpful messages
- ✅ **Bulk import** - add hundreds of contacts at once

Happy importing! 🎉
