/**
 * Report section content now lives in @pca/shared so DOCX, PDF and the on-screen preview render
 * from one source of truth. Re-exported here to keep existing backend import paths working.
 */
export { reportSections, type ReportSection } from '@pca/shared';
