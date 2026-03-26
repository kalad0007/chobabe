import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Trophy, 
  BarChart3, 
  ChevronRight, 
  Search, 
  Calendar, 
  Layout, 
  Eye, 
  LogOut,
  Loader2,
  Settings,
  MoreVertical,
  User,
  School,
  Copy,
  Check,
  Send,
  X
} from 'lucide-react';
import { 
  Lesson, 
  fetchLessons, 
  fetchAllHomeworkResults, 
  HomeworkResult, 
  Profile, 
  deleteLessonFromSupabase,
  Class,
  fetchClasses,
  saveClass,
  deleteClass,
  fetchAssignments,
  saveAssignment,
  deleteAssignment,
  HomeworkAssignment,
  SAMPLE_LESSON
} from './data';
import { TeacherMode } from './TeacherMode';
import { supabase } from './supabase';

interface TeacherDashboardProps {
  profile: Profile;
  onPreviewLesson: (lesson: Lesson) => void;
  onLogout: () => void;
}

interface StudentStats {
  name: string;
  classCode: string;
  completedCount: number;
  totalScore: number;
  totalPossible: number;
  lastActive: string;
  results: HomeworkResult[];
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ profile, onPreviewLesson, onLogout }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [results, setResults] = useState<HomeworkResult[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CLASSES' | 'STUDENTS' | 'LESSONS'>('OVERVIEW');
  const [showLessonEditor, setShowLessonEditor] = useState(false);
  const [showClassEditor, setShowClassEditor] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<{ classId: string; className: string } | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'class' | 'lesson', id: string, name: string } | null>(null);

  const generateId = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedLessons, fetchedResults, fetchedClasses] = await Promise.all([
        fetchLessons().catch(err => {
          console.error('Lessons fetch failed:', err);
          return [SAMPLE_LESSON]; // Fallback only for UI display if needed, but log the error
        }),
        fetchAllHomeworkResults().catch(err => {
          console.error('Results fetch failed:', err);
          return [];
        }),
        fetchClasses(profile.id).catch(err => {
          console.error('Classes fetch failed:', err);
          throw err; // Re-throw to trigger the main catch
        })
      ]);
      
      setLessons(fetchedLessons);
      setResults(fetchedResults);
      setClasses(fetchedClasses);
      
      // Fetch all assignments for all classes
      const allAssignments = await Promise.all(
        fetchedClasses.map(c => fetchAssignments(c.id).catch(() => []))
      );
      setAssignments(allAssignments.flat());

      // Fetch all students to get their class codes
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');
      
      if (profilesError) {
        console.error('Error fetching student profiles:', profilesError);
      }
      setStudentProfiles(profiles || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      // If it's a "Failed to fetch" error, it's likely a connection issue
      if (err.message === 'Failed to fetch') {
        showFeedback('error', 'Supabase 연결에 실패했습니다. 환경 변수 설정을 확인해 주세요.');
      } else {
        showFeedback('error', '데이터를 불러오는 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteLesson = async (id: string) => {
    const result = await deleteLessonFromSupabase(id);
    if (result.success) {
      loadData();
      showFeedback('success', 'Lesson deleted successfully!');
      setConfirmDelete(null);
    } else {
      showFeedback('error', 'Error deleting lesson: ' + result.error);
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const id = generateId();

      const newClass: Class = {
        id,
        name: newClassName,
        code,
        teacher_id: profile.id
      };

      const result = await saveClass(newClass);
      if (result.success) {
        setNewClassName('');
        setShowClassEditor(false);
        loadData();
        showFeedback('success', 'Class created successfully!');
      } else {
        showFeedback('error', 'Error creating class: ' + result.error);
      }
    } catch (err: any) {
      console.error('Exception in handleCreateClass:', err);
      showFeedback('error', 'An unexpected error occurred: ' + err.message);
    }
  };

  const handleDeleteClass = async (id: string) => {
    const result = await deleteClass(id);
    if (result.success) {
      loadData();
      showFeedback('success', 'Class deleted successfully!');
      setConfirmDelete(null);
    } else {
      showFeedback('error', 'Error deleting class: ' + result.error);
    }
  };

  const handleAssignLesson = async (lessonId: string, classId: string) => {
    const assignment: HomeworkAssignment = {
      id: generateId(),
      lesson_id: lessonId,
      class_id: classId
    };

    const result = await saveAssignment(assignment);
    if (result.success) {
      loadData();
      setShowAssignModal(null);
      showFeedback('success', 'Lesson assigned successfully!');
    } else {
      showFeedback('error', 'Error assigning lesson: ' + result.error);
    }
  };

  const handleRemoveAssignment = async (lessonId: string, classId: string) => {
    const result = await deleteAssignment(lessonId, classId);
    if (result.success) {
      loadData();
      showFeedback('success', 'Assignment removed successfully!');
    } else {
      showFeedback('error', 'Error removing assignment: ' + result.error);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Initialize stats with all student profiles
  const studentStats = studentProfiles.reduce((acc, profile) => {
    acc[profile.id] = {
      name: profile.name || 'Unknown Student',
      classCode: profile.class_code || 'N/A',
      completedCount: 0,
      totalScore: 0,
      totalPossible: 0,
      lastActive: 'N/A',
      results: []
    };
    return acc;
  }, {} as Record<string, StudentStats>);

  // Update stats with results
  results.forEach(curr => {
    const studentId = curr.user_id;
    if (studentStats[studentId]) {
      studentStats[studentId].completedCount++;
      studentStats[studentId].totalScore += curr.score;
      studentStats[studentId].totalPossible += curr.total;
      
      if (studentStats[studentId].lastActive === 'N/A' || new Date(curr.completed_at) > new Date(studentStats[studentId].lastActive)) {
        studentStats[studentId].lastActive = curr.completed_at;
      }
      studentStats[studentId].results.push(curr);
    }
  });

  const studentEntries = Object.entries(studentStats) as [string, StudentStats][];

  const filteredStudents = studentEntries.filter(([_, stats]) => {
    const matchesSearch = stats.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClassFilter === 'ALL' || stats.classCode === selectedClassFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-[#E9ECEF] flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-[#4A90E2] rounded-xl flex items-center justify-center shadow-lg">
            <Layout className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-black text-[#2D3436]">EduAdmin</span>
        </div>

        <nav className="space-y-2 flex-1">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'OVERVIEW' ? 'bg-[#4A90E2] text-white shadow-md' : 'text-[#636E72] hover:bg-[#F1F3F5]'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('CLASSES')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'CLASSES' ? 'bg-[#4A90E2] text-white shadow-md' : 'text-[#636E72] hover:bg-[#F1F3F5]'
            }`}
          >
            <School className="w-5 h-5" />
            Classes
          </button>
          <button
            onClick={() => setActiveTab('STUDENTS')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'STUDENTS' ? 'bg-[#4A90E2] text-white shadow-md' : 'text-[#636E72] hover:bg-[#F1F3F5]'
            }`}
          >
            <Users className="w-5 h-5" />
            Students
          </button>
          <button
            onClick={() => setActiveTab('LESSONS')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'LESSONS' ? 'bg-[#4A90E2] text-white shadow-md' : 'text-[#636E72] hover:bg-[#F1F3F5]'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            Lessons
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-[#E9ECEF]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#F1F3F5] rounded-full flex items-center justify-center text-[#4A90E2]">
              <User className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-[#2D3436] truncate">{profile.name}</p>
              <p className="text-xs text-[#636E72] truncate">{profile.email}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[#FF4757] hover:bg-[#FFF0F0] transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-12 h-12 text-[#4A90E2] animate-spin" />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-black text-[#2D3436]">Dashboard Overview</h1>
                  <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-[#E9ECEF] flex items-center gap-2 text-[#636E72] text-sm font-bold">
                    <Calendar className="w-4 h-4" />
                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E9ECEF]">
                    <div className="w-12 h-12 bg-[#E3F2FD] rounded-2xl flex items-center justify-center text-[#4A90E2] mb-4">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-[#636E72] uppercase tracking-wider">Total Students</p>
                    <p className="text-3xl font-black text-[#2D3436]">{Object.keys(studentStats).length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E9ECEF]">
                    <div className="w-12 h-12 bg-[#E8F5E9] rounded-2xl flex items-center justify-center text-[#4CAF50] mb-4">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-[#636E72] uppercase tracking-wider">Active Lessons</p>
                    <p className="text-3xl font-black text-[#2D3436]">{lessons.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E9ECEF]">
                    <div className="w-12 h-12 bg-[#FFF3E0] rounded-2xl flex items-center justify-center text-[#FF9800] mb-4">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-[#636E72] uppercase tracking-wider">Submissions</p>
                    <p className="text-3xl font-black text-[#2D3436]">{results.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E9ECEF]">
                    <div className="w-12 h-12 bg-[#F3E5F5] rounded-2xl flex items-center justify-center text-[#9C27B0] mb-4">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-[#636E72] uppercase tracking-wider">Avg. Achievement</p>
                    <p className="text-3xl font-black text-[#2D3436]">
                      {results.length > 0 
                        ? Math.round(results.reduce((acc, r) => acc + (r.score / r.total), 0) / results.length * 100) + '%'
                        : '0%'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-3xl shadow-sm border border-[#E9ECEF] p-8">
                    <h2 className="text-xl font-bold text-[#2D3436] mb-6">Recent Submissions</h2>
                    <div className="space-y-4">
                      {results.slice(0, 5).map((res, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#4A90E2] font-bold shadow-sm">
                              {res.user_name?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#2D3436]">{res.user_name}</p>
                              <p className="text-xs text-[#636E72]">{res.lesson_title}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-[#4CAF50]">{Math.round((res.score / res.total) * 100)}%</p>
                            <p className="text-[10px] text-[#B2BEC3]">{new Date(res.completed_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                      {results.length === 0 && (
                        <p className="text-center text-[#636E72] py-10">No submissions yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl shadow-sm border border-[#E9ECEF] p-8">
                    <h2 className="text-xl font-bold text-[#2D3436] mb-6">Top Performing Students</h2>
                    <div className="space-y-4">
                      {studentEntries
                        .sort((a, b) => (b[1].totalScore / b[1].totalPossible) - (a[1].totalScore / a[1].totalPossible))
                        .slice(0, 5)
                        .map(([id, stats], i) => (
                          <div key={id} className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#FF9800] font-bold shadow-sm">
                                {i + 1}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[#2D3436]">{stats.name}</p>
                                <p className="text-xs text-[#636E72]">{stats.completedCount} lessons completed</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-[#4A90E2]">{Math.round((stats.totalScore / stats.totalPossible) * 100)}%</p>
                            </div>
                          </div>
                        ))}
                      {Object.keys(studentStats).length === 0 && (
                        <p className="text-center text-[#636E72] py-10">No student data yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'CLASSES' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-black text-[#2D3436]">Class Management</h1>
                  <button
                    onClick={() => setShowClassEditor(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#4A90E2] text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:bg-[#357ABD] transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    New Class
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classes.map((cls) => {
                    const classAssignments = assignments.filter(a => a.class_id === cls.id);
                    return (
                      <div key={cls.id} className="bg-white rounded-3xl p-6 shadow-sm border border-[#E9ECEF] hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 bg-[#F1F3F5] rounded-2xl flex items-center justify-center text-[#4A90E2]">
                            <School className="w-6 h-6" />
                          </div>
                          <button 
                            onClick={() => handleDeleteClass(cls.id)}
                            className="p-2 text-[#B2BEC3] hover:text-[#FF4757] transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <h3 className="text-xl font-bold text-[#2D3436] mb-1">{cls.name}</h3>
                        <div className="flex items-center gap-2 mb-6">
                          <span className="text-sm font-mono bg-[#F8F9FA] px-2 py-1 rounded border border-[#E9ECEF] text-[#4A90E2] font-bold">
                            {cls.code}
                          </span>
                          <button 
                            onClick={() => copyToClipboard(cls.code)}
                            className="p-1 text-[#B2BEC3] hover:text-[#4A90E2] transition-colors"
                          >
                            {copiedCode === cls.code ? <Check className="w-4 h-4 text-[#4CAF50]" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>

                        <div className="space-y-3 mb-6">
                          <p className="text-xs font-bold text-[#636E72] uppercase tracking-wider">Assigned Lessons</p>
                          {classAssignments.length > 0 ? (
                            <div className="space-y-2">
                              {classAssignments.map(a => {
                                const lesson = lessons.find(l => l.id === a.lesson_id);
                                return (
                                  <div key={a.id} className="flex items-center justify-between p-2 bg-[#F8F9FA] rounded-xl text-sm">
                                    <span className="truncate font-medium text-[#2D3436]">{lesson?.title || 'Unknown Lesson'}</span>
                                    <button 
                                      onClick={() => handleRemoveAssignment(a.lesson_id, cls.id)}
                                      className="text-[#B2BEC3] hover:text-[#FF4757]"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-[#B2BEC3] italic">No lessons assigned yet.</p>
                          )}
                        </div>

                        <button 
                          onClick={() => setShowAssignModal({ classId: cls.id, className: cls.name })}
                          className="w-full py-3 bg-[#F1F3F5] text-[#4A90E2] rounded-xl font-bold hover:bg-[#E3F2FD] transition-all flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Assign Lesson
                        </button>
                      </div>
                    );
                  })}
                  {classes.length === 0 && (
                    <div className="col-span-full py-20 text-center text-[#636E72] bg-white rounded-3xl border border-dashed border-[#B2BEC3]">
                      <School className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No classes created yet. Create your first class to start assigning homework!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'STUDENTS' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h1 className="text-3xl font-black text-[#2D3436]">Student Management</h1>
                  <div className="flex flex-wrap gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 text-[#B2BEC3] w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 pr-4 py-3 bg-white border border-[#E9ECEF] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition-all w-64 shadow-sm"
                      />
                    </div>
                    <select 
                      value={selectedClassFilter}
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                      className="px-4 py-3 bg-white border border-[#E9ECEF] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4A90E2] transition-all shadow-sm font-bold text-[#636E72]"
                    >
                      <option value="ALL">All Classes</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.code}>{c.name} ({c.code})</option>
                      ))}
                      <option value="N/A">No Class</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-[#E9ECEF] overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF]">
                      <tr>
                        <th className="px-8 py-4 text-sm font-bold text-[#636E72] uppercase tracking-wider">Student</th>
                        <th className="px-8 py-4 text-sm font-bold text-[#636E72] uppercase tracking-wider">Class</th>
                        <th className="px-8 py-4 text-sm font-bold text-[#636E72] uppercase tracking-wider">Lessons</th>
                        <th className="px-8 py-4 text-sm font-bold text-[#636E72] uppercase tracking-wider">Avg. Score</th>
                        <th className="px-8 py-4 text-sm font-bold text-[#636E72] uppercase tracking-wider">Last Active</th>
                        <th className="px-8 py-4 text-sm font-bold text-[#636E72] uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9ECEF]">
                      {filteredStudents.map(([id, stats]) => (
                        <tr key={id} className="hover:bg-[#F8F9FA] transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#4A90E2] rounded-xl flex items-center justify-center text-white font-bold">
                                {stats.name[0]}
                              </div>
                              <span className="font-bold text-[#2D3436]">{stats.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-[#F1F3F5] text-[#495057] rounded-lg text-xs font-bold font-mono">
                              {stats.classCode}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-[#636E72] font-medium">{stats.completedCount}</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              {stats.totalPossible > 0 ? (
                                <>
                                  <div className="flex-1 h-2 bg-[#F1F3F5] rounded-full overflow-hidden max-w-[100px]">
                                    <div 
                                      className="h-full bg-[#4A90E2]" 
                                      style={{ width: `${(stats.totalScore / stats.totalPossible) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-bold text-[#2D3436]">
                                    {Math.round((stats.totalScore / stats.totalPossible) * 100)}%
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-[#B2BEC3]">No data</span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-[#636E72] text-sm">
                            {stats.lastActive === 'N/A' ? 'Never' : new Date(stats.lastActive).toLocaleDateString()}
                          </td>
                          <td className="px-8 py-6">
                            <button className="p-2 text-[#B2BEC3] hover:text-[#4A90E2] transition-colors">
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredStudents.length === 0 && (
                    <div className="py-20 text-center text-[#636E72]">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No students found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'LESSONS' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-black text-[#2D3436]">Lesson Management</h1>
                  <button
                    onClick={() => setShowLessonEditor(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#4A90E2] text-white rounded-2xl font-bold shadow-lg hover:shadow-xl hover:bg-[#357ABD] transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Create Lesson
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lessons.map((lesson) => (
                    <div key={lesson.id} className="bg-white rounded-3xl p-6 shadow-sm border border-[#E9ECEF] hover:shadow-xl transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-[#F1F3F5] rounded-2xl flex items-center justify-center text-[#4A90E2]">
                          <BookOpen className="w-6 h-6" />
                        </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => onPreviewLesson(lesson)}
                              className="p-2 text-[#B2BEC3] hover:text-[#4A90E2] transition-colors"
                              title="Preview as Student"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => setConfirmDelete({ type: 'lesson', id: lesson.id, name: lesson.title })}
                              className="p-2 text-[#B2BEC3] hover:text-[#FF4757] transition-colors"
                              title="Delete Lesson"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                      </div>
                      <h3 className="text-xl font-bold text-[#2D3436] mb-2">{lesson.title}</h3>
                      <p className="text-[#636E72] text-sm mb-6 line-clamp-2">{lesson.description}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-[#F1F3F5]">
                        <span className="text-xs font-bold text-[#B2BEC3] uppercase tracking-wider">
                          {lesson.sentences.length} Sentences
                        </span>
                        <ChevronRight className="w-5 h-5 text-[#B2BEC3] group-hover:text-[#4A90E2] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback Notification */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[100] font-bold text-white flex items-center gap-3 ${
            feedback.type === 'success' ? 'bg-[#4CAF50]' : 'bg-[#FF4757]'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {feedback.message}
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl"
          >
            <div className="w-16 h-16 bg-[#FFF0F0] rounded-2xl flex items-center justify-center text-[#FF4757] mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-[#2D3436] mb-2">Delete {confirmDelete.type === 'class' ? 'Class' : 'Lesson'}?</h3>
            <p className="text-[#636E72] mb-8">
              Are you sure you want to delete <span className="font-bold text-[#2D3436]">"{confirmDelete.name}"</span>? 
              This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-4 bg-[#F1F3F5] text-[#636E72] rounded-2xl font-bold hover:bg-[#E9ECEF] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete.type === 'class' ? handleDeleteClass(confirmDelete.id) : handleDeleteLesson(confirmDelete.id)}
                className="flex-1 py-4 bg-[#FF4757] text-white rounded-2xl font-bold hover:bg-[#FF3344] transition-all shadow-lg shadow-red-100"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Lesson Editor Modal */}
      <AnimatePresence>
        {showLessonEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-y-auto flex flex-col"
            >
              <TeacherMode 
                onClose={() => setShowLessonEditor(false)} 
                onLessonAdded={() => {
                  loadData();
                  setShowLessonEditor(false);
                }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Class Editor Modal */}
      <AnimatePresence>
        {showClassEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8"
            >
              <h2 className="text-2xl font-black text-[#2D3436] mb-6">Create New Class</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#636E72] mb-2">Class Name</label>
                  <input 
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g., Grade 3 - Class A"
                    className="w-full px-4 py-3 bg-[#F8F9FA] border border-[#E9ECEF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowClassEditor(false)}
                    className="flex-1 py-3 bg-[#F1F3F5] text-[#636E72] rounded-xl font-bold hover:bg-[#E9ECEF] transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateClass}
                    className="flex-1 py-3 bg-[#4A90E2] text-white rounded-xl font-bold hover:bg-[#357ABD] shadow-lg transition-all"
                  >
                    Create
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Lesson Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-8 flex flex-col max-h-[80vh]"
            >
              <h2 className="text-2xl font-black text-[#2D3436] mb-2">Assign Lesson</h2>
              <p className="text-[#636E72] mb-6">Select a lesson to assign to <span className="font-bold text-[#4A90E2]">{showAssignModal.className}</span></p>
              
              <div className="flex-1 overflow-auto space-y-3 pr-2">
                {lessons.map(lesson => {
                  const isAssigned = assignments.some(a => a.lesson_id === lesson.id && a.class_id === showAssignModal.classId);
                  return (
                    <button
                      key={lesson.id}
                      disabled={isAssigned}
                      onClick={() => handleAssignLesson(lesson.id, showAssignModal.classId)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isAssigned 
                          ? 'bg-[#F8F9FA] border-[#E9ECEF] opacity-50 cursor-not-allowed' 
                          : 'bg-white border-[#E9ECEF] hover:border-[#4A90E2] hover:shadow-md'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-bold text-[#2D3436]">{lesson.title}</p>
                        <p className="text-xs text-[#636E72]">{lesson.topic}</p>
                      </div>
                      {isAssigned ? (
                        <span className="text-xs font-bold text-[#4CAF50] bg-[#E8F5E9] px-2 py-1 rounded">Assigned</span>
                      ) : (
                        <Plus className="w-5 h-5 text-[#4A90E2]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => setShowAssignModal(null)}
                className="mt-6 w-full py-3 bg-[#F1F3F5] text-[#636E72] rounded-xl font-bold hover:bg-[#E9ECEF] transition-all"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
