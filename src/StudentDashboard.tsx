import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Play, CheckCircle2, Trophy, Clock, ChevronRight, User } from 'lucide-react';
import { Lesson, fetchLessonsByClass, fetchStudentResults, HomeworkResult, Profile } from './data';

interface StudentDashboardProps {
  profile: Profile;
  onSelectLesson: (lesson: Lesson) => void;
  onLogout: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ profile, onSelectLesson, onLogout }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [results, setResults] = useState<HomeworkResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [fetchedLessons, fetchedResults] = await Promise.all([
        profile.class_code ? fetchLessonsByClass(profile.class_code) : Promise.resolve([]),
        fetchStudentResults(profile.id)
      ]);
      setLessons(fetchedLessons);
      setResults(fetchedResults);
      setIsLoading(false);
    };
    loadData();
  }, [profile.id, profile.class_code]);

  const getLessonStatus = (lessonId: string) => {
    const result = results.find(r => r.lesson_id === lessonId);
    if (result) return { completed: true, score: result.score, total: result.total };
    return { completed: false };
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-[#2D3436] mb-2 flex items-center gap-3">
              Hello, {profile.name}! 👋
            </h1>
            <p className="text-[#636E72] text-lg font-medium">Ready for today's English adventure?</p>
          </div>
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-[#E9ECEF]">
            <div className="w-12 h-12 bg-[#4A90E2] rounded-xl flex items-center justify-center text-white font-bold text-xl">
              {profile.name[0]}
            </div>
            <div className="pr-4">
              <p className="text-sm font-bold text-[#2D3436]">{profile.name}</p>
              <button onClick={onLogout} className="text-xs text-[#4A90E2] font-semibold hover:underline">Sign Out</button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-3xl shadow-sm border border-[#E9ECEF] flex items-center gap-4">
            <div className="w-14 h-14 bg-[#E3F2FD] rounded-2xl flex items-center justify-center text-[#4A90E2]">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#636E72] uppercase tracking-wider">Available Lessons</p>
              <p className="text-3xl font-black text-[#2D3436]">{lessons.length}</p>
            </div>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-3xl shadow-sm border border-[#E9ECEF] flex items-center gap-4">
            <div className="w-14 h-14 bg-[#E8F5E9] rounded-2xl flex items-center justify-center text-[#4CAF50]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#636E72] uppercase tracking-wider">Completed</p>
              <p className="text-3xl font-black text-[#2D3436]">{results.length}</p>
            </div>
          </motion.div>
          <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-3xl shadow-sm border border-[#E9ECEF] flex items-center gap-4">
            <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center text-[#FF9800]">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#636E72] uppercase tracking-wider">Average Score</p>
              <p className="text-3xl font-black text-[#2D3436]">
                {results.length > 0 
                  ? Math.round(results.reduce((acc, r) => acc + (r.score / r.total), 0) / results.length * 100) + '%'
                  : '0%'}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Lessons List */}
        <h2 className="text-2xl font-bold text-[#2D3436] mb-6 flex items-center gap-2">
          <Play className="w-6 h-6 text-[#4A90E2] fill-current" />
          Start Learning
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A90E2]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson, index) => {
              const status = getLessonStatus(lesson.id);
              return (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectLesson(lesson)}
                  className="group bg-white rounded-[2rem] p-6 shadow-sm border border-[#E9ECEF] hover:shadow-xl hover:border-[#4A90E2] transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-[#F1F3F5] rounded-2xl flex items-center justify-center text-[#4A90E2] group-hover:bg-[#4A90E2] group-hover:text-white transition-colors">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    {status.completed && (
                      <div className="bg-[#E8F5E9] text-[#4CAF50] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        COMPLETED
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-[#2D3436] mb-2 group-hover:text-[#4A90E2] transition-colors">{lesson.title}</h3>
                  <p className="text-[#636E72] text-sm mb-6 line-clamp-2">{lesson.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 text-[#B2BEC3] text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      <span>{lesson.sentences.length} Sentences</span>
                    </div>
                    {status.completed && (
                      <div className="text-sm font-bold text-[#4CAF50]">
                        Score: {status.score}/{status.total}
                      </div>
                    )}
                  </div>

                  <div className="absolute right-4 bottom-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                    <ChevronRight className="w-6 h-6 text-[#4A90E2]" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
