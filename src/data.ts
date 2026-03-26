import { supabase } from './supabase';

export interface Word {
  word: string;
  meaning: string;
  example: string;
}

export interface Sentence {
  id: number;
  english: string;
  korean: string;
  expression?: string;
}

export interface Lesson {
  id: string;
  title: string;
  topic: string;
  level: string;
  goal: string;
  sentences: Sentence[];
  grammar: {
    point: string;
    explanation: string;
    example: string;
  };
  vocab: Word[];
  comprehensionQuestions: {
    question: string;
    options: string[];
    answer: number;
  }[];
  created_at?: string;
}

export const SAMPLE_LESSON: Lesson = {
  id: "lesson-1",
  title: "The Brave Little Robot",
  topic: "Courage and Friendship",
  level: "Elementary 3-4",
  goal: "Learn about the past tense and describe a story.",
  sentences: [
    { id: 1, english: "Once upon a time, there was a small robot named Sparky.", korean: "옛날 옛적에, 스파키라는 이름의 작은 로봇이 있었어요." },
    { id: 2, english: "Sparky lived in a big city full of tall buildings.", korean: "스파키는 높은 빌딩들로 가득 찬 큰 도시에 살았어요." },
    { id: 3, english: "One day, he found a lost puppy in the park.", korean: "어느 날, 그는 공원에서 길을 잃은 강아지를 발견했어요." },
    { id: 4, english: "The puppy was very scared and hungry.", korean: "강아지는 매우 무서워하고 배가 고팠어요." },
    { id: 5, english: "Sparky decided to help the puppy find its home.", korean: "스파키는 강아지가 집을 찾는 것을 도와주기로 결심했어요." },
    { id: 6, english: "They walked through the busy streets together.", korean: "그들은 함께 바쁜 거리를 걸어갔어요." },
    { id: 7, english: "Sparky shared his energy battery with the puppy's toy.", korean: "스파키는 자신의 에너지 배터리를 강아지의 장난감과 나누었어요." },
    { id: 8, english: "Finally, they saw a house with a red door.", korean: "마침내, 그들은 빨간 문이 있는 집을 보았어요." },
    { id: 9, english: "A little girl ran out and hugged her puppy.", korean: "한 어린 소녀가 달려 나와 강아지를 껴안았어요." },
    { id: 10, english: "Sparky felt very happy because he made a new friend.", korean: "스파키는 새로운 친구를 사귀어서 매우 행복했어요." },
  ],
  grammar: {
    point: "과거 시제 (Past Tense)",
    explanation: "과거에 일어난 일을 말할 때 동사 뒤에 -ed를 붙여요.",
    example: "lived, found, decided, walked, shared, felt"
  },
  vocab: [
    { word: "Brave", meaning: "용감한", example: "The brave boy saved the cat." },
    { word: "Robot", meaning: "로봇", example: "I have a toy robot." },
    { word: "Lost", meaning: "길을 잃은", example: "He was lost in the woods." },
    { word: "Puppy", meaning: "강아지", example: "The puppy is very cute." },
    { word: "Scared", meaning: "무서워하는", example: "Are you scared of spiders?" },
    { word: "Hungry", meaning: "배고픈", example: "I am hungry for pizza." },
    { word: "Together", meaning: "함께", example: "Let's play together." },
    { word: "Finally", meaning: "마침내", example: "Finally, the rain stopped." },
    { word: "Hugged", meaning: "껴안았다", example: "She hugged her mom." },
    { word: "Friend", meaning: "친구", example: "You are my best friend." },
  ],
  comprehensionQuestions: [
    {
      question: "What did Sparky find in the park?",
      options: ["A kitten", "A puppy", "A robot", "A toy"],
      answer: 1
    },
    {
      question: "What color was the door of the puppy's house?",
      options: ["Blue", "Green", "Red", "Yellow"],
      answer: 2
    }
  ]
};

export interface Profile {
  id: string;
  email: string;
  role: 'teacher' | 'student';
  name: string;
  class_code?: string;
}

export interface Class {
  id: string;
  name: string;
  code: string;
  teacher_id: string;
  created_at?: string;
}

export interface HomeworkAssignment {
  id: string;
  lesson_id: string;
  class_id: string;
  created_at?: string;
}

export interface HomeworkResult {
  id?: string;
  user_id: string;
  lesson_id: string;
  score: number;
  total: number;
  completed_at: string;
  user_name?: string;
  lesson_title?: string;
}

// --- Supabase Operations ---

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as Profile;
};

