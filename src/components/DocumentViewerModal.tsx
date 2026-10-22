import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Download,
  Eye,
  Maximize2
} from 'lucide-react';
import { ClientDocumentRecord, DocumentVerificationStatus, UserRole } from '../types';

interface DocumentViewerModalProps {
  document: ClientDocumentRecord | null;
  applicantName?: string;
  applicationId?: string;
  currentUserRole?: UserRole | string;
  onClose: () => void;
  onVerify?: (docId: string) => void;
  onReject?: (docId: string, reason: string) => void;
  isActionable?: boolean;
}

const COMMON_REJECTION_REASONS = [
  'Blurry, illegible or low-resolution image',
  'Name does not match applicant legal name on record',
  'Document is expired or validity period ended',
  'Incomplete document / Missing back side or pages',
  'Suspected alteration, tampering or forged details',
  'Invalid document type submitted for this verification slot'
];

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  applicantName = 'Applicant',
  applicationId = '',
  currentUserRole = 'LOAN_OFFICER',
  onClose,
  onVerify,
  onReject,
  isActionable = false
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!document) return null;

  const isImage =
    document.fileType?.startsWith('image/') ||
    document.dataUrl?.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|webp|svg)$/i.test(document.fileName);

  const isPdf =
    document.fileType?.includes('pdf') ||
    document.dataUrl?.startsWith('data:application/pdf') ||
    /\.pdf$/i.test(document.fileName);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleConfirmVerify = () => {
    if (onVerify) {
      setIsSubmitting(true);
      onVerify(document.id);
      setTimeout(() => {
        setIsSubmitting(false);
      }, 500);
    }
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Custom Reason'
      ? customReason.trim()
      : selectedReason || customReason.trim();

    if (!finalReason) return;

    if (onReject) {
      setIsSubmitting(true);
      onReject(document.id, finalReason);
      setTimeout(() => {
        setIsSubmitting(false);
        setRejecting(false);
      }, 500);
    }
  };

  const isOfficerOrManager =
    currentUserRole === 'LOAN_OFFICER' ||
    currentUserRole === 'MANAGER' ||
    currentUserRole === 'ADMIN';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0f172a] rounded-3xl w-full max-w-5xl h-[92vh] max-h-[900px] border border-slate-700 shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-scaleUp">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#1e293b] border-b border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-900/60 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  {document.title}
                </h3>
                {document.status === 'VERIFIED' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/50">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                )}
                {document.status === 'PENDING' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/50">
                    <Clock className="w-3 h-3" />
                    Pending Review
                  </span>
                )}
                {document.status === 'REJECTED' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-500/50">
                    <XCircle className="w-3 h-3" />
                    Rejected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                Applicant: <strong className="text-slate-200">{applicantName}</strong> • File:{' '}
                <span className="text-slate-300 font-mono">{document.fileName}</span>
                {applicationId ? ` • #${applicationId}` : ''}
              </p>
            </div>
          </div>

          {/* Controls: Zoom, Rotate, Close */}
          <div className="flex items-center space-x-2 shrink-0">
            {isImage && (
              <div className="hidden sm:flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono text-[11px] text-slate-400 select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  title="Rotate 90°"
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer ml-1"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset View"
                  className="px-2 py-1 hover:bg-slate-700 rounded-lg text-[10px] font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close document viewer"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rejection Alert Callout if Rejected */}
        {document.status === 'REJECTED' && document.rejectionReason && (
          <div className="px-5 py-3 bg-rose-950/70 border-b border-rose-800/80 flex items-start space-x-3 text-xs text-rose-200 shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-300">Document Rejection Reason:</span>{' '}
              <span>{document.rejectionReason}</span>
              {document.verifiedBy && (
                <span className="block text-[11px] text-rose-400/80 mt-0.5">
                  Audited by {document.verifiedBy} on{' '}
                  {document.verifiedAt ? new Date(document.verifiedAt).toLocaleString('en-IN') : 'Recently'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Verification Success Callout if Verified */}
        {document.status === 'VERIFIED' && document.verifiedBy && (
          <div className="px-5 py-2.5 bg-emerald-950/70 border-b border-emerald-800/80 flex items-center space-x-2 text-xs text-emerald-300 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Officially Verified & Cleared by <strong>{document.verifiedBy}</strong>
              {document.verifiedAt ? ` on ${new Date(document.verifiedAt).toLocaleString('en-IN')}` : ''}
            </span>
          </div>
        )}

        {/* Main Document Viewer Canvas */}
        <div className="flex-1 bg-[#090d16] p-4 overflow-auto flex items-center justify-center relative select-none">
          {document.dataUrl ? (
            isImage ? (
              <div
                className="transition-transform duration-150 ease-out origin-center flex items-center justify-center max-w-full max-h-full"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`
                }}
              >
                <img
                  src={document.dataUrl}
                  alt={document.title}
                  className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-700/60 bg-white"
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={document.dataUrl}
                title={document.title}
                className="w-full h-full rounded-xl border border-slate-700/80 bg-white"
              />
            ) : (
              <div className="text-center p-8 bg-slate-900 rounded-2xl border border-slate-800 max-w-md">
                <FileText className="w-16 h-16 text-indigo-400 mx-auto mb-3" />
                <h4 className="font-bold text-white text-base">{document.fileName}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Format: {document.fileType || 'Document'} • Size:{' '}
                  {document.fileSize ? `${Math.round(document.fileSize / 1024)} KB` : 'N/A'}
                </p>
                <a
                  href={document.dataUrl}
                  download={document.fileName}
                  className="mt-4 inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Document File</span>
                </a>
              </div>
            )
          ) : (
            <div className="text-center p-8 bg-slate-900 rounded-2xl border border-slate-800 max-w-md">
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h4 className="font-bold text-white text-base">Document Content Preview Unavailable</h4>
              <p className="text-xs text-slate-400 mt-1">
                The file content is stored in secure offline repository or awaiting client re-upload.
              </p>
            </div>
          )}
        </div>

        {/* Rejection Form Modal / Section */}
        {rejecting && (
          <form
            onSubmit={handleConfirmReject}
            className="p-5 bg-[#1e293b] border-t border-slate-700 space-y-3 shrink-0 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                <XCircle className="w-4 h-4" />
                <span>Specify Document Rejection Reason (Required)</span>
              </div>
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {COMMON_REJECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setSelectedReason(reason);
                    setCustomReason('');
                  }}
                  className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                    selectedReason === reason
                      ? 'bg-rose-950/80 border-rose-500 text-rose-200 font-medium'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80'
                  }`}
                >
                  {reason}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedReason('Custom Reason')}
                className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                  selectedReason === 'Custom Reason'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200 font-medium'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                Custom specific reason...
              </button>
            </div>

            {selectedReason === 'Custom Reason' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter specific audit remarks for document rejection..."
                rows={2}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!selectedReason && !customReason.trim())}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition cursor-pointer flex items-center space-x-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirm & Reject Document</span>
              </button>
            </div>
          </form>
        )}

        {/* Modal Footer / Action Toolbar */}
        {!rejecting && (
          <div className="px-5 py-3.5 bg-[#162032] border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-400 flex items-center space-x-4">
              <span>
                Format: <strong className="text-slate-200 uppercase">{document.fileType?.split('/')[1] || 'IMAGE'}</strong>
              </span>
              <span>
                Uploaded:{' '}
                <strong className="text-slate-200">
                  {document.uploadedAt ? new Date(document.uploadedAt).toLocaleString('en-IN') : 'Recently'}
                </strong>
              </span>
              {document.fileSize && (
                <span className="hidden sm:inline">
                  Size: <strong className="text-slate-200">{Math.round(document.fileSize / 1024)} KB</strong>
                </span>
              )}
            </div>

            {/* Officer Action Buttons */}
            {isActionable && isOfficerOrManager && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setRejecting(true)}
                  disabled={isSubmitting}
                  className="bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 hover:text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-sm"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Reject Document</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmVerify}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-md active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{document.status === 'VERIFIED' ? 'Marked as Verified ✓' : 'Verify Document ✓'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
