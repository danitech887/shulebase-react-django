import React, { useState, useEffect } from 'react';
import { Row, Col, ProgressBar, Spinner } from 'react-bootstrap';
import './FeeDashboard.css';
import api from '../../../api/api';
import { useMessage } from '../../../context/MessageContext';
import { useGradesAndStreams } from '../../../hooks/useGradesAndStreams';

export default function FeeDashboard() {
  const { showMessage } = useMessage();
  const [activeTab, setActiveTab] = useState('overview');
  const [feeRecords, setFeeRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [animate, setAnimate] = useState(false);
  const [saving, setSaving] = useState(false);
 
  const [feeStats, setFeeStats] = useState([
    { title: 'Total Collected', value: 'Ksh 0', icon: '💰', accent: '#059669', trend: '+0%' },
    { title: 'Pending Balance', value: 'Ksh 0', icon: '⏳', accent: '#d97706', trend: '0%' },
    { title: 'Collection Rate', value: '0%', icon: '📊', accent: '#0891b2', trend: '0%' },
    { title: 'Monthly Target', value: 'Ksh 0', icon: '🎯', accent: '#6366f1', trend: '+0%' },
  ]);
  const [loading, setLoading] = useState(true);
  const [studentList, setStudentList] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [gradeData, setGradeData] = useState([
    { grade: 'PP1', streams: 2, totalStudents: 85, totalFee: 42500, collected: 31275, balance: 11225, mpesa: 18762, cash: 12513 },
    { grade: 'PP2', streams: 2, totalStudents: 92, totalFee: 46000, collected: 34500, balance: 11500, mpesa: 20700, cash: 13800 },
    { grade: 'Grade 1', streams: 3, totalStudents: 110, totalFee: 55000, collected: 40700, balance: 14300, mpesa: 24420, cash: 16280 },
    { grade: 'Grade 2', streams: 3, totalStudents: 108, totalFee: 54000, collected: 39960, balance: 14040, mpesa: 23976, cash: 15984 },
    { grade: 'Grade 3', streams: 3, totalStudents: 105, totalFee: 52500, collected: 38325, balance: 14175, mpesa: 22995, cash: 15330 },
    { grade: 'Grade 4', streams: 3, totalStudents: 102, totalFee: 51000, collected: 37740, balance: 13260, mpesa: 22644, cash: 15096 },
    { grade: 'Grade 5', streams: 3, totalStudents: 98, totalFee: 49000, collected: 36330, balance: 12670, mpesa: 21798, cash: 14532 },
    { grade: 'Grade 6', streams: 2, totalStudents: 95, totalFee: 47500, collected: 35250, balance: 12250, mpesa: 21150, cash: 14100 },
    { grade: 'Grade 9', streams: 2, totalStudents: 80, totalFee: 40000, collected: 29600, balance: 10400, mpesa: 17760, cash: 11840 },
  ]);
  const [paymentModes, setPaymentModes] = useState([
    { mode: 'M-Pesa', amount: 0, percentage: 0, accent: '#6366f1' },
    { mode: 'Cash', amount: 0, percentage: 0, accent: '#0891b2' },
  ]);
  const [monthlyData, setMonthlyData] = useState([
    { month: 'Jan', collected: 42000, target: 55000 },
    { month: 'Feb', collected: 38000, target: 55000 },
    { month: 'Mar', collected: 45000, target: 55000 },
    { month: 'Apr', collected: 47000, target: 55000 },
    { month: 'May', collected: 50000, target: 55000 },
    { month: 'Jun', collected: 48000, target: 55000 },
  ]);

  const [paymentData, setPaymentData] = useState({ registration_no: '', amount: '', mode: 'mpesa', transaction_code: '', date: '', term: 'Term 1' });
  const [reminderData, setReminderData] = useState({ grade: '', message: '' });
  const [settingsData, setSettingsData] = useState({});
  const [reportCriteria, setReportCriteria] = useState({ reportType: 'monthly-collection', grade: '', stream: '', format: 'PDF', term: 'Term 1', start_date: '', end_date: '' });
  const [mpesaSettings, setMpesaSettings] = useState({ studentsKey: '', merchantCode: '', shortCode: '' });
  const [globalFilters, setGlobalFilters] = useState({ grade: '', stream: '', term: 'Term 1' });
  const [recordFilters, setRecordFilters] = useState({ search: '', date: '', mode: 'all', sort: 'newest', grade: '', stream: '', term: 'Term 1' });
  const [recordReport, setRecordReport] = useState({ period: 'daily', term: 'Term 1', format: 'pdf' });
  const [feeReport, setFeeReport] = useState({ period: 'monthly', term: 'Term 1', format: 'pdf' });
  const [receiptCriteria, setReceiptCriteria] = useState({ grade: '', stream: '', term: 'Term 1' });
  const [activitiesData, setActivitiesData] = useState([]);
  const [selectedGradeForActivities, setSelectedGradeForActivities] = useState('');
  const { grades, streams } = useGradesAndStreams(api, 
    modalType === 'report' ? reportCriteria.grade :
    modalType === 'receipt' ? receiptCriteria.grade :
    modalType === 'reminder' ? reminderData.grade :
    modalType === 'records' ? recordFilters.grade :
    globalFilters.grade
  );

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimate(true), 80);
    fetchFeeData();
    fetchStudents();
    fetchFeeRecords();
    fetchGradesAndStreams();
  }, []);

  useEffect(() => {
    fetchFeeData();
  }, [globalFilters.term]);

  const fetchGradesAndStreams = async () => {
    try {
      const [streamsRes, gradesRes] = await Promise.all([
        api.get('streams/').catch(() => ({ data: {} })),
        api.get('grades/').catch(() => ({ data: {} }))
      ]);

      let fetchedStreams = {};
      let fetchedGrades = [];
      if (streamsRes.data?.streams_by_grade) {
        fetchedStreams = streamsRes.data.streams_by_grade;
        fetchedGrades = streamsRes.data.grades || Object.keys(fetchedStreams);
      } else {
        fetchedStreams = { 'all': streamsRes.data?.streams || [] };
        fetchedGrades = gradesRes.data?.grades || [];
      }
      // setGrades(fetchedGrades);
      // setStreamsByGrade(fetchedStreams);
    } catch (err) {
      console.error('Failed to fetch grades and streams', err);
      // showMessage({type: "error", text: "Failed to fetch grades and streams"})
    }
  };

  useEffect(() => {
    if (activeTab === 'records' || modalType === 'records' || modalType === 'confirm_payments') {
      fetchFeeRecords();
    }
  }, [activeTab, modalType]);

  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);
      const r = await api.get('students/');
      setStudentList(r.data.students || []);
    } catch { setStudentList([]); }
    finally { setStudentsLoading(false); }
  };

  const fetchFeeData = async () => {
    try {
      setLoading(true);

      // Primary: fetch monthly collections
      try {
        const res = await api.get('fees/monthly/');
        if (res.data && Array.isArray(res.data.monthly)) {
          setMonthlyData(res.data.monthly.map(m => ({ month: m.month || '', collected: Number(m.collected || 0), target: Number(m.target || 0) })));
        }
      } catch (e) {
        console.warn('fees/monthly/ failed, falling back to dashboard endpoint', e);
        // fallback to dashboard if monthly endpoint missing
        try {
          const { data } = await api.get('dashboard/');
          const monthly = data.monthly || data.monthly_collections || data.monthlyData || data.monthlyCollections;
          if (Array.isArray(monthly) && monthly.length > 0) {
            setMonthlyData(monthly.map(m => ({ month: m.month || m.name || '', collected: Number(m.collected || m.amount || 0), target: Number(m.target || m.goal || 0) })));
          }
          const balance = data.fee_balance || 0;
          const paid = data.fee_paid || 0;
          const total = paid + balance;
          const rate = total > 0 ? ((paid / total) * 100).toFixed(1) : 0;
          setFeeStats([
            { title: 'Total Collected', value: `Ksh ${paid.toLocaleString()}`, icon: '💰', accent: '#059669', trend: '+0%' },
            { title: 'Pending Balance', value: `Ksh ${balance.toLocaleString()}`, icon: '⏳', accent: '#d97706', trend: '0%' },
            { title: 'Collection Rate', value: `${rate}%`, icon: '📊', accent: '#0891b2', trend: `${rate}%` },
            { title: 'Monthly Target', value: `Ksh ${(total * 0.85).toLocaleString()}`, icon: '🎯', accent: '#6366f1', trend: '+0%' },
          ]);
        } catch (e2) { console.warn('dashboard fallback failed', e2); }
      }

      // Fetch fees aggregated by grade to populate grade table and payment modes
      try {
        const gr = await api.get('fees/by-grade/');
        const grades = gr.data || [];
        if (Array.isArray(grades) && grades.length > 0) {
          setGradeData(grades);
          const settings = {};
          grades.forEach(g => { settings[g.grade] = g.expectedFee || 0; });
          setSettingsData(settings);
          let mpesa = 0, cash = 0, bank = 0;
          let mpesaCount = 0, cashCount = 0, bankCount = 0;
          grades.forEach(g => { 
            mpesa      += Number(g.mpesa || 0); 
            cash       += Number(g.cash || 0); 
            bank       += Number(g.bank_transfer || 0);
            mpesaCount += Number(g.mpesa_count || 0);
            cashCount  += Number(g.cash_count || 0);
            bankCount  += Number(g.bank_count || 0);
          });
          const tot = mpesa + cash + bank || 1;
          setPaymentModes([
            { mode: 'M-Pesa', amount: mpesa, count: mpesaCount, percentage: Number(((mpesa / tot) * 100).toFixed(1)), accent: '#6366f1' },
            { mode: 'Cash', amount: cash, count: cashCount, percentage: Number(((cash / tot) * 100).toFixed(1)), accent: '#0891b2' },
            { mode: 'Bank Transfer', amount: bank, count: bankCount, percentage: Number(((bank / tot) * 100).toFixed(1)), accent: '#f59e0b' },
          ]);

          // update feeStats using aggregated numbers
          const totalCollected = grades.reduce((s, g) => s + (Number(g.collected || 0)), 0);
          const totalExpected = grades.reduce((s, g) => s + (Number(g.totalFee || 0)), 0);
          const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
          setFeeStats([
            { title: 'Total Collected', value: `Ksh ${totalCollected.toLocaleString()}`, icon: '💰', accent: '#059669', trend: '+0%' },
            { title: 'Pending Balance', value: `Ksh ${Math.max(0, totalExpected - totalCollected).toLocaleString()}`, icon: '⏳', accent: '#d97706', trend: '0%' },
            { title: 'Collection Rate', value: `${collectionRate}%`, icon: '📊', accent: '#0891b2', trend: `${collectionRate}%` },
            { title: 'Monthly Target', value: `Ksh ${totalExpected.toLocaleString()}`, icon: '🎯', accent: '#6366f1', trend: '+0%' },
          ]);
        }
      } catch (e) { console.warn('fees/by-grade/ failed', e); }

    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchFeeRecords = async () => {
    try {
      setRecordsLoading(true);
      const r = await api.get('fees/');
      setFeeRecords(r.data || []);
    } catch { setFeeRecords([]); }
    finally { setRecordsLoading(false); }
  };

  const getFilteredRecords = () => {
    let f = [...feeRecords];

    f = f.map(r => {
      const st = studentList.find(s => s.registration_no === r.registration_no);
      return { ...r, grade: st?.grade || '', stream: st?.stream || '' };
    });

    if (recordFilters.search) {
      const q = recordFilters.search.toLowerCase();
      f = f.filter(r => (r.student_name?.toLowerCase().includes(q)) || (r.registration_no?.toLowerCase().includes(q)));
    }
    if (recordFilters.date) f = f.filter(r => r.date_of_payment === recordFilters.date);
    if (recordFilters.mode !== 'all') f = f.filter(r => r.mode_of_payment?.toLowerCase() === recordFilters.mode.toLowerCase());

    if (recordFilters.grade) f = f.filter(r => r.grade?.toLowerCase() === recordFilters.grade.toLowerCase());
    if (recordFilters.stream) f = f.filter(r => r.stream?.toLowerCase() === recordFilters.stream.toLowerCase());
    if (recordFilters.term) f = f.filter(r => r.term?.toLowerCase() === recordFilters.term.toLowerCase());

    if (recordFilters.sort === 'newest') f.sort((a, b) => new Date(b.date_of_payment) - new Date(a.date_of_payment));
    else if (recordFilters.sort === 'oldest') f.sort((a, b) => new Date(a.date_of_payment) - new Date(b.date_of_payment));
    else if (recordFilters.sort === 'amount_desc') f.sort((a, b) => b.amount - a.amount);
    
    return f;
  };

  const getFilteredPaymentModes = () => {
    let filteredRecords = [...feeRecords];
    const termFiltered = globalFilters.term || 'Term 1';
    
    filteredRecords = filteredRecords.filter(r => 
      r.term?.toLowerCase() === termFiltered.toLowerCase()
    );

    if (globalFilters.grade || globalFilters.stream) {
      const matchingRegNos = new Set(
        studentList
          .filter(s => {
            const matchesGrade = !globalFilters.grade || s.grade?.toLowerCase() === globalFilters.grade.toLowerCase();
            const matchesStream = !globalFilters.stream || s.stream?.toLowerCase() === globalFilters.stream.toLowerCase();
            return matchesGrade && matchesStream;
          })
          .map(s => s.registration_no)
      );
      filteredRecords = filteredRecords.filter(r => matchingRegNos.has(r.registration_no));
    }

    const mpesa = filteredRecords
      .filter(r => r.mode_of_payment?.toLowerCase() === 'm-pesa')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const mpesaCount = filteredRecords.filter(r => r.mode_of_payment?.toLowerCase() === 'm-pesa').length;

    const cash = filteredRecords
      .filter(r => r.mode_of_payment?.toLowerCase() === 'cash')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const cashCount = filteredRecords.filter(r => r.mode_of_payment?.toLowerCase() === 'cash').length;

    const bank = filteredRecords
      .filter(r => ['bank transfer', 'bank'].includes(r.mode_of_payment?.toLowerCase()))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const bankCount = filteredRecords.filter(r => ['bank transfer', 'bank'].includes(r.mode_of_payment?.toLowerCase())).length;

    const total = mpesa + cash + bank || 1;

    return [
      { mode: 'M-Pesa', amount: mpesa, count: mpesaCount, percentage: Number(((mpesa / total) * 100).toFixed(1)), accent: '#6366f1' },
      { mode: 'Cash', amount: cash, count: cashCount, percentage: Number(((cash / total) * 100).toFixed(1)), accent: '#0891b2' },
      { mode: 'Bank Transfer', amount: bank, count: bankCount, percentage: Number(((bank / total) * 100).toFixed(1)), accent: '#f59e0b' },
    ];
  };

  const getFilteredMonthlyData = () => {
    let filteredRecords = [...feeRecords];
    if (globalFilters.grade || globalFilters.stream) {
      const matchingRegNos = new Set(
        studentList
          .filter(s => {
            const matchesGrade = !globalFilters.grade || s.grade?.toLowerCase() === globalFilters.grade.toLowerCase();
            const matchesStream = !globalFilters.stream || s.stream?.toLowerCase() === globalFilters.stream.toLowerCase();
            return matchesGrade && matchesStream;
          })
          .map(s => s.registration_no)
      );
      filteredRecords = filteredRecords.filter(r => matchingRegNos.has(r.registration_no));
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyAgg = months.map(m => ({ month: m, collected: 0, target: 0 }));

    let totalExpected = 0;
    let relevantStudents = [...studentList];
    if (globalFilters.grade || globalFilters.stream) {
      relevantStudents = relevantStudents.filter(s => {
        const matchesGrade = !globalFilters.grade || s.grade?.toLowerCase() === globalFilters.grade.toLowerCase();
        const matchesStream = !globalFilters.stream || s.stream?.toLowerCase() === globalFilters.stream.toLowerCase();
        return matchesGrade && matchesStream;
      });
    }
    relevantStudents.forEach(s => {
      totalExpected += Number(settingsData[s.grade] || 0);
    });

    const targetPerMonth = Math.round(totalExpected / 6) || 50000;

    filteredRecords.forEach(r => {
      if (!r.date_of_payment) return;
      const date = new Date(r.date_of_payment);
      const monthIdx = date.getMonth();
      if (monthIdx >= 0 && monthIdx < 12) {
        monthlyAgg[monthIdx].collected += Number(r.amount || 0);
      }
    });

    monthlyAgg.forEach(m => {
      m.target = targetPerMonth;
    });

    return monthlyAgg.slice(0, 6);
  };

  const getDashboardStats = () => {
    let filteredRecords = [...feeRecords];
    const termFiltered = globalFilters.term || 'Term 1';
    
    let relevantStudents = [...studentList];
    if (globalFilters.grade || globalFilters.stream) {
      relevantStudents = relevantStudents.filter(s => {
        const matchesGrade = !globalFilters.grade || s.grade?.toLowerCase() === globalFilters.grade.toLowerCase();
        const matchesStream = !globalFilters.stream || s.stream?.toLowerCase() === globalFilters.stream.toLowerCase();
        return matchesGrade && matchesStream;
      });
      
      const matchingRegNos = new Set(relevantStudents.map(s => s.registration_no));
      filteredRecords = filteredRecords.filter(r => matchingRegNos.has(r.registration_no));
    }

    let totalExpected = 0;
    relevantStudents.forEach(s => {
      totalExpected += Number(settingsData[s.grade] || 0);
    });

    const collected = filteredRecords
      .filter(r => r.term?.toLowerCase() === termFiltered.toLowerCase())
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const balance = totalExpected - collected;
    const rate = totalExpected > 0 ? Math.round((collected / totalExpected) * 100) : 0;

    return [
      { title: 'Total Collected', value: `Ksh ${collected.toLocaleString()}`, icon: '💰', accent: '#059669', trend: `${rate}%` },
      { title: 'Pending Balance', value: `Ksh ${Math.max(0, balance).toLocaleString()}`, icon: '⏳', accent: '#d97706', trend: `${100 - rate}%` },
      { title: 'Collection Rate', value: `${rate}%`, icon: '📊', accent: '#0891b2', trend: `${rate}%` },
      { title: 'Monthly Target', value: `Ksh ${totalExpected.toLocaleString()}`, icon: '🎯', accent: '#6366f1', trend: '0%' },
    ];
  };

  const handleOpenModal = (type) => { 
    setModalType(type); 
    setShowModal(true); 
    if (type === 'settings' && grades.length > 0) {
      setSelectedGradeForActivities(grades[0]);
      fetchActivities(grades[0]);
    }
  };
  const handleCloseModal = () => { setShowModal(false); setModalType(''); };

  const handlePaymentSubmit = async () => {
    if (!paymentData.registration_no || !paymentData.amount) { alert('Please fill required fields'); return; }
    setSaving(true);
    try {
      const modeMapping = {
        mpesa: 'M-Pesa',
        cash: 'Cash',
        bank: 'Bank Transfer'
      };
      const payload = { 
        registration_no: paymentData.registration_no, 
        amount: paymentData.amount, 
        mode: modeMapping[paymentData.mode] || 'Cash', 
        transaction_code: paymentData.transaction_code, 
        date_of_payment: paymentData.date || null, 
        term: paymentData.term 
      };
      const r = await api.post('fees/record/', payload);
      setSuccessMessage(r.data.message || 'Payment recorded!');
      setPaymentData({ registration_no: '', amount: '', mode: 'mpesa', transaction_code: '', date: '', term: 'Term 1' });
      handleCloseModal(); fetchFeeData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { showMessage({ type: "error: ",text: "Error" + JSON.stringify(err.response?.data || err.message, null, 2) }); }
    finally { setSaving(false); }
  };

  const viewFeeReciept = async (fee_id) => {
    try {
      const r = await api.get(`fees/${fee_id}/receipt/`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch { showMessage({ type: 'error',text: 'Failed to download receipt.'}); }
  };

  const handleReminderSubmit = () => {
    if (!reminderData.grade) { showMessage({ type: 'warning',text: 'Select a grade' }); return; }
    setSaving(true);
    setSuccessMessage('Reminders sent!'); setReminderData({ grade: '', message: '' }); handleCloseModal();
    setTimeout(() => setSuccessMessage(''), 3000);
    setSaving(false);
  };

  const fetchActivities = async (grade) => {
    try {
      const r = await api.get(`fees/activities/?grade=${grade}`);
      setActivitiesData(r.data || []);
    } catch (err) {
      console.error('Failed to fetch activities', err);
    }
  };

  const handleAddActivity = () => {
    setActivitiesData([...activitiesData, { activity_name: '', amount: '' }]);
  };

  const handleActivityChange = (index, field, value) => {
    const newActivities = [...activitiesData];
    newActivities[index][field] = value;
    setActivitiesData(newActivities);
  };

  const handleRemoveActivity = (index) => {
    setActivitiesData(activitiesData.filter((_, i) => i !== index));
  };

  const handleSettingsSubmit = async () => {
    setSaving(true);
    try {
      // Save Grade Fee Config
      await api.post('fees/by-grade/', settingsData);
      
      // Save Activities for selected grade
      if (selectedGradeForActivities) {
        await api.post('fees/activities/', {
          grade: selectedGradeForActivities,
          activities: activitiesData
        });
      }

      setSuccessMessage('Fee settings updated!');
      handleCloseModal();
      fetchFeeData(); 
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      showMessage({ type: 'error',text: 'Failed to update fee settings.' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleMpesaSubmit = () => {
    if (!mpesaSettings.studentsKey || !mpesaSettings.merchantCode) { alert('Fill required fields'); return; }
    setSuccessMessage('M-Pesa settings saved!'); setMpesaSettings({ studentsKey: '', merchantCode: '', shortCode: '' }); handleCloseModal();
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`fees/${id}/update-status/`, { status });
      setSuccessMessage(`Payment ${status.toLowerCase()}ed!`);
      fetchFeeRecords();
      fetchFeeData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      showMessage({ type: 'error', text:'Failed to update payment status'});
    }
  };

  const handleGenerateRecordReport = async () => {
    setIsGeneratingReport(true);
    try {
      const params = { 
        report_type: 'Fee Records', 
        period: recordReport.period, 
        term: recordReport.term, 
        export_format: recordReport.format,
        search: recordFilters.search,
        mode: recordFilters.mode
      };
      if (recordFilters.date) params.start_date = recordFilters.date;
      const r = await api.get(`reports/generate_fee_records/?${new URLSearchParams(params).toString()}`, {responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: r.headers['content-type'] }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `fee_records_${recordReport.period}_${new Date().toISOString().slice(0,10)}.${recordReport.format.toLowerCase()}`, style: 'display:none' });
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err) { showMessage({ type: 'error', text: `Failed: ${err.message}`}); }
    finally { setIsGeneratingReport(false); }
  };

  const handleGenerateFeeReport = async () => {
    setIsGeneratingReport(true);
    try {
      const params = new URLSearchParams({
        report_type: reportCriteria.reportType,
        grade: reportCriteria.grade,
        stream: reportCriteria.stream,
        term: reportCriteria.term,
        start_date: reportCriteria.start_date,
        end_date: reportCriteria.end_date,
        export_format: reportCriteria.format.toLowerCase()
      });
      
      let endpoint = 'reports/generate_fee_report/';
      if (reportCriteria.reportType === 'outstanding-balance' || reportCriteria.reportType === 'fee-collection-summary') {
        endpoint = 'reports/fee_collection_summary_report/';
      }

      const r = await api.get(`${endpoint}?${params.toString()}`, {responseType: 'blob' });
      const contentType = r.headers['content-type'] || 'application/pdf';
      const fileExt = reportCriteria.format.toLowerCase() === 'excel' ? 'xlsx' : reportCriteria.format.toLowerCase();
      const url = URL.createObjectURL(new Blob([r.data], { type: contentType }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `fee_report_${reportCriteria.reportType}_${new Date().toISOString().slice(0,10)}.${fileExt}`, style: 'display:none' });
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
      handleCloseModal();
    } catch (err) { showMessage({ type: 'error',text: `Failed: ${err.message}`}); }
    finally { setIsGeneratingReport(false); }
  };

  const handleGenerateAllReceipts = async () => {
    if (!receiptCriteria.grade || !receiptCriteria.stream) {
      showMessage({ type: 'warning',text: 'Please select grade and stream'});
      return;
    }
    setIsGeneratingReport(true);
    try {
      const params = new URLSearchParams({
        grade: receiptCriteria.grade,
        stream: receiptCriteria.stream,
        term: receiptCriteria.term
      });
      // Corrected endpoint from urls.py: path('fees/<int:fee_id>/receipt/', print_fee_reciept, name='print-fee-receipt') 
      // but wait, the user said print_all_fee_reciepts which is not in the urlpatterns I saw earlier? 
      // Let me re-check urlpatterns.
      
      const r = await api.get(`fees/generate-all-fee-receipts/?${params.toString()}`, { responseType: 'blob' });
      // I need to check the exact URL path for print_all_fee_reciepts
      
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      handleCloseModal();
    } catch (err) {
      showMessage({ type: 'error',text: 'Failed to generate receipts. Check if the endpoint exists.' });
    } finally {
      setIsGeneratingReport(false);
    }
  };


  const maxTarget = Math.max(...monthlyData.map(d => d.target), 1);
  const mpesaTotal = paymentModes[0]?.amount || 0;
  const cashTotal = paymentModes[1]?.amount || 0;
  const bankTotal = paymentModes[2]?.amount || 0;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'grades', label: 'Grade Summary', icon: '🏫' },
    { key: 'payments', label: 'Payment Modes', icon: '💳' },
    { key: 'more', label: 'More', icon: '⋯' },
  ];

  const moreActions = [
    { icon: '📝', title: 'Fee Records', desc: 'View detailed fee payment records', action: () => { setActiveTab('records'); handleOpenModal('records'); } },
    { icon: '🧾', title: 'Bulk Receipts', desc: 'Generate all receipts for a grade & stream', action: () => handleOpenModal('all_receipts') },
    { icon: '⏳', title: 'Confirm Payments', desc: 'Approve or reject pending student payments', action: () => handleOpenModal('confirm_payments') },
    { icon: '💳', title: 'Process Payment', desc: 'Record new fee payments', action: () => handleOpenModal('payment') },
    { icon: '📊', title: 'Generate Report', desc: 'Export fee collection reports', action: () => handleOpenModal('report') },
    { icon: '⚙️', title: 'Fee Settings', desc: 'Configure fee amounts and terms', action: () => handleOpenModal('settings') },
    { icon: '📧', title: 'Send Reminders', desc: 'Send payment reminders to parents', action: () => handleOpenModal('reminder') },
    { icon: '📱', title: 'M-Pesa Integration', desc: 'Manage M-Pesa payment settings', action: () => handleOpenModal('mpesa') },
  ];

  return (
    <div className={`fd-root ${animate ? 'fd-ready' : ''}`}>
      <div className="fd-blob fd-blob-1" />
      <div className="fd-blob fd-blob-2" />

      {/* ── SUCCESS ALERT ── */}
      {successMessage && (
        <div className="fd-alert">
          <span>✅ {successMessage}</span>
          <button className="fd-alert-close" onClick={() => setSuccessMessage('')}>✕</button>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="fd-header">
        <div className="fd-header-left">
          <div className="fd-header-icon">💰</div>
          <div>
            <h1 className="fd-title">Fee Management</h1>
            <p className="fd-subtitle">Comprehensive fee collection analytics and reporting</p>
          </div>
        </div>
        <div className="fd-header-actions">
          <button className="fd-btn-outline" onClick={() => handleOpenModal('report')}>
            <span>📥</span> Export Report
          </button>
          <button className="fd-btn-primary" onClick={() => handleOpenModal('payment')}>
            <span>+</span> New Payment
          </button>
        </div>
      </header>

      {/* ── GLOBAL FILTERS ── */}
      <div className="fd-global-filters" style={{
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
        marginBottom: '1.5rem',
        background: 'var(--fd-surface)',
        padding: '1rem 1.5rem',
        borderRadius: 'var(--fd-radius)',
        border: '1px solid var(--fd-border)',
        position: 'relative',
        zIndex: 5,
        flexWrap: 'wrap'
      }}>
        <span className="fd-label" style={{ margin: 0, fontSize: '0.8rem', color: 'var(--fd-text)' }}>Global Filters:</span>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="fd-muted" style={{ fontSize: '0.8rem' }}>Grade:</span>
          <select 
            className="fd-input" 
            style={{ width: 'auto', minWidth: '130px', padding: '0.4rem 0.75rem' }} 
            value={globalFilters.grade} 
            onChange={e => setGlobalFilters({ ...globalFilters, grade: e.target.value, stream: '' })}
          >
            <option value="">All Grades</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="fd-muted" style={{ fontSize: '0.8rem' }}>Stream:</span>
          <select 
            className="fd-input" 
            style={{ width: 'auto', minWidth: '130px', padding: '0.4rem 0.75rem' }} 
            value={globalFilters.stream} 
            onChange={e => setGlobalFilters({ ...globalFilters, stream: e.target.value })}
            disabled={!globalFilters.grade}
          >
            <option value="">All Streams</option>
            {streams.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="fd-muted" style={{ fontSize: '0.8rem' }}>Term:</span>
          <select 
            className="fd-input" 
            style={{ width: 'auto', minWidth: '130px', padding: '0.4rem 0.75rem' }} 
            value={globalFilters.term} 
            onChange={e => setGlobalFilters({ ...globalFilters, term: e.target.value })}
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="fd-stats-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fd-stat fd-skeleton" style={{ '--delay': `${i * 0.08}s` }}>
                <div className="sk-line sk-short" /><div className="sk-line sk-long" />
              </div>
            ))
          : getDashboardStats().map((s, i) => (
              <div key={i} className="fd-stat" style={{ '--acc': s.accent, '--delay': `${i * 0.1}s` }}>
                <div className="fd-stat-top">
                  <span className="fd-stat-label">{s.title}</span>
                  <span className="fd-trend">{s.trend} ↑</span>
                </div>
                <div className="fd-stat-bottom">
                  <span className="fd-stat-value">{s.value}</span>
                  <span className="fd-stat-icon">{s.icon}</span>
                </div>
                <div className="fd-stat-bar"><div className="fd-stat-bar-fill" /></div>
              </div>
            ))}
      </div>

      {/* ── TABS ── */}
      <div className="fd-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`fd-tab ${activeTab === t.key ? 'fd-tab-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="fd-tab-content">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="fd-overview-grid">
            {/* Bar Chart */}
            <div className="fd-card fd-card-chart">
              <div className="fd-card-header">
                <div>
                  <span className="fd-card-title">Monthly Fee Collection</span>
                  <span className="fd-card-sub">Collected vs Target</span>
                </div>
                <span className="fd-card-badge">📈</span>
              </div>
            <div className="fd-chart-area" style={{ padding: '2rem 1.5rem 1rem' }}>
              {(() => {
                const dynamicMonthly = getFilteredMonthlyData();
                const maxVal = Math.max(...dynamicMonthly.map(d => Math.max(d.collected, d.target)), 1000);
                const width = 600;
                const height = 200;
                const padding = 40; 
                
                const pointsCollected = dynamicMonthly.map((d, i) => {
                  const x = padding + (i * (width - padding * 2) / (dynamicMonthly.length - 1));
                  const y = height - padding - ((d.collected / maxVal) * (height - padding * 2));
                  return `${x},${y}`;
                }).join(' ');

                const pointsTarget = dynamicMonthly.map((d, i) => {
                  const x = padding + (i * (width - padding * 2) / (dynamicMonthly.length - 1));
                  const y = height - padding - ((d.target / maxVal) * (height - padding * 2));
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <div style={{ position: 'relative', height: '230px', marginBottom: '1rem' }}>
                    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                        const y = padding + pct * (height - padding * 2);
                        return (
                          <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                        );
                      })}

                      <text x={12} y={height / 2} transform={`rotate(-90, 12, ${height / 2})`} style={{ fontSize: '0.65rem', fill: 'var(--fd-text-muted)', textAnchor: 'middle', letterSpacing: '1px' }}>AMOUNT (KSH)</text>

                      <path
                        d={`M ${padding},${height - padding} L ${pointsCollected} L ${width - padding},${height - padding} Z`}
                        fill="url(#collectedGrad)"
                      />

                      <polyline
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeWidth="2"
                        strokeDasharray="5 5"
                        points={pointsTarget}
                      />

                      <polyline
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="3.5"
                        points={pointsCollected}
                      />

                      {dynamicMonthly.map((d, i) => {
                        const x = padding + (i * (width - padding * 2) / (dynamicMonthly.length - 1));
                        const y = height - padding - ((d.collected / maxVal) * (height - padding * 2));
                        return (
                          <circle key={i} cx={x} cy={y} r="4.5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5">
                            <title>{`Month: ${d.month}\nCollected: Ksh ${d.collected.toLocaleString()}\nTarget: Ksh ${d.target.toLocaleString()}`}</title>
                          </circle>
                        );
                      })}
                    </svg>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: `0 ${padding}px`, marginTop: '15px' }}>
                      {dynamicMonthly.map((d, i) => (
                        <span key={i} style={{ fontSize: '0.75rem', color: 'var(--fd-text-muted)', fontWeight: 600 }}>{d.month}</span>
                      ))}
                    </div>
                    
                    <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--fd-text-muted)', letterSpacing: '1px', marginTop: '10px' }}>
                      TIMELINE (MONTHS)
                    </div>
                  </div>
                );
              })()}
                <div className="fd-chart-legend">
                  <div className="fd-legend-item"><span className="fd-legend-dot fd-dot-collected" />Collected</div>
                  <div className="fd-legend-item"><span className="fd-legend-dot fd-dot-target" />Target</div>
                </div>
              </div>
            </div>

            {/* Payment distribution */}
            <div className="fd-card fd-card-dist">
              <div className="fd-card-header">
                <div>
                  <span className="fd-card-title">Payment Distribution</span>
                  <span className="fd-card-sub">By mode</span>
                </div>
                <span className="fd-card-badge">💳</span>
              </div>
              <div className="fd-dist-body">
                {getFilteredPaymentModes().map((m, i) => (
                  <div key={i} className="fd-dist-item" style={{ '--acc': m.accent }}>
                    <div className="fd-dist-top">
                      <div className="fd-dist-icon">
                        {m.mode === 'M-Pesa' ? '📱' : m.mode === 'Cash' ? '💵' : '🏦'}
                      </div>
                      <div className="fd-dist-info">
                        <span className="fd-dist-mode">{m.mode}</span>
                        <span className="fd-dist-amount">Ksh {m.amount.toLocaleString()}</span>
                      </div>
                      <span className="fd-dist-pct">{m.percentage}%</span>
                    </div>
                    <div className="fd-dist-track">
                      <div className="fd-dist-fill" style={{ width: `${m.percentage}%`, '--delay': `${i * 0.15}s` }} />
                    </div>
                  </div>
                ))}
                <div className="fd-dist-total">
                  <span>Total Collected</span>
                  <strong>Ksh {getFilteredPaymentModes().reduce((sum, m) => sum + m.amount, 0).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GRADES */}
        {activeTab === 'grades' && (
          <div className="fd-card">
            <div className="fd-card-header">
              <div>
                <span className="fd-card-title">Fee Summary by Grade</span>
                <span className="fd-card-sub">All grades overview</span>
              </div>
              <span className="fd-card-badge">🏫</span>
            </div>
            <div className="fd-table-wrap">
              <table className="fd-table">
                <thead>
                  <tr>
                    <th>Grade</th><th>Streams</th><th>Students</th>
                    <th>Total Fee</th><th>Collected</th><th>Balance</th>
                    <th>Progress</th><th>M-Pesa</th><th>Cash</th><th>Bank</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeData.map((g, i) => {
                    const pct = ((g.collected / g.totalFee) * 100).toFixed(1);
                    return (
                      <tr key={i} className="fd-tr" style={{ '--ri': i }}>
                        <td><span className="fd-grade-chip">{g.grade}</span></td>
                        <td><span className="fd-stream-chip">{g.streams}</span></td>
                        <td className="fd-num">{g.totalStudents}</td>
                        <td className="fd-num fd-bold">Ksh {g.totalFee.toLocaleString()}</td>
                        <td className="fd-num fd-green">Ksh {g.collected.toLocaleString()}</td>
                        <td className="fd-num fd-amber">Ksh {g.balance.toLocaleString()}</td>
                        <td>
                          <div className="fd-prog-cell">
                            <div className="fd-prog-track"><div className="fd-prog-fill" style={{ width: `${pct}%`, '--delay': `${i * 0.06}s` }} /></div>
                            <span className="fd-prog-label">{pct}%</span>
                          </div>
                        </td>
                        <td className="fd-num fd-indigo">Ksh {g.mpesa.toLocaleString()}</td>
                        <td className="fd-num fd-cyan">Ksh {g.cash.toLocaleString()}</td>
                        <td className="fd-num fd-amber">Ksh {(g.bank_transfer || 0).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  <tr className="fd-tr-total">
                    <td colSpan="3" className="fd-bold">TOTAL</td>
                    <td className="fd-bold">Ksh {gradeData.reduce((s, g) => s + g.totalFee, 0).toLocaleString()}</td>
                    <td className="fd-bold fd-green">Ksh {gradeData.reduce((s, g) => s + g.collected, 0).toLocaleString()}</td>
                    <td className="fd-bold fd-amber">Ksh {gradeData.reduce((s, g) => s + g.balance, 0).toLocaleString()}</td>
                    <td className="fd-bold">{((gradeData.reduce((s, g) => s + g.collected, 0) / gradeData.reduce((s, g) => s + g.totalFee, 0)) * 100).toFixed(1)}%</td>
                    <td className="fd-bold fd-indigo">Ksh {gradeData.reduce((s, g) => s + g.mpesa, 0).toLocaleString()}</td>
                    <td className="fd-bold fd-cyan">Ksh {gradeData.reduce((s, g) => s + (g.cash || 0), 0).toLocaleString()}</td>
                    <td className="fd-bold fd-amber">Ksh {gradeData.reduce((s, g) => s + (g.bank_transfer || 0), 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="fd-payments-grid">
            {paymentModes.map((m, i) => (
              <div key={i} className="fd-card fd-payment-card" style={{ '--acc': m.accent }}>
                <div className="fd-card-header">
                  <div>
                    <span className="fd-card-title">{m.mode}</span>
                    <span className="fd-card-sub">Payment method breakdown</span>
                  </div>
                  <span className="fd-pct-badge">{m.percentage}%</span>
                </div>
                <div className="fd-payment-rows">
                  {[
                    ['Total Amount', `Ksh ${m.amount.toLocaleString()}`],
                    ['Transactions', m.count],
                    ['Avg. Transaction', `Ksh ${Math.floor(m.amount / Math.max(m.count, 1)).toLocaleString()}`],
                    ['Collection Rate', `${m.percentage}%`],
                  ].map(([label, val], j) => (
                    <div key={j} className="fd-detail-row">
                      <span className="fd-detail-label">{label}</span>
                      <strong className="fd-detail-val">{val}</strong>
                    </div>
                  ))}
                </div>
                <div className="fd-payment-prog">
                  <div className="fd-payment-prog-fill" style={{ width: `${m.percentage}%`, '--delay': `${i * 0.2}s` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MORE */}
        {activeTab === 'more' && (
          <div className="fd-more-grid">
            {moreActions.map((a, i) => (
              <button key={i} className="fd-action-card" style={{ '--delay': `${i * 0.07}s` }} onClick={a.action}>
                <span className="fd-action-icon">{a.icon}</span>
                <span className="fd-action-title">{a.title}</span>
                <span className="fd-action-desc">{a.desc}</span>
                <span className="fd-action-arrow">→</span>
                <div className="fd-action-shine" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════ MODALS ══════════════ */}
      {showModal && (
        <div className="fd-overlay" onClick={handleCloseModal}>
          <div className={`fd-modal ${modalType === 'records' || modalType === 'settings' ? 'fd-modal-lg' : ''}`} onClick={e => e.stopPropagation()}>

            {/* ── CONFIRM PAYMENTS MODAL ── */}
            {modalType === 'confirm_payments' && (
              <>
                <div className="fd-modal-header">
                  <div className="fd-modal-title"><span>⏳</span> Confirm Pending Payments</div>
                  <button className="fd-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="fd-modal-body">
                  {recordsLoading ? (
                    <div className="fd-loading"><div className="fd-spinner" /><span>Loading pending payments…</span></div>
                  ) : (
                    <div className="fd-table-wrap fd-table-modal">
                      <table className="fd-table">
                        <thead>
                          <tr><th>Date</th><th>Student</th><th>Amount</th><th>Transaction Code</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                          {feeRecords.filter(r => r.status === 'Pending' && (r.mode_of_payment === 'M-Pesa' || r.mode_of_payment === 'Bank Transfer')).length === 0
                            ? <tr><td colSpan="5" className="fd-empty-cell">No pending payments to confirm.</td></tr>
                            : feeRecords.filter(r => r.status === 'Pending' && (r.mode_of_payment === 'M-Pesa' || r.mode_of_payment === 'Bank Transfer')).map(r => (
                              <tr key={r.id} className="fd-tr">
                                <td className="fd-mono">{r.date_of_payment}</td>
                                <td>{r.student_name} <span className="fd-muted">({r.registration_no})</span></td>
                                <td className="fd-bold fd-green">Ksh {r.amount?.toLocaleString()}</td>
                                <td><span className="fd-mode-chip">{r.transaction_code}</span></td>
                                <td>
                                  <div className="fd-action-btns">
                                    <button className="fd-btn-approve" onClick={() => handleUpdateStatus(r.id, 'Confirmed')}>Approve</button>
                                    <button className="fd-btn-reject" onClick={() => handleUpdateStatus(r.id, 'Rejected')}>Reject</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="fd-modal-footer">
                  <button className="fd-btn-cancel" onClick={handleCloseModal}>Close</button>
                </div>
              </>
            )}

            {/* ── PAYMENT MODAL ── */}
            {modalType === 'payment' && (
              <>
                <div className="fd-modal-header">
                  <div className="fd-modal-title"><span>💳</span> Process Payment</div>
                  <button className="fd-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="fd-modal-body">
                  <div className="fd-form-grid">
                    <div className="fd-form-group fd-span-2">
                      <label className="fd-label">Student <span className="fd-req">*</span></label>
                      <select className="fd-input" value={paymentData.registration_no} onChange={e => setPaymentData({ ...paymentData, registration_no: e.target.value })} disabled={studentsLoading}>
                        <option value="">Select a student...</option>
                        {studentList.map(s => <option key={s.registration_no} value={s.registration_no}>{s.first_name} {s.surname} ({s.registration_no}) — {s.grade}</option>)}
                      </select>
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Term <span className="fd-req">*</span></label>
                      <select className="fd-input" value={paymentData.term} onChange={e => setPaymentData({ ...paymentData, term: e.target.value })}>
                        <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                      </select>
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Amount <span className="fd-req">*</span></label>
                      <input className="fd-input" type="number" placeholder="Enter amount" value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })} />
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Payment Mode <span className="fd-req">*</span></label>
                      <select className="fd-input" value={paymentData.mode} onChange={e => setPaymentData({ ...paymentData, mode: e.target.value })}>
                        <option value="mpesa">M-Pesa</option>
                        <option value="cash">Cash</option>
                        <option value="bank">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Transaction Code</label>
                      <input className="fd-input" type="text" placeholder="Transaction code" value={paymentData.transaction_code} onChange={e => setPaymentData({ ...paymentData, transaction_code: e.target.value })} />
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Date</label>
                      <input className="fd-input" type="date" value={paymentData.date} onChange={e => setPaymentData({ ...paymentData, date: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="fd-modal-footer">
                  <button className="fd-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="fd-btn-save" onClick={handlePaymentSubmit} disabled={saving}>
                    {saving ? 'Saving...' : 'Record Payment'}
                  </button>
                </div>
              </>
            )}

            {/* ── RECORDS MODAL ── */}
            {modalType === 'records' && (
              <>
                <div className="fd-modal-header">
                  <div className="fd-modal-title"><span>📝</span> Fee Records</div>
                  <button className="fd-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="fd-modal-body">
                  <div className="fd-rec-filters">
                    <div className="fd-search-wrap">
                      <span>🔍</span>
                      <input className="fd-input fd-search" type="text" placeholder="Search student..." value={recordFilters.search} onChange={e => setRecordFilters({ ...recordFilters, search: e.target.value })} />
                    </div>
                    <select className="fd-input" value={recordFilters.grade} onChange={e => setRecordFilters({ ...recordFilters, grade: e.target.value, stream: '' })}>
                      <option value="">All Grades</option>
                      {grades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select className="fd-input" value={recordFilters.stream} onChange={e => setRecordFilters({ ...recordFilters, stream: e.target.value })} disabled={!recordFilters.grade}>
                      <option value="">All Streams</option>
                      {streams.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="fd-input" value={recordFilters.term} onChange={e => setRecordFilters({ ...recordFilters, term: e.target.value })}>
                      <option value="">All Terms</option>
                      <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                    </select>
                    <input className="fd-input" type="date" value={recordFilters.date} onChange={e => setRecordFilters({ ...recordFilters, date: e.target.value })} />
                    <select className="fd-input" value={recordFilters.mode} onChange={e => setRecordFilters({ ...recordFilters, mode: e.target.value })}>
                      <option value="all">All Modes</option>
                      <option value="MPesa">M-Pesa</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                    <select className="fd-input" value={recordFilters.sort} onChange={e => setRecordFilters({ ...recordFilters, sort: e.target.value })}>
                      <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="amount_desc">Highest Amount</option>
                    </select>
                  </div>
                  {recordsLoading ? (
                    <div className="fd-loading"><div className="fd-spinner" /><span>Loading records…</span></div>
                  ) : (
                    <div className="fd-table-wrap fd-table-modal">
                      <table className="fd-table">
                        <thead>
                          <tr><th>Date</th><th>Student</th><th>Amount</th><th>Mode</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                          {getFilteredRecords().length === 0
                            ? <tr><td colSpan="5" className="fd-empty-cell">No records found.</td></tr>
                            : getFilteredRecords().map(r => (
                              <tr key={r.id} className="fd-tr">
                                <td className="fd-mono">{r.date_of_payment}</td>
                                <td>{r.student_name} <span className="fd-muted">({r.registration_no})</span></td>
                                <td className="fd-bold fd-green">Ksh {r.amount?.toLocaleString()}</td>
                                <td><span className="fd-mode-chip">{r.mode_of_payment}</span></td>
                                <td><button className="fd-view-btn" onClick={() => viewFeeReciept(r.id)}>View Receipt</button></td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Total Paid & Fee Balance Summary */}
                  <div className="fd-records-summary" style={{
                      marginTop: '1.5rem',
                      marginBottom: '1.5rem',
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff'
                  }}>
                    <div>
                      <span className="fd-muted" style={{ marginRight: '0.5rem', opacity: 0.7 }}>Total Paid (Filtered):</span>
                      <strong style={{ color: '#10b981', fontSize: '1.1rem' }}>
                        Ksh {getFilteredRecords().reduce((sum, r) => sum + Number(r.amount || 0), 0).toLocaleString()}
                      </strong>
                    </div>
                    {(() => {
                      const filtered = getFilteredRecords();
                      const uniqueRegNos = [...new Set(filtered.map(r => r.registration_no))];
                      
                      let totalExpected = 0;
                      let totalPaidForFiltered = 0;

                      uniqueRegNos.forEach(regNo => {
                        const studentObj = studentList.find(s => s.registration_no === regNo);
                        const total_students = studentList.find(s => s.grade).count
                        
                        if (studentObj) {
                          const expected = settingsData[studentObj.grade] || 0;
                          totalExpected += Number(expected);
                          totalExpected *= total_students

                        }
                        
                        const termFiltered = recordFilters.term || 'Term 1';
                        const paid = feeRecords
                          .filter(r => r.registration_no === regNo && r.term === termFiltered)
                          .reduce((sum, r) => sum + Number(r.amount || 0), 0);
                        totalPaidForFiltered += paid;
                      });

                      const balance = totalExpected - totalPaidForFiltered;
                      
                      return (
                        <div>
                          {totalExpected > 0 && (
                            <>
                              <span className="fd-muted" style={{ marginRight: '0.6rem', opacity: 0.7 }}>Total Expected:</span>
                              <strong style={{ color: '#5863ffff', fontSize: '1.1rem' }}>
                              Ksh {totalExpected.toLocaleString()}</strong>
                          
                          </>
                          )}
                          
                          <span className="fd-muted" style={{ marginLeft: '0.1rem', marginRight: '0.5rem', opacity: 0.7 }}>Fee Balance:</span>
                          <strong style={{ color: balance <= 0 ? '#10b981' : '#f59e0b', fontSize: '1.1rem' }}>
                            Ksh {balance.toLocaleString()}
                          </strong>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="fd-report-section">
                    <span className="fd-report-label">Generate Report</span>
                    <div className="fd-report-row">
                      <select className="fd-input" value={recordReport.period} onChange={e => setRecordReport({ ...recordReport, period: e.target.value })}>
                        <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="termly">Termly</option>
                      </select>
                      {recordReport.period === 'termly' && (
                        <select className="fd-input" value={recordReport.term} onChange={e => setRecordReport({ ...recordReport, term: e.target.value })}>
                          <option>Term 1</option><option>Term 2</option><option>Term 3</option>
                        </select>
                      )}
                      <select className="fd-input" value={recordReport.format} onChange={e => setRecordReport({ ...recordReport, format: e.target.value })}>
                        <option value="pdf">PDF</option><option value="csv">CSV</option>
                      </select>
                      <button className="fd-btn-save" onClick={handleGenerateRecordReport} disabled={isGeneratingReport}>
                        {isGeneratingReport ? 'Generating…' : '⬇ Download'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="fd-modal-footer">
                  <button className="fd-btn-cancel" onClick={handleCloseModal}>Close</button>
                </div>
              </>
            )}

            {/* ── REPORT MODAL ── */}
            {modalType === 'report' && (
              <>
                <div className="fd-modal-header">
                  <div className="fd-modal-title"><span>📊</span> Generate Report</div>
                  <button className="fd-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="fd-modal-body">
                  <div className="fd-form-grid">
                    <div className="fd-form-group fd-span-2">
                      <label className="fd-label">Report Type</label>
                      <select className="fd-input" value={reportCriteria.reportType} onChange={e => setReportCriteria({ ...reportCriteria, reportType: e.target.value })}>
                        <option value="monthly-collection">Monthly Collection Report</option>
                        <option value="grade-wise">Grade-wise Summary</option>
                        <option value="payment-mode">Payment Mode Analysis</option>
                        <option value="outstanding-balance">Outstanding Balance Report</option>
                        <option value="fee-collection-summary">Fee Collection Analytics Summary</option>
                      </select>
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Select Grade</label>
                      <select className="fd-input" value={reportCriteria.grade} onChange={e => setReportCriteria({ ...reportCriteria, grade: e.target.value, stream: '' })}>
                        <option value="">All Grades</option>
                        {grades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Select Stream</label>
                      <select className="fd-input" value={reportCriteria.stream} onChange={e => setReportCriteria({ ...reportCriteria, stream: e.target.value })} disabled={!reportCriteria.grade}>
                        <option value="">All Streams</option>
                        {streams.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Select Term</label>
                      <select className="fd-input" value={reportCriteria.term} onChange={e => setReportCriteria({ ...reportCriteria, term: e.target.value })}>
                        <option value="Term 1">Term 1</option>
                        <option value="Term 2">Term 2</option>
                        <option value="Term 3">Term 3</option>
                      </select>
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Format</label>
                      <select className="fd-input" value={reportCriteria.format} onChange={e => setReportCriteria({ ...reportCriteria, format: e.target.value })}>
                        <option>PDF</option><option>Excel</option><option>CSV</option>
                      </select>
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Start Date</label>
                      <input type="date" className="fd-input" value={reportCriteria.start_date} onChange={e => setReportCriteria({ ...reportCriteria, start_date: e.target.value })} />
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">End Date</label>
                      <input type="date" className="fd-input" value={reportCriteria.end_date} onChange={e => setReportCriteria({ ...reportCriteria, end_date: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="fd-modal-footer">
                  <button className="fd-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="fd-btn-save" onClick={handleGenerateFeeReport} disabled={isGeneratingReport}>{isGeneratingReport ? 'Generating…' : 'Generate & Download'}</button>
                </div>
              </>
            )}

            {/* ── SETTINGS MODAL ── */}
            {modalType === 'settings' && (
              <>
                <div className="fd-modal-header">
                  <div className="fd-modal-title"><span>⚙️</span> Fee Settings</div>
                  <button className="fd-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="fd-modal-body">
                  <div className="fd-settings-grid">
                    <section className="fd-settings-section">
                      <h3 className="fd-section-title">Grade Expected Fees</h3>
                      <div className="fd-form-grid">
                        {Object.keys(settingsData).length > 0
                          ? Object.keys(settingsData).map(g => (
                            <div key={g} className="fd-form-group">
                              <label className="fd-label">{g} Fee</label>
                              <input className="fd-input" type="number" value={settingsData[g]} onChange={e => setSettingsData({ ...settingsData, [g]: e.target.value })} />
                            </div>
                          ))
                          : <div className="fd-form-group fd-span-2"><p className="fd-muted">No grades found. Configure streams first.</p></div>}
                      </div>
                    </section>

                    <div className="fd-divider" />

                    <section className="fd-settings-section">
                      <div className="fd-section-header">
                        <h3 className="fd-section-title">Fee Activity Breakdown</h3>
                        <select 
                          className="fd-input fd-grade-select" 
                          value={selectedGradeForActivities} 
                          onChange={(e) => {
                            setSelectedGradeForActivities(e.target.value);
                            fetchActivities(e.target.value);
                          }}
                        >
                          {grades.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      
                      <div className="fd-activities-list">
                        {activitiesData.map((act, idx) => (
                          <div key={idx} className="fd-activity-row">
                            <input 
                              className="fd-input" 
                              placeholder="Activity Name (e.g. Tuition)" 
                              value={act.activity_name} 
                              onChange={(e) => handleActivityChange(idx, 'activity_name', e.target.value)}
                            />
                            <input 
                              className="fd-input" 
                              type="number" 
                              placeholder="Amount" 
                              value={act.amount} 
                              onChange={(e) => handleActivityChange(idx, 'amount', e.target.value)}
                            />
                            <button className="fd-btn-remove" onClick={() => handleRemoveActivity(idx)}>✕</button>
                          </div>
                        ))}
                        <button className="fd-btn-add" onClick={handleAddActivity}>+ Add Activity</button>
                      </div>
                      <p className="fd-hint">Define how the total fee for {selectedGradeForActivities} is distributed across activities for the receipt breakdown.</p>
                    </section>
                  </div>
                </div>
                <div className="fd-modal-footer">
                  <button className="fd-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="fd-btn-save" onClick={handleSettingsSubmit} disabled={saving}>
                    {saving ? 'Saving...' : 'Save All Settings'}
                  </button>
                </div>
              </>
            )}

            {/* ── REMINDER MODAL ── */}
            {modalType === 'reminder' && (
              <>
                <div className="fd-modal-header">
                  <div className="fd-modal-title"><span>📧</span> Send Reminders</div>
                  <button className="fd-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="fd-modal-body">
                  <div className="fd-form-grid">
                    <div className="fd-form-group fd-span-2">
                      <label className="fd-label">Select Grade <span className="fd-req">*</span></label>
                      <select className="fd-input" value={reminderData.grade} onChange={e => setReminderData({ ...reminderData, grade: e.target.value })}>
                        <option value="">Choose a grade...</option>
                        {grades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="fd-form-group fd-span-2">
                      <label className="fd-label">Message</label>
                      <textarea className="fd-input fd-textarea" rows={4} placeholder="Enter reminder message" value={reminderData.message} onChange={e => setReminderData({ ...reminderData, message: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="fd-modal-footer">
                  <button className="fd-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="fd-btn-save" onClick={handleReminderSubmit} disabled={saving}>
                    {saving ? 'Sending...' : 'Send Reminders'}
                  </button>
                </div>
              </>
            )}

            {/* ── MPESA MODAL ── */}
            {modalType === 'mpesa' && (
              <>
                <div className="fd-modal-header">
                  <div className="fd-modal-title"><span>📱</span> M-Pesa Integration</div>
                  <button className="fd-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="fd-modal-body">
                  <div className="fd-form-grid">
                    <div className="fd-form-group fd-span-2">
                      <label className="fd-label">API Key <span className="fd-req">*</span></label>
                      <input className="fd-input" type="password" placeholder="Enter M-Pesa API Key" value={mpesaSettings.studentsKey} onChange={e => setMpesaSettings({ ...mpesaSettings, studentsKey: e.target.value })} />
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Merchant Code <span className="fd-req">*</span></label>
                      <input className="fd-input" type="text" placeholder="Merchant Code" value={mpesaSettings.merchantCode} onChange={e => setMpesaSettings({ ...mpesaSettings, merchantCode: e.target.value })} />
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Short Code</label>
                      <input className="fd-input" type="text" placeholder="Short Code" value={mpesaSettings.shortCode} onChange={e => setMpesaSettings({ ...mpesaSettings, shortCode: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="fd-modal-footer">
                  <button className="fd-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="fd-btn-save" onClick={handleMpesaSubmit}>Save Settings</button>
                </div>
              </>
            )}

            {/* ── ALL RECEIPTS MODAL ── */}
            {modalType === 'all_receipts' && (
              <>
                <div className="fd-modal-header">
                  <div className="fd-modal-title"><span>🧾</span> Bulk Fee Receipts</div>
                  <button className="fd-modal-close" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="fd-modal-body">
                  <div className="fd-form-grid">
                    <div className="fd-form-group fd-span-2">
                      <label className="fd-label">Grade <span className="fd-req">*</span></label>
                      <select 
                        className="fd-input" 
                        value={receiptCriteria.grade} 
                        onChange={e => setReceiptCriteria({ ...receiptCriteria, grade: e.target.value, stream: '' })}
                      >
                        <option value="">Select Grade</option>
                        {grades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Stream <span className="fd-req">*</span></label>
                      <select 
                        className="fd-input" 
                        value={receiptCriteria.stream} 
                        onChange={e => setReceiptCriteria({ ...receiptCriteria, stream: e.target.value })}
                        disabled={!receiptCriteria.grade}
                      >
                        <option value="">Select Stream</option>
                        {streams.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="fd-form-group">
                      <label className="fd-label">Term <span className="fd-req">*</span></label>
                      <select 
                        className="fd-input" 
                        value={receiptCriteria.term} 
                        onChange={e => setReceiptCriteria({ ...receiptCriteria, term: e.target.value })}
                      >
                        <option>Term 1</option>
                        <option>Term 2</option>
                        <option>Term 3</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="fd-modal-footer">
                  <button className="fd-btn-cancel" onClick={handleCloseModal}>Cancel</button>
                  <button className="fd-btn-save" onClick={handleGenerateAllReceipts} disabled={isGeneratingReport}>
                    {isGeneratingReport ? 'Generating...' : 'Generate Receipts'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}