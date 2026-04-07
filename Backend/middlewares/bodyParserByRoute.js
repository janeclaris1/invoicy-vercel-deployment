const express = require("express");

const JSON_SMALL = "1mb";
const JSON_LARGE = "10mb";

const jsonSmall = express.json({ limit: JSON_SMALL });
const jsonLarge = express.json({ limit: JSON_LARGE });
const urlSmall = express.urlencoded({ extended: true, limit: JSON_SMALL });
const urlLarge = express.urlencoded({ extended: true, limit: JSON_LARGE });

/** Routes that may send large JSON (e.g. base64 images on items/invoices, profile logos). */
function useLargeBodyParser(req) {
    const p = (req.originalUrl || req.url || "").split("?")[0];
    if (/^\/api\/items(\/|$)/.test(p)) return true;
    if (/^\/api\/invoices(\/|$)/.test(p)) return true;
    if (/^\/api\/ai(\/|$)/.test(p)) return true;
    if (/^\/api\/auth\/me$/.test(p)) return true;
    return false;
}

function jsonBodyParser(req, res, next) {
    return (useLargeBodyParser(req) ? jsonLarge : jsonSmall)(req, res, next);
}

function urlencodedBodyParser(req, res, next) {
    return (useLargeBodyParser(req) ? urlLarge : urlSmall)(req, res, next);
}

module.exports = { jsonBodyParser, urlencodedBodyParser };
