import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wand2,
  Download,
  Share2,
  RotateCcw,
  ShoppingBag,
  Type,
  Eye,
  Check,
  Sparkles,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { useToast } from '../context/ToastContext';
import {
  CuteHeart,
  CuteFlower,
  CuteSparkle,
  CuteSectionDivider,
  CardCornerDoodle,
  BrandWordmark,
} from '../components/ui/Decorations';

export interface QuizOptionConfig {
  label: string;
  sublabel: string;
  personaKey: 'baitoey' | 'chocopink' | 'milkystar' | 'brownienote';
}

export interface QuizQuestionConfig {
  id: number;
  question: string;
  options: QuizOptionConfig[];
}

export interface QuizPersonaResultConfig {
  key: 'baitoey' | 'chocopink' | 'milkystar' | 'brownienote';
  title: string;
  badge: string;
  description: string;
  sampleQuote: string;
  matchedFontFamily: string;
  matchedProductSlug: string;
}

export interface FontQuizConfig {
  heading: string;
  subheading: string;
  questions: QuizQuestionConfig[];
  personas: QuizPersonaResultConfig[];
}

export const DEFAULT_FONT_QUIZ_CONFIG: FontQuizConfig = {
  heading: 'แบบทดสอบ “ฟอนต์ไหนคือคุณ?”',
  subheading:
    'ตอบคำถามสั้น ๆ 4 ข้อ แล้วค้นหาฟอนต์ลายมือประจำตัวที่เข้ากับคาแรกเตอร์แบรนด์ของคุณที่สุด ♡',
  questions: [
    {
      id: 1,
      question: '1. สไตล์ร้านหรือตัวตนของคุณให้ฟีลแบบไหนมากที่สุดคะ?',
      options: [
        {
          label: 'สดใส น่ารักปุ๊กปิ๊ก เป็นกันเองเหมือนคุยกับเพื่อนสนิท ♡',
          sublabel: 'โทนพาสเทล อบอุ่น เข้าถึงง่าย',
          personaKey: 'baitoey',
        },
        {
          label: 'มินิมอล คลีน ๆ สไตล์คาเฟ่เกาหลี เรียบแต่ดูแพง ✿',
          sublabel: 'จัดวางโปร่ง สบายตา มีเทสต์',
          personaKey: 'chocopink',
        },
        {
          label: 'โดดเด่น สะดุดตา มีพลัง เห็นมาแต่ไกล ✦',
          sublabel: 'ชอบทำป้ายโปรโมชันหรือคอนเทนต์ปัง ๆ',
          personaKey: 'milkystar',
        },
        {
          label: 'เป็นระเบียบ เรียบร้อย ใส่ใจรายละเอียดทุกบรรทัด',
          sublabel: 'ชอบจดสรุป แจ้งข้อมูลชัดเจน อ่านง่ายที่สุด',
          personaKey: 'brownienote',
        },
      ],
    },
    {
      id: 2,
      question: '2. ถ้าเปรียบฟอนต์เป็นเมนูโปรดในคาเฟ่ คุณจะเลือกเมนูไหน?',
      options: [
        {
          label: 'สตรอว์เบอร์รีมิลก์เชค วิปครีมฟู ๆ โรยหัวใจ',
          sublabel: 'หวานละมุน นุ่มนิ่ม น่าเอ็นดู',
          personaKey: 'baitoey',
        },
        {
          label: 'ไอซ์ลาเต้แก้วใสในร้านโทนไม้และแสงแดดอุ่น ๆ',
          sublabel: 'กลมกล่อม เรียบเท่ ไม่ซับซ้อน',
          personaKey: 'chocopink',
        },
        {
          label: 'โซดาพีชเลมอนซ่า ๆ ตกแต่งผลไม้สีสดใส',
          sublabel: 'สดชื่น มีชีวิตชีวา ดึงดูดสายตา',
          personaKey: 'milkystar',
        },
        {
          label: 'บราวนี่ดาร์กช็อกโกแลตอุ่น ๆ คู่กับชาร้อน',
          sublabel: 'อบอุ่น น่าเชื่อถือ อยู่ด้วยแล้วสบายใจ',
          personaKey: 'brownienote',
        },
      ],
    },
    {
      id: 3,
      question: '3. คุณตั้งใจจะนำฟอนต์ไปใช้กับงานแบบไหนบ่อยที่สุดคะ?',
      options: [
        {
          label: 'แต่งรูปสินค้า ป้ายขอบคุณลูกค้า สตอรี่ IG น่ารัก ๆ',
          sublabel: 'เน้นความคิวท์ให้ลูกค้าหลงรักร้าน',
          personaKey: 'baitoey',
        },
        {
          label: 'ทำโลโก้ตัวอักษร ลายน้ำร้าน หรือปกคลิปคุมโทนมินิมอล',
          sublabel: 'เน้นภาพลักษณ์แบรนด์ที่ดูคลีนและทันสมัย',
          personaKey: 'chocopink',
        },
        {
          label: 'ทำพาดหัวป้ายโปรโมชัน ป้ายไลฟ์สด หรือ Rich Menu เด่น ๆ',
          sublabel: 'เน้นตัวอักษรใหญ่ ชัดเจน กดสั่งซื้อง่าย',
          personaKey: 'milkystar',
        },
        {
          label: 'ทำป้ายกฎกติกา ป้ายแจ้งเลขพัสดุ หรือสรุปข้อมูลยาว ๆ',
          sublabel: 'เน้นอ่านสบายตาแม้ข้อความเยอะ',
          personaKey: 'brownienote',
        },
      ],
    },
    {
      id: 4,
      question: '4. เวลาลูกค้าเห็นงานของคุณ อยากให้เขารู้สึกอย่างไรเป็นอันดับแรก?',
      options: [
        {
          label: '“งื้ออ ร้านนี้น่ารักจังเลย แม่ค้าใจดีแน่ ๆ ♡”',
          sublabel: 'สร้างรอยยิ้มและความประทับใจแรกพบ',
          personaKey: 'baitoey',
        },
        {
          label: '“ร้านนี้คุมโทนสวยมาก ดูเป็นมืออาชีพสุด ๆ”',
          sublabel: 'เรียบง่ายแต่มีเอกลักษณ์น่าจดจำ',
          personaKey: 'chocopink',
        },
        {
          label: '“โปรโมชันน่าสนใจมาก ต้องรีบทักแชตสั่งแล้ว!”',
          sublabel: 'กระตุ้นยอดขายและดึงโฟกัสได้ทันที',
          personaKey: 'milkystar',
        },
        {
          label: '“ข้อมูลครบถ้วน อ่านเข้าใจง่าย สั่งซื้อสบายใจ”',
          sublabel: 'ชัดเจน จริงใจ และเป็นระเบียบ',
          personaKey: 'brownienote',
        },
      ],
    },
  ],
  personas: [
    {
      key: 'baitoey',
      title: 'สายคิวท์ละมุน • PKZ Baitoey (ใบเตย)',
      badge: 'Cute & Friendly Soul ♡',
      description:
        'คุณคือเจ้าของแบรนด์สายอบอุ่นที่เป็นมิตรและใส่ใจความรู้สึกของลูกค้า ฟอนต์หัวกลมปุ๊กปิ๊กสระไม่ลอยอย่าง PKZ Baitoey จะช่วยเติมความสดใสให้งานของคุณน่าเอ็นดูขึ้นทันที!',
      sampleQuote: '“ขอบคุณทุกออเดอร์เลยนะคะ ขอให้วันนี้เป็นวันที่สดใสเหมือนรอยยิ้มของคุณน้า ♡”',
      matchedFontFamily: 'PKZ Baitoey',
      matchedProductSlug: 'font-pkz-baitoey',
    },
    {
      key: 'chocopink',
      title: 'สายมินิมอลคาเฟ่ • PKZ Choco Pink (ช็อกโกพิงค์)',
      badge: 'Minimal Cafe Aesthetic ✿',
      description:
        'คุณหลงรักความเรียบง่ายที่ดูดีมีสไตล์ ไม่ชอบอะไรที่รกตา ฟอนต์เส้นคลีนละมุนอย่าง PKZ Choco Pink จึงเป็นคู่แท้ที่ช่วยยกระดับภาพสินค้าและลายน้ำร้านให้ดูคุมโทนเกาหลีเกาใจที่สุดค่ะ',
      sampleQuote: '“ความเรียบง่ายที่ใส่ใจในทุกรายละเอียด คือเสน่ห์ที่ไม่มีวันเอาต์ ✿”',
      matchedFontFamily: 'PKZ Choco Pink',
      matchedProductSlug: 'font-pkz-choco-pink',
    },
    {
      key: 'milkystar',
      title: 'สายพาดหัวสุดปัง • PKZ Milky Star (มิลกี้สตาร์)',
      badge: 'Shining Headline Star ✦',
      description:
        'คุณมีพลังความสร้างสรรค์เต็มเปี่ยมและชอบทำคอนเทนต์ที่ดึงดูดสายตาตั้งแต่วินาทีแรก ฟอนต์พาดหัวเส้นอวบชัดอย่าง PKZ Milky Star จะช่วยให้ป้ายโปรโมชันและปกคลิปของคุณโดดเด่นกว่าใคร!',
      sampleQuote: '“เปล่งประกายในแบบของตัวเอง แล้วทุกสายตาจะหยุดอยู่ที่แบรนด์ของคุณ ✦”',
      matchedFontFamily: 'PKZ Milky Star',
      matchedProductSlug: 'font-pkz-milky-star',
    },
    {
      key: 'brownienote',
      title: 'สายเนี๊ยบอบอุ่น • PKZ Brownie Note (บราวนี่โน้ต)',
      badge: 'Cozy & Organized Note ♡',
      description:
        'คุณเป็นคนละเอียดอ่อน รักความเป็นระเบียบ และอยากให้ลูกค้าอ่านข้อมูลได้สบายตาที่สุด ฟอนต์ลายมือจดสรุปอย่าง PKZ Brownie Note จึงเหมาะกับทั้งป้ายรายละเอียดสินค้าและโน้ตขอบคุณค่ะ',
      sampleQuote: '“ทุกตัวอักษรที่เรียงร้อยอย่างตั้งใจ คือความจริงใจที่ส่งถึงมือลูกค้าเสมอ ♡”',
      matchedFontFamily: 'PKZ Brownie Note',
      matchedProductSlug: 'font-pkz-brownie-note',
    },
  ],
};

