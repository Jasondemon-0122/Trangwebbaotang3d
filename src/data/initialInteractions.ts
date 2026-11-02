import type { StudentComment, StudentReaction } from '../types/interaction';

export const INITIAL_STUDENT_COMMENTS: StudentComment[] = [
  {
    id: 'cmt-1',
    lessonId: 'pyramid',
    lessonName: 'Văn minh Ai Cập',
    specId: 'struct',
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
    lessonId: 'pyramid',
    lessonName: 'Văn minh Ai Cập',
    specId: 'size',
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
    lessonId: 'pyramid',
    lessonName: 'Văn minh Ai Cập',
    specId: 'age',
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
    lessonId: 'pyramid',
    lessonName: 'Văn minh Ai Cập',
    specId: 'location',
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
    lessonId: 'thanh-nha-ho',
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
  // --- THÔNG SỐ BÀI HỌC ---
  // 1. Vị trí
  { id: 'react-1', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'location', specTitle: 'Vị trí', studentName: 'Nguyễn Minh Anh', studentClass: '10A1', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'react-2', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'location', specTitle: 'Vị trí', studentName: 'Trần Gia Huy', studentClass: '10A2', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'react-3', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'location', specTitle: 'Vị trí', studentName: 'Lê Thu Trang', studentClass: '10A1', type: 'fascinated', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },

  // 2. Niên đại (Có học sinh chưa hiểu)
  { id: 'react-4', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'age', specTitle: 'Niên đại', studentName: 'Nguyễn Minh Anh', studentClass: '10A1', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'react-5', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'age', specTitle: 'Niên đại', studentName: 'Trần Gia Huy', studentClass: '10A2', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'react-6', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'age', specTitle: 'Niên đại', studentName: 'Lê Thu Trang', studentClass: '10A1', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'react-7', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'age', specTitle: 'Niên đại', studentName: 'Đặng Tuấn Kiệt', studentClass: '10A4', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 6).toISOString() },

  // 3. Quy mô (Nắm vững tốt)
  { id: 'react-8', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'size', specTitle: 'Quy mô', studentName: 'Trần Gia Huy', studentClass: '10A2', type: 'fascinated', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'react-9', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'size', specTitle: 'Quy mô', studentName: 'Lê Thu Trang', studentClass: '10A1', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'react-10', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'size', specTitle: 'Quy mô', studentName: 'Hoàng Quốc Bảo', studentClass: '10A3', type: 'fascinated', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'react-11', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'size', specTitle: 'Quy mô', studentName: 'Nguyễn Minh Anh', studentClass: '10A1', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },

  // 4. Cấu trúc (Hầm ngầm)
  { id: 'react-12', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'struct', specTitle: 'Cấu trúc', studentName: 'Nguyễn Minh Anh', studentClass: '10A1', type: 'fascinated', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'react-13', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'struct', specTitle: 'Cấu trúc', studentName: 'Lê Thu Trang', studentClass: '10A1', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'react-14', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'struct', specTitle: 'Cấu trúc', studentName: 'Đỗ Thùy Linh', studentClass: '10A2', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 7).toISOString() },

  // --- HÌNH ẢNH & VIDEO TƯ LIỆU ---
  // 5. Toàn cảnh Kim Tự Tháp (Ảnh tư liệu)
  { id: 'react-15', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'gal-pyramid-0', specTitle: 'Toàn cảnh Kim Tự Tháp', studentName: 'Phạm Hải Đăng', studentClass: '10A1', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'react-16', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'gal-pyramid-0', specTitle: 'Toàn cảnh Kim Tự Tháp', studentName: 'Lê Thu Trang', studentClass: '10A1', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'react-17', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'gal-pyramid-0', specTitle: 'Toàn cảnh Kim Tự Tháp', studentName: 'Trần Gia Huy', studentClass: '10A2', type: 'fascinated', createdAt: new Date(Date.now() - 3600000 * 1).toISOString() },

  // 6. Bản đồ hệ thống kim tự tháp (Ảnh tư liệu)
  { id: 'react-18', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'gal-pyramid-1', specTitle: 'Bản đồ hệ thống kim tự tháp', studentName: 'Nguyễn Minh Anh', studentClass: '10A1', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'react-19', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'gal-pyramid-1', specTitle: 'Bản đồ hệ thống kim tự tháp', studentName: 'Đặng Tuấn Kiệt', studentClass: '10A4', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },

  // 7. Phiến đá Rosetta (Video + 3D)
  { id: 'react-20', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'gal-pyramid-2', specTitle: 'Phiến đá Rosetta', studentName: 'Trần Gia Huy', studentClass: '10A2', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 'react-21', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'gal-pyramid-2', specTitle: 'Phiến đá Rosetta', studentName: 'Hoàng Quốc Bảo', studentClass: '10A3', type: 'fascinated', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'react-22', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'gal-pyramid-2', specTitle: 'Phiến đá Rosetta', studentName: 'Nguyễn Minh Anh', studentClass: '10A1', type: 'understood', createdAt: new Date(Date.now() - 3600000 * 1).toISOString() },

  // 8. Kĩ thuật ướp xác của người Ai Cập (Video + 3D - Điểm nghẽn cần giảng thêm)
  { id: 'react-23', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'gal-pyramid-3', specTitle: 'Kĩ thuật ướp xác của người Ai Cập', studentName: 'Lê Thu Trang', studentClass: '10A1', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'react-24', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'gal-pyramid-3', specTitle: 'Kĩ thuật ướp xác của người Ai Cập', studentName: 'Bùi Đức Anh', studentClass: '10A3', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'react-25', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'gal-pyramid-3', specTitle: 'Kĩ thuật ướp xác của người Ai Cập', studentName: 'Đỗ Thùy Linh', studentClass: '10A2', type: 'confused', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'react-26', lessonId: 'pyramid', lessonName: 'Văn minh Ai Cập', specId: 'gal-pyramid-3', specTitle: 'Kĩ thuật ướp xác của người Ai Cập', studentName: 'Hoàng Quốc Bảo', studentClass: '10A3', type: 'fascinated', createdAt: new Date(Date.now() - 3600000 * 1).toISOString() }
];
