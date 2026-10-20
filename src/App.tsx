import { Suspense, useState, useRef, useEffect, useMemo, useCallback, Component } from 'react';
import type { ReactNode, FormEvent, DragEvent } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Html, Center } from '@react-three/drei';
import { createClient } from '@supabase/supabase-js'; 
import { QRCodeSVG } from 'qrcode.react'; 
import './App.css';
import { initialMonumentsData } from './data';

// ==========================================
// CẤU HÌNH SUPABASE CLOUD (Bảo mật qua Environment Variables)
// ==========================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

function HistoricalModel({ path, onMeshClick, customScale = 1 }: { path: string, onMeshClick: (name: string) => void, customScale?: number }) {
  const { scene } = useGLTF(path);

  // Chuẩn hóa kích thước hình học mô hình 1 lần duy nhất theo dữ liệu scene gốc
  // Tỷ lệ chuẩn 2.8 units kết hợp cùng component <Center> căn giữa tâm hình học hoàn hảo
  const baseScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    return maxDim > 0 ? 2.8 / maxDim : 1;
  }, [scene]);

  return (
    <group scale={customScale}>
      <Center scale={baseScale}>
        <primitive 
          object={scene} 
          dispose={null} 
          onClick={(e: any) => { 
            e.stopPropagation(); 
            if (e.object.type === 'Mesh') onMeshClick(e.object.name); 
          }} 
          onPointerMissed={() => onMeshClick('')} 
        />
      </Center>
    </group>
  );
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

const HERO_ARTIFACTS = [
  {
    id: "pyramid",
    name: "Kim Tự Tháp Giza",
    period: "Ai Cập Cổ Đại • Khoảng 2560 TCN",
    image: "https://cas.stthomas.edu/_media-library/_images/history/1920x1080/stthomas-history-time.jpg",
    tag: "Chủ đề 3 • Kỳ quan Cổ đại",
    badge: "Mặt cắt & VR Tour",
    icon: "🏛️"
  },
  {
    id: "dongson",
    name: "Trống Đồng Đông Sơn",
    period: "Thời kỳ Văn Lang - Âu Lạc • Đồ đồng Việt Nam",
    image: "https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=1200&q=80",
    tag: "Lịch sử Việt Nam • Bảo vật Quốc gia",
    badge: "Hoa văn 3D Tinh xảo",
    icon: "🥁"
  },
  {
    id: "egypt-coffin",
    name: "Quan tài Hoàng gia",
    period: "Cựu Vương quốc • Quan tài Pa-di-mut",
    image: "https://images.unsplash.com/photo-1604620864316-24e5289fcdac?auto=format&fit=crop&w=1200&q=80",
    tag: "Chủ đề 3 • Điêu khắc & Tín ngưỡng",
    badge: "Phục dựng Nguyên bản",
    icon: "👑"
  }
];

