import React, { useState } from 'react';
import { Panel, DataTable, Loading, ErrorNote } from './DashboardShared';
import { useApi, api } from '../../api/client';
import { fmtDateTime, downloadCsv } from '../../utils';

export const SavedReportsPanel = ({
  role = 'admin',
  defaultType = 'Sales',
  title = 'Saved reports',
  subtitle = 'Generated and archived formal reports for audit and review'
}) => {
  const [reportsTick, setReportsTick] = useState(0);
  const [showGenReport, setShowGenReport] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportType, setReportType] = useState(defaultType);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportErr, setReportErr] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  const reports = useApi('/api/reports', [reportsTick]);

  const generateReport = async (e) => {
    e.preventDefault();
    if (!reportTitle.trim()) return;
    setReportBusy(true);
    setReportErr('');
    try {
      await api('/api/reports', {
        method: 'POST',
        body: { title: reportTitle.trim(), type: reportType }
      });
      setReportTitle('');
      setShowGenReport(false);
      setReportsTick((t) => t + 1);
    } catch (ex) {
      setReportErr(ex.message);
    } finally {
      setReportBusy(false);
    }
  };

  const deleteReport = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteErr('');
    try {
      await api(`/api/reports/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      setReportsTick((t) => t + 1);
    } catch (ex) {
      setDeleteErr(ex.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const applyPreset = (type, presetTitle) => {
    setReportType(type);
    setReportTitle(presetTitle);
    setShowGenReport(true);
  };

  const canDelete = role === 'admin' || role === 'accountant';

  const exportReport = (r) => {
    const filename = `${r.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`;
    downloadCsv(
      filename,
      [
        { key: 'title', label: 'Report Title' },
        { key: 'type', label: 'Report Type' },
        { key: 'date', label: 'Timestamp' },
        { key: 'generatedBy', label: 'Author' }
      ],
      [r]
    );
  };

  const now = new Date();
  const currentMonth = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  const currentDay = now.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  const currentQuarter = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;

  return (
    <>
    <Panel
      title={title}
      subtitle={subtitle}
      action={
        <button
          className="mini-btn"
          type="button"
          onClick={() => setShowGenReport((prev) => !prev)}
        >
          {showGenReport ? 'CLOSE FORM' : '+ GENERATE REPORT'}
        </button>
      }
    >
      {showGenReport && (
        <form className="inline-form" onSubmit={generateReport} style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, opacity: 0.8, alignSelf: 'center' }}>QUICK PRESETS:</span>
            <button
              type="button"
              className="mini-btn secondary"
              onClick={() => applyPreset('Sales', `Monthly Sales Audit — ${currentMonth}`)}
            >
              📊 Monthly Sales Audit
            </button>
            <button
              type="button"
              className="mini-btn secondary"
              onClick={() => applyPreset('Inventory', `Warehouse Inventory Valuation — ${currentDay}`)}
            >
              📦 Inventory Valuation Audit
            </button>
            <button
              type="button"
              className="mini-btn secondary"
              onClick={() => applyPreset('Financial', `Operating Financial Statement — ${currentQuarter}`)}
            >
              💰 Financial Statement
            </button>
            <button
              type="button"
              className="mini-btn secondary"
              onClick={() => applyPreset('Purchasing', `Procurement & Spend Audit — ${currentMonth}`)}
            >
              🚚 Purchasing Spend Audit
            </button>
          </div>

          <div className="form-row">
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="Sales">Sales Report</option>
              <option value="Inventory">Inventory Valuation Report</option>
              <option value="Financial">Financial Statement</option>
              <option value="Purchasing">Purchasing Spend Report</option>
            </select>
            <input
              placeholder="Report title (e.g. Q3 Sales & Revenue Audit)"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              required
              style={{ flex: 2 }}
            />
            <button className="mini-btn" type="submit" disabled={reportBusy || !reportTitle.trim()}>
              {reportBusy ? 'GENERATING…' : 'SAVE TO ARCHIVE'}
            </button>
          </div>
          {reportErr && <ErrorNote message={reportErr} />}
        </form>
      )}

      <ErrorNote message={reports.error} />
      {reports.loading ? (
        <Loading />
      ) : (
        <DataTable
          keyField="id"
          emptyTitle="NO REPORTS GENERATED YET"
          emptyNote="Click '+ GENERATE REPORT' or a quick preset above to generate and archive formal audit reports."
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'type', label: 'Type' },
            { key: 'date', label: 'Generated', render: (r) => fmtDateTime(r.date) },
            { key: 'generatedBy', label: 'By' },
            {
              key: 'actions',
              label: 'Action',
              render: (r) => (
                <div style={{ display: 'flex', gap: 14 }}>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => exportReport(r)}
                  >
                    EXPORT
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      className="link-btn danger"
                      onClick={() => { setDeleteTarget(r); setDeleteErr(''); }}
                    >
                      DELETE
                    </button>
                  )}
                </div>
              )
            }
          ]}
          rows={reports.data || []}
          pageSize={10}
        />
      )}
    </Panel>
    {deleteTarget && (
      <div className="product-modal-overlay" onClick={() => !deleteBusy && setDeleteTarget(null)}>
        <div className="receipt-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Delete report">
          <button className="product-modal-close" onClick={() => !deleteBusy && setDeleteTarget(null)} aria-label="Close">×</button>
          <h3>Delete report?</h3>
          <p className="receipt-meta">{deleteTarget.title} · {deleteTarget.type}</p>
          <p className="receipt-meta">The archived report is removed permanently. This cannot be undone.</p>
          {deleteErr && <ErrorNote message={deleteErr} />}
          <div className="verify-btns center" style={{ marginTop: 16 }}>
            <button type="button" className="mini-btn" disabled={deleteBusy} onClick={() => setDeleteTarget(null)}>
              KEEP IT
            </button>
            <button type="button" className="mini-btn verify-no" disabled={deleteBusy} onClick={deleteReport}>
              {deleteBusy ? 'DELETING…' : 'DELETE'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default SavedReportsPanel;