export const FontQuizPage: React.FC = () => {
  const { settings, fonts, products, addToOrderCart } = useSite();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const quizConfig = useMemo<FontQuizConfig>(() => {
    try {
      if (settings.font_quiz_json) {
        const parsed = JSON.parse(settings.font_quiz_json);
        if (
          parsed &&
          Array.isArray(parsed.questions) &&
          parsed.questions.length > 0 &&
          Array.isArray(parsed.personas) &&
          parsed.personas.length > 0
        ) {
          return parsed;
        }
      }
    } catch {
      // fallback to default
    }
    return DEFAULT_FONT_QUIZ_CONFIG;
  }, [settings.font_quiz_json]);

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, QuizOptionConfig['personaKey']>>({});
  const [finished, setFinished] = useState<boolean>(false);
  const [savingImage, setSavingImage] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  // โหลด @font-face ของร้านทั้งหมดเพื่อใช้แสดงผลการ์ดผลลัพธ์
  useEffect(() => {
    const styleId = 'pkz-quiz-font-faces';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const rules = fonts
      .map(
        (font) => `
      @font-face {
        font-family: '${font.family_name}';
        src: url('${font.file_url}');
        font-display: swap;
      }
    `
      )
      .join('\n');

    styleEl.textContent = rules;
  }, [fonts]);

  const activeQuestions = quizConfig.questions;
  const currentQ = activeQuestions[currentQuestionIdx] || activeQuestions[0];

  const handleSelectOption = (personaKey: QuizOptionConfig['personaKey']) => {
    const nextAnswers = { ...answers, [currentQ.id]: personaKey };
    setAnswers(nextAnswers);

    if (currentQuestionIdx + 1 < activeQuestions.length) {
      setCurrentQuestionIdx((prev) => prev + 1);
    } else {
      setFinished(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRestart = () => {
    setAnswers({});
    setCurrentQuestionIdx(0);
    setFinished(false);
  };

  // คำนวณผลลัพธ์ฟอนต์ที่ตรงกับคำตอบมากที่สุด
  const winningPersona = useMemo<QuizPersonaResultConfig>(() => {
    const counts: Record<string, number> = {
      baitoey: 0,
      chocopink: 0,
      milkystar: 0,
      brownienote: 0,
    };
    Object.values(answers).forEach((key) => {
      counts[key] = (counts[key] || 0) + 1;
    });

    let bestKey: QuizPersonaResultConfig['key'] = 'baitoey';
    let bestScore = -1;
    (Object.keys(counts) as Array<QuizPersonaResultConfig['key']>).forEach((k) => {
      if (counts[k] > bestScore) {
        bestScore = counts[k];
        bestKey = k;
      }
    });

    return (
      quizConfig.personas.find((p) => p.key === bestKey) || quizConfig.personas[0]
    );
  }, [answers, quizConfig.personas]);

  // ค้นหาข้อมูลฟอนต์และสินค้าจริงจากฐานข้อมูลของร้าน
  const matchedFont = useMemo(() => {
    return (
      fonts.find(
        (f) =>
          f.family_name.toLowerCase() === winningPersona.matchedFontFamily.toLowerCase() ||
          f.name.toLowerCase().includes(winningPersona.matchedFontFamily.toLowerCase())
      ) || fonts[0]
    );
  }, [fonts, winningPersona]);

  const matchedProduct = useMemo(() => {
    const fontProducts = products.filter((p) => p.category_type === 'font');
    return (
      fontProducts.find(
        (p) =>
          p.slug === winningPersona.matchedProductSlug ||
          p.title.toLowerCase().includes(winningPersona.matchedFontFamily.toLowerCase())
      ) ||
      (matchedFont?.product_id
        ? products.find((p) => p.id === matchedFont.product_id)
        : undefined) ||
      fontProducts[0]
    );
  }, [products, winningPersona, matchedFont]);

  // บันทึกการ์ดผลลัพธ์เป็นไฟล์รูปภาพ .PNG คมชัดสูงผ่าน HTML5 Canvas
  const handleDownloadResultImage = async () => {
    setSavingImage(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // พื้นหลังครีมชมพูละมุน
      const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
      grad.addColorStop(0, '#fff7fa');
      grad.addColorStop(1, '#fceef2');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);

      // กรอบสติกเกอร์สีขาวขอบน้ำตาลเข้ม
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#4a3228';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(70, 70, 940, 940, 56);
      ctx.fill();
      ctx.stroke();

      // เส้นประด้านใน
      ctx.strokeStyle = '#f3c6d3';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.roundRect(100, 100, 880, 880, 42);
      ctx.stroke();
      ctx.setLineDash([]);

      // ป้ายหัวข้อด้านบน
      ctx.fillStyle = '#fceef2';
      ctx.beginPath();
      ctx.roundRect(320, 145, 440, 54, 27);
      ctx.fill();
      ctx.fillStyle = '#ec7a9a';
      ctx.font = 'bold 24px Prompt, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('♥ ผลลัพธ์ “ฟอนต์ไหนคือคุณ” by qokhims', 540, 180);

      // ชื่อคาแรกเตอร์ผลลัพธ์
      ctx.fillStyle = '#4a3228';
      ctx.font = 'bold 42px Prompt, sans-serif';
      ctx.fillText(winningPersona.title, 540, 275);

      ctx.fillStyle = '#ec7a9a';
      ctx.font = 'bold 26px Prompt, sans-serif';
      ctx.fillText(winningPersona.badge, 540, 322);

      // กล่องตัวอย่างลายมือฟอนต์ที่แนะนำ
      ctx.fillStyle = '#fffaf8';
      ctx.strokeStyle = '#4a3228';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(150, 370, 780, 260, 34);
      ctx.fill();
      ctx.stroke();

      const fam = matchedFont?.family_name || winningPersona.matchedFontFamily;
      ctx.fillStyle = '#4a3228';
      ctx.font = `bold 44px '${fam}', Prompt, sans-serif`;
      ctx.fillText(matchedFont?.name || winningPersona.matchedFontFamily, 540, 455);

      ctx.fillStyle = '#7d5d50';
      ctx.font = `30px '${fam}', Prompt, sans-serif`;
      ctx.fillText(winningPersona.sampleQuote, 540, 535);

      ctx.fillStyle = '#ec7a9a';
      ctx.font = `bold 24px '${fam}', Prompt, sans-serif`;
      ctx.fillText('Aa Bb Cc 1234567890 ๑๒๓๔๕ ♥ ✿ ✦', 540, 592);

      // คำอธิบายบุคลิก (ตัดบรรทัดอัตโนมัติ)
      ctx.fillStyle = '#4a3228';
      ctx.font = '25px Prompt, sans-serif';
      const words = winningPersona.description.split(' ');
      let line = '';
      let y = 710;
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > 740) {
          ctx.fillText(line, 540, y);
          line = w;
          y += 40;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, 540, y);

      // ส่วนท้ายการ์ด
      ctx.fillStyle = '#7d5d50';
      ctx.font = 'bold 22px Prompt, sans-serif';
      ctx.fillText(
        `qokhims — ตัวอักษรคือตัวเอกของร้าน • IG: ${settings.contact_ig || 'qokhims'} • LINE: ${
          settings.contact_line || '@280npxvj'
        }`,
        540,
        930
      );

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `qokhims-font-quiz-${winningPersona.key}.png`;
      a.click();
      showToast('บันทึกการ์ดผลลัพธ์เป็นรูปภาพ (.PNG) เรียบร้อยแล้วค่ะ ♡', 'success');
    } catch {
      showToast('ไม่สามารถบันทึกรูปภาพได้ในขณะนี้ค่ะ', 'error');
    } finally {
      setSavingImage(false);
    }
  };

  // แชร์ผลลัพธ์หรือคัดลอกข้อความแชร์
  const handleShareResult = async () => {
    const shareText = `ผลแบบทดสอบ “ฟอนต์ไหนคือคุณ” จากร้าน qokhims คือ “${winningPersona.title}” ♡ ลองมาเล่นกันได้ที่ ${window.location.origin}/font-quiz`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ฟอนต์ไหนคือคุณ? — qokhims',
          text: shareText,
          url: `${window.location.origin}/font-quiz`,
        });
        return;
      } catch {
        // user cancelled or fallback
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      showToast('คัดลอกข้อความและลิงก์สำหรับแชร์เรียบร้อยแล้วค่ะ ♡', 'success');
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      showToast('ไม่สามารถคัดลอกลิงก์ได้', 'error');
    }
  };

  const handleOrderMatchedFont = (e: React.MouseEvent<HTMLButtonElement>) => {
    const price = matchedProduct?.price ?? matchedFont?.price ?? 159;
    const title = matchedProduct?.title ?? `ฟอนต์ ${matchedFont?.name || winningPersona.matchedFontFamily}`;
    addToOrderCart(
      {
        product_id: matchedProduct?.id ?? matchedFont?.product_id ?? null,
        product_title: title,
        category_type: 'font',
        quantity: 1,
        unit_price: price,
        item_note: 'มาจากผลลัพธ์แบบทดสอบ ฟอนต์ไหนคือคุณ ♡',
        image_url: matchedProduct?.image_url,
      },
      { clientX: e.clientX, clientY: e.clientY }
    );
    showToast(`เพิ่ม "${title}" ลงในตะกร้าแล้วค่ะ ♡ (ดูที่ตะกร้าด้านบนเมื่อพร้อมสั่งซื้อ)`, 'success');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      {/* ส่วนหัว */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[var(--color-primary-light)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-primary)]">
          <Wand2 className="w-3.5 h-3.5" />
          Signature Font Personality Quiz
        </span>
        <h1 className="text-2xl sm:text-4xl font-bold text-[var(--color-secondary)]">
          {quizConfig.heading}
        </h1>
        <p className="text-sm sm:text-base text-[var(--color-secondary-muted)] max-w-xl mx-auto">
          {quizConfig.subheading}
        </p>
        <CuteSectionDivider />
      </div>

      {!finished ? (
        /* การ์ดคำถาม 3-4 ข้อ */
        <div className="relative pkz-sticker-card rounded-[2.2rem] p-6 sm:p-9 space-y-6 animate-fade-in">
          <CardCornerDoodle variant="flower" position="top-right" />

          {/* แถบความคืบหน้า */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-secondary-muted)]">
              <span>
                คำถามข้อที่ {currentQuestionIdx + 1} จาก {activeQuestions.length}
              </span>
              <span className="text-[var(--color-primary)]">
                {Math.round(((currentQuestionIdx + 1) / activeQuestions.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[var(--color-primary-light)] overflow-hidden p-0.5 border border-[var(--color-border)]">
              <div
                style={{
                  width: `${((currentQuestionIdx + 1) / activeQuestions.length) * 100}%`,
                }}
                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
              />
            </div>
          </div>

          <h2 className="text-lg sm:text-2xl font-bold text-[var(--color-secondary)] leading-snug">
            {currentQ.question}
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(opt.personaKey)}
                className="group w-full text-left p-4 sm:p-5 rounded-2xl bg-[var(--color-bg)] hover:bg-[var(--color-primary-light)] border-1.5 border-[var(--color-border)] hover:border-[var(--color-primary)] transition flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-0.5">
                  <div className="text-sm sm:text-base font-bold text-[var(--color-secondary)] group-hover:text-[var(--color-primary)] transition">
                    {opt.label}
                  </div>
                  <div className="text-xs text-[var(--color-secondary-muted)]">
                    {opt.sublabel}
                  </div>
                </div>
                <span className="w-8 h-8 rounded-full bg-white border border-[var(--color-border)] group-hover:border-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <CuteHeart className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </span>
              </button>
            ))}
          </div>

          {currentQuestionIdx > 0 && (
            <div className="pt-2 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                className="text-[var(--color-secondary-muted)] hover:text-[var(--color-primary)] font-semibold cursor-pointer"
              >
                ← ย้อนกลับไปข้อก่อนหน้า
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="text-[var(--color-secondary-muted)] hover:text-[var(--color-primary)] font-semibold cursor-pointer"
              >
                เริ่มใหม่ตั้งแต่ต้น
              </button>
            </div>
          )}
        </div>
      ) : (
        /* การ์ดผลลัพธ์ฟอนต์ประจำตัว พร้อมปุ่มบันทึกเป็นรูป แชร์ และไปหน้าสินค้าฟอนต์นั้น */
        <div className="space-y-6 animate-fade-in">
          <div
            style={{ '--sticker-tilt': '0deg' } as React.CSSProperties}
            className="relative pkz-sticker-card rounded-[2.4rem] p-6 sm:p-10 text-center space-y-5 overflow-hidden"
          >
            <CardCornerDoodle variant="star" position="top-left" />
            <CardCornerDoodle variant="flower" position="bottom-right" />

            <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[var(--color-primary-light)] border border-[var(--color-border)] text-xs font-bold text-[var(--color-primary)]">
              <Sparkles className="w-3.5 h-3.5" />
              {winningPersona.badge}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--color-secondary-muted)]">
                ฟอนต์ประจำตัวที่เหมาะกับแบรนด์ของคุณที่สุดคือ...
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)]">
                {winningPersona.title}
              </h2>
            </div>

            {/* กล่องแสดงตัวอย่างฟอนต์จริงแบบสด */}
            <div className="rounded-3xl bg-[var(--color-bg)] border-2 border-dashed border-[var(--color-border)] p-6 sm:p-8 space-y-3 pkz-paper-dots">
              <div
                className="text-2xl sm:text-4xl font-bold text-[var(--color-secondary)]"
                style={{
                  fontFamily: `'${
                    matchedFont?.family_name || winningPersona.matchedFontFamily
                  }', 'Prompt', sans-serif`,
                }}
              >
                {matchedFont?.name || winningPersona.matchedFontFamily}
              </div>
              <p
                className="text-base sm:text-xl text-[var(--color-primary)] font-semibold leading-relaxed"
                style={{
                  fontFamily: `'${
                    matchedFont?.family_name || winningPersona.matchedFontFamily
                  }', 'Prompt', sans-serif`,
                }}
              >
                {winningPersona.sampleQuote}
              </p>
              <p
                className="text-xs sm:text-sm text-[var(--color-secondary-muted)]"
                style={{
                  fontFamily: `'${
                    matchedFont?.family_name || winningPersona.matchedFontFamily
                  }', 'Prompt', sans-serif`,
                }}
              >
                Aa Bb Cc 1234567890 ๑๒๓๔๕ ♥ ✿ ✦ สระไม่ลอย ใช้เชิงพาณิชย์ได้
              </p>
            </div>

            <p className="text-sm sm:text-base text-[var(--color-secondary-muted)] leading-relaxed max-w-xl mx-auto">
              {winningPersona.description}
            </p>

            {/* ปุ่มไปหน้าสินค้าฟอนต์นั้น / สั่งซื้อ / ทดลองพิมพ์ */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {matchedProduct && (
                <Link
                  to={`/products/${matchedProduct.slug || matchedProduct.id}`}
                  className="px-5 py-3 rounded-full bg-[var(--color-primary)] text-white text-xs sm:text-sm font-semibold hover:opacity-95 transition shadow-xs inline-flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  ดูรายละเอียดสินค้าฟอนต์นี้ (฿{matchedProduct.price})
                </Link>
              )}

              <button
                type="button"
                onClick={handleOrderMatchedFont}
                title="ใส่ตะกร้าไว้ก่อน"
                className="pkz-order-btn px-5 py-3 rounded-full bg-[var(--color-secondary)] text-[var(--color-bg)] text-xs sm:text-sm font-semibold hover:bg-[var(--color-primary)] hover:text-white transition shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                ใส่ฟอนต์นี้ลงตะกร้า
              </button>

              <Link
                to="/order"
                className="px-5 py-3 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-secondary)] text-xs sm:text-sm font-semibold hover:bg-[var(--color-primary-light)] transition shadow-xs inline-flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-[var(--color-primary)]" />
                ไปที่ตะกร้าสินค้า
              </Link>

              <Link
                to={`/font-tester?font=${encodeURIComponent(
                  matchedFont?.family_name || winningPersona.matchedFontFamily
                )}`}
                className="px-4 py-3 rounded-full bg-[var(--color-primary-light)] border border-[var(--color-border)] text-[var(--color-secondary)] text-xs sm:text-sm font-semibold hover:bg-[var(--color-primary)] hover:text-white transition inline-flex items-center gap-1.5"
              >
                <Type className="w-4 h-4" />
                ลองพิมพ์ชื่อร้านของคุณด้วยฟอนต์นี้
              </Link>
            </div>

            {/* ปุ่มบันทึกการ์ดเป็นรูปภาพ (.PNG) & แชร์ผลลัพธ์ */}
            <div className="pt-4 border-t border-[var(--color-border)]/80 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadResultImage}
                disabled={savingImage}
                className="px-4 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-secondary)] text-xs font-semibold hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>{savingImage ? 'กำลังสร้างรูปการ์ด...' : 'บันทึกการ์ดผลลัพธ์เป็นรูป (.PNG)'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareResult}
                className="px-4 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-secondary)] text-xs font-semibold hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>คัดลอกลิงก์แชร์แล้วค่ะ!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    <span>แชร์ผลลัพธ์ให้เพื่อนดู</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="px-4 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-[var(--color-secondary-muted)] text-xs font-semibold hover:text-[var(--color-secondary)] transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>เล่นแบบทดสอบอีกครั้ง</span>
              </button>
            </div>

            <div className="pt-1 text-[11px] text-[var(--color-secondary-muted)] flex items-center justify-center gap-1">
              <span>ออกแบบโดย</span>
              <BrandWordmark name={settings.site_name || 'qokhims'} dotVariant="heart" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
