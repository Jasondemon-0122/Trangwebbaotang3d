import { Suspense, useState, useRef, useEffect, useMemo, Component } from 'react';
import type { ReactNode, FormEvent, DragEvent } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Html, Center } from '@react-three/drei';
import { createClient } from '@supabase/supabase-js'; 
import { QRCodeSVG } from 'qrcode.react'; 
import './App.css';
import { initialMonumentsData } from './data';

// ==========================================
// CẤU HÌNH SUPABASE CLOUD
// ==========================================
const SUPABASE_URL = 'https://panphxziqtkvtjffwhlc.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbnBoeHppcXRrdnRqZmZ3aGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NjkwMTksImV4cCI6MjA5NTE0NTAxOX0.nIG6NXtb1o09wZLoNPR1cXblGDBQWZKxWt8Cig7evRk'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PREDEFINED_ICONS = ['📌', '📍', '👑', '📐', '🥽', '🏛️', '⛰️', '🕌', '🏰', '🛕', '🏯', '⏳', '📅', '📏', '🌍', '🧭', '📜', '🏺', '⚔️', '🛡️', '⚓', '💡', '🔍', '💎', '🗿', '🔥', '💧', '🌿', '⚙️', '📖'];
const AVATAR_LIST = ['👦🏻', '👧🏻', '👨‍🎓', '👩‍🎓', '🕵️‍♂️', '🕵️‍♀️', '🧙‍♂️', '🧝‍♀️', '🦁', '🦉'];

const isYouTube = (url: string) => url && (url.includes('youtube.com') || url.includes('youtu.be'));
const getYouTubeEmbedUrl = (url: string) => {
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) videoId = url.split('v=')[1].split('&')[0];
  else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};

const isSketchfab = (url: string) => url && url.includes('sketchfab.com');
const getSketchfabEmbedUrl = (url: string) => {
  if (!url) return '';
  const baseUrl = url.split('?')[0].replace(/\/$/, '');
  return baseUrl.endsWith('/embed') ? baseUrl + '?autostart=1' : baseUrl + '/embed?autostart=1'; 
};

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error("Lỗi Tải File 3D:", error); }
  render() {
    if (this.state.hasError) return (<Html center><div style={{ background: 'rgba(15,23,42,0.9)', color: '#f87171', padding: '16px', borderRadius: '12px', textAlign: 'center', width: '250px', border: '1px solid #ef4444' }}><span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>⚠️</span><b>Lỗi tải mô hình 3D!</b><br/><span style={{fontSize: '12px', color: '#cbd5e1'}}>Link bị hỏng hoặc file không tồn tại.</span></div></Html>);
    return this.props.children;
  }
}

function HistoricalModel({ path, onMeshClick }: { path: string, onMeshClick: (name: string) => void }) {
  const { scene } = useGLTF(path);
  const modelScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    return maxDim > 0 ? 7.5 / maxDim : 1;
  }, [scene]);
  return (<Center scale={modelScale}><primitive object={scene} dispose={null} onClick={(e: any) => { e.stopPropagation(); if (e.object.type === 'Mesh') onMeshClick(e.object.name); }} onPointerMissed={() => onMeshClick('')} /></Center>);
}

