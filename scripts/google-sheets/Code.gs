/**
 * Optional WeThru submission-summary mirror.
 * Set WEBHOOK_SECRET in Apps Script project properties before deployment.
 * Bind this script to the destination spreadsheet and deploy it as a web app.
 */
function doPost(e) {
  try {
    var envelope = JSON.parse(e.postData.contents);
    var payload = envelope.payload;
    var signature = String(envelope.signature || "");
    var secret =
      PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");
    if (
      !secret ||
      !payload ||
      !safeEqual(signature, hmacHex(JSON.stringify(payload), secret))
    ) {
      return response({ ok: false, error: "unauthorized" });
    }

    var allowed = ["caseCode", "businessName", "submittedAt", "adminCaseUrl"];
    var unexpected = Object.keys(payload).filter(function (key) {
      return allowed.indexOf(key) === -1;
    });
    if (unexpected.length > 0)
      return response({ ok: false, error: "invalid_payload" });

    var sheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName("WeThru Cases");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("WeThru Cases");
      sheet.appendRow([
        "Case code",
        "Business name",
        "Submitted at",
        "Admin case URL",
        "Mirrored at",
      ]);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      safeCell(payload.caseCode),
      safeCell(payload.businessName),
      safeCell(payload.submittedAt),
      safeCell(payload.adminCaseUrl),
      new Date().toISOString(),
    ]);
    return response({ ok: true });
  } catch (error) {
    return response({ ok: false, error: "invalid_request" });
  }
}

function hmacHex(value, secret) {
  var bytes = Utilities.computeHmacSha256Signature(value, secret);
  return bytes
    .map(function (byte) {
      var normalized = byte < 0 ? byte + 256 : byte;
      return ("0" + normalized.toString(16)).slice(-2);
    })
    .join("");
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  var mismatch = 0;
  for (var i = 0; i < left.length; i += 1)
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

function safeCell(value) {
  var text = String(value || "");
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function response(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
