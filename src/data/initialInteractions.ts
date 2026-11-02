import type { StudentComment, StudentReaction } from '../types/interaction';

export const INITIAL_STUDENT_COMMENTS: StudentComment[] = [
  {
    id: 'cmt-1',
    lessonId: 'egyp-giza',
    lessonName: 'Văn minh Ai Cập',
    specId: 'spec-struct',
    specTitle: 'Cấu trúc hầm ngầm',
    studentName: 'Nguyễn Minh Anh',
    studentClass: '10A1',
    studentEmail: 'minhanh@student.edu.vn',
    studentAvatar: '🎓',
    content: 'Em thấy hệ thống hầm ngầm dốc xuống và Đại hành lang (Grand Gallery) xây dựng quá chính xác. Thầy cô cho em hỏi người xưa dùng ánh sáng từ đâu để thi công sâu trong lòng đá mà không để lại vết bồ hóng của đuốc ạ?',
    tag: 'question',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    likes: 8,
    likedBy: ['Trần Gia Huy', 'Lê Thu Trang'],
    status: 'active',
    teacherReply: 'Câu hỏi rất sắc sảo! Các nhà khảo cổ cho rằng người Ai Cập đã dùng hệ thống gương đồng phản chiếu ánh mặt trời từ cửa hầm, hoặc dùng đèn dầu thực vật trộn muối để cháy không sinh khói bồ hóng.',
    teacherRepliedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'cmt-2',
    lessonId: 'egyp-giza',
    lessonName: 'Văn minh Ai Cập',
    specId: 'spec-scale',
    specTitle: 'Quy mô',
    studentName: 'Trần Gia Huy',
    studentClass: '10A2',
    studentEmail: 'giahuy@student.edu.vn',
    studentAvatar: '🏛️',
    content: 'Khối lượng 6 triệu tấn với 2.3 triệu khối đá xếp khít nhau tới mức không lách vừa lưỡi dao! Thật khâm phục trí tuệ toán học và hình học của cư dân sông Nin thời cổ đại.',
    tag: 'impression',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    likes: 12,
    likedBy: ['Nguyễn Minh Anh'],
    status: 'active'
  },
  {
    id: 'cmt-3',
    lessonId: 'egyp-giza',
    lessonName: 'Văn minh Ai Cập',
    specId: 'spec-age',
    specTitle: 'Niên đại',
    studentName: 'Lê Thu Trang',
    studentClass: '10A1',
    studentEmail: 'thutrang@student.edu.vn',
    studentAvatar: '👑',
    content: 'Em chưa hiểu rõ mối liên hệ giữa tín ngưỡng thờ thần Mặt Trời Ra và hình dáng chóp đỉnh nhọn của Kim tự tháp, thầy cô hướng dẫn thêm cho em với ạ!',
    tag: 'unclear',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    likes: 5,
    likedBy: [],
    status: 'active'
  },
  {
    id: 'cmt-4',
    lessonId: 'egyp-giza',
    lessonName: 'Văn minh Ai Cập',
    specId: 'spec-loc',
    specTitle: 'Vị trí',
    studentName: 'Hoàng Quốc Bảo',
    studentClass: '10A3',
    studentEmail: 'quocbao@student.edu.vn',
    studentAvatar: '🧭',
    content: 'Các kim tự tháp ở Giza nằm thẳng hàng với chòm sao Orion (Ba Vua). Đây là sự trùng hợp ngẫu nhiên hay người Ai Cập đã cố tình quy hoạch thiên văn học như vậy ạ?',
    tag: 'connection',
    createdAt: new Date(Date.now() - 3600000 * 26).toISOString(),
    likes: 15,
    likedBy: ['Lê Thu Trang', 'Nguyễn Minh Anh'],
    status: 'active',
    teacherReply: 'Đây là giả thuyết Orion Correlation Theory rất nổi tiếng! Người Ai Cập đồng nhất chòm sao Orion với thần Osiris - vị thần cai quản cõi vĩnh hằng và sự tái sinh.',
    teacherRepliedAt: new Date(Date.now() - 3600000 * 20).toISOString()
  },
  {
    id: 'cmt-5',
    lessonId: 'vietnam-dongson',
    lessonName: 'Văn minh Văn Lang - Âu Lạc',
    specId: 'spec-dongson',
    specTitle: 'Trống đồng Đông Sơn',
    studentName: 'Phạm Hải Đăng',
    studentClass: '10A1',
    studentEmail: 'haidang@student.edu.vn',
    studentAvatar: '⚔️',
    content: 'Hình tượng chim Lạc bay ngược chiều kim đồng hồ trên mặt trống đồng tượng trưng cho chu kỳ thời gian và chuyển động của các mùa trong năm của nền nông nghiệp trồng lúa nước.',
    tag: 'connection',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    likes: 9,
    likedBy: [],
    status: 'active'
  }
];

export const INITIAL_STUDENT_REACTIONS: StudentReaction[] = [
  // Giza Reactions
  { id: 'react-1', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-loc', specTitle: 'Vị trí', studentName: 'Nguyễn Minh Anh', studentClass: '10A1', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'react-2', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-loc', specTitle: 'Vị trí', studentName: 'Trần Gia Huy', studentClass: '10A2', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'react-3', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-loc', specTitle: 'Vị trí', studentName: 'Lê Thu Trang', studentClass: '10A1', type: 'fascinated', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  
  { id: 'react-4', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-age', specTitle: 'Niên đại', studentName: 'Nguyễn Minh Anh', studentClass: '10A1', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'react-5', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-age', specTitle: 'Niên đại', studentName: 'Trần Gia Huy', studentClass: '10A2', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'react-6', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-age', specTitle: 'Niên đại', studentName: 'Lê Thu Trang', studentClass: '10A1', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'react-7', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-age', specTitle: 'Niên đại', studentName: 'Đặng Tuấn Kiệt', studentClass: '10A4', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 6).toISOString() },

  { id: 'react-8', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-scale', specTitle: 'Quy mô', studentName: 'Trần Gia Huy', studentClass: '10A2', type: 'fascinated', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'react-9', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-scale', specTitle: 'Quy mô', studentName: 'Lê Thu Trang', studentClass: '10A1', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'react-10', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-scale', specTitle: 'Quy mô', studentName: 'Hoàng Quốc Bảo', studentClass: '10A3', type: 'fascinated', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  
  { id: 'react-11', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-struct', specTitle: 'Cấu trúc hầm ngầm', studentName: 'Nguyễn Minh Anh', studentClass: '10A1', type: 'fascinated', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'react-12', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-struct', specTitle: 'Cấu trúc hầm ngầm', studentName: 'Lê Thu Trang', studentClass: '10A1', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'react-13', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-struct', specTitle: 'Cấu trúc hầm ngầm', studentName: 'Đỗ Thùy Linh', studentClass: '10A2', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 7).toISOString() },
  { id: 'react-14', lessonId: 'egyp-giza', lessonName: 'Văn minh Ai Cập', specId: 'spec-struct', specTitle: 'Cấu trúc hầm ngầm', studentName: 'Bùi Đức Anh', studentClass: '10A3', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 8).toISOString() }
];
