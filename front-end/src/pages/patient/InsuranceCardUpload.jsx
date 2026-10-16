'use strict';

/**
 * One of the two insurance-card upload cards.
 *
 * The <label for> opens the file picker on any click inside it, so the "View
 * uploaded file" text calls preventDefault and opens the stored file instead of
 * re-prompting - the same split the legacy wrapper click handler made.
 */
export default function InsuranceCardUpload({
  side,
  badgeClass,
  badgeLabel,
  caption,
  inputId,
  labelId,
  nameId,
  disabled,
  fileUrl,
  uploadingName,
  onFileChosen,
  onViewFile,
}) {
  return (
    <div className="upload-card">
      <div className="upload-label-row">
        <span className="upload-label">Card Image</span>
        <span className={badgeClass}>{badgeLabel}</span>
      </div>
      <label className={'upload-box' + (disabled ? ' disabled' : '')} id={labelId} htmlFor={inputId}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span id={nameId}>
          {uploadingName ? (
            <strong>Uploading {uploadingName}…</strong>
          ) : fileUrl ? (
            <>
              <strong
                className="link-text"
                data-view-file
                onClick={(e) => {
                  e.preventDefault();
                  onViewFile();
                }}
              >
                View uploaded file
              </strong>
              {' · '}
              <span className="link-text" style={{ fontWeight: 400 }}>
                replace
              </span>
            </>
          ) : (
            <>
              Drop or <span className="link-text">browse</span>
            </>
          )}
        </span>
        <small>{caption}</small>
        <input
          type="file"
          id={inputId}
          accept="image/*,.pdf"
          className="hidden-input"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onFileChosen(side, file);
          }}
        />
      </label>
    </div>
  );
}
