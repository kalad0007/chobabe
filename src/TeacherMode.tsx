import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Lesson, Sentence, Word, fetchLessons, saveLessonToSupabase, deleteLessonFromSupabase } from './data';

interface TeacherModeProps {
  onClose: () => void;
  onLessonAdded: () => void;
}

export const TeacherMode: React.FC<TeacherModeProps> = ({ onClose, onLessonAdded }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [editingLesson, setEditingLesson] = useState<Partial<Lesson> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    setIsLoading(true);
    const data = await fetchLessons();
    setLessons(data);
    setIsLoading(false);
  };

  const startNewLesson = () => {
    setEditingLesson({
      id: `lesson-${Date.now()}`,
      title: '',
      topic: '',
      level: 'Elementary',
      goal: '',
      sentences: [],
      grammar: { point: '', explanation: '', example: '' },
      vocab: [],
      comprehensionQuestions: []
    });
  };

  const handleSave = async () => {
    if (!editingLesson || !editingLesson.title) return;
    
    setIsLoading(true);
    const result = await saveLessonToSupabase(editingLesson as Lesson);
    if (result.success) {
      await loadLessons();
      setEditingLesson(null);
      onLessonAdded();
    } else {
      setErrorMessage(`저장 중 오류가 발생했습니다: ${result.error || '알 수 없는 오류'}`);
    }
    setIsLoading(false);
  };

  const deleteLesson = async (id: string) => {
    setIsLoading(true);
    const result = await deleteLessonFromSupabase(id);
    if (result.success) {
      await loadLessons();
      onLessonAdded();
      setConfirmDeleteId(null);
    } else {
      setErrorMessage(`삭제 중 오류가 발생했습니다: ${result.error || '알 수 없는 오류'}`);
    }
    setIsLoading(false);
  };

  if (isLoading && !editingLesson) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-gray-500 font-bold">데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (editingLesson) {
    return (
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 space-y-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-gray-900">새 레슨 만들기</h2>
          <button onClick={() => setEditingLesson(null)} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-500 uppercase">레슨 제목</label>
            <input 
              type="text" 
              value={editingLesson.title} 
              onChange={e => setEditingLesson({...editingLesson, title: e.target.value})}
              className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold"
              placeholder="예: The Brave Little Robot"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-500 uppercase">주제</label>
            <input 
              type="text" 
              value={editingLesson.topic} 
              onChange={e => setEditingLesson({...editingLesson, topic: e.target.value})}
              className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold"
              placeholder="예: Courage and Friendship"
            />
          </div>
        </div>

        {/* Sentences Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">문장 (10개 권장)</h3>
            <button 
              onClick={() => setEditingLesson({
                ...editingLesson, 
                sentences: [...(editingLesson.sentences || []), { id: (editingLesson.sentences?.length || 0) + 1, english: '', korean: '' }]
              })}
              className="flex items-center gap-2 text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
            >
              <Plus size={20} /> 문장 추가
            </button>
          </div>
          <div className="space-y-3">
            {editingLesson.sentences?.map((s, i) => (
              <div key={i} className="flex gap-3 items-start bg-gray-50 p-4 rounded-2xl">
                <span className="font-bold text-blue-500 pt-3">{i + 1}</span>
                <div className="flex-1 space-y-2">
                  <input 
                    type="text" 
                    value={s.english} 
                    onChange={e => {
                      const newSentences = [...(editingLesson.sentences || [])];
                      newSentences[i].english = e.target.value;
                      setEditingLesson({...editingLesson, sentences: newSentences});
                    }}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none"
                    placeholder="English sentence"
                  />
                  <input 
                    type="text" 
                    value={s.korean} 
                    onChange={e => {
                      const newSentences = [...(editingLesson.sentences || [])];
                      newSentences[i].korean = e.target.value;
                      setEditingLesson({...editingLesson, sentences: newSentences});
                    }}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none"
                    placeholder="한국어 해석"
                  />
                </div>
                <button 
                  onClick={() => {
                    const newSentences = editingLesson.sentences?.filter((_, idx) => idx !== i);
                    setEditingLesson({...editingLesson, sentences: newSentences});
                  }}
                  className="p-2 text-red-400 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Vocab Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">핵심 단어</h3>
            <button 
              onClick={() => setEditingLesson({
                ...editingLesson, 
                vocab: [...(editingLesson.vocab || []), { word: '', meaning: '', example: '' }]
              })}
              className="flex items-center gap-2 text-blue-600 font-bold hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
            >
              <Plus size={20} /> 단어 추가
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editingLesson.vocab?.map((v, i) => (
              <div key={i} className="bg-gray-50 p-4 rounded-2xl space-y-2 relative group">
                <input 
                  type="text" 
                  value={v.word} 
                  onChange={e => {
                    const newVocab = [...(editingLesson.vocab || [])];
                    newVocab[i].word = e.target.value;
                    setEditingLesson({...editingLesson, vocab: newVocab});
                  }}
                  className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none font-bold"
                  placeholder="Word"
                />
                <input 
                  type="text" 
                  value={v.meaning} 
                  onChange={e => {
                    const newVocab = [...(editingLesson.vocab || [])];
                    newVocab[i].meaning = e.target.value;
                    setEditingLesson({...editingLesson, vocab: newVocab});
                  }}
                  className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none"
                  placeholder="Meaning"
                />
                <button 
                  onClick={() => {
                    const newVocab = editingLesson.vocab?.filter((_, idx) => idx !== i);
                    setEditingLesson({...editingLesson, vocab: newVocab});
                  }}
                  className="absolute top-2 right-2 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 flex justify-end gap-4">
          <button onClick={() => setEditingLesson(null)} className="px-8 py-3 font-bold text-gray-500">취소</button>
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {isLoading ? '저장 중...' : '레슨 저장하기'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-gray-900">선생님 관리 도구</h2>
        <button 
          onClick={startNewLesson}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus size={24} /> 새 레슨 추가
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {lessons.map(lesson => (
          <div key={lesson.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{lesson.title}</h3>
              <p className="text-gray-500 font-medium">{lesson.topic} • {lesson.sentences.length} 문장</p>
            </div>
            <div className="flex gap-2">
              {confirmDeleteId === lesson.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-500">정말 삭제할까요?</span>
                  <button 
                    onClick={() => deleteLesson(lesson.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold"
                  >
                    삭제
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteId(null)}
                    className="bg-gray-200 text-gray-600 px-3 py-1 rounded-lg text-sm font-bold"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmDeleteId(lesson.id)}
                  className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={24} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl flex items-center gap-2 z-[100]">
          <X size={20} className="cursor-pointer" onClick={() => setErrorMessage(null)} />
          {errorMessage}
        </div>
      )}

      <div className="flex justify-center pt-8">
        <button onClick={onClose} className="text-gray-400 font-bold hover:text-gray-600">돌아가기</button>
      </div>
    </div>
  );
};