const TradingCard = ({ lesson, date, badge }: any) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  // Hiệu ứng nghiêng 3D và lóe sáng (Hologram) khi di chuột
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !glareRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xPct = (x / rect.width - 0.5) * 2; 
    const yPct = (y / rect.height - 0.5) * 2; 
    cardRef.current.style.transform = `perspective(1000px) rotateX(${yPct * -15}deg) rotateY(${xPct * 15}deg) scale(1.05)`;
    glareRef.current.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.4) 0%, rgba(251, 191, 36, 0.15) 30%, transparent 70%)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current || !glareRef.current) return;
    cardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
    glareRef.current.style.background = `transparent`;
  };

  // Thuật toán tạo chỉ số ngẫu nhiên nhưng cố định theo tên bài học
  const getStat = (str: string, seed: number) => {
      if(!str) return 50;
      return (str.length * seed % 50) + 50; 
  };
  
  // Tự động lấy ảnh bìa hoặc ảnh đầu tiên trong bộ sưu tập
  const coverImg = lesson.coverImage || (lesson.gallery && lesson.gallery.length > 0 ? lesson.gallery[0].url : 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80');

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} 
         style={{ position: 'relative', width: '240px', height: '340px', borderRadius: '16px', background: 'linear-gradient(135deg, #1e293b, #020617)', border: '8px solid #cbd5e1', padding: '12px', boxSizing: 'border-box', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.1s ease-out', overflow: 'hidden' }}>
       
       {/* Lớp lóe sáng ảo ảnh */}
       <div ref={glareRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, transition: 'background 0.2s' }}></div>
       
       {/* 1. Phần Đầu (Icon, Tên, HP) */}
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
         <span style={{ fontSize: '20px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{lesson.icon || '🏛️'}</span>
         <span style={{ color: 'white', fontWeight: 'bold', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginLeft: '8px', textShadow: '1px 1px 2px black' }}>{lesson.name}</span>
         <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '14px', textShadow: '1px 1px 0px #000' }}>HP {getStat(lesson.name, 11)}</span>
       </div>
       
       {/* 2. Khung Ảnh Bìa (Pokemon Art) */}
       <div style={{ width: '100%', height: '140px', backgroundImage: `url(${coverImg})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '3px solid #fbbf24', borderRadius: '4px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5), 0 4px 6px rgba(0,0,0,0.3)', position: 'relative' }}>
           <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', fontSize: '24px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>✨</div>
       </div>
       
       {/* 3. Dải thuộc tính nhỏ */}
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(90deg, #334155, #1e293b)', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', color: '#cbd5e1', marginTop: '12px', marginBottom: '10px', fontWeight: 'bold', border: '1px solid #475569' }}>
           <span>Hệ: Lịch sử</span>
           <span style={{ color: '#fbbf24' }}>Độ hiếm: ★★★★★</span>
       </div>

       {/* 4. Chỉ số sức mạnh (Chiêu thức) */}
       <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, zIndex: 2 }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
            <span style={{ color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>⚔️ Khám phá</span>
            <span style={{ fontWeight: 'bold', color: '#10b981', fontSize: '14px' }}>{getStat(lesson.name, 7)}</span>
         </div>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
            <span style={{ color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>🛡️ Kiến trúc</span>
            <span style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '14px' }}>{getStat(lesson.name, 3)}</span>
         </div>
         <div style={{ textAlign: 'center', marginTop: 'auto' }}>
             <span style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)', color: 'white', padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.4)', display: 'inline-block', border: '1px solid #fbbf24' }}>{badge}</span>
         </div>
       </div>
       
       {/* 5. Ghi chú Footer */}
       <div style={{ textAlign: 'center', fontSize: '10px', color: '#64748b', marginTop: '10px' }}>
           Ngày thu thập: {new Date(date).toLocaleDateString('vi-VN')}
       </div>
    </div>
  );
};

export default function App() {
  const [page, setPage] = useState<'landing' | 'student-auth' | 'split-choice' | 'lesson-choice' | 'app' | 'admin-dashboard'>('landing');
  const [role, setRole] = useState<'guest' | 'student' | 'admin'>('guest');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  useEffect(() => { document.body.className = isDarkMode ? 'dark-mode' : 'light-mode'; }, [isDarkMode]);

  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [transitioningPanel, setTransitioningPanel] = useState<'left' | 'right' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [activeRegion, setActiveRegion] = useState<'world' | 'vietnam'>('world');
  const [themeTitle, setThemeTitle] = useState<string>(''); 
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const [adminEditingId, setAdminEditingId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'image' | '3d' | 'video'>('image');
  const [draggedImgId, setDraggedImgId] = useState<string | null>(null);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const [openIconPickerId, setOpenIconPickerId] = useState<string | null>(null);

  const [monumentsData, setMonumentsData] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('heritageData');
      let parsed = saved ? JSON.parse(saved) : initialMonumentsData;
      const migrateSpecs = (specs: any) => specs ? specs.map((s: any) => ({ ...s, fullText: Array.isArray(s.fullText) ? s.fullText : [s.fullText || ''] })) : [];
      
      parsed = parsed.map((m: any) => {
        const meshDataObj = m.meshData ? Object.keys(m.meshData).reduce((acc: any, key) => { 
            acc[key] = { ...m.meshData[key], specs: migrateSpecs(m.meshData[key].specs) }; 
            return acc; 
        }, {}) : {};

        return {
          ...m, 
          region: m.region || ((m.category === 'Chủ đề 3' || m.category?.toLowerCase().includes('thế giới')) ? 'world' : 'vietnam'), 
          category: m.category || 'Chưa phân loại', 
          normalData: m.normalData || { specs: migrateSpecs(m.specs || []), historyNotes: m.historyNotes || '' }, 
          sectionData: m.sectionData || { specs: [], historyNotes: '' }, 
          tourData: m.tourData || { specs: [], historyNotes: '' }, 
          gallery: (m.gallery || []).map((img: any, idx: number) => ({ ...img, id: img.id || `gal-${Date.now()}-${idx}` })), 
          meshData: meshDataObj,
          gameData: m.gameData || [],
          hexGameData: m.hexGameData || [],
          npcDialog: m.npcDialog || [],
          masks: m.masks || [] // THÊM DÒNG NÀY ĐỂ CHỨA DATA MẶT NẠ
        };
      });
      return parsed.length > 0 ? parsed : initialMonumentsData;
    } catch { return initialMonumentsData; }
  });

  const [activeMonuId, setActiveMonuId] = useState('');
  useEffect(() => { if (!activeMonuId && monumentsData.length > 0) setActiveMonuId(monumentsData[0].id); }, [monumentsData]);
  
  // BỔ SUNG CHẾ ĐỘ 'mask'
  const [viewMode, setViewMode] = useState<'normal' | 'section' | 'tour' | 'ar' | 'game' | 'hex' | 'npc' | 'mask' | 'hand'>('normal');
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null);
  const [selectedMeshName, setSelectedMeshName] = useState<string>('');
  const [activeSubModelPath, setActiveSubModelPath] = useState<string>('');

  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [gameInput, setGameInput] = useState('');
  const [gameFeedback, setGameFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [wrongCount, setWrongCount] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardType, setRewardType] = useState<'crossword' | 'hex' | 'npc'>('crossword');
  const [rowStates, setRowStates] = useState<{ solved: boolean; skipped: boolean; guess: string }[]>([]);

  // LỤC GIÁC
  const [hexNodes, setHexNodes] = useState<{id: string, text: string, x: number, y: number}[]>([]);
  const [draggingHex, setDraggingHex] = useState<string | null>(null);
  const [hexOffset, setHexOffset] = useState({x: 0, y: 0});
  const [showHexSubmit, setShowHexSubmit] = useState(false);
  const [hexReasoning, setHexReasoning] = useState('');

  // VISUAL NOVEL (NPC)
  const [npcStep, setNpcStep] = useState(0);
  const [npcFeedback, setNpcFeedback] = useState<{text: string, isCorrect: boolean} | null>(null);

  // MẶT NẠ AR (QUẢN LÝ CHỌN MẶT NẠ TRONG KHO)
  const [activeMaskIndex, setActiveMaskIndex] = useState<number | null>(null);

  const [activeHandIndex, setActiveHandIndex] = useState<number | null>(null);

  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [isStudentRegistered, setIsStudentRegistered] = useState(false);
  
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [myPassport, setMyPassport] = useState<any[]>([]);
  const [activeBadgeModel, setActiveBadgeModel] = useState<string | null>(null);
  const [isClassroomSyncActive, setIsClassroomSyncActive] = useState(false);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regClass, setRegClass] = useState('');
  const [regAvatar, setRegAvatar] = useState(AVATAR_LIST[0]);

  const activeMonu = monumentsData.find((m: any) => m.id === activeMonuId) || monumentsData[0] || {};
  const adminEditingMonu = monumentsData.find((m: any) => m.id === adminEditingId);
  // QUẢN LÝ TAB TRONG CMS GIÁO VIÊN
  const [activeAdminTab, setActiveAdminTab] = useState('general');
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        const { data, error } = await supabase.from('heritage_lessons').select('content');
        if (error) console.error("Lỗi tải data cloud:", error); 
        if (data && data.length > 0) {
           const parsedData = data.map((row: any) => ({
              ...row.content, 
              region: row.content.region || ((row.content.category === 'Chủ đề 3' || row.content.category?.toLowerCase().includes('thế giới')) ? 'world' : 'vietnam')
           }));
           setMonumentsData(parsedData);
        }
      } catch (err) {}
    };
    fetchCloudData();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setCurrentUser(session.user); setRole('student'); }
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { setCurrentUser(session.user); setRole('student'); }
      else setCurrentUser(null);
    });
  }, []);

  useEffect(() => { if (currentUser) fetchMyPassport(); }, [currentUser]);
  useEffect(() => { localStorage.setItem('heritageData', JSON.stringify(monumentsData)); }, [monumentsData]);

  useEffect(() => { 
    if (viewMode !== 'tour' && viewMode !== 'ar' && viewMode !== 'mask') controlsRef.current?.reset(); 
    setSelectedMeshName(''); setExpandedSpec(null); setActiveSubModelPath('');
    setSelectedRowIndex(null); setGameInput(''); setGameFeedback('idle'); setWrongCount(0); setShowExplanation(false); setShowRewardModal(false); setShowHexSubmit(false); setHexReasoning('');
    setRowStates(activeMonu.gameData ? activeMonu.gameData.map(() => ({ solved: false, skipped: false, guess: '' })) : []);
    setNpcStep(0); setNpcFeedback(null);
    setActiveMaskIndex(null); // THÊM DÒNG NÀY ĐỂ RESET MẶT NẠ KHI ĐỔI BÀI
    
    if (viewMode === 'hex' && activeMonu.hexGameData) {
        const nodes = activeMonu.hexGameData.map((item: any, i: number) => {
            // Tương thích ngược: Nếu là bản cũ thì lấy string, bản mới thì lấy item.text
            const nodeText = typeof item === 'string' ? item : item.text;
            return {
                id: `hex-${i}`, 
                text: nodeText, 
                x: 60 + (i % 4) * 140, 
                y: 80 + Math.floor(i / 4) * 120
            };
        });
        setHexNodes(nodes);
    }
  }, [activeMonuId, viewMode, activeMonu.gameData, activeMonu.hexGameData]);

  useEffect(() => { 
    if (viewMode !== 'tour' && viewMode !== 'ar' && viewMode !== 'mask') controlsRef.current?.reset(); 
    setSelectedMeshName(''); setExpandedSpec(null); setActiveSubModelPath('');
    setSelectedRowIndex(null); setGameInput(''); setGameFeedback('idle'); setWrongCount(0); setShowExplanation(false); setShowRewardModal(false); setShowHexSubmit(false); setHexReasoning('');
    setRowStates(activeMonu.gameData ? activeMonu.gameData.map(() => ({ solved: false, skipped: false, guess: '' })) : []);
    setNpcStep(0); setNpcFeedback(null);
    setActiveMaskIndex(null); 
    
    // ĐOẠN ĐƯỢC CẬP NHẬT ĐỂ ĐỌC ĐÚNG DATA CMS MỚI
    if (viewMode === 'hex' && activeMonu.hexGameData) {
        const nodes = activeMonu.hexGameData.map((item: any, i: number) => {
            // Kiểm tra xem data là String cũ hay Object mới từ CMS
            const textVal = typeof item === 'string' ? item : (item.text || 'Thẻ bài');
            return {
                id: `hex-${i}`, 
                text: textVal, 
                x: 50 + (i % 3) * 160, // Tự động dàn đều các thẻ ra màn hình
                y: 80 + Math.floor(i / 3) * 90
            };
        });
        setHexNodes(nodes);
    }
  }, [activeMonuId, viewMode, activeMonu.gameData, activeMonu.hexGameData]);

  const handleStudentAuth = async (e: FormEvent) => {
    e.preventDefault(); setIsLoading(true);
    if (authMode === 'register') {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { full_name: regName, class_name: regClass, avatar: regAvatar } } });
      if (error) alert("Lỗi: " + error.message); else { alert("✅ Đăng ký thành công! Hãy bấm Đăng nhập để vào lớp học nhé."); setAuthMode('login'); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) alert("Đăng nhập thất bại. Vui lòng kiểm tra lại Email hoặc Mật khẩu."); else { setPage('split-choice'); }
    }
    setIsLoading(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setRole('guest'); setCurrentUser(null); setMyPassport([]); setPage('landing'); };

  const handleSaveScoreToCloud = async (correct: number, total: number, badgeName: string) => {
    if (!currentUser) return;
    try { await supabase.from('student_scores').insert([{ student_email: currentUser.email, student_name: currentUser.user_metadata.full_name, student_class: currentUser.user_metadata.class_name, lesson_name: activeMonu.name, correct_answers: correct, total_questions: total, badge: badgeName }]); } catch (err) { console.error("Lỗi đồng bộ điểm:", err); }
  };

  const fetchMyPassport = async () => {
    if (!currentUser) return;
    const localData = localStorage.getItem(`passport_${currentUser.email}`);
    if (localData) setMyPassport(JSON.parse(localData));
    try {
      const { data, error } = await supabase.from('student_scores').select('*').eq('student_email', currentUser.email).order('created_at', { ascending: false });
      if (error) console.error("Fetch passport error:", error.message);
      if (data) {
        const uniqueBadges = data.reduce((acc: any[], curr: any) => {
          if (curr.correct_answers > 0 && !acc.find((item: any) => item.lesson_name === curr.lesson_name)) { acc.push(curr); }
          return acc;
        }, []);
        setMyPassport(uniqueBadges); localStorage.setItem(`passport_${currentUser.email}`, JSON.stringify(uniqueBadges)); 
      }
    } catch (err) {}
  };

  useEffect(() => { if (page === 'admin-dashboard') { supabase.from('student_scores').select('*').order('created_at', { ascending: false }).then(({data}) => { if(data) setLeaderboardData(data); }); } }, [page]);

  const checkGameCompletion = (states: any[]) => {
    if (states.every(s => s.solved || s.skipped)) {
      setTimeout(() => {
        const correctCount = states.filter(s => s.solved).length;
        let badge = "Chưa nhận danh hiệu";
        if (correctCount === 1) badge = "Nhà Khảo Cổ Tập Sự 🧭"; else if (correctCount >= 2 && correctCount < activeMonu.gameData.length) badge = "Chuyên Gia Cổ Vật 📜"; else if (correctCount > 0) badge = "Huyền Thoại Di Sản 👑";
        if (currentUser) {
           handleSaveScoreToCloud(correctCount, activeMonu.gameData.length, badge);
           if (correctCount > 0) {
               setMyPassport(prev => { const existing = prev.filter(p => p.lesson_name !== activeMonu.name); const newPassport = [{ lesson_name: activeMonu.name, badge: badge, created_at: new Date().toISOString() }, ...existing]; localStorage.setItem(`passport_${currentUser.email}`, JSON.stringify(newPassport)); return newPassport; });
           }
        }
        setRewardType('crossword');
        setShowRewardModal(true);
      }, 1000);
    }
  };

  const handleHexPointerDown = (e: any, id: string) => {
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      setHexOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setDraggingHex(id);
  };
  const handleHexPointerMove = (e: any) => {
      if (!draggingHex) return;
      const container = document.getElementById('hex-container');
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      let newX = e.clientX - containerRect.left - hexOffset.x;
      let newY = e.clientY - containerRect.top - hexOffset.y;
      setHexNodes(prev => prev.map(n => n.id === draggingHex ? { ...n, x: newX, y: newY } : n));
  };
  const handleHexPointerUp = (e: any) => {
      if (draggingHex) { e.currentTarget.releasePointerCapture(e.pointerId); setDraggingHex(null); }
  };

  const handleHexSubmit = () => {
      if (!hexReasoning.trim()) { alert("Hãy giải thích ngắn gọn lý do em ghép các thẻ này lại với nhau nhé!"); return; }
      const badge = "Chiến Lược Gia 🧠";
      if (currentUser) {
           handleSaveScoreToCloud(activeMonu.hexGameData.length, activeMonu.hexGameData.length, badge);
           setMyPassport(prev => {
               const existing = prev.filter(p => p.lesson_name !== activeMonu.name);
               const newPassport = [{ lesson_name: activeMonu.name, badge: badge, created_at: new Date().toISOString() }, ...existing];
               localStorage.setItem(`passport_${currentUser.email}`, JSON.stringify(newPassport));
               return newPassport;
           });
      }
      setRewardType('hex');
      setShowHexSubmit(false);
      setShowRewardModal(true);
  };

  const handleNpcComplete = () => {
      const badge = "Nhà Ngoại Giao 💬";
      if (currentUser) {
           handleSaveScoreToCloud(activeMonu.npcDialog.length, activeMonu.npcDialog.length, badge);
           setMyPassport(prev => {
               const existing = prev.filter(p => p.lesson_name !== activeMonu.name);
               const newPassport = [{ lesson_name: activeMonu.name, badge: badge, created_at: new Date().toISOString() }, ...existing];
               localStorage.setItem(`passport_${currentUser.email}`, JSON.stringify(newPassport));
               return newPassport;
           });
      }
      setRewardType('npc');
      setShowRewardModal(true);
  };

  const handleSyncCameraAngle = () => {
    if (controlsRef.current) {
      const cam = controlsRef.current.object; const tgt = controlsRef.current.target;
      supabase.channel('classroom_session').send({ type: 'broadcast', event: 'camera_action', payload: { position: [cam.position.x, cam.position.y, cam.position.z], target: [tgt.x, tgt.y, tgt.z] } });
    }
  };

  useEffect(() => {
    if (role === 'admin' && isClassroomSyncActive) {
      const channel = supabase.channel('classroom_session');
      channel.subscribe((status) => { if (status === 'SUBSCRIBED') channel.send({ type: 'broadcast', event: 'teacher_action', payload: { activeMonuId, viewMode, activeSubModelPath } }); });
      return () => { supabase.removeChannel(channel); };
    }
  }, [role, isClassroomSyncActive, activeMonuId, viewMode, activeSubModelPath]);

  useEffect(() => {
    if (role !== 'admin' && isClassroomSyncActive) {
      const channel = supabase.channel('classroom_session')
        .on('broadcast', { event: 'teacher_action' }, ({ payload }) => {
          if (payload.activeMonuId) setActiveMonuId(payload.activeMonuId);
          if (payload.viewMode) setViewMode(payload.viewMode);
          if (payload.activeSubModelPath !== undefined) setActiveSubModelPath(payload.activeSubModelPath);
        })
        .on('broadcast', { event: 'camera_action' }, ({ payload }) => {
          if (controlsRef.current && payload.position && payload.target) {
            controlsRef.current.object.position.set(payload.position[0], payload.position[1], payload.position[2]);
            controlsRef.current.target.set(payload.target[0], payload.target[1], payload.target[2]);
            controlsRef.current.update();
          }
        });
      channel.subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [role, isClassroomSyncActive]);

  const handleCloseModal = () => { setIsClosingModal(true); setTimeout(() => { setSelectedImage(null); setIsClosingModal(false); setModalTab('image'); setIsZoomed(false); }, 350); };

  const getTabTitle = () => { if (viewMode === 'section') return "THÔNG SỐ MẶT CẮT"; return "THÔNG SỐ BỀ MẶT"; };
  const currentTabKey = (viewMode === 'normal' || viewMode === 'section' || viewMode === 'tour') ? `${viewMode}Data` as 'normalData' | 'sectionData' | 'tourData' : 'normalData';
  const getActiveData = () => { 
    if (selectedMeshName && activeMonu?.meshData && activeMonu.meshData[selectedMeshName]) return activeMonu.meshData[selectedMeshName]; 
    if (activeMonu && activeMonu[currentTabKey]) return { title: getTabTitle(), specs: activeMonu[currentTabKey].specs || [], historyNotes: activeMonu[currentTabKey].historyNotes || '' }; 
    return { title: getTabTitle(), specs: [], historyNotes: '' }; 
  };

  const currentInfo = getActiveData();
  const currentGallery = activeMonu?.gallery?.filter((img: any) => img.type === (viewMode === 'ar' || viewMode === 'game' || viewMode === 'hex' || viewMode === 'npc' || viewMode === 'mask' ? 'normal' : viewMode) || viewMode === 'tour') || [];
  const currentMainModelPath = activeSubModelPath || activeMonu[viewMode === 'section' ? 'sectionPath' : 'normalPath'];
  
  const displayedMonuments = role === 'admin' ? monumentsData : monumentsData.filter((m: any) => m.region === activeRegion);
  const groupedLessons = displayedMonuments.reduce((acc: any, lesson: any) => { const cat = lesson.category || 'Khác'; if (!acc[cat]) acc[cat] = []; acc[cat].push(lesson); return acc; }, {});

  const handleNavigateToPage = (targetPage: 'landing' | 'student-auth' | 'split-choice' | 'lesson-choice' | 'admin-dashboard') => { setIsLoading(true); setTimeout(() => { setPage(targetPage); if(targetPage === 'landing') { if(!currentUser) setRole('guest'); } setIsLoading(false); }, 600); };
  const handleRegionSelect = (region: 'world' | 'vietnam', title: string, panel: 'left' | 'right') => { setTransitioningPanel(panel); setTimeout(() => setIsLoading(true), 400); setTimeout(() => { setActiveRegion(region); setThemeTitle(title); setPage('lesson-choice'); setTransitioningPanel(null); }, 800); setTimeout(() => setIsLoading(false), 1600); };
  const navigateToApp = (id: string, asRole: 'guest' | 'student' | 'admin' = 'guest') => { setIsLoading(true); setTimeout(() => { setActiveMonuId(id); setRole(asRole); setPage('app'); setViewMode('normal'); setIsLoading(false); }, 600); };
  const handleLogin = (e: FormEvent) => { e.preventDefault(); if (password === 'admin123') { setRole('admin'); setShowLogin(false); handleNavigateToPage('admin-dashboard'); setPassword(''); } else { alert('Sai mật khẩu!'); } };

  const handleSaveToCloud = async () => { 
     setIsLoading(true); 
     try { 
       const payload = monumentsData.map((m: any) => ({ id: m.id, content: m }));
       const { error } = await supabase.from('heritage_lessons').upsert(payload); 
       if (error) throw error; 
       alert("✅ Đã lưu lên Đám mây."); 
     } catch (e: any) { alert(`❌ Lỗi lưu Cloud: ${e.message}`); } 
     setIsLoading(false); 
  };

  const handleFileUpload = async (id: string, field: string, file: File, isGallery: boolean = false) => { setIsLoading(true); try { const fileExt = file.name.split('.').pop(); const filePath = `uploads/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (error) throw error; const { data } = supabase.storage.from('assets').getPublicUrl(filePath); isGallery ? handleUpdateGalleryItem(id, field, data.publicUrl) : updateAdminData(id, field, data.publicUrl); } catch (e: any) { alert(`❌ Lỗi tải lên: ${e.message}`); } finally { setIsLoading(false); } };

  const updateMonuData = (updater: (m: any) => any) => { setMonumentsData((prev: any[]) => prev.map((m: any) => m.id === activeMonu.id ? updater(m) : m)); };
  const updateAdminData = (id: string, field: string, value: any) => { setMonumentsData((prev: any[]) => prev.map((m: any) => m.id === id ? { ...m, [field]: value } : m)); };
  
  const handleAddNewLesson = () => { 
      const newId = `lesson-${Date.now()}`; 
      setMonumentsData((prev: any[]) => [...prev, { 
          id: newId, name: 'Tên bài học mới', region: 'world', category: 'Chủ đề mới', icon: '🏛️', 
          coverImage: '', normalPath: '', sectionPath: '', tourUrl: '', 
          normalData: { specs: [], historyNotes: '' }, sectionData: { specs: [], historyNotes: '' }, tourData: { specs: [], historyNotes: '' }, 
          meshData: {}, subModels: [], gallery: [], gameData: [], hexGameData: [], npcDialog: []
      }]); 
      setAdminEditingId(newId); 
  };
  
  const handleDeleteLesson = async (id: string) => { 
     if (window.confirm("Xóa bài học này?")) { 
        setMonumentsData((prev: any[]) => prev.filter((m: any) => m.id !== id)); 
        if (adminEditingId === id) setAdminEditingId(null); 
        try { await supabase.from('heritage_lessons').delete().eq('id', id); } catch(err) {}
     } 
  };

  const handleUpdateName = (value: string) => { updateMonuData((m: any) => ({ ...m, name: value })); };
  const handleUpdateMeshTitle = (value: string) => { updateMonuData((m: any) => ({ ...m, meshData: { ...m.meshData, [selectedMeshName]: { ...m.meshData[selectedMeshName], title: value } } })); };
  const handleUpdateNotes = (value: string) => { updateMonuData((m: any) => { if (selectedMeshName && m.meshData && m.meshData[selectedMeshName]) { return { ...m, meshData: { ...m.meshData, [selectedMeshName]: { ...m.meshData[selectedMeshName], historyNotes: value } } }; } return { ...m, [currentTabKey]: { ...m[currentTabKey], historyNotes: value } }; }); };
  const handleUpdateSpec = (specId: string, field: string, value: string, paragraphIndex: number | null = null) => { updateMonuData((m: any) => { const isMeshSpec = selectedMeshName && m.meshData && m.meshData[selectedMeshName]; const targetSpecs = isMeshSpec ? m.meshData[selectedMeshName].specs : m[currentTabKey].specs; const newSpecs = targetSpecs.map((s: any) => { if (s.id !== specId) return s; if (field === 'fullText' && paragraphIndex !== null) { const newText = [...s.fullText]; newText[paragraphIndex] = value; return { ...s, fullText: newText }; } return { ...s, [field]: value }; }); if (isMeshSpec) return { ...m, meshData: { ...m.meshData, [selectedMeshName]: { ...m.meshData[selectedMeshName], specs: newSpecs } } }; return { ...m, [currentTabKey]: { ...m[currentTabKey], specs: newSpecs } }; }); };
  const handleAddSpecCard = () => { updateMonuData((m: any) => { const newSpec = { id: Date.now().toString(), icon: '📌', title: 'TIÊU ĐỀ', summary: 'Tóm tắt', fullText: ['Nội dung...'] }; if (selectedMeshName && m.meshData && m.meshData[selectedMeshName]) { return { ...m, meshData: { ...m.meshData, [selectedMeshName]: { ...m.meshData[selectedMeshName], specs: [...m.meshData[selectedMeshName].specs, newSpec] } } }; } return { ...m, [currentTabKey]: { ...m[currentTabKey], specs: [...m[currentTabKey].specs, newSpec] } }; }); };
  const handleDeleteSpecCard = (specId: string) => { if (!window.confirm('Xóa thẻ này?')) return; updateMonuData((m: any) => { if (selectedMeshName && m.meshData && m.meshData[selectedMeshName]) { return { ...m, meshData: { ...m.meshData, [selectedMeshName]: { ...m.meshData[selectedMeshName], specs: m.meshData[selectedMeshName].specs.filter((s: any) => s.id !== specId) } } }; } return { ...m, [currentTabKey]: { ...m[currentTabKey], specs: m[currentTabKey].specs.filter((s: any) => s.id !== specId) } }; }); setExpandedSpec(null); };
  const handleCreateMeshData = (meshName: string) => { updateMonuData((m: any) => ({ ...m, meshData: { ...m.meshData, [meshName]: { title: "TÊN BỘ PHẬN", specs: [{ id: 'info1', icon: '📌', title: 'Thông tin', summary: 'Tóm tắt...', fullText: ['Chi tiết...'] }], historyNotes: 'Ghi chú cho bộ phận này...' } } })); };
  const handleDeleteMeshData = (meshName: string) => { if (!window.confirm(`Xóa toàn bộ dữ liệu bộ phận này?`)) return; updateMonuData((m: any) => { const newMeshData = { ...m.meshData }; delete newMeshData[meshName]; return { ...m, meshData: newMeshData }; }); setSelectedMeshName(''); };
  
  const handleAddImage = () => { updateMonuData((m: any) => ({ ...m, gallery: [...(m.gallery || []), { id: `gal-${Date.now()}`, url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80', title: 'Tư liệu mới', type: viewMode === 'ar' || viewMode === 'game' || viewMode === 'hex' || viewMode === 'npc' || viewMode === 'mask' ? 'normal' : viewMode, description: '', contextDescription: '', modelPath: '', videoUrl: '' }] })); };
  const handleDeleteImage = (imgToDelete: any) => { if (!window.confirm(`Xóa ảnh này?`)) return; updateMonuData((m: any) => ({ ...m, gallery: m.gallery.filter((img: any) => img.id !== imgToDelete.id) })); setIsClosingModal(true); setTimeout(() => { setSelectedImage(null); setIsClosingModal(false); }, 350); };
  const handleUpdateGalleryItem = (imgId: string, field: string, value: string) => { setSelectedImage((prev: any) => ({ ...prev, [field]: value })); updateMonuData((m: any) => ({ ...m, gallery: m.gallery.map((img: any) => img.id === imgId ? { ...img, [field]: value } : img) })); };

  const handleDropImage = (e: DragEvent, targetId: string) => {
    e.preventDefault(); if (!draggedImgId || draggedImgId === targetId) return;
    updateMonuData((m: any) => {
      const newGallery = [...(m.gallery || [])]; const draggedIdx = newGallery.findIndex((img: any) => img.id === draggedImgId); const targetIdx = newGallery.findIndex((img: any) => img.id === targetId);
      if (draggedIdx !== -1 && targetIdx !== -1) { const [draggedItem] = newGallery.splice(draggedIdx, 1); newGallery.splice(targetIdx, 0, draggedItem); }
      return { ...m, gallery: newGallery };
    });
    setDraggedImgId(null);
  };

  const handleCopyPromptForAI = (monu: any) => {
    let contextText = `BÀI HỌC: ${monu.name}\n\n`;
    if (monu.normalData) { contextText += `--- THÔNG TIN CHUNG ---\n${monu.normalData.historyNotes || ''}\n`; monu.normalData.specs?.forEach((s: any) => { contextText += `- ${s.title}: ${s.fullText.join(' ')}\n`; }); }
    if (monu.meshData) { Object.keys(monu.meshData).forEach(meshKey => { const mesh = monu.meshData[meshKey]; contextText += `\n--- CHI TIẾT BỘ PHẬN: ${mesh.title || meshKey} ---\n${mesh.historyNotes || ''}\n`; mesh.specs?.forEach((s: any) => { contextText += `- ${s.title}: ${s.fullText.join(' ')}\n`; }); }); }
    
    if (monu.gallery && monu.gallery.length > 0) { 
      contextText += `\n--- TƯ LIỆU ĐÍNH KÈM ---\n`; 
      monu.gallery.forEach((g: any) => { contextText += `- ${g.title || 'Tài liệu'}: ${g.description || ''} ${g.contextDescription || ''}\n`; }); 
    }

    const prompt = `Bạn là một chuyên gia thiết kế trò chơi giáo dục lịch sử. Hãy đọc kỹ tài liệu bên dưới và thiết kế một thử thách MA TRẬN Ô CHỮ (Crossword) gồm khoảng 4-6 hàng ngang liên quan đến bài học. YÊU CẦU NGHIÊM NGẶT: 1. Từ khóa cột dọc: Hãy tìm một từ khóa chính. 2. Câu hỏi gợi ý: Ngắn gọn, hấp dẫn. 3. Đáp án: Một từ liên quan, viết KHÔNG DẤU, VIẾT HOA TOÀN BỘ, KHÔNG KHOẢNG TRẮNG. 4. Lời giải thích: Giải thích ý nghĩa lịch sử. Vui lòng trả về cấu trúc để copy.\n\n--- TÀI LIỆU CỦA BÀI HỌC ---\n${contextText}`;
    navigator.clipboard.writeText(prompt).then(() => { alert("✅ ĐÃ COPY CÂU LỆNH CHO AI SOẠN Ô CHỮ!"); }).catch(err => alert("Lỗi khi copy: " + err));
  };

  const handleCopyPromptForAudio = (monu: any) => {
    let contextText = `BÀI HỌC: ${monu.name}\n\n`;
    if (monu.normalData) { contextText += `--- THÔNG TIN TRỌNG TÂM ---\n${monu.normalData.historyNotes || ''}\n`; monu.normalData.specs?.forEach((s: any) => { contextText += `- ${s.title}: ${s.fullText.join(' ')}\n`; }); }
    
    if (monu.gallery && monu.gallery.length > 0) { 
      contextText += `\n--- CÂU CHUYỆN BÊN LỀ (TƯ LIỆU) ---\n`; 
      monu.gallery.forEach((g: any) => { contextText += `- ${g.title || 'Tài liệu'}: ${g.description || ''} ${g.contextDescription || ''}\n`; }); 
    }
    
    const prompt = `Bạn là một Hướng dẫn viên ảo tại Bảo tàng Lịch sử kỹ thuật số. Hãy đọc kỹ tài liệu bên dưới và viết một KỊCH BẢN THUYẾT MINH AUDIO (dài khoảng 1 đến 2 phút đọc) để phát cho học sinh nghe khi xem mô hình. YÊU CẦU NGHIÊM NGẶT: 1. Giọng văn: Gần gũi, xưng "chúng ta" hoặc "các bạn". 2. Nội dung: Tuyệt đối NGẮN GỌN, trọng tâm. 3. Trình bày: Chỉ trả về ĐÚNG nội dung lời đọc.\n\n--- TÀI LIỆU DỮ LIỆU ---\n${contextText}`;
    navigator.clipboard.writeText(prompt).then(() => { alert("✅ ĐÃ COPY LỆNH TẠO KỊCH BẢN AUDIO!"); }).catch(err => alert("Lỗi khi copy: " + err));
  };

  const handleCopyPromptForHexAI = (monu: any) => {
    let contextText = `BÀI HỌC: ${monu.name}\n\n`;
    if (monu.normalData) { contextText += `--- THÔNG TIN CHUNG ---\n${monu.normalData.historyNotes || ''}\n`; monu.normalData.specs?.forEach((s: any) => { contextText += `- ${s.title}: ${s.fullText.join(' ')}\n`; }); }
    
    if (monu.gallery && monu.gallery.length > 0) { 
      contextText += `\n--- TƯ LIỆU ĐÍNH KÈM ---\n`; 
      monu.gallery.forEach((g: any) => { contextText += `- ${g.title || 'Tài liệu'}: ${g.description || ''} ${g.contextDescription || ''}\n`; }); 
    }
    
    const prompt = `Hãy đọc bài học này và trích xuất ra khoảng 6-8 TỪ KHÓA hoặc CỤM TỪ CỐT LÕI (Ví dụ: Cải cách Minh Trị, Hiện đại hóa, Vua Chulalongkorn...). Các từ khóa này sẽ được in lên các thẻ bài Lục Giác để học sinh tập tư duy kết nối.\nVui lòng chỉ trả về danh sách các từ khóa phân tách bằng dấu phẩy.\n\n--- TÀI LIỆU CỦA BÀI HỌC ---\n${contextText}`;
    navigator.clipboard.writeText(prompt).then(() => { alert("✅ ĐÃ COPY CÂU LỆNH CHO AI TẠO THẺ LỤC GIÁC!"); }).catch(err => alert("Lỗi khi copy: " + err));
  };

  const handleCopyPromptForNPC = (monu: any) => {
    let contextText = `BÀI HỌC: ${monu.name}\n\n`;
    if (monu.normalData) { contextText += `--- THÔNG TIN CHUNG ---\n${monu.normalData.historyNotes || ''}\n`; monu.normalData.specs?.forEach((s: any) => { contextText += `- ${s.title}: ${s.fullText.join(' ')}\n`; }); }
    
    if (monu.gallery && monu.gallery.length > 0) { 
      contextText += `\n--- TƯ LIỆU ĐÍNH KÈM ---\n`; 
      monu.gallery.forEach((g: any) => { contextText += `- ${g.title || 'Tài liệu'}: ${g.description || ''} ${g.contextDescription || ''}\n`; }); 
    }
    
    const prompt = `Bạn là một nhà thiết kế game nhập vai Lịch sử (Visual Novel). Dựa vào tài liệu dưới đây, hãy tạo ra 3-4 câu hỏi tình huống để một Nhân vật lịch sử hỏi học sinh.
Mỗi câu hỏi phải có 2 lựa chọn (A và B), 1 đúng và 1 sai.
Với mỗi lựa chọn, hãy viết một câu phản hồi của nhân vật giải thích tại sao đúng/sai dựa theo bối cảnh lịch sử.
Chỉ trả về nội dung, không cần format code.\n\n--- TÀI LIỆU ---\n${contextText}`;
    navigator.clipboard.writeText(prompt).then(() => { alert("✅ ĐÃ COPY CÂU LỆNH CHO AI SOẠN KỊCH BẢN VISUAL NOVEL!"); }).catch(err => alert("Lỗi khi copy: " + err));
  };
    const handleCopyPromptForMaskAudio = (maskName: string) => {
        if (!maskName || maskName.trim() === '' || maskName === 'Mặt nạ mới') {
            alert("⚠️ Vui lòng nhập Tên mặt nạ / Tên nhân vật vào ô trống trước khi nhờ AI soạn kịch bản nhé!");
            return;
        }
        const prompt = `Bạn là một chuyên gia viết kịch bản giáo dục. Hãy đóng vai nhân vật lịch sử "${maskName}" và viết một kịch bản lồng tiếng (audio) ngắn gọn, hấp dẫn để giới thiệu về bản thân. Kịch bản này sẽ được phát khi học sinh đang đeo chiếc mặt nạ AR của "${maskName}".
    YÊU CẦU NGHIÊM NGẶT:
    1. Độ dài: Rất ngắn gọn, thời lượng đọc chỉ khoảng 2-3 phút.
    2. Giọng điệu: Hào hùng, tự hào, xưng hô phù hợp với bối cảnh lịch sử của nhân vật (ví dụ: "Ta là...", "Trẫm là...").
    3. Nội dung: Chào hỏi học sinh, nêu bật 1-2 công lao hoặc đặc điểm nổi bật nhất để học sinh dễ nhớ.
    Vui lòng chỉ trả về phần lời thoại đọc.`;
        navigator.clipboard.writeText(prompt).then(() => { alert("✅ ĐÃ COPY LỆNH TẠO KỊCH BẢN CHO MẶT NẠ!"); }).catch(err => alert("Lỗi khi copy: " + err));
      };
      // BỘ MÀU ĐỘNG (THEME) CHO CÁC TRÒ CHƠI / AR MASK ĐỂ TƯƠNG THÍCH LIGHT/DARK MODE
    const theme = {
      bgMain: isDarkMode ? '#0f172a' : '#f8fafc',
      bgPanel: isDarkMode ? '#1e293b' : '#ffffff',
      bgCard: isDarkMode ? '#334155' : '#f1f5f9',
      textMain: isDarkMode ? '#f8fafc' : '#0f172a',
      textSub: isDarkMode ? '#94a3b8' : '#64748b',
      border: isDarkMode ? '#475569' : '#e2e8f0',
      inputBg: isDarkMode ? '#020617' : '#ffffff',
    };
  return (
    <>
      <div className={`global-loader ${isLoading ? 'visible' : 'hidden'}`}>
        <div className="spinner"></div><div className="loader-text">Đang xử lý...</div>
      </div>

      {page === 'landing' && (
        <div className="landing-wrapper">
          <div className="landing-inner">
            <nav className="landing-nav">
              <div className="logo">🏛️ Heritage Studio</div>
              <div className="nav-links">
                {currentUser ? (
                  <span onClick={() => handleNavigateToPage('split-choice')}>Vào lớp học ({currentUser.user_metadata?.full_name || 'Học sinh'})</span>
                ) : (
                  <span onClick={() => setPage('student-auth')}>Học sinh Đăng nhập</span>
                )}
                <span onClick={() => setShowLogin(true)}>Giáo viên</span>
                <button onClick={() => setIsDarkMode(!isDarkMode)} style={{background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', marginLeft: '16px'}} title="Chuyển đổi giao diện">
                  {isDarkMode ? '☀️' : '🌙'}
                </button>
              </div>
            </nav>
            <div className="landing-hero">
              <div className="hero-content">
                <h1>Khám phá quá khứ,<br />chạm vào hiện tại.</h1>
                <p>Hệ thống Học liệu Điện tử bám sát SGK Lịch sử 10 (Kết nối tri thức), ứng dụng công nghệ 3D/VR giúp bài giảng trực quan.</p>
                <div className="hero-buttons">
                  {currentUser ? (
                    <button className="btn-primary" onClick={() => handleNavigateToPage('split-choice')}>MỞ BÀI GIẢNG 3D</button>
                  ) : (
                    <button className="btn-primary" onClick={() => setPage('student-auth')}>ĐĂNG NHẬP / ĐĂNG KÝ HỌC SINH</button>
                  )}
                  <button className="btn-outline" onClick={() => setShowLogin(true)}>DÀNH CHO GIÁO VIÊN</button>
                </div>
              </div>
              <div className="hero-featured-image">
                <div className="featured-image-wrapper">
                  <img src="https://cas.stthomas.edu/_media-library/_images/history/1920x1080/stthomas-history-time.jpg" alt="Heritage" />
                  <div className="featured-overlay"></div>
                </div>
                <div className="floating-badge badge-1"><span className="badge-icon">🥽</span><div className="badge-text">Thực tế ảo VR</div></div>
                <div className="floating-badge badge-2"><span className="badge-icon">🗿</span><div className="badge-text">Phục dựng 3D</div></div>
              </div>
            </div>
          </div>
          {showLogin && (
            <div className="login-modal-overlay">
              <form className="login-modal" onSubmit={handleLogin}>
                <h2>Xác thực Giáo viên</h2><p>Vui lòng nhập mật khẩu quản trị.</p>
                <input type="password" placeholder="Mật khẩu (admin123)" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
                <div className="modal-actions"><button type="button" onClick={() => setShowLogin(false)}>Hủy</button><button type="submit" className="btn-primary">Đăng nhập</button></div>
              </form>
            </div>
          )}
        </div>
      )}

      {page === 'student-auth' && (
        <div className="landing-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
          <div style={{ background: '#0f172a', padding: '40px', borderRadius: '24px', border: '1px solid #334155', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'fadeIn 0.4s' }}>
            <h2 style={{ color: '#fff', textAlign: 'center', margin: '0 0 24px 0', fontFamily: 'Montserrat, sans-serif' }}>🏛️ CỔNG HỌC SINH</h2>
            <div style={{ display: 'flex', marginBottom: '20px', background: '#1e293b', borderRadius: '12px', padding: '4px' }}>
              <button onClick={() => setAuthMode('login')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: authMode === 'login' ? '#3b82f6' : 'transparent', color: authMode === 'login' ? '#fff' : '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>Đăng nhập</button>
              <button onClick={() => setAuthMode('register')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: authMode === 'register' ? '#10b981' : 'transparent', color: authMode === 'register' ? '#fff' : '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>Đăng ký mới</button>
            </div>
            <form onSubmit={handleStudentAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="email" placeholder="Email đăng nhập..." required value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ padding: '14px', borderRadius: '10px', background: '#1e293b', border: '1px solid #475569', color: '#fff', outline: 'none' }} />
              <input type="password" placeholder="Mật khẩu (Tối thiểu 6 ký tự)..." required minLength={6} value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '14px', borderRadius: '10px', background: '#1e293b', border: '1px solid #475569', color: '#fff', outline: 'none' }} />
              
              {authMode === 'register' && (
                <>
                  <input type="text" placeholder="Họ và Tên đầy đủ..." required value={regName} onChange={e => setRegName(e.target.value)} style={{ padding: '14px', borderRadius: '10px', background: '#1e293b', border: '1px solid #475569', color: '#fff', outline: 'none' }} />
                  <input type="text" placeholder="Lớp học (VD: 10A1)..." required value={regClass} onChange={e => setRegClass(e.target.value)} style={{ padding: '14px', borderRadius: '10px', background: '#1e293b', border: '1px solid #475569', color: '#fff', outline: 'none' }} />
                  <div>
                    <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', display: 'block' }}>Chọn Avatar yêu thích:</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {AVATAR_LIST.map(avt => (
                        <div key={avt} onClick={() => setRegAvatar(avt)} style={{ width: '40px', height: '40px', background: regAvatar === avt ? '#cbd5e1' : '#1e293b', border: regAvatar === avt ? '2px solid #3b82f6' : '1px solid #475569', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', cursor: 'pointer', boxSizing: 'border-box' }}>{avt}</div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <button type="submit" style={{ marginTop: '10px', padding: '14px', borderRadius: '10px', border: 'none', background: authMode === 'login' ? '#3b82f6' : '#10b981', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>{authMode === 'login' ? 'VÀO HỌC NGAY' : 'TẠO TÀI KHOẢN'}</button>
            </form>
            <button onClick={() => setPage('landing')} style={{ width: '100%', marginTop: '16px', background: 'transparent', border: 'none', color: '#94a3b8', textDecoration: 'underline', cursor: 'pointer' }}>← Trở lại trang chủ</button>
          </div>
        </div>
      )}

      {page === 'split-choice' && (
        <div className="split-page-container">
          {!transitioningPanel && <button className="back-btn-floating" onClick={() => handleNavigateToPage('landing')}>← Quay lại</button>}
          <div className={`split-panel panel-left ${transitioningPanel === 'left' ? 'expanding' : transitioningPanel === 'right' ? 'shrinking' : ''}`} onClick={() => !transitioningPanel && handleRegionSelect('world', 'Lịch sử Thế Giới', 'left')}>
            <div className="split-bg" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1604620864316-24e5289fcdac?auto=format&fit=crop&w=1200&q=80')` }}></div><div className="split-overlay"></div>
            <div className="split-content"><small>PHẦN 1</small><h2>Lịch sử Thế Giới</h2><div className="split-explore-btn">Xem danh mục <span>→</span></div></div>
          </div>
          <div className={`split-panel panel-right ${transitioningPanel === 'right' ? 'expanding' : transitioningPanel === 'left' ? 'shrinking' : ''}`} onClick={() => !transitioningPanel && handleRegionSelect('vietnam', 'Lịch sử Việt Nam', 'right')}>
            <div className="split-bg" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1623199650742-df21f7b0ce70?auto=format&fit=crop&w=1200&q=80')` }}></div><div className="split-overlay"></div>
            <div className="split-content"><small>PHẦN 2</small><h2>Lịch sử Việt Nam</h2><div className="split-explore-btn">Xem danh mục <span>→</span></div></div>
          </div>
        </div>
      )}

      {page === 'lesson-choice' && (
        <div className="lesson-choice-wrapper animate-fade-in">
           <button className="back-btn-floating" onClick={() => handleNavigateToPage('split-choice')}>← Đổi Khu vực</button>
           <div className="lesson-header">
             <small>{activeRegion === 'world' ? 'PHẦN 1' : 'PHẦN 2'}</small>
             <div className="lesson-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h1>{themeTitle}</h1>
                {currentUser && (
                  <button onClick={() => { fetchMyPassport(); setShowPassportModal(true); }} style={{ background: 'linear-gradient(135deg, #1e3a8a, #1e40af)', color: '#fcd34d', border: '2px solid #fbbf24', padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)', transition: '0.3s' }}>
                    {currentUser.user_metadata?.avatar || '🛂'} Hộ chiếu Di sản của {currentUser.user_metadata?.full_name?.split(' ').pop() || 'Tôi'}
                  </button>
                )}
             </div>
             <p>Lựa chọn một bài học bên dưới để khám phá.</p>
           </div>

           <div className="lesson-grouped-container" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', paddingBottom: '100px' }}>
              {Object.keys(groupedLessons).length > 0 ? (
                 Object.entries(groupedLessons).map(([category, lessons]: [string, any]) => (
                    <div key={category} className={`theme-section ${expandedTheme === category ? 'expanded' : ''}`}>
                       <div className="theme-heading-bar" onClick={() => setExpandedTheme(expandedTheme === category ? null : category)}><h2 className="theme-heading">{category} <span>{lessons.length} bài học</span></h2><div className="theme-toggle-icon">▼</div></div>
                       <div className={`theme-content-wrapper ${expandedTheme === category ? 'open' : 'closed'}`}>
                          <div className="lesson-grid-container">
                             {lessons.map((m: any) => {
                                const coverImg = m.coverImage || (m.gallery && m.gallery.length > 0 ? m.gallery[0].url : 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80');
                                return (
                                  <div key={m.id} className="lesson-card" onClick={() => navigateToApp(m.id, currentUser ? 'student' : 'guest')}>
                                    <div className="lesson-card-img-wrapper"><img src={coverImg} alt={m.name} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80' }} /><div className="lesson-card-overlay"><div className="play-btn-large">▶</div></div></div>
                                    <div className="lesson-card-info"><span className="lesson-icon">{m.icon}</span><div><h3>{m.name}</h3><p>Xem bài giảng</p></div></div>
                                  </div>
                                )
                             })}
                          </div>
                       </div>
                    </div>
                 ))
              ) : (<div style={{color: '#94a3b8', textAlign: 'center', width: '100%', padding: '50px'}}>Chưa có bài học nào.</div>)}
           </div>
        </div>
      )}

      {page === 'admin-dashboard' && (
        <div className="dashboard-wrapper animate-fade-in">
           <header className="dashboard-header">
              <div className="logo">⚙️ TRUNG TÂM ĐIỀU KHIỂN CLOUD (CMS)</div>
              <div className="dashboard-actions">
                 <button className="btn-export" style={{ background: '#0284c7' }} onClick={handleSaveToCloud}>☁️ Lưu lên Đám mây</button>
                 <button className="btn-outline outline-dark" onClick={() => handleNavigateToPage('landing')}>Đăng xuất</button>
              </div>
           </header>
           
           <div className="dashboard-main">
              <aside className="dashboard-sidebar">
                 <div className="sidebar-header"><h3>Danh sách Bài học</h3><button className="btn-add-lesson" onClick={handleAddNewLesson}>+ Thêm Mới</button></div>
                 <div className="lesson-list">
                    {monumentsData.map((m: any) => (
                      <div key={m.id} className={`lesson-list-item ${adminEditingId === m.id ? 'active' : ''}`} onClick={() => { setAdminEditingId(m.id); setActiveAdminTab('general'); }}>
                        <span className="item-icon">{m.icon}</span><div className="item-text"><strong>{m.name}</strong><small>{m.category}</small></div>
                      </div>
                    ))}
                 </div>
              </aside>

              <section className="dashboard-editor">
                 {adminEditingMonu ? (
                    <div className="editor-card animate-fade-in">
                       <div className="editor-header"><h2>Cấu hình: <span>{adminEditingMonu.name}</span></h2><button className="btn-delete" onClick={() => handleDeleteLesson(adminEditingMonu.id)}>🗑️ Xóa</button></div>

                                {/* ======================================= */}
                                {/* MENU TABS CỦA TRUNG TÂM ĐIỀU KHIỂN (CMS) */}
                                {/* ======================================= */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', background: '#f8fafc', padding: '8px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    {['general', 'games', 'ar_masks', 'ar_hands', 'report'].map(tab => (
                                        <button 
                                            key={tab} 
                                            onClick={(e) => { e.preventDefault(); setActiveAdminTab(tab as any); }}
                                            style={{ 
                                                padding: '10px 16px', 
                                                borderRadius: '8px', 
                                                border: 'none', 
                                                cursor: 'pointer', 
                                                fontWeight: 'bold', 
                                                fontSize: '13px',
                                                background: activeAdminTab === tab ? (tab === 'ar_masks' ? '#0ea5e9' : tab === 'ar_hands' ? '#f59e0b' : '#334155') : 'transparent',
                                                color: activeAdminTab === tab ? 'white' : '#64748b',
                                                transition: 'all 0.2s',
                                                boxShadow: activeAdminTab === tab ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                                            }}
                                        >
                                            {tab === 'general' ? '📄 Thông tin chung' : 
                                             tab === 'games' ? '🎮 Các Mini-Games' : 
                                             tab === 'ar_masks' ? '🎭 Xưởng Mặt Nạ AR' : 
                                             tab === 'ar_hands' ? '🖐️ Xưởng Cổ Vật' : 
                                             '📊 Sổ theo dõi điểm'}
                                        </button>
                                    ))}
                                </div>

                       <div className="form-grid">
                          {/* ======================================= */}
                          {/* TAB 1: THÔNG TIN CHUNG */}
                          {/* ======================================= */}
                          {activeAdminTab === 'general' && (
                             <>
                                <div className="form-group"><label>Tên Bài Học / Di Tích</label><input type="text" value={adminEditingMonu.name} onChange={(e) => updateAdminData(adminEditingMonu.id, 'name', e.target.value)} /></div>
                                <div className="form-group"><label>Khu vực (Region)</label><select value={adminEditingMonu.region || 'world'} onChange={(e) => updateAdminData(adminEditingMonu.id, 'region', e.target.value)}><option value="world">Lịch sử Thế Giới</option><option value="vietnam">Lịch sử Việt Nam</option></select></div>
                                <div className="form-group"><label>Tên Chủ Đề (Theme)</label><input type="text" value={adminEditingMonu.category} onChange={(e) => updateAdminData(adminEditingMonu.id, 'category', e.target.value)} /></div>
                                <div className="form-group">
                                   <label>Ảnh bìa bài học (URL)</label>
                                   <div style={{display: 'flex', gap: '8px'}}><input type="text" value={adminEditingMonu.coverImage || ''} onChange={(e) => updateAdminData(adminEditingMonu.id, 'coverImage', e.target.value)} style={{flex: 1}} /><label className="btn-upload">☁ Tải lên<input type="file" accept="image/*" style={{display: 'none'}} onChange={(e) => e.target.files?.[0] && handleFileUpload(adminEditingMonu.id, 'coverImage', e.target.files[0], false)} /></label></div>
                                </div>
                                
                                <div style={{ gridColumn: 'span 2', background: '#eff6ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bfdbfe', display: 'flex', gap: '12px' }}>
                                  <span style={{ fontSize: '20px' }}>💡</span>
                                  <div><strong style={{ fontSize: '13px', color: '#1e3a8a', display: 'block' }}>Bí quyết để AR hoạt động 100%</strong><p style={{ fontSize: '12px', color: '#3b82f6', margin: 0 }}>Trình duyệt thường <b>chặn AR</b> từ link web Sketchfab. Hãy truy cập <a href="https://sketchfab.com/features/download" target="_blank" rel="noreferrer" style={{ color: '#d35400' }}>Sketchfab</a>, tải mô hình <b>.GLB</b> và dùng nút <b>☁ TẢI LÊN</b>.</p></div>
                                </div>

                                <div className="form-group">
                                   <label>Link File 3D (.GLB hoặc SKETCHFAB)</label>
                                   <div style={{display: 'flex', gap: '8px'}}><input type="text" value={adminEditingMonu.normalPath} onChange={(e) => updateAdminData(adminEditingMonu.id, 'normalPath', e.target.value)} style={{flex: 1}} /><label className="btn-upload">☁ Tải lên<input type="file" accept=".glb" style={{display: 'none'}} onChange={(e) => e.target.files?.[0] && handleFileUpload(adminEditingMonu.id, 'normalPath', e.target.files[0], false)} /></label></div>
                                </div>
                                
                                <div className="form-group" style={{ background: '#f3e8ff', padding: '16px', borderRadius: '12px', border: '1px solid #d8b4fe' }}>
                                   <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                     <span style={{ color: '#6d28d9', fontWeight: 'bold' }}>🔊 Audio Thuyết minh Bề mặt (.MP3)</span>
                                     <button className="admin-add-btn" style={{ background: '#8b5cf6', boxShadow: '0 4px 10px rgba(139,92,246,0.3)', padding: '6px 12px' }} onClick={(e) => { e.preventDefault(); handleCopyPromptForAudio(adminEditingMonu); }}>✨ Nhờ AI soạn kịch bản</button>
                                   </label>
                                   <div style={{display: 'flex', gap: '8px'}}>
                                     <input type="text" value={adminEditingMonu.audioUrl || ''} onChange={(e) => updateAdminData(adminEditingMonu.id, 'audioUrl', e.target.value)} style={{flex: 1, border: '1px solid #c4b5fd', padding: '10px', borderRadius: '8px'}} placeholder="Link file audio..." />
                                     <label className="btn-upload" style={{background: '#7c3aed', padding: '10px 20px', borderRadius: '8px'}}>☁ Tải Audio<input type="file" accept="audio/*" style={{display: 'none'}} onChange={(e) => e.target.files?.[0] && handleFileUpload(adminEditingMonu.id, 'audioUrl', e.target.files[0], false)} /></label>
                                   </div>
                                </div>

                                <div className="form-group">
                                   <label>Link Mặt cắt (.GLB hoặc SKETCHFAB)</label>
                                   <div style={{display: 'flex', gap: '8px'}}><input type="text" value={adminEditingMonu.sectionPath} onChange={(e) => updateAdminData(adminEditingMonu.id, 'sectionPath', e.target.value)} style={{flex: 1}} /><label className="btn-upload">☁ Tải lên<input type="file" accept=".glb" style={{display: 'none'}} onChange={(e) => e.target.files?.[0] && handleFileUpload(adminEditingMonu.id, 'sectionPath', e.target.files[0], false)} /></label></div>
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                   <label>Link VR Tour (Mused / Matterport)</label><input type="text" value={adminEditingMonu.tourUrl || ''} onChange={(e) => updateAdminData(adminEditingMonu.id, 'tourUrl', e.target.value)} />
                                </div>

                                <div className="form-group" style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                   <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                      <span>DANH SÁCH MÔ HÌNH PHỤ (.GLB) KÈM AUDIO</span>
                                      <button className="admin-add-btn" onClick={() => updateAdminData(adminEditingMonu.id, 'subModels', [...(adminEditingMonu.subModels || []), { name: 'Mới', path: '', audioUrl: '' }])}>+ Thêm mô hình</button>
                                   </label>
                                   {(adminEditingMonu.subModels || []).map((sub: any, index: number) => (
                                     <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                       <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                         <input type="text" value={sub.name} onChange={(e) => { const newArr = [...adminEditingMonu.subModels]; newArr[index].name = e.target.value; updateAdminData(adminEditingMonu.id, 'subModels', newArr); }} placeholder="Tên" style={{ width: '140px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                         <input type="text" value={sub.path} onChange={(e) => { const newArr = [...adminEditingMonu.subModels]; newArr[index].path = e.target.value; updateAdminData(adminEditingMonu.id, 'subModels', newArr); }} placeholder="Link .glb..." style={{ flex: 1, padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                         <label className="btn-upload" style={{padding: '6px 12px'}}>☁ 3D<input type="file" accept=".glb" style={{display: 'none'}} onChange={async (e) => { if(e.target.files?.[0]){ setIsLoading(true); const file = e.target.files[0]; const filePath = `uploads/${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(filePath); const newArr = [...adminEditingMonu.subModels]; newArr[index].path = data.publicUrl; updateAdminData(adminEditingMonu.id, 'subModels', newArr); } setIsLoading(false); } }} /></label>
                                         <button onClick={() => updateAdminData(adminEditingMonu.id, 'subModels', adminEditingMonu.subModels.filter((_: any, i: number) => i !== index))} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '6px 10px', borderRadius: '8px' }}>✕</button>
                                       </div>
                                       <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                         <span style={{ fontSize: '12px', color: '#6d28d9', width: '140px', fontWeight: 'bold' }}>🔊 Audio Thuyết minh:</span>
                                         <input type="text" value={sub.audioUrl || ''} onChange={(e) => { const newArr = [...adminEditingMonu.subModels]; newArr[index].audioUrl = e.target.value; updateAdminData(adminEditingMonu.id, 'subModels', newArr); }} placeholder="Link file .mp3..." style={{ flex: 1, padding: '6px', border: '1px solid #c4b5fd', borderRadius: '6px' }} />
                                         <label className="btn-upload" style={{padding: '6px 12px', background: '#8b5cf6'}}>☁ Audio<input type="file" accept="audio/*" style={{display: 'none'}} onChange={async (e) => { if(e.target.files?.[0]){ setIsLoading(true); const file = e.target.files[0]; const filePath = `uploads/${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(filePath); const newArr = [...adminEditingMonu.subModels]; newArr[index].audioUrl = data.publicUrl; updateAdminData(adminEditingMonu.id, 'subModels', newArr); } setIsLoading(false); } }} /></label>
                                       </div>
                                     </div>
                                   ))}
                                </div>
                             </>
                          )}

                          {/* ======================================= */}
                          {/* TAB 2: MINI-GAMES */}
                          {/* ======================================= */}
                          {activeAdminTab === 'games' && (
                             <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* --- GAME Ô CHỮ --- */}
                                <div className="form-group" style={{ background: '#ecfdf5', padding: '16px', borderRadius: '12px', border: '1px solid #10b981' }}>
                                   <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                      <span style={{ color: '#065f46', fontWeight: 'bold' }}>🎮 CẤU HÌNH MINI-GAME Ô CHỮ GIẢI MÃ TỪ KHÓA</span>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="admin-add-btn" style={{ background: '#3b82f6', border: '1px solid #2563eb' }} onClick={(e) => { e.preventDefault(); handleCopyPromptForAI(adminEditingMonu); }}>🤖 Nhờ AI soạn</button>
                                        <button className="admin-add-btn" style={{ background: '#10b981' }} onClick={(e) => { e.preventDefault(); updateAdminData(adminEditingMonu.id, 'gameData', [...(adminEditingMonu.gameData || []), { id: Date.now().toString(), question: '', answer: '', explanation: '', keywordCharIndex: 0 }]); }}>+ Thêm hàng</button>
                                      </div>
                                   </label>
                                   
                                   {(adminEditingMonu.gameData || []).map((game: any, index: number) => (
                                     <div key={game.id} style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-start', background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          <div style={{ display: 'flex', gap: '8px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', background: '#10b981', color: 'white', padding: '4px 6px', borderRadius: '4px' }}>Hàng {index + 1}</span>
                                            <input type="text" value={game.question} onChange={(e) => { const n = [...adminEditingMonu.gameData]; n[index].question = e.target.value; updateAdminData(adminEditingMonu.id, 'gameData', n); }} placeholder="Nhập câu hỏi gợi ý..." style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                          </div>
                                          <div style={{ display: 'flex', gap: '10px' }}>
                                            <div style={{ flex: 1 }}>
                                              <label style={{ fontSize: '11px', color: '#475569', display: 'block' }}>Từ đáp án (Viết liền):</label>
                                              <input type="text" value={game.answer} onChange={(e) => { const n = [...adminEditingMonu.gameData]; n[index].answer = e.target.value.toUpperCase(); updateAdminData(adminEditingMonu.id, 'gameData', n); }} placeholder="VD: ROSETTA" style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                            </div>
                                            <div style={{ width: '180px' }}>
                                              <label style={{ fontSize: '11px', color: '#475569', display: 'block' }}>Vị trí chữ giao cột dọc (0,1..):</label>
                                              <input type="number" value={game.keywordCharIndex || 0} onChange={(e) => { const n = [...adminEditingMonu.gameData]; n[index].keywordCharIndex = parseInt(e.target.value) || 0; updateAdminData(adminEditingMonu.id, 'gameData', n); }} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                            </div>
                                          </div>
                                          <div>
                                            <label style={{ fontSize: '11px', color: '#475569', display: 'block' }}>Lời giải thích khoa học:</label>
                                            <input type="text" value={game.explanation || ''} onChange={(e) => { const n = [...adminEditingMonu.gameData]; n[index].explanation = e.target.value; updateAdminData(adminEditingMonu.id, 'gameData', n); }} placeholder="Nhập lý giải chi tiết..." style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                          </div>
                                       </div>
                                       <button onClick={(e) => { e.preventDefault(); updateAdminData(adminEditingMonu.id, 'gameData', adminEditingMonu.gameData.filter((_: any, i: number) => i !== index)); }} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '6px 10px', borderRadius: '8px', marginTop: '20px' }}>✕</button>
                                     </div>
                                   ))}
                                </div>

                                {/* --- GAME LỤC GIÁC --- */}
                                <div className="form-group" style={{ background: '#f5f3ff', padding: '16px', borderRadius: '12px', border: '1px solid #a78bfa' }}>
                                   <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                      <span style={{ color: '#5b21b6', fontWeight: 'bold' }}>🧠 CẤU HÌNH TƯ DUY LỤC GIÁC</span>
                                      <button className="admin-add-btn" style={{ background: '#8b5cf6', border: '1px solid #7c3aed' }} onClick={(e) => { e.preventDefault(); handleCopyPromptForHexAI(adminEditingMonu); }}>🤖 Nhờ AI tạo từ khóa</button>
                                   </label>
                                   <p style={{ fontSize: '12px', color: '#7c3aed', margin: '0 0 16px 0' }}>Nhập các từ khóa hoặc sự kiện cốt lõi của bài học để học sinh sắp xếp và tìm ra sự liên kết logic.</p>
                                   
                                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                     {(adminEditingMonu.hexGameData || []).map((keyword: string, index: number) => (
                                       <div key={index} style={{ display: 'flex', background: 'white', border: '1px solid #c4b5fd', borderRadius: '8px', overflow: 'hidden' }}>
                                          <input type="text" value={keyword} onChange={(e) => { const n = [...adminEditingMonu.hexGameData]; n[index] = e.target.value; updateAdminData(adminEditingMonu.id, 'hexGameData', n); }} style={{ padding: '6px 12px', border: 'none', outline: 'none', width: '120px' }} />
                                          <button onClick={(e) => { e.preventDefault(); updateAdminData(adminEditingMonu.id, 'hexGameData', adminEditingMonu.hexGameData.filter((_: any, i: number) => i !== index)); }} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderLeft: '1px solid #c4b5fd', padding: '0 10px', cursor: 'pointer' }}>✕</button>
                                       </div>
                                     ))}
                                     <button className="admin-add-btn" style={{ background: '#a78bfa', padding: '6px 16px' }} onClick={(e) => { e.preventDefault(); updateAdminData(adminEditingMonu.id, 'hexGameData', [...(adminEditingMonu.hexGameData || []), 'Từ khóa mới']); }}>+ Thêm thẻ</button>
                                   </div>
                                </div>

                                {/* --- GAME NPC VISUAL NOVEL --- */}
                                <div className="form-group" style={{ background: '#eef2ff', padding: '16px', borderRadius: '12px', border: '1px solid #818cf8' }}>
                                   <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                      <span style={{ color: '#4338ca', fontWeight: 'bold' }}>💬 KỊCH BẢN NHẬP VAI VISUAL NOVEL</span>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="admin-add-btn" style={{ background: '#6366f1', border: '1px solid #4f46e5' }} onClick={(e) => { e.preventDefault(); handleCopyPromptForNPC(adminEditingMonu); }}>🤖 Nhờ AI soạn kịch bản</button>
                                        <button className="admin-add-btn" style={{ background: '#4338ca' }} onClick={(e) => { e.preventDefault(); updateAdminData(adminEditingMonu.id, 'npcDialog', [...(adminEditingMonu.npcDialog || []), { id: Date.now().toString(), npcText: '', optAText: '', optAFeedback: '', optAIsCorrect: true, optBText: '', optBFeedback: '', optBIsCorrect: false }]); }}>+ Thêm tình huống</button>
                                      </div>
                                   </label>
                                   <p style={{ fontSize: '12px', color: '#4f46e5', margin: '0 0 16px 0' }}>Tạo các câu hỏi trắc nghiệm ẩn dưới dạng hội thoại. Học sinh phải chọn cách ứng xử đúng với bối cảnh lịch sử.</p>
                                   
                                   {(adminEditingMonu.npcDialog || []).map((node: any, index: number) => (
                                     <div key={node.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span style={{ fontSize: '12px', fontWeight: 'bold', background: '#6366f1', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>Tình huống {index + 1}</span>
                                          <button onClick={(e) => { e.preventDefault(); updateAdminData(adminEditingMonu.id, 'npcDialog', adminEditingMonu.npcDialog.filter((_: any, i: number) => i !== index)); }} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '6px' }}>✕ Xóa</button>
                                       </div>
                                       
                                       <div>
                                          <label style={{ fontSize: '11px', color: '#475569', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Lời thoại của Danh nhân (Câu hỏi):</label>
                                          <textarea value={node.npcText} onChange={(e) => { const n = [...adminEditingMonu.npcDialog]; n[index].npcText = e.target.value; updateAdminData(adminEditingMonu.id, 'npcDialog', n); }} placeholder="Ví dụ: Theo khanh, chúng ta có nên mở cửa giao thương với phương Tây lúc này không?" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '60px', fontFamily: 'inherit' }} />
                                       </div>

                                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <strong style={{ fontSize: '12px', color: '#0f172a' }}>Lựa chọn A</strong>
                                                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                                   <input type="radio" checked={node.optAIsCorrect} onChange={() => { const n = [...adminEditingMonu.npcDialog]; n[index].optAIsCorrect = true; n[index].optBIsCorrect = false; updateAdminData(adminEditingMonu.id, 'npcDialog', n); }} /> Đáp án Đúng
                                                </label>
                                             </div>
                                             <input type="text" value={node.optAText} onChange={(e) => { const n = [...adminEditingMonu.npcDialog]; n[index].optAText = e.target.value; updateAdminData(adminEditingMonu.id, 'npcDialog', n); }} placeholder="Nội dung lựa chọn A..." style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px' }} />
                                             <input type="text" value={node.optAFeedback} onChange={(e) => { const n = [...adminEditingMonu.npcDialog]; n[index].optAFeedback = e.target.value; updateAdminData(adminEditingMonu.id, 'npcDialog', n); }} placeholder="Phản hồi của Danh nhân nếu chọn A..." style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                          </div>
                                          
                                          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <strong style={{ fontSize: '12px', color: '#0f172a' }}>Lựa chọn B</strong>
                                                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                                   <input type="radio" checked={node.optBIsCorrect} onChange={() => { const n = [...adminEditingMonu.npcDialog]; n[index].optBIsCorrect = true; n[index].optAIsCorrect = false; updateAdminData(adminEditingMonu.id, 'npcDialog', n); }} /> Đáp án Đúng
                                                </label>
                                             </div>
                                             <input type="text" value={node.optBText} onChange={(e) => { const n = [...adminEditingMonu.npcDialog]; n[index].optBText = e.target.value; updateAdminData(adminEditingMonu.id, 'npcDialog', n); }} placeholder="Nội dung lựa chọn B..." style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px' }} />
                                             <input type="text" value={node.optBFeedback} onChange={(e) => { const n = [...adminEditingMonu.npcDialog]; n[index].optBFeedback = e.target.value; updateAdminData(adminEditingMonu.id, 'npcDialog', n); }} placeholder="Phản hồi của Danh nhân nếu chọn B..." style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                          </div>
                                       </div>
                                     </div>
                                   ))}
                                </div>
                             </div>
                          )}

                          {/* ======================================= */}
                          {/* TAB 3: XƯỞNG MẶT NẠ AR */}
                          {/* ======================================= */}
                          {activeAdminTab === 'ar_masks' && (
                             <div className="form-group" style={{ gridColumn: 'span 2', background: '#fff1f2', padding: '16px', borderRadius: '12px', border: '1px solid #fecdd3' }}>
                                 <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                     <span style={{ color: '#be123c', fontWeight: 'bold' }}>🎭 CẤU HÌNH KHO MẶT NẠ AR & AUDIO LỒNG TIẾNG</span>
                                     <button className="admin-add-btn" style={{ background: '#e11d48' }} onClick={(e) => { e.preventDefault(); updateAdminData(adminEditingMonu.id, 'masks', [...(adminEditingMonu.masks || []), { id: Date.now().toString(), name: 'Mặt nạ mới', thumbUrl: '', glbUrl: '', audioUrl: '' }]); }}>+ Thêm mặt nạ</button>
                                 </label>
                                 <p style={{ fontSize: '12px', color: '#e11d48', margin: '0 0 16px 0' }}>Tải lên file 3D (.glb) và file ghi âm (.mp3) để nhân vật tự giới thiệu khi học sinh ốp mặt nạ!</p>
                                 
                                 {(adminEditingMonu.masks || []).map((mask: any, index: number) => (
                                     <div key={mask.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #fda4af', boxShadow: '0 4px 6px rgba(225, 29, 72, 0.05)' }}>
                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                             <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white', background: '#e11d48', padding: '4px 10px', borderRadius: '4px' }}>Mặt nạ {index + 1}</span>
                                             <button onClick={(e) => { e.preventDefault(); updateAdminData(adminEditingMonu.id, 'masks', adminEditingMonu.masks.filter((_: any, i: number) => i !== index)); }} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>✕ Xóa</button>
                                         </div>
                                         
                                         {/* Nhập Tên & Nút AI */}
                                         <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input type="text" value={mask.name} onChange={(e) => { const n = [...adminEditingMonu.masks]; n[index].name = e.target.value; updateAdminData(adminEditingMonu.id, 'masks', n); }} placeholder="Tên nhân vật (VD: Nữ hoàng Nefertiti)..." style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#be123c' }} />
                                            <button className="admin-add-btn" style={{ background: '#fb7185', padding: '8px 12px', fontSize: '12px', boxShadow: '0 2px 4px rgba(251, 113, 133, 0.3)' }} onClick={(e) => { e.preventDefault(); handleCopyPromptForMaskAudio(mask.name); }}>✨ Nhờ AI soạn kịch bản giới thiệu</button>
                                         </div>
                                         
                                         {/* Audio, Icon, 3D */}
                                         <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                             <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: '#fff1f2', padding: '6px', borderRadius: '6px', border: '1px solid #fecdd3' }}>
                                                <span style={{ fontSize: '16px' }}>🔊</span>
                                                <input type="text" value={mask.audioUrl || ''} onChange={(e) => { const n = [...adminEditingMonu.masks]; n[index].audioUrl = e.target.value; updateAdminData(adminEditingMonu.id, 'masks', n); }} placeholder="Link audio (.mp3)..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px' }} />
                                                <label className="btn-upload" style={{ background: '#e11d48', padding: '6px 12px', margin: 0 }}>☁ Tải<input type="file" accept="audio/*" style={{display: 'none'}} onChange={async (e) => { if(e.target.files?.[0]){ setIsLoading(true); const file = e.target.files[0]; const filePath = `uploads/${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(filePath); const n = [...adminEditingMonu.masks]; n[index].audioUrl = data.publicUrl; updateAdminData(adminEditingMonu.id, 'masks', n); } setIsLoading(false); } }} /></label>
                                             </div>
                                         </div>

                                         <div style={{ display: 'flex', gap: '8px' }}>
                                             <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                <span style={{ fontSize: '16px' }}>🖼️</span>
                                                <input type="text" value={mask.thumbUrl} onChange={(e) => { const n = [...adminEditingMonu.masks]; n[index].thumbUrl = e.target.value; updateAdminData(adminEditingMonu.id, 'masks', n); }} placeholder="Link icon nhỏ..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px' }} />
                                                <label className="btn-upload" style={{ background: '#f43f5e', padding: '6px 12px', margin: 0 }}>☁ Tải<input type="file" accept="image/*" style={{display: 'none'}} onChange={async (e) => { if(e.target.files?.[0]){ setIsLoading(true); const file = e.target.files[0]; const filePath = `uploads/${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(filePath); const n = [...adminEditingMonu.masks]; n[index].thumbUrl = data.publicUrl; updateAdminData(adminEditingMonu.id, 'masks', n); } setIsLoading(false); } }} /></label>
                                             </div>
                                             
                                             <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                <span style={{ fontSize: '16px' }}>🗿</span>
                                                <input type="text" value={mask.glbUrl} onChange={(e) => { const n = [...adminEditingMonu.masks]; n[index].glbUrl = e.target.value; updateAdminData(adminEditingMonu.id, 'masks', n); }} placeholder="Link file 3D/2D..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px' }} />
                                                <label className="btn-upload" style={{ background: '#be123c', padding: '6px 12px', margin: 0 }}>☁ Tải<input type="file" accept=".glb,image/png,image/jpeg" style={{display: 'none'}} onChange={async (e) => { if(e.target.files?.[0]){ setIsLoading(true); const file = e.target.files[0]; const filePath = `uploads/${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(filePath); const n = [...adminEditingMonu.masks]; n[index].glbUrl = data.publicUrl; updateAdminData(adminEditingMonu.id, 'masks', n); } setIsLoading(false); } }} /></label>
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                          )}
                          {/* ======================================= */}
                          {/* TAB MỚI: XƯỞNG CẦM CỔ VẬT AR */}
                          {/* ======================================= */}
                          {activeAdminTab === 'ar_hands' && (
                            
                             <div className="form-group" style={{ gridColumn: 'span 2', background: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid #fde68a' }}>
                                 <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                     <span style={{ color: '#d97706', fontWeight: 'bold' }}>🖐️ KHO CỔ VẬT AR (CẦM TAY)</span>
                                     <button className="admin-add-btn" style={{ background: '#f59e0b' }} onClick={(e) => { e.preventDefault(); updateAdminData(adminEditingMonu.id, 'handModels', [...(adminEditingMonu.handModels || []), { id: Date.now().toString(), name: 'Cổ vật mới', thumbUrl: '', glbUrl: '' }]); }}>+ Thêm cổ vật</button>
                                 </label>
                                 <p style={{ fontSize: '12px', color: '#d97706', margin: '0 0 16px 0' }}>Tải lên file 3D (.glb) để học sinh ướm thử lên bàn tay.</p>
                                 
                                 {(adminEditingMonu.handModels || []).map((model: any, index: number) => (
                                     <div key={model.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #fcd34d', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.05)' }}>
                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                             <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white', background: '#f59e0b', padding: '4px 10px', borderRadius: '4px' }}>Cổ vật {index + 1}</span>
                                             <button onClick={(e) => { e.preventDefault(); updateAdminData(adminEditingMonu.id, 'handModels', adminEditingMonu.handModels.filter((_: any, i: number) => i !== index)); }} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>✕ Xóa</button>
                                         </div>
                                         <input type="text" value={model.name} onChange={(e) => { const n = [...adminEditingMonu.handModels]; n[index].name = e.target.value; updateAdminData(adminEditingMonu.id, 'handModels', n); }} placeholder="Tên món đồ (VD: Thanh gươm thần, Ấn tín)..." style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#d97706' }} />
                                         
                                         <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                             <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                <span style={{ fontSize: '16px' }}>🖼️</span>
                                                <input type="text" value={model.thumbUrl} onChange={(e) => { const n = [...adminEditingMonu.handModels]; n[index].thumbUrl = e.target.value; updateAdminData(adminEditingMonu.id, 'handModels', n); }} placeholder="Link ảnh icon nhỏ..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px' }} />
                                                <label className="btn-upload" style={{ background: '#f59e0b', padding: '6px 12px', margin: 0 }}>☁ Tải<input type="file" accept="image/*" style={{display: 'none'}} onChange={async (e) => { if(e.target.files?.[0]){ setIsLoading(true); const file = e.target.files[0]; const filePath = `uploads/${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(filePath); const n = [...adminEditingMonu.handModels]; n[index].thumbUrl = data.publicUrl; updateAdminData(adminEditingMonu.id, 'handModels', n); } setIsLoading(false); } }} /></label>
                                             </div>
                                             
                                             <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                <span style={{ fontSize: '16px' }}>🗿</span>
                                                <input type="text" value={model.glbUrl} onChange={(e) => { const n = [...adminEditingMonu.handModels]; n[index].glbUrl = e.target.value; updateAdminData(adminEditingMonu.id, 'handModels', n); }} placeholder="Link file 3D (.glb)..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px' }} />
                                                <label className="btn-upload" style={{ background: '#d97706', padding: '6px 12px', margin: 0 }}>☁ Tải<input type="file" accept=".glb" style={{display: 'none'}} onChange={async (e) => { if(e.target.files?.[0]){ setIsLoading(true); const file = e.target.files[0]; const filePath = `uploads/${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(filePath); const n = [...adminEditingMonu.handModels]; n[index].glbUrl = data.publicUrl; updateAdminData(adminEditingMonu.id, 'handModels', n); } setIsLoading(false); } }} /></label>
                                             </div>

                                             <div style={{ display: 'flex', gap: '8px' }}>
                                              <input type="text" value={model.name} onChange={(e) => { const n = [...adminEditingMonu.handModels]; n[index].name = e.target.value; updateAdminData(adminEditingMonu.id, 'handModels', n); }} placeholder="Tên món đồ (VD: Kiếm, Vòng ngọc)..." style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#d97706' }} />
                                              
                                              <select value={model.type || 'handheld'} onChange={(e) => { const n = [...adminEditingMonu.handModels]; n[index].type = e.target.value; updateAdminData(adminEditingMonu.id, 'handModels', n); }} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #f59e0b', fontWeight: 'bold', color: '#d97706', outline: 'none', background: '#fffbeb', cursor: 'pointer' }}>
                                                  <option value="handheld">✊ Đồ cầm tay</option>
                                                  <option value="bracelet">⌚ Vòng cổ tay</option>
                                              </select>
                                          </div>
                                          
                                         </div>
                                     </div>
                                 ))}
                             </div>
                          )}
                          {/* ======================================= */}
                          {/* TAB 4: SỔ THEO DÕI ĐIỂM (REPORT) */}
                          {/* ======================================= */}
                          {activeAdminTab === 'report' && (
                             <div className="form-group" style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                                <h3 style={{ color: '#1e293b', margin: '0 0 4px 0', fontSize: '15px', fontWeight: 'bold' }}>📊 SỔ THEO DÕI ĐIỂM SỐ HỌC SINH (LMS REPORT)</h3>
                                <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 16px 0' }}>Dữ liệu tự động cập nhật ngay khi học sinh hoàn thành các trò chơi.</p>
                                <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                    <thead>
                                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '10px' }}>Thời gian</th><th style={{ padding: '10px' }}>Họ và Tên</th><th style={{ padding: '10px' }}>Lớp</th><th style={{ padding: '10px' }}>Bài học</th><th style={{ padding: '10px', textAlign: 'center' }}>Điểm số</th><th style={{ padding: '10px' }}>Danh hiệu đạt được</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {leaderboardData.map((score: any) => (
                                        <tr key={score.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '10px', color: '#64748b' }}>{new Date(score.created_at).toLocaleString('vi-VN')}</td>
                                          <td style={{ padding: '10px', fontWeight: 'bold', color: '#1e293b' }}>{score.student_name}</td>
                                          <td style={{ padding: '10px' }}><span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{score.student_class}</span></td>
                                          <td style={{ padding: '10px', color: '#475569' }}>{score.lesson_name}</td>
                                          <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#10b981' }}>{score.correct_answers} / {score.total_questions}</td>
                                          <td style={{ padding: '10px' }}><span style={{ color: '#d97706', fontSize: '12px', fontWeight: 500 }}>{score.badge}</span></td>
                                        </tr>
                                      ))}
                                      {leaderboardData.length === 0 && <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Chưa có học sinh nào nộp bài làm.</td></tr>}
                                    </tbody>
                                  </table>
                                </div>
                             </div>
                          )}
                       </div>

                       <div className="editor-actions">
                          <p>⚠️ Chỉnh sửa xong ở trang này, hãy bấm <b>Lưu lên Đám mây</b>.</p>
                          <button className="btn-primary btn-large" onClick={() => navigateToApp(adminEditingMonu.id, 'admin')}>Mở Giao diện Bài Giảng 3D ➔</button>
                       </div>
                    </div>
                 ) : (
                    <div className="empty-state"><div className="empty-icon">📂</div><h3>Chưa chọn bài học nào</h3></div>
                 )}
              </section>
           </div>
        </div>
      )}

      {page === 'app' && activeMonu && (
        <div className="cas-container animate-fade-in">
          <header className="cas-header">
            <div className="logo" onClick={() => handleNavigateToPage('landing')}>🏛️ Heritage Studio</div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              
              {role === 'admin' ? (
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <button onClick={() => setIsClassroomSyncActive(!isClassroomSyncActive)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: isClassroomSyncActive ? '#ef4444' : '#10b981', color: 'white', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                    {isClassroomSyncActive ? '📢 Đang Phát Sa Bàn' : '📢 Bật Sa Bàn Lớp Học'}
                  </button>
                  {isClassroomSyncActive && (viewMode === 'normal' || viewMode === 'section') && (
                    <button onClick={handleSyncCameraAngle} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #3b82f6', background: '#1e3a8a', color: 'white', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', animation: 'fadeIn 0.3s' }}>🎥 Đồng bộ góc nhìn 3D</button>
                  )}
                </div>
              ) : (
                <button onClick={() => setIsClassroomSyncActive(!isClassroomSyncActive)} style={{ padding: '8px 14px', borderRadius: '12px', border: '1px solid #475569', background: isClassroomSyncActive ? 'linear-gradient(90deg, #ea580c, #d35400)' : 'transparent', color: isClassroomSyncActive ? 'white' : '#cbd5e1', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', boxShadow: isClassroomSyncActive ? '0 0 15px rgba(234,88,12,0.3)' : 'none' }}>
                  {isClassroomSyncActive ? '📡 Đang Nhận Tín Hiệu...' : '📡 Kết Nối Sa Bàn'}
                </button>
              )}

              {role === 'admin' && <button className="btn-outline outline-dark" onClick={() => handleNavigateToPage('admin-dashboard')}>← CMS</button>}
              {(role === 'guest' || role === 'student') && <button className="btn-outline outline-dark" onClick={() => handleNavigateToPage('lesson-choice')}>← Chọn bài khác</button>}
              <button className="btn-primary" onClick={() => handleNavigateToPage('landing')}>Trang chủ</button>
              {currentUser && <button className="btn-outline" style={{ background: '#ef4444', color: 'white', border: 'none' }} onClick={handleLogout}>Thoát</button>}
              <button onClick={() => setIsDarkMode(!isDarkMode)} style={{background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', marginLeft: '16px'}} title="Chuyển đổi giao diện">
                  {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </header>

          <main className="cas-main-grid">
            <aside className="cas-sidebar-left">
              <div className="section-label">{role === 'admin' ? 'DANH SÁCH (ADMIN)' : activeMonu.category.toUpperCase()}</div>
              {displayedMonuments.filter(m => role === 'admin' || m.category === activeMonu.category).map((m: any) => (
                <div key={m.id} className={`topic-card ${activeMonu.id === m.id ? 'active' : ''}`} onClick={() => { setActiveMonuId(m.id); setViewMode('normal'); }}>
                  <span className="topic-icon">{m.icon}</span><div className="topic-info"><strong>{m.name}</strong></div>
                </div>
              ))}
            </aside>

            <section className="cas-viewport">
              {viewMode !== 'game' && viewMode !== 'hex' && viewMode !== 'ar' && viewMode !== 'npc' && viewMode !== 'mask' && viewMode !== 'hand' && (
                <div className={`viewport-header ${viewMode === 'tour' ? 'tour-mode' : ''}`}>
                  {role === 'admin' ? (
                    <input className="admin-input-title" value={activeMonu.name || ''} onChange={(e) => handleUpdateName(e.target.value)} />
                  ) : (
                    <h2>{activeMonu.name} <span>{activeMonu.category}</span></h2>
                  )}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <div className="view-mode-tabs">
                      <button className={viewMode === 'normal' ? 'active' : ''} onClick={() => setViewMode('normal')}>Bề mặt 3D</button>
                      <button className={viewMode === 'section' ? 'active' : ''} onClick={() => setViewMode('section')}>Mặt cắt</button>
                      {activeMonu.tourUrl && <button className={`tour-btn ${viewMode === 'tour' ? 'active' : ''}`} onClick={() => setViewMode('tour')}>🌐 VR Tour</button>}
                      {currentMainModelPath && <button className="ar-btn" onClick={() => setViewMode('ar')} style={{ color: '#d35400', background: 'transparent', fontWeight: 'bold', marginLeft: '4px' }}>📱 Xem AR</button>}
                      
                      {/* NÚT MỚI DÀNH CHO XƯỞNG MẶT NẠ AR */}
                      <button className="game-btn" onClick={() => { setViewMode('mask'); }} style={{ color: '#ec4899', border: '1px solid #ec4899', fontWeight: 'bold', marginLeft: '4px', background: 'transparent' }}>🎭 Xưởng Mặt Nạ AR</button>
                      <button className="game-btn" onClick={() => { setViewMode('hand'); setActiveHandIndex(null); }} style={{ color: '#f59e0b', border: '1px solid #f59e0b', fontWeight: 'bold', marginLeft: '4px', background: 'transparent' }}>🖐️ Xưởng Cổ Vật</button>
                      {activeMonu.npcDialog && activeMonu.npcDialog.length > 0 && <button className="game-btn" onClick={() => { setViewMode('npc'); setNpcStep(0); setNpcFeedback(null); }} style={{ color: '#6366f1', border: '1px solid #6366f1', fontWeight: 'bold', marginLeft: '4px', background: 'transparent' }}>💬 Gặp Danh Nhân</button>}
                      {activeMonu.gameData && activeMonu.gameData.length > 0 && <button className="game-btn" onClick={() => { setViewMode('game'); setSelectedRowIndex(null); setGameInput(''); setGameFeedback('idle'); setWrongCount(0); setShowExplanation(false); setShowRewardModal(false); setRowStates(activeMonu.gameData.map(() => ({ solved: false, skipped: false, guess: '' }))); }} style={{ color: '#10b981', border: '1px solid #10b981', fontWeight: 'bold', marginLeft: '4px', background: 'transparent' }}>🎮 Ô chữ</button>}
                      {activeMonu.hexGameData && activeMonu.hexGameData.length > 0 && <button className="game-btn" onClick={() => { setViewMode('hex'); setShowHexSubmit(false); setHexReasoning(''); }} style={{ color: '#3b82f6', border: '1px solid #3b82f6', fontWeight: 'bold', marginLeft: '4px', background: 'transparent' }}>🧠 Lục giác</button>}
                    </div>
                  </div>
                </div>
              )}

              <div className="canvas-wrapper" style={(viewMode === 'ar' || viewMode === 'game' || viewMode === 'hex' || viewMode === 'npc' || viewMode === 'mask' || viewMode === 'hand') ? { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '420px', position: 'relative', overflow: 'hidden' } : { position: 'relative', flex: 1 }}>

                
                {/* 🎭 MÀN HÌNH TẠO MẶT NẠ AR (MASK MAKER) */}
                {viewMode === 'mask' && (
                  
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '16px', boxSizing: 'border-box', background: theme.bgMain, overflowY: 'auto' }}>
                      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                          <button className="back-btn" style={{ margin: 0, width: 'auto', background: theme.bgPanel, color: theme.textMain, border: `1px solid ${theme.border}` }} onClick={() => setViewMode('normal')}>← Trở lại Bài học</button>
                      </div>
                      
                      <div style={{ display: 'flex', flex: 1, gap: '20px', flexDirection: 'row', flexWrap: 'wrap', minHeight: 0 }}>
                          {/* NỬA TRÁI: PREVIEW FILE GLB */}
                          <div style={{ flex: '1 1 300px', minHeight: '400px', background: theme.inputBg, borderRadius: '16px', position: 'relative', overflow: 'hidden', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }}>
                              <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', backdropFilter: 'blur(4px)' }}>🔍 Cuộn/Vuốt để Zoom</div>
                              <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
                                  <ambientLight intensity={1.5} />
                                  <directionalLight position={[10, 10, 10]} intensity={1.5} />
                                    <Suspense fallback={<Html center={true as any}><div style={{ color: theme.textMain, whiteSpace: 'nowrap' }}>Đang tải...</div></Html>}>
                                        {(activeMaskIndex !== null && activeMonu.masks && activeMonu.masks[activeMaskIndex]?.glbUrl) ? (
                                            activeMonu.masks[activeMaskIndex].glbUrl.match(/\.(png|jpe?g|webp)(\?.*)?$/i) ? (
                                                <Html center={true as any}>
                                                    <div style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: '20px', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px dashed #ec4899' }}>
                                                        <img src={activeMonu.masks[activeMaskIndex].glbUrl} alt="2D Mask" style={{ maxWidth: '200px', maxHeight: '250px', objectFit: 'contain' }} />
                                                        <div style={{ textAlign: 'center', marginTop: '10px', color: '#ec4899', fontSize: '12px', fontWeight: 'bold' }}>✨ Filter 2D Đa Điểm</div>
                                                    </div>
                                                </Html>
                                            ) : (
                                                <HistoricalModel path={activeMonu.masks[activeMaskIndex].glbUrl} onMeshClick={() => {}} />
                                            )
                                        ) : (
                                            <Center>
                                                <mesh><sphereGeometry args={[0.8, 32, 32]} /><meshStandardMaterial color="#3b82f6" wireframe /></mesh>
                                                <Html position={[0, -1.2, 0]} center={true as any}><div style={{ color: theme.textMain, whiteSpace: 'nowrap', fontSize: '14px', background: theme.bgCard, padding: '4px 8px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>Chưa chọn mặt nạ nào</div></Html>
                                            </Center>
                                        )}
                                    </Suspense>
                                  {/* ĐÃ BẬT ENABLE ZOOM = TRUE ĐỂ ZOOM RA/VÀO */}
                                  <OrbitControls enableZoom={true} minDistance={1} maxDistance={6} enablePan={false} autoRotate autoRotateSpeed={2} />
                              </Canvas>
                          </div>
                          
                          {/* NỬA PHẢI: KHO MẶT NẠ (GRID) VÀ QR CODE */}
                          <div style={{ flex: '1 1 300px', background: theme.bgPanel, borderRadius: '16px', padding: '24px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ color: '#ec4899', margin: '0 0 16px 0', textTransform: 'uppercase', fontSize: '18px', letterSpacing: '1px' }}>🎭 Kho Mặt Nạ ({activeMonu.masks?.length || 0})</h3>
                            <p style={{ color: theme.textSub, fontSize: '13px', margin: '0 0 16px 0' }}>Bấm chọn một mặt nạ để xem trước và nhận mã QR đeo thử.</p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                                {(activeMonu.masks || []).map((mask: any, index: number) => (
                                    <div key={mask.id} onClick={() => setActiveMaskIndex(index)} style={{ cursor: 'pointer', border: activeMaskIndex === index ? '2px solid #ec4899' : `1px solid ${theme.border}`, borderRadius: '12px', padding: '6px', background: activeMaskIndex === index ? (isDarkMode ? 'rgba(236, 72, 153, 0.1)' : 'rgba(236, 72, 153, 0.05)') : theme.bgCard, textAlign: 'center', transition: '0.2s', boxShadow: activeMaskIndex === index ? '0 0 15px rgba(236, 72, 153, 0.3)' : 'none' }}>
                                        <img src={mask.thumbUrl || 'https://placehold.co/100x100?text=No+Img'} alt={mask.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '8px', marginBottom: '6px' }} />
                                        <span style={{ fontSize: '11px', color: activeMaskIndex === index ? '#ec4899' : theme.textMain, fontWeight: 'bold', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mask.name}</span>
                                    </div>
                                ))}
                                {(!activeMonu.masks || activeMonu.masks.length === 0) && (
                                    <p style={{ color: theme.textSub, fontSize: '12px', gridColumn: '1/-1' }}>Giáo viên chưa tải lên mặt nạ nào cho bài học này.</p>
                                )}
                            </div>

                            {(activeMaskIndex !== null && activeMonu.masks && activeMonu.masks[activeMaskIndex]) ? (() => {
                                const selectedMask = activeMonu.masks[activeMaskIndex];
                                const arUrl = `${window.location.origin}/face-ar.html?model=${encodeURIComponent(selectedMask.glbUrl)}&audio=${encodeURIComponent(selectedMask.audioUrl || '')}`;
                                return (
                                    <div style={{ marginTop: 'auto', textAlign: 'center', background: theme.bgCard, padding: '20px', borderRadius: '12px', border: '1px dashed #ec4899', animation: 'fadeIn 0.3s' }}>
                                        <QRCodeSVG value={arUrl} size={130} level="M" includeMargin={true} style={{ background: 'white', padding: '8px', borderRadius: '8px', margin: '0 auto' }} />
                                        <p style={{ color: theme.textMain, fontSize: '13px', marginTop: '16px', marginBottom: '16px', lineHeight: '1.5' }}>Quét mã QR để hóa thân thành <b style={{color: '#ec4899'}}>{selectedMask.name}</b>!</p>
                                        <a href={arUrl} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', padding: '12px', background: 'linear-gradient(90deg, #ec4899, #db2777)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxSizing: 'border-box', boxShadow: '0 4px 10px rgba(236,72,153,0.3)' }}>Mở Camera AR Trực tiếp</a>
                                    </div>
                                );
                            })() : (
                                <div style={{ marginTop: 'auto', textAlign: 'center', background: theme.bgCard, padding: '20px', borderRadius: '12px', border: `1px dashed ${theme.border}` }}>
                                    <p style={{ color: theme.textSub, fontSize: '13px', margin: 0 }}>Vui lòng chọn một mặt nạ ở trên.</p>
                                </div>
                            )}
                          </div>
                      </div>
                  </div>
                )}

                {/* 🖐️ MÀN HÌNH TẠO AR CẦM TAY (HAND MAKER) */}
                {viewMode === 'hand' && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '16px', boxSizing: 'border-box', background: theme.bgMain, overflowY: 'auto' }}>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                            <button className="back-btn" style={{ margin: 0, width: 'auto', background: theme.bgPanel, color: theme.textMain, border: `1px solid ${theme.border}` }} onClick={() => setViewMode('normal')}>← Trở lại Bài học</button>
                        </div>
                        
                        <div style={{ display: 'flex', flex: 1, gap: '20px', flexDirection: 'row', flexWrap: 'wrap', minHeight: 0 }}>
                            {/* NỬA TRÁI: PREVIEW FILE GLB */}
                            <div style={{ flex: '1 1 300px', minHeight: '400px', background: theme.inputBg, borderRadius: '16px', position: 'relative', overflow: 'hidden', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', backdropFilter: 'blur(4px)' }}>🔍 Cuộn/Vuốt để Zoom</div>
                                <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
                                    <ambientLight intensity={1.5} />
                                    <directionalLight position={[10, 10, 10]} intensity={1.5} />
                                      <Suspense fallback={<Html center={true as any}><div style={{ color: theme.textMain, whiteSpace: 'nowrap' }}>Đang tải...</div></Html>}>
                                          {(activeHandIndex !== null && activeMonu.handModels && activeMonu.handModels[activeHandIndex]?.glbUrl) ? (
                                              <HistoricalModel path={activeMonu.handModels[activeHandIndex].glbUrl} onMeshClick={() => {}} />
                                          ) : (
                                              <Center>
                                                  <mesh><cylinderGeometry args={[0.2, 0.2, 1.5, 32]} /><meshStandardMaterial color="#f59e0b" wireframe /></mesh>
                                                  <Html position={[0, -1.2, 0]} center={true as any}><div style={{ color: theme.textMain, whiteSpace: 'nowrap', fontSize: '14px', background: theme.bgCard, padding: '4px 8px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>Chưa chọn cổ vật nào</div></Html>
                                              </Center>
                                          )}
                                      </Suspense>
                                    <OrbitControls enableZoom={true} minDistance={1} maxDistance={6} enablePan={false} autoRotate autoRotateSpeed={2} />
                                </Canvas>
                            </div>
                            
                            {/* NỬA PHẢI: KHO CỔ VẬT & MÃ QR */}
                            <div style={{ flex: '1 1 300px', background: theme.bgPanel, borderRadius: '16px', padding: '24px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }}>
                              <h3 style={{ color: '#f59e0b', margin: '0 0 16px 0', textTransform: 'uppercase', fontSize: '18px', letterSpacing: '1px' }}>🖐️ Kho Cổ Vật ({activeMonu.handModels?.length || 0})</h3>
                              <p style={{ color: theme.textSub, fontSize: '13px', margin: '0 0 16px 0' }}>Bấm chọn một cổ vật để xem trước và nhận mã QR ướm lên tay.</p>
                              
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                                  {(activeMonu.handModels || []).map((model: any, index: number) => (
                                      <div key={model.id} onClick={() => setActiveHandIndex(index)} style={{ cursor: 'pointer', border: activeHandIndex === index ? '2px solid #f59e0b' : `1px solid ${theme.border}`, borderRadius: '12px', padding: '6px', background: activeHandIndex === index ? (isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)') : theme.bgCard, textAlign: 'center', transition: '0.2s', boxShadow: activeHandIndex === index ? '0 0 15px rgba(245, 158, 11, 0.3)' : 'none' }}>
                                          <img src={model.thumbUrl || 'https://placehold.co/100x100?text=No+Img'} alt={model.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '8px', marginBottom: '6px' }} />
                                          <span style={{ fontSize: '11px', color: activeHandIndex === index ? '#f59e0b' : theme.textMain, fontWeight: 'bold', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{model.name}</span>
                                      </div>
                                  ))}
                                  {(!activeMonu.handModels || activeMonu.handModels.length === 0) && (
                                      <p style={{ color: theme.textSub, fontSize: '12px', gridColumn: '1/-1' }}>Giáo viên chưa tải lên cổ vật nào.</p>
                                  )}
                              </div>

                              {(activeHandIndex !== null && activeMonu.handModels && activeMonu.handModels[activeHandIndex]) ? (() => {
                                  const selectedModel = activeMonu.handModels[activeHandIndex];
                                  const arUrl = `${window.location.origin}/hand-ar.html?model=${encodeURIComponent(selectedModel.glbUrl)}&type=${selectedModel.type || 'handheld'}`;
                                  return (
                                      <div style={{ marginTop: 'auto', textAlign: 'center', background: theme.bgCard, padding: '20px', borderRadius: '12px', border: '1px dashed #f59e0b', animation: 'fadeIn 0.3s' }}>
                                          <QRCodeSVG value={arUrl} size={130} level="M" includeMargin={true} style={{ background: 'white', padding: '8px', borderRadius: '8px', margin: '0 auto' }} />
                                          <p style={{ color: theme.textMain, fontSize: '13px', marginTop: '16px', marginBottom: '16px', lineHeight: '1.5' }}>Quét mã QR để ướm <b style={{color: '#f59e0b'}}>{selectedModel.name}</b> lên tay!</p>
                                          <a href={arUrl} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', padding: '12px', background: 'linear-gradient(90deg, #f59e0b, #d97706)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxSizing: 'border-box', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)' }}>Mở Camera AR Trực tiếp</a>
                                      </div>
                                  );
                              })() : (
                                  <div style={{ marginTop: 'auto', textAlign: 'center', background: theme.bgCard, padding: '20px', borderRadius: '12px', border: `1px dashed ${theme.border}` }}>
                                      <p style={{ color: theme.textSub, fontSize: '13px', margin: 0 }}>Vui lòng chọn một cổ vật ở trên.</p>
                                  </div>
                              )}
                            </div>
                        </div>
                    </div>
                  )}


               {/* GAME VISUAL NOVEL (NPC ROLEPLAY) */}
                {viewMode === 'npc' && activeMonu.npcDialog && (
                   <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 100 }}>
                        <button className="back-btn" onClick={() => setViewMode('normal')} style={{ background: theme.bgPanel, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>← Trở về 3D</button>
                      </div>

                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', filter: isDarkMode ? 'brightness(0.5)' : 'brightness(0.8)' }}>
                        <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
                          <ambientLight intensity={1.5} /><directionalLight position={[10, 10, 10]} intensity={1.5} />
                          <Suspense fallback={null}>
                            {currentMainModelPath && <HistoricalModel path={currentMainModelPath} onMeshClick={() => {}} />}
                          </Suspense>
                          <OrbitControls autoRotate autoRotateSpeed={0.5} enableZoom={false} enablePan={false} />
                        </Canvas>
                      </div>

                      {(!currentUser && !isStudentRegistered) ? (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                          <div style={{ maxWidth: '400px', width: '90%', padding: '24px', textAlign: 'center', background: theme.bgPanel, borderRadius: '16px', border: `1px solid ${theme.border}`, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                            <h3 style={{ color: '#6366f1', margin: '0 0 8px 0', textTransform: 'uppercase' }}>💬 Ghi danh sử sách</h3>
                            <p style={{ color: theme.textSub, fontSize: '13px', marginBottom: '24px' }}>Vui lòng nhập tên để lưu lại chiến công ngoại giao của bạn.</p>
                            <input type="text" placeholder="Họ và Tên học sinh..." value={studentName} onChange={e => setStudentName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textMain, marginBottom: '12px', outline: 'none', boxSizing: 'border-box' }} />
                            <input type="text" placeholder="Lớp..." value={studentClass} onChange={e => setStudentClass(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textMain, marginBottom: '20px', outline: 'none', boxSizing: 'border-box' }} />
                            <button disabled={!studentName.trim() || !studentClass.trim()} onClick={() => setIsStudentRegistered(true)} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: (studentName.trim() && studentClass.trim()) ? '#6366f1' : theme.bgCard, color: (studentName.trim() && studentClass.trim()) ? 'white' : theme.textSub, fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: '0.2s' }}>Bắt đầu Gặp gỡ</button>
                          </div>
                        </div>
                      ) : (
                        npcStep < activeMonu.npcDialog.length ? (
                          /* KHUNG THOẠI ĐƯỢC GHIM XUỐNG ĐÁY MÀN HÌNH */
                          <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '800px', zIndex: 20 }}>
                             <div style={{ background: theme.bgPanel, border: `2px solid #6366f1`, borderRadius: '16px', padding: '24px', paddingTop: '30px', boxShadow: '0 15px 30px rgba(0,0,0,0.5)', position: 'relative' }}>
                                 
                                 {/* TÊN NHÂN VẬT NỔI LÊN TRÊN VIỀN */}
                                 <div style={{ position: 'absolute', top: '-16px', left: '24px', background: '#6366f1', color: 'white', padding: '6px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)' }}>
                                    Nhân vật Bí ẩn 👤
                                 </div>
                                 
                                 {!npcFeedback ? (
                                   <div>
                                     <p style={{ color: theme.textMain, fontSize: '16px', lineHeight: '1.6', margin: '0 0 20px 0', fontStyle: 'italic' }}>"{activeMonu.npcDialog[npcStep].npcText}"</p>
                                     <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {/* NÚT BẤM ĐƯỢC CHUYỂN XUỐNG HÀNG DỌC */}
                                        <button onClick={() => setNpcFeedback({ text: activeMonu.npcDialog[npcStep].optAFeedback, isCorrect: activeMonu.npcDialog[npcStep].optAIsCorrect })} style={{ background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '12px 16px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', transition: '0.2s', fontSize: '14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                           <span style={{ background: '#6366f1', color: 'white', width: '28px', height: '28px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', borderRadius: '6px', fontWeight: 'bold', flexShrink: 0 }}>A</span> 
                                           <span>{activeMonu.npcDialog[npcStep].optAText}</span>
                                        </button>
                                        <button onClick={() => setNpcFeedback({ text: activeMonu.npcDialog[npcStep].optBFeedback, isCorrect: activeMonu.npcDialog[npcStep].optBIsCorrect })} style={{ background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '12px 16px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', transition: '0.2s', fontSize: '14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                           <span style={{ background: '#6366f1', color: 'white', width: '28px', height: '28px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', borderRadius: '6px', fontWeight: 'bold', flexShrink: 0 }}>B</span> 
                                           <span>{activeMonu.npcDialog[npcStep].optBText}</span>
                                        </button>
                                     </div>
                                   </div>
                                 ) : (
                                   <div style={{ animation: 'fadeIn 0.3s' }}>
                                     <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '20px', background: npcFeedback.isCorrect ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)', padding: '16px', borderRadius: '8px', borderLeft: `4px solid ${npcFeedback.isCorrect ? '#34d399' : '#f87171'}` }}>
                                         <span style={{ fontSize: '24px' }}>{npcFeedback.isCorrect ? '✨' : '💢'}</span>
                                         <p style={{ color: npcFeedback.isCorrect ? '#34d399' : '#f87171', fontSize: '15px', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                                            "{npcFeedback.text}"
                                         </p>
                                     </div>
                                     <div style={{ textAlign: 'right' }}>
                                         <button onClick={() => {
                                            if (npcFeedback.isCorrect) {
                                               if (npcStep === activeMonu.npcDialog.length - 1) {
                                                  handleNpcComplete();
                                               } else {
                                                  setNpcStep(s => s + 1);
                                                  setNpcFeedback(null);
                                               }
                                            } else {
                                               setNpcFeedback(null); 
                                            }
                                         }} style={{ background: npcFeedback.isCorrect ? '#6366f1' : 'transparent', border: npcFeedback.isCorrect ? 'none' : '1px solid #ef4444', color: npcFeedback.isCorrect ? 'white' : '#f87171', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                                            {npcFeedback.isCorrect ? 'Tiếp tục câu chuyện ➔' : 'Thử chọn lại ↻'}
                                         </button>
                                     </div>
                                   </div>
                                 )}
                             </div>
                          </div>
                        ) : null
                      )}
                   </div>
                )}

                {/* GAME Ô CHỮ TRUYỀN THỐNG */}
                {viewMode === 'game' && activeMonu.gameData && (
                  <div style={{ width: '100%', padding: '20px', background: theme.bgMain, borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', maxHeight: '100%', boxSizing: 'border-box' }}>
                    
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                      <button className="back-btn" style={{ margin: 0, background: theme.bgPanel, color: theme.textMain, border: `1px solid ${theme.border}` }} onClick={() => setViewMode('normal')}>← Trở lại</button>
                    </div>

                    {!currentUser && !isStudentRegistered ? (
                      <div style={{ maxWidth: '400px', width: '100%', padding: '10px', textAlign: 'center', animation: 'fadeIn 0.5s', boxSizing: 'border-box' }}>
                        <h3 style={{ color: '#10b981', marginBottom: '8px' }}>📝 ĐĂNG NHẬP ĐỂ LƯU ĐIỂM</h3>
                        <p style={{ color: theme.textSub, fontSize: '13px', marginBottom: '24px' }}>Bạn đang truy cập dưới quyền khách (Guest). Vui lòng điền tên để chơi tạm, hoặc đăng nhập tài khoản để lưu lại Hộ chiếu.</p>
                        <input type="text" placeholder="Nhập Họ và Tên học sinh..." value={studentName} onChange={e => setStudentName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textMain, marginBottom: '12px', outline: 'none', boxSizing: 'border-box' }} />
                        <input type="text" placeholder="Nhập Lớp (Ví dụ: 10A1)..." value={studentClass} onChange={e => setStudentClass(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textMain, marginBottom: '20px', outline: 'none', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: '8px' }}>
                           <button onClick={() => setPage('student-auth')} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#3b82f6', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Đăng nhập</button>
                           <button disabled={!studentName.trim() || !studentClass.trim()} onClick={() => setIsStudentRegistered(true)} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: (studentName.trim() && studentClass.trim()) ? '#10b981' : theme.bgCard, color: (studentName.trim() && studentClass.trim()) ? 'white' : theme.textSub, fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Chơi Tạm</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 style={{ color: '#10b981', margin: '0 0 4px 0', fontFamily: 'Montserrat', textAlign: 'center' }}>🧩 THỬ THÁCH GIẢI MÃ Ô CHỮ</h3>
                        <p style={{ color: theme.textSub, fontSize: '13px', marginBottom: '24px', textAlign: 'center' }}>
                          Thí sinh: <b style={{color: theme.textMain}}>{currentUser?.user_metadata?.full_name || studentName}</b> - Lớp: <b style={{color: theme.textMain}}>{currentUser?.user_metadata?.class_name || studentClass}</b>
                        </p>
                        
                        <div className="crossword-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px', width: '100%', alignItems: 'center', overflowX: 'auto', paddingBottom: '10px' }}>
                          {activeMonu.gameData.map((item: any, rIdx: number) => {
                            const state = rowStates[rIdx] || { solved: false, skipped: false, guess: '' };
                            const displayString = state.solved || state.skipped ? item.answer.toUpperCase() : state.guess.padEnd(item.answer.length, ' ');
                            const keywordIndex = item.keywordCharIndex || 0;

                            return (
                              <div key={rIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: 'fit-content', transform: `translateX(${(4 - keywordIndex) * 38}px)` }}>
                                <span style={{ color: theme.textSub, fontSize: '11px', width: '20px', textAlign: 'right', marginRight: '10px', fontWeight: 'bold' }}>{rIdx + 1}</span>
                                {item.answer.split('').map((_: string, cIdx: number) => {
                                  const isKeywordCell = cIdx === keywordIndex;
                                  const letterToShow = displayString[cIdx]?.trim() || '';
                                  return (
                                    <div key={cIdx} onClick={() => { setSelectedRowIndex(rIdx); setGameInput(state.solved || state.skipped ? item.answer : state.guess); setGameFeedback('idle'); setWrongCount(0); setShowExplanation(false); }}
                                      style={{ width: '34px', height: '34px', border: selectedRowIndex === rIdx ? '2px solid #10b981' : `1px solid ${theme.border}`, background: isKeywordCell ? '#ea580c' : (state.solved ? theme.bgCard : (state.skipped ? (isDarkMode ? '#475569' : '#cbd5e1') : theme.bgPanel)), color: isKeywordCell || state.solved ? (isDarkMode ? '#fff' : '#0f172a') : theme.textMain, display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', borderRadius: '6px', margin: '0 2px', justifyContent: 'center', boxShadow: selectedRowIndex === rIdx ? '0 0 10px rgba(16,185,129,0.4)' : 'none', flexShrink: 0 }}
                                    >{letterToShow}</div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>

                        {selectedRowIndex !== null && activeMonu.gameData[selectedRowIndex] && (() => {
                          const rowItem = activeMonu.gameData[selectedRowIndex];
                          const rState = rowStates[selectedRowIndex] || { solved: false, skipped: false, guess: '' };
                          return (
                            <div style={{ background: theme.bgPanel, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '16px', width: '100%', maxWidth: '500px', boxSizing: 'border-box' }}>
                              <p style={{ color: '#10b981', fontWeight: 'bold', margin: '0 0 6px 0', fontSize: '12px' }}>HÀNG NGANG SỐ {selectedRowIndex + 1}:</p>
                              <p style={{ color: theme.textMain, fontSize: '14px', margin: '0 0 16px 0', lineHeight: '1.5', textAlign: 'left' }}>{rowItem.question}</p>
                              
                              {wrongCount >= 2 && !rState.solved && !rState.skipped && (
                                <p style={{ color: '#f97316', fontSize: '12px', margin: '0 0 12px 0', background: 'rgba(249,115,22,0.1)', padding: '8px', borderRadius: '6px', border: '1px dashed rgba(249,115,22,0.3)', textAlign: 'left' }}>💡 <b>Gợi ý:</b> Chữ cái đầu tiên là <b>"{rowItem.answer.charAt(0).toUpperCase()}"</b>. Có <b>{rowItem.answer.length}</b> ký tự.</p>
                              )}

                              {!rState.solved && !rState.skipped ? (
                                <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                                  <input type="text" value={gameInput} onChange={(e) => setGameInput(e.target.value.toUpperCase())} placeholder="Nhập đáp án..." style={{ flex: 1, minWidth: '150px', padding: '10px', borderRadius: '8px', border: gameFeedback === 'wrong' ? '1px solid #ef4444' : `1px solid ${theme.border}`, background: theme.inputBg, color: theme.textMain, outline: 'none' }} />
                                  <button onClick={() => {
                                      const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '').toLowerCase();
                                      if (norm(gameInput) === norm(rowItem.answer)) {
                                        const newStates = [...rowStates]; newStates[selectedRowIndex] = { solved: true, skipped: false, guess: rowItem.answer.toUpperCase() };
                                        setRowStates(newStates); setGameFeedback('correct'); setWrongCount(0);
                                        checkGameCompletion(newStates);
                                      } else {
                                        setGameFeedback('wrong'); setWrongCount(prev => prev + 1);
                                        const newStates = [...rowStates]; newStates[selectedRowIndex].guess = gameInput; setRowStates(newStates);
                                      }
                                    }} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Giải</button>
                                  {wrongCount >= 3 && (
                                    <button onClick={() => {
                                        const newStates = [...rowStates]; newStates[selectedRowIndex] = { solved: false, skipped: true, guess: rowItem.answer.toUpperCase() };
                                        setRowStates(newStates); setGameInput(rowItem.answer.toUpperCase()); setWrongCount(0);
                                        checkGameCompletion(newStates);
                                      }} style={{ background: 'transparent', color: '#f59e0b', border: '1px solid #f59e0b', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Bỏ qua</button>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <p style={{ color: rState.solved ? '#10b981' : theme.textSub, margin: 0, fontSize: '14px', fontWeight: 'bold', textAlign: 'left' }}>
                                    {rState.solved ? '✅ Đã giải chính xác!' : '⏭️ Đã bỏ qua.'} Đáp án: <span style={{letterSpacing:'2px', color: theme.textMain}}>{rowItem.answer.toUpperCase()}</span>
                                  </p>
                                  {rowItem.explanation && (
                                    <>
                                      <button onClick={() => setShowExplanation(!showExplanation)} style={{ background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', width: 'fit-content', fontSize: '11px' }}>{showExplanation ? '▲ Ẩn lý giải' : '📖 Xem lời giải thích đáp án'}</button>
                                      {showExplanation && <p style={{ background: 'rgba(16,185,129,0.05)', padding: '12px', borderRadius: '8px', color: theme.textSub, fontSize: '13px', margin: '4px 0 0 0', borderLeft: '3px solid #10b981', textAlign: 'left', lineHeight: '1.5' }}>{rowItem.explanation}</p>}
                                    </>
                                  )}
                                </div>
                              )}
                              {gameFeedback === 'wrong' && <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0 0', textAlign: 'left' }}>❌ Đáp án chưa chính xác, hãy thử lại!</p>}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}

                {/* GAME LỤC GIÁC MỚI (HEXAGONAL THINKING) */}
                {viewMode === 'hex' && activeMonu.hexGameData && (
                  <div id="hex-container" style={{ width: '100%', height: '100%', position: 'relative', background: theme.bgMain, backgroundImage: `radial-gradient(${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 1px, transparent 1px)`, backgroundSize: '30px 30px', overflow: 'hidden' }}>
                    
                    <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, display: 'flex', gap: '10px' }}>
                      <button className="back-btn" style={{ margin: 0, padding: '8px 16px', background: theme.bgPanel, border: `1px solid ${theme.border}`, color: theme.textMain }} onClick={() => setViewMode('normal')}>← Về 3D</button>
                    </div>
                    
                    {!showHexSubmit ? (
                      <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: theme.bgPanel, padding: '12px 24px', borderRadius: '24px', border: `1px solid ${theme.border}`, textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', width: '90%', maxWidth: '400px' }}>
                        <p style={{ color: '#8b5cf6', margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold' }}>💡 Hãy kéo các thẻ lục giác lại gần nhau để kết nối.</p>
                        <button onClick={() => {
                            if (!currentUser && !isStudentRegistered) {
                               alert("Vui lòng vào mục '🎮 Ô chữ' để đăng nhập tên trước khi nộp bài Lục giác nhé!"); return;
                            }
                            setShowHexSubmit(true);
                          }} style={{ background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', width: '100%', boxShadow: '0 4px 15px rgba(139,92,246,0.3)' }}>Hoàn thành Kết nối</button>
                      </div>
                    ) : (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: theme.bgPanel, padding: '32px', borderRadius: '24px', border: `1px solid #8b5cf6`, zIndex: 200, width: '90%', maxWidth: '500px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>
                        <h3 style={{ color: '#8b5cf6', margin: '0 0 16px 0', textAlign: 'center', fontSize: '20px' }}>🧠 Ghi chú Lý do Kết nối</h3>
                        <p style={{ color: theme.textSub, fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>Em hãy viết một câu ngắn gọn tóm tắt lý do tại sao em lại xếp các thẻ lục giác thành cụm như trên màn hình:</p>
                        <textarea value={hexReasoning} onChange={(e) => setHexReasoning(e.target.value)} placeholder="Ví dụ: Em nối Vua Chulalongkorn với Hiện đại hóa vì ông đã thực hiện các chính sách..." style={{ width: '100%', height: '100px', padding: '16px', borderRadius: '12px', background: theme.inputBg, border: `1px solid ${theme.border}`, color: theme.textMain, marginBottom: '20px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <button onClick={() => setShowHexSubmit(false)} style={{ flex: '1 1 120px', padding: '12px', background: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '12px', cursor: 'pointer' }}>Quay lại xếp tiếp</button>
                          <button onClick={handleHexSubmit} style={{ flex: '2 1 200px', padding: '12px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(139,92,246,0.4)' }}>Nộp bài & Nhận danh hiệu</button>
                        </div>
                      </div>
                    )}

                     {/* VÙNG VẼ CÁC THẺ LỤC GIÁC */}
                    {hexNodes.map(node => (
                       <div key={node.id} className="hex-card" 
                            style={{ 
                                position: 'absolute', /* Bắt buộc phải có để thẻ kéo thả được */
                                left: `${node.x}px`, 
                                top: `${node.y}px`,
                                width: '120px',
                                height: '104px',
                                backgroundColor: isDarkMode ? '#8b5cf6' : '#6d28d9',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                padding: '10px',
                                boxSizing: 'border-box',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: draggingHex === node.id ? 'grabbing' : 'grab',
                                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', /* Cắt thẻ thành hình lục giác */
                                userSelect: 'none',
                                touchAction: 'none', /* Ngăn màn hình cuộn khi chạm trên điện thoại */
                                zIndex: draggingHex === node.id ? 100 : 1, /* Kéo thẻ nào thẻ đó nổi lên trên cùng */
                                transition: draggingHex === node.id ? 'none' : 'transform 0.2s',
                                transform: draggingHex === node.id ? 'scale(1.05)' : 'scale(1)'
                            }}
                            onPointerDown={(e) => handleHexPointerDown(e, node.id)}
                            onPointerMove={handleHexPointerMove}
                            onPointerUp={handleHexPointerUp}
                            onPointerCancel={handleHexPointerUp}
                       >
                         {node.text}
                       </div>
                    ))}
                  </div>
                )}

               {/* AR QR CODE CHẾ ĐỘ XEM CHUNG */}
                {viewMode === 'ar' ? (
                  <div style={{ textAlign: 'center', background: theme.bgMain, padding: '20px', borderRadius: '24px', border: '1px dashed #d35400', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
                     <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}><button className="back-btn" style={{ margin: 0, background: theme.bgPanel, color: theme.textMain, border: `1px solid ${theme.border}` }} onClick={() => setViewMode('normal')}>← Trở lại</button></div>
                     <h3 style={{ color: theme.textMain, fontFamily: 'Montserrat', margin: '0 0 20px 0', fontSize: '18px' }}>Quét mã để xem Bộ mô hình AR</h3>
                     <div style={{ background: 'white', padding: '16px', borderRadius: '16px', display: 'inline-block' }}>
                        <QRCodeSVG value={`${window.location.origin}/ar.html?d=${encodeURIComponent(JSON.stringify([...(activeMonu.normalPath ? [{ n: 'Mô hình chính', p: activeMonu.normalPath, a: activeMonu.audioUrl || '' }] : []), ...(activeMonu.subModels ? activeMonu.subModels.filter((m: any) => m.path).map((m: any) => ({ n: m.name || 'Mô hình phụ', p: m.path, a: m.audioUrl || '' })) : [])]))}`} size={160} level="M" includeMargin={true} />
                     </div>
                     <p style={{ color: theme.textSub, fontSize: '13px', marginTop: '20px', maxWidth: '300px', lineHeight: '1.6', marginInline: 'auto' }}>Quét mã QR để chiếu AR. Bạn có thể vuốt để <b>chuyển đổi qua lại</b>!</p>
                  </div>
                ) : viewMode === 'tour' && activeMonu.tourUrl ? (
                  <div style={{ width: '100%', height: '100%', padding: '0 24px 24px 24px', boxSizing: 'border-box' }}><iframe title="Virtual Tour" src={activeMonu.tourUrl} width="100%" height="100%" frameBorder="0" allowFullScreen allow="xr-spatial-tracking" style={{ borderRadius: '16px', background: '#111' }} /></div>
                ) : viewMode !== 'game' && viewMode !== 'hex' && viewMode !== 'npc' && viewMode !== 'mask' && viewMode !== 'hand' && currentMainModelPath && isSketchfab(currentMainModelPath) ? (
                  <div style={{ width: '100%', height: '100%', padding: '0 24px 24px 24px', boxSizing: 'border-box' }}><iframe title="Sketchfab Model" src={getSketchfabEmbedUrl(currentMainModelPath)} width="100%" height="100%" frameBorder="0" allowFullScreen allow="autoplay; fullscreen; xr-spatial-tracking" style={{ borderRadius: '16px', background: '#111' }} /></div>
                ) : viewMode !== 'game' && viewMode !== 'hex' && viewMode !== 'npc' && viewMode !== 'mask' && viewMode !== 'hand' ? (
                  <Canvas camera={{ position: [0, 1.5, 6], fov: 50 }} shadows>
                    <ambientLight intensity={1.5} /><directionalLight position={[10, 10, 10]} intensity={1.5} />
                    <Suspense fallback={<Html center={true as any}><div style={{color: theme.textMain, fontWeight:600}}>Đang tải 3D...</div></Html>}>
                      {currentMainModelPath ? <ErrorBoundary><HistoricalModel key={activeMonu.id + viewMode + currentMainModelPath} path={currentMainModelPath} onMeshClick={setSelectedMeshName} /></ErrorBoundary> : <Html center={true as any}><div style={{color: theme.textSub, fontSize:'14px'}}>Chưa có file mô hình.</div></Html>}
                      <Environment preset="city" />
                    </Suspense>
                    <OrbitControls ref={controlsRef} makeDefault enableDamping={true} />
                  </Canvas>
                ) : null}
              </div>

              {viewMode !== 'tour' && viewMode !== 'ar' && viewMode !== 'game' && viewMode !== 'hex' && viewMode !== 'npc' && viewMode !== 'mask' && viewMode !== 'hand' && (
                <div className="cas-gallery-section">
                  <div className="section-label" style={{ display: 'flex', justifyContent: 'space-between' }}>ẢNH TƯ LIỆU {role === 'admin' && <button className="admin-add-btn" onClick={handleAddImage}>+ Thêm ảnh</button>}</div>
                  <div className="gallery-grid">
                    {currentGallery.map((img: any) => (
                      <div key={img.id} className={`gallery-item ${draggedImgId === img.id ? 'dragging' : ''}`} onClick={() => { setSelectedImage(img); setModalTab(img.modelPath ? '3d' : (img.videoUrl ? 'video' : 'image')); }} draggable={role === 'admin'} onDragStart={(e) => { if (role === 'admin') { setDraggedImgId(img.id); e.dataTransfer.effectAllowed = 'move'; } }} onDragOver={(e) => { if (role === 'admin') e.preventDefault(); }} onDrop={(e) => { if (role === 'admin') handleDropImage(e, img.id); }} onDragEnd={() => setDraggedImgId(null)}>
                        <img src={img.url} alt={img.title} draggable={false} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80' }} /><span>{img.title}</span>
                        {img.videoUrl && <div className="badge-video">▶ VIDEO</div>}{img.modelPath && <div className="badge-3d" style={{ left: img.videoUrl ? '70px' : '8px' }}>3D</div>}{role === 'admin' && <button className="delete-img-btn" onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }}>×</button>}
                      </div>
                    ))}
                    {currentGallery.length === 0 && <p style={{ color: '#94a3b8', fontSize: '12px' }}>Chưa có hình ảnh.</p>}
                  </div>
                </div>
              )}
            </section>

           {viewMode !== 'npc' && viewMode !== 'mask' && viewMode !== 'hand' && (
              <aside className="cas-sidebar-right" style={{ display: 'flex', flexDirection: 'column' }}>
                {selectedMeshName && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <button onClick={() => setSelectedMeshName('')} className="back-btn" style={{ margin: 0, flex: 1 }}>← Trở lại</button>
                    {role === 'admin' && activeMonu.meshData && activeMonu.meshData[selectedMeshName] && <button onClick={() => handleDeleteMeshData(selectedMeshName)} className="btn-outline outline-dark" style={{ borderColor: '#ef4444', color: '#ef4444', padding: '0 12px' }}>🗑️ Xóa</button>}
                  </div>
                )}

                {role === 'admin' && selectedMeshName && (!activeMonu.meshData || !activeMonu.meshData[selectedMeshName]) && (
                  <div className="admin-mesh-catcher"><strong>🛠️ Mã bộ phận:</strong><br/><code>{selectedMeshName}</code><p style={{ fontSize: '13px', color: '#713f12', margin: '8px 0' }}>Chưa có tài liệu.</p><button className="admin-add-btn" style={{ width: '100%', padding: '10px' }} onClick={() => handleCreateMeshData(selectedMeshName)}>+ Tạo Bài Giảng</button></div>
                )}

                <div className="detail-panel" style={{ display: 'flex', flexDirection: 'column', flex: expandedSpec ? 1 : 'none' }}>
                  {!expandedSpec && <div className="section-label">{role === 'admin' && selectedMeshName && activeMonu.meshData && activeMonu.meshData[selectedMeshName] ? <input className="admin-spec-input" style={{ width: '100%', marginBottom: '6px', fontSize: '11px' }} value={currentInfo.title} onChange={e => handleUpdateMeshTitle(e.target.value)} /> : currentInfo.title}</div>}
                  <div className="specs-grid" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {currentInfo.specs.map((spec: any) => {
                      if (expandedSpec && expandedSpec !== spec.id) return null;
                      const isExpanded = expandedSpec === spec.id;
                      return (
                        <div key={spec.id} className={`spec-card ${isExpanded ? 'expanded' : ''}`} style={{ display: 'flex', flexDirection: 'column', flex: isExpanded ? 1 : 'none', position: 'relative' }}>
                          {role === 'admin' && <button className="delete-spec-btn" onClick={(e) => { e.stopPropagation(); handleDeleteSpecCard(spec.id); }}>×</button>}
                          <div className="spec-card-header" onClick={() => setExpandedSpec(isExpanded ? null : spec.id)}>
                            <div className="spec-icon-box" style={{ cursor: role === 'admin' ? 'pointer' : 'default', position: 'relative' }} onClick={(e) => { if (role === 'admin') { e.stopPropagation(); setOpenIconPickerId(openIconPickerId === spec.id ? null : spec.id); } }}>
                              {spec.icon}
                              {role === 'admin' && openIconPickerId === spec.id && (
                                <div className="icon-picker-menu" onClick={e => e.stopPropagation()}>
                                  {PREDEFINED_ICONS.map((icon) => <div key={icon} className="icon-option" onClick={(e) => { e.stopPropagation(); handleUpdateSpec(spec.id, 'icon', icon); setOpenIconPickerId(null); }}>{icon}</div>)}
                                </div>
                              )}
                            </div>
                            <div className="spec-header-text">
                              {role === 'admin' && !isExpanded ? (
                                <><input className="admin-spec-input" style={{ fontSize: '11px', marginBottom: '2px', width: '80%' }} value={spec.title} onClick={e => e.stopPropagation()} onChange={e => handleUpdateSpec(spec.id, 'title', e.target.value)} /><input className="admin-spec-input" style={{ width: '80%' }} value={spec.summary} onClick={e => e.stopPropagation()} onChange={e => handleUpdateSpec(spec.id, 'summary', e.target.value)} /></>
                              ) : (<><span className="spec-title">{spec.title}</span><span className="spec-summary">{spec.summary}</span></>)}
                            </div>
                            <div className="expand-icon">{isExpanded ? '✕' : '+'}</div>
                          </div>
                          {isExpanded && <div className="spec-full-text">{spec.fullText.map((paragraph: string, index: number) => role === 'admin' ? <textarea key={index} className="admin-spec-textarea" value={paragraph} onChange={e => handleUpdateSpec(spec.id, 'fullText', e.target.value, index)} /> : <p key={index} className="spec-paragraph">{paragraph}</p>)}</div>}
                        </div>
                      );
                    })}
                    {role === 'admin' && !expandedSpec && <button className="admin-add-btn" style={{ marginTop: '5px', padding: '10px' }} onClick={handleAddSpecCard}>+ Thêm Thẻ</button>}
                  </div>
                </div>

                {!expandedSpec && (
                  <div className="notes-panel" style={{ marginTop: '24px' }}>
                    <div className="section-label">GHI CHÚ MỞ RỘNG</div>
                    {role === 'admin' && (selectedMeshName === '' || (activeMonu.meshData && activeMonu.meshData[selectedMeshName])) ? <textarea className="admin-textarea" value={currentInfo.historyNotes} onChange={(e) => handleUpdateNotes(e.target.value)} /> : <p className="spec-paragraph">{currentInfo.historyNotes}</p>}
                  </div>
                )}
              </aside>
            )}
          </main>
          

          {/* ... (Các Modal Preview Ảnh & Hộ chiếu giữ nguyên bên dưới) ... */}
          {selectedImage && (
            <div className={`parallax-modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={handleCloseModal}>
              <button className="close-parallax-btn" onClick={(e) => { e.stopPropagation(); handleCloseModal(); }}>✕</button>
              <div className="parallax-layout-wrapper" onClick={e => e.stopPropagation()}>
                
                <div className="modal-sidebar">
                  {role === 'admin' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <h3>Chỉnh sửa Tư liệu</h3>
                      <input className="admin-spec-input" style={{ marginBottom: '8px' }} value={selectedImage.title} onChange={e => handleUpdateGalleryItem(selectedImage.id, 'title', e.target.value)} />
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}><input className="admin-spec-input" value={selectedImage.url} onChange={e => handleUpdateGalleryItem(selectedImage.id, 'url', e.target.value)} style={{ flex: 1 }} /><label className="btn-upload">☁ ẢNH<input type="file" accept="image/*" style={{display: 'none'}} onChange={e => e.target.files?.[0] && handleFileUpload(selectedImage.id, 'url', e.target.files[0], true)}/></label></div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}><input className="admin-spec-input" value={selectedImage.modelPath || ''} onChange={e => handleUpdateGalleryItem(selectedImage.id, 'modelPath', e.target.value)} style={{ flex: 1 }} /><label className="btn-upload">☁ 3D<input type="file" accept=".glb" style={{display: 'none'}} onChange={e => e.target.files?.[0] && handleFileUpload(selectedImage.id, 'modelPath', e.target.files[0], true)}/></label></div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}><input className="admin-spec-input" value={selectedImage.videoUrl || ''} onChange={e => handleUpdateGalleryItem(selectedImage.id, 'videoUrl', e.target.value)} style={{ flex: 1 }} /><label className="btn-upload">☁ VIDEO<input type="file" accept="video/*" style={{display: 'none'}} onChange={e => e.target.files?.[0] && handleFileUpload(selectedImage.id, 'videoUrl', e.target.files[0], true)}/></label></div>
                      <h3 style={{ marginTop: '0px' }}>Ghi chú tư liệu</h3><textarea className="admin-textarea" style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px dashed #cbd5e1' }} value={selectedImage.description || ''} onChange={(e) => handleUpdateGalleryItem(selectedImage.id, 'description', e.target.value)} />
                    </div>
                  ) : (<><h3>Ghi chú</h3><p className="modal-desc">{selectedImage.description || 'Chưa có ghi chú.'}</p></>)}
                </div>

                <div className="modal-center-col">
                  {currentGallery.length > 1 && (
                    <>
                      <button className="gallery-nav-btn prev" onClick={(e) => { e.stopPropagation(); const idx = currentGallery.findIndex((img: any) => img.id === selectedImage.id); if (idx > 0) { setSelectedImage(currentGallery[idx - 1]); setModalTab(currentGallery[idx - 1].modelPath ? '3d' : (currentGallery[idx - 1].videoUrl ? 'video' : 'image')); } }} disabled={currentGallery.findIndex((img: any) => img.id === selectedImage.id) === 0}>&#10094;</button>
                      <button className="gallery-nav-btn next" onClick={(e) => { e.stopPropagation(); const idx = currentGallery.findIndex((img: any) => img.id === selectedImage.id); if (idx < currentGallery.length - 1) { setSelectedImage(currentGallery[idx + 1]); setModalTab(currentGallery[idx + 1].modelPath ? '3d' : (currentGallery[idx + 1].videoUrl ? 'video' : 'image')); } }} disabled={currentGallery.findIndex((img: any) => img.id === selectedImage.id) === currentGallery.length - 1}>&#10095;</button>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', zIndex: 100 }}>
                    <div className="modal-view-tabs">
                      <button className={`modal-tab-btn ${modalTab === 'image' ? 'active' : ''}`} onClick={() => setModalTab('image')}>📷 Hình ảnh</button>
                      {selectedImage.modelPath && <button className={`modal-tab-btn ${modalTab === '3d' ? 'active' : ''}`} onClick={() => setModalTab('3d')}>🧊 3D</button>}
                      {selectedImage.videoUrl && <button className={`modal-tab-btn ${modalTab === 'video' ? 'active' : ''}`} onClick={() => setModalTab('video')}>▶ Video</button>}
                    </div>
                  </div>
                  <div className="parallax-modal-container" style={{ flex: 1 }}>
                    {modalTab === 'video' && selectedImage.videoUrl ? (
                      <div className="gallery-media-viewer">{isYouTube(selectedImage.videoUrl) ? <iframe width="100%" height="100%" src={getYouTubeEmbedUrl(selectedImage.videoUrl)} frameBorder="0" allowFullScreen></iframe> : <video width="100%" height="100%" controls><source src={selectedImage.videoUrl} /></video>}</div>
                    ) : modalTab === '3d' && selectedImage.modelPath ? (
                      <div className="gallery-media-viewer" style={{ background: 'radial-gradient(circle, #1e293b 0%, #0f172a 100%)' }}>
                         {isSketchfab(selectedImage.modelPath) ? <iframe src={getSketchfabEmbedUrl(selectedImage.modelPath)} width="100%" height="100%" frameBorder="0" allowFullScreen style={{ borderRadius: '24px' }}></iframe> : (
                            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}><ambientLight intensity={1.5} /><directionalLight position={[10, 10, 10]} intensity={1.5} /><Suspense fallback={<Html center><div style={{color:'white'}}>Đang tải 3D...</div></Html>}><ErrorBoundary><HistoricalModel path={selectedImage.modelPath} onMeshClick={() => {}} /></ErrorBoundary><Environment preset="city" /></Suspense><OrbitControls makeDefault enableDamping={true} /></Canvas>
                         )}
                         <div style={{ position: 'absolute', bottom: '24px', left: '0', width: '100%', textAlign: 'center', pointerEvents: 'none' }}><h2 style={{ fontFamily: 'Montserrat', fontSize: '28px', color: 'white', margin: '0 0 4px 0', textShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>{selectedImage.title}</h2></div>
                      </div>
                    ) : (
                      <div className="parallax-animation-wrapper">
                        <button className="btn-zoom" onClick={(e) => { e.stopPropagation(); setIsZoomed(true); }}>🔍 Phóng to</button>
                        <div className="parallax-wrapper" onMouseMove={(e) => { const el = e.currentTarget as HTMLDivElement; const rect = el.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; const rotateX = ((y - rect.height/2) / (rect.height/2)) * -10; const rotateY = ((x - rect.width/2) / (rect.width/2)) * 10; el.style.transition = 'none'; el.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`; }} onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.transition = 'transform 0.5s'; el.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg)`; }}>
                          <div className="parallax-layer parallax-layer-bg"></div><img src={selectedImage.url} alt={selectedImage.title} className="parallax-layer parallax-layer-img" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80' }} /><div className="parallax-layer parallax-layer-gradient"></div>
                          <div className="parallax-layer-text"><h2>{selectedImage.title}</h2></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-sidebar">
                  <h3>Bối cảnh lịch sử</h3>
                  {role === 'admin' ? <textarea className="admin-textarea" style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px dashed #cbd5e1' }} value={selectedImage.contextDescription || ''} onChange={(e) => handleUpdateGalleryItem(selectedImage.id, 'contextDescription', e.target.value)} /> : <p className="modal-desc">{selectedImage.contextDescription || 'Chưa có thông tin.'}</p>}
                </div>
              </div>
            </div>
          )}

          {isZoomed && selectedImage && (
            <div className="lightbox-overlay" onClick={() => setIsZoomed(false)}>
              <button className="close-lightbox-btn" onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}>✕</button>
              <img src={selectedImage.url} alt="Zoomed" className="lightbox-img" onClick={(e) => e.stopPropagation()} />
            </div>
          )}

          {showRewardModal && (() => {
            const correctCount = rowStates.filter(s => s.solved).length;
            let badge = "Chưa nhận danh hiệu";
            if (rewardType === 'hex') {
                badge = "Chiến Lược Gia 🧠";
            } else if (rewardType === 'npc') {
                badge = "Nhà Ngoại Giao 💬";
            } else {
                if (correctCount === 1) badge = "Nhà Khảo Cổ Tập Sự 🧭"; 
                else if (correctCount >= 2 && correctCount < activeMonu.gameData.length) badge = "Chuyên Gia Cổ Vật 📜"; 
                else if (correctCount > 0) badge = "Huyền Thoại Di Sản 👑";
            }
            
            const isSuccess = rewardType === 'hex' || rewardType === 'npc' ? true : correctCount > 0;

            return (
              <div className="lightbox-overlay" style={{ zIndex: 999999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.96)', padding: '24px', boxSizing: 'border-box' }}>
                <h1 style={{ color: '#fcd34d', fontSize: '26px', margin: '0 0 8px 0', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '2px' }}>THU THẬP THÀNH CÔNG!</h1>
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 32px 0', textAlign: 'center' }}>
                    {rewardType === 'hex' ? 'Em đã giải mã thành công mạng lưới tư duy và nhận được một thẻ bài.' : rewardType === 'npc' ? 'Em đã vượt qua thử thách ngoại giao và nhận được một thẻ bài.' : `Bạn đã giải quyết ${correctCount} / ${activeMonu.gameData.length} ô chữ và nhận được một thẻ bài.`}
                </p>
                
                {isSuccess ? (
                  <div style={{ transform: 'scale(1.2)', marginBottom: '40px' }}>
                    <TradingCard lesson={activeMonu} date={new Date()} badge={badge} />
                  </div>
                ) : (
                  <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '18px', marginBottom: '40px' }}>❌ Bạn chưa trả lời đúng câu nào. Hãy thử lại để nhận Thẻ bài nhé!</div>
                )}
                
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button onClick={() => { setShowRewardModal(false); setViewMode('normal'); }} style={{ padding: '12px 28px', borderRadius: '30px', border: 'none', background: '#fff', color: '#0f172a', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Trở về bài học</button>
                  {isSuccess && currentUser && (
                    <button onClick={() => { setShowRewardModal(false); setViewMode('normal'); handleNavigateToPage('lesson-choice'); setTimeout(() => { fetchMyPassport(); setShowPassportModal(true); }, 800); }} style={{ padding: '12px 28px', borderRadius: '30px', border: '2px solid #fbbf24', background: 'transparent', color: '#fcd34d', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Xem Bộ Sưu Tập</button>
                  )}
                </div>
              </div>
            );
          })()}

        </div>
      )}

      {showPassportModal && (
        <div className="lightbox-overlay" style={{ zIndex: 999999, background: 'rgba(15, 23, 42, 0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowPassportModal(false)}>
           
           <div className="passport-book passport-anim" style={{ width: '95%', maxWidth: '1000px', height: '85vh', maxHeight: '700px', background: '#0f172a', borderRadius: '24px', display: 'flex', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)', position: 'relative', border: '1px solid #334155' }} onClick={e => e.stopPropagation()}>
               <div className="passport-left" style={{ flex: 1, borderRight: '1px solid #334155', padding: '40px', background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' }}>
                  <h2 style={{ color: '#f8fafc', textAlign: 'center', fontFamily: 'Montserrat, sans-serif', borderBottom: '1px solid #334155', paddingBottom: '16px', marginTop: 0, letterSpacing: '1px' }}>HỒ SƠ KHẢO CỔ<br/><span style={{fontSize: '12px', fontWeight: 'normal', color: '#94a3b8', letterSpacing: '4px'}}>HERITAGE ALBUM</span></h2>
                  
                  <div style={{ display: 'flex', gap: '20px', marginTop: '40px', alignItems: 'center' }}>
                     <div style={{ width: '100px', height: '100px', background: '#334155', borderRadius: '50%', border: '2px solid #6366f1', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '40px', boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' }}>{currentUser?.user_metadata?.avatar || '👤'}</div>
                     <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Nhà thám hiểm</p>
                        <h3 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '20px' }}>{currentUser?.user_metadata?.full_name || 'Khách'}</h3>
                        
                        <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Lớp học</p>
                        <h3 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '16px' }}>{currentUser?.user_metadata?.class_name || '---'}</h3>
                        
                        <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Bộ sưu tập</p>
                        <h3 style={{ margin: '0', color: '#fcd34d', fontSize: '24px' }}>{myPassport.length} Thẻ bài</h3>
                     </div>
                  </div>
                  <div style={{ marginTop: '50px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '16px' }}>
                     <div style={{ background: 'white', display: 'inline-block', padding: '8px', borderRadius: '8px' }}>
                       <QRCodeSVG value={`Bộ sưu tập của: ${currentUser?.email || 'Khách'} - Đạt ${myPassport.length} thẻ bài.`} size={80} level="M" />
                     </div>
                     <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '12px' }}>Đồng bộ Blockchain Ảo (Cloud)</p>
                  </div>
               </div>
               
               <div className="passport-right" style={{ flex: 2, padding: '40px', background: '#020617', overflowY: 'auto', position: 'relative' }}>
                  <h3 style={{ color: '#f8fafc', margin: '0 0 24px 0', textAlign: 'center', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '18px' }}>BỘ SƯU TẬP THẺ BÀI DI SẢN</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px', justifyContent: 'center' }}>
                     {myPassport.length === 0 && <p style={{ color: '#64748b', gridColumn: '1/-1', textAlign: 'center', marginTop: '50px', fontSize: '14px', lineHeight: '1.6' }}>Sách sưu tầm đang trống.<br/>Hãy vào các bài học và giải mã Ô chữ để thu thập các Thẻ bài lấp lánh nhé!</p>}
                     
                     {myPassport.map((p, i) => {
                         const lesson = monumentsData.find(m => m.name === p.lesson_name) || { name: p.lesson_name, icon: '🏛️', coverImage: '' };
                         return (
                           <div key={i} onClick={() => {
                                 if (lesson.normalPath && !isSketchfab(lesson.normalPath)) {
                                     setActiveBadgeModel(lesson.normalPath);
                                 } else {
                                     alert("Mô hình 3D của thẻ bài này đang được bảo trì hoặc nằm ở máy chủ khác!");
                                 }
                             }}>
                              <TradingCard lesson={lesson} date={p.created_at || p.date} badge={p.badge} />
                           </div>
                         );
                     })}
                  </div>
               </div>

               {activeBadgeModel && (
                 <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2, 6, 23, 0.95)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.3s' }} onClick={(e) => { e.stopPropagation(); setActiveBadgeModel(null); }}>
                    <button onClick={() => setActiveBadgeModel(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', width: '40px', height: '40px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', zIndex: 101, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>✕</button>
                    <h3 style={{ color: '#60a5fa', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 0 15px rgba(96,165,250,0.5)' }}>✨ Kỷ vật 3D Thực tế ✨</h3>
                    <div style={{ width: '90%', height: '70%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', borderRadius: '24px' }}>
                       <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                          <ambientLight intensity={2} />
                          <directionalLight position={[10, 10, 10]} intensity={2} />
                          <Suspense fallback={<Html center><div style={{color:'#60a5fa', fontWeight:'bold'}}>Đang triệu hồi...</div></Html>}>
                             <HistoricalModel path={activeBadgeModel} onMeshClick={() => {}} />
                             <Environment preset="city" />
                          </Suspense>
                          <OrbitControls autoRotate autoRotateSpeed={4} enableZoom={true} makeDefault />
                       </Canvas>
                    </div>
                    <p style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '24px', background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: '30px' }}>👆 Dùng chuột để xoay ngắm kỷ vật</p>
                 </div>
               )}
               
               <button onClick={() => setShowPassportModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: '0.2s', zIndex: 90 }}>✕</button>
           </div>
        </div>
      )}

    </>
  );
}