export const saveProfile = async (profile: Profile) => {
  const { error } = await supabase
    .from('profiles')
    .upsert(profile);
  
  if (error) {
    console.error('Error saving profile:', error);
  }
  return { success: !error, error: error?.message };
};

export const saveHomeworkResult = async (result: HomeworkResult) => {
  const { error } = await supabase
    .from('homework_results')
    .insert(result);
  return { success: !error, error: error?.message };
};

export const fetchAllHomeworkResults = async (): Promise<HomeworkResult[]> => {
  const { data, error } = await supabase
    .from('homework_results')
    .select(`
      *,
      profiles:user_id (name),
      lessons:lesson_id (title)
    `)
    .order('completed_at', { ascending: false });

  if (error) {
    console.error('Error fetching results:', error);
    return [];
  }

  return data.map(item => ({
    ...item,
    user_name: item.profiles?.name,
    lesson_title: item.lessons?.title
  })) as HomeworkResult[];
};

export const fetchStudentResults = async (userId: string): Promise<HomeworkResult[]> => {
  const { data, error } = await supabase
    .from('homework_results')
    .select(`
      *,
      lessons:lesson_id (title)
    `)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) return [];
  return data.map(item => ({
    ...item,
    lesson_title: item.lessons?.title
  })) as HomeworkResult[];
};

export const fetchLessons = async (): Promise<Lesson[]> => {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lessons:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [SAMPLE_LESSON];
  }

  return data as Lesson[];
};

export const saveLessonToSupabase = async (lesson: Lesson): Promise<{ success: boolean; error?: string }> => {
  console.log('Saving lesson to Supabase:', lesson);
  const { error } = await supabase
    .from('lessons')
    .upsert(lesson);

  if (error) {
    console.error('Error saving lesson:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

export const deleteLessonFromSupabase = async (id: string): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting lesson:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

// --- Class Operations ---

export const fetchClasses = async (teacherId: string): Promise<Class[]> => {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching classes:', error);
    return [];
  }
  return data as Class[];
};

export const saveClass = async (cls: Class): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('classes')
    .upsert(cls);

  if (error) {
    console.error('Error saving class:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

export const deleteClass = async (id: string): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting class:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

// --- Assignment Operations ---

export const fetchAssignments = async (classId: string): Promise<HomeworkAssignment[]> => {
  const { data, error } = await supabase
    .from('homework_assignments')
    .select('*')
    .eq('class_id', classId);

  if (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
  return data as HomeworkAssignment[];
};

export const saveAssignment = async (assignment: HomeworkAssignment): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('homework_assignments')
    .upsert(assignment);

  if (error) {
    console.error('Error saving assignment:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

export const deleteAssignment = async (lessonId: string, classId: string): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('homework_assignments')
    .delete()
    .match({ lesson_id: lessonId, class_id: classId });

  if (error) {
    console.error('Error deleting assignment:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

export const fetchLessonsByClass = async (classCode: string): Promise<Lesson[]> => {
  // 1. Get class ID from code
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id')
    .eq('code', classCode)
    .single();

  if (classError || !classData) {
    console.error('Error fetching class by code:', classError);
    return [];
  }

  // 2. Get assigned lesson IDs
  const { data: assignmentData, error: assignError } = await supabase
    .from('homework_assignments')
    .select('lesson_id')
    .eq('class_id', classData.id);

  if (assignError) {
    console.error('Error fetching assignments:', assignError);
    return [];
  }

  if (!assignmentData || assignmentData.length === 0) return [];

  const lessonIds = assignmentData.map(a => a.lesson_id);

  // 3. Get lessons
  const { data: lessonData, error: lessonError } = await supabase
    .from('lessons')
    .select('*')
    .in('id', lessonIds);

  if (lessonError) {
    console.error('Error fetching lessons by IDs:', lessonError);
    return [];
  }

  return lessonData as Lesson[];
};

export const checkClassCode = async (code: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('classes')
    .select('id')
    .eq('code', code)
    .single();

  if (error || !data) return false;
  return true;
};

// --- Audio Cache Operations ---

export const getCachedAudio = async (text: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('tts_cache')
    .select('audio_base64')
    .eq('text_hash', text)
    .single();

  if (error || !data) return null;
  return data.audio_base64;
};

export const saveCachedAudio = async (text: string, audioBase64: string) => {
  const { error } = await supabase
    .from('tts_cache')
    .upsert({ text_hash: text, audio_base64: audioBase64 });
  
  if (error) {
    console.error('Error saving audio cache:', error);
  }
};
