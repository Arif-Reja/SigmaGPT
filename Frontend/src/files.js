import { apiFetch } from "./auth.js";

export const MAX_ATTACHMENTS = 4;

const MAX_IMAGE_DIMENSION = 1280;
const MAX_PICKED_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif"];
const DOCUMENT_EXTENSIONS = ["pdf", "docx"];
const TEXT_EXTENSIONS = [
    "txt", "md", "markdown", "csv", "tsv", "json", "xml", "yaml", "yml",
    "html", "htm", "css", "js", "jsx", "ts", "tsx", "mjs", "cjs",
    "java", "py", "c", "h", "cpp", "hpp", "cs", "go", "rs", "php", "rb",
    "kt", "swift", "sql", "sh", "bat", "ini", "toml", "log",
    "properties", "gradle"
];

const CODE_EXTENSIONS = [
    "js", "jsx", "ts", "tsx", "mjs", "cjs", "java", "py", "c", "h", "cpp",
    "hpp", "cs", "go", "rs", "php", "rb", "kt", "swift", "sql", "sh", "bat",
    "html", "htm", "css", "xml", "json", "yaml", "yml", "gradle"
];

export const ACCEPT = [
    ...IMAGE_EXTENSIONS,
    ...DOCUMENT_EXTENSIONS,
    ...TEXT_EXTENSIONS
]
    .map((extension) => `.${extension}`)
    .join(",");

const getExtension = (name) => {
    const match = /\.([a-z0-9]+)$/i.exec(name || "");

    return match ? match[1].toLowerCase() : "";
};

const isImageFile = (file) =>
    IMAGE_EXTENSIONS.includes(getExtension(file.name)) ||
    /^image\/(png|jpe?g|webp|gif)$/.test(file.type);

export const getFileKind = (file) => (isImageFile(file) ? "image" : "file");

export const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const fileIconClass = (name) => {
    const extension = getExtension(name);

    if (IMAGE_EXTENSIONS.includes(extension)) return "fa-solid fa-image";
    if (extension === "pdf") return "fa-solid fa-file-pdf";
    if (extension === "docx") return "fa-solid fa-file-word";
    if (extension === "csv" || extension === "tsv") return "fa-solid fa-file-csv";
    if (CODE_EXTENSIONS.includes(extension)) return "fa-solid fa-file-code";

    return "fa-solid fa-file-lines";
};

export const validateFile = (file) => {
    const extension = getExtension(file.name);
    const supported =
        isImageFile(file) ||
        DOCUMENT_EXTENSIONS.includes(extension) ||
        TEXT_EXTENSIONS.includes(extension);

    if (!supported) {
        return `"${file.name}" is not a supported file type. You can attach images, PDF, Word (.docx), and text or code files.`;
    }

    if (file.size === 0) {
        return `"${file.name}" is empty.`;
    }

    if (isImageFile(file) && file.size > MAX_PICKED_IMAGE_BYTES) {
        return `"${file.name}" is too large (maximum 25 MB for images).`;
    }

    if (!isImageFile(file) && file.size > MAX_FILE_BYTES) {
        return `"${file.name}" is too large (maximum 10 MB).`;
    }

    return "";
};


export const resizeImage = async (file) => {
    if (file.type === "image/gif" || file.size <= 400 * 1024) {
        return file;
    }

    try {
        const bitmap = await createImageBitmap(file);

        const scale = Math.min(
            1,
            MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height)
        );

        if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
            bitmap.close?.();
            return file;
        }

        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close?.();

        const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.85)
        );

        if (!blob) return file;

        if (blob.size >= file.size && file.size <= 5 * 1024 * 1024) {
            return file;
        }

        const baseName = file.name.replace(/\.[^.]+$/, "") || "image";

        return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    } catch {
        return file;
    }
};


export const uploadAttachment = async (file) => {
    const form = new FormData();
    form.append("file", file);

    const response = await apiFetch("/api/attachments", {
        method: "POST",
        body: form
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(data.error || `Upload failed (${response.status})`);
    }

    return data.attachment;
};


const imageUrlCache = new Map();

export const getAttachmentImageUrl = (attachmentId) => {
    if (imageUrlCache.has(attachmentId)) {
        return imageUrlCache.get(attachmentId);
    }

    const request = (async () => {
        const response = await apiFetch(
            `/api/attachments/${encodeURIComponent(attachmentId)}`
        );

        if (!response.ok) {
            throw new Error("Image unavailable");
        }

        return URL.createObjectURL(await response.blob());
    })();

    imageUrlCache.set(attachmentId, request);

    request.catch(() => imageUrlCache.delete(attachmentId));

    return request;
};