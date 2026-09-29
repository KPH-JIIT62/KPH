import { FileArchive, FileCode, FileText, Image as ImageIcon, Link as LinkIcon, X } from "lucide-react";
import { formatSize } from "../lib/format";

function KindIcon({ kind }) {
  if (kind === "image") return <ImageIcon size={15} />;
  if (kind === "zip") return <FileArchive size={15} />;
  if (kind === "code") return <FileCode size={15} />;
  if (kind === "link") return <LinkIcon size={15} />;
  return <FileText size={15} />;
}

function kindLabel(kind) {
  if (kind === "pdf") return "PDF";
  if (kind === "image") return "IMG";
  if (kind === "zip") return "ZIP";
  if (kind === "code") return "CODE";
  if (kind === "link") return "LINK";
  return "FILE";
}

export function AttachmentPreview({ attachment, onRemove }) {
  if (!attachment) return null;
  const size = formatSize(attachment.size);
  if (attachment.kind === "image" && !onRemove) {
    return (
      <figure className="attach image">
        <img src={attachment.url} alt={attachment.name} />
        <figcaption>
          <span>{attachment.name}</span>
          {size ? <span>{size}</span> : null}
          <a href={attachment.url} target="_blank" rel="noreferrer">Open</a>
          <a href={attachment.url} download={attachment.name}>Save</a>
        </figcaption>
      </figure>
    );
  }
  return (
    <div className="attach">
      <span className="file-badge"><KindIcon kind={attachment.kind} />{kindLabel(attachment.kind)}</span>
      <span className="attach-copy">
        <span className="attach-name">{attachment.name}</span>
        {size ? <span className="attach-size">{size}</span> : null}
      </span>
      <a href={attachment.url} target="_blank" rel="noreferrer">Open</a>
      {attachment.kind !== "link" ? <a href={attachment.url} download={attachment.name}>Save</a> : null}
      {onRemove ? (
        <button type="button" className="text-btn" onClick={onRemove} aria-label={`Remove ${attachment.name}`}>
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}
