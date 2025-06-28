"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchUnreadEmails = fetchUnreadEmails;
var imap_simple_1 = require("imap-simple");
var mailparser_1 = require("mailparser");
var dotenv = require("dotenv");
dotenv.config();
var config = {
    imap: {
        user: 'toddr.spencer@icloud.com',
        password: process.env.ICLOUD_APP_PASSWORD,
        host: 'imap.mail.me.com',
        port: 993,
        tls: true,
        authTimeout: 10000,
        tlsOptions: {
            servername: 'imap.mail.me.com',
            rejectUnauthorized: false
        }
    }
};
// 🧠 Pre-LLM keyword-based categorization (basic intent matching)
function classifyIntent(text) {
    var lowered = text.toLowerCase();
    if (lowered.includes('calendar') || lowered.match(/\b(meeting|appointment|schedule|event)\b/))
        return 'calendar_event';
    if (lowered.includes('unsubscribe') || lowered.includes('marketing'))
        return 'marketing';
    if (lowered.includes('invoice') || lowered.includes('payment'))
        return 'finance';
    if (lowered.includes('attachment') || lowered.includes('.pdf'))
        return 'document';
    if (lowered.includes('urgent') || lowered.includes('asap'))
        return 'important';
    return 'general';
}
// 🧹 Basic unimportance logic
function isUnimportant(email) {
    var lowPrioritySenders = ['newsletter', 'noreply', 'no-reply'];
    return lowPrioritySenders.some(function (tag) { return email.from.toLowerCase().includes(tag); }) ||
        email.subject.toLowerCase().includes('sale') ||
        email.intent === 'marketing';
}
// 📥 Main email fetch + extraction (only emails from last 24 hours)
function fetchUnreadEmails() {
    return __awaiter(this, void 0, void 0, function () {
        var connection, searchCriteria, fetchOptions, results, twentyFourHoursAgo_1, filteredResults, emails, err_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, imap_simple_1.default.connect({ imap: config.imap })];
                case 1:
                    connection = _a.sent();
                    return [4 /*yield*/, connection.openBox('INBOX')];
                case 2:
                    _a.sent();
                    searchCriteria = ['UNSEEN'];
                    fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true, markSeen: false };
                    return [4 /*yield*/, connection.search(searchCriteria, fetchOptions)];
                case 3:
                    results = _a.sent();
                    twentyFourHoursAgo_1 = Date.now() - 24 * 60 * 60 * 1000;
                    filteredResults = results.filter(function (res) {
                        var headerPart = res.parts.find(function (p) { return p.which === 'HEADER'; });
                        if (!(headerPart === null || headerPart === void 0 ? void 0 : headerPart.body) || typeof headerPart.body !== 'string')
                            return false;
                        var dateMatch = headerPart.body.match(/Date: (.+)/i);
                        if (!dateMatch)
                            return false;
                        var parsedDate = new Date(dateMatch[1]);
                        return !isNaN(parsedDate.getTime()) && parsedDate.getTime() >= twentyFourHoursAgo_1;
                    });
                    return [4 /*yield*/, Promise.all(filteredResults.map(function (res) { return __awaiter(_this, void 0, void 0, function () {
                            var part, parsed, attachments, email;
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        part = res.parts.find(function (p) { return p.which === 'TEXT'; });
                                        if (!part || !part.body || typeof part.body !== 'string') {
                                            console.warn('⚠️ Skipping malformed email part:', part);
                                            return [2 /*return*/, null];
                                        }
                                        return [4 /*yield*/, (0, mailparser_1.simpleParser)(part.body)];
                                    case 1:
                                        parsed = _c.sent();
                                        attachments = ((_a = parsed.attachments) === null || _a === void 0 ? void 0 : _a.map(function (att) { return ({
                                            filename: att.filename,
                                            contentType: att.contentType,
                                            size: att.size
                                        }); })) || [];
                                        email = {
                                            from: ((_b = parsed.from) === null || _b === void 0 ? void 0 : _b.text) || '',
                                            subject: parsed.subject || '',
                                            date: parsed.date || '',
                                            text: parsed.text || '',
                                            hasAttachments: attachments.length > 0,
                                            attachments: attachments,
                                            intent: classifyIntent(parsed.text || ''),
                                            isUnimportant: false
                                        };
                                        email.isUnimportant = isUnimportant(email);
                                        return [2 /*return*/, email];
                                }
                            });
                        }); }))];
                case 4:
                    emails = _a.sent();
                    return [4 /*yield*/, connection.end()];
                case 5:
                    _a.sent();
                    return [2 /*return*/, emails.filter(Boolean)]; // Filter out any nulls
                case 6:
                    err_1 = _a.sent();
                    console.error('❌ Email fetch failed:', err_1.message);
                    return [2 /*return*/, []];
                case 7: return [2 /*return*/];
            }
        });
    });
}
