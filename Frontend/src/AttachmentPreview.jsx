import { useEffect, useState } from "react";
import { fileIconClass, formatSize, getAttachmentImageUrl } from "./files.js";

function ImageAttachment({ attachment }) {
    const [url, setUrl] = useState(attachment.previewUrl || null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (attachment.previewUrl) {
            setUrl(attachment.previewUrl);
            return;
        }

        let cancelled = false;

        getAttachmentImageUrl(attachment.attachmentId)
            .then((loadedUrl) => {
                if (!cancelled) setUrl(loadedUrl);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });

        return () => {
            cancelled = true;
        };
    }, [attachment.attachmentId, attachment.previewUrl]);

    if (failed) {
        return (
            <div className="msgFile missing">
                <i className="fa-solid fa-image"></i>
                <span className="msgFileInfo">
                    <span className="msgFileName">{attachment.name}</span>
                    <span className="msgFileSize">Image unavailable</span>
                </span>
            </div>
        );
    }

    if (!url) {
        return (
            <div
                className="msgImage placeholder"
                aria-label="Loading image"
            ></div>
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="msgImageLink"
        >
            <img className="msgImage" src={url} alt={attachment.name} />
        </a>
    );
}

function FileAttachment({ attachment }) {
    return (
        <div className="msgFile">
            <i className={fileIconClass(attachment.name)}></i>
            <span className="msgFileInfo">
                <span className="msgFileName">{attachment.name}</span>
                {attachment.size > 0 && (
                    <span className="msgFileSize">
                        {formatSize(attachment.size)}
                    </span>
                )}
            </span>
        </div>
    );
}
function AttachmentList({ attachments }) {
    return (
        <div className="msgAttachments">
            {attachments.map((attachment) =>
                attachment.kind === "image" ? (
                    <ImageAttachment
                        key={attachment.attachmentId}
                        attachment={attachment}
                    />
                ) : (
                    <FileAttachment
                        key={attachment.attachmentId}
                        attachment={attachment}
                    />
                )
            )}
        </div>
    );
}

export default AttachmentList;