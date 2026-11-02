/**
 * BỘ LỌC TỪ NGỮ BẬY, THÔ TỤC & PHẠM THUẦN PHONG MỸ TỤC (VIETNAMESE PROFANITY & ANTI-SLOP FILTER)
 * Thiết kế chuyên biệt cho môi trường giáo dục Lịch sử Lớp 10.
 * Phân biệt chính xác giữa từ thô tục và từ ngữ học thuật tiếng Việt thông thường.
 */

// 1. Các từ ngữ có dấu luôn là từ thô tục, chửi thề (không bao giờ dùng trong bài học)
const ACCENTED_PROFANITY: string[] = [
  'cặc', 'lồn', 'địt', 'buồi', 'đụ', 'đĩ', 'điếm', 'đéo', 
  'chó đẻ', 'khốn nạn', 'mất dạy', 'óc chó', 'chết tiệt', 
  'đậu má', 'đụ má', 'đụ mẹ', 'địt mẹ', 'địt cụ', 'thằng chó', 
  'mẹ kiếp', 'đồ chó', 'đồ khốn', 'khiêu dâm', 'dâm ô', 'thủ dâm', 
  'bú cu', 'chịch', 'xoạc', 'hãm lồn', 'xàm lồn', 'bố mày'
];

// 2. Các từ viết tắt / tiếng lóng thô tục phổ biến (Teen-code chửi bậy)
const SLANG_PROFANITY: string[] = [
  'đm', 'dm', 'đmm', 'dmm', 'dcm', 'đcm', 'dkm', 'đkm', 
  'vcl', 'vkl', 'vl', 'clgt', 'đậu má', 'đù má', 'như cc', 'nhu cc',
  'cái cc', 'cai cc', 'đéo', 'deo me', 'deo can', 'deo biet'
];

// 3. Các cụm từ không dấu vi phạm thuần phong mỹ tục (tối thiểu 2 từ để tránh hiểu nhầm từ đơn)
const NORMALIZED_PHRASES: string[] = [
  'con di', 'lu di', 'do di', 'di me', 'dit me', 'du me', 'du ma', 
  'dau ma', 'dit cu', 'buoi me', 'lon me', 'an cac', 'con cac', 
  'cai cac', 'cai lon', 'cho de', 'mat day', 'oc cho', 'do cho', 
  'thang cho', 'suc vat', 'khon nan', 'bu cu', 'chet tiet', 'dam o',
  'khong day', 'ngu vcl', 'ngu vl'
];

// 4. Từ ngữ tiếng Anh thô tục
const ENGLISH_PROFANITY: string[] = [
  'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 
  'pussy', 'bastard', 'motherfucker', 'stfu', 'bullshit'
];

/**
 * Chuẩn hóa chuỗi tiếng Việt không dấu, loại bỏ khoảng trắng và ký tự đặc biệt thừa
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[@#\$%\^&\*\(\)_\+\-=\[\]\{\};':"\\|,.<>\/?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Kiểm tra bình luận học sinh
 */
export function checkProfanity(rawText: string): {
  isValid: boolean;
  flaggedWord?: string;
  reason?: string;
} {
  if (!rawText || !rawText.trim()) {
    return { isValid: false, reason: 'Nội dung bình luận không được để trống.' };
  }

  const rawLower = rawText.toLowerCase();
  const normalized = normalizeText(rawText);

  // 1. Kiểm tra từ thô tục tiếng Việt có dấu
  for (const word of ACCENTED_PROFANITY) {
    const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9_à-ỹÀ-Ỹ])${word}($|\\s|[^a-zA-Z0-9_à-ỹÀ-Ỹ])`, 'i');
    if (regex.test(rawLower)) {
      return {
        isValid: false,
        flaggedWord: word,
        reason: 'Bình luận có chứa từ ngữ chưa chuẩn mực hoặc vi phạm thuần phong mỹ tục học đường.'
      };
    }
  }

  // 2. Kiểm tra tiếng lóng / viết tắt (Teen-code)
  for (const slang of SLANG_PROFANITY) {
    const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9_à-ỹÀ-Ỹ])${slang}($|\\s|[^a-zA-Z0-9_à-ỹÀ-Ỹ])`, 'i');
    if (regex.test(rawLower) || regex.test(normalized)) {
      return {
        isValid: false,
        flaggedWord: slang,
        reason: 'Bình luận có chứa từ viết tắt thô tục không phù hợp trong môi trường giáo dục.'
      };
    }
  }

  // 3. Kiểm tra cụm từ không dấu vi phạm
  for (const phrase of NORMALIZED_PHRASES) {
    if (normalized.includes(phrase)) {
      return {
        isValid: false,
        flaggedWord: phrase,
        reason: 'Bình luận có chứa cụm từ vi phạm chuẩn mực văn hóa ứng xử học đường.'
      };
    }
  }

  // 4. Kiểm tra tiếng Anh thô tục
  for (const word of ENGLISH_PROFANITY) {
    const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9_])${word}($|\\s|[^a-zA-Z0-9_])`, 'i');
    if (regex.test(rawLower)) {
      return {
        isValid: false,
        flaggedWord: word,
        reason: 'Bình luận có chứa từ ngữ tiếng Anh thô tục không chuẩn mực.'
      };
    }
  }

  return { isValid: true };
}
