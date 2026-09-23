import React, { useState } from 'react';
import { Panel, DataTable, Loading, ErrorNote, StatusBadge } from './DashboardShared';
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

  const deleteReport = async (id, titleToDelete) => {
    if (!window.confirm(`Delete archived report "${titleToDelete}"?`)) return;
    try {
      await api(`/api/reports/${id}`, { method: 'DELETE' });
      setReportsTick((t) => t + 1);
    } catch (ex) {
      window.alert(ex.message);
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
            {
              key: 'type',
              label: 'Type',
              render: (r) => (
                <StatusBadge
                  status={
                    r.type === 'Financial'
                      ? 'Active'
                      : r.type === 'Sales'
                      ? 'Paid'
                      : r.type === 'Inventory'
                      ? 'Shipped'
                      : 'Pending'
                  }
                />
              )
            },
            { key: 'date', label: 'Generated', render: (r) => fmtDateTime(r.date) },
            { key: 'generatedBy', label: 'By' },
            {
              key: 'actions',
              label: 'Action',
              render: (r) => (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="mini-btn"
                    style={{ padding: '3px 8px', fontSize: 11 }}
                    onClick={() => exportReport(r)}
                  >
                    EXPORT
                  </button>
                  {canDelete && (
                    <button
                      className="mini-btn secondary"
                      style={{ padding: '3px 8px', fontSize: 11, color: '#c0564f' }}
                      onClick={() => deleteReport(r.id, r.title)}
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
  );
};

export default SavedReportsPanel;
