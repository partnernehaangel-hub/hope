import React, { useState, useEffect } from 'react';
import { 
  Search, 
  QrCode, 
  CheckCircle2, 
  History, 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Share2, 
  Camera, 
  Scan, 
  UserCheck, 
  UserX, 
  Clock, 
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Student, Attendance as AttendanceType } from '../../types';

interface AttendanceProps {
  students: Student[];
  attendance: AttendanceType[];
  setAttendance: (attendance: AttendanceType[]) => void;
  masterData: any;
  currentUser: any;
}

export const Attendance = ({ students, attendance, setAttendance, masterData, currentUser }: AttendanceProps) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'history'>('scan');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (showScanner) {
      scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 }, false);
      scanner.render(onScanSuccess, onScanError);
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(error => console.error('Failed to clear scanner', error));
      }
    };
  }, [showScanner]);

  const onScanSuccess = (decodedText: string) => {
    const student = students.find(s => s.studentId === decodedText);
    if (student) {
      markAttendance(student, 'Present');
      setScanResult(`Attendance marked for ${student.name}`);
      setShowScanner(false);
      setTimeout(() => setScanResult(null), 3000);
    } else {
      setScanResult('Invalid QR Code');
    }
  };

  const onScanError = (err: any) => {
    // console.warn(err);
  };

  const markAttendance = (student: Student, status: AttendanceType['status']) => {
    const newEntry: AttendanceType = {
      id: Date.now().toString(),
      studentId: student.studentId,
      studentName: student.name,
      class: student.class,
      section: student.section,
      status,
      date: attendanceDate,
      time: new Date().toLocaleTimeString(),
      markedBy: currentUser?.name || 'System'
    };
    setAttendance([newEntry, ...attendance]);
  };

  const filteredStudents = students.filter(s => 
    (!selectedClass || s.class === selectedClass) &&
    (!selectedSection || s.section === selectedSection) &&
    (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.studentId.includes(searchTerm))
  );

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(attendance);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Attendance_${attendanceDate}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendance Report", 14, 15);
    doc.text(`Date: ${attendanceDate}`, 14, 25);
    
    const data = attendance.map(a => [a.date, a.studentName, a.class, a.section, a.status, a.time]);
    (doc as any).autoTable({
      head: [['Date', 'Student', 'Class', 'Section', 'Status', 'Time']],
      body: data,
      startY: 35
    });
    doc.save(`Attendance_${attendanceDate}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-text-heading tracking-tight uppercase">Attendance Management</h1>
          <p className="text-text-sub font-medium">Mark and track student attendance via QR or manual entry.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToExcel} className="btn-secondary flex items-center gap-2"><FileSpreadsheet size={18} /> Excel</button>
          <button onClick={exportToPDF} className="btn-secondary flex items-center gap-2"><FileText size={18} /> PDF</button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button onClick={() => setActiveTab('scan')} className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'scan' ? 'border-primary text-primary' : 'border-transparent text-text-sub'}`}>QR Scanner</button>
        <button onClick={() => setActiveTab('manual')} className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'manual' ? 'border-primary text-primary' : 'border-transparent text-text-sub'}`}>Manual Entry</button>
        <button onClick={() => setActiveTab('history')} className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-text-sub'}`}>History</button>
      </div>

      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 p-8 flex flex-col items-center justify-center min-h-[400px]">
            {!showScanner ? (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <QrCode size={48} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold">Ready to Scan</h3>
                <p className="text-text-sub max-w-xs mx-auto">Position the student's ID card QR code within the scanner frame.</p>
                <button onClick={() => setShowScanner(true)} className="btn-primary px-8 py-4 flex items-center gap-3 mx-auto">
                  <Camera size={20} /> Start Scanner
                </button>
              </div>
            ) : (
              <div className="w-full max-w-md mx-auto">
                <div id="reader" className="rounded-2xl overflow-hidden border-4 border-primary/20"></div>
                <button onClick={() => setShowScanner(false)} className="mt-6 text-red-500 font-bold flex items-center gap-2 mx-auto">
                  <X size={20} /> Stop Scanner
                </button>
              </div>
            )}
            {scanResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-6 p-4 rounded-xl font-bold flex items-center gap-3 ${scanResult.includes('Invalid') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {scanResult.includes('Invalid') ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                {scanResult}
              </motion.div>
            )}
          </Card>
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Clock size={20} className="text-primary" /> Recent Scans</h3>
            <div className="space-y-4">
              {attendance.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-bold text-sm">{a.studentName}</p>
                    <p className="text-[10px] text-text-sub uppercase font-bold">{a.class} - {a.section}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-primary">{a.time}</p>
                    <span className="text-[8px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase">Present</span>
                  </div>
                </div>
              ))}
              {attendance.length === 0 && <p className="text-center text-text-sub italic py-8">No scans yet today.</p>}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select label="Class" options={masterData.classes} value={selectedClass} onChange={(e: any) => setSelectedClass(e.target.value)} />
              <Select label="Section" options={masterData.sections} value={selectedSection} onChange={(e: any) => setSelectedSection(e.target.value)} />
              <div className="md:col-span-2">
                <Input label="Search Student" placeholder="Name or ID..." value={searchTerm} onChange={(e: any) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredStudents.map((student) => {
              const todayAttendance = attendance.find(a => a.studentId === student.studentId && a.date === attendanceDate);
              return (
                <Card key={student.id} className="p-5 hover:shadow-xl transition-all border-2 border-transparent hover:border-primary/10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-black text-primary">
                      {student.name[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-text-heading">{student.name}</h4>
                      <p className="text-xs font-bold text-text-sub uppercase tracking-wider">{student.studentId}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => markAttendance(student, 'Present')}
                      disabled={!!todayAttendance}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${todayAttendance?.status === 'Present' ? 'bg-green-500 text-white' : 'bg-slate-100 text-text-sub hover:bg-green-50 hover:text-green-600'}`}
                    >
                      Present
                    </button>
                    <button 
                      onClick={() => markAttendance(student, 'Absent')}
                      disabled={!!todayAttendance}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${todayAttendance?.status === 'Absent' ? 'bg-red-500 text-white' : 'bg-slate-100 text-text-sub hover:bg-red-50 hover:text-red-600'}`}
                    >
                      Absent
                    </button>
                    <button 
                      onClick={() => markAttendance(student, 'Late')}
                      disabled={!!todayAttendance}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${todayAttendance?.status === 'Late' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-text-sub hover:bg-orange-50 hover:text-orange-600'}`}
                    >
                      Late
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2"><History size={20} className="text-primary" /> Attendance Records</h3>
            <div className="flex gap-3">
              <Input type="date" value={attendanceDate} onChange={(e: any) => setAttendanceDate(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 font-bold text-xs uppercase text-text-secondary tracking-wider">Student</th>
                  <th className="pb-4 font-bold text-xs uppercase text-text-secondary tracking-wider">Class</th>
                  <th className="pb-4 font-bold text-xs uppercase text-text-secondary tracking-wider">Status</th>
                  <th className="pb-4 font-bold text-xs uppercase text-text-secondary tracking-wider">Time</th>
                  <th className="pb-4 font-bold text-xs uppercase text-text-secondary tracking-wider">Marked By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attendance.filter(a => a.date === attendanceDate).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4">
                      <p className="font-bold text-sm text-text-heading">{a.studentName}</p>
                      <p className="text-[10px] text-text-sub font-bold">{a.studentId}</p>
                    </td>
                    <td className="py-4 text-sm text-text-sub">{a.class} - {a.section}</td>
                    <td className="py-4">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${
                        a.status === 'Present' ? 'bg-green-100 text-green-700' :
                        a.status === 'Absent' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-text-sub">{a.time}</td>
                    <td className="py-4 text-sm text-text-sub">{a.markedBy}</td>
                  </tr>
                ))}
                {attendance.filter(a => a.date === attendanceDate).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-sub italic font-medium">No records found for this date.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
