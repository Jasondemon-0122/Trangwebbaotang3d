export interface StudentComment {
  id: string;
  lessonId: string;
  lessonName: string;
  specId?: string;
  specTitle?: string;
  studentName: string;
  studentClass: string;
  studentEmail?: string;
  studentAvatar: string;
  content: string;
  tag: 'question' | 'impression' | 'connection' | 'unclear';
  createdAt: string;
  likes: number;
  likedBy?: string[];
  status: 'active' | 'hidden';
  teacherReply?: string;
  teacherRepliedAt?: string;
}

export interface StudentReaction {
  id: string;
  lessonId: string;
  lessonName: string;
  specId: string;
  specTitle: string;
  studentName: string;
  studentClass: string;
  studentEmail?: string;
  type: 'understood' | 'confused' | 'fascinated';
  createdAt: string;
}

