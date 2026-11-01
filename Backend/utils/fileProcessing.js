import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_TEXT_CHARS = 30000;

const TEXT_EXTENSIONS = new Set([
    "txt", "md", "markdown", "csv", "tsv", "json", "xml", "yaml", "yml",
    "html", "htm", "css", "js", "jsx", "ts", "tsx", "mjs", "cjs",
    "java", "py", "c", "h", "cpp", "hpp", "cs", "go", "rs", "php", "rb",
    "kt", "swift", "sql", "sh", "bat", "ini", "toml", "log",
    "properties", "gradle"
]);

export class UploadError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = "UploadError";
        this.status = status;
    }
}

const startsWith = (buffer, bytes, offset = 0) =>
    bytes.every((byte, index) => buffer[offset + index] === byte);

const sniffImageType = (buffer) => {
    if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
        return "image/png";
    }

    if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
        return "image/jpeg";
    }

    if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) {
        return "image/gif";
    }

    if (
        startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)
    ) {
        return "image/webp";
    }

    return null;
};

const isPdf = (buffer) =>
    buffer.subarray(0, 1024).toString("latin1").includes("%PDF-");

const isZip = (buffer) => startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]);

const getExtension = (name) => {
    const match = /\.([a-z0-9]+)$/i.exec(name || "");

    return match ? match[1].toLowerCase() : "";
};

const extractPdfText = async (buffer) => {
    try {
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const { text } = await extractText(pdf, { mergePages: true });

        return text;
    } catch (err) {
        console.error("PDF read error:", err.message);

        throw new UploadError(
            "Could not read this PDF. It may be damaged or password protected.",
            422
        );
    }
};

const extractDocxText = async (buffer) => {
    try {
        const { value } = await mammoth.extractRawText({ buffer });

        return value;
    } catch (err) {
        console.error("Word file read error:", err.message);

        throw new UploadError(
            "Could not read this Word file. It may be damaged.",
            422
        );
    }
};

const decodeText = (buffer) => {
    if (buffer.subarray(0, 8000).includes(0)) {
        throw new UploadError("This file does not look like a text file.", 415);
    }

    const text = new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "");
    const brokenCharacters = (text.match(/\uFFFD/g) || []).length;

    if (text.length && brokenCharacters / text.length > 0.01) {
        throw new UploadError(
            "This text file is not UTF-8 encoded. Save it as UTF-8 and try again.",
            415
        );
    }

    return text;
};

export const processUpload = async (buffer, originalName) => {
    const extension = getExtension(originalName);
    const imageType = sniffImageType(buffer);
    if (imageType) {
        if (buffer.length > MAX_IMAGE_BYTES) {
            throw new UploadError("Image is too large (maximum 5 MB).", 413);
        }

        return {
            kind: "image",
            mimeType: imageType,
            data: buffer
        };
    }
    let rawText;
    let mimeType;

    if (isPdf(buffer)) {
        rawText = await extractPdfText(buffer);
        mimeType = "application/pdf";
    } else if (extension === "docx" && isZip(buffer)) {
        rawText = await extractDocxText(buffer);
        mimeType =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (TEXT_EXTENSIONS.has(extension)) {
        rawText = decodeText(buffer);
        mimeType = "text/plain";
    } else {
        throw new UploadError(
            "This file type is not supported. You can attach images, PDF, Word (.docx), and text or code files.",
            415
        );
    }

    const text = String(rawText || "")
        .replace(/\u0000/g, "")
        .replace(/\r\n?/g, "\n")
        .trim();

    if (!text) {
        throw new UploadError(
            "No readable text was found in this file. Scanned documents and image-only PDFs are not supported yet.",
            422
        );
    }

    return {
        kind: "file",
        mimeType,
        text: text.slice(0, MAX_FILE_TEXT_CHARS),
        truncated: text.length > MAX_FILE_TEXT_CHARS
    };
};