export default function App() {
  const [page, setPage] = useState<'landing' | 'student-auth' | 'split-choice' | 'lesson-choice' | 'app' | 'admin-dashboard'>('landing');
 const [role, setRole] = useState<'guest' | 'student' | 'teacher' | 'admin'>('guest');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  useEffect(() => { document.body.className = isDarkMode ? 'dark-mode' : 'light-mode'; }, [isDarkMode]);

  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [landingArtifactIndex, setLandingArtifactIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // 🔍 THU PHÓNG & THIẾT BỊ NGOẠI VI (SCALE & TOUCH MULTIPLIER)
  const [modelScaleMultiplier, setModelScaleMultiplier] = useState(1);
  const [showRlsHelpModal, setShowRlsHelpModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ checked: boolean; online: boolean; rlsBlocked: boolean; lessonCount: number; errorMsg: string | null }>({
    checked: false,
    online: false,
    rlsBlocked: false,
    lessonCount: 0,
    errorMsg: null
  });

  // Kiểm tra kết nối Supabase Cloud thực tế
  const checkDatabaseConnection = useCallback(async () => {
    try {
      const { data, error, count } = await supabase.from('heritage_lessons').select('id', { count: 'exact' });
      if (error) {
        const isRls = error.code === '42501' || error.message?.toLowerCase().includes('policy');
        setDbStatus({ checked: true, online: !isRls, rlsBlocked: isRls, lessonCount: 0, errorMsg: error.message });
      } else {
        setDbStatus({ checked: true, online: true, rlsBlocked: false, lessonCount: count || (data ? data.length : 0), errorMsg: null });
      }
    } catch (err: any) {
      setDbStatus({ checked: true, online: false, rlsBlocked: false, lessonCount: 0, errorMsg: err?.message || 'Lỗi kết nối' });
    }
  }, []);

  useEffect(() => {
    checkDatabaseConnection();
  }, [checkDatabaseConnection]);

  // 🔮 HOLOGRAM & TURNTABLE EXHIBITION STATE
  const [isHologramMode, setIsHologramMode] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [hologramSpeed, setHologramSpeed] = useState(1.5);
  const [hologramBg, setHologramBg] = useState<'pure-black' | 'grid' | 'studio'>('pure-black');
  const [isHologramUIVisible, setIsHologramUIVisible] = useState(true);
  const hologramTimerRef = useRef<any>(null);

  const resetHologramIdleTimer = useCallback(() => {
    setIsHologramUIVisible(true);
    if (hologramTimerRef.current) clearTimeout(hologramTimerRef.current);
    hologramTimerRef.current = setTimeout(() => {
      setIsHologramUIVisible(false);
    }, 3000);
  }, []);

  const handleEnterHologram = () => {
    setIsHologramMode(true);
    setIsAutoRotating(true);
    resetHologramIdleTimer();
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  const handleExitHologram = () => {
    setIsHologramMode(false);
    setModelScaleMultiplier(1);
    if (hologramTimerRef.current) clearTimeout(hologramTimerRef.current);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (!isHologramMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      resetHologramIdleTimer();
      if (e.key === 'Escape') {
        handleExitHologram();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsAutoRotating(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHologramMode, resetHologramIdleTimer]);

  // Lắng nghe sự kiện thoát Fullscreen của trình duyệt để tự động đóng chế độ Hologram
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && isHologramMode) {
        setIsHologramMode(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, [isHologramMode]);


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
  const holoControlsRef = useRef<any>(null);

// 1. Hàm tra cứu Role từ bảng user_roles theo Email (đặt độc lập ở ngoài)
  const determineUserRole = async (email: string | undefined) => {
    if (!email) { 
      setRole('guest'); 
      return; 
    }
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('email', email)
        .maybeSingle();

      if (data && !error && data.role) {
        setRole(data.role as 'student' | 'teacher' | 'admin');
      } else {
        setRole('student'); // Mặc định tài khoản mới là học sinh
      }
    } catch {
      setRole('student');
    }
  };

  // 2. useEffect duy nhất tải bài học Cloud VÀ kiểm tra phiên đăng nhập + Role
  useEffect(() => {
    // Tải bài học từ Supabase
    const fetchCloudData = async () => {
      try {
        const { data, error } = await supabase.from('heritage_lessons').select('content');
        if (error) {
          console.warn("⚠️ Lỗi tải dữ liệu Cloud Supabase:", error.message || error);
          return;
        } 
        if (data && data.length > 0) {
           const parsedData = data.map((row: any) => ({
              ...row.content, 
              region: row.content.region || ((row.content.category === 'Chủ đề 3' || row.content.category?.toLowerCase().includes('thế giới')) ? 'world' : 'vietnam')
           }));
           setMonumentsData(parsedData);
           localStorage.setItem('heritageData', JSON.stringify(parsedData));
           setDbStatus(prev => ({ ...prev, online: true, rlsBlocked: false, lessonCount: parsedData.length }));
        } else {
           // Nếu Supabase chưa có bản ghi: Tự động đồng bộ toàn bộ bài học gốc lên Cloud
           try {
             const seedPayload = initialMonumentsData.map((m: any) => ({ id: m.id, content: m }));
             const { error: seedError } = await supabase.from('heritage_lessons').upsert(seedPayload);
             if (!seedError) {
               console.log("✅ Đã tự động khởi tạo bài học gốc lên Supabase Cloud:", seedPayload.length, "bài.");
               setDbStatus(prev => ({ ...prev, online: true, rlsBlocked: false, lessonCount: seedPayload.length }));
             }
           } catch {
             // Supabase RLS hoặc kết nối tạm thời
           }
        }
      } catch (err) {
        console.warn("Lỗi kết nối máy chủ Supabase:", err);
      }
    };
    fetchCloudData();

    // Kiểm tra đăng nhập ban đầu
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) { 
        setCurrentUser(session.user); 
        await determineUserRole(session.user.email); 
      }
    });

    // Lắng nghe thay đổi đăng nhập / đăng xuất
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) { 
        setCurrentUser(session.user); 
        await determineUserRole(session.user.email); 
      } else { 
        setCurrentUser(null); 
        setRole('guest'); 
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => { if (currentUser) fetchMyPassport(); }, [currentUser]);
  useEffect(() => { localStorage.setItem('heritageData', JSON.stringify(monumentsData)); }, [monumentsData]);

  useEffect(() => { 
    if (viewMode !== 'tour' && viewMode !== 'ar' && viewMode !== 'mask') {
      controlsRef.current?.reset(); 
    }
    setSelectedMeshName(''); 
    setExpandedSpec(null); 
    setActiveSubModelPath('');
    setSelectedRowIndex(null); 
    setGameInput(''); 
    setGameFeedback('idle'); 
    setWrongCount(0); 
    setShowExplanation(false); 
    setShowRewardModal(false); 
    setShowHexSubmit(false); 
    setHexReasoning('');
    setRowStates(activeMonu.gameData ? activeMonu.gameData.map(() => ({ solved: false, skipped: false, guess: '' })) : []);
    setNpcStep(0); 
    setNpcFeedback(null);
    setActiveMaskIndex(null); 
    
    if ((viewMode as string) === 'hex' && activeMonu.hexGameData) {
        const nodes = activeMonu.hexGameData.map((item: any, i: number) => {
            const textVal = typeof item === 'string' ? item : (item.text || 'Thẻ bài');
            return {
                id: `hex-${i}`, 
                text: textVal, 
                x: 50 + (i % 3) * 160, 
                y: 80 + Math.floor(i / 3) * 90
            };
        });
        setHexNodes(nodes);
    }
  }, [activeMonuId, viewMode]);

  const handleStudentAuth = async (e: FormEvent) => {
  e.preventDefault(); 
  setIsLoading(true);
  if (authMode === 'register') {
    const { error } = await supabase.auth.signUp({ 
      email: authEmail, 
      password: authPassword, 
      options: { data: { full_name: regName, class_name: regClass, avatar: regAvatar } } 
    });
    if (error) {
      alert("Lỗi: " + error.message); 
    } else { 
      alert("✅ Đăng ký thành công! Hãy bấm Đăng nhập để vào hệ thống."); 
      setAuthMode('login'); 
    }
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: authEmail, 
      password: authPassword 
    });
    if (error) {
      alert("Đăng nhập thất bại. Vui lòng kiểm tra lại Email hoặc Mật khẩu."); 
    } else if (data?.user) {
      // Đọc quyền ngay sau khi đăng nhập
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('email', data.user.email)
        .maybeSingle();

      const userRole = roleData?.role || 'student';
      setRole(userRole as any);

      if (userRole === 'admin' || userRole === 'teacher') {
        setPage('admin-dashboard'); // Giáo viên/Admin vào thẳng CMS
      } else {
        setPage('split-choice');     // Học sinh vào chọn bài học
      }
    }
  }
  setIsLoading(false);
};

  const handleLogout = async () => {
    try {
      // 1. Lập tức đưa state về khách để giao diện phản hồi ngay
      setCurrentUser(null);
      setRole('guest');
      setMyPassport([]);
      setPage('landing');

      // 2. Gọi signOut có giới hạn thời gian (tối đa 1 giây), không để treo giao diện
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
    } catch (err) {
      console.error("Lỗi đăng xuất:", err);
    } finally {
      // 3. Quét sạch tất cả key phiên đăng nhập của Supabase trong localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('auth-token')) {
          localStorage.removeItem(key);
        }
      });

      // 4. Tải lại trang để làm sạch hoàn toàn bộ nhớ phiên
      window.location.reload();
    }
  };

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
  const currentGallery = activeMonu?.gallery?.filter((img: any) => img.type === ((viewMode as string) === 'ar' || (viewMode as string) === 'game' || (viewMode as string) === 'hex' || (viewMode as string) === 'npc' || (viewMode as string) === 'mask' ? 'normal' : viewMode) || viewMode === 'tour') || [];
  const currentMainModelPath = activeSubModelPath || activeMonu[viewMode === 'section' ? 'sectionPath' : 'normalPath'];
  
  const displayedMonuments = role === 'admin' ? monumentsData : monumentsData.filter((m: any) => m.region === activeRegion);
  const groupedLessons = displayedMonuments.reduce((acc: any, lesson: any) => { const cat = lesson.category || 'Khác'; if (!acc[cat]) acc[cat] = []; acc[cat].push(lesson); return acc; }, {});

  const handleNavigateToPage = (targetPage: 'landing' | 'student-auth' | 'split-choice' | 'lesson-choice' | 'admin-dashboard') => { setIsLoading(true); setTimeout(() => { setPage(targetPage); if(targetPage === 'landing') { if(!currentUser) setRole('guest'); } setIsLoading(false); }, 600); };
  const handleRegionSelect = (region: 'world' | 'vietnam', title: string, panel: 'left' | 'right') => { setTransitioningPanel(panel); setTimeout(() => setIsLoading(true), 400); setTimeout(() => { setActiveRegion(region); setThemeTitle(title); setPage('lesson-choice'); setTransitioningPanel(null); }, 800); setTimeout(() => setIsLoading(false), 1600); };
  const navigateToApp = (id: string, asRole: 'guest' | 'student' | 'admin' = 'guest') => { setIsLoading(true); setTimeout(() => { setActiveMonuId(id); setRole(asRole); setPage('app'); setViewMode('normal'); setIsLoading(false); }, 600); };
  const handleLogin = (e: FormEvent) => { e.preventDefault(); if (password === 'admin123') { setRole('admin'); setShowLogin(false); handleNavigateToPage('admin-dashboard'); setPassword(''); } else { alert('Sai mật khẩu!'); } };

  const handleResetToInitialData = () => {
    if (window.confirm("Bạn có muốn nạp lại toàn bộ bài học di sản gốc của dự án (Kim Tự Tháp, Taj Mahal, Colosseum, Machu Picchu, Cố đô Huế, Mỹ Sơn, Văn Lang, Hạ Long)?")) {
      setMonumentsData(initialMonumentsData);
      localStorage.setItem('heritageData', JSON.stringify(initialMonumentsData));
      alert("✅ Đã nạp lại bài học gốc thành công! Hãy nhấn '☁️ Lưu lên Đám mây' để đồng bộ ngay lên Supabase.");
    }
  };

  const handleSaveToCloud = async () => { 
     setIsLoading(true); 
     // Luôn lưu dự phòng vào Local Storage để không bao giờ mất dữ liệu tại chỗ
     localStorage.setItem('heritageData', JSON.stringify(monumentsData));
     try { 
       const payload = monumentsData.map((m: any) => ({ id: m.id, content: m }));
       const { error } = await supabase.from('heritage_lessons').upsert(payload); 
       if (error) {
         if (error.code === '42501' || error.message?.toLowerCase().includes('policy')) {
           setDbStatus(prev => ({ ...prev, rlsBlocked: true }));
           setShowRlsHelpModal(true);
         } else {
           alert(`❌ Lỗi lưu Cloud: ${error.message}`);
         }
         throw error;
       } 
       setDbStatus(prev => ({ ...prev, online: true, rlsBlocked: false, lessonCount: payload.length }));
       alert(`✅ ĐÃ ĐỒNG BỘ THÀNH CÔNG ${payload.length} BÀI HỌC LÊN SUPABASE CLOUD!`); 
     } catch (e: any) { 
       console.error("Lỗi đồng bộ Cloud:", e); 
     } finally {
       setIsLoading(false); 
     }
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
  
  const handleAddImage = () => { updateMonuData((m: any) => ({ ...m, gallery: [...(m.gallery || []), { id: `gal-${Date.now()}`, url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80', title: 'Tư liệu mới', type: (viewMode as string) === 'ar' || (viewMode as string) === 'game' || (viewMode as string) === 'hex' || (viewMode as string) === 'npc' || (viewMode as string) === 'mask' ? 'normal' : viewMode, description: '', contextDescription: '', modelPath: '', videoUrl: '' }] })); };
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
{/* LANDING PAGE - MINIMALIST, SLEEK, ELEGANT, SIMPLE & MODERN */}
      {page === 'landing' && (
        <div className={`landing-wrapper min-h-screen w-full flex flex-col relative font-sans overflow-x-hidden transition-colors duration-300 ${
          isDarkMode 
            ? 'bg-zinc-950 text-zinc-100 selection:bg-white/20 selection:text-white' 
            : 'bg-[#fafafa] text-zinc-900 selection:bg-zinc-900/10 selection:text-zinc-950'
        }`}>
          {/* Subtle Ambient Background Light (Minimalist - Single quiet silver glow) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] pointer-events-none overflow-hidden z-0" aria-hidden="true">
            <div className={`absolute top-[-30%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-3xl ${
              isDarkMode 
                ? 'bg-gradient-to-b from-white/[0.04] via-white/[0.015] to-transparent' 
                : 'bg-gradient-to-b from-zinc-300/[0.25] via-zinc-200/[0.1] to-transparent'
            }`}></div>
          </div>

          {/* Minimalist Floating Navigation Header */}
          <header className={`sticky top-0 z-50 w-full backdrop-blur-xl border-b transition-colors duration-300 ${
            isDarkMode ? 'bg-zinc-950/75 border-white/5' : 'bg-white/80 border-zinc-200/80'
          }`}>
            <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
              {/* Brand Logo */}
              <div 
                className="flex items-center gap-3 cursor-pointer select-none group"
                onClick={() => handleNavigateToPage('landing')}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-white/5 border border-white/10 text-zinc-200 group-hover:border-white/25 group-hover:bg-white/10' 
                    : 'bg-zinc-100 border border-zinc-200 text-zinc-800 group-hover:border-zinc-300 group-hover:bg-zinc-200/50'
                }`}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2L2 7h20L12 2z"/>
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className={`font-semibold text-[15px] tracking-tight transition-colors ${
                    isDarkMode ? 'text-white group-hover:text-zinc-200' : 'text-zinc-900 group-hover:text-zinc-700'
                  }`}>Heritage Studio</span>
                  <span className={`text-[10px] font-medium tracking-wider uppercase ${
                    isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                  }`}>Lịch sử 10 • 3D Edu</span>
                </div>
              </div>

              {/* Desktop Nav Actions */}
              <div className="hidden md:flex items-center gap-3">
                <button 
                  type="button" 
                  className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    isDarkMode 
                      ? 'text-zinc-300 hover:text-white border-white/10 hover:border-white/20 hover:bg-white/5' 
                      : 'text-zinc-700 hover:text-zinc-950 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'
                  }`}
                  onClick={() => handleNavigateToPage('split-choice')}
                  title="Khám phá ngay bài học 3D không cần tài khoản"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <span>Khám phá thử</span>
                </button>

                {!currentUser ? (
                  <>
                    <button 
                      type="button" 
                      className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                        isDarkMode 
                          ? 'text-zinc-300 hover:text-white hover:bg-white/5' 
                          : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                      }`}
                      onClick={() => { setAuthMode('login'); setPage('student-auth'); }}
                    >
                      Đăng nhập
                    </button>
                    <button 
                      type="button" 
                      className={`text-xs font-medium px-4 py-1.5 rounded-full transition-all duration-200 shadow-sm cursor-pointer ${
                        isDarkMode 
                          ? 'text-zinc-950 bg-white hover:bg-zinc-100' 
                          : 'text-white bg-zinc-950 hover:bg-zinc-800'
                      }`}
                      onClick={() => { setAuthMode('register'); setPage('student-auth'); }}
                    >
                      Đăng ký
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      role === 'admin' 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                        : role === 'teacher' 
                          ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                          : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}>
                      {role === 'admin' ? 'Admin' : role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                    </span>

                    {(role === 'admin' || role === 'teacher') && (
                      <button 
                        type="button"
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          isDarkMode 
                            ? 'text-zinc-300 hover:text-white border-white/10 hover:border-white/20' 
                            : 'text-zinc-700 hover:text-zinc-950 border-zinc-200 hover:border-zinc-300'
                        }`}
                        onClick={() => handleNavigateToPage('admin-dashboard')}
                      >
                        CMS Quản lý
                      </button>
                    )}

                    <div 
                      className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-all flex items-center gap-1.5 ${
                        isDarkMode 
                          ? 'text-zinc-300 hover:text-white bg-white/5 border-white/10 hover:border-white/20' 
                          : 'text-zinc-700 hover:text-zinc-950 bg-zinc-100 border-zinc-200 hover:border-zinc-300'
                      }`}
                      onClick={() => handleNavigateToPage('split-choice')}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{currentUser.user_metadata?.full_name || currentUser.email}</span>
                    </div>

                    <button 
                      type="button" 
                      className="text-xs font-medium text-zinc-400 hover:text-red-500 px-2.5 py-1.5 rounded-full hover:bg-red-500/10 transition-all cursor-pointer"
                      onClick={handleLogout}
                    >
                      Thoát
                    </button>
                  </>
                )}

                {/* Single Desktop Theme Toggle */}
                <button 
                  type="button"
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all text-sm cursor-pointer ml-1 ${
                    isDarkMode 
                      ? 'border-white/10 hover:border-white/25 bg-white/5 text-zinc-300 hover:text-white' 
                      : 'border-zinc-200 hover:border-zinc-300 bg-zinc-100 text-zinc-700 hover:text-zinc-950'
                  }`}
                  onClick={() => setIsDarkMode(!isDarkMode)} 
                  title={isDarkMode ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
                  aria-label="Đổi giao diện"
                >
                  {isDarkMode ? '☀️' : '🌙'}
                </button>
              </div>

              {/* Mobile Controls (Hidden on desktop) */}
              <div className="flex md:hidden items-center gap-2">
                <button 
                  type="button"
                  className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm cursor-pointer ${
                    isDarkMode ? 'border-white/10 bg-white/5 text-zinc-300' : 'border-zinc-200 bg-zinc-100 text-zinc-700'
                  }`}
                  onClick={() => setIsDarkMode(!isDarkMode)} 
                  aria-label="Đổi giao diện"
                >
                  {isDarkMode ? '☀️' : '🌙'}
                </button>
                <button 
                  type="button"
                  className={`w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer ${
                    isDarkMode ? 'border-white/10 bg-white/5 text-zinc-300' : 'border-zinc-200 bg-zinc-100 text-zinc-700'
                  }`}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Menu"
                >
                  {isMobileMenuOpen ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Menu Drawer */}
            {isMobileMenuOpen && (
              <div className={`md:hidden border-t backdrop-blur-2xl p-5 flex flex-col gap-2.5 animate-fadeIn ${
                isDarkMode ? 'border-white/5 bg-zinc-950/95' : 'border-zinc-200 bg-white/95'
              }`}>
                <button 
                  type="button" 
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-medium text-center ${
                    isDarkMode ? 'text-zinc-200 bg-white/5 border border-white/10' : 'text-zinc-800 bg-zinc-100 border border-zinc-200'
                  }`}
                  onClick={() => { handleNavigateToPage('split-choice'); setIsMobileMenuOpen(false); }}
                >
                  Khám phá bài học thử
                </button>
                {!currentUser ? (
                  <>
                    <button 
                      type="button" 
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-medium text-center ${
                        isDarkMode ? 'text-zinc-300 border border-white/10' : 'text-zinc-700 border border-zinc-200'
                      }`}
                      onClick={() => { setAuthMode('login'); setPage('student-auth'); setIsMobileMenuOpen(false); }}
                    >
                      Đăng nhập
                    </button>
                    <button 
                      type="button" 
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-center ${
                        isDarkMode ? 'text-zinc-950 bg-white' : 'text-white bg-zinc-950'
                      }`}
                      onClick={() => { setAuthMode('register'); setPage('student-auth'); setIsMobileMenuOpen(false); }}
                    >
                      Đăng ký tài khoản
                    </button>
                    <button 
                      type="button" 
                      className={`w-full py-2 text-xs text-center ${
                        isDarkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-900'
                      }`}
                      onClick={() => { setShowLogin(true); setIsMobileMenuOpen(false); }}
                    >
                      Cổng Giáo viên (CMS)
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button" 
                      className={`w-full py-2.5 px-4 rounded-xl text-xs text-center ${
                        isDarkMode ? 'text-zinc-200 bg-white/5 border border-white/10' : 'text-zinc-800 bg-zinc-100 border border-zinc-200'
                      }`}
                      onClick={() => { handleNavigateToPage('split-choice'); setIsMobileMenuOpen(false); }}
                    >
                      Vào học: {currentUser.user_metadata?.full_name || currentUser.email}
                    </button>
                    {(role === 'admin' || role === 'teacher') && (
                      <button 
                        type="button" 
                        className="w-full py-2 text-xs text-blue-500 text-center"
                        onClick={() => { handleNavigateToPage('admin-dashboard'); setIsMobileMenuOpen(false); }}
                      >
                        CMS Quản trị bài học
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="w-full py-2 text-xs text-red-500 text-center"
                      onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                    >
                      Đăng xuất
                    </button>
                  </>
                )}
              </div>
            )}
          </header>

          {/* Main Content */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-5 sm:px-8 relative z-10 flex flex-col">
            {/* Hero Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center py-12 lg:py-20">
              {/* Left Column: Headline & Minimalist CTAs */}
              <div className="lg:col-span-7 flex flex-col items-start text-left">
                {/* Minimalist Top Pill */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6 backdrop-blur-sm ${
                  isDarkMode 
                    ? 'bg-white/5 border border-white/10 text-zinc-300' 
                    : 'bg-zinc-100 border border-zinc-200 text-zinc-700'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Học liệu số 3D/VR • Bám sát SGK Lịch sử 10</span>
                </div>

                {/* Sleek, Elegant Headline */}
                <h1 className={`font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.12] mb-6 ${
                  isDarkMode ? 'text-white' : 'text-zinc-950'
                }`}>
                  Khám phá quá khứ,<br />
                  <span className={`text-transparent bg-clip-text ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-500' 
                      : 'bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-600'
                  }`}>
                    chạm vào hiện tại.
                  </span>
                </h1>

                {/* Calm, readable text */}
                <p className={`text-base sm:text-lg leading-relaxed font-normal max-w-xl mb-8 ${
                  isDarkMode ? 'text-zinc-400' : 'text-zinc-600'
                }`}>
                  Hệ thống học liệu điện tử 3D tương tác và thực tế ảo bám sát bộ sách Kết nối tri thức. 
                  Trực quan hóa các nền văn minh nhân loại và di sản lịch sử với độ chi tiết chân thực.
                </p>

                {/* Minimalist CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mb-9">
                  {currentUser ? (
                    <button 
                      type="button" 
                      className={`font-medium text-sm px-6 py-3.5 rounded-full transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group cursor-pointer ${
                        isDarkMode 
                          ? 'bg-white text-zinc-950 hover:bg-zinc-100' 
                          : 'bg-zinc-950 text-white hover:bg-zinc-800'
                      }`}
                      onClick={() => handleNavigateToPage('split-choice')}
                    >
                      <span>Mở bài giảng 3D</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      className={`font-medium text-sm px-6 py-3.5 rounded-full transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group cursor-pointer ${
                        isDarkMode 
                          ? 'bg-white text-zinc-950 hover:bg-zinc-100' 
                          : 'bg-zinc-950 text-white hover:bg-zinc-800'
                      }`}
                      onClick={() => { setAuthMode('login'); setPage('student-auth'); }}
                    >
                      <span>Đăng nhập để vào học</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                  )}

                  <button 
                    type="button" 
                    className={`px-5 py-3.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 text-sm backdrop-blur-sm cursor-pointer ${
                      isDarkMode 
                        ? 'bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-700/60 hover:border-zinc-500 text-zinc-200 hover:text-white' 
                        : 'bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-800 hover:text-zinc-950 shadow-xs'
                    }`}
                    onClick={() => handleNavigateToPage('split-choice')}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    <span>Trải nghiệm ngay (Khách)</span>
                  </button>

                  {(role === 'admin' || role === 'teacher') && (
                    <button 
                      type="button" 
                      className={`px-5 py-3.5 rounded-full transition-all duration-200 flex items-center justify-center gap-2 text-sm cursor-pointer ${
                        isDarkMode 
                          ? 'border border-zinc-700/80 hover:border-zinc-500 text-zinc-300 hover:text-white' 
                          : 'border border-zinc-300 hover:border-zinc-400 text-zinc-700 hover:text-zinc-950'
                      }`}
                      onClick={() => handleNavigateToPage('admin-dashboard')}
                    >
                      <span>Quản lý (CMS)</span>
                    </button>
                  )}
                </div>

                {/* Subtle Value Indicators */}
                <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium ${
                  isDarkMode ? 'text-zinc-400' : 'text-zinc-600'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Mô hình 3D & Mặt cắt 360°</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}><polyline points="20 6 9 17 4 12"/></svg>
                    <span>AR / VR đa nền tảng</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Chuẩn SGK Lịch sử 10</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Sleek 3D Showcase Frame */}
              <div className="lg:col-span-5 w-full">
                <div className={`relative rounded-2xl overflow-hidden border backdrop-blur-xl shadow-2xl transition-all duration-300 group ${
                  isDarkMode 
                    ? 'border-white/10 bg-zinc-900/40' 
                    : 'border-zinc-200 bg-white shadow-zinc-200/50'
                }`}>
                  {/* Top Bar */}
                  <div className={`px-4 py-3 border-b flex items-center justify-between text-xs ${
                    isDarkMode 
                      ? 'border-white/5 bg-zinc-950/40 text-zinc-400' 
                      : 'border-zinc-100 bg-zinc-50 text-zinc-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className={`font-mono text-[11px] tracking-wide ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>3D VIEWER LIVE</span>
                    </div>
                    <span className="text-[11px] font-medium">SGK Lịch sử 10</span>
                  </div>

                  {/* Artifact Image with refined frosted badges */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-zinc-950">
                    <img 
                      src={HERO_ARTIFACTS[landingArtifactIndex].image} 
                      alt={HERO_ARTIFACTS[landingArtifactIndex].name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>

                    {/* Frosted Badges */}
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full backdrop-blur-md bg-black/50 border border-white/15 text-white text-[11px] font-medium flex items-center gap-1.5 shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>AR / VR Sẵn sàng</span>
                    </div>

                    <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full backdrop-blur-md bg-black/50 border border-white/15 text-white text-[11px] font-medium shadow-lg">
                      Phục dựng 3D 360°
                    </div>
                  </div>

                  {/* Info Panel & Clean Chips */}
                  <div className={`p-4 sm:p-5 border-t flex flex-col gap-3 ${
                    isDarkMode 
                      ? 'border-white/5 bg-zinc-950/60' 
                      : 'border-zinc-100 bg-white'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`text-sm font-semibold tracking-tight ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                          {HERO_ARTIFACTS[landingArtifactIndex].name}
                        </h3>
                        <p className={`text-xs font-normal ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {HERO_ARTIFACTS[landingArtifactIndex].period}
                        </p>
                      </div>
                      <button 
                        type="button" 
                        className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                          isDarkMode 
                            ? 'text-zinc-300 hover:text-white border-white/10 hover:border-white/20' 
                            : 'text-zinc-700 hover:text-zinc-950 border-zinc-200 hover:border-zinc-300'
                        }`}
                        onClick={() => handleNavigateToPage('split-choice')}
                      >
                        Vào xem →
                      </button>
                    </div>

                    {/* Artifact Selector Chips (no horizontal scrollbar) */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {HERO_ARTIFACTS.map((artifact, idx) => (
                        <button
                          key={artifact.id}
                          type="button"
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs transition-all text-center truncate cursor-pointer ${
                            landingArtifactIndex === idx 
                              ? (isDarkMode 
                                  ? 'bg-white/10 text-white border border-white/20 font-medium' 
                                  : 'bg-zinc-900 text-white border border-zinc-900 font-medium shadow-xs')
                              : (isDarkMode 
                                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent' 
                                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent')
                          }`}
                          onClick={() => setLandingArtifactIndex(idx)}
                        >
                          {artifact.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Minimalist Feature Bento Grid */}
            <section className={`py-16 border-t ${isDarkMode ? 'border-white/5' : 'border-zinc-200'}`}>
              <div className="max-w-2xl mx-auto text-center mb-12">
                <span className={`text-[11px] font-mono tracking-widest uppercase mb-2 block ${
                  isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                  CÔNG NGHỆ & HỌC LIỆU
                </span>
                <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-3 ${
                  isDarkMode ? 'text-white' : 'text-zinc-950'
                }`}>
                  Phương pháp trực quan thế hệ mới
                </h2>
                <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Tối giản thao tác, tối đa hóa trải nghiệm thị giác và tư duy không gian cho học sinh.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* Card 1 */}
                <div className={`rounded-2xl border transition-all duration-300 p-6 flex flex-col group backdrop-blur-sm ${
                  isDarkMode 
                    ? 'border-white/5 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-white/15' 
                    : 'border-zinc-200/80 bg-white hover:bg-zinc-50/80 hover:border-zinc-300 shadow-xs'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors mb-4 ${
                    isDarkMode 
                      ? 'bg-white/5 border border-white/10 text-zinc-300 group-hover:text-white' 
                      : 'bg-zinc-100 border border-zinc-200 text-zinc-700 group-hover:text-zinc-950'
                  }`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                      <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                  </div>
                  <h3 className={`text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Mô hình 3D & Giải phẫu</h3>
                  <p className={`text-xs leading-relaxed flex-1 mb-4 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Quan sát cấu trúc bên trong Kim tự tháp và hoa văn cổ vật ở mọi góc độ với chuẩn WebGL mượt mà.
                  </p>
                  <span className={`text-[10px] font-mono tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>3D ENGINE</span>
                </div>

                {/* Card 2 */}
                <div className={`rounded-2xl border transition-all duration-300 p-6 flex flex-col group backdrop-blur-sm ${
                  isDarkMode 
                    ? 'border-white/5 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-white/15' 
                    : 'border-zinc-200/80 bg-white hover:bg-zinc-50/80 hover:border-zinc-300 shadow-xs'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors mb-4 ${
                    isDarkMode 
                      ? 'bg-white/5 border border-white/10 text-zinc-300 group-hover:text-white' 
                      : 'bg-zinc-100 border border-zinc-200 text-zinc-700 group-hover:text-zinc-950'
                  }`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M2 12h20M2 12a10 10 0 0 1 10-10 10 10 0 0 1 10 10M2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </div>
                  <h3 className={`text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Thực tế ảo AR & VR</h3>
                  <p className={`text-xs leading-relaxed flex-1 mb-4 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Chiếu cổ vật lên không gian thực qua camera di động hoặc trải nghiệm kính VR mà không cần cài ứng dụng.
                  </p>
                  <span className={`text-[10px] font-mono tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>WEBXR READY</span>
                </div>

                {/* Card 3 */}
                <div className={`rounded-2xl border transition-all duration-300 p-6 flex flex-col group backdrop-blur-sm ${
                  isDarkMode 
                    ? 'border-white/5 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-white/15' 
                    : 'border-zinc-200/80 bg-white hover:bg-zinc-50/80 hover:border-zinc-300 shadow-xs'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors mb-4 ${
                    isDarkMode 
                      ? 'bg-white/5 border border-white/10 text-zinc-300 group-hover:text-white' 
                      : 'bg-zinc-100 border border-zinc-200 text-zinc-700 group-hover:text-zinc-950'
                  }`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                  </div>
                  <h3 className={`text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Chuẩn SGK Lịch sử 10</h3>
                  <p className={`text-xs leading-relaxed flex-1 mb-4 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Đồng bộ kiến thức bộ sách Kết nối tri thức, tích hợp hồ sơ lịch sử, niên đại và câu hỏi tương tác.
                  </p>
                  <span className={`text-[10px] font-mono tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>GDPT 2018</span>
                </div>

                {/* Card 4 */}
                <div className={`rounded-2xl border transition-all duration-300 p-6 flex flex-col group backdrop-blur-sm ${
                  isDarkMode 
                    ? 'border-white/5 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-white/15' 
                    : 'border-zinc-200/80 bg-white hover:bg-zinc-50/80 hover:border-zinc-300 shadow-xs'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors mb-4 ${
                    isDarkMode 
                      ? 'bg-white/5 border border-white/10 text-zinc-300 group-hover:text-white' 
                      : 'bg-zinc-100 border border-zinc-200 text-zinc-700 group-hover:text-zinc-950'
                  }`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <h3 className={`text-sm font-semibold mb-1.5 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Lớp học Đồng bộ 4.0</h3>
                  <p className={`text-xs leading-relaxed flex-1 mb-4 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Giáo viên điều phối và chia sẻ góc nhìn mô hình 3D trực tiếp tới thiết bị học sinh theo thời gian thực.
                  </p>
                  <span className={`text-[10px] font-mono tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>LIVE SYNC</span>
                </div>
              </div>
            </section>

            {/* Minimalist Footer */}
            <footer className={`border-t py-8 mt-auto ${isDarkMode ? 'border-white/5 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div>
                  © 2026 Heritage Studio • Nền tảng học liệu điện tử 3D SGK Lịch sử 10.
                </div>
                <div className="flex items-center gap-5">
                  <button 
                    type="button" 
                    className={`transition-colors cursor-pointer ${isDarkMode ? 'hover:text-zinc-200' : 'hover:text-zinc-900'}`}
                    onClick={() => handleNavigateToPage('split-choice')}
                  >
                    Bài giảng 3D
                  </button>
                  <button 
                    type="button" 
                    className={`transition-colors cursor-pointer ${isDarkMode ? 'hover:text-zinc-200' : 'hover:text-zinc-900'}`}
                    onClick={() => { setAuthMode('login'); setPage('student-auth'); }}
                  >
                    Học sinh
                  </button>
                  <button 
                    type="button" 
                    className={`transition-colors cursor-pointer ${isDarkMode ? 'hover:text-zinc-200' : 'hover:text-zinc-900'}`}
                    onClick={() => setShowLogin(true)}
                  >
                    Cổng Giáo viên
                  </button>
                </div>
              </div>
            </footer>
          </main>

          {/* Teacher Login Modal preserved 100% */}
          {showLogin && (
            <div className="login-modal-overlay">
              <form className="login-modal" onSubmit={handleLogin}>
                <h2>Xác thực Giáo viên</h2>
                <p>Vui lòng nhập mật khẩu quản trị.</p>
                <input 
                  type="password" 
                  placeholder="Mật khẩu (admin123)" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  autoFocus 
                />
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowLogin(false)}>Hủy</button>
                  <button type="submit" className="btn-primary">Đăng nhập</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {page === 'student-auth' && (
        <div className="landing-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              style={{ width: '40px', height: '40px', borderRadius: '50%', border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1', background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', boxShadow: isDarkMode ? 'none' : '0 4px 12px rgba(0,0,0,0.06)' }}
              title={isDarkMode ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
          <div style={{ background: isDarkMode ? '#0f172a' : '#ffffff', padding: '40px', borderRadius: '24px', border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0', width: '100%', maxWidth: '400px', boxShadow: isDarkMode ? '0 25px 50px -12px rgba(0,0,0,0.5)' : '0 20px 40px rgba(0,0,0,0.08)', animation: 'fadeIn 0.4s' }}>
            <h2 style={{ color: isDarkMode ? '#fff' : '#0f172a', textAlign: 'center', margin: '0 0 24px 0', fontFamily: 'Montserrat, sans-serif' }}>🏛️ CỔNG HỌC SINH</h2>
            <div style={{ display: 'flex', marginBottom: '20px', background: isDarkMode ? '#1e293b' : '#f1f5f9', borderRadius: '12px', padding: '4px' }}>
              <button onClick={() => setAuthMode('login')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: authMode === 'login' ? '#3b82f6' : 'transparent', color: authMode === 'login' ? '#fff' : (isDarkMode ? '#94a3b8' : '#64748b'), fontWeight: 'bold', cursor: 'pointer' }}>Đăng nhập</button>
              <button onClick={() => setAuthMode('register')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: authMode === 'register' ? '#10b981' : 'transparent', color: authMode === 'register' ? '#fff' : (isDarkMode ? '#94a3b8' : '#64748b'), fontWeight: 'bold', cursor: 'pointer' }}>Đăng ký mới</button>
            </div>
            <form onSubmit={handleStudentAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="email" placeholder="Email đăng nhập..." required value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ padding: '14px', borderRadius: '10px', background: isDarkMode ? '#1e293b' : '#f8fafc', border: isDarkMode ? '1px solid #475569' : '1px solid #cbd5e1', color: isDarkMode ? '#fff' : '#0f172a', outline: 'none' }} />
              <input type="password" placeholder="Mật khẩu (Tối thiểu 6 ký tự)..." required minLength={6} value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '14px', borderRadius: '10px', background: isDarkMode ? '#1e293b' : '#f8fafc', border: isDarkMode ? '1px solid #475569' : '1px solid #cbd5e1', color: isDarkMode ? '#fff' : '#0f172a', outline: 'none' }} />
              
              {authMode === 'register' && (
                <>
                  <input type="text" placeholder="Họ và Tên đầy đủ..." required value={regName} onChange={e => setRegName(e.target.value)} style={{ padding: '14px', borderRadius: '10px', background: isDarkMode ? '#1e293b' : '#f8fafc', border: isDarkMode ? '1px solid #475569' : '1px solid #cbd5e1', color: isDarkMode ? '#fff' : '#0f172a', outline: 'none' }} />
                  <input type="text" placeholder="Lớp học (VD: 10A1)..." required value={regClass} onChange={e => setRegClass(e.target.value)} style={{ padding: '14px', borderRadius: '10px', background: isDarkMode ? '#1e293b' : '#f8fafc', border: isDarkMode ? '1px solid #475569' : '1px solid #cbd5e1', color: isDarkMode ? '#fff' : '#0f172a', outline: 'none' }} />
                  <div>
                    <label style={{ fontSize: '12px', color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '8px', display: 'block' }}>Chọn Avatar yêu thích:</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {AVATAR_LIST.map(avt => (
                        <div key={avt} onClick={() => setRegAvatar(avt)} style={{ width: '40px', height: '40px', background: regAvatar === avt ? '#cbd5e1' : (isDarkMode ? '#1e293b' : '#f1f5f9'), border: regAvatar === avt ? '2px solid #3b82f6' : (isDarkMode ? '1px solid #475569' : '1px solid #cbd5e1'), borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', cursor: 'pointer', boxSizing: 'border-box' }}>{avt}</div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <button type="submit" style={{ marginTop: '10px', padding: '14px', borderRadius: '10px', border: 'none', background: authMode === 'login' ? '#3b82f6' : '#10b981', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>{authMode === 'login' ? 'VÀO HỌC NGAY' : 'TẠO TÀI KHOẢN'}</button>
            </form>
            <button onClick={() => setPage('landing')} style={{ width: '100%', marginTop: '16px', background: 'transparent', border: 'none', color: isDarkMode ? '#94a3b8' : '#64748b', textDecoration: 'underline', cursor: 'pointer' }}>← Trở lại trang chủ</button>
          </div>
        </div>
      )}
    
{/*SPLIT PAGE*/}
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
{/*LUA BAI HOC*/}
      {page === 'lesson-choice' && (
        <div className="lesson-choice-wrapper animate-fade-in">
           <button className="back-btn-floating" onClick={() => handleNavigateToPage('split-choice')}>← Đổi Khu vực</button>
           <div className="lesson-header">
             <small>{activeRegion === 'world' ? 'PHẦN 1' : 'PHẦN 2'}</small>
             <div className="lesson-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h1>{themeTitle}</h1>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {currentUser && (
                    <button onClick={() => { fetchMyPassport(); setShowPassportModal(true); }} style={{ background: 'linear-gradient(135deg, #1e3a8a, #1e40af)', color: '#fcd34d', border: '2px solid #fbbf24', padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)', transition: '0.3s' }}>
                      {currentUser.user_metadata?.avatar || '🛂'} Hộ chiếu Di sản của {currentUser.user_metadata?.full_name?.split(' ').pop() || 'Tôi'}
                    </button>
                  )}
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)} 
                    style={{ width: '38px', height: '38px', borderRadius: '50%', border: isDarkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #cbd5e1', background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', boxShadow: isDarkMode ? 'none' : '0 4px 12px rgba(0,0,0,0.06)' }}
                    title={isDarkMode ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
                  >
                    {isDarkMode ? '☀️' : '🌙'}
                  </button>
                </div>
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
{/*ADMIN CMS*/}
      {page === 'admin-dashboard' && (
        <div className="dashboard-wrapper animate-fade-in">
           <header className="dashboard-header">
              <div className="logo">⚙️ TRUNG TÂM ĐIỀU KHIỂN CLOUD (CMS)</div>
              <div className="dashboard-actions">
                  <button 
                    className="btn-outline outline-dark" 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    title={isDarkMode ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
                  >
                    {isDarkMode ? '☀️ Sáng' : '🌙 Tối'}
                  </button>
                 <button className="btn-outline outline-dark" style={{ border: '1px solid #38bdf8', color: '#38bdf8' }} onClick={handleResetToInitialData} title="Khôi phục đầy đủ bài học gốc có 3D, mặt cắt, VR tour">↺ Nạp bài học gốc</button>
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
                                <div className="flex gap-2 mb-6 flex-wrap bg-zinc-900/90 p-2 rounded-2xl border border-white/10">
                                    {['general', 'games', 'ar_masks', 'ar_hands', 'report'].map(tab => (
                                        <button 
                                            key={tab} 
                                            onClick={(e) => { e.preventDefault(); setActiveAdminTab(tab as any); }}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                activeAdminTab === tab 
                                                    ? (tab === 'ar_masks' ? 'bg-cyan-500 text-black shadow-md' : tab === 'ar_hands' ? 'bg-amber-500 text-black shadow-md' : 'bg-white text-zinc-950 shadow-md')
                                                    : 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/5'
                                            }`}
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
                                      <button className="admin-add-btn" style={{ background: '#e11d48' }} onClick={(e) => { e.preventDefault(); updateAdminData(adminEditingMonu.id, 'masks', [...(adminEditingMonu.masks || []), { id: Date.now().toString(), name: 'Mặt nạ mới', thumbUrl: '', glbUrl: '', audioUrl: '', type: 'mask' }]); }}>+ Thêm mô hình</button>
                                  </label>
                                  <p style={{ fontSize: '12px', color: '#e11d48', margin: '0 0 16px 0' }}>Tải lên file 3D (.glb) và file ghi âm (.mp3) để nhân vật tự giới thiệu khi học sinh ốp mặt nạ!</p>
                                  
                                  {(adminEditingMonu.masks || []).map((mask: any, index: number) => (
                                      <div key={mask.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #fda4af', boxShadow: '0 4px 6px rgba(225, 29, 72, 0.05)' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white', background: '#e11d48', padding: '4px 10px', borderRadius: '4px' }}>Mô hình {index + 1}</span>
                                              <button onClick={(e) => { e.preventDefault(); updateAdminData(adminEditingMonu.id, 'masks', adminEditingMonu.masks.filter((_: any, i: number) => i !== index)); }} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>✕ Xóa</button>
                                          </div>
                                          
                                          {/* Nhập Tên & Nút AI */}
                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                              <input type="text" value={mask.name} onChange={(e) => { const n = [...adminEditingMonu.masks]; n[index].name = e.target.value; updateAdminData(adminEditingMonu.id, 'masks', n); }} placeholder="Tên nhân vật (VD: Nữ hoàng Nefertiti)..." style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#be123c' }} />
                                              <button className="admin-add-btn" style={{ background: '#fb7185', padding: '8px 12px', fontSize: '12px', boxShadow: '0 2px 4px rgba(251, 113, 133, 0.3)' }} onClick={(e) => { e.preventDefault(); handleCopyPromptForMaskAudio(mask.name); }}>✨ Nhờ AI soạn kịch bản giới thiệu</button>
                                          </div>
                                          
                                          {/* Audio */}
                                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: '#fff1f2', padding: '6px', borderRadius: '6px', border: '1px solid #fecdd3' }}>
                                                  <span style={{ fontSize: '16px' }}>🔊</span>
                                                  <input type="text" value={mask.audioUrl || ''} onChange={(e) => { const n = [...adminEditingMonu.masks]; n[index].audioUrl = e.target.value; updateAdminData(adminEditingMonu.id, 'masks', n); }} placeholder="Link audio (.mp3)..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} />
                                                  <label className="btn-upload" style={{ background: '#e11d48', padding: '6px 12px', margin: 0, cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}>☁ Tải<input type="file" accept="audio/*" style={{display: 'none'}} onChange={async (e) => { if(e.target.files?.[0]){ setIsLoading(true); const file = e.target.files[0]; const filePath = `uploads/${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(filePath); const n = [...adminEditingMonu.masks]; n[index].audioUrl = data.publicUrl; updateAdminData(adminEditingMonu.id, 'masks', n); } setIsLoading(false); } }} /></label>
                                              </div>
                                          </div>

                                          {/* Thumb, 3D, and Select Type */}
                                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                              <div style={{ flex: 2, minWidth: '160px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                  <span style={{ fontSize: '16px' }}>🖼️</span>
                                                  <input type="text" value={mask.thumbUrl} onChange={(e) => { const n = [...adminEditingMonu.masks]; n[index].thumbUrl = e.target.value; updateAdminData(adminEditingMonu.id, 'masks', n); }} placeholder="Link icon nhỏ..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} />
                                                  <label className="btn-upload" style={{ background: '#f43f5e', padding: '6px 12px', margin: 0, cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}>☁ Tải<input type="file" accept="image/*" style={{display: 'none'}} onChange={async (e) => { if(e.target.files?.[0]){ setIsLoading(true); const file = e.target.files[0]; const filePath = `uploads/${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(filePath); const n = [...adminEditingMonu.masks]; n[index].thumbUrl = data.publicUrl; updateAdminData(adminEditingMonu.id, 'masks', n); } setIsLoading(false); } }} /></label>
                                              </div>
                                              
                                              <div style={{ flex: 2, minWidth: '160px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                  <span style={{ fontSize: '16px' }}>🗿</span>
                                                  <input type="text" value={mask.glbUrl} onChange={(e) => { const n = [...adminEditingMonu.masks]; n[index].glbUrl = e.target.value; updateAdminData(adminEditingMonu.id, 'masks', n); }} placeholder="Link file 3D/2D..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} />
                                                  <label className="btn-upload" style={{ background: '#be123c', padding: '6px 12px', margin: 0, cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}>☁ Tải<input type="file" accept=".glb,image/png,image/jpeg" style={{display: 'none'}} onChange={async (e) => { if(e.target.files?.[0]){ setIsLoading(true); const file = e.target.files[0]; const filePath = `uploads/${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(filePath); const n = [...adminEditingMonu.masks]; n[index].glbUrl = data.publicUrl; updateAdminData(adminEditingMonu.id, 'masks', n); } setIsLoading(false); } }} /></label>
                                              </div>

                                              {/* Ô Loại Cổ Vật (Mặt nạ / Khuyên tai) */}
                                              <select 
                                                  value={mask.type || 'mask'} 
                                                  onChange={(e) => { 
                                                      const n = [...adminEditingMonu.masks]; 
                                                      n[index].type = e.target.value; 
                                                      updateAdminData(adminEditingMonu.id, 'masks', n); 
                                                  }} 
                                                  style={{ flex: 1, minWidth: '120px', padding: '8px', borderRadius: '6px', border: '1px solid #10b981', fontWeight: 'bold', color: '#047857', outline: 'none', background: '#ecfdf5', cursor: 'pointer' }}
                                              >
                                                  <option value="mask">🎭 Mặt nạ</option>
                                                  <option value="earring">✨ Khuyên tai</option>
                                              </select>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                          
                          {/* ======================================= */}
                          {/* TAB MỚI: XƯỞNG CẦM CỔ VẬT AR */           }
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
                                         <input type="text" value={model.name} onChange={(e) => { const n = [...adminEditingMonu.handModels]; n[index].name = e.target.value; updateAdminData(adminEditingMonu.id, 'handModels', n); }} placeholder="Tên món đồ (VD: Thanh gươm thần, Ấn tín)..." style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#d97706', boxSizing: 'border-box' }} />
                                         {/* Ô Link Ảnh */}
                                         <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                                             <div style={{ flex: 2, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>
                                                <span style={{ fontSize: '16px' }}>🖼️</span>
                                                <input type="text" value={model.thumbUrl} readOnly placeholder="Link ảnh icon..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} />
                                                <label style={{ background: '#d97706', color: 'white', padding: '6px 12px', margin: 0, borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>☁ Tải<input type="file" accept=".glb" style={{display: 'none'}} onChange={async (e) => { if(e.target.files?.[0]){ setIsLoading(true); const file = e.target.files[0]; const filePath = `uploads/${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(filePath); const n = [...adminEditingMonu.handModels]; n[index].glbUrl = data.publicUrl; updateAdminData(adminEditingMonu.id, 'handModels', n); } setIsLoading(false); } }} /></label>
                                              </div>
                                             
                                             <div style={{ flex: 2, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}>
                                              <span style={{ fontSize: '16px' }}>🗿</span>
                                                <input type="text" value={model.glbUrl} readOnly placeholder="Link file 3D (.glb)..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} />
                                                <label style={{ background: '#d97706', color: 'white', padding: '6px 12px', margin: 0, borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>☁ Tải<input type="file" accept=".glb" style={{display: 'none'}} onChange={async (e) => { if(e.target.files?.[0]){ setIsLoading(true); const file = e.target.files[0]; const filePath = `uploads/${Date.now()}-${file.name}`; const { error } = await supabase.storage.from('assets').upload(filePath, file); if (!error) { const { data } = supabase.storage.from('assets').getPublicUrl(filePath); const n = [...adminEditingMonu.handModels]; n[index].glbUrl = data.publicUrl; updateAdminData(adminEditingMonu.id, 'handModels', n); } setIsLoading(false); } }} /></label>
                                              </div>

                                             <div style={{ display: 'flex', gap: '8px' }}>
                                              <input type="text" value={model.name} onChange={(e) => { const n = [...adminEditingMonu.handModels]; n[index].name = e.target.value; updateAdminData(adminEditingMonu.id, 'handModels', n); }} placeholder="Tên món đồ (VD: Kiếm, Vòng ngọc)..." style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#d97706' }} />
                                              <select value={model.type || 'handheld'} onChange={(e) => { const n = [...adminEditingMonu.handModels]; n[index].type = e.target.value; updateAdminData(adminEditingMonu.id, 'handModels', n); }} style={{ flex: 1, minWidth: '140px', padding: '8px', borderRadius: '6px', border: '1px solid #f59e0b', fontWeight: 'bold', color: '#d97706', outline: 'none', background: '#fffbeb', cursor: 'pointer' }}>
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
{/* PAGE CHINH - WORKSPACE STUDIO 3D & HOLOGRAM */}
      {page === 'app' && activeMonu && (
        <div className="cas-container animate-fade-in relative">
          {/* Studio Frosted Header */}
          <header className="cas-header">
            <div className="logo" onClick={() => handleNavigateToPage('landing')}>
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-200 shadow-sm">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2L2 7h20L12 2z"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm tracking-tight">Heritage Studio</span>
                <span className="text-[10px] font-medium tracking-wider uppercase text-zinc-400">3D Workspace</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {role === 'admin' ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsClassroomSyncActive(!isClassroomSyncActive)} 
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isClassroomSyncActive 
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isClassroomSyncActive ? 'bg-red-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
                    <span>{isClassroomSyncActive ? 'Đang Phát Sa Bàn' : 'Bật Sa Bàn Lớp Học'}</span>
                  </button>
                  {isClassroomSyncActive && (viewMode === 'normal' || viewMode === 'section') && (
                    <button onClick={handleSyncCameraAngle} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 transition-all cursor-pointer">
                      🎥 Đồng bộ góc nhìn 3D
                    </button>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => setIsClassroomSyncActive(!isClassroomSyncActive)} 
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isClassroomSyncActive 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm' 
                      : 'bg-white/5 text-zinc-300 border border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isClassroomSyncActive ? 'bg-amber-400 animate-pulse' : 'bg-zinc-500'}`}></span>
                  <span>{isClassroomSyncActive ? 'Đang Nhận Tín Hiệu...' : 'Kết Nối Sa Bàn'}</span>
                </button>
              )}

              {/* Supabase Database Connection Status Indicator */}
              <div 
                onClick={() => {
                  if (dbStatus.rlsBlocked) setShowRlsHelpModal(true);
                  else checkDatabaseConnection();
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-2 border transition-all cursor-pointer shadow-sm ${
                  dbStatus.rlsBlocked 
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25' 
                    : dbStatus.online 
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25' 
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                }`}
                title="Trạng thái kết nối cơ sở dữ liệu Supabase. Bấm để kiểm tra lại hoặc xem hướng dẫn RLS."
              >
                <span className={`w-2 h-2 rounded-full ${
                  dbStatus.rlsBlocked 
                    ? 'bg-amber-400 animate-pulse' 
                    : dbStatus.online 
                      ? 'bg-emerald-400' 
                      : 'bg-rose-400 animate-ping'
                }`}></span>
                <span>
                  {dbStatus.rlsBlocked 
                    ? 'Supabase: Cần mở RLS' 
                    : dbStatus.online 
                      ? `Supabase: Online ${dbStatus.lessonCount > 0 ? `(${dbStatus.lessonCount} bài)` : ''}` 
                      : 'Supabase: Đang kết nối...'
                  }
                </span>
              </div>

              {/* Hologram Launch Button in Header */}
              <button 
                type="button" 
                onClick={handleEnterHologram}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Chiếu mô hình 3D toàn màn hình cho thiết bị Hologram ngoại vi (Phím tắt: H)"
              >
                <span>🔮 Chiếu Hologram</span>
              </button>

              {role === 'admin' && (
                <button className="px-3 py-1.5 rounded-full text-xs font-medium text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer" onClick={() => handleNavigateToPage('admin-dashboard')}>
                  ← CMS
                </button>
              )}
              {(role === 'guest' || role === 'student') && (
                <button className="px-3 py-1.5 rounded-full text-xs font-medium text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 transition-all cursor-pointer" onClick={() => handleNavigateToPage('lesson-choice')}>
                  ← Chọn bài khác
                </button>
              )}
              <button className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-100 transition-all shadow-sm cursor-pointer" onClick={() => handleNavigateToPage('landing')}>
                Trang chủ
              </button>
              {currentUser && (
                <button className="px-2.5 py-1.5 rounded-full text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all cursor-pointer" onClick={handleLogout}>
                  Thoát
                </button>
              )}
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-sm cursor-pointer text-zinc-300 hover:text-white transition-all ml-1"
                title={isDarkMode ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </header>

          <main className="cas-main-grid">
            {/* Left Sidebar: Lesson List */}
            <aside className="cas-sidebar-left">
              <div className="section-label">
                <span>{role === 'admin' ? 'DANH SÁCH BÀI HỌC (ADMIN)' : activeMonu.category.toUpperCase()}</span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {displayedMonuments.filter(m => role === 'admin' || m.category === activeMonu.category).length}
                </span>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto">
                {displayedMonuments.filter(m => role === 'admin' || m.category === activeMonu.category).map((m: any) => (
                  <div key={m.id} className={`topic-card ${activeMonu.id === m.id ? 'active' : ''}`} onClick={() => { setActiveMonuId(m.id); setViewMode('normal'); }}>
                    <span className="topic-icon">{m.icon}</span>
                    <div className="topic-info">
                      <strong>{m.name}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Center Viewport */}
            <section className="cas-viewport">
              {viewMode !== 'game' && viewMode !== 'hex' && viewMode !== 'ar' && viewMode !== 'npc' && viewMode !== 'mask' && viewMode !== 'hand' && (
                <div className={`viewport-header ${viewMode === 'tour' ? 'tour-mode' : ''}`}>
                  {role === 'admin' ? (
                    <input className="admin-input-title" value={activeMonu.name || ''} onChange={(e) => handleUpdateName(e.target.value)} title="Bấm để sửa tên bài học" />
                  ) : (
                    <h2>{activeMonu.name} <span>{activeMonu.category}</span></h2>
                  )}
                  
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="view-mode-tabs">
                      <button className={viewMode === 'normal' ? 'active' : ''} onClick={() => setViewMode('normal')}>Bề mặt 3D</button>
                      <button className={viewMode === 'section' ? 'active' : ''} onClick={() => setViewMode('section')}>Mặt cắt</button>
                      {activeMonu.tourUrl && <button className={viewMode === 'tour' ? 'active' : ''} onClick={() => setViewMode('tour')}>VR Tour</button>}
                      {currentMainModelPath && <button className={(viewMode as string) === 'ar' ? 'active' : ''} onClick={() => setViewMode('ar')}>Xem AR</button>}
                      <button className={(viewMode as string) === 'mask' ? 'active' : ''} onClick={() => { setViewMode('mask'); }}>🎭 Mặt Nạ AR</button>
                      <button className={(viewMode as string) === 'hand' ? 'active' : ''} onClick={() => { setViewMode('hand'); setActiveHandIndex(null); }}>🖐️ Cổ Vật</button>
                      {activeMonu.npcDialog && activeMonu.npcDialog.length > 0 && <button className={(viewMode as string) === 'npc' ? 'active' : ''} onClick={() => { setViewMode('npc'); setNpcStep(0); setNpcFeedback(null); }}>💬 Danh Nhân</button>}
                      {activeMonu.gameData && activeMonu.gameData.length > 0 && <button className={(viewMode as string) === 'game' ? 'active' : ''} onClick={() => { setViewMode('game'); setSelectedRowIndex(null); setGameInput(''); setGameFeedback('idle'); setWrongCount(0); setShowExplanation(false); setShowRewardModal(false); setRowStates(activeMonu.gameData.map(() => ({ solved: false, skipped: false, guess: '' }))); }}>🎮 Ô chữ</button>}
                      {activeMonu.hexGameData && activeMonu.hexGameData.length > 0 && <button className={(viewMode as string) === 'hex' ? 'active' : ''} onClick={() => { setViewMode('hex'); setShowHexSubmit(false); setHexReasoning(''); }}>🧠 Lục giác</button>}
                    </div>


                  </div>
                </div>
              )}

              <div className="canvas-wrapper" style={((viewMode as string) === 'ar' || (viewMode as string) === 'game' || (viewMode as string) === 'hex' || (viewMode as string) === 'npc' || (viewMode as string) === 'mask' || (viewMode as string) === 'hand') ? { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '420px', position: 'relative', overflow: 'hidden' } : { position: 'relative', flex: 1 }}>

                {/* Floating Turntable Controls (Bố trí ở góc dưới phải để không che khuất các tab chế độ ở trên) */}
                {viewMode !== 'game' && viewMode !== 'hex' && viewMode !== 'ar' && viewMode !== 'npc' && viewMode !== 'mask' && viewMode !== 'hand' && !isSketchfab(currentMainModelPath) && (
                  <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
                    <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900/85 hover:bg-zinc-900/95 backdrop-blur-xl border border-white/10 shadow-2xl transition-all">
                      {/* Auto Rotate Button */}
                      <button 
                        type="button" 
                        onClick={() => setIsAutoRotating(!isAutoRotating)} 
                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                          isAutoRotating 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                            : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10 hover:text-white'
                        }`}
                        title="Bật/Tắt tự động xoay mô hình (Phím cách Space)"
                      >
                        <span>{isAutoRotating ? '⏸ Dừng xoay' : '🔄 Tự xoay 360°'}</span>
                      </button>

                      {/* Recenter & Reset Camera Button */}
                      <button 
                        type="button" 
                        onClick={() => {
                          controlsRef.current?.reset();
                          setModelScaleMultiplier(1);
                        }} 
                        className="px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10 hover:text-white"
                        title="Căn giữa lại mô hình và đặt lại góc nhìn chuẩn"
                      >
                        <span>🎯 Căn giữa</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 🎭 MÀN HÌNH TẠO MẶT NẠ AR (MASK MAKER) */}
                {(viewMode as string) === 'mask' && (
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
                                          const paramKey = selectedMask.type === 'earring' ? 'earring' : 'mask';
                                          const arUrl = `${window.location.origin}/face-ar.html?${paramKey}=${encodeURIComponent(selectedMask.glbUrl)}&audio=${encodeURIComponent(selectedMask.audioUrl || '')}`;
                                          
                                          return (
                                              <div style={{ marginTop: 'auto', textAlign: 'center', background: theme.bgCard, padding: '20px', borderRadius: '12px', border: '1px dashed #ec4899', animation: 'fadeIn 0.3s' }}>
                                                  <QRCodeSVG value={arUrl} size={130} level="M" includeMargin={true} style={{ background: 'white', padding: '8px', borderRadius: '8px', margin: '0 auto' }} />
                                                  <p style={{ color: theme.textMain, fontSize: '13px', marginTop: '16px', marginBottom: '16px', lineHeight: '1.5' }}>
                                                      Quét mã QR để hóa thân thành <b style={{color: '#ec4899'}}>{selectedMask.name}</b>!
                                                  </p>
                                                  <a href={arUrl} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', padding: '12px', background: 'linear-gradient(90deg, #ec4899, #db2777)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxSizing: 'border-box', boxShadow: '0 4px 10px rgba(236,72,153,0.3)' }}>
                                                      Mở Camera AR Trực tiếp
                                                  </a>
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
                {(viewMode as string) === 'hand' && (
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
                {(viewMode as string) === 'npc' && activeMonu.npcDialog && (
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
                          <div style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '800px', zIndex: 20 }}>
                             <div style={{ background: theme.bgPanel, border: `2px solid #6366f1`, borderRadius: '16px', padding: '24px', paddingTop: '30px', boxShadow: '0 15px 30px rgba(0,0,0,0.5)', position: 'relative' }}>
                                 <div style={{ position: 'absolute', top: '-16px', left: '24px', background: '#6366f1', color: 'white', padding: '6px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)' }}>
                                    Nhân vật Bí ẩn 👤
                                 </div>
                                 
                                 {!npcFeedback ? (
                                   <div>
                                     <p style={{ color: theme.textMain, fontSize: '16px', lineHeight: '1.6', margin: '0 0 20px 0', fontStyle: 'italic' }}>"{activeMonu.npcDialog[npcStep].npcText}"</p>
                                     <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                {(viewMode as string) === 'game' && activeMonu.gameData && (
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

                {/* GAME LỤC GIÁC (HEXAGONAL THINKING) */}
                {(viewMode as string) === 'hex' && activeMonu.hexGameData && (
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

                    {hexNodes.map(node => (
                       <div key={node.id} className="hex-card" 
                            style={{ 
                                position: 'absolute',
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
                                clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                                userSelect: 'none',
                                touchAction: 'none',
                                zIndex: draggingHex === node.id ? 100 : 1,
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
                {(viewMode as string) === 'ar' ? (
                  <div style={{ textAlign: 'center', background: theme.bgMain, padding: '20px', borderRadius: '24px', border: `1px solid ${theme.border}`, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
                     <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}><button className="back-btn" style={{ margin: 0, background: theme.bgPanel, color: theme.textMain, border: `1px solid ${theme.border}` }} onClick={() => setViewMode('normal')}>← Trở lại</button></div>
                     <h3 style={{ color: theme.textMain, fontFamily: 'Montserrat', margin: '0 0 20px 0', fontSize: '18px' }}>Quét mã để xem Bộ mô hình AR</h3>
                     <div style={{ background: 'white', padding: '16px', borderRadius: '16px', display: 'inline-block', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                        <QRCodeSVG value={`${window.location.origin}/ar.html?d=${encodeURIComponent(JSON.stringify([...(activeMonu.normalPath ? [{ n: 'Mô hình chính', p: activeMonu.normalPath, a: activeMonu.audioUrl || '' }] : []), ...(activeMonu.subModels ? activeMonu.subModels.filter((m: any) => m.path).map((m: any) => ({ n: m.name || 'Mô hình phụ', p: m.path, a: m.audioUrl || '' })) : [])]))}`} size={160} level="M" includeMargin={true} />
                     </div>
                     <p style={{ color: theme.textSub, fontSize: '13px', marginTop: '20px', maxWidth: '300px', lineHeight: '1.6', marginInline: 'auto' }}>Quét mã QR để chiếu AR. Bạn có thể vuốt để <b>chuyển đổi qua lại</b>!</p>
                  </div>
                ) : viewMode === 'tour' && activeMonu.tourUrl ? (
                  <div style={{ width: '100%', height: '100%', padding: '0 20px 20px 20px', boxSizing: 'border-box' }}><iframe title="Virtual Tour" src={activeMonu.tourUrl} width="100%" height="100%" frameBorder="0" allowFullScreen allow="xr-spatial-tracking" style={{ borderRadius: '16px', background: '#111' }} /></div>
                ) : viewMode !== 'game' && viewMode !== 'hex' && viewMode !== 'npc' && viewMode !== 'mask' && viewMode !== 'hand' && currentMainModelPath && isSketchfab(currentMainModelPath) ? (
                  <div style={{ width: '100%', height: '100%', padding: '0 20px 20px 20px', boxSizing: 'border-box' }}><iframe title="Sketchfab Model" src={getSketchfabEmbedUrl(currentMainModelPath)} width="100%" height="100%" frameBorder="0" allowFullScreen allow="autoplay; fullscreen; xr-spatial-tracking" style={{ borderRadius: '16px', background: '#111' }} /></div>
                ) : viewMode !== 'game' && viewMode !== 'hex' && viewMode !== 'npc' && viewMode !== 'mask' && viewMode !== 'hand' ? (
                  <Canvas camera={{ position: [0, 1.2, 5.5], fov: 45 }} shadows>
                    <ambientLight intensity={1.5} /><directionalLight position={[10, 10, 10]} intensity={1.5} />
                    <Suspense fallback={<Html center={true as any}><div style={{color: theme.textMain, fontWeight:600}}>Đang tải 3D...</div></Html>}>
                      {currentMainModelPath ? <ErrorBoundary><HistoricalModel key={activeMonu.id + viewMode + currentMainModelPath} path={currentMainModelPath} onMeshClick={setSelectedMeshName} customScale={modelScaleMultiplier} /></ErrorBoundary> : <Html center={true as any}><div style={{color: theme.textSub, fontSize:'14px'}}>Chưa có file mô hình.</div></Html>}
                      <Environment preset="city" />
                    </Suspense>
                    <OrbitControls 
                      ref={controlsRef} 
                      makeDefault 
                      enableDamping={true} 
                      dampingFactor={0.05}
                      autoRotate={isAutoRotating} 
                      autoRotateSpeed={hologramSpeed}
                      enableZoom={true}
                      enablePan={true}
                      screenSpacePanning={true}
                      panSpeed={1.0}
                      minDistance={0.05}
                      maxDistance={250}
                      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
                    />
                  </Canvas>
                ) : null}
              </div>

              {/* Bottom Gallery Dock */}
              {viewMode !== 'tour' && viewMode !== 'ar' && viewMode !== 'game' && viewMode !== 'hex' && viewMode !== 'npc' && viewMode !== 'mask' && viewMode !== 'hand' && (
                <div className="cas-gallery-section">
                  <div className="section-label">
                    <span>ẢNH TƯ LIỆU ({currentGallery.length})</span>
                    {role === 'admin' && <button className="admin-add-btn" onClick={handleAddImage}>+ Thêm ảnh</button>}
                  </div>
                  <div className="gallery-grid">
                    {currentGallery.map((img: any) => (
                      <div key={img.id} className={`gallery-item ${draggedImgId === img.id ? 'dragging' : ''}`} onClick={() => { setSelectedImage(img); setModalTab(img.modelPath ? '3d' : (img.videoUrl ? 'video' : 'image')); }} draggable={role === 'admin'} onDragStart={(e) => { if (role === 'admin') { setDraggedImgId(img.id); e.dataTransfer.effectAllowed = 'move'; } }} onDragOver={(e) => { if (role === 'admin') e.preventDefault(); }} onDrop={(e) => { if (role === 'admin') handleDropImage(e, img.id); }} onDragEnd={() => setDraggedImgId(null)}>
                        <img src={img.url} alt={img.title} draggable={false} onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80' }} />
                        <span>{img.title}</span>
                        {img.videoUrl && <div className="badge-video">▶ VIDEO</div>}
                        {img.modelPath && <div className="badge-3d" style={{ left: img.videoUrl ? '65px' : '6px' }}>3D</div>}
                        {role === 'admin' && <button className="delete-img-btn" onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }}>×</button>}
                      </div>
                    ))}
                    {currentGallery.length === 0 && <p style={{ color: '#94a3b8', fontSize: '12px' }}>Chưa có hình ảnh nào được tải lên.</p>}
                  </div>
                </div>
              )}
            </section>

            {/* Right Sidebar: Details & Specs */}
            {viewMode !== 'npc' && viewMode !== 'mask' && viewMode !== 'hand' && (
              <aside className="cas-sidebar-right" style={{ display: 'flex', flexDirection: 'column' }}>
                {selectedMeshName && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    <button onClick={() => { setSelectedMeshName(''); controlsRef.current?.reset(); setModelScaleMultiplier(1); }} className="back-btn" style={{ margin: 0, flex: 1 }} title="Căn giữa lại toàn cảnh mô hình">← Xem toàn cảnh</button>
                    {role === 'admin' && activeMonu.meshData && activeMonu.meshData[selectedMeshName] && <button onClick={() => handleDeleteMeshData(selectedMeshName)} className="btn-outline outline-dark" style={{ borderColor: '#ef4444', color: '#ef4444', padding: '0 12px' }}>🗑️ Xóa</button>}
                  </div>
                )}

                {/* Clean Part Inspector (Replaces ugly yellow box) */}
                {role === 'admin' && selectedMeshName && (!activeMonu.meshData || !activeMonu.meshData[selectedMeshName]) && (
                  <div className="admin-mesh-catcher">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong>🛠️ Bộ phận đang chọn:</strong>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Chưa có bài giảng</span>
                    </div>
                    <code>{selectedMeshName}</code>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 10px 0' }}>Bấm nút dưới để tạo mục kiến thức riêng cho bộ phận này.</p>
                    <button className="admin-add-btn" style={{ width: '100%', padding: '8px 12px', justifyContent: 'center' }} onClick={() => handleCreateMeshData(selectedMeshName)}>+ Tạo Bài Giảng</button>
                  </div>
                )}

                <div className="detail-panel" style={{ display: 'flex', flexDirection: 'column', flex: expandedSpec ? 1 : 'none' }}>
                  {!expandedSpec && (
                    <div className="section-label">
                      {role === 'admin' && selectedMeshName && activeMonu.meshData && activeMonu.meshData[selectedMeshName] ? (
                        <input className="admin-spec-input" style={{ width: '100%', marginBottom: '4px', fontSize: '11px' }} value={currentInfo.title} onChange={e => handleUpdateMeshTitle(e.target.value)} />
                      ) : (
                        <span>{currentInfo.title}</span>
                      )}
                    </div>
                  )}

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
                                <>
                                  <input className="admin-spec-input" style={{ fontSize: '10.5px', marginBottom: '2px', width: '90%' }} value={spec.title} onClick={e => e.stopPropagation()} onChange={e => handleUpdateSpec(spec.id, 'title', e.target.value)} />
                                  <input className="admin-spec-input" style={{ width: '90%' }} value={spec.summary} onClick={e => e.stopPropagation()} onChange={e => handleUpdateSpec(spec.id, 'summary', e.target.value)} />
                                </>
                              ) : (
                                <>
                                  <span className="spec-title">{spec.title}</span>
                                  <span className="spec-summary">{spec.summary}</span>
                                </>
                              )}
                            </div>
                            <div className="expand-icon">{isExpanded ? '✕' : '+'}</div>
                          </div>
                          {isExpanded && (
                            <div className="spec-full-text">
                              {spec.fullText.map((paragraph: string, index: number) => role === 'admin' ? (
                                <textarea key={index} className="admin-spec-textarea" value={paragraph} onChange={e => handleUpdateSpec(spec.id, 'fullText', e.target.value, index)} />
                              ) : (
                                <p key={index} className="spec-paragraph">{paragraph}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {role === 'admin' && !expandedSpec && <button className="admin-add-btn" style={{ marginTop: '4px', padding: '8px 12px', justifyContent: 'center' }} onClick={handleAddSpecCard}>+ Thêm Thẻ Thông Số</button>}
                  </div>
                </div>

                {!expandedSpec && (
                  <div className="notes-panel" style={{ marginTop: '20px' }}>
                    <div className="section-label">GHI CHÚ MỞ RỘNG</div>
                    {role === 'admin' && (selectedMeshName === '' || (activeMonu.meshData && activeMonu.meshData[selectedMeshName])) ? (
                      <textarea className="admin-textarea" value={currentInfo.historyNotes} onChange={(e) => handleUpdateNotes(e.target.value)} placeholder="Nhập ghi chú hoặc tư liệu lịch sử mở rộng..." />
                    ) : (
                      <p className="spec-paragraph" style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6' }}>{currentInfo.historyNotes || 'Chưa có ghi chú bổ sung.'}</p>
                    )}
                  </div>
                )}
              </aside>
            )}
          </main>

          {/* 🔮 MÀN HÌNH CHIẾU HOLOGRAM NGOẠI VI (HOLOGRAM PROJECTION & TURNTABLE FULLSCREEN) */}
          {isHologramMode && (
            <div 
              className={`fixed inset-0 z-[999999] flex flex-col justify-between select-none transition-colors duration-500 ${
                !isHologramUIVisible ? 'cursor-none' : 'cursor-default'
              } ${
                hologramBg === 'pure-black' 
                  ? 'bg-black' 
                  : hologramBg === 'grid' 
                    ? 'bg-[#030712]' 
                    : 'bg-zinc-950'
              }`}
              onMouseMove={resetHologramIdleTimer}
              onTouchStart={resetHologramIdleTimer}
              onClick={resetHologramIdleTimer}
            >
              {/* 3D Hologram Canvas */}
              <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 1.0, 5.0], fov: 45 }}>
                  <ambientLight intensity={hologramBg === 'pure-black' ? 2.0 : 1.4} />
                  <directionalLight position={[10, 15, 10]} intensity={2.2} />
                  <directionalLight position={[-10, 10, -10]} intensity={1.2} />
                  <Suspense fallback={<Html center><div className="text-white text-xs font-mono tracking-widest animate-pulse">CHUẨN BỊ CHIẾU HOLOGRAM...</div></Html>}>
                    {currentMainModelPath ? (
                      <HistoricalModel path={currentMainModelPath} onMeshClick={() => {}} customScale={modelScaleMultiplier} />
                    ) : (
                      <Html center><div className="text-zinc-500">Chưa có file 3D để chiếu</div></Html>
                    )}
                    {hologramBg !== 'pure-black' && <Environment preset="city" />}
                  </Suspense>
                  <OrbitControls 
                    ref={holoControlsRef}
                    makeDefault
                    enableDamping={true} 
                    dampingFactor={0.05}
                    autoRotate={isAutoRotating} 
                    autoRotateSpeed={hologramSpeed}
                    enablePan={true}
                    screenSpacePanning={true}
                    panSpeed={1.0}
                    enableZoom={true}
                    minDistance={0.05}
                    maxDistance={250}
                    touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
                  />
                </Canvas>

                {/* Optional Cyber Grid Floor */}
                {hologramBg === 'grid' && (
                  <div className="absolute inset-0 pointer-events-none opacity-30 bg-[linear-gradient(to_right,#06b6d420_1px,transparent_1px),linear-gradient(to_bottom,#06b6d420_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
                )}
              </div>

              {/* Top HUD Bar */}
              <div className={`relative z-10 p-5 sm:p-6 flex items-center justify-between transition-opacity duration-700 ${
                isHologramUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                    <span>HOLOGRAM PROJECTION 360°</span>
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-white text-sm font-bold tracking-tight">{activeMonu.name}</span>
                    <span className="text-zinc-400 text-[11px] font-mono">{activeMonu.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer backdrop-blur-md shadow-lg"
                    onClick={handleExitHologram}
                  >
                    ✕ Thoát [Esc]
                  </button>
                </div>
              </div>

              {/* Bottom HUD Bar */}
              <div 
                className={`relative z-10 p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-3 transition-opacity duration-700 ${
                  isHologramUIVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {/* Left: Rotation speed & pause controls */}
                <div 
                  className="flex items-center gap-2 bg-black/75 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full shadow-2xl"
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <button 
                    type="button" 
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isAutoRotating ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-zinc-300 hover:text-white'
                    }`}
                    onClick={(e) => { e.stopPropagation(); setIsAutoRotating(!isAutoRotating); }}
                  >
                    {isAutoRotating ? '⏸ Tạm dừng' : '▶ Tự xoay'}
                  </button>

                  <div className="h-4 w-px bg-white/10 mx-1"></div>

                  <span className="text-[11px] text-zinc-400 font-mono">TỐC ĐỘ:</span>
                  {[0.5, 1, 2, 4].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                        hologramSpeed === spd ? 'bg-cyan-500 text-black font-bold shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                      onClick={(e) => { e.stopPropagation(); setHologramSpeed(spd); setIsAutoRotating(true); }}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Center: Glitch-Free Scale / Zoom Slider for Hologram */}
                <div 
                  className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-cyan-500/40 px-4 py-2 rounded-full shadow-2xl"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <span className="text-[11px] text-cyan-400 font-mono font-semibold">THU PHÓNG:</span>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModelScaleMultiplier(prev => Math.max(0.05, Number((prev - 0.1).toFixed(2))));
                      resetHologramIdleTimer();
                    }}
                    className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                    title="Thu nhỏ mô hình"
                  >
                    −
                  </button>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="4.0" 
                    step="0.05" 
                    value={modelScaleMultiplier} 
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      setModelScaleMultiplier(parseFloat(e.target.value));
                      resetHologramIdleTimer();
                    }}
                    className="w-24 sm:w-32 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    title={`Thu phóng: ${Math.round(modelScaleMultiplier * 100)}%`}
                  />
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModelScaleMultiplier(prev => Math.min(4.0, Number((prev + 0.1).toFixed(2))));
                      resetHologramIdleTimer();
                    }}
                    className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                    title="Phóng to mô hình"
                  >
                    +
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModelScaleMultiplier(1);
                      holoControlsRef.current?.reset();
                      resetHologramIdleTimer();
                    }}
                    className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
                    title="Đặt lại kích thước gốc 100% và căn giữa"
                  >
                    {Math.round(modelScaleMultiplier * 100)}%
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      holoControlsRef.current?.reset();
                      setModelScaleMultiplier(1);
                      resetHologramIdleTimer();
                    }}
                    className="px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    title="Căn giữa lại mô hình về tâm màn hình"
                  >
                    <span>🎯 Căn giữa</span>
                  </button>
                </div>

                {/* Right: Background mode selector */}
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full shadow-2xl">
                  <span className="text-[11px] text-zinc-400 font-mono">NỀN:</span>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer ${
                      hologramBg === 'pure-black' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                    onClick={() => setHologramBg('pure-black')}
                    title="Nền đen tuyệt đối tối ưu cho thiết bị chiếu Hologram ngoại vi"
                  >
                    Đen 100% (Hologram)
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer ${
                      hologramBg === 'grid' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                    onClick={() => setHologramBg('grid')}
                  >
                    Lưới Cyber
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-full text-xs transition-all cursor-pointer ${
                      hologramBg === 'studio' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                    onClick={() => setHologramBg('studio')}
                  >
                    Studio
                  </button>
                </div>

                <div className="text-zinc-400 text-[11px] font-mono hidden lg:block bg-black/50 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                  Tự động ẩn thanh công cụ sau 3s • Nhấn Phím cách (Space) để dừng/xoay
                </div>
              </div>
            </div>
          )}
        

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
{/*Hộ chiếu*/}
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

      {showRlsHelpModal && (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(245,158,11,0.2)] text-left relative">
            <button 
              type="button"
              onClick={() => setShowRlsHelpModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 text-xl">🛡️</span>
              <div>
                <h3 className="text-white text-base font-bold">Cần mở quyền ghi Supabase (RLS Fix)</h3>
                <p className="text-xs text-amber-300/80 font-mono">Mã lỗi 42501: Row Level Security</p>
              </div>
            </div>

            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mb-4">
              Máy chủ Supabase đã kết nối thành công! Tuy nhiên, bảng <code className="text-amber-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">heritage_lessons</code> đang bật bảo mật cấp dòng (RLS) nhưng chưa cấp quyền ghi cho khóa Anon công khai.
            </p>

            <div className="bg-black/60 rounded-2xl p-4 border border-white/10 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-zinc-400">CHẠY LỆNH NÀY TẠI SUPABASE SQL EDITOR:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('ALTER TABLE heritage_lessons DISABLE ROW LEVEL SECURITY;');
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2500);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold border border-amber-500/30 transition-all cursor-pointer"
                >
                  {copiedSql ? '✅ Đã sao chép!' : '📋 Sao chép lệnh'}
                </button>
              </div>
              <pre className="text-cyan-300 font-mono text-xs overflow-x-auto select-all">ALTER TABLE heritage_lessons DISABLE ROW LEVEL SECURITY;</pre>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-5 text-[11px] text-emerald-300">
              🔒 <b>Yên tâm:</b> Toàn bộ bài học của bạn hiện <b>đã được lưu an toàn</b> vào bộ nhớ máy này (Local Storage), dữ liệu không bao giờ bị mất!
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <a 
                href="https://supabase.com/dashboard/project/panphxziqtkvtjffwhlc/editor" 
                target="_blank" 
                rel="noreferrer"
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold text-center border border-white/10 transition-all"
              >
                🔗 Mở Supabase SQL Editor ↗
              </a>
              <button
                type="button"
                onClick={() => {
                  setShowRlsHelpModal(false);
                  handleSaveToCloud();
                }}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold text-center transition-all shadow-md cursor-pointer"
              >
                ⚡ Thử lưu Cloud lại
              </button>
            </div>
          </div>
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